import { data } from '@/data'
import { createMockProvider, normalize, tabelaDeApoio } from '@/data/provider'
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

  /**
   * O id chega como TEXTO, do jeito que a rota o entrega. O provider mock
   * guarda número, e comparar os dois com `===` seria sempre falso — o registro
   * existiria e a tela diria que não.
   */
  it('get aceita o id como veio da rota, e devolve null quando não existe', async () => {
    await expect(provider.get('2', 0)).resolves.toMatchObject({ nome: 'SÃO PAULO' })
    await expect(provider.get('999', 0)).resolves.toBeNull()
  })

  it('empty não pede id — o registro em branco ainda não existe', () => {
    const branco = provider.empty()
    expect(branco.nome).toBe('')
    // Id NEGATIVO de propósito: é chave de formulário, não id de registro, e
    // não pode colidir com nada que veio do servidor.
    expect(branco.id).toBeLessThan(0)
  })
})

describe('tabelaDeApoio', () => {
  it('filtra tabelas por código ou nome normalizado', async () => {
    const provider = tabelaDeApoio({
      rows: [
        { codigo: '001', nome: 'SÃO PAULO' },
        { codigo: '002', nome: 'CAMPINAS' },
      ],
    })

    await expect(provider.list(tableState({ q: 'sao' }), 0)).resolves.toMatchObject({
      rows: [{ codigo: '001', nome: 'SÃO PAULO' }],
      total: 1,
    })
  })
})

describe('registry de providers', () => {
  /**
   * **NÃO HÁ MAIS RECURSO DE CADASTRO MOCK, e a lista foi APAGADA em vez de
   * ficar vazia.** `colaboradores` era o último; migrou para
   * `GET /api/employees` em 2026-08-25, e a bateria dele é
   * `colaboradores-api.test.ts`, contra servidor falso.
   *
   * `it.each([])` não é "zero casos passando": é caso que não roda, com cara de
   * verde. Enquanto a lista existir vazia, quem escrever o próximo cadastro mock
   * a preenche sem descobrir que ela parou de medir há meses — e quem NÃO
   * escrever nenhum fica com uma guarda que nunca mais falha. Recurso de
   * cadastro novo que nasça mock traz o caso de volta, escrito para ele.
   *
   * O que sobrou aqui são as TABELAS DE APOIO, que continuam locais por não
   * terem caminho no contrato — e são elas que os dois casos abaixo medem.
   */

  /**
   * Cidades saiu da mesma prateleira das outras duas: não é fixture aguardando
   * caminho no contrato, é a lista do IBGE (`src/data/geografia/`), local por
   * decisão. O que a mantém aqui é a fronteira — continua sendo só consulta, e
   * o registry é quem a serve. A bateria da própria lista é
   * `src/data/geografia/municipios.test.ts`.
   */
  it('cidades é só consulta, e devolve o código do IBGE', async () => {
    const r = await data.cidades.list(tableState({ q: 'campinas' }), 0)
    expect(r.rows[0]).toMatchObject({ codigo: '3509502', nome: 'Campinas', uf: 'SP' })
    expect(data.cidades).not.toHaveProperty('empty')
  })

  it('transportadoras é só consulta (busca da Ordem de Compra, sem cadastro)', async () => {
    const r = await data.transportadoras.list(tableState({ q: 'campinas' }), 0)
    expect(r.rows[0]).toMatchObject({ nome: 'TRANSPORTES CAMPINAS LTDA', uf: 'SP' })
    expect(data.transportadoras).not.toHaveProperty('empty')
  })

  it('bancos é só consulta (código COMPE público, sem cadastro)', async () => {
    const r = await data.bancos.list(tableState({ q: 'bradesco' }), 0)
    expect(r.rows[0]).toMatchObject({ codigo: '237', nome: 'BANCO BRADESCO S.A.' })
    expect(data.bancos).not.toHaveProperty('empty')
  })
})
