# Paridade de FLUXO com o Softlux — levantamento de lacunas de encadeamento

> Medido em **2026-08-25** contra `origin/main` do web em `1754c9e` e o
> `contracts/openapi-v1.json` da mesma árvore. Números e nomes de arquivo aqui
> **envelhecem calados** — a seção [Como re-medir](#como-re-medir) tem os comandos
> exatos que produziram cada tabela. Quem discordar de uma linha roda o comando
> antes de discutir a linha.

## O eixo, e o que ele NÃO é

Decidido em 2026-08-13: o eixo é **fluxo entre telas** — de onde se chega em cada
tela, o que ela entrega pra próxima, que atalho de transição o Softlux tem e o
Cabinet não. Não é paridade de campo, não é paridade de ação isolada, não é
espelhar o arranjo do desktop.

Grau: **mesma capacidade, desenho do Cabinet.** O operador consegue fazer o que
fazia, pela linguagem nova.

**O que fica fora deste documento, de propósito:** campo ausente num formulário,
coluna ausente numa grade, e rótulo. Os três já têm dono em outros trilhos, e
misturá-los aqui faria a lacuna de fluxo — que é pequena em linhas e grande em
efeito — desaparecer dentro de uma lista de trezentos campos.

## O padrão já provado, e por que ele é o gabarito

A navegação **pedido de compra ↔ ordem de compra** entrou na `web#361` e é o
formato que este levantamento persegue:

- o gesto **carrega contexto na querystring** (`?dePedido&fornecedor`), não vai
  para uma listagem esperando que o operador reencontre o que já estava na mão;
- o gesto **só aparece quando faz sentido** — um botão por fornecedor com linha
  aberta; linha já `ordered` não aparece, porque o servidor a recusaria com
  `item-ja-em-ordem` e oferecê-la seria montar ordem que só falha ao gravar;
- **a volta existe** e sai de um campo que o contrato já publica
  (`sourceRequestId`), um botão por pedido de origem.

Três exigências, e a terceira é a que mais falta: **quase toda lacuna encontrada
aqui é uma volta que não existe, ou um id que chegou e morreu em texto.**

## A cadeia do legado, elo a elo, contra o Cabinet de hoje

O legado descreve o encadeamento em `MAPA_EDGES` (`docs/legado/gera-operacoes.py`).
Doze operações, doze arestas. A coluna "no Cabinet" é medição, não intenção:

| # | Aresta do legado | Campo que o contrato publica | Na tela, hoje |
|---|---|---|---|
| 1 | cliente → orçamento | `QuoteDto.customerId` | combo de cliente; **sem atalho para a ficha** |
| 2 | profissional → orçamento | `QuoteDetailDto.professionalId` | combo; **sem atalho para a ficha** |
| 3 | fornecedor → preço | `PriceIndexDto.supplierId` | fora do escopo (D1/Preços) |
| 4 | produto → preço | `VariantTablePriceDto.supplierId` | fora do escopo (D1/Preços) |
| 5 | preço → orçamento | valor unitário no item | ✅ o item já nasce com o preço |
| 6 | orçamento → pedido | `OrderDto.quoteId` | ✅ **`Gerar pedido`**, navega ao pedido novo |
| 7 | pedido → pedido de compra | `PurchaseRequestDto.orderId` | ❌ **só na direção inversa** (ver A2/B1) |
| 8 | pedido de compra → ordem | `PurchaseOrderItemDto.sourceRequestId` | ✅ **web#361**, por fornecedor, com querystring |
| 9 | ordem → nota do fornecedor | `/api/goods-receipts` | ❌ **sem tela no web** (ver D2) |
| 10 | nota → movimentação de estoque | entrada por recebimento | ❌ quebra junto com o 9 |
| 11 | pedido → movimentação (baixa na entrega) | `DeliveryDto.orderId` | ✅ quadro de cargas |
| 12 | movimentação → saldo | kardex | ✅ tela de movimentação |

**Sete das doze arestas estão de pé.** As que faltam se concentram em dois pontos,
e não são o mesmo tipo de falta: a 7 é uma transição que ninguém escreveu; as 9 e
10 são uma tela inteira que não existe.

## As lacunas, por classe

A classe importa porque decide o custo. Um link morto é uma linha; uma tela
ausente é um trilho.

### Classe A — o id chega, e morre em texto

O caso mais barato e o mais frequente. O servidor resolve o id **e** o número
justamente para a tela dizer "veio de tal documento" sem uma segunda consulta —
e a tela imprime o número e joga o id fora.

| A# | Onde | Em mãos | Hoje | O que falta |
|---|---|---|---|---|
| A1 | `features/vendas/pedido-venda-form.tsx` → `OrigemDoPedido` | `orcamentoOrigemId` | `<strong>` | link ao orçamento de origem |
| A2 | `features/pedido-compra/pedido-compra-form.tsx` → `BlocoDoPedidoDeVenda` | `pedidoVendaId` | `<output>` | link ao pedido de venda |
| A3 | idem, mesmo bloco | `clienteId` | `<output>` com `<Nome>` | link à ficha do cliente |
| A4 | grade do pedido de compra | `ordemId`, `ordemNumero` | só a coluna `situacao` | a linha `ordered` diz **que** foi, não **para onde** |
| A5 | `features/ordem-compra/previsao-de-chegada.tsx` | `orderId`, `customerId` | não renderizados | da previsão não se chega ao pedido que espera a peça |

**O precedente está na própria casa, a poucas linhas de distância.** No
`orcamento-form.tsx`, o bloco `RevisaoDe` recebe `revisaoDeId` + `revisaoDeNumero`
e monta um `<Link>` — é o único lugar do repositório onde esse par vira navegação.
Os cinco casos acima recebem exatamente o mesmo par e param no texto.

O A5 merece nota própria: a previsão de chegada é a tela do comprador, e a linha
já traz `customerName`. Ela diz *"esta peça atrasada é do cliente Fulano"* e não
leva a Fulano nem ao pedido dele — que é a pergunta seguinte de quem lê a tela.

### Classe B — a transição não existe

| B# | Transição | O legado | O Cabinet |
|---|---|---|---|
| B1 | pedido de venda → pedido de compra | `FLUXOS['pedido']`: decisão *"Tem saldo em estoque?"* → ramo não → *"Gera pedido de compra"* | o pedido de compra existe e **vincula a venda por busca, de dentro de compras** |
| B2 | orçamento → ficha do cliente | botão `👤 Cliente` ao lado do campo (transcrição §8.2) | combo de cliente, sem atalho |
| B3 | ordem de compra → filtrar itens por venda | bloco `Filtro Sobre Venda` no cabeçalho (§7.2) | não existe |

**O B1 é a inversão de sentido do fluxo puxado, e é a lacuna de maior efeito
neste levantamento.** No legado a compra nasce da venda: o operador está no
pedido de venda, não tem saldo, e a compra é a consequência. No Cabinet o elo
existe (`PurchaseRequestDto.orderId`) e só se percorre ao contrário — o comprador
abre um pedido de compra e **procura** a venda. Quem está na venda não tem como
sair dela em direção à compra.

A diferença não é de gesto, é de quem sabe da necessidade: **quem sabe que falta
peça é o vendedor, olhando o pedido dele.** O caminho de hoje obriga esse
conhecimento a atravessar para outra pessoa antes de virar documento.

### Classe C — o botão existe, e é `console.info`

`features/orcamento/orcamento-form.tsx`, rodapé — os quatro botões do rodapé do
orçamento do Softlux (§8.2) foram desenhados na tela e nenhum faz nada:

| C# | Botão | Hoje | O que seria |
|---|---|---|---|
| C1 | `📦 Estoque` | `console.info('[mock] Estoque')` | saldo da variante sem sair do documento |
| C2 | `📄 Orçamento` | `console.info('[mock] Imprimir Orçamento')` | o PDF (trilho D2/impressão) |
| C3 | `Alterar Limites` | `console.info('[mock] Alterar Limites')` | teto de desconto — **é 403 por papel**, não campo |
| C4 | `🔒 Permissões` | `console.info('[mock] Permissões')` | autorização por documento |

São quatro de **sete** mocks do mesmo arquivo — os outros três (`Mostrar imagem do
produto`, `Pré Produto`, `Desconto Grupo`) são botões de item, não de rodapé, e
saem pelo mesmo motivo: nenhum é navegação.

Classe própria porque o custo é enganoso: **o botão já ocupa o lugar certo na
tela**, então parece um degrau menor que o da classe B, e é maior — os sete são
recurso que ainda não existe do outro lado, não caminho que ninguém ligou.

### Classe D — a tela não existe, e a cadeia quebra ali

| D# | O quê | Contrato | Camada de dados | Tela |
|---|---|---|---|---|
| D1 | reposição de estoque | `GET /api/purchases/stock-replenishment`, `PurchaseReplenishmentRowDto` com `qtySuggested`/`minimumQty`/`supplierId` | **existe e é órfã** | nenhuma |
| D2 | recebimento / nota do fornecedor | `/api/goods-receipts` + `/check` + `/post` | nenhuma | nenhuma |
| D3 | obra do cliente | `/api/works`, `QuoteDetailDto.workId` + `workName` | — | `descricaoObra`, **texto livre** |

**Os dois primeiros não estão no mesmo estágio, e a diferença muda quem paga.** O D1
tem o hook escrito — `src/data/compras-api.ts` monta a query, registra a chave
`compras-reposicao` e a invalida junto com ordem e pedido. **Ele não tem um único
chamador em `features/` ou `routes/`.** Falta a tela e nada mais; e vale a
advertência de sempre sobre função sem chamador: ela nunca foi exercida contra
servidor de verdade, então "só falta a tela" é estimativa, não medição.

O D2 não tem nem isso — `compras-api.ts` não menciona `goods-receipt` em linha
nenhuma. **É por ele que a cadeia de compra não fecha na tela:** a ordem sai, e a
chegada da mercadoria não tem onde ser lançada. Aresta 9-10 da tabela acima.

O D1 é a aresta `estoque-saldo → ordem de compra` do legado inteira: o cálculo de
sugestão existe no servidor, a tela o pede em código e ninguém o vê.

O D3 é o mais silencioso dos três. O contrato publica `workId` e a tela grava um
texto — dois orçamentos da mesma obra não se reconhecem como tal.

## O que a PR seguinte implementa, e o que ela deixa

**Entra:** A2, A3, A4, A5 e B1 — as quatro voltas mortas fora da zona da #356, e a
inversão do fluxo puxado no formato da `web#361` (querystring com contexto).

**Fica de fora, com motivo escrito:**

- **A1** — mora em `src/features/vendas/pedido-venda-form.tsx`, reivindicado pela
  **#356**, aberta e `MERGEABLE`. Zona disjunta vale mais que o link: é uma linha
  de trabalho, e o conflito custaria mais que ela.
- **B2** — o combo de cliente do orçamento é componente compartilhado por quatro
  cadastros; pendurar navegação nele é decisão de componente, não de tela.
- **B3, C1-C4, D1-D3** — nenhum é transição. São recurso do outro lado
  (impressão, permissão por documento, consulta de saldo) ou tela inteira. Entram
  nos trilhos que já os têm.

## Notas de divergência — o aviso de 2026-08-13, cumprido

> O mapeamento **tabela→passo** do `operacoes.html` merece desconfiança e segue sem
> revisão de quem opera o sistema. Aqui ele foi lido como levantamento de
> requisito, nunca como especificação. **O que divergiu virou nota, não verdade.**

**N1 — a baixa de estoque não é do pedido.** `TAB_PASSO['pedido'][4]` diz que o
pedido de venda grava `estoque_log`. No Cabinet quem baixa é a **separação/entrega**
(`DeliveryDto`), e a diferença é deliberada: a peça sai do galpão quando sai, não
quando o documento fecha. A aresta 11 da tabela está de pé por um caminho que o
`operacoes.html` não descreve.

**N2 — a sugestão de compra não grava ordem.** `TAB_PASSO['estoque-saldo'][4]` diz
`('ordem_compra', 'grava')`. No contrato do Cabinet, `stock-replenishment` é
**`GET` e só** — devolve linhas com `qtySuggested`, e a ordem nasce noutra rota. O
passo do legado colapsa sugerir e comprar num gesto; aqui são dois. Isto **não é
lacuna do Cabinet** — é divergência de modelo, e a do Cabinet parece a certa: uma
sugestão que grava documento é uma sugestão que não se pode recusar.

**N3 — o pedido de compra do legado tem N fornecedores, e a ordem tem 1.** A
transcrição (§7.3) mostra a coluna `Fornecedores` concatenada por ` - `. O Cabinet
guarda a mesma cardinalidade e é o que torna a navegação da `web#361` ser **por
fornecedor** e não por documento. Ponto onde legado e Cabinet concordam, e vale
registrar: é a razão de o gabarito ser o que é.

**N4 — a âncora `@mapa-softlux` não existe mais.** O prompt e o `current-state.md`
nomeiam `topicos/frente-visual.md` **@mapa-softlux** como fonte. O arquivo tem hoje
116 âncoras e nenhuma é essa; o inventário de telas vive em
`topicos/transcricaosoftlux.md`, usado aqui no lugar dela. **Fonte declarada que
não resolve é fonte que envelheceu** — quem citar a âncora de novo vai procurar o
mesmo nada.

## Como re-medir

Contra a raiz do `cabinet-erp-web`, na `main`:

```sh
# Classe A — todo navigate/Link que carrega contexto de negócio.
# Hoje só DUAS querystrings são de negócio (dePedido/fornecedor, funilId/etapaId);
# o resto é `modo` e `modulo`, que são estado de tela, não fluxo.
grep -rn -A4 "void navigate({$" src --include='*.tsx' | grep -B1 "search:"

# Classe C — botão desenhado e morto. Devolve 16 no repositório inteiro: os de
# `Gravar` e `Foto` são outra dívida, os 7 de `orcamento-form.tsx` são esta.
grep -rn "console.info('\[mock\]" src --include='*.tsx'

# Classe D — rota publicada e o estágio em que ela parou. Os dois greps NÃO dizem
# a mesma coisa, e a diferença entre eles é o diagnóstico:
grep -rln "stock-replenishment\|goods-receipt" src/data          # camada de dados
grep -rln "eposicao\|ecebimento" src/features src/routes         # tela

# A cadeia do legado, sem abrir o HTML gerado:
sed -n '/^MAPA_EDGES/,/^]/p' docs/legado/gera-operacoes.py
sed -n '/^FLUXOS = {/,/^}/p'  docs/legado/gera-operacoes.py
```

O primeiro comando é o que sustenta a frase *"quase toda lacuna é uma volta que não
existe"*: ele lista o conjunto inteiro de transições com contexto do repositório, e
ele cabe numa tela.
