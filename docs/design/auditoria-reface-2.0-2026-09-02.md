# Auditoria de reface 2.0 — todas as telas do Cabinet

> 2026-09-02 · Cowork · base medida: `cabinet-erp-web` @ `75840d3` (dev server local, modo mock) + `DESIGN.md` (1513 linhas) + `src/index.css` (1234 linhas) + transcrição Softlux.
> Direção aprovada pelo user nesta sessão: **híbrido Polaris+Brut**, referências Attio · Linear · Mercury · Stripe · Odoo · Ramp · Geist · Untitled · Airtable/Notion. Fonte de display: **Gambarino**.
> Mockup vivo: `mockup-reface-hibrido-2026-09-02.html`.

## 0. O achado que muda o plano

**Todas as 47 rotas passam por 12 peças.** Não existe "mudar tela por tela" — existe mudar as peças e as telas seguem. Medido em `src/routes` + `src/components`:

| Peça | Arquivo | Quem usa |
|---|---|---|
| Casca (sidebar + appbar + breadcrumb) | `ui/sidebar.tsx` (716 l) · `__root.tsx` · `page-header.tsx` | 100% das rotas autenticadas |
| Tokens | `src/index.css` (1234 l) · `DESIGN.md` | tudo |
| Listagem | `cabinet/tela-de-listagem.tsx` · `cabinet/data-table.tsx` (1372 l) · `listagem/` · `filtros/` | 11 listagens (produtos, clientes, fornecedores, colaboradores, profissionais, OC, pedidos compra, orçamentos, pedidos venda, funis, usuários) |
| Registro | `cabinet/tela-de-documento.tsx` · `cadastro-form.tsx` · `banda-identidade.tsx` · `form-grid.tsx` · `form-block.tsx` · `ficha/` | 9 fichas `$id` |
| Painel/card | `cabinet/painel.tsx` · `secao.tsx` · `blocks.tsx` | dashboard, tarefas, movimentação, relatórios, boletim |
| KPI | `cabinet/numero-heroi.tsx` · `total-box.tsx` | dashboard, tarefas, relatórios, totais de documento |
| Estado | `cabinet/selo.tsx` · `stamp.tsx` · `celula-ativo.tsx` | listagens, fichas, kanban |
| Controles | `ui/button.tsx` · `input.tsx` · `input-group.tsx` · `checkbox.tsx` · `radio-group.tsx` · `tabs.tsx` · `form-controls.tsx` · `lookup-combo.tsx` · `campo-com-busca.tsx` | tudo |
| Ornamento/identidade | `ornamento.tsx` (465 l) · `stipple.tsx` · `marca.tsx` · `modulo-cores.ts` | casca, fichas, 404 |
| Vazio/erro/skeleton | `vazio-com-saida` · `erro-do-servidor` · `tela-nao-capturada` · `modulo-em-construcao` · `ui/skeleton` · `empty` | toda rota |
| Overlays | `ui/dialog` · `alert-dialog` · `sheet` · `popover` · `dropdown-menu` · `command` · `tooltip` · `hover-card` | busca ⌘K, gaveta de notificações, confirmações |
| Quadro | (dentro de `features/tarefas`, `features/crm`, `features/planner`) | tarefas, CRM funil, planner |

Consequência: **o reface 2.0 é 1 PR de tokens + ~10 PRs de peça + 0 PRs de tela** (salvo dashboard/kanban/login, que têm layout próprio). Quem tentar "mudar todas as páginas" tela por tela vai gerar 47 PRs que brigam entre si.

## 1. Diagnóstico do sistema atual (o que a 1.7 entregou e onde ela trava)

Medido nas capturas locais (dashboard, produtos, tarefas, movimentação, CRM, planner, 404) e no `DESIGN.md`:

