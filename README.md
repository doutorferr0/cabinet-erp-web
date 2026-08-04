# VITRA — Front (vitra-erp-web)

SPA React do VITRA (ERP multi-empresa vendido a terceiros). **O front é o dono do
contrato:** `contracts/openapi-v1.json` é a especificação que o backend precisa
implementar, e é dela que `@hey-api/openapi-ts` gera os tipos. As fronteiras já
descritas no contrato consomem HTTP; as demais seguem em mock até ganharem
caminho no contrato. Ver **docs/integracao.md**.

Instruções dos agentes: **CLAUDE.md** (AGENTS.md aponta pra lá). Roteiro: **docs/fase-visual-tarefas.md**.
Fonte dos campos das telas: memória `projetos-claude` → `topicos/transcricaosoftlux.md` (20 telas do legado, 8 padrões).

Stack: Vite · React 19 · TS strict · Tailwind v4 · shadcn/ui · TanStack Query/Table/Router · RHF+Zod · pnpm (cooldown 7d) · Biome · vitest.

```bash
pnpm install && pnpm dev   # http://localhost:5173
pnpm check && pnpm check-types && pnpm test
```

## Rodar com um backend

```bash
VITE_API_PROXY=http://localhost:3000 pnpm dev   # endereço de quem implementa o contrato
```

`VITE_API_PROXY` é a **única** fonte do endereço — não há porta padrão, porque não
há servidor canônico para chutar. Com ela, `pnpm dev` desvia `/api` e `/auth` para
lá (proxy no `vite.config.ts`): o front roda **mesma origem** e o cookie de sessão
viaja sem `SameSite=None` nem CORS, dispensando `.env` e `VITE_API_URL`.

Sem a variável o desvio não é montado. As telas já ligadas (login, seletor de
empresa, produtos, parceiros) mostram o estado de falha — que é o comportamento
correto, não um bug.
