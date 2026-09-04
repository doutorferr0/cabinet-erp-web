import { PageHeader } from '@/components/cabinet/page-header'
import { Stipple } from '@/components/cabinet/stipple'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/vendas/')({
  component: VendasHome,
})

/** Estado vazio de módulo — mesmo tratamento de `/estoque/` (DESIGN.md §Stipple). */
function VendasHome() {
  return (
    <>
      <PageHeader titulo="Vendas" />
      <div className="flex items-center gap-4">
        <Stipple />
        <p className="text-muted-foreground">Escolha uma opção no menu de Vendas.</p>
      </div>
    </>
  )
}
