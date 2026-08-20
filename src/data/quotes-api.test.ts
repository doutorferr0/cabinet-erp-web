import type { QuoteDetailDto } from '@/api/gerado'
import {
  FILTRAVEIS_ORCAMENTO,
  ORDENAVEIS_ORCAMENTO,
  URL_ORCAMENTOS,
  orcamentosApi,
  paraEscrita,
  paraOrcamento,
} from '@/data/quotes-api'
import { instalarServidor, json, problema } from '@/test/servidor'
import { tableState } from '@/test/utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import contrato from '../../contracts/openapi-v1.json'

/**
 * FRONTEIRA do orçamento contra servidor falso.
 *
 * O que se afirma aqui é a TRADUÇÃO — o formulário fala a língua da transcrição
 * e o servidor fala a do contrato, e é este arquivo que garante que nenhum
 * campo se perde no caminho. Tradução errada não quebra teste de tela: ela
 * grava o dado no lugar errado, calada.
 */

const DETALHE: QuoteDetailDto = {
  id: 'orc-0001',
  number: '21653',
  series: '1',
  issuedAt: '2025-08-05',
  expiresAt: '2025-08-10',
  customerId: 'cli-0001',
  customerName: 'ANDRÉ BATALHA',
  projectName: 'MARIANA',
  status: 'active',
  totalCents: 94_000,
  folderNumber: 'P-12',
  closedAt: null,
  salespersonId: 'emp-1',
  salespersonName: 'Ana',
  professionalId: 'prof-1',
  professionalName: 'Studio X',
  discountMode: 'general',
  discountPercent: 50_000,
  environments: [{ code: 'SALA', name: 'SALA', order: 1 }],
  items: [
    {
      lineNumber: 1,
      environmentCode: 'SALA',
      variantId: null,
      description: 'PENDENTE REDONDO',
      finish: 'PRETO',
      size: 'ÚNICO',
      quantity: 2,
      unit: 'UN',
      unitPriceCents: 47_000,
      discountPercent: 0,
      supplierId: null,
      supplierName: 'STELLA',
      supplierCode: 'F4000',
      supplierDescription: 'PENDENTE REDONDO',
      productGroup: 'PENDENTES',
      pieceType: 'REDONDA',
      totalCents: 94_000,
    },
  ],
}

describe('fronteira do orçamento', () => {
  let servidor: ReturnType<typeof instalarServidor>

  beforeEach(() => {
    servidor = instalarServidor({
      [URL_ORCAMENTOS]: () => json({ rows: [{ id: 'orc-0001', number: '21653' }], total: 1 }),
      [`${URL_ORCAMENTOS}/orc-0001`]: () => json(DETALHE),
      [`${URL_ORCAMENTOS}/orc-sumido`]: () => problema(404, 'Orçamento não encontrado.'),
    })
  })

  afterEach(() => vi.unstubAllGlobals())

  it('a listagem manda a consulta da tabela e devolve o DTO cru', async () => {
    const pagina = await orcamentosApi.list(tableState({ q: 'batalha', page: 2, pageSize: 25 }))

    const url = new URL(servidor.em(URL_ORCAMENTOS)[0]?.url ?? '')
    expect(url.searchParams.get('q')).toBe('batalha')
    expect(url.searchParams.get('page')).toBe('2')
    // Sem tradução: o `sortBy` que viaja é o `accessorKey` da coluna, e a
    // whitelist do servidor é em inglês.
    expect(pagina.rows[0]).toMatchObject({ number: '21653' })
  })

  it('o filtro estruturado viaja em `filters`, com o campo em INGLÊS', async () => {
    await orcamentosApi.list(
      tableState({
        filtros: [
          {
            filtroId: 'l1',
            id: 'customerName',
            variante: 'text',
            operador: 'iLike',
            valor: 'batalha',
          },
        ],
      }),
    )

    const url = new URL(servidor.em(URL_ORCAMENTOS)[0]?.url ?? '')
    expect(JSON.parse(url.searchParams.get('filters') ?? '[]')).toEqual([
      { field: 'customerName', operator: 'iLike', value: 'batalha' },
    ])
  })

  /**
   * Série e dinheiro ficam fora da whitelist: a série é o mesmo valor em toda
   * linha, e centavos/percentual com 4 casas implícitas não têm variante que
   * converta na borda. A fronteira barra ANTES de sair — o 400 do servidor
   * chegaria à tela com cara de erro dele.
   */
  it('campo fora da whitelist é recusado alto, e não vira 400', async () => {
    await expect(
      orcamentosApi.list(
        tableState({
          filtros: [{ filtroId: 'l1', id: 'series', variante: 'text', operador: 'eq', valor: '1' }],
        }),
      ),
    ).rejects.toThrow(/não filtrável/i)
  })

  it('404 é resposta, não falha — o id morto devolve null', async () => {
    await expect(orcamentosApi.get('orc-sumido')).resolves.toBeNull()
  })

  it('o detalhe chega na língua da TELA, com o item inteiro', async () => {
    const orcamento = await orcamentosApi.get('orc-0001')

    expect(orcamento).toMatchObject({
      numero: '21653',
      numeroPasta: 'P-12',
      cliente: 'ANDRÉ BATALHA',
      descricaoObra: 'MARIANA',
      profissionalExterno: 'Studio X',
      modoDesconto: 'GERAL',
      cancelado: false,
    })
    // Quantidade volta a TEXTO: a grade é editável, e número em campo de texto
    // perde o que o operador digitou no meio ("1," vira 1).
    expect(orcamento?.itens[0]).toMatchObject({ quantidade: '2', ambiente: 'SALA' })
  })

  it('registro em branco não pede rede', () => {
    expect(orcamentosApi.empty().numero).toBe('')
  })
})

