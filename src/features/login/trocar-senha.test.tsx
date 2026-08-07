import { type FetchStub, renderRoute, respostaSessao } from '@/test/utils'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * Tela de troca de senha, pelo router de verdade.
 *
 * O stub intercepta o `fetch`, não o SDK — se o codegen mudar URL, método ou
 * forma do `/auth/change-password`, estes testes quebram.
 */

interface Chamada {
  caminho: string
  metodo: string
  corpo: string
}

/**
 * Servidor falso: sessão válida + endpoint de troca. `trocaFalha` simula o 400.
 *
 * `senhaProvisoria` reproduz o servidor de verdade: o `mustChangePassword` do
 * `/auth/me` é lido da CREDENCIAL a cada requisição, então a troca bem-sucedida
 * o vira `false` na consulta seguinte. Servidor que devolvesse `true` para
 * sempre esconderia o laço de saída em vez de expô-lo.
 */
function servidorDeTroca({ trocaFalha = false, senhaProvisoria = false } = {}) {
  const chamadas: Chamada[] = []
  let provisoria = senhaProvisoria
  const stub: FetchStub = async (input) => {
    const requisicao = input instanceof Request ? input : null
    const url = String(requisicao ? requisicao.url : input)
    const caminho = new URL(url, 'http://localhost').pathname
    const corpo = requisicao ? await requisicao.clone().text() : ''
    chamadas.push({ caminho, metodo: requisicao?.method ?? 'GET', corpo })

    if (caminho === '/auth/me') return respostaSessao({ mustChangePassword: provisoria })
    if (caminho === '/auth/tenants') {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    if (caminho === '/auth/change-password') {
      if (trocaFalha) {
        return new Response(JSON.stringify({ detail: 'Senha atual incorreta.' }), {
          status: 400,
          headers: { 'content-type': 'application/json' },
        })
      }
      provisoria = false
      return new Response(null, { status: 204 })
    }
    return new Response('', { status: 404 })
  }
  return { chamadas, stub }
}

async function preencherETrocar(
  user: ReturnType<typeof renderRoute>['user'],
  confirmacao = 'nova-senha-456',
) {
  await user.type(await screen.findByLabelText('Senha atual'), 'provisoria-123')
  await user.type(screen.getByLabelText('Senha nova'), 'nova-senha-456')
  await user.type(screen.getByLabelText('Confirmar senha nova'), confirmacao)
  await user.click(screen.getByRole('button', { name: 'Trocar senha' }))
}

describe('TrocarSenha', () => {
  it('troca a senha e cai no Dashboard — confirmação NÃO viaja no contrato', async () => {
    const { chamadas, stub } = servidorDeTroca()
    const { router, user } = renderRoute('/trocar-senha', stub)

    await preencherETrocar(user)

    // Mesmo destino do login: o Dashboard. Asserção pelo botão, não pelo
    // título — o título é a saudação e muda com a hora.
    expect(await screen.findByRole('button', { name: /Nova tarefa/ })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/dashboard')

    const troca = chamadas.find((c) => c.caminho === '/auth/change-password')
    expect(troca?.metodo).toBe('POST')
    // `ChangePasswordRequest` é currentPassword + newPassword — a confirmação
    // é validação de digitação do cliente e não pode vazar para o contrato.
    expect(JSON.parse(troca?.corpo ?? '{}')).toEqual({
      currentPassword: 'provisoria-123',
      newPassword: 'nova-senha-456',
    })
  })

  it('mostra o detail do backend no 400 e permanece na tela', async () => {
    const { stub } = servidorDeTroca({ trocaFalha: true })
    const { router, user } = renderRoute('/trocar-senha', stub)

    await preencherETrocar(user)

    expect(await screen.findByRole('alert')).toHaveTextContent('Senha atual incorreta.')
    expect(router.state.location.pathname).toBe('/trocar-senha')
  })

  it('confirmação divergente barra no cliente, sem chamar o backend', async () => {
    const { chamadas, stub } = servidorDeTroca()
    const { user } = renderRoute('/trocar-senha', stub)

    await preencherETrocar(user, 'digitacao-errada')

    expect(
      await screen.findByText('A confirmação não confere com a senha nova.'),
    ).toBeInTheDocument()
    expect(chamadas.find((c) => c.caminho === '/auth/change-password')).toBeUndefined()
  })

  // Quem fechou a aba com a senha provisória e voltou tinha cookie válido: o
  // login não roda de novo, e antes disto a pessoa via o sistema inteiro
  // enquanto o middleware do backend recusava tudo com 403.
  it('sessão com senha provisória não entra no sistema: cai na troca', async () => {
    const { stub } = servidorDeTroca({ senhaProvisoria: true })
    const { router } = renderRoute('/cadastros/produtos', stub)

    expect(await screen.findByLabelText('Senha atual')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/trocar-senha')
  })

  // O outro lado do redirect: trocada a senha, a sessão em cache ainda diz
  // `true`. Sem invalidá-la, a guarda devolveria para cá quem acabou de sair —
  // laço na SAÍDA, que é o modo de falhar mais fácil de introduzir aqui.
  it('trocada a senha provisória, a saída não volta para a troca', async () => {
    const { stub } = servidorDeTroca({ senhaProvisoria: true })
    const { router, user } = renderRoute('/', stub)

    await preencherETrocar(user)

    expect(await screen.findByRole('button', { name: /Nova tarefa/ })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/dashboard')
  })

  it('fica fora do shell mas atrás da guarda: sem sessão vai para /login', async () => {
    const semSessao: FetchStub = (input) => {
      const url = String(input instanceof Request ? input.url : input)
      if (new URL(url, 'http://localhost').pathname === '/auth/me') {
        return Promise.resolve(new Response('', { status: 401 }))
      }
      return Promise.resolve(new Response('', { status: 404 }))
    }
    const { router } = renderRoute('/trocar-senha', semSessao)

    expect(await screen.findByLabelText('E-mail')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })
})
