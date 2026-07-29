import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/vendas')({
  component: VendasLayout,
})

function VendasLayout() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Vendas</h1>
      <Outlet />
    </div>
  )
}
