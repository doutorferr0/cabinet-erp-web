import { createFileRoute } from '@tanstack/react-router'
import { AgendaTela } from '@/features/agenda/agenda'

export const Route = createFileRoute('/agenda')({
  component: AgendaTela,
})
