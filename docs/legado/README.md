# docs/legado — engenharia reversa do banco do Softlux

Índice do material bruto levantado do **Softlux** (sistema desktop Delphi que o Cabinet vai
substituir), em duas rodadas — **2026-08-10** direto do SQL Server de produção e **2026-08-11** a partir do
binário `SOFTLUX.exe` — sempre só leitura, nenhuma escrita. Este README existe para quem nunca viu o Softlux conseguir responder
"que tabela guarda X" sem abrir o sistema legado.

**Isto é referência de leitura.** Nada aqui vira código automaticamente: `contracts/openapi-v1.json`
continua sendo escrito à mão por PR neste repo (ver `CLAUDE.md`), e nome de campo de TELA continua
vindo de `topicos/transcricaosoftlux.md` na memória, não daqui. O que estes dumps dão é a **forma
real dos dados** e o volume que a migração vai encontrar.

Análise em prosa e as decisões tiradas dela ficam na memória do projeto, em
`projetosClaude/vertz-erp/topicos/legado-softlux.md`, seção `@banco`.

---

## 1. Onde fica cada coisa

```
docs/legado/
├─ README.md                        ← este arquivo
├─ engenharia-reversa-softlux.md    análise em prosa da 1ª rodada (11 KB)
├─ softlux-fluxo-banco.html         ÍNDICE por estágio: 11 estágios, 70 tabelas (134 KB)
├─ softlux-fluxograma.html          DIAGRAMA de setas por domínio (25 KB)
├─ achados-exe-2026-08-11.md        análise em prosa da 2ª rodada (parâmetros, RBAC, preço, PDF)
├─ schema/                          dumps brutos do catálogo, 3 bancos × 6 arquivos
   ├─ bdprincipal-*.csv|.sql        o banco que importa
   ├─ bdprodutos-*.csv|.sql         staging de importação por planilha — descartável
   └─ GED-*.csv|.sql                gestão de documentos, 12 linhas no total
├─ exe/                             extraído do binário Delphi — ver seção 9
│  ├─ mapa-telas.md                 índice das 713 telas do sistema
│  ├─ sql-por-tela.sql              SQL dos DFMs, agrupado por formulário
│  ├─ sql-do-codigo.sql             SQL montado no código Delphi, deduplicado
│  ├─ COMO-FOI-EXTRAIDO.md          método, hash do binário e armadilhas do formato
│  └─ formularios/                  142 dumps DFM completos das telas do escopo
└─ config/                          12 CSVs de configuração real do negócio — ver seção 9
```

### `engenharia-reversa-softlux.md`
Análise longa da **primeira rodada**: ambiente e risco de segurança do legado, inventário,
as duas gerações de schema, multi-tenant por coluna, **a cadeia completa de formação de preço**
(passo a passo, extraída das procs `CalcularProduto`/`CalcularPorProduto`), estoque, comissão,
escopo fiscal, blockers de print resolvidos e dívidas do legado.

⚠️ **Está desatualizado em 3 pontos**, corrigidos na 2ª rodada (memória `@banco`):
| O que o `.md` diz | O que ficou valendo |
|---|---|
| §10.2 "papel de `bdprodutos` — não migrar sem entender" | **RESOLVIDO:** é staging da importação por planilha, 4.877 dos 4.881 produtos também existem em `bdprincipal`. Descartável |
| §4 "suspeita de subtração dupla de crédito (confiança média)" | **DERRUBADA:** era o `if @banco = 1` da proc, que precifica nos dois bancos com bloco duplicado — ramos alternativos, não execução sequencial. Confiança alta |
| §10.5 "valores de `Ven_Tipo` e `Ven_Situacao` precisam de consulta a dado" | **FEITO** — ver §5 aqui embaixo |

As contagens de linha do `.md` vieram de uma consulta **anterior** à do CSV: 5 tabelas divergem
para menos (`Venda` 34.135 vs 34.136, `VendaProduto` 549.829 vs 549.830, `VendaDesconto`
300.325 vs 300.337, `VendaIndicacaoGrupProd` 232.409 vs 232.415, `VendaAmbiente` 144.673 vs
144.674). Base viva, dias de diferença. **Fonte de número é o CSV**, não o `.md`.

### Os dois HTML — para que serve cada um
Os dois são páginas estáticas, sem dependência externa: abrir direto no browser. Cobrem o
mesmo caminho principal por ângulos diferentes, e **os dois batem com os CSVs** (conferido
tabela a tabela, zero divergência).

