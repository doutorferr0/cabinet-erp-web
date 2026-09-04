import { FaixaDeKpi, KpiTile, MAXIMO_DE_KPIS } from '@/components/cabinet/kpi-tile'
import { TotalBox } from '@/components/cabinet/total-box'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

/**
 * FAIXA DE KPI (#479, D11). O que estes casos guardam não é a aparência — é o
 * MOTIVO de ela ser assim, que some junto quando alguém "só acrescenta mais um
 * número".
 */
describe('KpiTile', () => {
  it('o rótulo é o NOME acessível do valor, não texto solto ao lado', () => {
    // Sem isto o leitor de tela anuncia "trinta e oito mil" sem dizer de quê —
    // e a faixa existe justamente para dizer de quê antes do detalhe.
    render(<KpiTile rotulo="Em aberto" valorCentavos={3_841_000} />)
    expect(screen.getByLabelText('Em aberto')).toHaveTextContent('38.410')
  })

  it('separa símbolo, inteiros e centavos — a ordem de grandeza lê primeiro', () => {
    render(<KpiTile rotulo="Em aberto" valorCentavos={3_841_000} />)
    const saida = screen.getByLabelText('Em aberto')
    // Três nós, não uma string: é o que permite os centavos saírem mais leves.
    // Emendado num texto só, `,00` disputaria peso com os inteiros a 20px.
    expect(saida.textContent?.replace(/\s/g, '')).toContain('R$38.410,00')
    expect(saida.querySelectorAll('span').length).toBeGreaterThanOrEqual(3)
  })

  it('negativo escreve em vermelho — a convenção do ledger vale no resumo', () => {
    render(<KpiTile rotulo="Saldo" valorCentavos={-5000} />)
    expect(screen.getByLabelText('Saldo')).toHaveStyle({ color: 'var(--bad)' })
  })

  it('`alerta` pinta o valor mesmo com número positivo', () => {
    // Atrasadas = 2 é positivo e é problema. Sem a prop, o único jeito de
    // marcar o KPI ruim seria a tela pintar por fora — cor decorativa em dado,
    // que a régua proíbe.
    render(<KpiTile rotulo="Atrasadas" valor="2" alerta />)
    expect(screen.getByLabelText('Atrasadas')).toHaveStyle({ color: 'var(--bad)' })
  })

  it('delta ausente ou null NÃO desenha nada', () => {
    // Base zero não tem variação. `+100%` ali seria mentira aritmética que o
    // operador não tem como desconfiar — e empresa no primeiro mês cai
    // exatamente nesse caso, que é o mês em que ela mais olha o número.
    const { container, rerender } = render(
      <KpiTile rotulo="Mês" valorCentavos={100} delta={null} />,
    )
    expect(container.querySelector('[data-slot="kpi-delta"]')).toBeNull()

    rerender(<KpiTile rotulo="Mês" valorCentavos={100} />)
    expect(container.querySelector('[data-slot="kpi-delta"]')).toBeNull()

    rerender(<KpiTile rotulo="Mês" valorCentavos={100} delta={12} />)
    expect(screen.getByText('+12%')).toBeInTheDocument()
    rerender(<KpiTile rotulo="Mês" valorCentavos={100} delta={-3} />)
    expect(screen.getByText('-3%')).toBeInTheDocument()
  })

  it('delta ZERO desenha — parado é informação, ausente não é', () => {
    render(<KpiTile rotulo="Mês" valorCentavos={100} delta={0} />)
    expect(screen.getByText('+0%')).toBeInTheDocument()
  })

  it('sparkline com menos de dois pontos não desenha', () => {
    // Um ponto é uma bolinha, e bolinha no canto do tile parece tendência sem
    // ser nenhuma. Empresa nova tem série curta, e o contrato já declara que
    // menos de doze pontos é resposta legítima.
    const { container, rerender } = render(<KpiTile rotulo="Mês" valor="1" serie={[5]} />)
    expect(container.querySelector('[data-slot="kpi-sparkline"]')).toBeNull()

    rerender(<KpiTile rotulo="Mês" valor="1" serie={[]} />)
    expect(container.querySelector('[data-slot="kpi-sparkline"]')).toBeNull()

    rerender(<KpiTile rotulo="Mês" valor="1" serie={[5, 9]} />)
    expect(container.querySelector('[data-slot="kpi-sparkline"]')).not.toBeNull()
  })

  it('série achatada vira reta no meio, e não some por divisão por zero', () => {
    // Amplitude zero dividindo daria NaN, e a curva sumiria sem erro nenhum —
    // o pior jeito de um gráfico falhar, porque parece "sem dado".
    const { container } = render(<KpiTile rotulo="Mês" valor="1" serie={[7, 7, 7]} />)
    const d = container.querySelector('[data-slot="kpi-sparkline"] path')?.getAttribute('d') ?? ''
    expect(d).not.toContain('NaN')
    expect(d).toBe('M0 9 L30 9 L60 9')
  })

  it('a sparkline é decorativa: o leitor de tela não lê forma sem dado', () => {
    const { container } = render(<KpiTile rotulo="Mês" valor="1" serie={[1, 2, 3]} />)
    expect(container.querySelector('[data-slot="kpi-sparkline"]')).toHaveAttribute(
      'aria-hidden',
      'true',
    )
  })

  it('o tint é por ASSUNTO e sai no dado, não só na folha de estilo', () => {
    // `data-tint` existe para o teste e para a captura com overlay: cor que só
    // vive no `style` não tem como ser conferida por ninguém.
    const { container } = render(<KpiTile rotulo="Compras" valor="9" tint="lilac" />)
    expect(container.querySelector('[data-slot="kpi-tile"]')).toHaveAttribute('data-tint', 'lilac')
  })

  it('sem tint é o padrão — cor que está em todo tile não significa nada', () => {
    const { container } = render(<KpiTile rotulo="Compras" valor="9" />)
    expect(container.querySelector('[data-slot="kpi-tile"]')).toHaveAttribute('data-tint', 'nenhum')
  })

  it('o rótulo consome o degrau da régua, nunca tamanho literal', () => {
    // §Hierarquia: `--t-rotulo` é o único uppercase, e em KPI ele vai a n-700.
    // Tamanho escrito na peça reabre a deriva que a régua fechou.
    const { container } = render(<KpiTile rotulo="Em aberto" valor="9" />)
    const rotulo = container.querySelector('[data-slot="kpi-rotulo"]')
    expect(rotulo?.className).toContain('t-rotulo')
    expect(rotulo).toHaveStyle({ color: 'var(--n-700)' })
  })
})

