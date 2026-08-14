# Vocabulário de movimento — `reason` e `source_kind`

O schema novo já tem as colunas (`stock_movements.reason`, `.source_kind`, `.source_id`) e
**nenhuma delas tem domínio escrito**: são `varchar` livres. Este documento propõe o domínio, com
cada valor amarrado a uma origem. Nada aplicado — `docs/cabinet/` é zona do trilho de schema.

Por que enum e não texto livre: o motivo é filtro de primeira classe na listagem
(`telas.md` §3.3) e rótulo na coluna. Texto livre vira "AJUSTE", "Ajuste", "ajuste manual" e
"AJ." na mesma coluna, e o filtro por motivo deixa de existir. O InvenTree acerta isso — o
`StockHistoryCode` é enum inteiro, agrupado por origem.

---

## 1. O que o legado tinha (medido)

`estoque_log`, 402.161 linhas, 16 colunas. As três que carregam vocabulário:

| coluna | tipo | o que se vê no SQL do binário |
|---|---|---|
| `Elg_tipo` | varchar(25) | **o documento de origem**: `'PROJETO'`, `'VENDA AVULSA'`, `'PEDIDO DE VENDA'`, `'ENTRADA POR DEVOLU…'` |
| `Elg_operacao` | char(1) | **cinco** valores consultados: `'E'`, `'S'`, `'A'`, `'Z'`, `'B'` |
| `Elg_acao` | char(1) | lida na consulta de movimentação; nenhum literal aparece no SQL extraído |

`'E'` e `'S'` são entrada e saída — o próprio SQL soma um contra o outro. **`'A'`, `'Z'` e `'B'`
não têm significado recuperável do binário**: aparecem em consultas que somam cada um
separadamente, sem rótulo em lugar nenhum. Não vou adivinhar — é pergunta para quem opera
(`integracao.md` §3), e a resposta pode ser respondida por `SELECT DISTINCT` na base real com uma
amostra de `Elg_tipo` ao lado.

E há um sinal claro de que **origem é dimensão separada de operação**: a consulta que monta a
ficha do movimento resolve o nome do cliente em uma tabela DIFERENTE conforme o tipo — `Avulso`,
`Venda`, `Ent_devolucao`, `Transferencia_filiais`, `TransferenciaEstoque`, `Assistencia_Tecnica`,
`RequisicaoEstoq`, `NotaFiscal`, `NotaFiscalTroca`, `Devolucao`, `Factura`, `Venda_TEF`. Doze
ramos de `if` para responder "de onde veio esta linha".

Duas outras colunas do legado que valem leitura, com confiança **média** (inferido do SQL, não de
documentação): `Elg_codigo` agrupa as linhas de um mesmo evento de movimentação (é o que o
`update … set elg_codigo = :novo where elg_codigo = :velho and elg_doc = :doc` remaneja), enquanto
`Elg_doc` + `Elg_tipo` identificam o documento de origem. `Elg_pai` sugere movimento derivado de
outro; sem dado para afirmar mais que isso.

## 2. O que o InvenTree tem

`StockHistoryCode` — enum inteiro, comentado por grupo:

```python
CREATED = 1                        # ciclo de vida do item
EDITED = 5 · ASSIGNED_SERIAL = 6
STOCK_COUNT = 10 · STOCK_ADD = 11 · STOCK_REMOVE = 12    # operações manuais
STOCK_MOVE = 20 · STOCK_UPDATE = 25                      # local
INSTALLED_INTO_ASSEMBLY = 30 · BUILD_CONSUMED = 57       # montagem/BOM
SPLIT_FROM_PARENT = 40 · MERGED_STOCK_ITEMS = 45         # serial
SHIPPED_AGAINST_SALES_ORDER = 60                         # venda
RECEIVED_AGAINST_PURCHASE_ORDER = 70                     # compra
RETURNED_AGAINST_RETURN_ORDER = 80
SENT_TO_CUSTOMER = 100 · RETURNED_FROM_CUSTOMER = 105    # cliente
```

**O agrupamento é a colheita**, não a lista: manual · local · documento de compra · documento de
venda · cliente. Metade dos códigos (serial, split/merge, assembly, build) não tem correspondente
no Cabinet — não há número de série nem BOM, e inventar os dois para caber num enum seria a
modelagem servindo à lista, e não o contrário.

Duas escolhas do InvenTree que **não** atravessam:

- **`EDITED` e `STOCK_UPDATE` como entradas de histórico.** Existem porque lá o histórico registra
  edição de um registro mutável. No Cabinet o kardex não é histórico de edição de saldo: é o fato.
  Não há o que editar, logo não há código para isso.
