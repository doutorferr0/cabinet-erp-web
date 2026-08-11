# Softlux — achados da extração de 2026-08-11 (itens A–E do inventário)

Itens A, B, C, D e E do inventário `topicos/legado-softlux.md` @banco: **todos executados**.
Dados brutos em `extracao/` (binário) e `banco/` (SQL Server).

---

## B — `Paramentros`: a configuração real do negócio

284 colunas, 1 linha. **103 preenchidas, 181 vazias/zero** — confirma o God object com boa parte
das funcionalidades nunca usadas (bloco Portugal inteiro: `Factura`, `GuiaR`, `GuiaT`, `NotaCredito`,
`NotaDebito` — todos com filtro configurado e nenhum uso).

Regras de negócio que só existiam aqui:

| Parâmetro | Valor | Significa |
|---|---|---|
| `par_val_orc` | 5 | **validade do orçamento = 5 dias** (confirma a memória) |
| `Par_VendaAmbiente` | S | agrupamento por ambiente **ligado** |
| `par_tipo_acesso` | GRUPO | RBAC por grupo, não por usuário |
| `par_ParcelarVlAcima` / `Par_VlMinParcela` / `Par_QuantMaxParcela` | 100 / 50 / 6 | só parcela acima de R$100, parcela mínima R$50, máx 6× |
| `Par_LimitDescCli` | 10 | teto de desconto ao cliente = 10% |
| `Par_LimitCredVdCli` / `Par_LimitCredTtCli` | 300000 / 300000 | limite de crédito por venda e total |
| `Par_EstMinVendas` / `Par_EstMinPerioVend` | 90 / 30 | estoque mínimo calculado sobre 90 dias de venda, período de 30 |
| `Par_DiasFiltroOrcamento` / `Projeto` | 364 / 364 | tela abre com 1 ano de histórico |
| `Par_DiasFiltroPedido` / `Ordem` / `NotaEntrada` | 180 | meio ano |
| `Par_ProdutoFicticio` | True | **produto fictício permitido** — é o "Pré Produto" do orçamento |
| `Par_CodEspecialUnico` | True | Código Especial é único no catálogo |
| `Par_CadClienteCaixaAlta` | True | cadastro de cliente força caixa alta |
| `Par_TituloImpOrcamento` | `EQUIPAMENTOS PARA A PROPOSTA DE PROJETO Nº` | título do impresso |
| `Par_RTautomatico` | True | **reserva técnica automática LIGADA** |

⚠️ **Contradição a resolver:** `Par_RTautomatico = True` no parâmetro global, mas a análise de
2026-08-10 mediu `Ven_RtAutomatico` **vazio em toda a tabela `Venda`**. Ou a coluna da venda não é
alimentada pelo parâmetro, ou a RT automática é aplicada sem registrar na venda. Confiança baixa
sobre qual — precisa de leitura do código da tela de orçamento antes de modelar RT no Cabinet.

⚠️ **Risco de credencial:** `Par_CEPChaveAcesso` guarda uma chave de API de serviço de CEP em texto
plano na tabela de parâmetros. Junto com o `SA`/senha do `softlux.ini`, é o segundo segredo em claro.
Não replicar o padrão.

---

## C — RBAC em uso: 7 grupos × 287 telas × 5 ações

`SisGrupo_Usuario` (7) · `SisOpcoes` (287 opções de menu) · `SisPermissao` (875 linhas)
· `SisOpcoesEspecial` (52) · `SisPermissaoEspecial` (259).

| Grupo | Telas com ao menos 1 ação |
|---|--:|
| SUPERVISOR | 263 |
| ADMINISTRAÇÃO | 245 |
| COMPRAS | 92 |
| AUTOMAÇÃO | 68 |
| VENDEDORES | 46 |
| VENDAS SP | 44 |
| TECNICO | 33 |

Permissão é `X`/`-` por **tela × grupo × ação** (`Alterar`, `Excluir`, `Consultar`, `Imprimir`,
`Inserir`). `Imprimir` como ação de primeira classe é particularidade do negócio — o impresso é o
entregável.

