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
      // A receita do anel mora num ponto só (`@utility focus-ring-inset`); o
      // teste afirma que a célula CONSOME a receita, não que ela repete os
      // valores — literal aqui obrigaria a mexer no teste a cada recalibração.
      expect(celula.className).toContain('focus-visible:focus-ring-inset')
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
 * Totais no pé do documento (DESIGN.md §DocumentoTotais): SubTotal e ajustes
 * são fileiras da grade — rótulo em Meta na coluna anterior à de valor, valor
 * sob a coluna de valor. O Total NÃO é fileira: é o fecho, bloco próprio
 * abaixo da grade, em display condensado a 48px (#236).
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

    const subtotal = screen.getByLabelText('SubTotal')
    expect(subtotal).toHaveTextContent('10,00')
    // O valor cai na coluna `valor`; a célula imediatamente antes é o rótulo.
    const celulaValor = subtotal.closest('td')
    expect(celulaValor?.previousElementSibling?.textContent).toBe('SubTotal:')
    const rotulo = celulaValor?.previousElementSibling
    expect(rotulo?.className).toContain('font-mono')
    expect(rotulo?.className).toContain('uppercase')
  })

  // #236: o Total sai da malha. Enquanto era fileira, 48px caía ao lado de
  // itens de 13px e não compartilhava casa decimal com ninguém — o alinhamento
  // quebrava por TAMANHO, antes de qualquer questão de fonte.
  it('o Total não é fileira da grade: é o fecho, fora da tabela', () => {
    render(<HarnessTotais />)

    const total = screen.getByLabelText('Total')
    expect(total.closest('table')).toBeNull()
    expect(total.closest('[data-slot="total-box"]')).not.toBeNull()
    // 48px em display condensado — o maior dado da tela.
    const valor = total.firstElementChild
    expect(valor?.className).toContain('font-[family-name:var(--font-display-condensada)]')
    expect(valor?.className).toContain('text-[3rem]')

    // SubTotal continua fileira, e continua na medida da malha.
    const subtotal = screen.getByLabelText('SubTotal')
    expect(subtotal.closest('table')).not.toBeNull()
    expect(subtotal.className).toContain('text-sm')
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

  it('o fecho leva a borda de 3px, o lima e a sombra dura do documento', () => {
    render(<HarnessZona />)

    const caixa = screen.getByLabelText('Total').closest('[data-slot="total-box"]')
    expect(caixa?.className).toContain('border-[3px]')
    expect(caixa?.className).toContain('border-rule-strong')
    // Mesma tinta de dinheiro que a fileira de total tinha — o fecho não
    // estreia par de cor que ninguém mediu.
    expect(caixa?.className).toContain('bg-fill-money')
    expect(caixa?.className).toContain('shadow-el3')
  })

  it('célula comum da malha NÃO usa a cor de dinheiro', () => {
    render(<HarnessZona />)

    const celula = screen.getByLabelText('Valor linha 1')
    expect(celula.className).not.toContain('text-money')
    expect(celula.closest('tr')?.className).not.toContain('bg-zone-money')
  })
})

/**
 * A VOZ da coluna. A célula editável é um `<input>`, e `<input>` não aceita
 * filho — `<Nome>` e `<Produto>` não entram aqui. Sem a prop, a mesma
 * descrição de produto que a listagem mostra em Sora aparecia em Inter dentro
 * da grade do documento, e a regra semântica virava "vale onde é texto, não
 * vale onde é campo".
 */
describe('FormGrid — voz da coluna', () => {
  function HarnessDeVoz() {
    const form = useForm({
      defaultValues: { linhas: [{ produto: 'Pendente Bordeaux', quem: 'Vertz', neutro: 'x' }] },
    })
    return (
      <Form {...form}>
        <form>
          <FormGrid
            name="linhas"
            columns={[
              { key: 'produto', label: 'Descrição do Produto', voz: 'produto' },
              { key: 'quem', label: 'Fornecedor', voz: 'nome' },
              { key: 'neutro', label: 'Tamanho' },
            ]}
            newRow={{ produto: '', quem: '', neutro: '' }}
          />
        </form>
      </Form>
    )
  }

  it('produto fala em Sora, nome em serifada, e o resto continua em UI', () => {
    render(<HarnessDeVoz />)

    expect(screen.getByLabelText(/Descrição do Produto/).className).toContain('font-display')
    expect(screen.getByLabelText(/Fornecedor/).className).toContain('font-nome')
    // Sem `voz`, a célula é dado neutro: nenhuma das duas famílias entra.
    const neutro = screen.getByLabelText(/Tamanho/).className
    expect(neutro).not.toContain('font-display')
    expect(neutro).not.toContain('font-nome')
  })

  it('o produto NÃO recua de cor na grade — aqui ele é o assunto da linha', () => {
    // Na listagem o produto vai em `--muted-foreground` para não disputar com
    // o nome do cliente. Dentro do documento não há com quem disputar.
    render(<HarnessDeVoz />)

    // Classe exata, não `toContain`: o `<Input>` já traz
    // `placeholder:text-muted-foreground`, e a busca por substring casaria com ela.
    const classes = screen.getByLabelText(/Descrição do Produto/).className.split(/\s+/)
    expect(classes).not.toContain('text-muted-foreground')
  })
})
