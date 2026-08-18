import { renderRoute } from '@/test/utils'
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('tela Ordem de Compra', () => {
  it('listagem mostra as ordens com data em pt-BR', async () => {
    renderRoute('/compras/ordens')

    expect(await screen.findByText('EVOLED (ATIVA COMERCIAL)')).toBeInTheDocument()
    expect(screen.getAllByText('05/08/2025').length).toBeGreaterThan(0)
  })

  // "O que estava previsto e não chegou" é a pergunta do comprador, e
  // `dataPrevista` filtra sem ser coluna — a assimetria só corre para este lado.
  it('filtra por data prevista, que não é coluna', async () => {
    const { user } = renderRoute('/compras/ordens')
    await screen.findByText('EVOLED (ATIVA COMERCIAL)')

    await user.click(screen.getByRole('button', { name: /^Adicionar filtro/ }))
    await user.click(await screen.findByRole('menuitem', { name: /Data Prevista/ }))

    expect(await screen.findByLabelText('Valor do filtro 1')).toHaveAttribute('type', 'date')
  })

  it('abre a ordem e calcula subtotal, desconto e total', async () => {
    const { user } = renderRoute('/compras/ordens/2')

    // Item mockado: 3 × R$ 103,27 = R$ 309,81.
    expect(await screen.findByLabelText('SubTotal')).toHaveTextContent('309,81')
    expect(screen.getByLabelText('Total')).toHaveTextContent('309,81')

    // "Desconto" existe duas vezes: o campo e o rótulo do total.
    await user.type(screen.getByLabelText('Desconto', { selector: 'input' }), '5000')
    await waitFor(() => {
      expect(screen.getByLabelText('Total')).toHaveTextContent('259,81')
    })
  })

  it('busca de transportadora (janela auxiliar) preenche os rótulos do bloco', async () => {
    const { user } = renderRoute('/compras/ordens/1')

    await screen.findByLabelText('Código')
    expect(screen.getByLabelText('Nome da transportadora')).toHaveTextContent('—')

    await user.click(screen.getByRole('button', { name: /Busca \(Alt\+T\)/ }))

    // janela de busca com a MESMA DataTable, contra `data.transportadoras`.
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('Busca de Transportadora')

    const linha = await within(dialog).findByText('TRANSPORTES CAMPINAS LTDA')
    await user.click(linha)
    await user.click(screen.getByRole('button', { name: 'Selecionar' }))

    await waitFor(() => {
      expect(screen.getByLabelText('Nome da transportadora')).toHaveTextContent(
        'TRANSPORTES CAMPINAS LTDA',
      )
    })
    expect(screen.getByLabelText('UF da transportadora')).toHaveTextContent('SP')
  })

  it('navega para o pedido de compra relacionado', async () => {
    const { router, user } = renderRoute('/compras/ordens/1')

    await screen.findByLabelText('Código')
    await user.click(screen.getByRole('button', { name: 'Pedido de Compra' }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/compras/pedidos')
    })
  })
})