**O que já está certo e FICA**
- Regra semântica de cor com dono: verde = dinheiro, amarelo = foco, vermelho = erro. Intocável.
- Cor por módulo via `[data-modulo]` → `--modulo-01/02`. O mecanismo fica; os valores mudam (§3).
- Anel de foco amarelo 3px. Fica.
- Densidade "comanda", desktop-only, mono para identificador, número tabular à direita. Fica.
- Modo escuro existe e é medido (`medir-contraste.py`). O mockup é claro-só — **o reface precisa do par escuro medido antes de merge**, não depois.
- Regra de quebra `auto-fit`/`flex-wrap`, nunca `@media`. Fica.
- Vocabulário literal do Softlux. Fica.

**O que trava (problema → causa → correção)**
1. **Contorno 2px preto em TUDO, inclusive entre linhas da grade** (decisão "A UNIÃO", 2026-08-18). Causa: com bancada e folha a 1,10:1 de contraste, o traço era o único delimitador. Efeito: xadrez em qualquer grade > 20 linhas; botão, aba, campo, chip e linha pesam igual → nada tem prioridade. Correção: separar as superfícies (bancada n-100 / folha n-0 = contraste real) e o traço passa a ser gasto: **ink em botão-tecla, painel de página e seleção; hairline n-200 entre linhas; n-300 em borda de controle**.
2. **Ação preta** ("a ação é PRETA, não violeta"). Causa: violeta 1.6 reprovou em contraste. Efeito: primário se confunde com contorno; num dashboard com 6 caixas pretas o olho não acha "Nova tarefa". Correção: **acento único** (indigo `#4B45E8` sobre branco 6,3:1 · ou chartreuse Ramp — decisão pendente do user) gasto só em primário, foco de navegação e link.
3. **Quatro famílias tipográficas** (Newsreader · Sora · Inter · PT Mono) com regra semântica por papel. Efeito: Sora em headline + Newsreader em display + Inter em body = três vozes no mesmo cabeçalho. Correção: **três papéis, três faces**: Gambarino (display: título de página, marca, saudação, número-herói) · Inter (interface) · JetBrains Mono (dado). Sora sai. Newsreader sai. PT Mono sai (JetBrains tem tabular medido e peso 500).
4. **Etiqueta invertida** (rótulo/cabeçalho de coluna = caixa clara com borda + caixa alta + tracking). Efeito: cabeçalho de tabela vira fileira de chips; label de campo compete com o valor. Correção: cabeçalho de coluna = texto n-500 uppercase 10,5px sobre n-50, **sem caixa**, com ícone de tipo (Airtable); label de campo = Inter 500 12px n-700, sem caixa.
5. **Sombra em 5 degraus, neutra-fria, em quase tudo.** Efeito: sem hierarquia (KPI, card, painel, campo, chip todos "flutuam"). Correção: **3 sombras duras de tinta + 1 suave** — `key` (botão), `hard-1` (KPI/card ativo), `hard-2` (painel de página), `hard-3` (modal); `hard-soft` (n-300) pra card quieto; `inset` pra campo. Sombra = assinatura, 1× por tela onde a ação mora.
6. **Ornamento por módulo** (forma colorida recortada por máscara, 465 linhas). Efeito: decorativo, custa manutenção, aparece na 404 e na ficha. Correção: **reduzir a marca + monograma de módulo** (quadradinho de cor 7px nos grupos da sidebar, monograma colorido no fornecedor/cliente). O `ornamento.tsx` vira opcional na 404 e no login; sai da ficha.
7. **Navegação duplicada**: 7 ícones de módulo na appbar + sidebar com os mesmos destinos + "Filtrar telas" no topo da sidebar. Correção (Linear/Attio): **sidebar única** com seletor de empresa no topo, ⌘K, grupos com cor, contadores; appbar vira breadcrumb + ações globais (ajuda, notificações, config, tema).
8. **Motion 1.6** (entrada em mola, hover que pula). Efeito: em grade densa vira ruído; "nada anima na entrada" já era princípio da 1.5 e a 1.6 contradisse. Correção: **entrada sem animação**; hover só em botão (tecla levanta 1px) e card clicável; nunca em linha/célula. `prefers-reduced-motion` respeitado.
9. **Radio button de seleção única na grade**, sem ação em lote. Correção: checkbox + barra de lote (Polaris).
10. **Cabeçalho de página = título + "Incluir"**. Sem resumo. Correção: **page header Polaris** (breadcrumb → título Gambarino + meta → ações: ghost, ícone, primário) + **faixa de até 4 KPIs** (Mercury) nas listagens que têm agregado (OC, pedidos, orçamentos, estoque).
11. **Rodapé de grade** com "Linha: Padrão" + "Por página" + paginação competindo. Correção: contagem + soma do filtro à esquerda; densidade Compacta/Confortável no menu Colunas (Untitled); intervalo + setas à direita.
12. **Abas sem estado**: "Todos" + "Salvar consulta" sem contagem nem cor. Correção: **views** com quadradinho de cor + contagem (Airtable) e chips de filtro ativo com × (Polaris/Attio); agrupamento por campo com subtotal (Notion).

