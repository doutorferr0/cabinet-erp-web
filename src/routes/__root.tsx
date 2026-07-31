import { RequireSession } from '@/app/require-session'
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

  return (
    <RequireSession>
      <AppShell>
        <Outlet />
      </AppShell>
    </RequireSession>
  )
}
