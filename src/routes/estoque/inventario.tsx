import { TelaDeInventario } from '@/features/estoque/inventario'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/estoque/inventario')({
  component: TelaDeInventario,
})
