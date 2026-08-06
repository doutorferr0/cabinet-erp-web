---
name: Cabinet
description: Sistema visual de um ERP denso, desktop, em PT-BR — "Brut sobre papel": documento comercial com estrutura neo-brutalista.
colors:
  paper: "hsl(42 30% 96%)"
  surface-card: "hsl(0 0% 100%)"
  bench-tint: "hsl(44 45% 90%)"
  ink: "hsl(30 15% 10%)"
  ink-muted: "hsl(32 10% 38%)"
  ink-inverse: "hsl(42 30% 96%)"
  rule-hair: "hsl(38 14% 84%)"
  rule: "hsl(30 15% 10%)"
  grid-line: "hsl(30 15% 10% / 0.28)"
  grid-line-page: "hsl(30 15% 10% / 0.38)"
  anchor-yellow: "hsl(45 96% 54%)"
  alert-red: "hsl(4 74% 44%)"
  money-ink: "hsl(152 65% 24%)"
  zone-money: "hsl(110 24% 88%)"
  zone-id: "hsl(8 36% 89%)"
  stamp-neutral: "hsl(32 10% 38%)"
  stamp-open-bg: "hsl(45 96% 54%)"
  stamp-done-bg: "hsl(30 15% 10%)"
  stamp-void: "hsl(4 74% 44%)"
typography:
  display:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 800
    letterSpacing: "-0.02em"
    textTransform: "uppercase"
  headline:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    letterSpacing: "-0.02em"
    textTransform: "uppercase"
  title:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 800
  body:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
  label:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
  control:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
  numeric:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    fontFeature: "tabular-nums"
  meta:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "0.75rem"
    fontWeight: 700
    letterSpacing: "0.07em"
    textTransform: "uppercase"
  doc-number:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "1.5rem"
    fontWeight: 700
    letterSpacing: "-0.01em"
rounded:
  none: "0px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  cell: "52px"
effects:
  shadow-hard: "5px 5px 0 hsl(30 15% 10%)"
  shadow-hard-sm: "3px 3px 0 hsl(30 15% 10%)"
  border-strong: "2px solid hsl(30 15% 10%)"
  border-heavy: "3px solid hsl(30 15% 10%)"
---

# Design System: Cabinet — "Brut sobre papel"

> Supersede a direção "Papel Funcional" (V1-V20). Mockup de referência aprovado pelo user:
> `docs/design/mockup-brut-papel.html` (2026-08-04). Em divergência entre este doc e o mockup, o mockup vence.
> Refs: BRUT./neo-brutalismo · De School Amsterdam (grade de fundo) · utrecht.jp (cru, links sublinhados)
> · Low-tech Magazine · neobrutalism.dev (referência visual da receita neo-brut) · brutalism.tailwinddashboard.com (padroes de tela admin neo-brut, Tailwind 4).

## Overview

O ERP continua documento comercial — orçamento é invoice, listagem é ledger, produto é ficha técnica —
mas o documento agora tem estrutura neo-brutalista: **caixa preta de 2px, sombra dura, grade de células
no papel, zonas preenchidas de cor, tipografia display com peso real**. A timidez da direção anterior
(réguas quase invisíveis, zero acento, hierarquia por sussurro) foi o motivo da revisão.

Princípios que NÃO mudaram: densidade de comanda vence respiro decorativo · vocabulário literal do
legado SoftLux · desktop-only, largura inteira · número tabular à direita · mono para identificador ·
interação por clique · nada anima na entrada de tela.

