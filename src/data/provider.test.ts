import { data } from '@/data'
import { createMockProvider, normalize } from '@/data/provider'
import { tableState } from '@/test/utils'
import { describe, expect, it } from 'vitest'

/**
 * Contrato da camada de dados. Estes testes NÃO podem mudar quando o provider
 * mock virar cliente HTTP — é exatamente o comportamento que o backend precisa
 * honrar (paginação 1-based, total pós-filtro, `get` inexistente = null).
 */

interface Linha {
  id: number
  nome: string
}

const rows: Linha[] = [
  { id: 1, nome: 'CAMPINAS' },
  { id: 2, nome: 'SÃO PAULO' },
  { id: 3, nome: 'BAURU' },
]

const provider = createMockProvider<Linha>({
  rows,
  matches: (l, q) => String(l.id).includes(q) || normalize(l.nome).includes(q),
  empty: (id) => ({ id, nome: '' }),
})

describe('ResourceProvider (contrato)', () => {
  it('list devolve linhas e total', async () => {
    const r = await provider.list(tableState(), 0)
    expect(r.rows).toHaveLength(3)
    expect(r.total).toBe(3)
  })

  it('list pagina em base 1 e mantém o total geral', async () => {
    const r = await provider.list(tableState({ page: 2, pageSize: 2 }), 0)
    expect(r.rows.map((l) => l.id)).toEqual([3])
    expect(r.total).toBe(3)
  })

  it('list filtra ignorando acento e recalcula o total', async () => {
    const r = await provider.list(tableState({ q: 'sao' }), 0)
    expect(r.rows.map((l) => l.nome)).toEqual(['SÃO PAULO'])
    expect(r.total).toBe(1)
  })

  it('get devolve o registro e null quando não existe', async () => {
    await expect(provider.get(2, 0)).resolves.toMatchObject({ nome: 'SÃO PAULO' })
    await expect(provider.get(999, 0)).resolves.toBeNull()
  })

  it('empty devolve registro em branco com o id pedido', () => {
    expect(provider.empty(42)).toEqual({ id: 42, nome: '' })
  })
})

describe('registry de providers', () => {
  /**
   * Os recursos que ainda são MOCK. `produtos` saiu daqui quando virou HTTP —
   * o contrato dele é asserido contra servidor falso em `produtos-api.test.ts`,
   * que é onde a mesma promessa (`list`/`get`/`empty`) passa a valer.
   */
  const recursosComCadastro = [
    'clientes',
    'fornecedores',
    'colaboradores',
    'profissionais',
    'ordensCompra',
    'pedidosCompra',
    'orcamentos',
  ] as const

  it.each(recursosComCadastro)('%s expõe list/get/empty', async (nome) => {
    const p = data[nome]
    const lista = await p.list(tableState(), 0)
    expect(lista.total).toBeGreaterThan(0)

    const primeiro = lista.rows[0] as { id: number }
    await expect(p.get(primeiro.id, 0)).resolves.toMatchObject({ id: primeiro.id })
    expect(p.empty(1)).toHaveProperty('id', 1)
  })

  it('cidades é só consulta (tabela de apoio, sem cadastro)', async () => {
    const r = await data.cidades.list(tableState({ q: 'campinas' }), 0)
    expect(r.rows[0]).toMatchObject({ nome: 'CAMPINAS', uf: 'SP' })
    expect(data.cidades).not.toHaveProperty('empty')
  })
})
