import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/financeiro/')({
  component: FinanceiroHome,
})

function FinanceiroHome() {
  return <p className="text-muted-foreground">Escolha uma opção no menu de Financeiro.</p>
}
