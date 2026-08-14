import type { Modulo } from '@/app/modulo'
import type { ShapeDeLugar } from '@/components/cabinet/ornamento'
import { RECURSOS, type RecursoDaEmpresa } from '@/data/recursos-da-empresa'
import {
  ArrowLeftRight,
  BookUser,
  Filter,
  GanttChart,
  LayoutDashboard,
  type LucideIcon,
  Package,
  ShoppingCart,
  SquareKanban,
  Store,
} from 'lucide-react'

export interface NavItem {
  title: string
  url: string
  icon: LucideIcon
  /**
   * Uma linha dizendo O QUE A TELA FAZ — não o que ela contém. É o conteúdo do
   * cartão de hover do grupo, e a razão de ele existir: sem isto o cartão só
   * repetia a lista que já está na barra logo abaixo.
   *
   * **Obrigatório de propósito.** Tela nova sem descrição não compila, senão o
   * cartão volta a ser uma lista de nomes com buracos no meio.
   *
   * REDAÇÃO PROVISÓRIA (2026-08-07): escrita pelo agente a pedido do user, NÃO
   * extraída de `topicos/transcricaosoftlux.md`. A transcrição do legado
   * descreve campos e barra de ações, não propósito. Rever com quem opera —
   * `Ordem de Compra` vs `Pedido de Compra` e `Planner` são as mais expostas a
   * erro de leitura minha.
   */
  descricao: string
  /**
   * Recurso que a EMPRESA ATIVA precisa ter para este item existir. Item sem
   * `recurso` está em toda empresa — é o padrão, e continua sendo o caso da
   * maioria. Ver `src/data/recursos-da-empresa.ts`: é capacidade da empresa,
   * não permissão da pessoa.
   */
  recurso?: RecursoDaEmpresa
  /**
   * Cor e desenho de uma tela que NÃO tem módulo próprio.
   *
   * O normal é a sidebar tirar os dois de `moduloDaRota(item.url)`. Três telas
   * ficam de fora da tabela travada pelo user — Dashboard, Planner e
   * Colaboradores — e apareciam com ícone lucide cinza no meio de uma fileira
   * colorida. `mockup-dashboard-cores.html` resolveu sem inventar a nona cor:
   * elas EMPRESTAM o par de um vizinho e se distinguem pelo desenho.
   *
   * Fica na entrada do menu, e não em `moduloDaRota`, de propósito: aquela
   * função responde "de que módulo é a TELA no ar" e o shell a usa para pintar
   * a folha inteira. Dizer ali que `/dashboard` é Boletim tingiria a página de
   * coral e faria a banda de identidade anunciar o módulo errado. O empréstimo
   * é do ITEM DE MENU, e o alcance dele para no item.
   */
  aparencia?: { modulo: Modulo; shape: ShapeDeLugar }
}

export interface NavGroup {
  title: string
  url: string
  icon: LucideIcon
  items: NavItem[]
}

