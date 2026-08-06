---
name: Cabinet
description: Sistema visual de um ERP denso, desktop, em PT-BR — documento comercial com estrutura neo-brutalista de superfície creme, elevação em degraus e acento saturado.
colors:
  bench: "hsl(41 25% 85%)"
  sheet: "hsl(42 50% 96%)"
  neutral: "hsl(44 35% 92%)"
  ink: "hsl(0 0% 0%)"
  ink-muted: "hsl(37 16% 36%)"
  rule-hair: "hsl(42 17% 70%)"
  main: "hsl(241 100% 66%)"
  main-hover: "hsl(241 77% 57%)"
  main-foreground: "hsl(0 0% 100%)"
  accent: "hsl(262 97% 76%)"
  info: "hsl(219 90% 69%)"
  money: "hsl(155 81% 26%)"
  danger: "hsl(357 84% 42%)"
  warn: "hsl(47 100% 50%)"
  ring: "hsl(47 100% 50%)"
  zone-money: "hsl(78 32% 90%)"
  zone-id: "hsl(30 36% 91%)"
  zone-info: "hsl(213 21% 92%)"
  zone-warn: "hsl(46 63% 89%)"
  zone-danger: "hsl(14 49% 90%)"
  shadow-1: "hsl(41 14% 61%)"
  shadow-2: "hsl(39 13% 47%)"
  shadow-3: "hsl(37 16% 36%)"
  shadow-4: "hsl(36 18% 27%)"
  shadow-5: "hsl(35 20% 19%)"
typography:
  display:
    fontFamily: "Sora, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.85rem"
    fontWeight: 700
    letterSpacing: "-0.012em"
  headline:
    fontFamily: "Sora, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.35rem"
    fontWeight: 700
    letterSpacing: "-0.012em"
  value:
    fontFamily: "Sora, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.7rem"
    fontWeight: 700
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
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
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
  el-1: "2px 2px 0 0 hsl(41 14% 61%)"
  el-2: "3px 3px 0 0 hsl(39 13% 47%)"
  el-3: "5px 5px 0 0 hsl(37 16% 36%)"
  el-4: "7px 7px 0 0 hsl(36 18% 27%)"
  el-5: "10px 10px 0 0 hsl(35 20% 19%)"
  border-strong: "2px solid hsl(0 0% 0%)"
  border-heavy: "3px solid hsl(0 0% 0%)"
---

# Design System: Cabinet — fase 1.5

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

1. **Elevação de verdade** — 5 degraus de sombra, sem blur, na **família quente do papel**. Sombra preta
   vira buraco na tela; sombra cor-de-papel projeta como papel sobre papel.
2. **Canto por natureza** — o raio diz o que a coisa é: painel 10px, cartão 6px, controle 4px, dado 2px,
   **item 0**. Item é o que encosta em item (chip, aba, página, célula, item de menu, etiqueta): canto
   arredondado ali abre fresta e desmancha a fileira.
3. **Cor que move** — violeta saturado é a AÇÃO (primária, seleção, aba ativa). O amarelo recua para o
   que ele sempre foi bom: foco e pendência.

Princípios que NÃO mudaram: densidade de comanda vence respiro decorativo · vocabulário literal do
legado SoftLux · desktop-only, largura inteira · número tabular à direita · mono para identificador ·
interação por clique · nada anima na entrada de tela.

**Key characteristics:**
- Bancada creme com grade de 52px no fundo; folhas de trabalho pousam OPACAS por cima
- Traço PRETO de 2px em toda caixa — o preto ficou no traço, saiu do preenchimento e da sombra
- **Elevação em 5 degraus** com sombra quente (`el-1` apoio · `el-2` campo · `el-3` padrão · `el-4` destaque · `el-5` modal)
- **Etiqueta invertida**: rótulo de seção, rótulo de campo e cabeçalho de coluna são **caixa clara com letra preta**. A força vem da borda, da caixa alta e do tracking — não do fundo cheio
- **Superfície tintada por conteúdo**: valor (creme-esverdeado) · identidade (creme-avermelhado) · apoio (creme-azulado) · pendência (creme-amarelado) · bloqueio (creme-avermelhado forte)
- **Faixa de acento**: painel importante ganha barra de 8px na lateral esquerda, com traço à direita
- Dinheiro escreve em VERDE, negativo em vermelho; célula de valor ganha fundo da zona
- Foco = **amarelo 3px com fio preto de 1px por fora**, em todo controle (§Foco)
- Três famílias, todas **self-hosted**: Sora (título) · Inter (corpo) · PT Mono (identificador e etiqueta)

## Colors

### Superfícies
| papel | uso |
|---|---|
| Bancada `hsl(41 25% 85%)` | fundo do app, atrás das folhas |
| Folha `hsl(42 50% 96%)` | superfície de trabalho: painel, cartão, campo, tabela |
| Neutro `hsl(44 35% 92%)` | trilho, skeleton, hover de item de menu |

### Zonas por conteúdo
Valor `hsl(78 32% 90%)` · Identidade `hsl(30 36% 91%)` · Apoio `hsl(213 21% 92%)` · Pendência
`hsl(46 63% 89%)` · Bloqueio `hsl(14 49% 90%)`. A zona diz do que a área trata **antes de o operador
ler o rótulo**; por isso é exclusiva — zona espalhada em dado comum deixa de significar.

### Acentos — emprego fixo
- **Violeta `hsl(241 100% 66%)`** — AÇÃO: botão primário, linha selecionada, aba/página ativa, item de menu ativo, barra de progresso.
- **Roxo `hsl(262 97% 76%)`** — marca e realce (avatar, badge de destaque). Nunca ação.
- **Azul `hsl(219 90% 69%)`** — informação/apoio.
- **Verde `hsl(155 81% 26%)`** — dinheiro, e só.
- **Vermelho `hsl(357 84% 42%)`** — destruição, erro, valor negativo, carimbo anulado.
- **Amarelo `hsl(47 100% 50%)`** — foco e pendência. Continua proibido como cor de texto.

