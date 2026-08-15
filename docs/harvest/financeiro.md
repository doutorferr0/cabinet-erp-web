# Financeiro — o que o legado Softlux faz hoje

> **Colheita, não decisão.** Este documento existe para responder uma pergunta que está aberta no
> tracker: *o Financeiro entra na próxima rodada de telas, e com que tamanho?* Ele levanta o que o
> sistema atual faz, com que dado, em que volume — e para no ponto em que a resposta deixa de ser
> medição e vira escolha. As escolhas estão enumeradas no fim, em §11, e nenhuma delas foi tomada aqui.
>
> Fecha a issue **#166** (trilho Harvest-4).

---

## 1. Fonte, método e como ler as marcas

O Financeiro **nunca foi capturado em tela**. `topicos/transcricaosoftlux.md` transcreve 20 capturas
e nenhuma é deste módulo — o que aparece lá é só a existência de uma aba `Financeiro` no cadastro de
Colaborador e `Financeiro\Tributário` no de Cliente, **ambas não capturadas**. Não há print, não há
PDF de relatório financeiro, não há transcrição de campo.

Então a fonte aqui é outra, e é boa: o material versionado em `docs/legado/`, levantado do binário
Delphi e do catálogo do SQL Server de produção.

| fonte | o que dá | onde |
|---|---|---|
| `config/menu-form-tabela.csv` | menu → formulário → tabelas tocadas | 287 opções de menu, 170 casadas com form |
| `exe/mapa-telas.md` | os 713 formulários com contagem de campos e tabelas | índice |
| `exe/sql-por-tela.sql` | o SQL embutido em cada DFM — **é daqui que sai a coluna que a tela mostra** | 1.981 blocos |
| `exe/sql-do-codigo.sql` | SQL montado no código Delphi | 3.793 únicos |
| `schema/bdprincipal-*.csv` | colunas, tipos, nulidade, PKs, FKs, contagem de linhas | foto de 2026-08-10 |
| `schema/bdprincipal-rotinas.sql` | corpo das 44 rotinas do banco | inclui `PlanoContaValor` |
| `config/sisopcoes*.csv`, `sispermissao*.csv` | quem enxerga o quê | RBAC real |
| `config/paramentros.csv` | **dump de CONTEÚDO** — os 285 parâmetros reais da operação | fonte de §4.9 |
| `exe/formularios/` | DFM completo de 142 telas — **rótulo literal e vínculo campo↔coluna** | só 4 são do Financeiro |

Vale separar os dois regimes, porque a confiança muda: `schema/` é dump de **catálogo** (existe a
coluna, existe o tipo — não quantas linhas têm cada valor), enquanto `config/` é dump de
**conteúdo** (é a configuração que roda). Por isso §4.9 afirma valor de parâmetro sem hedge, e §9
recusa afirmar distribuição de código de domínio.

**Marca de origem em todo campo e toda afirmação de campo:**

| marca | significa |
|---|---|
| `[L]` | coluna existe no banco do legado — tipo e nulidade conferidos no catálogo |
| `[D]` | a tela lê/escreve isso, evidenciado pelo SQL do DFM |
| `[P]` | vem de `Paramentros` (parâmetro global do legado) |
| `[S]` | já existe no schema novo, `docs/cabinet/cabinet-schema.dbml` |
| `[?]` | **sem dado** — nem o banco nem o binário respondem; só o operador responde |

Contagem de linhas é **foto de 2026-08-10**; a base é viva. Nenhum número aqui foi estimado.

**Por que um arquivo só, e não a pasta com `NOTICE` que o `docs/harvest/README.md` exige.** Aquela
regra é sobre **fonte externa de terceiro**: licença, copyright, código staged. Aqui não há fonte
externa nem uma linha de código colhida — é engenharia reversa do sistema que o Cabinet substitui,
material que já é do próprio projeto e já está versionado em `docs/legado/`. Não há licença a
preservar e não há código a integrar. A zona da issue é este arquivo e só ele, então o índice
`Itens` do README **não foi atualizado** — fica anotado em §11.9.

---

## 2. O módulo no legado, de cima

O menu `Financeiro` do Softlux tem **17 entradas de primeiro nível**. Ao lado dele, dois outros ramos
do menu pertencem funcionalmente ao mesmo módulo: `Tabelas → Financeiro` (8 cadastros de apoio) e
`Relatórios → Financeiro` (13 relatórios). Somando os subitens, **52 opções de menu**.

```
Financeiro
├─ Contas a Pagar ─────── Lançamento · Quitação em Lote
├─ Contas a Receber ───── Lançamentos · Quitação em Lote
├─ Caixa ──────────────── Lançamento · Transf. caixa→conta bancária · Transf. caixa→caixa
├─ Movimentos Bancários ─ Lançamentos · Transf. conta→caixa · Transf. conta→conta
├─ Fluxo de Caixa Ortodoxo
├─ Fluxo de Caixa Otimista
├─ Participações                        (= comissão do profissional externo vira conta a pagar)
├─ Controle de acerto com eletricista
├─ Controle de Cheque Recebido
├─ Controle de Cheque Emitido\Repassado
├─ Controle de Crédito do RH
├─ Controle de Crédito do Profissional
├─ Controle de Duplicata e Recibo
├─ Fechamento de Contas (Caixas\Bancárias)
├─ Emissão de Boleto e Arquivo de Remessa
└─ Conciliação Bancária

Tabelas → Financeiro
├─ Bancos · Agências · Contas Bancárias · Caixas
├─ Tipos de Documentos · Modos de Pgtos/Recebtos
└─ Condições de Venda de Produtos · Condições de Pgtos/Recebtos p/ Módulo Financeiro

Movimentação → (crédito)
└─ Controle/Consulta de Crédito do Cliente · Controle/Consulta de Crédito junto ao Fornecedor
```

### Quem opera — o RBAC responde

Cruzando `SisOpcoes` × `SisPermissao` × `SisGrupo_Usuario` nas 52 opções:

| grupo | telas de Financeiro com ao menos 1 ação | telas no sistema inteiro |
|---|--:|--:|
| SUPERVISOR | **49** | 263 |
| ADMINISTRAÇÃO | **42** | 245 |
| VENDEDORES · COMPRAS · TECNICO · AUTOMAÇÃO · VENDAS SP | **0** | 46 · 92 · 33 · 68 · 44 |

**Financeiro é retaguarda fechada: 2 dos 7 grupos entram, os outros 5 não veem nenhuma tela.**
Isso muda o desenho — não é um módulo que precisa aparecer na navegação de todo mundo.

E ele vaza para fora por **permissão especial**, não por menu: **19 das 52 `SisOpcoesEspecial`
tocam financeiro** — quitar conta pela tela de venda (7), alterar conta pela tela de venda (8),
não criar conta pela nota do fornecedor (10), poder escolher se cria (11), alterar conta a pagar
depois do fechamento de ganhos (12), teto de parcelas (14), valor mínimo de parcelamento (15) e de
parcela (18), acessar recibo de receber (19) e de pagar (20), acessar duplicatas (21), alterar
financeiro da devolução (31), tornar `Modo` obrigatório na parcela (42), **permitir quitação com
valor a menos que o vencimento (45)**, alterar plano de conta na venda (49) e na NF de entrada (50),
mostrar crédito do cliente no pedido (52), reabrir conta fechada (2). Cada uma dessas é uma exceção
que hoje é concedida por grupo — exatamente a forma de *approval flow* que o ADR-014 previu.

---

## 3. O modelo de dados: três níveis, e um lado de caixa

### 3.1 O núcleo — título → parcela → baixa

Contas a pagar e contas a receber são **a mesma estrutura em espelho**, três tabelas cada, com
prefixos diferentes (`Ctp_`/`Ctr_`) e colunas quase idênticas.

```
contas_apagar          título      30.043    quem, quanto no total, plano de conta, centro de custo
   └─ contas_apagar_det   parcela   42.161    vencimento, valor, situação N/S
        └─ Contas_apagar_pag  baixa 41.981    data, valor pago, modo, conta bancária, cheque

contas_receber          título      9.076
   └─ contas_receber_det  parcela   18.555
        └─ contas_receber_pag baixa 17.885
```