describe('tradução de ida e volta', () => {
  it('o que vem do servidor volta igual — nenhum campo se perde', () => {
    const escrita = paraEscrita(paraOrcamento(DETALHE))

    expect(escrita).toMatchObject({
      series: '1',
      issuedAt: '2025-08-05',
      customerId: 'cli-0001',
      projectName: 'MARIANA',
      folderNumber: 'P-12',
      salespersonId: 'emp-1',
      professionalId: 'prof-1',
      discountMode: 'general',
      discountPercent: 50_000,
    })
    expect(escrita.environments).toEqual([{ code: 'SALA', name: 'SALA', order: 1 }])
    expect(escrita.items?.[0]).toMatchObject({ quantity: 2, unitPriceCents: 47_000 })
  })

  /**
   * `number`, `status` e `totalCents` NÃO entram na escrita: o contrato os tira
   * porque são do servidor. Mandá-los deixaria o cliente escolher o número da
   * sequência global e o total do documento.
   */
  it('a escrita não carrega o que é do servidor', () => {
    const escrita = paraEscrita(paraOrcamento(DETALHE)) as unknown as Record<string, unknown>

    expect(escrita.number).toBeUndefined()
    expect(escrita.status).toBeUndefined()
    expect(escrita.totalCents).toBeUndefined()
  })

  it('desconto GERAL some quando o modo é por produto', () => {
    const porProduto = { ...paraOrcamento(DETALHE), modoDesconto: 'PRODUTO' as const }

    expect(paraEscrita(porProduto).discountPercent).toBe(0)
  })

  /**
   * MEDIDO contra o backend real ao ligar `/api/quotes` na lista de passagem.
   *
   * `environments` era DERIVADO dos itens, e a grade guarda o CÓDIGO do
   * ambiente — o único nome disponível era o próprio código, então a escrita
   * saía com `name: code`. Como o `PUT` é integral, um `Gravar` sem nenhuma
   * edição gravava o uuid por cima do nome congelado: o documento voltou do
   * servidor com `name: "11111111-1111-…"`.
   */
  it('o nome do ambiente é CONGELADO — regravar não o troca pelo código', () => {
    const doServidor = {
      ...DETALHE,
      environments: [{ code: '9f1c7b20-3a55-4e18-8b90-6d2f4c1a7e33', name: 'SALA', order: 1 }],
      items: [{ ...DETALHE.items[0], environmentCode: '9f1c7b20-3a55-4e18-8b90-6d2f4c1a7e33' }],
    } as typeof DETALHE

    const escrita = paraEscrita(paraOrcamento(doServidor))

    expect(escrita.environments).toEqual([
      { code: '9f1c7b20-3a55-4e18-8b90-6d2f4c1a7e33', name: 'SALA', order: 1 },
    ])
  })

  /**
   * `environmentCode` é `format: uuid` — o id do ambiente no catálogo. O botão
   * `Ambiente` insere uma linha com um nome de `tabelas.ambientes`, lista
   * INVENTADA que não tem id de catálogo nenhum: mandá-lo é **400 ao gravar**,
   * e o operador perde o documento inteiro por causa de uma coluna. Enquanto
   * `GET /api/catalog-lookups` for 501 e não existir kind `AMBIENTE`, a linha
   * grava SEM ambiente em vez de não gravar.
   */
  it('ambiente que o documento não conhece não sai na escrita', () => {
    const comAmbienteInventado = paraOrcamento(DETALHE)
    const primeiro = comAmbienteInventado.itens[0]
    if (!primeiro) throw new Error('o DETALHE do teste precisa de ao menos um item')
    // veio do botão `Ambiente`, que insere um nome de `tabelas.ambientes` — não
    // um id de catálogo
    comAmbienteInventado.itens.push({ ...primeiro, item: '2', ambiente: 'COZINHA' })

    const escrita = paraEscrita(comAmbienteInventado)

    expect(escrita.environments?.map((a) => a.code)).toEqual(['SALA'])
    expect(escrita.items?.[1]?.environmentCode).toBeNull()
    // e o que o documento conhece continua saindo
    expect(escrita.items?.[0]?.environmentCode).toBe('SALA')
  })

  it('cancelado vem do `status`, não da data de fechamento', () => {
    expect(paraOrcamento({ ...DETALHE, status: 'cancelled' }).cancelado).toBe(true)
    // Documento FECHADO continua ativo: fechar não é cancelar.
    expect(paraOrcamento({ ...DETALHE, closedAt: '2025-08-09' }).cancelado).toBe(false)
  })
})

describe('whitelist do contrato', () => {
  const paths = (
    contrato as unknown as {
      paths: Record<
        string,
        { get: { description: string; parameters: { name: string; description?: string }[] } }
      >
    }
  ).paths

  it('ORDENAVEIS_ORCAMENTO é o que o contrato declara aceitar', () => {
    const descricao = paths[URL_ORCAMENTOS]?.get?.description
    for (const campo of ORDENAVEIS_ORCAMENTO) {
      expect(descricao, `campo ${campo} não está na descrição do contrato`).toContain(
        `\`${campo}\``,
      )
    }
  })

  it('FILTRAVEIS_ORCAMENTO é a whitelist publicada em `filters`', () => {
    const filtro = paths[URL_ORCAMENTOS]?.get?.parameters?.find((p) => p.name === 'filters')

    expect(filtro, 'o contrato precisa publicar `filters` para o recurso').toBeDefined()
    for (const campo of FILTRAVEIS_ORCAMENTO) {
      expect(filtro?.description, `campo ${campo} não está na whitelist`).toContain(`\`${campo}\``)
    }
    expect(FILTRAVEIS_ORCAMENTO).not.toContain('series')
    expect(FILTRAVEIS_ORCAMENTO).not.toContain('totalCents')
  })
})
