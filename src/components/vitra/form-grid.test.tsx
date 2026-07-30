import { Form } from '@/components/ui/form'
import { FormGrid } from '@/components/vitra/form-grid'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { describe, expect, it } from 'vitest'

/**
 * Faixa de seção (DESIGN.md §FormGrid): linha cuja chave `sectionKey` tem
 * valor vira banda de agrupamento — largura total, sem colunas, rótulo em
 * Meta, régua forte acima e abaixo, fundo Tinta de Bancada.
 */
function Harness() {
  const form = useForm({
    defaultValues: {
      linhas: [
        { secao: 'SALA DE ESTAR', texto: '' },
        { secao: '', texto: 'item avulso' },
      ],
    },
  })
  return (
    <Form {...form}>
      <form>
        <FormGrid
          name="linhas"
          columns={[{ key: 'texto', label: 'Texto' }]}
          newRow={{ secao: '', texto: '' }}
          sectionKey="secao"
        />
      </form>
    </Form>
  )
}

describe('FormGrid — faixa de seção', () => {
  it('linha com valor na sectionKey vira banda de largura total', () => {
    render(<Harness />)

    const rotulo = screen.getByText('SALA DE ESTAR')
    // Rótulo em Meta (mono 0.75rem, caixa alta, tracking 0.06em).
    expect(rotulo.className).toContain('font-mono')
    expect(rotulo.className).toContain('text-[0.75rem]')
    expect(rotulo.className).toContain('uppercase')
    expect(rotulo.className).toContain('tracking-[0.06em]')

    // Uma única célula cobre colunas + a coluna do botão de remover.
    const celula = rotulo.closest('td')
    expect(celula?.getAttribute('colspan')).toBe('2')

    // Corte mais forte que a malha: régua forte + fundo Bancada.
    const linha = rotulo.closest('tr')
    expect(linha?.className).toContain('border-rule-strong')
    expect(linha?.className).toContain('bg-muted')
  })

  it('linha sem valor na sectionKey continua linha normal editável', () => {
    render(<Harness />)

    expect(screen.getByLabelText('Texto linha 2')).toHaveValue('item avulso')
  })

  it('banda também pode ser removida', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Excluir linha 1' }))

    expect(screen.queryByText('SALA DE ESTAR')).not.toBeInTheDocument()
  })
})
