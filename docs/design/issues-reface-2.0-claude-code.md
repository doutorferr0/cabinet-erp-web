# Reface 2.0 — 30 issues + 30 prompts para o Claude Code

> 2026-09-02 · Cowork. Fontes de verdade: `mockup-reface-hibrido-2026-09-02.html` (8 abas) e `auditoria-reface-2.0-2026-09-02.md` (§1–§6). Ambos devem ser copiados para `docs/design/` no repo `cabinet-erp-web` na issue D1 — a partir daí toda issue cita o caminho do repo, não a pasta do Cowork.
> **Meta declarada da rodada: mudança MÁXIMA.** Nenhuma issue é "ajuste". Se ao executar você encontrar algo do sistema 1.x que a issue não mandou mudar mas que contradiz o mockup, mude e registre na PR. A dúvida "mudo ou preservo?" se resolve por: **o mockup vence o código, a auditoria vence o DESIGN.md antigo.**

## Regras da rodada (valem para TODAS as issues)

1. **Rodada de design = janela exclusiva.** Enquanto D1–D30 rodam, nenhuma feature entra na `main`. Toda branch viva faz rebase depois de cada merge de design.
2. **PR obrigatória, CI verde, merge serial pelo user.** Nunca commit direto na `main` (deploya automático em cabinetonline.cc).
3. **Zona disjunta** declarada na issue. Precisou sair da zona → parar, registrar blocker na issue, não improvisar. Único dono de `package.json`/lockfile na rodada: **D1**. Qualquer outra issue que precise de dependência → blocker.
4. **Fechamento** de cada sessão: `pnpm check` → `pnpm check-types` → `pnpm test` → commit Conventional (≤50 char, o porquê) → push → PR → `gh run list -L1` verde → escreve NA ISSUE o que mudou de fato, tentativas falhas, decisões. Memória (`projetos-claude`) só no fechamento da onda, pelo user ou pelo Cowork.
5. **Contraste**: mexeu em token de cor → `python3 docs/design/medir-contraste.py --conferir` verde nos DOIS temas antes de abrir PR.
6. **Documentação anda junto**: componente que muda de comportamento → seção correspondente do `DESIGN.md` atualizada na MESMA PR (D30 só consolida).
7. **Proibido**: Prisma/NestJS/JWT no back (não se aplica) · rota fora do contrato · float para dinheiro · `@media` para quebra (usar `auto-fit`/`flex-wrap`) · animação de entrada de tela · cor decorativa em linha de dado · texto em chartreuse.
8. **Ordem de execução** (dependências reais, não calendário):
   - Onda 0 (serial): D1 → D2 → D3
   - Onda 1 (paralelo, zonas disjuntas): D4 · D5 · D6 · D7
   - Onda 2 (serial D8 → D9 → D10; depois paralelo D11 · D12 · D13; depois D14)
   - Onda 3 (serial D15 → D16; paralelo D17 · D18; depois D19)
   - Onda 4 (paralelo): D20 · D21 → D22 · D23 · D24 · D25 · D26 · D27 · D28 · D29
   - Fechamento: D30

9. **Hierarquia tipográfica e separação são a prioridade nº 1 da rodada (pedido do user).** Toda PR de D1 a D30 é revisada primeiro por isso: um leitor tem que distinguir, sem ler, o que é título, o que é dado, o que é rótulo e o que é ação — e onde um bloco acaba e outro começa. A régua abaixo é lei; DoD de toda issue inclui "conforme §Hierarquia".

## §Hierarquia — régua tipográfica e de separação (vale para todas as issues)

### Escala de tipo — 4 papéis, 11 degraus, nada fora deles
Tokens em D1 (`--t-*`), consumidos por classe utilitária ou componente. **Proibido `font-size` literal em componente.**

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
- **Um Gambarino por tela**, no máximo dois (página + registro nunca coexistem; dialog conta como tela própria). Gambarino nunca abaixo de 20px, nunca em botão, nunca em tabela.
- **Peso não é hierarquia em Gambarino** (peso único). Hierarquia entre Gambarinos = tamanho. Hierarquia dentro de Inter = peso (600 > 500 > 400) e cor (n-900 > n-700 > n-500), **nunca tamanho** entre 12 e 13.5.
- **Mono = dado, sem exceção.** Se está em mono, é algo que se copia, compara ou soma. Texto corrido nunca em mono; dado nunca em Inter.
- **Uppercase só em `--t-rotulo`**, e `--t-rotulo` nunca tem caixa/borda/fundo próprio.
- Cor de texto tem 3 degraus (n-900, n-700, n-500) + 2 semânticos (`--primary-text`, `--bad`). n-400 só para disabled/placeholder. **Nada de texto em chartreuse.**
- Contraste mínimo 4.5:1 para `--t-meta` e `--t-dado-meta` nos dois temas (é onde o 1.x reprovava).
- Largura de leitura: texto corrido ≤ 70ch; célula com texto longo trunca com `…` + tooltip, nunca quebra em 3 linhas.

### Separação — 4 ferramentas, uma por fronteira
Ordem de preferência (mais barato → mais caro). **Usar a mais barata que resolve; nunca duas na mesma fronteira.**

1. **Espaço** (escala `--s-1…--s-6` = 4 · 8 · 12 · 16 · 24 · 32): separa itens do mesmo tipo (linhas de kv, campos numa grade, chips). Regra: irmãos = `gap`, nunca `margin` por elemento.
2. **Hairline** (`1px n-200`): separa itens de uma lista/tabela e header de corpo dentro de um card. Nunca duas hairlines encostadas; nunca hairline + fundo diferente na mesma fronteira.
3. **Tint** (`n-50` ou `--tint-*`): separa região por natureza (header de tabela, rodapé de totais, linha de grupo, card lateral por assunto). Tint nunca dentro de tint.
4. **Card** (borda n-300 + `--hard-soft`, ou n-900 + `--hard-1/2`): separa objeto do plano. **Máximo 2 níveis de card aninhados** (página › card › nunca um terceiro). Dentro de um card, só espaço, hairline e tint.

Regras:
- **Uma sombra dura de tinta por tela** (`--hard-1/2` em KPI e painel de página), o resto é `--hard-soft` ou nada. Tecla (`--key`) só em botão.
- Fronteira entre regiões da página (header › KPIs › painel) = espaço `--s-5` (24), sem linha.
- Fronteira entre colunas (principal › lateral) = espaço `--s-4` (16), sem linha.
- Fronteira sidebar › conteúdo = **uma** hairline n-300 (a única linha vertical da tela).
- Tabela: hairline entre linhas; **sem** linhas verticais; header separado por tint n-50 (não por borda).
- Formulário: campos separados por espaço (12/16); blocos por card quiet; seções dentro do bloco por hairline + `--s-4`.
- Padding interno padrão: card 16/18 · célula 0 12 · botão 0 13 · chip 0 9.
- **Toda PR anexa um screenshot com overlay de 8px** (`docs/design/grid.css`, ativável por `?grid`) provando alinhamento em múltiplos de 4.

### Como isso entra nas issues
- **D1** cria `--t-*` e `--s-*` e o `?grid` overlay; entrega `docs/design/hierarquia.html` (uma página com os 11 degraus e as 4 separações lado a lado, nos dois temas).
- **D2/D3/D5/D8/D15/D16** só podem consumir `--t-*`/`--s-*`; reviewer rejeita `font-size:`/`text-[`/`p-[` literal.
- **D14/D19/D20–D29**: capturas com `?grid` no DoD.
- **D30**: `grep -rn "font-size\|text-\[\|leading-\[" src` = 0 fora de `index.css`; a seção Tipografia + Separação do DESIGN.md 2.0 é esta régua, copiada, não parafraseada.

Formato do prompt de sessão (CLAUDE.md do repo já manda ler a memória):
```
Leia a memória e execute a issue #<n> (D<k>) do cabinet-erp-web. Zona e DoD estão na issue. Mockup e auditoria em docs/design/. Meta da rodada: mudança máxima — mockup vence código. Fechamento completo antes de encerrar.
```
Abaixo, cada issue traz título, zona, meta, especificação, DoD, fontes, dependências e o **prompt completo** já com o contexto que o Claude Code precisa além da linha padrão.

---

## ONDA 0 — Fundação

