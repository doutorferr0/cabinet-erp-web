import { PrecoEMargem } from '@/features/produto/preco-e-margem'
import { instalarServidor, json, problema } from '@/test/servidor'
import { renderWithQuery } from '@/test/utils'
import { screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * A ABA PREÇO E MARGEM — o que ela mostra, e o que ela se recusa a mostrar.
 *
 * Os casos que carregam este arquivo são os do SILÊNCIO. Uma aba de preço tem
 * duas formas de mentir, e as duas passariam verdes numa suíte que só conferisse
 * o caminho feliz:
 *
 * 1. **Mostrar `R$ 0,00` onde a resposta é "não sei".** Fornecedor sem índice
 *    não tem venda sugerida, e um zero ali se lê como "de graça".
 * 2. **Mostrar margem sem dizer que falta o ICMS.** Para 317 dos 385 perfis
 *    reais a substituição tributária é o maior componente do custo.
 */

const VARIANTES = [
  { id: 'var-1', rotulo: 'PRETO FOSCO · 30CM' },
  { id: 'var-2', rotulo: 'DOURADO · 30CM' },
]

const TABELA_URL = '/api/table-prices/var-1'
const INDICES_URL = '/api/price-indexes'

function indices(rows: unknown[]) {
  return json({ rows, total: rows.length })
}

const INDICE_EVOLED = {
  id: 'idx-1',
  supplierId: 'forn-evoled',
  supplierName: 'EVOLED ILUMINACAO LTDA',
  costProfileId: 'cst-1',
  costProfileName: 'EVOLED PADRÃO',
  indexValue: 25_600,
  active: true,
}

const LINHA_EVOLED = {
  supplierId: 'forn-evoled',
  supplierName: 'EVOLED ILUMINACAO LTDA',
  supplierCode: 'EV-PEND-30F',
  tablePriceCents: 74_180,
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('a grade de preço de tabela', () => {
  it('mostra o fornecedor, o preço, o índice e a venda sugerida', async () => {
    instalarServidor({
      [TABELA_URL]: () => json([LINHA_EVOLED]),
      [INDICES_URL]: () => indices([INDICE_EVOLED]),
    })

    renderWithQuery(<PrecoEMargem variantes={VARIANTES} readOnly={false} />)

    await screen.findByText('EVOLED ILUMINACAO LTDA')
    expect(screen.getByText('EV-PEND-30F')).toBeInTheDocument()
    // O índice sai com as QUATRO casas que ele tem. `2,56%` seria percentual, e
    // a venda pareceria errada por duas ordens de grandeza.
    expect(screen.getByText('2,5600')).toBeInTheDocument()
    // R$ 741,80 × 2,5600 = R$ 1.899,01.
    expect(screen.getByText('R$ 1.899,01')).toBeInTheDocument()
  })

  it('fornecedor SEM índice não ganha venda sugerida — diz "sem índice", não R$ 0,00', async () => {
    instalarServidor({
      [TABELA_URL]: () => json([LINHA_EVOLED]),
      [INDICES_URL]: () => indices([]),
    })

    renderWithQuery(<PrecoEMargem variantes={VARIANTES} readOnly={false} />)

    await screen.findByText('sem índice')
    expect(screen.queryByText('R$ 0,00')).not.toBeInTheDocument()
  })

  it('índice INATIVO também não precifica, e a tela diz que está desligado', async () => {
    instalarServidor({
      [TABELA_URL]: () => json([LINHA_EVOLED]),
      [INDICES_URL]: () => indices([{ ...INDICE_EVOLED, active: false }]),
    })

    renderWithQuery(<PrecoEMargem variantes={VARIANTES} readOnly={false} />)

    await screen.findByText(/inativo/)
    expect(screen.queryByText('R$ 1.899,01')).not.toBeInTheDocument()
  })

  it('variante sem tabela mostra o vazio em palavra, não uma grade em branco', async () => {
    instalarServidor({
      [TABELA_URL]: () => json([]),
      [INDICES_URL]: () => indices([INDICE_EVOLED]),
    })

    renderWithQuery(<PrecoEMargem variantes={VARIANTES} readOnly={false} />)

    await screen.findByText(/Nenhum fornecedor tem preço de tabela/)
  })

  it('produto sem variante gravada manda gravar a grade primeiro', async () => {
    // Preço pende da variante, e variante sem id do servidor não tem preço —
    // pedir `/api/table-prices/undefined` daria 404 com cara de erro do sistema.
    const servidor = instalarServidor({})

    renderWithQuery(<PrecoEMargem variantes={[]} readOnly={false} />)

    expect(screen.getByText(/ainda não tem variante gravada/)).toBeInTheDocument()
    expect(servidor.chamadas).toHaveLength(0)
  })
})

describe('a gravação é própria, e substitui a lista', () => {
  it('editar o preço e Gravar manda PUT com a lista inteira', async () => {
    const servidor = instalarServidor({
      [TABELA_URL]: () => json([LINHA_EVOLED]),
      [INDICES_URL]: () => indices([INDICE_EVOLED]),
    })

    const { user } = renderWithQuery(<PrecoEMargem variantes={VARIANTES} readOnly={false} />)

    const campo = await screen.findByLabelText(/Preço de tabela — EVOLED/)
    await user.clear(campo)
    await user.type(campo, '900,00')
    await user.click(screen.getByRole('button', { name: 'Gravar tabela' }))

    await waitFor(() => {
      const put = servidor.chamadas.find((c) => c.metodo === 'PUT')
      expect(put?.corpo).toEqual({
        prices: [{ supplierId: 'forn-evoled', tablePriceCents: 90_000 }],
      })
    })
  })

  it('Descartar devolve o valor do servidor AO CAMPO, não só ao estado', async () => {
    // O campo guarda o texto digitado, e texto local não volta atrás sozinho.
    // Sem o selo de edição na `key` da linha, `Descartar` restaurava os
    // centavos e deixava o número digitado na tela — a grade dizendo uma coisa
    // e o corpo do `PUT` outra.
    instalarServidor({
      [TABELA_URL]: () => json([LINHA_EVOLED]),
      [INDICES_URL]: () => indices([INDICE_EVOLED]),
    })

    const { user } = renderWithQuery(<PrecoEMargem variantes={VARIANTES} readOnly={false} />)

    const campo = await screen.findByLabelText(/Preço de tabela — EVOLED/)
    await user.clear(campo)
    await user.type(campo, '900,00')
    await user.click(screen.getByRole('button', { name: 'Descartar' }))

    await waitFor(() =>
      expect(screen.getByLabelText(/Preço de tabela — EVOLED/)).toHaveValue('741,80'),
    )
    // E a venda sugerida volta com ele: R$ 741,80 × 2,5600.
    expect(screen.getByText('R$ 1.899,01')).toBeInTheDocument()
  })

  it('o Gravar só acende depois de editar — sem mudança não há o que substituir', async () => {
    instalarServidor({
      [TABELA_URL]: () => json([LINHA_EVOLED]),
      [INDICES_URL]: () => indices([INDICE_EVOLED]),
    })

    renderWithQuery(<PrecoEMargem variantes={VARIANTES} readOnly={false} />)

    await screen.findByText('EVOLED ILUMINACAO LTDA')
    expect(screen.getByRole('button', { name: 'Gravar tabela' })).toBeDisabled()
  })

  it('em CONSULTA não há campo nem botão — só leitura', async () => {
    instalarServidor({
      [TABELA_URL]: () => json([LINHA_EVOLED]),
      [INDICES_URL]: () => indices([INDICE_EVOLED]),
    })

    renderWithQuery(<PrecoEMargem variantes={VARIANTES} readOnly={true} />)

    await screen.findByText('EVOLED ILUMINACAO LTDA')
    expect(screen.getByText('R$ 741,80')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Gravar tabela' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Preço de tabela —/)).not.toBeInTheDocument()
  })
})

describe('a simulação de margem', () => {
  it('fornecedor SEM perfil de custo não ganha botão de simular', async () => {
    // `costProfileId` nulo é caso real — fornecedor sem cascata e sem crédito.
    // Um botão que abrisse um extrato de zeros ensinaria que o custo é zero.
    instalarServidor({
      [TABELA_URL]: () => json([LINHA_EVOLED]),
      [INDICES_URL]: () => indices([{ ...INDICE_EVOLED, costProfileId: null }]),
    })

    renderWithQuery(<PrecoEMargem variantes={VARIANTES} readOnly={false} />)

    await screen.findByText('EVOLED ILUMINACAO LTDA')
    expect(screen.queryByLabelText(/Simular a margem/)).not.toBeInTheDocument()
  })

  it('manda a venda sugerida como `netSaleCents` — sem ela quatro parcelas somem', async () => {
    const servidor = instalarServidor({
      [TABELA_URL]: () => json([LINHA_EVOLED]),
      [INDICES_URL]: () => indices([INDICE_EVOLED]),
      '/api/cost-profiles/cst-1/simulate': () => problema(501, 'A apuração é do servidor.'),
    })

    const { user } = renderWithQuery(<PrecoEMargem variantes={VARIANTES} readOnly={false} />)

    await user.click(await screen.findByLabelText(/Simular a margem/))

    await waitFor(() => {
      const post = servidor.chamadas.find((c) => c.metodo === 'POST')
      expect(post?.corpo).toEqual({ tablePriceCents: 74_180, netSaleCents: 189_901 })
    })
  })

  it('o extrato traz as parcelas na ordem da conta e AVISA que falta o ICMS', async () => {
    instalarServidor({
      [TABELA_URL]: () => json([LINHA_EVOLED]),
      [INDICES_URL]: () => indices([INDICE_EVOLED]),
      '/api/cost-profiles/cst-1/simulate': () => json(simulacao()),
    })

    const { user } = renderWithQuery(<PrecoEMargem variantes={VARIANTES} readOnly={false} />)

    await user.click(await screen.findByLabelText(/Simular a margem/))

    await screen.findByRole('dialog')
    expect(screen.getByText('Líquido da cascata')).toBeInTheDocument()
    expect(screen.getByText('Custo')).toBeInTheDocument()
    // O aviso não é rodapé opcional: sem ele a margem parece maior do que é.
    expect(screen.getByText(/não inclui ICMS/)).toBeInTheDocument()
  })

  it('sem lucro apurado o extrato diz "sem venda informada", não R$ 0,00', async () => {
    instalarServidor({
      [TABELA_URL]: () => json([LINHA_EVOLED]),
      [INDICES_URL]: () => indices([INDICE_EVOLED]),
      '/api/cost-profiles/cst-1/simulate': () =>
        json({ ...simulacao(), profitCents: null, profitPercent: null }),
    })

    const { user } = renderWithQuery(<PrecoEMargem variantes={VARIANTES} readOnly={false} />)

    await user.click(await screen.findByLabelText(/Simular a margem/))

    await screen.findByText('sem venda informada')
    // As quatro parcelas sobre a venda chegam zeradas, e a tela diz por quê.
    expect(screen.getAllByText('(depende da venda)')).toHaveLength(4)
  })

  it('o 501 acende o aviso de módulo em construção, não "tentar de novo"', async () => {
    // A consulta CHEGOU e repetir dá a mesma resposta. O bloco genérico de
    // falha mentiria nas duas pontas.
    instalarServidor({
      [TABELA_URL]: () => json([LINHA_EVOLED]),
      [INDICES_URL]: () => indices([INDICE_EVOLED]),
      '/api/cost-profiles/cst-1/simulate': () =>
        problema(501, 'A apuração de custo e margem é feita pelo servidor.'),
    })

    const { user } = renderWithQuery(<PrecoEMargem variantes={VARIANTES} readOnly={false} />)

    await user.click(await screen.findByLabelText(/Simular a margem/))

    await screen.findByText(/A apuração de custo e margem é feita pelo servidor/)
  })
})

describe('o aviso de cobertura', () => {
  it('diz que a gravação SUBSTITUI e que a vigência não chega aqui', async () => {
    instalarServidor({
      [TABELA_URL]: () => json([LINHA_EVOLED]),
      [INDICES_URL]: () => indices([INDICE_EVOLED]),
    })

    renderWithQuery(<PrecoEMargem variantes={VARIANTES} readOnly={false} />)

    expect(screen.getByText(/perde o preço no servidor/)).toBeInTheDocument()
    expect(screen.getByText(/não se editam aqui/)).toBeInTheDocument()
    expect(screen.getByText(/A tabela mostrada é a/)).toBeInTheDocument()
  })
})

/** Um `CostSimulationDto` completo — todo campo obrigatório do schema. */
function simulacao() {
  return {
    tablePriceCents: 74_180,
    discount1Cents: 14_836,
    discount2Cents: 5934,
    discount3Cents: 0,
    discount4Cents: 0,
    grossNetCents: 53_410,
    icmsCreditCents: 0,
    pisCreditCents: 881,
    cofinsCreditCents: 406,
    netPurchaseCents: 52_123,
    ipiCents: 2671,
    packagingCents: 0,
    financialCents: 1068,
    freightCents: 1602,
    otherCents: 0,
    simplesCents: 7596,
    cardCents: 0,
    fixedCostCents: 15_192,
    costDiscountCents: 0,
    purchaseCents: 57_464,
    costCents: 80_252,
    internalCommissionCents: 3798,
    externalCommissionCents: 0,
    profitCents: 105_851,
    profitPercent: 55_740,
    excludesIcms: true,
  }
}
