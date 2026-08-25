import { TelaDeAcesso } from '@/features/acesso/tela-de-acesso'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/config/usuarios')({
  component: TelaDeAcesso,
})
