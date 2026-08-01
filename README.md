# VITRA — Front (vitra-erp-web)

SPA React do VITRA (ERP multi-empresa vendido a terceiros). **Fase atual: integração incremental** — o backend é o
[`vitra-erp-dotnet`](https://github.com/doutorferr0/vitra-erp-dotnet), cujo
OpenAPI versionado em `contracts/openapi-v1.json` gera os tipos com
`@hey-api/openapi-ts`. Fronteiras já contratadas usam a API; as demais seguem em
mock até o contrato correspondente ser publicado.

Instruções dos agentes: **CLAUDE.md** (AGENTS.md aponta pra lá). Roteiro: **docs/fase-visual-tarefas.md**.
Fonte dos campos das telas: memória `projetos-claude` → `topicos/transcricaosoftlux.md` (20 telas do legado, 8 padrões).

Stack: Vite · React 19 · TS strict · Tailwind v4 · shadcn/ui · TanStack Query/Table/Router · RHF+Zod · pnpm (cooldown 7d) · Biome · vitest.

```bash
pnpm install && pnpm dev   # http://localhost:5173
pnpm check && pnpm check-types && pnpm test
```

## Rodar com o backend

```bash
dotnet run --project src/Vitra.Api   # no vitra-erp-dotnet → :5199
pnpm dev                             # aqui → :5173, com proxy para :5199
```

`pnpm dev` desvia `/api` e `/auth` para `http://localhost:5199` (proxy no
`vite.config.ts`). Assim o front roda **mesma origem** e o cookie de sessão viaja
sem `SameSite=None` nem CORS; não é preciso `.env` nem `VITE_API_URL`.

```bash
VITE_API_PROXY=http://localhost:5000 pnpm dev   # backend em outra porta/host
```

Sem o backend no ar, as telas já ligadas (login, seletor de empresa, produtos)
mostram o estado de falha — que é o comportamento correto, não um bug.
