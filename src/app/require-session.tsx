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
 * - senha provisória (`mustChangePassword`) → `/trocar-senha`.
 *
 * ## Por que a senha provisória é assunto da GUARDA
 *
 * O login já mandava para `/trocar-senha` quando o `POST /auth/login` respondia
 * `mustChangePassword: true` — mas quem fechasse a aba e voltasse com o cookie
 * vivo entrava direto na tela. Só na tela: o middleware do backend sempre
 * recusou tudo com `403` (`type: .../senha-temporaria`), então o sistema
 * aparecia inteiro e nada funcionava. Era defeito de UX, não de trava.
 *
 * O flag passou a vir no `/auth/me` (backend `#31`), e é lido da CREDENCIAL a
 * cada requisição — nunca de cópia na sessão, que envelheceria e mandaria
 * trocar senha já trocada até a sessão expirar.
 */
export function RequireSession({
  children,
  /**
   * Deixa passar a sessão de senha provisória. Só a rota `/trocar-senha` liga
   * isto: sem a exceção, a guarda mandaria para `/trocar-senha` a tela que É a
   * troca de senha — laço de redirecionamento em vez de tela.
   */
  permiteSenhaProvisoria = false,
}: { children: React.ReactNode; permiteSenhaProvisoria?: boolean }) {
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

  if (sessao.data.mustChangePassword && !permiteSenhaProvisoria) {
    return <Navigate to="/trocar-senha" />
  }

  return children
}
