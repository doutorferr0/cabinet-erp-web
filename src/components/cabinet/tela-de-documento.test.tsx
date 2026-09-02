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
   * ESQUELETO 2.0 (#483): a moldura-mãe da fusão v5 saiu — ela desenhava a
   * fronteira do documento com uma quinta ferramenta de separação, por cima
   * das quatro da §Hierarquia. Quem separa agora é a COLUNA, que é espaço.
   */
  it('o cabeçalho traz o registro e o id, sem moldura em volta', async () => {
    const { container } = renderWithQuery(
      <TelaDeDocumento
        provider={{ get: () => Promise.resolve({ id: 7 }), empty: () => ({ id: -1 }) }}
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

    expect(await screen.findByRole('heading', { name: 'Orçamento 184' })).toBeInTheDocument()
    expect(screen.getByText('formulário do documento')).toBeInTheDocument()
    expect(container.querySelector('[data-slot="documento-frame"]')).toBeNull()
    expect(container.querySelector('[data-slot="documento-etiqueta"]')).toBeNull()
  })

  it('em inclusão o cabeçalho fala só o tipo — não há id a mostrar', async () => {
    const { container } = renderWithQuery(
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

    expect(await screen.findByText('formulário em branco')).toBeInTheDocument()
    expect(container.querySelector('[data-slot="registro-id"]')).toBeNull()
    // O modo desce para a linha de meta: colado ao título, o leitor de tela
    // anunciava "Pedido de Compra — Incluir" como nome do documento.
    expect(screen.getByRole('heading', { name: 'Pedido de Compra' })).toBeInTheDocument()
    expect(screen.getByText('Incluir')).toBeInTheDocument()
  })

  it('o que ORBITA o documento vai para a lateral, e não para a coluna dele', async () => {
    const { container } = renderWithQuery(
      <TelaDeDocumento
        provider={{ get: () => Promise.resolve({ id: 7 }), empty: () => ({ id: -1 }) }}
        queryKeyBase="teste"
        idParam="7"
        titulo="Ordem de compra"
        numero={() => 'OC-5102'}
        naoEncontrado="não encontrado"
        erroAoCarregar="erro"
        lateral={() => <p>Mister LED</p>}
      >
        {() => <p>itens da ordem</p>}
      </TelaDeDocumento>,
    )

    await screen.findByText('itens da ordem')
    const principal = container.querySelector('[data-slot="registro-principal"]')
    const lateral = container.querySelector('[data-slot="registro-lateral"]')
    expect(within(principal as HTMLElement).getByText('itens da ordem')).toBeInTheDocument()
    expect(within(lateral as HTMLElement).getByText('Mister LED')).toBeInTheDocument()
  })

  /**
   * A primária do cabeçalho é o PRÓXIMO PASSO, então ela é função do estado do
   * documento — o mesmo esqueleto mostra "Confirmar recebimento" numa ordem
   * enviada e nada numa cancelada.
   */
  it('proximaAcao muda com o estado do registro', async () => {
    function tela(estado: string) {
      return (
        <TelaDeDocumento
          provider={{
            get: () => Promise.resolve({ id: 7, estado }),
            empty: () => ({ id: -1, estado }),
          }}
          queryKeyBase={`teste-${estado}`}
          idParam="7"
          titulo="Ordem de compra"
          numero={() => 'OC-5102'}
          naoEncontrado="não encontrado"
          erroAoCarregar="erro"
          cabecalho={(doc) =>
            doc.estado === 'enviada'
              ? {
                  badge: { tom: 'open' as const, label: 'Enviada' },
                  proximaAcao: { id: 'receber', label: 'Confirmar recebimento' },
                }
              : { badge: { tom: 'void' as const, label: 'Cancelada' } }
          }
        >
          {() => <p>itens da ordem</p>}
        </TelaDeDocumento>
      )
    }

    const { unmount } = renderWithQuery(tela('enviada'))
    expect(await screen.findByRole('button', { name: 'Confirmar recebimento' })).toBeInTheDocument()
    unmount()

    renderWithQuery(tela('cancelada'))
    await screen.findByText('Cancelada')
    expect(screen.queryByRole('button', { name: 'Confirmar recebimento' })).not.toBeInTheDocument()
  })

  it('o que NÃO é do registro monta fora das duas colunas', async () => {
    const { container } = renderWithQuery(
      <TelaDeDocumento
        provider={{ get: () => Promise.resolve({ id: 7 }), empty: () => ({ id: -1 }) }}
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

    await screen.findByText('formulário do documento')
    const layout = container.querySelector('[data-slot="layout-do-registro"]')
    // Renderizado na tela, mas do LADO DE FORA das colunas: Atividades tem
    // gravação própria e não pertence ao documento.
    expect(screen.getByText('painel de atividades')).toBeInTheDocument()
    expect(
      within(layout as HTMLElement).queryByText('painel de atividades'),
    ).not.toBeInTheDocument()
  })
})
