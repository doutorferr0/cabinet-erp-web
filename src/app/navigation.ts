import { RECURSOS, type RecursoDaEmpresa } from '@/data/recursos-da-empresa'
import {
  BookUser,
  GanttChart,
  LayoutDashboard,
  type LucideIcon,
  Package,
  ShoppingCart,
  Store,
} from 'lucide-react'

export interface NavItem {
  title: string
  url: string
  icon: LucideIcon
  /**
   * Recurso que a EMPRESA ATIVA precisa ter para este item existir. Item sem
   * `recurso` está em toda empresa — é o padrão, e continua sendo o caso da
   * maioria. Ver `src/data/recursos-da-empresa.ts`: é capacidade da empresa,
   * não permissão da pessoa.
   */
  recurso?: RecursoDaEmpresa
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
      { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
      { title: 'Planner', url: '/planner', icon: GanttChart },
    ],
  },
  {
    title: 'Cadastros',
    url: '/cadastros',
    icon: BookUser,
    items: [
      { title: 'Clientes', url: '/cadastros/clientes', icon: BookUser },
      {
        title: 'Fornecedores',
        url: '/cadastros/fornecedores',
        icon: BookUser,
        recurso: RECURSOS.suppliers,
      },
      {
        title: 'Profissional Externo',
        url: '/cadastros/profissionais',
        icon: BookUser,
        recurso: RECURSOS.professionals,
      },
      {
        title: 'Colaboradores',
        url: '/cadastros/colaboradores',
        icon: BookUser,
        recurso: RECURSOS.employees,
      },
      { title: 'Produtos', url: '/cadastros/produtos', icon: Package },
    ],
  },
  {
    // O menu `Movimentação` (onde mora a movimentação de estoque) não foi
    // capturado na transcrição — §10. Sem itens até a próxima rodada de prints.
    title: 'Estoque',
    url: '/estoque',
    icon: Package,
    items: [],
  },
  {
    title: 'Vendas',
    url: '/vendas',
    icon: Store,
    // `Pedido de venda` é fluxo não capturado (§10) — só Orçamento existe.
    items: [{ title: 'Orçamentos', url: '/vendas/orcamentos', icon: Store }],
  },
  {
    title: 'Compras',
    url: '/compras',
    icon: ShoppingCart,
    items: [
      { title: 'Ordem de Compra', url: '/compras/ordens', icon: ShoppingCart },
      { title: 'Pedido de Compra', url: '/compras/pedidos', icon: ShoppingCart },
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
