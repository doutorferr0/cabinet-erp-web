import { createFileRoute } from '@tanstack/react-router'
import { TelaEstoqueParado } from '@/features/relatorios/tela-estoque-parado'

export const Route = createFileRoute('/estoque/relatorios/parado')({
  component: TelaEstoqueParado,
})
