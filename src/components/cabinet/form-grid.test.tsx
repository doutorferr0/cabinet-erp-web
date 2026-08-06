import { FormGrid } from '@/components/cabinet/form-grid'
import { Form } from '@/components/ui/form'
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

    // Corte mais forte que a malha: réguas 2px pretas acima E abaixo (a malha é
    // fio de 1px — a faixa precisa ser visivelmente outra coisa), fundo Bancada.
    const linha = rotulo.closest('tr')
    expect(linha?.className).toContain('border-y-2')
    expect(linha?.className).toContain('border-border')
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
 * Foco na grade (DESIGN.md §FormGrid + regra da fase 2): a célula editável não
 * tem borda — a malha É o campo —, então o ÚNICO sinal de onde se está é o anel
 * amarelo interno. Célula que zera o anel fica sem indicação nenhuma de foco:
 * era o caso de `money`, `percent` e `select`, que herdaram `ring-0`/
 * `outline-none` da pele antiga. Foco ≠ hover: anel marca foco, e nada levanta.
 */
function HarnessFoco() {
  const form = useForm({
    defaultValues: { linhas: [{ texto: '', valor: 1000, desc: 500, tipo: 'A' }] },
  })
  return (
    <Form {...form}>
      <form>
        <FormGrid
          name="linhas"
          columns={[
            { key: 'texto', label: 'Texto' },
            { key: 'valor', label: 'Valor', type: 'money' },
            { key: 'desc', label: 'Desc', type: 'percent' },
            { key: 'tipo', label: 'Tipo', type: 'select', options: ['A', 'B'] },
          ]}
          newRow={{ texto: '', valor: null, desc: null, tipo: null }}
        />
      </form>
    </Form>
  )
}

describe('FormGrid — foco da célula editável', () => {
  it.each([['Texto linha 1'], ['Valor linha 1'], ['Desc linha 1'], ['Tipo linha 1']])(
    '%s mostra o anel amarelo interno ao receber foco',
    (rotulo) => {
      render(<HarnessFoco />)

      const celula = screen.getByLabelText(rotulo)
      expect(celula.className).toContain('focus-visible:ring-3')
      expect(celula.className).toContain('focus-visible:ring-ring')
      expect(celula.className).toContain('focus-visible:ring-inset')
      // Anel zerado = célula sem foco visível; é o defeito que este teste tranca.
      expect(celula.className).not.toContain('focus-visible:ring-0')
    },
  )

  it('nenhuma célula levanta no hover — lift é de botão, não de grade', () => {
    render(<HarnessFoco />)

    for (const rotulo of ['Texto linha 1', 'Valor linha 1', 'Desc linha 1', 'Tipo linha 1']) {
      const celula = screen.getByLabelText(rotulo)
      expect(celula.className).not.toContain('hover:-translate')
      expect(celula.className).not.toContain('hover:translate')
    }
  })

  it('a grade mora na mesma caixa preta 2px da listagem, sem canto', () => {
    const { container } = render(<HarnessFoco />)

    const caixa = container.querySelector('[data-slot="form-grid-box"]')
    expect(caixa?.className).toContain('border-2')
    expect(caixa?.className).not.toContain('rounded')
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
    expect(total.closest('tr')?.className).toContain('rule-strong-top')

    const subtotal = screen.getByLabelText('SubTotal')
    expect(subtotal.className).not.toContain('text-lg')
  })

  it('totais aparecem mesmo com a grade vazia (zero derivado)', () => {
    render(<HarnessTotais vazio />)

    expect(screen.getByLabelText('Total')).toHaveTextContent('10,00')
  })
})

/**
 * A zona de dinheiro (DESIGN.md §FormGrid): as fileiras de total são a única
 * área tintada de creme-esverdeado da grade, e o valor escreve em Tinta de
 * Dinheiro. É a convenção do ledger — verde é dinheiro, vermelho é o que
 * subtrai —, e ela só funciona se a zona for exclusiva: dado comum na malha
 * fica em tinta normal, senão a cor deixa de significar.
 */
function HarnessZona() {
  const form = useForm({ defaultValues: { linhas: [{ texto: 'item', valor: null }] } })
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
              { label: 'SubTotal', valorCentavos: 120_000 },
              { label: 'Desconto', valorCentavos: -20_000 },
              { label: 'Total', valorCentavos: 100_000, destaque: true },
            ],
          }}
        />
      </form>
    </Form>
  )
}

describe('FormGrid — zona de dinheiro nos totais', () => {
  it('fileira de total é a zona creme-esverdeada, e o valor escreve em Dinheiro', () => {
    render(<HarnessZona />)

    const subtotal = screen.getByLabelText('SubTotal')
    expect(subtotal.closest('tr')?.className).toContain('bg-zone-money')
    expect(subtotal.className).toContain('text-money')
  })

  it('negativo escreve em vermelho — o que subtrai não se confunde com o que soma', () => {
    render(<HarnessZona />)

    const desconto = screen.getByLabelText('Desconto')
    expect(desconto.className).toContain('text-destructive')
    expect(desconto.className).not.toContain('text-money')
  })

  it('Total leva a régua de 3px e o peso 800 do fecho do documento', () => {
    render(<HarnessZona />)

    const total = screen.getByLabelText('Total')
    expect(total.className).toContain('font-extrabold')
    // Régua de 3px vem da utility, não de `border-t` + cor solta na tela.
    expect(total.closest('tr')?.className).toContain('rule-strong-top')
  })

  it('célula comum da malha NÃO usa a cor de dinheiro', () => {
    render(<HarnessZona />)

    const celula = screen.getByLabelText('Valor linha 1')
    expect(celula.className).not.toContain('text-money')
    expect(celula.closest('tr')?.className).not.toContain('bg-zone-money')
  })
})
