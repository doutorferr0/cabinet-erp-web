import type { DocumentoDaApresentacao } from '@/features/orcamento/apresentacao-pptx'
import { MenuDeExportacao } from '@/features/orcamento/menu-de-exportacao'
import type { OrcamentoItem } from '@/mocks/orcamentos'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * O `pptxgenjs` é FALSIFICADO, e não o módulo de exportação.
 *
 * A diferença importa: falsificar `exportarApresentacao` provaria só que o
 * clique chama uma função, e deixaria a montagem — que é onde mora a regra da
 * espec — sem nenhuma medida no caminho de verdade. Com o duplo aqui embaixo,
 * o teste atravessa `montarSlides`, o desenho do slide e o nome do arquivo. O
 * que ele não pode atravessar é o download: `writeFile` termina em
 * `URL.createObjectURL`, que o jsdom não implementa.
 */
const slidesCriados: { textos: string[]; tabelas: unknown[][][] }[] = []
const arquivosGravados: string[] = []

vi.mock('pptxgenjs', () => {
  class PptxGenJSFalso {
    layout = ''
    defineLayout() {}
    addSlide() {
      const slide = { textos: [] as string[], tabelas: [] as unknown[][][] }
      slidesCriados.push(slide)
      return {
        background: {},
        addText(texto: string | { text: string }[]) {
          slide.textos.push(
            typeof texto === 'string' ? texto : texto.map((parte) => parte.text).join(''),
          )
        },
        addTable(linhas: unknown[][]) {
          slide.tabelas.push(linhas)
        },
      }
    }
    writeFile({ fileName }: { fileName: string }) {
      arquivosGravados.push(fileName)
      return Promise.resolve(fileName)
    }
  }
  return { default: PptxGenJSFalso }
})

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
    ambiente: 'amb-sala',
    ...parcial,
  }
}

const DOCUMENTO: DocumentoDaApresentacao = {
  numero: '22958',
  cliente: 'Residência Exemplo',
  descricaoObra: 'CASA DA PRAIA',
  consultor: 'Weslley',
  dataEmissao: '2026-07-19',
  dataValidade: '2026-07-31',
  modoDesconto: 'PRODUTO',
  descontoPercentual: 0,
  ambientes: [{ codigo: 'amb-sala', nome: 'SALA', ordem: 1 }],
  itens: [item({}), item({ codigoFornecedor: 'COD2' })],
}

function montar(documento: DocumentoDaApresentacao = DOCUMENTO) {
  const onImprimir = vi.fn()
  render(<MenuDeExportacao obterDocumento={() => documento} onImprimir={onImprimir} />)
  return { onImprimir }
}

describe('MenuDeExportacao', () => {
  beforeEach(() => {
    slidesCriados.length = 0
    arquivosGravados.length = 0
  })

  it('põe as saídas do documento atrás de um gatilho só', async () => {
    const user = userEvent.setup()
    montar()

    // Nenhum botão solto por formato — a fileira de ações não cresce a cada
    // fase da frente do moodboard.
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Exportar/ }))

    expect(await screen.findByRole('menuitem', { name: /Orçamento \(imprimir\)/ })).toBeVisible()
    expect(screen.getByRole('menuitem', { name: /^Apresentação \(PPTX\)/ })).toBeVisible()
    expect(screen.getByRole('menuitem', { name: /sem valores/ })).toBeVisible()
  })

  it('a impressão do orçamento continua sendo a mesma ação de antes', async () => {
    const user = userEvent.setup()
    const { onImprimir } = montar()

    await user.click(screen.getByRole('button', { name: /Exportar/ }))
    await user.click(await screen.findByRole('menuitem', { name: /Orçamento \(imprimir\)/ }))

    expect(onImprimir).toHaveBeenCalledOnce()
    expect(arquivosGravados).toEqual([])
  })

  it('gera a apresentação com capa, um slide por ambiente e o fecho de investimento', async () => {
    const user = userEvent.setup()
    montar()

    await user.click(screen.getByRole('button', { name: /Exportar/ }))
    await user.click(await screen.findByRole('menuitem', { name: /^Apresentação \(PPTX\)/ }))

    await vi.waitFor(() => expect(arquivosGravados).toEqual(['apresentacao-orcamento-22958.pptx']))
    expect(slidesCriados).toHaveLength(3)
    expect(slidesCriados[0]?.textos.join(' ')).toContain('Residência Exemplo')
    expect(slidesCriados[1]?.textos.join(' ')).toContain('SALA')
    // Cabeçalho + os dois itens do ambiente.
    expect(slidesCriados[1]?.tabelas[0]).toHaveLength(3)
    expect(slidesCriados[2]?.textos.join(' ')).toContain('Investimento total')
  })

  it('a versão do arquiteto sai sem coluna de valor e sem slide de investimento', async () => {
    const user = userEvent.setup()
    montar()

    await user.click(screen.getByRole('button', { name: /Exportar/ }))
    await user.click(await screen.findByRole('menuitem', { name: /sem valores/ }))

    await vi.waitFor(() => expect(arquivosGravados).toHaveLength(1))
    // Capa + o único ambiente: o fecho de investimento não existe nesta versão.
    expect(slidesCriados).toHaveLength(2)
    const cabecalho = slidesCriados[1]?.tabelas[0]?.[0] as { text: string }[]
    expect(cabecalho.map((celula) => celula.text)).toEqual(['Cód.', 'Descrição', 'Qtd.'])
    expect(slidesCriados[1]?.textos.join(' ')).not.toContain('Soma do ambiente')
  })

  it('a exportação lê o documento no CLIQUE, não na montagem da tela', async () => {
    const user = userEvent.setup()
    let documento = DOCUMENTO
    render(<MenuDeExportacao obterDocumento={() => documento} />)

    // A linha que o consultor acrescentou DEPOIS de a tela desenhar precisa
    // entrar no arquivo — é o caso que a prop-função existe para cobrir.
    documento = { ...DOCUMENTO, itens: [...DOCUMENTO.itens, item({ codigoFornecedor: 'COD3' })] }

    await user.click(screen.getByRole('button', { name: /Exportar/ }))
    await user.click(await screen.findByRole('menuitem', { name: /^Apresentação \(PPTX\)/ }))

    await vi.waitFor(() => expect(arquivosGravados).toHaveLength(1))
    expect(slidesCriados[1]?.tabelas[0]).toHaveLength(4)
  })
})
