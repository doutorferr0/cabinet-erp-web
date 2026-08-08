import { TelaDeDocumento } from '@/components/cabinet/tela-de-documento'
import { data } from '@/data'
import { OrcamentoForm } from '@/features/orcamento/orcamento-form'
import { isConsulta, validateModoSearch } from '@/lib/modo-consulta'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/vendas/orcamentos/$orcamentoId')({
  component: OrcamentoEditPage,
  validateSearch: validateModoSearch,
})

function OrcamentoEditPage() {
  const { orcamentoId } = Route.useParams()
  const readOnly = isConsulta(Route.useSearch())
  const isNovo = orcamentoId === 'novo'

  return (
    <TelaDeDocumento
      provider={data.orcamentos}
      queryKeyBase="orcamento"
      idParam={orcamentoId}
      titulo="Orçamento"
      modo={readOnly ? 'Consulta' : isNovo ? 'Incluir' : undefined}
      numero={(o) => o.numero}
      naoEncontrado="Orçamento não encontrado."
      erroAoCarregar="Não foi possível carregar o orçamento."
    >
      {(orcamento) => <OrcamentoForm orcamento={orcamento} readOnly={readOnly} />}
    </TelaDeDocumento>
  )
}