A baixa é **N por parcela**, não 1:1 — pagamento parcial é suportado por construção. Na prática a
razão é ~1,0 (41.981 baixas para 42.161 parcelas a pagar), então **pagamento parcial existe no
modelo e quase não é usado**. Confiança alta no número; a leitura de "quase não é usado" é
inferência da razão, não de uma consulta por título.

**A proporção pagar : receber é 3,3 : 1** (30.043 contra 9.076). Mais forte: existem **11.103
pedidos de venda** e só **9.076 títulos a receber no total, de todas as origens**. Ou seja, menos de
um título a receber por pedido. Parte disso é explicada por `CategoriaVenda.CatVen_Financeiro` —
MOSTRAS, DOAÇÃO, VENDA PARA FUNCIONÁRIO e ARQUITETO SEM PGTO **não geram financeiro** por
configuração. Se explica tudo, `[?]`. **É pergunta para o operador, não para o banco** (§11.1).

### 3.2 Campos do título (`contas_apagar` — 31 colunas; `contas_receber` idem com `Ctr_`)

| coluna `[L]` | tipo | nulo | o que é |
|---|---|:--:|---|
| `Ctp_codigo` | float | não | **PK — sem `Emp_codigo`** (ver §8) |
| `Ctp_cod_documento` | nvarchar(40) | sim | número do documento de origem (NF, contrato…) |
| `Ctp_nome` | nvarchar(200) | sim | nome do sacado/favorecido — **denormalizado** |
| `Ctp_vinculo` | nvarchar(100) | sim | **tipo do contraparte, como texto livre** — ver §3.3 |
| `Ctp_codigo_vinculo` | float | sim | id do contraparte — **sem FK** |
| `Ctp_fornecedor_cod` + `Ctp_fornecedor` | int + nvarchar(90) | sim | fornecedor, código **e** nome copiado (no receber: `Ctr_cliente_cod`/`Ctr_cliente`) |
| `Ctp_valor_total_original` | money | sim | valor total do título |
| `Ctp_forma_pag` | int | sim | → `forma_pagamento_fin` (condição de parcelamento) |
| `Tpd_codigo` | int | sim | → `Tipo_documento` (33 tipos) |
| `Pco_codigo` | int | sim | → `Plano_Contas` — **FK declarada** |
| `Cdc_codigo` | int | sim | → `Centro_de_custo` — **FK declarada** |
| `Tcf_codigo` | int | sim | → `TipoContaFinanceira` — **FK declarada**, ver §3.6 |
| `Ctp_status` | nvarchar(2) | sim | `'A'` ativo · `'Q'` quitado (evidência: literais no SQL do binário) |
| `Ctp_juros_vl` / `_por` / `Ctp_multa_vl` / `_por` / `Ctp_Desconto_vl` / `_por` | float | sim | 6 colunas de encargo **no título**, repetidas de novo na parcela e de novo na baixa |
| `Ctp_historico` | nvarchar(160) | sim | histórico curto |
| `Ctp_obs` | text | sim | observação livre |
| `CTP_ControlReferencia` | char(2) | sim | marca de origem — `'RH'` observado |
| `Ctp_MesAnoRef` | varchar(10) | sim | mês/ano de competência, **como texto** |
| `ParSV_serie` | char(3) | sim | série do documento |
| `Emp_codigo` | int | sim | empresa — **nullable e fora da PK** |
| `usr_cod_criacao` / `usr_dt_hr_criacao` / `usr_cod_alteracao` / `usr_dt_hr_alteracao` | | sim | auditoria de 4 colunas, padrão do legado |

`contas_receber` acrescenta `Ctr_recibo` / `Ctr_reciboImp` / `Ctr_reciboImpData` / `Ctr_recibotemplate`
e `PdvCaixa_codigo`; `contas_apagar` não tem os de recibo no título (tem na parcela).

### 3.3 O contraparte é polimórfico por string — e um dos ramos casa por CPF

`Ctp_vinculo` / `Ctr_vinculo` guarda **o tipo do contraparte como texto**, e `*_codigo_vinculo`
guarda o id — sem FK, sem CHECK. Os valores observados nos literais SQL do binário:

`CLIENTE` · `FORNECEDOR` · `INDICAÇÃO` (= profissional externo) · `PESSOAL` (= colaborador) ·
`TRANSPORTADORA` · `PROFISSIONAL EXTERNO` · `MATRIZ/FILIAL` · `OUTROS`

O sistema resolve o nome com um `CASE` de 5 ramos em cada consulta que precisa mostrar quem é
(visto em `FrmBoletoRemessa`, `FrmControleCheque`, e repetido). E o ramo `PESSOAL` casa assim:

```sql
case when ctr_vinculo ='PESSOAL' then
  (select FUN_nome from funcionario where funcionario.fun_cpf = contas_receber.Ctr_codigo_vinculo)
```

**`fun_cpf` comparado contra uma coluna `float`.** CPF como número de ponto flutuante, usado como
chave de junção. Não replicar — e é um risco de ETL, porque CPF com zero à esquerda já perdeu o zero.

Note que `INDICAÇÃO`, `PROFISSIONAL EXTERNO`, `CLIENTE` e `FORNECEDOR` são **quatro rótulos para o
que no Cabinet é uma tabela só** (`partners`, com `is_customer`/`is_supplier`/`is_professional` `[S]`).
A tradução é direta e melhora o modelo.

### 3.4 Campos da parcela (`contas_apagar_det` — 28 col · `contas_receber_det` — 32 col)

| coluna `[L]` | tipo | o que é |
|---|---|---|
| `Ctp_codigo` + `Ctp_parcela` | float + int | título e número da parcela — **não são a PK**, ver §8 |
| `ctp_codigo_det` | float | id próprio da parcela, usado pelas baixas |
| `Ctp_dt_vencimento` | smalldatetime | **a data que manda em tudo: filtro, fluxo de caixa, DRE previsto** |
| `Ctp_valor_vencimento` | money | valor da parcela |
| `Ctp_dt_pagamento` / `Ctp_valor_pagamento` | smalldatetime / money | espelho da baixa, no nível da parcela |
| `Ctp_situacao` | varchar(1) | `'N'` em aberto · `'S'` quitada · **NULL tratado como `'N'`** |
| `Mdo_codigo` | int | modo de pagamento previsto para esta parcela |
| `Ctp_documento` | nvarchar(40) | documento da parcela |
| `Ctp_CodigoBarra` | varchar(100) | linha digitável do boleto |
| juros/multa/desconto `_vl` e `_por` | float | **os mesmos 6 do título, de novo** |
| `Ctp_recibo` / `_Imp` / `_ImpData` / `_template` | | controle de impressão do recibo |
| `Ctp_Duplicatatemplate` | varchar(250) | template da duplicata |
| `Ctp_Sequencia` | int, identity | **a PK real** |

O lado receber acrescenta `Ctr_duplicata` / `Ctr_duplicataImp` / `Ctr_duplicataImpData` e
**`ctr_remessa` (bit)** — a marca de que a parcela já foi para o arquivo CNAB.

### 3.5 Campos da baixa (`Contas_apagar_pag` / `contas_receber_pag` — 42 col cada)

Além de `Cpp_valor_pago`, `Cpp_data_pagamento`, `mdo_codigo` e `cba_codigo` (a conta que
recebeu/pagou), a baixa carrega **o cheque inteiro copiado dentro dela**: `Cpp_numero_banco`,
`Cpp_nome_banco`, `Cpp_agencia`, `Cpp_conta_corrente`, `Cpp_numero_cheque`, `Cpp_emitente`,
`Cpp_cpf_cnpj_emitente` — 7 colunas que duplicam o que `ControleChequeDet` já guarda. E mais
`Cpp_numero_cartao` / `Cpp_liberacao_cartao` para cartão.

Três colunas fazem trabalho estrutural:

- **`Cpp_CodigoAgrupada`** (float) — agrupamento de contas quitadas juntas (`FrmQuitacaoAgrupada`).
- **`LotePagCtPag`** (float) — o lote da quitação em lote.
- **`Cpp_IDConcBancaria`** (varchar 150) — **a chave da conciliação bancária**, o id da linha do
  extrato do banco. É o único ponto do módulo que fala com dado de fora.

E `Cpp_TipoLancamento` (varchar 30) `[?]` — sem valores observados no SQL extraído.

### 3.6 Cadastros de apoio, com o tamanho real

