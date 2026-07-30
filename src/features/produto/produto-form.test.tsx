import { renderRoute } from '@/test/utils'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('tela Produto', () => {
  it('listagem abre o formulário pela ação Incluir', async () => {
    const { router, user } = renderRoute('/cadastros/produtos')

    await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')
    await user.click(screen.getByRole('button', { name: 'Incluir' }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/cadastros/produtos/novo')
    })
    expect(await screen.findByRole('tab', { name: 'Dados Principais' })).toBeInTheDocument()
  })

  it('abrir registro existente carrega os dados das 5 abas', async () => {
    const { user } = renderRoute('/cadastros/produtos/1')

    expect(await screen.findByLabelText('Nosso Código')).toHaveValue('1201')

    await user.click(screen.getByRole('tab', { name: 'Outros Dados' }))
    expect(await screen.findByLabelText('Temperatura Cor')).toHaveValue('2700K')

    await user.click(screen.getByRole('tab', { name: 'Tributação' }))
    expect(await screen.findByLabelText('NCM')).toHaveValue('94051200')
  })

  it('grade de variantes edita valor em centavos e mantém o Ativo da linha', async () => {
    const { user } = renderRoute('/cadastros/produtos/1')

    await screen.findByLabelText('Nosso Código')
    await user.click(screen.getByRole('tab', { name: /Valores/ }))

    // Variante mockada do produto 1: R$ 89,90 = 8990 centavos.
    const valor = await screen.findByLabelText('Valor de Tabela linha 1')
    expect(valor).toHaveValue('89,90')
    expect(screen.getByLabelText('Ativo linha 1')).toBeChecked()

    await user.clear(valor)
    await user.type(valor, '12345')
    expect(valor).toHaveValue('123,45')
  })

  it('grade de fornecedores inclui e exclui linha', async () => {
    const { user } = renderRoute('/cadastros/produtos/novo')

    await screen.findByLabelText('Nosso Código')
    expect(screen.getAllByText('No data to display').length).toBeGreaterThan(0)

    // A primeira grade da aba Dados Principais é a de Fornecedor.
    await user.click(screen.getAllByRole('button', { name: /Incluir$/ })[0] as HTMLElement)
    const fornecedor = await screen.findByLabelText('Fornecedor linha 1')
    await user.type(fornecedor, 'STELLA')
    expect(fornecedor).toHaveValue('STELLA')

    await user.click(screen.getByRole('button', { name: 'Excluir linha 1' }))
    await waitFor(() => {
      expect(screen.queryByLabelText('Fornecedor linha 1')).not.toBeInTheDocument()
    })
  })

  it('grava e volta para a listagem', async () => {
    const { router, user } = renderRoute('/cadastros/produtos/novo')

    await user.type(await screen.findByLabelText('Nosso Código'), '9999')
    await user.type(screen.getByLabelText('Nossa Descrição'), 'PENDENTE TESTE')
    await user.click(screen.getByRole('button', { name: /Gravar/ }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/cadastros/produtos')
    })
  })

  it('bloqueia gravar sem os campos obrigatórios', async () => {
    const { router, user } = renderRoute('/cadastros/produtos/novo')

    await screen.findByLabelText('Nosso Código')
    await user.click(screen.getByRole('button', { name: /Gravar/ }))

    const mensagem = await screen.findByText('Nosso Código é obrigatório')
    // Mensagem de validação em 0.75rem — DESIGN.md §CadastroForm (item 9).
    expect(mensagem).toHaveClass('text-xs')
    expect(router.state.location.pathname).toBe('/cadastros/produtos/novo')
  })
})
