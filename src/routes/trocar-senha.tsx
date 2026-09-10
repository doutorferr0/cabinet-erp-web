import { createFileRoute } from '@tanstack/react-router'
import { TrocarSenhaTela } from '@/features/login/trocar-senha'

export const Route = createFileRoute('/trocar-senha')({
  component: TrocarSenhaTela,
})
