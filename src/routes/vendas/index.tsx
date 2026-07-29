import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/vendas/')({
  component: VendasHome,
})

function VendasHome() {
  return <p className="text-muted-foreground">Escolha uma opção no menu de Vendas.</p>
}
