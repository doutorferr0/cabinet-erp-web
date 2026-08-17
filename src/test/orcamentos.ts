import { paraEscrita } from '@/data/quotes-api'
import { linhaPassaNosFiltros } from '@/lib/filtro-de-consulta'
import type { FiltroDaTabela, Juncao } from '@/lib/filtro-de-consulta'
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
