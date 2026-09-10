import { createFileRoute } from '@tanstack/react-router'
import { TelaDeListas } from '@/features/listas/tela-de-listas'

export const Route = createFileRoute('/config/listas')({
  component: TelaDeListas,
})
