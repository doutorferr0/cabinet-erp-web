import {
  ITENS_POR_SLIDE,
  montarSlides,
  nomeDoArquivo,
  totalDoOrcamentoCentavos,
} from '@/features/orcamento/apresentacao-pptx'
import type { Orcamento, OrcamentoItem } from '@/mocks/orcamentos'
import { orcamentoVazio } from '@/mocks/orcamentos'
import { describe, expect, it } from 'vitest'

function item(parcial: Partial<OrcamentoItem>): OrcamentoItem {
  return {
    item: '1',
    codigoFornecedor: 'COD',
    descricaoFornecedor: 'Peça',
    acabamento: '',
    tamanho: '',
    quantidade: '1',
    unidade: 'UN',
    valorUnitarioCentavos: 10_000,
    descontoPercentual: null,
    grupoProduto: '',
    tipoPeca: '',
    fornecedor: '',
    ambiente: '',
    ...parcial,
  }
}

function documento(parcial: Partial<Orcamento> = {}): Orcamento {
  return {
    ...orcamentoVazio('orc-0001'),
    numero: '22958',
    cliente: 'Residência Exemplo',
    ambientes: [
      { codigo: 'amb-sala', nome: 'SALA', ordem: 1 },
      { codigo: 'amb-quarto', nome: 'QUARTO', ordem: 2 },
    ],
    ...parcial,
  }
}

function itensDoAmbiente(codigo: string, quantos: number): OrcamentoItem[] {
  return Array.from({ length: quantos }, (_, i) =>
    item({ ambiente: codigo, codigoFornecedor: `C${i + 1}`, descricaoFornecedor: `Peça ${i + 1}` }),
  )
}

describe('montarSlides', () => {
  it('faz um slide por ambiente, na ordem do documento', () => {
    const slides = montarSlides(
      documento({
        itens: [...itensDoAmbiente('amb-quarto', 2), ...itensDoAmbiente('amb-sala', 3)],
      }),
    )

    expect(slides.map((s) => [s.numero, s.nome])).toEqual([
      ['01', 'SALA'],
      ['02', 'QUARTO'],
    ])
    expect(slides[0]?.linhas).toHaveLength(3)
    expect(slides[1]?.linhas).toHaveLength(2)
  })

  it('ambiente sem item não vira slide — ambiente vazio é estado legítimo', () => {
    const slides = montarSlides(documento({ itens: itensDoAmbiente('amb-quarto', 1) }))

    expect(slides.map((s) => s.nome)).toEqual(['QUARTO'])
    // A numeração é de SLIDE, não do índice do ambiente no documento: o que o
    // cliente vê é `Nº 01`, e pular para `02` acusaria seção que não existe.
    expect(slides[0]?.numero).toBe('01')
  })

  it('ambiente que passa de 8 itens quebra, e todo pedaço leva cabeçalho', () => {
    const slides = montarSlides(
      documento({ itens: itensDoAmbiente('amb-sala', ITENS_POR_SLIDE + 1) }),
    )

    expect(slides).toHaveLength(2)
    expect(slides.map((s) => s.linhas.length)).toEqual([ITENS_POR_SLIDE, 1])
    expect(slides.map((s) => s.nome)).toEqual(['SALA', 'SALA'])
    expect(slides.map((s) => s.numero)).toEqual(['01', '01'])
    expect(slides.map((s) => s.marcador)).toEqual(['1/2', '2/2'])
  })

  it('ambiente que cabe num slide não ganha marcador', () => {
    const slides = montarSlides(documento({ itens: itensDoAmbiente('amb-sala', ITENS_POR_SLIDE) }))

    expect(slides).toHaveLength(1)
    expect(slides[0]?.marcador).toBeNull()
  })

  it('chips só no primeiro pedaço e soma do ambiente só no último', () => {
    const itens = itensDoAmbiente('amb-sala', ITENS_POR_SLIDE + 2).map((i) =>
      item({ ...i, tipoPeca: 'EMBUTIDO' }),
    )
    const slides = montarSlides(documento({ itens }))

    expect(slides.map((s) => s.chips)).toEqual([['EMBUTIDO'], []])
    expect(slides[0]?.somaCentavos).toBeNull()
    expect(slides[1]?.somaCentavos).toBe(10 * 10_000)
  })

  it('sem valores: nenhum slide carrega soma do ambiente', () => {
    const slides = montarSlides(documento({ itens: itensDoAmbiente('amb-sala', 2) }), {
      comValores: false,
    })

    expect(slides[0]?.somaCentavos).toBeNull()
  })

  it('total da linha desconta o percentual do item', () => {
    const slides = montarSlides(
      documento({
        itens: [
          item({ ambiente: 'amb-sala', quantidade: '2', descontoPercentual: 100_000 }), // 10%
        ],
      }),
    )

    expect(slides[0]?.linhas[0]?.totalCentavos).toBe(18_000)
  })

  it('item com ambiente que o documento não declara vira grupo próprio, depois dos declarados', () => {
    // O botão `Ambiente` da grade insere um NOME da lista de apoio, que não é
    // código conhecido. A exportação mostra o rótulo que está na tela.
    const slides = montarSlides(
      documento({
        itens: [
          item({ ambiente: 'VARANDA', codigoFornecedor: 'C-VAR' }),
          ...itensDoAmbiente('amb-sala', 1),
        ],
      }),
    )

    expect(slides.map((s) => s.nome)).toEqual(['SALA', 'VARANDA'])
  })

  it('item sem ambiente nenhum continua na apresentação', () => {
    const slides = montarSlides(documento({ itens: [item({ codigoFornecedor: 'ORFAO' })] }))

    expect(slides.map((s) => s.nome)).toEqual(['Sem ambiente'])
    expect(slides[0]?.linhas[0]?.codigo).toBe('ORFAO')
  })
})

describe('totalDoOrcamentoCentavos', () => {
  it('soma os itens quando o desconto é por produto', () => {
    const total = totalDoOrcamentoCentavos(
      documento({ itens: itensDoAmbiente('amb-sala', 3), modoDesconto: 'PRODUTO' }),
    )

    expect(total).toBe(30_000)
  })

  it('aplica o desconto geral, na escala de 4 casas implícitas', () => {
    const total = totalDoOrcamentoCentavos(
      documento({
        itens: itensDoAmbiente('amb-sala', 3),
        modoDesconto: 'GERAL',
        descontoPercentual: 100_000, // 10%
      }),
    )

    expect(total).toBe(27_000)
  })
})

describe('nomeDoArquivo', () => {
  it('leva o número do documento', () => {
    expect(nomeDoArquivo(documento())).toBe('apresentacao-orcamento-22958.pptx')
  })
})
