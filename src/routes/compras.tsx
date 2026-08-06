import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/compras')({
  component: ComprasLayout,
})

/**
 * Sem `<h1>` de módulo: a banda de identidade da tela já é o cabeçalho de
 * nível 1 da página, e quem diz em que módulo se está é o menu lateral, que
 * marca a rota ativa. Dois `<h1>` na mesma página era o efeito colateral.
 */
function ComprasLayout() {
  return (
    <div className="flex flex-col gap-4">
      <Outlet />
    </div>
  )
}
