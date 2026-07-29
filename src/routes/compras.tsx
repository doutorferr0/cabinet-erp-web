import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/compras')({
  component: ComprasLayout,
})

function ComprasLayout() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Compras</h1>
      <Outlet />
    </div>
  )
}