### D1 · Tokens 2.0, fontes e modo escuro
**Título:** `design(2.0): tokens híbridos, Gambarino/JetBrains, escala n-*, escuro medido`
**Zona:** `src/index.css` · `public/fonts/**` · `docs/design/**` · `DESIGN.md` (só o front-matter e uma nota "2.0 em andamento") · `package.json`/lockfile (único dono na rodada).
**Meta:** o app inteiro muda de aparência só com esta PR, sem tocar em componente: papel quente n-*, acento chartreuse, sombras duras, fontes novas. Tudo que consumia token antigo continua compilando via alias.
**Especificação:**
- Copiar `mockup-reface-hibrido-2026-09-02.html` e `auditoria-reface-2.0-2026-09-02.md` para `docs/design/`.
- Escala de neutros `--n-0…--n-900` (valores em auditoria §3) e **aliases** dos nomes antigos (`--background`, `--card`, `--surface-sunken`, `--rule-hair`, `--input`, `--muted-foreground`, `--foreground`, `--surface-disabled`, `--rule-disabled`) apontando para a escala. Nenhum consumidor quebra.
- Acento: `--primary:#E4F222` · `--primary-hover:#D3E00F` · `--primary-foreground:var(--n-900)` · `--primary-soft:#F5F9CF` · `--primary-text:#4F5C00`. `--indigo:#4B45E8` vira cor de módulo. `--ring` continua `#FFD23F`; acrescentar `--ring-outline: 0 0 0 2px var(--n-900), 0 0 0 5px var(--ring)` para foco sobre primário.
- Semântica: `--ok/--ok-bg`, `--info`, `--warn`, `--bad`, `--mut` + aliases `--stamp-open→info`, `--stamp-done→ok`, `--stamp-void→bad`, `--stamp-neutral→mut`, `--money→ok`.
- Tints: `--tint-lilac/mint/sky/sand/rose`; `[data-modulo=…]` remapeado conforme auditoria §3 (`--modulo-02` = tint, `--modulo-01` = cor sólida do módulo). `--zone-*` viram aliases de tint (apagar em D30).
- Raio: `--radius-item: 4px` (era 0) · `--radius-data: 4px` · `--radius-pill: 999px`; demais mantidos.
- Profundidade: `--key-1`, `--key-2`, `--hard-1/2/3`, `--hard-soft`, `--inset`. `--shadow-1..5` e `--shadow-el1..5` viram aliases (`el1→hard-soft`, `el2→hard-1`, `el3→hard-2`, `el4/el5→hard-3`). `--shadow-macia` → alias de `--hard-soft`.
- Fontes: baixar **Gambarino Regular** (Fontshare/ITF, licença gratuita web) e **JetBrains Mono 400/500** como `.woff2` em `public/fonts/`; `@font-face` com `font-display: swap`; `--font-display:"Gambarino"` · `--font-mono:"JetBrains Mono"` · `--font-sans:"Inter"` (fica). **Apagar** Sora, Newsreader, PT Mono (arquivos + `@font-face` + `--font-nome` + `--font-display-condensada`, que viram alias de `--font-display` até D30).
- Modo escuro no MESMO commit: `.dark` redefine `--n-*` (valores em auditoria §5.3), tints escuros, badges com tinta clareada 1 degrau; chartreuse igual nos dois temas.
- `docs/design/medir-contraste.py`: incluir os pares novos (badge/bg, primary-text/n-0, primary-foreground/primary, texto/tint) e rodar `--conferir`.
- `DESIGN.md`: só o front-matter (colors/typography/rounded/effects) reescrito com os valores 2.0 + nota no topo: "2.0 em execução, D1–D30; o corpo abaixo é 1.7 até D30".
- **§Hierarquia**: tokens `--t-display…--t-dado-meta` (11) como utilities (`@utility t-pagina{…}`) e `--s-1…--s-6`; `docs/design/grid.css` + parâmetro `?grid` no `__root` (dev only) que sobrepõe grade de 8px; `docs/design/hierarquia.html` com os 11 degraus e as 4 separações, nos dois temas.
**DoD:** app sobe nos dois temas com a cara nova sem erro de console; `hierarquia.html` aprovado por screenshot na PR; `pnpm check`/`check-types`/`test` verdes; `medir-contraste.py --conferir` verde nos dois temas; nenhum `font-family` literal antigo sobrando (`grep -r "Sora\|Newsreader\|PT Mono" src` = 0); screenshot claro/escuro de `/compras/ordens` e `/dashboard` anexado na PR.
**Fontes:** auditoria §3 e §5; mockup aba Tokens.
**Depende de:** nada. **Bloqueia:** tudo.
**Prompt:**
```
Leia a memória e execute a issue #__ (D1). Você é o ÚNICO dono de package.json/lockfile nesta rodada. Meta: o app muda de cara só com tokens — escala n-*, chartreuse como fill, sombras duras, Gambarino + JetBrains Mono, modo escuro medido. PRIORIDADE: a régua §Hierarquia (11 degraus de tipo --t-*, 6 de espaço --s-*, overlay ?grid, hierarquia.html nos dois temas) — é o que o user mais quer ver. Aliases para os nomes antigos: nada pode quebrar. Apague Sora/Newsreader/PT Mono. Rode medir-contraste.py --conferir nos dois temas. Anexe screenshots claro/escuro na PR. Conformidade com §Hierarquia (só --t-*/--s-*, uma ferramenta de separação por fronteira, captura com ?grid). Fechamento completo.
```

### D2 · Controles: tecla, inset, abas, label sem caixa
**Título:** `design(2.0): button vira tecla, campo rebaixado, abas Polaris, label sem caixa`
**Zona:** `src/components/ui/button.tsx` · `input.tsx` · `input-group.tsx` · `textarea.tsx` · `checkbox.tsx` · `radio-group.tsx` · `tabs.tsx` · `label.tsx` · `separator.tsx` · `desabilitado.test.tsx` · `src/components/cabinet/form-controls.tsx` · `filtro-controles.tsx` · testes desses arquivos.
**Meta:** todo botão, campo, aba e rótulo do app muda nesta PR. Zero borda 2px preta em controle secundário; profundidade vem da tecla e do inset.
**Especificação (mockup: Tokens › Profundidade; Formulário):**
- `Button`: variantes `primary` (bg `--primary`, texto n-900, borda 1.5px n-900, `--key-2`; hover levanta 1px e sombra 4px; active afunda 3px sem sombra), `secondary` (folha, borda 1.5px n-900, `--key-1`), `ghost` (sem borda, hover n-100), `icon` (34×34, borda n-300, `--hard-soft`), `danger` (bg `--bad-bg`, texto `--bad`, borda `--bad`). Tamanhos `sm` 28px / `md` 34px / `lg` 40px. Ícone lucide 15px. `disabled`: n-400 texto, sem sombra, sem transform. Focus: `--ring-outline`.
- `Input`/`Textarea`/`InputGroup`: altura 34, borda 1px n-300, radius control, `--inset`, foco = borda n-900 + `--ring`; `readOnly` = n-50 sem inset; `aria-invalid` = borda `--bad`; prefixo/sufixo em mono n-500; variante `numeric` (mono tabular, alinhado à direita).
- `Checkbox`: 15px, radius 4, marcado = n-900 com check branco; indeterminado. `RadioGroup`: só onde há escolha exclusiva de fato — **sai da grade** (D8).
- `Tabs`: linha inferior 2px n-900 no ativo, texto n-500 → n-900, contagem opcional em chip mono; nunca chip com borda.
- `Label`: Inter 500 12px n-700, obrigatório = `*` em `--bad`, hint em n-500; **sem caixa, sem uppercase, sem mono**.
- Segmented control novo (`ui/segmented.tsx`): grupo com borda n-300, item ativo n-900/branco (usado em Lista/Kanban/Calendário, Compacta/Confortável, Entrada/Saída/Ajuste).
**DoD:** testes existentes verdes (ajustar snapshots com justificativa); `desabilitado.test` cobre tecla sem sombra; story/página `docs/design/controles.html` ou rota `/design/controles` (dev only) mostrando todas as variantes nos dois temas; screenshot na PR.
**Fontes:** mockup Tokens/Formulário; auditoria §1.1, §1.4, §1.5; Polaris Button/TextField; Untitled UI inputs.
**Depende de:** D1.
**Prompt:**
```
Leia a memória e execute a issue #__ (D2). Todo botão vira tecla (borda ink + sombra inferior, afunda no clique), campo ganha inset, aba vira linha inferior, label perde a caixa. Crie ui/segmented.tsx. Nenhum controle secundário com borda 2px preta sobra. Mockup em docs/design/. Conformidade com §Hierarquia (só --t-*/--s-*, uma ferramenta de separação por fronteira, captura com ?grid). Fechamento completo.
```

### D3 · Badge, Money, Selo/Stamp/CelulaAtivo
**Título:** `design(2.0): Badge pastel com ponto, Money com símbolo leve, stamps viram alias`
**Zona:** `src/components/cabinet/selo.tsx` · `stamp.tsx` · `celula-ativo.tsx` · novos `badge.tsx` · `money.tsx` · `monograma.tsx` · testes.
**Meta:** todo estado e todo valor monetário do app passam por dois componentes novos. Nenhum "ATIVO" verde cheio, nenhum stamp com borda, nenhum `R$` no mesmo peso do número.
**Especificação (mockup: Listagem, Tokens › Dinheiro):**
- `<Badge tom="ok|info|warn|bad|mut|outline">`: pílula 22px, bg `--tom-bg`, texto `--tom` 600 11.5px, ponto 6px antes, sombra `0 1px 0 rgba(ink,.18)`. `outline` = tracejado n-300, texto n-500, sem ponto (Rascunho).
- `<Money valor centavos?>`: mono tabular 500 n-900, `<small>R$</small>` 400 n-500, negativo em `--bad` sem sinal solto, `riscado` para cancelado, `centavos="leve"` para KPI. Sempre alinhado à direita quando em célula.
- `<Monograma nome cor?>`: 26px radius 6, 2 letras mono 500, bg = tint do módulo ou hash do nome nas 5 tints.
- `Selo`, `Stamp`, `CelulaAtivo` reimplementados sobre `Badge` (mapeamento: ativo→ok "Ativo", inativo→mut "Inativo", open→info, done→ok, void→bad). Exportações antigas mantidas como alias até D30.
**DoD:** testes de mapeamento; `grep -r "text-white" src/components/cabinet/selo.tsx stamp.tsx` = 0; página de controles (D2) ganha seção Badge/Money/Monograma.
**Fontes:** mockup Listagem/Tokens; Attio status pills; Ramp money typography.
**Depende de:** D1. **Paralelo a:** D2 (zonas disjuntas).
**Prompt:**
```
Leia a memória e execute a issue #__ (D3). Crie Badge (pílula pastel com ponto), Money (R$ leve, valor 500, negativo vermelho) e Monograma. Reimplemente Selo/Stamp/CelulaAtivo por cima, mantendo exports como alias. Nada cheio, nada com borda. Conformidade com §Hierarquia (só --t-*/--s-*, uma ferramenta de separação por fronteira, captura com ?grid). Fechamento completo.
```

