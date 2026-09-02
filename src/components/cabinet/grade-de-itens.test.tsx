import {
  type ColunaDaGrade,
  type FonteDeItens,
  GradeDeItens,
  type LinhaDaGrade,
  totaisEmCentavos,
} from '@/components/cabinet/grade-de-itens'
import { Form } from '@/components/ui/form'
import { renderWithQuery } from '@/test/utils'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { describe, expect, it, vi } from 'vitest'

/**
 * GRADE DE ITENS 2.0 (D17, #485) — o que esta suíte cobra:
 *
 * 1. **A conta é INTEIRA.** Subtotal, ajustes e total nunca passam por float —
 *    é a convenção de dinheiro do CLAUDE.md, e o lugar onde ela quebra primeiro
 *    é o desconto percentual da linha.
 * 2. **A célula é invisível até o hover.** Em repouso não há borda nem fundo;
 *    o `hover:`/`focus:` é que devolve a cara de campo. É a mudança visual da
 *    issue, e sem teste ela volta na primeira edição distraída.
 * 3. **Editar avisa.** `aoAlterar` é o gancho do autosave da D15; sem ele a
 *    grade grava por `Gravar` e ponto, como no 1.x.
 */

const COLUNAS: ColunaDaGrade[] = [
  { key: 'codigo', rotulo: 'Código', papel: 'codigo' },
  { key: 'descricao', rotulo: 'Descrição', papel: 'descricao', subtituloKey: 'acabamento' },
  { key: 'quantidade', rotulo: 'Quant.', papel: 'quantidade' },
  { key: 'valorUnitarioCentavos', rotulo: 'Valor Unit.', papel: 'money' },
  { key: 'descontoPercentual', rotulo: 'Desc. %', papel: 'percent' },
  { key: 'unidade', rotulo: 'Und.', papel: 'select', opcoes: ['UN', 'CX'] },
]

const LINHA_VAZIA: LinhaDaGrade = {
  codigo: '',
  descricao: '',
  acabamento: '',
  quantidade: '',
  valorUnitarioCentavos: null,
  descontoPercentual: null,
  unidade: 'UN',
}

function Harness({
  linhas = [],
  aoAlterar,
  fontes,
  ajustes,
}: {
  linhas?: LinhaDaGrade[]
  aoAlterar?: () => void
  fontes?: readonly FonteDeItens[]
  ajustes?: { rotulo: string; valorCentavos: number; sinal: 1 | -1 }[]
}) {
  const form = useForm({ defaultValues: { itens: linhas } })
  return (
    <Form {...form}>
      <form>
        <GradeDeItens
          name="itens"
          colunas={COLUNAS}
          linhaNova={LINHA_VAZIA}
          {...(fontes && { fontes })}
          {...(aoAlterar && { aoAlterar })}
          totais={{ ...(ajustes && { ajustes }) }}
        />
      </form>
    </Form>
  )
}

describe('totaisEmCentavos', () => {
  it('soma as linhas e aplica os ajustes em INTEIRO', () => {
    expect(totaisEmCentavos([100_00, 250_50, 1])).toEqual({
      subtotalCentavos: 350_51,
      totalCentavos: 350_51,
    })
  })

  it('desconto subtrai e acréscimo soma, na ordem declarada', () => {
    const { totalCentavos } = totaisEmCentavos(
      [1_000_00],
      [
        { rotulo: 'Desconto', valorCentavos: 100_00, sinal: -1 },
        { rotulo: 'Frete', valorCentavos: 35_90, sinal: 1 },
      ],
    )
    // 1000,00 − 100,00 + 35,90 = 935,90
    expect(totalCentavos).toBe(935_90)
  })

  it('sem linha nenhuma o subtotal é zero, não NaN', () => {
    expect(totaisEmCentavos([])).toEqual({ subtotalCentavos: 0, totalCentavos: 0 })
  })

  it('o resultado é inteiro mesmo com ajuste maior que o subtotal', () => {
    const { totalCentavos } = totaisEmCentavos(
      [10_00],
      [{ rotulo: 'Desconto', valorCentavos: 15_00, sinal: -1 }],
    )
    expect(totalCentavos).toBe(-5_00)
    expect(Number.isInteger(totalCentavos)).toBe(true)
  })
})

