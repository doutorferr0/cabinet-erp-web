import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/estoque/')({
  component: EstoqueHome,
})

function EstoqueHome() {
  return <p className="text-muted-foreground">Escolha uma opção no menu de Estoque.</p>
}