**`softlux-fluxo-banco.html` — o ÍNDICE, use este primeiro.** Lista de cima a baixo os
**11 estágios do negócio com as 70 tabelas do caminho principal** já agrupadas (§3 aqui
embaixo é o mesmo agrupamento em texto). Tem busca por nome de tabela ou de coluna, filtro por
estágio, e clicar numa tabela abre um painel com **a lista completa de colunas com tipo e
nulidade, a PK, para quem ela aponta e quem aponta para ela**. É o jeito rápido de responder
"que tabela guarda X" sem grepar CSV. Regra de negócio em texto por estágio (a fórmula do
preço, a conversão de 46,1%, o que decide se gera financeiro).

**`softlux-fluxograma.html` — o DIAGRAMA, use para ver a direção do fluxo.** Desenho SVG com
**18 caixas em 9 domínios coloridos** e as setas entre elas — o que o índice não mostra: que a
seta orçamento→pedido é troca de `Ven_Tipo`, que a de pedido→financeiro é condicional
("só se `CategoriaVenda` gera"), que a de pedido→compra sai por "sem estoque". Clicar numa
caixa lista as tabelas daquele passo com PK, nº de colunas e nº de linhas; ponto azul = tabela
com `Emp_codigo`.

Os dois recortam as mesmas 70 tabelas. O diagrama põe 68 delas em caixas — `Funcionario`
(111 linhas) e `Ambiente` (346 linhas) ficam de fora das caixas mas estão no índice interno
dele; no `fluxo-banco` as duas aparecem no estágio 1.

### `schema/` — 6 arquivos por banco
| Arquivo | Conteúdo | Uma linha por |
|---|---|---|
| `<db>-colunas.csv` | todas as colunas de todas as tabelas | coluna |
| `<db>-indices.csv` | índices, incluindo as PKs | coluna **dentro** do índice |
| `<db>-fks.csv` | chaves estrangeiras | coluna **dentro** da FK |
| `<db>-linhas.csv` | contagem de linhas | tabela |
| `<db>-gatilhos.csv` | triggers | trigger |
| `<db>-rotinas.sql` | corpo de funções, procs e triggers | — |

`bdprodutos-rotinas.sql` e `GED-rotinas.sql` estão **vazios** (5 bytes, só o BOM) — esses
bancos não têm código no servidor. `bdprodutos-fks.csv`, `bdprodutos-gatilhos.csv` e
`GED-gatilhos.csv` também vêm sem nenhuma linha de dado.

**`bdprincipal-rotinas.sql`** (219.504 bytes) é o único que interessa: **44 rotinas** separadas
por cabeçalho `/* ===== TIPO :: Nome ===== */` — 30 funções escalares, 6 tabulares,
7 procedures, 1 trigger. As 7 procs: `CalcularProduto`, `CalcularPorProduto`,
`GravaEstoqueMinimo`, `IdTabela`, `VendaDeProdutos`, `VendaDeProdutosValor`,
`VendaDeProdutosValorVenda`. As maiores: `PlanoContaValor` (40 KB, apuração contábil,
**nunca analisada**), `CalcularPorProduto` e `CalcularProduto` (18 KB cada, a formação de preço).

Listar as rotinas do arquivo:
```bash
grep -oE '/\* ===== \S+ :: \S+' docs/legado/schema/bdprincipal-rotinas.sql
```

---

## 2. Como consultar os CSVs

**Formato comum a todos:** UTF-8 **com BOM**, cabeçalho na 1ª linha, **todos os campos entre
aspas duplas**, booleanos gravados como `True`/`False` (estilo Python, não `1`/`0`).
Nenhum campo contém vírgula, então `grep` resolve a maioria das perguntas; em Python, abrir
com `encoding='utf-8-sig'` para o BOM não colar no nome da 1ª coluna.

Os comandos abaixo assumem que você está em `docs/legado/schema/`.

### `<db>-colunas.csv`
```
"tabela","ordem","coluna","tipo","max_length","precision","scale","is_nullable","is_identity","padrao"
"Venda","2","Ven_Situacao","char","1","0","0","True","False",""
```
`ordem` = posição da coluna na tabela. `padrao` = DEFAULT, quase sempre vazio ou `(0)`.
`max_length` veio cru de `sys.columns`: **está em BYTES**, então `nvarchar` com `20` são
10 caracteres (as 515 colunas `nvarchar`/`nchar` do dump têm valor par, sem exceção), e
`-1` quer dizer `max` (5 ocorrências). Não dimensionar coluna nova a partir desse número
sem dividir por 2 nos tipos `n*`.

**"Quais colunas tem a tabela X":**
```bash
grep '^"Venda",' bdprincipal-colunas.csv
```
Com tipo legível e ordem:
```bash
python3 -c "
import csv
for r in csv.DictReader(open('bdprincipal-colunas.csv', encoding='utf-8-sig')):
    if r['tabela'] == 'Estoque_produto':
        print(r['ordem'], r['coluna'], r['tipo'], 'NULL' if r['is_nullable']=='True' else 'NOT NULL')
"
```

