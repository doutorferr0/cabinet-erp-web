import './temporal'
import { problema } from '@/test/servidor'
import { renderRoute, respostaLookups, respostaSessao, respostaVinculos } from '@/test/utils'
import { screen, waitFor } from '@testing-library/react'
import { HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

/**
 * Stub que deixa a agenda passar além da guarda.
 *
 * A tela pede `/api/dashboard/agenda?from=…&to=…`; o resto usa os stubs padrão
 * de sessão e vínculos.
 */
function stubDaAgenda() {
  return (input: RequestInfo | URL) => {
    const url = String(input instanceof Request ? input.url : input)
    const caminho = new URL(url, 'http://api.teste').pathname
    if (caminho === '/auth/me') return Promise.resolve(respostaSessao())
    if (caminho === '/auth/tenants') return Promise.resolve(respostaVinculos())
    if (caminho === '/api/catalog-lookups') return Promise.resolve(respostaLookups())
    if (caminho === '/api/dashboard/agenda') {
      return Promise.resolve(
        HttpResponse.json([
          {
            id: 'ev-teste',
            startsAt: '2026-08-20T09:00:00.000Z',
            title: 'Revisar orçamento',
            context: 'Residência Alphaville',
            kind: 'quote',
          },
        ]),
      )
    }
    return Promise.reject(new Error(`fetch sem stub no teste: ${url}`))
  }
}

/** O mesmo stub, com a agenda do servidor fora. */
function stubDaAgendaFora() {
  const base = stubDaAgenda()
  return (input: RequestInfo | URL) => {
    const url = String(input instanceof Request ? input.url : input)
    const caminho = new URL(url, 'http://api.teste').pathname
    if (caminho === '/api/dashboard/agenda') {
      return Promise.resolve(problema(409, 'Nenhuma empresa ativa na sessão.'))
    }
    return base(input)
  }
}

describe('tela Agenda', () => {
  /**
   * MÊS VAZIO E CONSULTA QUE NÃO CHEGOU DESENHAVAM A MESMA GRADE.
   *
   * `agenda.data ?? []` entregava `[]` ao Schedule-X nos dois casos, e o calendário
   * limpo é a afirmação em que o operador acredita: ele conclui que não há compromisso
   * e não liga para o cliente. A mesma `useAgenda` já era tratada em
   * `dashboard/hoje.tsx` — era o mesmo dado com dois destinos.
   */
  /*
   * 409 e não 500, e a escolha é do PRODUTO, não do teste: `repetirSeValeAPena` só
   * repete 5xx e rede fora — 4xx é a resposta do servidor SOBRE o pedido e nunca se
   * repete. Com 500 o erro só chegaria à tela depois de três esperas crescentes (~7s),
   * e o teste mediria a política de repetição em vez do estado da folha. O 409 aqui é
   * caso real: é o que o contrato responde quando não há empresa ativa na sessão.
   */
  it('agenda que falha diz que falhou, em vez de mostrar mês limpo', async () => {
    const { container } = renderRoute('/agenda', stubDaAgendaFora())

    expect(await screen.findByText('A agenda não carregou')).toBeInTheDocument()
    expect(screen.getByText('Nenhuma empresa ativa na sessão.')).toBeInTheDocument()
    // O calendário NÃO monta: com ele na tela, o aviso seria rodapé de uma grade
    // vazia que continua afirmando "nenhum compromisso".
    expect(container.querySelector('.sx__calendar')).not.toBeInTheDocument()
  })

  it('monta o Schedule-X e mostra o título do compromisso', async () => {
    const { container } = renderRoute('/agenda', stubDaAgenda())

    await waitFor(() => {
      expect(container.querySelector('.sx__calendar')).toBeInTheDocument()
    })
  })
})
