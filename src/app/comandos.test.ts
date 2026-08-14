import { GRUPO_INCLUIR, GRUPO_IR_PARA, GRUPO_NESTA_TELA, comandosDaPaleta } from '@/app/comandos'
import { navGroups } from '@/app/navigation'
import { RECURSOS, type RecursoDaEmpresa } from '@/data/recursos-da-empresa'
import { describe, expect, it } from 'vitest'

type Tem = (recurso: RecursoDaEmpresa) => boolean

const temTudo: Tem = () => true
const semNenhum: Tem = () => false
const temSo =
  (...quais: RecursoDaEmpresa[]): Tem =>
  (recurso) =>
    quais.includes(recurso)

const titulos = (rotaAtual?: string, tem: Tem = temTudo) =>
  comandosDaPaleta(tem, rotaAtual).map((c) => c.titulo)

const doGrupo = (grupo: string, rotaAtual?: string, tem: Tem = temTudo) =>
  comandosDaPaleta(tem, rotaAtual)
    .filter((c) => c.grupo === grupo)
    .map((c) => c.titulo)

describe('comandosDaPaleta — recurso da empresa', () => {
  it('oferece uma navegação por item visível', () => {
    const itens = navGroups.flatMap((g) => g.items)
    expect(doGrupo(GRUPO_IR_PARA)).toHaveLength(itens.length)
  })

  it('empresa sem o recurso NÃO vê a tela na paleta', () => {
    // Fornecedor, Profissional e Colaborador dependem de recurso da empresa.
    const comTudo = titulos(undefined, temTudo)
    expect(comTudo).toContain('Fornecedores')

    const semNada = titulos(undefined, semNenhum)
    expect(semNada).not.toContain('Fornecedores')
    expect(semNada).not.toContain('Profissional Externo')
    expect(semNada).not.toContain('Colaboradores')
    // O que não depende de recurso continua lá.
    expect(semNada).toContain('Clientes')
  })

  it('o `Incluir` some junto com a tela — não sobra ação órfã', () => {
    expect(doGrupo(GRUPO_INCLUIR, undefined, semNenhum)).not.toContain('Novo fornecedor')
    expect(doGrupo(GRUPO_INCLUIR, undefined, temSo(RECURSOS.suppliers))).toContain(
      'Novo fornecedor',
    )
  })
})

describe('comandosDaPaleta — incluir', () => {
  it('só oferece incluir onde a tela abre registro em branco', () => {
    const incluir = doGrupo(GRUPO_INCLUIR)
    expect(incluir).toContain('Novo cliente')
    expect(incluir).toContain('Novo orçamento')
    // Telas de visão e as sem cadastro não criam registro por aqui; oferecer
    // levaria a 404.
    expect(incluir).not.toContain('Dashboard')
    expect(incluir).not.toContain('Movimentação')
    expect(incluir).not.toContain('Motivos de Perda')
  })

  it('o rótulo é o substantivo no SINGULAR, em voz de comando', () => {
    const incluir = doGrupo(GRUPO_INCLUIR)
    expect(incluir).toContain('Nova ordem de compra')
    expect(incluir).not.toContain('Novo Ordem de Compra')
  })

  it('todo comando de incluir aponta para o caminho publicado pela tela', () => {
    for (const comando of comandosDaPaleta(temTudo).filter((c) => c.tipo === 'incluir')) {
      expect(comando.url).toMatch(/\/novo$/)
    }
  })
})

describe('comandosDaPaleta — contexto', () => {
  it('estando na tela, o incluir dela encabeça a lista', () => {
    const comandos = comandosDaPaleta(temTudo, '/cadastros/clientes')

    expect(comandos[0]).toMatchObject({ titulo: 'Novo cliente', grupo: GRUPO_NESTA_TELA })
  })

  it('e NÃO se repete embaixo — item duplicado parece dois comandos', () => {
    const incluir = doGrupo(GRUPO_INCLUIR, '/cadastros/clientes')
    expect(incluir).not.toContain('Novo cliente')
  })

  it('vale também dentro do registro aberto, não só na listagem', () => {
    const comandos = comandosDaPaleta(temTudo, '/cadastros/clientes/42')
    expect(comandos[0]?.grupo).toBe(GRUPO_NESTA_TELA)
  })

  it('tela sem incluir não inventa contexto', () => {
    expect(comandosDaPaleta(temTudo, '/dashboard')[0]?.grupo).toBe(GRUPO_INCLUIR)
  })

  it('rota fora do menu não vira contexto', () => {
    expect(comandosDaPaleta(temTudo, '/rota/que/nao/existe')[0]?.grupo).toBe(GRUPO_INCLUIR)
  })

  it('empresa sem o recurso não ganha contexto pela URL digitada na mão', () => {
    // A guarda de rota recusa a tela; a paleta não pode oferecer o atalho dela.
    const comandos = comandosDaPaleta(semNenhum, '/cadastros/fornecedores')
    expect(comandos.every((c) => c.grupo !== GRUPO_NESTA_TELA)).toBe(true)
  })
})

describe('comandosDaPaleta — destino externo', () => {
  /**
   * A paleta executa com `navigate({ to })`. Sem esta marca viajando junto, o
   * comando do mapa de tabelas seria navegação client-side para uma rota que o
   * roteador não conhece: 404 dentro da SPA, com o arquivo servido ao lado.
   */
  it('a marca do item chega ao comando', () => {
    const mapa = comandosDaPaleta(temTudo).find((c) => c.url.endsWith('.html'))
    expect(mapa?.externo).toBe(true)
    expect(mapa?.titulo).toBe('Mapeamento de Tabelas')
  })

  it('e só ele — as telas do sistema continuam sendo rota', () => {
    const externos = comandosDaPaleta(temTudo).filter((c) => c.externo)
    expect(externos.map((c) => c.url)).toEqual(['/mapeamento-tabelas.html'])
  })
})