**"Quantas colunas tem X":** `grep -c '^\"Venda\",' bdprincipal-colunas.csv` → `90`.

**"Que tabelas têm a coluna Y":**
```bash
grep -i ',"Emp_codigo","' bdprincipal-colunas.csv | cut -d'"' -f2 | sort -u | wc -l
```
→ `212` tabelas com `Emp_codigo` (a coluna de empresa do legado; a grafia varia entre
`Emp_codigo`, `Emp_Codigo` e `emp_codigo` — grepar sem `-i` erra a conta).

### `<db>-fks.csv`
```
"fk","tabela_origem","coluna_origem","tabela_destino","coluna_destino"
"FK_NotaFiscalClientes","NotaFiscal","Cli_Codigo","Clientes","Cli_Codigo"
```
FK composta ocupa N linhas com o mesmo nome em `fk`. São **208 linhas para 200 FKs distintas**.

**"O que aponta PARA a tabela X"** (X como destino — o `$` no fim é o que separa destino de origem):
```bash
grep -E ',"Clientes","[^"]*"$' bdprincipal-fks.csv
```
**"Para onde X aponta"** (X como origem):
```bash
grep '^"[^"]*","Clientes",' bdprincipal-fks.csv
```

### `<db>-indices.csv`
```
"tabela","indice","type_desc","is_primary_key","is_unique","coluna","key_ordinal","is_included_column"
"Estoque_produto","PK_Estoque_produto","CLUSTERED","True","True","Epr_Codnosso","1","False"
```
Uma linha por coluna do índice; `key_ordinal` dá a ordem dentro da chave.

**"Qual a PK de X":**
```bash
grep '^"Estoque_produto",' bdprincipal-indices.csv | grep '"True","True"'
```
→ PK composta de 5 colunas: `Epr_Codnosso, Epr_Acabamento, EstTp_Codigo, Tam_codigo, Emp_codigo`.

**"Quais tabelas não têm PK":**
```bash
python3 -c "
import csv
def t(p): return [r for r in csv.DictReader(open(p, encoding='utf-8-sig'))]
tabs = {r['tabela'] for r in t('bdprincipal-linhas.csv')}
pks  = {r['tabela'] for r in t('bdprincipal-indices.csv') if r['is_primary_key']=='True'}
print(len(tabs - pks), sorted(tabs - pks))
"
```
→ **36 tabelas sem PK**, entre elas `Preco_Produto_Log` (3,1 milhões de linhas) e
`Paramentros` (284 colunas).

### `<db>-linhas.csv`
```
"tabela","linhas"
"VendaProduto","549830"
```
**"Quantas linhas tem X":**
```bash
grep '^"VendaProduto",' bdprincipal-linhas.csv
```
**As 12 maiores:**
```bash
tail -n +2 bdprincipal-linhas.csv | sort -t'"' -k4 -n -r | head -12
```
**"Quais estão vazias":**
```bash
grep ',"0"$' bdprincipal-linhas.csv | wc -l
```
→ `148`.

### `<db>-gatilhos.csv`
```
"gatilho","tabela","is_disabled","is_instead_of_trigger"
```
`bdprincipal` tem **um único trigger** em todo o banco: `GatilhoEstoqueMinimo`, AFTER UPDATE
em `Estoque_produto`. O corpo está em `bdprincipal-rotinas.sql` e **lê só a primeira linha
de `inserted`** — quebra em update multi-linha. Bug latente do legado; não replicar.

### Números do inventário, conferidos nestes CSVs
| | bdprincipal | bdprodutos | GED |
|---|---|---|---|
| Tabelas no CSV | 360 | 6 | 2 |
| …descontando `dtproperties` (tabela de sistema) | **359** | **5** | 2 |
| Vazias | 148 (41%) | 3 | 0 |
| Com PK | 324 | 6 | 2 |
| FKs distintas | 200 | 0 | 1 |
| Triggers | 1 | 0 | 0 |
| Rotinas em `.sql` | 44 | 0 | 0 |
| Soma de linhas | 14.971.695 | 12.296 | 12 |

O "359 tabelas" que a memória cita **é o número certo com `dtproperties` de fora** — a tabela
de sistema do SQL Server está no dump porque a consulta não a filtrou. Mesmo caso em
`bdprodutos` (6 no CSV, 5 de negócio).

---

## 3. Caminho principal do negócio — os 11 estágios

Agrupamento, ordem e os textos em itálico/citação vêm de **`softlux-fluxo-banco.html`**; o
`softlux-fluxograma.html` mostra as mesmas tabelas com as **setas** entre os estágios. São
**11 estágios, 70 tabelas, 14.821.470 linhas** — de 360 tabelas e 14.971.695 linhas no banco
inteiro. Todo o resto é apoio, entulho ou funcionalidade nunca usada.

