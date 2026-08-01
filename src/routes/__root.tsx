import { RequireSession } from '@/app/require-session'
import { RequireTenant } from '@/app/require-tenant'
import { AppShell } from '@/app/shell'
import { Outlet, createRootRoute, useRouterState } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  // Login é a porta de entrada, não uma tela do sistema: sem shell (não há
  // módulo para navegar) e sem guarda (é ele quem cria a sessão).
  if (pathname === '/login') return <Outlet />

  // Troca de senha: exige sessão (o endpoint responde 401 sem ela) mas ainda
  // não entra no shell — quem troca a senha provisória não tem sistema para
  // navegar antes de terminar. É a ÚNICA rota que a guarda deixa entrar com
  // senha provisória: sem a exceção, ela mandaria para cá quem já está aqui.
  if (pathname === '/trocar-senha') {
    return (
      <RequireSession permiteSenhaProvisoria>
        <Outlet />
      </RequireSession>
    )
  }

  return (
    <RequireSession>
      {/* Sessão sem empresa ativa não entra: a escolha acontece antes do shell. */}
      <RequireTenant>
        <AppShell>
          <Outlet />
        </AppShell>
      </RequireTenant>
    </RequireSession>
  )
}
