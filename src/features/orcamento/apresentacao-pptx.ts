/**
 * Fase D do moodboard (`docs/design/moodboard/espec-moodboard.md`): o orçamento
 * vira uma APRESENTAÇÃO editável, um slide por ambiente.
 *
 * **Roda inteira no navegador, sem servidor e sem contrato** — é a decisão da
 * espec: a fase A põe o eixo `template=moodboard` no PDF que o Chromium já
 * imprime server-side, e o PPTX é a saída que o consultor ainda vai EDITAR
 * antes de mandar. Documento que o cliente edita não tem por que nascer no
 * servidor: o dado já está na tela, e o arquivo sai do mesmo snapshot que a
 * folha mostra (`QuoteDetailDto`, projetado em `Orcamento` pela fronteira).
 *
 * A montagem é separada do desenho de propósito: `montarSlides` é função pura
 * sobre o documento e é ONDE MORA A REGRA da espec (quebra em 8, marcador
 * `1/N`, chips só no primeiro, soma só no último). O `pptxgenjs` entra depois,
 * e só posiciona o que ela decidiu.
 */
import { totalItemCentavos } from '@/components/cabinet/documento'
import { formatMoneyBRL } from '@/lib/formatters'
import type { Orcamento, OrcamentoItem } from '@/mocks/orcamentos'

/**
 * O que a apresentação PRECISA do documento — e nada além.
 *
 * É um `Pick` e não o `Orcamento` inteiro porque quem chama é o formulário, e
 * o que ele tem em mãos é o valor do RHF: o schema Zod da tela declara menos
 * campos que o tipo (não há `parcelas` nem `revisao` no formulário). Exigir o
 * documento completo forçaria a tela a remontar um objeto que ela não tem —
 * e a exportação passaria a sair do registro CARREGADO em vez do que está na
 * tela, perdendo a edição que o consultor acabou de fazer.
 */
export type DocumentoDaApresentacao = Pick<
  Orcamento,
  | 'numero'
  | 'cliente'
  | 'descricaoObra'
  | 'consultor'
  | 'dataEmissao'
  | 'dataValidade'
  | 'ambientes'
  | 'itens'
  | 'modoDesconto'
  | 'descontoPercentual'
>

/**
 * Teto de itens por slide — decisão do user na espec: "ambiente com >8 itens
 * quebra em múltiplos slides". Não é estética: acima disso a tabela do slide
 * 16:9 encolhe a ponto de a apresentação virar planilha projetada.
 */
export const ITENS_POR_SLIDE = 8

/** Uma linha da tabela do slide, já na língua do documento impresso. */
export interface LinhaDaApresentacao {
  codigo: string
  descricao: string
  quantidade: string
  /** Total da linha (qtde × unitário − desconto), em centavos. */
  totalCentavos: number
}

/**
 * Um slide de ambiente. Ambiente que passa de `ITENS_POR_SLIDE` vira VÁRIOS
 * destes — cada um com cabeçalho próprio, porque slide sem cabeçalho projetado
 * fora de ordem não diz de que ambiente é.
 */
export interface SlideDeAmbiente {
  /** Numeração da seção, 1-based com dois dígitos (`01`) — o `Nº 01` do mockup. */
  numero: string
  nome: string
  /** `1/2` quando o ambiente quebrou; `null` quando coube num slide só. */
  marcador: string | null
  linhas: LinhaDaApresentacao[]
  /**
   * Chips de composição de luz. **Só no primeiro slide do ambiente** (espec).
   *
   * A espec descreve o chip como `tipo · W · K`, e W/K NÃO EXISTEM no
   * orçamento — são spec estruturada de catálogo, que a fase B ainda vai
   * criar. Derivar do nome do produto, como o mockup fez à mão, daria dado de
   * mentira com cara de dado do documento. Então o chip sai com o que o
   * documento realmente guarda: os tipos de peça do ambiente.
   */
  chips: string[]
  /**
   * Soma do ambiente, **só no último slide dele** (espec) e só quando a
   * apresentação leva valores. `null` nos demais.
   */
  somaCentavos: number | null
}

