# CLAUDE.md — cabinet-erp-web

Orientação para o agente (claude ou kimi) neste repositório. Ler antes de qualquer tarefa.
Este repo = **front do Cabinet** (React SPA) e **dono do contrato** (`contracts/openapi-v1.json`). O backend é trilho de outro desenvolvedor e ainda não existe — não há repositório de servidor a consultar. Memória compartilhada = `doutorferr0/projetos-claude` → `projetosClaude/vertz-erp`.

## Estilo de comunicação
PT-BR. Comprimir prosa, nunca substância. Cortar filler/cordialidade/preâmbulo. Preservar raciocínio de decisão, trade-offs, causalidade. Não inventar dado — falta = "sem dado". Revisão começa por problemas. Responder só o perguntado.

## REGRA DA FASE — O FRONT É O DONO DO CONTRATO (inegociável)
**A fase mock ACABOU e o contrato não vem mais de fora.** `contracts/openapi-v1.json` é a
especificação de **entrada** que o backend precisa implementar, não cópia que o front recebe.

- **Contrato muda SÓ por PR neste repositório.** Caminho novo definido pelo front, antes de
  existir servidor, entra marcado **`Proposto`** — o leitor precisa distinguir o que já foi
  implementado do que é pedido. Não há repo de backend para conferir contra.
- **Já é HTTP:** sessão (`/auth/*`), listas de apoio (`/api/catalog-lookups`), produtos e
  variantes (`/api/products`, `…/variants`) e os três papéis de parceiro — cliente, fornecedor,
  profissional (`/api/partners`, filtro `role`). Ver `docs/integracao.md`.
- **Ainda mock:** colaborador, orçamento, pedido de compra, ordem de compra, cidades, boletim
  — **por falta de caminho no contrato, não por escolha.** Esses seguem a regra antiga: dados
  tipados em `src/mocks/`, campos LITERAIS de `topicos/transcricaosoftlux.md` da memória.
- **PROIBIDO continua:** inventar chamada HTTP, inventar shape de API sem passar pelo contrato,
  escrever à mão tipo que o contrato define. Todo tipo de servidor vem do codegen —
  `pnpm codegen` (`@hey-api/openapi-ts`), saída em `src/api/gerado/`, **commitada**, com
  `@ts-nocheck` posto pelo passo pós-codegen. **Nunca editar `src/api/gerado/` à mão**;
  conflito de merge nele se resolve rodando o codegen.
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
- **`@hey-api/openapi-ts`** (codegen do contrato) · cliente em `src/api/cliente.ts` (`fetch`, `credentials: 'include'` — a sessão é cookie opaco)
- **react-hook-form + Zod 4**
- **pnpm** com `minimumReleaseAge: 10080` (7d) no workspace — OBRIGATÓRIO, pós supply-chain. **Biome** (lint+format) · **vitest** + Testing Library
- **Vetos:** Redux · axios · styled-components · MUI/Antd/UI-kits de runtime · form-generator declarativo · SheetJS (`xlsx` npm) · float p/ dinheiro
- Referência visual/estrutural: shadcn/ui docs · Kiranism next-shadcn-dashboard-starter (SÓ como referência de DataTable/layout — é Next, aqui é Vite: adaptar, não copiar rotas/SSR)

## Convenções
- **Dinheiro:** trafega em **centavos (int)**; formatar R$ só na borda de exibição (`Intl.NumberFormat('pt-BR')`). NUNCA float em estado/mock.
- **Quantidade:** até 3 casas. **Datas:** ISO nos dados, exibição pt-BR. **CNPJ/CPF:** sem máscara no dado, máscara só no input.
- **Atalhos — interface por clique** (decisão do user, 30/07/2026): toda ação é alcançável por mouse e nenhum fluxo depende de tecla memorizada. Navegação em formulário é a nativa do browser (Tab / Shift+Tab, Enter no controle focado). **NÃO criar atalho customizado novo.** Os que já existem em `src/lib/shortcuts.ts` (`Ctrl+K` busca · `Alt+N` incluir · `Alt+P/A/T/I` nos documentos) ficam como conveniência, não como requisito — não removê-los, não expandi-los, não desenhar tela que só funcione por eles. F3–F6 continuam proibidos (conflito com browser).
- Componentes compartilhados moram em `src/components/cabinet/` (DataTable, LookupCombo, blocos) — telas só COMPÕEM, não reimplementam.
- Acessibilidade mínima: label em todo campo, foco visível, dialog com focus-trap (shadcn já dá).

