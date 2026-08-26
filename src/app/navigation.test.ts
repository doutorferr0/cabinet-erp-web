import { moduloDaRota } from '@/app/modulo'
import {
  destinoDaSecao,
  gruposVisiveis,
  itemDaRota,
  navGroups,
  navSecoes,
  rotaMaeDe,
  secoesVisiveis,
} from '@/app/navigation'
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

  /**
   * "Inteiro" para a PALETA não é "tudo que a barra desenha": tela futura sai
   * (comando que leva a 404 é pior que comando ausente) e filha sobe (quem
   * navega é `Ordem de Compra`, não o pai `Compras`).
   */
  it('empresa completa vê tudo que é NAVEGÁVEL, sem futuro e com as filhas soltas', () => {
    const esperado = navGroups
      .flatMap((g) => g.items)
      .flatMap((item) => item.filhas ?? [item])
      .filter((item) => !item.futuro)
      .map((item) => item.title)

    expect(titulos(Object.values(RECURSOS))).toEqual(esperado)
  })

  it('tela futura nunca chega à paleta — ela é desenho da barra, não destino', () => {
    const futuros = navGroups.flatMap((g) => g.items).filter((item) => item.futuro)
    expect(futuros.length).toBeGreaterThan(0)

    const oferecidos = titulos(Object.values(RECURSOS))
    for (const item of futuros) expect(oferecidos).not.toContain(item.title)
  })

  it('o pai colapsável não vira comando — quem navega são as filhas', () => {
    const oferecidos = titulos(Object.values(RECURSOS))
    expect(oferecidos).not.toContain('Compras')
    expect(oferecidos).toContain('Ordem de Compra')
    expect(oferecidos).toContain('Pedido de Compra')
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

describe('secoesVisiveis', () => {
  /**
   * A barra MOSTRA o futuro — é o que o user pediu: "o operador vê pra onde
   * cresce". Quem o esconde é `gruposVisiveis`, que serve a paleta. As duas
   * funções divergem de propósito, e é esta a diferença.
   */
  it('a barra mostra o futuro que a paleta esconde', () => {
    const secoes = secoesVisiveis(empresaCom(...Object.values(RECURSOS)))
    const financeiro = secoes.find((s) => s.id === 'financeiro')

    expect(financeiro?.grupos[0]?.items.map((i) => i.title)).toEqual([
      'Contas a Receber',
      'Contas a Pagar',
      'Comissões',
    ])
    expect(titulos(Object.values(RECURSOS))).not.toContain('Contas a Pagar')
  })

  it('sete seções na barra, na ordem do fluxo, e Configurações fora dela', () => {
    const secoes = secoesVisiveis(empresaCom(...Object.values(RECURSOS)))
    expect(secoes.filter((s) => !s.oculta).map((s) => s.id)).toEqual([
      'inicio',
      'comercial',
      'crm',
      'estoque',
      'financeiro',
      'pessoas',
      'catalogo',
    ])
    expect(secoes.filter((s) => s.oculta).map((s) => s.id)).toEqual(['config'])
  })

  /**
   * TETO (catálogo §5): seção nova só substituindo ou reagrupando. Era seis;
   * CRM subiu a sete por decisão do user em 2026-08-17. O teste existe para a
   * oitava entrar pelo mesmo caminho — decisão, não acidente.
   */
  it('o teto de sete é regra, não coincidência', () => {
    expect(navSecoes.filter((s) => !s.oculta)).toHaveLength(7)
  })

  /**
   * O CRM inteiro num lugar só: o quadro e o que o MONTA. Enquanto Funis e
   * Motivos moravam em Configurações, montar um funil obrigava a sair do
   * módulo — que é a queixa que derrubou o desenho anterior.
   */
  it('Funis e Motivos de Perda moram no CRM, não em Configurações', () => {
    const secoes = secoesVisiveis(empresaCom(...Object.values(RECURSOS)))
    const crm = secoes.find((s) => s.id === 'crm')
    expect(crm?.grupos.flatMap((g) => g.items).map((i) => i.title)).toEqual([
      'Oportunidades',
      'Funis',
      'Motivos de Perda',
    ])

    const config = secoes.find((s) => s.oculta)
    expect(config?.grupos.flatMap((g) => g.items).map((i) => i.title)).toEqual([
      'Mapeamento de Tabelas',
      'Usuários e Empresas',
      'Listas de apoio',
    ])
  })

  /**
   * A seção-página não tem item que case a própria rota — quem responde por
   * `/config` é a `raiz`. Sem ela o cabeçalho anunciaria a seção errada.
   */
  it('a seção oculta declara a raiz da própria página', () => {
    const config = navSecoes.find((s) => s.oculta)
    expect(config?.raiz).toBe('/config')
    expect(navSecoes.filter((s) => s.raiz).map((s) => s.id)).toEqual(['config'])
  })

  it('a empresa sem recurso nenhum perde o item, não a seção inteira', () => {
    const secoes = secoesVisiveis(empresaCom())
    const pessoas = secoes.find((s) => s.id === 'pessoas')

    // Profissional Externo e Colaboradores exigem recurso; Clientes não.
    expect(pessoas?.grupos.flatMap((g) => g.items).map((i) => i.title)).toEqual(['Clientes'])
  })
})

describe('itemDaRota', () => {
  it('acha o item pela listagem e pelo detalhe', () => {
    expect(itemDaRota('/cadastros/fornecedores')?.recurso).toBe(RECURSOS.suppliers)
    expect(itemDaRota('/cadastros/fornecedores/abc-1')?.recurso).toBe(RECURSOS.suppliers)
  })

  it('rota sem item — e prefixo que só PARECE item — não casa', () => {
    expect(itemDaRota('/cadastros')).toBeUndefined()
    expect(itemDaRota('/cadastros/fornecedores-antigos')).toBeUndefined()
  })

  /**
   * O Boletim ENTROU no menu (Início/Hoje) e a rota dele é `/`. O casamento é
   * EXATO — `startsWith('/')` acenderia o Boletim em toda tela do sistema, e a
   * guarda de recurso passaria a responder por qualquer rota.
   */
  it('a raiz casa o Boletim, e só ela', () => {
    expect(itemDaRota('/')?.title).toBe('Boletim')
    expect(itemDaRota('/cadastros/clientes')?.title).toBe('Clientes')
    // E ele NÃO empresta aparência: `moduloDaRota('/')` já responde `boletim`
    // por casamento exato — ele é a única tela com módulo e sem prefixo.
    expect(itemDaRota('/')?.aparencia).toBeUndefined()
  })

  it('tela futura não casa rota — ela não está lá', () => {
    expect(itemDaRota('/financeiro/pagar')).toBeUndefined()
    expect(itemDaRota('/obras')).toBeUndefined()
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

  it('mora em Configurações, fora do caminho de operação', () => {
    const config = navSecoes.find((s) => s.id === 'config')
    const titulosDaConfig = config?.grupos.flatMap((g) => g.items).map((i) => i.title) ?? []
    expect(titulosDaConfig).toContain('Mapeamento de Tabelas')
  })

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

/**
 * A REGRA DO `Voltar` UNIVERSAL (issue #235, espec fusão v5 §"Regras fixas de
 * página": *"Voltar/cancelar SEMPRE no canto superior esquerdo"*).
 *
 * O botão é do FRAME, não da tela — mas ele não pode aparecer em toda tela: na
 * listagem de Clientes não há para onde voltar, e um botão que leva ao lugar
 * onde já se está é pior que botão nenhum. Quem separa os dois casos é esta
 * função, e a separação é a mesma que a barra lateral já faz: **destino do
 * menu não volta; o que está DEPOIS de um destino, volta para ele.**
 *
 * Não é heurística de string (`pathname.split('/')`): o pai de
 * `/cadastros/clientes/abc` é a tela que o menu publica, e é ela que a
 * taxonomia sabe. Cortar o último segmento acertaria aqui e erraria em toda
 * rota de três níveis que o menu não publica no meio.
 */
describe('rotaMaeDe — para onde o `Voltar` universal leva', () => {
  it('tela do menu NÃO volta: ela é o destino, não o desvio', () => {
    expect(rotaMaeDe('/cadastros/clientes')).toBeUndefined()
    expect(rotaMaeDe('/')).toBeUndefined()
  })

  it('detalhe volta para a listagem que o publica', () => {
    expect(rotaMaeDe('/cadastros/clientes/9a1f')).toBe('/cadastros/clientes')
  })

  it('inclusão volta para a listagem — o formulário em branco também tem saída', () => {
    expect(rotaMaeDe('/cadastros/clientes/novo')).toBe('/cadastros/clientes')
  })

  /**
   * O caso que o corte de string erra: `/compras` é PAI COLAPSÁVEL, não tela.
   * A mãe de uma ordem é `/compras/ordens`, que é o que o menu publica.
   */
  it('sub-rota de filha volta para a filha, não para o pai colapsável', () => {
    expect(rotaMaeDe('/compras/ordens/7')).toBe('/compras/ordens')
  })

  it('caminho fora do menu não inventa mãe — quem responde por ele é o 404', () => {
    expect(rotaMaeDe('/nao-existe/aqui')).toBeUndefined()
  })
})

/**
 * O DESTINO DA SEÇÃO — para onde o ícone dela, no topo, leva.
 *
 * A guarda é dupla, e as duas metades importam: toda seção com tela tem de
 * apontar para uma rota REAL (senão a fileira do topo vira 404), e a seção sem
 * tela tem de devolver `undefined` em voz alta (senão alguém "conserta"
 * inventando um caminho).
 */
describe('destinoDaSecao', () => {
  const porId = (id: string) => navSecoes.find((secao) => secao.id === id)

  it('leva à PRIMEIRA tela da seção — a ordem da taxonomia é a preferência', () => {
    const estoque = porId('estoque')
    expect(estoque).toBeDefined()
    // `Movimentação` vem antes de Compras no grupo, e é o destino.
    expect(estoque && destinoDaSecao(estoque)).toBe('/estoque/movimentacao')
  })

  it('seção só com tela futura não inventa destino', () => {
    const financeiro = porId('financeiro')
    expect(financeiro).toBeDefined()
    expect(financeiro && destinoDaSecao(financeiro)).toBeUndefined()
  })

  it('todo destino publicado é um item navegável de verdade', () => {
    const navegaveis = new Set(
      navGroups
        .flatMap((grupo) => grupo.items.flatMap((item) => item.filhas ?? [item]))
        .filter((item) => !item.futuro && !item.externo)
        .map((item) => item.url),
    )
    for (const secao of navSecoes) {
      const destino = destinoDaSecao(secao)
      if (destino) expect(navegaveis).toContain(destino)
    }
  })

  /**
   * O mapa de tabelas sai da SPA por âncora. Um clique de SEÇÃO que caísse
   * nele trocaria de aplicativo por engano — ele continua alcançável no grupo
   * dele, declarado com o que é.
   */
  it('item externo nunca é destino de seção', () => {
    for (const secao of navSecoes) {
      // `undefined` passa por omissão — quem não tem destino não tem como
      // apontar para o `.html`. A asserção só morde quando há destino.
      expect(destinoDaSecao(secao) ?? '').not.toContain('.html')
    }
  })
})