---

## ONDA 1 — Casca

### D4 · Sidebar 2.0 — única, colapsável, pessoal
**Título:** `design(2.0): sidebar única com Hoje/Favoritos/módulos colapsáveis/Recentes; appbar perde os 7 ícones`
**Zona:** `src/components/ui/sidebar.tsx` · `src/app/modulo.ts` (só a parte "qual sidebar mostrar") · `src/routes/__root.tsx` (só o slot da sidebar) · `src/app/nav/**` (criar) · testes.
**Meta:** a navegação inteira muda. Modelo A da auditoria §6 (Shopify/Stripe/Ramp/Linear). O modelo atual (7 ícones + sidebar por módulo) é removido, não escondido.
**Especificação (mockup: Listagem › sidebar; auditoria §6):**
- Largura 236, bancada n-100, borda direita n-300. Topo: marca (mark chartreuse + "Cabinet" Gambarino 19px + versão mono) → slot do `CompanySwitcher` (D6) → slot do ⌘K (D6).
- Grupos, ordem FIXA: HOJE (Início · Minhas tarefas (n) · Caixa de entrada (n)) · FAVORITOS (D13; até lá, vazio oculto) · COMPRAS · ESTOQUE · VENDAS · CRM · PESSOAS · RECENTES · [rodapé] Configurações · avatar/nome/e-mail.
- Grupo = título uppercase 10.5px n-500 + quadradinho 7px na cor do módulo + chevron; colapsável; **só o grupo da rota ativa abre por padrão**; estado por usuário em `localStorage` (`cabinet.nav.grupos`). Sub-itens texto 13px, ícone lucide 16px só no primeiro item. Contadores mono n-500 à direita (fonte: hook `useContadoresNav()` — MSW até endpoint existir, marcado `Proposto` no contrato em D11). Item "futuro" em n-400 com etiqueta.
- Item ativo: folha, borda 1px n-900, `--hard-soft`, bg `--primary-soft`, faixa 3px chartreuse à esquerda. Hover: n-100 8%.
- ★ no hover de qualquer item (D13 liga ao endpoint; aqui só visual + localStorage).
- Recentes: últimos 3 registros abertos (`localStorage`, id + rótulo + tempo relativo).
- Colapso total da sidebar (ícone-só, 56px) com tooltip — atalho `[`.
- **Remover**: modo "sidebar por módulo", "Filtrar telas", os 7 ícones da appbar (o slot fica vazio para D5), `mode-toggle` daqui (vai pra appbar em D5).
- Mapeamento de rotas → grupo: Fornecedores→COMPRAS, Clientes/Profissionais→VENDAS, Colaboradores/Usuários→PESSOAS, Relatórios de estoque→ESTOQUE, Agenda/Planner/Boletim→HOJE. `/cadastros` como grupo deixa de existir; rotas continuam (redirecionam).
**DoD:** todas as 47 rotas alcançáveis pela sidebar nova (teste que percorre `routeTree` e confere que cada rota autenticada tem item ou pai); nav ativa medida nos dois temas (a pior reprovação histórica do repo era aqui — anexar números); `grep -r "Filtrar telas" src` = 0; screenshot claro/escuro colapsada/aberta.
**Fontes:** mockup Listagem/Dashboard/Quadro sidebars; auditoria §2.1 e §6; Shopify admin nav; Linear sidebar.
**Depende de:** D1, D2 (tecla no seletor). **Paralelo a:** D5, D6, D7.
**Prompt:**
```
Leia a memória e execute a issue #__ (D4). Substitua a navegação inteira: sidebar única com grupos colapsáveis por módulo (ordem fixa: HOJE, FAVORITOS, COMPRAS, ESTOQUE, VENDAS, CRM, PESSOAS, RECENTES, Config no rodapé), item ativo chartreuse-soft com faixa, estado por usuário em localStorage, colapso a 56px. Remova os 7 ícones da appbar e o modo "sidebar por módulo". Teste que TODAS as rotas são alcançáveis. Meça contraste da nav ativa nos dois temas. Conformidade com §Hierarquia (só --t-*/--s-*, uma ferramenta de separação por fronteira, captura com ?grid). Fechamento completo.
```

### D5 · Appbar + PageHeader Polaris
**Título:** `design(2.0): appbar vira breadcrumb + ações globais; page header com título Gambarino, meta e ações`
**Zona:** `src/components/cabinet/page-header.tsx` · `botao-voltar.tsx` · `src/components/ui/breadcrumb.tsx` · `src/app/appbar/**` (criar; o `__root.tsx` só troca o import) · `mode-toggle.tsx` · `regiao-de-avisos.tsx` · testes.
**Meta:** o topo de toda tela muda. Appbar de 56px só com breadcrumb à esquerda e 4 ações à direita; título da página desce para o conteúdo em Gambarino 28px com subtítulo e ações à direita.
**Especificação (mockup: todas as abas de tela):**
- Appbar: bancada n-100, borda inferior n-300, sticky. Esquerda: breadcrumb (n-500, separador `/`, último em n-900 500). Direita: Ajuda · Notificações (ponto `--bad`, abre `/inbox` — D7) · Configurações · Tema. Nada mais.
- `PageHeader`: `titulo` (Gambarino 28px, `text-wrap: balance`), `subtitulo` (12.5px n-500 — "14 ordens · 3 fornecedores…"), `acoes` (array: ghost · icon "···" · primary), `voltar?` (tecla 32px). Variante `registro` (D15) com id mono e badge.
- `RegiaoDeAvisos`: faixa abaixo da appbar, tint `--warn-bg`/`--bad-bg`, texto forte, ação à direita, sem borda preta.
- Remover barra "Estoque / Ordem de Compra" com botão de colapso da sidebar dentro do conteúdo (o colapso mora na sidebar, D4).
**DoD:** todas as rotas usam `PageHeader` (teste); breadcrumb gerado da rota; nenhum título fora do `PageHeader` (`grep -rn "<h1" src/routes src/features` só via componente).
**Fontes:** mockup; Polaris Page; Stripe record header.
**Depende de:** D1, D2. **Paralelo a:** D4, D6, D7.
**Prompt:**
```
Leia a memória e execute a issue #__ (D5). Appbar vira breadcrumb + 4 ações globais. Novo PageHeader (título Gambarino 28px, subtítulo, ações ghost/icon/primária, voltar em tecla) usado por TODAS as rotas — teste isso. Remova a barra de título antiga com botão de colapso. Conformidade com §Hierarquia (só --t-*/--s-*, uma ferramenta de separação por fronteira, captura com ?grid). Fechamento completo.
```

### D6 · CompanySwitcher tecla + ⌘K com grupos, cor e recentes
**Título:** `design(2.0): seletor de empresa como tecla na sidebar; ⌘K com grupos por módulo, recentes e atalhos`
**Zona:** `src/components/cabinet/company-switcher.tsx` · `search-dialog.tsx` · `src/components/ui/command.tsx` · `popover.tsx` · `dropdown-menu.tsx` · testes.
**Meta:** o seletor de empresa sai da appbar e vira a segunda coisa da sidebar; a busca global vira o caminho principal do usuário avançado.
**Especificação:**
- `CompanySwitcher`: tecla (`--key-1`, borda 1.5px n-900), monograma chartreuse com tinta preta, nome 600 12.5px, papel + "n empresas" 11px n-500, chevron. Popover: lista de empresas com monograma, atual marcada, "Gerenciar empresas" no rodapé. Sem cor de tenant além do monograma.
- ⌘K (`command.tsx`): folha, borda 1.5px n-900, `--hard-3`, radius panel; input 40px sem borda; grupos = módulos com quadradinho de cor + Recentes + Ações ("Nova ordem de compra", "Nova tarefa"); item = ícone 16 + rótulo + caminho n-500 + atalho mono à direita; navegação por setas; `esc` fecha. Atalhos globais: `⌘K` busca · `g c` compras · `g e` estoque · `g v` vendas · `n` novo registro na listagem atual.
- `Popover`/`DropdownMenu`: folha, borda n-300, `--hard-soft`, radius card, item 32px, separador n-200, item destrutivo em `--bad`.
**DoD:** ⌘K abre em qualquer rota e navega; atalhos `g x` testados; switcher troca tenant e sidebar atualiza contadores; screenshot.
**Fontes:** mockup sidebar; Linear ⌘K; Attio workspace switcher.
**Depende de:** D1, D2. **Paralelo a:** D4, D5, D7.
**Prompt:**
```
Leia a memória e execute a issue #__ (D6). CompanySwitcher vira tecla na sidebar (slot do D4; se D4 ainda não mergeou, exporte o componente e deixe o slot antigo). ⌘K ganha grupos por módulo com cor, recentes, ações e atalhos g+letra. Popover/Dropdown com hard-soft. Conformidade com §Hierarquia (só --t-*/--s-*, uma ferramenta de separação por fronteira, captura com ?grid). Fechamento completo.
```

