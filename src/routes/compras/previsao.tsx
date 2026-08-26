import { PrevisaoDeChegada } from '@/features/ordem-compra/previsao-de-chegada'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/compras/previsao')({
  component: PrevisaoDeChegadaPage,
})

function PrevisaoDeChegadaPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-extrabold text-xl">Previsão de Chegada</h1>
      <PrevisaoDeChegada />
    </div>
  )
}
