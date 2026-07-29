import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/compras/')({
  component: ComprasHome,
})

function ComprasHome() {
  return <p className="text-muted-foreground">Escolha uma opção no menu de Compras.</p>
}