## 2. Famílias de tela — o que muda em cada uma

### 2.1 Casca (todas)
- Sidebar 236px, bancada n-100, borda direita n-300. Topo: marca (mark lilac + "Cabinet" Gambarino 19px) → **seletor de empresa** (tecla, monograma colorido, papel do usuário) → busca ⌘K → grupos com quadradinho de cor → rodapé com avatar. Item ativo: folha + borda ink + `hard-soft` + fundo `tint` do módulo.
- Appbar 56px: breadcrumb (n-500 → último em ink 500) · ajuda · notificações (ponto vermelho) · config · tema. **Os 7 ícones de módulo saem** — o módulo se escolhe na sidebar.
- Módulo-cor: mantém `[data-modulo]`; **`--modulo-02` vira o tint da família** (lilac compras · mint estoque · sky vendas · sand crm · rose danger · etc. — tabela em §3) e **`--modulo-01` só pinta o quadradinho e o monograma**, nunca uma faixa cheia.

### 2.2 Listagem (11 rotas) — `tela-de-listagem` + `data-table`
Já mockado (aba Listagem). Resumo do contrato novo do `DataTable`:
- Cabeçalho: page header Polaris + KPIs opcionais (`resumo?: Kpi[]`, máx 4).
- Views (`visoes`): aba com cor + contagem; "Salvar consulta" vira "+ view".
- Filtro: busca com prefixo (`forn:`, `sit:`), chips ativos, "+ Filtro", "Agrupar por", ordenar, densidade, lista/kanban/calendário (`modos`), "Colunas · n ocultas".
- Grade: checkbox + bulk bar; hairline entre linhas; header n-50 sticky com ícone de tipo; linha 52/40; hover n-50; selecionada `main-soft`; **decoração de linha por estado** (`decoracao: 'warn'|'bad'|'muted'`, Odoo) = faixa lateral 3px + tint; ações no hover.
- Célula: id mono em `--main`; entidade = monograma + nome + subtítulo; data mono; dinheiro `<Money>` (símbolo leve, valor 500, negativo `--bad`); status `<Badge tom>` pílula pastel com ponto; progresso barra 56px + `n / m`.
- Rodapé: `n de N · soma filtrada` · por página · intervalo · setas.
- Vazio: `vazio-com-saida` continua, sem ornamento — ícone de tipo + frase + ação primária.

### 2.3 Registro / ficha (9 rotas) — `tela-de-documento` + `cadastro-form` + `banda-identidade`
Já mockado (aba Formulário, OC). Generaliza pra produto/cliente/fornecedor/colaborador/profissional/orçamento/pedido:
- Cabeçalho do registro: voltar (tecla) · título Gambarino + id mono n-500 · badge de estado + meta (criado por, em) · "salvo há n s" · ações (ghost, secundária, ícone, **primária = próximo estado do fluxo**: "Confirmar recebimento", "Enviar orçamento", "Ativar cadastro").
- **`BandaDeIdentidade` sai**; vira o bloco lateral "Identidade" tintado (monograma grande, nome, documento, cidade, link "ver cadastro").
- Layout 2 colunas (`minmax(0,1fr) 320px`): principal = blocos de dados (`FormBlock`, card quiet folha) + grade de itens (inputs invisíveis até hover, Attio) + totais; lateral = cards tintados por assunto (identidade lilac · andamento/timeline mint · logística sky · financeiro sand).
- Campos: inset, label 12px 500 n-700 sem caixa, ajuda 11,5px n-500, erro `--bad` com texto, obrigatório = `*` vermelho. Read-only = n-50 sem inset.
- Abas do registro (`abas-sem-captura`): abas Polaris (linha inferior 2px ink), não chips.
- `alteracoes-nao-salvas` vira o "salvo há n s" + confirmação ao sair (dialog `hard-3`).