export interface OpcoesDaApresentacao {
  /**
   * Versão que o arquiteto circula: esconde TODO preço — coluna de valor, soma
   * do ambiente e slide de investimento. Metade dos preços seria pior que
   * nenhum.
   */
  comValores?: boolean
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * Os ambientes do documento na ordem de exibição, com os itens de cada um.
 *
 * `item.ambiente` guarda o `environmentCode` — o uuid do catálogo — e é assim
 * que a fronteira o escreve (`src/data/quotes-api.ts`). Mas o botão `Ambiente`
 * da grade insere uma linha com um NOME da lista de apoio, que não é código
 * conhecido; nesse caso o texto é o próprio rótulo que o operador vê na grade,
 * e é ele que vai para o slide. Exportar diferente do que está na tela seria a
 * exportação corrigindo o documento por conta própria.
 */
function agruparPorAmbiente(
  orcamento: DocumentoDaApresentacao,
): { nome: string; itens: OrcamentoItem[] }[] {
  const grupos = new Map<string, { nome: string; ordem: number; itens: OrcamentoItem[] }>()

  for (const ambiente of orcamento.ambientes) {
    grupos.set(ambiente.codigo, { nome: ambiente.nome, ordem: ambiente.ordem, itens: [] })
  }

  const FIM = Number.MAX_SAFE_INTEGER
  orcamento.itens.forEach((item, indice) => {
    const chave = item.ambiente || ''
    if (!grupos.has(chave)) {
      // Ambiente que o documento não declara: rótulo livre da grade, ou item
      // sem ambiente nenhum. Entra depois dos declarados, na ordem em que
      // aparece na grade — sumir da apresentação seria perder item vendido.
      grupos.set(chave, {
        nome: chave || 'Sem ambiente',
        ordem: FIM - orcamento.itens.length + indice,
        itens: [],
      })
    }
    grupos.get(chave)?.itens.push(item)
  })

  return [...grupos.values()]
    .sort((a, b) => a.ordem - b.ordem)
    .filter((g) => g.itens.length > 0)
    .map((g) => ({ nome: g.nome, itens: g.itens }))
}

/**
 * O documento inteiro virado em slides de ambiente — a regra da espec, sem
 * nenhuma dependência de biblioteca.
 *
 * Ambiente sem item não vira slide: "ambiente sem item nenhum é estado
 * legítimo" no contrato, e slide vazio projetado é ruído, não informação.
 */
export function montarSlides(
  orcamento: DocumentoDaApresentacao,
  { comValores = true }: OpcoesDaApresentacao = {},
): SlideDeAmbiente[] {
  const slides: SlideDeAmbiente[] = []

  agruparPorAmbiente(orcamento).forEach((grupo, indice) => {
    const numero = pad2(indice + 1)
    const linhas: LinhaDaApresentacao[] = grupo.itens.map((item) => ({
      codigo: item.codigoFornecedor,
      descricao: item.descricaoFornecedor,
      quantidade: item.quantidade,
      totalCentavos: totalItemCentavos(item),
    }))
    const soma = linhas.reduce((acc, l) => acc + l.totalCentavos, 0)
    const chips = [...new Set(grupo.itens.map((i) => i.tipoPeca).filter(Boolean))]

    const partes: LinhaDaApresentacao[][] = []
    for (let i = 0; i < linhas.length; i += ITENS_POR_SLIDE) {
      partes.push(linhas.slice(i, i + ITENS_POR_SLIDE))
    }

    partes.forEach((parte, idx) => {
      const ultima = idx === partes.length - 1
      slides.push({
        numero,
        nome: grupo.nome,
        marcador: partes.length > 1 ? `${idx + 1}/${partes.length}` : null,
        linhas: parte,
        chips: idx === 0 ? chips : [],
        somaCentavos: comValores && ultima ? soma : null,
      })
    })
  })

  return slides
}

/** Total do documento: itens menos o desconto geral, quando o modo é `GERAL`. */
export function totalDoOrcamentoCentavos(orcamento: DocumentoDaApresentacao): number {
  const subtotal = orcamento.itens.reduce((acc, item) => acc + totalItemCentavos(item), 0)
  if (orcamento.modoDesconto !== 'GERAL') return subtotal
  // `descontoPercentual` é int com 4 casas implícitas (10000 = 1%), como na
  // grade — a mesma escala que `totalItemCentavos` aplica por linha.
  return Math.round(subtotal - (subtotal * orcamento.descontoPercentual) / 1_000_000)
}

/**
 * Paleta e fontes do design system do site da Vertz, medidas na espec.
 *
 * **É branding do TENANT, não do produto Cabinet** — a espec diz isso em voz
 * alta. Aqui é hardcode consciente: o front não tem, hoje, caminho de contrato
 * para ler `print_settings`/timbre do tenant no navegador. Quando tiver, este
 * objeto vira parâmetro. As fontes viajam por NOME: quem abrir o arquivo sem
 * elas instaladas verá a substituta do PowerPoint, que é o comportamento
 * normal de PPTX e não quebra o layout.
 */
const CORES = {
  papel: 'F4F1EA',
  carta: 'FFFFFF',
  tinta: '2B2B2B',
  suave: '6B6F73',
  brass: 'C99700',
  linha: 'E3DDD6',
} as const
const FONTE_TITULO = 'Metropolis'
const FONTE_MONO = 'Courier Prime'

/**
 * Célula da tabela do slide. Declarada aqui, e não inferida do literal, porque
 * `concat`/spread de dois literais com formatos diferentes (o cabeçalho é
 * `bold`, o corpo tem `color`) faz o TS estreitar o tipo pelo PRIMEIRO e
 * recusar o segundo. É subconjunto estrutural do `TableCell` do `pptxgenjs` —
 * o tipo de lá não pode ser importado sem puxar a biblioteca para o bundle da
 * rota, que é justamente o que o `import()` dinâmico evita.
 */
interface CelulaDaTabela {
  text: string
  options?: { bold?: boolean; align?: 'right'; color?: string }
}

function dataBR(iso: string | null): string {
  if (!iso) return ''
  const [ano, mes, dia] = iso.slice(0, 10).split('-')
  return dia && mes && ano ? `${dia}/${mes}/${ano}` : ''
}

export function nomeDoArquivo(orcamento: DocumentoDaApresentacao): string {
  return `apresentacao-orcamento-${orcamento.numero}.pptx`
}

/**
 * Monta a apresentação e dispara o download.
 *
 * O `pptxgenjs` entra por `import()` dinâmico: são centenas de KB que só quem
 * clica em exportar precisa, e o orçamento é a tela mais aberta do sistema —
 * carregar a biblioteca no bundle da rota faria toda edição de documento pagar
 * por um botão que quase ninguém aperta.
 */
export async function exportarApresentacao(
  orcamento: DocumentoDaApresentacao,
  opcoes: OpcoesDaApresentacao = {},
): Promise<void> {
  const comValores = opcoes.comValores ?? true
  const { default: PptxGenJS } = await import('pptxgenjs')
  const p = new PptxGenJS()
  p.defineLayout({ name: 'CABINET_16_9', width: 13.33, height: 7.5 })
  p.layout = 'CABINET_16_9'

  const capa = p.addSlide()
  capa.background = { color: CORES.papel }
  capa.addText(`PROPOSTA Nº ${orcamento.numero}`, {
    x: 0.6,
    y: 0.9,
    w: 12,
    fontSize: 12,
    charSpacing: 4,
    color: CORES.brass,
    align: 'center',
  })
  capa.addText(orcamento.cliente, {
    x: 0.6,
    y: 2.5,
    w: 12,
    fontSize: 46,
    bold: true,
    fontFace: FONTE_TITULO,
    color: CORES.tinta,
    align: 'center',
  })
  if (orcamento.descricaoObra) {
    capa.addText(orcamento.descricaoObra, {
      x: 0.6,
      y: 3.9,
      w: 12,
      fontSize: 18,
      italic: true,
      fontFace: FONTE_MONO,
      color: CORES.suave,
      align: 'center',
    })
  }
  const rodape = [
    orcamento.consultor ? `Consultor ${orcamento.consultor}` : '',
    orcamento.dataEmissao ? `Emissão ${dataBR(orcamento.dataEmissao)}` : '',
    orcamento.dataValidade ? `Validade ${dataBR(orcamento.dataValidade)}` : '',
  ].filter(Boolean)
  if (rodape.length > 0) {
    capa.addText(rodape.join('  ·  '), {
      x: 0.6,
      y: 6.4,
      w: 12,
      fontSize: 10,
      color: CORES.suave,
      align: 'center',
    })
  }

  for (const slide of montarSlides(orcamento, { comValores })) {
    const sl = p.addSlide()
    sl.background = { color: CORES.papel }
    sl.addText(
      [
        { text: `${slide.numero}  `, options: { color: CORES.brass } },
        { text: slide.nome },
        ...(slide.marcador
          ? [{ text: `  ·  ${slide.marcador}`, options: { fontSize: 16, color: CORES.suave } }]
          : []),
      ],
      { x: 0.6, y: 0.45, w: 9, fontSize: 30, fontFace: FONTE_MONO, color: CORES.tinta },
    )
    if (slide.somaCentavos !== null) {
      sl.addText(`Soma do ambiente  ${formatMoneyBRL(slide.somaCentavos)}`, {
        x: 9.4,
        y: 0.6,
        w: 3.3,
        fontSize: 13,
        align: 'right',
        fontFace: FONTE_MONO,
        color: CORES.tinta,
      })
    }
    const temChips = slide.chips.length > 0
    if (temChips) {
      sl.addText(slide.chips.join('   ·   '), {
        x: 0.6,
        y: 1.25,
        w: 12.1,
        fontSize: 9,
        charSpacing: 1,
        color: CORES.suave,
      })
    }
    const tabela: CelulaDaTabela[][] = [
      [
        { text: 'Cód.', options: { bold: true } },
        { text: 'Descrição', options: { bold: true } },
        { text: 'Qtd.', options: { bold: true, align: 'right' } },
        ...(comValores
          ? [{ text: 'Valor', options: { bold: true, align: 'right' as const } }]
          : []),
      ],
      ...slide.linhas.map((linha) => [
        { text: linha.codigo, options: { color: CORES.brass } },
        { text: linha.descricao },
        { text: linha.quantidade, options: { align: 'right' as const } },
        ...(comValores
          ? [{ text: formatMoneyBRL(linha.totalCentavos), options: { align: 'right' as const } }]
          : []),
      ]),
    ]
    sl.addTable(tabela, {
      x: 0.6,
      y: temChips ? 1.75 : 1.3,
      w: 12.1,
      fontSize: 10.5,
      color: CORES.tinta,
      fill: { color: CORES.carta },
      border: { type: 'solid', pt: 0.5, color: CORES.linha },
      colW: comValores ? [1.8, 7.3, 1.3, 1.7] : [2, 8.6, 1.5],
      rowH: 0.32,
    })
  }

  if (comValores) {
    const fim = p.addSlide()
    fim.background = { color: CORES.papel }
    fim.addText('Investimento total', {
      x: 0.6,
      y: 2.6,
      w: 12,
      fontSize: 16,
      charSpacing: 3,
      color: CORES.suave,
      align: 'center',
    })
    fim.addText(formatMoneyBRL(totalDoOrcamentoCentavos(orcamento)), {
      x: 0.6,
      y: 3.2,
      w: 12,
      fontSize: 44,
      fontFace: FONTE_MONO,
      color: CORES.tinta,
      align: 'center',
    })
    if (orcamento.dataValidade) {
      fim.addText(`Proposta válida até ${dataBR(orcamento.dataValidade)}`, {
        x: 0.6,
        y: 4.5,
        w: 12,
        fontSize: 11,
        color: CORES.suave,
        align: 'center',
      })
    }
  }

  await p.writeFile({ fileName: nomeDoArquivo(orcamento) })
}
