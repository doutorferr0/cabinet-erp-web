import { type FetchStub, renderRoute, respostaSessao } from '@/test/utils'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * Tela de login + guarda de sessão, pelo router de verdade.
 *
 * O stub intercepta o `fetch`, não o SDK — se o codegen mudar URL, método ou
 * forma da resposta do `/auth/login` e do `/auth/me`, estes testes quebram.
 */

interface Chamada {
  caminho: string
  metodo: string
  corpo: string
}

/** Servidor falso de auth. `loginFalha` simula o 401 do contrato. */
function servidorDeAuth({ loginFalha = false, precisaTrocarSenha = false } = {}) {
  const chamadas: Chamada[] = []
  const stub: FetchStub = async (input) => {
    const requisicao = input instanceof Request ? input : null
    const url = String(requisicao ? requisicao.url : input)
    const caminho = new URL(url, 'http://localhost').pathname
    const corpo = requisicao ? await requisicao.clone().text() : ''
    chamadas.push({ caminho, metodo: requisicao?.method ?? 'GET', corpo })

    const json = (valor: unknown, status = 200) =>
      new Response(JSON.stringify(valor), {
        status,
        headers: { 'content-type': 'application/json' },
      })

    if (caminho === '/auth/me') return respostaSessao()
    if (caminho === '/auth/login') {
      return loginFalha
        ? json({ detail: 'E-mail ou senha incorretos.' }, 401)
        : json({ mustChangePassword: precisaTrocarSenha })
    }
    return new Response('', { status: 404 })
  }
  return { chamadas, stub }
}

async function preencherEEntrar(user: ReturnType<typeof renderRoute>['user']) {
  // findBy* no primeiro campo: a rota resolve de forma assíncrona e o getBy*
  // correria antes da tela montar.
  await user.type(await screen.findByLabelText('E-mail'), 'ana@vertz.com.br')
  await user.type(screen.getByLabelText('Senha'), 'segredo123')
  await user.click(screen.getByRole('button', { name: 'Entrar' }))
}

describe('Login', () => {
  it('mostra a folha de entrada fora do shell', async () => {
    const { stub } = servidorDeAuth()
    renderRoute('/login', stub)

    expect(await screen.findByRole('heading', { name: 'Cabinet' })).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha')).toBeInTheDocument()
    // Fora do shell: nenhuma navegação de módulo na tela.
    expect(screen.queryByText('Cadastros')).not.toBeInTheDocument()
  })

  it('entra com e-mail e senha e cai no Dashboard', async () => {
    const { chamadas, stub } = servidorDeAuth()
    const { router, user } = renderRoute('/login', stub)

    await preencherEEntrar(user)

    // A entrada é o Dashboard, não o Boletim (decisão do user). A asserção é
    // pelo `data-slot` do cabeçalho, e não pelo título dele: o título é a
    // saudação, que muda com a hora do dia e faria o teste falhar de tarde.
    await waitFor(() =>
      expect(document.querySelector('[data-slot="dashboard-header"]')).not.toBeNull(),
    )
    expect(router.state.location.pathname).toBe('/dashboard')

    const login = chamadas.find((c) => c.caminho === '/auth/login')
    expect(login?.metodo).toBe('POST')
    expect(JSON.parse(login?.corpo ?? '{}')).toEqual({
      email: 'ana@vertz.com.br',
      password: 'segredo123',
    })
  })

  it('mostra o detail do backend no 401 e permanece no login', async () => {
    const { stub } = servidorDeAuth({ loginFalha: true })
    const { router, user } = renderRoute('/login', stub)

    await preencherEEntrar(user)

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.')
    expect(router.state.location.pathname).toBe('/login')
  })

  it('senha provisória (mustChangePassword) cai na troca de senha, não no app', async () => {
    const { stub } = servidorDeAuth({ precisaTrocarSenha: true })
    const { router, user } = renderRoute('/login', stub)

    await preencherEEntrar(user)

    expect(await screen.findByLabelText('Senha atual')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/trocar-senha')
    // Fora do shell: quem está trocando a senha provisória não tem módulo para navegar.
    expect(screen.queryByText('Cadastros')).not.toBeInTheDocument()
  })
})

describe('RequireSession (guarda)', () => {
  it('sem sessão (401 no /auth/me), qualquer rota vai para /login', async () => {
    const semSessao: FetchStub = (input) => {
      const url = String(input instanceof Request ? input.url : input)
      if (new URL(url, 'http://localhost').pathname === '/auth/me') {
        return Promise.resolve(new Response('', { status: 401 }))
      }
      return Promise.resolve(new Response('', { status: 404 }))
    }
    const { router } = renderRoute('/cadastros/clientes', semSessao)

    expect(await screen.findByLabelText('E-mail')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })

  it('com sessão válida, a rota renderiza normalmente', async () => {
    renderRoute('/')

    expect(await screen.findByRole('heading', { name: 'Boletim' })).toBeInTheDocument()
  })
})
