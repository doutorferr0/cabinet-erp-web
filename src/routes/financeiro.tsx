import { LayoutDeModulo } from '@/app/layout-de-modulo'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/financeiro')({
  component: LayoutDeModulo,
})
