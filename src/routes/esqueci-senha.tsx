import { EsqueciSenhaTela } from '@/features/login/esqueci-senha'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/esqueci-senha')({
  component: EsqueciSenhaTela,
})
