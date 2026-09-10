import { createFileRoute } from '@tanstack/react-router'
import { PaginaDaFila } from '@/features/aprovacao/pagina-da-fila'

export const Route = createFileRoute('/vendas/aprovacoes')({
  component: PaginaDaFila,
})
