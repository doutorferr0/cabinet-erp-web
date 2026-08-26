import { TelaDeReservaTecnica } from '@/features/comissoes/reserva-tecnica'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/vendas/reservas-tecnicas')({
  component: TelaDeReservaTecnica,
})
