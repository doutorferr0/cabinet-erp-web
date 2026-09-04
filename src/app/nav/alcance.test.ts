import { GRUPOS_NAV, GRUPO_CONFIG, GRUPO_DENTRO_DA_CONFIG, grupoDaRota } from '@/app/nav/grupos'
import { opcoesDoRouter } from '@/app/router'
import { createMemoryHistory, createRouter } from '@tanstack/react-router'
import { describe, expect, it } from 'vitest'

/**
 * A GUARDA DE ALCANCE — nenhuma tela fica fora da barra em silêncio.
 *
 * É o item nº 1 do DoD da #472. O modelo antigo tinha DUAS listas de telas (as
 * seções da appbar e a barra por seção) e nada obrigava as duas a cobrirem o
 * roteador; tela nova entrava por rota e ficava alcançável só por URL digitada,
 * sem nada acusar. Aqui a fonte é o `routeTree` — o que o roteador de fato
 * atende — e a pergunta é feita para CADA caminho: existe item da barra que
 * responde por ele?
 *
 * ## O que conta como alcançada
 *
 * O item da barra ou o PAI dele. `/vendas/pedidos/$pedidoId` não tem item
 * próprio e nem deveria ter — é a ficha de um registro, e o que a barra publica
 * é a listagem. `grupoDaRota` casa por prefixo com fronteira de segmento, então
 * a ficha e a inclusão caem no grupo da listagem, que é o comportamento que a
 * barra precisa ter de qualquer forma (o grupo fica aberto quando se entra no
 * detalhe).
 *
 * ## As exceções são NOMEADAS, e cada uma tem motivo
 *
 * Lista fechada e conferida nos dois sentidos: caminho fora da barra que não
 * está aqui reprova, e caminho aqui que a barra passou a cobrir também —
 * exceção que virou mentira é pior que exceção nenhuma, porque ela some do
 * radar exatamente quando deixa de ser verdade.
 */

/** Caminhos que a barra deliberadamente NÃO publica, e por quê. */
const FORA_DA_BARRA: ReadonlyArray<readonly [string, string]> = [
  ['/login', 'porta de entrada: quem a abre não tem sessão, e não há shell em volta'],
  ['/esqueci-senha', 'ciclo da credencial: quem chega aqui não conseguiu entrar'],
  ['/definir-senha', 'ciclo da credencial: a autenticação é o token da barra de endereço'],
  ['/trocar-senha', 'senha provisória: exige sessão e ainda não entra no shell'],
  [
    '/cadastros',
    'o hub de "cadastros" DEIXOU de existir na 2.0 — cada cadastro mora no módulo que o consome. A rota continua porque é o prefixo dos registros.',
  ],
  [
    '/ajuda/atalhos',
    'referência que se consulta uma vez; mora no menu do operador, no rodapé da barra, e não na lista de operação',
  ],
  [
    '/boletim',
    'APELIDO, não tela: redireciona para `/`, que a barra publica como `Início`. O nome existe porque o sistema inteiro chama a folha do dia de "Boletim" (o 404, a ação do Dashboard) e o endereço dava 404 (#488). Publicar os DOIS na barra daria dois itens para uma tela; publicar só este apagaria a rota que a guarda de sessão devolve depois do login.',
  ],
]

