import { moduloDaRota } from '@/app/modulo'
import { gruposVisiveis, itemDaRota, navGroups } from '@/app/navigation'
import { RECURSOS, type RecursoDaEmpresa } from '@/data/recursos-da-empresa'
import { describe, expect, it } from 'vitest'

/** `tem` de uma empresa que opera exatamente os recursos listados. */
function empresaCom(...recursos: RecursoDaEmpresa[]) {
  const conjunto = new Set(recursos)
  return (recurso: RecursoDaEmpresa) => conjunto.has(recurso)
}

function titulos(recursos: RecursoDaEmpresa[]) {
  return gruposVisiveis(empresaCom(...recursos)).flatMap((g) => g.items.map((i) => i.title))
}

describe('gruposVisiveis', () => {
  it('empresa sem recurso nenhum perde os três cadastros, e só eles', () => {
    const visiveis = titulos([])
    expect(visiveis).not.toContain('Fornecedores')
    expect(visiveis).not.toContain('Profissional Externo')
    expect(visiveis).not.toContain('Colaboradores')
    expect(visiveis).toContain('Clientes')
    expect(visiveis).toContain('Produtos')
    expect(visiveis).toContain('Orçamentos')
  })

  it('empresa completa vê o menu inteiro', () => {
    const todos = Object.values(RECURSOS)
    expect(titulos(todos)).toEqual(navGroups.flatMap((g) => g.items.map((i) => i.title)))
  })

  it('recurso é item a item, não bloco', () => {
    const visiveis = titulos([RECURSOS.suppliers])
    expect(visiveis).toContain('Fornecedores')
    expect(visiveis).not.toContain('Colaboradores')
  })

  // `Estoque` nasce sem item (§10, telas não capturadas) e continua anunciando
  // o módulo. Some só o grupo que a EMPRESA esvaziou — a distinção some junto
  // se alguém "simplificar" o filtro para `items.length > 0`.
  it('grupo que já nascia vazio permanece; grupo esvaziado pelo recurso sumiria', () => {
    expect(gruposVisiveis(empresaCom()).map((g) => g.title)).toContain('Estoque')
  })
})

describe('itemDaRota', () => {
  it('acha o item pela listagem e pelo detalhe', () => {
    expect(itemDaRota('/cadastros/fornecedores')?.recurso).toBe(RECURSOS.suppliers)
    expect(itemDaRota('/cadastros/fornecedores/abc-1')?.recurso).toBe(RECURSOS.suppliers)
  })

  it('rota sem item — e prefixo que só PARECE item — não casa', () => {
    expect(itemDaRota('/')).toBeUndefined()
    expect(itemDaRota('/cadastros')).toBeUndefined()
    expect(itemDaRota('/cadastros/fornecedores-antigos')).toBeUndefined()
  })
})

describe('aparência emprestada', () => {
  // As quatro telas fora da tabela de shape×cor travada pelo user. O que este
  // teste guarda é a REGRA, não a estética: só quem não tem módulo próprio
  // empresta, e cada uma leva desenho seu — mesma cor com mesmo desenho faria a
  // fileira da sidebar deixar de ser um mapa.
  it('só tela sem módulo próprio empresta cor, e o desenho é dela', () => {
    const itens = navGroups.flatMap((grupo) => grupo.items)
    const comEmprestimo = itens.filter((item) => item.aparencia)

    expect(comEmprestimo.map((item) => [item.url, item.aparencia])).toEqual([
      ['/dashboard', { modulo: 'boletim', shape: 'dashboard' }],
      ['/tarefas', { modulo: 'boletim', shape: 'tarefas' }],
      ['/planner', { modulo: 'boletim', shape: 'planner' }],
      ['/cadastros/colaboradores', { modulo: 'clientes', shape: 'colaboradores' }],
    ])

    // Nenhuma delas é conhecida por `moduloDaRota`, e é o que mantém o
    // empréstimo dentro do item: se fosse, a folha inteira seria tingida e a
    // banda de identidade anunciaria o módulo errado.
    for (const item of comEmprestimo) {
      expect(moduloDaRota(item.url)).toBeUndefined()
    }

    // E o inverso: quem TEM módulo não empresta nada.
    for (const item of itens) {
      if (moduloDaRota(item.url)) expect(item.aparencia).toBeUndefined()
    }

    // Desenhos distintos entre si.
    const shapes = comEmprestimo.map((item) => item.aparencia?.shape)
    expect(new Set(shapes).size).toBe(shapes.length)
  })
})
