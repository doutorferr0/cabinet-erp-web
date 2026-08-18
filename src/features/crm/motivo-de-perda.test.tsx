import { json } from '@/test/servidor'
import {
  type FetchStub,
  acaoNaLinha,
  renderRoute,
  respostaSessao,
  respostaVinculos,
} from '@/test/utils'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * Cadastro de motivos de perda contra servidor falso, pelo cliente gerado.
 *
 * O que estes testes travam: que Incluir e Alterar caem no MESMO diálogo com o
 * verbo certo (o contrato não tem detalhe por id, então a linha é o registro),
 * e que desativar manda o registro INTEIRO — `PUT` parcial apagaria o nome
 * junto com o `active`.
 */

const URL_MOTIVOS = '/api/crm/lost-reasons'
const ID = 'b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e'

const LINHA = { id: ID, name: 'Preço acima do orçamento', active: true }

function servidor() {
  const escritas: { metodo: string; caminho: string; corpo: unknown }[] = []

  const stub: FetchStub = async (entrada) => {
    const requisicao = entrada instanceof Request ? entrada : null
    const url = String(requisicao ? requisicao.url : entrada)
    const caminho = new URL(url, 'http://localhost').pathname

    if (requisicao && requisicao.method.toUpperCase() !== 'GET') {
      const texto = await requisicao.clone().text()
      escritas.push({
        metodo: requisicao.method.toUpperCase(),
        caminho,
        corpo: texto ? JSON.parse(texto) : null,
      })
      return json(LINHA, requisicao.method.toUpperCase() === 'POST' ? 201 : 200)
    }

    if (caminho === '/auth/me') return respostaSessao()
    if (caminho === '/auth/tenants') return respostaVinculos()
    if (caminho === URL_MOTIVOS) return json({ rows: [LINHA], total: 1 })
    throw new Error(`fetch sem stub no teste: ${url}`)
  }

  return { stub, escritas }
}

describe('motivos de perda', () => {
  it('lista o que o servidor devolve', async () => {
    const { stub } = servidor()
    renderRoute('/crm/motivos', stub)

    expect(await screen.findByText('Preço acima do orçamento')).toBeInTheDocument()
  })

  it('Incluir abre o diálogo em branco e grava por POST', async () => {
    const { stub, escritas } = servidor()
    const { user } = renderRoute('/crm/motivos', stub)

    await user.click(await screen.findByRole('button', { name: /Incluir/ }))
    const campo = await screen.findByLabelText('Motivo')
    expect(campo).toHaveValue('')

    await user.type(campo, 'Prazo de entrega')
    await user.click(screen.getByRole('button', { name: 'Gravar' }))

    await waitFor(() => expect(escritas).toHaveLength(1))
    expect(escritas[0]).toMatchObject({ metodo: 'POST', caminho: URL_MOTIVOS })
    expect(escritas[0]?.corpo).toEqual({ name: 'Prazo de entrega', active: true })
  })

  it('Alterar abre com o registro da LINHA e grava por PUT', async () => {
    const { stub, escritas } = servidor()
    const { user } = renderRoute('/crm/motivos', stub)

    await acaoNaLinha(user, 'Preço acima do orçamento', /Alterar/)

    const campo = await screen.findByLabelText('Motivo')
    expect(campo).toHaveValue('Preço acima do orçamento')

    await user.clear(campo)
    await user.type(campo, 'Preço')
    await user.click(screen.getByRole('button', { name: 'Gravar' }))

    await waitFor(() => expect(escritas).toHaveLength(1))
    expect(escritas[0]).toMatchObject({ metodo: 'PUT', caminho: `${URL_MOTIVOS}/${ID}` })
    expect(escritas[0]?.corpo).toEqual({ name: 'Preço', active: true })
  })

  it('Excluir DESATIVA, e o PUT leva o nome junto', async () => {
    const { stub, escritas } = servidor()
    const { user } = renderRoute('/crm/motivos', stub)

    await acaoNaLinha(user, 'Preço acima do orçamento', /Excluir/)
    await user.click(await screen.findByRole('button', { name: /Desativar/ }))

    await waitFor(() => expect(escritas).toHaveLength(1))
    // `PUT` substitui o registro inteiro: sem o nome, desativar apagaria o
    // motivo e o relatório do ano passado perderia a razão da perda.
    expect(escritas[0]?.corpo).toEqual({ name: 'Preço acima do orçamento', active: false })
  })
})
