-- disponibilidade.sql — esqueleto de leitura e escrita da reserva de estoque
--
-- MATERIAL STAGED. Este arquivo NUNCA RODOU: não existe backend do Cabinet contra
-- o qual rodá-lo, e as tabelas que ele usa ainda não existem com as colunas de
-- `proposta-schema.md`. É material de leitura para o trilho backend, mesma
-- natureza do `docs/harvest/auditoria/cabinet_audit.sql`.
--
-- Desenho colhido do Saleor (BSD-3) — ver NOTICE. O que veio de lá é a FÓRMULA
-- (disponível = físico − alocado) e a DISCIPLINA DE TRAVA (travar sempre na mesma
-- ordem, escolher depois, na ordem da estratégia). O SQL é escrito do zero.
--
-- Premissas do Cabinet que este arquivo respeita:
--   · quantidade = numeric(14,3), nunca inteiro
--   · RLS FORCE por tenant; toda tabela tenant-scoped tem PK (tenant_id, id)
--   · ADR-009: saldo nasce do banco. Reserva NÃO é movimento: nada aqui escreve
--     em stock_movements nem em stock_balances
--   · sem greatest(…, 0): disponível negativo é informação, não erro de exibição


-- ---------------------------------------------------------------------------
-- 1. LEITURA — disponível por variante × local
-- ---------------------------------------------------------------------------
-- Reserva com source_kind = 'purchase_order_item' tem location_id nulo e por isso
-- NÃO entra nesta conta: mercadoria em trânsito não está em depósito nenhum.
-- Ela é o outro número da tela (mecanica.md §6, nota-front.md §3).

create or replace view stock_availability as
select
    b.tenant_id,
    b.variant_id,
    b.location_id,
    b.qty                              as on_hand,
    coalesce(a.allocated, 0)           as allocated,
    b.qty - coalesce(a.allocated, 0)   as available
from stock_balances b
left join lateral (
    select sum(r.qty - r.qty_consumed) as allocated
    from stock_reservations r
    where r.tenant_id   = b.tenant_id
      and r.variant_id  = b.variant_id
      and r.location_id = b.location_id
      and r.status      = 'active'
) a on true;


-- Disponível consolidado da variante, somando os locais ativos. É o número que a
-- listagem de produto mostra; o detalhe por local é a view acima.
create or replace view stock_availability_variant as
select
    v.tenant_id,
    v.variant_id,
    sum(v.on_hand)   as on_hand,
    sum(v.allocated) as allocated,
    sum(v.available) as available
from stock_availability v
join stock_locations l
      on l.tenant_id = v.tenant_id
     and l.id        = v.location_id
     and l.active
group by v.tenant_id, v.variant_id;


-- ---------------------------------------------------------------------------
-- 2. ESCRITA — reservar a linha do pedido
-- ---------------------------------------------------------------------------
-- Retorna quanto NÃO coube: 0 = cobriu tudo. Quem chama decide o que fazer com o
-- resto — recusar o pedido ou abrir purchase_needs (mecanica.md §4.1, decisão do
-- user ainda em aberto). Esta função não decide por ninguém.
--
-- Duas fases, e a ordem entre elas é o ponto inteiro:
--   fase 1 trava TODAS as linhas de saldo da variante na ordem da PK — é o que
--          evita deadlock entre duas transações que pegam os mesmos produtos em
--          ordem inversa (Saleor: lock_objects.py, order_by("pk"));
--   fase 2 escolhe de onde tirar na ordem da ESTRATÉGIA, já sob trava.
-- Trocar a estratégia mexe só na fase 2. A fase 1 nunca muda de ordem.

create or replace function reserve_for_order_item(
    p_tenant      uuid,
    p_order       uuid,
    p_quote_item  uuid,
    p_variant     uuid,
    p_qty         numeric
) returns numeric
language plpgsql
as $$
declare
    v_falta numeric(14,3) := p_qty;
    v_pega  numeric(14,3);
    v_loc   record;
