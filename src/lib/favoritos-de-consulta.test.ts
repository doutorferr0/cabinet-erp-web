import {
  type FavoritoDeConsulta,
  comPadrao,
  consultaDoFavorito,
  favoritoPadrao,
  gravarFavoritos,
  idDaTela,
  lerFavoritos,
  novoFavoritoId,
} from '@/lib/favoritos-de-consulta'
import type { FiltroDaTabela } from '@/lib/filtro-de-consulta'
import { beforeEach, describe, expect, it } from 'vitest'

const CHAVE = 'cabinet.consultas-favoritas.v1'

const filtro: FiltroDaTabela = {
  filtroId: 'filtro-antigo',
  id: 'active',
  variante: 'boolean',
  operador: 'eq',
  valor: 'false',
}

function favorito(over: Partial<FavoritoDeConsulta> = {}): FavoritoDeConsulta {
  return {
    id: novoFavoritoId(),
    nome: 'Inativos',
    filtros: [filtro],
    juncao: 'and',
    sort: { id: 'code', desc: false },
    visao: '',
    agruparPor: '',
    densidade: '',
    padrao: false,
    ...over,
  }
}

beforeEach(() => {
  localStorage.clear()
})

describe('idDaTela', () => {
  /**
   * TRAVA DELIBERADA: o armazenamento é chaveado pelo `queryKey` da tela, e
   * trocá-lo por motivo de cache faria os favoritos gravados sumirem em
   * silêncio. Se este teste ficar vermelho, a decisão é migrar o que está
   * guardado — não atualizar o número esperado.
   */
  it('a chave de cada listagem é a que está gravada hoje', () => {
    expect(idDaTela(['produtos'])).toBe('produtos')
    expect(idDaTela(['clientes'])).toBe('clientes')
    expect(idDaTela(['fornecedores'])).toBe('fornecedores')
    expect(idDaTela(['profissionais'])).toBe('profissionais')
    expect(idDaTela(['colaboradores'])).toBe('colaboradores')
    expect(idDaTela(['orcamentos'])).toBe('orcamentos')
    expect(idDaTela(['pedidos-compra'])).toBe('pedidos-compra')
    expect(idDaTela(['ordens-compra'])).toBe('ordens-compra')
  })

  it('queryKey composto vira uma chave só', () => {
    expect(idDaTela(['crm', 'funis', 'listagem'])).toBe('crm.funis.listagem')
  })
})

describe('gravar e ler', () => {
  it('o que foi gravado volta igual', () => {
    const f = favorito()
    gravarFavoritos('produtos', [f])
    expect(lerFavoritos('produtos')).toEqual([f])
  })

  it('cada tela guarda a sua lista', () => {
    gravarFavoritos('produtos', [favorito({ nome: 'A' })])
    gravarFavoritos('clientes', [favorito({ nome: 'B' })])

    expect(lerFavoritos('produtos').map((f) => f.nome)).toEqual(['A'])
    expect(lerFavoritos('clientes').map((f) => f.nome)).toEqual(['B'])
  })

  it('esvaziar a lista tira a tela do armazenamento', () => {
    gravarFavoritos('produtos', [favorito()])
    gravarFavoritos('produtos', [])

    expect(lerFavoritos('produtos')).toEqual([])
    expect(JSON.parse(localStorage.getItem(CHAVE) ?? '{}')).toEqual({})
  })

  it('tela sem nada gravado devolve lista vazia', () => {
    expect(lerFavoritos('inexistente')).toEqual([])
  })
})

describe('leitura tolerante — favorito estragado não derruba a tela', () => {
  it('JSON quebrado vira lista vazia', () => {
    localStorage.setItem(CHAVE, '{isto não é json')
    expect(lerFavoritos('produtos')).toEqual([])
  })

  it('conteúdo com a forma errada vira lista vazia', () => {
    localStorage.setItem(CHAVE, JSON.stringify(['array no lugar de objeto']))
    expect(lerFavoritos('produtos')).toEqual([])
  })

  it('item estragado sai; os irmãos sobrevivem', () => {
    const bom = favorito({ nome: 'Bom' })
    localStorage.setItem(CHAVE, JSON.stringify({ produtos: [{ lixo: true }, bom, null] }))

    expect(lerFavoritos('produtos').map((f) => f.nome)).toEqual(['Bom'])
  })

  it('campo faltando ganha o padrão em vez de vazar `undefined` para a tela', () => {
    localStorage.setItem(
      CHAVE,
      JSON.stringify({ produtos: [{ id: 'x', nome: 'Velho', filtros: [] }] }),
    )

    const [lido] = lerFavoritos('produtos')
    expect(lido).toMatchObject({ juncao: 'and', sort: null, padrao: false })
  })

  /**
   * Densidade (#123) entrou depois, como visão e agrupamento antes dela. Vazio
   * é "este favorito não fala de densidade", e aplicá-lo não pode mexer na
   * altura que está na tela — senão o favorito de filtro salvo mês passado
   * passaria a devolver a grade larga sem ninguém ter pedido.
   */
  it('favorito salvo antes da densidade não manda na altura da linha', () => {
    localStorage.setItem(
      CHAVE,
      JSON.stringify({
        produtos: [{ id: 'x', nome: 'Velho', filtros: [], visao: 'lista', agruparPor: '' }],
      }),
    )

    const [lido] = lerFavoritos('produtos')
    expect(lido?.densidade).toBe('')
    expect(consultaDoFavorito(lido as FavoritoDeConsulta).densidade).toBe('')
  })

  it('densidade gravada com lixo também vira vazio, não classe inventada', () => {
    localStorage.setItem(
      CHAVE,
      JSON.stringify({ produtos: [{ id: 'x', nome: 'V', filtros: [], densidade: 42 }] }),
    )

    expect(lerFavoritos('produtos')[0]?.densidade).toBe('')
  })
})

describe('padrão — no máximo UM por tela', () => {
  it('marcar um desmarca os outros', () => {
    const a = favorito({ nome: 'A', padrao: true })
    const b = favorito({ nome: 'B' })

    const depois = comPadrao([a, b], b.id)

    expect(depois.filter((f) => f.padrao).map((f) => f.nome)).toEqual(['B'])
  })

  it('clicar no próprio desmarca — dá para voltar a abrir sem filtro', () => {
    const a = favorito({ padrao: true })
    expect(comPadrao([a], a.id).some((f) => f.padrao)).toBe(false)
  })

  it('sem padrão marcado, ninguém é o padrão', () => {
    expect(favoritoPadrao([favorito(), favorito()])).toBeUndefined()
  })
})

describe('aplicar', () => {
  it('a chave de linha é REGENERADA — a gravada pode colidir com a da tela', () => {
    const consulta = consultaDoFavorito(favorito())

    expect(consulta.filtros[0]?.filtroId).not.toBe('filtro-antigo')
    // O resto do filtro chega intacto: quem muda é só a identidade da linha.
    expect(consulta.filtros[0]).toMatchObject({ id: 'active', operador: 'eq', valor: 'false' })
  })

  it('leva junção e ordenação', () => {
    const consulta = consultaDoFavorito(
      favorito({ juncao: 'or', sort: { id: 'description', desc: true } }),
    )
    expect(consulta.juncao).toBe('or')
    expect(consulta.sort).toEqual({ id: 'description', desc: true })
  })
})
