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

/**
 * Servidor falso de auth. `loginFalha` simula o 401 do contrato.
 *
 * `semSessao` responde 401 no `/auth/me` para sempre — é a guarda desviando.
 * `semSessaoAteLogin` responde 401 **até** o POST de login e sessão válida
 * depois: é o único jeito de exercitar o caminho inteiro do destino preservado
 * (guarda desvia → operador entra → volta para a rota). Com `semSessao` fixo, a
 * guarda desviaria de novo logo após o login e o teste mediria o desvio, não a
 * volta.
 */
function servidorDeAuth({
  loginFalha = false,
  precisaTrocarSenha = false,
  semSessao = false,
  semSessaoAteLogin = false,
} = {}) {
  const chamadas: Chamada[] = []
  let entrou = false
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

    if (caminho === '/auth/me') {
      if (semSessao) return new Response('', { status: 401 })
      if (semSessaoAteLogin && !entrou) return new Response('', { status: 401 })
      return respostaSessao()
    }
    if (caminho === '/auth/login') {
      if (loginFalha) return json({ detail: 'E-mail ou senha incorretos.' }, 401)
      entrou = true
      return json({ mustChangePassword: precisaTrocarSenha })
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

  it('guarda o destino interrompido na busca do login', async () => {
    const { stub } = servidorDeAuth({ semSessao: true })
    const { router } = renderRoute('/cadastros/clientes?modo=consulta', stub)

    expect(await screen.findByLabelText('E-mail')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
    // Caminho E busca: quem foi interrompido em `?modo=consulta` volta em
    // consulta, não no formulário de edição.
    expect(router.state.location.search).toEqual({
      redirect: '/cadastros/clientes?modo=consulta',
    })
  })
})

/**
 * O destino preservado (#124, ponto 1).
 *
 * O par completo: a guarda ESCREVE o `redirect` (bateria acima) e o login o
 * CONSOME (esta). Testar só um lado deixaria passar a versão que guarda o
 * destino e nunca o usa.
 */
describe('volta para a rota de origem depois de entrar', () => {
  it('entra e reabre a rota que a guarda interrompeu', async () => {
    // Sem sessão até o login: é o que faz a guarda desviar e produzir o
    // `redirect`. Depois do POST, `/auth/me` passa a responder sessão válida.
    const { stub } = servidorDeAuth({ semSessaoAteLogin: true })
    const { router, user } = renderRoute('/cadastros/clientes', stub)

    await preencherEEntrar(user)

    await waitFor(() => expect(router.state.location.pathname).toBe('/cadastros/clientes'))
  })

  it('sem destino guardado, entra no Dashboard', async () => {
    const { stub } = servidorDeAuth()
    const { router, user } = renderRoute('/login', stub)

    await preencherEEntrar(user)

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard'))
  })

  it('destino que sai do site é ignorado — cai no Dashboard', async () => {
    const { stub } = servidorDeAuth()
    // Link montado por terceiro: `//exemplo.test` começa com barra e mesmo
    // assim leva a outro host. Entrar e ser despejado lá com a sessão nova é a
    // falha que o `validateSearch` da rota impede.
    const { router, user } = renderRoute('/login?redirect=//exemplo.test/phishing', stub)

    await preencherEEntrar(user)

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard'))
  })

  it('o destino recusado não CHEGA ao match — o efeito não bastava', async () => {
    // **Este caso existe porque o de cima ficava verde com a guarda
    // desligada.** Ele mede o EFEITO (cair no Dashboard), e o efeito acontecia
    // por outro motivo: `navigate` com `//host/x` não acha rota interna e cai
    // no Dashboard de todo jeito. O `validateSearch` devolvia `{}`, e `{}` não
    // REMOVE a chave — a busca de um match é o merge com a do pai, e a raiz não
    // valida nada, então o destino cru passava inteiro para a tela.
    //
    // Aqui a asserção é sobre o MECANISMO: o valor que o match carrega. Ela
    // fica VERMELHA com `return {}` no lugar de `redirect: undefined`.
    const { stub } = servidorDeAuth()
    const { router } = renderRoute('/login?redirect=https://exemplo.test/phishing', stub)
    await screen.findByLabelText('E-mail')

    const search = router.state.matches.at(-1)?.search as { redirect?: string }
    expect(search.redirect).toBeUndefined()
  })

  it('senha provisória vence o destino guardado', async () => {
    const { stub } = servidorDeAuth({ precisaTrocarSenha: true })
    const { router, user } = renderRoute('/login?redirect=/cadastros/clientes', stub)

    await preencherEEntrar(user)

    expect(await screen.findByLabelText('Senha atual')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/trocar-senha')
  })
})
