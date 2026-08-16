import { apiFetch } from '@/api/http'
import { ErroDaApi } from '@/data/api-provider'
import { envioInterrompido } from '@/data/sessao-expirada'
import { ReentrarNaSessao } from '@/features/login/reentrar'
import { instalarServidor, json } from '@/test/servidor'
import { renderWithQuery } from '@/test/utils'
import { useMutation } from '@tanstack/react-query'
import { screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

/**
 * Sessão que vence NO MEIO do envio (#124, ponto 3).
 *
 * O harness é um formulário de verdade — campo controlado, `<form>` e submit —
 * porque a garantia sob teste é sobre a TELA continuar de pé com o que foi
 * digitado. Um mock do componente provaria só que ele renderiza.
 */

interface Corpo {
  nome: string
}

function FormularioDeEnsaio() {
  const [nome, setNome] = useState('')
  const gravar = useMutation<unknown, Error, Corpo>({
    mutationFn: async (corpo) => {
      const resposta = await apiFetch<{ data: unknown; status: number }>('/api/ensaio', {
        method: 'POST',
        body: JSON.stringify(corpo),
      })
      if (resposta.status === 401) throw new ErroDaApi('Sessão expirada', 401)
      return resposta.data
    },
  })

  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault()
        gravar.mutate({ nome })
      }}
    >
      <label htmlFor="nome">Nome do projeto</label>
      <input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
      <button type="submit">Gravar</button>
      <ReentrarNaSessao mutacao={gravar} />
    </form>
  )
}

/** Servidor que recusa o envio até alguém entrar, e aceita depois. */
function servidorQueExpira() {
  let entrou = false
  return instalarServidor({
    '/auth/login': () => {
      entrou = true
      return json({ mustChangePassword: false })
    },
    '/api/ensaio': () => (entrou ? json({ ok: true }) : new Response('', { status: 401 })),
  })
}

describe('sessão expirada no meio do formulário', () => {
  it('a tela FICA, com o que foi digitado, e oferece entrar de novo', async () => {
    servidorQueExpira()
    const { user } = renderWithQuery(<FormularioDeEnsaio />)

    await user.type(screen.getByLabelText('Nome do projeto'), 'Cozinha Vertz')
    await user.click(screen.getByRole('button', { name: 'Gravar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Sua sessão expirou antes de gravar')
    // O que o trilho existe para garantir: a digitação continua na tela.
    expect(screen.getByLabelText('Nome do projeto')).toHaveValue('Cozinha Vertz')
  })

  it('reentrar reenvia o MESMO payload, sem redigitar', async () => {
    const servidor = servidorQueExpira()
    const { user } = renderWithQuery(<FormularioDeEnsaio />)

    await user.type(screen.getByLabelText('Nome do projeto'), 'Cozinha Vertz')
    await user.click(screen.getByRole('button', { name: 'Gravar' }))
    await screen.findByRole('alert')

    await user.type(screen.getByLabelText('E-mail'), 'ana@vertz.com.br')
    await user.type(screen.getByLabelText('Senha'), 'segredo123')
    await user.click(screen.getByRole('button', { name: 'Entrar e enviar de novo' }))

    // Duas tentativas com o MESMO corpo: a que morreu no 401 e a que passou.
    await waitFor(() => expect(servidor.em('/api/ensaio')).toHaveLength(2))
    expect(servidor.em('/api/ensaio')[0]?.corpo).toEqual({ nome: 'Cozinha Vertz' })
    expect(servidor.em('/api/ensaio')[1]?.corpo).toEqual({ nome: 'Cozinha Vertz' })
  })

  it('some quando o envio não parou por sessão — 500 não é reentrada', () => {
    const mutacao = {
      error: new ErroDaApi('Servidor fora', 500),
      variables: { nome: 'Cozinha Vertz' },
      isPending: false,
      mutate: vi.fn(),
    }
    renderWithQuery(<ReentrarNaSessao mutacao={mutacao} />)

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('envioInterrompido', () => {
  it('guarda o payload só quando foi 401', () => {
    const mutate = vi.fn()
    const comum = { variables: { nome: 'Cozinha' }, isPending: false, mutate }

    expect(envioInterrompido({ ...comum, error: new ErroDaApi('x', 401) })).toMatchObject({
      expirou: true,
      payload: { nome: 'Cozinha' },
    })
    expect(envioInterrompido({ ...comum, error: new ErroDaApi('x', 500) })).toMatchObject({
      expirou: false,
      payload: undefined,
    })
  })

  it('não reenvia antes do primeiro envio — não há corpo a repetir', () => {
    const mutate = vi.fn()
    envioInterrompido({
      error: new ErroDaApi('x', 401),
      variables: undefined,
      isPending: false,
      mutate,
    }).reenviar()

    expect(mutate).not.toHaveBeenCalled()
  })
})