| tabela | linhas | papel |
|---|--:|---|
| `Bancos` | 149 | tabela FEBRABAN (código, nome, site, fone) |
| `Bancos_Caixas` | **15** | **agência E caixa na mesma tabela** — `Bcx_tipo` = `'B'` banco · `'C'` caixa |
| `Contas_Bancarias` | **19** | conta dentro da agência/caixa; PK `(Cba_codigo, Bcx_codigo, Emp_codigo)`; traz `Cba_Saldo_inicial`, `Cba_Limite`, `Cba_situacao`, e o bloco de remessa (`CbaLayoutremessa`, `Cba_CodigoTransmissao`, `Cba_CodigoCedente`) |
| `Contas_BancariasCobranca` | **8** | 32 colunas de configuração de boleto por conta: carteira, convênio, espécie, aceite, instruções 1 e 2, multa/desconto/abatimento/protesto em valor, % e **dias** |
| `Plano_Contas` | **140** | hierárquico por `Pco_pai`; `Pco_tipo` `'A'`=analítica; `Pco_CreditoDebito` `'C'`/`'D'`/`'A'`; `Pco_FixaVariavel` `'F'`/`'V'`; `Pco_hierarquia`, `Pco_DRE`, `Pco_CustoMercVendida` |
| `Plano_Contas_Tipo` | 7 | classificação do plano |
| `TipoContaFinanceira` | **6** | OFICIAL · SIMULAÇÃO · APROVISIONAMENTO · CONTA CLONE · HISTÓRICO · AGRUPADA |
| `Centro_de_custo` | **4** | quatro. O rateio por centro de custo praticamente não é usado |
| `Tipo_documento` | 33 | espécie do título |
| `Modo` | **26** | modo de pgto/recbto: dinheiro, cheque, cartão…; traz `Mdo_taxa_Adm`, `Mdo_prazo`, `Mdo_Dia_fixo`, `Mdo_tipo` (`A`/`D`/`E`/`N`/`P`/`Q`/`T`), `SPEDFormaPag_codigo`. **Códigos 1000 e 1001 são pseudo-modos** e a quitação em lote os exclui explicitamente (`mdo_codigo not in (1000,1001)`) — mesmo padrão do `GrupoProduto` 1000=SERVIÇOS / 1001=FRETE |
| `forma_pagamento_fin` + `forma_pag_parc_fin` | 15 + 42 | condição de parcelamento do módulo financeiro: nº de parcelas, dias da 1ª, dias entre, e a tabela filha com % por parcela |
| `Forma_Pagamento` + `Forma_Pagamento_Parcela` | 16 + 101 | condição de **venda** — tabela diferente, não confundir |
| `FechamentoContas` | 15 | `(Cba_codigo, FechContas_data)` — trava de período por conta |
| `SisUsuariosContasBancarias` | 14 | **quais contas cada usuário enxerga** — visibilidade por conta, não só por papel |

**`TipoContaFinanceira` é a peça que quase passa batido.** Ela separa conta OFICIAL de SIMULAÇÃO,
APROVISIONAMENTO, CLONE, HISTÓRICO e AGRUPADA — isto é, **o mesmo módulo guarda títulos que valem e
títulos que são ensaio**, e todo relatório precisa filtrar. A emissão de boleto exige
`Tcf_codigo = 1`; o DRE aceita só as categorias 1 a 4 das 6.

### 3.7 O lado caixa/banco — e ele não é o mesmo lado

| tabela | linhas | chave do domínio |
|---|--:|---|
| `Movimentos` | **3.006** | lançamento de **caixa** (`Bcx_tipo='C'`); `Mvt_Credito_debito` ∈ `CRÉDITO`/`DÉBITO`; PK `(Mvt_codigo, Emp_codigo, Bcx_codigo, Cba_codigo)` |
| `Movimento_bancario` | **61.046** | lançamento **bancário** (`Bcx_tipo='B'`); `Mba_operacao` ∈ `CRÉDITO`/`DÉBITO`; **`Mba_efetivado` `'S'`/`'N'` = realizado vs previsto**; tem `Mba_imposto` e **duas datas** (`Mba_data_emissao`, `Mba_data_efetivacao`) |
| `Transferencia` | 1.524 | transferência entre contas; `tra_codigo` volta como coluna nas duas tabelas acima |

Ambas apontam para a baixa: `Cpp_cod_pag` e `Crp_cod_pag` estão em `Movimentos` **e** em
`Movimento_bancario`. É por aí que a quitação vira dinheiro numa conta. Ambas também têm
`Pco_codigo` e `Cdc_codigo` próprios — **lançamento avulso de caixa/banco entra no plano de contas
sem passar por título nenhum**, e o DRE soma os dois mundos (§6).

A razão 61.046 : 3.006 diz que **o caixa físico é resíduo e o banco é onde a operação acontece.**

### 3.8 Satélites

| tabela | linhas | leitura |
|---|--:|---|
| `Credito` | **7.477** | crédito de cliente e de fornecedor na mesma tabela: `Credito_TipoVinculo` `'C'`/`'F'`, `Credito_Operacao` `'C'`/`'D'`, `Credito_Antecipado`, `Credito_Docvenda`. **Vivo e volumoso** |
| `ControleCheque` + `ControleChequeDet` | 2.760 + 2.728 | `ControlCheque_tipo` `'R'` recebido · `'P'` pago. O detalhe traz **factoring inteiro**: `EmpFact_Codigo`, `FactVlOrig`, `FactDesc`, `FactTAC`, `FactIOF`, `FactQtDias`, `FactDtEnvio`, `FactDtComp`, `Fact2dias`. Situação observada: `COMPENSADO`, `TROCADO POR CHEQUE` |
| `ControleChequeDev` | **0** | devolução de cheque nunca registrada |
| `EmpresaFactoring` + `EmpresaFactoringAliqDesc` | **0 + 0** | **as 9 colunas de factoring do cheque existem, e não há uma única factoring cadastrada** |
| `Reserva_tecnica` + `Reserva_tecnica_GrupoProd` | 1.212 + 12.108 | RT = comissão do arquiteto; `Ret_tipo` `PROJETO`/`PEDIDO DE VENDA`, `Ret_TpFinanceiro`, valores separados em luminária / materiais / serviço |
| `CreditoIndicacao` | **1** | crédito do profissional — a tela existe, o dado não |
| `acerto_eletrecistas` (+ `_det`, `_servicos`) | **1 + 1 + 1** | acerto com eletricista: 3 adiantamentos, total de serviços, data do acerto final. **Uma linha em cada. A tela existe, a rotina não é usada** |
| `NotaFiscalContas` | 5.016 | parcelas da NF (nº parcela, data, valor, modo) — o financeiro da nota fiscal, à parte |
| `Rateio` + `RateioDet` | **0 + 0** | rateio nunca usado |
| `DadosBancarios`, `PDVCaixa`, `ECFCheque`, `ECFContasReceber`, `ECFMovimentoCaixa`, `ContaAlteracaoData` | **0** | entulho |

---

## 4. Fluxos — de onde nasce cada conta

### 4.1 Um título a receber nasce de uma venda

`FrmPedido` ("Projeto", 158 campos) grava **`contas_receber` e `contas_receber_pag` direto da tela
de venda** `[D]` — inclusive a baixa, quando há entrada. Se a conta nasce ou não é decidido por
`CategoriaVenda.CatVen_Financeiro`. Duas permissões especiais deixam o vendedor **quitar (7)** e
**alterar (8)** a conta sem sair da venda, e a (49) deixa trocar o plano de conta ali mesmo.

`FrmAvulso` (Venda Avulsa) faz o mesmo caminho.

**A venda carrega o próprio veredito.** `Venda` tem três bits irmãos — **`Ven_TemFinanceiro`,
`Ven_TemCompra`, `Ven_TemEstoque`** `[L]` — que dizem, no registro, se aquele documento gerou cada
uma das três consequências. Não é derivação: é coluna. Ela responde de graça a pergunta de §3.1
sobre a razão pedidos↔títulos (§9.7), e é o desenho que o Cabinet teria de decidir se copia — um
flag no documento é rápido de ler e **fica errado em silêncio** se a consequência for desfeita
depois.

