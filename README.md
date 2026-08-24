# Cabinet — Front (cabinet-erp-web)

SPA React do Cabinet (ERP multi-empresa vendido a terceiros). **O front é o dono do
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

## Rodar em mock (padrão do dev)

```bash
pnpm dev                          # entra direto no app, sem passar pelo login
VITE_MOCK_AUTOLOGIN=0 pnpm dev    # nasce deslogado: tela de login → home
```

Sem `VITE_API_MODE`, o `pnpm dev` sobe em **mock**: o MSW (`src/mocks/api`)
responde `/api` e `/auth` dentro do browser, com as semânticas do contrato sobre
um store em memória — duas empresas, produtos, parceiros e lookups no seed.

O **autologin** vem ligado: o store nasce com a sessão aberta (colaborador
admin, os dois vínculos, a primeira empresa como ativa), então `pnpm dev` cai
numa tela do sistema em vez da tela de login. A autorização não é afrouxada — a
guarda continua exigindo o `200` do `/auth/me`; o que muda é o mock ter uma
sessão para devolver. `VITE_MOCK_AUTOLOGIN=0` devolve o `401` e o fluxo de login
inteiro (senha `errada` → 401 de teste; senha `temporaria` → troca obrigatória).

A chave vale **só no modo mock**: ela mora em `src/mocks/browser.ts`, que só é
importado quando o modo está ligado — com API de verdade (`VITE_API_MODE=http`)
não há o que semear.

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

## Onde isto vai parar — a `main` publica DOIS sites

| destino | projeto Cloudflare Pages | env do build |
|---|---|---|
| **https://cabinetonline.cc** — vitrine em mock, credencial única de demonstração | `cabinet-erp-web` | `VITE_API_MODE=mock` + `VITE_DEMO_USER`/`VITE_DEMO_PASS` |
| **https://app.cabinetonline.cc** — o produto, contra `api.cabinetonline.cc` | `cabinet-erp-app` | `VITE_API_URL=https://api.cabinetonline.cc`, sem env de demo |

Os dois saem do MESMO push: merge na `main` builda os dois projetos em paralelo e vai ao ar em
~2 min, sem passo manual. Por isso **merge é publicação em produção real**, não atualização de
demo — e a Cloudflare não espera pelo CI. Regra completa, armadilhas e o que o `app.` mostra de
dado ainda mockado: **CLAUDE.md § PUBLICAÇÃO**.