- **`StockStatus` por item** (`OK`, `DAMAGED`, `QUARANTINED`, `LOST`…). Depende de o estoque ser
  linha por item, que é o modelo recusado em `telas.md` §5.1. O equivalente aqui, sem inventar
  tabela: avaria e perda são **movimento** (`loss`), e quarentena é **local** — um depósito
  `Quarentena` para onde se transfere. Os dois já cabem no que existe.

## 3. Proposta — `reason` (10 valores)

Sinal do movimento vem do `delta`, não do nome. Por isso `count` e `transfer` são um valor cada, e
não dois.

| `reason` | rótulo PT-BR | sinal | origem típica (`source_kind`) | de onde veio |
|---|---|---|---|---|
| `purchase_receipt` | Entrada por nota | + | `goods_receipt` | `[S]` `goods_receipts` · `[I]` RECEIVED_AGAINST_PURCHASE_ORDER |
| `customer_return` | Devolução de cliente | + | `sales_order` | `[L]` `'ENTRADA POR DEVOLU…'` · `[I]` RETURNED_FROM_CUSTOMER |
| `manual_in` | Entrada manual | + | `stock_entry` | `[L]` `Lancamento_estoque` (10.646 linhas) · `[I]` STOCK_ADD |
| `sales_delivery` | Entrega de pedido | − | `sales_order` | `[L]` `'PEDIDO DE VENDA'` · `[I]` SHIPPED_AGAINST_SALES_ORDER |
| `supplier_return` | Devolução ao fornecedor | − | `goods_receipt` | `[L]` `DevolucaoProduto` (11.557) |
| `manual_out` | Saída manual | − | `stock_entry` | `[L]` · `[I]` STOCK_REMOVE |
| `loss` | Perda ou avaria | − | `stock_entry` | `[I]` StockStatus DAMAGED/LOST/DESTROYED |
| `count` | Inventário | ± | `stock_count` | `[L]` `BalancoEstoque` (324) · `[I]` STOCK_COUNT |
| `transfer` | Transferência | ± | `transfer` | `[I]` STOCK_MOVE |
| `opening` | Saldo inicial | + | `migration` | necessidade da migração — o legado tem 141.043 saldos para trazer |

`opening` não vem de fonte externa nem do legado: **é consequência da ADR-009.** Se o saldo só
nasce de movimento, o saldo migrado precisa de um movimento que o explique. Sem ele, o primeiro
kardex do Cabinet começa com `balance_after` que não bate com nenhuma linha anterior.

## 4. Proposta — `source_kind` (6 valores)

| `source_kind` | `source_id` aponta para | quando |
|---|---|---|
| `goods_receipt` | `goods_receipts.id` | entrada por nota e devolução ao fornecedor |
| `sales_order` | `sales_orders.id` | entrega e devolução de cliente |
| `stock_entry` | o lançamento manual (§5) | entrada/saída manual e perda |
| `stock_count` | o inventário (quando existir como documento) | `count` |
| `transfer` | **o par**, não um documento | `transfer` |
| `migration` | nulo | `opening` |

**`transfer` é o caso que precisa de decisão explícita.** Uma transferência são DOIS movimentos —
saída na origem, entrada no destino — e eles precisam se achar. A proposta: gerar um uuid para o
par e gravá-lo em `source_id` nas duas linhas, sem tabela nova. Assim a ficha do movimento
(`telas.md` §3.5) mostra "a outra ponta" com um `WHERE source_id = … AND id <> …`, e uma
transferência nunca aparece pela metade na listagem.

A alternativa — tabela `stock_transfers` com as duas pernas como FK — só se paga se a
transferência virar documento com aprovação, previsão e status. O legado tinha isso
(`Transferencia_filiais`) e a tabela está com **zero linhas**. Começar sem.

## 5. O que fica pendente de decisão

1. **`'A'`, `'Z'`, `'B'` do legado** (§1) — significado desconhecido. Enquanto não se souber, a
   migração não sabe para que `reason` mandar essas linhas. É a pergunta que mais atrasa a
   migração e a mais barata de responder na base real.
2. **Lançamento manual é documento ou é linha solta?** O legado tem cabeçalho + itens
   (`Lancamento_estoque` 3.614 / `lancamento_estoque_det` 10.646 → ~3 itens por lançamento), com
   fornecedor no cabeçalho. O schema novo **não tem essa tabela**. Sem ela, `source_kind =
   'stock_entry'` não tem para onde apontar e o `Ajuste` da tela vira movimento órfão com
   observação. Proposta: nascer sem a tabela (movimento avulso, `source_id` nulo, observação
   obrigatória) e só criá-la se aparecer demanda de lançar vários itens de uma vez — que é
   exatamente o que os 10.646/3.614 dizem que acontecia.
3. **Devolução de cliente entra na v1?** Ela existe no legado com volume (`DevolucaoProduto`,
   11.557 linhas), mas depende de fluxo de devolução que nenhuma tela cobre.
