import { QuadroDeCargas } from '@/features/carga/quadro-de-cargas'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/vendas/cargas')({
  component: QuadroDeCargas,
})