### D7 · Caixa de entrada substitui a gaveta de notificações
**Título:** `design(2.0): /inbox como rota de lista; gaveta de notificações removida`
**Zona:** `src/app/gaveta-notificacoes.tsx` (remover) · `src/routes/inbox.tsx` (criar) · `src/features/inbox/**` (criar) · `src/components/ui/sheet.tsx`.
**Meta:** notificação deixa de ser sino com gaveta e vira lista de trabalho (Linear Inbox): item = quem, o quê, registro, tempo; lida/não lida; ação inline.
**Especificação (mockup: Dashboard › Atividade):** lista com monograma, texto com link mono para o registro, tempo mono n-500, não lida = ponto chartreuse + bg `--primary-soft`; filtros "Não lidas / Menções / Tudo" como views; "Marcar tudo como lido". `Sheet` reestilizado (folha, borda n-900, `--hard-3`) e mantido para D24.
**DoD:** rota `/inbox` no grupo HOJE; sino da appbar navega para ela; gaveta apagada; MSW com 8 itens.
**Depende de:** D1, D2, D3. **Paralelo a:** D4–D6.
**Prompt:**
```
Leia a memória e execute a issue #__ (D7). Apague a gaveta de notificações; crie /inbox como lista de trabalho (Linear Inbox) com views Não lidas/Menções/Tudo. Reestilize Sheet (folha, borda ink, hard-3) sem apagá-lo. Conformidade com §Hierarquia (só --t-*/--s-*, uma ferramenta de separação por fronteira, captura com ?grid). Fechamento completo.
```

---

## ONDA 2 — Listagem

### D8 · DataTable core 2.0
**Título:** `design(2.0): DataTable com hairline, header sticky com ícone de tipo, checkbox + barra de lote, densidade`
**Zona:** `src/components/cabinet/data-table.tsx` · `index-table.test.tsx` · `src/components/ui/table.tsx` · `src/components/cabinet/listagem/**` (parte grade).
**Meta:** a grade inteira muda: some a borda 2px entre linhas, some o radio, entra seleção múltipla com lote, entram 52/40px, ícone de tipo, ações no hover. É a maior PR da rodada — não dividir por tela, dividir por comportamento (esta = grade; D9 = filtros; D10 = grupos/decoração).
**Especificação (mockup: Listagem):**
- Header: n-50 sticky, uppercase 10.5px 600 n-500, `<IconeDeTipo>` 12px n-400 (hash · pessoa · data · seleção · lista · cifrão · texto), sort com seta; sem caixa por célula.
- Linha: 52px (`densidade="confortavel"`) / 40px (`"compacta"`); hairline n-200; hover n-50; selecionada `--primary-soft` + faixa 3px chartreuse; concluída/cancelada = classe `muted` (texto n-500). Coluna 0 = checkbox (header = selecionar página); `RadioGroup` removido da grade.
- Célula tipada via `coluna.tipo`: `id` (mono `--primary-text`), `entidade` (Monograma + nome 500 + subtítulo 11px n-500; compacta esconde subtítulo), `data` (mono), `dinheiro` (`<Money>`, direita), `status` (`<Badge>`), `progresso` (barra 56px + `n / m`), `texto`.
- Barra de lote: aparece com ≥1 selecionada, n-900 com texto folha, `n selecionadas`, ações passadas pela tela (`acoesDeLote`), `esc` limpa.
- Ações de linha (`acoesDeLinha`): 3 botões 26px que aparecem no hover/focus da linha (abrir, imprimir, ···).
- Rodapé: `n de N · soma filtrada` (Money) à esquerda; por página · `1–n de N` · setas à direita. "Linha: Padrão" some; densidade vai pro menu Colunas (D9).
- Vazio: `vazio-com-saida` sem ornamento.
**DoD:** `index-table.test`, `colunas-chegam-na-grade.test`, `filtro-chega-na-tela.test` verdes; teste de seleção múltipla + lote; teste de densidade; nenhuma linha com borda 2px (`grep -n "border-2" data-table.tsx` = 0); screenshot OC nos dois temas.
**Fontes:** mockup Listagem; Polaris IndexTable; Attio table; Untitled UI row heights.
**Depende de:** D1–D3. **Bloqueia:** D9, D10, D14.
**Prompt:**
```
Leia a memória e execute a issue #__ (D8). DataTable core: hairline entre linhas, header n-50 sticky com ícone de tipo, checkbox + barra de lote (radio some), densidade 52/40, células tipadas (id/entidade/data/dinheiro/status/progresso), ações no hover, rodapé com soma. Não toque em filtros (D9) nem grupos (D10). Testes existentes + novos verdes. Conformidade com §Hierarquia (só --t-*/--s-*, uma ferramenta de separação por fronteira, captura com ?grid). Fechamento completo.
```

### D9 · Filtros 2.0 — views, chips, busca com prefixo, colunas
**Título:** `design(2.0): views com cor e contagem, chips de filtro ativo, busca com prefixo, menu Colunas`
**Zona:** `src/components/cabinet/filtros/**` · `lista-de-filtros.tsx` · `filtro-controles.tsx` · `abas-sem-captura.tsx` · `src/components/cabinet/listagem/**` (parte barra).
**Meta:** "Todos + Salvar consulta + Adicionar filtro" morre. Entra a barra Polaris IndexFilters com estado visível.
**Especificação (mockup: Listagem › views + fbar):**
- Views: aba com quadradinho de cor + rótulo + contagem mono; ativa = linha inferior 2px n-900 + contagem invertida; `+` cria view (D13 persiste; até lá, sessão); "Salvar consulta" vira link `--primary-text` à direita.
- Barra: busca 240px com prefixos (`forn:`, `sit:`, `num:`) renderizados como chip interno `--primary-soft`; chips de filtro ativo (`Situação: Enviada, Confirmada ×`); `+ Filtro` tracejado abre popover de campo→operador→valor; `Agrupar por` (D10); `Ordenar: campo ↑`; segmented densidade; segmented modos (D12); `Colunas · n ocultas` (popover com checkbox por coluna + arrastar ordem + densidade).
- Barra dobra inteira (`flex-wrap`), nunca quebra texto dentro do chip.
- Estado na URL (search params) — já é assim? conferir e manter.
**DoD:** `filtro-chega-na-tela.test` verde; teste de prefixo; teste de coluna oculta; screenshot.
**Fontes:** mockup; Polaris IndexFilters; Attio filters; Airtable views.
**Depende de:** D8.
**Prompt:**
```
Leia a memória e execute a issue #__ (D9). Barra de filtros Polaris: views com cor+contagem, busca com prefixo forn:/sit:/num:, chips de filtro ativo com ×, popover "+ Filtro", "Colunas · n ocultas" com ordem e densidade. "Todos/Salvar consulta/Adicionar filtro" antigos somem. Estado na URL. Conformidade com §Hierarquia (só --t-*/--s-*, uma ferramenta de separação por fronteira, captura com ?grid). Fechamento completo.
```

### D10 · Agrupamento, subtotal e decoração de linha
**Título:** `design(2.0): agrupar por campo com contagem e subtotal; decoração de linha warn/bad/muted`
**Zona:** `src/components/cabinet/data-table.tsx` (só `agruparPor` e `decoracao`) · `listagem/**` (só chip Agrupar).
**Meta:** a grade vira banco (Notion/Airtable): grupo colapsável tintado pelo estado, subtotal de dinheiro; linha atrasada se anuncia sozinha (Odoo).
**Especificação:** `agruparPor: campo` → linha de grupo 36px, bg = `--tom-bg` quando o campo é status (senão n-50), chevron, `<Badge>` ou rótulo, `n itens`, `<Money>` soma à direita; clique colapsa. `decoracao: (linha) => 'warn'|'bad'|'muted'|undefined` → faixa `inset 3px 0 0 var(--tom)` + bg tint (`#FEF8EC` claro / equivalente escuro); `muted` = texto n-500. Chip `Agrupar: Situação ×` na barra.
**DoD:** teste de soma por grupo (inteiros, sem float); teste de colapso; OC agrupada por Situação bate com o mockup.
**Depende de:** D8, D9.
**Prompt:**
```
Leia a memória e execute a issue #__ (D10). agruparPor com linha de grupo tintada + contagem + subtotal (Money, inteiro); decoracao warn/bad/muted com faixa lateral e tint. Chip "Agrupar" na barra. Conformidade com §Hierarquia (só --t-*/--s-*, uma ferramenta de separação por fronteira, captura com ?grid). Fechamento completo.
```

