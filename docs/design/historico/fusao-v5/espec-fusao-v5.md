# CABINET — Sistema de Design "Neo-brutal Suave"

> Aprovado: 2026-08-19 — referência canônica: `mockup-orcamentos-neobrutal.html` (v5, tela Orçamentos)

Linguagem: neo-brutalismo dosado. **Barulho na estrutura, calma no dado.** Cor delimita zona e
comunica estado; tipografia faz a hierarquia; sombra dura marca decisão, sombra suave marca
superfície.

---

## 1. Tokens

### Superfícies
| token | valor | uso |
|---|---|---|
| `--bg` | `#F5F3EC` | fundo da página (creme, nunca branco puro) + gradientes radiais sutis violeta/teal |
| `--surface` | `#FFFFFF` | cards, inputs, linhas de tabela |
| `--surface-glass` | `rgba(255,255,255,.72)` + `backdrop-blur(8px)` | tabs, breakdowns, painéis flutuantes |
| `--ink` | `#22221E` | texto principal, header de tabela, botão preto |
| `--ink-2` | `#55554C` | texto secundário |
| `--muted` | `#8A897D` | metadado, labels |
| `--hairline` | `#E6E2D5` | divisores internos, bordas fracas |
| `--line` | `#2A2A25` | borda estrutural (moldura, tabela, botões fortes) |
| sidebar | `#141412` fundo · `#1D1D1A` input · `#B9B8AE` texto · `#2C2C28` divisor | única zona escura |

### Paleta tonal — cada cor tem 3 formas: viva, `soft` (fundo rgba ~15%), `text` (escura p/ texto)
| cor | viva | soft | text | papel |
|---|---|---|---|---|
| violet | `#7C6CF0` | `rgba(124,108,240,.13)` | `#4F3ED6` | Comercial · primário · foco |
| green | `#7FB94F` | `rgba(127,185,79,.16)` | `#3E6B1D` | Estoque · sucesso · Itens |
| lime | `#D7EC8F` (viva: `#D8F04A`) | `rgba(216,240,74,.25)` | `#556210` | dinheiro/total · acento do escuro |
| teal | `#46B5A7` | `rgba(70,181,167,.15)` | `#146F63` | Catálogo · Identificação · ambiente |
| coral | `#F0876B` | `rgba(240,135,107,.16)` | `#BA4526` | Desconto · subtração |
| amber | `#EFB93F` | `rgba(239,185,63,.18)` | `#8A6208` | Financeiro · atenção · status aberto · Atividades |
| blue | `#5C9DE0` | `rgba(92,157,224,.15)` | `#205E9E` | Pessoas · info · tipo de atividade |
| pink | `#E88BBB` | `rgba(232,139,187,.16)` | `#B23578` | CRM · tipo de peça |
| red | `#E06055` | `rgba(224,96,85,.14)` | `#A82A20` | erro · destrutivo · vencido |

Regras: chips = fundo `soft` + texto `text` + borda 1px da cor viva a ~40%. Cor de marca NUNCA
dobra como cor de status. Máx. de tinta viva por tela: total, primário, nav ativa.

### Profundidade
| token | valor | uso |
|---|---|---|
| `--shadow-soft` | `0 1px 2px rgba(34,34,30,.05), 0 6px 20px rgba(34,34,30,.07)` | cards, botões neutros |
| `--shadow-card` | `0 1px 3px …06, 0 10px 32px …08` | tabela, header do doc |
| `--shadow-hard` | `3px 3px 0 var(--line)` | primário, Voltar, nº do doc, total (decisão) |
| `--shadow-hard-lg` | `5px 5px 0 var(--line)` | bloco do total |
Interação: hover levanta (translate −1px + sombra cresce) · active afunda (translate +1px + sombra some).

### Raios e bordas
Moldura-mãe 20px · cards/seções 12–14px · inputs/botões 8–10px · chips 5–7px.
Estrutural `1.5px var(--line)` · interno `1px var(--hairline)` · read-only tracejada.