**E a venda congela as regras de parcelamento.** `Venda` guarda `par_ParcelarVlAcima`,
`par_VlMinParcela` e `par_QuantMaxParcela` **dentro do próprio registro** `[L]` — cópia dos
parâmetros globais no momento da emissão. Mudar o parâmetro depois não reescreve venda antiga.
É a mesma ideia do snapshot que o Cabinet já aplica em `quote_items` `[S]`, e aqui ela vale a favor
do legado: **é um acerto, não uma dívida.**

### 4.2 Um título a pagar nasce de quatro lugares

1. **Nota do fornecedor** — `FrmNota_entrada` (333 campos, a maior tela do sistema) grava
   `contas_apagar_pag` `[D]`. Duas permissões especiais governam: **(10) não criar conta pela
   entrada da NF** e **(11) poder escolher se cria** — e a decisão fica gravada na própria nota, em
   **`Nota_entrada.Nen_SemFinanceiro` (bit)** `[L]`, ao lado de `nen_Mod_codigo_fin` (o modo do
   financeiro, separado do modo da nota) e `Nen_vl_diferenca_fin`. `[S]` o schema novo já reserva
   `goods_receipts.generates_finance` para exatamente essa decisão — **com o sinal invertido**, o
   que é melhor: `generates_finance = true` como padrão explícito, em vez de um "sem" que só existe
   quando alguém marca.
2. **Participação do profissional** — `FrmRT` ("Participação", 66 campos) toca
   `reserva_tecnica` + `reserva_tecnica_grupoprod` + `creditoindicacao` + **`contas_apagar` e
   `contas_apagar_det`** `[D]`. **A comissão do arquiteto vira conta a pagar.** É o elo que faz o
   Financeiro deixar de ser opcional para quem quer comissão.
3. **RH** — `FrmControleCredRH` (124 campos) com `CTP_ControlReferencia = 'RH'` `[L]`.
4. **Manual** — `FrmConta_apagar` (65 campos).

### 4.3 Quitação

`FrmBaixa_contas_pag` / `FrmBaixa_contas` (Quitação, ~60 campos cada). O que a tela faz `[D]`:

1. lê o título e a parcela;
2. grava uma linha em `*_pag` com valor, data, modo, e a **conta bancária ou caixa** escolhida —
   a combo é a mesma consulta em toda tela do módulo, `Bancos_Caixas ⋈ Contas_Bancarias`, filtrada
   por `Bcx_tipo`;
3. se o modo é cheque, grava/associa `ControleChequeDet`;
4. marca `Ctp_situacao = 'S'` na parcela;
5. **exige motivo** quando é alteração ou quitação: `Motivo_devolucao` filtrado por
   `Mod_tipo IN ('A','Q')` — 16 motivos cadastrados. Motivo obrigatório na baixa é decisão de
   negócio do legado, não detalhe de tela.

A permissão especial **(45) "permitir quitação com valor a menos que o valor do vencimento"** diz
que baixa parcial existe e é privilégio.

**Quitação em lote** (`FrmQuitacaoLote`): a mesma consulta de parcelas filtrada por
`Ctp_situacao = 'N'`, com seleção múltipla, um modo e uma conta para todas, gravando `LotePagCtPag`.
**Agrupamento** (`FrmQuitacaoAgrupada`) é outra coisa: junta contas numa só e marca
`Cpp_CodigoAgrupada` — e há um `TipoContaFinanceira` chamado AGRUPADA para isso.

### 4.4 Caixa, banco e transferência

`FrmCaixa` grava `Movimentos`; `FrmMov_Bancario` grava `Movimento_bancario`. Ambos pedem
**plano de conta** (`Pco_tipo='A' and Pco_situacao='A'`) e **centro de custo** `[D]`.

`FrmTrasnf_finaceira` é **uma tela só, com quatro entradas no menu** — caixa→conta, caixa→caixa,
conta→caixa, conta→conta. Grava `Transferencia` e devolve `tra_codigo` aos dois lados.

**Numeração:** `select max(mvt_codigo) as maximo from movimentos` e
`select max(mba_codigo) ... ` `[D]`. É a **mesma condição de corrida** já documentada para o número
da venda. `[S]` `document_sequences` no schema novo existe para matar isso.

### 4.5 Fechamento de contas

`FechamentoContas(Cba_codigo, FechContas_data)` — 15 linhas, uma por conta. Trava lançamento
anterior à data. Reabrir é a **permissão especial 2**. `SisUsuariosContasBancarias` limita quais
contas o usuário enxerga.

### 4.6 Boleto e arquivo de remessa (CNAB)

`FrmBoletoRemessa` (79 campos). Filtra parcelas a receber com `Ctr_situacao <> 'S'`,
`Ctr_duplicata is not null`, vencimento entre duas datas e **`contas_receber.Tcf_codigo = 1`**
(só conta OFICIAL) `[D]`. Junta a configuração de `Contas_BancariasCobranca` (carteira, convênio,
cedente, instruções, multa/desconto/protesto) e marca `Ctr_duplicataImp` / `ctr_remessa`.

Contexto que muda a leitura: `docs/legado` registra **6 arquivos `.rem` na máquina, o último de
10/03/2026**, e só **8 linhas** em `Contas_BancariasCobranca`. **Boleto está implementado e é pouco
usado.**

### 4.7 Conciliação bancária

`FrmConciliacaoBancaria` (26 campos) lista título+parcela contra as linhas do extrato e grava
`Cpp_IDConcBancaria` / `Crp_IDConcBancaria`. **A leitura do extrato em si não aparece no SQL
extraído** — se é OFX, CNAB retorno ou digitação, `[?]`.

### 4.8 Crédito de cliente e de fornecedor

`Credito` (7.477 linhas) com `Credito_TipoVinculo` `'C'`/`'F'` e `Credito_Operacao` `'C'`/`'D'`:
é um **razão de crédito**, não um saldo. Telas: lançar (`FrmCreditoCliente`, `FrmCreditoFornecedor`)
e consultar (`FrmConsultaCreditoCliente` — que lê `venda` e `devolucao`;
`FrmConsultaCreditoFornecedor` — que lê `nota_entrada`). A permissão especial **(52)** mostra o
crédito do cliente dentro do pedido de venda. `[P]` limite de crédito global = 300.000; janela
padrão de consulta 180 dias (§4.9).

**São as únicas telas do módulo com DFM completo recuperado**, então são as únicas cuja espec tem
rótulo literal em vez de nome de coluna — está em §5.8, e é lá que aparecem o saldo apurado do razão
e a separação entre crédito confirmado e pendente.

### 4.9 Os parâmetros globais governam mais do que parece

`docs/legado/config/paramentros.csv` é **dump de conteúdo**, não de catálogo — são os 285 parâmetros
reais da operação. O que sai de lá muda o desenho:

**O plano de conta do título não é digitado: é escolhido pela ORIGEM do documento.** São 16 slots
`Par_PlanoContas*`, e cinco estão preenchidos `[P]`:

| parâmetro | valor | origem do título |
|---|--:|---|
| `Par_PlanoContasProjeto` | **148** | conta a receber nascida de pedido/projeto |
| `Par_PlanoContasAvulsa` | **148** | conta a receber de venda avulsa — **o mesmo 148** |
| `Par_PlanoContasReservaTecnica` | **150** | conta a pagar da participação do profissional |
| `Par_PlanoContasCreditoCliente` | **111** | crédito de cliente |
| `Par_PlanoContasRH` | **42** | conta a pagar de RH |
| **`Par_PlanoContasNotaEntrada`** | **vazio** | **conta a pagar da nota do fornecedor** |
| `...CreditoFornecedor` · `...Devolucao` · `...NF` · `...CupomFiscal` · `...VendaaDinheiro` · `...Factura` · `...NotaCredito` · `...NotaDebito` · `...JurosFact` | vazios | (parte é o bloco Portugal, que nunca foi usado) |

**A maior origem de conta a pagar é a única sem plano padrão.** Projeto e avulsa dividem o mesmo
plano 148, o que também diz que a granularidade do plano por origem, na prática, é menor do que os
16 slots sugerem. Se isso é intencional, `[?]`.

**As janelas de filtro padrão de cada tela existem como parâmetro** — isto preenche o que em §5.1
seria chute:

| parâmetro | valor | efeito |
|---|--:|---|
| `Par_CtApagar_DiasAnterior` / `_DiasPosterior` | **30 / 120** | a listagem de contas a pagar abre mostrando de 30 dias atrás a 120 à frente |
| `Par_DiasFiltroCreditoCliente` / `...Fornecedor` | 180 / 180 | janela das telas de crédito |
| `Par_DiasFiltroControleCheque` | 180 | janela do controle de cheque |
| `Par_DiasFiltroNotaCredito` | 30 | |

