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

  // Item sem `recurso` (`Movimentação`, único item de Estoque desde que o
  // menu ganhou a rota-placeholder — §10) nunca some, mesmo pra empresa sem
  // recurso nenhum. `Estoque` deixou de ser o grupo "nasce vazio" que este
  // teste travava (tinha zero itens até a rota `/estoque/movimentacao`
  // entrar): a distinção "grupo que nasce vazio permanece · grupo esvaziado
  // pelo recurso some" segue viva no código (`gruposVisiveis`), mas não há
  // mais grupo real que nasça vazio para exercitá-la — nenhum dos quatro
  // grupos tem `items: []` hoje.
  it('grupo sem recurso nenhum nos itens nunca esvazia, mesmo pra empresa sem recurso', () => {
    const visiveis = gruposVisiveis(empresaCom())
    const estoque = visiveis.find((g) => g.title === 'Estoque')
    expect(estoque?.items.map((i) => i.title)).toContain('Movimentação')
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

describe('item externo', () => {
  const externos = navGroups.flatMap((grupo) => grupo.items).filter((item) => item.externo)

  it('o mapa de tabelas está na barra, e marcado como fora da SPA', () => {
    expect(externos.map((item) => item.url)).toEqual(['/mapeamento-tabelas.html'])
  })

  /**
   * A extensão não é estilo: `/mapeamento-tabelas` só resolve em produção, onde
   * o Pages serve o arquivo e redireciona a URL limpa. Em `pnpm dev` o Vite
   * manda caminho desconhecido para o `index.html` e o roteador responde 404 —
   * ou seja, o item quebraria exatamente para quem está desenvolvendo.
   */
  it('aponta para o arquivo com extensão, que resolve em dev e em produção', () => {
    for (const item of externos) {
      expect(item.url.endsWith('.html')).toBe(true)
    }
  })

  it('não é rota de módulo — não empresta cor nem finge ser tela', () => {
    for (const item of externos) {
      expect(moduloDaRota(item.url)).toBeUndefined()
      expect(item.aparencia).toBeUndefined()
      // Sem `incluir`: página de consulta não cria registro, e a paleta
      // ofereceria um "Incluir" que leva a lugar nenhum.
      expect(item.incluir).toBeUndefined()
    }
  })

  /**
   * O contrário do teste acima, e o que de fato protege: item NOVO que aponte
   * para arquivo estático sem a marca volta a ser `<Link>` no shell e
   * `navigate()` na paleta — 404 dentro da SPA, com o arquivo servido ao lado.
   */
  it('todo caminho de arquivo na barra está marcado como externo', () => {
    for (const item of navGroups.flatMap((grupo) => grupo.items)) {
      if (item.url.endsWith('.html')) expect(item.externo).toBe(true)
    }
  })
})
