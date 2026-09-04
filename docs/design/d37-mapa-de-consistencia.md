# D37 — mapa de consistência da rodada Reface 2.0

Levantamento feito **antes** do merge serial das 30 PRs da rodada, em 2026-09-03/04, com
`design/2.0` em `ef64e03` e **zero** PRs mergeadas. Ele existe porque metade do que D37 precisa
saber só é mensurável enquanto as branches estão separadas: depois do merge, quem escreveu o quê
vira uma linha só, e a divergência que sobra não diz mais de onde veio.

Tudo aqui foi medido por `git grep <ref>` e por um merge serial de ensaio numa worktree
descartável. **Nenhum número foi copiado de issue ou de relato de PR** — os relatos são de quando
foram escritos, e a rodada mudou embaixo deles.

**O merge serial começou durante a sessão** e chegou em D7 (`b8f2939`) enquanto este arquivo era
escrito. As medições das seções 2–6 são de antes disso e continuam valendo como retrato do que as
branches contêm — nenhuma delas depende do estado da base. A §7 é posterior e só existe porque o
merge andou. **Não copie os números daqui sem remedir:** este arquivo não roda, então envelhece
calado, e a rodada já provou que muda de hora em hora.

## 1. Como remedir

O ensaio de merge está em `scripts/` de ninguém: é um `git worktree add --detach origin/design/2.0`
seguido de `git merge --no-ff` de cada branch na ordem topológica abaixo, resolvendo conflito por
`--theirs` só para poder continuar medindo. **O resultado NÃO é a união que o merge real produzirá**
— `--theirs` descarta o lado da esquerda em todo arquivo conflitado. Serve para duas coisas e só
para essas: dizer **onde** vai doer, e dar um piso para as contagens de grep.

Ordem topológica usada (base primeiro, cada uma depois da sua base declarada):

```
d1 d2 d3 d4 d5 d6 d7 d8 d11 d12 d22 d23 d28 d34
d9 d27 d10 d13 d15 d20 d21 d24 d26 d29 d32
d14 d25 d16 d33 d35
d17 d18
d19
```

## 2. Onde o merge serial vai doer

**23 das 33 branches conflitam.** Limpas: D2, D3, D8, D9, D13, D19, D20, D22, D24, D26, D32.

| branch | arquivos em conflito | o que disputa |
|---|---:|---|
| D35 forma | 13 | shell, banda-identidade, painel, selo, marca, dashboard, prioridade |
| D16 form | 10 | as 4 telas de login, `DESIGN.md`, cadastro-form, monograma |
| D28 auth | 8 | as 4 telas de login, ornamento, company-switcher |
| D14 listagens | 8 | `data-table.tsx`, filtros, menu-de-colunas |
| D5 appbar | 6 | appbar, shell, banda-identidade |
| D34 kpi-bento | 6 | dashboard, indicadores, 4 rotas-índice |
| D29 estados | 5 | `data-table.tsx`, dialog, alert-dialog |
| D12 modos | 4 | agenda, eventos, previsão de compras |
| D6, D7, D27, D11 | 3 | shell/popover/shortcuts · sheet/appbar · três telas de config · numero-heroi |
| D1, D4, D15, D21, D25 | 2 | ci.yml+medir-tabular · appbar+shell · documento · tarefas · data-table |
| D10, D17, D18, D23, D33 | 1 | `data-table.tsx` (×3), servicos-no-orcamento, banda-identidade, planner |

**Os quatro campos de batalha**, por número de PRs que tocam o mesmo arquivo:

1. **`src/components/cabinet/data-table.tsx`** — D8 → D9 → D10 → D14 → D33 empilham em cadeia
   (62 KB na base, 116 KB no topo), e D25, D29, D24, D27 chegam por fora. É o arquivo que decide o
   custo do merge inteiro. **D25 partiu de um `d10-grupos` mais velho**: seu `data-table.tsx` tem
   78 477 bytes contra os 97 398 da base que ela declara. Mergear D25 depois de D14 sem conferir
   isso reverte agrupamento.
2. **`src/app/shell.tsx` + `appbar.tsx`** — D4, D5 e D7 reescrevem a mesma casca por três motivos
   diferentes (sidebar única, appbar→breadcrumb, `/inbox`).
3. **As quatro telas de login** — D28 as reescreve inteiras e D16 as toca de novo pelo campo.
4. **`banda-identidade.tsx`** — D5, D18 e D35.

**Não é conflito, é ordem:** D7 apaga `src/app/gaveta-notificacoes.tsx`; nenhuma outra branch o
modifica, então o merge não o ressuscita. A hipótese de que D24 reestiliza o `Sheet` por cima de D7
é falsa — ver §4.

## 3. Onde a passada de D37 vai pegar

Contagens sobre a união de ensaio (piso, não valor final):

