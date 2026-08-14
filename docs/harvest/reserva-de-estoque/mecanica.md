# Mecânica de reserva de estoque — espec colhida do Saleor

Material STAGED. Nada aqui está implementado, nem no contrato, nem no schema. A decisão de
aplicar é do user; a implementação é do trilho backend.

Fonte: Saleor (BSD-3), commit `55c5b8b` — arquivos e aviso de copyright no `NOTICE` desta pasta.
Fonte do legado: `docs/legado/` (colunas reais de `Reserva_Estoque` e `Reserva_tecnica`).

---

## 1. O nome está trocado, e isso não é detalhe

A issue #97 pede "espec da Reserva Técnica" e descreve, no corpo, **allocation de estoque**.
São dois blockers diferentes com nomes que se confundem. O legado separa os dois em tabelas
distintas, e a medição está em `docs/legado/schema/bdprincipal-colunas.csv`:

| tabela do legado | linhas | o que é | colunas que provam |
|---|---|---|---|
| `Reserva_Estoque` | 3.183 | **reserva de material** para um projeto/venda | `Res_CodigoProduto`, `Res_Acabamento`, `Res_Quantidade`, `Res_Ordem`, `Res_OrdemItem`, `Res_Projeto` |
| `Reserva_tecnica` | 1.212 | **comissão do arquiteto** (documento financeiro) | `Ind_codigo`, `Ret_tec_luminaria`, `Ret_tec_materiais`, `Ret_tec_servico`, `Ret_tec_total`, `Ret_TpFinanceiro` |

**Reserva Técnica (RT) não tem nada de estoque.** É participação do profissional que indicou,
paga por grupo de produto (`Reserva_tecnica_GrupoProd`, 12.108 linhas, coluna `RetGProd_PorcRT`).
No schema novo ela é o campo `commission_rules.reserve_percent`, marcado `RESERVADO, modelagem
adiada`, e o blocker registrado é outro: `Par_RTautomatico = True` no parâmetro global contra
`Ven_RtAutomatico` **vazio em toda a tabela `Venda`** — ninguém sabe qual dos dois manda.

Consequência para esta issue: **o Saleor não tem como resolver a RT.** Um e-commerce não tem
comissão de arquiteto por grupo de produto; não há o que colher. O que o Saleor tem, e o corpo da
issue pede, é allocation — que no Cabinet é `stock_reservations`, hoje uma tabela de sete colunas
sem mecânica nenhuma. É isso que esta pasta especifica.

**Fica em aberto, sem avanço nesta sessão:** `commission_rules.reserve_percent`. Continua
bloqueado pela contradição `Par_RTautomatico` × `Ven_RtAutomatico`, que só o user resolve (é
pergunta de regra de negócio, não de modelagem). Ver §8.

---

## 2. As três quantidades, e por que são três

O Saleor guarda **uma** quantidade e deriva as outras. `Stock.quantity` é o físico; a soma das
`Allocation.quantity_allocated` daquele estoque é o comprometido; disponível é a subtração
(`StockQuerySet.annotate_available_quantity`):

```
disponível = físico − Σ alocado
```

Com o segundo nível ligado (`check_reservations=True`), entra um terceiro termo
(`availability._get_available_quantity`):

```
disponível = físico − Σ alocado − Σ reservado_não_expirado
```

Traduzido para o vocabulário do Cabinet:

| quantidade | onde mora | quem escreve | some quando |
|---|---|---|---|
| **físico** | `stock_balances.qty` | gatilho do kardex (ADR-009) | a mercadoria sai fisicamente |
| **alocado** | Σ `stock_reservations.qty` ativas | a aceitação do pedido | a entrega baixa, ou o pedido é cancelado |
| **disponível** | **não é coluna** — é conta | ninguém | — |

A regra que sustenta as três: **reserva não é movimento de estoque.** Reservar não mexe no
kardex, não mexe em `stock_balances.qty`, não gera `stock_movements`. Quem reserva promete; quem
entrega move. Misturar os dois foi exatamente o erro do legado, onde `Estoque_produto` era escrito
por valor absoluto e o `estoque_log` divergia do saldo sem sinal nenhum (ADR-009 fecha isso).

---

## 3. Os dois níveis do Saleor — e por que o Cabinet só precisa de um agora

O Saleor tem duas tabelas para "material comprometido", e a diferença entre elas é **quem
promete**:

| | `Allocation` | `Reservation` |
|---|---|---|
| pendura em | `OrderLine` (pedido) | `CheckoutLine` (carrinho) |
| expira | **não** | sim — coluna `reserved_until` |
| some por | liberação explícita | passar da hora, varrida por tarefa |
| entra na conta de disponível | sempre | só se `check_reservations=True` |
| motivo de existir | o pedido é compromisso | o carrinho é intenção com prazo |