### 2.4 Dashboard (`/dashboard`, `/`) — layout próprio
Hoje: saudação Newsreader + 4 KPIs em caixas pastel com borda preta + calendário + agenda + a-fazer, tudo com borda 2px e sombra.
Muda: saudação Gambarino 28px + data n-500 · **4 KPI tiles** (tint por assunto, borda ink, `hard-1`, número mono 24px, delta pos/neg, sparkline) · abaixo, grid 3 colunas de cards **quiet** (`hard-soft`): Agenda de hoje (lista com hora mono + faixa de cor por tipo), A fazer (checkbox + texto, concluído riscado n-500), Calendário (mês compacto, hoje = quadrado ink, ponto de cor por evento). Nada com borda preta além dos KPIs. Mockado na aba **Dashboard**.

### 2.5 Quadro / kanban (`/tarefas`, `/crm/funil/$id`, `/planner`)
Hoje: colunas com borda 2px colorida por estado, cards com borda preta, chips de prioridade em vermelho/amarelo cheios, avatares.
Muda (Linear/Attio/Notion board): coluna = cabeçalho com quadradinho de cor + nome + contagem + "+"; fundo da coluna n-50 sem borda; card = folha, borda n-300, `hard-soft`, hover levanta pra `hard-1`; **prioridade = pílula pastel** (Alta bad-bg · Média warn-bg · Baixa mut-bg), nunca cheia; data mono; contadores (comentários, anexos) n-500; avatares 20px empilhados. Progresso/carga por responsável (Tarefas) = KPI strip + barras hairline. Mockado na aba **Quadro**.

### 2.6 Movimentação de estoque (`/estoque/movimentacao`)
Hoje: título + campos produto/variante/depósito + botões Entrada/Saída/Ajuste desabilitados + Saldo por depósito + Kardex (vazios).
Muda: page header com KPIs (saldo total, reservado, disponível, último movimento) · campo produto = `campo-com-busca` com resultado inline (⌘K-like) · **Entrada / Saída / Ajuste = segmented control** que abre formulário lateral (`sheet`, `hard-3`) · Saldo por depósito = grid pequena · Kardex = tabela com decoração por tipo (entrada mint · saída rose · ajuste sand) e saldo acumulado mono. Vazio = ícone + "Escolha um produto pra ver saldo e histórico" + campo em foco.

### 2.7 Relatórios (`/estoque/relatorios/*`)
Estrutura = listagem (§2.2) com KPIs no topo obrigatórios + exportar (CSV/PDF) como ação primária ghost + agrupamento padrão (por fornecedor / por depósito) + soma no rodapé. Nada de tela nova.

### 2.8 Agenda (`/agenda`)
Vira a **view Calendário** do `DataTable` (Airtable): semana/mês, evento = pílula tintada por tipo, hoje = quadrado ink. A mesma view serve "Previsão de chegada" (compras) e "Cargas" (vendas).

### 2.9 Config (`/config/*`) — listas, usuários
Usuários = listagem (§2.2) com badge de papel e "último acesso". Listas (`catalog_lookups`) = **tabela editável inline** (Attio/Airtable): célula vira input no clique, linha nova no rodapé, ordem por arrastar. Sem ficha separada.

### 2.10 Autenticação (`/login`, `/esqueci-senha`, `/definir-senha`, `/trocar-senha`)
Hoje: não capturado em claro (autologin redireciona). Proposta: página dividida — esquerda bancada com marca Gambarino grande + uma frase + ornamento (único lugar onde o `ornamento.tsx` fica); direita card folha `hard-2` com campos inset, primário tecla largura total, link "esqueci a senha" em `--main`. Mockado na aba **Login**.

