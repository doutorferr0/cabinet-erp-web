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
 *   registro, e mandar só o nome apagaria o `active` que estava lá. Desde a D27
 *   as duas edições são gestos SEPARADOS (célula e botão), e por isso cada uma
 *   precisa provar que carrega o campo que ela não mexeu;
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

  it('renomear pela CÉLULA manda nome E active juntos, e NUNCA o kind', async () => {
    const { stub, escritas } = servidor()
    const { user } = renderRoute('/config/listas', stub)

    const tabela = within(await screen.findByRole('table'))
    // Sem diálogo no caminho: a célula É o campo (D27). O gatilho nomeia coluna
    // e registro porque numa lista de 30 "Editar" sozinho não diz o quê.
    await user.click(await tabela.findByRole('button', { name: 'Editar Nome de STELLA' }))

    const nome = await screen.findByRole('textbox', { name: 'Nome de STELLA' })
    expect(nome).toHaveValue('STELLA')
    await user.clear(nome)
    await user.type(nome, 'STELLA LED{Enter}')

    await waitFor(() => expect(escritas).toHaveLength(1))
    expect(escritas[0]).toMatchObject({
      metodo: 'PUT',
      caminho: `/api/catalog-lookups/${ITEM_INATIVO}`,
    })
    // O `PUT` substitui o registro: os dois campos, sempre. O `active` do
    // registro viaja como está — mandar só o nome apagaria a desativação, e o
    // item aposentado voltaria ao combo sem ninguém ter pedido.
    expect(escritas[0]?.corpo).toEqual({ name: 'STELLA LED', active: false })
  })

  it('REATIVAR é a outra escrita, e não passa por confirmação', async () => {
    const { stub, escritas } = servidor()
    const { user } = renderRoute('/config/listas', stub)

    await screen.findByRole('table')
    // `Reativar` é único na grade — só STELLA está inativa —, e é justamente
    // isso que o botão diz: a linha de item ATIVO oferece `Desativar`. O gesto
    // não passa por confirmação: confirmar o reversível ensina o operador a
    // clicar `Sim` sem ler.
    await user.click(await screen.findByRole('button', { name: 'Reativar' }))

    await waitFor(() => expect(escritas).toHaveLength(1))
    expect(escritas[0]).toMatchObject({
      metodo: 'PUT',
      caminho: `/api/catalog-lookups/${ITEM_INATIVO}`,
    })
    // O nome vai junto, intacto — é a mesma substituição de registro inteiro.
    expect(escritas[0]?.corpo).toEqual({ name: 'STELLA', active: true })
  })

  it('incluir pelo RODAPÉ manda o kind do backend e nasce ativo', async () => {
    const { stub, escritas } = servidor()
    const { user } = renderRoute('/config/listas', stub)

    await screen.findByRole('table')
    // A linha nova mora na grade, não num diálogo: o campo do rodapé tracejado
    // é o próprio gesto de incluir.
    const campo = await screen.findByRole('textbox', { name: /Novo item em/ })
    await user.type(campo, 'PHILIPS{Enter}')

    await waitFor(() => expect(escritas).toHaveLength(1))
    expect(escritas[0]).toMatchObject({ metodo: 'POST', caminho: '/api/catalog-lookups' })
    expect(escritas[0]?.corpo).toMatchObject({ name: 'PHILIPS', active: true })
    // O kind viaja no CORPO (a tabela é uma só, discriminada por ele) e é o do
    // backend, em MAIÚSCULA.
    expect((escritas[0]?.corpo as { kind: string }).kind).toMatch(/^[A-Z_]+$/)
    // E o campo esvazia para o próximo: quem povoa uma lista digita vários
    // seguidos, e isso é o que torna a série um gesto só.
    await waitFor(() => expect(campo).toHaveValue(''))
  })
})
