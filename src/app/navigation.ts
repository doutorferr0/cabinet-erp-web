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
      { title: 'Fornecedores', url: '/cadastros/fornecedores', icon: BookUser },
      { title: 'Clientes', url: '/cadastros/clientes', icon: BookUser },
      { title: 'Profissionais', url: '/cadastros/profissionais', icon: BookUser },
      { title: 'Produtos', url: '/cadastros/produtos', icon: Package },
    ],
  },
  {
    title: 'Estoque',
    url: '/estoque',
    icon: Package,
    items: [
      { title: 'Movimentações', url: '/estoque/movimentacoes', icon: Package },
      { title: 'Saldo', url: '/estoque/saldo', icon: Package },
    ],
  },
  {
    title: 'Vendas',
    url: '/vendas',
    icon: Store,
    items: [
      { title: 'Orçamentos', url: '/vendas/orcamentos', icon: Store },
      { title: 'Pedidos', url: '/vendas/pedidos', icon: Store },
    ],
  },
  {
    title: 'Compras',
    url: '/compras',
    icon: ShoppingCart,
    items: [
      { title: 'Pedidos', url: '/compras/pedidos', icon: ShoppingCart },
      { title: 'Ordens', url: '/compras/ordens', icon: ShoppingCart },
    ],
  },
]