O Cabinet **já tomou essa decisão**, e ela está no `project-core` @decisoes: *"orçamento é
proposta (mutável, vence, não reserva estoque, não gera financeiro), pedido é compromisso
(reserva, gera título, gera nota)"*. Ou seja: existe o análogo de `Allocation` (pedido) e o
análogo de `CheckoutLine` (orçamento) **decidiu não reservar**.

**Recomendação: nascer com um nível só.** `stock_reservations` = `Allocation`. O nível que expira
fica especificado (§4) e não construído. Construir os dois agora custaria a coluna `expires_at`, a
tarefa de varredura, o filtro `não expirado` em **toda** leitura de disponível, e o teste de cada
um — para um consumidor que a regra atual diz que não existe.

**O que ligaria o segundo nível** (para não reabrir a discussão do zero quando aparecer): o
orçamento ganhar uma ação explícita "segurar material", opt-in por item, com prazo herdado da
validade do orçamento (`par_val_orc` = 5 dias no legado). Nesse dia entram, juntos: `expires_at`
na reserva, o filtro `expires_at is null or expires_at > now()` em toda leitura, a varredura, e a
regra de que reserva de orçamento **cede** para reserva de pedido quando o físico não cobre os
dois. Sem essa última regra o segundo nível é pior que nada: orçamento que ninguém aceita segura
material de pedido que alguém pagou.

---

## 4. Ciclo de vida — evento por evento

O que o Saleor faz, e o que o Cabinet deve fazer. Todo item roda em **uma** transação.

| evento | Saleor | Cabinet |
|---|---|---|
| orçamento emitido | `reserve_stocks` (opcional) | **nada** — orçamento não reserva |
| pedido aceito | `allocate_stocks`: trava, calcula disponível por depósito, rateia a linha, cria `Allocation`, erra `InsufficientStock` se não cobre | cria `stock_reservations` (uma linha por local usado), status `active`; se não cobre, ver §4.1 |
| item do pedido aumenta | `increase_allocations`: **apaga** as alocações da linha e realoca tudo | ajusta `qty` da reserva existente; falta vira reserva nova ou §4.1 |
| item do pedido diminui | `decrease_allocations` → `deallocate_stock` | reduz `qty`; zerou, status `released` |
| entrega (baixa) | `decrease_stock`: desaloca e só então subtrai o físico | **na mesma transação**: `stock_movements` de saída (o gatilho atualiza `stock_balances`) **e** consumo da reserva (`qty` menos o entregue; zerou → `consumed`) |
| entrega parcial | mesma coisa, quantidade menor | idem — `sales_orders.status` já prevê `partially_delivered` |
| pedido cancelado | `deallocate_stock_for_orders` | todas as reservas do pedido → `released` |
| reserva sobrando | `delete_empty_allocations_task` varre linhas com zero | **não sobra**: `released`/`consumed` são estado, não lixo — a linha fica como histórico |

**Ordem inegociável na entrega:** desalocar **antes** de baixar o físico, nunca depois. O Saleor
acerta isso (`decrease_stock` chama `decrease_allocations` na primeira linha) e o motivo é
aritmético: se o físico cai primeiro, existe um instante dentro da transação em que
`disponível = físico − alocado` conta a mesma mercadoria duas vezes (ela já saiu e ainda está
prometida) e o número fica negativo. Com RLS e uma transação por requisição, esse instante é
visível para quem calcular disponível ali dentro.

### 4.1 Quando não cobre

O Saleor levanta `InsufficientStock` e aborta. O Cabinet **tem uma terceira saída que o Saleor não
tem**: `purchase_needs` — "necessidade de compra nascida do pedido de venda sem saldo". Então a
aceitação de pedido sem saldo não é erro obrigatório; é bifurcação de regra de negócio:

- **reserva parcial + necessidade de compra pelo resto** (é o que o legado fazia, ver §6), ou
- **recusa integral** (é o que o Saleor faz).

**Isto é decisão do user, não de modelagem.** Registrado em `integracao.md` §Decisões pendentes.
O schema proposto suporta as duas: a reserva parcial existe como linha `active` com `qty` menor
que a do item, e a diferença vira `purchase_needs`.

---

## 5. Rateio entre locais, e concorrência

**Rateio.** Uma linha de pedido pode não caber em um depósito só. O Saleor percorre os estoques em
ordem e vai fatiando (`_create_allocations`): `quantity_to_allocate = min(falta, disponível
naquele estoque)`, uma `Allocation` por estoque tocado. A ordem vem de `sort_stocks`, com duas
estratégias por canal: `PRIORITIZE_HIGH_STOCK` (maior disponível primeiro) e
`PRIORITIZE_SORTING_ORDER` (ordem configurada dos depósitos).