Linhas e colunas abaixo foram reconferidas contra `bdprincipal-linhas.csv` e
`bdprincipal-colunas.csv`: **zero divergência** com o que os dois HTML mostram.

### 1. Cadastros base
*Quem, o quê e para onde. Nada acontece sem estes.*

| Tabela | Linhas | Col |
|---|---:|---:|
| `Clientes` | 9.322 | 97 |
| `fornecedor` | 868 | 58 |
| `Indicacoes` | 1.316 | 40 |
| `Funcionario` | 111 | 90 |
| `Obras` | 9.454 | 18 |
| `produtos` | 108.992 | 86 |
| `ProdutosFornecedores` | 108.604 | 18 |
| `GrupoProduto` | 12 | 9 |
| `Ambiente` | 346 | 8 |

> O produto nasce aqui, mas ainda sem preço.

### 2. Formação de preço
*O custo do fornecedor vira preço de venda.*

| Tabela | Linhas | Col |
|---|---:|---:|
| `Custo` | 385 | 40 |
| `Indice_preco` | 376 | 18 |
| `Indice_precoGrupoUsuario` | 2.059 | 7 |
| `Preco_Produto` | 169.764 | 25 |
| `Preco_Produto_Log` | 3.158.263 | 17 |
| `Indice_preco_log` | 1.976 | 20 |
| `custo_log` | 719 | 31 |

> VENDA = líquido de compra × Índice. Índice é POR FORNECEDOR.

`Custo` e `Indice_preco` são **por fornecedor**, não por produto nem por categoria — as duas
têm `for_codigo` na PK. A cadeia completa (4 descontos em cascata, créditos, IPI, frete, os
7 ramos de ICMS) está em `engenharia-reversa-softlux.md` §4, extraída das procs
`CalcularProduto`/`CalcularPorProduto` de `schema/bdprincipal-rotinas.sql`.

### 3. Orçamento  (Venda, Ven_Tipo='O')
*23.033 documentos. Validade ~5 dias.*

| Tabela | Linhas | Col |
|---|---:|---:|
| `Venda` | 34.136 | 90 |
| `VendaProduto` | 549.830 | 53 |
| `VendaAmbiente` | 144.674 | 9 |
| `VendaServico` | 4.450 | 17 |
| `VendaDesconto` | 300.337 | 13 |
| `VendaAtendente` | 37.707 | 11 |
| `VendaIndicacao` | 34.666 | 11 |
| `VendaIndicacaoGrupProd` | 232.415 | 8 |

> 46,1% dos orçamentos viram pedido. Conversão = troca de Ven_Tipo, não cópia.

`Venda` (34.136 = 23.033 orçamentos + 11.103 pedidos) aparece só aqui, mas **serve aos dois
estágios** — é o mesmo registro físico. As satélites referenciam o documento pelo par
`TpDoc` + `NDocPre`, não por FK para `Venda`.

### 4. Pedido de venda  (mesma Venda, Ven_Tipo='P')
*11.103 pedidos — 99,8% nascem de um orçamento.*

| Tabela | Linhas | Col |
|---|---:|---:|
| `VendaEstoque` | 0 | 13 |
| `VendaEstoqueVendido` | 20.335 | 14 |
| `Reserva_Estoque` | 3.183 | 11 |

> CategoriaVenda decide se gera financeiro. Mostra, doação e venda a funcionário NÃO geram.

Só as 3 tabelas que existem **exclusivamente** no pedido. `VendaEstoque` está zerada apesar de
ter PK de 8 colunas — estrutura sem uso. No diagrama, é daqui que saem as setas para Financeiro
(condicional), Fiscal, RT e Estoque ("reserva e baixa").

### 5. Compra sob encomenda
*O que não tem em estoque vira pedido ao fornecedor.*

| Tabela | Linhas | Col |
|---|---:|---:|
| `pedido_compra` | 8.306 | 14 |
| `Pedido_compra_det` | 34.863 | 17 |
| `ordem_compra` | 5.444 | 26 |
| `ordem_compra_det` | 30.623 | 35 |

> CompraEstoque() = ordem aberta − reserva − já recebido.

### 6. Entrada de mercadoria
*Nota do fornecedor dá baixa na ordem e sobe estoque.*

| Tabela | Linhas | Col |
|---|---:|---:|
| `Nota_entrada` | 6.343 | 42 |
| `nota_entrada_det` | 31.873 | 93 |
| `Nota_Entrada_Dif` | 86 | 7 |
| `DevolucaoProduto` | 11.557 | 30 |

