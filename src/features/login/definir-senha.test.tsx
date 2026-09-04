import { type FetchStub, renderRoute } from '@/test/utils'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * DEFINIR SENHA pelo link, e PEDIR o link — pelo router de verdade.
 *
 * O stub intercepta o `fetch`, não o SDK: se o codegen mudar URL, método ou
 * forma de `/auth/credential-token`, `/auth/set-password` ou
 * `/auth/forgot-password`, estes testes quebram.
 *
 * As duas telas são PÚBLICAS, e o servidor falso não serve `/auth/me` de
 * propósito: se alguma delas passasse a exigir sessão, a guarda apareceria
 * aqui como redirecionamento para o login — que é exatamente o defeito que
 * mandaria para o login quem veio buscar como fazer login.
 */

interface Chamada {
  caminho: string
  metodo: string
  corpo: string
}

const TOKEN = 'aBcDeF0123456789aBcDeF0123456789'

type Recusa = 'invalido' | 'expirado' | null

function servidorDoLink({
  recusa = null as Recusa,
  purpose = 'invite' as 'invite' | 'reset',
  gravarFalha = false,
} = {}) {
  const chamadas: Chamada[] = []
  const stub: FetchStub = async (input) => {
    const requisicao = input instanceof Request ? input : null
    const url = String(requisicao ? requisicao.url : input)
    const caminho = new URL(url, 'http://localhost').pathname
    const corpo = requisicao ? await requisicao.clone().text() : ''
    chamadas.push({ caminho, metodo: requisicao?.method ?? 'GET', corpo })

    if (caminho === '/auth/credential-token') {
      if (recusa) return problema(recusa)
      return json({
        purpose,
        email: 'ana@vertz.com.br',
        name: 'Ana Acesso',
        expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      })
    }
    if (caminho === '/auth/set-password') {
      if (gravarFalha) {
        return new Response(
          JSON.stringify({
            type: 'urn:cabinet:erro:senha-fraca',
            title: 'Senha fraca',
            status: 400,
            detail: 'A senha precisa de pelo menos 8 caracteres.',
          }),
          { status: 400, headers: { 'content-type': 'application/problem+json' } },
        )
      }
      return new Response(null, { status: 204 })
    }
    if (caminho === '/auth/forgot-password') return new Response(null, { status: 202 })
    return new Response('', { status: 404 })
  }
  return { chamadas, stub }
}

