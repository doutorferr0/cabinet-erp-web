import {
  campoDoPrefixo,
  interpretarBusca,
  prefixosDaBusca,
} from '@/components/cabinet/filtros/busca-com-prefixo'
import type { CampoFiltravel } from '@/lib/filtro-de-consulta'
import { describe, expect, it } from 'vitest'

/**
 * O prefixo é o caminho curto do filtro. Errado, ele é pior que ausente: quem
 * digita `sit: enviada` e recebe busca livre por "sit: enviada" lê uma lista
 * vazia como "não tem pedido enviado".
 */

const FORNECEDOR: CampoFiltravel = { id: 'supplierName', rotulo: 'Fornecedor', variante: 'text' }
const SITUACAO: CampoFiltravel = {
  id: 'status',
  rotulo: 'Situação',
  variante: 'multiSelect',
  opcoes: [
    { valor: 'sent', rotulo: 'Enviada' },
    { valor: 'confirmed', rotulo: 'Confirmada' },
    { valor: 'late', rotulo: 'Atrasada' },
  ],
}
const NUMERO: CampoFiltravel = { id: 'number', rotulo: 'Número', variante: 'number' }
const PREVISAO: CampoFiltravel = { id: 'expectedAt', rotulo: 'Previsão', variante: 'date' }
const ATIVO: CampoFiltravel = { id: 'active', rotulo: 'Ativo', variante: 'boolean' }

const CAMPOS = [FORNECEDOR, SITUACAO, NUMERO, PREVISAO, ATIVO] as const

describe('prefixo deduzido do rótulo', () => {
  it('sugere o menor começo que aponta para um campo só', () => {
    const sugestoes = prefixosDaBusca(CAMPOS)
    expect(sugestoes.map((s) => s.prefixo)).toEqual(['for', 'sit', 'num', 'pre', 'ati'])
  })

  it('não sugere prefixo para rótulos que disputam a mesma raiz', () => {
    const dois = [
      { id: 'orderedAt', rotulo: 'Data da ordem', variante: 'date' },
      { id: 'expectedAt', rotulo: 'Data prevista', variante: 'date' },
    ] as const satisfies readonly CampoFiltravel[]
    expect(prefixosDaBusca(dois)).toEqual([])
  })

  it('aceita qualquer começo do rótulo, não só o sugerido', () => {
    expect(campoDoPrefixo('forn', CAMPOS)).toBe(FORNECEDOR)
    expect(campoDoPrefixo('fornecedor', CAMPOS)).toBe(FORNECEDOR)
  })

  it('ignora acento e caixa, como toda busca do repo', () => {
    expect(campoDoPrefixo('SITUAÇÃO', CAMPOS)).toBe(SITUACAO)
    expect(campoDoPrefixo('núm', CAMPOS)).toBe(NUMERO)
  })

  it('recusa começo curto demais para ser um campo só', () => {
    expect(campoDoPrefixo('n', CAMPOS)).toBeNull()
    expect(campoDoPrefixo('zz', CAMPOS)).toBeNull()
  })
})

describe('a caixa lê filtro e busca livre ao mesmo tempo', () => {
  it('vira filtro de texto e some do q', () => {
    const lido = interpretarBusca('forn: mister led', CAMPOS)
    expect(lido.q).toBe('')
    expect(lido.filtros).toEqual([
      {
        filtroId: expect.any(String),
        id: 'supplierName',
        variante: 'text',
        operador: 'iLike',
        valor: 'mister led',
      },
    ])
  })

  it('leva o valor até o PRÓXIMO prefixo, não até o próximo espaço', () => {
    const lido = interpretarBusca('forn: mister led sit: enviada', CAMPOS)
    expect(lido.filtros).toHaveLength(2)
    expect(lido.filtros[0]?.valor).toBe('mister led')
    expect(lido.filtros[1]).toMatchObject({
      id: 'status',
      operador: 'inArray',
      valor: ['sent'],
    })
    expect(lido.q).toBe('')
  })

  it('deixa na busca livre o que não é prefixo', () => {
    const lido = interpretarBusca('luminária forn: stella', CAMPOS)
    expect(lido.q).toBe('luminária')
    expect(lido.filtros).toHaveLength(1)
  })

  it('casa múltipla escolha por vírgula, do jeito que o chip escreve', () => {
    const lido = interpretarBusca('sit: enviada, confirmada', CAMPOS)
    expect(lido.filtros[0]?.valor).toEqual(['sent', 'confirmed'])
  })

  it('não filtra por opção que não existe — devolve o valor para a busca', () => {
    const lido = interpretarBusca('sit: chegou', CAMPOS)
    expect(lido.filtros).toEqual([])
    // O nome do campo não vai junto: procurar "sit:" no servidor devolveria
    // zero registro e a lista piscaria vazia no meio da digitação.
    expect(lido.q).toBe('chegou')
    expect(lido.pedacos.every((p) => p.tipo === 'texto')).toBe(true)
  })

  it('não confunde `http:` com prefixo de campo', () => {
    const lido = interpretarBusca('http://exemplo.cc', CAMPOS)
    expect(lido.filtros).toEqual([])
    expect(lido.q).toBe('http://exemplo.cc')
  })

  it('traduz data digitada em pt-BR para o ISO que o dado guarda', () => {
    const lido = interpretarBusca('prev: 10/10/2026', CAMPOS)
    expect(lido.filtros[0]).toMatchObject({ id: 'expectedAt', operador: 'eq', valor: '2026-10-10' })
  })

  it('recusa número que não é número e data que não é data', () => {
    expect(interpretarBusca('num: abc', CAMPOS).filtros).toEqual([])
    expect(interpretarBusca('prev: outubro', CAMPOS).filtros).toEqual([])
  })

  it('lê sim/não no campo booleano', () => {
    expect(interpretarBusca('ativ: não', CAMPOS).filtros[0]).toMatchObject({ valor: 'false' })
    expect(interpretarBusca('ativ: sim', CAMPOS).filtros[0]).toMatchObject({ valor: 'true' })
  })

  it('prefixo ainda sem valor não filtra e não vira busca livre', () => {
    const lido = interpretarBusca('forn:', CAMPOS)
    expect(lido.filtros).toEqual([])
    // A lista não pode encolher entre `forn:` e a primeira letra do nome.
    expect(lido.q).toBe('')
    expect(lido.pedacos.map((p) => p.texto).join('')).toBe('forn:')
  })

  it('sem campos filtráveis, tudo é busca livre', () => {
    const lido = interpretarBusca('forn: stella', [])
    expect(lido.filtros).toEqual([])
    expect(lido.q).toBe('forn: stella')
  })
})

describe('os pedaços pintam a caixa sem alterar o que foi digitado', () => {
  it('remontados, reproduzem a entrada byte a byte', () => {
    const texto = '  luminária forn: mister led sit: enviada  '
    const lido = interpretarBusca(texto, CAMPOS)
    expect(lido.pedacos.map((p) => p.texto).join('')).toBe(texto)
  })

  it('marca prefixo e valor separadamente, e só o que virou filtro', () => {
    const lido = interpretarBusca('forn: stella sit: chegou', CAMPOS)
    expect(lido.pedacos.filter((p) => p.tipo === 'valor').map((p) => p.texto.trim())).toEqual([
      'stella',
    ])
    expect(lido.pedacos.filter((p) => p.tipo === 'prefixo').map((p) => p.texto)).toEqual(['forn:'])
  })
})