### 7. Estoque
*Saldo, razão e foto diária. Multi-depósito (4 locais) e multi-empresa.*

| Tabela | Linhas | Col |
|---|---:|---:|
| `Estoque_produto` | 141.043 | 7 |
| `EstoqueTipo` | 4 | 9 |
| `estoque_log` | 402.161 | 16 |
| `estoque_produto_dia` | 8.678.690 | 9 |
| `Lancamento_estoque` | 3.614 | 10 |
| `lancamento_estoque_det` | 10.646 | 13 |
| `BalancoEstoque` | 324 | 11 |
| `BalancoEstoqueProdutos` | 7.412 | 11 |
| `TransferenciaEstoque` | 88 | 14 |
| `TransferenciaEstoqueProduto` | 302 | 9 |

> Único trigger do banco vive aqui — e lê só a 1ª linha de inserted.

`estoque_produto_dia` sozinho é **58% de todas as linhas do banco**. `EstoqueTipo` tem 4 locais
e entra na PK de `Estoque_produto`: **estoque é multi-DEPÓSITO, não só multi-empresa.**

### 8. Entrega
*Separação, carga e confirmação.*

| Tabela | Linhas | Col |
|---|---:|---:|
| `Controle_entrega` | 9.381 | 14 |
| `controle_entrega_data` | 145.480 | 21 |
| `controle_entrega_prod` | 77.835 | 21 |

### 9. Fiscal
*NF-e, NFS-e e MDF-e — muito mais completo do que o menu deixa ver.*

| Tabela | Linhas | Col |
|---|---:|---:|
| `NotaFiscal` | 2.984 | 174 |
| `NotaFiscalProdutos` | 21.883 | 144 |
| `NotaFiscalContas` | 5.016 | 6 |
| `NotaFiscalComplementar` | 242 | 9 |
| `NotaFiscalCCe` | 121 | 16 |
| `ISSQNServicos` | 198 | 8 |

2.984 notas para 11.103 pedidos = **27%**. `NFSe` (69 col), `MDFe` (52 col) e `ECFCupom`
(51 col) existem no schema e têm **0 linhas** — módulos entregues pelo fabricante, nunca usados.

### 10. Financeiro
*Contas a receber e a pagar, banco e plano de contas.*

| Tabela | Linhas | Col |
|---|---:|---:|
| `contas_receber` | 9.076 | 36 |
| `contas_Receber_det` | 18.555 | 32 |
| `Contas_receber_pag` | 17.885 | 42 |
| `contas_apagar` | 30.043 | 31 |
| `contas_apagar_det` | 42.161 | 28 |
| `Contas_apagar_pag` | 41.981 | 42 |
| `Movimento_bancario` | 61.046 | 28 |
| `Contas_Bancarias` | 19 | 20 |
| `Plano_Contas` | 140 | 18 |

### 11. RT e comissão
*Reserva Técnica do arquiteto e comissão do atendente.*

| Tabela | Linhas | Col |
|---|---:|---:|
| `Reserva_tecnica` | 1.212 | 18 |
| `Reserva_tecnica_GrupoProd` | 12.108 | 9 |
| `Indicacoes_Detalhe` | 1.344 | 53 |
| `IndicacaoGrupProd` | 7.569 | 10 |
| `FornecedorRTGrupProd` | 7.504 | 8 |
| `ParametrosRTGrupoProdutos` | 7 | 5 |
| `CategoriaRemuneracao` | 1 | 9 |

> Percentual por GRUPO DE PRODUTO, com operador. Serviço (1000) e frete (1001) são pseudo-produtos.

**RT = Reserva Técnica**, a comissão do arquiteto. A regra é mais fina do que os prints das
telas sugerem: o percentual é por grupo de produto dentro da indicação, não por documento.

---

## 4. Isolamento por empresa no legado

**212 das 360 tabelas têm `Emp_codigo`** (conferido no CSV de colunas, contando as três
grafias). Nas satélites de venda e no estoque ele é parte da PK composta:

```
VendaAmbiente     PK(VenAmb_TpDoc, VenAmb_NDocPre, CodAmbiente, Emp_Codigo)
VendaIndicacao    PK(VenInd_TpDoc, VenInd_NDocPre, Ind_Codigo, Emp_Codigo)
VendaAtendente    PK(VenAten_TpDoc, VenAten_NDocPre, Fun_Codigo, Emp_Codigo)
Estoque_produto   PK(Epr_Codnosso, Epr_Acabamento, EstTp_Codigo, Tam_codigo, Emp_codigo)
```

**Mas `Venda` tem PK só `Ven_CodigoPre`, sem `Emp_codigo`** — o número do documento é sequência
global entre as duas empresas e o isolamento fica por conta da aplicação. É o defeito que a
decisão 1 de §6 corrige.

