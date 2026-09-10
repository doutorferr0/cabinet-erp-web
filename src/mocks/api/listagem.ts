import { HttpResponse } from 'msw'
import { aplicarFiltros, type CamposFiltraveis } from './filtro-do-servidor'
import { problemaJson, TIPO } from './problema'

/** Parâmetros comuns a toda listagem paginada do mock. */
export interface ConsultaDeLista {
  q: string | null
  sortBy: string | null
  sortDesc: boolean
  page: number
  pageSize: number
  /** URL completa: `aplicarFiltros` também lê `filters` e `joinOperator`. */
  url: URL
}

export function lerConsulta(url: URL): ConsultaDeLista {
  return {
    q: url.searchParams.get('q'),
    sortBy: url.searchParams.get('sortBy'),
    sortDesc: url.searchParams.get('sortDesc') === 'true',
    page: Number(url.searchParams.get('page') ?? '1'),
    pageSize: Number(url.searchParams.get('pageSize') ?? '10'),
    url,
  }
}

/** Paginação isolada para handlers cuja filtragem e ordenação são próprias. */
export function paginar<T>(linhas: readonly T[], url: URL) {
  const { page, pageSize } = lerConsulta(url)
  if (page < 1 || pageSize < 1 || pageSize > 100) {
    return problemaJson(
      400,
      'Paginação inválida: page é 1-based e pageSize vai até 100.',
      {},
      TIPO.paginacaoInvalida,
    )
  }
  const inicio = (page - 1) * pageSize
  return HttpResponse.json({ rows: linhas.slice(inicio, inicio + pageSize), total: linhas.length })
}

/**
 * Semântica única das listas do modo mock: busca textual, filtros estruturados,
 * whitelist de ordenação e paginação 1-based. Recebe tanto a URL como a consulta
 * já lida para permitir a migração gradual dos handlers antigos.
 */
export function listar<T>(
  itens: readonly T[],
  origem: URL | ConsultaDeLista,
  ordenaveis: readonly string[],
  textoDe: (item: T) => (string | null | undefined)[],
  filtraveis?: CamposFiltraveis,
) {
  const consulta = origem instanceof URL ? lerConsulta(origem) : origem
  if (consulta.page < 1 || consulta.pageSize < 1 || consulta.pageSize > 100) {
    return problemaJson(
      400,
      'Paginação inválida: page é 1-based e pageSize vai até 100.',
      {},
      TIPO.paginacaoInvalida,
    )
  }
  if (consulta.sortBy && !ordenaveis.includes(consulta.sortBy)) {
    return problemaJson(400, `sortBy inválido: ${consulta.sortBy}.`, {}, TIPO.ordenacaoInvalida)
  }

  let rows = [...itens]
  if (consulta.q) {
    const alvo = consulta.q.toLowerCase()
    rows = rows.filter((item) => textoDe(item).some((texto) => texto?.toLowerCase().includes(alvo)))
  }

  const filtradas = aplicarFiltros(rows, consulta.url, filtraveis)
  if (typeof filtradas === 'string') return problemaJson(400, filtradas, {}, TIPO.filtroInvalido)
  rows = filtradas

  if (consulta.sortBy) {
    const chave = consulta.sortBy as keyof T
    rows.sort((a, b) => {
      const va = String(a[chave] ?? '')
      const vb = String(b[chave] ?? '')
      return consulta.sortDesc ? vb.localeCompare(va) : va.localeCompare(vb)
    })
  }

  const total = rows.length
  const inicio = (consulta.page - 1) * consulta.pageSize
  return HttpResponse.json({ rows: rows.slice(inicio, inicio + consulta.pageSize), total })
}
