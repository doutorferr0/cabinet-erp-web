# O que precisa acontecer para isto sair de `docs/harvest/`

Espec de tela, não componente. Uma das duas telas já existe como rota
(`/estoque/movimentacao`, hoje `<TelaNaoCapturada>`); a outra não existe.

---

## 1. Gaps de CONTRATO

> **Vencido em parte — remedido em 2026-08-25.** A frase original desta seção ("não há **nenhum**
> caminho de estoque em `contracts/openapi-v1.json`") deixou de ser verdade. Hoje o contrato tem
> `GET`/`POST /api/variants/{variantId}/stock-movements` (kardex **por variante**),
> `GET /api/variants/{variantId}/stock-balances`, `GET`/`POST /api/stock-locations` +
> `PUT …/{id}`, `GET /api/picking-queue`, as reservas técnicas (`/api/technical-reserves`, com
> `POST` e `…/{id}/cancel`) e três relatórios (`/api/reports/stock-aging`, `…/stock-valuation`,
> `…/quote-vs-stock`). `src/data/estoque-api.ts` consome saldo, depósitos, kardex e fila.
>
> **O que esta seção pede e continua faltando é a forma TRANSVERSAL**: a listagem de movimento que
> não parte de uma variante (com a whitelist de filtro dos 6 campos), a ficha por id, o saldo com
> `asOf`, e as quatro escritas por OPERAÇÃO da tabela abaixo — hoje há um `POST` de movimento
> genérico, que é justamente o desenho que o parágrafo seguinte recusa. Ler o resto como proposta
> viva, não como diagnóstico do contrato de hoje.

Sem eles, a tela não pode mostrar número nenhum — e a regra do repo diz o que fazer nesse
meio-tempo: coluna que o DTO não tem sai da listagem, e o `AvisoDeCobertura` conta ao operador o
que ainda não vem do servidor.

### Leitura

| caminho `Proposto` | responde | o que precisa publicar junto |
|---|---|---|
| `GET /api/stock/movements` | a listagem do `telas.md` §3 | paginação padrão · `sortBy` com `occurredAt` (padrão, desc) · **whitelist de filtro** com os 6 campos de `filtros-movimentacao.ts` |
| `GET /api/stock/movements/{id}` | a ficha (§3.5) | observação completa, documento de origem resolvido, a outra perna da transferência |
| `GET /api/stock/balances` | saldo por local (§4) | `variantId`/`locationId`, `onHand`, `allocated`, `available`, `minStock`, e o parâmetro **`asOf`** (data de referência) |
| `GET /api/stock/locations` | o combo de local | os 4; é lookup, não listagem |

### Escrita — quatro caminhos, não um

**O endpoint é a OPERAÇÃO, não a linha do kardex.** Um `POST /api/stock/movements` genérico
deixaria o cliente escolher `delta` e, pior, `balance_after` — que a ADR-009 diz que é o banco
quem preenche, na mesma transação. Então:

| caminho `Proposto` | corpo | vira |
|---|---|---|
| `POST /api/stock/entries` | variante, local, quantidade, motivo, observação | 1 movimento `delta > 0` |
| `POST /api/stock/removals` | idem | 1 movimento `delta < 0` |
| `POST /api/stock/counts` | variante, local, **quantidade contada**, observação | 1 movimento `delta = contado − saldo`, ou nada se der zero |
| `POST /api/stock/transfers` | variante, origem, destino, quantidade, observação | 2 movimentos, mesma transação, `source_id` compartilhado |

Os quatro respondem **409/422 com o saldo real** quando não dá para tirar — mesma exigência já
escrita em `docs/harvest/reserva-de-estoque/nota-front.md` §5: erro sem o número obriga o operador
a adivinhar quanto falta.

## 2. Gaps de SCHEMA

Cada um destes é decisão do trilho de schema; a proposta está no arquivo indicado.

| gap | efeito hoje | proposta |
|---|---|---|
| **`stock_movements` não tem observação** | o `Ajuste` (o único movimento sem documento atrás) grava "alguém mudou o saldo" e o porquê morre. O legado tinha o campo (`lesd_observacao`, varchar 300) | coluna `notes text`, obrigatória por regra de aplicação no ajuste, opcional no resto |
| **`reason` e `source_kind` são `varchar` sem domínio** | filtro por motivo não existe; a mesma coisa vira 4 grafias | `vocabulario-de-movimento.md` §3 e §4 |
| **`stock_locations` não tem `external`** | depósito de terceiro entra na conta de "o que temos" | coluna `external boolean`; o legado já tinha (`EstoqueTipo.EstTp_externo`) e o InvenTree também |
| **`stock_locations` não tem `sort`** | "ordem configurada de depósito" não existe — some no rateio da reserva e na ordem do combo | já proposto em `docs/harvest/reserva-de-estoque/proposta-schema.md` §5; é a mesma coluna, não duas |
| **`source_kind = 'stock_entry'` não tem para onde apontar** | não há tabela de lançamento manual no schema novo | nascer sem (`source_id` nulo + observação obrigatória) — `vocabulario-de-movimento.md` §5.2 |
| **inventário não é documento** | o `count` unitário cobre a rotina, o balanço em lote não tem onde morar | fora do recorte; virar issue própria se o inventário anual entrar |

## 3. Decisões pendentes — do user

1. **`'A'`, `'Z'` e `'B'` de `Elg_operacao`** (`vocabulario-de-movimento.md` §1). Cinco códigos de
   operação são consultados pelo binário; só `'E'` e `'S'` se explicam sozinhos. Sem o significado
   dos outros três, a migração não sabe para que `reason` mandar essas linhas. Um `SELECT
   DISTINCT Elg_operacao, Elg_tipo, COUNT(*)` na base real responde.
2. **Os campos da tela de Movimentação, que NUNCA foi capturada.** `telas.md` §1: a transcrição
   diz explicitamente que o menu `Movimentação` inteiro ficou fora. Tudo o que está especificado
   aqui vem do banco do legado, do schema novo ou do InvenTree — **nenhum campo veio de print de
   tela**. Se existir captura dessa tela em algum lugar, ela vale mais que este documento inteiro.
3. **Lançamento manual: documento ou linha solta?** (`vocabulario-de-movimento.md` §5.2) O legado
   agrupava ~3 itens por lançamento, com fornecedor no cabeçalho.
4. **Devolução de cliente entra na v1?** Tem volume no legado (11.557) e depende de um fluxo de
   devolução que nenhuma tela cobre.

## 4. Ordem

1. User responde o §3 (pelo menos o item 1 e o item 2).
2. Trilho de schema aplica os gaps do §2.
3. **PR de contrato aqui**, com os caminhos do §1 marcados `Proposto`, `pnpm codegen` e o gerado
   commitado no mesmo PR.
4. Tela, compondo o que já existe: DataTable com `filtros` (o piloto do #76 já provou o caminho),
   barra de ações adaptada (§3.2 do `telas.md`), `AvisoDeCobertura` enquanto a cobertura for
   parcial.

**A ordem não é negociável no primeiro passo.** Construir a listagem antes de o contrato existir
significa mock — e mock de estoque é o pior lugar possível para dado de mentira com cara de dado
do servidor, porque a decisão que ele apoia é comprometer material com o cliente.

## 5. O que esta pasta NÃO fez

- Não tocou `src/`, `contracts/`, `docs/cabinet/`, `package.json` nem `pnpm-lock.yaml`.
- Não instalou dependência; não rodou `pnpm codegen` (o contrato não mudou).
- Não abriu fonte copyleft. A única externa é o InvenTree (MIT), com commit e arquivos no `NOTICE`.
- **Não inventou campo de tela.** Cada campo do `telas.md` carrega a marca da sua origem, e o que
  não tem origem está no §3 acima como pergunta.