### D11 · KPI strip nas listagens + contrato de agregados
**Título:** `design(2.0): faixa de até 4 KPIs sobre a grade; endpoints de agregado Proposto no contrato`
**Zona:** `src/components/cabinet/numero-heroi.tsx` → renomear `kpi-tile.tsx` · `total-box.tsx` · `contracts/openapi-v1.json` (só `x-status: Proposto`) · `src/mocks/**` (handlers novos) · `src/data/agregados-api.ts` (criar) · `pnpm codegen`.
**Meta:** resumo antes do detalhe em toda listagem que tem dinheiro ou prazo (OC, pedidos compra, orçamentos, pedidos venda, produtos/estoque, oportunidades).
**Especificação (mockup: Listagem › kpis; Dashboard):** `<KpiTile rotulo valor delta? nota? tint? sparkline?>`: borda 1.5px n-900, `--hard-1`, radius card, tint por assunto, rótulo uppercase 10px n-700, valor mono 20/24px tabular com `<Money centavos="leve">`, delta `pos`/`neg`, nota 11.5px n-500, sparkline SVG 60×18. Máximo 4 por faixa (Mercury) — o componente recusa 5. `TotalBox` reimplementado sobre `KpiTile`. Contrato: `GET /api/compras/ordens/resumo`, `/api/vendas/orcamentos/resumo`, `/api/estoque/resumo`, `/api/crm/oportunidades/resumo`, `/api/nav/contadores` — todos `Proposto`, MSW responde.
**DoD:** codegen roda; CI do back continua conferindo sha do contrato (avisar na PR que o back precisa do novo sha); teste "5 KPIs → erro"; screenshot.
**Depende de:** D3, D8. **Paralelo a:** D12, D13.
**Prompt:**
```
Leia a memória e execute a issue #__ (D11). KpiTile (renomeia numero-heroi): tint por assunto, borda ink, hard-1, valor mono, delta, sparkline, máx 4. Endpoints de resumo + contadores de nav como Proposto no contrato, MSW respondendo, codegen. Avise na PR que o sha do contrato muda. Conformidade com §Hierarquia (só --t-*/--s-*, uma ferramenta de separação por fronteira, captura com ?grid). Fechamento completo.
```

### D12 · Modos de view: kanban e calendário genéricos
**Título:** `design(2.0): DataTable ganha modos lista/kanban/calendário; Previsão de chegada, Cargas e Agenda viram views`
**Zona:** `src/components/cabinet/listagem/modo-kanban.tsx` · `modo-calendario.tsx` (criar) · `src/routes/compras/previsao.tsx` · `vendas/cargas.tsx` · `agenda.tsx` · `features/agenda/**`.
**Meta:** três telas próprias morrem e viram uma view da listagem de origem (Airtable views).
**Especificação:** `modos={['lista','kanban','calendario']}` + segmented na barra. Kanban genérico (`campoDeColuna`): coluna n-50 sem borda, cabeçalho com quadradinho + nome + contagem, card folha borda n-300 `--hard-soft` com título/subtítulo/badge/data/Money, hover levanta para `--hard-1`; arrastar entre colunas dispara `onMover` (persistência fica com a tela). Calendário (`campoDeData`): mês/semana, evento = pílula tintada, hoje = quadrado n-900, ponto por dia com overflow "+n". `/compras/previsao` → redireciona para `/compras/ordens?modo=calendario&campo=previsao`; `/vendas/cargas` idem sobre pedidos; `/agenda` vira calendário sobre compromissos (feature própria continua existindo como fonte de dados).
**DoD:** três redirects testados; kanban e calendário renderizam com dados MSW; screenshot dos dois modos.
**Depende de:** D8, D9. **Paralelo a:** D11, D13.
**Prompt:**
```
Leia a memória e execute a issue #__ (D12). Kanban e calendário genéricos como modos do DataTable. Previsão de chegada, Cargas e Agenda deixam de ser telas próprias e viram views (redirect). Conformidade com §Hierarquia (só --t-*/--s-*, uma ferramenta de separação por fronteira, captura com ?grid). Fechamento completo.
```

### D13 · Favoritos = views salvas por usuário
**Título:** `design(2.0): saved_views por usuário (Proposto), ★ em itens e views, grupo Favoritos na sidebar`
**Zona:** `contracts/openapi-v1.json` (`/api/me/views` Proposto) · `src/data/views-api.ts` · `src/mocks/**` · `src/components/cabinet/listagem/views.tsx` (parte persistência) · `src/app/nav/favoritos.tsx`.
**Meta:** o que o operador filtra todo dia vira um clique na sidebar.
**Especificação:** view = `{id, rota, nome, cor, filtros, ordem, agrupar, colunas, modo, favorita}`. ★ na aba de view e no hover de item de nav grava `favorita`. Grupo FAVORITOS lista views favoritas com quadradinho na cor e contagem (usa `/resumo` de D11 quando existir). MSW persiste em `localStorage` até o back existir.
**DoD:** criar/renomear/apagar view; favoritar aparece na sidebar sem reload; teste.
**Depende de:** D4, D9, D11.
**Prompt:**
```
Leia a memória e execute a issue #__ (D13). saved_views por usuário como Proposto no contrato, MSW persistindo em localStorage; ★ em views e itens de nav; grupo FAVORITOS da sidebar alimentado. Conformidade com §Hierarquia (só --t-*/--s-*, uma ferramenta de separação por fronteira, captura com ?grid). Fechamento completo.
```

### D14 · Aplicar Listagem 2.0 nas 11 rotas + limpar código morto
**Título:** `design(2.0): 11 listagens no DataTable 2.0 com colunas tipadas, KPIs, decoração e views padrão`
**Zona:** `src/routes/**/index.tsx` (11) · `src/features/*/listagem*.tsx` · `tela-de-listagem.tsx` · testes `listagem-por-modulo.test.tsx`.
**Meta:** nenhuma listagem fica no visual antigo; cada uma ganha colunas tipadas, KPIs (onde há), decoração e 3–5 views padrão com cor.
**Especificação por rota (tipos de coluna e views mínimas):**
- OC: id · entidade(fornecedor) · data · data(previsão, com "era" riscado + chip reagendada) · status · progresso · dinheiro. Views: Todas · Enviadas · Confirmadas · Atrasadas · Rascunhos · Por fornecedor. Decoração: atrasada=warn, cancelada=muted. KPIs: em aberto · chegando esta semana · atrasadas · recebido no mês.
- Pedidos de compra: id · pedido de venda(link) · data · entidade · status · dinheiro. Views: Todos · Sem OC · Vinculados.
- Orçamentos: id · entidade(cliente) · data · validade(decoração warn se <3 dias) · status · dinheiro. KPIs: abertos · vencem esta semana · aprovados no mês · taxa de conversão.
- Pedidos de venda: id · entidade · data · entrega · status · progresso(carga) · dinheiro.
- Produtos: id(nosso código) · entidade(descrição + marca) · tipo · estoque(número, decoração bad se <mínimo) · dinheiro(custo) · status(ativo). KPIs: SKUs ativos · abaixo do mínimo · valor em estoque · parados >90d.
- Clientes / Fornecedores / Profissionais / Colaboradores: entidade · documento(mono) · cidade · contato · status. Views: Ativos · Inativos · Todos.
- Funis (CRM): entidade · etapas(número) · oportunidades(número) · status.
- Usuários: entidade · papel(badge) · último acesso(data) · status.
- Remover: `tela-de-listagem` antiga se não sobrar consumidor; "Linha: Padrão"; radio; `busca pelo código` solto.
**DoD:** 11 rotas renderizam com MSW; `listagem-por-modulo.test` ×3 verdes; nenhuma referência a componente de listagem 1.x (`grep`); screenshot das 11 nos dois temas em `docs/design/capturas/2.0/`.
**Depende de:** D8–D13.
**Prompt:**
```
Leia a memória e execute a issue #__ (D14). Migre as 11 listagens para o DataTable 2.0 com colunas tipadas, KPIs, decoração e views padrão listadas na issue. Apague o código de listagem 1.x que sobrar. Capturas das 11 em docs/design/capturas/2.0/. Conformidade com §Hierarquia (só --t-*/--s-*, uma ferramenta de separação por fronteira, captura com ?grid). Fechamento completo.
```

---

## ONDA 3 — Registro

### D15 · TelaDeDocumento 2.0 — cabeçalho do registro e layout 2 colunas
**Título:** `design(2.0): header do registro (id, badge, meta, autosave, ação = próximo estado) e grade principal/lateral`
**Zona:** `src/components/cabinet/tela-de-documento.tsx` · `documento.tsx` · `alteracoes-nao-salvas.tsx` · `confirmar-cancelamento.tsx` · testes.
**Meta:** toda ficha muda de esqueleto. "Gravar/Cancelar" morre; entra autosave visível + ação primária que é o próximo passo do fluxo.
**Especificação (mockup: Formulário):** `PageHeader variante="registro"`: voltar (tecla) · título Gambarino 24 + id mono 20 n-500 · linha meta com `<Badge>` + "criada em … por … · reagendada n×" · à direita "● salvo há n s" (ponto `--ok`; "salvando…" n-500; "erro ao salvar" `--bad` com tentar de novo) · ações: ghost (Imprimir) · secundária (Duplicar) · icon ··· (Cancelar/Excluir dentro, em `--bad`) · **primária = `proximaAcao` da tela** ("Confirmar recebimento", "Enviar orçamento", "Ativar cadastro"). Layout `grid-template-columns: minmax(0,1fr) 320px` (dobra por `auto-fit`), colunas recebem `principal` e `lateral`. Autosave: debounce 800ms por campo, fila por registro, conflito → dialog. `alteracoes-nao-salvas` só bloqueia saída se a fila não esvaziou.
**DoD:** teste de autosave (debounce, erro, retry); teste de `proximaAcao` por estado; screenshot OC.
**Fontes:** mockup Formulário; Stripe record header; Polaris order page.
**Depende de:** D2, D3, D5.
**Prompt:**
```
Leia a memória e execute a issue #__ (D15). TelaDeDocumento 2.0: header do registro (voltar, título+id, badge, meta, "salvo há n s", ações ghost/secundária/···/primária = próximo estado), layout principal/lateral. Gravar/Cancelar somem; autosave com fila e retry. Conformidade com §Hierarquia (só --t-*/--s-*, uma ferramenta de separação por fronteira, captura com ?grid). Fechamento completo.
```

