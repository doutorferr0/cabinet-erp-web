import {
  type FiltroDaTabela,
  filtroCasa,
  filtrosValidos,
  linhaPassaNosFiltros,
  novoFiltroId,
  operadorPadrao,
  operadoresDaVariante,
} from '@/lib/filtro-de-consulta'
import { describe, expect, it } from 'vitest'

interface Linha {
  id: number
  nome: string
  setor: string | null
  cargo: string
  ativo: boolean
}

const linhas: Linha[] = [
  { id: 1, nome: 'CARLA SOUZA', setor: 'VENDAS', cargo: 'VENDEDOR', ativo: true },
  { id: 2, nome: 'PEDRO ALMEIDA', setor: 'ESTOQUE', cargo: 'GERENTE', ativo: false },
  { id: 3, nome: 'PATRÍCIA LIMA', setor: null, cargo: 'COMPRADOR', ativo: true },
]

function filtro(over: Partial<FiltroDaTabela> = {}): FiltroDaTabela {
  return {
    filtroId: novoFiltroId(),
    id: 'nome',
    variante: 'text',
    operador: 'iLike',
    valor: '',
    ...over,
  }
}

function quais(f: FiltroDaTabela[], juncao: 'and' | 'or' = 'and'): number[] {
  return linhas.filter((l) => linhaPassaNosFiltros(l, f, juncao)).map((l) => l.id)
}

describe('vocabulário do filtro', () => {
  it('cada variante oferece o seu conjunto de operadores', () => {
    expect(operadoresDaVariante('text').map((o) => o.valor)).toContain('iLike')
    expect(operadoresDaVariante('number').map((o) => o.valor)).toContain('isBetween')
    expect(operadoresDaVariante('multiSelect').map((o) => o.valor)).toContain('inArray')
  })

  it('booleano NÃO oferece vazio — a caixa Ativo é sempre true ou false', () => {
    const valores = operadoresDaVariante('boolean').map((o) => o.valor)
    expect(valores).not.toContain('isEmpty')
    expect(valores).not.toContain('isNotEmpty')
  })

  it('operador padrão é o primeiro da variante', () => {
    expect(operadorPadrao('text')).toBe('iLike')
    expect(operadorPadrao('number')).toBe('eq')
    expect(operadorPadrao('multiSelect')).toBe('inArray')
  })

  it('linha de filtro nasce com identidade própria', () => {
    expect(novoFiltroId()).not.toBe(novoFiltroId())
  })
})

describe('filtrosValidos', () => {
  it('descarta o filtro ainda sem valor — senão a listagem esvazia no meio da frase', () => {
    expect(filtrosValidos([filtro({ valor: '' })])).toHaveLength(0)
    expect(filtrosValidos([filtro({ valor: [] })])).toHaveLength(0)
    expect(filtrosValidos([filtro({ valor: 'ana' })])).toHaveLength(1)
  })

  it('"está vazio" vale sem valor — ele é a frase inteira', () => {
    expect(filtrosValidos([filtro({ operador: 'isEmpty', valor: '' })])).toHaveLength(1)
  })
})

describe('filtroCasa — texto', () => {
  it('contém ignora caixa e acento', () => {
    expect(filtroCasa(linhas[2], filtro({ operador: 'iLike', valor: 'patricia' }))).toBe(true)
    expect(filtroCasa(linhas[0], filtro({ operador: 'iLike', valor: 'patricia' }))).toBe(false)
  })

  it('não contém é a negação exata do contém', () => {
    expect(filtroCasa(linhas[0], filtro({ operador: 'notILike', valor: 'carla' }))).toBe(false)
    expect(filtroCasa(linhas[1], filtro({ operador: 'notILike', valor: 'carla' }))).toBe(true)
  })

  it('é / não é comparam o valor inteiro, não o pedaço', () => {
    expect(filtroCasa(linhas[0], filtro({ operador: 'eq', valor: 'CARLA SOUZA' }))).toBe(true)
    expect(filtroCasa(linhas[0], filtro({ operador: 'eq', valor: 'CARLA' }))).toBe(false)
    expect(filtroCasa(linhas[0], filtro({ operador: 'ne', valor: 'CARLA' }))).toBe(true)
  })
})

