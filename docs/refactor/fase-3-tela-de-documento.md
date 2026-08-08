# Fase 3 — `<TelaDeDocumento>`

## Problema

`src/routes/vendas/orcamentos/$orcamentoId.tsx`, `src/routes/compras/ordens/$ordemId.tsx` e
`src/routes/compras/pedidos/$pedidoId.tsx` (49 linhas cada) diferem em 3 linhas: nome da rota, a
chave/provider (`data.orcamentos` vs `data.ordensCompra` vs `data.pedidosCompra`) e o texto de
"não encontrado". O resto — `useParams`, `isConsulta`, `isNovo`, `useQuery` com
`empty(Date.now() % 100000)`/`get(id, 0)`, skeleton (`h-8 w-64` + `h-64 w-full`),
`DocumentoHeader` — é idêntico.

## Reuso

- `validateModoSearch`/`isConsulta` — `src/lib/modo-consulta.ts` (já existe, não mexer).
- `DocumentoHeader` — `src/components/cabinet/documento.tsx` (já existe, não mexer).
- `ResourceProvider<T>` — o tipo já declarado em `src/data/provider.ts`; `data.orcamentos`,
  `data.ordensCompra`, `data.pedidosCompra` já o implementam (`get(id, delay)` +
  `empty(seed)`), então o componente novo pode receber o provider inteiro sem reinventar shape.

## Implementação

Componente novo em `src/components/cabinet/tela-de-documento.tsx`:

```tsx
import { DocumentoHeader } from '@/components/cabinet/documento'
import { Skeleton } from '@/components/ui/skeleton'
import type { ResourceProvider } from '@/data/provider'
import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'

export interface TelaDeDocumentoProps<T> {
  provider: ResourceProvider<T>
  /** Prefixo da query key (ex.: 'orcamento', 'ordem-compra', 'pedido-compra'). */
  queryKeyBase: string
  /** Valor cru do param de rota — 'novo' ou o id numérico como string. */
  idParam: string
  titulo: string
  modo?: string | undefined
  numero: (doc: T) => string | number | undefined
  naoEncontrado: string
  children: (doc: T) => ReactNode
}

export function TelaDeDocumento<T>({
  provider,
  queryKeyBase,
  idParam,
  titulo,
  modo,
  numero,
  naoEncontrado,
  children,
}: TelaDeDocumentoProps<T>) {
  const isNovo = idParam === 'novo'
  const id = Number(idParam)

  const query = useQuery({
    queryKey: [queryKeyBase, idParam],
    queryFn: () => (isNovo ? provider.empty(Date.now() % 100000) : provider.get(id, 0)),
  })

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!query.data) {
    return <p className="text-muted-foreground">{naoEncontrado}</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <DocumentoHeader titulo={titulo} {...(modo ? { modo } : {})} numero={isNovo ? undefined : numero(query.data)} />
      {children(query.data)}
    </div>
  )
}
```

Cada rota fica (exemplo Orçamento):

```tsx
import { TelaDeDocumento } from '@/components/cabinet/tela-de-documento'
import { data } from '@/data'
import { OrcamentoForm } from '@/features/orcamento/orcamento-form'
import { isConsulta, validateModoSearch } from '@/lib/modo-consulta'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/vendas/orcamentos/$orcamentoId')({
  component: OrcamentoEditPage,
  validateSearch: validateModoSearch,
})

function OrcamentoEditPage() {
  const { orcamentoId } = Route.useParams()
  const readOnly = isConsulta(Route.useSearch())
  return (
    <TelaDeDocumento
      provider={data.orcamentos}
      queryKeyBase="orcamento"
      idParam={orcamentoId}
      titulo="Orçamento"
      modo={readOnly ? 'Consulta' : orcamentoId === 'novo' ? 'Incluir' : undefined}
      numero={(o) => o.numero}
      naoEncontrado="Orçamento não encontrado."
    >
      {(orcamento) => <OrcamentoForm orcamento={orcamento} readOnly={readOnly} />}
    </TelaDeDocumento>
  )
}
```

Repetir para `$ordemId.tsx` (`data.ordensCompra`, "Ordem de Compra", `numero={(o) => o.codigo}`,
"Ordem de compra não encontrada.") e `$pedidoId.tsx` (`data.pedidosCompra`, "Pedido de Compra",
`numero={(p) => p.codigo}`, "Pedido de compra não encontrado."). **Copiar o texto de "não
encontrado" literal de cada arquivo atual** — não uniformizar a redação.

## Verificação

- As 3 rotas já têm teste (`renderRoute` em `orcamento-form.test.tsx`,
  `ordem-compra-form.test.tsx`, `pedido-compra-form.test.tsx`, que montam a rota, não só o form —
  conferir se batem contra o texto de "não encontrado" e o número no header).
- Visual: comparar screenshot de `/vendas/orcamentos/novo`, `/compras/ordens/1`,
  `/compras/pedidos/1` contra a Fase 0 — devem ser pixel-idênticos.
- `pnpm check-types` — atenção à assinatura genérica de `TelaDeDocumento<T>`; se o `tsc -b`
  passar verde suspeitosamente rápido, rodar `npx tsc -p tsconfig.app.json --noEmit` (armadilha do
  CLAUDE.md).

## Critério de saída

3 rotas de ~49 linhas caem para ~20 cada. Commit: `refactor: extrai TelaDeDocumento`.
