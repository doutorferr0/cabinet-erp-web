# Fase 2 — `LayoutDeModulo`

## Problema

`src/routes/cadastros.tsx`, `vendas.tsx`, `compras.tsx`, `estoque.tsx` são idênticos byte a byte
(só a redação do comentário difere entre `cadastros.tsx` e os outros três):

```tsx
import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/compras')({
  component: ComprasLayout,
})

function ComprasLayout() {
  return (
    <div className="flex flex-col gap-4">
      <Outlet />
    </div>
  )
}
```

O comentário (por que não há `<h1>` de módulo — a `BandaDeIdentidade` da tela já é o cabeçalho de
nível 1, e o menu lateral já marca a rota ativa) é a única informação que vale a pena preservar.

## Implementação

Componente novo em `src/app/layout-de-modulo.tsx`:

```tsx
import { Outlet } from '@tanstack/react-router'

/**
 * Layout comum aos módulos de rota (Cadastros, Vendas, Compras, Estoque).
 *
 * Sem `<h1>` de módulo: a banda de identidade da tela já é o cabeçalho de nível 1
 * da página, e quem diz em que módulo se está é o menu lateral, que marca a rota
 * ativa. Dois `<h1>` na mesma página era o efeito colateral.
 */
export function LayoutDeModulo() {
  return (
    <div className="flex flex-col gap-4">
      <Outlet />
    </div>
  )
}
```

Cada uma das 4 rotas fica:

```tsx
import { LayoutDeModulo } from '@/app/layout-de-modulo'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/compras')({
  component: LayoutDeModulo,
})
```

## Verificação

- `pnpm check-types` — o `createFileRoute` aceita `component` como referência de função direta
  (já é o padrão usado em outras rotas do repo).
- `pnpm test` verde.
- Visual: as 4 rotas de módulo continuam renderizando idêntico (é literalmente o mesmo JSX).
- `pnpm dev` uma vez depois de adicionar/mudar rota, por causa da armadilha do `routeTree.gen.ts`
  registrada no CLAUDE.md (`pnpm build` não regenera a árvore sozinho).

## Critério de saída

Os 4 arquivos de rota caem para ~6 linhas cada (import + `createFileRoute`). `LayoutDeModulo`
concentra o comentário de decisão uma vez. Commit: `refactor: unifica layout de módulo`.
