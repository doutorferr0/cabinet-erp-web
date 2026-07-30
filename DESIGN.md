---
name: VITRA
description: Sistema visual de um ERP denso, desktop, em PT-BR — bancada de trabalho, não vitrine.
colors:
  surface-paper: "hsl(0 0% 100%)"
  ink: "hsl(222.2 84% 4.9%)"
  graphite: "hsl(222.2 47.4% 11.2%)"
  ink-inverse: "hsl(210 40% 98%)"
  bench-tint: "hsl(210 40% 96.1%)"
  ink-muted: "hsl(215.4 16.3% 46.9%)"
  rule: "hsl(214.3 31.8% 91.4%)"
  alert-red: "hsl(0 84.2% 60.2%)"
  sidebar-surface: "hsl(0 0% 98%)"
  sidebar-ink: "hsl(240 5.3% 26.1%)"
  sidebar-rule: "hsl(220 13% 91%)"
  stray-blue: "hsl(217.2 91.2% 59.8%)"
  surface-night: "hsl(222.2 84% 4.9%)"
  bench-tint-night: "hsl(217.2 32.6% 17.5%)"
  ink-muted-night: "hsl(215 20.2% 65.1%)"
  rule-night: "hsl(217.2 32.6% 17.5%)"
  alert-red-night: "hsl(0 62.8% 30.6%)"
  sidebar-surface-night: "hsl(240 5.9% 10%)"
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
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
components:
  button-primary:
    backgroundColor: "{colors.graphite}"
    textColor: "{colors.ink-inverse}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "hsl(222.2 47.4% 11.2% / 0.9)"
  button-outline:
    backgroundColor: "{colors.surface-paper}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    height: "32px"
    padding: "0 12px"
  button-outline-hover:
    backgroundColor: "{colors.bench-tint}"
  input-field:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "4px 12px"
  table-head-cell:
    textColor: "{colors.ink-muted}"
    typography: "{typography.label}"
    height: "40px"
    padding: "0 8px"
  table-row-selected:
    backgroundColor: "{colors.bench-tint}"
    textColor: "{colors.ink}"
  grid-cell-input:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.numeric}"
    rounded: "{rounded.md}"
    height: "32px"
    padding: "0 8px"
---

# Design System: VITRA

## Overview

**Creative North Star: "A Mesa de Trabalho"**

VITRA não é uma vitrine. É a bancada de quem digita duzentos documentos por dia e precisa que a ferramenta esteja onde a mão espera. O sistema herda a franqueza do SoftLux — tudo à vista, nada escondido atrás de progressive disclosure — sem herdar sua feiura. Densidade aqui não é dívida de design; é requisito. Um vendedor com cliente ao lado, um comprador lançando trinta itens numa ordem, um administrativo abrindo a quinta aba de um cadastro de produto: nenhum deles tem tempo para respiro decorativo.

A superfície é papel de bancada — branco puro, sem textura, sem gradiente. O que estrutura a tela é **linha**, não sombra: borda de 1px, tom levíssimo, `<fieldset>` com `<legend>` reencenando o groupbox do legado. Peso visual pertence ao dado, não ao chrome. Número é tabular por princípio, alinhado à direita, para que colunas de dinheiro se leiam verticalmente sem esforço.

O estado atual do sistema é honesto e incompleto: os tokens são os defaults do shadcn (`new-york`, base `slate`) e **não existe cor de marca**. Isso está registrado abaixo como pendência explícita, não maquiado como escolha. O que já é autoral vive na camada `src/components/vitra/` — a DataTable com barra de ações, o formulário com abas e rodapé fixo, a grade editável, a tira de totais. Essas peças são o sistema; o resto ainda é andaime.

**Key Characteristics:**
- Densidade alta e deliberada: controle de 36px, célula de tabela de 8px, sem espaço morto
- Linha estrutura, sombra não: borda de 1px faz todo o trabalho de separação
- Monocromático por ora — cinza-ardósia, um vermelho de alerta, nenhum acento
- Número sempre tabular, sempre à direita
- Vocabulário do legado é literal e inegociável (rótulo, ordem de campo, título de tela)
- Desktop-only: nenhuma decisão sacrifica largura em nome de tela estreita

## Colors

Paleta monocromática de ardósia fria com um único vermelho reservado a destruição. Não há cor de acento; o sistema comunica hierarquia por peso, tom e posição, nunca por matiz.

