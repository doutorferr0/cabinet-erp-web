import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/cadastros/')({
  component: CadastrosHome,
})

function CadastrosHome() {
  return <p className="text-muted-foreground">Escolha uma opção no menu de Cadastros.</p>
}