**Key characteristics:**
- Papel cream com **grade de células de 52px** percorrendo o fundo (De School); folhas de trabalho pousam OPACAS por cima
- Caixa PRETA 2px em moldura, bloco e grade; **sombra dura 5px/3px** (deslocamento, sem blur) na moldura e no botão primário
- Malha interna da grade continua FIO CLARO — a caixa grita, a malha sussurra; 30 linhas seguem legíveis
- **Cabeçalho de coluna = barra preta sólida** com texto cream em mono caps
- **Zonas tintadas em creme**: creme-esverdeado = zona de dinheiro/totais · creme-avermelhado = banda de identidade (título de tela/documento)
- **Tinta de dinheiro**: valor monetário escreve em VERDE; valor negativo em vermelho (tradição do ledger)
- Amarelo = âncora/atenção: nº de seção, carimbo ABERTO, marcador de seleção, anel de foco
- Canto RETO (radius 0) — brut não arredonda
- Título de tela em display 800 caps dentro de banda; nº de documento grande em mono
- Legend de bloco = etiqueta preta cavalgando a borda
- Link secundário cru estilo Utrecht: mono caps sublinhado 2px, hover com fundo amarelo

## Colors

### Superfícies
- **Papel** `hsl(42 30% 96%)`: fundo da aplicação, com a grade de 52px em `grid-line` (0.28 dentro do app). Nunca branco puro.
- **Documento** `#fff`: folha, tabela, formulário, diálogo — sempre opaco sobre a grade.
- **Tinta de Bancada** `hsl(44 45% 90%)`: hover de linha e de botão outline.
- **Zona de Dinheiro** `hsl(110 24% 88%)`: fundo das fileiras de total e células de resumo financeiro.
- **Banda de Identidade** `hsl(8 36% 89%)`: fundo da banda de título de tela e do cabeçalho de documento.

### Tinta
- **Tinta** `hsl(30 15% 10%)`: texto, dado, e agora TODA caixa estrutural (a régua da caixa é preta).
- **Tinta Apagada** `hsl(32 10% 38%)`: rótulo de moldura, contagem, estado vazio.
- **Tinta de Dinheiro** `hsl(152 65% 24%)`: TODO valor monetário (célula, campo, total). 6,9:1 sobre branco. Quantidade e percentual continuam em Tinta — só dinheiro é verde.
- **Fio** `hsl(38 14% 84%)`: malha interna da grade (linhas E colunas), única linha que não é preta.

### Acentos — emprego fixo
- **Amarelo Âncora** `hsl(45 96% 54%)`: SEMPRE fundo com texto/borda Tinta por cima (amarelo como cor de texto é proibido — não passa AA). Empregos: bloco de nº de seção, carimbo ABERTO, marcador de linha selecionada, anel de foco (3px), hover do link cru.
- **Vermelho de Alerta** `hsl(4 74% 44%)`: destruição, erro de validação, carimbo ANULADO, valor negativo.
- Verde-dinheiro e zonas tintadas acima completam a paleta. **Nenhuma outra cor entra.**

### Named Rules
**Regra do Emprego Fixo.** Cada cor tem emprego nomeado acima. Cor nova ou emprego novo = revisão desta spec, não decisão de tela.
**Regra da Caixa Preta.** Toda caixa estrutural (moldura, bloco, contêiner de grade, banda, campo) é `2px solid` Tinta. Separador de seção interna é `3px`. A malha interna é a única linha em Fio.
**Regra do Amarelo de Fundo.** Amarelo nunca é cor de texto; é fundo ou borda com Tinta por cima.
**Regra da Grade de Fundo.** A grade de 52px vive no Papel (fundo do app), NUNCA dentro da folha branca. Elementos de página se alinham à célula onde for barato (padding do shell = 1 célula; alturas de banda em múltiplos/frações da célula).

### Modo escuro
`[a resolver — fase 3]`. Gramática igual (papel escuro + folha + caixa clara + zonas tintadas escuras), valores recalculados com contraste verificado. Não improvisar tom a tom.

## Typography