### Primary
- **Grafite** (`{colors.graphite}`): a única cor de ação afirmativa. Preenche `Gravar` e mais nada. Escura o bastante para ler como "definitivo", neutra o bastante para não competir com o dado.

### Neutral
- **Papel de Bancada** (`{colors.surface-paper}`): fundo de página, card, popover e diálogo. Branco puro, sem tom — a mesa está limpa.
- **Tinta** (`{colors.ink}`): todo texto de conteúdo e todo dado. Quase-preto azulado, não preto absoluto.
- **Tinta Apagada** (`{colors.ink-muted}`): cabeçalho de coluna, rótulo de total, contagem de registros, texto de estado vazio. Tudo que é moldura do dado, não o dado.
- **Tinta Invertida** (`{colors.ink-inverse}`): texto sobre Grafite.
- **Tinta de Bancada** (`{colors.bench-tint}`): linha selecionada, hover de linha, fundo de botão secundário. É o único "preenchimento" do sistema e serve exclusivamente a estado.
- **Pauta** (`{colors.rule}`): toda borda e todo divisor. O material estrutural do sistema.

### Tertiary
- **Vermelho de Alerta** (`{colors.alert-red}`): exclusivamente ação destrutiva e mensagem de erro de validação. Nunca decorativo, nunca "atenção", nunca badge.

### Sidebar
A barra lateral tem paleta própria, meio tom fora do corpo: **Superfície de Barra** (`{colors.sidebar-surface}`), **Tinta de Barra** (`{colors.sidebar-ink}`), **Pauta de Barra** (`{colors.sidebar-rule}`). O deslocamento é intencional — a navegação é mobília fixa, não conteúdo.

### Modo escuro
Existe e é completo. **Superfície Noturna** (`{colors.surface-night}`) inverte fundo e texto; **Tinta de Bancada Noturna** (`{colors.bench-tint-night}`) faz seleção e hover; **Pauta Noturna** (`{colors.rule-night}`) compartilha o mesmo valor da tinta de bancada — no escuro, borda e preenchimento colapsam num tom só, o que enfraquece a separação de superfície. Tratar como ponto de fragilidade conhecido, não como padrão a replicar.

### Pendências e anomalias
- **Acento de marca: `[a resolver]`.** Não existe cor institucional da Vertz registrada. O slot está vazio de propósito. Nenhum valor deve ser inventado para preenchê-lo — quando a cor chegar, ela entra como Primary e o Grafite recua para neutro forte.
- **Azul Fora de Lugar** (`{colors.stray-blue}`): o anel de foco da sidebar (e o `sidebar-primary` do modo escuro) carrega o azul de fábrica do shadcn, enquanto o anel global é Grafite. É inconsistência herdada do scaffold, não decisão. Corrigir na próxima passada de cor.

### Named Rules
**A Regra do Matiz Único.** Enquanto não houver acento de marca, matiz aparece na interface em exatamente um lugar: destruição e erro. Qualquer outra cor entrando na tela é ruído até que a Regra do Matiz Único seja explicitamente revogada.

**A Regra do Peso Antes da Cor.** Hierarquia se resolve por tamanho, peso e posição — nesta ordem — antes de qualquer consideração cromática. Um total importante é `1.125rem/600 tabular`, não colorido.

## Typography

**Fonte única:** stack de sistema (`ui-sans-serif, system-ui, sans-serif`). Nenhuma família foi declarada nem carregada — o sistema roda no que o SO oferece.

**Character:** neutralidade absoluta por omissão. A tipografia hoje não tem voz; ela apenas entrega texto legível na resolução do usuário. Isso é estado, não doutrina: uma escolha tipográfica deliberada continua em aberto, e a escala abaixo é o que a torna possível sem reescrever tela.

### Hierarquia
- **Display** (700, 1.5rem / 2rem): uma única ocorrência, o título da tela inicial. Praticamente extinto.
- **Headline** (600, 1.25rem / 1.75rem): título de tela, literal da transcrição — `Cadastro de produtos - Banco Principal`. O rótulo mais visível de qualquer página.
- **Title** (600, 1.125rem / 1.75rem): reservado ao valor `Total` da tira de totais. É o único número que ganha corpo.
- **Body** (400, 0.875rem / 1.25rem): a fonte real do sistema. Célula de tabela, valor de campo, texto de apoio. Mais de 90% do texto renderizado vive aqui.
- **Label** (500, 0.875rem / 1.25rem): rótulo de campo, `<legend>` de bloco, cabeçalho de coluna, texto de botão. Mesmo tamanho do corpo, distinto só por peso.
- **Numeric** (400, 0.875rem, `tabular-nums`): dinheiro, quantidade, percentual — em campo, em célula e em total.

