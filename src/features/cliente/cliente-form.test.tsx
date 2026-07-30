import { renderRoute } from '@/test/utils'
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('tela Cliente', () => {
  it('listagem mostra clientes mockados', async () => {
    renderRoute('/cadastros/clientes')
    expect(await screen.findByText('CONSUMIDOR')).toBeInTheDocument()
    expect(screen.getByText('Cadastro de Clientes')).toBeInTheDocument()
  })

  it('formulário grava e volta para a listagem', async () => {
    const { router, user } = renderRoute('/cadastros/clientes/novo')

    await user.type(await screen.findByLabelText('Nome'), 'CLIENTE TESTE')
    await user.click(screen.getByRole('button', { name: /Gravar/ }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/cadastros/clientes')
    })
  })

  // DESIGN.md §Shapes: a aba Principal é uma pilha de compartimentos fechados,
  // não uma parede de campos. Legendas marcadas `TODO(transcricao)` no código
  // são inferência — a transcrição §5 não registra groupbox.
  it('aba Principal agrupa os campos em compartimentos com moldura', async () => {
    renderRoute('/cadastros/clientes/novo')

    await screen.findByLabelText('Nome')
    const legendas = screen
      .getAllByText(/^(Identificação|Endereço|Telefones e E-mail|Redes Sociais)$/)
      .filter((el) => el.tagName === 'LEGEND')
    expect(legendas).toHaveLength(4)

    // Compartimento tem caixa própria; blocos irmãos não compartilham parede.
    const identificacao = legendas[0]?.closest('fieldset')
    expect(identificacao?.className).toContain('rounded-lg')
    expect(identificacao).toContainElement(screen.getByLabelText('Nome'))
  })

  it('busca de cidade (janela auxiliar) preenche cidade e UF', async () => {
    const { user } = renderRoute('/cadastros/clientes/novo')

    await screen.findByLabelText('Nome')
    await user.click(screen.getByRole('button', { name: 'Buscar cidade' }))

    // janela de busca com a MESMA DataTable
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('Busca de Cidade')

    // CURITIBA está além da primeira página: usa a busca da janela
    await user.type(within(dialog).getByLabelText('Busca'), 'curitiba')

    // seleciona linha CURITIBA e confirma
    const linha = await screen.findByText('CURITIBA')
    await user.click(linha)
    await user.click(screen.getByRole('button', { name: 'Selecionar' }))

    await waitFor(() => {
      expect(screen.getByLabelText('Cidade')).toHaveValue('CURITIBA')
    })
    // código da cidade aparece ao lado do campo; UF (PR) no rótulo derivado
    expect(screen.getByText('355')).toBeInTheDocument()
  })
})
