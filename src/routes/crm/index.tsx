import { HubDeModulo } from '@/components/cabinet/hub-de-modulo'
import { createFileRoute } from '@tanstack/react-router'

/**
 * A rota-índice do CRM NÃO EXISTIA — e a falta era invisível.
 *
 * `/crm` casava o layout de módulo, que renderiza um `<Outlet />`; sem filho
 * casado, a tela ficava em branco com a barra lateral marcando "CRM" ativo. Não
 * era 404, era pior: parecia carregamento que nunca termina. O hub fecha o
 * buraco e alinha os quatro módulos no mesmo comportamento.
 */
export const Route = createFileRoute('/crm/')({
  component: CrmHome,
})

function CrmHome() {
  return <HubDeModulo modulo="crm" />
}