### Named Rules
**A Regra da Escala de Dois Degraus.** O corpo do sistema tem exatamente dois tamanhos: `0.875rem` para tudo e `1.25rem` para título de tela. Introduzir um terceiro tamanho no meio dessa faixa exige justificar por que peso não resolveu.

**A Regra do Número Tabular.** Todo dígito que possa ser comparado verticalmente — dinheiro, quantidade, percentual, contagem — usa `tabular-nums` e alinhamento à direita. Sem exceção, inclusive dentro de célula editável.

**Débito conhecido:** mensagens de validação usam `0.8rem`, valor fora da escala, herdado do scaffold do shadcn. Alinhar a `0.75rem` na próxima passada tipográfica.

## Layout

O shell é fixo e de três zonas: barra lateral colapsável (`collapsible="icon"`, variante `inset`) com módulos agrupados por título; header de **56px** com gatilho de colapso à esquerda e seletor de empresa e tema à direita; área de conteúdo com padding de `{spacing.lg}` e pilha vertical de `{spacing.lg}`.

Não há container de largura máxima. Tabela e formulário ocupam a largura disponível inteira — em ERP, coluna cortada é dado perdido, e o cenário confirmado é monitor largo.

**A grade de campos é de 12 colunas.** Todo bloco de formulário é `grid-cols-12` com goteira de `{spacing.md}` e alinhamento **inferior** (`items-end`): rótulos de alturas diferentes não desalinham a fileira de campos. Cada campo declara seu vão em doze avos, o que reproduz a proporção do formulário legado sem medida mágica — um código curto ocupa 2, uma descrição ocupa 6, um endereço ocupa a fileira inteira. É o esqueleto de todas as telas de cadastro e documento; usar largura fixa ou flex ad-hoc dentro de um formulário quebra o alinhamento vertical entre fileiras vizinhas.

O único ponto de quebra real do sistema é **640px**: abaixo dele os vãos de 12 colunas colapsam e os campos empilham em largura total. Isso é rede de segurança do scaffold, não cenário de projeto — o alvo confirmado é desktop. A sidebar troca para gaveta a **768px**, herança do shadcn. Fora disso, a única concessão a largura é `flex-wrap` na barra de ações e na lista de abas.

**Ritmo de espaçamento** (quatro degraus, e só quatro): `{spacing.xs}` cola ícone a texto; `{spacing.sm}` separa controles irmãos numa barra; `{spacing.md}` separa blocos internos de um componente (barra de busca → tabela → paginação); `{spacing.lg}` separa regiões da página (título → tabela).

**Densidade de tabela:** cabeçalho de **40px**, célula com padding de `{spacing.sm}`, linha inteira clicável para seleção. Célula de grade editável desce para **32px** — dentro do formulário, a grade é mais apertada que a listagem, porque compete com o resto do documento por altura.

### Named Rules
**A Regra dos Quatro Degraus.** O espaçamento tem quatro valores: 4, 8, 12 e 16px. Um quinto valor precisa de justificativa estrutural, não estética.

**A Regra da Largura Inteira.** Nenhuma tela ganha `max-width`. Largura desperdiçada é coluna que o usuário terá de rolar horizontalmente para ver.

**A Regra dos Doze Avos.** Campo de formulário mede-se em vãos de uma grade de 12 colunas, nunca em largura fixa nem em flex improvisado. Teste: dois blocos vizinhos com contagens de campo diferentes precisam manter as bordas esquerdas alinhadas.

## Elevation & Depth

**Estado provisório — não é doutrina.** O sistema hoje é quase plano por herança do scaffold, não por decisão: `shadow-xs` sobra em botão outline, `shadow-sm` em input, e nada mais. O usuário confirmou que isso foi acaso.

Na prática o que separa superfície é **borda de 1px em Pauta** mais o deslocamento tonal da sidebar. Funciona no claro. No escuro degrada, porque Pauta Noturna e Tinta de Bancada Noturna são o mesmo valor: painel, grade e rodapé se fundem.

