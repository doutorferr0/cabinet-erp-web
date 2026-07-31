import { TrocarSenhaTela } from '@/features/login/trocar-senha'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/trocar-senha')({
  component: TrocarSenhaTela,
})