## Os 8 padrões — JÁ IMPLEMENTADOS, tela nova COMPÕE (fonte: transcricaosoftlux @padroes, 20 telas)
1. **DataTable server-ready** — busca, ordenação, paginação com estado tipado `{q, sort, page, pageSize}`. Nos recursos HTTP quem aplica é o backend; nos mock, o provider. É o coração: 8+ telas usam. Coluna que ordena usa `accessorKey` **em inglês**, o nome que a whitelist de `sortBy` do servidor aceita — traduzir quebra a ordenação com 400 só ao clicar no cabeçalho.
2. **LookupCombo** — Combobox (Command+Popover) + botão `...` abrindo Dialog de cadastro rápido; parametrizado por `kind` (19 usos).
3. **Blocos compartilhados** — `<EnderecoBlock>` (com busca CEP mockada) · `<TelefonesBlock>` · `<ComunicadoresBlock>` (2 pares combo+texto) · `<RedesSociaisBlock>`.
4. **Form com abas** — shadcn Tabs + RHF, **1 form por tela** (não por aba), rodapé fixo Gravar/Cancelar.
5. **Janela de busca** — Dialog contendo a MESMA DataTable, com seleção e retorno.
6. **Grade no formulário** — TanStack Table + RHF `useFieldArray`, células editáveis, Incluir/Excluir linha.
7. Toda listagem: barra de ações padrão (Filtro · Incluir · Alterar · Consultar · Excluir/Cancelar · Imprimir) — componente único configurável.
8. `Ativo` checkbox em todo cadastro (desativação lógica — nunca "excluir" de verdade na UI de cadastros).

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
Produtos expõe `list`/`get`/`empty` porque há detalhe por id; parceiro expõe `list`/`empty`
porque **não existe `GET /api/partners/{id}`**. `get` mock ao lado de listagem real casaria
uuid do servidor com id inventado e responderia "não encontrado" para registro que existe.

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

**Par local:** front em 5173 + o que quer que implemente o contrato, no endereço de
`VITE_API_PROXY` — **não há porta padrão**, porque não há servidor canônico para chutar. Sem a
variável o desvio não é montado. O proxy existe por causa do COOKIE (sessão opaca): apontar
direto para a porta do backend tornaria tudo cross-origin e exigiria `SameSite=None; Secure` só
em dev. O mecanismo é a metade `http` do toggle previsto `VITE_API_MODE=mock|http`.

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
    visual: object(expression: "main:projetosClaude/vertz-erp/topicos/frente-visual.md") { ... on Blob { text } }
    telas: object(expression: "main:projetosClaude/vertz-erp/topicos/transcricaosoftlux.md") { ... on Blob { text } }
  }
}'
```
Guardar `head.target.oid`. Ecoar 2 linhas: `▸ Frente visual: <status do frente-visual.md>` · `▸ Próxima tarefa: <a colada pelo user>`.

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
**PROIBIDO escrever em:** next-task.md, project-core.md, current-state.md, outros tópicos. Achou algo que pertence a eles → anotar no frente-visual.md em `## Para o hub` e o chat move depois.

## Regras de trabalho
- Decisão estrutural (router, dep nova fora da stack, padrão novo) → **propor antes**, 1 parágrafo com trade-off.
- Campo de tela: fonte é `transcricaosoftlux.md` — NÃO inventar campo.
- Commits AQUI: git normal. Memória: gh api. NÃO confundir.
- Empacou → registrar erro literal em frente-visual.md `## Blockers` e parar. Nunca fingir sucesso.