### 2.11 Vazio / erro / 404 / em construção
404 hoje tem ornamento rosa + texto n-500. Muda: ícone de linha (não ornamento), título Gambarino 22px, frase, tecla "Ir para o início". `modulo-em-construcao` = badge "futuro" + frase + link pra memória do que está planejado. Skeleton = blocos n-100 sem animação de brilho (só opacidade).

### 2.12 Overlays
Dialog/AlertDialog/Sheet = folha, borda ink 1,5px, `hard-3`, título Gambarino 20px, ações à direita (ghost + primária tecla). Popover/Dropdown = folha, borda n-300, `hard-soft`. Command (⌘K) = folha, borda ink, `hard-3`, grupos com quadradinho de cor, atalho mono à direita. Tooltip = ink com texto folha, radius 4, sem seta.

## 3. Tokens — o que muda no `index.css` (delta, não reescrita)

Mantém nomes existentes onde há consumidor; acrescenta os novos; **aposenta** os marcados.

```
/* superfícies → escala Geist */
--n-0:#FFFEFA  --n-50:#F6F4EE  --n-100:#ECE9E1  --n-200:#DCD7CB  --n-300:#C9C3B5
--n-400:#A9A395  --n-500:#7E786B  --n-700:#4A463D  --n-900:#16140F
--background:n-100  --card:n-0  --surface-sunken:n-50  --rule-hair:n-200  --input:n-300
--muted-foreground:n-500  --foreground:n-900  --surface-disabled:n-100  --rule-disabled:n-400

/* acento — DECIDIDO: chartreuse (Ramp). Fill, nunca texto. */
--primary:#E4F222  --primary-hover:#D3E00F  --primary-foreground:var(--n-900)  --primary-soft:#F5F9CF
--primary-text:#4F5C00   /* link, id, "salvar consulta" — o único texto com acento */
--indigo:#4B45E8         /* cor de módulo, não acento */
--ring:#FFD23F (fica amarelo) + fio ink 2px por fora quando sobre --primary

/* semântica — pastel de fundo + tinta forte */
--ok:#0E7A4B/--ok-bg:#DDF3E4  --info:#1C5FBF/#DCE8FB  --warn:#9A5B00/#FBEBC4  --bad:#B3261E/#F9DDDA  --mut:#5F5A4E/#ECE8DD
--money:var(--ok)   /* verde continua dono do dinheiro */
--stamp-open→info  --stamp-done→ok  --stamp-void→bad  --stamp-neutral→mut   (aliases, sem quebrar consumidor)

/* tints por assunto — substituem zone-* e passam a ser o --modulo-02 */
--tint-lilac:#EDEBFB  --tint-mint:#E4F3EA  --tint-sky:#E4EDFA  --tint-sand:#FAF0D6  --tint-rose:#FBE3E0
[data-modulo=compras]{--modulo-01:#4B45E8;--modulo-02:var(--tint-lilac)}
[data-modulo=estoque]{--modulo-01:#0E7A4B;--modulo-02:var(--tint-mint)}
[data-modulo=vendas]{--modulo-01:#1C5FBF;--modulo-02:var(--tint-sky)}
[data-modulo=crm]{--modulo-01:#9A5B00;--modulo-02:var(--tint-sand)}
[data-modulo=produtos]{--modulo-01:#0E7A4B;--modulo-02:var(--tint-mint)}
[data-modulo=clientes|fornecedores|profissionais]{--modulo-01:#4B45E8;--modulo-02:var(--tint-lilac)}
[data-modulo=boletim]{--modulo-01:#16140F;--modulo-02:var(--n-50)}

/* raio — mantém a fase 1.5 exceto item */
--radius-panel:10px  --radius-card:8px  --radius-control:6px  --radius-data:4px  --radius-item:4px (era 0)  --radius-pill:999px

/* profundidade — aposenta shadow-1..5 e el1..el5 */
--key-1:0 2px 0 0 var(--n-900)   --key-2:0 3px 0 0 var(--n-900)
--hard-1:2px 2px 0 0 var(--n-900)  --hard-2:4px 4px 0 0 var(--n-900)  --hard-3:6px 6px 0 0 var(--n-900)
--hard-soft:3px 3px 0 0 var(--n-300)
--inset:inset 0 1px 2px rgba(22,20,15,.10)
--shadow-macia: sai

/* tipografia — 3 papéis */
--font-display:"Gambarino",Georgia,serif   (self-host woff2; peso único 400; hierarquia por tamanho 28/24/20/19)
--font-sans:"Inter"   --font-mono:"JetBrains Mono"   --font-nome, --font-display-condensada: saem

/* modo escuro — regra: MESMOS nomes, valores invertidos na escala n-*, tints escurecidos a 18% de luminância,
   badges mantêm tinta forte sobre bg escuro. Medir com medir-contraste.py antes do merge. */
```