### D16 · FormBlock/FormGrid/campos 2.0 e fim da BandaDeIdentidade
**Título:** `design(2.0): blocos de formulário quiet, campos com label sem caixa/help/erro, bloco Identidade lateral`
**Zona:** `src/components/cabinet/form-block.tsx` · `form-grid.tsx` · `cadastro-form.tsx` · `campos-do-modulo.tsx` · `banda-identidade.tsx` (remover) · `ficha/**` · `lookup-combo.tsx` · `campo-com-busca.tsx` · `busca-de-cidade.tsx` · `entrada.tsx`.
**Meta:** o corpo de toda ficha muda: cards quiet (n-300 + `--hard-soft`) na coluna principal; a faixa colorida do módulo (BandaDeIdentidade) some e vira o card lateral "Identidade" tintado.
**Especificação:** `FormBlock titulo acoes?` = card quiet com `h3` 13.5px 600 + `up` à direita opcional; `FormGrid colunas={2|3|4}` com `gap 12`; `Campo label obrigatorio? ajuda? erro?` sobre `Input` D2 (ro = n-50). `LookupCombo`/`CampoComBusca`: popover `--hard-soft`, resultado com monograma + nome + subtítulo, criação inline "+ Novo fornecedor". Bloco `Identidade` (lateral, tint do módulo): monograma 34px, nome 14px 600, documento/cidade 11px, `dl` de 4 pares, link "Ver cadastro →" `--primary-text`. `data-modulo` continua no `<fieldset>` para o tint.
**DoD:** `cadastro-form.test`, `form-grid.test`, `form-block.test`, `campos-do-modulo.test`, `banda-identidade.test` (apagado com justificativa) — verdes; `grep -r "BandaDeIdentidade" src` = 0; screenshot de produto e cliente.
**Depende de:** D15.
**Prompt:**
```
Leia a memória e execute a issue #__ (D16). Blocos de formulário quiet, Campo com label sem caixa/help/erro, LookupCombo com popover e criação inline. Apague BandaDeIdentidade; o lugar dela é o card lateral Identidade tintado. Conformidade com §Hierarquia (só --t-*/--s-*, uma ferramenta de separação por fronteira, captura com ?grid). Fechamento completo.
```

### D17 · Grade de itens editável inline + totais
**Título:** `design(2.0): grade de itens com inputs invisíveis até hover, adicionar do estoque/pedido, totais com Money`
**Zona:** `src/features/ordem-compra/itens*.tsx` · `features/orcamento/itens*.tsx` · `features/pedido-compra/itens*.tsx` · `features/vendas/itens*.tsx` · novo `src/components/cabinet/grade-de-itens.tsx` · `total-box.tsx` (consumo).
**Meta:** editar quantidade/valor sem sair da grade (Attio); totais lidos como extrato (Ramp).
**Especificação (mockup: Formulário › Itens):** `GradeDeItens` genérica: header n-50, linha 40px, célula `input` sem borda até hover/focus (então borda n-300 + branco), código mono `--primary-text`, descrição com subtítulo, qtd/valor numéricos alinhados à direita, total `<Money>`, remover ×; rodapé tracejado com "+ Adicionar item · Do estoque · De pedidos" (abrem `Sheet` de busca); bloco `Totais` n-50 à direita: subtotal · desconto · acréscimo/frete · **total** 16px `--ok` 600. Cálculo em inteiros (centavos).
**DoD:** teste de cálculo (centavos); teste de edição inline + autosave (D15); OC bate com o mockup.
**Depende de:** D15, D16. **Paralelo a:** D18.
**Prompt:**
```
Leia a memória e execute a issue #__ (D17). GradeDeItens genérica com edição inline (input invisível até hover), adicionar do estoque/pedidos via Sheet, Totais em centavos com Money. Use em OC, pedido de compra, orçamento e pedido de venda. Conformidade com §Hierarquia (só --t-*/--s-*, uma ferramenta de separação por fronteira, captura com ?grid). Fechamento completo.
```

### D18 · Andamento (timeline) + cards laterais tintados por assunto
**Título:** `design(2.0): timeline de andamento e cards laterais Fornecedor/Logística/Pagamento tintados`
**Zona:** novo `src/components/cabinet/andamento.tsx` · `cartao-lateral.tsx` · `features/*/lateral*.tsx` · `estado-de-consulta.tsx`.
**Meta:** o histórico do registro deixa de ser aba escondida e vira coluna lateral que se lê de relance.
**Especificação (mockup: Formulário › lateral):** `Andamento eventos[]`: ponto 16px (feito = `--ok` cheio; atual = n-900 anel; futuro = n-300), linha n-200, título 500 + subtítulo 11.5px n-500 (data · quem · motivo). `CartaoLateral titulo tint`: card quiet com bg tint (`lilac` identidade · `mint` andamento · `sky` logística · `sand` financeiro), `kv` de pares, inputs com fundo branco 70%. Fonte dos eventos: `audit_log` quando existir; MSW até lá.
**DoD:** OC lateral bate com o mockup; teste do estado atual/futuro.
**Depende de:** D15, D16. **Paralelo a:** D17.
**Prompt:**
```
Leia a memória e execute a issue #__ (D18). Componente Andamento (timeline com feito/atual/futuro) e CartaoLateral tintado por assunto. Monte a lateral de OC igual ao mockup (Fornecedor lilac, Andamento mint, Transportadora sky, Pagamento sand). Conformidade com §Hierarquia (só --t-*/--s-*, uma ferramenta de separação por fronteira, captura com ?grid). Fechamento completo.
```

### D19 · Aplicar Ficha 2.0 nas 9 rotas `$id`
**Título:** `design(2.0): 9 fichas no esqueleto 2.0 com proximaAcao, lateral e identidade`
**Zona:** `src/routes/**/$*.tsx` (9) · `src/features/*/ficha*.tsx` · `ficha-em-consulta.test.tsx`.
**Meta:** nenhuma ficha no visual antigo.
**Especificação (por rota — principal / lateral / proximaAcao):**
- OC: dados · itens · observações / fornecedor · andamento · transportadora · pagamento / "Confirmar recebimento".
- Pedido de compra: dados · itens / pedido de venda vinculado · andamento / "Gerar ordem de compra".
- Orçamento: dados · ambientes+itens · condições / cliente · andamento · validade / "Enviar ao cliente" → "Aprovar".
- Pedido de venda: dados · itens · entrega / cliente · cargas · financeiro / "Confirmar carga".
- Produto: identificação · variantes · fornecedores · estoque por depósito / identidade (foto) · custos · movimentação recente / "Ativar".
- Cliente / Fornecedor / Profissional / Colaborador: dados · endereços · contatos / identidade · resumo (em aberto, últimos registros) / "Ativar"/"Desativar" (`confirmar-desativacao`).
**DoD:** 9 rotas com MSW; `ficha-em-consulta.test` verde; capturas em `docs/design/capturas/2.0/`.
**Depende de:** D15–D18.
**Prompt:**
```
Leia a memória e execute a issue #__ (D19). Migre as 9 fichas para o esqueleto 2.0 conforme a tabela principal/lateral/proximaAcao da issue. Nenhuma ficha 1.x sobra. Capturas. Conformidade com §Hierarquia (só --t-*/--s-*, uma ferramenta de separação por fronteira, captura com ?grid). Fechamento completo.
```

---

## ONDA 4 — Telas próprias

### D20 · Dashboard 2.0
**Título:** `design(2.0): dashboard com saudação Gambarino, 4 KPIs, agenda, atividade, a-fazer e calendário quiet`
**Zona:** `src/routes/dashboard.tsx` · `index.tsx` · `src/features/dashboard/**` · `painel.tsx` · `secao.tsx` · `blocks.tsx` · `painel-boletim.tsx`.
**Meta:** o dashboard inteiro muda; nada com borda preta além dos 4 KPIs.
**Especificação (mockup: Dashboard):** saudação 30px + data/empresa n-500 + ações (Boletim do dia ghost · + Nova tarefa primária). 4 `KpiTile` (orçamentos abertos lilac · pedidos a receber sky · estoque crítico sand · vendas do mês mint com sparkline). Grid `1.2fr 1fr 1fr` de `dcard` quiet: Agenda de hoje (hora mono, faixa de cor por tipo, tag) + Atividade (feed com monograma, link mono, hora); A fazer (checkbox, concluído riscado, responsável mono, "+ Adicionar"); Calendário compacto (hoje = quadrado n-900, ponto por tipo, legenda). `Painel`/`Secao`/`blocks` reimplementados sobre `dcard` (borda n-300, `--hard-soft`, header 12/16 com quadradinho). Boletim: `painel-boletim` vira uma `dcard` "Boletim" com 3 linhas; rota `/boletim` continua (404 hoje — corrigir).
**DoD:** dashboard bate com o mockup nos dois temas; `/boletim` responde; testes de painel verdes.
**Depende de:** D11 (KpiTile), D3.
**Prompt:**
```
Leia a memória e execute a issue #__ (D20). Dashboard 2.0 igual ao mockup: saudação Gambarino, 4 KpiTile tintados, cards quiet (agenda, atividade, a-fazer, calendário). Painel/Secao/blocks passam a ser dcard. Corrija /boletim (404). Conformidade com §Hierarquia (só --t-*/--s-*, uma ferramenta de separação por fronteira, captura com ?grid). Fechamento completo.
```