---

## 5. Domínios de código

⚠️ **Estes valores NÃO estão nos CSVs deste diretório** — vieram de consulta ao dado em
2026-08-10 e estão registrados em `topicos/legado-softlux.md` `@banco`. Copiados aqui na
íntegra; não dá para reconferi-los a partir de `schema/`.

| Coluna | Valores | Significado |
|---|---|---|
| `Ven_Tipo` | **O = 23.033 · P = 11.103** | Orçamento · Pedido |
| `Ven_Situacao` | A = 30.782 · C = 3.354 | Ativo · Cancelado (9,8% cancelado) |
| `Ven_TipoDesc` | P = 24.283 · G = 9.853 | Desconto por Produto · Geral |
| `Elg_operacao` | S · E · Z · B | Saída · Entrada · Zerar · Balanço |
| `Elg_acao` | A · I · C | Alteração · Inclusão · Cancelamento |
| `Elg_tipo` | texto legível | PEDIDO DE VENDA 246k · NOTA DE ENTRADA 59k · ZERAR 56k · ESTOQUE MANUAL 16k · DEVOLUÇÃO 13k · BALANÇO 7,3k |
| `Cus_TributacaoICMS` | ST em 317 de 385 perfis | Substituição tributária domina (82%) |
| `Pre_tp_vl` | NORMAL = 100% | Coluna morta |
| `Ven_RtAutomatico` | tudo vazio | Funcionalidade nunca usada |

`Elg_*` são as colunas de `estoque_log` (a razão de movimentação de estoque);
`Ven_*`, de `Venda`; `Cus_*`, de `Custo`; `Pre_*`, de `Preco_Produto`.

### Tabelas de apoio com descrição
- **`EstoqueTipo`** (4): PRINCIPAL · CASA HELIO/SILVANIA · PEÇAS USADAS AUTOMAÇÃO · SHOWROOM.
- **`CategoriaVenda`** (8): tem a flag `CatVen_Financeiro`, que decide **se a venda gera
  financeiro**. MOSTRAS, DOAÇÃO, VENDA PARA FUNCIONÁRIO e ARQUITETO SEM PGTO **não geram**.
- **`GrupoProduto`** (12): inclui **1000 = SERVIÇOS e 1001 = FRETE como pseudo-produtos**.
- **`OrdemServicoSituacao`**, **`Plano_Contas_Tipo`**.
- **`TipoContaFinanceira`**: OFICIAL · SIMULAÇÃO · APROVISIONAMENTO · CONTA CLONE · HISTÓRICO ·
  AGRUPADA.

---

## 6. As 3 decisões de modelagem de Vendas — já fechadas

Fechadas pelo user em **2026-08-10**, a partir desta engenharia reversa. Fonte:
`project-core.md` `@decisoes`. **Não reabrir sem falar com o user.** O que cada uma implica
para quem for ler estes dumps:

**1 — Numeração de venda é GLOBAL no grupo, mas a chave continua composta com tenant.**
Mantém continuidade com os 34.136 documentos do legado, onde `Ven_CodigoPre` já é sequência
única entre Vertz e Via HF. No Cabinet: `PK (tenant_id, numero)`, com a sequência gerada no
nível do grupo. Numeração global ≠ PK sem tenant — o defeito do Softlux (`Venda` sem
`Emp_codigo` na PK, §4) **não** é para copiar; o isolamento continua no banco, com RLS + FORCE.
→ **Ao ler os dumps:** `Ven_CodigoPre` sozinho identifica documento; qualquer join que você
escrever a partir das satélites precisa levar `Emp_Codigo` junto, mesmo que o pai não tenha.

**2 — Orçamento e Pedido são DOIS agregados distintos.** Diverge do legado **de propósito**:
lá é um registro só, discriminado por `Ven_Tipo`, o que produz uma tabela de 90 colunas com
metade nula conforme o tipo. Separa-se porque as invariantes são diferentes — orçamento é
proposta (mutável, vence, não reserva estoque, não gera financeiro), pedido é compromisso
(reserva, gera título, gera nota). Consequências aceitas: conversão vira operação explícita
que copia itens e cria vínculo; relatório que hoje varre `Venda` inteira precisa de união ou
read model; a migração sai limpa porque **`Ven_Orcamento` está preenchido em 99,8% dos
pedidos** (11.079 de 11.103).
→ **Ao ler os dumps:** a coluna `Ven_Tipo` é a linha de corte. Toda tabela `Venda*` serve aos
dois documentos; ao mapear campo por campo, decidir a qual dos dois agregados ele pertence —
e um campo pode pertencer só a um.

