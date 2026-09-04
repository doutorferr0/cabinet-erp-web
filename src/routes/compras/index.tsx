import { HubDeModulo } from '@/components/cabinet/hub-de-modulo'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/compras/')({
  component: ComprasHome,
})

/** Hub do módulo (D26) — no lugar da frase que mandava o operador ao menu. */
function ComprasHome() {
  return <HubDeModulo modulo="compras" />
}
