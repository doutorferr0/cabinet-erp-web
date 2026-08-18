# CLAUDE.md — cabinet-erp-web

Orientação para o agente (claude ou kimi) neste repositório. Ler antes de qualquer tarefa.
Este repo = **front do Cabinet** (React SPA) e **dono do contrato** (`contracts/openapi-v1.json`). **O backend EXISTE desde 2026-08-17: `doutorferr0/cabinet-erp-api`** (Fastify + TS, privado), escrito no mesmo trilho — não há outro dev. Ele **consome** este contrato: mantém uma cópia conferida no CI dele e implementa o que está escrito aqui. Continua valendo que o contrato muda só por PR NESTE repo; o que mudou é que agora há com quem conferir. Memória compartilhada = `doutorferr0/projetos-claude` → `projetosClaude/vertz-erp`.

## Estilo de comunicação
PT-BR. Comprimir prosa, nunca substância. Cortar filler/cordialidade/preâmbulo. Preservar raciocínio de decisão, trade-offs, causalidade. Não inventar dado — falta = "sem dado". Revisão começa por problemas. Responder só o perguntado.

## REGRA DA FASE — O FRONT É O DONO DO CONTRATO (inegociável)
**A fase mock ACABOU e o contrato não vem mais de fora.** `contracts/openapi-v1.json` é a
especificação de **entrada** que o backend precisa implementar, não cópia que o front recebe.

- **Contrato muda SÓ por PR neste repositório.** Caminho que o front define antes de o servidor
  implementar entra marcado **`Proposto`** — o leitor precisa distinguir o que já foi implementado
  do que é pedido. **O `Proposto` continua sendo marca de INTENÇÃO, não de ausência de backend:**
  o `cabinet-erp-api` existe e implementa por partes, e operação do contrato que ele ainda não
  serve responde **501** (não 404), justamente para a diferença ficar visível.
