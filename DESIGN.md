---
name: VITRA
description: Sistema visual de um ERP denso, desktop, em PT-BR — papel funcional, não vitrine.
colors:
  paper: "hsl(42 30% 97%)"
  surface-card: "hsl(0 0% 100%)"
  bench-tint: "hsl(42 35% 92%)"
  ink: "hsl(30 12% 12%)"
  ink-muted: "hsl(35 10% 40%)"
  ink-inverse: "hsl(40 20% 95%)"
  graphite: "hsl(28 12% 18%)"
  rule-hair: "hsl(40 14% 88%)"
  rule: "hsl(34 11% 54%)"
  rule-strong: "hsl(32 12% 34%)"
  alert-red: "hsl(0 68% 42%)"
  stamp-neutral: "hsl(35 10% 40%)"
  stamp-open: "hsl(214 70% 34%)"
  stamp-done: "hsl(152 55% 24%)"
  stamp-void: "hsl(0 68% 42%)"
  paper-night: "hsl(30 8% 10%)"
  surface-card-night: "hsl(30 7% 13%)"
  bench-tint-night: "hsl(34 9% 20%)"
  ink-night: "hsl(40 20% 95%)"
  ink-muted-night: "hsl(38 10% 66%)"
  rule-hair-night: "hsl(34 7% 22%)"
  rule-night: "hsl(33 10% 46%)"
  rule-strong-night: "hsl(36 11% 62%)"
  alert-red-night: "hsl(2 70% 62%)"
  stamp-open-night: "hsl(210 70% 64%)"
  stamp-done-night: "hsl(150 45% 58%)"
  graphite-night: "hsl(40 20% 95%)"
  stamp-neutral-night: "hsl(38 10% 66%)"
  stamp-void-night: "hsl(2 70% 62%)"
typography:
  display:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: "2rem"
  headline:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: "1.75rem"
  title:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: "1.75rem"
  body:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.25rem"
  label:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: "1.25rem"
  numeric:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.25rem"
    fontFeature: "tabular-nums"
  meta:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: "1rem"
    letterSpacing: "0.06em"
    textTransform: "uppercase"
  doc-number:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: "1.75rem"
    letterSpacing: "-0.01em"
rounded:
  sm: "2px"
  md: "3px"
  lg: "4px"
  xl: "6px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
components:
  page-frame:
    backgroundColor: "{colors.surface-card}"
    borderColor: "{colors.rule}"
    borderWidth: "1px"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  button-primary:
    backgroundColor: "{colors.graphite}"
    textColor: "{colors.ink-inverse}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "hsl(28 12% 26%)"
  button-outline:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    borderColor: "{colors.rule}"
    borderWidth: "1px"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    height: "32px"
    padding: "0 12px"
  button-outline-hover:
    backgroundColor: "{colors.bench-tint}"
  input-field:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    borderColor: "{colors.rule}"
    borderWidth: "1px"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "4px 12px"
  table-head-cell:
    textColor: "{colors.ink-muted}"
    typography: "{typography.meta}"
    borderColor: "{colors.rule-strong}"
    height: "36px"
    padding: "0 8px"
  table-frame:
    backgroundColor: "{colors.surface-card}"
    borderColor: "{colors.rule}"
    borderWidth: "1px"
    rounded: "{rounded.lg}"
  table-mesh:
    borderColor: "{colors.rule-hair}"
    borderWidth: "1px"
    borderStyle: "solid"
  table-section-band:
    backgroundColor: "{colors.bench-tint}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.meta}"
    borderColor: "{colors.rule-strong}"
    borderWidth: "1px 0"
    height: "28px"
    padding: "0 8px"
  table-total-row:
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    borderColor: "{colors.rule-strong}"
    borderWidth: "1px 0 0 0"
    height: "40px"
    padding: "0 8px"
  table-row-selected:
    backgroundColor: "{colors.bench-tint}"
    textColor: "{colors.ink}"
    borderColor: "{colors.rule-strong}"
    borderWidth: "0 0 0 2px"
  grid-cell-input:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.numeric}"
    rounded: "{rounded.sm}"
    height: "32px"
    padding: "0 8px"
  stamp:
    backgroundColor: "transparent"
    textColor: "{colors.stamp-open}"
    borderColor: "{colors.stamp-open}"
    borderWidth: "1px"
    typography: "{typography.meta}"
    rounded: "{rounded.sm}"
    height: "20px"
    padding: "0 6px"
---

# Design System: VITRA

## Overview

**Creative North Star: "Papel Funcional"**

O ERP como documento impresso bem diagramado, na tela. Orçamento parece invoice. Listagem parece ledger contábil. Produto parece ficha técnica. A referência não é o software de gestão contemporâneo — é o formulário comercial que a operação já sabe ler antes de alguém explicar: colunas que fecham, réguas que separam, numeração grande no canto, carimbo de situação.

