# CLAUDE.md — vitra-erp-web

Orientação para o agente (claude ou kimi) neste repositório. Ler antes de qualquer tarefa.
Este repo = **front do VITRA** (React SPA). Backend = `doutorferr0/vitra-erp-py` (NUNCA commitar lá; em Etapa 0, paralelo a este trilho). Memória compartilhada = `doutorferr0/projetos-claude` → `projetosClaude/vertz-erp`.

## Estilo de comunicação
PT-BR. Comprimir prosa, nunca substância. Cortar filler/cordialidade/preâmbulo. Preservar raciocínio de decisão, trade-offs, causalidade. Não inventar dado — falta = "sem dado". Revisão começa por problemas. Responder só o perguntado.

## REGRA DA FASE — MOCK ONLY (inegociável)
O backend ainda não publicou contrato. Portanto:
- **TODA tela usa dados mock tipados** em `src/mocks/`, espelhando os campos LITERAIS de `topicos/transcricaosoftlux.md` da memória (ler o tópico ao modelar cada tela).
- **PROIBIDO:** inventar chamada HTTP, inventar shape de API, instalar cliente de API, "deixar pronto" endpoint imaginário. Os tipos reais virão do codegen `@hey-api/openapi-ts` quando a Etapa 0 do backend publicar o OpenAPI (passo 9). Estruturar os mocks atrás de uma interface de provider (troca limpa depois).
- Formulários validam com Zod local (marcar `// TODO(contract):` onde o Zod do codegen substituirá).

## Stack (decidida — NÃO trocar sem confirmação do user)
- **Vite + React 19 + TypeScript strict** · SPA
- **Tailwind v4 + shadcn/ui** (copy-paste, sem runtime dep de UI kit)
- **TanStack Query v5** (estado servidor — na fase mock, simula latência) · **TanStack Table v8** · **TanStack Router** (proposta desta fase; user pode vetar → alternativa react-router)
- **react-hook-form + Zod 4**
- **pnpm** com `minimumReleaseAge: 10080` (7d) no workspace — OBRIGATÓRIO, pós supply-chain. **Biome** (lint+format) · **vitest** + Testing Library
- **Vetos:** Redux · axios · styled-components · MUI/Antd/UI-kits de runtime · form-generator declarativo · SheetJS (`xlsx` npm) · float p/ dinheiro
- Referência visual/estrutural: shadcn/ui docs · Kiranism next-shadcn-dashboard-starter (SÓ como referência de DataTable/layout — é Next, aqui é Vite: adaptar, não copiar rotas/SSR)

## Convenções
- **Dinheiro:** trafega em **centavos (int)**; formatar R$ só na borda de exibição (`Intl.NumberFormat('pt-BR')`). NUNCA float em estado/mock.
- **Quantidade:** até 3 casas. **Datas:** ISO nos dados, exibição pt-BR. **CNPJ/CPF:** sem máscara no dado, máscara só no input.
- **Atalhos — interface por clique** (decisão do user, 30/07/2026): toda ação é alcançável por mouse e nenhum fluxo depende de tecla memorizada. Navegação em formulário é a nativa do browser (Tab / Shift+Tab, Enter no controle focado). **NÃO criar atalho customizado novo.** Os que já existem em `src/lib/shortcuts.ts` (`Ctrl+K` busca · `Alt+N` incluir · `Alt+P/A/T/I` nos documentos) ficam como conveniência, não como requisito — não removê-los, não expandi-los, não desenhar tela que só funcione por eles. F3–F6 continuam proibidos (conflito com browser).
- Componentes compartilhados moram em `src/components/vitra/` (DataTable, LookupCombo, blocos) — telas só COMPÕEM, não reimplementam.
- Acessibilidade mínima: label em todo campo, foco visível, dialog com focus-trap (shadcn já dá).

## Os padrões a construir (fonte: transcricaosoftlux @padroes — 8 padrões, 20 telas)
1. **DataTable server-ready** — busca, ordenação, paginação com estado tipado `{q, sort, page, pageSize}` COMO SE fosse servidor (provider mock aplica). É o coração: 8+ telas usam.
2. **LookupCombo** — Combobox (Command+Popover) + botão `...` abrindo Dialog de cadastro rápido; parametrizado por `kind` (19 usos).
3. **Blocos compartilhados** — `<EnderecoBlock>` (com busca CEP mockada) · `<TelefonesBlock>` · `<ComunicadoresBlock>` (2 pares combo+texto) · `<RedesSociaisBlock>`.
4. **Form com abas** — shadcn Tabs + RHF, **1 form por tela** (não por aba), rodapé fixo Gravar/Cancelar.
5. **Janela de busca** — Dialog contendo a MESMA DataTable, com seleção e retorno.
6. **Grade no formulário** — TanStack Table + RHF `useFieldArray`, células editáveis, Incluir/Excluir linha.
7. Toda listagem: barra de ações padrão (Filtro · Incluir · Alterar · Consultar · Excluir/Cancelar · Imprimir) — componente único configurável.
8. `Ativo` checkbox em todo cadastro (desativação lógica — nunca "excluir" de verdade na UI de cadastros).

## Layout do repo
```
src/app/            # shell, providers, router
src/components/ui/  # shadcn (gerado)
src/components/vitra/  # DataTable, LookupCombo, blocos, ActionBar...
src/features/<tela>/   # fornecedor/, cliente/, produto/...
src/data/           # FRONTEIRA de dados: contrato + registry de providers
src/mocks/          # dados fake tipados (só dado, sem acesso)
src/lib/            # utils, shortcuts, formatters (money, cnpj, date)
src/test/           # helpers de teste (renderRoute, renderWithQuery)
docs/integracao.md  # roteiro da troca mock -> API
```

**Regra de acesso a dado:** tela NUNCA importa `fetch*` de `src/mocks/` — pede a
`data.<recurso>.list/get/empty` (`src/data/index.ts`). De `src/mocks/` só vêm
**tipos** e **tabelas de apoio estáticas**. Na integração, só `src/data/index.ts`
muda. Contrato travado por `src/data/provider.test.ts`.

**Regra de teste:** tela usa `renderRoute('/url')` (router real); componente isolado
usa `renderWithQuery(<X />)`. Ambos em `src/test/utils.tsx` — não recriar `setup()`
local com `createMemoryHistory`.

## Comandos
```
pnpm install
pnpm dev            # Vite (porta 5173)
pnpm check          # biome check --write
pnpm check-types    # tsc --noEmit
pnpm test           # vitest run
pnpm build
```

## FECHAMENTO — obrigatório antes de encerrar QUALQUER sessão
1. `pnpm check` → zero erros. 2. `pnpm check-types` → zero erros. 3. `pnpm test` → verde (componente novo = teste novo mínimo: render + interação principal). 4. Commit Conventional ≤50 char, foco no "porquê". 5. Push → CI verde (`gh run watch`). CI vermelho = sessão não terminou. 6. **Registrar progresso em `topicos/frente-visual.md` da memória** (seção MEMÓRIA abaixo) — NUNCA tocar no `next-task.md` (é do trilho backend).

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