function json(corpo: unknown) {
  return new Response(JSON.stringify(corpo), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

function problema(recusa: 'invalido' | 'expirado') {
  return new Response(
    JSON.stringify({
      type: `urn:cabinet:erro:token-${recusa}`,
      title: recusa === 'expirado' ? 'Link expirado' : 'Link inválido',
      status: 400,
      detail: 'texto que a tela NÃO pode usar para decidir',
    }),
    { status: 400, headers: { 'content-type': 'application/problem+json' } },
  )
}

describe('DefinirSenha', () => {
  it('lê o link antes do formulário, grava e manda para o LOGIN', async () => {
    const { chamadas, stub } = servidorDoLink()
    const { router, user } = renderRoute(`/definir-senha?token=${TOKEN}`, stub)

    // A saudação do convite sai do `name` que o servidor devolveu — a tela não
    // adivinha de quem é o link.
    expect(await screen.findByText('Ana Acesso')).toBeInTheDocument()

    await user.type(await screen.findByLabelText('Senha'), 'senha-escolhida-1')
    await user.type(screen.getByLabelText('Confirmar senha'), 'senha-escolhida-1')
    await user.click(screen.getByRole('button', { name: 'Definir senha' }))

    // LOGIN, e não dashboard: definir a senha não cria sessão. Se criasse, o
    // link do e-mail valeria como login.
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))

    const leitura = chamadas.find((c) => c.caminho === '/auth/credential-token')
    expect(leitura?.metodo).toBe('POST')
    // POST e não GET: em GET o token ficaria no log de acesso e no `Referer`.
    expect(JSON.parse(leitura?.corpo ?? '{}')).toEqual({ token: TOKEN })

    const gravacao = chamadas.find((c) => c.caminho === '/auth/set-password')
    // A confirmação é conferência de digitação e não viaja no contrato.
    expect(JSON.parse(gravacao?.corpo ?? '{}')).toEqual({
      token: TOKEN,
      password: 'senha-escolhida-1',
    })
  })

  it('link EXPIRADO oferece pedir outro; INVÁLIDO não oferece', async () => {
    const expirado = servidorDoLink({ recusa: 'expirado' })
    const { user } = renderRoute(`/definir-senha?token=${TOKEN}`, expirado.stub)

    // A decisão vem do `type`, nunca do `detail` — que aqui diz outra coisa de
    // propósito.
    expect(await screen.findByRole('alert')).toHaveTextContent('Este link venceu')
    expect(screen.getByRole('link', { name: 'Pedir outro link' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Senha')).not.toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Pedir outro link' }))
    expect(await screen.findByLabelText('E-mail')).toBeInTheDocument()
  })

  it('link inválido não oferece nada além de voltar', async () => {
    const { stub } = servidorDoLink({ recusa: 'invalido' })
    renderRoute(`/definir-senha?token=${TOKEN}`, stub)

    expect(await screen.findByRole('alert')).toHaveTextContent('não vale mais')
    // Oferecer "pedir outro" aqui faria a pessoa repetir uma ação que não
    // resolve: o link não venceu, ele foi usado ou substituído.
    expect(screen.queryByRole('link', { name: 'Pedir outro link' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voltar para a entrada' })).toBeInTheDocument()
  })

  it('token fora de forma na URL não vira erro de rota — vira link inválido', async () => {
    const { chamadas, stub } = servidorDoLink()
    renderRoute('/definir-senha?token=%3Cscript%3E', stub)

    expect(await screen.findByRole('alert')).toHaveTextContent('não vale mais')
    // E nada saiu para o servidor: a fronteira barrou na rota.
    expect(chamadas.filter((c) => c.caminho === '/auth/credential-token')).toHaveLength(0)
  })

  it('a recuperação usa a MESMA tela, com outro texto', async () => {
    const { stub } = servidorDoLink({ purpose: 'reset' })
    renderRoute(`/definir-senha?token=${TOKEN}`, stub)

    // Sem saudação de boas-vindas: quem já tinha conta não está sendo
    // apresentado ao sistema.
    expect(await screen.findByText('ana@vertz.com.br')).toBeInTheDocument()
    expect(screen.queryByText('Ana Acesso')).not.toBeInTheDocument()
  })

  it('mostra o detail do 400 e permanece na tela', async () => {
    const { stub } = servidorDoLink({ gravarFalha: true })
    const { router, user } = renderRoute(`/definir-senha?token=${TOKEN}`, stub)

    await user.type(await screen.findByLabelText('Senha'), 'curta')
    await user.type(screen.getByLabelText('Confirmar senha'), 'curta')
    await user.click(screen.getByRole('button', { name: 'Definir senha' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('pelo menos 8 caracteres')
    expect(router.state.location.pathname).toBe('/definir-senha')
  })

  it('confirmação divergente barra no cliente, sem chamar o backend', async () => {
    const { chamadas, stub } = servidorDoLink()
    const { user } = renderRoute(`/definir-senha?token=${TOKEN}`, stub)

    await user.type(await screen.findByLabelText('Senha'), 'senha-escolhida-1')
    await user.type(screen.getByLabelText('Confirmar senha'), 'digitacao-errada')
    await user.click(screen.getByRole('button', { name: 'Definir senha' }))

    expect(await screen.findByText('A confirmação não confere com a senha.')).toBeInTheDocument()
    expect(chamadas.filter((c) => c.caminho === '/auth/set-password')).toHaveLength(0)
  })
})

describe('EsqueciSenha', () => {
  it('pede o link e responde no CONDICIONAL — a tela não diz se a conta existe', async () => {
    const { chamadas, stub } = servidorDoLink()
    const { user } = renderRoute('/esqueci-senha', stub)

    await user.type(await screen.findByLabelText('E-mail'), 'ana@vertz.com.br')
    await user.click(screen.getByRole('button', { name: 'Enviar link' }))

    // "Se houver uma conta" — e não "enviado para ana@…". Uma tela que
    // confirmasse a existência desfaria a defesa que o 202 fixo dá.
    const aviso = await screen.findByRole('status')
    expect(aviso).toHaveTextContent('Se houver uma conta')
    expect(screen.queryByLabelText('E-mail')).not.toBeInTheDocument()

    const pedido = chamadas.find((c) => c.caminho === '/auth/forgot-password')
    expect(pedido?.metodo).toBe('POST')
    expect(JSON.parse(pedido?.corpo ?? '{}')).toEqual({ email: 'ana@vertz.com.br' })
  })

  it('e-mail malformado barra no cliente', async () => {
    const { chamadas, stub } = servidorDoLink()
    const { user } = renderRoute('/esqueci-senha', stub)

    await user.type(await screen.findByLabelText('E-mail'), 'nao-e-email')
    await user.click(screen.getByRole('button', { name: 'Enviar link' }))

    expect(await screen.findByText('E-mail inválido.')).toBeInTheDocument()
    expect(chamadas.filter((c) => c.caminho === '/auth/forgot-password')).toHaveLength(0)
  })

  it('o login oferece a saída — senão a tela fica órfã', async () => {
    const { stub } = servidorDoLink()
    const { router, user } = renderRoute('/login', stub)

    await user.click(await screen.findByRole('link', { name: 'Esqueci a senha' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/esqueci-senha'))
  })
})