Isso não é nostalgia, é ergonomia. Quem digita duzentos documentos por dia não lê a tela, escaneia: procura a coluna do valor, a linha do item, o número do documento. O papel comercial teve um século para resolver esse problema e resolveu com estrutura — régua, alinhamento, tipografia de etiqueta — não com sombra, cartão flutuante ou hierarquia por respiro. VITRA herda a estrutura e devolve em software o que o papel nunca teve: contraste garantido, estado ao vivo, busca.

A superfície é papel tintado, nunca branco clínico nem cinza de aplicativo. O documento em si — painel, tabela, formulário — é branco puro sobre esse papel, emoldurado por régua de 1px. Esse degrau de duas superfícies é a hierarquia de profundidade inteira do sistema; sombra não participa. Peso visual pertence ao dado. Número é tabular e alinhado à direita para que a coluna feche verticalmente sem esforço; código, número de documento e metadado são monoespaçados em caixa alta pequena, porque etiqueta não é prosa.

Matiz é escasso e tem emprego fixo: **carimbo de situação** e **destruição/erro**. Fora desses dois, o sistema é papel, tinta e régua.

**Key Characteristics:**
- Papel tintado na página, branco puro no documento — duas superfícies, zero sombra
- Régua faz todo o trabalho estrutural, em três pesos (fio, régua, régua forte)
- Tabela é **grade fechada**: célula tem parede dos quatro lados, como no formulário impresso
- Densidade de comanda: mais linhas visíveis ganha de respiro decorativo
- Número tabular à direita; metadado em mono de etiqueta, caixa alta pequena
- Cor só em carimbo de situação e em destruição/erro
- Canto quase reto (4px de base) — documento não tem borda arredondada
- Vocabulário do legado é literal e inegociável (rótulo, ordem de campo, título de tela)
- Desktop-only: nenhuma decisão sacrifica largura em nome de tela estreita

**Interação é por clique** (decisão do user, 30/07/2026). Tab e Enter nativos do formulário bastam; `Ctrl+K` continua existindo como conveniência, não como requisito. Nenhum atalho customizado é premissa de layout — nada nesta especificação depende de o usuário memorizar tecla.

## Colors

Paleta de papel: neutros quentes de baixa saturação para superfície, tinta e régua; matiz reservado a dois empregos nomeados. Não há cor institucional da Vertz registrada — e, com a decisão de acento abaixo, o sistema **não precisa de uma** para ficar completo.

### Superfícies
- **Papel** (`hsl(42 30% 97%)`): fundo da aplicação. Creme discreto — lê como papel sob luz de escritório e some em uso de oito horas. Nunca branco puro, nunca cinza puro.
- **Documento** (`hsl(0 0% 100%)`): branco puro. É o painel, a tabela, o formulário, o diálogo — tudo que é *conteúdo* pousado sobre o papel. O degrau Papel → Documento é o que substitui a sombra.
- **Tinta de Bancada** (`hsl(42 35% 92%)`): hover e seleção de linha, fundo de botão secundário pressionado. Único preenchimento tonal do sistema, exclusivo de estado.

### Tinta
- **Tinta** (`hsl(30 12% 12%)`): todo texto de conteúdo e todo dado. Quase-preto quente — 15,5:1 sobre Papel.
- **Tinta Apagada** (`hsl(35 10% 40%)`): cabeçalho de coluna, rótulo de total, contagem de registros, texto de estado vazio. Moldura do dado, não o dado. 5,2:1 sobre Papel — passa AA como texto normal, não só como texto grande.
- **Grafite** (`hsl(28 12% 18%)`): única cor de ação afirmativa preenchida. Preenche `Gravar` e mais nada.
- **Tinta Invertida** (`hsl(40 20% 95%)`): texto sobre Grafite.

### Réguas — três pesos, e só três
O material estrutural do sistema. A escolha do peso é semântica, não estética.
- **Fio** (`hsl(40 14% 88%)`): **toda a malha interna da grade** — entre linhas e entre colunas. Fraco de propósito: são muitas linhas na tela ao mesmo tempo, e a malha precisa delimitar a célula sem virar gaiola. É o traço fino do formulário contábil e do cartão de ponto, onde a grade inteira é mais clara que a caixa que a contém.
- **Régua** (`hsl(34 11% 54%)`): a borda de trabalho — **a caixa em volta** de campo, bloco, grade e folha. É sempre mais forte que a malha que ela encerra: no formulário impresso a moldura chega primeiro ao olho, a malha depois. **3,1:1 sobre Papel**, acima do mínimo de 3:1 que WCAG 1.4.11 exige de contorno que identifica um controle. Este valor é piso de acessibilidade, não preferência: clarear a régua quebra a conformidade.
- **Régua Forte** (`hsl(32 12% 34%)`): separação de seção, sublinha do cabeçalho de coluna, faixa de seção dentro da grade, régua superior do rodapé fixo, régua acima da linha de Total, marcador da linha selecionada. É a "régua dupla" da comanda: onde ela aparece, terminou um bloco e começou outro.

**Os três pesos são uma hierarquia, não uma paleta:** fio < régua < régua forte, sempre nessa ordem de força e sempre com esse significado — malha, caixa, corte. Uma tabela que use o mesmo peso nos três papéis vira o formulário contábil ilegível da referência `formularios-contabeis-ledger-verde`, onde a grade some dentro de si mesma.