describe('GradeDeItens — cálculo do bloco Totais', () => {
  it('subtotal e total saem da grade, em centavos, com o desconto da linha', () => {
    renderWithQuery(
      <Harness
        linhas={[
          // 3 × 100,00 = 300,00, com 10,0000% de desconto = 270,00
          {
            ...LINHA_VAZIA,
            quantidade: '3',
            valorUnitarioCentavos: 100_00,
            descontoPercentual: 100_000,
          },
          // 2 × 50,00 = 100,00, sem desconto
          { ...LINHA_VAZIA, quantidade: '2', valorUnitarioCentavos: 50_00 },
        ]}
        ajustes={[{ rotulo: 'Frete', valorCentavos: 30_00, sinal: 1 }]}
      />,
    )

    expect(document.querySelector('[data-slot="grade-de-itens-totais"]')).not.toBeNull()
    expect(screen.getByLabelText('Subtotal')).toHaveTextContent('370,00')
    expect(screen.getByLabelText('Frete')).toHaveTextContent('30,00')
    expect(screen.getByLabelText('Total')).toHaveTextContent('400,00')
  })

  it('total negativo escreve em vermelho — convenção do ledger', () => {
    renderWithQuery(
      <Harness
        linhas={[{ ...LINHA_VAZIA, quantidade: '1', valorUnitarioCentavos: 10_00 }]}
        ajustes={[{ rotulo: 'Desconto', valorCentavos: 15_00, sinal: -1 }]}
      />,
    )
    const total = screen.getByLabelText('Total')
    expect(total).toHaveTextContent('-')
    expect(total.className).toContain('text-destructive')
    // O fecho é 16px 600 em tinta de dinheiro (mockup: `--ok`). O 16 não tem
    // degrau na escala `--t-*`, então vem por token com fallback — e é ISSO
    // que o teste guarda: um `text-[16px]` cru aqui reprovaria a régua da
    // rodada e ninguém saberia trocar quando o degrau chegar.
    expect(total.className).toContain('t-dado')
    expect(total.getAttribute('style')).toContain('var(--t-total-documento, 16px)')
    expect(total.className).toContain('font-semibold')
  })

  it('editar a quantidade recalcula o total sem sair da grade', async () => {
    const user = userEvent.setup()
    renderWithQuery(
      <Harness linhas={[{ ...LINHA_VAZIA, quantidade: '', valorUnitarioCentavos: 100_00 }]} />,
    )

    await user.type(screen.getByLabelText('Quant. linha 1'), '4')
    await waitFor(() => expect(screen.getByLabelText('Total')).toHaveTextContent('400,00'))
  })
})

