import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/cadastros')({
  component: CadastrosLayout,
})

/**
 * O layout não tem mais `<h1>Cadastros</h1>`: com a banda de identidade dizendo
 * o nome da tela, o rótulo do módulo virava um SEGUNDO cabeçalho de nível 1 na
 * mesma página — e quem diz em que módulo se está é o menu lateral, que já
 * marca a rota ativa.
 */
function CadastrosLayout() {
  return (
    <div className="flex flex-col gap-4">
      <Outlet />
    </div>
  )
}
