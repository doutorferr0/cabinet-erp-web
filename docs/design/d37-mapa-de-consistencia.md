# D37 — mapa de consistência da rodada Reface 2.0

Levantamento feito **antes** do merge serial das 30 PRs da rodada, em 2026-09-03/04, com
`design/2.0` em `ef64e03` e **zero** PRs mergeadas. Ele existe porque metade do que D37 precisa
saber só é mensurável enquanto as branches estão separadas: depois do merge, quem escreveu o quê
vira uma linha só, e a divergência que sobra não diz mais de onde veio.

Tudo aqui foi medido por `git grep <ref>` e por um merge serial de ensaio numa worktree
descartável. **Nenhum número foi copiado de issue ou de relato de PR** — os relatos são de quando
foram escritos, e a rodada mudou embaixo deles.

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

## 7. O que D37 não pode fazer antes do merge

Registrado porque a tentação é grande e o estrago é caro: os greps do DoD **já acham 136 `text-[`
e 167 `border-2` na base pura**, e essas ocorrências são o código 1.x que as 30 PRs abertas estão
reescrevendo. Zerá-las agora conflitaria com praticamente toda a rodada, e o conflito cairia em
cima de quem tem menos contexto para resolvê-lo — o agente da PR, no rebase. A passada só é segura
depois que a base contiver D1–D29, exatamente como a issue escreve.
