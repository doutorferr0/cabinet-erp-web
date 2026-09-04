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
 * Motivos de perda com EDIÇÃO INLINE (D22) — contra servidor falso, pelo
 * cliente gerado.
 *
 * Herda a cobertura que era do diálogo (`motivo-de-perda.test.tsx`, removido
 * junto com ele) e acrescenta o que a inline trouxe: a célula que vira campo, o
 * `Esc` que desiste sem escrever, e a linha nova do rodapé.
 *
 * O que estes testes travam é o CORPO, não a tela: toda escrita aqui é `PUT`
 * do registro inteiro, e corpo parcial apagaria o campo que não veio.
 */

const URL_MOTIVOS = '/api/crm/lost-reasons'
const ID = 'b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e'

const LINHA = { id: ID, name: 'Preço acima do orçamento', active: true }

function servidor(linhas = [LINHA]) {
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
    if (caminho === URL_MOTIVOS) return json({ rows: linhas, total: linhas.length })
    throw new Error(`fetch sem stub no teste: ${url}`)
  }

  return { stub, escritas }
}

describe('motivos de perda — edição inline', () => {
  it('lista o que o servidor devolve', async () => {
    const { stub } = servidor()
    renderRoute('/crm/motivos', stub)

    expect(
      await screen.findByRole('button', { name: /Editar Motivo de perda: Preço acima/ }),
    ).toBeInTheDocument()
  })

  it('clicar na célula abre o campo com o valor da LINHA e grava por PUT', async () => {
    const { stub, escritas } = servidor()
    const { user } = renderRoute('/crm/motivos', stub)

    await user.click(await screen.findByRole('button', { name: /Editar Motivo de perda/ }))

    const campo = await screen.findByLabelText('Motivo de perda')
    expect(campo).toHaveValue('Preço acima do orçamento')

    await user.clear(campo)
    await user.type(campo, 'Preço{Enter}')

    await waitFor(() => expect(escritas).toHaveLength(1))
    expect(escritas[0]).toMatchObject({ metodo: 'PUT', caminho: `${URL_MOTIVOS}/${ID}` })
    // O registro INTEIRO: sem o `active`, o `PUT` apagaria o estado do motivo.
    expect(escritas[0]?.corpo).toEqual({ name: 'Preço', active: true })
  })

  it('Esc desiste e NÃO escreve', async () => {
    const { stub, escritas } = servidor()
    const { user } = renderRoute('/crm/motivos', stub)

    await user.click(await screen.findByRole('button', { name: /Editar Motivo de perda/ }))
    const campo = await screen.findByLabelText('Motivo de perda')
    await user.clear(campo)
    await user.type(campo, 'Rascunho{Escape}')

    // Volta ao modo de leitura com o valor de antes, e o servidor não ouviu nada.
    expect(
      await screen.findByRole('button', { name: /Editar Motivo de perda: Preço acima/ }),
    ).toBeInTheDocument()
    expect(escritas).toHaveLength(0)
  })

  it('a linha nova do rodapé grava por POST', async () => {
    const { stub, escritas } = servidor()
    const { user } = renderRoute('/crm/motivos', stub)

    const campo = await screen.findByLabelText('Novo motivo de perda')
    await user.type(campo, 'Prazo de entrega{Enter}')

    await waitFor(() => expect(escritas).toHaveLength(1))
    expect(escritas[0]).toMatchObject({ metodo: 'POST', caminho: URL_MOTIVOS })
    expect(escritas[0]?.corpo).toEqual({ name: 'Prazo de entrega', active: true })
  })

  it('Alterar da barra abre a MESMA célula', async () => {
    const { stub } = servidor()
    const { user } = renderRoute('/crm/motivos', stub)

    await acaoNaLinha(user, 'Preço acima do orçamento', /Alterar/)

    expect(await screen.findByLabelText('Motivo de perda')).toHaveValue('Preço acima do orçamento')
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

  it('Reativar é BOTÃO na linha, e só aparece no motivo desligado', async () => {
    const { stub, escritas } = servidor([{ ...LINHA, active: false }])
    const { user } = renderRoute('/crm/motivos', stub)

    await user.click(await screen.findByRole('button', { name: 'Reativar' }))

    await waitFor(() => expect(escritas).toHaveLength(1))
    expect(escritas[0]?.corpo).toEqual({ name: 'Preço acima do orçamento', active: true })
  })

  it('motivo ATIVO não oferece Reativar — carimbo, e nada a fazer', async () => {
    const { stub } = servidor()
    renderRoute('/crm/motivos', stub)

    expect(await screen.findAllByText('Ativo')).not.toHaveLength(0)
    expect(screen.queryByRole('button', { name: 'Reativar' })).not.toBeInTheDocument()
  })
})