### D21 · Quadro de tarefas 2.0
**Título:** `design(2.0): tarefas com KPI strip, carga por responsável, colunas n-50 e cards que levantam`
**Zona:** `src/routes/tarefas.tsx` · `src/features/tarefas/**`.
**Meta:** o kanban inteiro muda; prioridade nunca mais cheia.
**Especificação (mockup: Quadro):** header (segmented Quadro/Lista/Calendário · Filtrar · + Nova tarefa). `bstrip`: 3 `KpiTile` (concluídas mint · em aberto sky · atrasadas sand) + `dcard` "Carga por responsável" (avatar, nome, barra n-900, `n/m` mono). Board: coluna n-50 sem borda, cabeçalho quadradinho + nome + contagem + `+`; card folha n-300 `--hard-soft`, hover `--hard-1` + borda n-900, título 500, descrição n-500, registro relacionado mono `--primary-text`, meta mono (prioridade `prio` pastel · data · `↩n ⌗n`), avatares 20px empilhados; concluída riscada. Arrastar entre colunas (usar o kanban genérico de D12 se mergeado; senão, local e migrar depois — registrar).
**DoD:** bate com o mockup; teste de mover card; screenshot.
**Depende de:** D11, D12 (opcional).
**Prompt:**
```
Leia a memória e execute a issue #__ (D21). Tarefas 2.0 igual ao mockup Quadro: KPI strip + carga por responsável, colunas n-50, cards com hard-soft que levantam, prioridade em pílula pastel. Reuse o kanban genérico de D12 se já existir. Conformidade com §Hierarquia (só --t-*/--s-*, uma ferramenta de separação por fronteira, captura com ?grid). Fechamento completo.
```

### D22 · CRM: funil kanban + oportunidade + funis/motivos
**Título:** `design(2.0): funil de oportunidades no kanban 2.0, ficha de oportunidade, funis e motivos como listas`
**Zona:** `src/routes/crm/**` · `src/features/crm/**`.
**Meta:** CRM deixa de ser skeleton eterno (hoje `/crm/funil` carrega em branco): funil = kanban por etapa com valor por coluna; oportunidade = ficha 2.0 com etapa como stepper.
**Especificação:** colunas = etapas do funil com soma `<Money>` no cabeçalho; card = cliente (monograma) · título · valor · dias na etapa (decoração warn >14d) · responsável. Ficha: stepper de etapas (Odoo statusbar) abaixo do header, `proximaAcao` = "Avançar para <próxima etapa>" e "Marcar perdida" (dialog com motivo). Funis e Motivos de perda = listagem 2.0 + edição inline (D27 padrão).
**DoD:** `/crm/funil` carrega em <2s com MSW; capturas.
**Depende de:** D12, D14, D19, D21.
**Prompt:**
```
Leia a memória e execute a issue #__ (D22). CRM 2.0: funil como kanban por etapa com soma por coluna, ficha de oportunidade com stepper e proximaAcao, funis/motivos como listas com edição inline. Descubra por que /crm/funil hoje fica em skeleton e corrija. Conformidade com §Hierarquia (só --t-*/--s-*, uma ferramenta de separação por fronteira, captura com ?grid). Fechamento completo.
```

### D23 · Planner (gantt) 2.0
**Título:** `design(2.0): planner com linha do tempo hairline, barras tintadas por módulo, hoje em n-900`
**Zona:** `src/routes/planner.tsx` · `src/features/planner/**`.
**Meta:** o gantt muda de pele: sem borda preta, grade hairline, barra = tint do módulo com borda n-300, marco = losango n-900, hoje = linha 2px n-900, cabeçalho de meses sticky, lateral de projetos como `entidade`.
**DoD:** carrega (hoje fica em "Carregando…"); capturas.
**Depende de:** D1–D3.
**Prompt:**
```
Leia a memória e execute a issue #__ (D23). Planner 2.0: grade hairline, barras tintadas, hoje em ink, cabeçalho sticky. Corrija o "Carregando…" eterno. Conformidade com §Hierarquia (só --t-*/--s-*, uma ferramenta de separação por fronteira, captura com ?grid). Fechamento completo.
```

### D24 · Movimentação de estoque 2.0
**Título:** `design(2.0): movimentação com KPIs, segmented Entrada/Saída/Ajuste em Sheet, kardex decorado`
**Zona:** `src/routes/estoque/movimentacao.tsx` · `movimentacao.test.tsx` · `src/features/estoque/**` (exceto relatórios).
**Meta:** a tela deixa de ser formulário cinza desabilitado.
**Especificação (auditoria §2.6):** header com 4 KPIs (saldo total · reservado · disponível · último movimento). Campo produto = `CampoComBusca` grande com resultado inline; variante/depósito ao lado. Segmented **Entrada · Saída · Ajuste** sempre habilitado — abre `Sheet` (D7) com o formulário do lançamento e `proximaAcao` "Lançar". Saldo por depósito = grade pequena (depósito · saldo · reservado · disponível). Kardex = DataTable 2.0 com decoração por tipo (entrada mint · saída rose · ajuste sand) e saldo acumulado mono. Vazio = ícone + frase + campo em foco.
**DoD:** `movimentacao.test` verde; lançamento via Sheet com MSW; capturas.
**Depende de:** D7, D8, D11, D16.
**Prompt:**
```
Leia a memória e execute a issue #__ (D24). Movimentação 2.0: KPIs, busca de produto inline, segmented Entrada/Saída/Ajuste abrindo Sheet, saldo por depósito, kardex com decoração por tipo. Conformidade com §Hierarquia (só --t-*/--s-*, uma ferramenta de separação por fronteira, captura com ?grid). Fechamento completo.
```

### D25 · Relatórios 2.0
**Título:** `design(2.0): valorizado, parado e orçado×estoque como listagem com KPIs, agrupamento e exportar`
**Zona:** `src/routes/estoque/relatorios/**` · `src/features/relatorios/**`.
**Meta:** relatório = listagem 2.0 com KPIs obrigatórios, agrupamento padrão, soma no rodapé e Exportar (CSV/PDF ghost).
**Especificação:** Valorizado: agrupar por depósito, KPIs valor total · SKUs · custo médio · variação mês. Parado: agrupar por faixa (>90 · >180 · >365 dias), decoração warn/bad. Orçado×Estoque: colunas orçado · em estoque · a comprar (decoração bad se falta), KPI cobertura %. Exportar CSV no cliente; PDF = `window.print` com CSS de impressão (`docs/design/print.css`).
**DoD:** três rotas; export CSV testado; capturas.
**Depende de:** D10, D11, D14.
**Prompt:**
```
Leia a memória e execute a issue #__ (D25). Os 3 relatórios viram listagem 2.0 com KPIs, agrupamento padrão, decoração e Exportar CSV/PDF. Conformidade com §Hierarquia (só --t-*/--s-*, uma ferramenta de separação por fronteira, captura com ?grid). Fechamento completo.
```

### D26 · Hubs de módulo nas rotas-índice
**Título:** `design(2.0): /compras, /estoque, /vendas, /crm viram hub com KPIs + atalhos (ERPNext workspace)`
**Zona:** `src/routes/compras.tsx` · `compras/index.tsx` · `estoque.tsx` · `estoque/index.tsx` · `vendas.tsx` · `vendas/index.tsx` · `crm.tsx` · `cadastros.tsx` · `cadastros/index.tsx` · novo `src/components/cabinet/hub-de-modulo.tsx`.
**Meta:** rota-índice deixa de ser redirect para a primeira lista.
**Especificação:** `HubDeModulo modulo`: título Gambarino + tint do módulo no fundo do header, 4 `KpiTile` do `/resumo`, grid de atalhos (cards quiet: ícone + nome + contagem + "última alteração"), views favoritas do módulo, atividade recente do módulo. `/cadastros` vira redirect para `/vendas` com aviso (grupo morreu em D4).
**DoD:** 4 hubs; capturas.
**Depende de:** D11, D13.
**Prompt:**
```
Leia a memória e execute a issue #__ (D26). HubDeModulo nas rotas-índice de compras/estoque/vendas/crm: KPIs, atalhos, favoritos, atividade. /cadastros redireciona. Conformidade com §Hierarquia (só --t-*/--s-*, uma ferramenta de separação por fronteira, captura com ?grid). Fechamento completo.
```

### D27 · Config: usuários + listas editáveis inline
**Título:** `design(2.0): usuários como listagem 2.0; listas de apoio como tabela editável inline`
**Zona:** `src/routes/config/**` · `src/features/config/**` · `features/listas/**` · `features/acesso/**` · novo `src/components/cabinet/tabela-editavel.tsx`.
**Meta:** configuração sem ficha separada.
**Especificação:** Usuários = DataTable 2.0 (entidade · papel badge · último acesso · status) + `proximaAcao` "Convidar". Listas (`catalog_lookups`): `TabelaEditavel`: célula vira input no clique (D17 padrão), linha nova no rodapé tracejado, arrastar ordem, desativar em vez de apagar (`confirmar-desativacao`).
**DoD:** capturas; teste de edição inline.
**Depende de:** D14, D17.
**Prompt:**
```
Leia a memória e execute a issue #__ (D27). Usuários como listagem 2.0; listas de apoio como TabelaEditavel (célula vira input, linha nova, ordem por arrastar). Conformidade com §Hierarquia (só --t-*/--s-*, uma ferramenta de separação por fronteira, captura com ?grid). Fechamento completo.
```

