import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/estoque')({
  component: EstoqueLayout,
})

function EstoqueLayout() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Estoque</h1>
      <Outlet />
    </div>
  )
}