## 4. Sequência de PRs (rodada de design = janela exclusiva; rebase de toda branch viva depois)

| # | Zona | Entrega | DoD |
|---|---|---|---|
| D1 | `src/index.css` · `DESIGN.md` · `public/fonts/` | Tokens §3 + @font-face Gambarino/JetBrains + aliases dos nomes antigos | tudo compila; `medir-contraste.py --conferir` verde nos 2 temas; nenhum consumidor quebrado |
| D2 | `ui/button` · `input` · `input-group` · `checkbox` · `radio-group` · `tabs` · `label` · `textarea` | Tecla, inset, abas Polaris, label sem caixa | testes existentes verdes; story visual no `docs/design/` |
| D3 | `cabinet/selo` · `stamp` · `celula-ativo` · novo `badge` · novo `money` | Pílula pastel com ponto; `<Money>` | snapshot nas 11 listagens |
| D4 | `ui/sidebar` · `__root` · `page-header` · `company-switcher` · `search-dialog` | Casca §2.1 (sidebar única, appbar breadcrumb) | 7 ícones removidos; ⌘K funciona; nav ativa medida nos 2 temas |
| D5 | `cabinet/data-table` · `tela-de-listagem` · `listagem/` · `filtros/` | Listagem §2.2 (views, chips, bulk, agrupamento, densidade, decoração, ícone de tipo) | testes `colunas-chegam-na-grade`, `filtro-chega-na-tela` verdes; OC e produtos batem com o mockup |
| D6 | `cabinet/tela-de-documento` · `cadastro-form` · `form-grid` · `form-block` · `ficha/` · `banda-identidade` (remover) | Registro §2.3 | OC bate com o mockup; 9 fichas renderizam |
| D7 | `cabinet/painel` · `secao` · `numero-heroi` · `total-box` · `features/dashboard` | Dashboard §2.4 + KPI tile | dashboard bate com o mockup |
| D8 | `features/tarefas` · `features/crm` · `features/planner` | Quadro §2.5 | tarefas bate com o mockup |
| D9 | `features/estoque` · `features/relatorios` · `features/agenda` | §2.6–2.8 (movimentação, relatórios, view calendário) | — |
| D10 | `features/login` · `features/acesso` · `vazio-com-saida` · `erro-do-servidor` · `tela-nao-capturada` · `modulo-em-construcao` · `ornamento` (reduzir) · overlays | §2.10–2.12 | — |
| D11 | `DESIGN.md` reescrito como "2.0 híbrido"; `direcao-visual-brutalism.md` e amostras 1.5/1.6 viram histórico | doc = código | nenhuma frase do doc contradiz o shipped |

Ordem obrigatória D1 → D2/D3 (paralelo, zonas disjuntas) → D4 → D5/D6 (paralelo) → D7–D10 (paralelo) → D11. **D1 nunca junto com feature.** Cada PR: `pnpm check` · `check-types` · `test` · CI verde · memória só no fechamento da rodada.

