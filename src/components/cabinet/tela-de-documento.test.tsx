import { TelaDeDocumento } from '@/components/cabinet/tela-de-documento'
import type { DocumentoProvider } from '@/data/provider'
import { renderWithQuery } from '@/test/utils'
import { screen, within } from '@testing-library/react'
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

  /**
   * FUSÃO v5 §3 — a moldura-mãe é uma declaração de FRONTEIRA: o que está
   * dentro pertence ao documento. A espec cita Atividades pelo nome como o
   * exemplo do que fica de fora, e é por isso que existe `foraDaMoldura`:
   * passar o painel como `children` o penduraria dentro da moldura e o desenho
   * mentiria — com a tela parecendo perfeitamente certa.
   */
  it('a moldura-mãe envolve cabeçalho e formulário, e leva o número do documento', async () => {
    renderWithQuery(
      <TelaDeDocumento
        provider={{
          get: () => Promise.resolve({ id: 7 }),
          empty: () => ({ id: -1 }),
        }}
        queryKeyBase="teste"
        idParam="7"
        titulo="Orçamento"
        numero={() => 184}
        naoEncontrado="não encontrado"
        erroAoCarregar="erro"
      >
        {() => <p>formulário do documento</p>}
      </TelaDeDocumento>,
    )

    const moldura = await screen.findByRole('region', { name: 'DOCUMENTO · Orçamento Nº 184' })
    expect(within(moldura).getByText('formulário do documento')).toBeInTheDocument()
    // O cabeçalho é do documento e mora DENTRO — envolver só o form o deixaria
    // do lado de fora da fronteira que ele mesmo nomeia.
    expect(within(moldura).getByText('Orçamento', { selector: 'h1' })).toBeInTheDocument()
  })

  it('em inclusão a moldura fala só o tipo — não há número a mostrar', async () => {
    renderWithQuery(
      <TelaDeDocumento
        provider={{
          get: () => Promise.reject(new Error('não deveria buscar')),
          empty: () => ({ id: -1 }),
        }}
        queryKeyBase="teste"
        idParam="novo"
        titulo="Pedido de Compra"
        modo="Incluir"
        numero={() => 999}
        naoEncontrado="não encontrado"
        erroAoCarregar="erro"
      >
        {() => <p>formulário em branco</p>}
      </TelaDeDocumento>,
    )

    expect(
      await screen.findByRole('region', { name: 'DOCUMENTO · Pedido de Compra' }),
    ).toBeInTheDocument()
  })

  it('o que NÃO é do documento monta fora da moldura', async () => {
    renderWithQuery(
      <TelaDeDocumento
        provider={{
          get: () => Promise.resolve({ id: 7 }),
          empty: () => ({ id: -1 }),
        }}
        queryKeyBase="teste"
        idParam="7"
        titulo="Orçamento"
        numero={() => 184}
        naoEncontrado="não encontrado"
        erroAoCarregar="erro"
        foraDaMoldura={() => <p>painel de atividades</p>}
      >
        {() => <p>formulário do documento</p>}
      </TelaDeDocumento>,
    )

    const moldura = await screen.findByRole('region', { name: 'DOCUMENTO · Orçamento Nº 184' })
    // Renderizado na tela, mas do LADO DE FORA: é essa diferença que a moldura
    // existe para desenhar, e `getByText` sozinho não a enxergaria.
    expect(screen.getByText('painel de atividades')).toBeInTheDocument()
    expect(within(moldura).queryByText('painel de atividades')).not.toBeInTheDocument()
  })
})