begin
    if p_qty is null or p_qty <= 0 then
        raise exception 'reserva exige quantidade positiva (recebido: %)', p_qty;
    end if;

    -- fase 1: trava, ordem fixa
    perform 1
      from stock_balances b
     where b.tenant_id  = p_tenant
       and b.variant_id = p_variant
     order by b.variant_id, b.location_id
       for update;

    -- fase 2: escolhe, ordem da estratégia (aqui: ordem configurada do depósito)
    for v_loc in
        select s.location_id, s.available
          from stock_availability s
          join stock_locations l
                on l.tenant_id = s.tenant_id
               and l.id        = s.location_id
               and l.active
         where s.tenant_id  = p_tenant
           and s.variant_id = p_variant
           and s.available  > 0
         order by l.sort, l.id
    loop
        v_pega := least(v_falta, v_loc.available);
        exit when v_pega <= 0;

        insert into stock_reservations
               (tenant_id, id, order_id, quote_item_id, variant_id, location_id,
                source_kind, qty, qty_consumed, status)
        values (p_tenant, gen_random_uuid(), p_order, p_quote_item, p_variant,
                v_loc.location_id, 'stock', v_pega, 0, 'active')
        on conflict (tenant_id, quote_item_id, location_id) where status = 'active'
        do update set qty = stock_reservations.qty + excluded.qty;

        v_falta := v_falta - v_pega;
        exit when v_falta <= 0;
    end loop;

    return v_falta;
end;
$$;


-- ---------------------------------------------------------------------------
-- 3. ESCRITA — consumir na entrega
-- ---------------------------------------------------------------------------
-- Chamada NA MESMA TRANSAÇÃO que insere o stock_movements de saída, e ANTES dele.
-- A ordem importa: se o físico cai primeiro, existe um instante em que
-- disponível = físico − alocado conta a mesma mercadoria duas vezes
-- (mecanica.md §4). Falta reserva para consumir => a transação inteira falha;
-- não existe consertar pela metade (mecanica.md §7.4).

create or replace function consume_reservation(
    p_tenant      uuid,
    p_quote_item  uuid,
    p_location    uuid,
    p_qty         numeric
) returns void
language plpgsql
as $$
declare
    v_saldo numeric(14,3);
begin
    select r.qty - r.qty_consumed
      into v_saldo
      from stock_reservations r
     where r.tenant_id     = p_tenant
       and r.quote_item_id = p_quote_item
       and r.location_id   = p_location
       and r.status        = 'active'
       for update;

    if v_saldo is null then
        raise exception 'sem reserva ativa para o item % no local %',
                        p_quote_item, p_location;
    end if;

    if p_qty > v_saldo then
        raise exception 'entrega (%) maior que a reserva ativa (%) do item %',
                        p_qty, v_saldo, p_quote_item;
    end if;

    update stock_reservations r
       set qty_consumed = r.qty_consumed + p_qty,
           status       = case when r.qty_consumed + p_qty = r.qty
                               then 'consumed' else 'active' end
     where r.tenant_id     = p_tenant
       and r.quote_item_id = p_quote_item
       and r.location_id   = p_location
       and r.status        = 'active';
end;
$$;


-- ---------------------------------------------------------------------------
-- 4. ESCRITA — soltar
-- ---------------------------------------------------------------------------
-- Cancelamento do pedido inteiro. Reserva já consumida não volta: o que saiu,
-- saiu — desfazer isso é devolução, que é movimento de entrada no kardex, outro
-- assunto. `released` é terminal: pedido que renasce cria reserva nova.

create or replace function release_reservations_for_order(
    p_tenant uuid,
    p_order  uuid
) returns integer
language plpgsql
as $$
declare
    v_n integer;
begin
    update stock_reservations r
       set status      = 'released',
           released_at = now()
     where r.tenant_id = p_tenant
       and r.order_id  = p_order
       and r.status    = 'active';

    get diagnostics v_n = row_count;
    return v_n;
end;
$$;