- **Já é HTTP:** sessão (`/auth/*`), listas de apoio (`/api/catalog-lookups`), produtos e
  variantes (`/api/products`, `…/variants`), os três papéis de parceiro — cliente, fornecedor,
  profissional (`/api/partners`, filtro `role`) — e o **orçamento** (`/api/quotes`, #134). Ver
  `docs/integracao.md`.
- **Também HTTP, por caminho `Proposto` que o front escreveu:** dashboard (indicadores, agenda,
  tarefas, A fazer) e planner (projetos, plano). Nenhum backend os implementa ainda — no modo
  mock quem responde é `src/mocks/api/handlers.ts`, e a tela não sabe a diferença.
- **Ainda mock:** colaborador, pedido de compra, ordem de compra, cidades, boletim
  — **por falta de caminho no contrato, não por escolha.** Esses seguem a regra antiga: dados
  tipados em `src/mocks/`, campos LITERAIS de `topicos/transcricaosoftlux.md` da memória.
- **PROIBIDO continua:** inventar chamada HTTP, inventar shape de API sem passar pelo contrato,
  escrever à mão tipo que o contrato define. Todo tipo de servidor vem do codegen —
  `pnpm codegen` (Orval + pós-codegen), saída em `src/api/gerado/`, **commitada**, com
  `@ts-nocheck` posto pelo passo pós-codegen. **Nunca editar `src/api/gerado/` à mão**;
  conflito de merge nele se resolve rodando o codegen.
- **Operação nova NASCE exigindo sessão.** O `security` do topo do documento vale por herança;
  abrir exceção é declarar `security: []` na operação E justificar em
  `src/data/security-do-contrato.test.ts`, que é a guarda. Toda operação autenticada declara
  **401** e toda operação de domínio declara **403**, por `$ref` a `components/responses` —
  nunca copiando a descrição. Ver `docs/integracao.md` §Sessão no contrato.
- **A guarda do contrato é o CI:** o passo `Codegen is up to date` refaz o codegen e reprova se
  `src/api/gerado` divergir de `contracts/`. É a guarda inteira — mexeu no contrato, rodou
  codegen e commitou o gerado no mesmo PR.
- **A tela nunca inventa o que o contrato não cobre.** Contrato menor que a transcrição fica
  VISÍVEL: coluna que o DTO não tem sai da listagem, campo que o servidor não guarda aparece em
  branco e o `AvisoDeCobertura` avisa o operador. Preencher com mock daria dado de mentira com
  cara de dado do servidor.
- Formulários validam com Zod local; `// TODO(contract):` marca o que o codegen ainda vai substituir.

## Stack (decidida — NÃO trocar sem confirmação do user)
- **Vite + React 19 + TypeScript strict** · SPA
- **Tailwind v4 + shadcn/ui** (copy-paste, sem runtime dep de UI kit)
- **TanStack Query v5** (estado servidor) · **TanStack Table v8** · **TanStack Router** (adotado; rotas em `src/routes/`, árvore gerada em `src/routeTree.gen.ts`)
- **Orval** (codegen do contrato: tipos + hooks TanStack + Zod + handlers MSW) · cliente em `src/api/cliente.ts` (`fetch`, `credentials: 'include'` — a sessão é cookie opaco)
- **react-hook-form + Zod 4**
- **pnpm** com `minimumReleaseAge: 10080` (7d) no workspace — OBRIGATÓRIO, pós supply-chain. **Biome** (lint+format) · **vitest** + Testing Library
- **Vetos:** Redux · axios · styled-components · MUI/Antd/UI-kits de runtime · form-generator declarativo · SheetJS (`xlsx` npm) · float p/ dinheiro
- Referência visual/estrutural: shadcn/ui docs · Kiranism next-shadcn-dashboard-starter (SÓ como referência de DataTable/layout — é Next, aqui é Vite: adaptar, não copiar rotas/SSR)

## Convenções
- **Dinheiro:** trafega em **centavos (int)**; formatar R$ só na borda de exibição (`Intl.NumberFormat('pt-BR')`). NUNCA float em estado/mock.
- **Quantidade:** até 3 casas. **Datas:** ISO nos dados, exibição pt-BR. **CNPJ/CPF:** sem máscara no dado, máscara só no input.
- **Atalhos — interface por clique** (decisão do user, 30/07/2026): toda ação é alcançável por mouse e nenhum fluxo depende de tecla memorizada. Navegação em formulário é a nativa do browser (Tab / Shift+Tab, Enter no controle focado). **NÃO criar atalho customizado novo.** Os que já existem em `src/lib/shortcuts.ts` (`Ctrl+K` **paleta de comandos** · `Alt+N` incluir · `Alt+P/A/T/I` nos documentos) ficam como conveniência, não como requisito — a paleta, por exemplo, abre também pelo botão de busca da appbar — não removê-los, não expandi-los, não desenhar tela que só funcione por eles. F3–F6 continuam proibidos (conflito com browser).
- Componentes compartilhados moram em `src/components/cabinet/` (DataTable, LookupCombo, blocos) — telas só COMPÕEM, não reimplementam.
- Acessibilidade mínima: label em todo campo, foco visível, dialog com focus-trap (shadcn já dá).

## Os 9 padrões — JÁ IMPLEMENTADOS, tela nova COMPÕE (1–8 da transcricaosoftlux @padroes, 20 telas; o 9º é decisão do core)
1. **DataTable server-ready** — busca, ordenação, paginação com estado tipado `{q, sort, page, pageSize}` (mais `filtros`/`juncao`, opcionais). Nos recursos HTTP quem aplica é o backend; nos mock, o provider. É o coração: 8+ telas usam. Coluna que ordena usa `accessorKey` **em inglês**, o nome que a whitelist de `sortBy` do servidor aceita — traduzir quebra a ordenação com 400 só ao clicar no cabeçalho. **Filtro estruturado** (campo+operador+valor, portado de sadmann7/shadcn-table — ver `NOTICE`) viaja em `filters` (array JSON) + `joinOperator`, `Proposto` em `/api/products`, `/api/partners`, `/api/crm/opportunities` e `/api/quotes`. Continua **opt-in por tela** via a prop `filtros`, e só em recurso que publica o parâmetro: quem não publica recusa em voz alta na fronteira, em vez de devolver a lista inteira com a tela mostrando filtro aplicado. Campo fora da whitelist é barrado antes de sair (o contrato manda 400), e o que o operador DIGITA vira o que o dado GUARDA na saída (`normalizar` — CNPJ com máscara). Variantes: texto, número, **data** (`<input type="date">` nativo, comparação por dia), booleano, seleção e múltipla escolha. Ver `docs/integracao.md` §Filtro estruturado.
2. **LookupCombo** — Combobox (Command+Popover) + botão `...` abrindo Dialog de cadastro rápido; parametrizado por `kind` (19 usos).
3. **Blocos compartilhados** — `<EnderecoBlock>` (com busca CEP mockada) · `<ComunicadoresBlock>` (2 pares combo+texto) · `<RedesSociaisBlock>`. **`<TelefonesBlock>` saiu da lista (#186):** telefone não é mais bloco montado à mão — vem do `moduloContatos` do schema de módulos, que é quem sabe o prefixo de cada entidade (`foneComercial` na raiz do Cliente, `telefones.foneComercial` no Profissional). O componente existia sem consumidor e a lista o prometia como implementado.
4. **Form com abas** — shadcn Tabs + RHF, **1 form por tela** (não por aba), rodapé fixo Gravar/Cancelar.
5. **Janela de busca** — Dialog contendo a MESMA DataTable, com seleção e retorno.
6. **Grade no formulário** — TanStack Table + RHF `useFieldArray`, células editáveis, Incluir/Excluir linha.
7. Toda listagem: barra de ações padrão (Filtro · Incluir · Alterar · Consultar · Excluir/Cancelar · Imprimir) — componente único configurável.
8. `Ativo` checkbox em todo cadastro (desativação lógica — nunca "excluir" de verdade na UI de cadastros).
9. **View modes** (#86) — a MESMA `VitraDataTable` desenhada de outro jeito: props `visoes` (as alternativas; a tabela existe sempre e não entra na lista), `agrupamentos` e `visaoInicial`. A visão RECEBE as linhas e não consulta nada — é o que garante o "mesmo filtro" do padrão aprovado (core @decisoes, ponto 6). Visão que agrupa liga o `Agrupar por`; visão não-tabela pede o conjunto inteiro (`pageSize` no teto do contrato) e o rodapé DIZ quando o teto cortou — coluna montada com uma página é coluna falsa. Visão + agrupamento entram na consulta favorita. Piloto: o funil (`src/features/crm/pagina-do-funil.tsx`). Tela nova COMPÕE — não reimplementar alternador.

## Layout do repo
```
src/app/            # shell, providers, router, guarda de sessão
src/routes/         # rotas do TanStack Router (árvore gerada em src/routeTree.gen.ts)
src/components/ui/  # shadcn (gerado)
src/components/cabinet/  # DataTable, LookupCombo, blocos, ActionBar...
src/features/<tela>/   # fornecedor/, cliente/, produto/...
src/api/            # cliente.ts (configuração) + gerado/ (codegen — NÃO editar)
src/data/           # FRONTEIRA de dados: contrato, registry, adaptadores HTTP
src/mocks/          # dados fake tipados (só dado, sem acesso)
src/lib/            # utils, shortcuts, formatters (money, cnpj, date)
src/test/           # helpers de teste (renderRoute, renderWithQuery, instalarServidor)
contracts/openapi-v1.json  # CONTRATO — spec de entrada do backend, muda só por PR daqui
docs/integracao.md  # semânticas inegociáveis + estado da troca mock -> HTTP
```

**Regra de acesso a dado:** tela NUNCA importa `fetch*` de `src/mocks/` nem chama o cliente
gerado direto — pede a `data.<recurso>` (`src/data/index.ts`) ou ao hook da fronteira
(`useSessao`, `useLookupOptions`…). De `src/mocks/` só vêm **tipos** e **tabelas de apoio
estáticas**. Trocar mock→HTTP mexe em `src/data/`, não na tela.

**A entrada do registry tem a forma do que o CONTRATO oferece, não a que a tela gostaria.**
Produtos e parceiro expõem `list`/`get`/`empty` porque o contrato publica detalhe por id nos
dois (`GET /api/products/{id}` · `GET /api/partners/{id}`). A regra é sobre a ORIGEM de cada
método, não sobre o conjunto: **`get` só entra quando o caminho existe de verdade**, porque
`get` mock ao lado de listagem real casaria uuid do servidor com id inventado e responderia
"não encontrado" para registro que existe. Recurso ainda sem detalhe no contrato expõe
`list`/`empty` e a tela desabilita `Alterar`/`Consul.` — em branco é pior que indisponível.

**Regra de teste:** tela usa `renderRoute('/url')` (router real); componente isolado
usa `renderWithQuery(<X />)`. Ambos em `src/test/utils.tsx` — não recriar `setup()`
local com `createMemoryHistory`. Recurso HTTP se testa contra **servidor falso**
(`instalarServidor`/`json`/`problema` em `src/test/servidor.ts`), nunca com mock do módulo:
o cliente gerado chama `fetch(new Request(...))`, então **verbo e corpo vêm do `Request`** —
`init.method` dá sempre `GET`, e stub que casa só por caminho deixa `POST` cair na resposta
do `GET` e o teste passa sem asserir nada. Recurso mock segue travado por
`src/data/provider.test.ts`; os HTTP, por `src/data/<recurso>-api.test.ts`.

## Comandos
```
pnpm install
pnpm dev            # Vite (5173) — proxy /api e /auth -> VITE_API_PROXY (sem padrão)
pnpm check          # biome check --write
pnpm check-types    # tsc -b
pnpm test           # vitest run
pnpm build
pnpm codegen        # regera src/api/gerado/ a partir de contracts/openapi-v1.json
```

**Par local — PASSTHROUGH POR ROTA, não modo http global** (decisão do user, 2026-08-18):

```
pnpm dev                                          # mock puro — o padrão
VITE_API_PROXY=http://localhost:3000 pnpm dev     # backend real nas rotas que ele já serve
```

Sem a variável, o MSW responde tudo e nada sai da origem — é o modo de quem não subiu o backend
e o do site público. **Com ela, e só com ela**, as operações listadas em
`src/mocks/rotas-do-backend.ts` saem do mock e atravessam o proxy; todo o resto continua
mockado e a tela não sabe a diferença. Hoje passam 14 operações: `/health`, `/health/db`,
`/auth/*` (6), `GET /api/products` e `/api/partners` (5) — o que o `cabinet-erp-api` implementa
na `main` `246bf6f`. **Trocar `VITE_API_MODE` para `http` NÃO é a forma de falar com o backend:**
o que ele ainda não implementa responde **501**, e o toggle global entregaria vinte telas
quebradas para ganhar quatro integradas.

Uma variável governa as duas metades de propósito — o `vite.config.ts` a lê de `process.env`, o
`browser.ts` de `import.meta.env` (o Vite expõe ao cliente tudo que tem prefixo `VITE_`). Duas
chaves poderiam divergir, e a divergência é silenciosa: passthrough sem proxy faz `/api` cair no
fallback da SPA e a tela recebe `index.html` com status 200.

O proxy existe por causa do COOKIE (`cabinet_sessao`, sessão opaca): atravessando o Vite, `/api` e
`/auth` saem da MESMA origem da página e o cookie viaja sozinho — apontar o front direto para
:3000 tornaria tudo cross-origin e exigiria `SameSite=None; Secure` + CORS só em dev.
Com backend real o **autologin do mock não roda** (`VITE_MOCK_AUTOLOGIN` é ignorada): quem diz se
há sessão é o servidor, e semear o store abriria uma sessão que só existe no navegador.

**Ao acrescentar rota à lista, o par é obrigatório:** a operação existe no contrato (o teste
`src/mocks/rotas-do-backend.test.ts` falha se não existir) **e** o backend responde algo diferente
de 501. Rota adiantada é pior que ausente — o mock deixa de responder e a tela toma 501 sem
ninguém ter pedido. A lista é dívida deliberada: existe enquanto o contrato for maior que o
backend, e morre junto com o modo mock no dia em que as duas metades se encontrarem.

Variáveis documentadas em `.env.example` (copiar para `.env.local`, que é gitignored).

**Armadilha medida:** `pnpm check-types` (`tsc -b`) já passou verde com erro real de tipo,
reaproveitando build info. Quando a mudança mexe em assinatura de provider, conferir com
`npx tsc -p tsconfig.app.json --noEmit`. E **nunca filtrar a saída da suíte com `tail`** na
primeira rodada — redirecionar para arquivo, senão a falha some.

## Skills — situação → qual usar
Skills vivem em `~/.claude/skills/` (globais) e `.claude/skills/` (só `impeccable`, deste repo).
Disparam pela descrição, sem o user precisar digitar; `/nome` força.

| situação | skill |
|---|---|
| tela feia, layout/hierarquia/acessibilidade, fase de reface | `impeccable` |
| construir comportamento novo test-first (vitest + TL) | `tdd` |
| revisar o diff da branch antes de commitar | `code-review` |
| bug que resiste ao primeiro olhar, flake, regressão, lentidão | `diagnosing-bugs` |
| tocar o ticket já escrito de ponta a ponta | `implement` |
| dúvida de UI/estado que só se responde vendo rodar | `prototype` |
| ler doc externa (Tailwind v4, TanStack, shadcn) em fonte primária | `research` |
| conflito de merge/rebase **fora** de `src/api/gerado/` | `resolving-merge-conflicts` |

**Não usar aqui:** `to-spec`/`to-tickets`/`grill-with-docs`/`setup-matt-pocock-skills` — criam
estado local (`.scratch/`, `CONTEXT.md`, ADR) que duplicaria o tracker real, que é
`topicos/frente-visual.md` na memória. `domain-modeling` também não: nome de campo vem de
`transcricaosoftlux.md`, renomear conceito aqui é inventar campo. `wayfinder` é caro e o mapa
já existe (20 telas, 8 padrões). Conflito em `src/api/gerado/` se resolve com `pnpm codegen`,
nunca hunk a hunk.

## FECHAMENTO — obrigatório antes de encerrar QUALQUER sessão
1. `pnpm check` → zero erros. 2. `pnpm check-types` → zero erros. 3. `pnpm test` → verde (componente novo = teste novo mínimo: render + interação principal). 4. Mexeu no contrato? `pnpm codegen` e **commitar `src/api/gerado/`** — o CI tem passo `Codegen is up to date` e reprova o gerado velho. 5. Commit Conventional ≤50 char, foco no "porquê" — **adicionar por CAMINHO, nunca `git add -A`**: a árvore costuma ter trabalho de outro trilho não commitado. 6. Push → CI verde (`gh run watch`). CI vermelho = sessão não terminou. 7. **Registrar progresso em `topicos/frente-visual.md` da memória** (seção MEMÓRIA abaixo) — NUNCA tocar no `next-task.md` (é do trilho backend).

## REGRA DE OURO — N agentes no mesmo repo, zonas DISJUNTAS
Atualizada 2026-08-13 por decisão do user (`project-core` @regras) — **supersede "UM agente por
vez por repo"**. Paralelismo intra-repo está liberado, e as condições são TODAS obrigatórias:

1. **Worktree + branch própria por agente.** Ninguém trabalha na `main` direto.
2. **Zona de arquivos DISJUNTA, declarada no prompt.** Sair da zona → parar e registrar blocker.
   Worktree resolve CHECKOUT, não MERGE: o mesmo arquivo em duas branches dá o mesmo conflito de
   sempre. A divisão é por arquivo, não por assunto.
3. **Dono único de `package.json`/lockfile.** Dependência nova fora do dono → parar e registrar
   blocker, não instalar "só pra testar".
4. **Merge SERIAL na `main`** — e aqui a `main` deploya sozinha (`cabinetonline.cc`), então merge
   é publicação.
5. **Cada trilho escreve só no SEU arquivo de memória:** backend → `next-task.md` · visual →
   `topicos/frente-visual.md`. Handoff é a MEMÓRIA, nunca conversa colada.
6. **Enquanto um executor roda, o chat NÃO escreve na memória** (evita head divergente). Exceção:
   o user mandar.
7. **`next-task.md` VENCE o roteiro versionado** se os dois divergirem.

**Consequência prática para quem lê isto dentro de uma sessão:** a árvore pode ter trabalho de
outro agente em curso. Por isso o fechamento manda `git add` **por caminho** — `git add -A`
levaria junto a zona alheia. E `git status` sujo não é motivo para "limpar": é motivo para não
tocar no que não é seu.

**Antes de reservar tarefa:** `git branch -r --contains <oid>`. Worktree parada NÃO é trabalho em
curso — já houve tarefa reservada duas vezes para coisa que estava em `main`.

---

# MEMÓRIA — protocolo (repo projetos-claude)

## LEITURA — início de toda sessão
```bash
gh api graphql -f query='
query {
  repository(owner: "doutorferr0", name: "projetos-claude") {
    head: ref(qualifiedName: "refs/heads/main") { target { oid } }
    core:  object(expression: "main:projetosClaude/vertz-erp/project-core.md")  { ... on Blob { text } }
    state: object(expression: "main:projetosClaude/vertz-erp/current-state.md") { ... on Blob { text } }
    telas: object(expression: "main:projetosClaude/vertz-erp/topicos/transcricaosoftlux.md") { ... on Blob { text } }
    dash: object(expression: "main:projetosClaude/vertz-erp/topicos/dashboard.md") { ... on Blob { text } }
  }
}'
```
**O `frente-visual.md` NÃO vem por aqui — ele passou de 512 KB, e o `text` de `Blob` TRUNCA
nesse tamanho, sem erro e sem avisar.** Ler por ele e gravar por cima apaga a cauda do arquivo:
aconteceu **duas vezes em 16/08**, ~21 KB e ~29 KB de outras sessões perdidos, reparados em
`3142c69` e `18f7392`. O campo `isTruncated` existe no schema e ninguém o pedia. Leia pela API de
conteúdo, que não trunca:
```bash
gh api "repos/doutorferr0/projetos-claude/contents/projetosClaude/vertz-erp/topicos/frente-visual.md?ref=main" \
  --jq '.content' | base64 -d > /tmp/frente-visual.md
```
Guardar `head.target.oid`. Ecoar 2 linhas: `▸ Frente visual: <status do frente-visual.md>` · `▸ Próxima tarefa: <a colada pelo user>`.

**Sinal de arquivo íntegro:** termina em `<!-- /referencias-visuais -->`. Terminar no meio de uma
frase quer dizer que a cauda já foi comida — repare ANTES de escrever a sua rodada: ache
`atual[-400:]` dentro de um commit íntegro anterior (`gh api ...contents/...?ref=<sha>`), cole o
resto e confira `reparado.startswith(atual)`, para não desfazer o que os outros gravaram no meio.

**`topicos/dashboard.md` é a ESPECIFICAÇÃO da seção Dashboard** (páginas Dashboard e Planner):
diagramação e inventário de elementos, vindos de mockup aprovado. Está na leitura porque é a
fonte de campo/elemento dessas duas telas — o mesmo papel que `transcricaosoftlux.md` faz para as
20 telas transcritas, que não as cobrem. **É LEITURA, não escrita:** quem o mantém é o chat com o
user; o handoff dele passa só diagramação e elementos, e a decisão de componente, token e sidebar
é daqui. Progresso da implementação vai para `frente-visual.md`, como todo o resto.

## ESCRITA — fim de sessão (SÓ o tópico da frente visual)
Conteúdo COMPLETO novo de `/tmp/frente-visual.md` (estado por tarefa: feito · em curso · decisões · tentativas falhas "tentou X → falhou porque Y") →
```bash
gh api graphql -f query='
mutation($head: GitObjectID!, $vis: Base64String!) {
  createCommitOnBranch(input: {
    branch: { repositoryNameWithOwner: "doutorferr0/projetos-claude", branchName: "main" },
    expectedHeadOid: $head,
    message: { headline: "chore(vertz-erp): frente visual — <resumo>" },
    fileChanges: { additions: [
      { path: "projetosClaude/vertz-erp/topicos/frente-visual.md", contents: $vis }
    ]}
  }) { commit { oid } }
}' -f head="<oid>" -f vis="$(base64 -w0 /tmp/frente-visual.md)"
```
Head divergente (trilho backend commitou antes) → reler head, reaplicar, retry 1x.
**Conferir DEPOIS de gravar, e a régua é o tamanho:** o blob novo tem de crescer o tanto que
você inseriu (`byteSize` antes × depois). Cresceu menos = você comeu cauda alheia — repare na
hora. Comparar com `Blob { text }` não serve: ele volta truncado e acusa divergência falsa no
fim de um arquivo que está certo.
**PROIBIDO escrever em:** next-task.md, project-core.md, current-state.md, outros tópicos. Achou algo que pertence a eles → anotar no frente-visual.md em `## Para o hub` e o chat move depois.

## Regras de trabalho
- Decisão estrutural (router, dep nova fora da stack, padrão novo) → **propor antes**, 1 parágrafo com trade-off.
- Campo de tela: fonte é `transcricaosoftlux.md` — NÃO inventar campo. Exceção de origem, não de
  regra: Dashboard e Planner não estão na transcrição e vêm de `topicos/dashboard.md`. Tela fora
  das duas fontes = perguntar ao user, nunca inferir.
- Commits AQUI: git normal. Memória: gh api. NÃO confundir.
- Empacou → registrar erro literal em frente-visual.md `## Blockers` e parar. Nunca fingir sucesso.

## Site demo público — COMO PUBLICAR (regra simples)
- **https://cabinetonline.cc** publica AUTOMATICAMENTE da **`main`**: todo merge/push na `main` com CI verde está no ar em ~2 min. Não existe passo manual de deploy.
- Mecânica: Cloudflare Pages (projeto `cabinet-erp-web`) conectado ao GitHub; build `pnpm build` roda nos servidores da Cloudflare com env fixadas no painel (modo mock + credencial demo). O que é servido = `dist/` buildado, nunca o fonte.
- Push em QUALQUER outra branch → preview isolado com URL própria (aba Deployments no painel, ou status do commit no GitHub). Use pra mostrar trabalho em andamento.
- Branch `demo-site` é LEGADO (foi a branch de publicação até 2026-08-06). Não publicar por ela.
- Login do demo: `demo@vertziluminacao.com.br` / `senha1234` (gate só existe no build com as env; dev/testes não mudam).
