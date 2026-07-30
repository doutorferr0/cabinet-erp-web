import { BoletimTela } from '@/features/boletim/boletim'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: BoletimTela,
})