### Matiz — dois empregos nomeados
- **Vermelho de Alerta** (`hsl(0 68% 42%)`): ação destrutiva e mensagem de erro de validação. 6,2:1 sobre Papel. **Substitui o vermelho de fábrica do shadcn** (`hsl(0 84.2% 60.2%)`), que reprovava AA como texto (3,0:1 sobre branco) apesar de ser usado exatamente como texto de erro.
- **Carimbo de situação** — o único lugar onde cor codifica informação de domínio: **Neutro** (`hsl(35 10% 40%)`), **Aberto** (`hsl(214 70% 34%)`), **Concluído** (`hsl(152 55% 24%)`), **Anulado** (`hsl(0 68% 42%)`). Aberto, Concluído e Anulado ≥ 6,2:1 sobre Papel; o Neutro é a própria Tinta Apagada (5,2:1 — acima do AA de 4,5:1 para texto normal), porque carimbo neutro é moldura, não alerta.

**A lista de situações é `[a resolver]`.** A transcrição do SoftLux tem o item de menu `Consultar Situação do Pedido de Venda`, o que prova que o conceito existe, mas **não transcreve os valores**. Nenhum nome de situação deve ser inventado para preencher a paleta: o carimbo é um mecanismo de quatro tons semânticos esperando a enumeração real vir da transcrição ou do contrato do backend.

### Modo escuro
Inversão completa, mesma gramática: **Papel Noturno** (`hsl(30 8% 10%)`) na página, **Documento Noturno** (`hsl(30 7% 13%)`) no conteúdo — o degrau de superfície sobrevive à inversão, que era exatamente o defeito do sistema anterior. As três réguas noturnas (`hsl(34 7% 22%)`, `hsl(33 10% 46%)`, `hsl(36 11% 62%)`) mantêm a hierarquia de peso, e `hsl(33 10% 46%)` fica em 3,9:1 sobre o papel noturno. Carimbos e alerta clareiam (`hsl(2 70% 62%)`, `hsl(210 70% 64%)`, `hsl(150 45% 58%)`) para segurar ≥ 4,5:1 no escuro; Neutro e Anulado noturnos não têm tom próprio — derivam de Tinta Apagada Noturna e Alerta Noturno, como no tema claro. O Grafite também não tem versão noturna: a ação afirmativa inverte (`hsl(40 20% 95%)` sobre Papel Noturno, 15,7:1), mesma gramática da inversão geral.

### Named Rules
**A Regra do Matiz com Emprego.** Matiz aparece na interface em exatamente dois lugares: carimbo de situação e destruição/erro. Não existe cor de acento decorativa, de módulo ou de marca — a navegação não muda de cor, o header não tem faixa colorida, botão não é azul. Qualquer matiz fora dos dois empregos é ruído até que esta regra seja explicitamente revogada. *(Revoga e substitui a antiga "Regra do Matiz Único", que só admitia destruição.)*

**A Regra do Peso Antes da Cor.** Hierarquia se resolve por tamanho, peso e posição — nesta ordem — antes de qualquer consideração cromática. Um total importante é `1.125rem/600 tabular`, não colorido.

**A Regra da Régua Auditável.** `hsl(34 11% 54%)` e mais escuro são valores de conformidade: qualquer clareamento precisa ser recalculado contra a superfície de destino e continuar ≥ 3:1. Não ajustar régua "no olho".

**A Regra da Grade Fechada.** Toda tabela de dado — listagem, grade de itens, janela de busca — é uma grade fechada: caixa externa em Régua, malha interna em Fio **entre linhas e entre colunas**. Coluna sem parede é coluna que não fecha; é por isso que todo formulário comercial impresso, do cartão de ponto ao invoice, desenha a vertical. Consequência direta: **zebra não existe neste sistema** — a malha já delimita a célula, e faixa alternada em cima de grade é ruído sobre ruído. *(Isto contraria a nota "zebra sutil" do `inspo/README.md` para `formularios-contabeis-ledger-verde`: aquela referência resolve a varredura horizontal com malha OU com faixa, não com as duas. Escolhida a malha, por ser o que o invoice, o print-order e o cartão de ponto fazem. Se o user preferir a faixa, ela substitui a vertical — não se soma a ela.)*

## Typography

**Duas famílias, ambas do sistema, zero webfont.** Sans (`ui-sans-serif, system-ui, sans-serif`) para conteúdo; mono (`ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`) para etiqueta. Nenhuma dependência de fonte é carregada — decisão explícita, não omissão: o repo veta dependência nova sem aprovação, e a mono de sistema entrega a leitura de etiqueta industrial sem custo de rede.

**Character:** a sans é neutra e desaparece; a mono é a voz. É ela que faz `ORÇ-2026-00184`, `NCM 9405.11.99` e `CÓD. PRD-00291` lerem como *identificador* e não como frase — a distinção que o operador faz cem vezes por dia entre "isto é um dado que eu leio" e "isto é um código que eu confiro dígito a dígito".

