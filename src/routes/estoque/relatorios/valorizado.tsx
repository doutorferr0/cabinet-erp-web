import { createFileRoute } from '@tanstack/react-router'
import { TelaEstoqueValorizado } from '@/features/relatorios/tela-estoque-valorizado'

export const Route = createFileRoute('/estoque/relatorios/valorizado')({
  component: TelaEstoqueValorizado,
})
