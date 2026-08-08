import { Outlet } from '@tanstack/react-router'

/**
 * Layout comum aos módulos de rota (Cadastros, Vendas, Compras, Estoque).
 *
 * Sem `<h1>` de módulo: a banda de identidade da tela já é o cabeçalho de
 * nível 1 da página, e quem diz em que módulo se está é o menu lateral, que
 * marca a rota ativa. Dois `<h1>` na mesma página era o efeito colateral.
 */
export function LayoutDeModulo() {
  return (
    <div className="flex flex-col gap-4">
      <Outlet />
    </div>
  )
}