Isso é o mesmo padrão já registrado para as outras telas do legado (orçamento/projeto 364 dias,
pedido/ordem/nota 180): **nenhuma listagem abre com a base inteira.** Vale copiar o conceito — a
tela nasce com recorte, e o recorte é configuração, não código.

**Outros que mudam comportamento** `[P]`:

- **`Par_LancBancEfetivarAutomatico = True`** — o lançamento bancário já nasce efetivado.
  Isto muda a leitura de `Mba_efetivado` (§5.5): o par previsto/realizado existe na coluna, **mas a
  operação está configurada para nunca usar o estado "previsto"**. Pesa direto na decisão §11.5.
- `Par_RHDiasPag = 5` — dia de pagamento do RH.
- `Par_ModoPagFact = 1010` — mais um pseudo-modo, além do 1000/1001 que a quitação em lote exclui.
- `Par_Layoutcontas = 3` — variante do impresso de contas.
- `Par_OrdemCompraConta = False` — **ordem de compra não gera conta**; quem gera é a nota.
- `Par_FechContaSenhaConj = False` — senha conjunta no fechamento de contas, desligada.
- `Par_EntregaComDuplicata = False` · `par_dt_validade_1pag = False` · `Par_Vlminparhist = False`.
- `Par_ContaRecdias` e `Par_ContaPagdias` **vazios** — não há prazo padrão de vencimento.
- `Par_DirBoletoLogo = C:\Softlux\Imagens\Logos\Colorido` — o boleto **foi mesmo montado**, com logo
  configurada. Reforça §4.6: implementado e pouco usado, não implementado pela metade.

**E os parâmetros resolvem — provavelmente — a contradição da Reserva Técnica que estava aberta.**
O registro do legado aponta que `Par_RTautomatico = True` no parâmetro global enquanto
`Ven_RtAutomatico` está **vazio em toda a `Venda`**, sem explicação. O dump mostra que a chave-mestra
está ligada e **todos os interruptores de escopo estão vazios**: `Par_RTAutomaticoProj`,
`Par_RTAutomaticoAvu`, `Par_RTAutomaticoTipo` e `Par_RTPrimeiraPorc` — nenhum preenchido. Com escopo
nenhum ligado, a automação não tem onde agir, e a coluna da venda nunca é alimentada. **Confiança
média** — é leitura de configuração, não do código Delphi que a consome, e fechar exigiria abrir a
rotina. Mas é uma explicação coerente onde antes não havia nenhuma.

O resto do bloco RT: `Par_RTFormaPag = 1` e `Par_RTCentroCusto = 2` — **a conta a pagar da
participação nasce com forma de pagamento e centro de custo fixos por parâmetro**, não escolhidos;
`Par_RTCreditoClienteNaoGerar = True`; `Par_RTFornecedor = False`; `Par_impostofixoRT = 0`.

---

## 5. As telas, como espec

Origem de cada bloco entre colchetes. **Nulidade vem do catálogo**; onde o legado permite nulo mas a
operação provavelmente exige, está marcado `[?]` — e não foi preenchido por inferência.

### 5.1 Listagem de contas a pagar / a receber (`FrmGridContas_apagar` · `FrmGridContas_receber`)

Padrão 1 (DataTable) + padrão 7 (barra de ações) do repo. É uma **listagem mestre-detalhe de três
níveis**: escolher o título abre as parcelas; escolher a parcela abre as baixas `[D]`.

Colunas do nível título, exatamente as que o SQL do DFM traz `[D]`:

| coluna | origem | obs |
|---|---|---|
| nome do contraparte | `Ctp_nome` / resolvido pelo `CASE` de `Ctp_vinculo` | |
| documento | `Ctp_cod_documento` | |
| tipo de documento | `Tipo_documento.Tpd_descricao` | join |
| categoria financeira | `TipoContaFinanceira.Tcf_descricao` | join — **precisa aparecer**, senão SIMULAÇÃO se mistura com OFICIAL |
| empresa | `empresa.EMPRESA` | join |
| valor total | `Ctp_valor_total_original` | |
| status | `Ctp_status` | `A`/`Q` |
| histórico | `Ctp_historico` | |

Nível parcela: `Ctp_parcela`, `Ctp_dt_vencimento`, `Ctp_valor_vencimento`, `Ctp_situacao`,
`Modo.Mdo_nome`, `Ctp_CodigoBarra`.
Nível baixa: `Cpp_data_pagamento`, `Cpp_valor_pago`, `Modo.Mdo_nome`, conta, e o bloco de cheque.

Filtros que a operação exige, evidenciados pelas telas de relatório
(`FrmOpcContas_apagar`, 75 componentes): **período de vencimento** `[D]`, fornecedor/cliente `[D]`,
tipo de documento `[D]`, modo `[D]`, empresa `[D]`, plano de conta `[D]`
(`FrmOpc_plano_ctp_data`), situação em aberto/quitada `[D]`.

**Ações:** Filtro · Incluir · Alterar · Consultar · **Quitar** · **Quitação em lote** ·
**Agrupar** · Imprimir (recibo/duplicata) · Cancelar. `Imprimir` é ação de primeira classe no RBAC
do legado, e recibo e duplicata têm permissão especial própria (19, 20, 21).

### 5.2 Título de conta a pagar / a receber (`FrmConta_apagar` · `FrmConta_receber`)

Padrão 4 (form com abas, 1 form por tela) + padrão 6 (grade no formulário: as parcelas).

**Cabeçalho** — `Ctp_nome` `[L]` · `Ctp_vinculo` + busca do contraparte `[L]` ·
`Ctp_cod_documento` `[L]` · `Tpd_codigo` (combo, filtrada por `Tpd_situacao='A'` ou o valor atual —
padrão do legado para não sumir com valor histórico) `[D]` · `Tcf_codigo` `[D]` ·
`Ctp_valor_total_original` `[L]` · `Ctp_forma_pag` (condição de parcelamento) `[D]` ·
`Pco_codigo` (só analíticas, `Pco_tipo='A'` e crédito/débito compatível com o lado) `[D]` ·
`Cdc_codigo` (só ativos ou o atual) `[D]` · `Emp_codigo` `[D]` · `Ctp_MesAnoRef` `[L]` ·
`Ctp_historico` `[L]` · `Ctp_obs` `[L]`.

**Grade de parcelas** — parcela, vencimento, valor, modo, documento, código de barras, situação.
Gerada a partir da condição de parcelamento (`forma_pagamento_fin` + `forma_pag_parc_fin`: nº de
parcelas, dias da 1ª, dias entre, % por parcela) `[L]`, editável linha a linha.
`[P]` regras globais do legado: parcelar acima de 100 · valor mínimo de parcela 50 · máximo 6
parcelas — com permissões especiais 14, 15 e 18 para exceção.

**Encargos** — juros, multa e desconto, em valor e em percentual, **nos três níveis** (título,
parcela, baixa). Qual deles a tela realmente edita, `[?]`.

### 5.3 Quitação (`FrmBaixa_contas` · `FrmBaixa_contas_pag`)

Diálogo sobre a parcela: data do pagamento `[L]` · valor pago `[L]` · modo `[D]` ·
**conta (caixa ou banco)** `[D]` · juros/multa/desconto/acréscimo `[L]` · motivo, quando exigido
`[D]` · bloco de cheque quando o modo é cheque (banco, agência, conta, nº, emitente, CPF/CNPJ) `[L]` ·
bloco de cartão (nº, liberação) `[L]` · observação `[L]`.

### 5.4 Quitação em lote (`FrmQuitacaoLote`)

Grade de parcelas em aberto (`Ctp_situacao='N'`) com seleção múltipla `[D]`; um modo e uma conta
para o lote; grava `LotePagCtPag`. Colunas exatas do SQL: nome, documento, histórico, plano de
conta, tipo de conta, parcela, vencimento, valor, código de barras, forma de pagamento `[D]`.

### 5.5 Lançamento de caixa e de banco (`FrmCaixa` · `FrmMov_Bancario`)

