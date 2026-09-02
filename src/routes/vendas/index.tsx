import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/vendas/')({
  component: VendasHome,
})

/** Estado vazio de módulo — o mesmo texto seco de `/estoque/`, sem textura. */
function VendasHome() {
  return <p className="text-muted-foreground">Escolha uma opção no menu de Vendas.</p>
}
