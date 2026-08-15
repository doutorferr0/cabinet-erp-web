# Migração Softlux → Cabinet — mapa origem → destino

> Trilho Harvest-5 (issue #167). **Especificação de mapeamento, não ETL.** Não há código aqui, e
> nenhuma linha deste arquivo é importada por `src/`.

**O que é:** o de-para campo a campo entre o SQL Server do Softlux (`bdprincipal`, 359 tabelas) e o
schema novo do Cabinet (`docs/cabinet/gera-cabinet-schema.py`). Onde o campo casa, está escrito.
Onde não casa, está escrito **por quê** — `sem origem`, `sem destino` ou `transformação`.

**O que não é:** nem plano de execução, nem script, nem promessa de que a carga roda. Várias
linhas abaixo terminam em decisão de negócio que este documento **aponta e não resolve** — é o
combinado da issue para `Ipr_Indice` e `Par_RTautomatico`, e vale igual para os blockers novos
que a leitura campo a campo levantou.

**Este item não é uma colheita de fonte externa** como o resto de `docs/harvest/` (não tem
`NOTICE`, não tem licença de terceiro, não tem código staged): o material é do próprio negócio,
levantado por engenharia reversa do banco que o Cabinet vai substituir. Mora aqui porque a issue
#167 fixou o caminho. A entrada correspondente no índice de `docs/harvest/README.md` **não foi
escrita** — o arquivo está fora da zona declarada deste trilho.

## Fontes

| fonte | o que deu |
|---|---|
| `docs/legado/schema/bdprincipal-colunas.csv` | **nome e tipo real de cada coluna** — é daqui que sai todo nome de campo de origem citado abaixo |
| `docs/legado/schema/bdprincipal-linhas.csv` | contagem de linhas por tabela (foto de 2026-08-10) |
| `docs/legado/schema/bdprincipal-fks.csv` · `-indices.csv` | FKs declaradas e PKs reais |
| memória `topicos/legado-softlux.md` §`@banco` | leitura funcional, domínios de código, métricas e os blockers já conhecidos |
| `docs/cabinet/gera-cabinet-schema.py` | o schema destino — tabelas, colunas, escopo org/tenant |

Volume citado é **foto de 2026-08-10**; o banco é vivo e cresce. Nenhuma consulta nova foi feita
ao servidor nesta rodada — o que exigiria consulta está isolado em [Perguntas abertas](#12-perguntas-que-só-o-banco-responde).

---

## 1. Correção de premissa: são 39 tabelas destino, não 34

A issue #167 diz "34 tabelas / 7 módulos". O `gera-cabinet-schema.py` de hoje tem **39 tabelas em
9 módulos** — os módulos `crm` (4 tabelas) e `tarefas` (1) entraram depois do enunciado. O mapa
abaixo cobre as 39; o DoD "todas as 34 aparecem" está contido nisso. A contagem por módulo:

| módulo | tabelas |
|---|---|
| `nucleo` | 5 |
| `parceiros` | 3 |
| `catalogo` | 5 |
| `preco` | 4 |
| `crm` | 4 |
| `venda` | 8 |
| `estoque` | 4 |
| `compra` | 5 |
| `tarefas` | 1 |
| **total** | **39** |

## 2. Notação

| marca | significado |
|---|---|
| **direto** | a coluna de origem entra na de destino sem regra além de conversão de tipo |
| **transformação** | precisa de regra: junção, split, derivação, inversão, normalização |
| **sem origem** | o destino existe e o legado não tem o dado. Preencher = inventar |
| **sem destino** | o legado tem o dado e o schema novo não tem onde pôr |
| **blocker** | não dá para decidir aqui; depende de resposta de negócio ou de consulta ao banco |

Confiança é dita quando não é alta. "Sem dado" quer dizer sem dado — não vira estimativa.

## 3. Escopo da carga — o que nem entra

Decidido antes do campo a campo, com base em `@banco`:

- **Só `bdprincipal`.** `bdprodutos` (5 tabelas) é staging da importação por planilha: 4.877 dos
  4.881 produtos também existem em `bdprincipal`, congelado desde 29/09/2025. Descartável.
  `GED` tem 12 linhas no total.
- **Modelo antigo, 0 linhas, não migra:** `orcamento`, `Orcamento_luminaria_det`,
  `Orcamento_servico_det`, `orcamento_materiais_det`, `pedido`, `pedido_luminaria_det`,
  `pedido_materiais_det`, `pedido_servico_det`.
  ⚠️ **`Pedido_compra_det` NÃO está nessa lista** — tem 34.863 linhas, está vivo, e é o detalhe do
  pedido de **compra**. Casa com o padrão `pedido_*_det` por acidente de nome. Descartar por
  prefixo apagaria o módulo de Compras inteiro.
- **148 das 359 tabelas estão vazias** (41%), boa parte funcionalidade do mercado português que
  nunca foi usada aqui (`Factura`, `GuiaR`, `GuiaT`, `NotaCredito`, `NotaDebito`).
- **`estoque_produto_dia` (8,7 mi de linhas) não migra:** é foto diária de saldo, derivável do
  kardex novo. Metade do tamanho da base.
- **`Preco_Produto_Log` (3,1 mi) não migra como histórico** — ver [§7.16](#716-variant_supplier_prices).

## 4. Transformações transversais

Valem para **toda** tabela; não se repetem linha a linha no mapa.

| # | assunto | origem | destino | regra |
|---|---|---|---|---|
| T1 | **identidade** | `int` / `float` / `nvarchar` por tabela | `uuid` | toda chave nova é gerada. A carga precisa de uma **tabela de-para persistida** (`origem_tabela`, `origem_chave`, `uuid_novo`) viva até o fim da migração — sem ela nenhuma FK se resolve, e uma segunda passada renumera tudo. É requisito, não detalhe de implementação |
| T2 | **empresa** | `Emp_codigo int` (em 212 das 359 tabelas) | `tenant_id uuid` | de-para contra `empresa` (4 linhas). **`Emp_codigo` é NULLABLE em quase toda tabela**, e `tenant_id` é parte da PK no destino (NOT NULL) → linha com empresa nula precisa de regra. 99,91% do volume está na empresa 1 (Vertz); empresa 3 tem 22 documentos, empresa 4 tem 6 |
| T3 | **dinheiro** | `money` (preço) e **`float`** (todos os totais de `Venda`) | `bigint` centavos | `round(valor * 100)`. `money` tem 4 decimais e converte limpo; **`float` não** — `Ven_Total`, `Ven_Desconto`, `VenPro_VlUnitario` e todos os totais são `float`, e a soma dos itens pode não bater com o total do documento por arredondamento binário. Conferir item×cabeçalho antes de aceitar a carga |
| T4 | **quantidade** | `float` | `numeric(14,3)` | quantidade fracionária é normal no negócio (4,9 MT no impresso). 3 casas é o teto do Cabinet — quantidade com mais casas no legado perde precisão silenciosamente. Medir antes |
| T5 | **booleano** | **quatro codificações**: `bit` · `char(1)` `'A'`/`'I'` (`*_situacao`) · `nvarchar(2)` `'S'`/`'N'` (`Pro_ativo`) · `nvarchar(6)` (`Ind_Ativo`, `Fun_Ativo`) | `boolean` | uma regra por codificação, não uma só. `Indicacoes` tem **os dois**: `Ind_situacao` char e `Ind_Ativo` nvarchar(6) — qual manda é [blocker B7](#b7-dois-campos-de-ativo-no-profissional) |
| T6 | **data** | `datetime`/`smalldatetime`, mas **texto em 5 lugares**: `Cli_dataNasc nvarchar(20)`, `Cli_dtnasc_conjuge`, `Ind_Dtnacimento nvarchar(10)`, `Ind_dtnasc_conjuge`, `IndDet_Dtnacimento varchar(10)` | `date` / `timestamptz` | as de texto precisam de parse com formato explícito e tratamento de lixo. `smalldatetime` tem precisão de minuto |
| T7 | **documento** | `Cli_cnpj_cpf nvarchar(28)`, `For_cnpj_cpf nvarchar(28)`, `IndDet_CNPJCPF varchar(21)`, `CGCCPF nvarchar(38)` | `varchar(14)` sem máscara | tirar máscara e validar. O tamanho de origem (28, 38) diz que guarda formatado; o que não couber em 14 dígitos limpos é lixo, e lixo não vira `NULL` calado — vira relatório |
| T8 | **auditoria** | `usr_cod_criacao`, `usr_dt_hr_criacao`, `usr_cod_alteracao`, `usr_dt_hr_alteracao` (presentes em quase toda tabela) | `created_by`/`created_at`/`updated_by`/`updated_at` | direto, resolvendo o usuário por T1. **Não repetido no mapa por tabela** |
| T9 | **UF** | `nvarchar(4)` | `varchar(2)` | 4 caracteres para uma UF de 2 — conferir o que há de fato antes de truncar |
| T10 | **collation/acento** | a tabela `Profissão` tem acento **no nome** | — | armadilha de ferramenta, não de dado |

## 5. Ordem de carga

Dependência, não calendário. Cada nível depende de todos os anteriores.

1. `tenants` → `employees` → `employee_tenants`
2. `catalog_lookups` · `product_groups` · `finishes` · `stock_locations` · `sale_categories` · `crm_lost_reasons`
3. `partners` → `partner_tenant_links` → `construction_sites`
4. `products` → `product_variants` → `product_suppliers`
5. `supplier_cost_profiles` → `supplier_price_indexes` · `variant_supplier_prices` · `variant_tenant_settings`
6. `quotes` → `quote_environments` → `quote_items` · `quote_salespeople` · `quote_professionals`
7. `sales_orders` → `stock_reservations` · `purchase_needs`
8. `purchase_orders` → `purchase_order_items` → `goods_receipts` → `goods_receipt_items`
9. `stock_movements` → `stock_balances` (o saldo é consequência do kardex, ADR-009 — carregar saldo direto anularia o desenho)
10. `commission_rules` · `document_sequences` (por último: o próximo número depende do que entrou)
11. `crm_pipelines` · `crm_stages` · `crm_opportunities` · `activities` — **seed, não migração** ([§7.18](#718-crm--os-quatro-crm_-sem-origem))

---

## 6. Painel de cobertura — as 39 tabelas destino

| # | destino | módulo | origem principal | situação |
|---|---|---|---|---|
| 1 | `tenants` | nucleo | `empresa` (4) | mapeada |
| 2 | `employees` | nucleo | `Funcionario` (111) + `SisUsuarios` (79) | mapeada · B4 |
| 3 | `employee_tenants` | nucleo | `SisUsuarios` + `SisGrupo_Usuario` (7) | mapeada, RBAC fino sem destino |
| 4 | `catalog_lookups` | nucleo | 6 tabelas de apoio + `DISTINCT` de texto livre | mapeada |
| 5 | `document_sequences` | nucleo | `SisSeqTabela` (226) | **recalcular, não copiar** |
| 6 | `partners` | parceiros | `Clientes` (9.322) + `fornecedor` (868) + `Indicacoes`/`_Detalhe` (1.316/1.344) | mapeada · **endereço e telefone sem destino** |
| 7 | `partner_tenant_links` | parceiros | `Emp_codigo` + `FornecedorEmpresaCompradora` (227) | parcial · `code` sem origem |
| 8 | `construction_sites` | parceiros | `Obras` (9.454) | mapeada · `active` sem origem |
| 9 | `product_groups` | catalogo | `GrupoProduto` (12) | mapeada |
| 10 | `finishes` | catalogo | `Acabamento` (248) | mapeada |
| 11 | `products` | catalogo | `produtos` (108.992, 86 col) | mapeada · **bloco fiscal inteiro sem destino** |
| 12 | `product_variants` | catalogo | **derivada** — não existe tabela de variante no legado | transformação · **rótulo de tamanho sem origem** |
| 13 | `product_suppliers` | catalogo | `ProdutosFornecedores` (108.604) | mapeada · `ProdFor_Padrao` sem destino |
| 14 | `supplier_cost_profiles` | preco | `Custo` (385, 40 col) | parcial · **25 colunas sem destino, a fórmula de custo não fecha** |
| 15 | `supplier_price_indexes` | preco | `Indice_preco` (376) | mapeada · **vigência sem origem** · **B1** |
| 16 | `variant_supplier_prices` | preco | `Preco_Produto` (169.764) | mapeada · **histórico irrecuperável** |
| 17 | `variant_tenant_settings` | preco | `Preco_Produto` (mesma tabela, outro papel) | mapeada |
| 18 | `crm_pipelines` | crm | — | **sem origem** |
| 19 | `crm_stages` | crm | — | **sem origem** |
| 20 | `crm_opportunities` | crm | — | **sem origem** |
| 21 | `crm_lost_reasons` | crm | — | **sem origem** |
| 22 | `sale_categories` | venda | `CategoriaVenda` (8) | mapeada |
| 23 | `quotes` | venda | `Venda` com `Ven_Tipo='O'` (23.033) | mapeada · **cliente sem coluna direta** · B3 |
| 24 | `quote_environments` | venda | `VendaAmbiente` (144.674) | mapeada · **`code` é `uuid` no destino e `int` na origem** |
| 25 | `quote_items` | venda | `VendaProduto` (549.830) | mapeada · **snapshot descritivo sem origem** |
| 26 | `quote_salespeople` | venda | `VendaAtendente` (37.707) | mapeada · B4 |
| 27 | `quote_professionals` | venda | `VendaIndicacao` (34.666) | mapeada · `is_primary` sem destino |
| 28 | `commission_rules` | venda | **`IndicacaoGrupProd` (7.569)**, não `VendaIndicacaoGrupProd` | parcial · **B2 (RT)** |
| 29 | `sales_orders` | venda | `Venda` com `Ven_Tipo='P'` (11.103) | mapeada · B3 · 24 pedidos sem orçamento |
| 30 | `stock_locations` | estoque | `EstoqueTipo` (4) | mapeada |
| 31 | `stock_movements` | estoque | `estoque_log` (402.161) | transformação pesada · **`balance_after` sem origem** · B5 |
| 32 | `stock_balances` | estoque | `Estoque_produto` (141.043) | mapeada (conferência, não carga) |
| 33 | `stock_reservations` | estoque | `Reserva_Estoque` (3.183) | parcial · `location_id` e `status` sem origem |
| 34 | `purchase_needs` | compra | `pedido_compra` (8.306) + `Pedido_compra_det` (34.863) | mapeada · cabeçalho sem destino |
| 35 | `purchase_orders` | compra | `ordem_compra` (5.444) | mapeada |
| 36 | `purchase_order_items` | compra | `ordem_compra_det` (30.623) | mapeada |
| 37 | `goods_receipts` | compra | `Nota_entrada` (6.343) | mapeada · **vínculo com a ordem está no item** |
| 38 | `goods_receipt_items` | compra | `nota_entrada_det` (31.873) | mapeada · 80 de 93 colunas sem destino |
| 39 | `activities` | tarefas | — (mais próximo: `observacoes`, 4.905) | **sem origem** |

---

## 7. Mapa campo a campo

Colunas de auditoria (T8) e `tenant_id` (T2) omitidas em toda tabela.

### 7.1 `tenants` ← `empresa` (4 linhas, 77 col)

| destino | origem | tipo |
|---|---|---|
| `id` | `CODLANC` (smallint, PK) | transformação T1 |
| `name` | `EMPRESA` (`razao` é a razão social; `empresa_resumo` o curto) | transformação — escolher um dos três |
| `cnpj` | `CGCCPF nvarchar(38)` | transformação T7 |
| `active` | `Emp_situacao char(1)` | transformação T5 |

**Sem destino (73 col):** endereço completo, contato, logotipos (`imagem1`, `imagem2`,
`Emp_ImagemVertical`, `Emp_ImagemTela`, `Emp_LogoRelatorio`), regime tributário (`Emp_simples`,
`CSOSN_codigo`, `Emp_RegimeNormal`, `emp_perfilsped`, `Emp_CNAE`, alíquotas de governo),
endereços de entrega e cobrança, dados bancários e chave PIX, redes sociais, SUFRAMA.
→ **O Cabinet não tem cadastro de empresa além de nome/CNPJ/ativo.** Emitir documento com
cabeçalho (o impresso do orçamento carrega logo, razão, endereço, CNPJ, IE, fone, e-mail) exige
esses campos. Decisão de escopo, não de ETL.

**Nota de premissa:** o mapa assume `Emp_codigo = empresa.CODLANC`. Não há FK declarada que prove
— confiança média-alta (o padrão vale para as 212 tabelas). Confirmar com uma consulta antes da carga.

### 7.2 `employees` ← `Funcionario` (111) ∪ `SisUsuarios` (79)

Junção por `SisUsuarios.fun_codigo` → `Funcionario.Fun_codigo`.

| destino | origem | tipo |
|---|---|---|
| `id` | novo | T1 |
| `name` | `Fun_Nome` (fallback `SisUsuarios.Nome`) | direto |
| `email` | `Fun_Email` (fallback `SisUsu_EmailEmail`) | direto |
| `password_hash` | `SisUsuarios.Senha varchar(1000)` | **não migrar** |
| `must_change_password` | — | **sem origem** → `true` para todos |
| `active` | `Fun_situacao` / `SisUsu_situacao` | T5 |

**`Senha` não migra, e isso é decisão de segurança, não de conveniência.** O algoritmo do campo é
desconhecido e o legado guarda o `SA` do banco em texto plano no `softlux.ini` — a hipótese de
senha reversível não é remota. Todo mundo entra com senha nova e `must_change_password = true`.

**Sem destino (~85 col de `Funcionario`):** RH inteiro — salário, admissão/demissão, cargo, setor,
carteira de trabalho, PIS/PASEP, título de eleitor, certidão, reservista, CNH, foto, dados
bancários, `Fun_atendimento`, `Fun_GrupoComissao`, `Fun_GrupoPremiacao`, `Fun_DescontoPorcVenda`,
centro de custo. O Cabinet não tem módulo de colaborador — `employees` é identidade de acesso.

**Sem destino em `SisUsuarios`:** configuração de e-mail SMTP por usuário (7 col), flags de PDV,
`SisUsu_LiberarSepEnt`, `SisUsu_TelefoneWhatsapp`.

⚠️ **Ver [B4](#b4-funcionario-tem-pk-de-cpf-e-as-fks-apontam-para-outra-coluna).**

### 7.3 `employee_tenants` ← `SisUsuarios` + `SisGrupo_Usuario` (7)

| destino | origem | tipo |
|---|---|---|
| `employee_id` | `SisUsuarios.fun_codigo` | T1 |
| `tenant_id` | `SisUsuarios.Emp_codigo` | T2 |
| `role` | `SisGrupo_Usuario.Descricao` via `SisUsuarios.Grupo` | transformação — 7 grupos (SUPERVISOR, ADMINISTRAÇÃO, COMPRAS, AUTOMAÇÃO, VENDEDORES, VENDAS SP, TECNICO) viram string de papel |
| `active` | `SisUsu_situacao` | T5 |

**Sem destino — e é o buraco maior do módulo:** o RBAC real do legado é
`SisOpcoes` (287 opções de menu) × 5 ações (`Alterar`/`Excluir`/`Consultar`/`Imprimir`/`Inserir`),
materializado em `SisPermissao` (875 linhas), mais `SisOpcoesEspecial` (52) e
`SisPermissaoEspecial` (259). O destino tem **uma string por vínculo**. A permissão especial é
exatamente o approval flow que o ADR-014 previu (mostrar margem de lucro, alterar valor do produto
na venda, atualizar orçamento/repreçamento, quitar conta pelo módulo de venda) — **existe hoje e
não tem para onde ir**. `SisUsuariosEmpresa` (0 linhas) e `Indicacoes_Funcionario` (0) não ajudam.

### 7.4 `catalog_lookups` ← 6 tabelas de apoio + derivação

Uma linha por `kind`:

| `kind` | origem | nota |
|---|---|---|
| tipo de peça | `TipoPeca` (97) | tem `GrupoProduto_codigo` — o tipo de peça é **por grupo** no legado, e `catalog_lookups` é lista plana → **sem destino** para o vínculo |
| unidade | `produtos.Pro_unidade` + `Pro_UnidadeEntrada` | **sem tabela de origem** — texto livre. Derivar por `DISTINCT`, o que traz as variações de digitação junto |
| motivo de movimento | `estoque_log.Elg_tipo` | texto livre, 6 valores conhecidos (PEDIDO DE VENDA, NOTA DE ENTRADA, ZERAR, ESTOQUE MANUAL, DEVOLUÇÃO, BALANÇO) |
| motivo de devolução | `Motivo_devolucao` (16) | módulo de devolução não existe no destino |
| profissão | `Profissão` (149) | usado por cliente e profissional |
| tipo de documento | `Tipo_documento` (33) | conferir sobreposição com os documentos do Cabinet |
| situação de OS | `OrdemServicoSituacao` (5) | ordem de serviço não existe no destino (`OrdemServico` tem 0 linhas) |

**Não vêm para cá:** `Acabamento` (tem tabela própria, `finishes`), `GrupoProduto` (idem
`product_groups`), `EstoqueTipo` (idem `stock_locations`), `CategoriaVenda` (idem
`sale_categories`).

### 7.5 `document_sequences` ← `SisSeqTabela` (226 linhas)

| destino | origem | tipo |
|---|---|---|
| `tenant_id` | `Emp_codigo` (é NOT NULL aqui) | T2 |
| `kind` | `SeqTab_Tabela` + `SeqTab_Campo` | transformação — filtrar as sequências dos documentos que o Cabinet tem |
| `series` | `ParamentrosSerieVenda.ParSV_serie` | transformação — a série não está em `SisSeqTabela` |
| `next_number` | `SeqTab_Numero float` | **recalcular, não copiar** |

**Por que recalcular:** o legado realimenta a sequência com
`update SisSeqTabela set SeqTab_Numero = (select MAX(Ven_CodigoPre)+1 from Venda)` — sob
concorrência dois operadores recebem o mesmo número. O valor guardado não é fonte de verdade; é
resultado de uma corrida. O `next_number` correto é `MAX(número efetivamente migrado) + 1`, por
`tenant` e `kind`, depois que os documentos entraram. Por isso a carga é passo 10 da [§5](#5-ordem-de-carga).

Das 226 sequências, só interessam as dos documentos que existem no Cabinet: orçamento, pedido de
venda, ordem de compra. O resto **sem destino**.

### 7.6 `partners` ← três origens

`partners` unifica cliente, fornecedor e profissional (`is_customer` / `is_supplier` /
`is_professional`). São três tabelas de origem com formatos diferentes.

**Origem A — `Clientes` (9.322 linhas, 97 col)**

| destino | origem | tipo |
|---|---|---|
| `legal_name` | `Cli_Nome` | direto |
| `trade_name` | `cli_NomeFantasia` | direto |
| `document` | `Cli_cnpj_cpf` | T7 |
| `email` | `Cli_email` | direto |
| `is_customer` | — | constante `true` |
| `registration` | — | **sem origem para o uso do destino** (ver nota) |
| `active` | `cli_situacao` | T5 |

**Origem B — `fornecedor` (868 linhas, 58 col)**

| destino | origem | tipo |
|---|---|---|
| `legal_name` | `For_Razao` | direto |
| `trade_name` | `For_Nome` (curto: `For_Sigla`, `for_nome_especial`) | transformação — três candidatos |
| `document` | `For_cnpj_cpf` | T7 |
| `email` | `For_email` (há também `For_Email_Ordem`) | transformação |
| `is_supplier` | — | constante `true` |
| `payout_bank_info` | `for_banco`, `for_cod_agencia`, `for_conta`, `for_operacao`, `for_codigo_banco`, `ban_codigo`, `For_NIB`, `For_Iban`, `For_BicSwift` | transformação → `jsonb` |
| `active` | `for_situacao` | T5 |

**Origem C — `Indicacoes` (1.316) + `Indicacoes_Detalhe` (1.344)** — o profissional externo

Esta é a origem que menos se parece com o destino. **`Indicacoes` não tem coluna de CNPJ/CPF.**
O documento, a razão social, o tipo de pessoa e o registro profissional moram todos em
`Indicacoes_Detalhe`.

| destino | origem | tipo |
|---|---|---|
| `legal_name` | `IndDet_RazaSocial` (fallback `Ind_Nome`) | transformação |
| `trade_name` | `Ind_Nome` / `IndDet_Nome` | transformação |
| `document` | `IndDet_CNPJCPF varchar(21)` | T7 |
| `email` | `Ind_email` / `IndDet_email` | transformação — duplicado nas duas |
| `is_professional` | — | constante `true` |
| `registration` | `IndDet_crea` **+** `IndDet_NumRegistro` **+** `OrgReg_Codigo` | transformação — 3 campos, 1 coluna destino |
| `payout_bank_info` | `ind_banco`, `ind_num_banco`, `ind_num_agencia`, `ind_num_conta`, `ind_banco_endereco`… (10 col) **e** `Ban_Codigo`, `IndDet_num_agencia`, `IndDet_num_conta`, `IndDet_NIB` (8 col) | transformação — **dado bancário duplicado em cabeçalho e detalhe**; qual vale é pergunta |
| `parent_id` | `Indicacoes_Detalhe.Ind_codigo` → `Indicacoes` | **transformação de alto valor** |
| `active` | `Ind_situacao` **e** `Ind_Ativo` | T5 · **B7** |

**Sobre `parent_id`:** o comentário do schema descreve `parent_id` como "escritório de arquitetura
↔ profissionais dele". A relação `Indicacoes` 1:N `Indicacoes_Detalhe` é exatamente essa forma —
1.316 cabeçalhos para 1.344 detalhes. Cada `Indicacoes_Detalhe` vira um `partner` com
`parent_id` apontando para o `partner` do `Indicacoes` correspondente. **Confiança média-alta**:
a cardinalidade quase 1:1 (só ~28 cabeçalhos com mais de um detalhe) também é compatível com
"detalhe é continuação do cadastro, não filho". Resolver com uma consulta antes de aplicar.

**Deduplicação entre as três origens** — transformação, e das caras. A mesma pessoa pode estar em
`Clientes` e em `Indicacoes` (arquiteto que também compra), ou em `Clientes` e `fornecedor`. A
chave natural é o documento, e o documento é justamente o que falta em `Indicacoes` puro e pode
vir vazio em `Clientes`. Sem regra de dedup, o Cabinet nasce com o mesmo parceiro três vezes e
`is_customer`/`is_supplier`/`is_professional` nunca ficam verdadeiros juntos. **Quantos casos
existem: sem dado** — exige consulta.

#### Sem destino em `partners` — e este é o achado maior do módulo

**`partners` não tem endereço, não tem telefone.** As colunas são `legal_name`, `trade_name`,
`document`, `email`, os três flags, `registration`, `payout_bank_info`, `parent_id`, `active`.
O legado tem, só em `Clientes`:

- **três endereços completos** — principal (`Cli_Endereco`, `Cli_numero`, `Cli_complemento`,
  `Cli_Bairro`, `Cli_codcidade`, `Cli_Cidade`, `Cli_UF`, `Cli_CEP`), cobrança (`*_cob`, 7 col) e
  correspondência (`*_cor`, 9 col, com empresa e cargo)
- **quatro telefones** (`Cli_Fcomercial`, `Cli_Fresidencial`, `Cli_celular`, `Cli_fax`)
- IE/RG (`Cli_IE_RG`), órgão emissor e UF, `Cli_IEProdRural`, `Cli_Contribuinte`, `cli_isento`
- cônjuge completo (5 col), pai, mãe, nascimento, estado civil, sexo, naturalidade, nacionalidade
- dados bancários do cliente (9 col), dados do proprietário PJ (11 col)
- `Cli_LimitCredVend`, `Cli_LimitCredTotal`, `cli_LimiteDesconto`, `CatCli_Codigo` (categoria),
  `Cli_Construcao`, `Cli_TipoConsumidor`, `Cli_Suframa`, foto, Facebook, Instagram, `Cli_OBS`

Em `fornecedor`: endereço (8 col), 4 telefones/web, `For_tp_material`, `For_prazo_entrega`,
`For_prazo_medio_pag`, `for_faturamento_minimo`, `for_classificacao`, `For_ForneceTipoProduto`,
`For_JuntarCodigoAcabOrdem`, `Tra_codigo` (transportadora padrão), comunicadores (4 col), redes.

Em `Indicacoes`: endereço (8 col), 4 telefones, `Ind_vinculo`, `Ind_profissao`, cônjuge,
`CatProfExt_Codigo`, `IndDet_site`, `IndDet_PIS`, `IndDet_obs`, comunicadores, redes.

O front **já tem** `<EnderecoBlock>`, `<TelefonesBlock>`, `<ComunicadoresBlock>` e
`<RedesSociaisBlock>` como componentes compartilhados (CLAUDE.md, padrão 3) — a tela pede os
campos que o schema destino não guarda. Isso não é lacuna de ETL: é **lacuna de schema**, e a
migração é onde ela aparece. Preencher com nada significa 9.322 clientes sem endereço no dia 1.
→ Decisão de modelagem, fora da zona desta issue. Registrada aqui para não passar em branco.

### 7.7 `partner_tenant_links`

| destino | origem | tipo |
|---|---|---|
| `partner_id` | `Cli_Codigo` / `For_codigo` / `Ind_codigo` | T1 |
| `tenant_id` | `Clientes.Emp_codigo` / `fornecedor.Emp_codigo`; para fornecedor também `FornecedorEmpresaCompradora` (227) e `For_EmpresaCompradora` | T2 · transformação |
| `code` | — | **sem origem** — o código do parceiro no legado é global (`Cli_Codigo`), não por empresa. Repetir o id de origem é o menos ruim, e é decisão |
| `payment_terms` | `fornecedor.Fpg_codigo` → `Forma_Pagamento` (16) · `For_prazo_medio_pag` | transformação — dois conceitos numa coluna de texto |
| `credit_limit_cents` | `Clientes.Cli_LimitCredTotal float` | T3 · transformação — o limite é **global** no legado e **por empresa** no destino → replicar em cada vínculo |
| `active` | `cli_situacao` / `for_situacao` | T5 |

**Duas fontes brigam para o fornecedor:** `fornecedor.Emp_codigo` (a empresa dona do cadastro),
`For_EmpresaCompradora` (a empresa que compra dele) e `FornecedorEmpresaCompradora` (histórico do
vínculo, 227 linhas, com `ForEmpCom_data`). O destino tem **um** vínculo por par
(tenant, partner), sem data. Qual das três alimenta é decisão; o histórico é **sem destino**.

`Cli_LimitCredVend` e `cli_LimiteDesconto` **sem destino** — o teto de desconto por cliente existe
no legado (e há um teto global, `Par_LimitDescCli=10`) e o Cabinet não tem onde guardar.

### 7.8 `construction_sites` ← `Obras` (9.454)

| destino | origem | tipo |
|---|---|---|
| `id` | `Obr_Codigo float` (PK) | T1 |
| `customer_id` | `Cli_codigo` | T1 |
| `name` | `Obr_Descricao` | direto |
| `address` | `Obr_Endereco` + `Obr_numero` + `Obr_complemento` + `Obr_Bairro` | transformação — 4 col → 1 |
| `city` | `Obr_Cidade` (ou `mun_codigo` → `Municipio`, 569) | transformação — duas fontes |
| `uf` | `Obr_UF nvarchar(4)` | T9 |
| `active` | — | **sem origem** — `Obras` não tem coluna de situação. Default `true` |

**Sem destino:** `Obr_CEP`, `Obr_tipoObra`, `obr_transf`.

`Cli_codigo` é **nullable** em `Obras` e `customer_id` é NOT NULL no destino → obra órfã precisa de
regra. Quantas existem: **sem dado**.

### 7.9 `product_groups` ← `GrupoProduto` (12)

| destino | origem |
|---|---|
| `name` | `GrupoProduto_Descricao` |
| `active` | `GrupoProduto_Ativo bit` |

**Sem destino:** `GrupoProduto_ordem`.
**Nota de conteúdo:** os códigos **1000 = SERVIÇOS** e **1001 = FRETE** são pseudo-produtos — o
legado põe serviço e frete como grupo de produto para entrarem no cálculo de comissão por grupo.
Migrar o grupo é fácil; o que depende dele (`VendaServico`, frete) é **sem destino** — ver [§8](#8-o-que-fica-sem-destino-módulos-inteiros).

### 7.10 `finishes` ← `Acabamento` (248)

| destino | origem |
|---|---|
| `code` | `CodAcabamento nvarchar(20)` |
| `name` | `DescAcabamento` |
| `active` | `Acab_situacao char(1)` (T5) |

**Sem destino:** `DescAcabamento2`, `acab_tipo`, `acab_tipo2`.
**Nota:** o acabamento `999` significa "sem acabamento" no impresso. No Cabinet
`product_variants.finish_id` é nullable — o `999` deveria virar `NULL`, não uma linha de
`finishes` chamada "999". Transformação.

### 7.11 `products` ← `produtos` (108.992 linhas, 86 col)

| destino | origem | tipo |
|---|---|---|
| `code` | `Pro_codnosso nvarchar(40)` (PK) | direto |
| `special_code` | `Pro_CodEspecial varchar(21)` | direto (`Par_CodEspecialUnico=True` no legado — é único) |
| `short_code` | `Pro_CodReduzido float` | transformação — número vira texto |
| `description` | `Pro_descricao nvarchar(200)` | direto · **é NULLABLE na origem e NOT NULL no destino** |
| `group_id` | `GrupoProduto_codigo` | T1 |
| `unit_out` | `Pro_unidade` | direto |
| `unit_in` | `Pro_UnidadeEntrada` | direto |
| `unit_factor` | `Pro_QuantEntrada` **e** `Pro_QuantSaida` | transformação — o legado guarda os dois lados, o destino guarda o fator: `QuantSaida / QuantEntrada` (confiança média — conferir contra um produto conhecido) |
| `specs` (jsonb) | ~30 col técnicas | transformação — ver abaixo |
| `active` | `Pro_ativo nvarchar(2)` | T5 |

**`specs` recebe** (atributos da vertical de iluminação/móvel): `Pro_lamp_reator`, `Pro_Consumo`,
`Pro_Tensao`, `Pro_TensaoBi`, `Pro_Temp_Cor`, `Pro_Angulacao`, `Pro_VaoLivre`, `Pro_Lumen`,
`pro_tempoInstalacao`, `Pro_CorteNicho`, `Pro_Garantia`, `Pro_PesoLiq`, `Pro_PesoBruto`,
`Pro_Dimensoes`, `Pro_Altura/Largura/Comprimento/RaioProduto`, `Pro_Altura/Largura/Comprimento/RaioCaixa`,
`Pro_NecMontagem`, `Pro_AlturaAssento`, `Pro_PesoSuportado`, `Pro_QuantPes`, `Pro_QuantPortas`,
`Pro_QuantGavetas`, `Pro_QuantPrateleiras`, `Pro_ComEspelho`, `Pro_Ecoreee`.

**Sem destino — bloco fiscal inteiro (13 col):** `pro_NCM`, `Pro_CEST`, `Trib_Codigo`,
`TpTrib_codigo`, `TpOriPro_codigo`, `Pro_AliqICMS`, `pro_AliqPIS`, `pro_AliqIPI`,
`pro_AliqCOFINS`, `PIS_codigo`, `COFINS_codigo`, `IPI_codigo`, `TbImp_codigo`, `Pro_IVA_ST`,
`Pro_TipoProduto`, `Pro_GeneroProdServ`. **Não há módulo fiscal nas 39 tabelas do Cabinet** e o
legado emite NF-e, NFS-e e MDF-e de verdade (`NotaFiscal` tem 174 colunas). O NCM some.

**Sem destino — comercial e operacional:** `Pro_ForaLinha`, `Pro_ConsultarValor` (preço sob
consulta), `Pro_SobreMedida`, `Pro_dt_vigencia`, `Pro_PrazoEntrega`, `Pro_comissao`,
`Pro_quant_minima`, `Pro_foto`, `Prod_ExibirSite`, `Pro_EmpresaCompradora`,
`Pro_DescricaoComplementar`, `Prod_DescricaoLivre`, `Pro_descricao_for`,
`Pro_DescricaoComplementarFor`, `Pro_tp_produto`, `Pro_tp_peca`, `TpLinha_Codigo`,
`ClasProd_codigo`, `Pro_Codbase`, `Pro_exportado`.

**Sem destino, e sem origem de rótulo:** `Desig_Codigo` (designer/modelo), `Marca_Codigo`,
`Fab_Codigo` apontam para `DESIGNER`, `Marca` e `Fabrica` — **as três tabelas têm 0 linhas**. O
produto guarda o código e o nome nunca existiu no banco. Nada a migrar, e nada a lamentar.

### 7.12 `product_variants` — **derivada, não copiada**

**Não existe tabela de variante no legado.** A variante (acabamento × tamanho) existe implícita na
chave composta de três tabelas:

| origem | chave da variante | linhas |
|---|---|---|
| `Preco_Produto` | `Pre_Codnosso` + `Pre_Acabamento` + `Tam_codigo` | 169.764 |
| `Estoque_produto` | `Epr_Codnosso` + `Epr_Acabamento` + `Tam_codigo` (+ `EstTp_Codigo`, `Emp_codigo`) | 141.043 |
| `VendaProduto` | `Pro_codnosso` + `CodAcabamento` + `tam_codigo` | 549.830 |

| destino | origem | tipo |
|---|---|---|
| `product_id` | `Pro_codnosso` | T1 |
| `finish_id` | `CodAcabamento` → `finishes` | T1 · `999` → `NULL` |
| `size` | `Tam_codigo float` | **transformação · sem origem para o rótulo** |
| `active` | — | **sem origem** → derivar de `Preco_Produto.Pre_Ativo`, ou `true` |

⚠️ **A tabela `tamanho` existe e tem 0 linhas.** `Tam_codigo` é usado como FK em `Preco_Produto`,
`Estoque_produto`, `VendaProduto`, `Reserva_Estoque`, `Pedido_compra_det`, `ordem_compra_det` e
`estoque_log`, e **o nome do tamanho nunca foi cadastrado**. `product_variants.size` é `varchar`,
esperando "1,20m" ou "G", e o que existe é um número sem legenda. → `size` recebe o código como
texto, e o rótulo humano **não existe no banco**. Se ele existe em algum lugar, é fora do
`bdprincipal` (impresso, planilha, cabeça de quem opera) — pergunta para o negócio.

A união das três origens é o conjunto de variantes. Variante que só aparece em `VendaProduto`
(vendida no passado, sem preço nem saldo hoje) precisa existir mesmo assim, senão o item do
orçamento migrado fica sem `variant_id`.

### 7.13 `product_suppliers` ← `ProdutosFornecedores` (108.604)

| destino | origem |
|---|---|
| `product_id` | `Pro_codnosso` |
| `supplier_id` | `For_codigo` |
| `supplier_code` | `ProdFor_CodigoProduto nvarchar(120)` |
| `supplier_description` | `ProdFor_DescricaoProduto nvarchar(240)` |
| `active` | `ProdFor_Situacao bit` |

**Sem destino:** **`ProdFor_Padrao bit`** (qual fornecedor é o padrão do produto — a tela do legado
mostra isso na grade de multi-fornecedor, e a decisão de compra depende dele), `ProdFor_GTIN`,
`ProdFor_CodigoBarra`, `ProdFor_prazo_entrega`, `ProdFor_EmbFechada`, `ProdFor_QtdeMinEmb`
(embalagem fechada e quantidade mínima — restrições reais de compra), `ProdFor_DescricaoCompl`.

`produtos.For_codigo` também existe (fornecedor no mestre) e é redundante com esta tabela;
qual manda é pergunta — provável que `ProdFor_Padrao` seja a resposta, e ela não migra.

### 7.14 `supplier_cost_profiles` ← `Custo` (385 linhas, 40 col)

| destino | origem | tipo |
|---|---|---|
| `supplier_id` | `for_codigo` | T1 |
| `name` | `Cus_Nome` | direto |
| `cascade_discounts` (jsonb) | `Cus_desconto1`, `Cus_desconto2`, `Cus_desconto3`, `Cus_desconto4` | transformação — 4 col → array |
| `ipi_percent` | `Cus_IPI` | direto |
| `freight_percent` | `Cus_Frete` | direto |
| `icms_percent` | `Cus_Icms` | direto |
| `st_percent` | `Cus_MargValAgreg` **ou** `Cus_IcmsDestino` | **ambíguo** — o destino tem uma coluna de ST e a origem tem MVA e ICMS de destino, que são coisas diferentes. Decidir |
| `active` | `Cus_situacao` | T5 |

#### Sem destino — e a consequência é que a fórmula de custo não fecha

Ficam de fora 25 colunas que **entram no cálculo** descrito em `@banco`:

```
CUSTO = liquido + embalagem + ipi + financeiro + frete + icms + outros
        + simples + cartao + custo_fixo + desc_custo
```

Sem destino: `Cus_Embalagens`, `Cus_Financeira`, `Cus_Simples`, `Cus_outros`, `Cus_PorcCartao`,
`Cus_CustoFixo`, `Cus_Desconto`, `Cus_CreditoICMS`, `Cus_CreditoPIS`, `Cus_CreditoCOFINS`,
`Cus_Importacao`, `Cus_Cambio`, `Cus_TpVlNFo`, `Cus_ICMSDifAlqIPI`, `Cus_STEmbalagem`,
`Cus_FreteemCompra`, `Cus_ICMSValorCompra`, `Cus_obs`, e os **nove flags `Cus_NFo*`**
(`Cus_NFoICMS`, `Cus_NFoOutros`, `Cus_NFoIPI`, `Cus_NFoSimples`, `Cus_NFoEmbalagem`,
`Cus_NFoFinanceiro`, `Cus_NFoFrete`, `Cus_NFoDesconto`) que ligam/desligam cada parcela.

Some também **`Cus_TributacaoICMS varchar(30)`**, que ramifica o cálculo de ICMS em 7 caminhos
(ST/MVA, DIFAL, crédito…) — e ST domina, 317 de 385 perfis.

→ **`supplier_cost_profiles` guarda 5 números de um cálculo de 30.** O preço de VENDA sobrevive
(depende de `Pre_Tabela`, dos descontos em cascata e do índice — ver [§7.15](#715-supplier_price_indexes)).
O **CUSTO e o LUCRO não.** Se o Cabinet vai mostrar margem, o perfil de custo precisa crescer, e
isso é decisão de modelagem anterior ao ETL.

### 7.15 `supplier_price_indexes` ← `Indice_preco` (376 linhas)

| destino | origem | tipo |
|---|---|---|
| `supplier_id` | `for_codigo` | T1 |
| `cost_profile_id` | `Ipr_custo` → `Custo.Cus_codigo` | T1 |
| `index_value` | **`Ipr_Indice money`** | T3 — é multiplicador, não dinheiro: **não** converter para centavos |
| `valid_from` | — | **sem origem** |
| `valid_to` | — | **sem origem** |

⚠️ `Ipr_Indice` é do tipo `money` mas o valor é um **multiplicador** (mediana 2,56). A regra T3
(`× 100`) **não se aplica** — aplicar destruiria o preço de todo o catálogo. Destino é
`numeric(8,4)`, e `money` tem 4 decimais: converte limpo.

**Vigência sem origem:** `Indice_preco` não tem data. Existe `Indice_preco_log` (1.976 linhas, 20
col) com `usr_dt_hr_criacao`, que dá para reconstruir uma linha do tempo aproximada. O caminho
barato é `valid_from = data de corte da migração` e `valid_to = NULL` — o índice entra como
"vigente desde a virada", sem histórico. Decisão.

**Sem destino:** `Ipr_descricao` (o nome do índice — e é por ele que se reconhece
`VERTZ MARGEM APLICADA`, `VIA HF`, `ESTOQUE - PÇS FORA DE LINHA`), `Ipr_produto`, `Ipr_desconto`
(morto: 370 de 376 zerados), `Ipr_vl_com_inter` e `Ipr_vl_com_exter` (comissão interna e externa
embutidas no índice), `Ipr_Lucro`, `Ipr_vl_Lucro`, `Ipr_CustoTotal`, `Ipr_IndiceVlCusto`,
`Ipr_VlLucroCusto`, `Ipr_CodigoSigla`.

⚠️ **Ver [B1](#b1-ipr_indice--16-índices-em-10-vendem-pelo-preço-de-compra).**

### 7.16 `variant_supplier_prices` ← `Preco_Produto` (169.764)

| destino | origem | tipo |
|---|---|---|
| `variant_id` | `Pre_Codnosso` + `Pre_Acabamento` + `Tam_codigo` | T1 · [§7.12](#712-product_variants--derivada-não-copiada) |
| `supplier_id` | `Pre_Fornecedor` | T1 |
| `list_price_cents` | `Pre_Tabela money` | T3 |
| `valid_from` | `usr_dt_hr_criacao` / `usr_dt_hr_alteracao` | transformação (aproximação) |
| `valid_to` | — | **sem origem** |

#### O histórico de preço é irrecuperável — e não é opinião

`Preco_Produto_Log` tem **3.158.263 linhas** e o desenho do Cabinet ("vigência em linhas, não em
log sem PK") existe justamente para substituí-lo. Só que:

- **não tem `Tam_codigo`** — a chave da variante no destino tem três partes e o log só guarda
  `PreLog_Codnosso` + `PreLog_Acabamento`;
- **não tem `Emp_codigo`** — não dá para dizer de que empresa é a linha;
- **não tem PK** (é uma das 36 tabelas sem PK do legado).

→ Uma linha do log **não resolve para uma variante**. Migrar produziria histórico ambíguo com cara
de histórico exato — pior que não ter. **Recomendação: migrar só o preço vigente
(`Preco_Produto`) e arquivar o log fora do banco novo**, como dado morto consultável.
`Pre_Codindice nvarchar(200)` liga o preço ao índice **por texto**, não por FK — outra
transformação de resolução incerta.

⚠️ A PK real de `Preco_Produto` é `pre_codigo` (surrogate); o índice sobre
(`Pre_Codnosso`, `Pre_Acabamento`) **não é único** e não inclui `Tam_codigo`, `Pre_Fornecedor`
nem `Emp_codigo`. **Nada no banco impede duas linhas de preço para a mesma variante e
fornecedor.** Detectar duplicata antes de carregar, senão a vigência do destino nasce com dois
preços válidos ao mesmo tempo.

### 7.17 `variant_tenant_settings` ← `Preco_Produto` (a mesma tabela, outro papel)

| destino | origem | tipo |
|---|---|---|
| `tenant_id` | `Preco_Produto.Emp_codigo` | T2 |
| `variant_id` | idem §7.16 | T1 |
| `sale_price_cents` | `Pre_Venda money` | T3 |
| `min_stock` | `Pre_est_min float` | T4 |
| `active` | `Pre_Ativo char(1)` | T5 |

**Uma tabela de origem, duas de destino.** `Preco_Produto` acumula o que é do fornecedor
(`Pre_Tabela`, org-scoped) e o que é da empresa (`Pre_Venda`, `Pre_est_min`, tenant-scoped). O
split é a materialização da regra do core: catálogo é da org, preço e estoque são do tenant.

**Sem destino:** `Pre_compra`, `Pre_Custo`, `Pre_Lucro`, `Pre_PorLucro` (valores derivados,
recalculáveis — mas só se o perfil de custo estiver completo, ver [§7.14](#714-supplier_cost_profiles--custo-385-linhas-40-col)),
`Pre_VlNFor`, `Pre_CodBarra`, `Pre_tp_vl` (coluna morta: 100% "NORMAL"), `Pre_EstMinCalcular`,
`Pre_CodForTamanho`, `pre_observacao`.

### 7.18 CRM — os quatro `crm_*`: **sem origem**

`crm_pipelines`, `crm_stages`, `crm_opportunities`, `crm_lost_reasons`.

Varredura por `crm`, `oportun`, `funil`, `lead`, `contato`, `agenda`, `tarefa`, `compromisso` nas
359 tabelas: **nada**. `Contatos` tem 52 linhas e é lista de contato de fornecedor;
`ContatosPrincipais`, `TiposContatos`, `Contato_grupo_email` e `Grupo_contato_email` têm 0. O menu
CRM do legado existe, mas o que ele move não é funil.

→ **Estas quatro entram por seed, não por migração.** Funil e estágios são configuração inicial;
oportunidade nasce do go-live em diante.

Existe uma tentação a nomear e descartar: transformar orçamento ativo não fechado em oportunidade
aberta. É atraente (23.033 orçamentos, 46,1% de conversão histórica) e é **decisão de negócio,
não de ETL** — inventaria estágio, probabilidade e dono que ninguém registrou. Fica anotado como
opção, não como plano.

### 7.19 `sale_categories` ← `CategoriaVenda` (8)

| destino | origem |
|---|---|
| `name` | `CatVen_Descricao` |
| `generates_finance` | `CatVen_Financeiro bit` |
| `affects_stock` | `CatVen_Estoque bit` |
| `active` | `CatVen_Ativo char(1)` (T5) |

**Sem destino:** `CatVen_Compras` (a terceira flag — decide se a categoria gera compra),
`CatVen_Tipo`, `TpCatVenda_codigo` → `TipoCategoriaVenda` (2).
**Nota de conteúdo:** MOSTRAS, DOAÇÃO, VENDA PARA FUNCIONÁRIO e ARQUITETO SEM PGTO têm
`CatVen_Financeiro = false` — não geram financeiro. É a regra que o campo `generates_finance` do
destino nasceu para carregar.

### 7.20 `quotes` ← `Venda` com `Ven_Tipo = 'O'` (23.033 de 34.136)

| destino | origem | tipo |
|---|---|---|
| `id` | `Ven_CodigoPre float` (PK) | T1 |
| `number` | `Ven_CodigoPre` | direto |
| `series` | `ParSV_serie char(3)` | direto |
| `status` | `Ven_Situacao` + `Ven_DataFechaVenda` + `Ven_DataValidade` | **transformação** — 2 valores de origem (`A`/`C`) para 5 de destino (`draft\|issued\|accepted\|expired\|cancelled`) |
| `issued_at` | `Ven_DataEmissao` | direto |
| `expires_at` | `Ven_DataValidade` | direto (validade típica: 5 dias, `par_val_orc=5`) |
| `customer_id` | **nenhuma coluna direta** | **transformação · B3** |
| `site_id` | `Obr_codigo` | T1 |
| `project_name` | `Ven_DescricaoVenda` (ou `Obras.Obr_Descricao`) | transformação |
| `folder_number` | `Pasta_codigo` → `Pasta` (872) | T1 |
| `category_id` | `CatVen_Codigo` | T1 |
| `discount_mode` | `Ven_TipoDesc char(1)` (`P` produto 24.283 · `G` geral 9.853) | transformação · ver nota |
| `discount_percent` | `Ven_DescontoPorc float` | T3/T4 |
| `total_cents` | `Ven_Total float` | **T3 — float** |
| `closed_at` | `Ven_DataFechaVenda` | direto |

**`discount_mode` tem um terceiro modo escondido:** o legado documenta desconto por produto OU
geral OU **por grupo**, e `VendaDesconto` tem **300.337 linhas** (13 col) — o desconto por grupo
materializado por documento. `Ven_TipoDesc` só tem `P` e `G`. A tabela `VendaDesconto` inteira é
**sem destino**.

#### Sem destino em `quotes` — ~55 das 90 colunas

- **fiscal:** `Ven_ICMSBase`, `Ven_ICMSValor`, `Ven_ICMSSTBase`, `Ven_ICMSSTValor`,
  `Ven_ImpostoRetido`, `Ven_ValorDIFAL`, `Ven_Exportacao`
- **frete:** `Ven_ValorFrete`, `Ven_HabilitarFrete`, `Ven_PorcentagemFrete`, `Ven_TipoEntrega`
- **pagamento:** `Ven_formaPag`, `Ven_FormaPagExtra`, `Ven_formaPagHist`, `par_ParcelarVlAcima`,
  `par_VlMinParcela`, `par_QuantMaxParcela`, `Ven_PagReduzido`, `Ven_ValorCredito`,
  `TEF_CodFormaPag_Venda`
- **acréscimo:** `Ven_AcrescimoPorc`, `Ven_Acrescimo` e as variantes por produto e serviço — o
  Cabinet tem desconto e **não tem acréscimo**
- **split produto × serviço (12 col):** `Ven_SubTotalProd`/`Serv`, `Ven_TotalProd`/`Serv`,
  `Ven_DescontoProd`/`Serv`… — o destino tem um total só, porque não tem serviço
- **operação:** `Ven_Eletricista`, `cen_codigo` (centro de custo), `Ven_LimiteDesconto`,
  `Ven_LimiteDescontoFixo`, `Ven_Requisicao`, `Ven_LiberaSeparacao`, `Ven_LiberaEntrega`,
  `Ven_DataPrevEntrega` (vai para `sales_orders`), `Ven_DataEnvioDesm`, `Ven_ComAmbiente`,
  `Ven_EnviarEmailEstoque`, `Ven_TemFinanceiro`/`TemCompra`/`TemEstoque`
- **cancelamento:** `Mod_codigo` (o motivo — `Modo`, 26 linhas). Cancelamento no legado é
  `ven_situacao='C'` + `cen_codigo=null` + carimbo de usuário; o **motivo não tem destino**
- **RT:** `Ven_RtAutomatico`, `Ven_RtCalcular`, `Par_impostofixoRT`, `Par_impostofixoComissao` → **B2**
- **ganho sobre venda:** `Ven_DescGanhoVenda`, `Ven_AcrescGanhoVenda`, `Par_ComissaoVincParc`,
  `Ven_FixaDescontoComissao`
- **vínculo:** `Ven_TpVinculo`, `Ven_CodVinculo`, `Ven_codigo`, `Ven_Migrado`, `Pco_codigo`,
  `Ven_CupomFiscalDAV`

### 7.21 `quote_environments` ← `VendaAmbiente` (144.674) + `Ambiente` (346)

| destino | origem | tipo |
|---|---|---|
| `quote_id` | `VenAmb_NDocPre` (+ `VenAmb_TpDoc`) | T1 · ver nota |
| `code` | `CodAmbiente int` | ⚠️ **incompatível** |
| `name` | `VenAmb_Descricao` (fallback `Ambiente.DescAmbiente`) | transformação |
| `sort` | — | **sem origem** |

⚠️ **`quote_environments.code` está declarado `uuid` no schema destino** e a origem é
`CodAmbiente int`. O comentário do próprio schema diz "agrupa e **numera** os itens no impresso",
e o impresso real numera `01) ESTAR`, `03) COZINHA` — **a numeração pula porque é o código do
ambiente**. Um `uuid` não numera nada. Parece erro de tipo no gerador do schema (as outras colunas
`U` são todas FK). **Sem `code` legível, o impresso migrado perde a numeração de ambiente.**
Registrado como achado; correção é fora da zona desta issue.

**Sobre a chave:** os satélites da venda penduram por `TpDoc` + `NDocPre`, e `TpDoc` é `char(3)`
enquanto `Ven_Tipo` é `char(1)` — a correspondência entre os dois domínios **não está levantada**
(`@banco` marca a inferência `VenAmb_NDocPre → Venda.Ven_CodigoPre` como confiança média-alta).
Confirmar antes de juntar, senão o ambiente cola no documento errado.

`Ambiente` (346) é a lista de ambientes cadastrados; `VendaAmbiente` é o ambiente **dentro de um
documento**, com descrição própria. O destino só tem o segundo — a lista mestre é **sem destino**.

### 7.22 `quote_items` ← `VendaProduto` (549.830 linhas, 53 col)

| destino | origem | tipo |
|---|---|---|
| `quote_id` | `Ven_CodigoPre` | T1 |
| `line_number` | `VenPro_Item` | direto |
| `environment_id` | `CodAmbiente` | T1 |
| `variant_id` | `Pro_codnosso` + `CodAcabamento` + `tam_codigo` | T1 |
| `quantity` | `VenPro_Quantidade float` | T4 |
| `unit_price_cents` | `VenPro_VlUnitario float` | T3 |
| `total_cents` | `VenPro_VlItem float` | T3 |
| `discount_percent` | `VenPro_Vldesconto` | **transformação** — a origem guarda **valor**, o destino guarda **percentual**: `Vldesconto / (VlUnitario × Quantidade) × 100`, com guarda de divisão por zero |
| `description` | — | **sem origem** |
| `finish` | — | **sem origem** (só o código, em `CodAcabamento`) |
| `size` | — | **sem origem** |
| `unit` | — | **sem origem** |
| `supplier_id` | — | **sem origem na linha** |
| `supplier_name` | — | **sem origem** |
| `supplier_code` | — | **sem origem** |
| `product_group` | — | **sem origem** |
| `piece_type` | — | **sem origem** |

#### O legado congela preço e não congela descrição

`quote_items` foi desenhado com **snapshot** — "documento nunca referencia preço vivo". Dos 17
campos, os de dinheiro têm origem e **os oito descritivos não**: `VendaProduto` guarda o código do
produto e o preço praticado, e busca descrição, unidade, fornecedor e grupo em `produtos` na hora
de imprimir.

→ Reconstruir o snapshot por `JOIN` com o cadastro **de hoje** dá o valor de hoje, não o da
emissão. Para um orçamento de 2020 cujo produto mudou de descrição ou de fornecedor, o documento
migrado mostra a descrição atual sob o preço antigo. Alternativas: (a) aceitar, com o snapshot
significando "o que o cadastro diz agora"; (b) deixar em branco os oito, o que vazia o impresso;
(c) migrar só documentos recentes com snapshot reconstruído e arquivar o resto como PDF.
**Decisão de negócio.** O que não dá é migrar calado e chamar de snapshot.

**Sem destino (35 col):** composição/kit (`VenPro_ProdutoPai`, `VenPro_ProdutoSubPai`,
`VenPro_ItemPai`, `VenPro_ItemSubPai`, `VenPro_Seq`, `VenPro_SeqItem`), promoção (`prom_codigo`,
`VenPro_VlPromocao`, `VenPro_ProcPromocao`, `VenPro_VlCadastroPromocao`), impostos por item (6),
`VenPro_circuito` (circuito elétrico do projeto luminotécnico), `VenPro_DataEntrega`,
`VenPro_QuantidadeOriginal`, `VenPro_VlDescontoProc`, `VenPro_aplicacao`, `VenPro_simbolo`,
`VenPro_Obs`, `CFOP_codigo`, `TbImp_codigo`, `pld_codindice`, `ProdCaract_codigo`.

**Pré-produto:** `VenPro_PreProduto` e `VenPro_PreProdFoto` são o produto fictício
(`Par_ProdutoFicticio=True`) — item sem cadastro. O destino cobre o caso por `variant_id` nullable
("produto fictício/pré-produto permitido, como no legado"), e o texto do pré-produto é o único
candidato natural para `description` nessas linhas. **Nas outras, `description` continua sem origem.**

### 7.23 `quote_salespeople` ← `VendaAtendente` (37.707)

| destino | origem |
|---|---|
| `quote_id` | `VenAten_NDocPre` (+ `VenAten_TpDoc`) |
| `employee_id` | `Fun_Codigo float` → **B4** |
| `percent` | `VenAten_Porcentagem float` |
| `is_primary` | `VenAten_Principal bit` |

**Sem destino:** `VenAten_DtVigencia` (a data em que aquele percentual passou a valer).
`Venda.Fun_codigo` é o consultor no cabeçalho e é redundante com esta tabela — usar como fallback
quando não há linha em `VendaAtendente`.

### 7.24 `quote_professionals` ← `VendaIndicacao` (34.666)

| destino | origem |
|---|---|
| `quote_id` | `VenInd_NDocPre` (+ `VenInd_TpDoc`) |
| `partner_id` | `Ind_Codigo` |
| `percent` | `VenInd_Porcentagem float` |

**Sem destino:** `VenInd_Principal bit` e `VenInd_DtVigencia`. A ausência de `is_primary` aqui é
**assimetria com `quote_salespeople`**, que tem: as duas origens guardam "principal", e só uma das
duas destino recebe. O impresso escreve `SEM INDICAÇÃO` quando não há profissional — documento sem
linha aqui é normal, não erro.

`Venda.Ind_codigo` no cabeçalho é o fallback, como em §7.23.

### 7.25 `commission_rules` — a origem do schema está trocada

O comentário do schema diz "legado: `VendaIndicacaoGrupProd`, 232 mil linhas". **Não é.**
`VendaIndicacaoGrupProd` é o percentual **congelado em cada documento** (`TpDoc` + `NDocPre` +
`Ind_Codigo` + `GrupoProduto`). `commission_rules` é uma regra de **cadastro** (profissional ×
grupo, com `active`). A origem certa é **`IndicacaoGrupProd` (7.569 linhas)**.

| destino | origem | tipo |
|---|---|---|
| `professional_id` | `IndicacaoGrupProd.ind_codigo` | T1 |
| `product_group_id` | `GrupoProduto_Codigo` | T1 |
| `percent` | `IndGruProd_Porc float` | T4 |
| `reserve_percent` | — | **B2 — quatro candidatos, nenhuma regra** |
| `active` | — | **sem origem** → `true` |

**Sem destino, e a regra some junto:** `IndGruProd_DescPorc` (percentual de desconto) e
**`IndGruProd_Operador varchar(10)`** — o operador que combina percentual e desconto. Sem ele,
`percent` é um número sem a regra que diz como aplicá-lo. O mesmo par existe em
`VendaIndicacaoGrupProd` e em `Reserva_tecnica_GrupoProd`.

**Sem destino, tabela inteira:** `VendaIndicacaoGrupProd` (232.415 linhas) — o percentual por grupo
**congelado no documento**. É o análogo, para comissão, do snapshot de item da [§7.22](#722-quote_items--vendaproduto-549830-linhas-53-col):
o Cabinet tem a regra viva e não tem onde congelar o que valeu naquele orçamento. Recalcular
comissão de documento antigo com a regra de hoje dá número diferente do que foi pago.

**Também sem destino:** `FornecedorRTGrupProd` (7.504 — RT por **fornecedor** × grupo),
`ComissaoPremiacaoGrup` (16), `Forma_PagamentoGrupProd` (169).

### 7.26 `sales_orders` ← `Venda` com `Ven_Tipo = 'P'` (11.103)

| destino | origem | tipo |
|---|---|---|
| `id` | `Ven_CodigoPre` do pedido | T1 |
| `quote_id` | **`Ven_Orcamento float`** | T1 · **B3** |
| `order_number` | `Ven_CodigoPre` | direto · ver nota |
| `series` | `ParSV_serie` | direto |
| `status` | `Ven_Situacao` + `Ven_DataConclusao` | transformação → `open\|partially_delivered\|delivered\|cancelled` |
| `accepted_at` | `Ven_DataFechaVenda` | direto |
| `delivery_forecast` | `Ven_DataPrevEntrega` | direto |

**Numeração compartilhada:** orçamento e pedido saem da **mesma** sequência
(`Ven_CodigoPre` é global, e a PK de `Venda` é só ela — sem `Emp_codigo`). No Cabinet
`quotes.number` e `sales_orders.order_number` vêm de `document_sequences` com `kind` **separado**.
Migrar os números como estão preserva a rastreabilidade com o papel antigo e deixa as duas
sequências com buracos; renumerar quebra a referência a documento impresso que está na rua.
Decisão — e ela precisa acontecer antes de [§7.5](#75-document_sequences--sisseqtabela-226-linhas).

**24 pedidos não têm orçamento** (11.103 − 11.079, de `@banco`) e `sales_orders.quote_id` é
NOT NULL → ou nasce um `quote` sintético para cada, ou eles ficam de fora. São 24 registros;
o custo de decidir é maior que o de qualquer alternativa. Decidir mesmo assim, e por escrito.

### 7.27 `stock_locations` ← `EstoqueTipo` (4)

| destino | origem |
|---|---|
| `name` | `EstTp_Descricao` — PRINCIPAL · CASA HELIO/SILVANIA · PEÇAS USADAS AUTOMAÇÃO · SHOWROOM |
| `kind` | `EstTp_externo bit` (transformação: booleano → rótulo) |
| `active` | `EstTp_Situacao char(1)` (T5) |

Estoque no legado é multi-**depósito**, não só multi-empresa: `EstTp_Codigo` está na PK de
`Estoque_produto`. O destino trata local como dimensão — casa.

### 7.28 `stock_movements` ← `estoque_log` (402.161) — a transformação mais pesada

| destino | origem | tipo |
|---|---|---|
| `variant_id` | `Pro_codnosso` + `CodAcabamento` + `Tam_codigo` | T1 · ⚠️ `Pro_codnosso` é `varchar(21)` aqui e `nvarchar(40)` em `produtos`; `CodAcabamento` é `varchar(10)` aqui e `nvarchar(20)` em `Acabamento` — **truncamento na origem** |
| `location_id` | `EstTp_Codigo` | T1 |
| `delta` | `Elg_quantidade` **+** `Elg_operacao` | **transformação** — ver abaixo |
| `reason` | `Elg_tipo varchar(25)` | direto (texto livre) |
| `source_kind` | `Elg_tipo` | transformação |
| `source_id` | `Elg_doc float` | T1 |
| `balance_after` | — | **sem origem** |
| `occurred_at` | `Elg_data` | direto |
| `employee_id` | `Elg_usuario` | T1 |

**`delta` não existe na origem.** `Elg_quantidade` é magnitude; o sinal está em
`Elg_operacao`: `S` saída · `E` entrada · `Z` zerar · `B` balanço. `S` e `E` viram `−`/`+`.
**`Z` e `B` não são delta — são valor-alvo**: "zerar" e "balanço" declaram o saldo que passa a
valer, e o kardex do Cabinet só aceita delta. Transformação: `delta = alvo − saldo_anterior`, o
que exige processar em ordem (`Elg_data`, `Elg_Sequencia`) e carregar o saldo corrente na mão
durante a carga. Há ainda `Elg_acao` (`A` alteração · `I` inclusão · `C` cancelamento) — **uma
linha de log pode ser a alteração de outra linha**, e somar tudo conta duas vezes. `Elg_pai`
aponta a linha original. Nenhuma dessas três colunas tem destino.

**`balance_after` é NOT NULL no destino e não existe na origem.** Recalcular por ordenação é o
único caminho — e leva direto a [B5](#b5-o-log-de-estoque-não-fecha-com-o-saldo-por-desenho).

**Corte de carga:** **56.254 dos 56.379 `ZERAR ESTOQUE` aconteceram em 30/03/2015**, num único
dia — é a carga inicial do Softlux, não movimento. Migrar 402 mil linhas para reproduzir a carga
inicial de outro sistema é trabalho para chegar ao mesmo saldo. Alternativa: migrar saldo como um
movimento de abertura na data de corte e guardar o histórico como arquivo. Decisão de negócio
(auditoria pode exigir o kardex completo).

### 7.29 `stock_balances` ← `Estoque_produto` (141.043)

| destino | origem |
|---|---|
| `variant_id` | `Epr_Codnosso` + `Epr_Acabamento` + `Tam_codigo` |
| `location_id` | `EstTp_Codigo` |
| `qty` | `Epr_estoque float` (T4) |

**Sem destino:** `Epr_PreEstoque` (pré-estoque — provável reserva/previsão; semântica não levantada).

⚠️ **`stock_balances` não é carga, é conferência.** No Cabinet o saldo é mantido por trigger do
kardex (ADR-009). Carregar `Epr_estoque` direto contradiz o desenho; o valor do legado serve para
**bater** contra o saldo que o kardex produziu. Divergência aqui é sintoma, não erro de digitação
— ver [B5](#b5-o-log-de-estoque-não-fecha-com-o-saldo-por-desenho).

### 7.30 `stock_reservations` ← `Reserva_Estoque` (3.183)

| destino | origem | tipo |
|---|---|---|
| `order_id` | `Res_Ordem` **ou** `Res_Projeto` **ou** `Res_VendaAvulsa` | **transformação** — três colunas alternativas para uma FK; qual está preenchida decide o tipo do vínculo, e o destino só aponta para `sales_orders` |
| `variant_id` | `Res_CodigoProduto varchar(21)` + `Res_Acabamento varchar(5)` + `Tam_codigo` | T1 · ⚠️ **`Res_Acabamento` tem 5 caracteres e `CodAcabamento` tem 20** — acabamento truncado na reserva |
| `qty` | `Res_Quantidade float` | T4 |
| `location_id` | — | **sem origem** — `Reserva_Estoque` não tem `EstTp_Codigo`, e o destino tem local (nullable) |
| `status` | — | **sem origem** → constante (`ativa`) |

`Res_OrdemItem` aponta o item da ordem; sem destino.

### 7.31 `purchase_needs` ← `pedido_compra` (8.306) + `Pedido_compra_det` (34.863)

O Cabinet não tem "pedido de compra" como documento — tem **necessidade**. O cabeçalho do legado
se dissolve no item.

| destino | origem | tipo |
|---|---|---|
| `sales_order_id` | `pedido_compra.Pcp_pedido_venda` | T1 |
| `variant_id` | `Pro_codnosso` + `Pcd_acabamento` + `Tam_codigo` | T1 |
| `qty` | `Pcd_quantidade_solicit` (há também `Pcd_quantidade_projeto`) | T4 · transformação — dois números, um destino |
| `status` | `Pcp_status nvarchar(2)` | transformação → `open\|grouped\|cancelled` · **domínio da origem não levantado: sem dado** |

**Sem destino:** todo o cabeçalho — `Pcp_dt_pedido`, `Pcp_dt_limite`, `Pcp_obs`, `Pcp_modo`,
`Pcp_ped_av_fan`, `ParSV_serie`, `Pcp_codigo` como número de documento. E no item:
`Pcd_saida`, `Pcd_destino`, `Pcd_recebimento`, `pcd_codindice`.

A cadeia real do legado é **Pedido de Venda → Pedido de Compra → Ordem de Compra por fornecedor**;
o Cabinet colapsa o passo do meio em `purchase_needs`. O agrupamento por fornecedor, que no legado
é a Ordem, continua sendo a Ordem.

### 7.32 `purchase_orders` ← `ordem_compra` (5.444)

| destino | origem | tipo |
|---|---|---|
| `number` | `Ocp_codigo` | direto |
| `supplier_id` | `Ocp_fornecedor` | T1 |
| `status` | `Ocp_status nvarchar(2)` | transformação · **domínio: sem dado** |
| `ordered_at` | `Ocp_dt_ordem` | direto |
| `expected_at` | `Ocp_dt_prevista` | direto |
| `min_invoice_cents` | **`fornecedor.for_faturamento_minimo`** ou `FornecFatMinimo` (3.468) | **transformação — a ordem não guarda o mínimo**; vem do cadastro do fornecedor, e o destino congela no documento |
| `carrier` | `Ocp_transportadora int` → `Transportadora` (38) | transformação — código vira nome |
| `tenant_id` | `Ocp_EmpresaCompradora` (não `Emp_codigo`) | T2 · ver nota |

**"A empresa compradora É o tenant"** diz o schema. Em `ordem_compra` há **duas** colunas de
empresa: `Emp_codigo` e `Ocp_EmpresaCompradora`. É `Ocp_EmpresaCompradora` que carrega a decisão
"esta compra sai pela Vertz ou pela Via HF". Usar a errada joga a ordem no tenant errado — e é
justamente aqui que o multi-empresa do legado é exercitado de verdade (em vendas, 99,91% é
empresa 1; em compras, não).

**Sem destino:** `Ocp_dt_envio`, `Ocp_dt_limite`, `Ocp_Reagendamento` (reagendamento é rotina no
negócio), totais (`Ocp_SubTotal`, `Ocp_Desconto`, `Ocp_Acrescimo`, `Ocp_Total`), `Ocp_descricao`,
`Ocp_obs`, `Ocp_modo`, `Ocp_codigo_pre`, `Ocp_PagImpdesc`, `Ocp_mun_trans`, `Ocp_uf_trans`.

### 7.33 `purchase_order_items` ← `ordem_compra_det` (30.623)

| destino | origem | tipo |
|---|---|---|
| `purchase_order_id` | `Ocp_codigo` | T1 |
| `need_id` | `Ocd_cod_pedido` + `Ocd_item_ped` | T1 · transformação (chave composta → uuid da necessidade) |
| `variant_id` | `Pro_codnosso` + `Ocd_acabamento` + `Tam_codigo` | T1 |
| `qty` | `Ocd_quantidade_pedido` | T4 |
| `cost_cents` | `Ocd_vl_compra money` | T3 |

**Sem destino:** `Ocd_vl_custo`, `Ocd_vl_item`, `Ocd_quant_solicit`, **`Ocd_quant_cancelada`** e
`Ocd_quant_motivo` (cancelamento parcial de item — acontece), `Ocd_recebido`, `Ocd_nota`
(a nota que recebeu o item), `Ocd_destino`, `Ocd_dt_ped_compra`, `Ocd_cod_venda`,
`Ocd_NumOrcFornecedor`, e a **ordem externa** inteira (`Ocpex_codigo`, `Ocpex_cnpj`,
`Ocdex_item`, `ocp_ReceberOrdemExt` — compra feita por terceiro, com CNPJ próprio).

### 7.34 `goods_receipts` ← `Nota_entrada` (6.343)

| destino | origem | tipo |
|---|---|---|
| `supplier_id` | `Nen_fornecedor` | T1 |
| `invoice_number` | `Nen_numero_nota int` | transformação — número vira texto; `Nen_serie` e `Nen_modelo` são **colunas separadas sem destino** |
| `received_at` | `Nen_dt_nota` (há `Nen_dt_emissao`) | transformação — duas datas, uma destino |
| `generates_finance` | `Nen_SemFinanceiro bit` | **transformação — inversão** (`NOT`) |
| `purchase_order_id` | **`nota_entrada_det.Ned_cod_ordem`** | **transformação — o vínculo está no ITEM** |

⚠️ **A nota não aponta para a ordem; o item aponta.** Uma nota pode receber itens de ordens
diferentes, e o destino tem **uma** FK no cabeçalho. Nota que cruza ordens não cabe: ou vira N
recebimentos, ou o vínculo se perde. Quantas cruzam: **sem dado**.

**Sem destino (25 col):** `Nen_base_calculo`, `Nen_vl_icms`, `Nen_base_cal_icms_subst`,
`Nen_vl_icms_subst`, `Nen_vl_ipi`, `Nen_vl_produtos`, `Nen_vl_frete`, `Nen_vl_seguro`,
`Nen_outra_despesas`, `Nen_vl_total_nota`, `Nen_desconto`, `Nen_cfop`, `Nen_StTrib`,
conhecimento de transporte (`Nen_NumConhecimento`, `Nen_DtConhecimento`, `Nen_VlConhecimento`,
`Nen_TipoFrete`), `Nen_transportadora`, `Nen_vl_diferenca`, `Nen_vl_nanota`, `Nen_ValorCredito`,
`Mod_codigo`, **`Nen_NaoGeraEstoque`** (nota que não movimenta estoque — o destino sempre gera),
`Nen_NaoCalcIPI`, `Nen_status`.

### 7.35 `goods_receipt_items` ← `nota_entrada_det` (31.873 linhas, 93 col)

| destino | origem | tipo |
|---|---|---|
| `receipt_id` | `Nen_codigo` | T1 |
| `variant_id` | `Pro_codnosso` + `Ned_acabamento` + `Tam_codigo` | T1 |
| `qty` | `Ned_quantidade_recebida` (há `Ned_quantidade_solicit`) | T4 · transformação |
| `unit_cost_cents` | `Ned_vl_compra money` | T3 |

**80 das 93 colunas sem destino** — o grosso é fiscal por item (`Ned_vl_ipi`, `Ned_aliq_ipi`,
`Ned_aliq_icms`, `CFOP_codigo`, `TpTrib_codigo`, `TpOriPro_codigo`, `Ned_desconto`,
`Ned_vl_produto`, `Ned_vl_produto_fixo`, `Ned_vl_ipi_fixo`…), mais `Ned_vl_custo`, `Ned_vl_item`,
`Ned_recebido`, `Ned_recebimento`, `Ned_codindice`, `Ned_item_ordem`, `Ned_cod_ordem`
(consumido no cabeçalho, §7.34).

**A divergência de quantidade tem valor operacional e não tem destino:** `Ned_quantidade_solicit`
vs `Ned_quantidade_recebida` é o que o fornecedor mandou a menos. Existe até
`Nota_Entrada_Dif` (86 linhas) para a diferença. Some.

### 7.36 `activities` — **sem origem**

Não há tabela de tarefa, agenda ou compromisso no legado.

O mais próximo é **`observacoes` (4.905 linhas)**: `obs_texto ntext`, `obs_tipo nvarchar(2)`,
`obs_codigo` (o documento), `Fun_codigo`, `Obs_data`, `Obs_FunNome`. Dá para virar `activities`
com `kind = 'nota'`, `entity_type` derivado de `obs_tipo`, `done_at = Obs_data` — mas **não tem
`due_date`, não tem responsável separado de autor, não tem título**. Vira histórico, não tarefa.

→ **Decisão:** ou `activities` nasce vazia, ou recebe `observacoes` como nota histórica. A segunda
depende de decifrar `obs_tipo` (domínio não levantado — **sem dado**) para saber a que entidade
cada observação pertence.

---

## 8. O que fica sem destino — módulos inteiros

Não é lacuna de mapeamento: é o recorte do Cabinet ("controle de estoque + geração de orçamento",
decisão do user 2026-07-17). Está listado para que ninguém descubra na virada.

| assunto no legado | tabelas principais | volume |
|---|---|---|
| **Financeiro** | `contas_apagar` + `_det` + `_pag`, `contas_receber` + `_det` + `_pag`, `Movimento_bancario`, `Contas_Bancarias`, `Bancos_Caixas`, `ControleCheque` + `Det`, `Credito`, `CreditoIndicacao`, `acerto_eletrecistas*`, `Plano_Contas` | ~250 mil linhas |
| **Fiscal** | `NotaFiscal` (174 col), `NotaFiscalProdutos` (144 col), `NFSe`, `MDFe`, `TabelaImposto` (62 col), `ECFCupom`, `NotaFiscalCCe`, `CFOP` | ~35 mil linhas · **NF-e, NFS-e e MDF-e estão implementados no legado** |
| **Entrega / logística** | `Controle_entrega`, `controle_entrega_data`, `controle_entrega_prod`, `Coletas` | ~232 mil linhas |
| **Devolução** | `Devolucao`, `DevolucaoProduto`, `DevolucaoServico`, `DevolucaoDesagio`, `Motivo_devolucao` | ~19 mil linhas |
| **Serviços na venda** | `VendaServico` (4.450), `Servicos` (27), `ISSQNServicos` | grupo 1000 = SERVIÇOS |
| **Metas e ganhos** | `MetaVenda` (1), `MetaVendaDet` (1), `MetaVendaGrupProd` (8), `MetaVendaTpVenda` (1), `FechamentoMeta` (2), `FechamentoMetaFunc` (9) | ~22 linhas — o módulo existe no menu e quase não tem dado |
| **Transferência entre filiais** | `Transferencia`, `TransferenciaEstoque`, `TransferenciaEstoqueProduto` | ~1.900 linhas |
| **Balanço e lançamento de estoque** | `BalancoEstoque`, `BalancoEstoqueProdutos`, `Lancamento_estoque`, `lancamento_estoque_det`, `ForaDoBalanco` + `ForaDoBalancoProduto` | ~22 mil linhas |
| **Produtos relacionados (kit)** | `ProdutosRelacionados`, `ProdutosRelacionadosDet`, `Produto_Relacionados`, `ProdutosRelacionadosCadProdutos` | ~720 linhas |
| **Promoção** | `Promocao` (1), `PromocaoProdutos` (0) | praticamente não usado |
| **RBAC fino** | `SisOpcoes` (287), `SisPermissao` (875), `SisOpcoesEspecial` (52), `SisPermissaoEspecial` (259) | ver [§7.3](#73-employee_tenants--sisusuarios--sisgrupo_usuario-7) |
| **Configuração global** | `Paramentros` (284 col, sem PK, 103 preenchidas) | regras que **só moram aqui**: `par_val_orc=5`, `Par_LimitDescCli=10`, parcelamento, limite de crédito 300.000, `Par_ProdutoFicticio` |
| **Ordem de serviço** | `OrdemServico`, `OrdemServicoItem`, `OrdemServicoProduto`, `OrdemServicoAmbiente` | **0 linhas** — nunca usado |
| **Mercado português** | `Factura`, `GuiaR`, `GuiaT`, `NotaCredito`, `NotaDebito`, `TipoExpedicao` | 0 linhas |

**Regra que não é linha e por isso não aparece em contagem nenhuma:** 30 funções escalares, 6
tabulares, 7 procedures e 1 trigger. As que carregam regra de negócio de verdade:
`CalcularProduto` / `CalcularPorProduto` (formação de preço, [§7.14](#714-supplier_cost_profiles--custo-385-linhas-40-col)),
**`PlanoContaValor`** (41 KB, a maior rotina do banco, apuração contábil — **nunca aberta**,
item F do inventário A–H), `EstoqueMinimo` e `GiroEstoque` (funções, não tabelas),
`GravaEstoqueMinimo` (procedure) e o trigger `GatilhoEstoqueMinimo` (ver [B5](#b5-o-log-de-estoque-não-fecha-com-o-saldo-por-desenho)).
Nenhuma migra: no Cabinet a regra vive na aplicação e no schema, não em T-SQL com cursor.
Mas o **comportamento** de `CalcularProduto` precisa ser reproduzido, e hoje só 5 das ~30 entradas
dele têm coluna de destino.

> **Correção da memória.** `@banco` §"Comissão e participação" cita `VendaMes/Trimestre/Semestre/Ano`
> e variantes `*Atendente` como tabelas de metas e ganhos. **Elas não existem no dump de
> 2026-08-10** — as tabelas reais são as `MetaVenda*`/`FechamentoMeta*` da linha acima, e somam ~22
> linhas. `EstoqueMinimo`, `GiroEstoque` e `PlanoContaValor`, citadas na mesma seção, são
> **funções**, não tabelas. Não muda nenhuma decisão do mapa (o módulo de metas está fora do
> escopo dos dois jeitos); fica registrado para não virar busca perdida na hora da carga.

⚠️ **`Paramentros` merece atenção especial no ETL**: não é dado de negócio migrável, mas guarda
**regra** que a tela nova precisa reproduzir (validade do orçamento, teto de desconto,
parcelamento). Nenhuma das 39 tabelas tem onde guardar configuração por empresa. E duas colunas
não devem ser lidas nem em teste: `Par_CEPChaveAcesso` (chave de API em texto plano) e o
`SA`/senha do `softlux.ini`.

---

## 9. Blockers

Os dois primeiros vêm da issue e da memória. Os cinco seguintes saíram desta leitura campo a campo.
**Nenhum é resolvido aqui** — cada um precisa de resposta de negócio ou de consulta ao banco.

### B1 — `Ipr_Indice`: 16 índices em 1,0 vendem pelo preço de compra

**Fato medido** (`@banco`, 2026-08-11): 376 índices, mediana 2,56, média 2,56, mín 1,00, máx 6,00,
concentrados entre 2,1 e 2,6. **16 índices estão em 1,0000 e todos estão ATIVOS.** Pela fórmula
`VENDA = round(liquido × Ipr_Indice, 2)`, índice 1,0 significa **venda = líquido de compra**, ou
seja, margem zero.

Parte é legítima e explicável: `VERTZ MARGEM APLICADA` (já sai com margem embutida), `VIA HF` (é
do mesmo grupo), `NOTA FISCAL`, `ITESTE` e `ESTOQUE - PÇS FORA DE LINHA` são pseudo-fornecedores.
**Os demais são fornecedores reais:** ALFILUX (FLOS), AMCP, DSGNSELO, FAS, FASA, FILLAMENTO,
LIGHT LIGHT, TELAS TENSIONADAS, TENSOFLEX, WENTZ, YPE.

**Por que é blocker do ETL:** o índice migra — é o coração do preço. Migrar literalmente reproduz
margem zero para 11 fornecedores reais no dia 1. Migrar "corrigido" inventa margem que ninguém
autorizou. **Confiança média** de que sejam erro de cadastro; é **pergunta comercial**, e a
resposta muda o preço de venda de todo produto desses fornecedores.

**O que destrava:** o dono do negócio olhar os 11 e dizer, um a um, se o índice está certo.
Não há como decidir isso a partir do banco.

### B2 — `Par_RTautomatico`: o parâmetro diz sim, a venda não registra nada

**Contradição aberta** (`@banco`, "o que falta decifrar" #5): `Par_RTautomatico = True` no
parâmetro global, e **`Ven_RtAutomatico` está vazio em toda a `Venda`** (34.136 linhas).
Ou a coluna não é alimentada pelo parâmetro, ou a RT é aplicada sem registrar na venda.
Confiança baixa nas duas hipóteses.

O schema destino já reconhece o impasse: `commission_rules.reserve_percent` é
"RESERVADO, modelagem adiada (blocker em aberto)".

**O que a leitura campo a campo acrescenta:** a RT não tem um percentual, tem **quatro fontes
concorrentes**, e nenhuma regra escrita diz qual vence:

| origem | linhas | chave |
|---|---|---|
| `Reserva_tecnica_GrupoProd.RetGProd_PorcRT` | 12.108 | por **documento de RT** (`Ret_codigo` → `Reserva_tecnica`, 1.212) × grupo |
| `FornecedorRTGrupProd.ForRTGruProd_Porc` | 7.504 | por **fornecedor** × grupo |
| `ParametrosRTGrupoProdutos` | 7 | **global** × grupo |
| `ParametrosRTIndicacao` / `ParametrosRTCategoriaVenda` / `ParametrosRTDiaPag` | 1 cada | exceções globais |

E `Reserva_tecnica` (1.212) é um **documento próprio** — tem `Ret_data`, `Cli_codigo`,
`Ind_codigo`, `Ret_tec_luminaria`, `Ret_tec_materiais`, `Ret_tec_servico`, `Ret_tec_total`,
`Ret_situacao`, `Ret_TpFinanceiro`. RT no legado não é um percentual numa regra de comissão: é um
**documento financeiro com valores por categoria**. `commission_rules.reserve_percent` é uma
coluna `numeric(7,4)`.

→ **Sem destino:** `Reserva_tecnica` inteira, `Reserva_tecnica_GrupoProd` inteira,
`FornecedorRTGrupProd` inteira, `RTCST` (18), `RTClassTrib` (11).
→ **`reserve_percent` fica sem origem** enquanto a modelagem estiver adiada. Não preencher.

**O que destrava:** decidir se RT é (a) um percentual de comissão, (b) um documento financeiro
próprio, ou (c) as duas coisas. Antes disso não há mapeamento a escrever.

### B3 — orçamento vira pedido: cópia ou troca de tipo? Os números dizem cópia

A memória `@banco` afirma: *"Orçamento, pedido, pré-venda e demonstração são o MESMO registro
físico, discriminados por `Ven_Tipo`"* e *"a conversão hoje é troca de tipo, viraria cópia de
dados"*. **As métricas do mesmo arquivo contradizem a segunda metade:**

- `Ven_Tipo`: **O = 23.033 · P = 11.103**, e `Venda` tem exatamente **34.136** linhas → 23.033 + 11.103 = 34.136. Nenhum registro sumiu.
- *"Conversão orçamento→pedido = 46,1% — 10.616 orçamentos distintos viraram pedido, de 23.033"*.
- *"99,8% dos pedidos nascem de um orçamento (11.079 de 11.103)"*.

Se a conversão fosse troca de `Ven_Tipo`, o registro `O` deixaria de existir ao virar `P` — não
haveria como contar "10.616 dos 23.033 orçamentos viraram pedido", porque eles não seriam mais
orçamentos. **A leitura consistente é que o pedido é uma linha NOVA que referencia o orçamento**,
e a coluna `Venda.Ven_Orcamento float` é exatamente essa referência. Há ainda
`Ven_TpVinculo` + `Ven_CodVinculo`, um segundo par de vínculo genérico.

**Confiança média-alta.** É aritmética sobre números medidos, não inspeção de código.

**Por que é blocker:** a diferença troca o mapa inteiro do módulo de venda.
- Se **cópia** (leitura desta seção): `quotes` ← 23.033 linhas `Ven_Tipo='O'`, `sales_orders` ←
  11.103 linhas `Ven_Tipo='P'` com `quote_id ← Ven_Orcamento`. Total: 34.136 documentos, 1:1 com a
  origem. É o que este documento assume em [§7.20](#720-quotes--venda-com-ven_tipo--o-23033-de-34136) e [§7.26](#726-sales_orders--venda-com-ven_tipo--p-11103).
- Se **troca de tipo**: cada linha `P` teria de gerar **duas** linhas no destino (um `quote` e um
  `sales_order`), o Cabinet nasceria com 45.239 documentos e números de orçamento duplicados.

**O que destrava:** uma consulta — quantas linhas `Ven_Tipo='P'` têm `Ven_Orcamento` preenchido, e
se esse valor bate com um `Ven_CodigoPre` de uma linha `Ven_Tipo='O'` existente. Uma pergunta,
uma resposta, mapa fechado. **Não foi possível executar nesta rodada** (sem acesso ao servidor).

Independente da resposta: **a `Venda` tem PK só `Ven_CodigoPre`, sem `Emp_codigo`** — número de
venda é sequência global entre Vertz e Via HF, e o isolamento depende de filtro na aplicação.
O Cabinet põe `tenant_id` na PK, com RLS FORCE. Se houver número repetido entre empresas, ele
some na carga.

### B4 — `Funcionario` tem PK de CPF e as FKs apontam para outra coluna

`Funcionario` (111 linhas) tem **PK = `Fun_CPF float`**. A coluna `Fun_codigo int` é **nullable** e
**não tem índice único**. E é `Fun_codigo` que o resto do banco usa: `SisUsuarios.fun_codigo`,
`VendaAtendente.Fun_Codigo` (37.707 linhas), `Venda.Fun_codigo`, `Indicacoes.fun_codigo`,
`observacoes.Fun_codigo`. **Nenhuma FK declarada aponta para `Funcionario`** — conferido em
`bdprincipal-fks.csv`, as 10 FKs da tabela são todas de saída.

Consequências para a carga:
- `employees` ← `Funcionario` precisa resolver por `Fun_codigo`, que pode ser nulo ou repetido;
- `quote_salespeople.employee_id` (37.707 linhas) pode não resolver;
- CPF como chave num `float` perde dígito: **CPF tem 11 dígitos e `float` de dupla precisão tem
  ~15-16 dígitos significativos** — cabe, mas zero à esquerda some e a comparação é traiçoeira.

**O que destrava:** medir quantos `Funcionario` têm `Fun_codigo` nulo ou duplicado, e quantos
`VendaAtendente.Fun_Codigo` não casam. São 111 colaboradores — se der conflito, dá para resolver
à mão.

### B5 — o log de estoque não fecha com o saldo, por desenho

Levantado em `@extracao-exe`, achado 2: **o saldo é escrito por valor ABSOLUTO**, não por delta —
`update Estoque_produto set Epr_estoque = :pEpr_estoque where ...`, com o valor calculado na
aplicação. `estoque_log` é gravado **à parte**. Duas baixas simultâneas perdem uma, e
*"log e saldo divergem em silêncio"*.

Some-se o trigger `GatilhoEstoqueMinimo` (o único do banco, AFTER UPDATE em `Estoque_produto`),
que **lê só a primeira linha de `inserted`** e quebra em update multi-linha.

**Por que é blocker:** `stock_movements.balance_after` é NOT NULL e sem origem
([§7.28](#728-stock_movements--estoque_log-402161--a-transformação-mais-pesada)); o único jeito de
preenchê-lo é somar o log em ordem. Se a soma do log não bater com `Estoque_produto`, a carga tem
que escolher uma verdade:

| escolha | consequência |
|---|---|
| **saldo manda** | kardex migrado não explica o saldo — a auditoria do Cabinet nasce inconsistente |
| **log manda** | o saldo muda na virada, e o operador vê número diferente do que via ontem |
| **saldo de abertura** | um movimento de abertura na data de corte, histórico arquivado fora. Consistente, e joga fora o kardex histórico |

**Tamanho da divergência: sem dado** — exige `SUM` sobre 402 mil linhas × 141 mil variantes
contra `Estoque_produto`. É a primeira consulta a rodar quando houver acesso.

### B6 — o snapshot do item de orçamento não existe na origem

Detalhado em [§7.22](#722-quote_items--vendaproduto-549830-linhas-53-col). Oito colunas de
`quote_items` (`description`, `finish`, `size`, `unit`, `supplier_name`, `supplier_code`,
`product_group`, `piece_type`) foram desenhadas como snapshot congelado na emissão, e
`VendaProduto` **não congela nada além de preço e quantidade**.

`description` é **NOT NULL** no destino. Não há default honesto.

**O que destrava:** decidir entre reconstruir por join com o cadastro de hoje (rápido, e o
documento antigo passa a mentir sobre o que foi vendido), migrar só documentos recentes, ou
arquivar os antigos como PDF. É decisão de negócio com peso jurídico — orçamento é proposta
comercial assinada, com 12 cláusulas no impresso.

### B7 — dois campos de "ativo" no profissional

`Indicacoes` tem **`Ind_situacao char(1)`** e **`Ind_Ativo nvarchar(6)`**. `Funcionario` tem
`Fun_situacao char(1)` e `Fun_Ativo nvarchar(6)`. O destino tem **um** `active boolean`.

Qual manda quando divergem: **sem dado**. Menor dos blockers, e ainda assim decide se um
profissional aparece ou some do combo de indicação no dia 1.

---

## 10. Riscos de carga que não são blocker

Cabem na execução, mas quebram em silêncio se ninguém olhar.

1. **Truncamento entre tabelas da mesma origem.** `Pro_codnosso` é `nvarchar(40)` em `produtos`,
   `varchar(21)` em `estoque_log` e `Res_CodigoProduto varchar(21)` em `Reserva_Estoque`.
   `CodAcabamento` é `nvarchar(20)` em `Acabamento`, `varchar(10)` em `estoque_log` e
   `Res_Acabamento varchar(5)` na reserva. **O legado já truncou.** A junção por código vai falhar
   para produto com código longo, e falhar quieta: a linha simplesmente não casa.
2. **`Preco_Produto` aceita duplicata de variante** — ver [§7.16](#716-variant_supplier_prices).
3. **`float` para dinheiro** em toda a `Venda` (T3): conferir `SUM(itens)` contra `Ven_Total`
   documento a documento antes de aceitar.
4. **`Emp_codigo` nulo** em tabela que vira tenant-scoped (T2): PK do destino é NOT NULL.
5. **`TpDoc char(3)` × `Ven_Tipo char(1)`**: a correspondência entre os domínios não está
   levantada, e dela dependem `VendaAmbiente`, `VendaAtendente`, `VendaIndicacao` e
   `VendaIndicacaoGrupProd` — 449 mil linhas penduradas por uma inferência de confiança
   média-alta.
6. **`quote_environments.code` é `uuid`** e recebe `int` — ver [§7.21](#721-quote_environments--vendaambiente-144674--ambiente-346).
7. **Numeração compartilhada entre orçamento e pedido** — ver [§7.26](#726-sales_orders--venda-com-ven_tipo--p-11103).

## 11. Conferências mínimas de aceite

Sem isso a carga "termina" sem ninguém saber se deu certo.

| # | conferência |
|---|---|
| C1 | contagem por tabela: destino = origem menos o descartado explicitamente, por empresa |
| C2 | `SUM(quote_items.total_cents)` = `quotes.total_cents`, documento a documento (T3) |
| C3 | `SUM(stock_movements.delta)` por variante × local = `stock_balances.qty` = `Estoque_produto.Epr_estoque` — **as três** (B5) |
| C4 | todo `quote_items.variant_id` resolve; nenhum item órfão por truncamento (risco 1) |
| C5 | todo `sales_orders.quote_id` resolve (os 24 avulsos tratados por decisão registrada) |
| C6 | nenhum `partners` duplicado por documento entre as três origens |
| C7 | `document_sequences.next_number` > `MAX(number)` de cada `kind`, por tenant |
| C8 | amostra de 20 orçamentos impressos do legado conferida contra a tela nova, campo a campo — a única conferência que pega o que as outras sete não pegam |

## 12. Perguntas que só o banco responde

Nenhuma foi executada nesta rodada — o levantamento é sobre os dumps versionados em
`docs/legado/schema/`, de 2026-08-10, e não houve acesso ao servidor. Cada linha é uma consulta.

| # | pergunta | destrava |
|---|---|---|
| Q1 | quantas linhas `Ven_Tipo='P'` têm `Ven_Orcamento` preenchido e resolvendo para um `Ven_Tipo='O'`? | **B3** — o mapa inteiro de venda |
| Q2 | `SUM(estoque_log)` por variante × local bate com `Estoque_produto`? em quantas variantes diverge, e por quanto? | **B5** |
| Q3 | `Emp_codigo` = `empresa.CODLANC`? | T2, premissa de todo o multi-tenant |
| Q4 | quantos `Funcionario` têm `Fun_codigo` nulo ou repetido? quantos `VendaAtendente.Fun_Codigo` não casam? | **B4** |
| Q5 | quantas `Venda` têm `Obr_codigo` nulo **e** `Pasta_codigo` nulo? (documento sem caminho para o cliente) | `quotes.customer_id` |
| Q6 | domínio de `Pcp_status`, `Ocp_status`, `Nen_status`, `obs_tipo` | §7.31, §7.32, §7.34, §7.36 |
| Q7 | quantos parceiros coincidem por documento entre `Clientes`, `fornecedor` e `Indicacoes_Detalhe`? | dedup de `partners` |
| Q8 | `Indicacoes` 1:N `Indicacoes_Detalhe` — quantos cabeçalhos têm mais de um detalhe? | `partners.parent_id` |
| Q9 | quantas `Nota_entrada` têm itens de mais de uma `ordem_compra`? | §7.34 |
| Q10 | quantas variantes duplicadas em `Preco_Produto` (mesmo produto+acabamento+tamanho+fornecedor+empresa)? | §7.16 |
| Q11 | `Ind_situacao` e `Ind_Ativo` divergem em quantas linhas? idem `Fun_*` | **B7** |
| Q12 | quantos produtos têm código maior que 21 caracteres? (truncamento em `estoque_log`) | risco 1 |

---

## 13. Resumo

- **39 tabelas destino mapeadas** (a issue dizia 34; `crm` e `tarefas` entraram depois).
- **28 têm origem identificada** campo a campo. **5 são seed sem origem** (4 `crm_*` + `activities`).
  **1 é derivada** sem tabela de origem (`product_variants`). **5 são parciais**, com coluna
  essencial sem origem.
- **7 blockers**, dois vindos da issue (`Ipr_Indice`, `Par_RTautomatico`) e cinco desta leitura.
  Nenhum resolvido — cada um tem escrito o que destrava.
- **A maior lacuna não é de ETL, é de schema:** `partners` não guarda endereço nem telefone, e o
  legado tem três endereços e quatro telefones por cliente. Depois dela, na ordem: o perfil de
  custo com 5 de 30 colunas, o snapshot do item de orçamento, e o RBAC fino reduzido a uma string.
- **12 perguntas** dependem de uma consulta ao SQL Server. Nenhuma foi feita nesta rodada.