### Hierarquia
- **Display** (sans 700, 1.5rem / 2rem): título da tela inicial. Ocorrência única.
- **Headline** (sans 600, 1.25rem / 1.75rem): título de tela, literal da transcrição — `Cadastro de produtos - Banco Principal`.
- **Número do Documento** (mono 600, 1.25rem, tracking -0.01em): a numeração grande do cabeçalho de documento. É a âncora visual da tela de orçamento/pedido/ordem, como o `591890` da comanda. Não compete com o Headline porque ocupa o outro lado da fileira.
- **Title** (sans 600, 1.125rem / 1.75rem): reservado ao valor `Total` da tira de totais. O único número com corpo.
- **Body** (sans 400, 0.875rem / 1.25rem): a fonte real do sistema. Célula, valor de campo, texto de apoio. Mais de 90% do texto.
- **Label** (sans 500, 0.875rem / 1.25rem): rótulo de campo, `<legend>` de bloco, texto de botão. Mesmo tamanho do corpo, distinto por peso.
- **Numeric** (sans 400, 0.875rem, `tabular-nums`): dinheiro, quantidade, percentual — em campo, célula e total. Dinheiro continua **sans**, não mono: a tabular da sans já fecha a coluna e mantém o valor lendo como grandeza, não como código.
- **Meta / Etiqueta** (mono 500, 0.75rem, caixa alta, tracking 0.06em): cabeçalho de coluna, código, NCM, CNPJ, número de documento inline, conteúdo de carimbo, rótulo de rodapé de tabela. Caixa alta pequena em mono lê maior que 0.75rem sugere — é por isso que o degrau menor da escala nasce aqui e não no corpo.

### Named Rules
**A Regra da Escala de Três Degraus.** O texto do sistema tem três tamanhos: `0.75rem` para etiqueta e mensagem de validação, `0.875rem` para todo o corpo, `1.25rem` para título de tela e número de documento. `1.125rem` (Total) e `1.5rem` (Display) são exceções nomeadas, de ocorrência única cada. Um quarto degrau exige justificar por que peso e caixa não resolveram. *(Substitui a "Regra da Escala de Dois Degraus"; o degrau de 0.75rem existe porque a mono em caixa alta precisa dele, e de quebra absorve o débito de `0.8rem` que a validação carregava do scaffold.)*

**A Regra do Número Tabular.** Todo dígito comparável verticalmente — dinheiro, quantidade, percentual, contagem — usa `tabular-nums` e alinhamento à direita. Sem exceção, inclusive dentro de célula editável.

**A Regra da Mono para Identificador.** Mono é para o que se confere, não para o que se lê: código, NCM, CNPJ/CPF, número de documento, chave. Nunca para nome, descrição, endereço ou valor monetário.

## Layout

O shell é fixo e de três zonas: barra lateral colapsável (`collapsible="icon"`, variante `inset`); header de **56px** com gatilho de colapso à esquerda e seletor de empresa e tema à direita; área de conteúdo com padding de `{spacing.lg}` e pilha vertical de `{spacing.lg}`.

**A moldura é nova e é o gesto central da direção.** A área de conteúdo é Papel; cada região de trabalho — listagem, formulário, documento — pousa nela como uma folha: fundo Documento, borda de 1px em Régua, canto `{rounded.lg}`, padding de `{spacing.lg}`. É o `page-frame`. Antes, tabela e formulário flutuavam soltos sobre branco e nada dizia onde a folha começava.

Não há container de largura máxima. Tabela e formulário ocupam a largura disponível inteira — em ERP, coluna cortada é dado perdido, e o cenário confirmado é monitor largo.

**A grade de campos é de 12 colunas.** Todo bloco de formulário é `grid-cols-12` com goteira de `{spacing.md}` e alinhamento **inferior** (`items-end`): rótulos de alturas diferentes não desalinham a fileira de campos. Cada campo declara seu vão em doze avos, reproduzindo a proporção do formulário legado sem medida mágica — código curto ocupa 2, descrição ocupa 6, endereço ocupa a fileira inteira.

O único ponto de quebra real é **640px**: abaixo dele os vãos colapsam e os campos empilham. Rede de segurança do scaffold, não cenário de projeto. A sidebar troca para gaveta a **768px**, herança do shadcn.

**Ritmo de espaçamento** (quatro degraus, e só quatro): `{spacing.xs}` cola ícone a texto; `{spacing.sm}` separa controles irmãos numa barra; `{spacing.md}` separa blocos internos de um componente; `{spacing.lg}` separa regiões da página e é o padding da moldura.

**Densidade de tabela:** cabeçalho de **36px** (desceu de 40px — a etiqueta mono de 0.75rem não precisa da altura que o rótulo de 0.875rem pedia, e a linha recuperada é linha de dado), célula com padding de `{spacing.sm}`, linha inteira clicável. Célula de grade editável em **32px**.

### Named Rules
**A Regra dos Quatro Degraus.** O espaçamento tem quatro valores: 4, 8, 12 e 16px. Um quinto valor precisa de justificativa estrutural, não estética.