/** Todo caminho que o roteador atende, sem os parâmetros e sem duplicata. */
function caminhosDoRoteador(): string[] {
  const router = createRouter({
    ...opcoesDoRouter,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  const caminhos = new Set<string>()
  for (const rota of Object.values(router.routesById) as Array<{ fullPath?: string }>) {
    const bruto = rota.fullPath
    if (!bruto || bruto === '') continue
    // `/vendas/` e `/vendas` são a MESMA tela para quem navega: a barra publica
    // um endereço só, e a barra invertida é detalhe do gerador de rotas.
    const caminho = bruto.length > 1 && bruto.endsWith('/') ? bruto.slice(0, -1) : bruto
    caminhos.add(caminho)
  }
  return [...caminhos].sort()
}

/** O caminho com os parâmetros preenchidos — `$id` não navega como está. */
function comParametros(caminho: string): string {
  return caminho.replace(/\$[A-Za-z]+/g, 'exemplo-de-id')
}

describe('alcance da navegação', () => {
  const caminhos = caminhosDoRoteador()
  const excecoes = new Set(FORA_DA_BARRA.map(([caminho]) => caminho))

  it('o roteador tem rota, e o teste não está medindo o vazio', () => {
    // Sem esta linha, um `routeTree` que falhasse ao carregar daria uma lista
    // vazia e TODOS os casos abaixo passariam sem afirmar nada.
    expect(caminhos.length).toBeGreaterThan(40)
  })

  it('toda rota autenticada é alcançável pela barra — item próprio ou pai', () => {
    const orfas = caminhos
      .filter((caminho) => !excecoes.has(caminho))
      .filter((caminho) => grupoDaRota(comParametros(caminho)) === undefined)

    expect(orfas).toEqual([])
  })

  it('cada exceção continua sendo exceção — nenhuma virou mentira', () => {
    const cobertasApesarDaExcecao = FORA_DA_BARRA.filter(
      ([caminho]) => grupoDaRota(comParametros(caminho)) !== undefined,
    ).map(([caminho]) => caminho)

    expect(cobertasApesarDaExcecao).toEqual([])
  })

  it('cada exceção é uma rota QUE EXISTE — nenhuma sobrou de rota apagada', () => {
    const inexistentes = FORA_DA_BARRA.map(([caminho]) => caminho).filter(
      (caminho) => !caminhos.includes(caminho),
    )

    expect(inexistentes).toEqual([])
  })

  /**
   * Item da barra que aponta para caminho que o roteador não atende dá 404 no
   * clique — o defeito simétrico do anterior, e o mais fácil de introduzir:
   * renomear uma rota não toca no arquivo da barra.
   */
  it('todo item NAVEGÁVEL da barra tem rota de verdade por trás', () => {
    const itens = [...GRUPOS_NAV, GRUPO_CONFIG, GRUPO_DENTRO_DA_CONFIG]
      .flatMap((grupo) => grupo.items)
      .filter((item) => !item.futuro && !item.externo)

    const quebrados = itens
      .filter((item) => !caminhos.includes(item.url))
      .map((item) => `${item.title} → ${item.url}`)

    expect(quebrados).toEqual([])
  })

  /** A ordem é do FLUXO e está escrita na issue; derivá-la seria perdê-la. */
  it('a ordem dos grupos é a fixa da 2.0', () => {
    expect(GRUPOS_NAV.map((g) => g.id)).toEqual([
      'hoje',
      'compras',
      'estoque',
      'vendas',
      'crm',
      'pessoas',
    ])
  })

  /** O mapeamento que a issue crava, medido caminho a caminho. */
  it.each([
    ['/cadastros/fornecedores', 'compras'],
    ['/cadastros/clientes', 'vendas'],
    ['/cadastros/profissionais', 'vendas'],
    ['/cadastros/colaboradores', 'pessoas'],
    ['/config/usuarios', 'pessoas'],
    ['/estoque/relatorios/valorizado', 'estoque'],
    ['/agenda', 'hoje'],
    ['/planner', 'hoje'],
    ['/', 'hoje'],
  ])('%s mora no grupo %s', (caminho, grupo) => {
    expect(grupoDaRota(caminho)).toBe(grupo)
  })

  /**
   * A ficha e a inclusão ficam NO GRUPO DA LISTAGEM. Sem isso, entrar num
   * pedido fecharia o grupo de Vendas e o operador perderia o mapa exatamente
   * no detalhe — que foi o defeito que a barra por seção tinha.
   */
  it.each([
    ['/vendas/pedidos/9a1f', 'vendas'],
    ['/vendas/pedidos/novo', 'vendas'],
    ['/cadastros/produtos/abc', 'estoque'],
  ])('%s continua no grupo %s', (caminho, grupo) => {
    expect(grupoDaRota(caminho)).toBe(grupo)
  })
})
