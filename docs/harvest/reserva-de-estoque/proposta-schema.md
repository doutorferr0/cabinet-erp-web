# Proposta de schema — `stock_reservations` com mecânica

**NÃO APLICADO.** Nada em `docs/cabinet/` foi tocado por esta issue: aquela é a zona do trilho de
schema, e a decisão de aplicar é do user (issue #97, "SEM aplicar"). O que segue é o texto pronto
para colar em `gera-cabinet-schema.py`, com o motivo de cada campo.

Racional completo em `mecanica.md`. Aqui só o desenho.

---

## 1. O que existe hoje

```python
('stock_reservations', 'estoque', 'tenant', 'reserva de material para pedido aceito',
 [('tenant_id', U, 'k'), ('id', U, 'k'), ('order_id', U, ''), ('variant_id', U, ''),
  ('location_id', U, 'n'), ('qty', QTY, ''), ('status', S, '')], ''),
```

Sete colunas, nenhuma semântica escrita. Três buracos que impedem a mecânica:

1. **Aponta para o pedido, não para o item.** `order_id` só. Um pedido com dois itens da mesma
   variante em ambientes diferentes gera duas reservas indistinguíveis; cancelar um item não sabe
   qual linha soltar. O Saleor pendura em `OrderLine`, e está certo.
2. **`status` sem domínio.** Nenhum valor documentado — e é o campo que decide se a linha entra ou
   não na conta do disponível.
3. **Entrega parcial não tem onde ficar.** `sales_orders.status` prevê `partially_delivered`, mas
   a reserva só tem `qty`. Ou se perde quanto foi prometido, ou se perde quanto foi entregue.

Ainda: `location_id` **não tem FK** na lista de `FKS` do gerador (só `order_id` e `variant_id`
têm), e é a coluna pela qual o disponível por depósito é calculado.

---

## 2. Proposta — a tabela

```python
('stock_reservations', 'estoque', 'tenant',
 'reserva de material do pedido aceito — PROMESSA, não movimento: não gera stock_movements '
 'nem altera stock_balances (ADR-009 intocada)',
 [('tenant_id', U, 'k'), ('id', U, 'k'), ('order_id', U, ''), ('quote_item_id', U, ''),
  ('variant_id', U, ''), ('location_id', U, 'n'), ('source_kind', S, ''),
  ('purchase_order_item_id', U, 'n'), ('qty', QTY, ''), ('qty_consumed', QTY, ''),
  ('status', S, ''), ('released_at', TS, 'n')],
 'status: active|consumed|released — alocado = Σ (qty − qty_consumed) das active; '
 'source_kind: stock|purchase_order_item (reserva contra compra em aberto tem location_id nulo)'),
```

Campo a campo, só o que muda:

| campo | por quê |
|---|---|
| `quote_item_id` | a reserva é da LINHA, não do documento. O item do pedido é `quote_items` — pedido é transição do orçamento, não cópia, então não existe `sales_order_items`. |
| `order_id` | fica, redundante de propósito: cancelar pedido inteiro é o caminho mais comum e não deve precisar de junção. **Invariante que o banco não expressa:** `quote_item_id` tem que pertencer ao `quote_id` do `order_id`. Vale gatilho — FK composta não alcança. |
| `location_id` | continua nulo APENAS para `source_kind = 'purchase_order_item'` (mercadoria em trânsito não está em depósito). Para `stock`, **obrigatório** — reserva sem local não pode ser subtraída de nenhuma linha de `stock_balances`, e "disponível por depósito" vira ficção. CHECK amarra os dois. |
| `source_kind` | `stock` (físico, o caso normal) ou `purchase_order_item` (o `Res_Ordem`/`Res_OrdemItem` do legado — `mecanica.md` §6). |
| `purchase_order_item_id` | a linha de compra presa. Nulo quando `source_kind = 'stock'`. |
| `qty` | quanto foi prometido. **Não decresce na entrega** — é o número do documento. |
| `qty_consumed` | quanto já saiu fisicamente. Entrega parcial mora aqui. Alternativa descartada: decrementar `qty`, que apaga o prometido e deixa a reserva sem como bater com o item do pedido. |
| `status` | `active` (conta no alocado) · `consumed` (`qty_consumed = qty`, saiu tudo) · `released` (cancelamento/redução — não conta). Terminal é terminal: nada volta de `released` para `active`; pedido que renasce cria reserva nova. |
| `released_at` | quando soltou. Sem isto, "por que sumiu a reserva" não tem resposta sem a trilha de auditoria. |

**Fora da proposta, de propósito:** `expires_at`. Não há consumidor — orçamento não reserva
(`mecanica.md` §3). Coluna sempre nula é a mesma desnormalização vazia que esta espec recusa no
§7.1. O que entra JUNTO com ela, no dia em que o orçamento ganhar "segurar material": o filtro
`expires_at is null or expires_at > now()` em **toda** leitura de disponível, a varredura do
expirado, e a regra de precedência (reserva de pedido vence reserva de orçamento).

---

## 3. Constraints e índices

Além do que o gerador já emite (PK composta `(tenant_id, id)`, RLS FORCE):

```sql
-- quantidade: 3 casas, como toda quantidade do Cabinet
check (qty > 0)
check (qty_consumed >= 0 and qty_consumed <= qty)

-- origem × local: reserva física TEM local, reserva de compra NÃO tem
check (
  (source_kind = 'stock'               and location_id is not null
                                       and purchase_order_item_id is null)
  or
  (source_kind = 'purchase_order_item' and location_id is null
                                       and purchase_order_item_id is not null)
)

-- status × consumo
check (status in ('active','consumed','released'))
check (status <> 'consumed' or qty_consumed = qty)
check (status <> 'released' or released_at is not null)

-- uma reserva ativa por (linha do pedido × local): o Saleor tem
-- unique_together [["order_line", "stock"]] pelo mesmo motivo
create unique index on stock_reservations (tenant_id, quote_item_id, location_id)
  where status = 'active';

-- a leitura quente: alocado por variante × local
create index on stock_reservations (tenant_id, variant_id, location_id)
  where status = 'active';

-- o cancelamento de pedido inteiro
create index on stock_reservations (tenant_id, order_id);
```

`tenant_id` primeiro em todo índice — mesma regra que o item `auditoria/` desta pasta já paga.

## 4. FKs para a lista `FKS` do gerador

```python
('stock_reservations', 'quote_item_id', 'quote_items', 'id'),
('stock_reservations', 'location_id', 'stock_locations', 'id'),          # falta hoje
('stock_reservations', 'purchase_order_item_id', 'purchase_order_items', 'id'),
```

As duas existentes (`order_id` → `sales_orders`, `variant_id` → `product_variants`) ficam.

---

## 5. Uma coluna em outra tabela: `stock_locations.sort`

```python
('stock_locations', 'estoque', 'tenant', 'depósito/local — o legado tem 4; local é DIMENSÃO, não gambiarra',
 [('tenant_id', U, 'k'), ('id', U, 'k'), ('name', S, ''), ('kind', S, 'n'),
  ('sort', I, ''), ('active', B, '')], ''),
#                  ^^^^^^^^^^^^^^^^ novo
```

A estratégia de rateio recomendada é "ordem configurada dos depósitos" (`mecanica.md` §5) e hoje
**não existe ordem configurada** — `stock_locations` tem `name` e `kind`, mais nada. Sem `sort`, a
alternativa é ordenar por nome, que faz o rateio depender de como alguém escreveu o cadastro.

## 6. O que NÃO muda em outras tabelas

- **`stock_balances` não ganha coluna de alocado.** Nem `qty_allocated`, nem `qty_available`.
  Motivo medido em `mecanica.md` §7.1: é a desnormalização que o Saleor mantém por tarefa de
  reparo. Disponível é conta, e a conta mora na view do §7.
- **`stock_movements` não muda.** Reserva não é movimento. O kardex continua sendo só o que
  entrou e saiu de verdade.
- **`sales_orders` não muda.** `open|partially_delivered|delivered|cancelled` já cobre o que a
  reserva precisa saber.
- **`quote_items` não muda.** A reserva aponta para o item; o item não sabe que foi reservado.

## 7. A view de disponibilidade

Nasce como view, não como tabela. Esqueleto em `disponibilidade.sql` desta pasta.

```
disponível(variante, local) = stock_balances.qty
                            − Σ (qty − qty_consumed) das reservas active daquele par
```

**Sem `greatest(…, 0)`.** Negativo é informação (`mecanica.md` §7.2).

Se a view doer em medição real — e só então —, a saída é coluna mantida por **gatilho** sobre
`stock_reservations`, com a mesma disciplina de escritor único que o `stock_balances.qty` já tem.
Não é a saída do Saleor.
