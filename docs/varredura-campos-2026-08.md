# Varredura campo-a-campo — o que cada tela ainda mente (2026-08)

> Issue #456 (K3). **Documento, não código:** nenhuma tela, provider ou contrato muda aqui. As
> issues propostas ficam no corpo (§8) e o user tria.

## 1. A classe de defeito

A tela foi desenhada sobre a transcrição do SoftLux; o contrato nasceu depois e menor. Onde os dois
divergem, o formulário desenha um campo que **não tem para onde ir** — e como a família toda está na
passagem (`products`, `quotes`, `orders`, `works` em `src/mocks/rotas-do-backend.ts:350,436,448,606`),
o sintoma só aparece com backend real: no mock, `src/mocks/api/*` guarda o objeto inteiro e devolve
tudo de volta, então a tela parece funcionar por completo.

Colaborador revelou ~13 campos assim; parceiro idem. Esta varredura cobre **produto, obra, orçamento
e pedido de venda**.

**Medido em `eab1790`** (worktree em dia com `origin/main`, `0 0` no `rev-list --left-right`),
contra `contracts/openapi-v1.json` **deste commit**: 205 operações, 149 caminhos, 277 schemas.

### Método

1. O schema **Zod da tela** é a lista de campos (é ele que o `CadastroForm` valida e é o resultado do
   `parse` que chega ao `onGravar`) — mais os controles que o JSX monta e os botões.
2. O **adaptador em `src/data/`** diz o que de fato atravessa: a função de leitura
   (`produtoDoContrato`, `paraOrcamento`, `paraPedido`) e a de escrita (`produtoParaContrato`,
   `paraEscrita`).
3. O **schema do contrato** diz o que o servidor aceita — `*WriteRequest` para escrita, `*Dto` para
   leitura. **Os dois são medidos separadamente**: campo que lê e não escreve é uma classe própria.
4. Para o veredito, o **schema do legado** (`docs/legado/schema/bdprincipal-colunas.csv` +
   `-linhas.csv`) diz se o campo tem lastro em 20 anos de operação ou se é enfeite de tela.

### O que NÃO foi medido

- **Preenchimento das colunas do legado.** `-linhas.csv` conta linha de tabela, não coluna
  preenchida. Coluna existir não prova que o operador a usa (exceto onde a contagem é zero, que é
  prova do contrário — ver `ProdutosLocEstoque`).
- **Sonda ao vivo.** Nada aqui foi medido contra o `:3000`. Tudo é leitura de contrato, de fonte e de
  dump do legado — o que basta para "o campo tem lastro?", e não basta para "o servidor responde?".

## 2. Os três vereditos

| veredito | quando | custo de errar |
|---|---|---|
| **ENTRA NO CONTRATO** | o campo tem coluna no legado com dado real, e o operador o usa | manter fora = a tela mente e o dado do ETL não tem para onde ir |
| **SAI DA TELA** | o campo não tem lastro, ou tem coluna vazia no legado | manter = ensinar que grava o que não grava |
| **DÍVIDA** | tem lastro, mas o custo agora não se paga; fica visível e declarado | não declarar = alguém "conserta" ligando pela metade |

Um quarto estado aparece o tempo todo e não é veredito, é **defeito**: campo com lastro nos DOIS
lados que a tela liga errado. Esses vão em §8 como issue, não como linha de tabela.

## 3. Placar

A coluna "monta" é medida: `grep -c 'name="'` (controles ligados ao form) + `grep -c "key: '"`
(colunas de grade) no arquivo do formulário — as duas telas de documento somam ainda o
`bloco-pagamento.tsx` compartilhado (+1 controle). As demais colunas são contadas à mão, campo a
campo, nas seções abaixo.

A quarta coluna junta dois casos que a leitura por tela separa: no **produto** a fronteira LÊ e não
tem para onde escrever (não existe caminho — §4.2, perde a edição); no **orçamento** ela não faz
nenhum dos dois, e aí o `PUT` integral apaga o que já estava gravado (§5.2). O segundo é pior.

| tela | monta (controles + colunas) | sem lastro no contrato | o contrato tem e a fronteira não devolve | defeito ligando errado |
|---|---|---|---|---|
| **Produto** | 49 + 36 | **40** | 8 colunas | 0 |
| **Orçamento** | 13 + 14 | **0** | **3** — e o `PUT` integral os APAGA | **3** |
| **Pedido de venda** | 14 + 14 | **0** | 0 | 0 |
| **Obra** | — | — | — | **tela não existe** |

