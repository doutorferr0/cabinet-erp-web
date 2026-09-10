import { createFileRoute } from '@tanstack/react-router'
import { TelaDeInventario } from '@/features/estoque/inventario'

export const Route = createFileRoute('/estoque/inventario')({
  component: TelaDeInventario,
})
