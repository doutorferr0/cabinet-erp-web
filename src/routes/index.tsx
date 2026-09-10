import { createFileRoute } from '@tanstack/react-router'
import { BoletimTela } from '@/features/boletim/boletim'

export const Route = createFileRoute('/')({
  component: BoletimTela,
})
