import { RequireSession } from '@/app/require-session'
import { RequireTenant } from '@/app/require-tenant'
import { AppShell } from '@/app/shell'
import { ligarTransicaoDeRota } from '@/app/transicao-de-rota'
import { Outlet, createRootRoute, useRouter, useRouterState } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createRootRoute({
  component: RootComponent,
})

/**
 * OVERLAY DE GRADE — `?grid` na URL (§Hierarquia, #469).
 *
 * A régua manda toda captura de PR de tela vir com a grade de 8px por cima,
 * provando alinhamento em múltiplos de 4. Ela liga por PARÂMETRO e não por
 * atalho de teclado (a decisão de 30/07 proíbe atalho novo) nem por botão na
 * casca (é ferramenta de quem desenha, não do operador).
 *
 * **Só em dev, e o `import()` é a razão de ser assim.** O CSS entra por import
 * dinâmico, então em produção ele não é nem baixado — o `import.meta.env.DEV`
 * poda a chamada inteira no build. Fixar o `data-grid` sem carregar o CSS não
 * pintaria nada, e é por isso que os dois andam na mesma linha.
 *
 * O atributo fica no `<html>` porque o overlay é um `::after` do `body` em
 * posição fixa: preso a um nó da árvore do router, ele rolaria com o conteúdo.
 */
function useOverlayDeGrade(busca: string) {
  const ligado = import.meta.env.DEV && new URLSearchParams(busca).has('grid')

  useEffect(() => {
    if (!ligado) {
      delete document.documentElement.dataset.grid
      return
    }
    // O import é idempotente: o Vite guarda o módulo, então voltar a ligar não
    // rebaixa o CSS de novo.
    void import('@/styles/grid.css')
    document.documentElement.dataset.grid = ''
    return () => {
      delete document.documentElement.dataset.grid
    }
  }, [ligado])
}

/**
 * TROCA DE ROTA COM VIEW TRANSITIONS (#527).
 *
 * A mecânica inteira mora em `@/app/transicao-de-rota` — aqui fica só o ponto
 * de ligação, que é a raiz porque a transição é da APLICAÇÃO e não de uma tela:
 * ligá-la numa rota faria a próxima navegação desligá-la no meio do caminho.
 *
 * O efeito assina os eventos do router e devolve como desassinar. Ele não olha
 * o pathname de propósito: quando um efeito de pathname roda, o DOM novo já
 * está pintado e não há mais "antes" para fotografar.
 */
function useTransicaoDeRota() {
  const router = useRouter()
  useEffect(() => ligarTransicaoDeRota(router), [router])
}

function RootComponent() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  useOverlayDeGrade(useRouterState({ select: (s) => s.location.searchStr }))
  useTransicaoDeRota()

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