**A Regra da Folha.** Toda região de trabalho está dentro de uma moldura (`page-frame`) sobre Papel. Conteúdo solto direto no Papel é bug de composição, não estilo.

**A Regra da Largura Inteira.** Nenhuma tela ganha `max-width`. Largura desperdiçada é coluna que o usuário terá de rolar para ver.

**A Regra dos Doze Avos.** Campo de formulário mede-se em vãos de uma grade de 12 colunas, nunca em largura fixa nem em flex improvisado. Teste: dois blocos vizinhos com contagens de campo diferentes mantêm as bordas esquerdas alinhadas.

## Elevation & Depth

**Resolvido — era o item em aberto da versão anterior deste documento.** A hierarquia de superfícies aninhadas agora é explícita e usa zero sombra:

| Camada | Superfície | Delimitação |
|---|---|---|
| Página | Papel | — |
| Folha de trabalho (`page-frame`) | Documento | caixa 1px em Régua |
| Bloco de formulário (`<fieldset>`) | Documento | caixa 1px em Régua, `<legend>` cavalgando a borda |
| Grade (contêiner) | Documento | caixa 1px em Régua |
| Cabeçalho de coluna | Documento | sublinha em Régua Forte |
| Faixa de seção dentro da grade | Documento | régua acima e abaixo em Régua Forte |
| Célula | Documento | malha em Fio, horizontal **e vertical** |
| Linha selecionada | Tinta de Bancada | marcador esquerdo 2px em Régua Forte |
| Linha de Total | Documento | régua superior em Régua Forte, na largura da coluna de valor |
| Rodapé fixo do formulário | Documento | régua superior em Régua Forte |

Sombra permanece legítima em exatamente um caso: elemento que **flutua sobre o documento e desaparece** — diálogo, popover, dropdown, o `<Command>` do LookupCombo. Ali ela informa "isto está acima e é temporário". Em qualquer outro lugar é decoração.

### Named Rules
**A Regra da Linha Antes da Sombra.** Separação de superfícies coplanares se resolve com borda e tom. Sombra é só para o que flutua e some.

**A Regra do Degrau Sobrevivente.** Toda separação de superfície precisa continuar legível quando o tema inverte. O modo escuro tem seus próprios pares (Papel Noturno / Documento Noturno, três réguas noturnas) justamente porque a versão anterior colapsava borda e preenchimento num tom só no escuro.

## Shapes

Vocabulário de canto **quase reto**, derivado de um raio-base de **4px** (`{rounded.lg}`). Documento comercial não tem canto arredondado; o arredondamento aqui existe só para tirar a aspereza do pixel, não para sugerir "cartão de app".

Na prática: `{rounded.md}` (3px) em botão e campo, `{rounded.lg}` (4px) em moldura e contêiner de tabela, `{rounded.sm}` (2px) em carimbo e célula editável. `{rounded.xl}` (6px) é raro.

Não há geometria decorativa: nenhum recorte, nenhuma forma orgânica, nenhum ícone em tile arredondado. A silhueta recorrente é o **retângulo com régua de 1px e canto de 3–4px**, repetido em três escalas — o campo, a folha e a tira.

`<fieldset>` com `<legend>` sobre a borda superior continua sendo a forma-assinatura do agrupamento em formulário: citação direta do groupbox do SoftLux, e agora também do compartimento da inspo. O `<legend>` passa a usar **Meta** (mono, caixa alta pequena) — é o rótulo de compartimento, não um subtítulo.

**Compartimento é caixa com goteira, não malha.** Blocos vizinhos de um formulário têm cada um a sua caixa fechada em Régua, separados por `{spacing.md}` de respiro — nunca compartilhando parede como as células de uma grade. A distinção é a da ficha técnica e do cabeçalho do cartão de ponto: o bloco é uma peça inteira que se lê sozinha; a célula é um compartimento de uma malha contínua. Confundir os dois produz ou um formulário que parece planilha, ou uma planilha que parece formulário.

## Components

Caráter geral: **impresso e inequívoco**. Controles têm contorno real, estado sem ambiguidade e nenhum efeito que o papel não teria.

### Buttons
- **Forma:** canto `{rounded.md}`, altura padrão **36px**, compacta **32px** para barras de ação densas.
- **Primary:** Grafite sobre Tinta Invertida, peso 500. Um por tela: `Gravar`. Único botão preenchido de qualquer formulário.
- **Outline:** o cavalo de batalha. Fundo Documento, borda em Régua, hover para Tinta de Bancada. Toda a barra de ações das listagens (`Filtro · Incluir · Alterar · Consul. · Excluir/Cancelar · Imprimir`) é outline compacto.
- **Destructive:** Vermelho de Alerta preenchido. Só exclusão e cancelamento de documento.
- **Ghost:** só dentro de chrome — gatilho de sidebar, alternador de tema.
- **Foco:** anel de 2px em Régua Forte, sem deslocamento. Mesmo tratamento na sidebar — não existe anel de outra cor em lugar nenhum.
- **Desabilitado:** opacidade 50% e ponteiro morto. Ações dependentes de seleção (`Alterar`, `Consul.`, `Excluir`) nascem desabilitadas e acendem quando há linha selecionada.
- **Ícone:** Lucide de 16px à esquerda do rótulo. **Nunca glifo emoji** — renderiza diferente por SO, ignora peso e cor do texto, quebra alinhamento óptico.

