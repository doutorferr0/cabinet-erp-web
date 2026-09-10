# Ciclo de vida dos documentos — o mapa de transições, e onde ele falta

> Medido em **2026-08-28** contra a `main` deste repositório e os dumps versionados
> em `docs/legado/`. Todo número aqui sai de um comando, e os comandos estão na
> seção [Como re-medir](#como-re-medir). Quem discordar de uma linha roda o
> comando antes de discutir a linha.

## O eixo, e por que ele não é o do documento irmão

`docs/fluxo-paridade-softlux.md` (web#364) mapeou **arestas entre telas**: de onde
se chega em cada tela, o que ela entrega para a próxima, que atalho o Softlux tem
e o Cabinet não. Este documento mapeia outra coisa — **o ciclo de vida de cada
documento**: que estados ele tem, que ação leva de um a outro, e **quem pode
executar essa ação**.

Os dois eixos se cruzam e não se substituem. Um documento pode ter a navegação
inteira de pé e o ciclo de vida sem nenhuma guarda: o botão leva ao lugar certo, e
qualquer um aperta, a qualquer momento, quantas vezes quiser. É o que este
levantamento encontrou.

**Fora de escopo, de propósito:** paridade de campo, de coluna e de rótulo — têm
dono em outros trilhos. E o desenho de tela: aqui se descreve o que o sistema
permite, não como ele aparece.

## As fontes, e a que não estava aqui

| fonte | o que deu | onde |
|---|---|---|
| `sisopcoes.csv` | 287 opções de menu em 12 raízes | `docs/legado/config/` |
| `sispermissao.csv` | 875 linhas — opção × grupo × 5 verbos | idem |
| `sisopcoes_especial.csv` | **52 permissões por AÇÃO** | idem |
| `sispermissao_especial.csv` | 259 linhas — 138 concessões, **121 negações** | idem |
| `sisgrupo_usuario.csv` | os 7 grupos reais de produção | idem |
| `bdprincipal-colunas.csv` | as colunas de estado de cada tabela | `docs/legado/schema/` |
| `bdprincipal-linhas.csv` | **o volume de cada tabela** — o que é usado e o que não é | idem |
| `bdprincipal-indices.csv` | as chaves primárias | idem |
| `bdprincipal-rotinas.sql` | procedures e triggers que escrevem estado | idem |
| `sql-do-codigo.sql` | o SQL extraído do binário Delphi | `docs/legado/exe/` |
| `contracts/openapi-v1.json` | o ciclo de vida que o Cabinet publica | raiz |
| `src/data/papeis.ts` | a permissão que o Cabinet aplica hoje | — |

**`comparativo-softlux/` não está nesta máquina.** Vive na pasta Cowork, fora do
git — o mesmo achado já registrado na frente visual quando o trilho S2 o procurou.
Não bloqueia, e a razão continua valendo palavra por palavra: **o comparativo é
leitura do dump, e o dump está versionado aqui.** O que se perde é o placar de
cobertura por menu; o que se ganha é que cada linha abaixo tem um comando que a
reproduz, coisa que a leitura de segunda mão não teria.

`docs/legado/config/` é a fonte que nenhum levantamento anterior abriu, e é a mais
próxima da pergunta "quem pode": não é o desenho do RBAC, **é o RBAC preenchido em
produção**, com os grupos reais da Vertz e as permissões que cada um recebeu.

## O legado guarda o ciclo em COLUNAS, não em um enum

A `Venda` tem 90 colunas e **nove** delas são ciclo de vida. Não há campo único de
"status": há um char de situação, um char de tipo, dois bits de liberação, três
bits de propagação e duas datas-marco.

| coluna | tipo | o que diz |
|---|---|---|
| `Ven_Situacao` | `char(1)` | a situação do documento |
| `Ven_Tipo` | `char(1)` | **`O` = orçamento · `P` = pedido** — ver abaixo |
| `Ven_LiberaSeparacao` | `bit` | o material pode ser separado |
| `Ven_LiberaEntrega` | `bit` | o material pode sair |
| `Ven_TemFinanceiro` | `bit` | já gerou título |
| `Ven_TemCompra` | `bit` | já gerou compra |
| `Ven_TemEstoque` | `bit` | já mexeu no estoque |
| `Ven_DataFechaVenda` | `datetime` | quando fechou |
| `Ven_DataConclusao` | `datetime` | quando concluiu |

Mais a auditoria de quem criou e quem alterou (`usr_cod_criacao`,
`usr_dt_hr_criacao`, `usr_cod_alteracao`, `usr_dt_hr_alteracao`), que é do
registro, não do ciclo, mas responde "quem mexeu por último".

### Seis achados que mudam o desenho, não só o inventário

**1 — Orçamento e pedido moram na MESMA TABELA, e provavelmente em linhas
diferentes.** `Venda` tem `Ven_Tipo` `char(1)`, com `O` = orçamento e `P` = pedido,
e a chave primária é `Ven_CodigoPre`, coluna única
(`bdprincipal-indices.csv:450`). O documento de venda inteiro do legado — os dois
tipos, as quatro séries — é uma tabela só, com 34.136 linhas.

**Aqui vale uma nota de divergência entre fontes, no espírito do aviso herdado
desta issue.** `docs/legado/gera-operacoes.py` (`FLUXOS['orcamento']`) afirma que
a transição *"vira pedido de venda — troca `Ven_Tipo` de `O` para `P`"*. **O dump
não sustenta isso**, e três medições apontam para o contrário:

- **não existe nenhum `UPDATE … SET Ven_Tipo`** em `sql-do-codigo.sql` nem em
  `sql-por-tela.sql`;
- **`Venda.Ven_Orcamento` existe** (`bdprincipal-colunas.csv:5956`) — uma coluna
  que aponta para o orçamento de origem só faz sentido se houver duas linhas;
- **os contadores são dois e separados**, `ParSV_numeroOrc` e `ParSV_numeroPed`
  (`:4663-4664`) — numeração independente é numeração de documentos distintos.

E a distribuição fecha com a leitura de duas linhas: `O` = 23.033 e `P` = 11.103,
somando exatamente as 34.136 sem sobreposição, numa razão de 48% que é
essencialmente a taxa de aprovação que o próprio mapa do legado anota ("46%
aprovam"). Se a conversão fosse no lugar, os `O` remanescentes seriam apenas os
**não** convertidos e essa razão não seria calculável assim.

**Consequência, e ela inverte o que este documento diria de outro modo:** o
modelo do legado é, ao que o dump mostra, **dois documentos ligados por um campo
de origem** — que é exatamente o modelo do Cabinet (`OrderDto.quoteId`). Os dois
sistemas **convergem** aqui.

Fica como nota e não como verdade, porque `gera-operacoes.py` é narrativa autoral
de um agente anterior, não dump, e a tela que faria a conversão
(`mVEN0_FrmGridVenda`/`mVEN1_FrmGridVenda`) **não está entre os 142 formulários
extraídos dos 713**. Ausência de literal não é prova de ausência de escrita: o
Delphi monta `UPDATE` de dataset editável em runtime, e ele nunca vira string no
binário. **O que se pode afirmar é que a fonte interna que dizia o contrário não
tem lastro no dump** — quem precisar da resposta fechada pergunta a quem opera.

**2 — `TemFinanceiro`/`TemCompra`/`TemEstoque` são o estado da CADEIA na linha do
documento.** O legado não descobre se uma venda já gerou título consultando o
financeiro: ele carimba a venda. São três bits que respondem, sem junção, "até
onde este documento se propagou". O Cabinet não tem equivalente — lá a pergunta só
se responde consultando o documento de destino, e a tela que quiser mostrar isso
numa listagem precisa de N+1 consultas ou de um campo que ninguém publicou.

**3 — A liberação é bit, não estado.** `Ven_LiberaSeparacao` e `Ven_LiberaEntrega`
não são valores de uma máquina de estados: são duas autorizações independentes,
viradas por uma tela própria (`Liberar Separação e Entrega`,
`mFrmLiberarProdutos`) que **só ADMINISTRAÇÃO e SUPERVISOR alcançam**. Separar e
entregar não são etapas que o documento atinge; são portas que alguém destranca.
Os quatro comandos estão no dump, literais e simétricos
(`sql-do-codigo.sql:47-50`):

```sql
update venda set Ven_LiberaSeparacao =1 where Ven_CodigoPre =:pven_CodigoPre
update venda set Ven_LiberaSeparacao =0 where Ven_CodigoPre =:pven_CodigoPre
update venda set Ven_LiberaEntrega   =1 where Ven_CodigoPre =:pven_CodigoPre
update venda set Ven_LiberaEntrega   =0 where Ven_CodigoPre =:pven_CodigoPre
```

**É o único ponto do ciclo de venda onde ligar e desligar têm o mesmo peso** — em
todo o resto do documento, o dump só tem o caminho de ida.

**4 — E esse portão está DESLIGADO na base real.** O parâmetro que o torna
obrigatório, `Par_ControleSepEntProdutos` ("Obrigatório a liberação da separação e
entrega de produtos"), vale **`False`** em `docs/legado/config/paramentros.csv:265`.
O mesmo vale para `Par_EntregaComDuplicata` ("entrega apenas com duplicata ou
recibo criados"), **`False`** em `:130`.

Isto é advertência forte para quem for replicar: **o legado tem a trava, e a Vertz
opera com ela desligada.** Copiar a trava como obrigatória mudaria o trabalho de
quem usa o sistema hoje. É pergunta para o user, não decisão de implementação.

**5 — E a baixa de estoque não nasce onde o mapa diz.**
`Par_RequisicaoProdutos` — *"Não fazer baixa do estoque e não gerar pedido de
compra na confirmação da venda e sim na requisição de produtos"* — vale
**`True`** (`paramentros.csv:131`). Nesta base, a baixa e a compra nascem na
**requisição**, não na confirmação do pedido. A coluna `Ven_Requisicao` marca os
documentos sob esse regime.

**6 — A lógica de ciclo não está no banco.** `bdprincipal-rotinas.sql` tem 224 KB
e **um único trigger** (`GatilhoEstoqueMinimo`, em `Estoque_produto`), mais 31
funções escalares e 4 procedures, todas de relatório ou sequência. **Nenhuma
procedure ou trigger escreve status de documento.** Toda transição mora no Delphi
— o que explica por que parte dos escritores não aparece como literal, e é a
ressalva que atravessa este documento inteiro.

### O que é usado e o que só está instalado

`bdprincipal-linhas.csv` responde à pergunta que nenhuma leitura de schema
responde: **o quê, dessas telas, alguém de fato usa.**

| tabela | linhas | leitura |
|---|---|---|
| `Venda` | 34.136 | o documento central |
| `VendaProduto` | 549.830 | os itens |
| `Controle_entrega` | 9.381 | **a entrega VIVA** |
| `controle_entrega_prod` | 77.835 | idem, itens |
| `controle_entrega_data` | 145.480 | idem, datas |
| `Devolucao` | 3.810 | o retorno é rotina, não exceção |
| `DevolucaoProduto` | 11.557 | idem |
| `contas_receber` | 9.076 | o financeiro do ciclo |
| `Contas_receber_pag` | 17.885 | as quitações |
| `Entrega` / `EntregaDetalhe` | **0** | instalado, nunca usado |
| `QuadroCargas` / `QuadroCargasProjeto` | **0** | idem |
| `VendaDataEntrega` | **0** | idem |

**Zero linhas tem duas causas, e distingui-las importa.** Um segundo grupo de
tabelas vazias não é abandono, é **migração**: `orcamento`, `pedido`, `Avulso`,
`Saida_complementacao`, `Ent_devolucao` e `AutorizaInclusao` estão vazias porque
foram consolidadas em `Venda` e `Devolucao`, e o `INSERT … SELECT` que fez isso
está no dump (`sql-do-codigo.sql:1502` orçamento→`Venda 'O'`, `:1506`
pedido→`Venda 'P'`, `:1513` avulso→série 2, `:1517` complementação→série 3,
`:1524` devolução).

Esses `INSERT` são **a legenda mais forte de todo o dump**, porque mapeiam campo a
campo o status velho no novo — é deles que sai, por exemplo, a prova de que
`Devolucao.Dev_situacao` bit `1` equivale ao `'A'` do modelo anterior.

**A entrega do legado tem duas implementações, e a que tem tela no menu não é a
que tem dado.** `Quadro de Carga`, `Gerenciamento de Entrega` e `Fechamento de
Entrega` são opções de menu com permissão atribuída e **zero linhas** nas tabelas
correspondentes; quem carrega a operação real é `Controle_entrega`, com 9.381
documentos e 145 mil linhas de eventos.

**"Quadro de cargas" nomeia três coisas diferentes no legado**, e confundi-las é
fácil — a tela do Cabinet já documenta duas delas
(`src/features/carga/quadro-de-cargas.tsx`):

| o quê | é | dado |
|---|---|---|
| `RltQuadroCargas` | **dimensionamento ELÉTRICO** — soma `Pro_Consumo` por ambiente, lê `Pro_Tensao` | relatório |
| `mFrmGridQuadroCargas` + `QuadroCargas`/`QuadroCargasProjeto` | **agrupador persistido** de pedidos numa carga (capa com `Nome` e `Obs`, ligação para as vendas) | **0 linhas** |
| `Controle_entrega` | a separação e a entrega de verdade | **9.381** |

**O Cabinet acertou aqui por um caminho que vale registrar.** A tela dele agrupa
pedidos em cargas **como visão derivada da fila de separação**
(`agruparEmCargas`, sobre `GET /api/picking-queue`) — sem documento de carga
persistido. É exatamente a peça que o legado modelou como tabela e **ninguém nunca
preencheu**. Fazer do agrupamento uma visão em vez de um documento evita pedir ao
operador que mantenha um cadastro a mais, que é a hipótese mais provável para as
zero linhas.

O que fica como pergunta é o outro lado: **`Controle_entrega` tem a janela de
conferência** (`Ced_DataConferenciaInicial`/`Final`) e assinatura de recebimento,
e o `DeliveryDto` do Cabinet tem `deliveredAt` + `receivedBy`. A conferência —
o intervalo entre começar a conferir e terminar — não tem equivalente.

**A devolução, ao contrário, é rotina:** 3.810 documentos, 11.557 itens, e uma
tabela só para o deságio (`DevolucaoDesagio`, 3.874). Um em cada nove documentos
de venda tem devolução associada. Um Cabinet sem devolução não é um Cabinet com
uma lacuna de borda — é um Cabinet que não atende um nono do movimento.

## O Cabinet guarda o ciclo em enums, e em cinco máquinas separadas

O contrato publica **199 operações em 149 caminhos**, e treze documentos têm campo
de estado com valores fechados:

| documento | schema | campo | valores |
|---|---|---|---|
| orçamento | `QuoteDto` | `status` | `active` · `cancelled` |
| pedido de venda | `OrderDto` | `status` | `active` · `concluded` · `cancelled` |
| pedido de venda | `OrderDetailDto` | `type` | `sale` · `demo` (imutável — `PUT` que muda é 409) |
| linha do pedido | `OrderItemFulfillmentDto` | `physicalState` | `pending` · `released` · `picked` · `delivered` |
| romaneio | `DeliveryDto` | `status` | `open` · `closed` · `cancelled` |
| pedido de compra | `PurchaseRequestDto` | `status` | `open` · `partially_ordered` · `ordered` · `cancelled` |
| linha do pedido de compra | `PurchaseRequestItemDto` | `status` | `open` · `ordered` · `cancelled` |
| ordem de compra | `PurchaseOrderDto` | `status` | `draft` · `sent` · `cancelled` |
| recebimento | `GoodsReceiptDto` | `status` | `draft` · `checked` · `posted` |
| título financeiro | `FinancialTitleDto` | `status` | `open` · `settled` · `cancelled` |
| parcela | `FinancialInstallmentDto` | `status` | `open` · `settled` |
| reserva técnica | `TechnicalReserveDto` | `status` | `active` · `cancelled` |
| fechamento de comissão | `CommissionClosingDto` | `status` | `open` · `closed` |

E **quatro peças da cadeia não têm estado nenhum**, o que é o achado deste lado:

| peça | por quê |
|---|---|
| **separação** | não é documento. Não há `PickingDto` nem `/api/pickings`: separar é um ato sobre a linha (`POST /api/orders/{id}/items/{n}/pick`), e o "estado" é `physicalState`, **derivado de três quantidades e nunca guardado**. Sem status, sem id, sem cancelamento |
| **baixa financeira** | `FinancialSettlementDto` é fato append-only |
| **movimento de caixa** | só `reconciledAt` nulo/preenchido |
| **oportunidade CRM** | o estado é do ESTÁGIO (`CrmStageDto.isWon`/`isLost`), não do cartão |

**A cadeia não é uma máquina de estados: são cinco, desconectadas.** Nenhum status
de um documento é pré-condição declarada da transição de outro. É a diferença
estrutural para o legado, que concentra nove campos de ciclo numa tabela só e
carimba na venda o que aconteceu a jusante.

### Onde os dois modelos CONVERGEM, e vale registrar

**No legado não existe tabela `Separacao`.** Separação e entrega são o mesmo
agregado: `Controle_entrega` (capa) → `controle_entrega_prod` (saldo por item) →
`controle_entrega_data` (**o razão de eventos**). E o estado não é flag: é ledger.

`controle_entrega_data` tem duas colunas de uma letra que, juntas, dizem tudo:

| coluna | valores | significado |
|---|---|---|
| `cep_tipo` | `S` · `E` | **S**eparação · **E**ntrega |
| `cep_operacao` | `E` · `R` | **E**fetiva · **R**etorno (estorno) |

E o cálculo do saldo está literal no dump (`sql-do-codigo.sql:3347`):

```
CalcSep = SUM(ced_quantidade WHERE cep_tipo='S' AND cep_operacao='E')
        - SUM(ced_quantidade WHERE cep_tipo='S' AND cep_operacao='R')
CalcEnt = SUM(ced_quantidade WHERE cep_tipo='E' AND cep_operacao='E')
        - SUM(ced_quantidade WHERE cep_tipo='E' AND cep_operacao='R')
```

As colunas `cep_quantidade_separada`/`_entregue` de `controle_entrega_prod` são
**cache** desse cálculo, não a fonte.

**Esta é a maior convergência entre os dois sistemas, e é convergência de
desenho.** O Cabinet deriva `physicalState` de `pendingRelease`/`pendingPick`/
`pendingDelivery`; o legado deriva a situação de somas com sinal sobre um razão.
Nenhum dos dois guarda o estado do físico como campo — os dois o calculam.

**E a diferença é exatamente uma metade:** o legado tem o `R`, e o Cabinet não.
O contrato sabe disso e nomeia a coluna pelo nome próprio, na descrição de
`CancelDelivery`:

> *"O ato de estorno (o `cep_quantidade_entregueRET` do legado) é a fase seguinte e
> ainda não tem caminho."*

Isso reclassifica o buraco: **não é modelo divergente a reconciliar, é a metade
negativa de um ledger que o Cabinet já implementou pela metade positiva.** É a
razão de P7 ser barata.

**Um detalhe que engana e vale registrar:** `cep_tipo` significa coisas
diferentes nas duas tabelas — `S`/`E` (separação/entrega) em
`controle_entrega_data`, e `L`/`M` (luminária/materiais) em
`controle_entrega_prod`. Mesmo nome, mesmo prefixo, domínios sem relação.

### O painel de 5 estados que não é coluna nenhuma

A tela `Consultar Situação do Pedido de Venda` (`FrmConsultaSeparacaoPedidoVenda`)
tem um combo com cinco situações nomeadas:

> `Em aberto para separar · Em separação · Para entregar (conferidos) · Com nota
> fiscal já emitidas · Entregues`

**Nenhuma delas é coluna, e a query da tela não filtra por situação alguma** — só
por `Ven_Tipo='P'`. Os cinco estados são montados no Delphi a partir dos saldos do
ledger, das datas `Ced_DataConferenciaInicial`/`Final` e da existência de nota
fiscal.

É o análogo exato do `physicalState` do Cabinet: **um vocabulário de estado que
existe para o operador e não existe no banco.** Os dois sistemas chegaram à mesma
solução, e os nomes do legado são um bom candidato a vocabulário de tela — com a
diferença de que o Cabinet tem quatro (`pending`/`released`/`picked`/`delivered`)
e o legado tem cinco, porque conta a conferência e a nota fiscal como marcos.

## Quem pode — as três camadas do legado, e o bit único do Cabinet

Esta é a seção que o eixo "estado × ação" existe para produzir, e é onde a
distância entre os dois sistemas é maior.

### O legado tem RBAC em três camadas

**Camada 1 — opção de menu × 5 verbos genéricos.** 287 opções, e para cada grupo,
cinco bits: `Inserir`, `Alterar`, `Excluir`, `Consultar`, `Imprimir`
(`sispermissao.csv`, 875 linhas). **Os cinco verbos são CRUD, não ciclo:** não
existe bit de "cancelar", "faturar", "baixar", "estornar", "separar", "entregar"
nem "concluir".

O que dá granularidade de transição a essa camada é que **várias transições do
ciclo são opções de menu próprias** — `Liberar Separação e Entrega`, `Conclusão do
Pedido de Venda`, `Devolução de Venda`, `Fechamento de Entrega`, `Fechamento de
Contas`. Cada uma dessas ganha os cinco bits por ser tela.

**Mas onde a transição não é tela, ela cai num bit genérico — e o caso é o mais
importante de todos.** Na listagem de pedido de venda, o botão que ocupa a posição
de excluir **se chama `&Cancelar`** (`FrmGrid_pedido.txt:87`; a transcrição
registra o mesmo: *"nas telas de compra o 5º botão é `Excluir`; aqui é
`Cancelar`. Orçamento não se apaga."*). Logo **`SisPermissao.Excluir` na opção
"Pedido de Venda" é, na prática, a permissão de cancelar a venda** — e é por
coincidência de posição na barra, não por desenho.

É o que explica a linha `IA.CI` dos VENDEDORES: eles não têm o `Excluir`, e por
isso **não cancelam pedido**. A regra de negócio está correta e o mecanismo que a
aplica é um acidente de nomenclatura.

**Camada 2 — 52 permissões por AÇÃO** (`sisopcoes_especial.csv`), que é
exatamente o modelo que o Cabinet decidiu adotar em api#84. Várias são puramente
de ciclo:

| # | permissão especial | o que destrava |
|---|---|---|
| 7 | `QUITAR CONTA PELO MÓDULO DE VENDA` | quitar título de dentro da venda |
| 8 | `ALTERAR CONTA PELO MÓDULO DE VENDA` | mexer no título de dentro da venda |
| 12 | `GANHOS SOBRE VENDAS - FINANCEIRO` | alterar conta a pagar **depois de fechado** |
| 13 | `ATUALIZAR ORÇAMENTO` | reprecificar o documento |
| 23 | `DESBLOQUEAR NOTA DO FORNECEDOR` | reabrir nota travada |
| 24 | `ALTERAR DESÁGIO NA DEVOLUÇÃO` | mexer no valor devolvido |
| 26 | `ALTERAR DATA DE FECHAMENTO NO PROJETO` | mover o marco de fechamento |
| 29 | `EDITAR DATA DE CONCLUSÃO` | mover o marco de conclusão |
| 30 | `CONFIRMAR DEVOLUÇÃO NO ESTOQUE` | efetivar a volta da peça |
| 31 | `ALTERAR FINANCEIRO DA DEVOLUÇÃO` | mexer no estorno |
| 34 | `EXCLUIR HISTÓRICO DA CONTA` | apagar histórico do pedido |
| 35 | `LIMITAR ALTERAÇÃO PEDIDO DE VENDA` | trava o usuário em "só observações" |
| 45 | `PERMITIR QUITAÇÃO COM VALOR A MENOS` | quitar por menos que o vencimento |

E a permissão é **ternária**, não binária: das 259 linhas de
`sispermissao_especial.csv`, **138 são concessão e 121 são negação explícita**. O
legado grava o "não" — um grupo pode ter a permissão ausente (herda o padrão) ou
negada (decisão registrada). Os dois casos são distinguíveis, e num sistema de
permissão essa diferença é auditoria.

**Camada 3 — bits soltos no cadastro do usuário.** `SisUsuarios` carrega
permissões que não passam por nenhuma das duas tabelas, e uma delas é justamente a
do ponto mais sensível do ciclo: **`SisUsu_LiberarSepEnt`** — liberar separação e
entrega. Também `SisUsu_EnviarEmailEstoque`, `SisUsu_PDVSangria`,
`SisUsu_PDVOperar`, e uma coluna `Nivel` `char(1)` **sem legenda no dump**.

### A matriz real de produção — 7 grupos

| grupo | opções alcançadas (de 287) | permissões especiais |
|---|---|---|
| SUPERVISOR | 263 | 50 |
| ADMINISTRAÇÃO | 245 | 50 |
| COMPRAS | 92 | 11 |
| AUTOMAÇÃO | 68 | 2 |
| VENDEDORES | **46** | 14 |
| VENDAS SP | 44 | 9 |
| TECNICO | 33 | 2 |

O vendedor alcança **16% do sistema**. E dentro do menu Vendas, o padrão é o
achado central desta seção:

| opção do menu Vendas | VENDEDORES | ADMINISTRAÇÃO |
|---|---|---|
| Orçamento | `IAECI` | `IAECI` |
| Pedido de Venda | `IA.CI` | `IAECI` |
| Devolução de Venda | `I..CI` | `IAECI` |
| Conclusão do Pedido de Venda | `IA.CI` | `IAECI` |
| Controle de Entrega | `...C.` | `IAECI` |
| Quadro de Carga | — | `IAECI` |
| Consultar Situação do Pedido de Venda | — | `IAECI` |
| Liberar Separação e Entrega | — | `IAECI` |
| Fechamento de Entrega | — | `IAECI` |
| Fechamento Ganhos Sobre Vendas | — | `IAECI` |

*(`IAECI` = Inserir · Alterar · Excluir · Consultar · Imprimir; ponto = negado.)*

**O poder do vendedor decresce ao longo da cadeia, e decresce monotonicamente.**
No orçamento ele tem os cinco verbos, o `Excluir` inclusive. No pedido perde o
`Excluir`. Na devolução perde também o `Alterar` — ele lança e não retoca. No
controle de entrega fica só com `Consultar`. Da liberação em diante, nada.

Isso não é uma lista de permissões: **é a irreversibilidade do documento expressa
em RBAC.** O legado não precisa proibir "editar pedido faturado" com uma regra de
estado, porque a pessoa que faturaria não tem o verbo. Estado e permissão fazem o
mesmo trabalho por dois caminhos, e o legado usa os dois.

E há segregação de função de verdade, não só hierarquia: **COMPRAS pode `Alterar`
a Devolução de Venda (`IA.CI`) e o vendedor não pode (`I..CI`)**; COMPRAS só
consulta o Pedido de Venda (`...CI`). Quem lança a devolução não é quem a ajusta.
Nenhum dos dois grupos é "acima" do outro — são recortes.

### O Cabinet tem um bit por família

`src/data/papeis.ts` é a autoridade do front, e o que ele publica é:

```
podeEscrever(papel, familia) -> boolean
```

**20 famílias de caminho, uma escala linear de 5 papéis, e uma decisão binária:
escrever ou não escrever.** Não há verbo (inserir ≠ alterar ≠ excluir), não há
ação (cancelar ≠ gravar), não há negação explícita, e não há transição.

A consequência é direta e vale escrever inteira: **`quotes: 'operator-sales'`
significa que quem pode gravar um orçamento pode fazer tudo que a família de
orçamento oferece** — incluindo o que quer que venha a existir de cancelar,
reabrir, aprovar ou converter. Toda operação nova de ciclo que entrar no contrato
nasce, no front, com a permissão de gravar o documento.

O próprio arquivo sabe disso e diz por escrito, no comentário de `roles`:

> *A matriz continua sendo a escala ANTIGA de propósito: enquanto a conversão do
> api#84 não chega à fase 3, é por ela que o front esconde controle. O dia em que
> o vínculo publicar as permissões efetivas, esta matriz inteira morre junto com
> `alcanca()`.*

Ou seja: **a decisão já foi tomada (api#84, permissões por ação, papéis criados
pelo admin) e é exatamente o modelo que o legado já opera há anos.** O que falta é
a chegada. Este documento não propõe rediscutir o modelo; propõe nomear as
transições que vão precisar de permissão quando ele chegar, porque hoje elas não
existem nem como nome.

### O legado é mais granular que o Cabinet, e não é o modelo a copiar

A conclusão honesta desta seção não é "o legado acertou". É que **o legado
resolveu o problema em três camadas que ninguém costura**, e as duas ações mais
destrutivas do sistema ficaram de fora das camadas que nomeiam permissão:

| ação | onde a permissão mora |
|---|---|
| liberar separação/entrega | tela própria (camada 1) **e** bit no usuário (camada 3) — **duas autoridades sobre a mesma decisão** |
| confirmar devolução no estoque | permissão especial 30 (camada 2) |
| quitar a menor | permissão especial 45 (camada 2) |
| editar data de conclusão / fechamento | especiais 29 e 26 (camada 2) |
| **cancelar venda** | **nenhuma** — cai no bit `Excluir` da tela, por coincidência |
| **estornar baixa financeira** | **nenhuma, em camada nenhuma** |

O Cabinet decidiu (api#84) ir para uma camada só, por ação, com papéis criados
pelo admin. **Isso é melhor que o legado, não uma cópia dele.** O que este
documento propõe não é importar o mecanismo — é importar a *lista*: as transições
que o legado descobriu, ao longo de anos, que precisavam de dono. Menos as duas
que ele esqueceu.

## As transições do legado, como o dump as escreve

Vale antes do mapa do Cabinet, porque duas delas não têm equivalente e a forma de
uma terceira é a resposta a uma pergunta em aberto.

### Cancelar venda é um BUNDLE, não um campo

`UPDATE venda SET ven_situacao='C'` aparece em três variantes
(`sql-do-codigo.sql:26`, `:44`, `:46`), e a do meio grava o motivo
(`Mod_codigo` → `Motivo_devolucao`). **Mas o comando nunca vem sozinho.** Na mesma
rotina do binário:

| efeito | comando |
|---|---|
| desliga o controle de entrega | `cen_codigo = null` (dentro do próprio `UPDATE`) |
| cancela transferências de estoque abertas | `:45` — `TransfEst_situacao='C' WHERE TransfEst_situacao='A'` |
| cancela os créditos que o documento gerou | `:24,:25,:27,:28,:38,:7,:838` — `Credito_Situacao='C'` por tipo de origem (RT, indicação, crédito de cliente) |
| cancela a pasta | `:31` — `pasta_situacao='C'` |
| cancela a devolução ligada | `:8` — `Dev_situacao = 0` |
| cancela a requisição | `:54` — `ReqEst_Situacao='C'` |
| cancela a ordem de serviço | `:32` — `OrdServ_situacao = 0` |
| carimba quem e quando | `usr_dt_hr_alteracao = getdate()`, `usr_cod_alteracao` |

**O que o dump NÃO mostra o cancelamento desfazendo:** baixa de estoque e títulos
financeiros. Não há literal revertendo `estoque_log` nem apagando `contas_receber`
dentro do bundle. Com a ressalva de sempre — ausência de literal não é prova de
ausência de escrita.

**Isto responde diretamente ao buraco F4 do Cabinet.** Lá, `CancelOrder` só carimba
status e motivo, e a pergunta "o que acontece com a peça já separada?" fica sem
resposta. O legado mostra o formato da resposta: **cancelar é uma transação que
toca N documentos**, e ele lista quais. O Cabinet já tem um precedente do mesmo
formato — `CancelPurchaseOrder` devolve as linhas de pedido a `open`, dois
documentos numa transação. O que falta é aplicá-lo ao cancelamento da venda.

### Estornar baixa é DELETE, e não deixa rastro

A baixa financeira do legado não é um flag: é uma **linha** em
`Contas_receber_pag`/`Contas_apagar_pag`, mais linhas em `Movimentos` e
`Movimento_bancario`. Estornar, portanto, é:

1. `ctr_situacao='N'` — a parcela volta a aberta (`:807`, `:826`)
2. `Ctp_status='A'` — **o título volta a ABERTO** (`:60`)
3. `DELETE FROM movimentos` e `DELETE FROM movimento_bancario` (`:1544-1547`)
4. `DELETE FROM Contas_receber_pag` (`:1603-1607`)

**Não há coluna de "estornado", nem data, nem usuário, nem motivo.** O estorno
apaga a evidência de que houve baixa. É a assimetria mais séria do modelo
financeiro do legado, e vale muito registrar aqui: **o Cabinet declarou que não
tem estorno porque a decisão de alçada não foi tomada. A alternativa que o legado
oferece não é um modelo melhor a copiar — é um apagamento sem trilha.**

Quando essa decisão for tomada (P-H3), o formato certo já está no próprio Cabinet,
em `CancelDelivery`: *"o log é append-only"*. Estorno como lançamento contrário, e
não como `DELETE`.

### Reabertura existe em um lugar só, e é no financeiro

Varredura no dump: **zero ocorrências de `SET ven_situacao='A'`**. Cancelamento de
venda é terminal, e o mesmo vale para devolução (`Dev_situacao=1` só aparece na
migração), requisição, transferência, crédito, pasta e OS.

O único documento que reabre é **a conta a pagar** — `Ctp_status='A'` (`:60`). E o
único "desfazer" explícito de toda a interface é o botão **`Desfazer Canc.`** da
ordem de compra (`FrmOrdem_compra.txt:409`), que opera sobre
`Ocd_quant_cancelada` — **cancelamento por quantidade no item, não por flag no
documento.**

**Isto é a medição que a proposta P9 pedia.** A decisão do Cabinet de não ter
reabertura foi registrada assim: *"o legado não tem o estado, então não há caso
real para copiar"* — e a varredura **confirma a premissa quanto ao estado**: não há
transição de volta para ativo em documento de venda. O que existe é o gesto de
alçada (permissões especiais 23 e 29, mexer no carimbo) e a reversão por
quantidade da compra. **A decisão do Cabinet se sustenta; a nota que a registra é
que pode ganhar o dado.**

## O mapa de transições — estado × ação × quem pode

As 27 operações de transição do contrato, com a origem exigida, o efeito e a
permissão. **`papel` é o que o mock realmente aplica** (`verificarEscrita`, por
família); **`prosa`** é a permissão por ação que a descrição da operação nomeia e
que ninguém aplica ainda.

### Venda

| ação | de → para | efeito | quem pode |
|---|---|---|---|
| `CancelQuote` | `active` → `cancelled` | grava motivo, data | papel: `quotes`/`operator-sales` · prosa: **nenhuma** |
| `ReviseQuote` | não-`cancelled`, sem revisão → *(original intacto)* | **cria orçamento novo** com `revisionOfId` | idem · prosa: **nenhuma** |
| `CreateOrderFromQuote` | não-`cancelled`, não convertido → *(orçamento não muda)* | **cria o pedido**, cópia profunda com preço congelado | papel: `quotes` (por prefixo) · prosa: **nenhuma** |
| `ConcludeOrder` | `active` → `concluded` | carimba `closedAt`; fecha para `PUT` | papel: `orders`/`operator-sales` · prosa: **nenhuma** |
| `CancelOrder` | `active` → `cancelled` | grava motivo | idem · prosa: **nenhuma** |
| `ReturnDemoOrder` | `demo`, retorno nulo → *(status não muda)* | carimba `demoReturnedAt`, devolve ao saldo | idem · prosa: **nenhuma** |

### A escada física

| ação | de → para | efeito | quem pode |
|---|---|---|---|
| `ReleaseOrderItem` | `pending` → `released` | **reserva** saldo; decide o depósito | papel: `orders`/`operator-sales` · prosa: **`venda:liberar-entrega`** |
| `PickOrderItem` | `released` → `picked` | **baixa estoque** (kardex, origem tipada); mata a reserva | papel: `orders` · prosa: **nenhuma** |
| `CreateDelivery` | pedido não-`cancelled` → romaneio `open` | cria o romaneio | idem · prosa: **nenhuma** |
| `AddDeliveryItem` | `picked` → `delivered` | **não mexe em estoque** — a peça já saiu | idem · prosa: **nenhuma** |
| `CloseDelivery` | `open` → `closed` | exige `deliveredAt` + `receivedBy` | idem · prosa: **nenhuma** |
| `CancelDelivery` | `open` → `cancelled` | **não desfaz os fatos** | idem · prosa: **nenhuma** |

**`ReleaseOrderItem` é a única operação da cadeia comercial inteira que nomeia uma
permissão**, e o contrato diz por escrito que é "a única da escada que exige". É
exatamente a transição que o legado tranca em ADMINISTRAÇÃO/SUPERVISOR. Os dois
sistemas concordam sobre qual é o ponto sensível — e no Cabinet ela **não é
aplicada em lugar nenhum**: o mock exige só o papel de `orders`, que todo
`operator-sales` tem.

### Compras

| ação | de → para | efeito | quem pode |
|---|---|---|---|
| `CancelPurchaseRequest` | não-`cancelled` **e nenhuma linha em ordem** → `cancelled` | — | papel: `purchases` · prosa: **nenhuma** |
| `CreatePurchaseOrder` | linhas `open`, mesmo fornecedor, mínimo atingido → ordem `draft` | marca as linhas de origem | idem · prosa: `compras:editar` |
| `SendPurchaseOrder` | `draft` → `sent` | grava `sentAt`; fecha para `PUT` | idem · prosa: **nenhuma** |
| `ReschedulePurchaseOrder` | **`sent`** (409 em `draft`) → `sent` | move a data; `expectedAt` fica | idem · prosa: **nenhuma** |
| `CancelPurchaseOrder` | não-`cancelled` (`sent` permitido) → `cancelled` | **devolve as linhas de pedido a `open`** — dois documentos, uma transação | idem · prosa: **nenhuma** |
| `CheckGoodsReceipt` | `draft` → `checked` | trava a grade | prosa: `compras:editar` |
| `PostGoodsReceipt` | `checked` → `posted` | **entrada no kardex**, atômica e não repetível | prosa: **`estoque:movimentar`** — "diferente das outras seis de propósito" |

### Financeiro

| ação | de → para | efeito | quem pode |
|---|---|---|---|
| `CancelFinancialTitle` | `open` **sem baixa** → `cancelled` | — | prosa: `financeiro:editar` |
| `SettleInstallment` | parcela `open` → `settled`; título na última | **gera movimento de caixa** na mesma transação | prosa: **`financeiro:quitar`** + **`financeiro:quitacao-a-menor`** |
| `SettleBatch` | idem, por item | tudo-ou-nada, `batchId` amarra | idem |
| `ReconcileCashMovement` | `reconciledAt` nula → preenchida | grava quem conferiu | prosa: `financeiro:editar` |
| `CreateCashTransfer` | — | dois movimentos ou nenhum | prosa: `financeiro:editar` |

**O financeiro é o único módulo onde a permissão por ação foi pensada até o fim** —
tem inclusive a ação fina `financeiro:quitacao-a-menor`, que é palavra por palavra
a permissão especial nº 45 do legado (`PERMITIR QUITAÇÃO COM VALOR A MENOS`).
Também é o módulo que não tem uma linha de código do lado do front.

### CRM — a entrada da cadeia

| ação | de → para | efeito | quem pode |
|---|---|---|---|
| `MoveCrmOpportunityStage` | estágio → estágio do mesmo funil; `isLost` exige motivo | carimba `closedAt` | papel: `crm` · prosa: **nenhuma** |
| `CreateQuoteFromOpportunity` | `partnerId` preenchido, sem `quoteId` | **cria orçamento vazio** e grava `quoteId` | idem · prosa: **nenhuma** |

### O que separa as 21 das 6

As 21 transições de venda, entrega, compras e CRM estão **inteiras**: contrato,
handler de mock, fronteira em `src/data/`, botão na tela e passagem para o backend
real. As 6 do financeiro e do recebimento estão a **três camadas** de distância —
sem handler de mock, sem `src/data/`, sem tela, sem rota. Não é gradação: é a
diferença entre uma transição que existe e um caminho publicado.

## Os retornos — a metade que falta

O user pediu explicitamente os retornos, e eles são a parte mais vazia do mapa.

| retorno | legado | Cabinet |
|---|---|---|
| **cancelar** | por documento, com verbo `Excluir` separado do `Alterar` | **existe em 7 documentos** — é o retorno bem coberto |
| **devolução de venda** | `Devolucao` 3.810 · `DevolucaoProduto` 11.557 · `DevolucaoDesagio` 3.874 · tela, motivos, 2 permissões especiais | **não existe.** Não há `POST /api/orders/{id}/return`, nem devolução de item entregue, nem nota de devolução |
| **estorno de entrega** | `cep_quantidade_entregueRET` | **não existe** — declarado no contrato como "fase seguinte, ainda não tem caminho" |
| **estorno de baixa** | permissões especiais 7/8/12/31 | **não existe** — declarado: *"a baixa errada se desfaz por decisão de quem pode desfazê-la, e essa decisão não foi tomada"* |
| **desconciliar** | conciliação bancária é tela própria | **não existe** — mesma justificativa |
| **reabrir** | `DESBLOQUEAR NOTA DO FORNECEDOR` (esp. 23) · `EDITAR DATA DE CONCLUSÃO` (esp. 29) | **não existe, e é recusa deliberada**: *"reabertura não existe de propósito: o legado não tem o estado, então não há caso real para copiar"* |

**A recusa da reabertura merece uma nota de divergência**, porque a premissa dela é
medível e não se sustenta inteira. O contrato diz que "o legado não tem o estado".
Correto quanto ao *estado* — o legado não tem um `reopened`. Mas ele tem o *gesto*,
e o gesto é permissão nomeada: `DESBLOQUEAR NOTA DO FORNECEDOR` e `EDITAR DATA DE
CONCLUSÃO` existem exatamente para desfazer um fechamento, e a segunda é concedida
a ADMINISTRAÇÃO e negada a VENDEDORES. **O legado não reabre mudando de estado;
reabre deixando alguém com alçada mexer no carimbo.**

**E a varredura confirma a premissa na parte que importa:** não existe, em todo o
dump, um `UPDATE` que devolva documento de venda ao estado ativo. Cancelamento é
terminal no legado, como é no Cabinet. A decisão está certa.

O que o dado acrescenta é o contorno: **o legado não reabre o documento, e mesmo
assim tem como desfazer um fechamento** — por permissão de alçada que deixa alguém
mexer no carimbo (`EDITAR DATA DE CONCLUSÃO`, concedida a ADMINISTRAÇÃO e negada a
VENDEDORES), e por reversão de quantidade no item, no caso da compra
(`Desfazer Canc.` → `Ocd_quant_cancelada`).

Não é objeção à decisão: é a observação de que **"não reabrir" e "não ter como
corrigir" são coisas diferentes**, e o legado separa as duas. O Cabinet hoje não
tem nenhuma das duas.

## Os buracos, por classe

A classe decide o custo e decide quem paga. Um vocabulário desalinhado é uma
tarde; uma família sem tela é um trilho.

### Classe E — a permissão tem nome e não tem dono

O buraco mais barato e o mais perigoso, porque a tela **parece** protegida.

| E# | O quê | Evidência |
|---|---|---|
| E1 | `venda:liberar-entrega` é declarada pelo contrato como exigência de `ReleaseOrderItem` e **não é aplicada em lugar nenhum** — o mock cobra só o papel de `orders`, que todo `operator-sales` tem | contrato `:11325` e `:23245` · `src/mocks/api/entrega.ts:429` |
| E2 | **A prosa do contrato e o catálogo do mock quase não se encontram:** 17 chaves na prosa, 25 no catálogo, **7 em comum** | comandos na seção final |
| E3 | **10 chaves declaradas e não catalogadas** — `venda:liberar-entrega`, `venda:desconto-acima-do-teto`, `compras:editar`, `financeiro:editar`, `financeiro:quitar`, `financeiro:quitacao-a-menor`, `custo:gerenciar`, `pagamento:gerenciar`, `colaboradores:gerenciar`, `pedidos:imprimir` | idem |
| E4 | **18 catalogadas e nunca nomeadas** — entre elas `orcamento:cancelar` e `pedidos:cancelar`, que são exatamente duas transições existentes | idem |
| E5 | **Nada cruza os dois**, e é decisão declarada: *"as chaves NÃO são enum deste contrato de propósito"* (`ListPermissions`) | contrato `:4926` |
| E6 | 16 das 27 transições **não nomeiam permissão nenhuma**, e a cadeia venda+entrega nomeia uma só | tabela acima |

**E3 tem um caso que costura com o documento irmão:** `venda:desconto-acima-do-teto`
é a permissão especial nº 5 do legado (`MARGEM DE DESCONTO PARA O CLIENTE`,
concedida só a SUPERVISOR e ADMINISTRAÇÃO) e é o que está por trás dos botões
`Alterar Limites` e `🔒 Permissões` do rodapé do orçamento — os dois que
`fluxo-paridade-softlux.md` classificou como "botão desenhado e morto" (C3, C4).
**O contrato já nomeou a permissão que faria aqueles botões funcionarem.** Falta
catalogá-la e aplicá-la.

E1–E3 são a mesma doença em três lugares: **o vocabulário de permissão existe em
três listas que ninguém confere entre si** — a prosa do contrato, o catálogo do
mock e a matriz de papéis. O legado tem uma lista só, e ela é o próprio mecanismo.

### Classe F — a transição não pergunta pelo estado dos outros

| F# | O quê | Evidência |
|---|---|---|
| F1 | **`ConcludeOrder` não olha o físico** — concluir com todas as linhas `pending` responde 200. No legado a conclusão exige as entregas fechadas | declarado como blocker na própria `description` de `ConcludeOrder` |
| F2 | Liberar, separar e entregar num pedido **`concluded`** é livre — as guardas recusam só `cancelled` | `src/mocks/api/entrega.ts:436`, `:487` |
| F3 | `CreateDelivery` não recusa pedido `concluded` | `src/mocks/api/entrega.ts:632` |
| F4 | `CancelOrder` **não desfaz separação nem entrega** — cancela um pedido com linhas já `picked` e o estoque fica baixado | `src/mocks/api/pedidos.ts:1045` |

F1 é o mais grave e é o único já declarado no contrato. F2–F4 não estão declarados
em lugar nenhum: são silêncio, não decisão.

### Classe G — o elo não existe

| G# | O quê | Evidência |
|---|---|---|
| G1 | **Não há elo pedido de venda → financeiro.** `FinancialTitleDto.sourceType` enumera `sale_order` e diz que é "o título que o pedido de venda gerou" — e **não existe operação que o produza**. `FinancialTitleWriteRequest` não tem `sourceType` nem `sourceId` | contrato, `FinancialTitleDto` × `FinancialTitleWriteRequest` |
| G2 | Não há elo recebimento → financeiro, pelo mesmo motivo (`goods_receipt` é valor do mesmo enum) | idem |

**G1 é o buraco central desta cadeia.** O legado carimba `Ven_TemFinanceiro` na
própria venda; o Cabinet publica o campo que rastreia a origem e não publica o
gesto que a produz. A cadeia comercial termina na entrega, e o financeiro começa
em `manual`.

### Classe H — o retorno não existe

| H# | O quê | Volume no legado |
|---|---|---|
| H1 | **devolução de venda** — não há `POST /api/orders/{id}/return`, nem devolução de item entregue, nem nota de devolução | `Devolucao` 3.810 · `DevolucaoProduto` 11.557 · `DevolucaoDesagio` 3.874 |
| H2 | **estorno de entrega** — declarado sem caminho | `cep_quantidade_entregueRET` existe |
| H3 | **estorno de baixa financeira** — declarado, decisão de alçada não tomada | perms. especiais 7/8/12/31 |
| H4 | **desconciliar** — declarado, mesma razão | conciliação é tela própria |

**H1 não é lacuna de borda.** Um documento de devolução para cada nove de venda:
um Cabinet sem devolução não atende um nono do movimento real da Vertz. E é a
única das quatro que **não está declarada em lugar nenhum** — H2, H3 e H4 têm
parágrafo escrito no contrato explicando a ausência; H1 não é mencionada.

### Classe I — a família está a três camadas da tela

| I# | Família | Contrato | Mock | `src/data/` | Tela |
|---|---|---|---|---|---|
| I1 | financeiro (título, parcela, baixa, caixa) | sim | **não** | **não** | **não** |
| I2 | recebimento (`/api/goods-receipts`) | sim | **não** | **não** | **não** |

As duas ficam inteiras no mock por regra de família, e a razão está escrita:
*"meia família põe id do servidor de um lado e id inventado do outro, e aqui os
dois lados são dinheiro."* A decisão é boa; o efeito é que **6 das 27 transições
não existem para o operador**, e são justamente as que fecham a cadeia (G1) e as
que o legado protege com mais permissões especiais.

O I2 tem um detalhe que vale a issue: o motivo registrado para o recebimento não
ter mock — *"a grade confronta o que a ordem de compra pediu com o que chegou, e o
mock não guarda ordem"* — **está vencido**: `src/mocks/api/compras.ts` guarda ordem
desde que compras saiu da lista de sem-handler.

### Classe J — divergência entre o mock e o contrato

| J# | O quê | Evidência |
|---|---|---|
| J1 | **`PUT /api/quotes/{id}` aceita orçamento cancelado.** O contrato é explícito: *"orçamento cancelado não aceita alteração — é 409, não 400"*. O handler não tem a checagem, e não há teste | `src/mocks/api/quotes.ts:769-795` × `UpdateQuote.description` |
| J2 | `PickOrderItem` no mock **não move estoque** — grava o fato e inventa um `stockMovementId` que não corresponde a nenhuma linha do kardex | `src/mocks/api/entrega.ts:342-350`, `:513` |

J1 é defeito com conserto de uma linha (o irmão `pedidos.ts:997` já faz certo, com
`documentoEncerrado`). J2 é dívida conhecida do mock, não do contrato.

### Classe K — anotações vencidas que enganam a próxima leitura

Encontradas de passagem, e valem porque este repositório trata declaração vencida
como classe de defeito:

| K# | O quê | Realidade |
|---|---|---|
| K1 | `whitelist-do-contrato.test.ts:431,433` marca `ListPickingQueue` e `ListDeliveries` como sem handler | `src/mocks/api/entrega.ts:533` e `:587` os servem |
| K2 | O mesmo arquivo (`:199-201`) marca as duas como sem tela | `src/features/carga/quadro-de-cargas.tsx` e `src/routes/vendas/cargas.tsx` existem |
| K3 | Comentário `:413-416` diz que `/api/orders` "handler nenhum o responde" | `src/mocks/api/pedidos.ts:892` responde |
| K4 | `:463` — reserva técnica "nasce de um pedido de venda, que o mock não guarda" | `pedidos.ts` guarda |

## Issues propostas — uma por buraco, para o user triar

**Nenhuma destas foi aberta.** São propostas, com a classe, o custo estimado em
natureza (não em prazo) e a dependência. A ordem é de dependência, não de valor.

### P1 — `venda:liberar-entrega` deixa de ser prosa (classe E)

A permissão que o contrato declara como exigência da liberação não é aplicada por
ninguém. Fechar exige: pôr a chave no catálogo do mock, aplicá-la no handler de
`ReleaseOrderItem` e tratar o 403 na tela — que é o que `src/data/entrega-api.ts`
já prescreve.

**Depende de** o vínculo publicar as permissões efetivas (api#84 fase 3). Enquanto
não publicar, o front não tem como saber se o operador a tem. **Custo:** pequeno
depois da dependência; **zero antes, e é o ponto** — hoje a tela mostra o botão a
todo `operator-sales`, e o legado o tranca em dois grupos de sete.

### P2 — uma lista só de permissões, conferida por teste (classe E)

Hoje o vocabulário vive em três lugares que ninguém cruza: a prosa das descrições,
o catálogo do mock e a matriz de papéis. Propor um teste que falhe quando uma
descrição nomeia chave fora do catálogo, e quando o catálogo publica chave que
nenhuma operação consome.

**Nota de rota:** o contrato declara de propósito que as chaves não são enum dele,
para o catálogo poder crescer sem mexer no contrato. O teste proposto **não muda
essa decisão** — cruza os dois artefatos sem tornar um refém do outro. **Custo:**
um teste. **Acha hoje: 28 divergências** — 10 chaves declaradas e não catalogadas,
18 catalogadas e nunca nomeadas, contra 7 que se encontram.

### P3 — `ConcludeOrder` olha o físico (classe F)

Blocker já escrito no contrato. Concluir deve recusar pedido com linha não
entregue, ou aceitar com uma razão registrada. **Decisão do user antes do código:**
recusa dura, ou recusa com força + motivo? O contrato adverte que *"um `force` sem
recusa para forçar continuaria sendo botão sem efeito"*.

**Custo:** pequeno no mock e na tela; a decisão é que é cara.

### P4 — as guardas que faltam nas transições físicas (classe F)

F2, F3 e F4 numa issue só, porque são a mesma pergunta: **o que um pedido
`concluded` ou `cancelled` ainda aceita?** Hoje aceita liberar, separar, entregar e
abrir romaneio. E cancelar um pedido com peça já separada deixa o estoque baixado
sem nada apontar para isso.

**Custo:** pequeno. **Risco de não fazer:** estoque errado sem rastro, que é a
classe de defeito que este repositório já registrou como "só aparece contra dado
real".

**O formato da resposta já existe nos dois sistemas.** No legado, cancelar venda é
um bundle que toca oito documentos numa transação (ver acima). No Cabinet,
`CancelPurchaseOrder` já faz exatamente isso — devolve as linhas do pedido a
`open`, dois documentos, uma transação. **F4 é aplicar ao cancelamento da venda o
padrão que o cancelamento da ordem de compra já tem.**

### P5 — o elo pedido de venda → financeiro (classe G)

O buraco central. `sourceType: 'sale_order'` é campo publicado sem gesto que o
produza. Exige caminho novo no contrato (`POST /api/orders/{id}/titles` ou
equivalente), e a pergunta de modelo é do user: **o título nasce da conclusão do
pedido, da entrega, ou de um ato próprio de faturar?** No legado é bit
(`Ven_TemFinanceiro`) e há permissão especial para quitar de dentro da venda
(nº 7), o que sugere ato próprio.

**Depende de** I1 (o financeiro ter tela). **Custo:** contrato + backend + tela.
É trilho, não tarefa.

### P6 — devolução de venda (classe H)

A ausência não declarada, e a de maior volume real: 3.810 documentos no legado,
com deságio próprio e duas permissões especiais (24, 31). Exige modelo novo:
devolução total × parcial, retorno ao estoque, estorno financeiro, motivo.

**Nota:** o legado separa quem lança de quem ajusta — VENDEDORES têm `I..CI` e
COMPRAS têm `IA.CI` na Devolução de Venda. Esse recorte é desenho de permissão, e
o Cabinet não tem hoje como expressá-lo.

**Depende de** P5 (o estorno financeiro precisa do elo). **Custo:** trilho.

### P7 — o estorno de entrega (classe H)

`cep_quantidade_entregueRET` é a metade que falta de um modelo que já é compatível
— o Cabinet conta quantidade entregue como o legado, e não conta a devolvida.
Menor que P6 e independente dele: dá para devolver peça ao saldo sem ter documento
de devolução comercial.

**Custo:** contrato + mock + tela da carga. **Já nomeado** na descrição de
`CancelDelivery`.

### P8 — financeiro e recebimento saem das três camadas (classe I)

I1 e I2. São as duas famílias sem mock, sem fronteira e sem tela. Não cabem numa
issue: proposta é **uma issue por família**, e o recebimento primeiro — ele é menor,
fecha a cadeia de compras (a aresta 9-10 que o documento irmão já apontou) e **o
motivo registrado para ele não ter mock está vencido**, o que baixa o custo de
entrada.

### P9 — corrigir documento fechado sem reabri-lo (classe H)

**A decisão de não ter reabertura está confirmada pelo dado** — zero `UPDATE`
devolvendo venda a ativo, em todo o dump. Esta proposta não a reabre.

O que fica em aberto é o vizinho: o legado não reabre e **tem como corrigir** —
alçada para mexer no carimbo (esp. 26 e 29) e reversão por quantidade no item da
compra (`Desfazer Canc.`). O Cabinet não tem nenhum dos dois, e o efeito prático é
que **um pedido concluído por engano não tem saída nenhuma**.

**Custo:** uma conversa antes de qualquer código. A pergunta ao user é estreita:
concluído por engano — refaz o documento, ou alguém com alçada corrige a data?

### P10 — limpar as anotações vencidas (classe K)

K1–K4, quatro declarações que dizem "não existe" sobre coisa que existe. Custo de
minutos, e o motivo de fazer é o que este repositório já escreveu sobre o assunto:
**declaração vencida manda o próximo agente escrever o que já está escrito.**

### As perguntas que a triagem precisa responder, e que este documento não decide

Cinco pontos onde o dado é claro e a decisão é do user. Nenhum deles é
implementável sem resposta, e três são baratos de responder.

1. **A trava de liberação: obrigatória ou opcional?** O legado tem
   `Par_ControleSepEntProdutos` e a Vertz opera com ela em **`False`**. Copiar como
   obrigatória muda o trabalho de quem usa o sistema hoje; copiar como parâmetro
   acrescenta uma flag. (Afeta P1.)
2. **O título financeiro nasce de quê?** Da conclusão do pedido, da entrega, ou de
   um ato próprio de faturar? No legado é um bit (`Ven_TemFinanceiro`) e existe
   permissão para quitar de dentro da venda, o que sugere ato próprio. (Bloqueia P5.)
3. **A conferência é uma etapa do trabalho?** `Controle_entrega` guarda uma
   janela (`Ced_DataConferenciaInicial`/`Final`) e o painel do legado tem
   "Para entregar (**conferidos**)" como situação própria. O Cabinet vai de
   `picked` a `delivered` sem esse meio. Se conferir é um ato de alguém, falta um
   marco; se é parte de separar, não falta nada.
4. **Concluir com pendência: recusa dura ou força com motivo?** (Bloqueia P3.)
5. **Concluído por engano tem saída?** (Bloqueia P9.)

### O que este documento NÃO propõe

- **Copiar o `Quadro de Cargas` do legado.** As tabelas têm zero linhas; a entrega
  real roda em `Controle_entrega`. Replicar a tela do menu seria replicar a que
  ninguém abriu.
- **Fundir orçamento e pedido num registro só** (`Ven_Tipo`). É divergência de
  modelo, e a do Cabinet — dois documentos ligados por `quoteId` — preserva o
  orçamento depois da conversão, que o legado perde. Fica registrada como
  divergência consciente, não como lacuna.
- **Trocar a matriz de papéis por permissão por ação.** Já foi decidido (api#84) e
  tem dono. Este documento só nomeia as transições que vão precisar de chave
  quando aquilo chegar.

## Como re-medir

Contra a raiz do `cabinet-erp-web`. Nenhum número deste documento é de leitura: os
comandos abaixo produziram todos eles.

```sh
# Os 7 grupos reais e quantas das 287 opções cada um alcança.
python3 - <<'PY'
import csv, collections
b = 'docs/legado/config/'
gr = {r['Cod_grupo']: r['Descricao']
      for r in csv.DictReader(open(b+'sisgrupo_usuario.csv', encoding='utf-8-sig'), delimiter=';')}
V = ['Inserir','Alterar','Excluir','Consultar','Imprimir']
c = collections.Counter()
for r in csv.DictReader(open(b+'sispermissao.csv', encoding='utf-8-sig'), delimiter=';'):
    if any(r[v].strip().upper() == 'X' for v in V):
        c[gr.get(r['idGrupo'], r['idGrupo'])] += 1
for g, n in c.most_common(): print(g, n)
PY

# Quem alcança cada transição do ciclo, por verbo. Os ids saem de sisopcoes.csv:
# 327 liberar · 273 concluir · 41 devolução · 230 quadro de carga · 226 fechamento de contas.
python3 - <<'PY'
import csv
b = 'docs/legado/config/'
gr = {r['Cod_grupo']: r['Descricao']
      for r in csv.DictReader(open(b+'sisgrupo_usuario.csv', encoding='utf-8-sig'), delimiter=';')}
ops = {r['id']: r['Caption'].strip('-> ').strip()
       for r in csv.DictReader(open(b+'sisopcoes.csv', encoding='utf-8-sig'), delimiter=';')}
V = ['Inserir','Alterar','Excluir','Consultar','Imprimir']
for r in csv.DictReader(open(b+'sispermissao.csv', encoding='utf-8-sig'), delimiter=';'):
    if r['id'] in ('327','273','41','230','226'):
        print('%-38s %-16s %s' % (ops[r['id']][:38], gr.get(r['idGrupo'], '?'),
              ''.join(v[0] if r[v].strip().upper() == 'X' else '.' for v in V)))
PY

# As 52 permissões por AÇÃO do legado, e as 121 negações explícitas.
cat docs/legado/config/sisopcoes_especial.csv
cut -d';' -f5 docs/legado/config/sispermissao_especial.csv | sort | uniq -c

# Os 9 campos de ciclo da Venda. O regex é fechado de propósito: 'Ven_Tipo' solto
# casa Ven_TipoDesc e Ven_TipoEntrega de carona e devolve 11.
grep -E '^"Venda",' docs/legado/schema/bdprincipal-colunas.csv | grep -cE \
 '"(Ven_Situacao|Ven_Tipo|Ven_LiberaSeparacao|Ven_LiberaEntrega|Ven_TemFinanceiro|Ven_TemCompra|Ven_TemEstoque|Ven_DataFechaVenda|Ven_DataConclusao)"'

# A evidência de que orçamento e pedido são DUAS linhas, não uma que muda de tipo.
grep -n 'Ven_Orcamento\|ParSV_numero' docs/legado/schema/bdprincipal-colunas.csv
grep -c 'SET Ven_Tipo' docs/legado/exe/sql-do-codigo.sql docs/legado/exe/sql-por-tela.sql

# O ledger de separação e entrega, e o cálculo do saldo com sinal.
grep -n "cep_operacao\|cep_tipo" docs/legado/schema/bdprincipal-colunas.csv
grep -n "CalcSep\|cep_operacao='R'" docs/legado/exe/sql-do-codigo.sql

# As transições escritas: cancelamento (3), liberação (4) e quitação.
# Atenção ao espaço antes do '=' — o literal é "Ven_LiberaSeparacao =1".
grep -n "ven_situacao ='C'" docs/legado/exe/sql-do-codigo.sql
grep -n "Ven_LiberaSeparacao\|Ven_LiberaEntrega" docs/legado/exe/sql-do-codigo.sql
grep -n "Ctr_situacao='S'\|Ctp_status = 'A'\|ctr_situacao='N'" docs/legado/exe/sql-do-codigo.sql

# Zero resultados = cancelamento de venda é TERMINAL no legado.
grep -ci "SET ven_situacao='A'" docs/legado/exe/sql-do-codigo.sql

# Os dois gates que a Vertz opera DESLIGADOS.
grep -n "ControleSepEntProdutos\|EntregaComDuplicata\|RequisicaoProdutos" docs/legado/config/paramentros.csv

# O banco não tem lógica de ciclo: 1 trigger, nenhuma procedure de status.
grep -c "CREATE TRIGGER" docs/legado/schema/bdprincipal-rotinas.sql
wc -l docs/legado/schema/bdprincipal-gatilhos.csv

# O que é usado e o que só está instalado — a medição que reordena a prioridade.
grep -iE 'entrega|carga|devolu|contas_receber|^"Venda"' docs/legado/schema/bdprincipal-linhas.csv

# O vocabulário de permissão nos três lugares que ninguém cruza.
grep -oE '`[a-z]+:[a-z-]+`' contracts/openapi-v1.json | tr -d '`' | sort -u   # a prosa
grep -oE "'[a-z]+:[a-z-]+'" src/mocks/api/acesso.ts | tr -d "'" | sort -u     # o catálogo
sed -n '/PAPEL_MINIMO_POR_FAMILIA/,/^}/p' src/data/papeis.ts                  # a matriz

# As transições que não nomeiam permissão: toda operação de ciclo do contrato.
python3 -c "
import json
d = json.load(open('contracts/openapi-v1.json'))
for p, ms in d['paths'].items():
    for m, o in ms.items():
        if isinstance(o, dict) and any(s in p for s in ('cancel','conclude','release','pick','close','send','check','post','settle','revise','reconcile')):
            print(m.upper(), p, '|', o.get('operationId'))
"
```

O último comando é o que sustenta a frase *"16 das 27 não nomeiam permissão"*:
lista as operações de ciclo, e a leitura de cada `description` diz se há chave.


