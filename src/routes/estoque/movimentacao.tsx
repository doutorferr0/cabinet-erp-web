import { TelaDeEstoque } from '@/features/estoque/tela-de-estoque'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/estoque/movimentacao')({
  component: TelaDeEstoque,
})
