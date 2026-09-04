import {
  GRUPO_ACOES,
  GRUPO_AJUDA,
  GRUPO_NESTA_TELA,
  GRUPO_RECENTES,
  MAXIMO_DE_RECENTES,
  comandosDaPaleta,
  destinoDoAtalho,
} from '@/app/comandos'
import { navGroups } from '@/app/navigation'
import { RECURSOS, type RecursoDaEmpresa } from '@/data/recursos-da-empresa'
import { SHORTCUTS } from '@/lib/shortcuts'
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

/**
 * Navegar deixou de ser um grupo e virou TIPO (2.0): os destinos saem sob a
 * seção da barra lateral, com a cor dela, em vez de um "Ir para" único de
 * dezoito linhas. Contar por tipo é o que sobrevive a essa mudança.
 *
 * A AJUDA fica de fora: ela também é `navegar`, mas não vem do menu — é uma
 * linha escrita à mão no próprio arquivo. Contá-la aqui faria a conta de
 * "um comando por item navegável" fechar com um a mais para sempre.
 */
const navegacoes = (rotaAtual?: string, tem: Tem = temTudo) =>
  comandosDaPaleta(tem, rotaAtual).filter((c) => c.tipo === 'navegar' && c.grupo !== GRUPO_AJUDA)

describe('comandosDaPaleta — recurso da empresa', () => {
  /**
   * "Item visível" para a paleta é o que `gruposVisiveis` devolve, e desde a
   * Nav-2 isso é menos que a barra desenha: tela FUTURA sai (comando que leva
   * a 404) e FILHA sobe (quem navega é `Ordem de Compra`, não o pai
   * `Compras`). Contar contra `navGroups` cru voltaria a oferecer as duas.
   */
  it('oferece uma navegação por item NAVEGÁVEL', () => {
    const navegaveis = navGroups
      .flatMap((g) => g.items)
      .flatMap((item) => item.filhas ?? [item])
      .filter((item) => !item.futuro)
    expect(navegacoes()).toHaveLength(navegaveis.length)
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
    expect(doGrupo(GRUPO_ACOES, undefined, semNenhum)).not.toContain('Novo fornecedor')
    expect(doGrupo(GRUPO_ACOES, undefined, temSo(RECURSOS.suppliers))).toContain('Novo fornecedor')
  })
})