### Inputs / Fields
- **Estilo:** altura 36px, borda de 1px em Régua, fundo Documento, canto `{rounded.md}`, texto em Body.
- **Foco:** anel de 2px em Régua Forte, outline nativo suprimido.
- **Rótulo:** sempre presente, acima do campo, em Label. Nenhum campo depende de placeholder para se identificar.
- **Erro:** mensagem em Vermelho de Alerta, **0.75rem**, abaixo do campo.
- **Campos de identificador** (código, CNPJ/CPF, NCM, chave) renderizam o valor em Meta/mono — o operador confere dígito, não lê palavra.
- **Campos tipados** carregam a conversão na borda, nunca no dado: dinheiro guarda centavos e digita em reais; data guarda ISO e digita no controle nativo; percentual guarda quatro casas implícitas.

### DataTable (componente-assinatura)
A peça mais reutilizada — oito telas e a janela de busca. Estrutura vertical fixa em três faixas separadas por `{spacing.md}`, dentro da moldura:

1. **Barra:** campo de busca de 288px com ícone de lupa embutido, seguido da barra de ações em outline compacto.
2. **Corpo — o ledger.** Caixa em Régua em volta da grade inteira. Cabeçalho de 36px com rótulo em **Meta** (mono, caixa alta) e **sublinha em Régua Forte**; coluna ordenável é um `<button>` que revela seta só quando ativa. **Malha em Fio entre linhas e entre colunas** — a célula tem parede dos quatro lados. Linha inteira clicável; **linha selecionada recebe Tinta de Bancada mais marcador esquerdo de 2px em Régua Forte** — o marcador existe porque tinta sozinha não alcança 3:1 contra a linha vizinha, e estado não pode depender só de cor. Carregamento mostra cinco linhas de skeleton — nunca spinner, nunca tela vazia. Vazio mostra `Nenhum registro.` centralizado em Tinta Apagada, 96px de altura.
3. **Rodapé:** contagem de registros à esquerda em Meta; seletor de itens por página, `Anterior`, `Página X de Y` e `Próxima` à direita.

**Cabeçalho agrupado** quando duas ou mais colunas pertencem à mesma grandeza: uma fileira acima com o rótulo do grupo centralizado sobre as sub-colunas, separada delas por Fio. É o `MORNING ｜ AFTERNOON ｜ OVERTIME` sobre `IN ｜ OUT` do cartão de ponto, e serve direto a pares como `Previsto ｜ Realizado` ou `Quant. ｜ Un.`.

**Coluna de numeração** opcional como primeira coluna, largura fixa de 40px, valor em Meta e alinhado à direita. Existe para o operador dizer "linha 12" em voz alta — é a numeração impressa do cartão de ponto e da comanda, não um índice decorativo. Ligada por padrão em grade de itens de documento, desligada em listagem de cadastro.

### CadastroForm (componente-assinatura)
Um único `<form>` por tela, com as abas dentro dele — nunca um form por aba. Rodapé **fixo** (`sticky bottom-0`) com régua superior em Régua Forte e fundo Documento opaco: as ações de gravar nunca saem de vista.

Modo consulta é `<fieldset disabled>` envolvendo todo o conteúdo, o que desativa também botões de busca e de incluir linha nas grades; o rodapé colapsa para um único `Fechar`. Mesma tela, sem edição — não uma tela de leitura separada.

Navegação entre campos é a nativa do formulário (Tab / Shift+Tab, Enter no controle focado). Nenhuma aba, campo ou ação depende de atalho customizado.

### FormGrid (componente-assinatura)
Tabela editável dentro do formulário. Células são inputs **sem borda e sem sombra** (`border-0`, `shadow-none`, anel suprimido), de 32px — a moldura é a linha da tabela, não o campo. Numéricos à direita, tabulares. Cada linha termina com botão de remover; a inclusão fica acima da grade, em outline compacto.

Esse apagamento do campo é o oposto do input de formulário e é intencional: em trinta linhas, trinta bordas de campo criariam uma malha dupla — a da grade e a dos campos — e nenhuma das duas se leria. **A malha da grade É o campo**: a célula já tem parede dos quatro lados em Fio, exatamente como a linha pautada da comanda, onde ninguém desenha caixa em volta do que se escreve porque a pauta já é a caixa.

**Faixa de seção** para agrupar linhas dentro da grade (o `Ambiente` do orçamento, quando a captura confirmar que é agrupamento): fileira de largura total, sem colunas, rótulo em Meta alinhado à esquerda, régua acima e abaixo em Régua Forte, fundo Tinta de Bancada. É a banda de seção do menu-comanda — o corte é mais forte que a malha, então o olho entende que ali terminou um bloco.

