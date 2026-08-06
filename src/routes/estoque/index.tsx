import { Stipple } from '@/components/cabinet/stipple'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/estoque/')({
  component: EstoqueHome,
})

/**
 * Estado vazio de módulo: um dos três lugares onde o Stipple é permitido
 * (DESIGN.md §Stipple). A folha aqui não tem dado nenhum — sem o acento, é
 * uma frase solta no meio do branco.
 */
function EstoqueHome() {
  return (
    <div className="flex items-center gap-4">
      <Stipple />
      <p className="text-muted-foreground">Escolha uma opção no menu de Estoque.</p>
    </div>
  )
}