A leitura importante do placar: **o defeito mudou de forma entre as telas de cadastro e as de
documento.** Produto tem 40 campos órfãos e nenhum ligado errado. Orçamento tem zero órfãos e três
ligações erradas — duas delas apagam dado gravado. E o pedido, que é a folha irmã do orçamento e nasceu
depois, está limpo nas quatro colunas: **o mesmo par de telas mostra o defeito e a correção**, o que
torna a maior parte de §8 um porte, não um projeto.

## 4. Produto — `src/features/produto/produto-form.tsx`

Contrato: `ProductWriteRequest` (13 campos + `specs`), `ProductDetailDto`, `ProductVariantDto`,
`ProductSupplierDto`, `ProductRelatedDto`. Caminhos: `/api/products`, `/api/products/{id}`,
`/api/products/{productId}/variants[/{id}]`, `/api/table-prices/{variantId}`.

**Com lastro completo (leitura + escrita), 33 campos:** os três códigos, descrição, ativo, as quatro
unidades, tipo/marca/fábrica por id, os 13 da ficha técnica (`specs`) e as 8 medidas
(`productDimensions`/`packageDimensions`). A aba **Preço e Margem** também está coberta
(`/api/table-prices/{variantId}` + `POST /api/cost-profiles/{id}/simulate`) e declara as próprias
lacunas na tela — não entra nesta varredura.

### 4.1 Sem lastro nenhum — o contrato não tem o campo

| campo na tela | rótulo | onde | coluna no legado | veredito |
|---|---|---|---|---|
| `dtVigencia` | Dt de Vigência | `produto-form.tsx:51,254` | `produtos.Pro_dt_vigencia` | ENTRA |
| `tipoPeca` | Tipo da Peça | `:53` | `produtos.Pro_tp_peca` | ENTRA |
| `tipoLinha` | Tipo da Linha | `:54,272` | `produtos.TpLinha_Codigo` | ENTRA |
| `classificacao` | Classificação do Produto | `:59` | `produtos.ClasProd_codigo` | ENTRA |
| `empresaCompradora` | Empresa Compradora | `:60,312` | `produtos.Pro_EmpresaCompradora` | ENTRA |
| `designerModelo` | Designer\Modelo | `:61,318` | `produtos.Desig_Codigo` | ENTRA |
| `descricaoComplementar` | Nossa Descrição Complementar | `:76,340` | `produtos.Pro_DescricaoComplementar` | ENTRA |
| `foraDeLinha` | Fora de Linha | `:77,202` | `produtos.Pro_ForaLinha` | ENTRA |
| `consultarValor` | Consultar Valor | `:78,203` | `produtos.Pro_ConsultarValor` | ENTRA |
| `sobreMedida` | Sobre Medida | `:80,205` | `produtos.Pro_SobreMedida` | ENTRA |
| `descricaoLivre` | Descrição Livre | `:96,418` | `produtos.Prod_DescricaoLivre` | ENTRA |
| `publicarNoSite` | Publicar no Site | `:97,419` | `produtos.Prod_ExibirSite` | ENTRA |
| `origemProduto` | Origem do Produto | `:156` | `produtos.TpOriPro_codigo` | ENTRA |
| `ncm` | NCM | `:157` | `produtos.pro_NCM` | ENTRA |
| `cest` | CEST | `:158` | `produtos.Pro_CEST` | ENTRA |
| `impostoPadrao` | Padrão (impostos NFe) | `:159` | `produtos.TbImp_codigo` / `Trib_Codigo` | ENTRA |
| `codigoProduto` | Código do Produto | `:130` | — (seletor de exibição) | **SAI** — é preferência de vista, não dado do produto |
| `variantes[].indice` | Índice | `:108,450` | `Preco_Produto.Pre_Codindice` (169.764 linhas) | ENTRA |
| `variantes[].tipoValor` | Tipo de Valor | `:114,452` | `Preco_Produto.Pre_tp_vl` | ENTRA |
| `localizacoes[]` (6 col.) | Localização do Estoque | `:117,458` | `ProdutosLocEstoque` — **0 linhas** | **SAI** |
| `gruposRelacionados[]` (3 col.) | Nome do Grupo/Padrão/Ativo | `:127` | `Produto_Relacionados.Pre_Grupo`, `.pre_padrao` (95 linhas) | DÍVIDA |
| `itensGrupo[]` (5 col.) | Cód./Descrição/Acab./Qtd./Padrão | `:131` | idem — mesma tabela, outra vista | DÍVIDA |
| `impostosNfe[]` (7 col.) | Busca automática pelo NCM | `:160` | `produtos.pro_AliqPIS/IPI/COFINS`, `TbImp_codigo` | DÍVIDA |

