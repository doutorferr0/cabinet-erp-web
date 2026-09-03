import { TelaDeDocumento } from '@/components/cabinet/tela-de-documento'
import { data } from '@/data'
import { LateralDoOrcamento } from '@/features/orcamento/ficha-lateral'
import { OrcamentoForm } from '@/features/orcamento/orcamento-form'
import { PainelDeAtividades } from '@/features/tarefas/painel-atividades'
import { GerarPedido, type OrcamentoParaConverter } from '@/features/vendas/gerar-pedido'
import { isConsulta, validateModoSearch } from '@/lib/modo-consulta'
import { createFileRoute } from '@tanstack/react-router'
import { FileCheck } from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/vendas/orcamentos/$orcamentoId')({
  component: OrcamentoEditPage,
  validateSearch: validateModoSearch,
})

function OrcamentoEditPage() {
  const { orcamentoId } = Route.useParams()
  const readOnly = isConsulta(Route.useSearch())
  const isNovo = orcamentoId === 'novo'

  /**
   * `Aprovar` da especificação = **gerar o pedido**, e o par "Enviar ao cliente
   * → Aprovar" não virou duas primárias porque o contrato não sustenta a
   * primeira.
   *
   * `QuoteDto.status` tem dois valores, `active` e `cancelled`. Não existe
   * "enviado": um botão `Enviar ao cliente` aqui não teria o que gravar, e a
   * etapa voltaria para trás na primeira recarga. Enviar o orçamento é
   * imprimir/mandar o PDF (`GET /api/quotes/{id}/print`), que é gesto de
   * IMPRESSÃO e mora na barra de ações — não é transição de estado, e por isso
   * não é a próxima ação.
   *
   * O que É transição existe e tem caminho: `POST /api/quotes/{id}/order`. A
   * caixa de confirmação é a mesma da listagem — gerar pedido não se desfaz.
   */
  const [convertendo, setConvertendo] = useState<OrcamentoParaConverter | null>(null)

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
      cabecalho={(orcamento) => ({
        badge: orcamento.cancelado
          ? { tom: 'void', label: 'Cancelado' }
          : orcamento.dataFechamento
            ? { tom: 'done', label: 'Fechado' }
            : { tom: 'open', label: 'Em aberto' },
        meta: [orcamento.cliente, orcamento.descricaoObra].filter(Boolean).join(' · '),
        ...(orcamento.id && !orcamento.cancelado && !readOnly
          ? {
              proximaAcao: {
                id: 'gerar-pedido',
                label: 'Gerar pedido',
                icon: FileCheck,
                onClick: () =>
                  setConvertendo({
                    id: orcamento.id,
                    number: orcamento.numero,
                    status: 'active',
                    customerName: orcamento.cliente,
                  }),
              },
            }
          : {}),
      })}
      // Cliente, andamento e validade eram campos de leitura no topo do
      // formulário, misturados com os que se preenchem.
      lateral={(orcamento) => <LateralDoOrcamento orcamento={orcamento} />}
      // O painel monta FORA do `<form>` do documento — atividade é registro
      // próprio, com gravação própria, e dentro do formulário os botões dela
      // disputariam o submit — e agora também fora da MOLDURA: a fusão v5 §3
      // cita Atividades pelo nome como o exemplo do que não pertence à
      // entidade. Em `Incluir` não há id a que pendurar atividade.
      foraDaMoldura={() => (
        <>
          {isNovo ? null : <PainelDeAtividades alvo={{ tipo: 'quote', id: orcamentoId }} />}
          <GerarPedido orcamento={convertendo} onFechar={() => setConvertendo(null)} />
        </>
      )}
    >
      {(orcamento) => <OrcamentoForm orcamento={orcamento} readOnly={readOnly} />}
    </TelaDeDocumento>
  )
}
