import { BookUser, type LucideIcon, Package, ShoppingCart, Store } from 'lucide-react'

export interface NavItem {
  title: string
  url: string
  icon: LucideIcon
}

export interface NavGroup {
  title: string
  url: string
  icon: LucideIcon
  items: NavItem[]
}

export const navGroups: NavGroup[] = [
  {
    title: 'Cadastros',
    url: '/cadastros',
    icon: BookUser,
    items: [
      { title: 'Clientes', url: '/cadastros/clientes', icon: BookUser },
      { title: 'Fornecedores', url: '/cadastros/fornecedores', icon: BookUser },
      { title: 'Profissional Externo', url: '/cadastros/profissionais', icon: BookUser },
      { title: 'Colaboradores', url: '/cadastros/colaboradores', icon: BookUser },
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
