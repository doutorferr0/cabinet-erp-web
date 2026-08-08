import { TelaDeDocumento } from '@/components/cabinet/tela-de-documento'
import { data } from '@/data'
import { OrdemCompraForm } from '@/features/ordem-compra/ordem-compra-form'
import { isConsulta, validateModoSearch } from '@/lib/modo-consulta'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/compras/ordens/$ordemId')({
  component: OrdemCompraEditPage,
  validateSearch: validateModoSearch,
})

function OrdemCompraEditPage() {
  const { ordemId } = Route.useParams()
  const readOnly = isConsulta(Route.useSearch())
  const isNovo = ordemId === 'novo'

  return (
    <TelaDeDocumento
      provider={data.ordensCompra}
      queryKeyBase="ordem-compra"
      idParam={ordemId}
      titulo="Ordem de Compra"
      modo={readOnly ? 'Consulta' : isNovo ? 'Incluir' : undefined}
      numero={(o) => o.codigo}
      naoEncontrado="Ordem de compra não encontrada."
      erroAoCarregar="Não foi possível carregar a ordem de compra."
    >
      {(ordem) => <OrdemCompraForm ordem={ordem} readOnly={readOnly} />}
    </TelaDeDocumento>
  )
}
