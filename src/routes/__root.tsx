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
  //
  // As DUAS do ciclo da credencial entram na mesma exceção, e pelo motivo mais
  // forte ainda: quem as abre não tem senha — é o convidado que nunca entrou ou
  // quem perdeu a que tinha. Uma guarda aqui mandaria para o login exatamente
  // quem veio buscar como fazer login. Em `/definir-senha` a autenticação é o
  // TOKEN da barra de endereço, e ele vale uma vez.
  if (pathname === '/login' || pathname === '/esqueci-senha' || pathname === '/definir-senha') {
    return <Outlet />
  }

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