**`SisOpcoes.NomeMenu` liga o menu ao formulário do exe** (`mFrmgrid_acabamentos` → `Frmgrid_acabamentos`).
Cruzamento gravado em `banco/menu-form-tabela.csv`: **170 das 287 opções casaram** com um dos 713
formulários extraídos, cada uma já com seus SQLs, campos e tabelas. É o mapa menu → tela → tabela,
completo, sem trace SQL.

**`SisPermissaoEspecial` é o mais interessante para o Cabinet** — são as exceções que hoje já são
tratadas como permissão à parte, e que a discussão do ADR-014 previu ("approval flow resolve o
problema real"):

- MOSTRAR MARGEM DE LUCRO POR VENDA
- ALTERAR MARGEM DE DESCONTO PARA O CLIENTE
- ALTERAR VALOR DOS PRODUTOS NA VENDA
- ALTERA QUANT. SUGERIDA PARA COMPRA
- LIMITES DE COMPRA (cadastro do cliente)
- ATUALIZAR ORÇAMENTO (repreçamento)
- QUITAR / ALTERAR CONTA PELO MÓDULO DE VENDA

---

## D — política comercial: índice por fornecedor

`Custo` 385 perfis (40 col) · `Indice_preco` 376 índices (18 col).

**`Ipr_Indice`: mediana 2,56 · média 2,56 · mínimo 1,00 · máximo 6,00.** Concentração entre 2,1 e 2,6.
`Ipr_desconto` é morto: 370 dos 376 zerados, 1 acima de zero.

**16 índices estão em 1,0000 e todos ATIVOS** — pela fórmula (`VENDA = liquido × Ipr_Indice`), venda
igual ao líquido de compra. Parte é legítima por desenho:

- `VERTZ / VERTZ MARGEM APLICADA` — preço de tabela já sai com margem embutida
- `VIA HF ILUMINAÇÃO` — empresa do próprio grupo
- `NOTA FISCAL`, `ITESTE`, `ESTOQUE - PÇS FORA DE LINHA` — pseudo-fornecedores

Os demais são fornecedores reais: **ALFILUX (FLOS), AMCP ELETRONICA, DSGNSELO, FAS, FASA, FILLAMENTO,
LIGHT LIGHT, TELAS TENSIONADAS, TENSOFLEX, WENTZ, YPE.** Ou o preço de tabela desses já vem com
margem (como no caso VERTZ), ou está vendendo pelo custo líquido. **Confiança média — é pergunta
comercial, não de banco.** Vale conferir antes do ETL, porque o índice migra junto.

---

## E — layout do orçamento impresso

Base: 5 PDFs reais (2020 a 2026) + o QuickReport do binário. Estrutura estável em 6 anos.

**Cabeçalho** (repete em toda página): logo + razão social, endereço, CNPJ, Inscrição Estadual,
fone, e-mail · à direita: `Orçamento` / `Nº 0022958` / `Série` / data de emissão.

**Faixa de responsáveis:** Consultor · Arquiteto (`SEM INDICAÇÃO` quando não há) · Validade da
Proposta (data na 1ª página, `5 dias corridos` na folha de assinatura) · Fones.

**Bloco cliente:** Nome, Endereço, Bairro, Cidade, UF, CEP, E-mail, CNPJ\CPF, Fones, Insc.Est.\RG.

**Corpo — agrupado e numerado por ambiente:** `01) ESTAR`, `03) COZINHA`, `04) ÁREA DE SERVIÇO`…
(a numeração pula: é o código do ambiente, não a ordem). Colunas:

`Cód. produto | Descrição | Acab. | Unid. | Quant. | Vl. Unit. | Vl. Item`

com **`Soma` por ambiente** ao fim de cada bloco. Quantidade fracionária é normal (4,9 MT de perfil).
Acabamento `999` = sem acabamento aplicável.

**Página final:** 12 cláusulas de condições comerciais (garantia, prazo de troca de 10 dias, guarda
de pedido por 40 dias, horário de retirada, medição in loco de tela tensionada) + linha de assinatura
com o nome do cliente.

**Rodapé:** data/hora de emissão · `Sistema SoftLux` · `Página :N`.

3 páginas é o tamanho típico; 1 a 4 no conjunto amostrado.
