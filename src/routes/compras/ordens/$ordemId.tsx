import { TelaDeDocumento } from '@/components/cabinet/tela-de-documento'
import { data } from '@/data'
import { OrdemCompraForm } from '@/features/ordem-compra/ordem-compra-form'
import { isConsulta, validateModoSearch } from '@/lib/modo-consulta'
import { createFileRoute } from '@tanstack/react-router'

/**
 * `dePedido` + `fornecedor`: de onde a ordem NOVA veio.
 *
 * Viajam na URL, e não em estado de navegação, pela mesma razão do `?modo=` —
 * a URL é o estado compartilhável, e o voltar do browser desfaz a origem sem
 * desfazer o resto. Só valem em `/novo`: numa ordem que já existe, quem diz de
 * onde ela veio são as linhas dela.
 */
function validarBusca(search: Record<string, unknown>) {
  return {
    ...validateModoSearch(search),
    ...(typeof search.dePedido === 'string' && search.dePedido !== ''
      ? { dePedido: search.dePedido }
      : {}),
    ...(typeof search.fornecedor === 'string' && search.fornecedor !== ''
      ? { fornecedor: search.fornecedor }
      : {}),
  }
}

export const Route = createFileRoute('/compras/ordens/$ordemId')({
  component: OrdemCompraEditPage,
  validateSearch: validarBusca,
})

function OrdemCompraEditPage() {
  const { ordemId } = Route.useParams()
  const busca = Route.useSearch()
  const readOnly = isConsulta(busca)
  const isNovo = ordemId === 'novo'
  const semente =
    isNovo && busca.dePedido && busca.fornecedor
      ? { pedidoId: busca.dePedido, fornecedorId: busca.fornecedor }
      : undefined

  return (
    <TelaDeDocumento
      provider={data.ordensCompra}
      queryKeyBase="ordem-compra"
      idParam={ordemId}
      titulo="Ordem de Compra"
      modo={readOnly ? 'Consulta' : isNovo ? 'Incluir' : undefined}
      numero={(o) => o.numero}
      naoEncontrado="Ordem de compra não encontrada."
      erroAoCarregar="Não foi possível carregar a ordem de compra."
    >
      {(ordem) => (
        <OrdemCompraForm ordem={ordem} readOnly={readOnly} {...(semente ? { semente } : {})} />
      )}
    </TelaDeDocumento>
  )
}
