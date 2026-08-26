import { json } from '@/test/servidor'
import { type FetchStub, renderRoute, respostaSessao, respostaVinculos } from '@/test/utils'
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * A tela de GESTÃO DAS LISTAS DE APOIO contra servidor falso.
 *
 * O que estes testes travam:
 *
 * - **item INATIVO aparece** — é o meio ponto da tela: o combo o esconde, e é
 *   ele que alguém vem aqui reativar. Um filtro "melhorando" a lista mataria a
 *   única razão de a tela existir;
 * - **a consulta viaja com o `kind` do backend** (`MARCA`), não com a chave de
 *   UI (`marca`) — kind desconhecido devolve 200 VAZIO, então errar aqui não dá
 *   erro nenhum, dá uma tela em branco;
 * - **alterar manda nome E `active` juntos** — o `PUT` do contrato substitui o
 *   registro, e mandar só o nome apagaria o `active` que estava lá;
 * - **`kind` NÃO viaja na alteração**: mudar o kind de um item o mudaria de
 *   lista, e o contrato o deixa fora do corpo por isso.
 */

const ITEM_ATIVO = 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f'
const ITEM_INATIVO = 'd4e5f6a7-b8c9-4d0e-9f2a-3b4c5d6e7f80'

function servidor() {
  const escritas: { metodo: string; caminho: string; corpo: unknown }[] = []
  const consultas: string[] = []

  const stub: FetchStub = async (entrada) => {
    const requisicao = entrada instanceof Request ? entrada : null
    const url = new URL(String(requisicao ? requisicao.url : entrada), 'http://localhost')
    const caminho = url.pathname

    if (requisicao && requisicao.method.toUpperCase() !== 'GET') {
      const texto = await requisicao.clone().text()
      escritas.push({
        metodo: requisicao.method.toUpperCase(),
        caminho,
        corpo: texto ? JSON.parse(texto) : null,
      })
      if (caminho.startsWith('/api/catalog-lookups')) {
        return json({ id: ITEM_ATIVO, kind: 'MARCA', name: 'EVOLED', active: true })
      }
      throw new Error(`escrita sem stub no teste: ${caminho}`)
    }

    if (caminho === '/auth/me') return respostaSessao()
    if (caminho === '/auth/tenants') return respostaVinculos()
    if (caminho === '/api/catalog-lookups') {
      consultas.push(url.searchParams.get('kind') ?? '')
      return json({
        rows: [
          { id: ITEM_ATIVO, kind: 'MARCA', name: 'EVOLED', active: true },
          { id: ITEM_INATIVO, kind: 'MARCA', name: 'STELLA', active: false },
        ],
        total: 2,
      })
    }
    throw new Error(`fetch sem stub no teste: ${url}`)
  }

  return { stub, escritas, consultas }
}

describe('tela de listas de apoio', () => {
  it('mostra o item INATIVO — é ele que alguém vem aqui reativar', async () => {
    const { stub } = servidor()
    renderRoute('/config/listas', stub)

    const tabela = within(await screen.findByRole('table'))
    expect(await tabela.findByText('EVOLED')).toBeInTheDocument()
    // O combo esconderia esta linha; esta tela não.
    expect(tabela.getByText('STELLA')).toBeInTheDocument()
  })

  it('consulta pelo kind DO BACKEND, não pela chave de UI', async () => {
    const { stub, consultas } = servidor()
    const { user } = renderRoute('/config/listas', stub)

    await screen.findByRole('table')
    await user.selectOptions(screen.getByLabelText('Lista'), 'marca')

    // `MARCA` e não `marca`: kind desconhecido não dá erro, dá 200 vazio — o
    // defeito apareceria como tela em branco, sem nada vermelho em lugar algum.
    await waitFor(() => expect(consultas).toContain('MARCA'))
    expect(consultas).not.toContain('marca')
  })

  it('alterar manda nome E active juntos, e NUNCA o kind', async () => {
    const { stub, escritas } = servidor()
    const { user } = renderRoute('/config/listas', stub)

    const tabela = within(await screen.findByRole('table'))
    await user.click(await tabela.findByText('STELLA'))

    const nome = await screen.findByLabelText('Nome')
    await waitFor(() => expect(nome).toHaveValue('STELLA'))
    await user.clear(nome)
    await user.type(nome, 'STELLA LED')
    // Reativar o que estava aposentado — o gesto que só existe nesta tela.
    await user.click(screen.getByRole('checkbox', { name: /Ativo/ }))
    await user.click(screen.getByRole('button', { name: 'Gravar' }))

    await waitFor(() => expect(escritas).toHaveLength(1))
    expect(escritas[0]).toMatchObject({
      metodo: 'PUT',
      caminho: `/api/catalog-lookups/${ITEM_INATIVO}`,
    })
    // O `PUT` substitui o registro: os dois campos, sempre.
    expect(escritas[0]?.corpo).toEqual({ name: 'STELLA LED', active: true })
  })

  it('incluir manda o kind do backend e nasce ativo', async () => {
    const { stub, escritas } = servidor()
    const { user } = renderRoute('/config/listas', stub)

    await screen.findByRole('table')
    await user.click(screen.getByRole('button', { name: 'Incluir item' }))
    await user.type(await screen.findByLabelText('Nome'), 'PHILIPS')
    await user.click(screen.getByRole('button', { name: 'Gravar' }))

    await waitFor(() => expect(escritas).toHaveLength(1))
    expect(escritas[0]).toMatchObject({ metodo: 'POST', caminho: '/api/catalog-lookups' })
    expect(escritas[0]?.corpo).toMatchObject({ name: 'PHILIPS', active: true })
    // O kind viaja no CORPO (a tabela é uma só, discriminada por ele) e é o do
    // backend, em MAIÚSCULA.
    expect((escritas[0]?.corpo as { kind: string }).kind).toMatch(/^[A-Z_]+$/)
  })
})
