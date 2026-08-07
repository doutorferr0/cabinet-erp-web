---
name: Cabinet
description: Sistema visual de um ERP denso, desktop, em PT-BR — documento comercial com estrutura neo-brutalista de superfície creme, elevação em degraus e acento saturado.
colors:
  bench: "hsl(41 25% 85%)"
  sheet: "hsl(0 0% 100%)"
  sheet-sunken: "hsl(60 20% 98%)"
  neutral: "hsl(44 35% 92%)"
  ink: "hsl(0 0% 0%)"
  ink-muted: "hsl(37 16% 36%)"
  rule-hair: "hsl(42 17% 70%)"
  main: "hsl(241 100% 66%)"
  main-hover: "hsl(241 77% 57%)"
  main-foreground: "hsl(0 0% 100%)"
  accent: "hsl(262 97% 76%)"
  info: "hsl(225 71% 75%)"
  money: "hsl(155 81% 26%)"
  danger: "hsl(357 84% 42%)"
  warn: "hsl(47 100% 50%)"
  ring: "hsl(47 100% 50%)"
  zone-money: "hsl(154 96% 91%)"
  zone-id: "hsl(263 94% 93%)"
  zone-info: "hsl(223 69% 95%)"
  zone-warn: "hsl(48 100% 95%)"
  zone-danger: "hsl(6 76% 95%)"
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
  el-3: "4px 4px 0 0 hsl(37 16% 36%)"
  el-4: "6px 6px 0 0 hsl(36 18% 27%)"
  el-5: "8px 8px 0 0 hsl(35 20% 19%)"
  border-strong: "2px solid hsl(0 0% 0%)"
  border-heavy: "3px solid hsl(0 0% 0%)"
---

# Design System: Cabinet — fase 1.6

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

**O que a 1.6 acrescentou** (a 1.5 continua valendo no que ela não contradiz): a queixa era
"escuro/triste/sem cor", e a resposta tem três partes. **Cor** — folha branca sobre bancada creme,
as cinco zonas viram os pastéis /02 da paleta, e cada módulo ganha um par fixo trocado por escopo.
**Movimento** — entrada de tela numa mola, peça que aparece com outra, e o hover que PULA (§3b),
porque o da 1.5 foi avaliado como fraco. **Ornamento** — uma forma colorida por módulo, recortada
por máscara, jamais preta.

**Key characteristics:**
- Bancada creme com grade de 52px no fundo; folhas de trabalho BRANCAS pousam OPACAS por cima
- Traço PRETO de 2px em toda caixa — o preto ficou no traço, saiu do preenchimento e da sombra
- **Elevação em 5 degraus** com sombra quente (`el-1` apoio · `el-2` campo · `el-3` padrão · `el-4` destaque · `el-5` modal)
- **Etiqueta invertida**: rótulo de seção, rótulo de campo e cabeçalho de coluna são **caixa clara com letra preta**. A força vem da borda, da caixa alta e do tracking — não do fundo cheio
- **Superfície tintada por conteúdo**: valor (creme-esverdeado) · identidade (creme-avermelhado) · apoio (creme-azulado) · pendência (creme-amarelado) · bloqueio (creme-avermelhado forte)
- **Faixa de acento**: painel importante ganha barra de 8px na lateral esquerda, com traço à direita
- Dinheiro escreve em VERDE, negativo em vermelho; célula de valor ganha fundo da zona
- Foco = **amarelo 3px com fio preto de 1px por fora**, em todo controle (§Foco)
- Três famílias, todas **self-hosted**: Sora (título) · Inter (corpo) · PT Mono (identificador e etiqueta)

## Colors

### Superfícies — fundo MEIO-TERMO (1.6)
| papel | uso |
|---|---|
| Bancada `hsl(41 25% 85%)` | fundo do app, atrás das folhas — **segue creme** |
| Folha `#FFFFFF` | superfície de trabalho: painel, cartão, campo, tabela |
| Afundado `#FBFBF9` (Gray-50) | degrau INTERNO da folha: compartimento de formulário, trilho |
| Neutro `hsl(44 35% 92%)` | hover de item, skeleton |

Creme sobre creme fazia a folha sumir contra a bancada — era metade da queixa de "escuro e sem
cor": não havia degrau entre fundo e superfície de trabalho. Com a folha branca, caixa dentro de
caixa passa a depender só do traço, e é para isso que existe o **Afundado**: meio grau de luz,
sem gastar cor. Degrau ≠ zona — quem tem cor de verdade é o bloco cujo CONTEÚDO tem dono.

