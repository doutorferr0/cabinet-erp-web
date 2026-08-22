import './temporal'
import { renderRoute, respostaLookups, respostaSessao, respostaVinculos } from '@/test/utils'
import { waitFor } from '@testing-library/react'
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

describe('tela Agenda', () => {
  it('monta o Schedule-X e mostra o título do compromisso', async () => {
    const { container } = renderRoute('/agenda', stubDaAgenda())

    await waitFor(() => {
      expect(container.querySelector('.sx__calendar')).toBeInTheDocument()
    })
  })
})