describe('comandosDaPaleta — incluir', () => {
  it('só oferece incluir onde a tela abre registro em branco', () => {
    const incluir = doGrupo(GRUPO_ACOES)
    expect(incluir).toContain('Novo cliente')
    expect(incluir).toContain('Novo orçamento')
    // Telas de visão e as sem cadastro não criam registro por aqui; oferecer
    // levaria a 404.
    expect(incluir).not.toContain('Dashboard')
    expect(incluir).not.toContain('Movimentação')
    expect(incluir).not.toContain('Motivos de Perda')
  })

  it('o rótulo é o substantivo no SINGULAR, em voz de comando', () => {
    const incluir = doGrupo(GRUPO_ACOES)
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
    const incluir = doGrupo(GRUPO_ACOES, '/cadastros/clientes')
    expect(incluir).not.toContain('Novo cliente')
  })

  it('vale também dentro do registro aberto, não só na listagem', () => {
    const comandos = comandosDaPaleta(temTudo, '/cadastros/clientes/42')
    expect(comandos[0]?.grupo).toBe(GRUPO_NESTA_TELA)
  })

  it('tela sem incluir não inventa contexto', () => {
    expect(comandosDaPaleta(temTudo, '/dashboard')[0]?.grupo).toBe(GRUPO_ACOES)
  })

  it('rota fora do menu não vira contexto', () => {
    expect(comandosDaPaleta(temTudo, '/rota/que/nao/existe')[0]?.grupo).toBe(GRUPO_ACOES)
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

describe('comandosDaPaleta — grupo, cor e caminho (2.0)', () => {
  /**
   * O grupo de um destino é a SEÇÃO da barra lateral, e ele traz a cor dela.
   * Era um "Ir para" único com dezoito linhas; sem a quebra por seção, o
   * quadradinho de cor da paleta não teria o que pintar.
   */
  it('o destino sai sob a seção da barra, com o módulo dela', () => {
    const clientes = navegacoes().find((c) => c.titulo === 'Clientes')
    expect(clientes?.grupo).toBe('Pessoas')
    expect(clientes?.modulo).toBeDefined()
  })

  it('todo destino diz ONDE mora — é o que separa homônimos', () => {
    for (const comando of navegacoes()) expect(comando.caminho).toBeTruthy()
  })

  /**
   * `Pessoas › Pessoas` não informa nada e gasta a metade direita da linha: o
   * nome do grupo some quando repete o da seção.
   */
  it('o caminho não repete a seção quando a seção tem um grupo só', () => {
    for (const comando of navegacoes()) {
      const [secao, grupo] = (comando.caminho as string).split(' › ')
      if (grupo) expect(grupo).not.toBe(secao)
    }
  })
})

describe('destinoDoAtalho — a tecla `g` chega onde o clique chegaria', () => {
  it('resolve por prefixo, contra o menu visível', () => {
    expect(destinoDoAtalho(temTudo, SHORTCUTS.irCompras)).toMatch(/^\/compras/)
    expect(destinoDoAtalho(temTudo, SHORTCUTS.irEstoque)).toMatch(/^\/estoque/)
    expect(destinoDoAtalho(temTudo, SHORTCUTS.irVendas)).toMatch(/^\/vendas/)
  })

  /** A tecla chega ao PRIMEIRO destino do módulo — o de cima na barra. */
  it('aponta o primeiro item do módulo, na ordem do menu', () => {
    const primeiro = navegacoes().find((c) => c.url.startsWith('/compras'))
    expect(destinoDoAtalho(temTudo, SHORTCUTS.irCompras)).toBe(primeiro?.url)
  })

  /**
   * O destino sai do menu VISÍVEL, nunca de uma rota fixa: ou é um item que a
   * paleta está oferecendo àquela empresa, ou não existe. É o que impede a
   * tecla de levar a uma tela que a guarda vai recusar — e vale mesmo para
   * módulo que hoje não depende de recurso, porque o dia em que depender a
   * conta já está feita aqui.
   */
  it('o destino é sempre um item que aquela empresa alcança', () => {
    const oferecidos = new Set(comandosDaPaleta(semNenhum).map((c) => c.url))
    for (const combo of [SHORTCUTS.irCompras, SHORTCUTS.irEstoque, SHORTCUTS.irVendas]) {
      const destino = destinoDoAtalho(semNenhum, combo)
      if (destino) expect(oferecidos.has(destino)).toBe(true)
    }
  })

  it('combo que não é `g`+letra não tem destino', () => {
    expect(destinoDoAtalho(temTudo, SHORTCUTS.busca)).toBeUndefined()
  })

  /** O rótulo da tecla viaja NA linha da paleta — é assim que ela se aprende. */
  it('o destino da tecla mostra o atalho na paleta', () => {
    const destino = destinoDoAtalho(temTudo, SHORTCUTS.irCompras)
    const comando = navegacoes().find((c) => c.url === destino)
    expect(comando?.atalho).toBe('G C')
  })
})

describe('comandosDaPaleta — recentes', () => {
  const RECENTE = '/cadastros/clientes'

  it('encabeça a lista, antes até do contexto', () => {
    const comandos = comandosDaPaleta(temTudo, '/vendas/orcamentos', [RECENTE])
    expect(comandos[0]).toMatchObject({ titulo: 'Clientes', grupo: GRUPO_RECENTES })
  })

  it('e NÃO se repete na seção — item duplicado parece dois destinos', () => {
    const comandos = comandosDaPaleta(temTudo, undefined, [RECENTE])
    const vezes = comandos.filter((c) => c.url === RECENTE && c.tipo === 'navegar')
    expect(vezes).toHaveLength(1)
    expect(vezes[0]?.grupo).toBe(GRUPO_RECENTES)
  })

  /**
   * A lista guardada é URL, e o menu de HOJE é quem manda: destino que saiu do
   * ar — ou que esta empresa deixou de alcançar — some sozinho, em vez de
   * virar uma linha que leva a 404.
   */
  it('URL que a empresa não alcança some da lista', () => {
    const comandos = comandosDaPaleta(semNenhum, undefined, ['/cadastros/fornecedores'])
    expect(comandos.some((c) => c.grupo === GRUPO_RECENTES)).toBe(false)
  })

  it('URL que não existe mais no menu some da lista', () => {
    const comandos = comandosDaPaleta(temTudo, undefined, ['/tela/que/foi/removida'])
    expect(comandos.some((c) => c.grupo === GRUPO_RECENTES)).toBe(false)
  })

  /** Lista temporal: a ordem é a do armazenamento, não a do menu. */
  it('mantém a ordem do mais novo para o mais velho', () => {
    const comandos = comandosDaPaleta(temTudo, undefined, ['/vendas/orcamentos', RECENTE])
    const recentes = comandos.filter((c) => c.grupo === GRUPO_RECENTES).map((c) => c.url)
    expect(recentes).toEqual(['/vendas/orcamentos', RECENTE])
  })

  it('a paleta lembra no máximo o teto declarado', () => {
    expect(MAXIMO_DE_RECENTES).toBe(3)
  })
})
