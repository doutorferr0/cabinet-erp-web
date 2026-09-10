import { createFileRoute } from '@tanstack/react-router'
import { TelaDeReservaTecnica } from '@/features/comissoes/reserva-tecnica'

export const Route = createFileRoute('/vendas/reservas-tecnicas')({
  component: TelaDeReservaTecnica,
})