## 5. Decisões do user (2026-09-02, fechadas)
1. **Acento = chartreuse `#E4F222`** (Ramp). Regra: é **FILL, nunca texto** — botão primário (tinta preta em cima, 2px ink, tecla), item de nav ativo (`--main-soft` + faixa 3px chartreuse), linha selecionada (`--main-soft` + faixa). Texto/link que precisa do acento usa **`--main-text: #4F5C00`** (oliva, ≥7:1 no papel; medir no escuro). Indigo `#4B45E8` deixa de ser acento e vira **cor de módulo** (compras, cadastros). Amarelo `--ring` de foco continua — chartreuse e amarelo-foco são vizinhos, então o anel de foco ganha **2px de fio ink por fora** pra não sumir sobre botão primário focado.
2. **Ornamento: reduzir.** Fica só em login (fundo da coluna esquerda) e 404. Sai da ficha, da casca e dos vazios. `ornamento.tsx` de 465 linhas → 1 forma parametrizada por módulo (círculos concêntricos com tint + acento), ~60 linhas.
3. **Modo escuro entra em D1.** Escala `--n-*` invertida (n-0 → `#141311`, n-50 `#1B1A17`, n-100 `#22211D`, n-200 `#2E2C27`, n-300 `#3B3932`, n-400 `#5E5B52`, n-500 `#8F8B80`, n-700 `#C9C5BA`, n-900 `#F3F1EA`); tints escurecidos (`lilac #26243D`, `mint #1B2E24`, `sky #1C2739`, `sand #33290F`, `rose #3A1F1D`); badges mantêm tinta forte clareada 1 degrau sobre bg escuro; chartreuse igual nos dois temas (é fill com tinta preta). `medir-contraste.py --conferir` verde nos dois antes do merge.
4. **Sora / Newsreader / PT Mono: apagar** do repo (arquivos em `public/fonts`, `@font-face`, `--font-nome`, `--font-display-condensada`). Entram Gambarino (peso único) + JetBrains Mono (400/500). Inter fica.

## 5a. Rodada 4 — cor tonal, transparência, movimento, claro/escuro (user, 2026-09-02) — entra em D1
Supersede "acento único + 5 tints fixos" do §3. **8 matizes × 6 degraus** (lime · indigo · mint · sky · amber · rose · violet · teal; 50/100 tint · 200 borda · 400 fill · 600 texto claro · 200/400 texto escuro). Módulo = matiz (Hoje lime · Compras indigo · Estoque mint · Vendas sky · CRM amber · Pessoas violet · Relatórios teal); ação primária = lime-400 sempre; semântica nunca muda de matiz. **Clarear/escurecer = degrau da rampa ou `color-mix`** (hover +8%, active −8%, disabled 40% → bancada). **Transparência = `color-mix(in oklab, cor N%, transparent)`**, nunca rgba: badge-bg 18–22%, tint 12% sobre folha, `--glass` 72% + blur em appbar/seletor/header sticky/barra de lote, `--hover` 5%, `--press` 9%, `--scrim` 45%. Nav ativa = **chartreuse** (lime-400 18% + faixa lime-400; decisão user) — matiz do módulo fica só no quadradinho do grupo. **Movimento micro com propósito** (≤320ms, tokens `--ease/--dur-1..3`): rise escalonado nos KPI (única entrada), draw sparkline, fill barra, pulse só no Atrasada, lift em tecla/KPI/card, fade de aba/tema; proibido entrada de tela inteira, hover em linha, parallax, loop decorativo; reduced-motion desliga tudo. **Escuro**: n-* invertida, sombras viram n-300/400, lime igual, acento-texto lime-200, semântica 600→400; alpha dispensa segundo valor. Mockup tem toggle (`d`). Registrado em #469 (comentário) e #498.