Sombra permanece legítima onde há sobreposição real e temporária — diálogo, popover, dropdown, o `<Command>` do LookupCombo. Aí ela informa que algo está *acima*, não decora.

A hierarquia de profundidade para superfícies aninhadas (página → painel → grade → rodapé fixo) está **em aberto**. Resolver deliberadamente antes de construir as telas de visibilidade, que empilham mais camadas que qualquer cadastro atual.

### Named Rules
**A Regra da Linha Antes da Sombra.** Separação de superfícies coplanares se resolve com borda e tom. Sombra é reservada a elementos que flutuam sobre o documento e desaparecem.

## Shapes

Vocabulário de canto suave e uniforme, derivado de um raio-base de **10px** (`{rounded.lg}`). Na prática quase tudo usa `{rounded.md}`: botão, campo, célula editável, contêiner de tabela, tira de totais. `{rounded.sm}` e `{rounded.xl}` existem na escala mas são raros — a uniformidade é o ponto.

Não há geometria decorativa: nenhum recorte, nenhuma forma orgânica, nenhum ícone-container circular. A única silhueta recorrente é o **retângulo com borda de 1px e canto de 8px**, repetido em três escalas — o campo, o painel e a tira. Reconhecer a família é reconhecer o sistema.

`<fieldset>` com `<legend>` posicionado sobre a borda superior é a forma-assinatura do agrupamento em formulário. É citação direta do groupbox do SoftLux e deve ser preservada: o usuário lê aquele recorte como "isto é um bloco".

## Components

Caráter geral: **sólido e confiável**. Controles têm presença física e estado inequívoco. O sistema erra para o lado de nunca deixar dúvida sobre o que está selecionado, o que está desabilitado e se gravou.

### Buttons
- **Forma:** canto suave (`{rounded.md}`), altura padrão **36px**, altura compacta **32px** para barras de ação densas.
- **Primary:** Grafite sobre Tinta Invertida, `padding: 8px 16px`, peso 500. Existe um por tela: `Gravar`. É o único botão preenchido de qualquer formulário.
- **Outline:** o cavalo de batalha. Fundo de papel, borda em Pauta, hover para Tinta de Bancada. Toda a barra de ações das listagens (`Filtro · Incluir · Alterar · Consul. · Excluir/Cancelar · Imprimir`) é outline compacto.
- **Destructive:** Vermelho de Alerta preenchido. Só exclusão e cancelamento de documento.
- **Ghost:** só dentro de chrome — gatilho de sidebar, alternador de tema.
- **Foco:** anel de 2px em `ring`, sem deslocamento. Visível em fundo claro e escuro.
- **Desabilitado:** opacidade 50% e ponteiro morto. Ações que dependem de seleção (`Alterar`, `Consul.`, `Excluir`) nascem desabilitadas e acendem quando há linha selecionada — esse acendimento é o principal feedback de seleção da listagem.

### Inputs / Fields
- **Estilo:** altura 36px, borda de 1px em Pauta, fundo transparente (herda a superfície), canto `{rounded.md}`, texto em Body.
- **Foco:** anel de 1px em `ring` e supressão do outline nativo.
- **Rótulo:** sempre presente, acima do campo, em Label. Nenhum campo depende de placeholder para se identificar.
- **Erro:** mensagem em Vermelho de Alerta abaixo do campo.
- **Desabilitado:** cursor bloqueado e opacidade 50%.
- **Campos tipados** carregam a conversão na borda, nunca no dado: dinheiro guarda centavos e digita em reais; data guarda ISO e digita no controle nativo; percentual guarda quatro casas implícitas.

### DataTable (componente-assinatura)
A peça mais reutilizada do sistema — oito telas e a janela de busca. Estrutura vertical fixa em três faixas separadas por `{spacing.md}`:

1. **Barra:** campo de busca de 288px com ícone de lupa embutido à esquerda, seguido da barra de ações em botões outline compactos.
2. **Corpo:** contêiner com borda e canto `{rounded.md}`. Cabeçalho de 40px em Tinta Apagada; coluna ordenável é um `<button>` que revela seta ascendente/descendente só quando ativa. Linha inteira é clicável e alterna seleção; linha selecionada recebe Tinta de Bancada. Carregamento mostra cinco linhas de skeleton — nunca spinner, nunca tela vazia. Vazio mostra `Nenhum registro.` centralizado em Tinta Apagada, com 96px de altura.
3. **Rodapé:** contagem de registros à esquerda; seletor de itens por página, `Anterior`, indicador `Página X de Y` e `Próxima` à direita. Tudo em Body/Tinta Apagada.

