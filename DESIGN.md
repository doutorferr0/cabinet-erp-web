---
name: Cabinet
description: Sistema visual de um ERP denso, desktop, em PT-BR — documento comercial sobre papel quente, escala de neutros única, acento chartreuse de preenchimento, sombra dura de tinta e hierarquia tipográfica de 11 degraus.
# ATENÇÃO — este bloco é a ficha 2.0 e o CORPO da página ainda é 1.7.
# `docs/design/medir-contraste.py --frontmatter` compara cada linha abaixo com o
# token real; divergiu, uma das duas está mentindo. Ver a nota logo após o
# front-matter.
colors:
  bench: "#ece9e1"
  sheet: "#fffefa"
  sheet-sunken: "#f6f4ee"
  hairline: "#dcd7cb"
  rule: "#c9c3b5"
  ink-disabled: "#a9a395"
  ink-muted: "#6d675b"
  ink-secondary: "#4a463d"
  ink: "#16140f"
  main: "#e4f222"
  main-hover: "#e9f27a"
  main-foreground: "#16140f"
  main-text: "#4f5c00"
  ring: "#ffd23f"
  ok: "#0e7a4b"
  info: "#1c5fbf"
  warn: "#9a5b00"
  bad: "#b3261e"
  money: "#0e7a4b"
typography:
  display:
    fontFamily: "Gambarino, Georgia, serif"
    fontSize: "30px"
    lineHeight: 1.05
    fontWeight: 400
  pagina:
    fontFamily: "Gambarino, Georgia, serif"
    fontSize: "28px"
    lineHeight: 1.1
    fontWeight: 400
  registro:
    fontFamily: "Gambarino, Georgia, serif"
    fontSize: "24px"
    lineHeight: 1.1
    fontWeight: 400
  secao:
    fontFamily: "Gambarino, Georgia, serif"
    fontSize: "20px"
    lineHeight: 1.2
    fontWeight: 400
  bloco:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "13.5px"
    lineHeight: 1.3
    fontWeight: 600
  corpo:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "13.5px"
    lineHeight: 1.45
    fontWeight: 400
  ui:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "13px"
    lineHeight: 1.3
    fontWeight: 500
  meta:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "12px"
    lineHeight: 1.35
    fontWeight: 400
  rotulo:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "10.5px"
    fontWeight: 600
    letterSpacing: "0.12em"
    textTransform: "uppercase"
  dado:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "12.5px"
    fontWeight: 500
    fontFeature: "tabular-nums"
  dado-meta:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: 400
    fontFeature: "tabular-nums"
rounded:
  item: "4px"
  data: "4px"
  chip: "4px"
  control: "6px"
  card: "8px"
  panel: "10px"
  pill: "999px"
spacing:
  s-1: "4px"
  s-2: "8px"
  s-3: "12px"
  s-4: "16px"
  s-5: "24px"
  s-6: "32px"
effects:
  key-1: "0 2px 0 0 #16140f"
  key-2: "0 3px 0 0 #16140f"
  hard-soft: "3px 3px 0 0 #c9c3b5"
  hard-1: "2px 2px 0 0 #16140f"
  hard-2: "4px 4px 0 0 #16140f"
  hard-3: "6px 6px 0 0 #16140f"
---

# Cabinet 2.0 — híbrido

