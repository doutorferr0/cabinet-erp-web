import { renderRoute } from '@/test/utils'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * Modo `Consul.` — transcrição §9 padrão 8. A tela é a mesma do `Alterar`;
 * o que muda é não poder editar nem gravar.
 */
describe('CadastroForm em modo consulta', () => {
  it('carrega os dados mas desabilita os campos e esconde Gravar', async () => {
    renderRoute('/cadastros/clientes/1?modo=consulta')

    const nome = await screen.findByLabelText('Nome')
    expect(nome).toHaveValue('ANDRÉ BATALHA')
    expect(nome).toBeDisabled()

    expect(screen.queryByRole('button', { name: /Gravar/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Fechar/ })).toBeInTheDocument()
    expect(screen.getByText(/— Consulta/)).toBeInTheDocument()
  })

  it('desabilita também os botões de dentro do formulário', async () => {
    renderRoute('/cadastros/clientes/1?modo=consulta')

    await screen.findByLabelText('Nome')
    // `<fieldset disabled>` alcança botão de busca, não só input.
    expect(screen.getByRole('button', { name: 'Buscar cidade' })).toBeDisabled()
  })

  it('sem o search param a tela continua editável', async () => {
    renderRoute('/cadastros/clientes/1')

    const nome = await screen.findByLabelText('Nome')
    expect(nome).toBeEnabled()
    expect(screen.getByRole('button', { name: /Gravar/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Fechar/ })).not.toBeInTheDocument()
  })

  it('ação Consul. da listagem leva ao modo consulta', async () => {
    const { router, user } = renderRoute('/cadastros/clientes')

    await user.click(await screen.findByText('ANDRÉ BATALHA'))
    await user.click(screen.getByRole('button', { name: 'Consul.' }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/cadastros/clientes/1')
    })
    expect(router.state.location.search).toEqual({ modo: 'consulta' })
    expect(await screen.findByRole('button', { name: /Fechar/ })).toBeInTheDocument()
  })

  it('ação Alterar da mesma listagem NÃO entra em consulta', async () => {
    const { router, user } = renderRoute('/cadastros/clientes')

    await user.click(await screen.findByText('ANDRÉ BATALHA'))
    await user.click(screen.getByRole('button', { name: 'Alterar' }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/cadastros/clientes/1')
    })
    expect(router.state.location.search).toEqual({})
  })

  it('grade do documento também fica somente-leitura', async () => {
    renderRoute('/compras/ordens/2?modo=consulta')

    // O total continua sendo calculado e exibido…
    expect(await screen.findByLabelText('SubTotal')).toHaveTextContent('309,81')
    // …mas nenhuma célula aceita digitação.
    expect(screen.getByLabelText('Quantidade linha 1')).toBeDisabled()
    expect(screen.getByRole('button', { name: /Busca \(Alt\+T\)/ })).toBeDisabled()
  })

  it('rodapé fixo usa régua forte na borda superior (DESIGN.md)', async () => {
    renderRoute('/cadastros/clientes/1')

    const gravar = await screen.findByRole('button', { name: /Gravar/ })
    const rodape = gravar.closest('div')
    expect(rodape?.className).toContain('border-t')
    expect(rodape?.className).toContain('border-rule-strong')
  })
})
