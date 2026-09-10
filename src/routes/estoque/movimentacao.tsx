import { createFileRoute } from '@tanstack/react-router'
import { TelaDeEstoque } from '@/features/estoque/tela-de-estoque'

export const Route = createFileRoute('/estoque/movimentacao')({
  component: TelaDeEstoque,
})