| grep | união | base pura | alvo do DoD |
|---|---:|---:|---|
| `acoesDeSelecao` | 12 | 6 | 0 (vira `acoesDeLote`) |
| `acoesDeLote` | 0 | 0 | todos |
| `KpiTile` | 123 | 0 | — |
| `NumeroHeroi` | 12 | 18 | 0 |
| `text-[` em `.tsx` | 117 | 136 | 0 |
| `border-2` em `.tsx` | 110 | 167 | só `.btn.pri` e painel |
| `font-size:` em `.tsx` | 2 | 0 | 0 |
| `#rrggbb` em `.tsx` | 2 | 2 | 0 |
| `rgba(` em `src/` | 4 | 5 | 0 fora de `--inset`/`--soft-1` |
| medidores de contraste | 2 | 1 | 1 |

### 3.1 `acoesDeSelecao` → `acoesDeLote`

Não são dois nomes em uso. **`acoesDeLote` aparece uma única vez no repositório inteiro**, na
própria especificação (`docs/design/issues-reface-2.0-claude-code.md:231`); o código sempre chamou
`acoesDeSelecao`, desde antes da rodada. É renomeação de um nome só, e o alvo é o da spec.

Alcança, na união: `components/cabinet/data-table.tsx` (declaração da prop, destructuring, `marcavel`,
passagem para a barra), `components/cabinet/tela-de-listagem.tsx` (deriva das `actions` e repassa),
`grade-2.0.test.tsx` (D8) e `modo-planilha.test.tsx` (D33). Quatro arquivos, dois deles de teste —
mas dois dos quatro são o campo de batalha do §2, e é por isso que **esta renomeação não pode
acontecer antes do merge**: feita agora, ela conflita com oito PRs abertas.

### 3.2 `NumeroHeroi` remanescente

D11 move `NumeroHeroi` para dentro de `kpi-tile.tsx` e o mantém exportado; o próprio
`kpi-tile.test.tsx` marca o bloco como `NumeroHeroi (1.x, sai em D15/D20)`. Na união sobram **12**
ocorrências, e os consumidores de verdade são dois: `components/cabinet/documento.tsx` (escala
`total`) e `features/dashboard/indicadores.tsx` (escala `cartao`). Nem D15 nem D20 removeram o
import — D20 reescreve `indicadores.tsx` inteiro (226 linhas mexidas) e continua chamando
`NumeroHeroi`. A saída é de D37: trocar os dois consumidores por `KpiTile`, apagar o export e o
`describe` de sobrevivência.

### 3.3 `font-size:`, hex e `rgba(` — dois reais, o resto é comentário

