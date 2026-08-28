import type { PriceIndexDto } from '@/api/gerado'
import {
  PARCELAS_DA_SIMULACAO,
  indiceDoFornecedor,
  useGravarTabelas,
  useIndicesDePreco,
  useSimularMargem,
  useTabelasDaVariante,
  vendaSugeridaCents,
} from '@/data/precos-api'
import { instalarServidor, json, problema } from '@/test/servidor'
import { renderWithQuery } from '@/test/utils'
import { waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * A FRONTEIRA DE PREÇO — a fórmula e os quatro hooks.
 *
 * O caso que carrega este arquivo é `vendaSugeridaCents`. Ele é a ÚNICA conta
 * de dinheiro que o front faz neste módulo, e é a que já foi implementada
 * errada uma vez: até 2026-08-24 a leitura do legado dizia que a venda saía do
 * LÍQUIDO de compra × índice. Um teste de ouro contra
 * `docs/legado/config/indice_preco.csv` (41 de 41 casos ao centavo) mostrou que
 * a base é o preço de TABELA bruto — o ramo do líquido existe na proc, atrás de
 * `if @Cus_cambio > 0`, e `Cus_Cambio` tem ZERO linhas em 385 perfis.
 *
 * Os casos abaixo não repetem os 41; eles travam a ESCALA e o ARREDONDAMENTO,
 * que são o que uma reescrita distraída quebra sem sintoma visível.
 */

afterEach(() => {
  vi.unstubAllGlobals()
})

function indice(over: Partial<PriceIndexDto> = {}): PriceIndexDto {
  return {
    id: 'idx-1',
    supplierId: 'forn-1',
    supplierName: 'EVOLED',
    costProfileId: 'cst-1',
    costProfileName: 'PADRÃO',
    indexValue: 25_600,
    active: true,
    ...over,
  }
}

describe('vendaSugeridaCents — round(tabela × índice, 2)', () => {
  it('R$ 100,00 × 2,5600 = R$ 256,00 — o caso do contrato', async () => {
    expect(vendaSugeridaCents(10_000, indice())).toBe(25_600)
  })

  it('arredonda a duas casas, meio para cima', async () => {
    // 3 centavos × 1,5000 = 4,5 centavos. Truncar daria 4 e a diferença
    // apareceria só na terceira casa da fatura — que é onde ninguém olha.
    expect(vendaSugeridaCents(3, indice({ indexValue: 15_000 }))).toBe(5)
  })

  it('índice 1,0000 devolve o próprio preço de tabela', async () => {
    // O blocker nº 1 do ETL: 16 índices em 1,0000, 11 de fornecedores reais.
    // Migrar literal reproduz margem zero — e a tela precisa MOSTRAR isso, não
    // corrigi-lo por conta própria.
    expect(vendaSugeridaCents(74_180, indice({ indexValue: 10_000 }))).toBe(74_180)
  })

  it('a conta é em INTEIRO — não passa por float no meio', async () => {
    // O caso do seed: R$ 741,80 × 2,5600 = R$ 1.899,008, que a duas casas é
    // R$ 1.899,01 — e o centavo do arredondamento é justamente o que se perde
    // quando alguém divide antes de multiplicar.
    expect(vendaSugeridaCents(74_180, indice())).toBe(189_901)
  })

  it('sem índice é `null`, nunca zero', async () => {
    // Zero seria "de graça". `null` é "não sei", e a tela mostra um traço.
    expect(vendaSugeridaCents(74_180, undefined)).toBeNull()
  })

  it('índice INATIVO também é `null` — ele não precifica', async () => {
    // O contrato diz que a variante daquele fornecedor volta a devolver
    // `calculatedUnitPriceCents` nulo. Continuar calculando com o índice
    // desligado faria a tela precificar com um número que o servidor recusa.
    expect(vendaSugeridaCents(74_180, indice({ active: false }))).toBeNull()
  })
})

describe('indiceDoFornecedor', () => {
  it('acha por `supplierId`', () => {
    const lista = [indice(), indice({ id: 'idx-2', supplierId: 'forn-2' })]
    expect(indiceDoFornecedor(lista, 'forn-2')?.id).toBe('idx-2')
  })

  it('fornecedor sem índice devolve `undefined`', () => {
    expect(indiceDoFornecedor([indice()], 'forn-9')).toBeUndefined()
  })
})

describe('PARCELAS_DA_SIMULACAO', () => {
  it('está na ordem da CONTA, com as três linhas de fechamento no lugar', () => {
    // A ordem é o que permite refazer a conta com o dedo. Alfabetizar esta
    // lista a destruiria sem quebrar teste nenhum — daí o caso.
    const rotulos = PARCELAS_DA_SIMULACAO.map((p) => p.rotulo)
    expect(rotulos[0]).toBe('Preço de tabela')
    expect(rotulos.indexOf('Líquido da cascata')).toBeLessThan(rotulos.indexOf('Líquido de compra'))
    expect(rotulos.indexOf('Líquido de compra')).toBeLessThan(rotulos.indexOf('Compra'))
    expect(rotulos.indexOf('Compra')).toBeLessThan(rotulos.indexOf('Custo'))
  })

  it('marca as QUATRO parcelas que incidem sobre a venda', () => {
    // Sem `netSaleCents` elas chegam zeradas, e sem esta marca o operador leria
    // o zero como "não tem" em vez de "não perguntei".
    const sobreVenda = PARCELAS_DA_SIMULACAO.filter((p) => p.sobreVenda).map((p) => p.rotulo)
    expect(sobreVenda).toEqual(['Simples', 'Cartão', 'Custo fixo', 'Desconto de custo'])
  })
})

/**
 * Os hooks contra SERVIDOR FALSO — nunca com mock do módulo.
 *
 * O cliente gerado chama `fetch(new Request(...))`, então verbo e corpo vêm do
 * `Request`: um stub que casasse só por caminho deixaria o `PUT` cair na
 * resposta do `GET` e o teste passaria sem asserir nada.
 */
function SondaDaTabela({ variantId }: { variantId: string | null }) {
  const q = useTabelasDaVariante(variantId)
  return (
    <>
      <span data-testid="linhas">{q.data?.length ?? -1}</span>
      <span data-testid="estado">{q.fetchStatus}</span>
    </>
  )
}

describe('useTabelasDaVariante', () => {
  it('carrega a lista da variante', async () => {
    instalarServidor({
      '/api/table-prices/var-1': () =>
        json([{ supplierId: 'forn-1', supplierName: 'EVOLED', tablePriceCents: 74_180 }]),
    })

    const { getByTestId } = renderWithQuery(<SondaDaTabela variantId="var-1" />)

    await waitFor(() => expect(getByTestId('linhas').textContent).toBe('1'))
  })

  it('sem variante escolhida NÃO consulta — `/undefined` seria 404 sem sentido', async () => {
    // Caminho sem rota responde 404 no servidor falso; o que este caso prova é
    // que nem chega a haver requisição.
    const servidor = instalarServidor({})

    const { getByTestId } = renderWithQuery(<SondaDaTabela variantId={null} />)

    await waitFor(() => expect(getByTestId('estado').textContent).toBe('idle'))
    expect(servidor.chamadas).toHaveLength(0)
  })
})

function SondaDosIndices() {
  const q = useIndicesDePreco()
  return <span data-testid="n">{q.data?.length ?? -1}</span>
}

describe('useIndicesDePreco', () => {
  it('pede o conjunto no teto do contrato e devolve `rows`', async () => {
    const servidor = instalarServidor({
      '/api/price-indexes': () => json({ rows: [indice()], total: 1 }),
    })

    const { getByTestId } = renderWithQuery(<SondaDosIndices />)

    await waitFor(() => expect(getByTestId('n').textContent).toBe('1'))
    // Quem abre a ficha precisa do índice de CADA fornecedor da peça; paginar
    // aqui deixaria de fora justamente o fornecedor que a linha 11 procura.
    const url = new URL(servidor.chamadas[0]?.url as string)
    expect(url.searchParams.get('pageSize')).toBe('100')
  })
})

function SondaDeGravacao() {
  const m = useGravarTabelas('var-1')
  return (
    <button
      type="button"
      onClick={() => m.mutate({ prices: [{ supplierId: 'forn-1', tablePriceCents: 90_000 }] })}
    >
      gravar
    </button>
  )
}

describe('useGravarTabelas', () => {
  it('manda PUT, e o VERBO vem do `Request` — não do `init`', async () => {
    const servidor = instalarServidor({ '/api/table-prices/var-1': () => json([]) })

    const { getByRole, user } = renderWithQuery(<SondaDeGravacao />)
    await user.click(getByRole('button', { name: 'gravar' }))

    await waitFor(() => expect(servidor.chamadas).toHaveLength(1))
    expect(servidor.chamadas[0]?.metodo).toBe('PUT')
    expect(servidor.chamadas[0]?.corpo).toEqual({
      prices: [{ supplierId: 'forn-1', tablePriceCents: 90_000 }],
    })
  })
})

function SondaDeSimulacao() {
  const m = useSimularMargem()
  return (
    <>
      <button
        type="button"
        onClick={() => m.mutate({ costProfileId: 'cst-1', corpo: { tablePriceCents: 100 } })}
      >
        simular
      </button>
      <span data-testid="erro">{m.isError ? 'erro' : ''}</span>
    </>
  )
}

describe('useSimularMargem', () => {
  it('o 501 chega como ERRO, para a tela desviar para o aviso de construção', async () => {
    // É a resposta que o mock dá e que o backend dá para caminho que ainda não
    // serve. Chegar como sucesso vazio faria a tela desenhar um extrato de
    // zeros, que é o oposto do que este trilho decidiu.
    instalarServidor({
      '/api/cost-profiles/cst-1/simulate': () =>
        problema(501, 'A apuração é do servidor.', 'Não implementado'),
    })

    const { getByRole, getByTestId, user } = renderWithQuery(<SondaDeSimulacao />)
    await user.click(getByRole('button', { name: 'simular' }))

    await waitFor(() => expect(getByTestId('erro').textContent).toBe('erro'))
  })
})
