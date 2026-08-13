-- SPDX-License-Identifier: Apache-2.0
--
-- Trilha de auditoria genérica do Cabinet — STAGED, não integrado.
--
-- Derivado de supabase/supa_audit (Copyright 2021 Supabase, Apache-2.0).
-- Ver NOTICE nesta pasta para o aviso completo e o escopo do que foi reescrito.
--
-- =====================================================================
-- COMO ESTE ARQUIVO É APLICADO
-- =====================================================================
-- É um TEMPLATE, não um script. `@org@` é o schema da organização, e a
-- migração o substitui uma vez por schema (Alembic iterando os schemas,
-- @arquitetura). Não existe um schema `audit` global aqui, e a diferença é o
-- ponto inteiro da reescrita — ver `integracao.md` §"Por que a tabela não é
-- global".
--
-- Papéis pressupostos (criados fora deste arquivo, uma vez por banco):
--   cabinet_app    login, SEM bypassrls, NÃO é dono de tabela nenhuma
--   cabinet_audit  sem login, dono dos objetos de auditoria
--
-- =====================================================================


-- ---------------------------------------------------------------------
-- A TABELA
-- ---------------------------------------------------------------------
create table if not exists @org@.record_version (
    -- Chave composta (tenant_id, id): @arquitetura, regra 1. O `id` continua
    -- monotônico dentro do schema — é o que dá ordem total à trilha quando
    -- dois eventos caem no mesmo microssegundo.
    tenant_id      uuid   not null,
    id             bigint generated always as identity,

    -- Identidade lógica do registro auditado, estável entre versões.
    record_id      uuid,
    old_record_id  uuid,

    op             text not null check (op in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')),
    ts             timestamptz not null default now(),

    -- Schema e nome, NÃO o oid. Ver §"O oid não sobrevive ao restore" no
    -- integracao.md — foi a única mudança de conteúdo da tabela original.
    table_schema   name not null,
    table_name     name not null,

    -- Quem fez. Sessão do Cabinet, não do banco: `cabinet_app` é o mesmo papel
    -- para todo mundo, e um autor que é sempre o mesmo não é autor.
    employee_id    uuid,

    record         jsonb,
    old_record     jsonb,

    primary key (tenant_id, id),

    check (coalesce(record_id, old_record_id) is not null or op = 'TRUNCATE'),
    check ((op in ('INSERT', 'UPDATE')) = (record_id is not null)),
    check ((op in ('INSERT', 'UPDATE')) = (record is not null)),
    check ((op in ('UPDATE', 'DELETE')) = (old_record_id is not null)),
    check ((op in ('UPDATE', 'DELETE')) = (old_record is not null))
);

alter table @org@.record_version owner to cabinet_audit;

-- `tenant_id` como PRIMEIRA coluna em todo índice (@arquitetura, regra 5).
create index if not exists record_version_tenant_record
    on @org@.record_version (tenant_id, record_id) where record_id is not null;

create index if not exists record_version_tenant_old_record
    on @org@.record_version (tenant_id, old_record_id) where old_record_id is not null;

-- BRIN em `ts` sozinho seria mais barato, mas quebra a regra 5 e devolve
-- blocos de todos os tenants para o RLS filtrar linha a linha. Btree composto
-- serve as duas perguntas reais: "o que mudou nesta empresa hoje" e
-- "o que mudou nesta tabela desta empresa".
create index if not exists record_version_tenant_ts
    on @org@.record_version (tenant_id, ts desc);

create index if not exists record_version_tenant_tabela_ts
    on @org@.record_version (tenant_id, table_name, ts desc);


-- ---------------------------------------------------------------------
-- RLS — nega por omissão, append-only
-- ---------------------------------------------------------------------
alter table @org@.record_version enable row level security;
-- FORCE: sem ele o DONO da tabela ignora as políticas, e o dono passa a ser o
-- caminho de fuga. É o pitfall nº1 registrado em @arquitetura.
alter table @org@.record_version force row level security;

revoke all on @org@.record_version from public;
-- O app LÊ a trilha e nunca escreve nela por conta própria: a escrita é da
-- função `security definer` abaixo, que roda como cabinet_audit.
grant select on @org@.record_version to cabinet_app;

-- `(select current_setting(...))` embrulhado de propósito: sem o SELECT a
-- chamada roda POR LINHA e derruba o plano para seq scan (@arquitetura, regra 6).
create policy record_version_leitura on @org@.record_version
    for select to cabinet_app
    using (tenant_id = (select nullif(current_setting('app.current_tenant', true), '')::uuid));

create policy record_version_escrita on @org@.record_version
    for insert to cabinet_audit
    with check (tenant_id = (select nullif(current_setting('app.current_tenant', true), '')::uuid));

-- Não existe política de UPDATE nem de DELETE, e é assim que a trilha vira
-- append-only: com FORCE ligado, ausência de política nega para todos,
-- inclusive para o dono. Trilha que se edita não é trilha.


-- ---------------------------------------------------------------------
-- COLUNAS DA CHAVE PRIMÁRIA
-- ---------------------------------------------------------------------
create or replace function @org@.audit_colunas_pk(p_tabela regclass)
    returns text[]
    stable
    security definer
    set search_path = ''
    language sql
as $$
    select coalesce(array_agg(pa.attname::text order by pa.attnum), array[]::text[])
    from pg_catalog.pg_index pi
    join pg_catalog.pg_attribute pa
        on pi.indrelid = pa.attrelid
       and pa.attnum = any(pi.indkey)
    where pi.indrelid = p_tabela
      and pi.indisprimary
$$;

alter function @org@.audit_colunas_pk(regclass) owner to cabinet_audit;


-- ---------------------------------------------------------------------
-- IDENTIDADE LÓGICA DO REGISTRO
-- ---------------------------------------------------------------------
-- Hash determinístico de (tabela, valores da PK). Como a PK do Cabinet é
-- composta e começa por `tenant_id` (@arquitetura, regra 1), o tenant já entra
-- no hash — dois registros de empresas diferentes com o mesmo `id` NÃO colidem,
-- sem precisar de tratamento especial.
--
-- `order by k` explícito: o original agrega o resultado de `unnest` sem ordem
-- declarada. Na prática sai na ordem do array, mas "na prática" não é garantia,
-- e um record_id que muda de valor conforme o plano de execução transforma o
-- histórico de um registro em dois históricos pela metade.
--
-- `md5(...)::uuid` em vez de `uuid_generate_v5`: v5 exige a extensão uuid-ossp,
-- e o valor aqui não precisa ser RFC-4122 — precisa ser determinístico e caber
-- em uuid. Uma extensão a menos por schema.
create or replace function @org@.audit_record_id(p_tabela text, p_pk text[], p_rec jsonb)
    returns uuid
    stable
    security definer
    set search_path = ''
    language sql
as $$
    select case
        when p_rec is null then null
        when p_pk = array[]::text[] then null
        else (
            select md5(
                p_tabela || '|' ||
                string_agg(coalesce(p_rec ->> k, '\x00'), '|' order by k)
            )::uuid
            from unnest(p_pk) as u(k)
        )
    end
$$;

alter function @org@.audit_record_id(text, text[], jsonb) owner to cabinet_audit;


-- ---------------------------------------------------------------------
-- O GATILHO
-- ---------------------------------------------------------------------
-- `security definer`: roda como cabinet_audit, então `cabinet_app` não precisa
-- de INSERT na tabela de trilha. Consequência que importa: mesmo comprometida,
-- a sessão do app não consegue forjar linha de auditoria diretamente — só
-- através de uma escrita real na tabela auditada, que é justamente o que se
-- quer registrar.
--
-- Colunas a omitir chegam por TG_ARGV, fixadas na criação do gatilho. Ler uma
-- tabela de configuração aqui custaria uma consulta POR LINHA escrita.
create or replace function @org@.audit_linha()
    returns trigger
    security definer
    set search_path = ''
    language plpgsql
as $$
declare
    v_omitidas  text[] = coalesce(TG_ARGV, array[]::text[]);
    -- Cru e redigido separados: a identidade do registro se calcula sobre a
    -- linha INTEIRA, e o que se GUARDA é a linha sem as colunas omitidas.
    -- Calcular o record_id sobre o redigido faria uma coluna de segredo dentro
    -- da PK partir o histórico em dois.
    v_novo_cru  jsonb  = to_jsonb(new);
    v_velho_cru jsonb  = to_jsonb(old);
    v_pk        text[] = @org@.audit_colunas_pk(TG_RELID);
    v_tabela    text   = TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME;
    v_tenant    uuid   = coalesce(
                             (v_novo_cru ->> 'tenant_id')::uuid,
                             (v_velho_cru ->> 'tenant_id')::uuid
                         );
    v_sessao    uuid   = nullif(current_setting('app.current_tenant', true), '')::uuid;
begin
    -- `tenant_id` sai da LINHA, não da sessão. A sessão só confirma. Tirar da
    -- sessão faria a trilha registrar o contexto de quem escreveu em vez do
    -- dono do dado — e as duas coisas divergem exatamente no caso que a
    -- auditoria existe para pegar.
    if v_tenant is null then
        raise exception 'auditoria: % nao tem tenant_id na linha', v_tabela
            using errcode = 'raise_exception';
    end if;

    if v_sessao is null or v_sessao <> v_tenant then
        raise exception 'auditoria: escrita em % fora do tenant da sessao', v_tabela
            using errcode = 'insufficient_privilege';
    end if;

    insert into @org@.record_version (
        tenant_id, record_id, old_record_id, op, table_schema, table_name,
        employee_id, record, old_record
    )
    values (
        v_tenant,
        @org@.audit_record_id(v_tabela, v_pk, v_novo_cru),
        @org@.audit_record_id(v_tabela, v_pk, v_velho_cru),
        TG_OP,
        TG_TABLE_SCHEMA,
        TG_TABLE_NAME,
        nullif(current_setting('app.current_employee', true), '')::uuid,
        v_novo_cru - v_omitidas,
        v_velho_cru - v_omitidas
    );

    return coalesce(new, old);
end;
$$;

alter function @org@.audit_linha() owner to cabinet_audit;


-- ---------------------------------------------------------------------
-- LIGAR / DESLIGAR
-- ---------------------------------------------------------------------
-- Sem gatilho de TRUNCATE, de propósito: TRUNCATE ignora RLS e não tem linha,
-- logo não tem `tenant_id` — a trilha não teria como dizer de quem era o dado
-- apagado. A resposta certa não é auditar TRUNCATE mal, é não conceder TRUNCATE
-- ao papel do app. Ver `integracao.md` §"TRUNCATE".
create or replace function @org@.auditar(p_tabela regclass, variadic p_omitir text[] default '{}')
    returns void
    volatile
    security definer
    set search_path = ''
    language plpgsql
as $$
declare
    v_pk text[] = @org@.audit_colunas_pk(p_tabela);
    v_args text = coalesce(
        (select string_agg(quote_literal(c), ', ') from unnest(p_omitir) as u(c)),
        ''
    );
begin
    if v_pk = array[]::text[] then
        raise exception 'auditoria: % nao tem chave primaria', p_tabela::text;
    end if;

    -- Recusa na criação, não em produção: tabela sem `tenant_id` só falharia na
    -- primeira escrita, que é tarde demais para descobrir.
    if not exists (
        select 1 from pg_catalog.pg_attribute
        where attrelid = p_tabela and attname = 'tenant_id' and attnum > 0 and not attisdropped
    ) then
        raise exception 'auditoria: % nao tem tenant_id', p_tabela::text;
    end if;

    if not exists (select 1 from pg_catalog.pg_trigger where tgrelid = p_tabela and tgname = 'audit_iud') then
        execute format(
            'create trigger audit_iud after insert or update or delete on %s
                 for each row execute function @org@.audit_linha(%s)',
            p_tabela::text, v_args
        );
    end if;
end;
$$;

alter function @org@.auditar(regclass, text[]) owner to cabinet_audit;


create or replace function @org@.nao_auditar(p_tabela regclass)
    returns void
    volatile
    security definer
    set search_path = ''
    language plpgsql
as $$
begin
    execute format('drop trigger if exists audit_iud on %s', p_tabela::text);
end;
$$;

alter function @org@.nao_auditar(regclass) owner to cabinet_audit;

-- Ligar/desligar auditoria é migração, não operação: só cabinet_audit executa.
revoke execute on function @org@.auditar(regclass, text[]) from public;
revoke execute on function @org@.nao_auditar(regclass) from public;


-- ---------------------------------------------------------------------
-- USO
-- ---------------------------------------------------------------------
-- select @org@.auditar('@org@.partners');
-- select @org@.auditar('@org@.employees', 'password_hash', 'totp_secret');
-- select @org@.nao_auditar('@org@.partners');
