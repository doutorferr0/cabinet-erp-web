import { TelaDeListas } from '@/features/listas/tela-de-listas'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/config/listas')({
  component: TelaDeListas,
})