## 5b. Marca — forma fixa (user, 2026-09-02)
A marca do Cabinet é **duas casas concêntricas em contorno**: pentágono de telhado reto (ângulo do telhado ≈ 38°) sobre corpo quadrado, a interna centrada e proporcional, sem porta, sem janela, sem preenchimento. **Espessura do traço é livre** (grossa em 16–28px, mais fina em display/login), **a forma não muda**. Arquivo: `marca-cabinet.svg` (vai para `public/marca.svg` em D1; `marca.tsx` passa a renderizá-lo com `stroke-width` por tamanho: 11/9 em ≤28px, 8/6.5 em 40–64px, 6/5 acima). Cor: sempre `--n-900` (ou `--n-0` sobre fundo escuro); nunca chartreuse na forma — o chartreuse fica no quadrado de fundo do mark da sidebar. Proibido: ícone de casa do lucide, casa com porta, versão preenchida.

## 6. Navegação — referências e decisão (pedido do user, rodada 3)

**Modelos medidos no mercado**

| Modelo | Quem | Como funciona | Serve ao Cabinet? |
|---|---|---|---|
| A · Sidebar global colapsável | Shopify admin, Stripe, Ramp, Linear | Uma sidebar com todos os módulos como grupos; só o ativo aberto; sub-itens texto; config no rodapé; ⌘K | **Sim — adotado.** 9 módulos / ~30 destinos cabem; operador de 8 h precisa de posição fixa |
| B · App switcher + sidebar contextual | Odoo 17, **Cabinet hoje** (7 ícones na appbar + sidebar por módulo) | Troca de app troca a sidebar inteira | Não: dois níveis pra um destino, ícones sem rótulo, sem lugar pra favoritos/recentes |
| C · Launchpad / hub de tiles | SAP Fiori, ERPNext workspaces | Página inicial de tiles por espaço; cada módulo tem workspace de atalhos | Só como **rota-índice do módulo** (`/compras`, `/estoque`, `/vendas` viram hub com KPIs + atalhos em vez de redirect) |

**Peças emprestadas**
- Shopify: sub-itens só do grupo ativo; ícone só no primeiro item do grupo.
- Stripe/Ramp: grupos por verbo do negócio; config e desenvolvedor no rodapé.
- Linear/Notion/Attio: bloco pessoal antes dos módulos (**Início · Minhas tarefas · Caixa de entrada**), **Favoritos** = views salvas pinadas (★ no hover de qualquer item), **Recentes** (últimos 3 registros com tempo), workspace switcher no topo, ⌘K com atalho visível.
- ERPNext: hub do módulo na rota-índice.

**O que NÃO entra**: reordenar por arrastar (Notion) · grade de apps (Odoo) · menus horizontais por app (Odoo) · tiles como navegação única (Fiori).

**Estrutura final da sidebar (ordem fixa)**
```
[Marca]  [Empresa ▾ — tecla]  [⌘K]
HOJE        Início · Minhas tarefas (n) · Caixa de entrada (n)
FAVORITOS ▾ views salvas com ★
COMPRAS ▾   Ordens de compra (n) · Pedidos de compra · Previsão de chegada (n) · Fornecedores
ESTOQUE ▾   Movimentação · Produtos (n) · Relatórios (3) · Reserva técnica [futuro]
VENDAS ▸    Orçamentos · Pedidos · Cargas · Clientes · Profissionais
CRM ▸       Oportunidades · Funis · Motivos de perda
PESSOAS ▸   Colaboradores · Usuários
RECENTES    OC-5102 · ORC-2314 · …
──────────
Configurações
[Avatar · nome · e-mail ▾]
```
Consequências no código: `ui/sidebar.tsx` perde o modo "por módulo" e ganha grupos colapsáveis com estado persistido por usuário (localStorage → depois `employees.prefs`); `src/app/modulo.ts` continua definindo cor/rota, mas **não** mais qual sidebar mostrar; os 7 ícones da appbar saem; `search-dialog` (⌘K) ganha grupos com cor e recentes; Favoritos precisam de endpoint (`saved_views` por usuário) — entra como `Proposto` no contrato, MSW até lá. "Cadastros" como grupo morre: cada cadastro mora no módulo que o usa (Fornecedores → Compras, Clientes/Profissionais → Vendas, Colaboradores/Usuários → Pessoas).

Sequência de PRs (§4): D4 absorve tudo isto; D1 acrescenta os tokens do §5.