Duas famílias de sistema, zero webfont (inalterado). O que muda é PESO e CAIXA:
- **Display/Headline** (800, caps, tracking -0.02em): título de tela dentro da banda de identidade.
- **Nº do Documento** (mono 700, 1.5rem): âncora do cabeçalho de documento.
- **Meta** (mono 700, 0.75rem, caps, tracking 0.07em): cabeçalho de coluna (agora cream sobre preto), legend, código, NCM, CNPJ, carimbo, rodapé.
- **Body/Label/Numeric**: inalterados (0.875rem; label sobe pra 600).
- **Control** (13px, 600): texto de botão — valor do mockup (`.btn`), degrau próprio entre Body e Meta.
- **Link cru** (Utrecht): mono 700 caps sublinhado `text-decoration-thickness: 2px`, hover fundo amarelo. Para ações secundárias de navegação ("Exportar lista →", "Ver todos →").
Regras do Número Tabular e da Mono para Identificador: inalteradas. Dinheiro é sans tabular VERDE, não mono.

## Layout

- Shell 3 zonas inalterado (sidebar colapsável, header 52px, conteúdo). **Bloco da empresa ativa no topo da sidebar = fundo amarelo com borda preta.** Item de navegação ativo: fundo Documento + borda esquerda 3px Tinta.
- Área de conteúdo = Papel COM grade de 52px; padding = 1 célula (52px) para o conteúdo nascer enquadrado.
- Folha de trabalho: Documento + caixa preta 2px + **sombra dura 5px**.
- Grade de campos 12 colunas com `items-end`: inalterada. Quatro degraus de espaçamento (4/8/12/16): inalterados.
- Largura inteira, sem max-width: inalterado.
- Densidade: cabeçalho de tabela 34px, célula 33px, célula editável 32px.

## Components — método de construção

**Base: aria oficial do shadcn** (`react-aria-components` pin 1.20.0, via CLI `shadcn --base aria`) —
decisão pós-spike RAC de 2026-08-04, que matou o copy-paste do neobrutalism.dev (Radix); a receita
visual neo-brut fica, a fonte dos primitivos muda. Adoção:
1. Primitivos de `src/components/ui/` SUBSTITUÍDOS pelas versões da base aria, com o esquema de tokens deles remapeado pra ESTA paleta no `index.css`. O default deles não entra.
2. **Guarda Tailwind v4 obrigatória em cada componente copiado**: `pnpm build` + `grep -o 'width:--[a-z-]*' dist/assets/*.css` = zero acerto (armadilha v3→v4 já paga; ver CLAUDE.md).
3. Receita neo-brut dos controles: borda 2px, sombra dura 3px, `hover:translate(-1px,-1px)` com sombra crescendo, `active:translate(2px,2px)` com sombra sumindo, radius 0.
4. Componentes-assinatura (abaixo) mantêm API e lógica; só a pele muda.

### Buttons
- **Primary** (`Gravar`): Tinta sólida, texto cream, sombra dura 3px, um por tela.
- **Outline**: fundo Documento, borda preta 2px, hover Bancada. Barra de ações da listagem em compacto (31px).
- **Destructive**: borda/texto vermelho, hover fundo vermelho texto branco.
- **Foco**: anel 3px Amarelo Âncora, offset 0 — em TODO controle focável.
- Desabilitado 50% + ponteiro morto; ícone Lucide 16px, nunca emoji: inalterados.

### DataTable (assinatura)
Ledger brut: caixa preta 2px em volta · **thead com fundo Tinta, texto cream, Meta, 34px, células separadas por 1px de tinta clara** · malha interna em Fio (linhas E colunas) · linha selecionada = fundo Bancada + **marcador esquerdo duplo: 4px amarelo + 1px tinta** · hover Bancada · skeleton 5 linhas · vazio "Nenhum registro." · rodapé com contagem em Meta + paginação em outline compacto + link cru opcional. `rowNumbers` e cabeçalho agrupado: mecanismos inalterados.

