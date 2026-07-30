import type { TableQueryState } from '@/lib/table-query'
import { mockDelay, normalize, pagedMock } from '@/mocks/query'
import { describe, expect, it } from 'vitest'

interface Linha {
  id: number
  nome: string
}

const linhas: Linha[] = [
  { id: 1, nome: 'ARARAQUARA' },
  { id: 2, nome: 'CAMPINAS' },
  { id: 3, nome: 'SÃO PAULO' },
  { id: 4, nome: 'BAURU' },
]

const matches = (l: Linha, q: string) => String(l.id).includes(q) || normalize(l.nome).includes(q)

function estado(over: Partial<TableQueryState> = {}): TableQueryState {
  return { q: '', sort: null, page: 1, pageSize: 10, ...over }
}

describe('pagedMock', () => {
  it('sem busca devolve tudo com o total', async () => {
    const r = await pagedMock(linhas, estado(), matches, 0)
    expect(r.rows).toHaveLength(4)
    expect(r.total).toBe(4)
  })

  it('filtra ignorando acento e devolve total pós-filtro', async () => {
    const r = await pagedMock(linhas, estado({ q: 'sao' }), matches, 0)
    expect(r.rows.map((l) => l.nome)).toEqual(['SÃO PAULO'])
    expect(r.total).toBe(1)
  })

  it('ordena asc e desc pela coluna pedida', async () => {
    const asc = await pagedMock(linhas, estado({ sort: { id: 'nome', desc: false } }), matches, 0)
    expect(asc.rows.map((l) => l.nome)).toEqual(['ARARAQUARA', 'BAURU', 'CAMPINAS', 'SÃO PAULO'])

    const desc = await pagedMock(linhas, estado({ sort: { id: 'id', desc: true } }), matches, 0)
    expect(desc.rows.map((l) => l.id)).toEqual([4, 3, 2, 1])
  })

  it('recorta a página mantendo o total geral', async () => {
    const r = await pagedMock(linhas, estado({ page: 2, pageSize: 3 }), matches, 0)
    expect(r.rows).toHaveLength(1)
    expect(r.total).toBe(4)
  })
})

describe('mockDelay', () => {
  it('devolve o valor recebido', async () => {
    await expect(mockDelay(null, 0)).resolves.toBeNull()
    await expect(mockDelay(linhas[0], 0)).resolves.toEqual({ id: 1, nome: 'ARARAQUARA' })
  })
})