describe('FaixaDeKpi', () => {
  it('aceita quatro', () => {
    const { container } = render(
      <FaixaDeKpi>
        <KpiTile rotulo="Um" valor="1" />
        <KpiTile rotulo="Dois" valor="2" />
        <KpiTile rotulo="Três" valor="3" />
        <KpiTile rotulo="Quatro" valor="4" />
      </FaixaDeKpi>,
    )
    expect(container.querySelectorAll('[data-slot="kpi-tile"]')).toHaveLength(MAXIMO_DE_KPIS)
    expect(container.querySelector('[data-slot="faixa-de-kpi"]')).toHaveAttribute('data-kpis', '4')
  })

  it('RECUSA o quinto, e recusa alto', () => {
    // O quinto não encolhe a faixa: quebra para uma segunda fileira e empurra a
    // grade para fora da dobra — o detalhe que a faixa existe para introduzir.
    // Um aviso no console deixaria o quinto publicado e ele viraria o normal.
    // O `throw` obriga a decidir QUAL DOS QUATRO SAI, que é a decisão real.
    const silencio = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() =>
      render(
        <FaixaDeKpi>
          <KpiTile rotulo="Um" valor="1" />
          <KpiTile rotulo="Dois" valor="2" />
          <KpiTile rotulo="Três" valor="3" />
          <KpiTile rotulo="Quatro" valor="4" />
          <KpiTile rotulo="Cinco" valor="5" />
        </FaixaDeKpi>,
      ),
    ).toThrow(/no máximo 4 KPIs e recebeu 5/)
    silencio.mockRestore()
  })

  it('conta o que EXISTE — condicional que não renderizou não ocupa vaga', () => {
    // `{atrasadas > 0 && <KpiTile/>}` devolve `false`, não um filho. Contar o
    // `false` faria a faixa recusar quatro tiles porque um quinto não apareceu.
    const semAtraso = false
    const { container } = render(
      <FaixaDeKpi>
        <KpiTile rotulo="Um" valor="1" />
        <KpiTile rotulo="Dois" valor="2" />
        <KpiTile rotulo="Três" valor="3" />
        <KpiTile rotulo="Quatro" valor="4" />
        {semAtraso && <KpiTile rotulo="Atrasadas" valor="0" />}
      </FaixaDeKpi>,
    )
    expect(container.querySelector('[data-slot="faixa-de-kpi"]')).toHaveAttribute('data-kpis', '4')
  })

  it('quebra por auto-fit, nunca por @media', () => {
    // O que decide quantos cabem é a largura DISPONÍVEL — que muda com a
    // sidebar recolhida, não só com a janela. Regra 7 da rodada.
    const { container } = render(
      <FaixaDeKpi>
        <KpiTile rotulo="Um" valor="1" />
      </FaixaDeKpi>,
    )
    const faixa = container.querySelector('[data-slot="faixa-de-kpi"]') as HTMLElement
    expect(faixa.style.gridTemplateColumns).toContain('auto-fit')
    expect(faixa.style.gap).toBe('var(--s-3)')
  })
})

/**
 * FECHO do documento: agora um `KpiTile`, com a MESMA assinatura de antes —
 * `form-grid.tsx` e `documento.tsx` montam sem saber que ele trocou de corpo.
 */
describe('TotalBox', () => {
  it('é um KpiTile na tinta de dinheiro, na escala de destaque', () => {
    const { container } = render(<TotalBox valorCentavos={100_000} />)
    const caixa = container.querySelector('[data-slot="total-box"]')
    expect(caixa).not.toBeNull()
    expect(caixa).toHaveAttribute('data-tint', 'mint')
    expect(screen.getByLabelText('Total')).toHaveTextContent('1.000,00')
  })

  it('negativo escreve em vermelho — a convenção do ledger vale no fecho', () => {
    render(<TotalBox valorCentavos={-5000} />)
    expect(screen.getByLabelText('Total')).toHaveStyle({ color: 'var(--bad)' })
  })

  it('positivo NÃO usa a tinta de erro', () => {
    render(<TotalBox valorCentavos={5000} />)
    expect(screen.getByLabelText('Total')).not.toHaveStyle({ color: 'var(--bad)' })
  })

  it('o rótulo é o NOME acessível do valor, não texto solto ao lado', () => {
    render(<TotalBox label="Total geral" valorCentavos={1} />)
    expect(screen.getByLabelText('Total geral')).toHaveTextContent('0,01')
  })
})
