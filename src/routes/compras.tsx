import { createFileRoute } from '@tanstack/react-router'
import { LayoutDeModulo } from '@/app/layout-de-modulo'

export const Route = createFileRoute('/compras')({
  component: LayoutDeModulo,
})
