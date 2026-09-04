import { renderRoute, respostaSessao, respostaVinculos } from '@/test/utils'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * SAIR — o gesto que derruba a sessão, e a guarda que o completa.
 *
 * Estes dois casos moravam no teste do `CompanySwitcher`, porque o `Sair` era o
 * rodapé da gaveta dele. A issue D6 trocou a gaveta por um popover de escolha e
 * o `Sair` ficou onde já havia um: o menu do operador, ao lado. O teste veio
 * junto — cobertura que segue o COMPORTAMENTO, e não o arquivo — e ganhou nome
 * próprio para não voltar a pender de qual peça hospeda o botão.
 *
 * Montagem `renderRoute('/')` (router real): o logout só derruba o cookie e
 * limpa o cache; **quem redireciona é a guarda de sessão**, e ela não existe
 * fora da aplicação montada.
 *
 * **DOIS casos e não um, medido.** Fundi-los numa montagem só para economizar
 * os ~7s de render fez o teste ir a 30s e estourar o teto de 15s: com a sessão
 * derrubada, a tela de login refaz consultas que este stub não conhece, e as
 * rejeições prendem o caso que ainda estava esperando o `/auth/me`. Separados,
 * cada um mede uma coisa e nenhum espera pelo mundo depois do redirect.
 */
describe('Sair', () => {
  it('chama POST /auth/logout e a sessão é reconsultada', async () => {
    const chamadas: string[] = []
    const { user } = renderRoute('/', (input) => {
      const url = String(input instanceof Request ? input.url : input)
      const caminho = new URL(url, 'http://localhost').pathname
      // Verbo vem do Request: o cliente gerado chama `fetch(new Request(...))`.
      const metodo = input instanceof Request ? input.method : 'GET'
      chamadas.push(`${metodo} ${caminho}`)
      if (caminho === '/auth/me') return Promise.resolve(respostaSessao())
      if (caminho === '/auth/tenants') return Promise.resolve(respostaVinculos())
      if (caminho === '/auth/logout' && metodo === 'POST') {
        return Promise.resolve(new Response(null, { status: 204 }))
      }
      return Promise.reject(new Error(`fetch sem stub no teste: ${metodo} ${caminho}`))
    })

    // O gatilho é o bloco do operador: iniciais + nome + papel.
    await user.click(await screen.findByRole('button', { name: /demo|usuário/i }))
    await user.click(await screen.findByRole('menuitem', { name: /sair/i }))

    await waitFor(() => expect(chamadas.filter((c) => c === 'POST /auth/logout')).toHaveLength(1))
    // Invalidação total (NÃO `clear()` — ele não avisa os observers montados e a
    // guarda ficaria com o resultado velho): o /auth/me TEM que ser reconsultado.
    await waitFor(() =>
      expect(chamadas.filter((c) => c === 'GET /auth/me').length).toBeGreaterThan(1),
    )
  })

  it('leva ao /login — a guarda redireciona no 401', async () => {
    let fora = false
    const { user } = renderRoute('/', (input) => {
      const url = String(input instanceof Request ? input.url : input)
      const caminho = new URL(url, 'http://localhost').pathname
      const metodo = input instanceof Request ? input.method : 'GET'
      if (caminho === '/auth/me') {
        return Promise.resolve(fora ? new Response('', { status: 401 }) : respostaSessao())
      }
      if (caminho === '/auth/tenants') return Promise.resolve(respostaVinculos())
      if (caminho === '/auth/logout' && metodo === 'POST') {
        fora = true
        return Promise.resolve(new Response(null, { status: 204 }))
      }
      return Promise.reject(new Error(`fetch sem stub no teste: ${metodo} ${caminho}`))
    })

    await user.click(await screen.findByRole('button', { name: /demo|usuário/i }))
    await user.click(await screen.findByRole('menuitem', { name: /sair/i }))

    // A tela de login é a única com heading Cabinet fora do shell.
    expect(await screen.findByRole('heading', { name: 'Cabinet' })).toBeInTheDocument()
  })
})
