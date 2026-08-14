-- Bateria de isolamento — employee_tenants (issue #105)
--
-- ESTE ARQUIVO NUNCA RODOU. Não existe banco do Cabinet neste repositório, e não
-- existe bateria de isolamento onde encaixá-lo: o repo é o front. O caso está
-- escrito em SQL executável, e não em prosa, porque a regra do core exige a
-- PROVA — e prova que não roda em lugar nenhum é promessa. Ver `LEIA-ME.md`.
--
-- Como rodar, quando houver banco:
--
--     psql -v ON_ERROR_STOP=1 -U <usuario_da_aplicacao> -d cabinet \
--          -f vinculo-por-empresa.sql
--
-- O usuário TEM de ser o da aplicação. Com superuser (ou com o DONO da tabela
-- sem FORCE) o RLS é ignorado, todo `select` devolve tudo, e a bateria passa
-- verde afirmando exatamente o contrário do que aconteceria em produção. É a
-- forma mais convincente de não testar nada.
--
-- O que este caso prova, e por quê: colaborador é usuário e pode ter vínculo em
-- mais de uma empresa (decisão do user, 2026-08-14), mas os contextos NÃO se
-- cruzam. Quem garante isso é o RLS, não a consulta — a tela pede "os
-- colaboradores" sem filtro de empresa nenhum, e é o banco que decide quais
-- linhas existem para aquela sessão. Testar com `where tenant_id = ...` na
-- consulta provaria que o `where` funciona, que ninguém duvida.


begin;

-- ---------------------------------------------------------------------------
-- Cenário: DUAS empresas, e uma pessoa vinculada às duas
-- ---------------------------------------------------------------------------
-- É o caso que a decisão do user criou e que não existia antes. Um colaborador
-- só de uma empresa não distingue "RLS funciona" de "só há dado de uma empresa".

create temporary table t_caso on commit drop as
select
    '11111111-1111-1111-1111-111111111111'::uuid as empresa_a,
    '22222222-2222-2222-2222-222222222222'::uuid as empresa_b,
    'aaaaaaaa-0000-0000-0000-000000000001'::uuid as pessoa_das_duas,
    'bbbbbbbb-0000-0000-0000-000000000002'::uuid as pessoa_so_da_b;

insert into tenants (id, name, cnpj, active)
select empresa_a, 'EMPRESA A', '00000000000191', true from t_caso
union all
select empresa_b, 'EMPRESA B', '00000000000272', true from t_caso;

insert into employees (id, name, email, password_hash, must_change_password, active)
select pessoa_das_duas, 'PESSOA DAS DUAS', 'duas@exemplo.test', 'x', false, true from t_caso
union all
select pessoa_so_da_b, 'PESSOA SO DA B', 'sob@exemplo.test', 'x', false, true from t_caso;

insert into employee_tenants
       (tenant_id, employee_id, role, is_salesperson, default_commission_percent, active)
select empresa_a, pessoa_das_duas, 'admin', false, null, true from t_caso
union all
select empresa_b, pessoa_das_duas, 'operator-sales', true, 2.5, true from t_caso
union all
select empresa_b, pessoa_so_da_b, 'admin', false, null, true from t_caso;


-- ---------------------------------------------------------------------------
-- 1. A sessão na empresa A não enxerga NENHUMA linha da B
-- ---------------------------------------------------------------------------
-- Sem `where tenant_id`, de propósito: é o RLS que precisa responder.

set local role cabinet_app;
select set_config('app.current_tenant', (select empresa_a::text from t_caso), true);

do $$
declare
    v_total   int;
    v_da_outra int;
begin
    select count(*) into v_total from employee_tenants;

    select count(*) into v_da_outra
      from employee_tenants
     where tenant_id <> nullif(current_setting('app.current_tenant', true), '')::uuid;

    if v_da_outra <> 0 then
        raise exception 'VAZOU: sessão na empresa A vê % linha(s) de outra empresa',
                        v_da_outra;
    end if;

    -- O contrapositivo importa tanto quanto: zero linhas em tudo faria o teste
    -- acima passar por engano — política que nega TUDO isola e quebra o sistema.
    if v_total <> 1 then
        raise exception 'esperava 1 vínculo visível na empresa A, veio %', v_total;
    end if;
end $$;


-- ---------------------------------------------------------------------------
-- 2. A mesma pessoa, na empresa B, é outra coisa — e continua sem cruzar
-- ---------------------------------------------------------------------------
-- Prova que o vínculo duplo não é "a pessoa vê as duas": são dois contextos, e
-- o papel dela muda entre eles.

select set_config('app.current_tenant', (select empresa_b::text from t_caso), true);

do $$
declare
    v_total  int;
    v_papel  text;
begin
    select count(*) into v_total from employee_tenants;
    if v_total <> 2 then
        raise exception 'esperava 2 vínculos visíveis na empresa B, veio %', v_total;
    end if;

    select role into v_papel
      from employee_tenants
     where employee_id = (select pessoa_das_duas from t_caso);

    if v_papel <> 'operator-sales' then
        raise exception 'papel da empresa A vazou para a B: %', v_papel;
    end if;
end $$;


-- ---------------------------------------------------------------------------
-- 3. Escrever para a OUTRA empresa é recusado, não silenciosamente descartado
-- ---------------------------------------------------------------------------
-- Sem `with check` na política, o insert passaria e a linha sumiria da vista de
-- quem a escreveu — o pior dos dois mundos: dado gravado onde ninguém procura.

do $$
begin
    insert into employee_tenants
           (tenant_id, employee_id, role, is_salesperson, active)
    select empresa_a, pessoa_so_da_b, 'admin', false, true from t_caso;

    raise exception 'ACEITOU escrita para outra empresa — falta with check na política';
exception
    when insufficient_privilege then
        null;  -- é o que deve acontecer
end $$;


-- ---------------------------------------------------------------------------
-- 4. Sessão SEM tenant não enxerga nada
-- ---------------------------------------------------------------------------
-- O estado em que a aplicação abre a conexão antes do `SET LOCAL`. Se aqui
-- aparecer linha, existe uma janela em que qualquer consulta vê tudo.

select set_config('app.current_tenant', '', true);

do $$
declare
    v_total int;
begin
    select count(*) into v_total from employee_tenants;
    if v_total <> 0 then
        raise exception 'sessão sem tenant vê % linha(s)', v_total;
    end if;
end $$;


-- ---------------------------------------------------------------------------
-- 5. E-mail é global: repetir em outra empresa é recusado no banco
-- ---------------------------------------------------------------------------
-- A mensagem que o OPERADOR vê é genérica (a borda trata), mas o banco tem de
-- recusar de verdade — senão duas pessoas entram com a mesma credencial em
-- contextos diferentes e a autenticação não sabe qual delas é.

reset role;

do $$
begin
    insert into employees (id, name, email, password_hash, must_change_password, active)
    values (gen_random_uuid(), 'OUTRA PESSOA', 'duas@exemplo.test', 'x', false, true);

    raise exception 'ACEITOU e-mail repetido — falta o unique de employees.email';
exception
    when unique_violation then
        null;  -- é o que deve acontecer
end $$;

rollback;