### CadastroForm (assinatura)
Banda de identidade no topo: fundo creme-avermelhado, caixa preta 2px, título em Headline 800 caps + contexto em Meta. Bloco `<fieldset>` com caixa preta 2px e **`<legend>` = etiqueta com fundo Tinta e texto cream** cavalgando a borda. Rodapé fixo com régua superior 3px. Modo consulta via `<fieldset disabled>`: inalterado.

### FormGrid (assinatura)
Mesma malha da DataTable; célula editável sem borda (a malha É o campo — inalterado), foco = anel amarelo interno. Faixa de seção (`sectionKey`): fundo Bancada, réguas 2px pretas acima/abaixo. **Totais (prop `totals`): células da zona com fundo creme-esverdeado, valores em Tinta de Dinheiro, `Total` com régua 3px acima e peso 800.** Negativo em vermelho.

### DocumentoHeader (assinatura)
Banda creme-avermelhada com caixa preta: título 800 caps + carimbo + nº do documento em mono 1.5rem à direita.

### Stamp
Retângulo 24px, borda 2px, Meta. **ABERTO = fundo amarelo/texto tinta · CONCLUÍDO = fundo tinta/texto cream · ANULADO = borda+texto vermelho · NEUTRO = borda+texto tinta apagada.** Mapeamento tom→situação continua `[a resolver]` (enumeração real do backend).

### Stipple
Célula de textura pontilhada (radial-gradient 1px/7px) com caixa preta — acento gráfico De School. Empregos permitidos: tela de login, estado vazio de módulo, tela inicial. NUNCA atrás de dado.

## Motion
`cubic-bezier(0.4,0,0.2,1)`, 100-150ms, só em estado (hover/foco/press/colapso). O press físico do botão (translate + sombra) é A microinteração do sistema. Nada anima na entrada de tela.

## Roteiro de implementação (PR por fase, fases na ordem)

**Fase 1 — fundação:** tokens novos no `index.css` (tema claro; escuro fica pro fim) · grade de 52px no Papel do shell · substituição dos primitivos `ui/` pela base aria re-estilizada (guarda v4 em cada um) · radius 0 global · sombra dura na folha.
**Fase 2 — assinatura:** DataTable → CadastroForm → FormGrid/totais → DocumentoHeader → Stamp → Stipple, na ordem (DataTable primeiro: é a peça mais reutilizada).
**Fase 3 — varredura:** todas as telas conferidas contra o mockup · modo escuro recalculado · regenerar `.impeccable/design.json` do código novo.
**DoD por fase:** lint + types + testes verdes · `pnpm build` + grep `width:--` zero · CI verde · nenhuma mudança de contrato/API de componente sem registro.

## Do's and Don'ts

### Do:
- **Do** pousar toda folha OPACA sobre a grade do Papel, com caixa preta e sombra dura.
- **Do** compor telas a partir de `src/components/cabinet/` — reimplementar tabela/rodapé na tela é o vetor de deriva.
- **Do** escrever dinheiro em verde, negativo em vermelho, e manter quantidade/percentual em tinta.
- **Do** usar rótulo literal da transcrição SoftLux; Meta em identificador; tabular à direita em número comparável.
- **Do** usar o press físico (translate+sombra) em todo botão.
- **Do** rodar a guarda v4 em todo componente copiado da base aria.
- **Do** marcar valor ausente como `[a resolver]`.

### Don't:
- **Don't** arredondar canto (radius 0 é lei) nem usar sombra com blur.
- **Don't** usar amarelo como cor de texto, nem cor fora dos empregos nomeados.
- **Don't** pôr a grade de 52px dentro da folha branca ou atrás de tabela.
- **Don't** deixar a malha interna da grade virar preta — fio claro é o que segura a densidade.
- **Don't** usar zebra (malha fechada já delimita), max-width, spinner central, emoji em controle.
- **Don't** copiar componente da base aria com a paleta default — tokens desta spec sempre.
- **Don't** inventar nome de situação de carimbo, nem improvisar modo escuro tom a tom.
- **Don't** animar entrada de tela.