describe('filtroCasa — vazio', () => {
  it('null conta como vazio; string preenchida, não', () => {
    const vazio = filtro({ id: 'setor', operador: 'isEmpty', valor: '' })
    expect(quais([vazio])).toEqual([3])

    const naoVazio = filtro({ id: 'setor', operador: 'isNotEmpty', valor: '' })
    expect(quais([naoVazio])).toEqual([1, 2])
  })
})

describe('filtroCasa — número', () => {
  const numerico = (over: Partial<FiltroDaTabela>) =>
    filtro({ id: 'id', variante: 'number', ...over })

  it('compara como número, não como texto', () => {
    // Como texto, '10' < '9'. Como número, não — e é o número que o operador quer.
    expect(filtroCasa({ id: 10 }, numerico({ operador: 'gt', valor: '9' }))).toBe(true)
  })

  it('menor / maior / ou igual', () => {
    expect(quais([numerico({ operador: 'lt', valor: '2' })])).toEqual([1])
    expect(quais([numerico({ operador: 'lte', valor: '2' })])).toEqual([1, 2])
    expect(quais([numerico({ operador: 'gte', valor: '2' })])).toEqual([2, 3])
  })

  it('está entre inclui as pontas, e ponta em branco fica aberta', () => {
    expect(quais([numerico({ operador: 'isBetween', valor: ['2', '3'] })])).toEqual([2, 3])
    expect(quais([numerico({ operador: 'isBetween', valor: ['', '2'] })])).toEqual([1, 2])
    expect(quais([numerico({ operador: 'isBetween', valor: ['2', ''] })])).toEqual([2, 3])
  })

  it('valor que não é número não casa com nada — em vez de casar com tudo', () => {
    expect(filtroCasa(linhas[0], numerico({ operador: 'gt', valor: 'abc' }))).toBe(false)
  })
})

describe('filtroCasa — booleano e múltipla escolha', () => {
  it('booleano casa pelo texto do valor', () => {
    const ativo = filtro({ id: 'ativo', variante: 'boolean', operador: 'eq', valor: 'true' })
    expect(quais([ativo])).toEqual([1, 3])

    const inativo = filtro({ id: 'ativo', variante: 'boolean', operador: 'eq', valor: 'false' })
    expect(quais([inativo])).toEqual([2])
  })

  it('é um de / não é nenhum de', () => {
    const um = filtro({
      id: 'cargo',
      variante: 'multiSelect',
      operador: 'inArray',
      valor: ['VENDEDOR', 'GERENTE'],
    })
    expect(quais([um])).toEqual([1, 2])

    const nenhum = filtro({
      id: 'cargo',
      variante: 'multiSelect',
      operador: 'notInArray',
      valor: ['VENDEDOR', 'GERENTE'],
    })
    expect(quais([nenhum])).toEqual([3])
  })
})

describe('junção', () => {
  const doSetorVendas = filtro({ id: 'setor', variante: 'select', operador: 'eq', valor: 'VENDAS' })
  const inativo = filtro({ id: 'ativo', variante: 'boolean', operador: 'eq', valor: 'false' })

  it('and exige as duas condições', () => {
    expect(quais([doSetorVendas, inativo], 'and')).toEqual([])
  })

  it('or aceita qualquer uma', () => {
    expect(quais([doSetorVendas, inativo], 'or')).toEqual([1, 2])
  })

  it('lista vazia é a tabela inteira, não tabela nenhuma', () => {
    expect(quais([])).toEqual([1, 2, 3])
    expect(linhaPassaNosFiltros(linhas[0], undefined)).toBe(true)
  })

  it('filtro sem valor não conta nem no or — senão traria tudo', () => {
    expect(quais([doSetorVendas, filtro({ valor: '' })], 'or')).toEqual([1])
  })
})
