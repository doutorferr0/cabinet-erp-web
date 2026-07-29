import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">VITRA</h1>
      <p className="text-muted-foreground">Selecione um módulo no menu lateral para começar.</p>
    </div>
  )
}
