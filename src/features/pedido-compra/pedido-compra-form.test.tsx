import { renderRoute } from '@/test/utils'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('tela Pedido de Compra', () => {
  it('listagem concatena os N fornecedores do pedido', async () => {
    renderRoute('/compras/pedidos')

    // §7.3: um pedido tem N fornecedores, concatenados por " - ".
    expect(await screen.findByText('EVOLED (ATIVA COMERCIAL) - FILLAMENTO')).toBeInTheDocument()
  })

  // O campo é `string[]`: sem semântica de array, o `iLike` casaria contra a
  // lista concatenada por vírgula — separador que a tela nem mostra.
  it('filtrar por fornecedor acha o pedido que tem ESSE entre vários', async () => {
    const { user } = renderRoute('/compras/pedidos')
    await screen.findByText('EVOLED (ATIVA COMERCIAL) - FILLAMENTO')

    await user.click(screen.getByRole('button', { name: /^Filtro/ }))
    await user.click(await screen.findByRole('button', { name: 'Adicionar filtro' }))
    await user.click(screen.getByRole('button', { name: 'Campo do filtro 1' }))
    await user.click(await screen.findByRole('menuitemradio', { name: /Fornecedores/ }))
    await user.type(await screen.findByLabelText('Valor do filtro 1'), 'fillamento')

    // O pedido tem Evoled E Fillamento: procurar por um dos dois tem de achá-lo.
    expect(await screen.findByText('EVOLED (ATIVA COMERCIAL) - FILLAMENTO')).toBeInTheDocument()
  })

  // §7.3: `Pedido de Venda` vazio = compra para ESTOQUE. A consulta existe.
  it('"está vazio" no pedido de venda separa a compra para estoque', async () => {
    const { user } = renderRoute('/compras/pedidos')
    await screen.findByText('EVOLED (ATIVA COMERCIAL) - FILLAMENTO')

    await user.click(screen.getByRole('button', { name: /^Filtro/ }))
    await user.click(await screen.findByRole('button', { name: 'Adicionar filtro' }))
    await user.click(screen.getByRole('button', { name: 'Campo do filtro 1' }))
    await user.click(await screen.findByRole('menuitemradio', { name: /Pedido de Venda/ }))
    await user.selectOptions(screen.getByLabelText('Operador do filtro 1'), 'isEmpty')

    // Operador que dispensa valor: some o campo, e a consulta sai assim mesmo.
    await waitFor(() => {
      expect(screen.queryByLabelText('Valor do filtro 1')).not.toBeInTheDocument()
    })
  })

  it('abre pedido com múltiplos fornecedores e permite incluir outro', async () => {
    const { user } = renderRoute('/compras/pedidos/13')

    expect(await screen.findByLabelText('Fornecedor 1')).toHaveValue('DSGNSELO')
    expect(screen.getByLabelText('Fornecedor 2')).toHaveValue('MISTER LED')

    await user.click(screen.getByRole('button', { name: 'Incluir fornecedor' }))
    expect(await screen.findByLabelText('Fornecedor 3')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Excluir fornecedor 3' }))
    await waitFor(() => {
      expect(screen.queryByLabelText('Fornecedor 3')).not.toBeInTheDocument()
    })
  })

  it('item nasce com destino e o total soma as linhas', async () => {
    const { user } = renderRoute('/compras/pedidos/novo')

    await screen.findByLabelText('Código')
    await user.click(screen.getByRole('button', { name: /Produto \(Alt\+P\)/ }))

    // §7.4: o item comprado já nasce com destino definido.
    expect(await screen.findByLabelText('Destino linha 1')).toHaveValue('ESTOQUE')

    await user.type(screen.getByLabelText('Quantidade linha 1'), '2')
    await user.type(screen.getByLabelText('Valor Unit. linha 1'), '15050')

    await waitFor(() => {
      expect(screen.getByLabelText('Total')).toHaveTextContent('301,00')
    })
  })

  it('navega para a ordem de compra relacionada', async () => {
    const { router, user } = renderRoute('/compras/pedidos/1')

    await screen.findByLabelText('Código')
    await user.click(screen.getByRole('button', { name: 'Ordem de Compra' }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/compras/ordens')
    })
  })
})