### D28 · Autenticação 2.0 + ornamento reduzido
**Título:** `design(2.0): login/esqueci/definir/trocar senha em página dividida; ornamento vira 1 forma de 60 linhas`
**Zona:** `src/routes/login.tsx` · `esqueci-senha.tsx` · `definir-senha.tsx` · `trocar-senha.tsx` · `src/features/login/**` · `ornamento.tsx` · `stipple.tsx` · `marca.tsx`.
**Meta:** as 4 telas de auth mudam; `ornamento.tsx` cai de 465 para ~60 linhas.
**Especificação (mockup: Login):** esquerda bancada: marca, ornamento (círculos concêntricos lilac/sand/chartreuse com fio n-900 e cruz tracejada — a única forma que sobra, parametrizada por módulo para a 404), claim Gambarino 40px com grifo chartreuse, rodapé n-500. Direita n-50: card folha borda 1.5px n-900 `--hard-2` 400px: título Gambarino 24, campos inset, "manter conectado", primária tecla 40px largura total, links `--primary-text`, nota mono "ambiente de demonstração". Esqueci/definir/trocar = mesmo card com 1–2 campos. `stipple.tsx` apagado se sem consumidor.
**DoD:** 4 rotas; `ornamento.tsx` ≤ 80 linhas; capturas claro/escuro.
**Depende de:** D2.
**Prompt:**
```
Leia a memória e execute a issue #__ (D28). Auth 2.0 igual ao mockup Login (página dividida, card hard-2, tecla larga). Reduza ornamento.tsx a uma forma parametrizada (~60 linhas), usada só em login e 404. Apague stipple se ninguém usa. Conformidade com §Hierarquia (só --t-*/--s-*, uma ferramenta de separação por fronteira, captura com ?grid). Fechamento completo.
```

### D29 · Vazios, erros, 404, em construção, skeleton, overlays
**Título:** `design(2.0): estados vazios/erro sem ornamento, skeleton sem brilho, dialog/tooltip/hover-card 2.0`
**Zona:** `vazio-com-saida` · `erro-do-servidor` · `falha-do-painel` · `tela-nao-capturada` · `modulo-em-construcao` · `sem-permissao` · `aviso-dados-de-exemplo` · `aviso-de-cobertura` · `ui/skeleton` · `empty` · `dialog` · `alert-dialog` · `tooltip` · `hover-card` · `accordion` · `collapsible` · `carousel` (apagar se sem uso).
**Meta:** todo estado excepcional muda; overlays ganham `--hard-3`.
**Especificação:** vazio = ícone lucide 32 n-400 + título 15 500 + frase n-500 + primária tecla; erro = mesmo + botão "Tentar de novo" + detalhe mono colapsável; 404 = ornamento reduzido (D28) + Gambarino 22 + tecla "Ir para o início"; em construção = badge "futuro" + frase + link; skeleton = n-100 sem shimmer (só opacidade 0.6→1, respeita reduced-motion); `Dialog`/`AlertDialog` = folha, borda 1.5px n-900, `--hard-3`, título Gambarino 20, ações à direita (ghost + primária/danger); `Tooltip` = n-900/folha radius 4 sem seta; `HoverCard` = quiet `--hard-soft`; avisos de dados de exemplo/cobertura = faixa `--warn-bg` (D5 `RegiaoDeAvisos`).
**DoD:** todos os testes desses arquivos verdes; `carousel` apagado se `grep` = 0; capturas.
**Depende de:** D2, D28.
**Prompt:**
```
Leia a memória e execute a issue #__ (D29). Estados vazios/erro/404/em construção/skeleton e overlays (dialog, alert, tooltip, hover-card) no 2.0. Apague carousel se ninguém usa. Conformidade com §Hierarquia (só --t-*/--s-*, uma ferramenta de separação por fronteira, captura com ?grid). Fechamento completo.
```

---

## FECHAMENTO

### D30 · Motion off, DESIGN.md 2.0, aliases fora, medição final
**Título:** `design(2.0): DESIGN.md reescrito, aliases 1.x removidos, motion de entrada desligado, medição final`
**Zona:** `DESIGN.md` · `src/index.css` (remover aliases) · `docs/design/**` · `src/app/motion*` · `tailwind`/`@theme` (limpar tokens mortos) · qualquer `grep` residual.
**Meta:** o doc vira verdade do código; nada do 1.x sobra.
**Especificação:** (1) remover animação de entrada de tela e hover "pulo" (§3b 1.6); hover só em tecla e card clicável; `prefers-reduced-motion` global. (2) Apagar aliases de D1 (`--zone-*`, `--shadow-1..5`, `--shadow-el*`, `--shadow-macia`, `--font-nome`, `--font-display-condensada`, exports `Selo/Stamp/CelulaAtivo` se sem consumidor) — cada remoção com `grep` = 0 na PR. (3) `DESIGN.md` reescrito como "Cabinet 2.0 — híbrido": front-matter + Overview + Cores (escala, acento-fill, semântica, tints/módulo) + Tipografia (3 papéis) + Profundidade (tecla/hard/inset) + Navegação (§6 auditoria) + Componentes (assinaturas reais de D2–D18) + Telas próprias + Medição de contraste (tabela GERADA) + Do/Don't + histórico (1.5/1.6/1.7 em 10 linhas, com link para `docs/design/historico/`). Amostras 1.5/1.6 e `direcao-visual-brutalism.md` movidas para `docs/design/historico/`. (4) `medir-contraste.py --conferir` final nos dois temas anexado. (5) Capturas finais de todas as rotas em `docs/design/capturas/2.0/` (script `pnpm capturas` com Playwright — se precisar de dependência, blocker para o user, não instalar).
**DoD:** `grep -rn "1\.5\|1\.6\|1\.7\|zone-\|shadow-el\|Newsreader\|Sora\|PT Mono\|BandaDeIdentidade" src DESIGN.md` = 0 fora do histórico; CI verde; site demo publicado com a 2.0.
**Depende de:** D1–D29.
**Prompt:**
```
Leia a memória e execute a issue #__ (D30). Fechamento da rodada: desligue motion de entrada e hover-pulo, remova TODOS os aliases 1.x (grep = 0 por item), reescreva DESIGN.md como 2.0 a partir do código shipped, mova 1.5/1.6/1.7 para docs/design/historico/, rode medição final nos dois temas, capture todas as rotas. Se precisar de dependência (Playwright), registre blocker — não instale. Conformidade com §Hierarquia (só --t-*/--s-*, uma ferramenta de separação por fronteira, captura com ?grid). Fechamento completo.
```

---

## Checklist para você (user) antes de disparar

1. Criar as 30 issues no `cabinet-erp-web` na ordem D1→D30 (títulos acima), colando zona/meta/spec/DoD/depende. Anotar o número real de cada uma na tabela abaixo.
2. Copiar `mockup-reface-hibrido-2026-09-02.html` e `auditoria-reface-2.0-2026-09-02.md` para `docs/design/` no repo (ou deixar D1 fazer — o prompt de D1 já manda).
3. Atualizar a memória (`next-task.md` @foco = "Reface 2.0 — onda 0", `topicos/frente-visual.md` com as decisões §5/§6 da auditoria). O Cowork faz isso se você pedir "salvar progresso".
4. Disparar D1 sozinho. Só depois do merge de D1, disparar D2 e D3 em paralelo (worktrees separadas).
5. Merge serial pelo user, rebase de toda branch viva depois de cada merge.

| D | # issue | branch | status |
|---|---|---|---|
| D1 | #469 | `design/d1-tokens` | criada 2026-09-02 |
| D2 | #470 | `design/d2-controles` | criada |
| D3 | #471 | `design/d3-badge-money` | criada |
| D4 | #472 | `design/d4-sidebar` | criada |
| D5 | #473 | `design/d5-appbar-header` | criada |
| D6 | #474 | `design/d6-switcher-cmdk` | criada |
| D7 | #475 | `design/d7-inbox` | criada |
| D8 | #476 | `design/d8-datatable-core` | criada |
| D9 | #477 | `design/d9-filtros` | criada |
| D10 | #478 | `design/d10-grupos` | criada |
| D11 | #479 | `design/d11-kpi` | criada |
| D12 | #480 | `design/d12-modos` | criada |
| D13 | #481 | `design/d13-favoritos` | criada |
| D14 | #482 | `design/d14-listagens` | criada |
| D15 | #483 | `design/d15-documento` | criada |
| D16 | #484 | `design/d16-form` | criada |
| D17 | #485 | `design/d17-itens` | criada |
| D18 | #486 | `design/d18-lateral` | criada |
| D19 | #487 | `design/d19-fichas` | criada |
| D20 | #488 | `design/d20-dashboard` | criada |
| D21 | #489 | `design/d21-tarefas` | criada |
| D22 | #490 | `design/d22-crm` | criada |
| D23 | #491 | `design/d23-planner` | criada |
| D24 | #492 | `design/d24-movimentacao` | criada |
| D25 | #493 | `design/d25-relatorios` | criada |
| D26 | #494 | `design/d26-hubs` | criada |
| D27 | #495 | `design/d27-config` | criada |
| D28 | #496 | `design/d28-auth` | criada |
| D29 | #497 | `design/d29-estados` | criada |
| D30 | #498 | `design/d30-fechamento` | criada |