Caixa `[L]`: caixa (`Bcx_tipo='C'`) · `Mvt_Numero_doc` · `Mvt_Credito_debito` · `Mvt_valor` ·
`Mvt_data` · `Mvt_obs` · modo · **plano de conta** · **centro de custo** · tipo de documento ·
`mvt_din_che_tran`.

Banco `[L]`: conta (`Bcx_tipo='B'`) · `Mba_historico` · `Mba_operacao` · `Mba_valor` ·
`Mba_imposto` · **`Mba_data_emissao` e `Mba_data_efetivacao`** · **`Mba_efetivado` `S`/`N`** ·
plano · centro de custo · bloco de cheque · `Mba_din_che_tra`.

`Mba_efetivado` é o que separa **previsto de realizado** no fluxo de caixa. É uma coluna, não uma
tabela — e é o que o Cabinet teria de decidir se vira status ou vira documento próprio (§11.5).

### 5.6 Transferência (`FrmTrasnf_finaceira`)

Origem, destino, data, valor, histórico — quatro combinações caixa/banco, uma tela `[D]`.

### 5.7 Fluxo de caixa (`FrmFluxo_caixa_ortodoxo` · `FrmFluxo_caixa_otimista`)

Duas telas, 5 campos cada, sem SQL nos DFMs além de `SisUsuariosContasBancarias` `[D]`.
**A regra que separa "ortodoxo" de "otimista" não está no binário extraído nem no banco.** `[?]` —
é a pergunta mais importante que sobrou (§11.6).

### 5.8 Crédito de cliente e de fornecedor — as únicas com RÓTULO LITERAL

`docs/legado/exe/formularios/` traz o DFM completo de 142 das 713 telas, escolhidas pelo escopo de
estoque/orçamento. **Do Financeiro, sobraram quatro** — e são justamente as de crédito. Nelas o
rótulo não precisa ser inferido do nome da coluna: está no binário, com o vínculo campo↔coluna.

**Controle de Crédito do Cliente** (`FrmCreditoCliente`) — rótulo → coluna, literal `[D]`:

| rótulo na tela | coluna | controle |
|---|---|---|
| `Cliente:` | `Credito_CodigoVinculo` | combo de busca |
| `Operação:` | `Credito_Operacao` | **radio** (`'C'`/`'D'`) — não é combo |
| `Nº do documento:` | `Credito_CodigoDoc` | texto |
| `Tipo do doc.:` | `Credito_TpdcodigoOrigem` | combo — **note que é a coluna `...Origem`, não `Tpd_Codigo`** |
| `Valor:` | `Credito_Valor` | valor calculado |
| `Data:` | `Credito_Data` | data |
| `Observação:` | `Credito_Obs` | memo |
| `Nº de série:` | `ParSV_serie` | texto |
| `Pedido de Venda` | `Credito_Docvenda` | **checkbox** |

**Controle de Crédito Junto ao Fornecedor** (`FrmCreditoFornecedor`) é a mesma tela com `Fornecedor:`
no lugar de `Cliente:`, **sem** `Nº de série` e **sem** o checkbox `Pedido de Venda` — 7 campos
contra 9. Duas telas para uma entidade só, no legado; no Cabinet seria uma, com o papel do parceiro
decidindo o rótulo `[S]`.

**Consultar Crédito do Cliente** (`FrmConsultaCreditoCliente`) — a tela de leitura, e ela revela
duas coisas que o schema sozinho não diz `[D]`:

- o cabeçalho mostra **`Créditos:` · `Débitos:` · `Total:`** — o saldo é **apurado do razão**, não
  guardado. Coerente com `Credito` ser lançamento com `Credito_Operacao` `C`/`D`;
- há **duas abas**: uma consulta `Confirmado` e uma memória `NaoConfirmada` — ou seja,
  **`Credito_Situacao` separa crédito confirmado de pendente**, e a tela mostra os dois lados
  separados. O que confirma um crédito, `[?]`.
- `Busca por data:` sobre `Credito_Data`, com a janela padrão de 180 dias de §4.9.

**Escolher Sistema de Cobrança** (`FrmCobranca`) é um seletor de uma coluna só: uma grade de contas
com `Nome · Cód. Banco · Banco · Agência · Conta · Carteira · Variação · Aceite · Espécie ·
Espécie Documento` `[D]`, e Confirmar/Cancelar. Não é tela de cadastro — é o passo que escolhe **por
qual convênio** o boleto vai sair, antes da emissão de §4.6.

### 5.9 As demais, em inventário

| tela | form | tam. | estado do dado |
|---|---|--:|---|
| Emissão de boleto e remessa | `FrmBoletoRemessa` | 79 campos | implementado, **pouco usado** (6 `.rem`) |
| Conciliação bancária | `FrmConciliacaoBancaria` | 26 | leitura do extrato `[?]` |
| Controle de cheque (recebido/emitido) | `FrmControleCheque` | 31 | 2.760 lotes, factoring com **0 empresas** |
| Crédito de cliente / fornecedor (lançar e consultar) | 4 forms | 9 · 7 · 17 · 12 | **7.477 lançamentos — vivo. Especificadas em §5.8, com rótulo literal** |
| Controle de crédito do RH | `FrmControleCredRH` | 124 | vira conta a pagar com `ControlReferencia='RH'` |
| Controle de crédito do profissional | `FrmCreditoIndicacao` | 9 | **1 linha** |
| Participações | `FrmRT` / `FrmReserva_tecnica` | 66 / 39 | 1.212 RTs · 12.108 linhas por grupo |
| Acerto com eletricista | `frmGridAcertoEletrecistas` | — | **1 linha. Efetivamente morto** |
| Duplicata e recibo | `FrmDuplicataRecibo` | 25 | impressão sobre parcelas dos dois lados |
| Fechamento de contas | `FrmFechamentoContas` | 13 | 15 linhas |
| Cadastros de apoio | `Frmgrid_Contas`, `FrmBancoCaixa`, `FrmGrid_CadCaixa`, `Frmgrid_TipoDocumento`, `FrmGrid_doc_pag`, `Frmgrid_PlanoContas`, `Frmgrid_CentroCustos`, `FrmGrid_forma_pag_fin` | 4–19 | padrão 1+7+8 do repo, sem novidade |
| Relatórios | 13 telas `FrmOpc*`/`FrmSelRel*`/`Rlt*` | — | QuickReport compilado no exe; layout **não** recuperável do binário |

---

## 6. `PlanoContaValor` — a apuração, aberta pela primeira vez

`legado-softlux.md` lista essa rotina como **item F, "40 KB, maior rotina do banco, nunca aberta"**.
Foi aberta agora. É a função escalar que preenche **uma célula** do relatório de plano de contas —
o DRE do legado.

```sql
PlanoContaValor(@VlPeriodo int, @Ano int, @Tipo char(1), @periodo char(1), @plano int,
                @ContaPaga char(1), @CATEGORIA int, @FIXOVARIAVEL char(1), @contasfora varchar(100))
RETURNS float
```

| parâmetro | valores | efeito |
|---|---|---|
| `@Tipo` | `'D'` débito · `'C'` crédito | **`D` soma contas a PAGAR, `C` soma contas a RECEBER** |
| `@ContaPaga` | `'N'` · `'S'` | **`N` = competência**: soma `*_det.valor_vencimento` por **data de vencimento**. **`S` = caixa**: soma `*_pag.valor_pago` por **data de pagamento**, **e mais** `Movimentos` (pelo `Mvt_Credito_debito`) **e** `Movimento_bancario` |
| `@periodo` | `'M'` · `'T'` · `'S'` (+ anual) | mensal · trimestral · semestral |
| `@CATEGORIA` | `0` = todas · `1..4` | filtra `Tcf_codigo` — **só 4 das 6 categorias existem para o DRE** |
| `@FIXOVARIAVEL` | `'F'` · `'V'` · `'T'` | filtra `Pco_FixaVariavel` |
| `@contasfora` | lista de `Cba_codigo` | contas excluídas da apuração |

Três coisas que saem daí e valem para o desenho novo:

1. **O mesmo relatório serve competência e caixa, por um flag.** Não são dois relatórios: é o
   mesmo, com `@ContaPaga` trocando a tabela e a data. Vale copiar o conceito.
2. **A apuração mistura título e lançamento avulso.** No modo caixa, soma as baixas **mais** os
   lançamentos de caixa e banco que nunca tiveram título. Isso é coerente com §3.7 (movimento tem
   plano de conta próprio) e é uma decisão de modelo, não um acidente.
