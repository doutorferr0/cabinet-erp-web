import { createFileRoute } from '@tanstack/react-router'
import { TelaDeAcesso } from '@/features/acesso/tela-de-acesso'

export const Route = createFileRoute('/config/usuarios')({
  component: TelaDeAcesso,
})
