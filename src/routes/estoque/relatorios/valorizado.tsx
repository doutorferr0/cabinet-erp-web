import { TelaEstoqueValorizado } from '@/features/relatorios/tela-estoque-valorizado'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/estoque/relatorios/valorizado')({
  component: TelaEstoqueValorizado,
})
