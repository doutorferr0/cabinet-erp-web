import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useSessao } from '@/data/sessao'
import { Navigate } from '@tanstack/react-router'

/**
 * Guarda de sessão: nenhuma tela do sistema renderiza sem `/auth/me`.
 *
 * - esperando → folha de skeleton (5 linhas, nunca spinner — DESIGN.md);
 * - `null` (401) → `/login`;
 * - erro de verdade (rede, 5xx) → aviso com nova tentativa, NÃO redirect:
 *   mandar para o login com o servidor fora criaria um ciclo que não entra.
 */
export function RequireSession({ children }: { children: React.ReactNode }) {
  const sessao = useSessao()

  if (sessao.isPending) {
    return (
      <div className="flex min-h-screen bg-background p-4">
        <div className="flex flex-1 flex-col gap-3 rounded-lg border bg-card p-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    )
  }

  if (sessao.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="flex w-full max-w-sm flex-col gap-3 rounded-lg border bg-card p-4">
          <p className="text-sm">Não foi possível falar com o servidor.</p>
          <Button variant="outline" onClick={() => sessao.refetch()}>
            Tentar de novo
          </Button>
        </div>
      </div>
    )
  }

  if (sessao.data === null) return <Navigate to="/login" />

  return children
}
