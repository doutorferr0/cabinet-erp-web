---
name: Cabinet
description: Sistema visual de um ERP denso, desktop, em PT-BR — documento comercial com estrutura neo-brutalista de superfícies cinzas delimitadas por traço preto, elevação em degraus e acento saturado.
colors:
  bench: "hsl(47 31% 94%)"
  sheet: "hsl(0 0% 100%)"
  sheet-sunken: "hsl(0 0% 97%)"
  neutral: "hsl(0 0% 96%)"
  ink: "hsl(0 0% 7%)"
  ink-muted: "hsl(0 0% 30%)"
  ink-strong: "hsl(0 0% 7%)"
  rule-hair: "hsl(0 0% 72%)"
  surface-disabled: "hsl(0 0% 92%)"
  rule-disabled: "hsl(210 8% 40%)"
  main: "hsl(0 0% 7%)"
  main-hover: "hsl(0 0% 10%)"
  main-foreground: "hsl(0 0% 100%)"
  accent: "hsl(262 97% 76%)"
  info: "hsl(225 71% 75%)"
  money: "hsl(155 81% 26%)"
  danger: "hsl(357 84% 42%)"
  warn: "hsl(47 100% 50%)"
  ring: "hsl(47 100% 50%)"
  empresa: "hsl(234 91% 60%)"
  fill-money: "hsl(88 51% 71%)"
  fill-focus: "hsl(44 87% 64%)"
  fill-error: "hsl(355 76% 64%)"
  zone-money: "hsl(154 96% 91%)"
  zone-id: "hsl(263 94% 93%)"
  zone-info: "hsl(223 69% 95%)"
  zone-warn: "hsl(48 100% 95%)"
  zone-danger: "hsl(6 76% 95%)"
  shadow-1: "hsl(40 10% 60%)"
  shadow-2: "hsl(40 11% 47%)"
  shadow-3: "hsl(40 13% 36%)"
  shadow-4: "hsl(40 14% 27%)"
  shadow-5: "hsl(40 16% 19%)"
typography:
  nome:
    fontFamily: "Newsreader, ui-serif, Georgia, serif"
    fontSize: "1.15em"
    fontWeight: 400
  display:
    fontFamily: "Newsreader, ui-serif, Georgia, serif"
    fontSize: "1.85rem"
    fontWeight: 700
    letterSpacing: "-0.005em"
  headline:
    fontFamily: "Sora, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.35rem"
    fontWeight: 700
    letterSpacing: "-0.012em"
  produto:
    fontFamily: "Sora, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
  value:
    fontFamily: "PT Mono, ui-monospace, monospace"
    fontSize: "1.5rem"
    fontWeight: 400
    fontFeature: "tabular-nums"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
  control:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
  numeric:
    fontFamily: "PT Mono, ui-monospace, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    fontFeature: "tabular-nums"
  tag:
    fontFamily: "PT Mono, ui-monospace, monospace"
    fontSize: "10px"
    letterSpacing: "0.12em"
    textTransform: "uppercase"
  meta:
    fontFamily: "PT Mono, ui-monospace, monospace"
    fontSize: "11px"
    letterSpacing: "0.12em"
    textTransform: "uppercase"
  section:
    fontFamily: "PT Mono, ui-monospace, monospace"
    fontSize: "10.5px"
    letterSpacing: "0.16em"
    textTransform: "uppercase"
rounded:
  item: "0px"
  data: "2px"
  control: "4px"
  card: "6px"
  panel: "10px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "18px"
  cell: "52px"
effects:
  el-1: "2px 2px 0 0 hsl(214 10% 61%)"
  el-2: "3px 3px 0 0 hsl(215 11% 47%)"
  el-3: "4px 4px 0 0 hsl(216 13% 36%)"
  el-4: "6px 6px 0 0 hsl(216 14% 27%)"
  el-5: "8px 8px 0 0 hsl(217 16% 19%)"
  border-strong: "2px solid hsl(0 0% 0%)"
  border-heavy: "3px solid hsl(0 0% 0%)"
---

# Design System: Cabinet — Polaris por baixo, Cabinet por cima (2026-08-18)