**3 — Escopo fiscal: NF-e e só.** Não é gosto, é uso observado: `NFSe`, `MDFe` e `ECFCupom`
têm **0 linhas em onze anos**, e `NotaFiscal` cobre 27% dos pedidos. **Emissão fiscal não é
caminho crítico para desligar o Softlux** e fica em fase posterior. **Mas o CÁLCULO de imposto
é fase 1**, junto com Preço: `Cus_TributacaoICMS` é Substituição Tributária em 317 dos 385
perfis de custo, e ICMS/IPI/DIFAL entram na formação de custo e no lucro — sem calcular
imposto o preço sai errado, mesmo sem emitir nada.
→ **Ao ler os dumps:** as 174 colunas de `NotaFiscal` e as 144 de `NotaFiscalProdutos` são
referência de leitura, não backlog. Já os 7 ramos de `Cus_TributacaoICMS` dentro de
`CalcularProduto` (em `bdprincipal-rotinas.sql`) são requisito de fase 1.

---

## 7. O que IGNORAR na migração

**1. O banco `bdprodutos` inteiro** (6 tabelas: `produtos` 4.881 · `Preco_Produto` 4.000 ·
`ProdutosFornecedores` 3.415 · `ProdutosLocEstoque` 0 · `Produto_Relacionados` 0 ·
`dtproperties` 0). **Por quê:** 4.877 dos 4.881 produtos também existem em `bdprincipal`
(que tem 108.992) — é espelho, não catálogo paralelo. Está congelado desde 29/09/2025 enquanto
`bdprincipal` recebe produto todo dia; 67% das linhas com `For_codigo = 0` e `emp_codigo` vazio.
É **staging da importação por planilha** (menu Sistema → Importação de Produtos via Planilha).
**O ETL migra só `bdprincipal`.** Os CSVs de `bdprodutos` ficam aqui porque explicam o
`if @banco = 1` de `CalcularProduto` — a proc precifica nos dois bancos com o bloco duplicado.

**2. As 148 tabelas vazias** (41% do schema). **Por quê:** o Softlux é um **produto português
adaptado** — `TipoExpedicao` traz CTT, COMBOIO, N/ VIATURA, V/ VIATURA, BARCO; existe tabela
`Factura`; `Paramentros` tem `SysPaises_codigo` e a proc de preço lê o país antes de calcular.
Boa parte das vazias é funcionalidade de outro mercado, o resto é versão anterior do próprio
sistema. Tabela sem linha nenhuma em onze anos de operação **não é requisito** — é entulho, e
migrar estrutura vazia importa a dívida sem importar dado. Listar:
```bash
grep ',"0"$' bdprincipal-linhas.csv | cut -d'"' -f2 | sort
```

**3. A geração antiga de documento de venda** — `orcamento` (59 col, prefixo `orc_`),
`Orcamento_luminaria_det`, `Orcamento_servico_det`, `orcamento_materiais_det`,
`pedido_luminaria_det`, `pedido_materiais_det`, `pedido_servico_det`. **Todas com 0 linhas.**
**Por quê:** o modelo vivo é `Venda` + `VendaProduto`; essas são a geração anterior, morta.
Confundi-las com o modelo atual leva a mapear campo que ninguém preenche há anos.

> ⚠️ **`pedido_compra` (8.306) e `Pedido_compra_det` (34.863) NÃO fazem parte dessa geração
> morta** — apesar do nome no mesmo padrão, são as tabelas **vivas** de Compras (§3). O
> "ignorar `pedido_*_det`" vale para `pedido_luminaria_det` / `pedido_materiais_det` /
> `pedido_servico_det`, não para `Pedido_compra_det`. Conferir a contagem antes de descartar
> qualquer coisa por causa do prefixo.

**Também não replicar** (é dívida reconhecida do legado, não padrão a copiar):
`Paramentros` com 284 colunas e sem PK (God object de configuração) · as 36 tabelas sem PK,
incluindo `Preco_Produto_Log` com 3,1 milhões de linhas · regra de negócio em T-SQL com
cursores · `Venda` com PK sem tenant · o trigger que ignora update multi-linha ·
a nomenclatura sem padrão (`Ven_`, `orc_`, `Epr_`, `Cus_`, `Ipr_`, `PreLog_`).

---

## 8. O que estes dumps NÃO respondem

- ~~**Mapa tela → tabela**~~ — **RESPONDIDO em 2026-08-11 pela seção 9**, sem trace SQL. Saiu do
  binário: os SQL de cada tela, os campos de cada formulário e a ligação menu → form → tabela.
