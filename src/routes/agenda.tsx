import { AgendaTela } from '@/features/agenda/agenda'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/agenda')({
  component: AgendaTela,
})