### DocumentoHeader
Cabeçalho de documento (orçamento, pedido, ordem). Fileira única: título literal da transcrição em Headline à esquerda; **número do documento em Número do Documento (mono 1.25rem) à direita**, com o carimbo de situação ao lado. Abaixo, régua forte fechando o bloco. É a anatomia do invoice e da comanda: quem é o documento, qual o número, em que situação está — antes de qualquer campo.

### Stamp (carimbo de situação)
Retângulo de 20px, canto `{rounded.sm}`, borda de 1px e texto na mesma cor do tom de situação, fundo transparente. Conteúdo em Meta (mono, caixa alta). Sem preenchimento sólido — carimbo é tinta sobre papel, não etiqueta colada.

Os quatro tons semânticos são Neutro / Aberto / Concluído / Anulado. **O mapeamento tom → situação é `[a resolver]`**, dependente da enumeração real; até lá o componente aceita o tom como propriedade e nenhuma tela fixa um nome de situação inventado.

### DocumentoTotais (componente-assinatura)
**Os totais são as últimas linhas da própria grade de itens, não uma tira separada.** É a correção mais concreta que a releitura da inspo trouxe: no invoice e no print-order, `TAX` e `GRAND TOTAL` ocupam as duas últimas fileiras da mesma tabela, com o valor **caindo exatamente sob a coluna de valor dos itens**. O olho desce a coluna e encontra o total no fim dela — não precisa saltar para um bloco à parte e reencontrar o alinhamento.

Estrutura: fileiras finais da grade, células da esquerda vazias ou mescladas, rótulo em Meta na penúltima coluna, valor tabular na coluna de valor. `Total` leva régua superior em Régua Forte e é o único elemento em Title — o degrau de peso é toda a hierarquia de que precisa. Totais são sempre derivados dos itens, nunca campo paralelo.

Quando não há grade de itens na tela (resumos, consultas), o mesmo conteúdo cai numa tira própria alinhada à direita, com caixa em Régua e canto `{rounded.lg}` — mas essa é a exceção, não a forma padrão.

### Navigation
Sidebar colapsável para modo ícone, agrupada por módulo (`Cadastros`, `Estoque`, `Vendas`, `Compras`), rótulo de grupo em Meta. Item ativo casa por prefixo de rota e recebe Tinta de Bancada mais marcador esquerdo de 2px em Régua Forte — mesma gramática da linha de tabela selecionada. Em modo ícone, tooltip com o rótulo completo. O topo é o seletor de empresa ativa — a troca VERTZ ILUMINAÇÃO / VIA HF é decisão de contexto, não configuração enterrada.

**A sidebar não tem paleta própria.** O deslocamento tonal que existia (superfície e tinta meio tom fora do corpo) sai: sobre Papel, a barra é Papel e o conteúdo é Documento — a moldura já separa navegação de trabalho, sem precisar de um segundo sistema de cor.

## Motion

Mínimo e funcional. `cubic-bezier(0.4, 0, 0.2, 1)` em tudo; 150ms para transição de estado (hover, foco, seleção), 200ms para o colapso da sidebar. **Nunca bounce, nunca overshoot, nunca entrada encenada.** Nada anima na primeira renderização de uma tela: o operador abriu a listagem para ler a listagem.

## Estado de implementação

Esta especificação é a direção travada; o código ainda é o sistema anterior. O que muda quando a implementação vier, em ordem de dependência:

| # | Onde | O que muda |
|---|---|---|
| 1 | `src/index.css` | Todos os tokens de cor (papel, documento, três réguas, tinta quente, alerta AA, carimbos) nos dois temas; `--radius` de `0.625rem` para `4px` — **feito** |
| 2 | `src/index.css` | Sidebar deixa de ter paleta própria; `--ring` unificado em Régua Forte — **feito** |
| 3 | `src/app/` (shell) | Moldura `page-frame` em volta da região de conteúdo — **feito** (`PageFrame` no shell envolve o `<Outlet/>`; rodapé do form, botão outline, aba ativa, diálogo e sheet passaram de `bg-background` para `bg-card` para não vazar Papel na folha) |
| 4 | `src/components/vitra/data-table.tsx` | **Grade fechada**: caixa em Régua, malha em Fio entre linhas **e colunas**; cabeçalho 36px em Meta com sublinha forte; marcador de 2px na linha selecionada — **feito** · coluna de numeração opcional; cabeçalho agrupado — pendentes |
| 5 | `src/components/vitra/cadastro-form.tsx` | `<legend>` em Meta; bloco como compartimento fechado com goteira; rodapé com régua forte; ícone Lucide no lugar de glifo emoji — **feito** (`FormBlock` com `<legend>` em Meta nos 9 fieldsets de 5 forms; rodapé do `CadastroForm` com `border-rule-strong`; 🔍 substituído por `Search` do lucide-react) |
| 6 | `src/components/vitra/form-grid.tsx` | Mesma malha da DataTable; faixa de seção para agrupamento de linhas |
| 7 | `src/components/vitra/documento.tsx` | `DocumentoHeader` com número em mono — **feito** (3 telas de documento migradas; tira de totais com rótulos em Meta e `Total` separado por régua forte) · **totais migram de tira separada para as últimas fileiras da grade de itens**, valor sob a coluna de valor — pendente |
| 8 | novo | Componente `Stamp` — **feito** (`stamp.tsx`, 4 tons por propriedade; mapeamento tom → situação continua `[a resolver]`) |
| 9 | `src/components/ui/` | Mensagem de validação de `0.8rem` para `0.75rem` |