- ~~**`SisPermissao`**~~ — está em `config/`, ver seção 9.
- **`PlanoContaValor`** (40 KB, a maior rotina do banco) — apuração contábil, nunca analisada.
- **Periferia:** `EnvioWhatsapp.exe` e os arquivos `cb*.rem` (remessa CNAB, só 6, o último de
  10/03/2026 — boleto é pouco usado). **A pasta `XML`/`Transmissão` não existe naquela máquina** —
  a NF-e não é transmitida de lá. Nada disso está aqui.
- **Dado de negócio.** Estes dumps são **catálogo** — estrutura e contagem. Não há uma única
  linha de cliente, produto ou venda real neste diretório.

**Risco de segurança do ambiente legado, registrado e não corrigido:** o Softlux acessa o
SQL Server com a conta `SA`, senha fraca em texto plano em `C:\Softlux\softlux.ini`, legível
por qualquer usuário do terminal server, instância exposta na LAN. Não replicar no Cabinet.

---

## 9. `exe/` e `config/` — a 2ª rodada, do binário Delphi

Levantado em **2026-08-11**. O `SOFTLUX.exe` compila o SQL como literal de string e guarda cada
formulário como recurso DFM embutido — então o binário responde o que o catálogo do banco não
responde: **qual tela usa qual tabela, com quais campos**. Método, hash do executável e as duas
armadilhas do formato DFM estão em `exe/COMO-FOI-EXTRAIDO.md`.

### Números, conferidos nestes arquivos

| O quê | Quanto | Onde conferir |
|---|--:|---|
| Telas no índice | 713 | `grep -c '^| `' exe/mapa-telas.md` |
| Dumps DFM completos | 142 | `ls exe/formularios/*.txt | wc -l` |
| Formulários com SQL | 558 | `grep -c '   FORM: ' exe/sql-por-tela.sql` |
| Blocos SQL nos DFMs | 1981 | `grep -c '^-- \[' exe/sql-por-tela.sql` |
| SQL únicos do código | 3793 | cabeçalho de cada grupo em `exe/sql-do-codigo.sql` |
| — SELECT / UPDATE / INSERT / DELETE / EXEC | 2137 / 857 / 666 / 129 / 4 | idem |
| Opções de menu mapeadas | 287 | `config/menu-form-tabela.csv` |
| — que casaram com um formulário | 170 | coluna `Form` preenchida |
| Campos ligados a coluna, nas 713 telas | 15921 | soma da coluna `Campos` de `exe/mapa-telas.md` |
| — só nas telas alcançáveis pelo menu | 2549 | soma da coluna `Campos` de `config/menu-form-tabela.csv` |
| Colunas de `Paramentros` | 284 | `config/paramentros.csv` |
| Linhas de permissão | 875 + 259 especiais | `config/sispermissao*.csv` |

### Como usar

**"Que tabela a tela X grava?"** → `config/menu-form-tabela.csv`, colunas `Caption` (o rótulo do
menu), `Form` e `Tabelas`. É o cruzamento de `SisOpcoes.NomeMenu` com os formulários do binário:
`mFrmgrid_acabamentos` no menu é `Frmgrid_acabamentos` no exe.

**"Que campos essa tela tem, e em que ordem?"** → `exe/formularios/<Form>.txt`. Traz rótulo,
posição, máscara, ordem de tabulação e a coluna que cada campo grava — mais preciso que screenshot.

**"Como o sistema monta essa consulta?"** → `exe/sql-por-tela.sql` (SQL que mora no DFM, com os
parâmetros `:nomeados` preservados) e `exe/sql-do-codigo.sql` (o que é montado em Delphi: é aqui
que estão os `UPDATE` e `INSERT`, ou seja, a regra de gravação).

**"Que regra de negócio está configurada?"** → `config/paramentros.csv`, uma linha de 284 colunas
virada em pares coluna/valor. **`config/sispermissao_especial.csv` é o mais reaproveitável**: são
as exceções que o legado já trata como permissão à parte — mostrar margem de lucro, alterar
desconto do cliente, alterar valor do produto na venda, atualizar orçamento.

**Preço:** `config/custo.csv` (385 perfis por fornecedor) e `config/indice_preco.csv` (376 índices).
`Ipr_Indice` tem mediana 2,56 e é o multiplicador da fórmula da seção 2.

### Limites destes arquivos

- **`config/` contém dado de PRODUÇÃO**, ao contrário de `schema/`: são parâmetros, grupos,
  permissões e política comercial reais — nomes de fornecedor inclusive. Não há dado de cliente,
  produto ou venda.
- Os `TQRLabel` dos relatórios trazem placeholder, não texto: o layout do orçamento impresso foi
  lido de PDFs reais e descrito em `achados-exe-2026-08-11.md`. **Os PDFs não estão versionados** —
  têm nome, valor e obra de cliente.
- 54 dos 768 marcadores `TPF0` não parseiam: são falso positivo em dado binário, não telas perdidas.