export const navGroups: NavGroup[] = [
  {
    /**
     * A seção da VISÃO — o que está em curso, antes dos módulos que guardam
     * cadastro e documento. Sem `recurso` nos itens: acompanhar o próprio
     * trabalho é de toda empresa, não é módulo contratado.
     *
     * O **Boletim** NÃO mora aqui, e não é esquecimento: ele continua solto
     * acima dos grupos, como entrada. Boletim é o fechamento do movimento do
     * dia; Dashboard e Planner são o que ainda vai acontecer. Empilhá-los na
     * mesma seção diria que são a mesma pergunta.
     */
    title: 'Dashboard',
    url: '/dashboard',
    icon: LayoutDashboard,
    items: [
      {
        title: 'Dashboard',
        url: '/dashboard',
        icon: LayoutDashboard,
        descricao: 'O que está em curso agora: números do dia e o que pede atenção.',
        // Coral do Boletim nas duas: a seção da VISÃO fala do mesmo assunto que
        // ele — o dia — e o mockup as põe sob o mesmo par. Desenhos distintos.
        aparencia: { modulo: 'boletim', shape: 'dashboard' },
      },
      {
        title: 'Tarefas',
        url: '/tarefas',
        icon: SquareKanban,
        descricao: 'O quadro do que precisa ser feito, em colunas por andamento.',
        aparencia: { modulo: 'boletim', shape: 'tarefas' },
      },
      {
        title: 'Planner',
        url: '/planner',
        icon: GanttChart,
        descricao:
          'O que ainda vai acontecer, na linha do tempo: prazos, entregas e reagendamentos.',
        aparencia: { modulo: 'boletim', shape: 'planner' },
      },
    ],
  },
  {
    title: 'Cadastros',
    url: '/cadastros',
    icon: BookUser,
    items: [
      {
        title: 'Clientes',
        url: '/cadastros/clientes',
        icon: BookUser,
        descricao: 'Quem compra. Obra, cobrança, contato e situação financeira.',
      },
      {
        title: 'Fornecedores',
        descricao: 'Quem fornece. Razão social, prazo de entrega e contatos.',
        url: '/cadastros/fornecedores',
        icon: BookUser,
        recurso: RECURSOS.suppliers,
      },
      {
        title: 'Profissional Externo',
        descricao: 'Arquiteto ou lighting designer que especifica o projeto.',
        url: '/cadastros/profissionais',
        icon: BookUser,
        recurso: RECURSOS.professionals,
      },
      {
        title: 'Colaboradores',
        descricao: 'O quadro interno. Setor, cargo, vínculo e admissão.',
        url: '/cadastros/colaboradores',
        icon: BookUser,
        recurso: RECURSOS.employees,
        // Par de Clientes: é o cadastro de PESSOA vizinho na mesma seção. O
        // desenho é que separa — corpo dentro de moldura, a pessoa de dentro.
        aparencia: { modulo: 'clientes', shape: 'colaboradores' },
      },
      {
        title: 'Produtos',
        url: '/cadastros/produtos',
        icon: Package,
        descricao: 'O catálogo. Variantes, valores, localização de estoque e tributação.',
      },
    ],
  },
  {
    title: 'Estoque',
    url: '/estoque',
    icon: Package,
    items: [
      {
        title: 'Movimentação',
        url: '/estoque/movimentacao',
        icon: ArrowLeftRight,
        descricao: 'Entrada, saída e transferência do estoque.',
        // Menu inteiro não capturado na transcrição — §10. Sem shape/cor
        // próprios: herda o par de Estoque por `moduloDaRota('/estoque')`
        // (prefixo), não precisa de `aparencia` — não é caso de "tela sem
        // módulo", é filha de um módulo que já tem cor.
      },
    ],
  },
  {
    /**
     * CRM — o funil, antes da venda. Grupo próprio e não item de Vendas: o
     * orçamento é documento (existe ou não existe), e a oportunidade é
     * ANDAMENTO — vive mudando de coluna até virar documento ou morrer com
     * motivo. Empilhar os dois no mesmo grupo diria que são a mesma pergunta.
     *
     * Sem `recurso`: `features` do vínculo tem três valores fechados
     * (`suppliers`/`professionals`/`employees`) e CRM não é um deles. Item sem
     * recurso está em toda empresa, que é o padrão do menu.
     */
    title: 'CRM',
    url: '/crm',
    icon: Filter,
    items: [
      {
        title: 'Oportunidades',
        url: '/crm/funil',
        icon: SquareKanban,
        descricao: 'O quadro do funil: cada negócio em aberto, na etapa em que está.',
      },
      {
        title: 'Funis',
        url: '/crm/funis',
        icon: Filter,
        descricao: 'Os modelos de venda: as colunas por onde a oportunidade passa até fechar.',
      },
      {
        title: 'Motivos de Perda',
        url: '/crm/motivos',
        icon: Filter,
        descricao: 'Por que os negócios se perdem — catalogado, para virar análise no fim do ano.',
      },
    ],
  },
  {
    title: 'Vendas',
    url: '/vendas',
    icon: Store,
    // `Pedido de venda` é fluxo não capturado (§10) — só Orçamento existe.
    items: [
      {
        title: 'Orçamentos',
        url: '/vendas/orcamentos',
        icon: Store,
        descricao: 'A proposta ao cliente. Se cancela, nunca se apaga.',
      },
    ],
  },
  {
    title: 'Compras',
    url: '/compras',
    icon: ShoppingCart,
    items: [
      {
        title: 'Ordem de Compra',
        url: '/compras/ordens',
        icon: ShoppingCart,
        descricao: 'O combinado com o fornecedor: itens, prazo previsto e reagendamento.',
      },
      {
        title: 'Pedido de Compra',
        url: '/compras/pedidos',
        icon: ShoppingCart,
        descricao: 'A compra efetivada, amarrada ao pedido de venda que a originou.',
      },
    ],
  },
]

/** Item cuja tela responde por este caminho (o próprio ou um detalhe dele). */
export function itemDaRota(pathname: string): NavItem | undefined {
  return navGroups
    .flatMap((grupo) => grupo.items)
    .find((item) => pathname === item.url || pathname.startsWith(`${item.url}/`))
}

/**
 * Se a empresa ativa alcança este caminho. Caminho fora do menu é liberado —
 * quem decide sobre ele é o roteador (404), não o recurso.
 */
export function rotaLiberada(pathname: string, tem: (recurso: RecursoDaEmpresa) => boolean) {
  const item = itemDaRota(pathname)
  return !item?.recurso || tem(item.recurso)
}

/**
 * O menu da empresa ativa: os grupos sem os itens cujo recurso ela não tem.
 *
 * Função pura, e não `filter` espalhado no shell, pelo mesmo motivo de
 * `moduloDaRota`: dá para testar sem montar rota, e o menu e a guarda de rota
 * leem a MESMA regra — item escondido na barra e URL digitada na mão não podem
 * discordar.
 *
 * Grupo que fica vazio some; grupo que JÁ nascia vazio fica. Não é detalhe:
 * `Estoque` não tem item nenhum (§10, telas não capturadas) e continua na barra
 * anunciando o módulo — some só o grupo que a empresa perdeu.
 */
export function gruposVisiveis(tem: (recurso: RecursoDaEmpresa) => boolean): NavGroup[] {
  return navGroups
    .map((grupo) => ({
      ...grupo,
      items: grupo.items.filter((item) => !item.recurso || tem(item.recurso)),
    }))
    .filter((grupo, i) => grupo.items.length > 0 || navGroups[i]?.items.length === 0)
}
