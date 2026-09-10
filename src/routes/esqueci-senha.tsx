import { createFileRoute } from '@tanstack/react-router'
import { EsqueciSenhaTela } from '@/features/login/esqueci-senha'

export const Route = createFileRoute('/esqueci-senha')({
  component: EsqueciSenhaTela,
})
