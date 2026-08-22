import { TelaDeDocumento } from '@/components/cabinet/tela-de-documento'
import { data } from '@/data'
import { OrcamentoForm } from '@/features/orcamento/orcamento-form'
import { PainelDeAtividades } from '@/features/tarefas/painel-atividades'
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
      // O painel monta FORA do `<form>` do documento — atividade é registro
      // próprio, com gravação própria, e dentro do formulário os botões dela
      // disputariam o submit — e agora também fora da MOLDURA: a fusão v5 §3
      // cita Atividades pelo nome como o exemplo do que não pertence à
      // entidade. Em `Incluir` não há id a que pendurar atividade.
      foraDaMoldura={() =>
        isNovo ? null : <PainelDeAtividades alvo={{ tipo: 'quote', id: orcamentoId }} />
      }
    >
      {(orcamento) => <OrcamentoForm orcamento={orcamento} readOnly={readOnly} />}
    </TelaDeDocumento>
  )
}
