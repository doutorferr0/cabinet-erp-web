import { HubDeModulo } from '@/components/cabinet/hub-de-modulo'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/estoque/')({
  component: EstoqueHome,
})

/** Hub do módulo (D26) — no lugar da frase que mandava o operador ao menu. */
function EstoqueHome() {
  return <HubDeModulo modulo="estoque" />
}