3. **A hierarquia do plano é percorrida com 3 auto-junções fixas** (`Plano_Contas_1/2/3` subindo por
   `Pco_pai`). Um plano com mais de 4 níveis **não soma no avô** — o limite é código, não dado.

Duas dívidas dentro dela: são ~24 blocos `SELECT` quase idênticos (2 tipos × 2 regimes × 3 períodos
× com/sem `@contasfora`) em 792 linhas; e `@contasfora` é um `varchar(100)` usado direto em
`cba_codigo not in (@contasfora)` — em T-SQL isso compara com **um** valor, não com uma lista.
**O efeito real com mais de uma conta não foi testado** — confiança alta na leitura do código,
média no comportamento em produção.

---

## 7. Relação com o schema Cabinet

O schema em `docs/cabinet/cabinet-schema.dbml` tem hoje **39 tabelas** — a issue #166 diz 34, número
que ficou para trás; a contagem cresceu com CRM e compra. Nenhuma das 39 é financeira.

### 7.1 O que já existe e serve

| schema novo `[S]` | serve ao Financeiro como |
|---|---|
| `partners` (`is_customer` / `is_supplier` / `is_professional`, `payout_bank_info jsonb`) | **resolve o `Ctp_vinculo` polimórfico**: os rótulos CLIENTE / FORNECEDOR / INDICAÇÃO / PROFISSIONAL EXTERNO viram um `partner_id` com FK de verdade |
| `partner_tenant_links` (`payment_terms`, `credit_limit_cents`) | condição de pagamento e **limite** de crédito por empresa — o limite existe; o **consumido** não |
| `document_sequences` | mata o `MAX(...)+1` de `Movimentos`, `Movimento_bancario` e dos títulos |
| `sale_categories.generates_finance` | **gancho já plantado** para a regra do `CatVen_Financeiro` |
| `goods_receipts.generates_finance` | **gancho já plantado** para as permissões especiais 10 e 11 |
| `commission_rules` (+ `reserve_percent`) | base da Participação — a RT está **reservada, com blocker em aberto** |
| `employees` / `employee_tenants` | o vínculo `PESSOAL` sai do CPF-como-float e vira `employee_id` |
| `catalog_lookups` (`kind`) | candidato natural a absorver `Tipo_documento` e `Modo` — mas ver §11.4 |
| convenção de **centavos `bigint`** | corrige a mistura `float` + `money` do legado de uma vez |

**Dois `generates_finance` já apontam para um módulo que não existe.** Esse é o estado exato: o
schema foi desenhado prevendo o Financeiro e parou na fronteira dele.

### 7.2 O que faltaria — inventário de lacuna, não desenho aprovado

Nenhuma destas tabelas está proposta: é o mapa do buraco, para dimensionar a decisão.

| conceito do legado | tabela(s) | existe no Cabinet? |
|---|---|:--:|
| plano de contas hierárquico | `Plano_Contas` (140) | **não** |
| centro de custo | `Centro_de_custo` (4) | **não** |
| categoria financeira (OFICIAL/SIMULAÇÃO/…) | `TipoContaFinanceira` (6) | **não** |
| tipo de documento · modo de pgto | `Tipo_documento` (33) · `Modo` (26) | **não** (ou `catalog_lookups`) |
| condição de parcelamento + % por parcela | `forma_pagamento_fin` (15) + `forma_pag_parc_fin` (42) | **não** |
| banco · agência/caixa · conta | `Bancos` (149) · `Bancos_Caixas` (15) · `Contas_Bancarias` (19) | **não** |
| config de cobrança por conta | `Contas_BancariasCobranca` (8) | **não** |
| título a pagar / a receber | `contas_apagar` (30.043) / `contas_receber` (9.076) | **não** |
| parcela | `*_det` (42.161 / 18.555) | **não** |
| baixa | `*_pag` (41.981 / 17.885) | **não** |
| lançamento de caixa · de banco | `Movimentos` (3.006) · `Movimento_bancario` (61.046) | **não** |
| transferência entre contas | `Transferencia` (1.524) | **não** |
| fechamento de período por conta | `FechamentoContas` (15) | **não** |
| visibilidade de conta por usuário | `SisUsuariosContasBancarias` (14) | **não** |
| crédito de cliente/fornecedor | `Credito` (7.477) | **não** — só o *limite*, em `partner_tenant_links` |
| cheque (+ factoring) | `ControleCheque`/`Det` (2.760/2.728) | **não** |
| conciliação bancária | coluna `*_IDConcBancaria` | **não** |

Ordem de grandeza: **o núcleo mínimo (título + parcela + baixa dos dois lados, conta bancária,
plano de contas, modo e tipo de documento) é 8 a 10 tabelas novas** — um aumento de ~25% sobre as 39
atuais. Com caixa/banco, transferência, crédito e cheque, passa de 15.

### 7.3 Contrato

`contracts/openapi-v1.json` publica hoje 37 caminhos, **nenhum financeiro**. Qualquer tela deste
módulo começa por escrever caminho novo marcado `Proposto`, com codegen no mesmo PR.

---

## 8. Dívidas do legado — o que não replicar

1. **`contas_apagar` e `contas_receber` têm PK sem tenant** (`Ctp_codigo` / `Ctr_codigo` sozinhos),
   com `Emp_codigo` nullable e fora da chave. **É exatamente o defeito já documentado na `Venda`.**
   O Cabinet exige `(tenant_id, id)` + RLS FORCE.
2. **Parcela e baixa têm PK artificial.** `contas_apagar_det` e `Contas_apagar_pag` têm PK em
   `Ctp_Sequencia` (identity) — **nada no banco impede duas parcelas nº 1 no mesmo título**, nem
   duas baixas com o mesmo id de parcela. A unicidade real é `(título, parcela)` e não está
   declarada.
3. **PKs inconsistentes entre irmãs.** `Movimentos` tem PK de 4 colunas incluindo `Emp_codigo`;
   `Movimento_bancario`, a irmã 20× maior, tem PK de 1 coluna sem empresa.
4. **Dinheiro em `float`.** `Cpp_valor_pago`, `Mvt_valor`, `Mba_valor`, `Cba_Saldo_inicial` e as 18
   colunas de juros/multa/desconto são `float`; `Ctp_valor_vencimento` e `Ctp_valor_total_original`
   são `money`. **Dois tipos de dinheiro no mesmo módulo, um deles binário.** No Cabinet: centavos
   `bigint`, sem exceção — e o ETL precisa de regra de arredondamento explícita.
5. **Numeração por `MAX(...)`** em caixa e banco — condição de corrida, já resolvida por
   `document_sequences`.
6. **Contraparte polimórfico por string sem FK**, com um ramo casando **CPF contra coluna `float`**.
7. **Nome denormalizado dentro do título** (`Ctp_fornecedor`, `Ctr_cliente`, `Ctp_nome`) ao lado do
   código — três fontes para o mesmo nome, que divergem quando o cadastro muda.
8. **Encargo repetido em três níveis** — juros/multa/desconto em valor e % no título, na parcela e
   na baixa: 18 colunas para um conceito.
9. **Cheque copiado dentro da baixa** — 7 colunas duplicando `ControleChequeDet`.
10. **`Quitado()` usa cursor** para responder o que um `NOT EXISTS` responde.
11. **FKs duplicadas 4 vezes** em `Movimentos` e `Contas_Bancarias` (mesma coluna, mesmo destino,
    4 constraints) — resquício de diagrama, polui qualquer engenharia reversa.
12. **`Ctp_MesAnoRef` é competência guardada como `varchar(10)`.**

---

## 9. O que o levantamento NÃO conseguiu responder

Registrado como `[?]`, sem preenchimento por inferência:

1. **A diferença entre Fluxo de Caixa Ortodoxo e Otimista.** As duas telas têm 5 campos e nenhum SQL
   próprio. A regra está em Delphi compilado.
2. **De onde vem o extrato na conciliação bancária** — OFX, retorno CNAB ou digitação.
3. **Layout dos 13 relatórios financeiros.** São QuickReport compilados no exe, sem template
   externo; e ao contrário do orçamento, **não há PDF real de relatório financeiro** para ler o
   layout. Só se recupera pedindo impressão ao operador.