### CadastroForm (componente-assinatura)
Um único `<form>` por tela, com as abas dentro dele — nunca um form por aba. Rodapé **fixo** (`sticky bottom-0`) com borda superior e fundo opaco: as ações de gravar nunca saem de vista, por mais longa que seja a aba.

O modo consulta é implementado por `<fieldset disabled>` envolvendo todo o conteúdo, o que desativa também botões de busca e de incluir linha nas grades; o rodapé colapsa para um único `Fechar`. É a mesma tela, sem edição — não uma tela de leitura separada.

### FormGrid (componente-assinatura)
Tabela editável dentro do formulário. As células são inputs **sem borda e sem sombra** (`border-0`, `shadow-none`, anel de foco suprimido), de 32px — a moldura é a linha da tabela, não o campo. Numéricos alinham à direita e usam tabular. Cada linha termina com um botão de remover; a inclusão fica acima da grade, em botão outline compacto.

Esse apagamento do campo é o oposto do input de formulário e é intencional: numa grade de trinta linhas, trinta bordas de campo criariam uma malha ilegível.

### DocumentoTotais (componente-assinatura)
Tira horizontal alinhada à direita, com borda, canto `{rounded.md}` e padding de `{spacing.md}`. Pares `rótulo: valor` separados por 24px, rótulo em Tinta Apagada, valor em tabular. `Total` é o único elemento em Title — o degrau de peso é toda a hierarquia de que a tira precisa. Totais são sempre derivados dos itens, nunca campo paralelo.

### Navigation
Sidebar colapsável para modo ícone, agrupada por módulo (`Cadastros`, `Estoque`, `Vendas`, `Compras`) com rótulo de grupo em Tinta Apagada. Item ativo casa por prefixo de rota e recebe Tinta de Bancada. Em modo ícone, cada item expõe tooltip com o rótulo completo. O topo da barra é o seletor de empresa ativa — a troca VERTZ ILUMINAÇÃO / VIA HF é decisão de contexto, não configuração enterrada.

## Do's and Don'ts

### Do:
- **Do** compor telas a partir de `src/components/vitra/` — DataTable, CadastroForm, FormGrid, LookupCombo, blocos. Tela reimplementando tabela ou rodapé é o principal vetor de deriva deste sistema.
- **Do** usar o rótulo literal da transcrição do SoftLux, incluindo maiúsculas, abreviação e barra invertida (`Valores\Localização do Estoque`). O usuário reconhece o sistema pelos termos.
- **Do** aplicar `tabular-nums` e alinhamento à direita em todo número comparável.
- **Do** agrupar campos com `<fieldset>` + `<legend>` em Label — é a forma-assinatura do bloco.
- **Do** dimensionar campo em vãos de `grid-cols-12` com `items-end`, para que fileiras vizinhas alinhem.
- **Do** manter o rodapé de formulário fixo com borda superior e fundo opaco.
- **Do** mostrar skeleton de cinco linhas no carregamento de tabela.
- **Do** marcar valores ausentes como `[a resolver]` em vez de preencher com um plausível.

### Don't:
- **Don't** usar glifo emoji em controle (`✔ Gravar`, `✖ Cancelar`, hoje presentes no rodapé do CadastroForm). Emoji renderiza diferente por SO, ignora peso e cor do texto e quebra alinhamento óptico. Usar ícone Lucide de 16px à esquerda do rótulo. **Corrigir onde já existe.**
- **Don't** introduzir cor de acento antes de a cor institucional da Vertz ser confirmada. O slot está vazio de propósito.
- **Don't** replicar o azul de fábrica do anel de foco da sidebar (`{colors.stray-blue}`) — é resíduo do scaffold, não decisão.
- **Don't** adicionar sombra para separar superfícies coplanares. Borda e tom fazem isso.
- **Don't** dar borda visível a célula de grade editável. A linha da tabela é a moldura.
- **Don't** impor `max-width` a listagem ou formulário.
- **Don't** substituir estado vazio ou de carregamento por spinner centralizado.
- **Don't** desenhar para tela estreita. Desktop é o cenário confirmado; esforço em breakpoint móvel é esforço desviado.
- **Don't** introduzir um terceiro tamanho de texto entre 0.875rem e 1.25rem sem antes provar que peso não resolveu.