describe('GradeDeItens — edição inline', () => {
  it('a célula não tem borda em repouso e ganha a cara de campo no hover e no foco', () => {
    renderWithQuery(<Harness linhas={[LINHA_VAZIA]} />)
    const celula = screen.getByLabelText('Descrição linha 1')
    expect(celula.className).toContain('border-transparent')
    expect(celula.className).toContain('bg-transparent')
    // O gatilho é a LINHA (mockup `.items tr:hover .in`): a linha inteira
    // acende de uma vez. Por célula, o operador veria uma caixa piscar por
    // coluna ao atravessar a linha com o mouse.
    expect(celula.className).toContain('group-hover/linha:border-rule-hair')
    expect(celula.className).toContain('focus:border-rule-hair')
    expect(celula.className).toContain('focus:bg-card')
    expect(document.querySelector('tbody tr')?.className).toContain('group/linha')
  })

  it('o código é dado que se copia: mono e tinta de acento', () => {
    renderWithQuery(<Harness linhas={[LINHA_VAZIA]} />)
    const codigo = screen.getByLabelText('Código linha 1')
    // `t-dado` = JetBrains Mono 500 tabular. A tinta é `--primary-text`, o
    // único texto com acento do 2.0 — chartreuse cheio é FILL, nunca texto.
    expect(codigo.className).toContain('t-dado')
    expect(codigo.getAttribute('style')).toContain('var(--primary-text)')
  })

  it('cabeçalho e rótulos usam os degraus da escala, não tamanho literal', () => {
    renderWithQuery(<Harness linhas={[LINHA_VAZIA]} />)
    // §Hierarquia: cabeçalho de coluna é `--t-rotulo` e nada mais; o header se
    // separa do corpo por TINT, sem borda — duas ferramentas na mesma
    // fronteira é o que a régua proíbe.
    const cabecalho = screen.getByRole('columnheader', { name: 'Descrição' })
    expect(cabecalho.className).toContain('t-rotulo')
    expect(cabecalho.closest('tr')?.className).toContain('bg-surface-sunken')
    expect(cabecalho.closest('tr')?.className).not.toContain('border-b')
  })

  it('a descrição mostra o subtítulo do que a linha já sabe', () => {
    renderWithQuery(
      <Harness linhas={[{ ...LINHA_VAZIA, descricao: 'LUMINÁRIA', acabamento: 'FOSCO PRETO' }]} />,
    )
    expect(screen.getByLabelText('Descrição linha 1')).toHaveValue('LUMINÁRIA')
    expect(screen.getByText('FOSCO PRETO')).toBeInTheDocument()
  })

  it('o valor unitário digita em reais e guarda centavos', async () => {
    const user = userEvent.setup()
    renderWithQuery(<Harness linhas={[LINHA_VAZIA]} />)

    await user.type(screen.getByLabelText('Valor Unit. linha 1'), '12345')
    expect(screen.getByLabelText('Valor Unit. linha 1')).toHaveValue('123,45')
  })

  it('cada edição avisa o autosave — texto, dinheiro, percentual e lista', async () => {
    const user = userEvent.setup()
    const aoAlterar = vi.fn()
    renderWithQuery(<Harness linhas={[LINHA_VAZIA]} aoAlterar={aoAlterar} />)

    await user.type(screen.getByLabelText('Descrição linha 1'), 'X')
    expect(aoAlterar).toHaveBeenCalled()

    aoAlterar.mockClear()
    await user.type(screen.getByLabelText('Valor Unit. linha 1'), '1')
    expect(aoAlterar).toHaveBeenCalled()

    aoAlterar.mockClear()
    await user.type(screen.getByLabelText('Desc. % linha 1'), '5')
    expect(aoAlterar).toHaveBeenCalled()

    aoAlterar.mockClear()
    await user.selectOptions(screen.getByLabelText('Und. linha 1'), 'CX')
    expect(aoAlterar).toHaveBeenCalled()
  })

  it('incluir e remover linha também avisam o autosave', async () => {
    const user = userEvent.setup()
    const aoAlterar = vi.fn()
    renderWithQuery(<Harness aoAlterar={aoAlterar} />)

    await user.click(screen.getByRole('button', { name: 'Adicionar item' }))
    expect(aoAlterar).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText('Descrição linha 1')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Excluir linha 1' }))
    expect(aoAlterar).toHaveBeenCalledTimes(2)
    expect(screen.queryByLabelText('Descrição linha 1')).not.toBeInTheDocument()
  })
})

describe('GradeDeItens — rodapé de origens', () => {
  it('o rodapé é tracejado e traz as origens ao lado de Adicionar item', () => {
    const fonte: FonteDeItens = {
      id: 'estoque',
      render: () => <button type="button">Do estoque</button>,
    }
    renderWithQuery(<Harness fontes={[fonte]} />)

    const rodape = document.querySelector('[data-slot="grade-de-itens-rodape"]')
    expect(rodape).not.toBeNull()
    expect(rodape?.className).toContain('border-dashed')
    expect(within(rodape as HTMLElement).getByText('Do estoque')).toBeInTheDocument()
  })

  it('a origem entrega linhas prontas e a grade as adiciona de uma vez', async () => {
    const user = userEvent.setup()
    const fonte: FonteDeItens = {
      id: 'pedidos',
      render: (adicionar) => (
        <button
          type="button"
          onClick={() =>
            adicionar([
              { ...LINHA_VAZIA, descricao: 'PENDENTE A' },
              { ...LINHA_VAZIA, descricao: 'PENDENTE B' },
            ])
          }
        >
          De pedidos
        </button>
      ),
    }
    renderWithQuery(<Harness fontes={[fonte]} />)

    await user.click(screen.getByRole('button', { name: 'De pedidos' }))
    expect(screen.getByLabelText('Descrição linha 1')).toHaveValue('PENDENTE A')
    expect(screen.getByLabelText('Descrição linha 2')).toHaveValue('PENDENTE B')
  })

  it('grade vazia diz o que fazer em vez de mostrar malha em branco', () => {
    renderWithQuery(<Harness />)
    expect(screen.getByText(/Nenhum item ainda/)).toBeInTheDocument()
  })
})
