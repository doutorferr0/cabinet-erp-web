import { TelaEstoqueParado } from '@/features/relatorios/tela-estoque-parado'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/estoque/relatorios/parado')({
  component: TelaEstoqueParado,
})