Itens 1–3, 5 e 8 implementados, 4 e 7 parciais (tokens nos dois temas, raio de 4px, sidebar sem paleta própria, anel em Régua Forte — contrastes verificados por cálculo WCAG; moldura `page-frame` no shell com superfícies Documento corrigidas; DataTable ledger com grade fechada, cabeçalho Meta 36px, numéricas tabulares e seleção com marcador — faltam coluna de numeração opcional e cabeçalho agrupado; `FormBlock` com `<legend>` em Meta nos 9 fieldsets, rodapé do form com régua forte e ícone Lucide; `DocumentoHeader` com número em mono nas 3 telas e tira de totais com régua forte — falta a migração dos totais para as fileiras da grade; `Stamp` existe). Itens 6 e 9 pendentes. **Não afirmar em nenhum relatório que o sistema "papel funcional" está implementado até que os itens acima existam em código.**

O sidecar `.impeccable/design.json` está **deliberadamente desatualizado** em relação a este arquivo. Ele é gerado a partir do código, e o código ainda é o sistema anterior — regenerá-lo agora reescreveria o sistema antigo por cima da direção nova. Rodar `/impeccable document` só **depois** dos itens 1–9.

## Do's and Don'ts

### Do:
- **Do** pousar toda região de trabalho numa moldura (`page-frame`) sobre Papel.
- **Do** compor telas a partir de `src/components/vitra/` — DataTable, CadastroForm, FormGrid, LookupCombo, blocos. Tela reimplementando tabela ou rodapé é o principal vetor de deriva.
- **Do** usar o rótulo literal da transcrição do SoftLux, incluindo maiúsculas, abreviação e barra invertida (`Valores\Localização do Estoque`).
- **Do** aplicar `tabular-nums` e alinhamento à direita em todo número comparável.
- **Do** usar Meta (mono, caixa alta pequena) em cabeçalho de coluna, código, NCM, CNPJ e número de documento.
- **Do** escolher o peso de régua pelo que ele separa: fio na malha (linhas **e** colunas), régua na caixa, régua forte no corte entre blocos.
- **Do** fechar a grade: célula com parede dos quatro lados, caixa externa mais forte que a malha interna.
- **Do** ancorar o total na coluna de valor da própria grade de itens, não numa tira à parte.
- **Do** acompanhar toda indicação de estado por cor com um segundo sinal (marcador, borda, texto).
- **Do** agrupar campos com `<fieldset>` + `<legend>` — é a forma-assinatura do bloco.
- **Do** dimensionar campo em vãos de `grid-cols-12` com `items-end`.
- **Do** mostrar skeleton de cinco linhas no carregamento de tabela.
- **Do** marcar valores ausentes como `[a resolver]` em vez de preencher com um plausível.

### Don't:
- **Don't** usar branco puro como fundo de página nem cinza puro em lugar nenhum. Papel é tintado; cinza neutro é de aplicativo, não de documento.
- **Don't** introduzir cor fora dos dois empregos (carimbo de situação, destruição/erro). Sem acento de módulo, sem header colorido, sem botão azul.
- **Don't** inventar nome de situação para o carimbo — a enumeração é `[a resolver]`.
- **Don't** clarear `hsl(34 11% 54%)` "no olho": é piso de conformidade de 3:1.
- **Don't** adicionar sombra para separar superfícies coplanares. Régua e tom fazem isso.
- **Don't** usar glifo emoji em controle. Ícone Lucide de 16px.
- **Don't** dar borda ao *input* dentro da célula de grade editável — a malha da grade já é a moldura. (A célula tem parede; o campo dentro dela, não.)
- **Don't** usar zebra. A malha da grade fechada já delimita a célula; faixa alternada por cima é ruído sobre ruído.
- **Don't** deixar bloco de formulário compartilhar parede com o bloco vizinho. Compartimento tem caixa própria e goteira; malha contínua é coisa de grade.
- **Don't** usar mono para nome, descrição, endereço ou valor monetário — mono é para o que se confere.
- **Don't** impor `max-width` a listagem ou formulário.
- **Don't** substituir estado vazio ou de carregamento por spinner centralizado.
- **Don't** desenhar para tela estreita. Desktop é o cenário confirmado.
- **Don't** projetar fluxo que só funcione por atalho de teclado — a interface é por clique, e nenhum atalho customizado é requisito.
- **Don't** animar entrada de tela, usar bounce ou encenar transição.
- **Don't** trazer da inspo a textura envelhecida, a ilustração decorativa, o ornamento ou o baixo contraste. A estética é do papel; a legibilidade é de software.