4. **Valores de `Cpp_TipoLancamento`** — coluna varchar(30), nenhum literal no SQL extraído.
5. **Quais dos três níveis de juros/multa/desconto a tela realmente edita.**
6. **Distribuição real de `Ctp_status`, `Ctp_vinculo`, `Mdo_tipo`, `Tcf_codigo`.** O dump é de
   **catálogo**, não de conteúdo: os valores foram lidos de literais SQL, então sabemos que o código
   existe, **não quantas linhas têm cada um**. Uma consulta de 6 linhas no banco fecharia isso.
7. **Se `CategoriaVenda.CatVen_Financeiro` explica sozinho os 9.076 títulos a receber para 11.103
   pedidos.** — **a pergunta encolheu**: `Venda.Ven_TemFinanceiro` (bit) já registra o veredito por
   documento (§4.1), então `SELECT Ven_TemFinanceiro, COUNT(*) FROM Venda WHERE Ven_Tipo='P'` fecha
   isso em uma linha. Sabemos onde olhar; falta a leitura.
8. **Se o legado calcula juros/multa por atraso automaticamente** ou se o operador digita. Há
   colunas para os dois; não há rotina de cálculo no banco.
9. **O que confirma um crédito** — a consulta separa `Confirmado` de `NaoConfirmada` (§5.8) e
   `Credito_Situacao` existe, mas o que muda o estado não aparece no SQL extraído.
10. **Se `Par_PlanoContasNotaEntrada` vazio é intenção ou lacuna** (§4.9) — a maior origem de conta
    a pagar sem plano de conta padrão.

---

## 10. Uso real — o que está vivo e o que é fachada

| vivo | volume | fachada / morto | volume |
|---|--:|---|--:|
| Contas a pagar (título/parcela/baixa) | 30k / 42k / 42k | Acerto com eletricista | **1 linha** |
| Movimento bancário | 61.046 | Crédito do profissional | **1 linha** |
| Contas a receber | 9k / 18,5k / 17,9k | Empresas de factoring | **0** |
| Crédito de cliente/fornecedor | 7.477 | Devolução de cheque | **0** |
| Parcelas de NF | 5.016 | Rateio + RateioDet | **0** |
| Cheque | 2.760 / 2.728 | PDV / ECF (3 tabelas) | **0** |
| Caixa físico | 3.006 | Centro de custo | **4 cadastrados** |
| Reserva técnica | 1.212 / 12.108 | Boleto / CNAB | 8 configs, 6 arquivos |
| Transferência | 1.524 | | |

**A leitura curta:** o Financeiro do legado é, na prática, **contas a pagar + movimento bancário +
crédito**. Contas a receber roda com um terço do volume do pagar. Caixa físico é resíduo. Factoring,
rateio, PDV, devolução de cheque e acerto com eletricista têm tela e não têm dado.

---

## 11. Decisões que ficam para o user

Nenhuma foi tomada. Cada uma muda o tamanho do trabalho.

**11.1 — O Financeiro entra na próxima rodada?**
Contra: o `@escopo-substituicao` da memória (decisão de 2026-07-17) diz *"ficam no Softlux até fase
posterior: Financeiro completo, CRM, metas/comissões"* — e o CRM já furou essa fila. A favor: o
schema novo já tem **dois `generates_finance` apontando para o vazio**, e a Participação (comissão do
profissional) **é** conta a pagar — sem Financeiro, comissão não fecha.
Custo medido: 8–10 tabelas para o núcleo, 15+ para o módulo do legado inteiro.

**11.2 — Se entrar, entra inteiro ou pelo pedaço vivo?**
O dado de §10 sustenta um recorte: **contas a pagar + movimento bancário + crédito** cobrem a
operação real; contas a receber é um terço do volume mas é o lado que fecha o ciclo da venda. Ficam
de fora naturalmente factoring, rateio, PDV, acerto com eletricista — **todos com zero ou uma
linha**. *Trade-off:* recortar deixa o operador com dois sistemas abertos durante a transição.

**11.3 — O que fazer com `TipoContaFinanceira` (OFICIAL vs SIMULAÇÃO).**
Guardar título que é ensaio na mesma tabela do que vale é uma decisão forte, e obriga todo
relatório a filtrar. Opções: (a) replicar como está; (b) tratar SIMULAÇÃO como rascunho de status;
(c) não migrar as categorias não-oficiais. *Trade-off:* (c) é o mais limpo e **perde histórico** —
sem consulta ao dado não dá para saber quanto.

**11.4 — `Tipo_documento` e `Modo`: `catalog_lookups` ou tabela própria?**
`Tipo_documento` é lookup puro (código + descrição + ativo) e cabe em `catalog_lookups`. **`Modo`
não é**: tem `Mdo_taxa_Adm`, `Mdo_prazo`, `Mdo_Dia_fixo`, `SPEDFormaPag_codigo` — é regra de negócio
(a taxa de cartão entra no custo). *Trade-off:* forçar `Modo` no lookup genérico devolve o problema
mais tarde, quando alguém precisar da taxa.

**11.5 — Previsto e realizado: status, documento, ou nem isso?**
O legado resolve com **uma coluna** (`Mba_efetivado` `S`/`N`) e com a data de vencimento das parcelas
em aberto. (a) Copiar o flag é barato e casa com `PlanoContaValor`. (b) Separar em documento próprio
é mais limpo e é trabalho novo sem precedente no legado. Isto decide também se o Fluxo de Caixa é
relatório ou tela.
**Medição que mudou esta decisão:** `Par_LancBancEfetivarAutomatico = True` (§4.9) — o lançamento
bancário **já nasce efetivado**. A coluna existe, o par previsto/realizado existe, e a operação está
configurada para nunca usar o lado "previsto". Então há uma opção (c) que antes não aparecia:
**não migrar o estado**, e deixar o previsto ser só a parcela em aberto. *Trade-off:* (c) é a mais
barata e fecha a porta para fluxo de caixa projetado com lançamento manual futuro.

**11.6 — Fluxo de Caixa Ortodoxo vs Otimista: perguntar ou descartar.**
A regra não existe em lugar nenhum recuperável. Ou o operador explica, ou as duas telas ficam fora.
**Não dá para inferir sem inventar.**

**11.7 — Boleto/CNAB entra?**
Implementado no legado, **8 contas configuradas e 6 arquivos de remessa desde sempre, o último de
10/03/2026**. É o item mais caro do módulo (layout por banco, retorno, conciliação) para o uso
medido. Só o user sabe se o uso é baixo por escolha ou por o legado ser ruim nisso.

**11.8 — Uma consulta curta ao banco fecha metade do §9.**
Distribuição de `Ctp_status`, `Ctp_vinculo`, `Mdo_tipo`, `Tcf_codigo`, `Credito_Operacao` e
`Credito_Situacao`, mais `Ven_TemFinanceiro` por `Ven_Tipo`. Os dumps versionados de `schema/` são
**de catálogo, não de conteúdo** — os de `config/` são de conteúdo, e foi deles que veio §4.9
inteira. Se houver nova janela de leitura no SQL Server de produção, **essas sete contagens valem
mais que qualquer estimativa aqui**, e a de `Ven_TemFinanceiro` sozinha responde a pergunta de §3.1.

**11.8b — A Reserva Técnica tem agora uma explicação, e ela precisa de confirmação.**
O blocker registrado no levantamento do legado (`Par_RTautomatico = True` com `Ven_RtAutomatico`
vazio em toda a `Venda`) ganhou uma leitura em §4.9: **a chave-mestra está ligada e todos os
interruptores de escopo estão vazios**. Confiança média — é configuração, não o código que a
consome. Fechar exige ou abrir a rotina Delphi, ou uma pergunta de uma frase a quem opera. **Enquanto
não fecha, modelar RT no Cabinet continua apoiado em suposição** — e `commission_rules.reserve_percent`
segue reservado por isso.

**11.9 — Índice do `docs/harvest/README.md`.**
A zona da issue #166 é este arquivo e só ele, então a tabela `Itens` do README **não lista
`financeiro.md`**. E este item não segue a forma `NOTICE` + `integracao.md` + código porque não é
colheita de fonte externa (§1). São duas coisas para o user resolver: incluir a linha no índice, e
decidir se o README passa a distinguir *colheita externa* de *levantamento do legado* — são
regimes diferentes de licença e de integração debaixo do mesmo diretório.