> **O que este documento é.** A verdade do que o Cabinet renderiza, escrita a partir do código, e
> a régua do que a próxima tela tem de fazer. Ele não descreve intenção: quando doc e código
> divergem, é o doc que está errado — e a divergência tem guarda automática, não confiança
> (§Medição). Reescrito na rodada **Reface 2.0** (issues #469–#498, 2026-09), a partir de
> `docs/design/mockup-reface-hibrido-2026-09-02.html` e
> `docs/design/auditoria-reface-2.0-2026-09-02.md`. As fases anteriores estão em
> `docs/design/historico/` e resumidas no fim desta página.
>
> **O front-matter YAML acima é medido, não redigido**, e ainda descreve a paleta 1.x: ele é
> conferido contra `src/index.css` por `medir-contraste.py --frontmatter`, e `src/index.css` é o
> arquivo que a issue D1 (#469) remapeia para os tokens 2.0. Enquanto aquele remapeamento não
> mergear, escrever Gambarino e chartreuse no YAML seria publicar como medição uma coisa que a
> tela ainda não faz. **Os nomes e valores da 2.0 estão em `src/styles/tokens-2.0.css`**, que é a
> fundação já no repo, e é o que as seções abaixo descrevem.

## Overview

O Cabinet é um ERP denso, desktop, em PT-BR, operado o dia inteiro pelas mesmas pessoas. Isso
decide quase tudo o que vem abaixo: quem usa não está descobrindo a tela, está **procurando um
dado nela pela quinquagésima vez**. Desenho que ajuda a primeira visita costuma atrapalhar a
quinquagésima — animação de entrada, ilustração grande, respiro generoso, rótulo explicativo.

O sistema é um **híbrido de duas heranças**. De baixo, o Polaris: superfícies, densidade, raios
pequenos, formulário com rodapé fixo. De cima, a folha de papel do brutalismo de fichário que este
produto tinha desde a 1.4: **sombra dura sem blur, traço preto de tinta, canto quase reto,
carimbo**. A 2.0 não trocou a herança — ela separou o que era assinatura do que era só peso: o
traço de 2px que antes contornava tudo virou gasto raro, e as superfícies passaram a se separar
sozinhas (bancada `n-100` contra folha `n-0`, contraste real, não 1,10:1).

Três leis que valem antes de qualquer detalhe:

1. **Cor tem dono semântico.** Verde = dinheiro, amarelo = foco, vermelho = erro, chartreuse =
   ação. Nenhuma delas decora.
2. **A hierarquia é lida sem ler.** Título, dado, rótulo e ação se distinguem por face, peso e cor
   — não por tamanho arbitrário. A régua está em §Tipografia e é lei.
3. **Uma ferramenta de separação por fronteira.** Espaço, hairline, tint, card: a mais barata que
   resolve, e nunca duas na mesma fronteira. Está em §Separação e também é lei.

## Cores

### A escala de neutros — cada degrau tem um papel

Nove degraus, sem cinza livre. O papel na coluna da direita é o que decide qual usar; escolher por
"parece a tonalidade certa" é o que produz três cinzas quase iguais na mesma tela.

| token | claro | escuro | papel |
|---|---|---|---|
| `--n-0` / `--folha` | `#fffefa` | `#171613` | folha — card, tabela, campo |
| `--n-50` / `--folha-2` | `#f6f4ee` | `#1e1c18` | header de tabela, zebra, rodapé de totais |
| `--n-100` / `--bancada` | `#ece9e1` | `#24221d` | fundo da aplicação |
| `--n-200` / `--hairline` | `#dcd7cb` | `#302e28` | divisor de linha |
| `--n-300` | `#c9c3b5` | `#3e3b33` | borda de controle |
| `--n-400` | `#a9a395` | `#625e53` | disabled, placeholder, ícone inativo |
| `--n-500` | `#6d675b` | `#948f82` | meta, rótulo, texto terciário |
| `--n-700` | `#4a463d` | `#cbc6b9` | texto secundário |
| `--n-900` / `--ink` | `#16140f` | `#f3f1ea` | tinta — texto e borda dura |

O tema escuro **inverte a mesma escala**, sob os mesmos nomes (`.dark`, `[data-theme="dark"]` em
`src/styles/tokens-2.0.css`). Consequência prática: componente que fala em `--n-500` funciona nos
dois temas sem uma linha de `.dark`; componente que fala em `#7e786b` quebra o escuro e ninguém
percebe até alguém abrir com o tema trocado.

### A rampa é OKLCH, e clarear é andar no degrau

 As oito rampas e a
escala de neutros são declaradas duas vezes em `src/styles/tokens-2.0.css`: hex no `:root` e
`oklch()` dentro de um `@supports (color: oklch(...))`. Todo navegador desde 2023 aplica o
segundo; o hex é rede para o resto e é a referência contra a qual o oklch é conferido.

**O que muda na prática:** em hex o degrau era uma promessa (`400 = fill`) que a paleta não
cumpria — `amber-400` era perceptivelmente mais claro que `indigo-400`. Em OKLCH o degrau É a
luminosidade: `L` igual em todos os oito matizes, `C` por degrau, só `H` muda. O tema escuro dos
neutros vira aritmética — mesmo `H` e `C`, `L` espelhada.

**Consequência para quem escreve componente:** precisa de uma variante mais clara ou mais
escura? Suba ou desça um degrau da rampa, ou componha com `color-mix`. **Hex novo em componente
continua proibido**, e agora tem motivo mecânico além do estético: um hex solto não participa da
uniformidade de `L`, então ele pesa diferente do resto do sistema em todo lugar onde aparecer.

**Quando um par reprova contraste, o que se mexe é a `L` do degrau.** Foi o que aconteceu com
`--n-500`: a Rodada 5 propunha `L .55`, e ali `.t-dado-meta` (4,38:1), `.t-rotulo` (3,95:1) e o
badge `mut` (4,20:1) ficavam abaixo do piso de texto. Em `L .51` eles vão a 5,19, 4,68 e 4,92.
Trocar por um hex escolhido a olho teria consertado o número e quebrado a escala.

**25 dos 57 valores ficam fora do gamut sRGB** (chartreuse inteiro, os 50/100 quentes, os
600/800 frios) e isso é intencional: cada navegador mapeia para a tela que tem, e em P3 as cores
saem mais saturadas. As tabelas de contraste medem o corte em sRGB, que é o PISO.

**A bancada carrega o matiz do módulo; a folha, nunca.** `[data-modulo]` tinge `--bancada` com
4% do matiz do módulo (Boletim, 3%) — a página de Compras tem ar indigo, a de Estoque, menta.
Dado não é tingido: `--folha` é a mesma em todo módulo, e há teste que reprova quem a mover.

Medição: `python3 docs/design/medir-contraste.py --conferir` mede as duas paletas nos dois
temas, confere que elas não se afastaram e sai 1 se algum par exigido reprovar.

### Acento — chartreuse é preenchimento, nunca texto

`--main` = `--lime-400` (`#e4f222`). A regra que o torna utilizável: **ele é fill com tinta preta
em cima** — botão primário, item de nav ativo, faixa da linha selecionada. Texto em chartreuse não
existe neste sistema; onde o acento precisa aparecer como texto (link, id, "salvar consulta") a cor
é `--main-text` (`--lime-800` no claro, `--lime-200` no escuro), medida em §Medição.

Chartreuse e o amarelo do foco (`--ring`, `#ffd23f`) são vizinhos, e um anel amarelo sobre botão
chartreuse desapareceria. Por isso o foco sobre primário usa `--ring-outline`, que põe **2px de
fio de tinta por fora** do amarelo. Isso não é enfeite: sem o fio, o indicador de foco fica abaixo
do piso de 3:1 da WCAG 1.4.11 exatamente no controle mais usado da tela.

### Matiz por assunto — 8 rampas de 6 degraus

`lime · indigo · mint · sky · amber · rose · violet · teal`, cada uma em 50/100 (tint) · 200
(borda) · 400 (fill) · 600 (texto no claro) · 800 (texto forte). **Clarear ou escurecer é subir ou
descer na rampa, ou `color-mix`** — hex novo dentro de componente é proibido, porque hex não sabe
que existe tema escuro.

- **Semântica** (matiz fixo, não muda nunca): `--ok` mint · `--info` sky · `--warn` amber ·
  `--bad` rose · `--mut` neutro. O fundo do badge é uma mistura **sobre a folha**
  (`color-mix(… 18%, var(--folha))`), e não alpha puro: com alpha, o mesmo badge pousado na
  bancada compunha outro par, e os cinco reprovavam ali. A medição declara a superfície de cada
  linha pelo mesmo motivo — alpha no vácuo passa sempre. No escuro a tinta sobe **dois** degraus
  da rampa (600 → 200), não um: no 400 o badge de info ficava em 4,01:1.
- **Módulo**: Hoje lime · Compras indigo · Estoque/Produtos mint · Vendas sky · CRM amber ·
  Pessoas violet · Relatórios teal (`--mod-*`). O matiz do módulo pinta **o quadradinho do grupo na
  sidebar, o monograma e o card lateral por assunto** — nunca uma faixa cheia, nunca a linha de
  dado. A nav ativa é chartreuse em todos os módulos: se a cor do item ativo mudasse por módulo, o
  operador teria de aprender sete significados para o mesmo estado.
- **Tint** (`--tint-*`, 12% do matiz sobre a folha): separa região por natureza — card lateral,
  rodapé de totais, linha de grupo.

### Transparência tem nome

`--glass` (72% + blur, em appbar e barras sticky) · `--scrim` (45%, sob modal) · `--hover` (5%) ·
`--press` (9%). `rgba()` literal em componente é proibido pelo mesmo motivo do hex: o valor certo
no claro é o errado no escuro.

## Tipografia

**Esta seção é a régua §Hierarquia da issue-mãe #469, copiada — não parafraseada.** Ela é a
prioridade nº 1 da rodada, e parafrasear uma régua é como ela deixa de valer.

### Escala de tipo — 4 papéis, 11 degraus, nada fora deles

Tokens em `src/styles/tokens-2.0.css` (`--t-*`), consumidos por classe utilitária ou componente.
**Proibido `font-size` literal em componente.**

| Token | Face · peso · tamanho/entrelinha | Cor | Uso único |
|---|---|---|---|
| `--t-display` | Gambarino 400 · 30/1.05 | n-900 | saudação do dashboard, claim do login |
| `--t-pagina` | Gambarino 400 · 28/1.1 | n-900 | título de página (PageHeader) |
| `--t-registro` | Gambarino 400 · 24/1.1 + id mono 20 n-500 | n-900 | título de ficha |
| `--t-secao` | Gambarino 400 · 20/1.2 | n-900 | título de dialog, de hub, de seção de doc |
| `--t-bloco` | Inter 600 · 13.5/1.3 | n-900 | título de card/bloco (`h3`) |
| `--t-corpo` | Inter 400 · 13.5/1.45 | n-900 | texto de leitura, célula de texto |
| `--t-ui` | Inter 500 · 13/1.3 | n-900 / n-700 | botão, item de nav, aba, nome de entidade |
| `--t-meta` | Inter 400 · 12/1.35 | n-500 | subtítulo, ajuda, "salvo há", subtítulo de entidade |
| `--t-rotulo` | Inter 600 · 10.5 · tracking .12em · uppercase | n-500 (n-700 em KPI) | cabeçalho de coluna, rótulo de KPI, título de grupo da sidebar |
| `--t-dado` | JetBrains Mono 500 · 12.5 · tabular | n-900 (id em `--primary-text`) | id, data, valor, quantidade, código |
| `--t-dado-meta` | JetBrains Mono 400 · 11 · tabular | n-500 | contagem, hora, tempo relativo, atalho, `n / m` |

Regras:

- **Um Gambarino por tela**, no máximo dois (página + registro nunca coexistem; dialog conta como
  tela própria). Gambarino nunca abaixo de 20px, nunca em botão, nunca em tabela.
- **Peso não é hierarquia em Gambarino** (peso único). Hierarquia entre Gambarinos = tamanho.
  Hierarquia dentro de Inter = peso (600 > 500 > 400) e cor (n-900 > n-700 > n-500), **nunca
  tamanho** entre 12 e 13.5.
- **Mono = dado, sem exceção.** Se está em mono, é algo que se copia, compara ou soma. Texto
  corrido nunca em mono; dado nunca em Inter.
- **Uppercase só em `--t-rotulo`**, e `--t-rotulo` nunca tem caixa/borda/fundo próprio.
- Cor de texto tem 3 degraus (n-900, n-700, n-500) + 2 semânticos (`--primary-text`, `--bad`).
  n-400 só para disabled/placeholder. **Nada de texto em chartreuse.**
- Contraste mínimo 4.5:1 para `--t-meta` e `--t-dado-meta` nos dois temas (é onde o 1.x
  reprovava — e onde a fundação 2.0 ainda reprova, medido em §Medição).
- Largura de leitura: texto corrido ≤ 70ch; célula com texto longo trunca com `…` + tooltip, nunca
  quebra em 3 linhas.

### As três faces

Gambarino (display, peso único) · Inter (interface) · JetBrains Mono (dado, 400/500, tabular
medido). Sora, Newsreader e PT Mono saem do repo na D1 — quatro famílias produziam três vozes
dentro do mesmo cabeçalho.

**Gambarino não desenha cedilha.** "Orçamento" sai "orcamento" sem a pilha de fallback; por isso
`--font-display` declara Georgia e Times antes de serifa genérica, e todo título em Gambarino tem
de ser conferido com uma palavra acentuada. O algarismo tabular é medido por
`docs/design/medir-tabular.py`, que é passo do CI — remover uma família importada sem editar a
lista dele reprova o build num passo que não fala de fonte.

## Separação

**Também copiada da §Hierarquia (#469).** Quatro ferramentas, uma por fronteira, na ordem de
preferência (mais barata → mais cara). **Usar a mais barata que resolve; nunca duas na mesma
fronteira.**

1. **Espaço** (escala `--s-1…--s-6` = 4 · 8 · 12 · 16 · 24 · 32): separa itens do mesmo tipo
   (linhas de kv, campos numa grade, chips). Regra: irmãos = `gap`, nunca `margin` por elemento.
2. **Hairline** (`1px n-200`): separa itens de uma lista/tabela e header de corpo dentro de um
   card. Nunca duas hairlines encostadas; nunca hairline + fundo diferente na mesma fronteira.
3. **Tint** (`n-50` ou `--tint-*`): separa região por natureza (header de tabela, rodapé de
   totais, linha de grupo, card lateral por assunto). Tint nunca dentro de tint.
4. **Card** (borda n-300 + `--hard-soft`, ou n-900 + `--hard-1/2`): separa objeto do plano.
   **Máximo 2 níveis de card aninhados** (página › card › nunca um terceiro). Dentro de um card,
   só espaço, hairline e tint.

Regras:

- **Uma sombra dura de tinta por tela** (`--hard-1/2` em KPI e painel de página), o resto é
  `--hard-soft` ou nada. Tecla (`--key`) só em botão.
- Fronteira entre regiões da página (header › KPIs › painel) = espaço `--s-5` (24), sem linha.
- Fronteira entre colunas (principal › lateral) = espaço `--s-4` (16), sem linha.
- Fronteira sidebar › conteúdo = **uma** hairline n-300 (a única linha vertical da tela).
- Tabela: hairline entre linhas; **sem** linhas verticais; header separado por tint n-50 (não por
  borda).
- Formulário: campos separados por espaço (12/16); blocos por card quiet; seções dentro do bloco
  por hairline + `--s-4`.
- Padding interno padrão: card 16/18 · célula 0 12 · botão 0 13 · chip 0 9.
- **Toda PR anexa um screenshot com overlay de 8px** (`docs/design/grid.css`, ativável por
  `?grid`) provando alinhamento em múltiplos de 4.

## Profundidade

Física de papel: **sombra dura, deslocada, sem blur**. Ela diz de que altura a peça é, e por isso
não pode estar em tudo — cinco peças "flutuando" na mesma tela é o mesmo que nenhuma.

| token | valor (claro) | onde |
|---|---|---|
| `--key-1` | `0 2px 0 0 n-900` | botão secundário — a tecla |
| `--key-2` | `0 3px 0 0 n-900` | botão primário |
| `--hard-1` | `2px 2px 0 0 n-900` | KPI, card em hover |
| `--hard-2` | `4px 4px 0 0 n-900` | painel de página |
| `--hard-3` | `6px 6px 0 0 n-900` | dialog, sheet, ⌘K |
| `--hard-soft` | `3px 3px 0 0 n-300` | card quieto |
| `--inset` | sombra interna | campo — o que se afunda, se preenche |
| `--focus` | `0 0 0 3px --ring` | anel de foco |

No escuro a escada **inverte a tinta da sombra** (`n-300`/`n-400`), não a geometria: sombra preta
sobre fundo escuro é invisível, e sombra branca seria um brilho que este sistema não tem.

A **tecla** é a peça-assinatura: o botão repousa 2–3px acima do papel e **afunda quando o dedo
encosta** (`translate` + sombra zero, não sombra menor — com sombra pequena o gesto não termina).
Foco cancela o afundamento: foco e hover são duas leituras de estado, e brigar por 2px de
deslocamento deixa as duas ilegíveis.

## Movimento

**A TELA não entra; a REGIÃO pode.** É o corte inteiro, e a distinção é o que evita ler esta
seção como "menos animação". O que sai é o movimento que atrasa a primeira leitura de uma tela
que o operador já conhece de cor. O que fica é o que responde a um gesto, o que desenha um dado,
e a entrada curta e limitada de uma região que ordena a leitura.

**Fica** — micro-movimento com propósito, ≤320ms, com os tokens `--ease`/`--ease-out` e
`--dur-1..3`:

- `lift` em **tecla, KPI e card clicável** — responde ao ponteiro, e o que responde ensina que é
  clicável;
- `cab-draw` no sparkline, `cab-fill` na barra — o traço aparece na direção em que o dado cresce;
- `cab-pulse` **só em Atrasada** — repetição é caro, e por isso só o estado que exige ação hoje a
  paga;
- `cab-rise` escalonado numa **região** — a faixa de KPI é o caso: ela é o que se lê primeiro, e o
  degrau ordena a leitura. Com teto: degrau ≤ 80 ms e no máximo seis peças, senão vira a cascata
  de tela que esta rodada removeu;
- **troca de rota** por View Transitions, com o título da página como shared element — a lista
  vira a ficha e o título atravessa. Saída mais rápida que entrada (90 ms contra 160 ms): quem sai
  já foi decidido pelo operador, e atrasá-lo custa a próxima ação;
- `cab-fade` em troca de aba e de tema.

**Fora**, e cada um tem motivo medido:

- **Animação de entrada de tela inteira.** A cascata `zona-sobe` levantava as zonas do documento em
  degraus de 60 ms, até 300 ms na quinta. Quem abre o mesmo orçamento vinte vezes por dia pagava
  esse tempo vinte vezes para ver uma vez o que já sabe onde está. Removida em #498. A diferença
  para o `cab-rise` que ficou é o escopo e o teto: uma faixa de quatro KPIs em 80 ms de degrau
  ordena a leitura; a página inteira em 300 ms atrasa todas.
- **Hover que pula em peça lisa** — item de menu, aba, chip. O `lift-flat` perdeu o `transform` e
  ficou com sombra e traço: caminho que se desloca sob o ponteiro custa mira a quem percorre a
  lista inteira com o mouse encostado. O pulo continua no `lift-control`, onde é resposta a um
  gesto de acionamento.
- **Hover em linha e célula de grade.** Lá o amarelo marca foco e a seleção tem faixa própria;
  linha que levanta em grade de 200 linhas é ruído.
- Parallax, loop decorativo, spinner que gira sem progresso.

**`prefers-reduced-motion` é guarda do documento, não de cada peça** (fim de `src/index.css`):
`*, *::before, *::after` com duração 0.01ms. Duração quase-zero em vez de `animation: none` porque
keyframe que **pinta** o estado final (`cab-fill`, a barra de progresso) desapareceria com `none` —
o dado sumiria junto com o movimento. A guarda por classe (`.cab-motion`, em `tokens-2.0.css`)
continua válida para SVG animado, e agora é reforço, não a única defesa.

Cobertura: `src/styles/movimento-2.0.test.ts`, quatro casos afirmados sobre o CSS-**fonte**. Sobre
o fonte e não sobre um render porque as regras vivem em `@utility` e `@media`, que o jsdom não
resolve: ali `getComputedStyle` devolve vazio, e um teste de componente passaria verde com o
movimento inteiro de volta.

### Tokens, durações e a lista fechada

Os tokens vivem em
`src/styles/tokens-2.0.css`: `--dur-1` (120 ms, micro), `--dur-2` (200 ms, peça), `--dur-3`
(320 ms, entrada de região), `--ease` (a curva geral), `--ease-out` (quem abre) e `--spring`,
uma `linear()` de 30 pontos que é a mola já medida da 1.6 — bezier de 4 pontos não representa
passar do alvo e voltar.

**A regra que governa duração: saída mais rápida que entrada.** Quem sai já foi decidido pelo
operador, e atrasá-lo custa a próxima ação; quem entra precisa ser lido. Na troca de rota isso é
90 ms contra 160 ms.

**PERMITIDO:** troca de rota com View Transitions, com o título da página como shared element
(a lista vira a ficha e o título atravessa) · entrada de região (`cab-rise`, escalonada em ≤ 80 ms
e no máximo seis) · peça que aparece (`cab-pop`, com a mola) · linha desenhando em gráfico
(`cab-draw`) · barra enchendo (`cab-fill`) · pulso de atenção em pendência (`cab-pulse`, e uma
vez) · hover/press dos controles (120 ms).

**PROIBIDO:** animar linha de tabela, célula de grade, campo ou anel de foco · loop infinito
fora do carregamento · `delay` acima de 80 ms · movimento que reposiciona o que o operador está
prestes a clicar · bounce em confirmação · animar `width`/`height`/`top`/`left` (é `transform` e
`opacity`, que não recalculam layout) · duração acima de `--dur-3` em qualquer coisa que não seja
carregamento.

**As três guardas das View Transitions** (`src/app/transicao-de-rota.ts`): sem
`startViewTransition` a navegação acontece igual, sem transição; com `prefers-reduced-motion` não
acontece; e antes de `readyState === 'complete'` também não — transição durante o carregamento
fotografa uma tela pela metade. Há teto de 400 ms: enquanto o callback não resolve, o browser
segura a tela congelada na foto.

## Navegação

Decisão da rodada (auditoria §6): **sidebar única e global**, modelo Shopify/Stripe/Ramp/Linear. O
app switcher de sete ícones na appbar sai — ele custava dois níveis para um destino, sem rótulo e
sem lugar para favoritos ou recentes.

```
[Marca]  [Empresa ▾ — tecla]  [⌘K]
HOJE        Início · Minhas tarefas (n) · Caixa de entrada (n)
FAVORITOS ▾ views salvas com ★
COMPRAS ▾   Ordens de compra (n) · Pedidos de compra · Previsão de chegada (n) · Fornecedores
ESTOQUE ▾   Movimentação · Produtos (n) · Relatórios (3)
VENDAS ▸    Orçamentos · Pedidos · Cargas · Clientes · Profissionais
CRM ▸       Oportunidades · Funis · Motivos de perda
PESSOAS ▸   Colaboradores · Usuários
RECENTES    OC-5102 · ORC-2314 · …
──────────
Configurações
[Avatar · nome · e-mail ▾]
```

- **"Cadastros" como grupo morre**: cada cadastro mora no módulo que o usa (Fornecedores →
  Compras; Clientes e Profissionais → Vendas; Colaboradores e Usuários → Pessoas). Agrupar por
  "tipo de tela" obriga quem procura um fornecedor a saber que fornecedor é um cadastro.
- **Appbar** (56px, `src/app/appbar/`) faz duas coisas: **migalha à esquerda**, derivada da rota
  pela taxonomia de `navigation.ts` e nunca escrita pela tela, e **quatro ações globais à direita**
  — Ajuda · Notificações · Configurações · Tema —, fixas em toda rota e na mesma ordem. Ação de
  TELA não sobe para cá: ela mora no `PageHeader`. A segunda faixa de 52px, que repetia o lugar
  dentro do conteúdo, saiu — duas respostas para "onde estou", em duas tipografias.
- **O sino é `<Link to="/inbox">`, e a gaveta não existe mais.** Ela abria uma coluna irmã do
  `<main>` que empurrava o conteúdo. A troca não é de desenho, é de natureza: notificação era
  AVISO — cartão com título e parágrafo, que respondia "aconteceu algo?" e parava aí — e virou
  LISTA DE TRABALHO, uma linha por item com quem · o quê · qual registro · quando, ação de
  resolver na linha e views publicadas no endereço (`/inbox?view=…`). O que o endereço dá de
  graça e o painel não dava: sobrevive ao F5, cola para outra pessoa, volta pelo botão do
  navegador, entra no menu e é achável pela paleta. O contador virou **ponto** (`--bad`); o
  número continua no nome acessível, porque quem ouve não vê o ponto.
- **Item ativo**: folha + borda de tinta + `hard-soft` + faixa chartreuse. O matiz do módulo fica
  no quadradinho do grupo.
- **Rota-índice de módulo é hub**, não redirect: `/compras`, `/estoque`, `/vendas`, `/crm` mostram
  KPIs + atalhos (modelo ERPNext workspace).
- **Não entra**: reordenar por arrastar, grade de apps, menu horizontal por app, tiles como
  navegação única.
- **Interface por clique** (decisão do user, 30/07/2026): toda ação é alcançável por mouse; nenhum
  fluxo depende de tecla memorizada. `⌘K`/`Ctrl+K` é conveniência e abre também pelo botão de busca.
  F3–F6 continuam proibidos (conflito com o navegador).

## Componentes

**Todas as 47 rotas passam por 12 peças** (auditoria §0). É o achado que organiza o trabalho: não
existe "mudar tela por tela" — mudam-se as peças e as telas seguem. Tela nova **compõe**; não
reimplementa nem redesenha localmente.

| peça | arquivo | quem usa | regra 2.0 |
|---|---|---|---|
| Casca | `ui/sidebar.tsx` · `__root.tsx` · `page-header.tsx` | 100% das rotas autenticadas | §Navegação: sidebar única, appbar = breadcrumb + ações globais |
| Listagem | `cabinet/tela-de-listagem.tsx` · `cabinet/data-table.tsx` | 11 listagens | hairline entre linhas, header em tint com ícone de tipo, checkbox + barra de lote, densidade, views com contagem, chips de filtro |
| Registro | `cabinet/tela-de-documento.tsx` · `cadastro-form.tsx` · `form-grid.tsx` · `form-block.tsx` | 9 fichas `$id` | header do registro (id mono, badge, meta, ação = próximo estado); grade principal + lateral |
| Painel / card | `cabinet/painel.tsx` · `secao.tsx` · `blocks.tsx` | dashboard, tarefas, movimentação, relatórios | card quiet por padrão; `--hard-2` só no painel de página |
| KPI | `cabinet/numero-heroi.tsx` · `total-box.tsx` | dashboard, tarefas, relatórios, totais | valor em mono, rótulo `--t-rotulo`, faixa de até 4 sobre a grade |
| Estado | `cabinet/badge.tsx` · `money.tsx` · `stamp.tsx` (alias) · `celula-ativo.tsx` | listagens, fichas, kanban | `Badge` é a peça ÚNICA de estado — pílula pastel com ponto de 6px (`ok · info · warn · bad · mut · outline`); `Stamp` segue exportado como alias para não obrigar 26 chamadores a mudar no mesmo dia |
| Controles | `ui/button` · `input` · `checkbox` · `radio-group` · `tabs` · `lookup-combo` | tudo | tecla, campo rebaixado (`--inset`), abas Polaris, label sem caixa |
| Identidade | `marca.tsx` · `ornamento.tsx` · `modulo-cores.ts` | casca, 404, login | marca = duas casas concêntricas em contorno; ornamento só em login e 404 |
| Vazio / erro | `vazio-com-saida` · `erro-do-servidor` · `tela-nao-capturada` · `modulo-em-construcao` | toda rota | sem ilustração grande; a saída é um botão, não um desenho |
| Overlays | `ui/dialog` · `sheet` · `popover` · `command` · `tooltip` | ⌘K, confirmações | `--hard-3`, scrim 45%, foco preso |
| Quadro | `features/tarefas` · `features/crm` · `features/planner` | 3 rotas | coluna em n-50, card que levanta, sem hover em linha |
| Tokens | `src/styles/tokens-2.0.css` · `src/index.css` | tudo | esta página |

Peças com assinatura estável hoje, para quem for compor: `TelaDeListagem<T>` ·
`TelaDeDocumento<T>` · `DataTable` (com `VisaoDaListagem<T>`, `OpcaoDeAgrupamento`, `Densidade`) ·
`PageHeader` (`variante`, `subtitulo`, `acoes`) · `Painel` (`TintaDePainel`) · `NumeroHeroi`
(`EscalaHeroi`) · `TotalBox` · `Badge` (`TomDeBadge`) · `Money` (`valor`, `centavos`, `riscado`) ·
`FormGrid` (`FormGridColumn`, `FormGridRow`, `FormGridTotalRow`).

**O ponto do `Badge` não é a informação.** O rótulo escreve o estado por extenso, sempre; o ponto é
`aria-hidden` e existe só para acelerar a varredura de quem enxerga a cor. Cor sozinha é muda para
quem não distingue os tons e para o leitor de tela (WCAG 1.4.1) — a regra vale para toda peça nova
que pense em falar por cor.

### DataTable — a peça que 11 listagens usam (D8, #476)
Caixa de dado: **UM traço de `n-300` e a sombra quieta (`--hard-soft`), `overflow-clip`**. A borda de
2px de tinta saiu porque era a mesma espessura da régua entre linhas — cada linha lia como caixa
própria, e a listagem virava pilha de caixas sem hierarquia entre o objeto e seus itens.

**Cabeçalho: tint `n-50`, `sticky`, rótulo em `--t-rotulo`** (Inter 600 · 10.5 · tracking .12em ·
caixa alta · `n-500`), com **ícone de tipo** de 12px à esquerda. O tint é a ÚNICA separação entre
header e corpo — §Separação, uma ferramenta por fronteira: sem borda por baixo, sem caixa por célula.
A barra preta da fusão v5 saiu com ela.

**Célula 52px (`confortavel`) ou 40px (`compacta`), hairline `n-200` entre linhas**, e **sem malha
vertical** — coluna fechada dos dois lados vira gaiola.

**Linha selecionada = `--primary-soft` com faixa de 3px em chartreuse na borda esquerda**, mais
`aria-selected`: cor sozinha não diz estado (1.4.1), e a faixa é forma. O violeta cheio da 1.x lavava
o dado da linha justo quando o operador confere o que marcou. **Chartreuse aqui é área, nunca letra.**
Linha concluída ou cancelada fica em `n-500` — continua conferível e para de disputar o olho; quem
sabe disso é a coluna de situação (`tipo: 'status'`, tom `done`/`void`), não uma prop por tela.

Linha focada = utility `focus-ring-row`, que monta UM anel com as partes que cada célula pode desenhar
(topo e base em todas, lateral só na primeira e na última) — `box-shadow` no `<tr>` não pinta sob o
`border-collapse` que a tabela herda do preflight, e anel por célula desenharia uma moldura por coluna.

**Célula tipada** (`meta.tipo`): `id` (mono, `--primary-text`) · `entidade` (monograma + nome + subtítulo,
que some na compacta) · `data` (mono) · `dinheiro` (mono à direita, `R$` em Meta) · `status` (carimbo) ·
`progresso` (barra de 56px + `n / m`) · `texto` (trunca com `…` e `title`). Coluna que declara `cell`
próprio manda no conteúdo; o tipo só lhe dá a moldura.

**Ações de linha**: três botões de 26px na última coluna, visíveis no hover E no foco de teclado. `Abrir`
é derivada de `aoAbrirLinha` — a tela não a declara.

**Barra de lote**: aparece com ≥1 marcada, tinta cheia com texto de papel, `n selecionadas`, e `esc`
limpa (anunciado na própria barra, com o botão ao lado — não é atalho memorizado).

**Rodapé**: à esquerda `n de N registros · soma da página`; à direita `Por página`, a FAIXA `1–20 de 340`
e o par de setas. A soma sai da coluna que declarou `tipo: 'dinheiro'`; com paginação ela é da PÁGINA, e
o rótulo diz isso — chamá-la de filtrada seria um número certo com o nome errado.

`rowNumbers` e cabeçalho agrupado: mecanismos inalterados.

### Modos da listagem — lista · kanban · calendário (D12, #480)

A listagem tem TRÊS desenhos para a mesma consulta. A tabela existe sempre; kanban e calendário
são visões alternativas, ligadas pelo alternador da barra (padrão 9, `visoes`/`agrupamentos`).
Nenhuma delas consulta nada: recebem as linhas que a `VitraDataTable` já trouxe, e é isso que
garante que alternar não troque o filtro por baixo do operador.

- **Kanban** (`ModoKanban`, `visaoKanban`) — colunas por `campoDeColuna` (o `Agrupar por` da barra
  vence, quando escolhido). Coluna em `--n-50` **sem borda** (tint separa região; borda ali seria a
  segunda ferramenta na mesma fronteira), cabeçalho com quadradinho de cor + nome em `--t-rotulo` +
  contagem em `--t-dado-meta`. Cartão = folha `--n-0`, borda `--n-300`, `--hard-soft` parado e
  `--hard-1` no hover — o papel levanta. Dentro do cartão só espaço e hairline, nunca um terceiro
  card. Título `--t-bloco`, subtítulo `--t-meta`, selo/data/dinheiro no rodapé, os dois últimos em
  `--t-dado`. Arrastar entre colunas dispara `onMover`; **quem grava é a tela**. O menu `Mover para`
  de cada cartão não é opcional: arrasto não existe para teclado nem leitor de tela.
- **Calendário** (`ModoCalendario`, `visaoCalendario`) — mês ou semana por `campoDeData`. Grade de
  hairline (`gap: 1px` sobre `--n-200`, nenhuma célula com borda própria), cabeçalho de dia em
  `--t-rotulo`, número do dia em `--t-dado-meta` e **hoje** num quadrado `--n-900` — o único
  preenchimento sólido da grade. Evento = pílula tintada pelo tom (`ok`/`info`/`warn`/`bad`/`mut`)
  com ponto da mesma família; três por célula e `+n` para o resto, porque célula que cresce faz a
  grade inteira pular de tamanho. Registro sem data **não some calado**: o rodapé conta quantos
  ficaram de fora.

**Três telas morreram nesta rodada** e viraram visão da listagem de origem: `Previsão de chegada`,
`Quadro de cargas` e o calendário próprio da `Agenda` (que era Schedule-X). Tela própria para o
mesmo recurso significava segunda barra de filtro, segunda tabela e segunda ideia de consulta
salva sobre o mesmo dado — e o operador que estreitasse uma não via efeito na outra.

### Campo (input · select · textarea)
Fundo Folha, traço 2px, raio de controle, foco pela `focus-ring` (§Foco).

**Rótulo é TEXTO, não etiqueta** — mudou na 2.0 (D16, issue #484). Até a 1.7 ele vestia caixa clara
com traço de 2px em mono caixa alta: um selo. Selo é peça de IDENTIDADE, e rótulo de campo não
identifica coisa nenhuma — nomeia o que se digita ao lado. Com quarenta campos numa ficha, quarenta
selos empatavam em peso com o dado. A §Hierarquia da rodada fecha isso: `--t-rotulo` nunca tem
caixa/borda/fundo próprio.

O componente `<Campo>` (`components/cabinet/campo.tsx`) é a moldura: rótulo `.t-ui` em `n-700`,
controle, e UMA linha embaixo — ajuda (`.t-meta`) **ou** erro (`.t-meta` em `--bad`), nunca as duas.
O erro vence a ajuda enquanto existe: quem já sabe que errou não precisa mais da dica de como
digitar, e mostrar as duas empurraria o campo seguinte para baixo no instante do erro. Obrigatório =
`*` `aria-hidden` + `sr-only` "(obrigatório)"; os ids de ajuda/erro vêm de fora, porque o
`<FormControl>` do shadcn já monta o `aria-describedby` a partir dos dele.

### DataTable (assinatura) — reescrita na 2.0 (#476 · D8)
Caixa de dado: **UM traço de `n-300` e a sombra quieta (`--hard-soft`), `overflow-clip`**. A borda de
2px de tinta saiu porque era a mesma espessura da régua entre linhas — cada linha lia como caixa
própria, e a listagem virava pilha de caixas sem hierarquia entre o objeto e seus itens.

**Cabeçalho: tint `n-50`, `sticky`, rótulo em `--t-rotulo`** (Inter 600 · 10.5 · tracking .12em ·
caixa alta · `n-500`), com **ícone de tipo** de 12px à esquerda. O tint é a ÚNICA separação entre
header e corpo — §Separação, uma ferramenta por fronteira: sem borda por baixo, sem caixa por célula.
A barra preta da fusão v5 saiu com ela.

**Célula 52px (`confortavel`) ou 40px (`compacta`), hairline `n-200` entre linhas**, e **sem malha
vertical** — coluna fechada dos dois lados vira gaiola.

**Linha selecionada = `--primary-soft` com faixa de 3px em chartreuse na borda esquerda**, mais
`aria-selected`: cor sozinha não diz estado (1.4.1), e a faixa é forma. O violeta cheio da 1.x lavava
o dado da linha justo quando o operador confere o que marcou. **Chartreuse aqui é área, nunca letra.**
Linha concluída ou cancelada fica em `n-500` — continua conferível e para de disputar o olho; quem
sabe disso é a coluna de situação (`tipo: 'status'`, tom `done`/`void`), não uma prop por tela.

Linha focada = utility `focus-ring-row`, que monta UM anel com as partes que cada célula pode desenhar
(topo e base em todas, lateral só na primeira e na última) — `box-shadow` no `<tr>` não pinta sob o
`border-collapse` que a tabela herda do preflight, e anel por célula desenharia uma moldura por coluna.

**Célula tipada** (`meta.tipo`): `id` (mono, `--primary-text`) · `entidade` (monograma + nome + subtítulo,
que some na compacta) · `data` (mono) · `dinheiro` (mono à direita, `R$` em Meta) · `status` (carimbo) ·
`progresso` (barra de 56px + `n / m`) · `texto` (trunca com `…` e `title`). Coluna que declara `cell`
próprio manda no conteúdo; o tipo só lhe dá a moldura.

**Ações de linha**: três botões de 26px na última coluna, visíveis no hover E no foco de teclado. `Abrir`
é derivada de `aoAbrirLinha` — a tela não a declara.

**Barra de lote**: aparece com ≥1 marcada, tinta cheia com texto de papel, `n selecionadas`, e `esc`
limpa (anunciado na própria barra, com o botão ao lado — não é atalho memorizado).

**Rodapé**: à esquerda `n de N registros · soma da página`; à direita `Por página`, a FAIXA `1–20 de 340`
e o par de setas. A soma sai da coluna que declarou `tipo: 'dinheiro'`; com paginação ela é da PÁGINA, e
o rótulo diz isso — chamá-la de filtrada seria um número certo com o nome errado.

`rowNumbers` e cabeçalho agrupado: mecanismos inalterados.

### CadastroForm / PageHeader (assinatura)

> **2.0 (D5, #473) — a `BandaDeIdentidade` foi APAGADA.** A caixa lilás com borda de 2px em volta do
> nome da tela gastava borda + fundo + gradiente numa fronteira que espaço resolve — três das quatro
> ferramentas de separação de uma vez (§Hierarquia). O nome da tela passou a ter **uma voz só**, o
> `<h1>` do `PageHeader`, e `src/routes/toda-rota-tem-cabecalho.test.ts` reprova rota que não chegue
> nele e `<h1>` escrito fora dele. O cabeçalho ganhou `variante` (`display` 30 · `pagina` 28 ·
> `registro` 24, os degraus `--t-*`), `subtitulo` (o que a tela TEM agora, não o que ela é), `acoes`
> fracas em ghost e a **tecla `Voltar` de 32px colada ao título** — que saiu do `PageFrame` e voltou
> para cá, sem opt-in: quem decide se há tecla é `rotaMaeDe`, não a tela.

Painel (raio 10px, `el-3`) com **faixa de acento** de 8px à esquerda e zona de identidade no fundo.
Título em Display; contexto em Meta. Rodapé fixo com régua superior de 3px. Modo consulta via
`<fieldset disabled>`: inalterado.
### FormBlock (assinatura) — 2.0
**Card quiet**: borda `--n-300` + `--hard-soft`, fundo `--n-0`, padding `--s-4`. É a ÚNICA ferramenta
de separação da fronteira — a faixa pastel do módulo, a barra de 4px na cheia `/01` e o `<legend>`
sobre a borda saíram todos: eram três ferramentas na mesma fronteira, e a §Hierarquia manda usar a
mais barata que resolve, nunca duas. Dentro do card só entram espaço, hairline e tint.

Título `.t-bloco` (`<h3>`), `acoes` opcional à direita em `.t-rotulo`, `tint` opcional (`lilac` ·
`mint` · `sky` · `sand` · `rose`) para o card que separa por ASSUNTO — é o caso dos cards laterais da
ficha. O `<fieldset>` fica: é ele que dá papel `group` com nome acessível e é o que faz
`<fieldset disabled>` desligar a ficha inteira em modo consulta. `data-modulo` continua no
`<fieldset>`, que é o gancho do tint em CSS. Carimbos `Obrigatório`/`Opcional` em `.t-rotulo` sem
caixa; contador em `.t-dado-meta` (é número que se compara — mono, por definição).

Invariante preservada: obrigatório mora em bloco sempre aberto, `obrigatorio` vence `colapsavel`, e
corpo fechado é escondido (`hidden`), não desmontado.

### Identidade (assinatura) — 2.0, o que sobrou da `BandaDeIdentidade`
A `BandaDeIdentidade` **morreu na D16**. Ela era faixa colorida de largura inteira, com gradiente da
zona de identidade, contorno de 2px e ornamento, dizendo o nome da TELA. Respondia a pergunta errada
— quem abriu a ficha já sabe em que tela está — e cobrava a primeira dobra da página para repetir o
breadcrumb. O nome da tela passou ao `PageHeader` (onde já vivia em toda listagem); **quem** é o
registro passou ao `<BlocoIdentidade>`: card lateral tintado (lilás), monograma 34px em mono, nome
`.t-ui`, documento `.t-dado-meta`, cidade `.t-meta`, `<dl>` de até 4 pares e "Ver cadastro →" em
`--primary-text`.

### CadastroForm (assinatura)
Cabeçalho pelo `PageHeader`, fora do `<fieldset disabled>` — identidade não é campo, e em modo
consulta continua legível. Rodapé fixo separado por UMA hairline `n-200` (a régua forte de 3px saiu:
competia com a borda dos cards logo acima). Modo consulta via `<fieldset disabled>`: inalterado.

### FormRow (assinatura) — 2.0
A fileira de campos dentro de um bloco: `colunas={2|3|4}`, gap `--s-3`, quebra por
`repeat(auto-fit, minmax(...))`. Mede o CONTÊINER, não a janela — o campo vive dentro de uma coluna
de 320px na ficha de duas colunas, e `@media` para quebra está proibido na rodada. O nome não é
`FormGrid` porque `FormGrid` já era, no mesmo arquivo, a grade de ITENS de doze telas.

### FormGrid (assinatura) — a grade de ITENS
Célula editável sem borda (a malha É o campo), foco pela `focus-ring-inset`. Fechada por UMA hairline
`n-200` (a caixa preta de 2px saiu — a grade mora dentro de um card, e card dentro de card é o
terceiro nível que a §Hierarquia proíbe); cabeçalho separado por tint `n-50` em `.t-rotulo`; faixa de
seção por tint `n-50`, não por régua dupla. Totais na zona de valor, `Total` em Display com régua de
3px acima. Negativo em vermelho.

### O nome da tela tem UMA voz

A `BandaDeIdentidade` — caixa lilás com borda de 2px em volta do nome da tela — foi apagada em D5.
Ela gastava borda + fundo + gradiente numa fronteira que espaço resolve: três das quatro
ferramentas de §Separação de uma vez. O nome passou a ser o `<h1>` do `PageHeader`, e
`src/routes/toda-rota-tem-cabecalho.test.ts` reprova rota que não chegue nele e `<h1>` escrito
fora dele.

`PageHeader` tem `variante` (`display` 30 · `pagina` 28 · `registro` 24 — os degraus `--t-*`),
`subtitulo` (o que a tela **tem** agora, não o que ela é), `acoes` fracas em ghost e a tecla
`Voltar` de 32px colada ao título. Quem decide se há tecla é `rotaMaeDe`, não a tela — opt-in por
tela produziria telas irmãs com e sem volta.

### Aviso é faixa, não cartão

`regiao-de-avisos.tsx` deixou de ser cartão flutuante no canto (borda de 2px + sombra dura para
uma frase de cinco palavras) e virou faixa logo abaixo da appbar, com o tint do tom, sem borda e
sem sombra — e ela **empurra** o conteúdo em vez de cobri-lo. O tom é **dado** (`Aviso.tom`), não
decoração: `ok` sai sozinho pelo relógio; `warn` e `bad` ficam até alguém dispensar, porque são o
que o operador precisa ler e agir. `aria-live` vira `assertive` quando há `bad` na fila.

O `Sheet` continua no repo e foi **reestilizado, não apagado** — é o painel modal do sistema, com
`--hard-3` espelhado por `data-side`: painel encostado à direita com sombra para a direita projeta
para fora da janela e não existe.

### Foco e desabilitado — os dois estados que nunca são opcionais

- **Foco**: anel amarelo com fio de tinta por fora (`--ring-outline` sobre primário). Receita
  única; nenhuma peça inventa a sua.
- **Desabilitado**: perde a sombra além de apagar a cor. No escuro, superfície apagada e folha
  ficam a 1,16:1 e o par fundo+traço quase não diz o estado — a **forma** é o canal que sobra: o
  controle vivo repousa elevado, o morto fica rente ao papel.

## Telas com layout próprio

Três famílias não são composição das 12 peças e por isso têm regra escrita:

- **Dashboard** — saudação em `--t-display`, 4 KPIs (um herói), agenda, atividade, a-fazer e
  calendário quiet. Fonte de campo: `topicos/dashboard.md` da memória, não a transcrição.
- **Quadro** (tarefas, funil de CRM, planner) — coluna em `n-50`, card que levanta, sem hover em
  linha; o planner desenha a linha do tempo em hairline, com hoje em `n-900` e a barra tintada pelo
  módulo.
- **Autenticação** (login, esqueci, definir, trocar senha) — página dividida, ornamento reduzido a
  uma forma na coluna esquerda.

## Medição de contraste

**Esta é a única lista de números desta página que se remede; qualquer razão citada fora daqui é
citação, não medição.** As duas tabelas abaixo são **geradas**, moram entre marcadores
`<!-- tabela:nome -->` e saem de `docs/design/medir-contraste.py`, que lê os tokens reais de
`src/styles/tokens-2.0.css` e os aliases de `src/index.css`.

- `python3 docs/design/medir-contraste.py --conferir` — reprova por par abaixo do piso **e** por
  tabela publicada fora de sincronia com o medido. É o passo do CI, e é o comando a rodar depois
  de mexer em qualquer token de cor.
- `python3 docs/design/medir-contraste.py --escrever` — regrava as duas tabelas com o medido.
- `--frontmatter` compara o bloco `colors:` do topo desta página com o CSS. A cor mora em dois
  lugares e eles já divergiram; a divergência é **muda** — nada quebra, o sidecar só passa a
  mentir para o próximo agente.

Duas coisas que a 2.0 mudou na própria medição, e que explicam a coluna "fundo medido":

1. **A cor é composta.** Hex, `var()` encadeado e `color-mix(in oklab, …)` — o fundo de badge, os
   tints e o realce da nav não existem como valor em lugar nenhum do arquivo: nascem da mistura.
2. **Fundo de badge é alpha**, um valor só para os dois temas. Alpha não tem contraste no vácuo:
   **um badge medido sem dizer sobre o que pousa passa sempre.** Por isso cada linha nomeia a
   superfície.

Pisos: **4,5:1** texto normal (WCAG 1.4.3) · **3:1** texto grande, indicador de estado e limite de
componente (1.4.11). Linha marcada **registra** é medição sem piso exigido — divisória entre
conteúdos (hairline de tabela, borda de card) não é alvo da 1.4.11, e marcá-la vermelha ensinaria
a ignorar a coluna inteira. Ela fica publicada porque a razão em si é informação: é ela que diz
quanto o desenho está apostando na separação por espaço.

O anel de foco é o caso em que **uma das duas metades basta**: o amarelo sozinho não sobrevive ao
papel (1,43:1), e quem carrega o contraste é o fio de tinta por fora dele.

<!-- tabela:contraste-claro -->
### Tema claro

| par | fundo medido | razão | piso | veredito |
|---|---|---|---|---|
| tinta sobre a folha | `#fffdf9` | 18,55:1 | 4,50 | passa |
| tinta sobre a bancada | `#ebe7df` | 15,30:1 | 4,50 | passa |
| tinta-2 sobre a folha | `#fffdf9` | 9,87:1 | 4,50 | passa |
| .t-meta sobre a folha | `#fffdf9` | 5,67:1 | 4,50 | passa |
| .t-dado-meta sobre a folha-2 | `#f6f3ed` | 5,19:1 | 4,50 | passa |
| .t-rotulo sobre a bancada | `#ebe7df` | 4,68:1 | 4,50 | passa |
| tinta sobre o primário | `#eaf100` | 15,29:1 | 4,50 | passa |
| --main-text sobre a folha | `#fffdf9` | 7,16:1 | 4,50 | passa |
| --main-text sobre o acento suave | `#f9fdd6` | 6,91:1 | 4,50 | passa |
| ok sobre o badge, na folha | `#def1df` | 4,72:1 | 4,50 | passa |
| ok sobre o badge, na bancada | `#def1df` | 4,72:1 | 4,50 | passa |
| info sobre o badge, na folha | `#dceafa` | 4,98:1 | 4,50 | passa |
| info sobre o badge, na bancada | `#dceafa` | 4,98:1 | 4,50 | passa |
| warn sobre o badge, na folha | `#fae8cf` | 5,13:1 | 4,50 | passa |
| warn sobre o badge, na bancada | `#fae8cf` | 5,13:1 | 4,50 | passa |
| bad sobre o badge, na folha | `#ffdfd8` | 5,26:1 | 4,50 | passa |
| bad sobre o badge, na bancada | `#ffdfd8` | 5,26:1 | 4,50 | passa |
| mut sobre o badge, na folha | `#efede8` | 4,92:1 | 4,50 | passa |
| nav ativa: tinta sobre o realce | `#f9fdd6` | 17,90:1 | 4,50 | passa |
| nav ativa: faixa sobre a barra | `#f6f3ed` | 1,11:1 | 3,00 | registra |
| nav ativa: realce sobre a barra | `#f6f3ed` | 1,05:1 | 3,00 | registra |
| tinta sobre o tint lilás | `#ebeefb` | 16,23:1 | 4,50 | passa |
| tinta sobre o tint menta | `#e9f5e7` | 16,72:1 | 4,50 | passa |
| tinta sobre o tint céu | `#e8f0fa` | 16,39:1 | 4,50 | passa |
| tinta sobre o tint areia | `#fcf0de` | 16,69:1 | 4,50 | passa |
| tinta sobre o tint rosa | `#ffe9e3` | 16,13:1 | 4,50 | passa |
| módulo compras sobre a folha | `#fffdf9` | 6,34:1 | 3,00 | passa |
| módulo estoque sobre a folha | `#fffdf9` | 5,51:1 | 3,00 | passa |
| módulo vendas sobre a folha | `#fffdf9` | 6,00:1 | 3,00 | passa |
| módulo crm sobre a folha | `#fffdf9` | 6,06:1 | 3,00 | passa |
| módulo pessoas sobre a folha | `#fffdf9` | 6,44:1 | 3,00 | passa |
| módulo relatórios sobre a folha | `#fffdf9` | 5,50:1 | 3,00 | passa |
| borda de card sobre a folha | `#fffdf9` | 1,84:1 | 3,00 | registra |
| borda de card sobre a bancada | `#ebe7df` | 1,52:1 | 3,00 | registra |
| hairline sobre a folha | `#fffdf9` | 1,44:1 | 3,00 | registra |
| tinta sobre a superfície morta | `#ebe7df` | 15,30:1 | 4,50 | passa |
| placeholder sobre a folha | `#fffdf9` | 2,84:1 | 3,00 | registra |
| anel amarelo sobre a folha | `#fffdf9` | 1,42:1 | 3,00 | registra |
| fio do anel sobre a folha | `#fffdf9` | 18,55:1 | 3,00 | passa |
| tinta do botão destrutivo | `#b32228` | 6,50:1 | 4,50 | passa |
| o anel de foco se distingue do papel (uma das duas metades basta) | `#fffdf9` | 18,55:1 | 3,00 | passa |
<!-- /tabela:contraste-claro -->

<!-- tabela:contraste-escuro -->
### Tema escuro

| par | fundo medido | razão | piso | veredito |
|---|---|---|---|---|
| tinta sobre a folha | `#151410` | 16,44:1 | 4,50 | passa |
| tinta sobre a bancada | `#24211c` | 14,25:1 | 4,50 | passa |
| tinta-2 sobre a folha | `#151410` | 10,58:1 | 4,50 | passa |
| .t-meta sobre a folha | `#151410` | 5,49:1 | 4,50 | passa |
| .t-dado-meta sobre a folha-2 | `#1c1a16` | 5,15:1 | 4,50 | passa |
| .t-rotulo sobre a bancada | `#24211c` | 4,76:1 | 4,50 | passa |
| tinta sobre o primário | `#eaf100` | 14,96:1 | 4,50 | passa |
| --main-text sobre a folha | `#151410` | 15,83:1 | 4,50 | passa |
| --main-text sobre o acento suave | `#35341e` | 10,89:1 | 4,50 | passa |
| ok sobre o badge, na folha | `#1f2d1e` | 9,27:1 | 4,50 | passa |
| ok sobre o badge, na bancada | `#1f2d1e` | 9,27:1 | 4,50 | passa |
| info sobre o badge, na folha | `#1e2832` | 9,09:1 | 4,50 | passa |
| info sobre o badge, na bancada | `#1e2832` | 9,09:1 | 4,50 | passa |
| warn sobre o badge, na folha | `#3c2e18` | 7,96:1 | 4,50 | passa |
| warn sobre o badge, na bancada | `#3c2e18` | 7,96:1 | 4,50 | passa |
| bad sobre o badge, na folha | `#361f19` | 7,77:1 | 4,50 | passa |
| bad sobre o badge, na bancada | `#361f19` | 7,77:1 | 4,50 | passa |
| mut sobre o badge, na folha | `#201e1a` | 9,55:1 | 4,50 | passa |
| nav ativa: tinta sobre o realce | `#35341e` | 11,31:1 | 4,50 | passa |
| nav ativa: faixa sobre a barra | `#1c1a16` | 14,07:1 | 3,00 | passa |
| nav ativa: realce sobre a barra | `#1c1a16` | 1,36:1 | 3,00 | registra |
| tinta sobre o tint lilás | `#1e1f27` | 14,61:1 | 4,50 | passa |
| tinta sobre o tint menta | `#1c2419` | 14,20:1 | 4,50 | passa |
| tinta sobre o tint céu | `#1b2127` | 14,47:1 | 4,50 | passa |
| tinta sobre o tint areia | `#2e2415` | 13,57:1 | 4,50 | passa |
| tinta sobre o tint rosa | `#2b1b16` | 14,69:1 | 4,50 | passa |
| módulo compras sobre a folha | `#151410` | 4,83:1 | 3,00 | passa |
| módulo estoque sobre a folha | `#151410` | 6,87:1 | 3,00 | passa |
| módulo vendas sobre a folha | `#151410` | 5,44:1 | 3,00 | passa |
| módulo crm sobre a folha | `#151410` | 7,82:1 | 3,00 | passa |
| módulo pessoas sobre a folha | `#151410` | 4,68:1 | 3,00 | passa |
| módulo relatórios sobre a folha | `#151410` | 6,33:1 | 3,00 | passa |
| borda de card sobre a folha | `#151410` | 1,70:1 | 3,00 | registra |
| borda de card sobre a bancada | `#24211c` | 1,47:1 | 3,00 | registra |
| hairline sobre a folha | `#151410` | 1,35:1 | 3,00 | registra |
| tinta sobre a superfície morta | `#24211c` | 14,25:1 | 4,50 | passa |
| placeholder sobre a folha | `#151410` | 2,82:1 | 3,00 | registra |
| anel amarelo sobre a folha | `#151410` | 12,79:1 | 3,00 | passa |
| fio do anel sobre a folha | `#151410` | 16,44:1 | 3,00 | passa |
| tinta do botão destrutivo | `#ff9e96` | 9,33:1 | 4,50 | passa |
| o anel de foco se distingue do papel (uma das duas metades basta) | `#151410` | 16,44:1 | 3,00 | passa |
<!-- /tabela:contraste-escuro -->

**O que a medição já mudou na paleta**, e é o motivo de ela vir antes do merge e não depois: a
auditoria §3 propunha `--n-500` em `#7e786b`, e ali `.t-meta` dava 4,35:1 e `.t-rotulo` 3,62:1 —
os dois abaixo do piso, nos três degraus que a §Tipografia nomeia como onde o 1.x reprovava. O
degrau desceu para `#6d675b`. Os fundos de badge deixaram de ser alpha puro e passaram a pousar
sobre a folha, porque com alpha os cinco reprovavam sobre a bancada; e a semântica no escuro sobe
**dois** degraus da rampa (600 → 200), não um, porque no 400 o badge de info dava 4,01:1.

## Do's and Don'ts

**Do:**

- Compor com as 12 peças; tela nova é arranjo, não desenho novo.
- Usar `--t-*` e `--s-*`; deixar o `font-size` para quem define o token.
- Escolher a separação mais barata que resolve a fronteira.
- Gastar sombra dura uma vez por tela, onde a ação mora.
- Medir contraste com o script antes de abrir PR que toca cor — e publicar a reprovação quando ela
  existir.
- Escrever o dado em mono e o texto em Inter, sempre nessa divisão.

**Don't:**

- `font-size:`, `text-[…]`, `p-[…]` literais em componente.
- Hex ou `rgba()` dentro de componente — quebra o tema escuro em silêncio.
- Texto em chartreuse; cor decorativa em linha de dado.
- Duas ferramentas de separação na mesma fronteira (borda + tint, hairline + fundo).
- Card dentro de card dentro de card.
- `@media` para quebra de layout — `auto-fit` e `flex-wrap` resolvem.
- Animação de entrada de tela; hover em linha de grade; atalho novo de teclado.
- Preencher com dado falso o que o contrato não cobre — coluna sem DTO sai da listagem, e o
  `AvisoDeCobertura` avisa o operador.

## Histórico

Dez linhas, e os artefatos em `docs/design/historico/` (com `README.md` explicando o que cada um
decidiu). O que a 2.0 herdou e o que ela revogou:

- **1.4 — brutalismo de papel** (`mockup-brut-papel.html`): traço grosso, sombra dura, canto reto.
  **Herdado**; a sombra dura é a assinatura que sobreviveu inteira.
- **1.5 — amostra v5** (`amostra-fase-1.5.html`): a amostra passa a vencer o doc em divergência;
  foco amarelo com fio preto. **Herdado**, e o fio preto virou `--ring-outline`.
- **1.6 — display condensado** (`amostra-236-display-condensado.html`): teste de face de título com
  quatro medições. **Revogado** — a face de display da 2.0 é Gambarino, e a 1.6 também trouxe o
  motion de entrada e o hover que pula, os dois removidos em #498.
- **1.7 — fusão v5** (`fusao-v5/`): o documento como folha — seção, zona, campo-herói, foco por
  zona. **Herdado**, menos a entrada escalonada das zonas.
- **A UNIÃO (2026-08-18)**: contorno de 2px em tudo, ação preta. **Revogado pela auditoria**: com
  bancada e folha a 1,10:1 o traço era o único delimitador; a 2.0 separou as superfícies e o traço
  virou gasto raro.
- **Quatro famílias tipográficas** (Newsreader · Sora · Inter · PT Mono). **Revogado**: três
  papéis, três faces.
- **Etiqueta invertida** (rótulo como caixa clara com borda). **Revogado**: rótulo é texto n-500
  sem caixa.
- **Ornamento por módulo em 465 linhas**, na ficha e na casca. **Reduzido** a uma forma, e só em
  login e 404.
- **Radio de seleção única na grade.** **Revogado**: checkbox + barra de lote.
- **Sombra em cinco degraus neutros.** **Revogado**: três duras de tinta + uma suave, com papel
  declarado por degrau.
