import {
  type CampoFiltravel,
  type FiltroDaTabela,
  filtroCasa,
  filtrosNormalizados,
  filtrosValidos,
  linhaPassaNosFiltros,
  novoFiltroId,
  operadorPadrao,
  operadoresDaVariante,
  somenteDigitos,
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

describe('normalização na saída', () => {
  const campos: CampoFiltravel[] = [
    { id: 'document', rotulo: 'CNPJ / CPF', variante: 'text', normalizar: somenteDigitos },
    { id: 'nome', rotulo: 'Nome', variante: 'text' },
  ]

  it('somenteDigitos tira a pontuação que o operador digita', () => {
    expect(somenteDigitos('12.345.678/0001-90')).toBe('12345678000190')
    expect(somenteDigitos('123.456.789-00')).toBe('12345678900')
    expect(somenteDigitos('')).toBe('')
  })

  it('o valor que VIAJA perde a máscara — o dado é dígito puro', () => {
    const [saiu] = filtrosNormalizados(
      [filtro({ id: 'document', valor: '12.345.678/0001-90' })],
      campos,
    )
    expect(saiu?.valor).toBe('12345678000190')
  })

  it('campo sem normalizar passa intacto — nome tem ponto de verdade', () => {
    const [saiu] = filtrosNormalizados([filtro({ id: 'nome', valor: 'J. SILVA' })], campos)
    expect(saiu?.valor).toBe('J. SILVA')
  })

  it('normaliza cada item da múltipla escolha', () => {
    const [saiu] = filtrosNormalizados(
      [
        filtro({
          id: 'document',
          operador: 'inArray',
          valor: ['12.345.678/0001-90', '111.222.333-44'],
        }),
      ],
      campos,
    )
    expect(saiu?.valor).toEqual(['12345678000190', '11122233344'])
  })

  it('campo que a tela não declara não quebra nada', () => {
    const [saiu] = filtrosNormalizados([filtro({ id: 'desconhecido', valor: 'x' })], [])
    expect(saiu?.valor).toBe('x')
  })
})

describe('filtroCasa — data', () => {
  interface Doc {
    numero: string
    emissao: string | null
    /** Alguns campos do contrato guardam o INSTANTE, não só o dia. */
    fechamento: string | null
  }

  const docs: Doc[] = [
    { numero: '1', emissao: '2025-08-01', fechamento: '2025-08-01T14:32:00Z' },
    { numero: '2', emissao: '2025-08-05', fechamento: null },
    { numero: '3', emissao: '2025-08-31', fechamento: '2025-09-01T03:00:00Z' },
  ]

  function data(over: Partial<FiltroDaTabela> = {}): FiltroDaTabela {
    return {
      filtroId: novoFiltroId(),
      id: 'emissao',
      variante: 'date',
      operador: 'eq',
      valor: '',
      ...over,
    }
  }

  const quaisDocs = (f: FiltroDaTabela[], juncao: 'and' | 'or' = 'and') =>
    docs.filter((d) => linhaPassaNosFiltros(d, f, juncao)).map((d) => d.numero)

  it('data ordena como calendário, não como texto solto', () => {
    // '2025-08-31' < '2025-09-01' nas duas leituras; o que o ISO garante é que
    // a ordem lexicográfica É a cronológica, e é disso que a comparação vive.
    expect(quaisDocs([data({ operador: 'lt', valor: '2025-08-05' })])).toEqual(['1'])
    expect(quaisDocs([data({ operador: 'gte', valor: '2025-08-05' })])).toEqual(['2', '3'])
  })

  it('em / fora de comparam o DIA', () => {
    expect(quaisDocs([data({ operador: 'eq', valor: '2025-08-05' })])).toEqual(['2'])
    expect(quaisDocs([data({ operador: 'ne', valor: '2025-08-05' })])).toEqual(['1', '3'])
  })

  it('entre inclui os dois extremos — é o que o operador quer dizer', () => {
    expect(
      quaisDocs([data({ operador: 'isBetween', valor: ['2025-08-01', '2025-08-05'] })]),
    ).toEqual(['1', '2'])
  })

  it('ponta em branco deixa o extremo aberto', () => {
    expect(quaisDocs([data({ operador: 'isBetween', valor: ['', '2025-08-05'] })])).toEqual([
      '1',
      '2',
    ])
    expect(quaisDocs([data({ operador: 'isBetween', valor: ['2025-08-05', ''] })])).toEqual([
      '2',
      '3',
    ])
  })

  it('campo com HORA responde pelo DIA — senão a listagem corta um dia sem explicar', () => {
    const comHora = (over: Partial<FiltroDaTabela>) => data({ id: 'fechamento', ...over })

    // O doc 1 fechou às 14h32 do dia 1: perguntar "em 01/08" tem de achá-lo.
    expect(quaisDocs([comHora({ operador: 'eq', valor: '2025-08-01' })])).toEqual(['1'])
    // E "até 01/08" não pode deixar o próprio dia de fora.
    expect(quaisDocs([comHora({ operador: 'lte', valor: '2025-08-01' })])).toEqual(['1'])
  })

  it('data vazia é vazia, e data ausente não casa com comparação', () => {
    expect(quaisDocs([data({ id: 'fechamento', operador: 'isEmpty', valor: '' })])).toEqual(['2'])
    expect(quaisDocs([data({ id: 'fechamento', operador: 'gt', valor: '2025-01-01' })])).toEqual([
      '1',
      '3',
    ])
  })

  it('a variante de data oferece a palavra do calendário, não a do número', () => {
    const rotulos = operadoresDaVariante('date').map((o) => o.rotulo)
    expect(rotulos).toContain('antes de')
    expect(rotulos).toContain('entre')
    expect(rotulos).not.toContain('menor que')
  })
})

describe('campo multivalorado', () => {
  interface Pedido {
    codigo: string
    fornecedores: string[]
  }

  const pedidos: Pedido[] = [
    { codigo: '1', fornecedores: ['STELLA', 'ILUMINAR'] },
    { codigo: '2', fornecedores: ['ILUMINAR'] },
    { codigo: '3', fornecedores: [] },
  ]

  function f(over: Partial<FiltroDaTabela> = {}): FiltroDaTabela {
    return {
      filtroId: novoFiltroId(),
      id: 'fornecedores',
      variante: 'text',
      operador: 'iLike',
      valor: '',
      ...over,
    }
  }

  const quais = (filtros: FiltroDaTabela[]) =>
    pedidos.filter((p) => linhaPassaNosFiltros(p, filtros)).map((p) => p.codigo)

  it('casa quando ALGUM elemento casa', () => {
    expect(quais([f({ valor: 'stella' })])).toEqual(['1'])
    expect(quais([f({ valor: 'iluminar' })])).toEqual(['1', '2'])
  })

  it('é compara o elemento INTEIRO, não a lista concatenada', () => {
    // Sem a semântica de array isto compararia contra "stella,iluminar".
    expect(quais([f({ operador: 'eq', valor: 'STELLA' })])).toEqual(['1'])
    expect(quais([f({ operador: 'eq', valor: 'STELLA,ILUMINAR' })])).toEqual([])
  })

  it('negar é "NENHUM elemento casa", não "algum não casa"', () => {
    // O pedido 1 TEM Stella: "não contém stella" precisa excluí-lo, mesmo ele
    // tendo um segundo fornecedor que não é Stella.
    expect(quais([f({ operador: 'notILike', valor: 'stella' })])).toEqual(['2', '3'])
    expect(quais([f({ operador: 'ne', valor: 'STELLA' })])).toEqual(['2', '3'])
  })

  it('é um de casa quando algum elemento está entre os escolhidos', () => {
    const escolha = (valor: string[]) => f({ variante: 'multiSelect', operador: 'inArray', valor })
    expect(quais([escolha(['STELLA'])])).toEqual(['1'])
    expect(quais([escolha(['STELLA', 'ILUMINAR'])])).toEqual(['1', '2'])
    expect(
      quais([f({ variante: 'multiSelect', operador: 'notInArray', valor: ['STELLA'] })]),
    ).toEqual(['2', '3'])
  })

  it('lista vazia é vazia', () => {
    expect(quais([f({ operador: 'isEmpty', valor: '' })])).toEqual(['3'])
    expect(quais([f({ operador: 'isNotEmpty', valor: '' })])).toEqual(['1', '2'])
  })
})