**Verde e vermelho descem da luz da amostra** (35% e 52%) porque os dois moram sobre a **zona de
valor**, que é justamente onde o operador lê o número que a tela existe para mostrar: a 35% o verde
dava 2,79:1 sobre a zona e a 52% o vermelho dava 3,72:1 — ambos abaixo dos 4,5:1 de texto. Matiz e
saturação são os da amostra; só a luz mudou. Depois: verde 4,65:1 sobre a zona e 5,15:1 sobre a
Folha; vermelho 5,10:1 e 5,65:1. Efeito colateral bem-vindo: o branco do botão destrutivo sai de
4,41:1 para 6,05:1, e o do carimbo `done` (preenchido de verde) de 3,31:1 para 5,52:1.

### Sombra
Cinco degraus de `hsl(41 14% 61%)` a `hsl(35 20% 19%)` — todos sem blur, todos da família quente.
**Nenhuma sombra preta.**

### Modo escuro
`[a resolver — pós 1.5]`. A amostra não define tema escuro; recalcular só depois que a 1.5 estiver
aplicada nas telas. Não improvisar tom a tom.

## Typography

Três famílias self-hosted (`@fontsource`), **zero CDN** — CDN em produção é dependência externa e IP do
operador vazando a cada carga.
- **Display (Sora 700)** — título de tela e de painel, valor de indicador. `letter-spacing: -0.012em`.
- **Corpo (Inter 400/500/600)** — texto, rótulo, controle. Número tabular à direita, como sempre.
- **Mono (PT Mono)** — identificador (código, CNPJ, NCM), etiqueta de seção, rótulo de campo,
  cabeçalho de coluna, badge, migalha. Tracking largo (0.12em; 0.16em na etiqueta de seção).

Regras do Número Tabular e da Mono para Identificador: inalteradas.

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
**Amarelo sozinho não sobrevive ao creme.** O `--ring` da amostra dá **1,45:1** sobre a Folha e
**1,14:1** sobre a Bancada — a WCAG 1.4.11 pede 3:1 de um indicador de foco, e um anel que só o
operador de vista boa enxerga não é indicador. Quem carrega o contraste é um **fio preto de 1px por
fora do amarelo**; o amarelo continua sendo a identidade do foco, como manda a amostra.

Leitura de dentro para fora: borda preta do controle · 3px amarelos · 1px preto · papel.

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

### Button
Fundo Folha, traço 2px, raio de controle. Primário = violeta com texto branco (hover `main-hover`).
Destrutivo = vermelho com texto branco. Compacto para barra de ações. Desabilitado 40% e ponteiro morto.

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
entre linhas. Linha selecionada = **violeta com texto branco**; linha focada = `focus-ring-inset`.
**Aberto na fatia C:** a tabela herda `border-collapse: collapse` do preflight, e sob `collapse` o
`box-shadow` de um `<tr>` não pinta de forma confiável — o amarelo do anel de linha pode não aparecer
(o fio preto, que é `outline`, aparece). Conferir no browser e, se for o caso, passar a tabela para
`border-separate border-spacing-0`, medindo a borda dobrada que isso traz.
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
valor em Display 1.7rem, delta em corpo pequeno. Zona por conteúdo quando o número for dinheiro,
pendência ou bloqueio.

### Navegação
Abas, paginação e itens de menu são ITENS: raio 0, encostados (margem negativa de 2px para o traço não
dobrar), ativo em violeta. Menu é cartão com `el-3`. Migalha em mono.

### Gráfico
Contorno preto de 2px em cada forma, preenchimento de cor cheia dos acentos. Eixo em traço de 2px.
Rótulo em mono 10px. Sem gradiente, sem sombra interna.

### Lift
A microinteração do sistema, na utility `lift-control` (`src/index.css`). A peça repousa em `el-2`,
levanta para `el-3` no hover (`translate(-2px,-2px)`) e afunda para `el-1` no press
(`translate(1px,1px)`). Os deslocamentos são a **geometria da elevação**, não enfeite: a borda externa
da sombra fica parada nos 3px, e só a distância entre peça e sombra muda. Sombra que escorrega junto
com a peça é o que denuncia lift falso.

**Foco cancela o lift** (`transform: none`) — peça focada e sob o mouse ao mesmo tempo ficaria
deslocada com o halo em volta, duas leituras de estado brigando. Enquanto há foco, quem manda é a
`focus-ring`; por isso ela é definida DEPOIS da `lift-control` no `index.css`, e a ordem no arquivo
é o que decide a cascata.

`:active` e `[data-pressed]` valem juntos: o `usePress` da RAC chama `preventDefault` no pointerdown
e em parte dos browsers isso engole o `:active`.

Nunca escrever a receita à mão no componente.

## Motion
`cubic-bezier(0.4,0,0.2,1)`, 100–150ms, só em estado (hover/foco/press). O lift é A microinteração do
sistema (§Lift). Nada anima na entrada de tela.

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

### Don't:
- **Don't** usar sombra preta, nem sombra com blur.
- **Don't** arredondar item (chip, aba, página, célula, item de menu, etiqueta).
- **Don't** usar amarelo como cor de texto, nem violeta como cor de fundo de área grande.
- **Don't** voltar à barra preta sólida no cabeçalho de coluna ou na etiqueta.
- **Don't** carregar fonte de CDN.
- **Don't** levantar linha ou célula de grade no hover — lift é de controle.
- **Don't** improvisar o modo escuro tom a tom.
