import { URL_PARCEIROS } from '@/data/parceiros-api'
import { parceiro } from '@/test/parceiros'
import { json } from '@/test/servidor'
import { type FetchStub, renderRoute, respostaSessao, respostaVinculos } from '@/test/utils'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

/**
 * A HIERARQUIA NA TELA (issue #91) — pela rota de verdade, não pelo componente
 * isolado: o bloco depende da linha que `usarParceiro` busca, e montá-lo à mão
 * testaria uma composição que a tela não faz.
 *
 * Cliente é a tela escolhida porque é a que MENOS tem a ver com hierarquia — se
 * o vínculo aparece aqui, aparece nas três, e o caso real (escritório ↔
 * arquitetos) atravessa papéis de propósito.
 */

const ESCRITORIO = '11111111-1111-4111-8111-111111111111'
const ARQUITETO = '22222222-2222-4222-8222-222222222222'
const OUTRO = '33333333-3333-4333-8333-333333333333'

function servidor({ parentId = null as string | null, parentName = null as string | null } = {}) {
  const registrado: { corpos: unknown[] } = { corpos: [] }

  const stub: FetchStub = async (entrada) => {
    const requisicao = entrada instanceof Request ? entrada : null
    const url = new URL(String(requisicao ? requisicao.url : entrada), 'http://localhost')
    const caminho = url.pathname

    if (caminho === '/auth/me') return respostaSessao()
    if (caminho === '/auth/tenants') return respostaVinculos()

    if (requisicao && requisicao.method.toUpperCase() === 'PUT') {
      registrado.corpos.push(JSON.parse(await requisicao.clone().text()))
      return json(parceiro({ id: ESCRITORIO }))
    }

    if (caminho === `${URL_PARCEIROS}/${ESCRITORIO}`) {
      return json(
        parceiro({
          id: ESCRITORIO,
          legalName: 'ESTÚDIO FERRARI',
          isCustomer: true,
          isSupplier: false,
          parentId,
          parentName,
        }),
      )
    }

    if (caminho === URL_PARCEIROS) {
      // A MESMA rota serve duas perguntas: a lista de filhos (com `filters`) e
      // a janela de busca do pai (sem). Discriminar pelo parâmetro é o que o
      // servidor real faz — stub que casasse só por caminho responderia a busca
      // com a lista de filhos e o teste passaria sem asserir nada.
      const filtros = url.searchParams.get('filters')
      if (filtros?.includes('parentId')) {
        return json({
          rows: [parceiro({ id: ARQUITETO, legalName: 'ANA CAROLINA RIBEIRO' })],
          total: 1,
        })
      }
      return json({
        rows: [
          parceiro({ id: ARQUITETO, legalName: 'ANA CAROLINA RIBEIRO' }),
          parceiro({ id: OUTRO, legalName: 'MAURO TAGLIARI' }),
        ],
        total: 2,
      })
    }

    return Promise.reject(new Error(`fetch sem stub: ${url}`))
  }

  return { stub, registrado }
}

describe('vínculo pai/filho na tela de parceiro', () => {
  it('mostra quem é o pai e quem pende deste cadastro', async () => {
    renderRoute(
      `/cadastros/clientes/${ESCRITORIO}`,
      servidor({ parentId: OUTRO, parentName: 'GRUPO TAGLIARI' }).stub,
    )

    expect(await screen.findByText('GRUPO TAGLIARI')).toBeInTheDocument()
    // O nome do pai vem do DTO, não de uma segunda consulta: nenhuma chamada a
    // `/api/partners/OUTRO` foi stubada e o teste passa.
    expect(await screen.findByText('ANA CAROLINA RIBEIRO')).toBeInTheDocument()
    expect(screen.getByText(/Vinculados \(1\)/)).toBeInTheDocument()
  })

  it('sem pai, diz que não há — e não finge lista vazia de filhos', async () => {
    renderRoute(`/cadastros/clientes/${ESCRITORIO}`, servidor().stub)

    expect(await screen.findByText('Não vinculado a ninguém.')).toBeInTheDocument()
  })

  it('vincular manda o `PUT` com o pai escolhido, sem mexer no resto', async () => {
    const usuario = userEvent.setup()
    const { stub, registrado } = servidor()
    renderRoute(`/cadastros/clientes/${ESCRITORIO}`, stub)

    await usuario.click(await screen.findByRole('button', { name: 'Vincular' }))
    const dialogo = await screen.findByRole('dialog')
    await usuario.click(await within(dialogo).findByText('MAURO TAGLIARI'))
    await usuario.click(within(dialogo).getByRole('button', { name: 'Selecionar' }))

    await waitFor(() => expect(registrado.corpos).toHaveLength(1))
    const corpo = registrado.corpos[0] as Record<string, unknown>
    expect(corpo.parentId).toBe(OUTRO)
    // O `PUT` substitui o registro inteiro: o que a ação não menciona tem de
    // voltar como veio, senão vincular apagaria código e condição de pagamento.
    expect(corpo.code).toBe('F001')
    expect(corpo.paymentTerms).toBe('30/60/90')
    expect(corpo.legalName).toBe('ESTÚDIO FERRARI')
  })

  it('escolher um dos próprios filhos é recusado ANTES de gravar', async () => {
    const usuario = userEvent.setup()
    const { stub, registrado } = servidor()
    renderRoute(`/cadastros/clientes/${ESCRITORIO}`, stub)

    // Espera a lista de filhos chegar — é ela que sustenta a recusa.
    await screen.findByText('ANA CAROLINA RIBEIRO')

    await usuario.click(screen.getByRole('button', { name: 'Vincular' }))
    const dialogo = await screen.findByRole('dialog')
    await usuario.click(await within(dialogo).findByText('ANA CAROLINA RIBEIRO'))
    await usuario.click(within(dialogo).getByRole('button', { name: 'Selecionar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/laço/)
    // Nada foi gravado: a recusa é da tela, e o operador vê o motivo em vez de
    // um 400 do servidor depois do fato.
    expect(registrado.corpos).toEqual([])
  })

  it('em modo consulta o vínculo aparece e as ações não', async () => {
    renderRoute(
      `/cadastros/clientes/${ESCRITORIO}?modo=consulta`,
      servidor({ parentId: OUTRO, parentName: 'GRUPO TAGLIARI' }).stub,
    )

    expect(await screen.findByText('GRUPO TAGLIARI')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Trocar' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Desvincular' })).toBeNull()
  })
})
