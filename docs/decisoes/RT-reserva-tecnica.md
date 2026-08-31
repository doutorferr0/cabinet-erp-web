# Reserva Técnica — como o legado calcula, e o que ainda é decisão

> **Natureza desta nota:** dossiê de DECISÃO. Ela lê o código do legado, mede o que já existe
> no Cabinet e nomeia opções. **Não propõe nem contém linha de feature**, e nenhuma das opções
> abaixo deve virar contrato antes de o user escolher. Zona: `docs/decisoes/`.
>
> **Origem:** issue #444 (❓12 do user — "contradição na RT automática do legado").
> Medido em 2026-08-28/29 contra `docs/legado/` e o `contracts/openapi-v1.json` desta branch.

---

## 0. Duas premissas do enunciado já não valem

A issue pede "como o legado calcula RT de fato · onde contradiz a expectativa · opções de
modelagem — user decide". Ao remedir antes de escrever, duas coisas mudaram:

**1. A contradição original está resolvida, e a resolução tem evidência de código** (§3.1).
Não é mais pergunta em aberto.

**2. A RT já foi modelada e construída.** O contrato publica `/api/technical-reserves`
(listar · lançar · cancelar), `commission-tiers` por colaborador e por parceiro,
`/api/orders/{id}/participants` e o fechamento de comissão; as 13 operações estão em
`ROTAS_DO_BACKEND`; `src/data/comissoes-api.ts` é adaptador HTTP; a tela está montada em
`/vendas/reservas-tecnicas`. Entrou em `547f41e` (2026-08-24, #337).

Isso **muda o papel deste documento, não o cancela.** A decisão que a issue reservava ao user
foi tomada dentro de um PR de contrato. O dossiê existe para (a) tornar essa decisão auditável
contra a fonte, (b) mostrar **onde ela diverge do legado** — e diverge em quatro pontos —, e
(c) listar o que continua sendo escolha. Um documento que apenas repetisse "o user precisa
decidir" mandaria decidir de novo o que já está no ar.

### 0.1 O repositório carrega hoje três respostas diferentes, e três datas

| fonte | data | o que afirma sobre RT |
|---|---|---|
| `docs/harvest/migracao-softlux.md` §B2 | 15/08 | blocker aberto · quatro fontes concorrentes de percentual · "antes disso não há mapeamento a escrever" |
| `docs/harvest/financeiro.md` §11.8b | 15/08 | explicação provável, **confiança média** · "modelar RT no Cabinet continua apoiado em suposição" |
| `docs/cabinet/cabinet-schema.dbml:366-371` | 15/08 | `reserve_percent` — "RESERVADO, modelagem adiada (blocker em aberto)" |
| `contracts/openapi-v1.json` | 24/08 | RT **modelada e implementada**, com a contradição declarada resolvida no corpo da descrição |

As três primeiras estão vencidas — **e não estavam erradas na data em que foram escritas.** É o
mesmo envelhecimento silencioso que o `CLAUDE.md` descreve para as declarações de ausência da
passagem: prosa dentro de um arquivo não tem quem a invalide. Corrigi-las é trabalho de outra
zona; aqui ficam registradas para que o próximo leitor não reabra a #444.

---

## 1. Vocabulário — o legado não chama isso de "RT" na tela

Confundir os três termos manda procurar a coisa errada no dump:

| conceito | tabela | rótulo na UI do legado |
|---|---|---|
| Reserva Técnica (o que o profissional recebe) | `Reserva_tecnica` | **"Participação"** |
| o profissional externo (arquiteto, designer) | `Indicacoes` | "Profissional Externo" |
| a participação dele NO documento | `VendaIndicacao` + `VendaIndicacaoGrupProd` | grid "Indicação:" no documento |

O menu diz `-----> Participações` (`config/sisopcoes.csv:134`); o checkbox do parâmetro diz
`Calcular Automaticamente a Part.` (`exe/formularios/FrmParamentro.txt:3124`). "Arquiteto"
sobrevive só como coluna do esquema pré-migração (`ped_arquiteta`, `orc_arquiteta`,
`avu_arquiteta`) — e **`ped_arquiteta` nem é o profissional externo**: o backfill a manda para
`VendaAtendente` (`sql-do-codigo.sql:870-873`), é o **consultor interno**.

---

## 2. Como o legado calcula RT de fato

### 2.1 Onde o cálculo NÃO está

**Não está no banco.** A varredura de `schema/bdprincipal-rotinas.sql` (224 KB, o catálogo
inteiro de rotinas) por `Reserva_tecnica|CreditoIndicacao|Ret_|ParametrosRT|Par_RT|Ven_Rt|
ForRTGruProd|RetGProd|VenIndGrup` devolve **três linhas**, todas dentro da função
`MostrarIndicacao` (`:1115-1139`), que só concatena nomes para exibição.

E `schema/bdprincipal-gatilhos.csv` tem **uma linha no banco inteiro**: `GatilhoEstoqueMinimo`
sobre `Estoque_produto`. **Zero trigger sobre RT.**

→ Todo o cálculo é **Delphi-side**, em SQL montado no cliente. É por isso que a resposta não
estava no schema, e por que a leitura de configuração sozinha (§0.1) só podia chegar a
confiança média: ela media o interruptor sem ver o motor.

### 2.2 A herança: quatro camadas do mesmo percentual por grupo

```
ParametrosRTGrupoProdutos      (7)        default GLOBAL da empresa
   ↓  FrmIndicacoes.QryParametrosRTGrupoProdutos
IndicacaoGrupProd              (7.569)    default do PROFISSIONAL (cadastro)
   ↓  FrmOrcamento/FrmPedido.QryVenIndGrupProd
VendaIndicacaoGrupProd         (232.415)  congelado no DOCUMENTO DE VENDA
   ↓
Reserva_tecnica_GrupoProd      (12.108)   congelado no LANÇAMENTO pago
```

A aba de parâmetros tem até a propagação em massa:
`Alterar todos os cadastros dos profissionais externo com as % acima.` (`FrmParamentro.txt:508`).

**As 232.415 linhas são enganosas.** O backfill de migração criou linha zerada para todo
documento existente, cinco grupos por vez (`exe/sql-do-codigo.sql:968-972`):

```sql
insert into VendaIndicacaoGrupProd (…,GrupoProduto_Codigo,VenIndGrup_Porc)
 (SELECT …, 1 as grupo, 0 as porc FROM VendaIndicacao)
```

— repetido para os grupos 1, 2, 3, 4 e 1000. E as próprias 34.666 linhas de `VendaIndicacao`
nasceram em boa parte de backfill **com 100% fixo** (`sql-do-codigo.sql:965-967`,
`100 AS porc, 1 AS principal`). A regra real são as linhas com percentual, e o legado filtra
assim (`sql-do-codigo.sql:2911`):

```sql
select GrupoProduto_Codigo from VendaIndicacaoGrupProd
 where VenIndGrup_Porc > 0 and VenInd_TpDoc = 'PRO' and Ind_Codigo =:pInd_Codigo
```

> **Para qualquer ETL, e para qualquer argumento apoiado nesses números:** contar linhas dessas
> duas tabelas mede o backfill, não a operação.

### 2.3 O percentual é função do DESCONTO — o trio (operador, desconto, percentual)

As quatro tabelas carregam o mesmo trio: `…_Porc`, `…_DescPorc`, `…_Operador`. O operador é
lista fechada, e o DFM prova o domínio (`FrmParamentro.txt`, grade "Porcentagens da
participação"):

```
  Caption = Porcentagem   FieldName = ParRTGrupProd_porcentagem
  Caption = Operador      FieldName = ParRTGrupProd_Operador
                          Properties.DropDownListStyle = lsFixedList
                          Properties.Items.Strings = [=, >=, <=]
  Caption = Desconto %    FieldName = ParRTGrupProd_Desconto
```

Leitura: *"se o desconto for `<=` X%, a participação é Y%"* — **quanto mais desconto o vendedor
dá, menor a participação.** A consulta que casa participação com documento puxa o desconto do
CABEÇALHO na mesma instrução (`exe/sql-por-tela.sql:168-173`):

```sql
select VendaIndicacaoGrupProd.*, Venda.Ven_DescontoPorc
FROM dbo.VendaIndicacaoGrupProd INNER JOIN
     dbo.Venda ON dbo.VendaIndicacaoGrupProd.VenInd_NDocPre = dbo.Venda.Ven_CodigoPre
where venind_ndocpre= :codigopre and VendaIndicacaoGrupProd.ind_codigo= :ind_codigo
```

Há ainda uma segunda grade, oculta, que é a mesma regra em forma de faixa explícita —
`ParametrosRTGrupoProdutosDesconto` (`FrmParamentro.txt:396-427`, **0 linhas**), com
`Operador` · `Proc. Desconto` · `Porcentagem Participação`.

**O contrato do Cabinet já leu isso do mesmo jeito** — `CommissionTierOperator` cita esta linha
e declara confiança MÉDIA de propósito. **Esta releitura confirma e não eleva:** a evidência
continua sendo a FORMA (nome "Operador", lista fechada no DFM, join com o desconto do
cabeçalho), não uma execução observada.

### 2.4 A base de cálculo

Três motores, todos em SQL literal, todos com a mesma forma `base × percentual / 100`:

**(a) Por grupo, líquida do desconto do documento** — `RltResTecAnalitica.ADOQuery2`
(`sql-por-tela.sql:20166-20198`), o relatório analítico de participações:

```sql
SELECT CASE WHEN ped_DESC_POR_materiais IS NOT NULL
  THEN SUM(pedido_materiais_det.pma_vl_item)
     - (SUM(pedido_materiais_det.pma_vl_item) * (ped_DESC_POR_materiais / 100)) END AS SOMA,
  produtos.GrupoProduto_codigo …
```
— união de três blocos idênticos para **materiais**, **luminária** e **serviço**, com serviço
entrando como pseudo-grupo `'1000'`, descrição `'SERVIÇOS'`.

**(b) Por fornecedor** — `FrmRT.QryRTFornecedor` (`sql-por-tela.sql:13570-13582`):

```sql
SELECT SUM(VendaProduto.VenPro_Quantidade * VendaProduto.VenPro_VlUnitario) AS totalitem,
       FornecedorRTGrupProd.GrupoProduto_Codigo,
       SUM((VendaProduto.VenPro_Quantidade * VendaProduto.VenPro_VlUnitario)
           * (FornecedorRTGrupProd.ForRTGruProd_Porc / 100)) AS totalitemRT,
       SUM(…) * 100 / SUM(VendaProduto.VenPro_Quantidade * VendaProduto.VenPro_VlUnitario) AS PORCRT
…
WHERE (Venda.Ven_Tipo = 'P') AND (Venda.Ven_Situacao = 'A') AND (Venda.Ven_CodigoPre =:pVen_CodigoPre)
GROUP BY FornecedorRTGrupProd.GrupoProduto_Codigo
```

Note o `PORCRT`: o legado **re-deriva** o percentual efetivo dividindo o total de RT pela base.
É a conta de conferência que o `CommissionEarningRowDto` do Cabinet resolveu guardando os três
números (base, percentual, valor) em vez de recalcular — decisão que esta leitura **valida**.

**(c) Por natureza, sobre o total geral do documento** — `FrmOpc_reserva_tecnica.Qrycalculo`,
transcrita em §3.3(a), porque é ela que produz a contradição.

**A devolução sai da base** — `FrmRT.Qrydevolucao` (`sql-por-tela.sql:13583-13592`) soma
`DevolucaoProduto` por grupo, já líquida do desconto da devolução, para abater.

### 2.5 Onde a RT vira dinheiro — e de onde ela SAI

`Reserva_tecnica` → `contas_apagar` com **`Tpd_codigo = 1004`**, parcelado em
`contas_apagar_det`, pago na conta bancária do profissional (`Indicacoes_Detalhe.Ban_Codigo`,
`IndDet_num_agencia`, `IndDet_num_conta`), com recibo (`RltReciboRT`,
`sql-por-tela.sql:20046-20068`). Adiantamentos e abatimentos vivem em `CreditoIndicacao`
(`CredInd_Operacao` char(1) `C`/`D`), ligada por `Ret_codigo`.

**A RT não entra no preço ao cliente — sai da margem.** A formação de preço
(`engenharia-reversa-softlux.md:100-136`) é `VENDA = round(liquido × Ipr_Indice, 2)`, e a
participação externa aparece só no passo 10, como dedução:
`com_externa = venda_liq × Ipr_vl_com_exter / 100` ·
`LUCRO = venda_liq − CUSTO − com_interna − com_externa`.

A ligação RT ↔ venda **não tem FK**: é `Reserva_tecnica.Ret_projeto_avulsa = Venda.Ven_codigo`
**mais** `Reserva_tecnica.ParSV_serie = Venda.ParSV_serie` (`FrmConsulta_reserva`,
`sql-por-tela.sql:4879-4897`). `Ret_projeto_avulsa` é o NÚMERO do documento, não um flag — o
nome sugere o contrário e já enganou leitura anterior.

### 2.6 O que estava DESLIGADO na instalação real

`config/paramentros.csv` é dump de conteúdo (`Paramentros` é god object de 1 linha):

```
Par_RTautomatico;True                  ← a chave-mestra, ligada
Par_RTAutomaticoProj;                  ← vazio
Par_RTAutomaticoAvu;                   ← vazio
Par_RTAutomaticoTipo;                  ← vazio   (§3.2 — não é booleano faltando)
Par_RTPrimeiraPorc;                    ← vazio
Par_RTFornecedor;False                 ← o motor de §2.4(b) NUNCA rodou
ParParticiapacaoDevolucao;False        ← [sic] typo na própria coluna
Par_ParticipacaoDesconto;False
Par_ParticipacaoSemDevolucao;False
Par_RTFormaPag;1                       Par_RTCentroCusto;2
Par_RTCreditoClienteNaoGerar;True      Par_impostofixoRT;0
Par_PlanoContasReservaTecnica;150      Par_DiasFiltroReservaTecnica;180
```

Três consequências que ninguém tinha registrado:

1. **A RT por fornecedor nunca foi usada** — `Par_RTFornecedor=False`, e o corpus de migração
   ainda traz `update Paramentros set Par_RTFornecedor = 'false'` (`sql-do-codigo.sql:148`).
   As 7.504 linhas de `FornecedorRTGrupProd` são cadastro sem consumidor ligado — e a tabela
   tem os FKs apontados para a tabela **errada** (`FornecedorGrupProd`, sem "RT",
   `bdprincipal-fks.csv:89-90`).
2. **Devolução e desconto na participação estavam desligados** nos três flags — dois deles
   `Visible = False` na tela.
3. **O modo de pagamento nunca foi escolhido** — §3.2.

---

## 3. As contradições

### 3.1 C1 — a contradição do ❓12: RESOLVIDA

**A pergunta:** `Par_RTautomatico = True` no parâmetro global, e `Ven_RtAutomatico` vazio nas
34.136 linhas de `Venda`. Qual dos dois manda?

**A resposta:** *nenhum dos dois, porque não são a mesma coisa.*

- `Par_RTautomatico` liga o **CÁLCULO**, não um carimbo. O rótulo é literal:
  `Caption = Calcular Automaticamente a Part.`, `DataField = Par_RTautomatico`
  (`exe/formularios/FrmParamentro.txt:3117-3125`).
- `Ven_RtAutomatico` e `Ven_RtCalcular` são **colunas mortas**: `bit` nullable, vazias em
  34.136 linhas, **escritas por ninguém** — não aparecem em `sql-do-codigo.sql` nem em
  `sql-por-tela.sql`, e não têm backfill (o corpus tem backfill para tudo que importou:
  `Ret_TpFinanceiro`, `ParSV_serie`, os percentuais nulos). `docs/legado/README.md:478` já
  registrava: `| Ven_RtAutomatico | tudo vazio | Funcionalidade nunca usada |`.

> **Precisão que vale a pena manter:** dizer "sem editor em DFM nenhum" é forte demais. Elas
> aparecem em `formularios/FrmCons_Orcamento.txt:221-224`, mas como `TBooleanField` — campo
> persistente declarado num dataset, que é o Delphi listando a coluna do `SELECT *`, não um
> controle de edição. Ninguém digita nelas, e ninguém escreve nelas. A conclusão não muda; a
> afirmação fica sustentável.

**Não havia contradição — havia duas coisas com nomes parecidos.** A explicação de
`financeiro.md` §11.8b ("escopos vazios, então a automação não age") era *coerente e não era a
razão*: os escopos vazios são de §3.2, e a coluna da venda nunca seria alimentada de qualquer
forma, porque ninguém escreve nela.

**Consequência de modelagem:** **não existe flag de "RT automática" para portar.** O automático
é propriedade do cálculo, e o cálculo pertence a quem tem o dado — o servidor. É o que o
contrato já diz em `TechnicalReserveWriteRequest`, e esta leitura **confirma o texto dele
contra a fonte**.

O número que fecha o argumento: **1.212 lançamentos de RT para 11.103 pedidos.** Mesmo com a
chave-mestra ligada, o que virou pagamento foi decisão humana, uma a uma. Existe até tela para
isso — `FrmConsulta_reserva`, "projetos com indicação e SEM RT lançada"
(`sql-por-tela.sql:4879`).

### 3.2 C2 — `Par_RTAutomaticoTipo` é um domínio, e ninguém sabia

O parâmetro vazio de §2.6 não é um booleano faltando: é `char(1)` com **três modos de pagamento
da RT**, e o DFM dá o domínio (`exe/formularios/FrmParamentro.txt:3130-3139`):

```
object JvDBRadioPanel1: TJvDBRadioPanel
  Items.Strings = [Vincular pagamento da RT às condições de recebimento de vend,
                   Vou escolher o(s) dia(s) de vencimento(s), não será controla,
                   Pagamento da RT será efetuado em dois pagamentos, o primeiro]
  Values.Strings = [P, L, C]
  Visible = False
```

| valor | modo | apoio |
|---|---|---|
| `P` | RT vence junto com as **condições de recebimento da venda** | — |
| `L` | dias de vencimento escolhidos à mão, **sem controle** | `ParametrosRTDiaPag.ParRTDiapag_dia` |
| `C` | **dois pagamentos**, com percentual no primeiro | `Par_RTPrimeiraPorc` |

**`Visible = False`.** Construído, escondido na tela, nunca configurado nesta instalação. As
mesmas colunas existem por documento (`pedido.Ped_RTAutomaticoTipo`, `Ped_CalcularRT`,
`Avulso.Avu_RTAutomaticoTipo`, `Avu_CalcularRT`), nas duas tabelas hoje com 0 linhas.

**Por que é contradição:** a expectativa registrada era de que os parâmetros vazios
significassem "automação desligada". Significam outra coisa — **"o modo de vencimento nunca foi
escolhido"**. O Cabinet não tem equivalente: a RT é lançada e o fechamento gera o título, sem
modo de vencimento. Não é lacuna acidental; é escolha que ninguém tomou (→ D-D).

Na mesma aba, dois grids que a leitura anterior chamou de "exceções globais" têm sentido
**oposto entre si**, e os Captions dizem qual:
`ParametrosRTIndicacao` → `Caption = Profissional(Exclusão)` — **lista de exclusão**;
`ParametrosRTCategoriaVenda` → `Caption = Categoria de Venda (Inclusão)` — **lista de inclusão**.

### 3.3 C3 — o contrato do Cabinet afirma coisas que a fonte não sustenta

Este é o achado que a issue não previa: a divergência não é só com a expectativa antiga, é entre
o **Cabinet e o legado**. São quatro pontos.

#### (a) As naturezas do valor: o legado tem TRÊS, e provavelmente são PERCENTUAIS

`TechnicalReserveDto` afirma:

> *"O valor vem quebrado por NATUREZA e não num total só, porque é assim que o legado apura
> (`Ret_tec_luminaria` / `_materiais` / `_servico` / `_total`)"* — e publica `productCents`,
> `serviceCents`, `totalCents`.

A **única** expressão do dump que usa essas colunas as divide por 100
(`FrmOpc_reserva_tecnica.Qrycalculo`, `sql-por-tela.sql:10181-10194`):

```sql
SELECT Reserva_tecnica.Ret_codigo, Reserva_tecnica.Ret_tipo, Reserva_tecnica.Ret_projeto_avulsa,
  pedido.ped_tl_geral_luminaria * Reserva_tecnica.Ret_tec_luminaria / 100 AS lum_projeto,
  pedido.ped_tl_geral_materiais * Reserva_tecnica.Ret_tec_materiais / 100 AS mat_projeto,
  pedido.ped_tl_geral_servico  * Reserva_tecnica.Ret_tec_servico  / 100 AS ser_projeto,
  Avulso.avu_tl_geral_luminaria * Reserva_tecnica.Ret_tec_luminaria / 100 AS lum_avulsa,
  Avulso.avu_tl_geral_materiais * Reserva_tecnica.Ret_tec_materiais / 100 AS mat_avulsa,
  contas_apagar.Tpd_codigo, contas_apagar.Ctp_valor_total_original
FROM Reserva_tecnica INNER JOIN contas_apagar ON Reserva_tecnica.Ret_codigo = contas_apagar.Ctp_cod_documento
  LEFT OUTER JOIN pedido ON Reserva_tecnica.Ret_projeto_avulsa = pedido.ped_codigo
  LEFT OUTER JOIN Avulso ON Reserva_tecnica.Ret_projeto_avulsa = Avulso.avu_codigo
WHERE (Reserva_tecnica.Ret_situacao = 'ATIVO') AND (contas_apagar.Tpd_codigo = 1004) and Reserva_tecnica.Ret_codigo=:codigo
```

Duas leituras que isso força:

1. **`Ret_tec_*` são PERCENTUAIS por natureza**, aplicados sobre o total geral da categoria no
   documento — não valores apurados. `Ret_tec_total` pode continuar sendo valor; as três
   parcelas não são.
2. **São três naturezas com percentuais INDEPENDENTES**: luminária, materiais, serviço. O
   contrato fundiu luminária + materiais em `productCents`. Para a Vertz, que vende iluminação,
   **luminária e material são justamente as duas coisas com maior chance de pagar diferente** —
   é a distinção mais provável de importar, não a menos.

> **Calibração honesta, e ela corta nos dois sentidos.** Essa query lê `pedido` e `Avulso`,
> tabelas com **0 linhas** hoje (migradas para `Venda`): é código da era pré-migração. Logo a
> semântica "percentual" tem confiança **alta** (a divisão por 100 não admite outra leitura), e
> "ainda é assim hoje" tem confiança **média**. O que não se sustenta em nenhuma das duas é a
> frase do contrato: **nenhuma** evidência do dump mostra `Ret_tec_*` guardando valor apurado.
> A afirmação foi escrita a partir do nome das colunas.
>
> E o material não permite fechar: só **142 dos ~713 DFMs** foram extraídos, e `FrmRT` (174
> componentes, 66 campos) e `FrmReserva_tecnica` **não estão entre eles** — os rótulos da tela
> que lança a RT são inverificáveis com o dump atual (§6).

#### (b) "Devolução já abatida" é afirmada como fato, e estava desligada em produção

`CommissionEarningRowDto.baseCents` afirma:

> *"produto e serviço do MESMO documento, com devolução já abatida. **Devolução reduz a base**:
> o legado desconta `DevolucaoProduto` por grupo antes de apurar (`FrmRT.Qrydevolucao`)"*

A query existe e faz isso (§2.4). Mas é **governada por parâmetro**, e os três estavam `False`
na instalação medida (§2.6) — inclusive um `Par_ParticipacaoSemDevolucao` cujo nome diz o
oposto do outro. **O comportamento citado é o do código, não o da operação.** Herdar "devolução
sempre abate" pode estar certo e muda o número que o profissional recebe; o que não dá é chamar
isso de porte fiel sem o user saber (→ D-C).

#### (c) A participação nasce no ORÇAMENTO no legado, e só no PEDIDO no Cabinet

No legado, o grid de percentual por grupo é editável **no orçamento**, com o mesmo shape do
pedido (`FrmOrcamento.txt:3019-3046`, `QryVenIndGrupProd` com `VenInd_TpDoc='ORC'`), e também
em `'AVU'` (avulso) e `'AUT'` (autorização de inclusão).

No Cabinet, `/api/orders/{id}/participants` só existe no PEDIDO. O `QuoteDetailDto` tem apenas
`salespersonId` / `professionalId` **singulares, sem percentual e sem faixas**.

**Por que importa:** é o desconto do documento que decide a faixa (§2.3), e o desconto se negocia
no orçamento. Com a participação nascendo só no pedido, ninguém consegue ver quanto o
profissional ganha *enquanto* a negociação acontece — que é exatamente o momento em que a
informação muda a decisão. Pode ser simplificação boa; não é equivalência (→ D-F).

#### (d) O imposto da RT é carimbado no documento, e o Cabinet não tem onde guardá-lo

`Par_impostofixoRT` (`Caption = % do imposto para desconto na participação:`,
`FrmParamentro.txt:3092`, ligado em `:3371`) é copiado para a venda: existe a coluna
`Venda.Par_impostofixoRT` (`bdprincipal-colunas.csv:6024`), ela tem backfill próprio
(`sql-do-codigo.sql:491`, `update venda set Par_impostofixoRT = 0` — ao lado do
`update Paramentros …` da linha anterior, o que mostra que as duas são alimentadas de fato) e é
lida ao abrir o documento para lançar a RT (`sql-do-codigo.sql:2722` e `:2726`,
`…, venda.Par_impostofixoRT FROM Venda …`). É o mesmo padrão de congelamento que o Cabinet
aplica em toda parte — o parâmetro de hoje não pode reescrever o imposto de um lançamento de
ontem.

O valor medido é `0`, então **nunca mudou número nesta instalação** — mas a estrutura de
congelamento existe e o Cabinet não tem equivalente (→ D-G).

---

## 4. As decisões que continuam abertas

Nenhuma bloqueia o que já roda. Todas mudam número pago a pessoa de verdade.

### D-A · As naturezas do valor da RT

| opção | o que é | trade-off |
|---|---|---|
| **A1 · manter 2** (`productCents`/`serviceCents`) — *é o que está no ar* | produto e serviço | simples e já construído; **apaga a distinção luminária × material**, que no legado tem percentual próprio. Se a Vertz paga diferente por elas, o número sai errado e a tela não tem onde mostrar |
| **A2 · três naturezas** | luminária · materiais · serviço | fiel à fonte; custa campo no DTO, na tela e no cálculo — e o servidor precisa saber classificar o item entre luminária e material, coisa que hoje ele deduziria do grupo |
| **A3 · N naturezas = o grupo de produto** | sem enum: a natureza É o grupo | mais geral, casa com as quatro camadas de §2.2; joga fora o vocabulário do legado e torna a apuração uma tabela em vez de três números — pior de ler no recibo |

### D-B · A origem do percentual da RT

O legado tem **dois motores**, e o Cabinet portou um:

| opção | o que é | trade-off |
|---|---|---|
| **B1 · faixas por grupo** (`CommissionTier` + participação congelada) — *é o que está no ar* | o percentual vem do perfil do profissional, por grupo, escalonado pelo desconto | é o motor que a operação usa; ignora o trio `Ret_tec_*` do lançamento |
| **B2 · trio por natureza no lançamento** | quem lança digita os três percentuais | é o que `Reserva_tecnica` guarda nas 1.212 linhas vivas; mas devolve a quem lança a escolha do percentual — a decisão que o contrato recusou de propósito |
| **B3 · os dois** | faixas propõem, o lançamento pode sobrepor, e a sobreposição fica registrada | cobre o caso real (a RT foi decisão humana 1.212 vezes) ao custo de dois caminhos para o mesmo número, e de uma pergunta de auditoria a mais: qual dos dois valeu aqui |

### D-C · Devolução e desconto na base

**C1 · sempre abater** (o que o contrato já afirma) · **C2 · parametrizar por empresa**, como o
legado · **C3 · não abater**. C1 é mais simples e provavelmente mais justo; C2 é fiel e
acrescenta três parâmetros que na única instalação medida estavam desligados; C3 contradiz o
código do legado. **Errar aqui é dinheiro pago a maior ou a menor.**

### D-D · Modos de pagamento `P` / `L` / `C`

**D1 · não portar** (estado atual: RT lançada, fechamento paga) · **D2 · portar os três** ·
**D3 · portar só `C`** (dois pagamentos, percentual no primeiro), o único com parâmetro de apoio
próprio. Nenhum foi configurado no legado e o controle estava escondido — **candidato forte a
recurso que ninguém quer**, mas quem sabe disso é o user, não o dump.

### D-E · RT por fornecedor (`FornecedorRTGrupProd`, 7.504 linhas)

**E1 · descartar** — `Par_RTFornecedor=False`, nunca rodou, FKs apontando para a tabela errada.
**E2 · portar** — as 7.504 linhas são cadastro que alguém digitou. Não há dado que diga se foi
abandonado ou nunca ligado.

### D-F · Onde a participação nasce

**F1 · só no pedido** (estado atual) · **F2 · também no orçamento, com percentual e faixas**,
como o legado · **F3 · no orçamento como previsão não vinculante**, congelando no pedido.
F2 é fiel e duplica a superfície de escrita; F3 dá a informação na hora da negociação sem criar
um segundo lugar onde o valor "vale". F1 é o mais barato e o menos informativo.

### D-G · Imposto retido na RT

**G1 · não ter** (estado atual) · **G2 · percentual por empresa, congelado no documento**, como
`Venda.Par_impostofixoRT`. Custo de G2 é um campo; o benefício é que o líquido pago ao
profissional passa a ser explicável. Valor medido no legado é `0` — pode nunca ter sido usado.

---

## 5. Recomendação

Em ordem, por peso do que quebra se estiver errado:

1. **Fechar D-A e D-C antes de tudo** — são as duas que mudam o valor pago. E as duas se
   decidem com **uma pergunta de uma frase a quem opera**, não com mais leitura de dump:
   *"a Vertz paga percentual diferente para luminária e para material?"* e *"devolução desconta
   da participação do profissional?"*. O §6 explica por que releitura não fecharia nenhuma das
   duas.
2. **D-A → A2 (três naturezas), se a resposta à primeira for sim.** É o caso que a fonte
   sustenta e que o contrato hoje não consegue representar. Se for não, A1 fica — **mas a
   descrição do `TechnicalReserveDto` precisa ser corrigida de qualquer jeito**: hoje ela afirma
   sobre o legado algo que a fonte não mostra (§3.3a), e é dela que o próximo agente aprende o
   domínio.
3. **D-C → C1 (sempre abater)**, dizendo no contrato que é **escolha do Cabinet e não porte** —
   o legado parametriza e a instalação medida tinha desligado. Trocar "é assim que o legado faz"
   por "é assim que decidimos" custa uma frase e evita que alguém "conserte" para C2.
4. **D-B → B1 (fica como está).** É o motor com uso real e preserva a recusa central do trilho
   (o cliente não afirma quanto o profissional ganha). B3 só se a operação disser que sobrepõe
   caso a caso — e aí a sobreposição precisa ser registrada, não silenciosa.
5. **D-F → F3.** É a divergência com maior chance de aparecer como reclamação de uso ("não sei
   quanto o arquiteto ganha antes de fechar"), e F3 a resolve sem criar um segundo lugar onde o
   percentual vale.
6. **D-D → D1**, **D-E → E1**, **D-G → G1** — os três com o motivo escrito no contrato: recurso
   escondido e nunca configurado (`Visible = False`, parâmetro vazio); cálculo desligado por
   parâmetro com FK quebrada; imposto medido em zero. Se voltarem, voltam por pedido de quem
   opera, não por paridade com o legado.

**Fora das decisões, uma higiene de custo baixo:** as três fontes de §0.1 dizem "blocker em
aberto" sobre algo que está no ar desde 24/08. Enquanto ficarem, a próxima sessão reabre a #444.

---

## 6. O que esta investigação NÃO consegue fechar

Declarado para que ninguém releia o mesmo dump esperando resultado diferente:

1. **Os rótulos de `Ret_tec_luminaria/_materiais/_servico` na tela.** `FrmRT.txt` e
   `FrmReserva_tecnica.txt` não estão entre os 142 DFMs extraídos (o binário tem ~713 —
   `exe/COMO-FOI-EXTRAIDO.md`). Re-extrair esses dois fecharia §3.3(a): o Caption diria "%" ou
   "R$".
2. **Se a operação usa o trio por natureza ou as faixas por grupo.** As duas estruturas têm
   dado. Só uma consulta ao SQL Server de produção (distribuição de `Ret_tec_*` e de
   `RetGProd_PorcRT` nas 1.212 linhas vivas) separa — `schema/` é dump de **catálogo**, não de
   conteúdo, e `config/` só cobre parâmetros.
3. **A semântica exata do `Operador`.** Continua confiança MÉDIA, pela FORMA e não pelo dado,
   exatamente como `CommissionTierOperator` já declara. Esta leitura confirmou; não elevou.

**Dois detalhes técnicos que atingem qualquer ETL, independentemente das decisões:**

- **O percentual está dentro da PK** em quatro tabelas — `Reserva_tecnica_GrupoProd`,
  `VendaIndicacaoGrupProd`, `IndicacaoGrupProd`, `ParametrosRTGrupoProdutos`
  (`bdprincipal-indices.csv:384-386`, `:478-483`, `:206-208`, `:316-317`). O legado **não
  consegue dar `UPDATE` em percentual**, só `DELETE`+`INSERT`, e a mesma chave lógica pode ter
  linhas duplicadas com valores diferentes. Desduplicar é parte do trabalho, não um imprevisto.
- **Tudo é `float(53)` e não há um único `ROUND` ou `CAST(… as decimal)`** em nenhuma expressão
  de RT do dump — a exceção é um relatório de comissão composta
  (`FrmRel_Orc_vendedor`, `sql-por-tela.sql:12449`), que arredonda em dois níveis. Um port para
  centavos inteiros **vai divergir do legado no último centavo, e isso é melhora, não
  regressão.** Vale estar escrito antes que alguém trate a divergência como bug.