### Zonas por conteúdo — os pastéis /02 da paleta (1.6)
Valor `#D2FEEB` · Identidade `#E9DCFE` · Apoio `#E9EEFB` · Pendência `#FFFAE5` · Bloqueio
`#FCEBE9`. Eram cremes tingidos a ~30% de saturação, que sobre folha creme mudavam o tom do papel
sem nomear conteúdo nenhum. A zona diz do que a área trata **antes de o operador ler o rótulo**;
por isso é exclusiva — zona espalhada em dado comum deixa de significar.

Nenhum par piorou na troca: dinheiro sobe de 4,65:1 para **5,02:1** sobre a zona de valor,
negativo para **5,25:1** sobre a de bloqueio, e preto fica entre 16:1 e 20:1 em todas as cinco.

### Cor de MÓDULO — /02 pinta a seção, /01 pinta o dado
Cada módulo tem um par fixo, trocado por **escopo** (`data-modulo` no shell) e lido pelas
utilities `bg-modulo` (pastel /02), `bg-modulo-cheia` (cheia /01) e `text-modulo`.

| Módulo | Cor /01 | /02 | Shape do ornamento |
|---|---|---|---|
| Produtos | Cyan `#22D2ED` | `#CEF9FD` | `brutalist-shape-159` (etiqueta serrilhada) |
| Estoque | Maya blue `#61BCFF` | `#D1ECFF` | `brutalist-072` (empilhamento) |
| Vendas / Orçamento | Purple mimosa `#A68AF8` | `#ECE8FD` | `brutalist-shape-128` (documento) |
| Compras / Pedidos | Violet `#E779F8` | `#F9E7FE` | `brutalist-022` (sacola) |
| Clientes | Lavender blue `#C7B9FF` | `#F0E3FF` | `brutalist-064` (pessoa) |
| Fornecedores | Soft blue `#828DF9` | `#E0E7FF` | `brutalist-029` (galpão) |
| Profissionais | Easter purple `#D47FFB` | `#F7E8FF` | `brutalist-shape-133` (crachá) |
| Boletim | Fusion coral `#FF8577` | `#FFDFDB` | `brutalist-shape-135` (anéis) |

**Colaboradores fica `[a atribuir]`** — a tabela travada pelo user cobre oito módulos e esse não
é um deles. Cai no par padrão (marca do sistema) até haver decisão; inventar a nona cor seria
decidir identidade visual por conta própria.

Os pares **não passam pelo `@theme inline`**: ali `--color-x: hsl(var(--y))` é substituído no
`:root`, e o valor já resolvido é o que os filhos herdam — redefinir `--modulo-01` num
descendente não mudaria nada. A troca por escopo só funciona porque as utilities leem a `var()`
no elemento que pinta.

Risco conhecido e aceito: cyan, maya blue, soft blue e lavender são vizinhos e só se distinguem
lado a lado. Quem carrega a identidade é o SHAPE; a cor reforça. Se ficarem indistintos na tela,
troca-se a cor de UM módulo — não o sistema.

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
**Nenhuma sombra preta.** A escada é **2/3/4/6/8** desde a 1.6: a 10px a sombra do modal virava
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

Escala: **18px** item de menu · **20px** cabeçalho de seção · **24px** banda de identidade ·
**96–128px** estado vazio.

No item de menu o par entra **invertido** em relação ao fundo: item inativo é liso e leva a cheia
/01 (a fileira vira um mapa de cores); item ativo já tem fundo /01 e leva a pastel /02, senão a
forma sumiria. Estado de sistema não usa a cor do módulo: busca sem resultado é Info/01
`#93AAED` — vazio de busca não é módulo vazio.

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
valor em Display 1.7rem, delta em corpo pequeno. Zona por conteúdo quando o número for dinheiro,
pendência ou bloqueio.

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

### Don't:
- **Don't** deixar ornamento preto ou cinza, nem editar o `fill` de um SVG à mão.
- **Don't** pôr mais de um ornamento por região visível.
- **Don't** animar linha, célula, campo ou anel de foco.
- **Don't** usar sombra preta, nem sombra com blur.
- **Don't** arredondar item (chip, aba, página, célula, item de menu, etiqueta).
- **Don't** usar amarelo como cor de texto, nem violeta como cor de fundo de área grande.
- **Don't** voltar à barra preta sólida no cabeçalho de coluna ou na etiqueta.
- **Don't** carregar fonte de CDN.
- **Don't** levantar linha ou célula de grade no hover — lift é de controle.
- **Don't** improvisar o modo escuro tom a tom.
