# Catálogo dos relatórios do legado — o que migra, o que vira tela, o que morre

> Levantamento da **F14** (issue web#384, leva fase 3). Medido em **2026-08-26** contra
> `origin/main` do web em `0fc8c9b` — `contracts/openapi-v1.json` com **145 caminhos / 199
> operações** — e contra os dumps de `docs/legado/`. Números e nomes de arquivo aqui
> **envelhecem calados**: a seção [Como re-medir](#como-re-medir) traz os comandos exatos que
> produziram cada tabela. Quem discordar de uma linha roda o comando antes de discutir a linha.
>
> **Isto é levantamento, não decisão.** A ordem de construção sai do Top-10 abaixo *depois* de o
> user responder as [perguntas em aberto](#perguntas-em-aberto) — o único dado que este
> repositório não tem é o que a Vertz imprime HOJE.

## O que foi medido, e o que o comparativo vol. 08 não podia dizer

O comparativo (pasta Cowork, fora do git) diz **"Relatórios ❌ sem infra de impressão"**. Este
documento responde à pergunta seguinte: *sem infra de impressão para o quê, exatamente.*

A resposta muda o tamanho do problema em três pontos:

1. **O menu `Relatórios` do legado tem 73 entradas, não ~70 relatórios distintos** — 12 são
   cabeçalhos de agrupamento e uma (`Estoque Atual e Físico por data`) aparece pendurada em dois
   pais. Das 73, **5 nem têm formulário de filtro**: o item de menu dispara o layout direto.
2. **Atrás das 73 entradas há 167 layouts de impressão** (`Rlt*` no binário Delphi), e eles não
   estão em proporção de 1 para 1. Só o orçamento/pedido impresso tem **20 variantes**
   (`RltOrcPed*`) — com ambiente, sem ambiente, com foto, resumo, dois logos, personalizado. Quem
   ler "70 relatórios" e orçar 70 telas erra o eixo: o custo real está concentrado em poucos
   documentos com muitas variações.
3. **A maior parte do menu não é papel — é listagem com filtro.** Dos 73, **18 têm o formulário
   de filtro recuperado** do binário; os 18 têm botão `Imprimir` e **4 já tinham
   `Exportar para planilha`** ao lado dele. No Cabinet isso é a `VitraDataTable` com período,
   agrupamento e exportação — não é motor de PDF.

### O placar

| classe | o que quer dizer | quantas |
|---|---|--:|
| 📋 **vira TELA** | listagem/consulta com filtro e período; papel opcional, exportação resolve | **26** |
| 🟡 **rota pronta, tela faltando** | `/api/reports/*` (ou equivalente) publica e ninguém consome | **11** |
| ✅ **já entregue** | rota no contrato **e** tela montada | **5** |
| 🖨️ **precisa PDF (F4)** | documento com layout que sai da empresa — cliente, fornecedor, estoquista | **12** |
| ❓ **decisão** | depende de módulo que o contrato não tem, ou de resposta do user | **16** |
| 💀 **morto** | não migra — dado zerado, país errado ou funcionalidade abandonada | **3** |
| | **total de entradas de relatório** | **73** |

`📋`, `🟡` e `✅` são o mesmo destino em três estágios de andamento — **42 das 73 entradas são
tela**, e 16 delas já têm rota publicada no contrato.

O que o placar diz, em uma frase: **a infra de impressão que falta é pequena — 12 documentos** —
e mais da metade do menu é a tela que o Cabinet já sabe fazer.

## A tabela

Colunas: `Grupos que imprimiam` é o RBAC real do legado (`sispermissao.csv`, permissão
`Imprimir` por grupo) — **Adm**inistração, **Sup**ervisor, **Ven**dedores, **Com**pras,
**Aut**omação, **Tec**nico, **V**endas **SP**. É a única medida de uso que este repositório tem,
e ela mede *quem podia*, não *quem abria*. `—` quer dizer que **nenhum grupo tinha a permissão**.

**Sobre a evidência 💀:** tabela zerada sozinha **não prova relatório morto** — 148 das 360 tabelas
do dump estão zeradas, e `docs/legado/README.md` §9 já registra que 6% dos formulários citam só
tabelas do modelo velho enquanto o Delphi troca o SQL em runtime (`FrmOrcamento` consulta
`Orcamento_luminaria_det`, que tem zero linhas, e o orçamento funciona). Por isso os três 💀 desta
tabela não se apoiam só no zero: `Saida_complementacao` está zerada **e não tem sucessora viva** no
schema, `contabilista` idem, e o 280 nem é caso de dado — é opção de outro país.

### Venda (18 entradas)

| id | Relatório | Formulário de filtro | Grupos que imprimiam | classe | Onde cai no Cabinet | Evidência |
|--:|---|---|---|:-:|---|---|
| 76 | Quantitativo | **nenhum** | Adm Aut Com Sup | 🖨️ | layout `RltQuantitativoObs` / `…AmbienteObs` / `RltQuantitOrdemPedido` | Motor A. Mesma fonte do orçamento impresso (`venda`+`vendaambiente`+`vendaproduto`). 3 variantes — qual é a viva é ❓ |
| 77 | Controle Obra | **nenhum** | Adm Aut Sup VSP Ven | ❓ | — | Sem formulário e sem layout `Rlt*` correspondente no binário. O que o item chama é desconhecido. |
| 78 | Ordem de Serviço | **nenhum** | Adm Aut Sup | ❓ | `RltOrdem_Servico` / `…2` / `Rel_OrdemServicoTerceiros` | Documento existe (3 layouts), mas **Ordem de Serviço não está no contrato** — módulo inteiro ausente. |
| 79 | Alterações em Projeto | `FrmOpc_Alteracoes_projetos` | Adm Aut Sup VSP Ven | ❓ | — | Trilha de alteração do pedido. Depende do módulo Auditoria, que o contrato não publica. |
| 80 | Entrada por devolução sem confirmação do estoque | `FrmOpc_ent_dev_sem_conf` | Adm Aut Sup VSP Ven | ❓ | — | Devolução não existe no contrato (só `/api/orders/{id}/demo-return`). |
| 82 | Pedidos de Vendas Fechados | `FrmOpc_Orcamento` | Adm Sup | 📋 | `GET /api/orders` (listagem + período + situação) | Filtros do DFM: profissional, categoria, consultor, fornecedor, empresa, ordenação, `Mostrar custo e lucro`. Tudo é coluna e filtro estruturado. |
| 83 | Orçamento por consultor(a) | `FrmOpc_rel_orc_aten` | Adm Sup VSP Ven | 🟡 | `GET /api/reports/salesperson-performance` | Rota publicada, **nenhuma tela consome**. |
| 180 | Entrada por devolução | `frmSelRelEntDevolucao` | Adm Aut Sup VSP Ven | ❓ | — | 6 blocos SQL e 77 campos, mas o módulo de devolução não existe no contrato. |
| 181 | Saída por Complementação | `frmSelRelSaidaComplementacao` | Adm Aut Sup | 💀 | — | `saida_complementacao`, `saida_comp_luminaria_det` e `saida_comp_servico_det`: **0 linhas** no dump. 7 SQL e 46 campos que nunca tiveram dado. |
| 147 | Orçamento x Estoque | `FrmOpc_Orc_QtdxEst` | Adm Sup VSP Ven | ✅ | `GET /api/reports/quote-vs-stock` · `src/features/relatorios/tela-orcado-contra-estoque.tsx` | Feito. |
| 153 | Entr. por dev. sem confirmação dp estoque (estoque) | `frmSelRelEntDevolucaoSEstoque` | Adm Sup VSP Ven | ❓ | — | Recorte de estoque do mesmo relatório de devolução (80/180). Mesmo bloqueio. |
| 242 | Alterações em Pasta | `FrmSelAlteracoesPasta` | Adm Aut Sup VSP Ven | ❓ | — | Auditoria da pasta. Mesmo dono do 79. |
| 284 | Contadores | `FrmGridContabilista` | Adm Sup Tec VSP Ven | 💀 | — | `contabilista`: **0 linhas**. Cadastro que nunca foi usado. |
| 288 | Impressão da Data de Entrega | `FrmSelRelDataEntrega` | Adm Aut Sup | 🖨️ | `RltOrcDataEntrega` (2 SQL, 42 campos) · `GET /api/deliveries` | Motor A. O formulário liga 43 campos e o layout, 42 — é papel, não grade. |
| 299 | Data de Entrega Prevista por Pedido de Venda | `FrmSelRelDataEntregaPrevista` | Adm Sup VSP Ven | 📋 | `GET /api/purchases/arrival-forecast` (parcial) + coluna na listagem de pedidos | Previsão por pedido de venda; a rota de compras cobre o eixo fornecedor, falta o eixo pedido. |
| 303 | Extrato de total de vendas por mês | `FrmSelRelExtratoVenda` | Adm Sup VSP Ven | 🟡 | `GET /api/reports/sales-comparison` com `granularity=month` | Rota publicada, nenhuma tela consome. `RltExtratoVenda` tem 3 campos — é grade, não documento. |
| 316 | Pedido de Demonstração | `FrmOpcPedidoDemonstracao` | Adm Sup | 🖨️ | `RltPedidoDemonstracao` (1 SQL, 27 campos) | Motor A. O Cabinet já tem `/api/orders/{id}/demo-return`, então o fluxo existe; o papel não. |
| 329 | Relatório de Notas Fiscais Simples Remesa sem Faturar | `FrmSelSimplesRemesaFatura` | Adm Sup | ❓ | — | Fiscal. NF-e/NFC-e não está no contrato. |

### Tabela de Preço e Estoque (13 entradas)

| id | Relatório | Formulário de filtro | Grupos que imprimiam | classe | Onde cai no Cabinet | Evidência |
|--:|---|---|---|:-:|---|---|
| 84 | Tabela de Preço | `FrmOpc_rel_tabela_preco` | Adm Aut Sup | 🖨️ | `GET /api/table-prices/{variantId}` · `GET /api/price-indexes` | Motor A ou B — ❓: é tabela entregue ao profissional (papel) ou consulta interna (tela)? |
| 281 | Estoque Atual e Físico por data | `FrmSelRelEstoqueData` | Adm Aut Com Sup | ❓ | `estoque_produto_dia` tem **8.678.690 linhas** no legado | Estoque **retroativo** por data. `StockValuationReportDto.asOf` é "o INSTANTE da foto", não uma data no passado — a série diária não tem par no contrato. |
| 86 | Estoque Atual | `FrmOpc_rel_estoque_atual` | Adm Aut Com Sup Tec | ✅ | `GET /api/reports/stock-valuation` · `src/features/relatorios/tela-estoque-valorizado.tsx` | Feito no eixo valor. **Faltam filtros do DFM**: tipo de peça, fábrica, sem estoque negativo, código de barra, localização. |
| 87 | Conferencia de Valores | `FrmOpc_listagem_conf_de_preco` | Adm Aut Com Sup | 📋 | `POST /api/cost-profiles/{id}/simulate` · `GET /api/table-prices/{variantId}` | Conferência preço × custo. Listagem. |
| 184 | Termo de Recebimento | `FrmSelRelTermoRecebimento` | Adm Aut Com Sup | 🖨️ | `RltTermoDeEentrega` (5 SQL, 39 campos) · `GET /api/deliveries/{id}` | Motor A. **Papel assinado pelo cliente na entrega** — some se não existir. |
| 311 | Entregas | `FrmSelRelControleEntregarValor` | Adm Sup | 📋 | `GET /api/deliveries` | Listagem de entregas com valor. `RltControleEntregarValor` tem 24 campos, mas é grade. |
| 332 | Entregas Pendentes | `FrmSelRelEntregasPedentes` | Sup | 📋 | `GET /api/picking-queue` · `GET /api/orders/{id}/fulfillment` | `RltEntregasPendentes` tem 4 campos — é lista. |
| 142 | Movimentação do produto no estoque | `FrmOpc_mov_produto` | Adm Aut Com Sup | 🟡 | `GET /api/variants/{variantId}/stock-movements` (kardex) | Rota publicada. A tela de kardex existe no produto; o recorte "por período, todos os produtos" não. |
| 143 | Valor do estoque | `FrmOpc_valor_estoque` | Adm Aut Com Sup | 📋 | `GET /api/reports/stock-valuation` | Mesmo destino do 86 — o legado separa "atual" de "valor", o Cabinet resolve com uma coluna. |
| 236 | Estoque atual, produtos não separados e separados não entregue | `FrmSelRelEstoqSepEnt` | Adm Aut Com Sup | 📋 | cruzamento de `/api/reports/stock-valuation` com `/api/orders/{id}/fulfillment` | **O cruzamento não está publicado** — vira coluna nova no relatório de estoque. |
| 289 | Estoque atual, produtos não separados e separados não entregue  por | `FrmSelRelEstoqSepEntCliente` | Adm Aut Com Sup | 📋 | o mesmo do 236, recortado por cliente | Mesmo motor, filtro a mais. |
| 319 | Movimentação de Produtos baseada em saídas NFe e NFCe | `FrmMovProdutosNFeNFCe` | Adm Sup | ❓ | — | Fiscal. Depende de NF-e/NFC-e. |
| 337 | Curva ABC | `FrmSelRelCurvaABC` | — | 🟡 | `GET /api/reports/abc-curve` | Rota publicada, nenhuma tela consome. **Atenção: nenhum grupo do legado tinha permissão de imprimir** — relatório que ninguém podia abrir. |

### Gerencial (18 entradas)

| id | Relatório | Formulário de filtro | Grupos que imprimiam | classe | Onde cai no Cabinet | Evidência |
|--:|---|---|---|:-:|---|---|
| 145 | Aniversariantes | `frmSelRelAniversariantes` | Adm Sup VSP Ven | 🟡 | `GET /api/reports/birthdays` | Rota publicada, nenhuma tela consome. |
| 89 | Custo por Venda | `FrmOpc_Rel_Custo` | Adm Sup | 📋 | `Rltcusto` (1 SQL, 24 campos) — sem rota | Margem por venda. Governado pela permissão especial nº 4 do legado (`MOSTRAR MARGEM DE LUCRO POR VENDA`, só Sup+Adm). |
| 90 | Pedido de Venda por Profissional | **nenhum** | Adm Sup VSP Ven | 📋 | `GET /api/orders` filtrado por profissional | Recorte da listagem, não relatório próprio. |
| 91 | Ranking Profissional | `FrmOpc_ramking` | Adm Sup VSP Ven | 🟡 | `GET /api/reports/professional-ranking` | Rota publicada, nenhuma tela consome. O eixo `categoriaprofissionaisexterno` tem **0 linhas** — a quebra por categoria nasce vazia. |
| 182 | Resultado Financeiro | `FrmSelRelPeriodoResFinanceiro` | Sup | ❓ | `RltResultadoFinanceiroAna/Ana2/Ana3/Sin/Sin2` — **5 variantes** | Qual das 5 é a viva é pergunta ao user. |
| 157 | Demonstrativo de venda por atendente | `FrmSelRelDemonsVendaAtend` | Adm Sup VSP Ven | 🟡 | `GET /api/reports/salesperson-performance` | Rota publicada, nenhuma tela consome. Mesmo destino do 83. |
| 158 | Produto vendido por quantidade | `FrmSelRelProdutoVendidoQuant` | Adm Sup | 🟡 | `GET /api/reports/products-sold` | Rota publicada, nenhuma tela consome. |
| 159 | Produto vendido por valor | `FrmSelRelProdutoVendidoValor` | Adm Sup | 🟡 | `GET /api/reports/products-sold` com `sortBy` de valor | Mesma rota do 158 — no legado são duas telas porque o QuickReport era outro. |
| 160 | Comparativo de valor de vendas | `FrmSelRelCompVlVenda` | Adm Sup | 🟡 | `GET /api/reports/sales-comparison` | Rota publicada, nenhuma tela consome. |
| 231 | Plano de contas | `FrmSelRelPlanodecontas` | Sup | 📋 | sem rota — `plano_contas` tem 140 linhas | Lista de apoio. Cabe em `/api/catalog-lookups` ou em caminho próprio. |
| 222 | Movimentação por Fornecedor e Profissional | `FrmSelRelForInd` | Adm Sup | 📋 | `GET /api/reports/supplier-movement` (falta o eixo profissional) | A rota cobre fornecedor; o cruzamento com profissional não está publicado. |
| 224 | Movimentação por Fornecedor | `FrmSelRelVendaFor` | Adm Sup | 🟡 | `GET /api/reports/supplier-movement` | Rota publicada, nenhuma tela consome. |
| 280 | Valores por Facturas | **nenhum** | — | 💀 | — | `SisOpcoes_paises = 2` — opção **exclusiva de Portugal**. A Vertz é país 1. |
| 290 | Ponto de Equilíbrio | `FrmRelPontodeequilibrio` | Sup | ❓ | — | Ponto de equilíbrio. Sem base no contrato (custo fixo/variável não é modelado). |
| 291 | Situação Patrimonial | `FrmRelSituacaoPatrimonial` | Sup | ❓ | — | 0 blocos SQL, 0 campos, só SUPERVISOR. Provável esboço nunca terminado — confirmar antes de descartar. |
| 309 | DRE | `FrmSelRelDRE` | Sup | ❓ | — | DRE. Exige plano de contas classificado; o módulo Financeiro do contrato não chega lá. |
| 326 | Ficha Fiscal de Produtos | `FrmFichaFiscalProdutos` | Sup | ❓ | `RltFichaFiscalProdutos` (1 SQL, 12 campos) | Fiscal. |
| 330 | Quantidade de venda, quantidade de dias sem venda e última data de v | `FrmSelEstoqueUltimaVenda` | Adm Sup | ✅ | `GET /api/reports/stock-aging` · `src/features/relatorios/tela-estoque-parado.tsx` | Feito. |

### Financeiro (11 entradas)

| id | Relatório | Formulário de filtro | Grupos que imprimiam | classe | Onde cai no Cabinet | Evidência |
|--:|---|---|---|:-:|---|---|
| 95 | Relatório Básico | `FrmOpcContas_apagar` | Adm Sup | 📋 | `GET /api/financial-titles` (a pagar) | Listagem com período, fornecedor, modo e tipo de documento — todos publicados. |
| 96 | Quebra por data vencimento | `FrmOpc_plano_ctp_data` | Adm Sup | 📋 | o mesmo do 95, agrupado por vencimento | **É o padrão 9 (view modes / `Agrupar por`)**, não relatório novo. |
| 97 | Contas a receber | `FrmOpcContas_receber` | Adm Sup | 📋 | `GET /api/financial-titles` (a receber) | Idem 95, eixo cliente. |
| 101 | Quebra por data de lançamento | `FrmOpc_data_transf` | Adm Sup | 📋 | `GET /api/cash-transfers` | Transferências por data de lançamento. |
| 103 | Movimentos Realizados\Previstos | `FrmOpc_fluxo_previsto_realizado` | Adm Sup | 📋 | `GET /api/cash-movements` + previsto | Fluxo previsto × realizado. O previsto sai de `/api/financial-installments`; o cruzamento não está publicado. |
| 104 | Valores de fechamento em projetos | `FrmOpc_valores_fec_proj` | Adm Sup | 📋 | `GET /api/works` + `/api/financial-installments` | Fechamento por obra/projeto. `contas_receber_det` tem 18.555 linhas. |
| 141 | Relatório Básico | `FrmOpc_reserva_tecnica` | Adm Sup | ✅ | `GET /api/technical-reserves` · `src/routes/vendas/reservas-tecnicas.tsx` | Feito — participação é a reserva técnica. |
| 178 | Relatório Analítico | `FrmSelRelResTecAnalitica` | Adm Sup | 📋 | `RltResTecAnalitica` (5 SQL, 47 campos) | Recorte analítico da mesma reserva técnica. |
| 174 | Controle de Cheque | `FrmSelRelControleCheque` | Adm Sup | ❓ | `RltControleCheque` / `RltCadControleCheque` | **Cheque não existe no Cabinet.** Pergunta comercial, não técnica. |
| 225 | Extrato Bancário | `FrmSelRelExtBancario` | Adm Sup | 📋 | `GET /api/cash-movements` · `GET /api/bank-accounts` | Extrato bancário. `sisusuarioscontasbancarias` tem 14 linhas. |
| 315 | Sintético | `FrmOpcContasSintetica` | Sup | 📋 | `GET /api/financial-titles` agrupado por plano de contas | Padrão 9 de novo. |

### Compras (7 entradas)

| id | Relatório | Formulário de filtro | Grupos que imprimiam | classe | Onde cai no Cabinet | Evidência |
|--:|---|---|---|:-:|---|---|
| 106 | Impressão dos produtos da nota entrada | `FrmOpc_nota_entrada_produtos` | Adm Aut Com Sup | 🖨️ | `GET /api/goods-receipts/{id}/check` | Motor A, prioridade baixa: papel de conferência que fica dentro da empresa. |
| 155 | Histórico de atualização do valor de tabela | `FrmSelAlteraPreco` | Adm Aut Com Sup | 📋 | `GET /api/price-indexes` + auditoria de preço | Histórico de alteração de valor de tabela. A trilha não está publicada. |
| 220 | Data Prevista de Chegada\Reagendamento de Ordem de Compra | `FrmSelRelOrdemCheg` | Adm Aut Com Sup | ✅ | `GET /api/purchases/arrival-forecast` · `src/routes/compras/previsao.tsx` | Feito. |
| 229 | Diferenças de valores na nota do fornecedor | `FrmSelRltNFEntDif` | Adm Aut Com Sup | 📋 | `POST /api/goods-receipts/{id}/check` | Divergência de valor na nota. É a conferência, e ela já é do contrato. |
| 239 | Pedido de compra em aberto | `FrmSelRelPedCompra` | Adm Aut Com Sup | 📋 | `GET /api/purchase-requests` com situação | Listagem `src/routes/compras/pedidos` existe; falta o recorte "em aberto" com período e cliente. |
| 240 | Ordem de Compra | `FrmSelRelOrdemCompra` | Adm Aut Com Sup | 🖨️ | `RltOrdemCompra` (7 SQL, 48 campos) · `RltOrdemCompraGeral` | Motor A. **`POST /api/purchase-orders/{id}/send` existe e não há operação de impressão** — o pedido sai para o fornecedor sem papel. |
| 297 | Notas dos Fornecedores | `FrmSelRltNotaFornecedor` | Adm Com Sup | 📋 | `GET /api/goods-receipts` com período e CFOP | O DFM já tinha `Exportar Planilha`. |

### CRM (1 entrada)

| id | Relatório | Formulário de filtro | Grupos que imprimiam | classe | Onde cai no Cabinet | Evidência |
|--:|---|---|---|:-:|---|---|
| 150 | Carta de agradecimento ao cliente | `FrmOpc_Carta_agradecimento` | Adm Sup VSP Ven | 🖨️ | `RltMenssage` (1 SQL, 6 campos) | Motor A, mala direta. ❓ se ainda se usa. |

### Etiquetas (5 entradas)

| id | Relatório | Formulário de filtro | Grupos que imprimiam | classe | Onde cai no Cabinet | Evidência |
|--:|---|---|---|:-:|---|---|
| 235 | Produtos do Pedido de Venda | `FrmSelEtiqProj` | Adm Aut Com Sup | 🖨️ | `RltEtiqProj` / `RltEtiqProjCodBarra` / `RltEtiqPedVendMod2` | Motor C. **`/api/labels/products/print` cobre produto CADASTRADO, não produto de PEDIDO** — é o buraco da família. |
| 283 | Produtos do Pedido de Venda por Ambiente | `FrmSelEtiqProjAmb` | Adm Aut Com Sup | 🖨️ | o mesmo do 235, quebrado por ambiente | Motor C, mesma lacuna. |
| 286 | Produtos Cadastrados | `FrmSelEtiqFornecedor` | Adm Aut Com Sup | 🖨️ | `GET /api/labels/products/print` · `RltEtiqModelo4` / `RltEtiqReferencia2` | Motor C. **Contrato pronto, tela faltando.** |
| 302 | Grupos de Produtos Relacionados | `FrmGridProdRel` | Adm Com Sup | 📋 | `RltResumoGrupoProd` (0 SQL, 4 campos) | Listagem de cadastro, não relatório. |
| 313 | Produtos Separados | `FrmSelEtiqProdSep` | Adm Com Sup | 🖨️ | `RltEtiqProdSep` (2 SQL, 12 campos) · `GET /api/picking-queue` | Motor C, etiqueta de separação. |

## Os três motores — a amarra com F4 e F5

O menu do legado mistura três coisas que só se parecem por saírem na impressora. Separá-las é o
que torna a F4 (motor) uma tarefa finita: **cada motor tem uma forma de saída e um dono de
contrato diferentes**, e dois dos três já estão publicados.

### Motor A — documento de uma peça (é o que a F4 e a F5 constroem)

Um registro, um layout, cabeçalho timbrado, corpo agrupado, página final de condições. Sai
`application/pdf` do servidor — **isso já está decidido no contrato**, não é escolha em aberto:

```
GET /api/quotes/{id}/print   → 200 application/pdf  "3 páginas é o típico do legado"
GET /api/orders/{id}/print   → 200 application/pdf
```

Consome dois caminhos de configuração que também já existem — `GET|PUT /api/print-settings`
(`quoteTitle`, as 12 cláusulas) e `GET|PUT /api/company-letterhead` (os 7 elementos do
cabeçalho). O `PrintSettingsDto` cita `Par_TituloImpOrcamento` do legado pelo nome.

**Quem sai deste motor, além do orçamento da F5:** 76 Quantitativo · 184 Termo de Recebimento ·
288 Data de Entrega · 240 Ordem de Compra · 316 Pedido de Demonstração · 106 Produtos da nota de
entrada · 150 Carta de agradecimento · 84 Tabela de Preço (se a decisão for papel) — mais o
78 Ordem de Serviço, se o módulo existir um dia.

**O que a F5 vai encontrar, e a issue não diz:** o legado tem **20 layouts `RltOrcPed*`** para o
mesmo documento, escolhidos por parâmetro de sistema (`Par_ImpComLogo`, `Par_ImpProdporAmbOrcPed`,
`Par_OrcNaoImprimirSomaAmbiente`, `Par_ImpFornecOrc`, `Par_ImprimirLogoParceirosOrc`,
`Par_VendaImpCabUnico`…). Ou seja: **não são 20 templates, é 1 template com ~8 chaves.** Tratá-los
como 20 arquivos multiplicaria por 20 o custo de manutenção do impresso. A estrutura fiel do papel
já está levantada em `docs/legado/achados-exe-2026-08-11.md` §E, medida sobre 5 PDFs reais de 2020
a 2026 — a F5 começa de lá, não do zero.

### Motor B — a listagem no papel (**é o motor que NÃO existe**)

Período + filtros + agrupamento + totais. É a família `/api/reports/*`: 10 rotas publicadas, com
um envelope comum bem definido — `summary` do **período inteiro**, `rows` só da **página**.

**E as 10 respondem `application/json` e nada mais.** Não há operação de impressão, não há
parâmetro de formato, não há `application/pdf` em lugar nenhum da família. Este é o achado que
importa para a F4: *o motor de documento e o motor de listagem não são o mesmo trabalho*, e o
segundo ainda não tem nem contrato nem decisão.

A decisão que a F4 precisa tomar (e que não é minha): **listagem impressa é PDF de servidor ou é
`window.print()` do navegador sobre a `VitraDataTable`?** As duas respostas são defensáveis, e
elas custam coisas diferentes:

| | PDF no servidor | impressão do navegador |
|---|---|---|
| custo | operação nova por relatório (~26 telas), Playwright no container | folha de estilo `@media print`, uma vez |
| fidelidade | igual em toda máquina | depende do navegador e da impressora |
| o teto de página | precisa de um caminho que devolva o conjunto inteiro | o padrão 9 já resolve: `pageSize` no teto **e rodapé dizendo que o teto cortou** |
| exportação | o CSV/XLSX continua sendo trabalho à parte | idem |

O padrão 9 (view modes) já enfrentou exatamente este problema — "visão não-tabela pede o conjunto
inteiro e o rodapé DIZ quando o teto cortou". Relatório impresso que soma só a página mente do
mesmo jeito, e o envelope de `/api/reports/*` já foi escrito prevendo isso.

### Motor C — etiqueta

Medidas em mm, N colunas, código de barras. Também já publicado, também `application/pdf`:

```
GET|POST /api/label-layouts   ·   GET|PUT /api/label-layouts/{id}
GET      /api/labels/products/print → 200 application/pdf
```

**A lacuna da família tem nome:** `/api/labels/products/print` imprime etiqueta de **produto
cadastrado** (235/283/313 são etiqueta de produto **de um pedido de venda**, com quebra por
ambiente e por separação). São três das 12 do motor A/C que precisam de caminho novo.

O `LabelLayoutDto` já registra o achado que poupa trabalho: no legado, `EtiquetaPronta` (medidas)
tem 21 linhas e o trio `Etiquetas`/`Etiquetas_Campos`/`Etiquetas_Textos` (posicionamento livre de
cada campo) tem **zero** — o editor de posicionamento existe há seis anos e nunca gravou nada.
**Não construir editor de posicionamento.**

## Top-10 da fase 1 — proposta, com o critério à mostra

**Esta ordem é proposta, não decisão.** O critério de desempate que a issue pede — *"uso real da
Vertz, perguntar ao user o que imprimem HOJE"* — é justamente o dado que este repositório não tem.
O que ele tem é o RBAC do legado, e ele mede **quem podia imprimir**, não quem imprimia. A ordem
abaixo cruza quatro sinais mensuráveis, nesta precedência:

1. **sai da empresa** — papel que um terceiro recebe (cliente, fornecedor) some se não existir;
   relatório interno vira consulta na tela sem prejuízo;
2. **quantos grupos tinham `Imprimir`** no RBAC do legado (4 ou 5 de 7 = uso transversal);
3. **quanto do caminho já está andado** — rota publicada no contrato vale mais que rota a
   escrever;
4. **quantos outros itens do menu morrem junto** — um destino que absorve 3 entradas paga por 3.

| # | O que | classe | por quê, em uma linha | o que já existe |
|--:|---|:-:|---|---|
| 1 | **Orçamento/pedido impresso** | 🖨️ A | é a F5, e o comparativo vol. 02 já o marcou "fase 1!" — é o papel que o cliente leva embora | `/api/quotes/{id}/print`, `/api/orders/{id}/print`, `print-settings`, `company-letterhead`; layout medido em achados §E |
| 2 | **Ordem de compra impressa** (240) | 🖨️ A | vai para o **fornecedor**; `POST /api/purchase-orders/{id}/send` existe e manda o quê? — hoje não há papel para mandar | rota de envio publicada; falta a operação de impressão |
| 3 | **Termo de recebimento / entrega** (184) | 🖨️ A | é o papel que o cliente **assina** na entrega — sem ele a entrega não tem prova | `/api/deliveries/{id}`; layout `RltTermoDeEentrega`, 39 campos |
| 4 | **Estoque atual / valorizado** (86 + 143) | ✅→📋 | 5 grupos, o maior alcance do menu inteiro (é o único que o TECNICO imprimia); **absorve 2 entradas** | rota **e** tela existem — falta a metade dos filtros do DFM |
| 5 | **Quantitativo do pedido** (76) | 🖨️ A | alimenta compra e separação; **mesmo motor e mesma fonte do item 1** — sai quase de graça depois da F5 | nada publicado; 3 variantes de layout a decidir |
| 6 | **Pedidos de venda fechados** (82) | 📋 | o relatório gerencial de venda do legado, com o filtro mais rico do menu (7 recortes + custo/lucro) | `/api/orders` + filtro estruturado; falta o recorte e a coluna de margem |
| 7 | **Etiqueta de produto do pedido** (235+283+313) | 🖨️ C | expedição não roda sem etiqueta; **absorve 3 entradas** e o motor já existe | `/api/label-layouts` e o PDF de etiqueta publicados; falta a fonte "produto de pedido" |
| 8 | **Contas a pagar e a receber** (95+96+97+315) | 📋 | operação financeira diária; **absorve 4 entradas** — duas delas são só `Agrupar por` (padrão 9) | `/api/financial-titles` e `/api/financial-installments` publicados |
| 9 | **Produto vendido — quantidade e valor** (158+159+160) | 🟡 | negociação com fornecedor e reposição; **absorve 3 entradas em 2 rotas já prontas** | `/api/reports/products-sold` e `/api/reports/sales-comparison` publicados, **sem tela** |
| 10 | **Kardex por período** (142) | 🟡 | é a resposta a "cadê essa peça" — 4 grupos, e o Cabinet já tem o movimento por variante | `/api/variants/{variantId}/stock-movements`; falta o recorte por período sobre vários produtos |

**Os quatro que ficaram na porta, e por quê:** 337 Curva ABC (rota pronta, mas **nenhum grupo do
legado tinha permissão de imprimir** — é candidato a relatório que ninguém usa) · 145
Aniversariantes (rota pronta, uso comercial que só o user confirma) · 91 Ranking Profissional
(rota pronta, mas a quebra por categoria nasce vazia — `categoriaprofissionaisexterno` tem 0
linhas) · 309 DRE (só o SUPERVISOR imprimia, e exige plano de contas classificado que o contrato
não modela).

**Se a resposta do user contradisser esta ordem, a resposta do user ganha** — este cruzamento
existe para dar um ponto de partida defensável, não para substituir a medição que só a Vertz tem.

## Perguntas em aberto

Estão registradas como comentário na [issue #384](https://github.com/doutorferr0/cabinet-erp-web/issues/384).
Enquanto não houver resposta, as linhas ❓ da tabela ficam onde estão — **não são pendência de
código, são pendência de decisão**, e adivinhar aqui produziria tela que ninguém pediu.

1. **O que a Vertz imprime HOJE**, em papel ou PDF, numa semana comum? (a pergunta que reordena o
   Top-10 inteiro)
2. **Listagem impressa é PDF de servidor ou impressão do navegador?** — a decisão da F4, com o
   trade-off na tabela do Motor B.
3. **Devolução** (80, 153, 180 — 3 entradas): o módulo não existe no contrato. Entra na fase 1 ou
   fica para depois?
4. **Ordem de Serviço** (78): 3 layouts no legado, módulo ausente no contrato. Vertz ainda emite?
5. **Controle de Cheque** (174): cheque não existe no Cabinet. Ainda se opera com cheque?
6. **Resultado Financeiro** (182): 5 variantes de layout no legado. Qual é a viva?
7. **Situação Patrimonial** (291): 0 SQL, 0 campos, só SUPERVISOR — descartar como esboço, ou
   existe e o binário não a entregou?
8. **Tabela de Preço** (84): papel entregue ao profissional, ou consulta na tela?
9. **Carta de agradecimento** (150): ainda se usa?
10. **Estoque retroativo por data** (281): a série diária do legado tem 8,7 milhões de linhas e o
    `asOf` do contrato é o instante de agora. Precisa de estoque no passado, ou "hoje" basta?

## O que este levantamento NÃO cobriu, de propósito

- **Os impressos que não estão no menu `Relatórios`.** As fichas de cadastro (`RltFichaCliente`,
  `RltFichaFor`, `RltFichaProdutos`, `RltFichafuncionario`, `RltFichaIndicacoes`), os recibos
  (`RltRecibo*`, 6 layouts), as duplicatas e o romaneio de separação
  (`Rlt_Romaneiro_separacao`) saem de botão `Imprimir` **dentro da tela do documento**, não de
  item de menu. São mais ~30 layouts dos 167, todos do Motor A. Cabem num F14-B.
- **Paridade de campo.** Que coluna cada relatório traz é trabalho de quem o construir, com a
  fonte em `transcricaosoftlux.md` e nos DFMs. Aqui só se classificou destino.
- **Comissões.** `/api/commissions/earnings` publica um relatório de apuração que **não tem
  correspondente no menu do legado** — lá a comissão é tela de fechamento, não relatório. Fora do
  eixo deste catálogo.

## Como re-medir

Todos os comandos rodam da raiz do repositório. **Nenhum número deste documento se cita sem
rodar o comando que o produziu.**

```bash
# a árvore do menu Relatórios (id 73), com formulário, contagem de SQL e campos
python3 - <<'EOF'
import csv
rows=list(csv.DictReader(open('docs/legado/config/menu-form-tabela.csv',encoding='utf-8-sig'),delimiter=';'))
byid={r['id']:r for r in rows}; kids={}
for r in rows:
    if r['idPai']!=r['id']: kids.setdefault(r['idPai'],[]).append(r)
def walk(i,d=0):
    r=byid[i]; print('  '*d+f"[{r['id']}] {r['Caption'].strip('- ')} | {r['Form']} | sql={r['SQLs']} campos={r['Campos']}")
    for k in kids.get(i,[]): walk(k['id'],d+1)
walk('73')
EOF

# quem podia IMPRIMIR cada opção — a chave é `id`, NÃO `idPai`
#   (idPai é o menu pai; casar por ele agrega a permissão de todos os irmãos)
python3 - <<'EOF'
import csv
C='docs/legado/config/'
grp={g['Cod_grupo']:g['Descricao'] for g in csv.DictReader(open(C+'sisgrupo_usuario.csv',encoding='utf-8-sig'),delimiter=';')}
P={}
for p in csv.DictReader(open(C+'sispermissao.csv',encoding='utf-8-sig'),delimiter=';'):
    P.setdefault(p['id'],{})[p['idGrupo']]=p
for i in ('86','337','240'):
    print(i, sorted({grp[g] for g,p in P[i].items() if p['Imprimir']=='X'}) if i in P else 'sem permissão')
EOF

# os 167 layouts de impressão do binário, e as 20 variantes do orçamento
grep -oE '^\| `Rlt[A-Za-z_0-9]+`' docs/legado/exe/mapa-telas.md | tr -d '|` ' | sort -u | wc -l
grep -cE '^\| `RltOrcPed' docs/legado/exe/mapa-telas.md

# tabela com zero linhas = candidata a 💀 (148 das 360 estão zeradas — sinal, não prova)
grep -iE '^"(saida_complementacao|contabilista|categoriaprofissionaisexterno|etiquetas)"' \
  docs/legado/schema/bdprincipal-linhas.csv

# opção exclusiva de Portugal (SisOpcoes_paises = 2) — 💀 para a Vertz, que é país 1
awk -F';' '$6=="2"' docs/legado/config/sisopcoes.csv

# os filtros de um relatório, direto do formulário Delphi (142 dos 713 foram recuperados)
grep 'Caption = ' docs/legado/exe/formularios/FrmOpc_rel_estoque_atual.txt

# a família /api/reports/* e o tipo de mídia de cada impressão
python3 - <<'EOF'
import json
c=json.load(open('contracts/openapi-v1.json'))
for p,v in sorted(c['paths'].items()):
    if 'report' in p or 'print' in p or 'label' in p:
        for m,o in v.items():
            if m in ('get','post','put'):
                r=o.get('responses',{}).get('200',{}).get('content',{})
                print(m.upper(), p, '->', ', '.join(r) or '(sem corpo)')
EOF
```

**Armadilha paga neste levantamento:** em `sispermissao.csv`, a coluna que identifica a opção é
`id` e a que aponta o menu pai é `idPai`. Agrupar por `idPai` — que é o que o nome sugere —
devolve a união das permissões de todos os irmãos e faz um relatório que ninguém podia abrir
parecer autorizado para cinco grupos. A **Curva ABC** (337) é o caso que denuncia o erro: por
`idPai` ela aparece com cinco grupos; por `id`, com nenhum.
