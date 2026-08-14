import { TelaDeDocumento } from '@/components/cabinet/tela-de-documento'
import type { DocumentoProvider } from '@/data/provider'
import { renderWithQuery } from '@/test/utils'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * Os três documentos que usam `TelaDeDocumento` (Orçamento, Ordem de Compra,
 * Pedido de Compra) são `createMockProvider` e nunca rejeitam — por isso este
 * teste é do componente isolado, com um provider que rejeita de propósito, e
 * não de rota (Fase 7 item 1 do refactor: braço de erro que faltava).
 */
function providerQueRejeita(): DocumentoProvider<{ id: number }> {
  return {
    get: () => Promise.reject(new Error('sem servidor')),
    empty: () => ({ id: -1 }),
  }
}

describe('TelaDeDocumento', () => {
  it('get que rejeita mostra erro, não "não encontrado"', async () => {
    renderWithQuery(
      <TelaDeDocumento
        provider={providerQueRejeita()}
        queryKeyBase="teste"
        idParam="1"
        titulo="Teste"
        numero={() => undefined}
        naoEncontrado="Teste não encontrado."
        erroAoCarregar="Não foi possível carregar o teste."
      >
        {() => <p>conteúdo do documento</p>}
      </TelaDeDocumento>,
    )

    await screen.findByText('Não foi possível carregar o teste.')
    expect(screen.queryByText('Teste não encontrado.')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
  })

  it('tentar de novo refaz a consulta e mostra o documento quando ela resolve', async () => {
    let tentativas = 0
    const { user } = renderWithQuery(
      <TelaDeDocumento
        provider={{
          get: async () => {
            tentativas += 1
            if (tentativas === 1) throw new Error('sem servidor')
            return { id: 7 }
          },
          empty: () => ({ id: -1 }),
        }}
        queryKeyBase="teste-retry"
        idParam="7"
        titulo="Teste"
        numero={(doc) => doc.id}
        naoEncontrado="Teste não encontrado."
        erroAoCarregar="Não foi possível carregar o teste."
      >
        {(doc) => <p>documento {doc.id}</p>}
      </TelaDeDocumento>,
    )

    await user.click(await screen.findByRole('button', { name: 'Tentar de novo' }))
    expect(await screen.findByText('documento 7')).toBeInTheDocument()
    expect(tentativas).toBe(2)
  })

  it('get que resolve null mostra "não encontrado", não erro', async () => {
    renderWithQuery(
      <TelaDeDocumento
        provider={{
          get: () => Promise.resolve(null),
          empty: () => ({ id: -1 }),
        }}
        queryKeyBase="teste"
        idParam="1"
        titulo="Teste"
        numero={() => undefined}
        naoEncontrado="Teste não encontrado."
        erroAoCarregar="Não foi possível carregar o teste."
      >
        {() => <p>conteúdo do documento</p>}
      </TelaDeDocumento>,
    )

    await screen.findByText('Teste não encontrado.')
    expect(screen.queryByText('Não foi possível carregar o teste.')).not.toBeInTheDocument()
  })
})
