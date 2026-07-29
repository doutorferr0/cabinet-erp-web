import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/cadastros')({
  component: CadastrosLayout,
})

function CadastrosLayout() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Cadastros</h1>
      <Outlet />
    </div>
  )
}
