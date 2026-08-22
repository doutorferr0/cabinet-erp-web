import { paraEscrita } from '@/data/quotes-api'
import { linhaPassaNosFiltros } from '@/lib/filtro-de-consulta'
import type { FiltroDaTabela, Juncao } from '@/lib/filtro-de-consulta'
import { POLITICA_PADRAO } from '@/mocks/api/pagamento'
import { orcamentos } from '@/mocks/orcamentos'
import { json, problema } from '@/test/servidor'
import { type FetchStub, respostaLookups, respostaSessao, respostaVinculos } from '@/test/utils'

/**
 * Servidor falso de `/api/quotes` para os testes de TELA do orçamento.
 *
 * Existe porque o recurso virou HTTP (#134): antes o provider em memória
 * respondia dentro do processo e a tela não falava com ninguém. A regra do repo
 * é testar recurso HTTP contra servidor falso, nunca com mock do módulo — o
 * cliente gerado chama `fetch(new Request(...))`, e é do `Request` que verbo e
 * corpo saem.
 *
 * Serve o MESMO seed da transcrição (§8.1) e aplica `q`, `filters` e paginação
 * de verdade: um stub que devolvesse a lista fixa faria o teste de filtro
 * passar sem filtrar nada, que é justamente o defeito que ele existe para pegar.
 */
export function servidorDeOrcamentos(extra?: FetchStub): FetchStub {
  return async (entrada) => {
    // Verbo e corpo saem do `Request`, nunca de um `init`: o cliente gerado
    // chama `fetch(new Request(...))`, e stub que casa só por caminho deixa o
    // `POST` cair na resposta do `GET` — o teste passaria sem asserir nada.
    const requisicao = entrada instanceof Request ? entrada : null
    const url = String(requisicao ? requisicao.url : entrada)
    const endereco = new URL(url, 'http://localhost')
    const caminho = endereco.pathname
    const metodo = (requisicao?.method ?? 'GET').toUpperCase()

    if (caminho === '/auth/me') return respostaSessao()
    if (caminho === '/auth/tenants') return respostaVinculos()
    if (caminho === '/api/catalog-lookups') return respostaLookups()
    if (caminho === '/api/installment-policy' || caminho === '/api/payment-terms') {
      return respostaPagamento(caminho)
    }

    if (caminho === '/api/quotes' && metodo === 'GET') {
      const q = endereco.searchParams.get('q')?.toLowerCase() ?? ''
      const page = Number(endereco.searchParams.get('page') ?? '1')
      const pageSize = Number(endereco.searchParams.get('pageSize') ?? '10')

      let linhas = orcamentos.map(resumo)
      if (q) {
        linhas = linhas.filter((o) =>
          [o.number, o.customerName, o.projectName].some((t) => t?.toLowerCase().includes(q)),
        )
      }

      const bruto = endereco.searchParams.get('filters')
      if (bruto) {
        const juncao: Juncao = endereco.searchParams.get('joinOperator') === 'or' ? 'or' : 'and'
        const condicoes: FiltroDaTabela[] = (
          JSON.parse(bruto) as { field: string; operator: string; value?: string | string[] }[]
        ).map((c, i) => ({
          filtroId: `c-${i}`,
          id: c.field,
          // As duas datas do documento são as únicas variantes não-texto que a
          // tela oferece aqui; o resto compara como texto, que é o que o
          // servidor faria pelo tipo da coluna.
          variante: c.field === 'issuedAt' || c.field === 'expiresAt' ? 'date' : 'text',
          operador: c.operator as FiltroDaTabela['operador'],
          valor: c.value ?? '',
        }))
        linhas = linhas.filter((o) => linhaPassaNosFiltros(o, condicoes, juncao))
      }

      const total = linhas.length
      const inicio = (page - 1) * pageSize
      return json({ rows: linhas.slice(inicio, inicio + pageSize), total })
    }

    if (caminho.startsWith('/api/quotes/') && metodo === 'GET') {
      const id = caminho.slice('/api/quotes/'.length)
      const achado = orcamentos.find((o) => o.id === id)
      if (!achado) return problema(404, 'Orçamento não encontrado.')
      return json(detalhe(achado))
    }

    if (caminho === '/api/quotes' && metodo === 'POST') {
      const corpo = requisicao ? await requisicao.clone().json() : {}
      return json({ ...detalhe(orcamentos[0] as Linha), ...(corpo as object), id: 'orc-novo' }, 201)
    }

    if (extra) return extra(entrada)
    return Promise.reject(new Error(`fetch sem stub no teste: ${url}`))
  }
}

type Linha = (typeof orcamentos)[number]

function resumo(o: Linha) {
  return {
    id: o.id,
    number: o.numero,
    series: o.serie,
    issuedAt: o.dataEmissao,
    expiresAt: o.dataValidade,
    customerId: o.clienteId,
    customerName: o.cliente,
    projectName: o.descricaoObra,
    status: o.cancelado ? 'cancelled' : 'active',
    totalCents: 0,
  }
}

/** O detalhe sai do MESMO tradutor que a tela usa para gravar — ida e volta. */
function detalhe(o: Linha) {
  const escrita = paraEscrita(o)
  return {
    ...resumo(o),
    folderNumber: escrita.folderNumber,
    closedAt: escrita.closedAt,
    salespersonId: escrita.salespersonId,
    salespersonName: o.consultor,
    professionalId: escrita.professionalId,
    professionalName: o.profissionalExterno,
    discountMode: escrita.discountMode,
    discountPercent: escrita.discountPercent,
    environments: escrita.environments,
    items: (escrita.items ?? []).map((item) => ({
      ...item,
      totalCents: Math.round(item.quantity * item.unitPriceCents),
    })),
  }
}

/**
 * As duas rotas do bloco PAGAMENTO, que TODA tela de documento passou a
 * consultar quando a seção 06 nasceu.
 *
 * Elas moram no dublê padrão do orçamento pela mesma razão de
 * `/api/catalog-lookups` no `sessaoValida`: não é dado que cada caso escolhe, é
 * dado que a tela busca sempre. E o custo de esquecê-las não é um erro claro —
 * o `retry` do app é `tentativa < 3` com backoff, então uma rota sem dublê gasta
 * ~7s de repetição por consulta DENTRO de um teste de 15s. O sintoma seria
 * `Test timed out`, num arquivo que não fala de pagamento.
 */
export function respostaPagamento(caminho: string): Response {
  if (caminho === '/api/installment-policy') return json(POLITICA_PADRAO)
  return json({ rows: CONDICOES_DE_TESTE, total: CONDICOES_DE_TESTE.length })
}

/**
 * Duas condições, e as duas existem por um motivo: uma de parcela ÚNICA (a que
 * cabe em qualquer total) e uma parcelada (a que a política pode recusar).
 * Uma lista de uma linha só não distingue os dois caminhos do combo.
 */
export const CONDICOES_DE_TESTE = [
  {
    id: 'cond-0001',
    name: 'À VISTA',
    active: true,
    installmentCount: 1,
    installments: [{ number: 1, daysAfterIssue: 0, percent: 1_000_000, amountCents: null }],
  },
  {
    id: 'cond-0002',
    name: '30/60/90',
    active: true,
    installmentCount: 3,
    installments: [
      { number: 1, daysAfterIssue: 30, percent: 333_334, amountCents: null },
      { number: 2, daysAfterIssue: 60, percent: 333_333, amountCents: null },
      { number: 3, daysAfterIssue: 90, percent: 333_333, amountCents: null },
    ],
  },
]
