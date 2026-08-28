import { PaginaDaFila } from '@/features/aprovacao/pagina-da-fila'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/vendas/aprovacoes')({
  component: PaginaDaFila,
})