> **A UNIÃO (decisão do user, 2026-08-18).** A leva Polaris (#195 em diante) trouxe superfícies,
> raios e densidade prontos, e levou junto três peças que são a identidade deste sistema. Elas
> voltam, e a divisão de donos passa a ser esta:
>
> | camada | dono | valor |
> |---|---|---|
> | fundo, cartão, afundado | Polaris | `#F1F1F1` · branco · `#F7F7F7` |
> | raios | Polaris | 8px controle/item · 12px cartão/painel |
> | cinzas de texto, densidade | Polaris | `--muted-foreground` 30% |
> | **contorno** | **Cabinet** | preto de tinta 2px, **inclusive entre linhas da grade** |
> | **foco** | **Cabinet** | anel amarelo 3px + fio preto 4px |
> | **tipografia e hierarquia** | **Cabinet** | Newsreader · Sora · Inter · PT Mono, regra semântica |
> | **sombra** | **Cabinet** | hard-offset, 5 degraus, nunca preta |
> | zonas, ornamento, cor de módulo | **Cabinet** | intactos |
>
> **A ação é PRETA**, não violeta: ela se distingue do contorno por preenchimento, não por matiz.
> Toda frase desta página que chame o violeta de "cor que move" descreve a fase 1.6 e está
> anotada como histórico onde aparece.


> **A identidade do Cabinet passou a ser dele** (sessão com o user, 2026-08-13): marca desenhada
> pelo user em dois pesos, tipografia de 4 famílias com regra SEMÂNTICA, superfícies cinzas no
> lugar do creme. As três seções que isso reescreve são **Superfícies**, **Typography** e **a
> sidebar/marca**; a **Sombra** trocou de família junto. **Todo número de contraste medido contra
> a bancada creme foi refeito** — quem citar um valor antigo desta página está citando medição
> inválida. Os números vivem na **§Medição de contraste**, em tabelas GERADAS: mexeu em token de
> cor, rode `python3 docs/design/medir-contraste.py --conferir` antes de fechar.

> **Supersede a fundação "Brut sobre papel" (fases 1 e 2).** Amostra de referência aprovada pelo user:
> `docs/design/amostra-fase-1.5.html` (v5, 2026-08-06). **Em divergência entre este doc e a amostra, a AMOSTRA vence.**
> O mockup anterior (`docs/design/mockup-brut-papel.html`) vira histórico: o que ele decidiu e a amostra
> não contradiz continua valendo (densidade, vocabulário, zonas por conteúdo, dinheiro em verde).
> Refs: neobrutalism.dev · `ekmas/neobrutalism-components` (**referência VISUAL apenas** — o código é
> Radix/shadcn e a base de primitivos aqui é `react-aria-components`, decisão do spike de 2026-08-04).

## Overview

O ERP continua documento comercial — orçamento é invoice, listagem é ledger, produto é ficha técnica.
O que muda na 1.5 é o **acabamento**: a fundação anterior era preta e chapada (caixa preta, sombra preta,
canto reto em tudo, cabeçalho em barra preta). Ela lia como maquete de protesto, não como ferramenta de
trabalho de oito horas. A 1.5 mantém o traço de 2px e a densidade, e troca o resto por três decisões:

1. **Elevação de verdade** — 5 degraus de sombra, sem blur, na **família do papel** (quente até
   2026-08-12, neutra-fria desde a troca das superfícies). Sombra preta vira buraco na tela;
   sombra cor-de-papel projeta como papel sobre papel.
2. **Canto por natureza** — o raio diz o que a coisa é: painel 10px, cartão 6px, controle 4px, dado 2px,
   **item 0**. Item é o que encosta em item (chip, aba, página, célula, item de menu, etiqueta): canto
   arredondado ali abre fresta e desmancha a fileira.
3. **Cor que move** — ~~violeta saturado~~ **preto cheio** é a AÇÃO (primária, linha selecionada,
   aba ativa), desde a leva Polaris; o violeta ficou com marca e realce. O amarelo segue no que ele
   sempre foi bom: **foco** e pendência — e o foco é dele de volta desde 2026-08-18.

Princípios que NÃO mudaram: densidade de comanda vence respiro decorativo · vocabulário literal do
legado SoftLux · desktop-only, largura inteira · número tabular à direita · mono para identificador ·
interação por clique · nada anima na entrada de tela.

**O que a 1.6 acrescentou** (a 1.5 continua valendo no que ela não contradiz): a queixa era
"escuro/triste/sem cor", e a resposta tem três partes. **Cor** — folha clara sobre bancada (então
cremes, cinzas desde 2026-08-13),
as cinco zonas viram os pastéis /02 da paleta, e cada módulo ganha um par fixo trocado por escopo.
**Movimento** — entrada de tela numa mola, peça que aparece com outra, e o hover que PULA (§3b),
porque o da 1.5 foi avaliado como fraco. **Ornamento** — uma forma colorida por módulo, recortada
por máscara, jamais preta.

**Key characteristics:**
- Bancada CINZA com grade de 52px no fundo; folhas de trabalho um degrau de luz acima pousam OPACAS por cima (o creme saiu em 2026-08-13)
- Traço PRETO de 2px em toda caixa — o preto ficou no traço, saiu do preenchimento e da sombra. **Com as duas superfícies cinzas a 1,10:1, é o traço que delimita a folha**: suavizá-lo faz a folha sumir
- **Elevação em 5 degraus** com sombra neutra-fria (`el-1` apoio · `el-2` campo · `el-3` padrão · `el-4` destaque · `el-5` modal)
- **Etiqueta invertida**: rótulo de seção, rótulo de campo e cabeçalho de coluna são **caixa clara com letra preta**. A força vem da borda, da caixa alta e do tracking — não do fundo cheio
- **Superfície tintada por conteúdo**, nos pastéis /02 da paleta: valor · identidade · apoio · pendência · bloqueio. A cheia /01 só entra em elemento compacto
- **Um par de cor fixo por módulo**, trocado por escopo (`data-modulo`), com um shape de ornamento fixo
- **Faixa de acento**: painel importante ganha barra de 8px na lateral esquerda, com traço à direita
- Dinheiro escreve em VERDE, negativo em vermelho; célula de valor ganha fundo da zona
- Foco = **amarelo 3px com fio preto de 1px por fora**, em todo controle (§Foco)
- **Cinco** famílias, todas **self-hosted**, divididas por SEMÂNTICA: Newsreader (quem — nome de entidade e o H1 da tela, **exceto** o da banda de identidade, que fala em condensada desde 2026-08-19) · Sora (o quê — produto, descrição e cabeçalho de H2 para baixo) · Inter (UI) · PT Mono (quanto — número, código, data) · Bebas Neue (número-herói — nome e número do documento, total, contagem do cartão; só pelo `<NumeroHeroi>`)
- **Serifada não leva caixa alta**: o título ficou com maiúscula só na inicial dos substantivos; caixa alta segue em mono e Inter (etiqueta, carimbo, cabeçalho de coluna)

## Colors

### Superfícies — fundo cinza e cartão branco (Polaris, 2026-08-18)
| papel | uso |
|---|---|
| Fundo `#F1F1F1` (`0 0% 95%`) | fundo do app, sidebar e header |
| Cartão `#FFFFFF` (`0 0% 100%`) | superfície de trabalho: painel, cartão, campo, tabela |
| Afundado `0 0% 97%` | degrau INTERNO do cartão: compartimento, trilho, skeleton |
| Neutro `0 0% 96%` | hover de item, cabeçalho de grade |

O par anterior (Bancada `#E8EAED` × Folha `#F4F5F7`, 2026-08-13) é histórico. O mecanismo abaixo
NÃO é: ele vale igual, e com folga menor — o degrau de luz caiu de 1,10:1 para **1,12:1** entre
duas superfícies que agora são cinza e branco.

**O creme SAIU, e o que se perde junto é um MECANISMO — não um tom.** Até 2026-08-12 bancada e
folha se separavam por **matiz**: creme quente embaixo, cinza frio em cima (decisão do user de
2026-08-09). O degrau térmico carregava a separação sozinho, e por isso a diferença de luz podia
ser mínima. Hoje o par é fundo cinza × cartão branco e a separação continua sendo só de
**luminância**, de propósito baixa: **1,12:1 medido**.

**Consequência dura, e é a linha mais importante desta seção: quem delimita o cartão é o
CONTORNO PRETO de 2px.** Confirmado em listagem densa renderizada. Funciona, mas só enquanto o
traço estiver lá — se alguém propuser "suavizar a borda" depois, o cartão não fica mais leve, ele
**desaparece**. É a mesma economia do ornamento: o traço delimita, e aí o preenchimento fica livre.

**Isto já foi desfeito uma vez e custou caro:** a leva Polaris baixou `--border` para 55% de luz
(3,35:1 sobre o cartão) e a caixa virou sugestão. Voltou a preto de tinta em 2026-08-18 —
**18,76:1 sobre o cartão, 16,79:1 sobre o fundo** — com teste de invariante segurando o token,
porque regra escrita em página não impediu a primeira vez.

O **Afundado** fica a 3 pontos de luz do cartão. Ele não é zebra de listagem — a grade separa
linha por TRAÇO, não por alternância de fundo; o afundado serve compartimento, trilho e skeleton.

**Contrastes remedidos**, todos na §Medição de contraste — daqui em diante os números moram lá, e
esta seção só guarda o que a medição OBRIGOU. O texto secundário está em **L 30%** (Polaris):
**8,52:1** sobre o cartão, **7,63:1** sobre o fundo, **7,98:1** sobre o afundado. Os números
anteriores desta página foram medidos contra as superfícies da 1.6 e **não valem mais**.

### Zonas por conteúdo — os pastéis /02 da paleta (1.6)
Valor `#D2FEEB` · Identidade `#E9DCFE` · Apoio `#E9EEFB` · Pendência `#FFFAE5` · Bloqueio
`#FCEBE9`. Eram cremes tingidos a ~30% de saturação, que sobre folha creme mudavam o tom do papel
sem nomear conteúdo nenhum. A zona diz do que a área trata **antes de o operador ler o rótulo**;
por isso é exclusiva — zona espalhada em dado comum deixa de significar.

Nenhum par piorou na troca: dinheiro sobe de 4,65:1 para **5,03:1** sobre a zona de valor,
negativo para **5,22:1** sobre a de bloqueio, e preto fica entre **16,18:1** e **20,05:1** nas
cinco. É o texto SOBRE a zona que passa; a zona contra o papel em volta mede ~1,1:1 e quem a
delimita é o traço — §Medição de contraste.

### Cor de MÓDULO — /02 pinta a seção, /01 pinta o dado
Cada módulo tem um par fixo, trocado por **escopo** (`data-modulo` no shell) e lido pelas
utilities `bg-modulo` (pastel /02), `bg-modulo-cheia` (cheia /01) e `text-modulo`.

**Atualizado 2026-08-09:** cores NEON (decisão do user, mockup-dashboard-cores.html).

| Módulo | Cor /01 | /02 | Shape do ornamento |
|---|---|---|---|
| Produtos | Cyan neon `#00E5FF` | `#CEF9FD` | `brutalist-shape-159` (etiqueta serrilhada) |
| Estoque | Azure neon `#0091FF` | `#D1ECFF` | `brutalist-072` (empilhamento) |
| Vendas / Orçamento | Violeta neon `#7C3DFF` | `#ECE8FD` | `brutalist-shape-128` (documento) |
| Compras / Pedidos | Magenta neon `#FF2D95` | `#F9E7FE` | `brutalist-022` (sacola) |
| Clientes | Fúcsia neon `#E620FF` | `#F0E3FF` | `brutalist-064` (pessoa) |
| Fornecedores | Índigo neon `#3D5AFE` | `#E0E7FF` | `brutalist-029` (galpão) |
| Profissionais | Púrpura neon `#B026FF` | `#F7E8FF` | `brutalist-shape-133` (crachá) |
| CRM | Verde neon `#00E676` | `#D2FCE7` | `brutalist-011` (cintura — o funil) |
| Boletim | Laranja neon `#FF6B2C` | `#FFDFDB` | `brutalist-shape-135` (anéis) |

**Dashboard, Planner e Tarefas** emprestam o laranja do Boletim (`#FF6B2C`) com shapes
próprios (`b014`, `s120`, `b011`). **Colaboradores** empresta o rosa de Clientes (`#E620FF`)
com shape `s101`. O empréstimo vale no ITEM DE MENU; `moduloDaRota` continua sem conhecer essas
rotas para não tingir a folha inteira.

**A nona cor existe desde 2026-08-13, e foi o user quem a escolheu** — esta página dizia
"nenhuma nona cor foi inventada", o que valia enquanto a decisão de 2026-08-09 era pelo REÚSO
(a cor lendo-se como FAMÍLIA: laranja = acompanhamento, rosa = cadastro de pessoa). O **CRM**
entrou com par próprio porque reusar não cabia: o magenta do mapa de tabelas (`#B0306B`) cai no
**mesmo hue 330 do módulo Compras**, e dois módulos no mesmo matiz derrubam "mesmo módulo, mesma
cor". A faixa 151 é a única larga que sobrava — o resto se aperta entre 186 e 330.

Os pares **não passam pelo `@theme inline`**: ali `--color-x: hsl(var(--y))` é substituído no
`:root`, e o valor já resolvido é o que os filhos herdam — redefinir `--modulo-01` num
descendente não mudaria nada. A troca por escopo só funciona porque as utilities leem a `var()`
no elemento que pinta.

Risco das cores neon: têm baixo contraste contra branco POR CONSTRUÇÃO. Quem delimita a forma
é o traço preto (~20:1), e o preenchimento fica livre para ser neon.

> **O verde do CRM encosta no verde que tem DONO — medido, e é decisão do user (2026-08-13).**
> A regra §Acentos diz "verde = dinheiro, e só", e a §Ornamento tira as três cores com dono da
> paleta decorativa. O par do CRM entra por cima disso, e os números dizem quanto:
>
> - **`/02` do CRM × zona de VALOR: 1,02:1.** `150 92% 90%` contra `154 96% 91%` — para o olho é
>   a mesma cor. A zona de valor existe para dizer "aqui tem dinheiro" **antes** de o operador ler
>   o rótulo; num painel de CRM inteiro tingido dessa cor, ela para de dizer isso.
> - **`/01` do CRM × `fill-money` (Grass): 1,08:1** — chip de dinheiro e preenchimento do módulo
>   viram o mesmo verde. Contra o verde de TEXTO (`--money`) e o carimbo `done` a distância é
>   3,29:1, que separa, mas não muito.
>
> **Não é reprovação de WCAG** (é cor contra cor, não texto contra fundo) e não mexi em nada. É
> colisão SEMÂNTICA: o sistema tem uma cor que significa dinheiro, e agora tem um módulo da mesma
> família. Três saídas, todas do user: aceitar e escrever aqui que na tela de CRM a zona de valor
> deixa de ser lida por cor · afastar a luz do `/02` do CRM da luz da zona · ou trocar a faixa do
> CRM, sabendo que 151 era a única larga livre.

### Ícone lucide colorido por módulo (2026-08-09)
Ícones de ação do lucide (Plus, Pencil, Eye, Trash2, MoreHorizontal, Minus) em DataTable,
FormGrid, LookupCombo e Tarefas recebem `text-modulo` e herdam a cor do módulo via
`currentColor`. O ícone não escolhe cor — o CONTAINER (barra de ações, aba, cabeçalho de
seção) é quem carrega `text-modulo`. Hover, ativo e desabilitado saem de graça sem estado
duplicado.

### Paleta flat (2026-08-09)
Camada de **cinzas, preenchimentos e estados** — NUNCA cor de módulo, NUNCA tinta dos donos.
Bancada `#E8EAED` no fundo, sidebar e header; folha `#F4F5F7`. **O degrau térmico (quente × frio)
que separava fundo de conteúdo acabou em 2026-08-13** — hoje separa só a luz, e o contorno preto.

**Preenchimentos flat** (com contorno preto, para elementos compactos):

| Nome | Hex | Papel |
|---|---|---|
| Grass | `#A0D468` | Dinheiro (bg-fill-money) |
| Sunflower | `#FFCE54` | Foco/pendência (bg-fill-focus) |
| Grapefruit | `#ED5565` | Erro/bloqueio (bg-fill-error) |

**Escala de cinzas:**

| Hex | Papel |
|---|---|
| `#F5F7FA` | Superfície de folha |
| `#E6E9ED` | Superfície secundária, zebra |
| `#CCD1D9` | Separador leve |
| `#AAB2BD` | Traço desabilitado |
| `#656D78` | Texto secundário (AA) |
| `#434A54` | Texto forte alternativo |

### Acentos — emprego fixo
- **Violeta `hsl(241 100% 66%)`** — AÇÃO: botão primário, linha selecionada, aba/página ativa, item de menu ativo, barra de progresso.
- **Roxo `hsl(262 97% 76%)`** — marca e realce (avatar, badge de destaque). Nunca ação.
- **Azul `hsl(219 90% 69%)`** — informação/apoio.
- **Verde `hsl(155 81% 26%)`** — dinheiro, e só.
- **Vermelho `hsl(357 84% 42%)`** — destruição, erro, valor negativo, carimbo anulado.
- **Amarelo `hsl(47 100% 50%)`** — foco e pendência. Continua proibido como cor de texto.
- **Soft blue `--empresa`** — a EMPRESA ATIVA, no rodapé da sidebar, e nada mais. Claro `hsl(234 91% 60%)` · escuro `hsl(234 91% 74%)`.

**Verde e vermelho descem da luz da amostra** (35% e 52%) porque os dois moram sobre a **zona de
valor**, que é justamente onde o operador lê o número que a tela existe para mostrar: a 35% o verde
dava 2,79:1 sobre a zona e a 52% o vermelho dava 3,72:1 — ambos abaixo dos 4,5:1 de texto. Matiz e
saturação são os da amostra; só a luz mudou. Depois, remedido sobre as superfícies cinzas: verde
**5,03:1** sobre a zona e **5,03:1** sobre a Folha (a zona de valor e a Folha estão a 1,00:1 de
distância); vermelho **5,22:1** e **5,51:1**. Efeito colateral bem-vindo: o branco do botão destrutivo sai de
4,41:1 para 6,05:1, e o do carimbo `done` (preenchido de verde) de 3,31:1 para 5,52:1.

**`--empresa` desce pela mesma razão, e é o único /01 da paleta que foi recalibrado.** O galpão da
empresa ativa pousa sobre a **zona de identidade**, e a 74% (a luz do `#828DF9` da paleta) o par dá
**2,29:1** — na conferência renderizada o ornamento sumia contra o pastel. A 60% dá 4,45:1. No
escuro a zona é escura e ele volta aos 74%, com 4,75:1: sobre papel escuro a cor precisa CLAREAR,
a mesma inversão do violeta de ação.

> **Medida que vale para o resto da paleta, e que ainda é decisão em aberto** (números na
> §Medição de contraste — sobre a folha os /01 de módulo vão de **1,40:1** a **4,78:1**, com quatro abaixo
> de 3:1 ali e cinco sobre a bancada; o roxo de marca fica em 2,25:1 sobre a bancada). As
> superfícies novas são um pouco mais escuras que as antigas, então a faixa SUBIU (a nota anterior
> dizia 1,32 a 2,97, medida contra folha branca), mas o diagnóstico não mudou. Não é regressão de nenhuma fase: é a paleta /01 como foi travada, e ela foi escolhida
> para elemento COMPACTO e para preencher fundo com texto preto por cima (aí ela mede 7:1 a 20:1).
> Como ornamento é decoração `aria-hidden`, a WCAG 1.4.11 não o obriga — mas a legibilidade em tema
> claro é real e fica fraca. Mexer nisso é mexer na paleta travada: decisão do user, junto da
> colisão dos quatro azuis vizinhos.

### Sombra
Cinco degraus de `hsl(214 10% 61%)` a `hsl(217 16% 19%)` — todos sem blur, todos da família
**neutra-fria**. Era quente (matiz 35–41) enquanto o papel era creme; sobre superfície cinza a
sombra quente não lê como sombra, lê como **sujeira** — ganha um bege que a bancada não tem em
lugar nenhum. Mesma escada de luz, matiz neutralizada. **Nenhuma sombra preta.** A escada é **2/3/4/6/8** desde a 1.6: a 10px a sombra do modal virava
uma segunda peça na tela, do tamanho de uma borda grossa. Ela cresce devagar embaixo, onde os
degraus se distinguem, e para em 8px, onde ainda se lê como sombra.

### Ornamento — a forma decorativa do módulo
520 SVGs brutalist no staging; **só os usados entram no repo**. Regras duras:
- **Sempre colorido. Nunca preto, nunca cinza** — preto é a tinta do dado e da borda, e ornamento
  na mesma tinta compete com o conteúdo em vez de emoldurá-lo.
- **Fora as três cores com dono** (verde/dinheiro, amarelo/foco, vermelho/erro), exceto onde o
  significado É aquele estado — o 404 usa vermelho porque 404 é erro.
- **Recolorir por `mask-image` + `background-color` de token, nunca editando o `fill`**: os
  arquivos trazem `fill="white"` e máscaras de luminância do Figma, e trocar o fill quebra a forma.
- **Um componente só** (`<Ornamento>`); `mask-image` solto pelos arquivos é proibido.
- **`aria-hidden` sempre** — é decoração; quem informa é o texto ao lado.
- **Teto de densidade: 1 por região visível**, nunca 2 no mesmo cartão. Três juntos numa tela real
  → cortar o de menor hierarquia, não diminuir os três.

#### Os dois papéis do mesmo shape — decoração × ícone
O desenho é um só; o que muda é **de onde vem a cor**.

| Papel | Cor | Onde | Tamanho |
|---|---|---|---|
| **Decoração** | token FIXO da região (`tom="modulo"`, `"info"`, `"erro"`) | vazio de módulo, banda de identidade, modal de alerta, splash | 24–128px |
| **Ícone** | HERDADA do container (`tom="icone"` → `currentColor`) | migalha, item de menu, cabeçalho de seção, aba | 12–20px |

No papel de ícone o ornamento **não escolhe cor**: hover, ativo e desabilitado já mexem no `color`
do container e o shape acompanha sozinho. Sem isso cada um desses estados precisaria de uma
**segunda regra de cor** só para o ornamento — estado duplicado, que um dia diverge. É a mesma
técnica dos outros tons (máscara + `background-color`), só que o `background-color` é
`currentColor`. Corolário: o papel de ícone só entra onde o container **já pinta em cor** —
herdar o preto do texto violaria a regra de nunca preto nem cinza.

**Fronteira com o lucide: `shape = onde estou` (lugar/entidade) · `lucide = o que faço`
(ação/controle).** Chevron, x, check e busca continuam do lucide; o acervo brutalist não tem esses
desenhos, e misturar as duas famílias dentro do mesmo botão é pior do que duas famílias com a
fronteira escrita.

Escala: **12–16px** migalha · **18px** item de menu · **20px** cabeçalho de seção · **24px** banda
de identidade · **96–128px** estado vazio.

No item de menu o par entra **invertido** em relação ao fundo: item inativo é liso e leva a cheia
/01 (a fileira vira um mapa de cores); item ativo já tem fundo /01 e leva a pastel /02, senão a
forma sumiria. Estado de sistema não usa a cor do módulo: busca sem resultado é Info/01
`#93AAED` — vazio de busca não é módulo vazio.

#### A sidebar: marca no topo, empresa ativa no rodapé
Os dois são **um arranjo só**, não duas escolhas soltas. O teto de densidade é de 1 ornamento por
região visível, e as duas peças no mesmo cabeçalho o estouravam — além de empilharem as duas
perguntas de identidade ("que sistema é este" e "de que empresa é este dado") no mesmo canto do olho.

| Lugar | Desenho | Tamanho | Cor |
|---|---|---|---|
| Topo — marca do sistema | `<Marca variante="assinatura">` (símbolo do user + wordmark) | 28px | `currentColor` |
| Rodapé — empresa ativa | `empresa` (`brutalist-029`, galpão) | 16px | Soft blue (`--empresa`) |

**A empresa ativa é o escopo de tudo que a sidebar lista acima**, e escopo se lê depois do que ele
governa. Ela também é o único ornamento de cor FIXA fora dos estados de sistema: responde "de qual
empresa é o que estou vendo", resposta que não muda de tela para tela — lê-la do `[data-modulo]`
faria a marca da empresa piscar de cor a cada navegação.

**A MARCA saiu do acervo em 2026-08-13.** `emblema` (`shape-185`), `marca` (`shape-182` + apoio +
base) e a composição de boas-vindas do login eram **empréstimo** enquanto o Cabinet não tinha
símbolo próprio. O user entregou o dele, e as quatro chaves foram removidas do `<Ornamento>`.

**`<Marca>` não passa pelo `<Ornamento>`, e isso não é organização de arquivo:** o ornamento monta
traço + preenchimento em duas camadas com tom de MÓDULO, e a marca é desenho de linha sem
preenchimento e sem cor de módulo — passá-la por lá pintaria o miolo da casa e daria a ela a cor
da tela em que estivesse. A cor sai de `currentColor`: a marca responde "que produto é este",
pergunta cuja resposta não muda ao navegar.

**Dois pesos, e o corte é de legibilidade MEDIDA:**

| arquivo | desenho | uso | piso |
|---|---|---|---|
| `cabinet-mark.svg` | 3 níveis + moldura, traço 3.2 | ≥64px — login, splash, favicon grande | 64px |
| `cabinet-mark-compact.svg` | 2 níveis, sem moldura, traço 9 | ≤32px — sidebar, favicon 16/32 | **16px** |

Rasterizado a 32px, os traços internos da versão com moldura se FUNDEM — a moldura come 20% do
quadro e empurra o traço interno para sub-pixel. Por isso são dois desenhos e não uma espessura
interpolada. `public/favicon.svg` é **cópia** do compacto (o browser o lê antes de existir bundle):
mudou a marca, mudam os dois arquivos.

### Modo escuro
Recalculado na fase 3 sobre esta paleta. **O escuro não inverte a cor, inverte a RELAÇÃO:** a
bancada continua sendo o fundo e a folha continua pousando por cima — só que a folha agora é mais
clara que a bancada (`hsl(40 10% 14%)` sobre `hsl(40 12% 9%)`), e a tinta que desenha a caixa é
clara em vez de preta. **A matiz quente saiu daqui também (2026-08-13)**, pelo mesmo motivo do
tema claro: as superfícies do escuro eram creme escurecido (matiz 35–42) e a tinta clara vinha
tingida de quente (`42 25% 94%`); com o creme fora do sistema, tingir só o escuro deixaria os dois
temas falando línguas diferentes. Bancada `220 8% 10%`, folha `220 9% 17%`, traço `220 8% 66%`.

Três inversões que o cálculo obrigou, e que valem como regra:
- **O texto da ação vira escuro.** No claro o violeta é L 66 e leva branco; no escuro precisa clarear
  para L 74 e aí o branco cai para 3,05:1. Com texto escuro dá 5,34:1 — o mesmo violeta no mesmo
  papel, com o contraste na mão certa.
- **Afundar é escurecer.** O degrau interno da folha desce em vez de subir.
- **Dinheiro e negativo sobem de luz** pelo motivo espelhado do que os fez descer na 1.6.

As cinco zonas mantêm a MATIZ dos pastéis /02 e viram a luz de 91–95% para 18–22%: a cor continua
nomeando o conteúdo, só o papel escureceu. Nos módulos, a cheia /01 já é clara e continua servindo
de tinta; só a /02 desce.

**Remedido em 2026-08-13, e a nota antiga estava errada** (tabela na §Medição de contraste): a
cheia /01 sobre a folha escura vai de
**2,74:1** (vendas) a **9,38:1** (produtos) — duas das oito abaixo de 3:1, vendas e fornecedores.
A página afirmava "entre 5,15:1 e 8,5:1, todas acima do piso", e não foi a folha nova que quebrou
isso: contra a folha escura ANTIGA as mesmas duas já não passavam. Fica como está, pelo motivo que
o `<Ornamento>` documenta — **quem delimita a forma é o traço**, e o preenchimento neon tem
contraste baixo por construção. Escurecer os neons para consertar o número desmontaria a escolha
do user.

A sombra acompanhou a neutralização e continua sem blur, mas precisa ser **mais escura que a
bancada** para existir —
sombra clara sobre papel escuro seria luz. Os cinco degraus ficam sutis de propósito: no escuro quem
carrega a elevação é o degrau de superfície e o traço claro, e a sombra só confirma.

### Medição de contraste — a tabela canônica (2026-08-13)

**Esta é a única lista de números desta página que se remede; qualquer razão citada fora daqui é
citação, não medição.** As duas superfícies mudaram (creme → cinza) e invalidaram de uma vez todo
contraste medido contra a bancada creme — o mesmo vai acontecer na próxima troca de superfície.

Fonte dos valores: os tokens REAIS de `src/index.css`, lidos por
`docs/design/medir-contraste.py`. **O script existe porque a medição na mão já errou duas vezes
nesta própria página** (a faixa da cheia /01 no escuro e a do claro, corrigidas em 2026-08-13). Ele
não altera cor nenhuma — é instrumento.

**As tabelas abaixo são GERADAS, não digitadas.** Cada uma mora entre `<!-- tabela:nome -->` e o
fechamento correspondente, e o script as escreve:

- `python3 docs/design/medir-contraste.py --conferir` — pergunta se esta página ainda diz a
  verdade sobre o CSS (tabelas **e** frontmatter). Sai com código 1 se não. É o comando a rodar
  depois de mexer em qualquer token de cor.
- `python3 docs/design/medir-contraste.py --escrever` — regrava as tabelas com o medido.

Colar número à mão foi o que produziu os três valores errados que esta página já publicou, e na
primeira execução do `--conferir` a guarda achou uma **linha inteira faltando** na tabela dos
estados (o carimbo `open`). A prosa em volta continua escrita à mão: ela explica, não mede.

Pisos WCAG usados: **4,5:1** texto normal (1.4.3) · **3:1** texto grande e componente/estado
não-textual (1.4.11).

**A cor mora em DOIS lugares** — o `src/index.css` e o bloco `colors:` do frontmatter desta página,
que é o que o impeccable lê. Já divergiram (o YAML ficou com os cinzas antigos depois da troca das
superfícies), e a divergência é **muda**: nada quebra, o sidecar só passa a mentir para o próximo
agente. `python3 docs/design/medir-contraste.py --frontmatter` compara os dois e sai com código 1
se algum par não bater — rodar sempre que mexer em token de cor. **Entraram no YAML em 2026-08-13**,
por serem medidos ou citados aqui e faltarem lá: `ink-strong`, `ink-disabled`, `empresa` e os três
`fill-*`.

#### As 4 vozes tipográficas sobre as superfícies — piso 4,5:1

A voz não tem cor própria: cada uma pinta com um token, e é o token que se mede. Duas vozes têm
dois papéis com tintas diferentes, e os dois entram.

<!-- tabela:vozes -->
| Voz | papel | tinta | Folha | Bancada | escuro: Folha | escuro: Bancada | veredito |
|---|---|---|---|---|---|---|---|
| quem — Newsreader | nome de entidade, H1 | `--foreground` | 18,76:1 | 16,80:1 | 12,50:1 | 15,33:1 | passa |
| o quê — Sora | produto na listagem | `--muted-foreground` | 8,52:1 | 7,63:1 | 6,77:1 | 8,30:1 | passa |
| o quê — Sora | produto como assunto, H2+ | `--foreground` | 18,76:1 | 16,80:1 | 12,50:1 | 15,33:1 | passa |
| UI — Inter | rótulo, botão, mensagem | `--foreground` | 18,76:1 | 16,80:1 | 12,50:1 | 15,33:1 | passa |
| UI — Inter | texto secundário | `--muted-foreground` | 8,52:1 | 7,63:1 | 6,77:1 | 8,30:1 | passa |
| UI — Inter | texto forte alternativo | `--text-strong` | 18,76:1 | 16,80:1 | 8,90:1 | 10,91:1 | passa |
| quanto — PT Mono | código, data, quantidade | `--foreground` | 18,76:1 | 16,80:1 | 12,50:1 | 15,33:1 | passa |
| quanto — PT Mono | dinheiro | `--money` | 5,52:1 | 4,94:1 | 8,49:1 | 10,42:1 | passa |
| quanto — PT Mono | valor negativo | `--destructive` | 6,05:1 | 5,42:1 | 5,09:1 | 6,24:1 | passa |
<!-- /tabela:vozes -->

**As quatro vozes passam AA nas duas superfícies e nos dois temas.** A troca de papel não custou
legibilidade de texto — foi a superfície tintada que ficou devendo, abaixo.

#### Os pastéis /02 de módulo sobre as superfícies — piso 3:1

Aqui a razão medida é **superfície contra superfície**: o /02 é a zona pintada, a Folha e a Bancada
são o que está em volta.

<!-- tabela:pasteis-02 -->
| Módulo | /02 × Folha | /02 × Bancada | escuro: /02 × Folha | veredito |
|---|---|---|---|---|
| Produtos | 1,12:1 | 1,01:1 | 1,32:1 | REPROVA |
| Estoque | 1,21:1 | 1,08:1 | 1,15:1 | REPROVA |
| Vendas / Orçamento | 1,21:1 | 1,08:1 | 1,05:1 | REPROVA |
| Compras / Pedidos | 1,17:1 | 1,04:1 | 1,03:1 | REPROVA |
| Clientes | 1,18:1 | 1,06:1 | 1,02:1 | REPROVA |
| Fornecedores | 1,23:1 | 1,10:1 | 1,01:1 | REPROVA |
| Profissionais | 1,20:1 | 1,08:1 | 1,01:1 | REPROVA |
| CRM | 1,09:1 | 1,03:1 | 1,34:1 | REPROVA |
| Boletim | 1,14:1 | 1,02:1 | 1,06:1 | REPROVA |
<!-- /tabela:pasteis-02 -->

A cheia /01 do mesmo módulo, medida contra as mesmas superfícies (é ela que pinta ornamento, ícone
e item de menu inativo). **No escuro os `--modulo-01` não são redefinidos** — `.dark
[data-modulo=…]` só baixa a /02, e o neon do bloco claro continua na cascata servindo de tinta:

<!-- tabela:cheia-01 -->
| Módulo | /01 × Folha | /01 × Bancada | escuro: /01 × Folha | escuro: /01 × Bancada |
|---|---|---|---|---|
| Produtos | 1,67:1 | 1,50:1 | 8,60:1 | 10,55:1 |
| Estoque | 2,52:1 | 2,26:1 | 5,69:1 | 6,98:1 |
| Vendas / Orçamento | 2,76:1 | 2,47:1 | 5,20:1 | 6,38:1 |
| Compras / Pedidos | 2,67:1 | 2,39:1 | 5,39:1 | 6,61:1 |
| Clientes | 2,43:1 | 2,17:1 | 5,92:1 | 7,27:1 |
| Fornecedores | 2,94:1 | 2,64:1 | 4,88:1 | 5,99:1 |
| Profissionais | 2,67:1 | 2,39:1 | 5,37:1 | 6,59:1 |
| CRM | 1,52:1 | 1,36:1 | 9,48:1 | 11,63:1 |
| Boletim | 2,26:1 | 2,03:1 | 6,35:1 | 7,79:1 |
<!-- /tabela:cheia-01 -->

Abaixo de 3:1 — no claro **quatro** contra a Folha (produtos, estoque, boletim e o CRM novo) e
**seis** contra a Bancada (os quatro + compras e clientes); no escuro **duas** contra a Folha
(vendas, fornecedores) e nenhuma contra a Bancada. A §Acentos dizia "quatro dos oito" no claro sem
separar as duas superfícies — e o número certo mudou de novo com o nono módulo, que é a razão de
estas tabelas serem geradas e não digitadas.

As cinco zonas por conteúdo medem a mesma coisa que a /02, pelo mesmo motivo — **é a natureza do
pastel /02, não regressão da troca de superfície**:

<!-- tabela:zonas -->
| Zona | × Folha | × Bancada | escuro × Folha |
|---|---|---|---|
| Valor | 1,10:1 | 1,02:1 | 1,25:1 |
| Identidade | 1,30:1 | 1,16:1 | 1,02:1 |
| Apoio | 1,16:1 | 1,04:1 | 1,06:1 |
| Pendência | 1,05:1 | 1,07:1 | 1,25:1 |
| Bloqueio | 1,16:1 | 1,04:1 | 1,04:1 |
<!-- /tabela:zonas -->

**O que a reprovação significa, e o que ela NÃO significa.** A 1.4.11 pede 3:1 do que delimita o
componente, e quem delimita aqui é o **contorno preto de 2px** — ele mede 19,12:1 sobre a Folha no
claro e 5,88:1 no escuro, folgado nos dois. O texto que pousa sobre o pastel também passa larga
(16,88–18,60:1 no claro, 9,48–13,10:1 no escuro). Então a reprovação é **condicional ao traço**: no
dia em que alguém suavizar ou tirar a borda, oito módulos e cinco zonas ficam invisíveis de uma vez
— é a mesma dependência que a §Superfícies já registra para o degrau de 1,10:1 entre Bancada e
Folha.

#### Estados e preenchimentos — onde a cheia /01 vira FUNDO de texto

As tabelas acima medem superfície e voz. Falta o terceiro grupo, e é onde está a única reprovação
de TEXTO desta página: os lugares em que a cheia /01 deixa de ser traço e vira **fundo com letra em
cima**. Hoje são dois, e o par é o mesmo — `data-active:bg-modulo-cheia` no item de menu
(`sidebar.tsx`) e a gaveta de notificações, que herda o `text-sidebar-foreground`/`text-foreground`
do tema.

<!-- tabela:estados-fundo -->
| Módulo | claro: tinta × /01 | escuro: tinta × /01 |
|---|---|---|
| Produtos | 11,23:1 | **1,45:1** |
| Estoque | 7,43:1 | **2,19:1** |
| Vendas / Orçamento | 6,79:1 | **2,40:1** |
| Compras / Pedidos | 7,03:1 | **2,32:1** |
| Clientes | 7,73:1 | **2,11:1** |
| Fornecedores | 6,37:1 | **2,56:1** |
| Profissionais | 7,02:1 | **2,33:1** |
| CRM | 12,38:1 | **1,32:1** |
| Boletim | 8,29:1 | **1,97:1** |
<!-- /tabela:estados-fundo -->

**Piso 4,5:1, não 3:1** — o rótulo do item é 14px em `font-bold`, e "texto grande" pela WCAG começa
em 18,66px negrito. Reprovam **dois no claro** (vendas, fornecedores; profissionais raspa em 4,51)
e **oito dos nove no escuro** — só vendas escapa —, o pior deles o ciano de Produtos a **1,33:1**,
que é letra clara sobre preenchimento claro. **O CRM entrou já reprovando: 1,46:1 no escuro.**

**A raiz do caso escuro é a mesma cascata da tabela da /01:** `.dark [data-modulo=…]` só redefine a
`/02`. A cheia continua neon — o que é certo enquanto ela é TRAÇO sobre papel escuro (9,38:1 em
produtos) e vira defeito no único lugar em que ela é FUNDO, porque aí a tinta do tema também
clareou. É um par que inverteu de mão sem ninguém remedir.

**O comentário do `src/index.css` (§utilities, `bg-modulo`) afirma o contrário e está velho:**
"sobre a /01 e a /02 o texto é sempre PRETO: o pior par da tabela é o soft blue a 7,1:1 — todas
passam AA com folga". Soft blue era o /01 **anterior ao neon**; o pior par hoje é 4,00:1 no claro e
1,33:1 no escuro, e no escuro o texto não é preto. Quem ler aquele comentário decide não medir.
Corrigi-lo é edição em `src/`, fora da zona desta passagem — fica como pendência com dono.

> **CONFIRMADO EM RENDER** (2026-08-13, método do `@comorodar`: spec descartável → `body.innerHTML`
> → CSS do `dist` → Chrome headless, `class="light"` e `class="dark"`). Os dois extremos previstos
> apareceram na tela: **Produtos ativo no escuro é letra clara sobre ciano** e some — o item mais
> legível do tema claro (13,71:1) é o pior do escuro; **Orçamentos ativo no claro** lê, mas
> visivelmente apertado ao lado dos vizinhos, que é o 4,00:1. A cascata é a que a tabela supõe:
> `data-active:` só troca borda, fundo e peso, e a cor vem do `text-sidebar-foreground` do
> contêiner.

Os demais estados, com o par que o componente resolve de verdade — um deles também reprova:

<!-- tabela:estados-demais -->
| par | claro | escuro |
|---|---|---|
| texto sobre hover de item (`--neutral`) | 17,17:1 | 10,02:1 |
| secundário sobre hover de item | 7,80:1 | 5,43:1 |
| linha selecionada: `--primary-foreground` × `--primary` | 18,76:1 | 5,13:1 |
| linha selecionada × folha (a mudança de estado) | 18,76:1 | 4,18:1 |
| carimbo `open` (`bg-stamp-open` + `text-foreground`) | 12,05:1 | 1,30:1 |
| carimbo `done` (`bg-stamp-done` + `text-primary-foreground`) | 5,52:1 | 10,42:1 |
| carimbo `neutral` (`text-stamp-neutral`, fundo transparente) | 6,24:1 | 6,60:1 |
| carimbo `void` (`text-stamp-void`, fundo transparente) | 6,05:1 | 5,09:1 |
| desabilitado: tinta × superfície apagada | 15,68:1 | 14,55:1 |
| desabilitado: traço apagado × superfície apagada | 4,87:1 | 3,49:1 |
| desabilitado: superfície apagada × Folha | 1,20:1 | 1,16:1 |
| desabilitado: secundário × superfície apagada | 7,12:1 | 7,88:1 |
<!-- /tabela:estados-demais -->

### Os estados da NAVEGAÇÃO — hover e ativo, nos dois temas (Nav-2, issue #140)

A tabela acima mede estado de item; esta mede o estado da **navegação de primeiro nível**, que é
outro par: a aba do topo (`appbar.tsx`) e o item da barra lateral (`sidebar.tsx`) pintam "onde eu
estou" de três jeitos, e cada um responde a um piso diferente da WCAG.

<!-- tabela:nav-estados -->
| Módulo | claro: tinta × /02 | escuro: tinta × /02 | claro: fio /01 × fundo | escuro: fio /01 × fundo | claro: ícone /01 × /02 | escuro: ícone /01 × /02 |
|---|---|---|---|---|---|---|
| Produtos | 16,69:1 | 9,48:1 | **1,50:1** | 10,55:1 | **1,49:1** | 6,52:1 |
| Estoque | 15,50:1 | 10,88:1 | **2,26:1** | 6,98:1 | **2,09:1** | 4,96:1 |
| Vendas / Orçamento | 15,50:1 | 13,10:1 | **2,47:1** | 6,38:1 | **2,28:1** | 5,45:1 |
| Compras / Pedidos | 16,10:1 | 12,14:1 | **2,39:1** | 6,61:1 | **2,29:1** | 5,23:1 |
| Clientes | 15,86:1 | 12,69:1 | **2,17:1** | 7,27:1 | **2,05:1** | 6,01:1 |
| Fornecedores | 15,29:1 | 12,39:1 | **2,64:1** | 5,99:1 | **2,40:1** | 4,84:1 |
| Profissionais | 15,61:1 | 12,38:1 | **2,39:1** | 6,59:1 | **2,22:1** | 5,33:1 |
| CRM | 17,24:1 | 9,32:1 | **1,36:1** | 11,63:1 | **1,39:1** | 7,07:1 |
| Boletim | 16,41:1 | 11,84:1 | **2,03:1** | 7,79:1 | **1,98:1** | 6,02:1 |
<!-- /tabela:nav-estados -->

**O rótulo passa com folga; o que reprova é o SINAL do estado.**

- **tinta × /02 — passa nos dois temas, com margem grande.** É o texto e o ícone sobre a superfície
  de hover e de ativo da aba do topo: pior caso **16,88:1 no claro** (Boletim) e **9,32:1 no
  escuro** (CRM), contra um piso de 4,5:1. Este é o item que a #140 pedia, e ele está cumprido.
- **fio /01 × fundo — reprova no CLARO, em 6 dos 9 módulos.** O fio de 3px é o que marca a aba
  ativa, e no tema claro ele chega a **1,27:1** (Produtos) contra os 3:1 que a WCAG 1.4.11 pede
  para componente não-texto. No escuro sobra folga (3,36:1 no pior, Vendas).
- **ícone /01 × /02 — reprova nos dois temas, 8 dos 9 módulos.** É o ícone do item da lateral
  contra o próprio preenchimento: ativo é `text-modulo-suave` sobre `bg-modulo-cheia`, hover é o
  inverso, e o par é o mesmo nos dois sentidos. Pior **1,36:1 no claro** e **2,80:1 no escuro**.

**O agravante do fio:** ele carrega o estado ativo sozinho. A superfície `/02` que a aba ganha ao
ficar ativa mede **1,00 a 1,17:1** contra o fundo da appbar (§tabela:pasteis-02) — ou seja, é
invisível. Tirando o fio, a aba ativa e a inativa são a mesma imagem, e no claro o fio está abaixo
do piso. Sobra o `aria-current="page"`, que serve o leitor de tela e não o olho.

**Não "consertei" nenhum dos dois**, e a razão é a mesma da /01-como-fundo acima: corrigir exige
mexer em `--modulo-01`/`--modulo-02`, que é a paleta dos nove módulos inteira, em `src/index.css`.
O próprio arquivo registra isso como decisão do user (§utilities, `bg-modulo`: *"não 'conserte'
escurecendo o preenchimento sem passar por lá"*). **Fica como pendência com dono, medida e não
opinada.**

#### A proposta está pronta para decisão — `docs/design/proposta-contraste-navegacao.md`

Medir sem propor deixa a pendência parada. As duas reprovações viraram **duas propostas completas**,
com hex candidato módulo a módulo, razão medida nos dois temas e o custo visual de cada uma. Nada
foi alterado: o documento é para o user aprovar com uma palavra. O essencial:

**A aritmética limita o que é possível.** A janela viável de `L(/01)` é `[0,175 ; 0,241]` no claro e
`[0,129 ; 0,153]` no escuro — **duas janelas diferentes**, e é por isso que o escuro precisaria de um
`/01` próprio em vez de herdar o do claro. **E o caso do ícone não tem solução de paleta no
escuro:** com `L(/01) ≥ 0,1287`, o ícone só alcança 3:1 se a `/02` cair para a luminância do próprio
fundo da página — a superfície de hover sumiria dentro dele. Não é difícil, é autodestrutivo.

**Proposta A (recomendada) — muda o COMPONENTE, zero cor.** O item ativo da lateral deixa de ser
preenchido pela `/01` e usa a `/02` do hover, distinguido pela `border-l-foreground` e pelo negrito
que já existem; e o fio da aba do topo passa a usar `--foreground`, como a lateral já faz. Resultado
medido: rótulo e ícone a **16,88:1 no claro** e **9,32:1 no escuro**; fio a **17,44:1** e
**15,33:1**. Resolve os dois casos **e** a pendência antiga do rótulo, e devolve a `/01` ao papel
que esta página já escreveu para ela — *elemento compacto e traço, nunca área grande com letra em
cima*. A reprovação é sintoma de uso fora do papel.

**Proposta B — muda a PALETA.** No claro, escurecer os nove `/01` para `L ≈ 0,190` resolve fio, texto
e ícone de uma vez (3,63 / 4,80 / 3,52–3,92:1). No escuro, um `/01` próprio em `L ≈ 0,140` resolve
fio e texto (3,19 / 4,81:1) mas **deixa o ícone reprovando** (1,94–2,73:1), pela impossibilidade
acima. Custo: **o neon acaba no tema claro** — Produtos sai de `#00E5FF` para `#008594` (−21 pontos
de lightness), CRM −18, Boletim −16. Matiz e saturação ficam intactos, então os nove seguem
distinguíveis entre si; o conjunto é que fica mais escuro.

O documento traz ainda um **híbrido** (só o `/01` do claro escurece, o escuro fica como está porque
lá o fio já passa a 3,36:1) e a lista do que executar quando houver decisão.

Os três `fill-*` ficam de fora da tabela por terem três valores por tema; estão no parágrafo
abaixo. **Os carimbos foram medidos com o par REAL do `stamp.tsx`, não com preto por suposição** — e um
deles reprova: **`open` no escuro dá 1,30:1**. Ele é `bg-stamp-open` + `text-foreground`, e no
escuro o amarelo sobe para `47 100% 55%` enquanto a tinta do tema vira `220 12% 94%`: letra clara
sobre amarelo claro. No claro o mesmo par dá 13,49:1, porque lá a tinta é preta. **É a mesma
inversão do item de menu ativo, no outro componente**: um preenchimento que continuou claro
enquanto a tinta trocou de lado. `done` não tem o problema (o `--primary-foreground` do escuro é a
bancada, quase preta) — daí 10,42:1.

**A proposta do `open` está junto com as da navegação** (`docs/design/proposta-contraste-navegacao.md`,
§7). Medi as duas saídas: **nenhuma tinta existente resolve**, porque todas viram com o tema —
`--foreground` dá 13,49:1 no claro e 1,30:1 no escuro, `--primary-foreground` faz o inverso
(1,56 / 11,77:1). Como o preenchimento é o único da página que **não** vira (L 0,625 no claro,
0,651 no escuro), a tinta tem de ser fixa: um token escuro definido só no `:root` dá **13,49:1 no
claro e 14,03:1 no escuro**, com o amarelo intacto. A alternativa — escurecer o amarelo no escuro
para `47 100% 25%` — funciona (4,79:1) e troca a identidade da cor pelo conserto da tinta; não é a
recomendada.

**E daí sai a regra que explica as três reprovações desta página de uma vez:**

> **Tinta e preenchimento têm de virar JUNTOS com o tema, ou nenhum dos dois vira.**

| par | preench. vira? | tinta vira? | resultado |
|---|:--:|:--:|---|
| `fill-*` + tinta do tema | sim | sim | passa (8,47 a 11,34:1) |
| `stamp-done` + `primary-foreground` | sim | sim | passa (5,52 / 10,42:1) |
| `stamp-open` + `foreground` | **não** | sim | **quebra** (1,30:1) |
| `/01` + tinta do tema | **não** | sim | **quebra** (1,33:1) |

As duas que quebram são exatamente as duas em que o par se desemparelha. O contraexemplo dos
`fill-*` já estava escrito logo abaixo — *"quem desce de luz no escuro sobrevive à inversão da
tinta"* —, mas como observação sobre um caso, não como regra; por isso não foi aplicada aos dois
que faltavam.

**Os três `fill-*` são o contraexemplo que mostra o que falta aos outros dois**: eles DESCEM de luz
no escuro (`fill-money` de `88 51% 71%` para `88 30% 22%`), então a tinta clara pousa neles com
8,47 a 11,34:1. Quem desce de luz no escuro sobrevive à inversão da tinta; quem fica claro — a
cheia /01 e o `--stamp-open` — não.

#### Aferições de apoio

<!-- tabela:apoio -->
- degrau Bancada × Folha: **1,12:1** claro · **1,23:1** escuro
- secundário sobre o Afundado (zebra): **7,98:1** claro · **7,67:1** escuro
- traço `--border` sobre a Folha: **18,76:1** claro · **5,88:1** escuro
- tinta sobre os pastéis /02 de módulo: **15,29–17,24:1** claro · **9,32–13,10:1** escuro
<!-- /tabela:apoio -->

#### Pendências — nenhuma cor foi mexida aqui

Esta seção **mede**; trocar cor é decisão do user, e nenhuma foi alterada por causa destes números.

**As duas primeiras são de TEXTO e não têm o traço para segurá-las** — nenhuma borda conserta letra
que não se lê. As outras são de superfície, onde o contorno preto é o delimitador.

0. **[USER] O rótulo do item de menu ATIVO reprova em 2 módulos no claro e em 8 dos 9 no escuro** —
   pior caso 1,33:1 (Produtos, escuro). É a cheia /01 no papel de FUNDO, que a cascata do escuro
   não redefine, com a tinta do tema já invertida para clara. Mesmo defeito no **carimbo `open` do
   escuro, 1,30:1**. **Conferido em render**, nos dois temas. Não escolhi correção: dar à `/01` um
   valor escuro em `.dark` mexe na paleta travada, e trocar a tinta do item cria uma segunda regra
   de cor.
   **Junto vai a correção do comentário do `src/index.css`**, que ainda afirma "todas passam AA com
   folga, pior par 7,1:1" — número da paleta pré-neon, e é ele que faz o próximo leitor não medir.
1. **[USER] Os pastéis /02 de módulo e as 5 zonas, de 1,00 a 1,34:1 contra as superfícies.** Só há decisão
   a tomar se a superfície tintada precisar se separar do papel **sem** o traço. Escurecer o /02
   até 3:1 o tiraria de "pastel" — vira preenchimento, e aí compete com a cheia /01.
2. **[USER] Vendas e Clientes medem 1,00:1 contra a Bancada** — mesma luminância, não "sutil":
   ali o pastel e o fundo do app são a mesma cor aos olhos. Só não aparece porque a zona pintada
   mora dentro da Folha; encostar um /02 direto na Bancada sem traço é desenhar nada.
3. **[USER] A cheia /01 abaixo de 3:1**: três contra a Folha e cinco contra a Bancada no claro,
   duas contra a Folha no escuro — tabela acima, decisão na §Acentos. Mesma raiz: neon tem
   contraste baixo por construção, e quem delimita é o traço. O roxo de marca fica em 2,25:1 sobre
   a Bancada.
4. ~~**`--text-disabled` a 1,73:1 sobre a Folha.**~~ **FECHADA em 2026-08-14 (issue #106), e não
   por escolha de cor: o token foi REMOVIDO.** A 1.4.3 isenta componente desabilitado, então nunca
   foi reprovação formal — mas o user olhou a barra de ações do Cadastro de Produtos e a decisão
   veio de olhar, não de norma: "nunca fazer algo assim em cor clara pois não dá pra ver". O
   apagamento passou para `--surface-disabled` + `--rule-disabled`, e o conteúdo do controle morto
   mede 12,89:1 (claro) / 14,55:1 (escuro). Ver §Desabilitado.
5. **Margem estreita a vigiar: dinheiro na Bancada 4,58:1 e secundário na Bancada 4,73:1** (4,72:1
   na zebra). Passam por pouco. Qualquer escurecimento da Bancada, mesmo de 1 ponto de luz,
   derruba os dois — remedir com o script antes de mexer em `--background`.
6. **[USER] NENHUMA utility `border-*` deste repo pinta nada — todas as bordas são `--border`.**
   Achado em 2026-08-14 medindo o traço apagado, e é maior que a issue que o encontrou. O
   `* { border-color: hsl(var(--border)) }` do fim do `src/index.css` está **fora de `@layer`**, e
   autor sem camada vence QUALQUER regra dentro de camada — inclusive a `utilities`, onde o
   Tailwind gera todo `border-*`. **Medido no Chrome com o `dist` compilado: um elemento novo com
   `border-2 border-destructive` computa `rgb(0,0,0)`.**
   O que isso apaga hoje, em silêncio: **`aria-invalid:border-destructive` do `Input` e do
   `Textarea`** — o campo com erro não fica vermelho, e essa é a mesma família de defeito desta
   issue (estado que não se diz); `border-destructive` do botão destrutivo; `border-primary` do
   checkbox e do radio selecionados; `data-active:border-l-foreground` da sidebar; os quatro
   `border-stamp-*`.
   **Não consertei, e o motivo é que o conserto é MUDANÇA DE DESENHO, não correção de bug:** pôr o
   `*` em `@layer base` (que é onde o preflight do Tailwind o coloca) faz os 7 `border-transparent`
   do repo passarem a valer de uma vez — aba não selecionada e item de menu em repouso **perdem o
   contorno preto**, que é a Regra da Caixa Preta em duas dezenas de telas. É decisão do user.
   Enquanto isso, a receita da §Desabilitado mora fora de camada, depois do `*`, e é a única.

## Typography

**Cinco** famílias self-hosted (`@fontsource`), **zero CDN** — CDN em produção é dependência
externa e IP do operador vazando a cada carga.

O teto era **4**, e a decisão do user de **2026-08-19** (issue #236) abriu a quinta com condição:
**um peso e emprego único** — a Bebas Neue só fala no número-herói do documento, e em nenhum
outro lugar. O que a quinta paga em carga são 13,8 KB; o que ela compra não é estilo, é medida:
`R$ 9.999.999,99` sai a **222px** em Bebas contra **363px** em Sora, e a 48px o total não caberia
na largura do documento em família nenhuma das quatro. Condensar o Sora foi levantado e é
INERTE — nenhum peso do `@fontsource/sora` tem eixo `wdth`, todos declaram `usWidthClass = 5`, e
browser nenhum condensa sinteticamente.

**Teto de 5, e a sexta tem o mesmo ônus:** entra quem provar, com medida, que nenhuma das cinco
faz o serviço. `docs/design/medir-tabular.py` reprova pacote `@fontsource` importado que ninguém
mediu, então a família nova não passa calada como esta passou por dois dias.

A divisão é **SEMÂNTICA, não por tamanho** (decisão do user, 2026-08-13, formulada por ele:
*"'cliente:' estaria em Sora e o nome do cliente em Newsreader"*). Até aqui a rampa separava por
altura — quem titula fala em Display, quem informa em Inter. Agora separa por **o que a palavra
é**:

| papel | família | onde |
|---|---|---|
| **quem** | Newsreader 400/700 | nome próprio de entidade (cliente, profissional, fornecedor, empresa) + **o H1 único** da tela ou do documento |
| **o quê** | Sora 600/700 | nome de produto, descrição — e **todo cabeçalho de H2 para baixo** (painel, diálogo, gaveta, estado vazio) |
| **UI** | Inter 400/500/600 | rótulo de campo, cabeçalho de coluna, botão, menu, aba, mensagem |
| **quanto** | PT Mono 400 | número, código, data, valor, quantidade — **inclusive o número grande do KPI**, e sem negrito (só existe o peso 400) |
| **número-herói** | Bebas Neue 400 | o H1 do DOCUMENTO (36px), o nº do documento (36px), o TOTAL (48px) e a contagem do cartão de indicador (38px) — e nada mais. Todos pelo `<NumeroHeroi>`, com escala NOMEADA: medida solta na tela é como a quinta família viraria sexta sem ninguém decidir (#236) |

**A serifa tem DOIS lugares e nenhum outro** (refinado pelo user em 2026-08-13, vendo a tela de
Tarefas): o componente `<Nome>` e o **H1 único** da tela. A primeira versão da regra dava
Newsreader a `h1, h2, h3`, e a serifa desceu para cabeçalho de painel, de gaveta e de estado
vazio — lugares que são ESTRUTURA, não identidade.

O critério é **nível hierárquico, não tamanho em px**: "título grande" é subjetivo e deriva a cada
tela nova; "é o H1 da tela" não deriva.

**Consequência que morde, e que já mordeu uma vez:** com o seletor do `index.css` restrito a `h1`,
um `<Heading>` sem classe de família cai no **Inter do body**, não em Sora. Foi o que aconteceu com
os títulos de diálogo, alerta, gaveta e popover no mesmo dia — o título continuava renderizando, na
voz errada, sem quebrar teste nenhum. Por isso os quatro declaram `font-display` em vez de herdar,
e a guarda está em `confirmar-desativacao.test.tsx`.

Três regras que saíram de RENDER, não de teoria:

1. **Newsreader entra +2px** (`text-[1.15em]`) em relação ao vizinho. A altura-x dela é menor: no
   mesmo tamanho o nome do cliente lê como texto secundário e a hierarquia da linha **inverte** —
   o rótulo passa a pesar mais que o dado. O ajuste é em `em` porque a peça entra tanto numa
   célula de 14px quanto num título de 24px.
2. **Produto fica em `--muted-foreground`** na listagem. Foi o que impediu o empate visual entre
   três famílias na mesma linha; em `--foreground` ele disputa com o nome e a linha perde o
   assunto.
3. **Nome de entidade é COMPONENTE (`<Nome>`), nunca classe solta** — mesma disciplina do
   `<Ornamento>`. Nome aparece em formulário, célula, combo, migalha, banda e diálogo de
   confirmação; regra que depende de lembrar da classe falha na terceira tela, e falha MUDA
   (texto na fonte errada não quebra teste). O par dele é `<Produto>`, no mesmo arquivo.

**Peso 700 e não 800 no título:** o Newsreader entra com dois pesos, e `font-extrabold` sem
arquivo de 800 vira negrito **sintético** — numa serifada de alto contraste isso fecha as hastes
finas. Pelo mesmo motivo o tracking do título deixa de ser negativo: em caixa alta serifada,
-0,02em encosta a serifa de uma letra na vizinha.

**Descartadas, com motivo estrutural:** Instrument Serif (no `@fontsource` só existe peso 400 — sem
bold, cabeçalho e rótulo em destaque ficam sem contraste de peso) · Fraunces (o eixo `opsz` era
vantagem enquanto a divisão parecia ser por tamanho) · Playfair e Bodoni (hairlines finas a 13px,
números irregulares na coluna) · **Lastik** (pedida pelo user para a interface, barrada por
licença: grátis só para uso pessoal, e o Cabinet é vendido a terceiros).

Regras do Número Tabular e da Mono para Identificador: inalteradas.

### Algarismo tabular — MEDIDO em todas as famílias importadas (2026-08-14, issue #123; a quinta em 2026-08-20, #266)

A pergunta era concreta: `1111` e `9999` ocupam a mesma largura? Numa coluna de valores, se não
ocuparem, o olho perde a casa decimal e a conferência contra o orçamento deixa de ser
conferência. Medido por `docs/design/medir-tabular.py`, que lê o **avanço de glifo** (`hmtx`) e as
features do `GSUB` direto do `.woff` do `@fontsource` — a largura que o layout usa está no
arquivo e não depende de rasterizador, hinting ou zoom da máquina. Mesmo princípio do
`medir-contraste.py`: medir a fonte do valor, não a foto dele.

| família | pesos importados | avanço dos dígitos | uniforme? | publica `tnum`? |
|---|---|---|---|---|
| **Inter** | 400 · 500 · 600 | 833 … 1364 / 2048 em | **não** | **sim** |
| **Sora** | 600 · 700 | 425 … 763 / 1000 em | **não** | **sim** |
| **Newsreader** | 400 · 700 | 1133 e 1268 / 2000 em | **sim** (dentro de cada peso) | sim |
| **PT Mono** | 400 | 600 / 1000 em | **sim** | não |
| **Bebas Neue** | 400 | 400 / 1000 em | **sim** | **sim** |

**Mede-se o PESO que o CSS importa, não o 400 por convenção.** `tnum` é declarado por ARQUIVO, e
o WOFF de cada peso tem o seu próprio `GSUB` — nada obriga dois pesos da mesma família a
concordarem. A primeira versão media `sora-latin-400`, que o `src/index.css` **não** importa (ele
pede 600 e 700): arquivo que o navegador nunca baixa. Os pesos saem hoje dos `@import` do próprio
CSS, então importar um peso novo e esquecer de medi-lo deixou de ser possível.

**O que a medição decidiu:** o Inter do corpo **não** alinha por padrão — o `1` avança 833 e o
`4`, 1323, meio caractere de diferença por linha — mas **publica `tnum`**, então
`font-variant-numeric: tabular-nums` resolve, e a coluna numérica **não** precisa cair para a
mono. Newsreader já vem com figura tabular (é serifada de texto, com algarismo alinhado por
construção) e PT Mono é monoespaçada: nas duas, a utility é inócua e não atrapalha.

**Onde entrou:** na `VitraDataTable`, no elemento `<table>` INTEIRO — não coluna a coluna.
Marcar cada coluna numérica falharia na primeira tela que esquecesse a `meta`, e falharia **muda**
(o número continua lá, só desalinhado). Data, código e telefone alinham junto, o que numa grade
de ERP é ganho. `columnDef.meta.numeric` continua existindo e passou a decidir **só o alinhamento
à direita**, que é outra pergunta.

### Densidade da linha — escolha do operador (2026-08-14, issue #123)

`padrao` = a célula de **52px** da §DataTable; `compacta` = **40px**, o piso da faixa consolidada
(40–44px compacto, 48–56px padrão). Quem confere cinquenta linhas quer as cinquenta na tela; quem
lê uma a uma quer respiro — fixar um dos dois é escolher pelo outro.

A troca é CSS puro sobre a mesma marcação (`[&_td]:h-10` na instância da tabela, que ganha da
`h-[52px]` da célula por especificidade, sem `!important` e sem tocar o componente compartilhado).
**Densidade não refaz consulta:** ela muda o desenho, não a pergunta — e há teste fixando isso.

O controle mora ao lado de `Por página`, no rodapé: os dois respondem "quanto cabe na tela". Ele
some nas visões que não são tabela (#86), porque é a altura da LINHA que ele muda. A escolha entra
na **consulta favorita**, junto com visão e agrupamento.

## Layout

- Shell de 3 zonas inalterado (sidebar colapsável, header, conteúdo). Bloco da empresa ativa no topo da sidebar; item de navegação ativo = Folha com traço preto.
- Área de conteúdo = Bancada com grade de 52px; a folha pousa opaca por cima.
- Grade de campos 12 colunas com `items-end`: inalterada.
- Densidade da tabela SOBE (é o pedido da amostra): cabeçalho **42px**, célula **52px**. A densidade de comanda continua valendo no formulário; a listagem ganha ar porque é onde o operador mira com o mouse.

## Components — método de construção

**Base: `react-aria-components`** (pin 1.20.0), como nas fases 1 e 2 — a 1.5 muda a PELE, não a base.
`ekmas/neobrutalism-components` entra como referência visual; seu código é Radix e não se copia aqui.

1. Primitivos de `src/components/ui/` re-estilizados pelos tokens desta spec.
2. **Guarda Tailwind v4 obrigatória**: `pnpm build` + `grep -o 'width:--[a-z-]*' dist/assets/*.css` = zero.
3. Receita: traço 2px preto · raio pela natureza · elevação por degrau · foco pela utility `focus-ring` (§Foco) · lift pela utility `lift-control` (§Lift).
4. **Hover-lift é de PEÇA SOLTA** — botão e cartão clicável, o que tem caixa e sombra próprias e espaço em volta para se mover. **Item de menu NÃO levanta**: `.menu-item:hover` da amostra troca fundo e cor de borda, e só. Item encosta em item — levantar um abre fresta na fileira, que é o mesmo motivo de item não arredondar. Linha e célula de grade também não: lá o amarelo marca foco e o violeta marca seleção.

### Foco
**Amarelo sozinho não sobrevive ao papel claro.** O `--ring` dá **1,56:1** sobre o cartão branco
(era 1,42:1 sobre a Folha da 1.6) — a WCAG 1.4.11 pede 3:1 de um indicador de foco, e um anel que
só o operador de vista boa enxerga não é indicador. Quem carrega o contraste é o **fio preto por
fora do amarelo**: 18,76:1 contra o cartão, e 12,05:1 entre o amarelo e o próprio fio. O amarelo é
a IDENTIDADE do foco; o preto é o contraste. São dois papéis, e é por isso que o anel não precisa
de uma cor "que passe sozinha".

**O azul Polaris `#005BD3` esteve aqui e saiu (2026-08-18).** Ele passava sozinho (5,96:1) e por
isso pareceu equivalente — mas trocou a marca de foco que o operador reconhece de longe por um
anel igual ao de qualquer admin, para resolver um problema que a receita já resolvia. Há teste de
invariante segurando `--ring` amarelo.

Leitura de dentro para fora: borda preta do controle · 3px amarelos · 4px preto · papel.

A receita mora num ponto só, em `src/index.css`:
- **`focus-ring`** — peça com borda própria (botão, campo, aba, item de menu). `outline` amarelo de
  3px + `box-shadow` preto de 4px de spread. Aplicar sempre por variante: `focus-visible:focus-ring`,
  `group-data-focus-visible/checkbox:focus-ring`.
- **`focus-ring-inset`** — peça SEM borda própria, onde o anel externo invadiria o vizinho: célula
  editável da FormGrid (a malha É o campo) e linha da DataTable. Mesma leitura, virada para dentro.
  Vence a versão externa por ordem de definição no CSS, então **fica definida depois dela**.

**A elevação não compõe com o anel**: no foco o halo É o destaque, e um `el-*` de 3px de
deslocamento ficaria escondido atrás dele. Onde este doc dizia "foco + `el-2`", vale o halo.

Nunca escrever a receita à mão no componente — recalibração de foco tem que mudar tudo de um ponto só.

### Desabilitado
**Estado desabilitado nunca é dito por cor clara** (decisão do user, 2026-08-14, `project-core`
@regras). Ícone e rótulo de controle desabilitado ficam na **tinta do tema**. O que muda é o
**fundo** (superfície apagada) e o **traço** — nunca a opacidade do conteúdo. Vale para botão,
ícone, campo somente-leitura e item de menu. Estado se diz por **forma, posição, rótulo e fundo**;
nenhum controle pode depender de baixo contraste para comunicar estado.

**A origem é medida, não opinião.** Havia um token `--text-disabled` a **1,73:1 sobre a Folha**, e a
barra de ações do Cadastro de Produtos o usava: `Alterar`, `Consul.` e `Excluir` desabilitados
sumiam no papel. O token foi **removido** — enquanto existisse um nome para "tinta apagada", o
próximo controle voltaria a usá-lo. No lugar entrou um par de superfície e traço:
`--surface-disabled` e `--rule-disabled`, um valor por tema.

A receita mora num ponto só, em `src/index.css`, em duas classes:
- **`desabilitado`** — o controle inteiro apaga (botão, campo, item de menu, aba, gatilho de
  accordion, caixa do `InputGroup`). Gatilhos: `:disabled` (nativo — e é ele que pega descendente
  de `<fieldset disabled>`, que é como o `CadastroForm` faz o modo consulta), `[data-disabled]`
  (RAC e cmdk), `[aria-disabled]` (item que continua focável) e `:has(:disabled)` (a caixa cujo
  campo de dentro é que está morto). Declara `opacity: 1` para desfazer o clareamento que RAC e
  cmdk trazem de fábrica.
- **`marca-desabilitada`** — o controle cujo estado mora numa PEÇA, não na caixa: o quadrado do
  checkbox e o círculo do radio. Vai no indicador, porque a raiz desses dois embrulha o **rótulo**,
  e pintar ali daria uma faixa cinza atrás de texto corrido. O segundo gatilho é
  `fieldset:disabled`, porque a RAC não escreve `data-disabled` quando ninguém passou `isDisabled`.

**A perda da sombra é o terceiro canal, e é de FORMA.** No escuro a superfície apagada e a Folha
estão a 1,16:1: fundo e traço sozinhos quase não diziam o estado — conferido em render, com
`Alterar` morto e `Filtro` vivo saindo iguais na foto. Por isso `lift-control` passou a zerar a
sombra no desabilitado: o controle vivo REPOUSA elevado (`el-2`) e o morto fica rente ao papel.
Antes disso o desabilitado mantinha o `el-2` — um botão morto com cara de peça pronta para apertar.

**As duas classes usam seletor de especificidade (0,3,0), e isso é parte da receita, não detalhe de
implementação.** Com (0,2,0) elas empatariam com `hover:bg-*` e `data-selected:bg-*` do mesmo
elemento, e o desempate ficaria por ordem de geração do Tailwind: o controle morto voltaria a ser
repintado com a cor de quem responde ao mouse, e o checkbox marcado-e-desabilitado voltaria ao
violeta com o `✓` branco por cima do cinza. É o mesmo defeito por outra porta.

**E as duas moram FORA de `@layer`, depois do `* { border-color }`** — ver a pendência 6 da
§Medição de contraste. Escritas como `@utility`, elas caíram na camada `utilities`, que perde para
o `*` sem camada, e **o traço apagado saiu preto na foto**. Mover este bloco para dentro de um
`@layer`, ou para cima do `*`, mata o traço em silêncio; a guarda de teste checa a posição.

**A etiqueta do campo NÃO apaga.** Ela é o que diz o que o campo é, e apagá-la tira o nome do dado
justamente quando o operador não pode mexer nele. Conferido em render no modo consulta de Produtos:
etiqueta nítida sobre campo apagado lê melhor que os dois apagados juntos.

**O que NÃO entra na receita:** `pointer-events: none`. O botão desabilitado precisa continuar
recebendo evento de mouse para o browser mostrar o `title` — a barra de ações da DataTable promete
explicar ali por que a ação está morta, e com o ponteiro desligado a explicação existiria no DOM e
nunca na tela. Não clicar já é garantido pelo atributo `disabled`.

**Números** (§Medição de contraste): tinta sobre a superfície apagada **12,89:1** claro ·
**14,55:1** escuro — o piso de 4,5 sobra. Traço apagado sobre ela **3,58 / 3,49:1**, acima dos 3:1
de 1.4.11. A superfície apagada contra a Folha mede **1,48 / 1,16:1**: é degrau de região, e quem a
delimita é o traço, mesma economia da Bancada × Folha (1,10:1).

**Conferido em render, nos dois temas** (método do `@comorodar`), na barra de ações da listagem de
Produtos e no formulário em `?modo=consulta`. Estilo computado no Chrome, idêntico nos dois:
fundo `--surface-disabled`, traço `--rule-disabled`, tinta cheia — botão, campo, gatilho de combo,
botão `...` de cadastro rápido e indicador de checkbox.

**Campo somente-leitura** (`readOnly`, hoje só em `<EnderecoBlock>`) não recebe apagamento nenhum —
lê como campo normal. Está conforme a regra (o valor está em tinta cheia), mas o estado não é dito
por nada: é pendência de desenho, não de contraste.

A guarda é `src/components/ui/desabilitado.test.tsx`: varre `components/`, `features/` e `app/`
atrás de qualquer gatilho de desabilitado seguido de `opacity-*`, e confere os tokens no CSS.

#### A varredura de 2026-08-14 — o que era e o que sobrou

Dezoito lugares clareavam conteúdo para dizer desabilitado, em 15 arquivos: `button` · `input` ·
`textarea` · `label` (duas formas: `peer-` e `group-`) · `input-group` (grupo e adorno) ·
`checkbox` · `radio-group` · `tabs` · `accordion` · `command` (campo e item) · `dropdown-menu` ·
`menubar` · `navigation-menu` (dois) · `sidebar` (item e subitem) · `filtro-controles`. Todos
passaram para a receita. **Não é lista de conserto de tela: é uma classe de defeito, e por isso o
que fica no lugar é uma receita com guarda, não 18 correções.**

Três trocas de vizinhança, do mesmo movimento: o adorno do `InputGroup` com o grupo desabilitado
**escurece** (secundário → tinta cheia) em vez de clarear, porque sobre a superfície apagada ele
mede 3,50:1; a estrela "não é a consulta padrão" da `consultas-favoritas` perdeu o `opacity-40` —
quem diz o estado é o preenchimento (`fill-current`), e a opacidade era um segundo canal dizendo a
mesma coisa pior; e o chevron do `LookupCombo`, do `filtro-controles` e a lupa do `Command` trocaram
`opacity-50` por `text-muted-foreground`, que é token MEDIDO (4,72–5,19:1) em vez de um número solto.

**O que a varredura achou e a regra do desabilitado NÃO alcançava** — dois estados que só apareceram
porque alguém foi olhar: o checkbox em `<fieldset disabled>` continuava violeta-cheio (ninguém
escreve `data-disabled` ali), e nenhuma borda do repo obedece à utility que a nomeia (pendência 6 da
§Medição). O primeiro está corrigido; o segundo é decisão do user.

**Opacidade que FICA, e por quê** — o proibido é opacidade que diz *estado de controle*, não
opacidade:
- `sheet.tsx` — animação de entrada/saída da gaveta.
- `sidebar.tsx` — rótulo de grupo com a barra colapsada (0/100, com `pointer-events-none`) e ação
  de item revelada no hover.
- `command.tsx` / `lookup-combo.tsx` — o `✓` do item selecionado (0/100). Presença/ausência é
  binário, não clareamento.

**Fora da zona, com dono** — `src/features/dashboard/hoje.tsx:128`: o dia de fora do mês na grade do
calendário é `text-muted-foreground opacity-60`, que derruba o secundário abaixo do piso AA. Não é
controle (é `<div>` sem ação), então a guarda não o pega e a regra do desabilitado não o alcança —
mas é texto abaixo de 4,5:1. Conserto é tirar o `opacity-60` e deixar o token secundário sozinho.

### Button
Fundo Folha, traço 2px, raio de controle. Primário = violeta com texto branco (hover `main-hover`).
Destrutivo = vermelho com texto branco. Compacto para barra de ações. Desabilitado pela receita da
§Desabilitado — rótulo e ícone em tinta cheia, fundo e traço apagados, ponteiro VIVO (é ele que
entrega o `title` com o motivo).

### Badge / Stamp
Item (raio 0), traço 2px, mono 11px, `el-1`. Tons: primária (violeta) · marca (roxo) · dinheiro (verde) ·
bloqueio (vermelho) · pendência (amarelo) · neutro (Folha). O mapeamento tom → situação do carimbo
continua `[a resolver]` até a enumeração real do backend.

### Campo (input · select · textarea)
Fundo Folha, traço 2px, raio de controle, foco pela `focus-ring` (§Foco). **Rótulo é etiqueta**:
caixa clara com traço 2px, mono 10px, caixa alta — não texto solto acima do campo.

### DataTable (assinatura)
Caixa de dado (raio 2px, `el-3`, `overflow:hidden`). **Cabeçalho: caixa clara, letra preta, mono 11px
tracking 0.12em, 42px, régua inferior 3px** — a barra preta sólida sai. Célula 52px com régua de 2px
entre linhas, e **sem malha vertical** — a régua horizontal já delimita, e coluna fechada dos dois
lados vira gaiola. Linha selecionada = **violeta com texto branco**, mais peso 600 e `aria-selected`:
cor sozinha não diz estado (1.4.1). Linha focada = utility `focus-ring-row`, que monta UM anel com as
partes que cada célula pode desenhar (topo e base em todas, lateral só na primeira e na última) —
`box-shadow` no `<tr>` não pinta sob o `border-collapse` que a tabela herda do preflight, e anel por
célula desenharia uma moldura por coluna.
Célula de dinheiro em verde sobre zona de valor (e sem zona quando a linha está selecionada).
`rowNumbers` e cabeçalho agrupado: mecanismos inalterados.

### CadastroForm / BandaDeIdentidade (assinatura)
Painel (raio 10px, `el-3`) com **faixa de acento** de 8px à esquerda e zona de identidade no fundo.
Título em Display; contexto em Meta. Rodapé fixo com régua superior de 3px. Modo consulta via
`<fieldset disabled>`: inalterado.

### FormGrid (assinatura)
Mesma malha da DataTable; célula editável sem borda (a malha É o campo), foco pela `focus-ring-inset`.
Faixa de seção com fundo Neutro e réguas de 2px. Totais na zona de valor, `Total` em Display com régua
de 3px acima. Negativo em vermelho.

### Indicadores (KPI)
Cartão (raio 6px, `el-1`; `el-4` quando é o número que a tela existe para mostrar), rótulo em etiqueta,
valor na voz de **QUANTO** (PT Mono) 1.5rem, delta em corpo pequeno. Zona por conteúdo quando o
número for dinheiro, pendência ou bloqueio.

**O número grande NÃO leva negrito** (decisão do user, 2026-08-13): o `@fontsource` publica só o
peso **400** do PT Mono, e `font-bold` sem arquivo de 700 vira negrito sintético — o browser
engorda o traço por conta. Quem dá presença ao número aqui é a **largura da mono e a
tabularidade**, não o peso. Vale para os três números grandes do sistema: KPI do Dashboard,
grandeza do Planner e progresso de Tarefas. Se um dia entrar uma mono com 700 de verdade, este é
o lugar que muda.

### Navegação
Abas, paginação e itens de menu são ITENS: raio 0, encostados (margem negativa de 2px para o traço não
dobrar), ativo em violeta. Menu é cartão com `el-3`. Migalha em mono.

### Peças acrescentadas na 1.6
Todas sobre `react-aria-components`, com a pele daqui. A referência do neobrutalism.dev é **visual**
— o código de lá é Radix/base-ui e não se copia (§Components).

- **Accordion** — `Disclosure`/`DisclosureGroup` da RAC, que já entrega `aria-expanded`/
  `aria-controls` amarrados e cabeçalho de verdade (`<h3><button>`). Seções são ITENS: raio 0,
  coladas, separadas por régua de 2px. Serve para dobrar seção de formulário longo; **não** para
  esconder campo obrigatório — dado que o operador precisa conferir não pode depender de ele
  lembrar de abrir uma gaveta.
- **Menubar** — barra de COMANDOS. É `Toolbar` com botões de menu, **não `role="menubar"`**: a RAC
  não tem menubar, e o padrão exige gerência de foco própria; um `role="menubar"` mal implementado
  é pior que nenhum, porque o leitor de tela entra em modo de aplicação e passa a esperar um
  teclado que não existe.
- **NavigationMenu** — barra que leva a LUGAR. `<nav>` com nome acessível, itens em `<a href>`,
  tela atual em `aria-current="page"`. É arquivo separado do Menubar de propósito: navegação que
  dispara ação surpreende quem abre em outra aba.
- **HoverCard** — cartão de apoio no hover. Abre só com ponteiro de mouse (em toque abriria por
  cima do que o dedo foi tocar), abre também no foco, e demora a fechar — é a ponte para atravessar
  até ele e clicar. **Nada que só exista dentro dele pode ser necessário para operar.**
- **Carousel** — trilho que ROLA (`overflow-x` + scroll-snap); os botões só chamam `scrollBy`.
  Assim roda do mouse, gesto e setas continuam de graça e o `Ctrl+F` acha o que está fora da vista.
  Sem autoplay. Não serve para o que se compara — aí a peça é tabela.
- **Breadcrumb** — `Breadcrumbs` da RAC, **copiado do staging `neobrutalism-aria/`** com o mapa de
  tokens aplicado: mono no lugar de `font-head` (migalha é identificador de lugar), anel amarelo no
  lugar de `outline-primary` — o original não estilizava foco, e migalha é caminho de volta. O
  separador é responsabilidade do ITEM (o `isCurrent` que a RAC entrega), não de um componente
  solto que obrigaria a tela a contar posições na mão.
- **AlertDialog** — a confirmação que interrompe. A diferença para o `Dialog` não é visual: tem
  `role="alertdialog"` (o leitor anuncia como alerta e lê a consequência JUNTO do título, em vez de
  deixá-la depois do foco), **não fecha ao clicar fora** — sumir ao primeiro clique perdido é
  ambíguo, o operador não sabe se cancelou ou se a ação foi embora — e não tem "x" mudo: quem fecha
  é `Cancelar`, que diz o que faz. `Escape` continua valendo como cancelar. A descrição usa
  `slot="description"`, que é o que amarra o `aria-describedby`. Leva o ornamento de alerta a 40px
  em Danger/01 — o único lugar onde ornamento usa cor de estado, porque aqui o significado É erro.
- **Empty** — a anatomia única do estado vazio (ornamento · título · descrição · ação), copiada do
  staging sem a caixa própria: o vazio quase sempre mora dentro de algo que já é caixa. Existe
  porque a memória lista **seis** vazios diferentes, e escritos à mão eles divergem — e o que separa
  um bom vazio de um ruim é dizer a coisa certa: "não existe registro" pede cadastrar, "a busca não
  achou" pede corrigir o termo.
- **Gaveta para mudança forte** — trocar de empresa é gaveta (`Sheet`), não menu suspenso: menu é a
  peça de escolha barata e trataria "muda o escopo de todo dado da tela" com o mesmo peso de
  escolher uma coluna de ordenação. A gaveta para a tela, diz por escrito o que vai acontecer e
  cobra um clique a mais.

### Quadro de tarefas e gantt (Dashboard · Planner)

Três decisões de cor destas duas telas, registradas porque abrem exceção ou
escolhem entre caminhos que a paleta permitia igualmente:

- **`Alta` na pill de prioridade usa a zona de BLOQUEIO (vermelho).** É uso da
  cor de erro fora de erro, e vale porque prioridade alta é o que trava a fila
  do dia — mesma família de significado. A exceção termina aí: **nada de
  ornamento vermelho ao lado**, e nenhum outro vermelho nas duas telas. `Média`
  fica na zona de pendência, `Baixa` na de apoio. O rótulo é sempre escrito —
  três chips que só diferem de tom são mudos para daltônico e para leitor de
  tela.
- **A barra do gantt é colorida pelo TIPO do item, não pela fase.** A fase já é
  lida na coluna da esquerda, que agrupa e nomeia; repeti-la na cor gastaria o
  único canal que sobra. Pelo tipo, a barra reusa o par de módulo que o sistema
  já ensinou: pedido → Compras, entrega → Estoque, tarefa → Vendas — o mesmo mapa
  da agenda do Dashboard.
- **Progresso é VIOLETA, nunca verde.** Verde é dinheiro; barra de progresso já
  pertence ao violeta de ação (§Acentos). A marca de HOJE no gantt é a mesma
  tinta, pelo mesmo motivo — é o "onde estamos" do sistema.

**O KPI de dinheiro não leva ornamento.** O número dele não é de módulo nenhum:
é verde, e verde é cor com dono, que ornamento não pode usar. Emprestar o shape
de Produtos ou de Vendas diria que o total do mês pertence àquele cadastro —
quem marca o cartão é a zona de valor mais o verde do número. Os outros três KPIs
levam o shape do módulo a que o número se refere, em papel de ÍCONE (20px): a
fileira se lê como mapa, exatamente como a fileira da sidebar, e é por isso que
ela não viola o teto de um ornamento por região.

### Gráfico
Contorno preto de 2px em cada forma, preenchimento de cor cheia dos acentos. Eixo em traço de 2px.
Rótulo em mono 10px. Sem gradiente, sem sombra interna.

### Lift — o "pulo" (§3b da fase 1.6)
A microinteração do sistema, nas utilities `lift-control` (peça que já tem sombra) e `lift-flat`
(peça lisa que a GANHA no hover). O hover da 1.5 foi avaliado como fraco pelo user — "sidebar sem
reação nenhuma, botões sem pulo" — e a mecânica passou a ser:

| estado | peça | sombra |
|---|---|---|
| repouso | 0 | `el-2` (ou nenhuma, em `lift-flat`) |
| hover | `translate(-2px,-2px)` | um degrau acima |
| press | `translate(2px,2px)` | **nenhuma** — a peça entra na própria sombra |

Isto **substitui a geometria da 1.5**, que mantinha a borda externa da sombra parada nos 3px e por
isso limitava o hover a -1px: aquela regra fazia a peça crescer sem sair do lugar, e o pedido é que
ela saia. Press com sombra zero e não `el-1` porque com a sombra pequena o elemento ainda parece
flutuar meio pixel e o gesto perde o fim.

`ease-out` em 140ms: sai rápido e assenta devagar, que é como o olho lê "respondeu ao meu mouse".
`:active` e `[data-pressed]` valem juntos — o `usePress` da RAC chama `preventDefault` no
pointerdown e em parte dos browsers isso engole o `:active`.

**Item de menu da sidebar agora levanta** (revoga a decisão da 1.5): ganha traço de Tinta, pastel
/02 do módulo e o pulo; ativo é a cheia /01. **Subitem** segue o pai, com ativo em violeta cheio,
traço e `el-2`. Linha e célula de grade seguem sem levantar.

**Aba também pula** — §3b a lista junto do chip clicável. Ela ganha `lift-flat`, borda reservada
transparente (aparecer no hover sem empurrar a fileira 2px) e, quando selecionada, violeta cheio
**com traço de Tinta** e `el-2`.

Do staging `neobrutalism-aria/` vieram, além do subitem e da aba: **borda reservada transparente**
nas ações da sidebar, **caixa preta de 2px no contador** (ele é dado, e dado mora dentro de caixa),
a **seta do tooltip** — com vários controles a 8px um do outro, a caixa preta sozinha não diz de
qual deles ela fala — e `disabled:cursor-not-allowed` no botão. Este último **conserta uma
armadilha**: o `disabled:pointer-events-none` que estava lá faz o browser parar de mostrar o `title`
nativo, e a barra de ações da DataTable promete exatamente explicar pelo `title` por que uma ação
está morta. Não clicar segue garantido pelo atributo `disabled`.

Ficou de FORA o `SidebarInset` com moldura própria (`border-2` + `m-2` + sombra): ele acrescentaria
uma caixa entre a bancada e a folha, e caixa a mais é decisão que se confere vendo rodar.

**Foco cancela o lift** (`transform: none`) — peça focada e sob o mouse ao mesmo tempo ficaria
deslocada com o halo em volta, duas leituras de estado brigando. Enquanto há foco, quem manda é a
`focus-ring`; por isso ela é definida DEPOIS da `lift-control` no `index.css`, e a ordem no arquivo
é o que decide a cascata.

`:active` e `[data-pressed]` valem juntos: o `usePress` da RAC chama `preventDefault` no pointerdown
e em parte dos browsers isso engole o `:active`.

Nunca escrever a receita à mão no componente.

## Casca global — appbar, gaveta e regra de quebra

Cromo que aparece em **toda rota**, vive no `AppShell` (`src/app/shell.tsx`) e nunca na página —
igual `data-modulo` do `<main>`. Origem: mockup `mockup-dashboard-cores.html`, sessão Cowork
2026-08-08.

### Appbar

Faixa própria (`src/app/appbar.tsx`), acima do cabeçalho de página, presente em toda rota. À
esquerda, a **entrada da paleta de comandos** (240px, `Pesquisar…` + a etiqueta `Ctrl+K`); cluster
à direita: engrenagem (**desabilitada** — não existe tela de configurações; um botão que não leva a
lugar nenhum é pior que apagado, a mesma razão que desabilita `Alterar`/`Consul.` sem `get` no
contrato) · sino com badge de não-lidas (abre a gaveta) · divisor · usuário (avatar + nome + papel +
chevron, menu com `Sair`).

#### Paleta de comandos (`src/app/paleta-de-comandos.tsx`)

A entrada da appbar **era chrome puro** — aceitava digitação e não fazia nada, porque não há busca
global no sistema. Deixou de ser: ela abre a paleta (ir para qualquer tela · abrir registro novo).
Anatomia vinda da command palette do Supabase Studio (Apache-2.0); o conteúdo é montado da
navegação daqui.

**É BOTÃO com cara de campo, não `<input>`.** O que parece campo de texto e responde abrindo um
diálogo mente sobre o que a digitação vai fazer.

**Dois caminhos, e o clique é o que manda.** O botão é o acesso por mouse que a decisão de interface
por clique exige; `Ctrl+K` — que já estava no registry (`src/lib/shortcuts.ts`), não é atalho novo —
fica como conveniência e vem **escrito na própria peça**, para quem prefere teclado aprender sem
documentação.

**Oferece só o que a EMPRESA ATIVA alcança:** lê os mesmos `gruposVisiveis` da barra lateral, então
tela sem recurso some das duas ao mesmo tempo. O `Incluir` de cada tela é publicado por ela na
navegação (`NavItem.incluir`); tela que não cria registro não aparece no grupo, em vez de oferecer
um comando que leva a 404. Estando numa tela, o `Incluir` dela encabeça a lista — e não se repete
embaixo.

**Fora dela de propósito:** `Alterar`/`Consul.`/`Excluir` (agem sobre a linha selecionada, que é
estado de dentro da listagem — de fora, teriam de perguntar "qual registro?", e quem responde isso é
a própria listagem) e busca por REGISTRO (exigiria consulta ao servidor a cada tecla em todo recurso,
e o contrato não tem busca global).

**Fronteira lucide × shape continua valendo aqui**: busca, engrenagem, sino e chevron são AÇÃO de
sistema, não lugar — vêm do lucide, não do acervo brutalist. Um "segundo vocabulário" de ícone
customizado (SVG de traço 2.2px, como no mockup) ficou proposto e SEM resposta do user; usar lucide
é a opção já aprovada e reversível, não uma antecipação da decisão pendente.

### Gaveta de notificações (`src/app/gaveta-notificacoes.tsx`)

**Empurra, nunca sobrepõe** (decisão do user — "não quero que sobreponha, e sim empurre"). É coluna
FLEX IRMÃ do `<SidebarInset>`, dentro do wrapper do `SidebarProvider` — não `position: fixed`, sem
véu, sem trava de scroll do `body`. Anima `width` 0↔312px; o conteúdo só MONTA aberta (não é só
`overflow-hidden`) — fechada, nem o botão "Fechar" nem as notas ficam no tab order, e o texto
acessível "Fechar" não colide com o do `Dialog`.

Fundo laranja **cheia** do Boletim (`bg-modulo-cheia` + `data-modulo="boletim"` no `<aside>`), texto
no `text-foreground` padrão — o MESMO par que o item ativo da sidebar já usa
(`data-active:bg-modulo-cheia`, `sidebar.tsx`), sem token novo. Não-lida é bolinha (nunca corte
lateral — reprovado 2× no mockup: 7px no kanban em 07/08, de novo na própria gaveta em 08/08). `Esc`
fecha de qualquer lugar dentro dela; foco entra no X ao abrir.

Notificação é **casca com dado de mock** (`src/mocks/notificacoes.ts`) — não há
`/api/notifications` no contrato, e esta fatia é sobre o CROMO, não sobre notificação de verdade.
Contagem real, push e "marcar lida" persistente ficam para quando o caminho existir.

### Regra de quebra — `auto-fit`/`flex-wrap`, nunca `@media`

Toda grade do Dashboard e Tarefas responde ao espaço real em vez de um breakpoint fixo — o que
importa porque a gaveta aberta encolhe o `<main>` de um jeito que nenhum `lg:`/`xl:` prevê:

- **KPIs** (`indicadores.tsx`) — `grid-cols-[repeat(auto-fit,minmax(208px,1fr))]`.
- **Painéis do meio** (calendário/agenda/pendentes, `hoje.tsx`) — `flex flex-wrap`; calendário leva
  `flex-[0_1_300px]` (não cresce além de 300px), agenda e pendentes levam `flex-[1_1_330px]` cada.
- **Colunas do quadro** (`quadro.tsx`, agora em `/tarefas`) — mesma técnica do KPI,
  `grid-cols-[repeat(auto-fit,minmax(238px,1fr))]`.
- **Appbar, cabeçalho de página e barra de abas** — `flex flex-wrap` (já eram, na appbar por
  construção).

Os valores decimais (`gap-5.5` = 22px, `p-4.5` = 18px, `py-3.25` = 13px…) são o TOKEN de espaçamento
do Tailwind v4 (`calc(var(--spacing) * N)`, gerado para qualquer N) batendo os alvos do mockup em
vez de `px` solto — `gap-[22px]` seria a mesma coisa cravada fora do sistema.

**Conferido rasterizado (§@comorodar), 1280px, gaveta ABERTA, claro e escuro:** zero scroll
horizontal, KPIs e colunas do quadro quebram em vez de esmagar.

### Dashboard ≠ Tarefas

O quadro (kanban), a lista e "Progresso das tarefas"/"Carga por responsável" SAÍRAM do Dashboard e
viraram rota própria `/tarefas` (`src/features/tarefas/`, item de sidebar entre Dashboard e
Planner, shape `spark-020` do acervo emprestando o coral do Boletim — mesma técnica de
`SHAPE_DE_LUGAR` do Planner/Colaboradores). O Dashboard fica só com o panorama do dia: KPIs,
calendário, agenda, pendentes. Motivo: o user reclamou "está muita coisa/poluído" depois de aprovar
o preenchimento por cor — a resposta é uma tela por assunto, não mais densidade na mesma tela.

`Painel`/`Barra` (ex-`features/dashboard/painel.tsx`) e `FalhaDoPainel` (ex-`falha.tsx`) subiram
para `src/components/cabinet/`: viraram compartilhados de fato quando Tarefas passou a precisar
deles ao lado de Dashboard e Planner (Planner já importava os dois de dentro de `dashboard/`, uma
violação de fronteira que a mudança também corrige).

## Regra da explicação no hover

**Todo DESTINO de navegação diz, no hover, o que a tela faz.** Item de menu, atalho do Boletim,
link de card — o que leva a algum lugar carrega uma linha de propósito, não só o nome. No menu isso
é `descricao` no `NavItem`, **obrigatória no tipo**: tela nova sem descrição não compila, senão o
cartão volta a ter buracos conforme o sistema cresce.

Por que existe: nome de tela de ERP raramente é auto-explicativo para quem chegou agora — `Ordem de
Compra` e `Pedido de Compra` são o exemplo em casa. E o operador aprende o sistema navegando, não
lendo manual.

**Onde NÃO vale — e a lista importa tanto quanto a regra:**

- **Botão de ação cujo rótulo já é o verbo** (`Incluir`, `Alterar`, `Imprimir`). A explicação
  repetiria o rótulo. Ali a peça é a DICA (`tooltip`), e só quando o rótulo some — botão de ícone,
  barra colapsada.
- **Confirmação destrutiva.** A consequência vai no corpo do diálogo, onde é lida antes da resposta.
  Nunca em hover.
- **Mecânica de tela** — paginar, ordenar, fechar, alternar tema. Não são destino.

**A regra que vem junto continua valendo:** nada que só exista no hover pode ser necessário para
operar. Conteúdo de hover é inalcançável no toque e cansativo no teclado — a explicação ACRESCENTA,
nunca substitui um caminho. É por isso que o cartão do menu mostra telas que já estão listadas na
barra: o que ele adiciona é o PROPÓSITO delas, não o acesso.

**O gatilho é o PRÓPRIO item, e o cartão fala só dele.** Pousar em `Fornecedores` explica
Fornecedores — não abre a lista do grupo. Uma versão anterior pendurou o cartão no rótulo do grupo e
mostrava as telas irmãs: era a seção reescrita ao lado dela mesma, e foi recusada duas vezes antes
de a leitura certa aparecer. Cartão de item explica o item.

**O cartão traz SÓ a explicação — o nome já está no item que o disparou.** Repetir o rótulo dentro
do cartão é a mesma duplicata que o tirou do rótulo do grupo.

**Por isso ele vale no EXPANDIDO e a dica vale no COLAPSADO.** O cartão vence a dica onde os dois
poderiam aparecer; num estado em que o nome não está na tela, um cartão sem nome trocaria a única
identificação do ícone por uma frase solta. Onde o rótulo sumiu, a peça é a dica.

## Motion

Movimento aqui serve para dizer que a tela trocou, não para enfeitar — é ferramenta de oito horas.
Três receitas, e a lista do que NÃO anima vale tanto quanto elas.

| o quê | receita | onde mora |
|---|---|---|
| Entrada de tela | fade + sobe 16px, mola `{120,30}`, escalonamento ≤80ms (teto de 6 regiões) | `<Entrada>` (lib `motion`) |
| Peça que aparece (popover, menu, diálogo, dica) | fade + escala 0,96→1, mola `{400,30}` | `pop-spring` (CSS) |
| Cortina do diálogo | só opacidade, 160ms | `fade-veil` (CSS) |
| Hover e press | §Lift, 140ms `ease-out` | `lift-control` / `lift-flat` (CSS) |

**A entrada anima na MONTAGEM e só.** Quem garante "uma vez por navegação" é a `key` por caminho
que o shell dá à folha: trocar de tela remonta e anima; paginar, ordenar e digitar mexem em search
params ou estado, não no caminho, e não animam. Animação que se repete a cada re-render é a que faz
o operador esperar a tela parar de se mexer.

**Popover e companhia NÃO usam a lib**, e é decisão: quem os monta e desmonta é a
`react-aria-components`, que segura o nó vivo enquanto houver animação CSS correndo e só então
devolve o foco ao trigger. Trocar isso por `AnimatePresence` seria tirar dela a desmontagem. A mola
`{400,30}` está escrita em `linear()` de 30 pontos — uma bezier de 4 pontos não representa passar do
alvo e voltar.

**Nunca animam:** linha de tabela · célula de grade · campo · anel de foco.

`<MotionConfig reducedMotion="user">` fica na raiz e é item de DoD, não sugestão. Animação escrita
em CSS tem a própria rede: `@media (prefers-reduced-motion: reduce)` em cada receita.

Em teste, `MotionGlobalConfig.instantAnimations` salta para o estado final no primeiro quadro —
primeiro quadro, não mesmo tick: quem asserta visibilidade dentro da folha usa `findBy*`/`waitFor`.

## Roteiro de implementação (PR por fatia, na ordem)

**A — fundação:** tokens novos no `index.css` (superfícies, acentos, zonas, elevação, raio por natureza),
fontes self-hosted, este DESIGN.md. **B — primitivos `ui/`** na pele nova (button, badge, input, select,
textarea, checkbox/radio/switch, tabs, menu, table, skeleton, progress, avatar). **C — assinatura:**
DataTable (cabeçalho claro, 42/52px, seleção violeta), banda com faixa de acento, FormGrid, Stamp, KPI.
**D — varredura:** telas conferidas contra a amostra. **E — modo escuro** recalculado.
**DoD por fatia:** lint + types + testes verdes · guarda v4 zero · CI verde.

## Do's and Don'ts

### Do:
- **Do** dar à sombra a família quente do papel, sempre sem blur.
- **Do** escolher o raio pela natureza da peça — item encosta em item, e item não arredonda.
- **Do** usar violeta para o que MOVE e amarelo para o que PEDE ATENÇÃO (foco, pendência).
- **Do** escrever dinheiro em verde, negativo em vermelho, e manter quantidade em tinta.
- **Do** compor telas a partir de `src/components/cabinet/` — reimplementar tabela na tela é o vetor de deriva.
- **Do** tintar a área pelo conteúdo (valor/identidade/apoio/pendência/bloqueio) e só ela.
- **Do** rodar a guarda v4 em todo componente tocado.
- **Do** dar a todo destino de navegação uma linha dizendo o que a tela FAZ, mostrada no hover.

### Don't:
- **Don't** deixar ornamento preto ou cinza, nem editar o `fill` de um SVG à mão.
- **Don't** pôr mais de um ornamento por região visível.
- **Don't** animar linha, célula, campo ou anel de foco.
- **Don't** usar sombra preta, nem sombra com blur.
- **Don't** arredondar item (chip, aba, página, célula, etiqueta) — **o motivo é que item
  encosta em item e o canto abre fresta.** EXCEÇÃO registrada (2026-08-07, pedido do user): o
  item da SIDEBAR usa `rounded-control`, porque ali eles não encostam — há folga entre eles, e no
  estado colapsado `gap-1.5`. Onde a premissa não vale, a proibição não vale.
- **Don't** usar amarelo como cor de texto, nem violeta como cor de fundo de área grande.
- **Don't** voltar à barra preta sólida no cabeçalho de coluna ou na etiqueta.
- **Don't** carregar fonte de CDN.
- **Don't** levantar linha ou célula de grade no hover — lift é de controle.
- **Don't** improvisar o modo escuro tom a tom — ele é derivado desta paleta, com cada par medido.
- **Don't** deixar a folha branca no escuro: lá ela é um degrau ACIMA da bancada, não o extremo.

---

## Fase 1.7 — Fusão v5 (2026-08-19, decisão do user via Cowork)

Mockup aprovado: `docs/design/fusao-v5/mockup-orcamentos-v5.html` · espec: `espec-fusao-v5.md`.
Fusão, não substituição: a cara do v5 entra SEM revogar as lições medidas das fases 1.5/1.6
(contrastes remedidos, desabilitado por superfície, canto por natureza, 4 famílias self-hosted).

**Nesta fase (aplicado):**
- Bancada volta ao CREME `#F5F3EC` (supersede o cinza Polaris de 2026-08-13 apenas na bancada;
  folha branca, afundado e neutros intactos). Degrau térmico + contorno preto somados.
- Escada de sombras volta à família QUENTE (matiz 40, mesma escada de luz) — a regra de sempre:
  a temperatura da sombra acompanha a do papel.

**Pendências da fusão (1 issue por trilho):**
- Subdivisão explícita: moldura-mãe do documento com etiqueta + seções numeradas com barra de
  cor do módulo (`fsec`/`st-box` do mockup) nas telas de documento.
- Foco por zona via `:focus-within`: zona ativa acende, resto recua (opacidade .78 / brilho .94,
  220ms, sem escala). Desligado por padrão.
- Voltar/cancelar universal no canto superior esquerdo (appbar/page-frame).
- ~~Display condensado (Bebas Neue, fontsource) para número-herói~~ — **ENTREGUE** (#236). Não
  entrou no lugar de nenhuma: entrou como quinta, com um peso e emprego único (decisão do user,
  2026-08-19), e os tamanhos vieram depois — 36px no nome e no nº do documento, 48px no total,
  este último fora da grade, em bloco próprio (`TotalBox`).
- Sidebar escura com dots de módulo (avaliar contra a bancada creme antes de decidir).