- **`font-size:` real: uma.** `components/cabinet/badge.tsx:108` carrega
  `[font-size:var(--t-badge,11.5px)]`, porque `--t-badge` não é degrau da §Hierarquia. A segunda
  ocorrência é prosa dentro do JSDoc de `monograma.tsx`. Saída: degrau `--t-badge` na fundação
  (pedido já registrado na #469) ou classe `.t-badge`; enquanto não existir, o grep do DoD não
  fecha em 0 sem apagar a informação.
- **hex e `rgba(`: nenhum é cor aplicada.** Os quatro casos são citações em comentário —
  `#FF6B2C` explicando por que a cor do evento vem de `s120` (`planner.tsx`, e a mesma frase no
  teste), `#FEF8EC` explicando por que **não** se crava a cor na faixa de grupo
  (`data-table.tsx`), `rgba(255,255,255,.45)` descrevendo o pano do documento, e `rgba(0,0,0,0)`
  narrando um bug já corrigido em `painel.tsx`. Zerar o grep aqui é reescrever a prosa, não trocar
  cor. **Vale fazer** — o grep é a guarda, e guarda que precisa de exceção por comentário deixa de
  ser guarda —, mas registre que nenhuma cor muda.

### 3.4 Um só medidor de contraste — e por que não é apagar um

`docs/design/medir-contraste.py` (base) e `docs/design/medir-contraste-2.0.py` (D4) **não são
duplicata**. O primeiro lê `src/index.css`, onde token é `hsl(H S% L%)`; o segundo lê
`src/styles/tokens-2.0.css`, onde token é hexadecimal composto por `color-mix(in oklab, A p%, B)` —
e faz a mistura de verdade (sRGB → linear → OKLab → interpola → sRGB) em vez de aproximar. O
cabeçalho do segundo já explica por que nasceu ao lado do primeiro.

Unificar é **um arquivo com dois leitores**, não um arquivo a menos: a matemática oklab é a que
fica, e o leitor HSL do `index.css` continua necessário enquanto a 1.x existir (D1 mapeia 1.x para
os tokens 2.0, não apaga o `:root` antigo). Apagar `medir-contraste.py` levaria junto
`--conferir`/`--escrever`, que são o que mantém as tabelas do `DESIGN.md` geradas em vez de
digitadas — o mecanismo que já evitou três números errados publicados na página.

### 3.5 Alpha × opaco nos `--*-bg` — a divergência que a issue não previu

D1 troca os fundos semânticos de alpha para opaco sobre a folha:

```
base:  --ok-bg: color-mix(in oklab, var(--mint-400) 18%, transparent);
D1:    --ok-bg: color-mix(in oklab, var(--mint-400) 18%, var(--folha));
```

(o mesmo em `--info-bg`, `--warn-bg`, `--bad-bg`; `--mut-bg` muda também a proporção, 16% → 10%).

São **três** os interessados, não os dois que a issue lista:

- **D3 `badge.tsx`** — a correção de contraste que ele aplica (`color-mix(in oklab, var(--ok),
  var(--n-900) 25%)`) foi calibrada contra o fundo **alpha composto sobre folha e sobre bancada**,
  nos dois temas.
- **D20** herda o mesmo `badge.tsx`; nada além.
- **D10 `data-table.tsx`** — usa `[&>td]:bg-[var(--info-bg)]` na faixa de grupo, e o comentário
  logo acima **afirma** que "`--ok-bg` e companhia são `color-mix(…, transparent)`", explicando o
  desenho a partir dessa transparência. A frase fica falsa no minuto em que D1 mergear, e a linha
  do zebrado que ela justifica passa a compor diferente.

Nenhuma branch reintroduziu alpha nem voltou ao degrau 400 por conta própria: a divergência é
inteiramente "D1 mudou embaixo de quem já tinha lido".

**Remedido, e o resultado desarma metade do medo.** Os dez pares do Badge, com a tinta de D3 e o
fundo dos dois lados, em oklab, compondo o alpha em **sRGB não-linear** (é onde o compositor do
navegador mistura — compor em linear-light dá cor mais clara e número otimista demais):

| tom | tema | ALPHA sobre folha / folha-2 | OPACO (D1) |
|---|---|---|---|
| ok | claro | 6,49 / 6,02 | **6,55** |
| info | claro | 6,85 / 6,34 | **6,87** |
| warn | claro | 6,54 / 6,09 | **6,61** |
| bad | claro | 7,09 / 6,57 | **7,21** |
| mut | claro | 5,40 / **4,99** | **6,84** |
| ok | escuro | 6,55 / 6,10 | **9,81** |
| info | escuro | 5,56 / 5,20 | **9,11** |
| warn | escuro | 6,57 / 6,10 | **8,62** |
| bad | escuro | 5,54 / 5,17 | **8,34** |
| mut | escuro | 6,00 / 5,58 | **10,59** |

O pior par do lado alpha é **4,99:1**, exatamente o número que o relato de D3 publicou — o que
diz que esta simulação está medindo a mesma coisa que ele mediu. Do lado opaco o pior par sobe
para **6,55:1**. **D1 não quebra a correção do Badge; ela folga.** Os 25% ficam, e D37 não tem
nada a corrigir em `badge.tsx`.

O que a mudança troca é outra coisa, e essa é visual: **com o fundo composto sobre `--folha`, a
superfície deixa de importar** — as duas colunas do lado opaco são iguais porque o token não vê
mais onde foi aplicado. Um badge dentro do header de tabela ou de uma linha zebrada (`--folha-2`)
passa a desenhar um retângulo levemente fora do tom da faixa, onde antes ele se fundia. Não
reprova nada; só precisa ser olhado na captura, e é achado para uma issue `R-*` de D36, não para
esta.

A conta acima não entrou no repositório como script novo — seriam **três** medidores onde o DoD
pede um. Ela é um **requisito do medidor unificado** do §3.4: além de ler os dois arquivos de
token, ele precisa saber compor alpha em sRGB e aplicar a correção do Badge, senão o par que
D3 introduziu continua sem guarda.

## 4. Hipóteses da issue que a medição derrubou

1. **"`Sheet` estilizado em D7 e de novo em D24."** Falso. `src/components/ui/sheet.tsx` em D24 é
   **byte a byte igual à base** (6 330 bytes); só D7 o reescreve (9 385 — sombra dura espelhada por
   `data-side`, título em `.t-secao`). O que D24 tem e D7 não é `src/app/gaveta-notificacoes.tsx`,
   que D7 apaga de propósito. Não há dois Sheets para unificar.
2. **"Cópia de botões — `Nova ordem` vs `Incluir`."** `Nova ordem` **não existe** em branch
   nenhuma. A rodada inteira usa `Incluir` (12 ocorrências) mais as variantes que já vinham da 1.x
   (`Incluir produto`, `Incluir papel`, `Novo usuário`…). O único rótulo novo é `Nova visão` (D14),
   que nomeia outra coisa. Não há cópia divergente de botão para unificar; há, se o user quiser, a
   pergunta antiga de padronizar `Novo X` × `Incluir X`, que é decisão de produto e não cabe numa
   passada de consistência.
3. **"`acoesDeSelecao` (D8) vs `acoesDeLote` (issue)."** Não são dois nomes em uso — ver §3.1.

## 5. Nome que colide sem ser prop

`src/components/cabinet/vazio-com-saida.test.tsx` existe **na base** e não testa nenhum
`VazioComSaida`: é um teste do `VitraDataTable` sobre o assunto "o vazio precisa ter saída" (#201).
D29 acrescenta `src/components/cabinet/vazio-com-saida.tsx`, um componente de verdade. Depois do
merge o repositório tem um par `x.tsx`/`x.test.tsx` cujo teste não testa o `x` — a convenção do
resto de `src/components/cabinet/` é que testa. Renomear o teste (para o assunto, não para o
componente) é trabalho de D37 e não conflita com ninguém.

## 6. Dois nomes para a mesma coisa, e um degrau que não existe

### 6.1 `Monograma` está declarado duas vezes — e a duplicata mergeia limpo

`src/components/cabinet/monograma.tsx` (base, reescrito por D3: 26px, `--r-ctrl`, `.t-dado`,
hairline `--n-200`, hash do nome nas cinco `--tint-*`) e `src/features/crm/monograma.tsx`
(**novo em D22**: 20px, iniciais do responsável no cartão do funil). Dois componentes com o mesmo
nome, exportados dos dois lugares, com desenhos diferentes.

O agravante é que **D22 mergeia sem conflito** — os arquivos são distintos, então nada acende. É a
duplicata que a issue pede para achar, e ela só aparece procurando por nome exportado, nunca pelo
merge. A saída é D22 consumir o componente compartilhado com um `tamanho={20}`, que a assinatura de
`components/cabinet/monograma.tsx` já aceita.

**Nem toda duplicata da varredura é da rodada:** `ParticipacaoDoPedido` já está em
`features/vendas/` e `features/comissoes/` **na base**, desde antes da 2.0. Fora do escopo de D37.

### 6.2 `Appbar` duplicado é armadilha de merge, não divergência de código

D5 **move** `src/app/appbar.tsx` para `src/app/appbar/index.tsx` (mais `trilha.ts`/`trilha.test.ts`);
D4 e D7 **modificam** `src/app/appbar.tsx` no lugar antigo. No merge real isso é um conflito
**rename/modify**, e resolvê-lo pelo lado errado deixa os dois arquivos vivos, cada um exportando
um `Appbar` — quem decide qual vale passa a ser o caminho do import. Foi o que aconteceu no ensaio
deste documento, com `--theirs`: o resultado tinha os dois.

Registrado aqui porque é aviso para **quem faz o merge**, não tarefa de D37: se D4 ou D7 entrarem
depois de D5, confira que `src/app/appbar.tsx` some.

### 6.3 `--t-kpi-valor` não existe, e por isso virou seis nomes com três tamanhos

Nenhuma das classes abaixo tem definição em `tokens-2.0.css` nem no `index.css` — todas entram por
`var(--x, fallback)`, e o fallback é o que efetivamente desenha:

| token fantasma | D11 · D21 · D25 | D34 |
|---|---|---|
| `--t-kpi-valor` | **20px** | **26px** |
| `--t-kpi-valor-big` | 24px | 32px |
| `--t-kpi-valor-heroi` | — | 40px |
| `--t-kpi-valor-lh` | 24px | (1) |
| `--t-kpi-valor-big-lh` | 28px | (1) |
| `--t-kpi-valor-heroi-lh` | — | (1) |

É exatamente o que D25 previu ao registrar o pedido na #469 — *"sem o degrau, cada uma escolhe o seu
20px"*. Aconteceu: **o mesmo token tem dois defaults**, e D34 reescreveu a escala inteira por cima
de D11 sem que uma seja base da outra (D34 mira `design/2.0` direto). Hoje o KPI do relatório e o
do dashboard saem em tamanhos diferentes, e nenhum grep de `font-size:` acusa isso, porque o valor
está dentro de uma `var()`.

**A unificação aqui não é renomear: é publicar o degrau.** Escolher um valor, declará-lo em
`tokens-2.0.css`, e os fallbacks viram redundância inofensiva. Enquanto o degrau não existir,
qualquer "alinhamento" é escolher um número na mão — que é o que produziu a divergência.

Outras `.t-*` sem definição, pela mesma via: `t-badge` (D3), `t-campo` (`ui/label.tsx`),
`t-avatar-iniciais` (D21), `t-registro-id` (`documento.tsx`), `t-total-documento`
(`grade-de-itens.tsx`). São **seis famílias fantasma** ao lado dos onze degraus reais da
§Hierarquia — e os reais estão bem usados (`t-meta` 148, `t-ui` 110, `t-rotulo` 87, `t-dado-meta`
86, `t-dado` 77).

### 6.4 O alinhamento `.t-*` × utility ainda não aconteceu

Na união convivem 148 `t-meta`/110 `t-ui` com **177 `text-sm` e 51 `text-xs`** soltos. Não é
contradição direta — a maioria dos `text-*` está em elemento que nenhum degrau cobre —, mas é o
tamanho do trabalho que o item "nomes de classe `.t-*` vs utilities Tailwind equivalentes" esconde.
Um caso é literal: `features/acesso/senha-provisoria.tsx:52` carrega `t-dado` **e** `text-lg` no
mesmo `className`, e como as `.t-*` moram fora de `@layer`, quem ganha é o degrau — o `text-lg` não
faz nada e mente para quem lê.

### 6.5 Prop com dois nomes, além da renomeação principal

`selecionadas` (18) e `selecionados` (3) coexistem; os três masculinos são cópia visível ao
operador (`filtro-controles.tsx:214`, `"${marcados.length} selecionados"`) e não nome de prop, então
a unificação aqui é de **cópia**, não de API — e depende de o sujeito ser "registros" ou "linhas".
`acoesDeLinha` (5) é conceito distinto de `acoesDeSelecao` (15) e fica; renomear o segundo para
`acoesDeLote` deixa o par mais legível, que é metade do motivo da renomeação.

## 7. A base ficou VERMELHA no merge de D3, e ninguém viu

Achado durante a espera, e o mais caro do documento: **`design/2.0` está com a suíte vermelha desde
o merge de D3 (PR #505)**, e como o CI de cada PR da rodada roda contra o merge com a base, **toda
PR seguinte herda o vermelho**. O sintoma chegou por aqui: o `check` desta PR reprovou com um diff
que era um arquivo `.md`.

Bissecção sobre os sete merges, rodando só os dois arquivos afetados:

| commit | merge | suíte |
|---|---|---|
| `ef64e03` | (fundação) | 2 passed |
| `7c87374` | D1 tokens | 2 passed |
| `a7a4742` | D2 controles | 2 passed |
| `46886b8` | **D3 badge/money** | **2 failed** |
| `0a47dff` … `b36660f` | D4, D5, D6, D7 | 2 failed |

**Não é conflito semântico:** rodando `origin/design/d3-badge-money` sozinha, sem D1 e sem D2, os
mesmos testes já falham. A branch foi mergeada vermelha. **E não houve descuido de quem mergeou —
não havia o que ver:** `gh pr checks 505` lista **só os dois Cloudflare Pages**, que rodam
`tsc -b && vite build` e não a suíte; a API não devolve **nenhum** run do Actions para a branch. O
job `check` nunca existiu naquela PR. É a dívida que `ef64e03` ("PRs da rodada rodavam sem CI") foi
fechar, e D3 é anterior a ela.

São três defeitos de naturezas diferentes, e vale separá-los porque só um é "teste velho":

1. **`selo.test.tsx` × 2 — teste que envelheceu com o componente.** D3 trocou `bg-card` por
   `bg-[var(--n-0)]` e `shadow-el1` por `shadow-[var(--hard-1)]`, e não atualizou as asserções.
   Conserto: as asserções passam a cobrar os tokens 2.0.
2. **`produto-form.test.tsx:162` — promessa escrita e não cumprida.** O comentário de `badge.tsx`
   declara que *"os aliases (`Stamp`, `CelulaAtivo`) sobrescrevem `data-slot`/`data-tom` para não
   quebrar quem os consulta"*. `Stamp` cumpre; **`CelulaAtivo` não** — saía como
   `data-slot="badge"`, e o teste, que consulta `[data-slot="stamp"]` desde a 1.x (quando a coluna
   era um `Stamp`), parou de achar a célula. Conserto **no componente, não no teste**: o alias
   passa a sobrescrever, que é o que a própria peça promete. O slot nomeia o PAPEL — "o selo de
   estado desta linha" —, não a peça que o desenha.
3. **`produto-form.test.tsx:184` — conflito semântico de verdade, e este é de D4.** O caso afirma
   que a coluna `Marca` não é ordenável, perguntando `queryByRole('button', { name: /Marca/ })`
   na tela inteira. D4 pôs botões de favoritar na sidebar com `aria-label="Marcar Dashboard"`,
   `"Marcar Movimentação"` … — a regex frouxa passou a casar dois, e o caso morre com *"found
   multiple elements"*, que é o oposto do que ele afirma. **Nenhuma das duas PRs errou sozinha.**
   Conserto: a pergunta é sobre o cabeçalho da tabela, então é feita **dentro dele** — escopo, não
   regex mais fechada, porque o que se quer dizer é "neste cabeçalho não há botão", não "esta
   string não existe na tela".

Este é o exemplo mais limpo do que uma passada de consistência serve: **os três defeitos passam por
qualquer revisão de PR isolada.** O primeiro só aparece rodando a suíte que a PR não tinha; o
segundo é uma frase de comentário contra uma linha de código no mesmo arquivo; o terceiro só existe
quando duas PRs que não se tocam estão na mesma árvore.

### 7.1 E não eram três — eram seis arquivos, com o pior deles mudo

Rodada a suíte inteira contra a base com D1–D14, o vermelho herdado era de **seis arquivos / onze
casos**, medidos também numa worktree da base pura para separar o que era do diff (nada era). Um
sétimo, `profissional-form.test.tsx`, falhou só sob carga — passa isolado, e `load average` estava
em 25 com outros agentes na máquina.

| arquivo | causa | natureza |
|---|---|---|
| `selo.test.tsx` (2) | D3 trocou os tokens e não atualizou as asserções | teste envelhecido *(resolvido na base, por remoção dos casos)* |
| `produto-form.test.tsx` (1) | `CelulaAtivo` não cumpre o `data-slot="stamp"` que `badge.tsx` promete | promessa escrita, não cumprida |
| `produto-form.test.tsx` (1) | `/Marca/` global casa os `Marcar X` que D4 pôs na sidebar | conflito semântico D4 × listagem |
| `pagina-do-inbox.test.tsx` (5) | `getByRole('list')` global: a barra da D4 tem um `<ul>` por grupo | conflito semântico D4 × D7 |
| `desabilitado.test.tsx` (1) | `company-switcher` (D6) usa `disabled:opacity-60` | receita antiga contra a §Desabilitado |
| `contrato-bloco2.test.ts` (1) | D13 publicou `DELETE /api/me/views/{id}` | regra do repo × necessidade nova |
| `todo-componente-e-montado.test.ts` (1) | **`RegiaoDeAvisos` ficou órfã** | ver abaixo |

**O último é uma regressão de PRODUTO, e é o achado mais caro da sessão.** D5 moveu a região de
avisos do `providers.tsx` para o `shell.tsx` — de propósito, com o comentário no lugar de origem
explicando a mudança ("ela virou faixa logo abaixo da appbar, e por isso monta no shell"). D4 e D7
continuavam montando no `providers`, sem saber. **O merge das três conflitou no `shell.tsx` — o
campo de batalha que a §2 previu — e a resolução ficou com o lado que não tinha a faixa.** Resultado
na base: a região não é montada em lugar nenhum, e o app inteiro perdeu a confirmação de escrita
que a #208 entregou. O operador grava um cadastro e não recebe resposta.

Nada gritou. `tsc` passa (o componente existe, só ninguém o chama), os dois builds da Cloudflare
passam, e nenhuma tela quebra — o que sumiu é uma faixa que **só aparece depois de uma ação**. Quem
acusou foram a guarda `todo-componente-e-montado` (que existe exatamente para isso) e dois casos de
`aviso-de-conclusao.test.tsx`. **Uma linha recolocada no `shell.tsx` devolveu 12 testes.**

Sobre o `DELETE`: a guarda foi **estreitada, não afrouxada**. A regra "desativação é lógica" protege
dado de negócio que documento antigo cita; uma consulta salva é preferência do próprio usuário, e
guardá-la com `favorite: false` deixaria um registro vazio que ele não tem como limpar. A asserção
passou a comparar a **lista nominal** de caminhos com `delete` — `DELETE` novo em qualquer outro
lugar continua reprovando, e quem o quiser escreve o argumento na lista.

Os seis foram consertados nesta PR: é `atualizar testes` do DoD, e desbloqueia as PRs restantes da
rodada, que herdavam o vermelho.

## 8. Favoritos estava entregue DUAS VEZES — unificado aqui

A duplicata mais cara da rodada, e a única que já vinha com a decisão tomada: o merge de D8–D14
deixou `src/app/nav/favoritos.test.tsx` em `describe.skip` com o motivo escrito no topo — *"a D4
(#519) entregou a barra única com Favoritos em `localStorage`; a D13 (#513) entregou Favoritos por
`saved_views` (contrato Proposto) montados no shell ANTIGO. No merge ficou a barra da D4;
`GrupoFavoritos`/`EstrelaDaTela` daqui ainda não estão ligados nela. Ligar (e apagar o
`localStorage` da D4) é item da D37"*.

Estado medido antes de mexer: **`src/app/nav/favoritos.tsx` era órfão** — `git grep` de
`GrupoFavoritos|EstrelaDaTela` fora do próprio arquivo e do seu teste devolvia **zero**. A barra
que a rodada publicou gravava favoritos no navegador; o arquivo que falava com o contrato não era
montado por ninguém; e quatro casos de teste ficaram desligados esperando esta issue.

**O que ficou de cada uma:** a **casca é a da D4** (é a barra que existe, com a pele 2.0 e o
`nav.css`) e a **fonte de verdade é a da D13** (é o contrato, e sobrevive a trocar de máquina).
Concretamente:

| peça | antes | agora |
|---|---|---|
| ★ do item de nav | `useFavoritos` (localStorage, gaveta por operador) | `useFavoritosDaTela` — `POST` da view sem filtro, `DELETE` ao soltar |
| grupo `FAVORITOS` | montado de `todosOsItens` filtrados pelo localStorage | `<GrupoFavoritos>` sobre `viewsFavoritas`, na marcação da barra |
| `EstrelaDaTela` (D13) | componente paralelo, órfão | **removido** — a ★ da barra faz o mesmo, com a pele certa |
| cópia da ★ | `Marcar X` / `Desmarcar X` (D4) | `Fixar X nos favoritos` / `Tirar X dos favoritos` (a de D13, que a aba da listagem já usava) |
| `CHAVE_FAVORITOS` no `estado.ts` | `cabinet.nav.favoritos` | apagada (com `somenteTextos`, que ficou sem chamador) |

**Ganho que não é de arrumação:** a lista deixou de saber só de telas. Montada a partir dos itens
de navegação, ela só podia mostrar o que a barra já continha; vinda das views favoritas, ela traz
as **duas naturezas** — a tela fixada pela ★ da barra *e* a consulta salva fixada pela ★ da aba da
listagem. Antes, uma consulta favoritada na listagem simplesmente não aparecia na barra.

E o resto do `estado.ts` **ficou onde estava, de propósito**: colapso, grupos abertos e recentes
não têm caminho no contrato, e inventar um para eles seria escrever contrato para guardar
preferência de janela.

Dois casos do teste de D13 precisaram de ajuste porque descreviam o shell antigo, não o
comportamento: o marco de "a barra montou" era um `<nav>` por módulo (`/^Telas de/`), e a D4 nomeia
os grupos com `<ul aria-label>` — passou a ser o `<nav aria-label="Navegação principal">` da barra;
e fixar uma tela de OUTRO módulo exige abrir o grupo antes, porque a barra da D4 só monta os itens
do grupo aberto. O segundo ajuste não é concessão ao teste: é o gesto real do operador, e escondê-lo
com uma busca frouxa esconderia a regressão do dia em que o grupo parasse de abrir.

O caso equivalente em `sidebar-nav.test.tsx` afirmava a chave do `localStorage`. Foi reescrito para
afirmar a **requisição** — `POST /api/me/views` com `route`, `name`, `favorite: true` — mais a
contraprova de que a chave da D4 não existe mais. Os quatro casos de `favoritos.test.tsx` saíram do
skip e passam.

## 9. A passada, com D1–D29 na base

O merge serial fechou D1–D29 durante a sessão. O que a passada fez, e o que ela **não** fez.

### 9.1 Feito

| item | alcance | resultado |
|---|---|---|
| `acoesDeSelecao` → `acoesDeLote` | `data-table.tsx`, `tela-de-listagem.tsx`, `grade-2.0.test.tsx` | 9 ocorrências, 3 arquivos, **0 restantes** |
| `NumeroHeroi` **apagado** | `kpi-tile.tsx` + o `describe` de sobrevivência | sem consumidor desde D15/D20; levou junto 3 `text-[<rem>]` |
| `Monograma` do funil renomeado | `features/crm/` → `MonogramaDoFunil` / `iniciaisDoFunil` | acaba a colisão de nome |
| **convenção de iniciais unificada** | `iniciaisDe` passa a ser primeira+SEGUNDA | ver 9.2 |
| hex `#rrggbb` em `.tsx` | `planner.test.tsx`, `data-table.tsx` | **0** |
| `rgba(` fora de `--inset`/`--soft-1` | `painel.tsx` | **0** |
| comentário vencido de D10 | `data-table.tsx` | a frase "os `--*-bg` são `color-mix(…, transparent)`" — falsa desde D1 — foi corrigida no mesmo lugar |

Sobre o `acoesDeLote`: o nome da spec é melhor **pelo par**. Ao lado de `acoesDeLinha`, "lote" e
"linha" dizem QUANTAS linhas a ação alcança, que é a única diferença entre as duas. "Seleção"
descrevia o gesto de chegar até elas, e o gesto é o mesmo nas duas.

### 9.2 A convenção de iniciais era TRÊS implementações e DUAS regras

`iniciaisDe` (D3, `components/cabinet`) fazia primeira+ÚLTIMA palavra. Mas:

- `bloco-identidade.test.tsx` (D16) cobrava `Vertz Iluminação Ltda` → `VI` e **reprovava na base**,
  porque a função dizia `VL`;
- `features/crm/monograma.tsx` (D22) escreveu a **própria cópia** com primeira+SEGUNDA, registrando
  que `MARIA HELENA ARQUITETURA ME` daria `MM` pela outra regra — medido na tela.

O argumento que decide é de domínio e estava escrito no teste de D16: **a última palavra de razão
social é `Ltda`, `ME` ou `S/A`**, então primeira+última faria metade do cadastro terminar na mesma
letra. Num ERP a maioria dos nomes é razão social. Dois lugares independentes já pediam a mesma
regra; a D37 ficou com ela e atualizou o caso do teste de D3 que cobrava a outra.

**O que a mudança alcança, dito em voz alta:** nome de PESSOA com três partes ou mais passa a usar o
nome do meio — `José dos Santos Oliveira` → `JS`, não `JO`. É reversível em quatro linhas, mas então
`bloco-identidade` volta a reprovar: as duas metades precisam ser decididas juntas, e é por isso que
a troca está escrita no JSDoc da função e não só aqui.

O `MonogramaDoFunil` **não foi fundido** com o compartilhado, e isso é deliberado: além das
iniciais (agora iguais), eles ainda discordam em cor (hash do nome × fixa pelo papel) e
acessibilidade (`aria-hidden` sempre × `sr-only` com o nome). Os dois argumentos estão escritos e
são bons no lugar de cada um. Fundir exige uma decisão de produto — a D37 tirou a colisão de nome e
deixou a divergência visível.

### 9.3 Não feito, com o número medido

| grep | estado | por que não fecha aqui |
|---|---:|---|
| `text-[` em `.tsx` | **114**, em 63 arquivos | 40 são `text-[color:var(…)]` — **cor**, não tamanho, e é a forma legítima de divergir de um degrau; sobram ~55 tamanhos literais (31× `0.75rem`, 7× `0.6875rem`, …). Cada substituição é **escolher um degrau**, decisão de design em 40+ arquivos, vários em zona de PR ainda aberta (D30, D32, D33, D34, D35). |
| `border-2` em `.tsx` | **89**, em 57 arquivos | mesma natureza, mesma dispersão |
| `font-size:` em `.tsx` | **3** (2 em comentário) | o único real é `badge.tsx`, `[font-size:var(--t-badge,11.5px)]`, e só some **publicando o degrau `--t-badge`** na fundação (§6.3) |
| um só medidor de contraste | **2** | ver abaixo — o bloqueio ficou mais forte, não mais fraco |

Nenhum desses é "esquecido": os quatro têm o número medido e o bloqueio nomeado. O que os separa do
que foi feito é que **renomear é reversível e escolher um degrau tipográfico não é** — a segunda
metade pede uma issue com o mockup ao lado, não uma passada de consistência.

## 10. O que D37 não pode fazer antes do merge

Registrado porque a tentação é grande e o estrago é caro: os greps do DoD **já acham 136 `text-[`
e 167 `border-2` na base pura**, e essas ocorrências são o código 1.x que as 30 PRs abertas estão
reescrevendo. Zerá-las agora conflitaria com praticamente toda a rodada, e o conflito cairia em
cima de quem tem menos contexto para resolvê-lo — o agente da PR, no rebase. A passada só é segura
depois que a base contiver D1–D29, exatamente como a issue escreve.

**A pergunta foi feita item a item, não no atacado**, porque uma renomeação barata que passasse
agora valeria a pena. Nenhuma passa:

| renomeação | por que não agora |
|---|---|
| `acoesDeSelecao` → `acoesDeLote` | `data-table.tsx` e `tela-de-listagem.tsx`, oito PRs por cima |
| `NumeroHeroi` → `KpiTile` | `kpi-tile.tsx` só existe em D11, que ainda não mergeou |
| unificar os medidores | ver abaixo — o bloqueio mudou de razão, não sumiu |
| `features/crm/monograma.tsx` | o arquivo nasce em D22 |
| `vazio-com-saida.test.tsx` | o único candidato que **já está na base** — e **D35 o modifica**, e D35 é a branch que mais conflita da rodada |

O último era o caso promissor e foi conferido por diff, não por suposição: `git diff --name-only
origin/design/2.0 <branch> -- <arquivo>` sobre as 33 branches devolve exatamente uma, D35.

**Remedido depois que D4 mergeou, e a conclusão não mudou.** Com D4 na base, os dois medidores
passaram a existir lado a lado e o item pareceu destravar. Não destravou, por duas razões que a
primeira medição não tinha:

1. **Cinco branches ainda os modificam** — D1, D20, D30, D32 e D34 têm commits próprios em
   `medir-contraste.py` ou `medir-contraste-2.0.py` fora da base. Unificar agora conflita com as
   cinco.
2. **`medir-contraste.py` é passo do CI.** O `ci.yml` roda `--conferir` e reprova o PR quando o
   `DESIGN.md` sai de sincronia com `src/index.css`. Um script unificado com bug derruba a
   verificação de **todo mundo** na rodada, num passo cuja mensagem de erro fala de `DESIGN.md` e
   não de quem o quebrou — o pior tipo de vermelho para quem não escreveu a mudança.

A regra "medir de novo antes de codar" vale nos dois sentidos: aqui ela **não** liberou o trabalho,
apontou um risco que não estava na lista.