Para o Cabinet: **fatiar sim, estratégia como parâmetro do tenant, começando por ordem
configurada.** "Maior saldo primeiro" espalha a mesma linha por vários depósitos e transforma uma
entrega em duas; o legado tem 4 locais e um deles é o que atende. Ordem configurada é previsível e
o operador entende por que saiu de onde saiu.

**Concorrência.** É aqui que o Saleor é mais didático que o resto do código dele.
`lock_objects.py` inteiro:

```python
def stock_select_for_update_for_existing_qs(qs):
    return qs.order_by("pk").select_for_update(of=(["self"]))
```

Duas coisas, e as duas importam:

1. **`select_for_update`** — a leitura do disponível e a escrita da alocação precisam ser
   atômicas entre si. Sem trava, dois pedidos leem "3 disponíveis" e alocam 3 cada um.
2. **`order_by("pk")`** — travar sempre na mesma ordem é o que evita deadlock quando duas
   transações pegam os mesmos dois produtos em ordem inversa. `allocation_with_stock_qs_select_for_update`
   ordena por `stock__pk` pelo mesmo motivo.

No Cabinet a trava natural é a linha de `stock_balances`, cuja PK é `(tenant_id, variant_id,
location_id)` — **trava essa linha, ordenada por essa PK**, e o disponível daquele par fica
estável até o commit. Isso casa com a ADR-009 sem inventar nada: o saldo já é do banco, a trava
também é.

O esqueleto SQL está em `disponibilidade.sql`. Ele **nunca rodou** — não existe backend contra o
que rodar. É material de leitura para o trilho backend, com a mesma natureza do
`auditoria/cabinet_audit.sql`.

---

## 6. O que o Saleor não cobre e o Cabinet precisa: reserva contra compra em aberto

O legado reservava contra o que **ainda vai chegar**. Colunas de `Reserva_Estoque`: `Res_Ordem` e
`Res_OrdemItem` apontam para `ordem_compra_det` — a reserva prende uma fatia de uma ordem de
compra ainda não recebida. A função `CompraEstoque` do legado calcula, para um produto:

```
disponibilidade futura = ordem de compra em aberto − reserva − o que já entrou por nota
```

(`docs/legado/schema/bdprincipal-rotinas.sql`, cursor sobre `ordem_compra_det` com
`Ocp_status = 'A'` e `Ocd_recebimento <> 'INTEGRAL'`.)

O análogo do Saleor é `PreorderAllocation`, e ele **não serve**: o Saleor prende contra um
*threshold* numérico por canal (`preorder_quantity_threshold`), um limite abstrato de quantas
unidades a loja aceita vender antes de ter. Não há ordem de compra do outro lado, não há
fornecedor, não há data prevista. O legado prende contra uma **linha de documento real**, com
fornecedor e previsão — e é isso que o comprador precisa ver.

Cabinet: `purchase_orders` / `purchase_order_items` já existem no schema. A reserva contra compra
é a **mesma tabela** com origem diferente (`source_kind = 'purchase_order_item'`, `location_id`
nulo — mercadoria em trânsito não está em depósito nenhum). Detalhe em `proposta-schema.md` §3.

**Fica fora do disponível físico.** São dois números diferentes na tela, e misturá-los promete
para hoje o que chega mês que vem (§`nota-front.md` §3).

---

## 7. O que NÃO copiar — cinco itens, com o trecho que prova

### 7.1 A coluna desnormalizada `Stock.quantity_allocated`

O Saleor guarda o alocado em dois lugares: as linhas de `Allocation` **e** a coluna
`Stock.quantity_allocated`. Cinco funções escrevem essa coluna (`allocate_stocks`,
`deallocate_stock`, `increase_stock`, `_reduce_quantity_allocated_for_stocks`,
`deactivate_preorder_for_variant`), e `annotate_available_quantity` **não a lê** — soma as
`Allocation`. Duas fontes de verdade e a leitura confia na outra.

A prova de que diverge vem do próprio Saleor, em `tasks.py`:

```python
@app.task
def update_stocks_quantity_allocated_task():
    for mismatched_stock in Stock.objects.annotate(
        allocations_allocated=Coalesce(Sum("allocations__quantity_allocated"), 0)
    ).exclude(quantity_allocated=F("allocations_allocated")):
        task_logger.info("Mismatch updating quantity_allocated: stock %d had "
                         "%d allocated, but should have %d.", ...)
```

É uma tarefa periódica de **reparo**, com log de "mismatch". Ninguém escreve isso preventivamente.

**O Cabinet não pode ter esse par.** A objeção óbvia — "mas `stock_balances.qty` também é
desnormalização de `stock_movements`" — tem resposta, e a diferença é a regra:

> Desnormalizar é seguro quando o escritor é **um só**, é **gatilho do banco**, e a fonte é
> **append-only**. `stock_balances` cumpre os três (ADR-009: kardex imutável, saldo por gatilho).
> `Stock.quantity_allocated` não cumpre nenhum: cinco escritores, todos em código de aplicação,
> sobre linhas que sofrem UPDATE no lugar.

Se um dia o `SUM` sobre reservas ativas doer em medição real, a saída é uma coluna mantida por
gatilho sobre a tabela de reservas — mesma disciplina do saldo, não a do Saleor. **Começar sem.**

### 7.2 O `max(…, 0)`

```python
return max(total_quantity - quantity_allocated - quantity_reserved, 0)
```

Disponível negativo vira zero. Mas negativo **não é o mesmo que zero**: negativo quer dizer que se
prometeu mais do que existe, e alguém precisa saber disso hoje, não quando o cliente reclamar. O
`allow_stock_to_be_exceeded=True` do `decrease_stock` deixa o físico ficar negativo de propósito
(entrega excepcional) — e o clamp esconde a consequência.

Cabinet: **disponível é assinado**. Negativo aparece na tela em estado de erro e é incidente de
operação. Zero é "acabou"; −4 é "prometemos quatro que não temos".

### 7.3 O erro que mente a quantidade

```python
if quantity > available_quantity:
    raise InsufficientStock([InsufficientStockData(variant=variant, available_quantity=0, ...)])
```

`check_stock_quantity` acabou de calcular `available_quantity` e manda **`0`** no erro. Quem
mostra a mensagem não tem como dizer "há 3, você pediu 10". (`check_stock_quantity_bulk`, no
mesmo arquivo, manda o número certo — a inconsistência é entre os dois caminhos.)

Cabinet: o 409/422 de estoque insuficiente carrega, por item, `requested` e `available` reais. O
front precisa desse número para a mensagem (`nota-front.md` §4).

### 7.4 O caminho de exceção que zera o filho e deixa o pai errado

```python
def decrease_allocations(lines_info, site_settings, requestor):
    try:
        deallocate_stock(lines_info, site_settings, requestor)
    except AllocationError as exc:
        Allocation.objects.order_by("stock_id").filter(
            order_line__in=exc.order_lines
        ).update(quantity_allocated=0)
```

`deallocate_stock` levanta `AllocationError` quando não achou alocação suficiente para desalocar.
O tratamento zera `Allocation.quantity_allocated` — e **não** corrige `Stock.quantity_allocated`
pelo resíduo. O pai fica alto para sempre; quem conserta é a tarefa do §7.1. Sem a tarefa, aquele
depósito perde disponível permanentemente e ninguém vê.

Cabinet: se não dá para liberar, **a transação falha inteira**. Não existe "consertar pela
metade" — reserva é a promessa que a empresa faz para o cliente.

### 7.5 A realocação destrutiva

`increase_allocations` **apaga** as alocações da linha e chama `allocate_stocks` de novo. Aumentar
1 unidade num item que já tinha 10 alocadas dissolve as 10 e realoca 11 — possivelmente em outros
depósitos, sem nenhum registro de que mudou. A trilha de auditoria (`docs/harvest/auditoria/`)
registraria um DELETE e um INSERT sem relação entre si.

Cabinet: aumentar altera `qty` da reserva existente e complementa; a linha só nasce e morre quando
a origem nasce e morre.

### 7.6 Observação de menor porte: `lambda` em laço no `on_commit`

```python
for allocation in allocations:
    ...
    transaction.on_commit(lambda: trigger_product_variant_out_of_stock(allocation.stock, ...))
```

Late binding de Python: no commit, **todas** as closures leem o último `allocation`. O mesmo
padrão está em `deallocate_stock` e `decrease_stock`. Efeito: N eventos de "esgotou" para a mesma
variante e nenhum para as outras. Vale só como aviso — quando o backend do Cabinet tiver evento de
estoque, capturar por valor (`partial(...)`, como o próprio Saleor faz duas linhas abaixo).

---

## 8. O que fica em aberto depois desta espec

1. **`commission_rules.reserve_percent` (a Reserva Técnica de verdade)** — segue bloqueado,
   agora com o motivo escrito: o Saleor não tem análogo, e o blocker é regra de negócio
   (`Par_RTautomatico = True` × `Ven_RtAutomatico` vazio). Colher `Reserva_tecnica` /
   `Reserva_tecnica_GrupoProd` do legado e perguntar ao user qual parâmetro manda é outro trilho —
   não se resolve com fonte externa.
2. **Pedido sem saldo: parcial ou recusa** (§4.1) — decisão do user.
3. **Estratégia de rateio** (§5) — proposto "ordem configurada"; confirmar.
4. **Reserva contra compra em aberto** (§6) — proposto como origem da mesma tabela; confirmar se
   entra na primeira rodada ou fica para quando o módulo de compra sair do esqueleto.
