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

/**
 * Totais como últimas fileiras da grade (DESIGN.md §DocumentoTotais): rótulo
 * em Meta na coluna anterior à de valor, valor sob a coluna de valor, Total
 * com régua forte acima e único em Title.
 */
function HarnessTotais({ vazio = false }) {
  const form = useForm({
    defaultValues: { linhas: vazio ? [] : [{ texto: 'item', valor: null }] },
  })
  return (
    <Form {...form}>
      <form>
        <FormGrid
          name="linhas"
          columns={[
            { key: 'texto', label: 'Texto' },
            { key: 'valor', label: 'Valor', type: 'computed', compute: () => '10,00' },
          ]}
          newRow={{ texto: '', valor: null }}
          totals={{
            valueColumnKey: 'valor',
            rows: [
              { label: 'SubTotal', valorCentavos: 1000 },
              { label: 'Total', valorCentavos: 1000, destaque: true },
            ],
          }}
        />
      </form>
    </Form>
  )
}

describe('FormGrid — totais no pé da grade', () => {
  it('rótulo em Meta na penúltima coluna e valor sob a coluna de valor', () => {
    render(<HarnessTotais />)

    const total = screen.getByLabelText('Total')
    expect(total).toHaveTextContent('10,00')
    // O valor cai na coluna `valor`; a célula imediatamente antes é o rótulo.
    const celulaValor = total.closest('td')
    expect(celulaValor?.previousElementSibling?.textContent).toBe('Total:')
    const rotulo = celulaValor?.previousElementSibling
    expect(rotulo?.className).toContain('font-mono')
    expect(rotulo?.className).toContain('uppercase')
  })

  it('Total é o único em Title e leva régua forte acima', () => {
    render(<HarnessTotais />)

    const total = screen.getByLabelText('Total')
    expect(total.className).toContain('text-lg')
    expect(total.className).toContain('font-semibold')
    expect(total.closest('tr')?.className).toContain('border-rule-strong')

    const subtotal = screen.getByLabelText('SubTotal')
    expect(subtotal.className).not.toContain('text-lg')
  })

  it('totais aparecem mesmo com a grade vazia (zero derivado)', () => {
    render(<HarnessTotais vazio />)

    expect(screen.getByLabelText('Total')).toHaveTextContent('10,00')
  })
})