**`localizacoes` é o achado mais barato da varredura:** a grade tem seis colunas, a tela instrui
"tecle F3 para inserir localização do estoque" (`produto-form.tsx:428` — e F3 é tecla **vetada** pelo
CLAUDE.md), e a tabela correspondente no legado tem **zero linhas**. Ninguém usou isso em 20 anos.

**`gruposRelacionados` + `itensGrupo` são a MESMA tabela do legado** (`Produto_Relacionados`, 95
linhas) que o contrato já publica como `relatedProducts` — a tela mantém as três grades lado a lado,
e o próprio código diz que qual modelo sobrevive é decisão em aberto (`produto-form.tsx:143`, api#117).
Fica DÍVIDA porque decidir isso é modelagem, não campo.

### 4.2 Lê do servidor e não devolve — 8 colunas

| grade | leitura | escrita | consequência |
|---|---|---|---|
| `fornecedores[]` (4 col.) | `ProductSupplierDto` → `produtos-api.ts:218` | **nenhuma** — `ProductWriteRequest` não tem `suppliers` e não há `/api/products/{id}/suppliers` | grade **editável** que descarta a edição, em silêncio |
| `produtosRelacionados[]` (4 col.) | `ProductRelatedDto` → `produtos-api.ts:219` | **nenhuma** | idem |

Não apaga nada (o `PUT` integral não mexe no que não é campo do corpo), mas o operador inclui linha,
grava, recebe 200 e reabre sem a linha. É a mesma classe do "cadastro fingia gravar" do colaborador.

**Não confundir com o Índice/Tipo de Valor da variante:** ali a grade grava (via
`/api/products/{productId}/variants`), só que as duas colunas somem no caminho.

### 4.3 Botões que não fazem nada

`Incluir Foto` / `Retirar Foto` (`produto-form.tsx:188,196`) são `console.info`. O legado tem
`produtos.Pro_foto` (nvarchar 200 — caminho de arquivo). Veredito: **DÍVIDA** — foto pede decisão de
armazenamento (o contrato não tem upload em lugar nenhum), e um botão que não faz nada é melhor
removido que mantido enquanto isso.

## 5. Orçamento — `src/features/orcamento/orcamento-form.tsx`

Contrato: `QuoteWriteRequest` (17 campos, incluindo `groupDiscounts` e `serviceItems`),
`QuoteDetailDto` (30). Caminhos: `/api/quotes`, `/{id}`, `/cancel`, `/order`, `/revise`, `/print`.

**Nenhum campo escalar da tela está sem lastro.** Número, série, pasta, as três datas, cliente,
profissional, desconto e o bloco de pagamento inteiro têm par no contrato — o cabeçalho desta tela
está mais bem servido que qualquer cadastro. O defeito aqui é de **ligação**, e é caro.

### 5.1 Os três defeitos

**(a) `Consultor(a)` grava no campo errado — o combo é de CARGO.**

`orcamento-form.tsx:289` monta `<LookupSelectField name="consultor" kind="cargo">`. O componente grava
**o id da opção no campo apontado por `name`** (`form-controls.tsx:337`, "O valor é o ID"), e
`consultor` é o campo do **nome** (`salespersonName` na leitura, `quotes-api.ts:113`). Consequências,
nesta ordem:

1. `consultorId` — o que vira `salespersonId` no corpo (`quotes-api.ts:213`) — **nunca muda**. Escolher
   um consultor não grava consultor nenhum.
2. O campo passa a conter um uuid de item de lista de **cargo**, que não é pessoa. Aparece como nome
   enquanto a lista está carregada e volta ao valor antigo na releitura.
3. O comentário na própria tela (`:285`) já registra que o alvo do `[busca +...]` não foi
   identificado — mas o campo continua ligado ao kind errado enquanto isso.

**A tela do PEDIDO já consertou exatamente isto** (`pedido-venda-form.tsx:448`: o campo virou
`readOnly`, alimentado pelo painel de participação). O orçamento ficou para trás.

**(b) Desconto por grupo: a tela apaga o que o servidor guarda.**

`QuoteWriteRequest.groupDiscounts` existe. `orcamentoSchema` **não declara** o campo, `paraEscrita`
**não o devolve** (`quotes-api.ts:191`), e o `PUT` é integral — corpo sem `groupDiscounts` é
documento sem `groupDiscounts`. Pior, o modo: `modoDesconto: z.enum(['PRODUTO','GERAL'])`
(`orcamento-form.tsx:92`) não tem `GRUPO`, e a leitura mapeia todo modo que não é `general` para
`PRODUTO` (`quotes-api.ts:128`) — um orçamento com desconto por grupo abre como "por produto" e grava
`product`. **No legado são 300.337 linhas de `VendaDesconto`.**

Não morde hoje **só porque o mock recusa**: `src/mocks/api/quotes.ts:592` devolve 400 para
`discountMode: 'group'`, e o comentário de lá (`:584`) descreve este exato risco. Com backend real ou
dado importado, morde.

O **pedido de venda já resolveu** (`pedido-venda-form.tsx:94`, `pedidos-venda-api.ts:350`): declara
`descontosPorGrupo`, reenvia, e mostra `AvisoDeCobertura` quando o modo é GRUPO. O botão `Desconto
Grupo` do orçamento (`orcamento-form.tsx:419`) é `console.info`.

**(c) Ambiente: o operador escolhe e não grava.** A coluna e o botão usam `tabelas.ambientes`, que é
**INVENTADA** (`src/data/tabelas.ts:38-39`), e `paraEscrita` descarta todo código que não esteja nos
ambientes do documento (`quotes-api.ts:192-194`) — corretamente, porque `environmentCode` é `uuid` no
contrato. Resultado: inserir "Ambiente" pelo botão grava linha **sem ambiente**, com 200.

O legado tem cadastro de verdade: **`Ambiente`, 346 linhas**, com FK de `VendaAmbiente` e
`VendaServico`. O que falta é um `kind` de lista de apoio — que é o que o comentário do adaptador já
pede por escrito. Veredito: **ENTRA NO CONTRATO**.

### 5.2 Publicado no contrato e ausente da fronteira — 3

Pior que "lê e não grava": `serviceItems` e `groupDiscounts` **não aparecem em `quotes-api.ts` em
lugar nenhum** (`grep` volta vazio) — nem na leitura, nem na escrita. Com `PUT` integral, isso não é
campo perdido na ida: é campo **apagado** a cada gravação.

| campo | no `QuoteDetailDto` | na fronteira (`quotes-api.ts`) | nota |
|---|---|---|---|
| `serviceItems` | sim | **ausente nos dois sentidos** | **em curso na PR #416** — não abrir issue |
| `groupDiscounts` | sim | **ausente nos dois sentidos** | §5.1(b) |
| `workId`/`workName` | sim | **ausente nos dois sentidos** | `quotes-api.ts:202` declara por escrito: não morde enquanto documento nenhum tiver obra a perder, e morde no instante em que mock, api ou importação ligar uma |

### 5.3 Botões `console.info` — 6

`Pré Produto` (`:224`), `Desconto Grupo` (`:419`), `Imprimir Orçamento` (`:577`), `Estoque` (`:585`),
`Alterar Limites` (`:593`), `Permissões` (`:601`).

Dois deles têm o outro lado pronto e são só ligação faltando:

- **`Imprimir Orçamento`** — `GET /api/quotes/{id}/print` **existe no contrato**.
- **`Alterar Limites`** — `Venda.Ven_LimiteDesconto`, `Ven_LimiteDescontoFixo`,
  `Ven_LimiteDescontoFixoFormaPag`, `Ven_LimiteDescFixoFormaPagVl` no legado; e a fila de aprovação de
  teto de desconto está na **PR #417**. Conferir sobreposição antes de abrir issue.

### 5.4 Abas declaradas sem captura — e duas delas TÊM lastro

`ABAS_SEM_CAPTURA` (`orcamento-form.tsx:611`): Serviços, Cliente, Pagamento, Outros Dados. Mais duas
dentro dos Totais (`:447,452`): **Totais de Impostos** e **Frete**.

A frase "não capturada na transcrição (§10)" é verdadeira sobre a transcrição e **falsa como
conclusão** — o legado tem as colunas:

| aba | colunas no legado (`Venda`) |
|---|---|
| Totais de Impostos | `Ven_ICMSBase`, `Ven_ICMSValor`, `Ven_ICMSSTBase`, `Ven_ICMSSTValor`, `Ven_ImpostoRetido`, `Ven_ValorDIFAL` |
| Frete | `Ven_ValorFrete`, `Ven_HabilitarFrete`, `Ven_PorcentagemFrete` |

Veredito: **DÍVIDA declarada** — o aviso na tela deve dizer "existe no legado, ausente do contrato",
não "não capturada", que sugere que ninguém sabe se existe.

## 6. Pedido de venda — `src/features/vendas/pedido-venda-form.tsx`

**A tela mais limpa das quatro, e por um motivo estrutural:** ela declara no schema Zod tudo o que não
edita (`serviceItems`, `groupDiscounts`, `workId`, situação, ambientes, bloco de pagamento) e o
adaptador reenvia (`pedidos-venda-api.ts:327`). Zero campo sem lastro, zero botão `console.info`,
e o desconto por grupo tem `AvisoDeCobertura` quando o documento usa um modo que a tela não edita
(`:302`).

Duas ressalvas, as duas já declaradas em código:

| ponto | estado |
|---|---|
| `obraId`/`obra` | declarados, lidos e **reenviados**; a tela ainda não tem o campo (`:73`). DÍVIDA declarada — quem puser o campo liga os dois lados no mesmo PR |
| coluna `Ambiente` | mesma lista inventada e mesmo descarte no envio do orçamento (`pedidos-venda-api.ts:328`) — é o mesmo defeito §5.1(c), não um segundo |

`retornoDemonstracao` é carimbo de `POST .../demo-return`, que o backend responde 501 — anotado no
schema (`:86`) e correto: o campo existe no contrato.

## 7. Obra — a tela não existe

| o que existe | onde |
|---|---|
| 4 operações no contrato | `/api/works` GET,POST · `/api/works/{id}` GET,PUT |
| `WorkDto` / `WorkWriteRequest` | `customerId`, `description`, `workType`, `address`, `active` |
| handler de mock | `src/mocks/api/obras.ts` |
| passagem ligada | `rotas-do-backend.ts:606-609` |
| **tela** | **nenhuma** — zero rota, zero feature, zero provider em `src/data/index.ts` |
| dado no legado | `Obras`, **9.454 linhas** |

Consumidor único hoje: `workId` como **filtro** na listagem de orçamentos e pedidos
(`quotes-api.ts:84`, `pedidos-venda-api.ts:93`) — filtro por um id que nenhuma tela sabe escolher.

Isto não é campo que mente: é **módulo com servidor pronto e sem interface**. Nesta varredura ele é o
item de maior alavancagem, porque destrava as duas dívidas de `workId` das telas de documento (§5.2,
§6) — que hoje não se ligam justamente por não haver de onde escolher a obra.

O contrato de obra quase cobre a tabela: `WorkDto.address` reusa `PartnerAddress`, cujos 7 campos
casam um a um com `Obr_CEP`/`Obr_Endereco`/`Obr_numero`/`Obr_complemento`/`Obr_Bairro`/`Obr_Cidade`/
`Obr_UF`. Ficam de fora **`mun_codigo`** (o município como id — o `city` do contrato é texto livre, e o layout da NF-e pede o
código IBGE do município) e **`obr_transf`**. Os dois entram na conversa da tela, não antes.

## 8. Issues propostas — para o user triar

> Nenhuma foi aberta. Ordem = valor por custo, na minha leitura.

**P1 — Orçamento: `Consultor(a)` grava id de cargo no campo do nome.**
`LookupSelectField name="consultor" kind="cargo"` → `salespersonId` nunca muda. Portar a correção que
o pedido já tem (campo `readOnly` alimentado pelo participante principal). Zona:
`src/features/orcamento/`. Ver §5.1(a).

**P2 — Orçamento: gravar apaga o desconto por grupo.**
Declarar `descontosPorGrupo` no schema, reenviar em `paraEscrita`, acrescentar `GRUPO` ao
`modoDesconto` e mostrar `AvisoDeCobertura` — tudo já escrito no pedido de venda. 300.337 linhas no
legado; hoje mascarado pelo 400 do mock. Zona: `src/features/orcamento/` + `src/data/quotes-api.ts`.
Ver §5.1(b). **Irmã da PR #416** (que faz o mesmo por `serviceItems`) — conferir sobreposição.

**P3 — Ambiente vira lista de apoio de verdade.**
`kind` novo (`Ambiente`, 346 linhas, FK de `VendaAmbiente`/`VendaServico`), trocando
`tabelas.ambientes`. Destrava a coluna nas DUAS telas de documento de uma vez. Zona: contrato + mock +
as duas grades. Ver §5.1(c).

**P4 — Tela de obra.**
Cadastro sobre `/api/works` (4 operações prontas, mock pronto, 9.454 linhas no legado) + o campo de
obra nas duas telas de documento, ligando `workId` no mesmo PR. Ver §7.

**P5 — Produto: as 16 colunas fiscais/comerciais que o contrato não tem.**
`ProductWriteRequest` cresce com vigência, tipo de peça, tipo de linha, classificação, empresa
compradora, designer, descrição complementar, os três marcadores (`foraDeLinha`, `consultarValor`,
`sobreMedida`), descrição livre, publicar no site, NCM, CEST, origem e imposto padrão — todos com
coluna no legado. Fatiar: bloco comercial primeiro, fiscal depois. Ver §4.1.

**P6 — Produto: `Índice` e `Tipo de Valor` na variante.**
`ProductVariantDto`/`VariantWriteRequest` + `Preco_Produto.Pre_Codindice`/`Pre_tp_vl`, 169.764 linhas.
Pequena e isolada.

**P7 — Produto: parar de oferecer edição no que não grava.**
Grades `fornecedores` e `produtosRelacionados` em leitura (ou caminho de escrita no contrato). Hoje
aceitam linha, gravam 200 e perdem. Ver §4.2.

**P8 — Produto: remover a grade de Localização do Estoque.**
Seis colunas, `ProdutosLocEstoque` com **0 linhas** no legado, e a instrução na tela usa F3, que o
CLAUDE.md veta. Ver §4.1.

**P9 — Trocar "não capturada na transcrição" por "ausente do contrato" onde o legado tem a coluna.**
Totais de Impostos e Frete no orçamento. O aviso atual diz que ninguém sabe; sabe-se. Ver §5.4.

**P10 — Ligar `Imprimir Orçamento` ao `GET /api/quotes/{id}/print`.**
O caminho existe; o botão é `console.info`. Ver §5.3.

## 9. Quando o veredito for "não sei" — onde olhar

1. **`docs/legado/schema/bdprincipal-colunas.csv`** — a coluna existe? Filtrar por tabela:
   `produtos`, `Preco_Produto` (variante), `Venda` (orçamento e pedido são a mesma tabela),
   `Obras`, `Ambiente`, `Produto_Relacionados`, `ProdutosLocEstoque`.
2. **`docs/legado/schema/bdprincipal-linhas.csv`** — a tabela tem dado? Zero linhas é prova de que o
   campo nunca foi usado, e é o único veredito "SAI" que se prova sem opinião.
3. **`docs/legado/schema/bdprincipal-fks.csv`** — o campo aponta para cadastro? É o que separa lista
   de apoio de texto livre.
4. **`topicos/transcricaosoftlux.md`** (memória) — §6 produto, §8.1/§8.2 documentos. É a fonte dos
   rótulos, e **ausência ali não é ausência no produto**: a transcrição cobre 20 telas, e o legado
   tem 713 DFMs.
5. **Descrição do campo no contrato** — vários carregam a decisão por escrito (`projectName` diz que
   foi substituído por `workId`; `workType` diz por que ainda é texto e não lookup).

Nenhum campo desta varredura ficou sem veredito.

---

*Varredura estática: contrato + fonte + dump do legado. Não substitui sonda ao vivo — só o
`ao-vivo.test.ts` contra servidor de pé diz o que o backend responde hoje.*