## 2. Tipografia — 4 famílias, papel fixo
| família | papel | exemplos |
|---|---|---|
| **Bebas Neue** | display condensado, números-herói | "ORÇAMENTO" 36px · total 48px |
| **Archivo** (+ Archivo Black) | UI: botões, labels, corpo, títulos de seção | corpo 14/500 · seção 13/800 · label 10/700 caps +1.2px |
| **Space Mono** | dado: valores, datas, códigos, headers de tabela, breadcrumb | 13.5/valores · 9.5 caps/th |
| **Instrument Serif** *itálica* | secundário editorial: vazios ("nenhum"), dicas, notas | 13–14.5px |
Line-height: display 1.0–1.1 · corpo 1.5. Monetário: sempre mono, alinhado à direita, bold no valor de decisão.

## 3. Composição — subdivisão explícita
1. **Moldura-mãe** (`doc-frame`): retângulo 1.5px `--line`, raio 20, fundo `rgba(255,255,255,.38)`,
   etiqueta preta/lima sobreposta na borda (`DOCUMENTO · ORÇAMENTO Nº 5`). Envolve TUDO que
   pertence à entidade. O que não pertence (ex.: Atividades) fica FORA.
2. **Seções-filhas** (`fsec`): caixa branca 1px hairline, raio 12, barra de cor 4px à esquerda,
   título em caixa colorida (`st-box`) + número mono (`01`, `02`…). Card agrupador semi-transparente
   (`rgba(255,255,255,.45)`) pra fazer as filhas saltarem.
3. **Campos**: label caps 10px muted acima · input mono 13.5 · campo-chave (Cliente) 17/800 Archivo
   com borda forte · read-only fundo `#F4F1E8` + tracejado + cadeado · vazio em serif itálica.

### Regras fixas de página
- **Voltar/cancelar SEMPRE no canto superior esquerdo** (botão com sombra dura), breadcrumb ao lado.
- Sidebar escura: módulos com dot colorido; ativo = fundo violeta + glow; sub-rotas indentadas.
- Tabs em pill glass; ativa = preta.
- 1 ação primária sólida por contexto (violeta) + 1 de sucesso (verde) no fechamento; resto outline/ghost.
- Tabela: header preto + mono caps; zebra sutil `#FAF8F1`; hover violeta-soft; coluna de decisão bold.
- Total: bloco lima gradiente, borda forte, sombra dura, valor Bebas 48px.
- **Foco por zona** (via `:focus-within` na implementação): desligado por padrão; zona ativa ganha
  anel violeta suave + sombra; resto cai pra 78% opacidade / 94% brilho / saturação 75%. 220ms. Sem escala.

## 4. Componentes base (ordem de implementação)
Tokens/fontes → `BackButton` · `Sidebar` · `Chip` · `Button` (primary/success/outline/ghost/destructive)
· `Field` (label+input+estados) · `SectionBox` (fsec+st-box) · `DocFrame` · `DataTable` · `TotalBox`
· `Tabs` · `ActivityCard`.

## 5. Arquétipos de tela
| arquétipo | padrão | status |
|---|---|---|
| **Documento** (orçamento, pedido) | moldura-mãe + seções numeradas + itens + total + ações | mockup v5 aprovado |
| **Listagem/consulta** | toolbar de filtros glass + DataTable full + chips de estado + linha clicável | mockup pendente |
| **Dashboard/início** | cards-resumo com número Bebas + cor do módulo + listas curtas | mockup pendente |

## 6. Anti-padrões
Branco puro de fundo · cor viva em área de dado contínua · mais de 1 primário por contexto ·
label gritando mais que valor · sombra dura em superfície não-interativa (exceto total) ·
status transmitido SÓ por cor (sempre cor + texto) · float pra dinheiro (regra do repo).
