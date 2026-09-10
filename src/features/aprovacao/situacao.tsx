import type { ApprovalRequestStatus } from '@/api/gerado'
import { cn } from '@/lib/utils'

/**
 * A situação do pedido, escrita — nunca só a cor.
 *
 * Mesmo desenho da `Prioridade` das tarefas, e pela mesma razão (WCAG 1.4.1):
 * três chips que só diferissem de tom seriam ilegíveis para daltônico e mudos
 * no leitor de tela. Aqui pesa mais que lá — "aprovado" e "recusado" são o
 * oposto um do outro, e a fila é lida de relance.
 *
 * `Pendente` fica na zona pastel de propósito: é o estado que ESPERA, e o fill
 * saturado o poria gritando ao lado das duas decisões, que são o fato.
 *
 * Os dois fills saem da paleta travada, sem token novo: `fill-money` é o verde
 * que a folha reserva para o DONO dinheiro, e liberar desconto é exatamente
 * isso — dinheiro que saiu da margem por decisão de alguém.
 */
const SITUACOES: Record<ApprovalRequestStatus, { rotulo: string; classe: string }> = {
  pending: { rotulo: 'Pendente', classe: 'bg-zone-warn' },
  approved: { rotulo: 'Aprovado', classe: 'bg-fill-money' },
  rejected: { rotulo: 'Recusado', classe: 'bg-fill-error' },
}

export function SituacaoDoPedido({ situacao }: { situacao: ApprovalRequestStatus }) {
  const { rotulo, classe } = SITUACOES[situacao]
  return (
    <span
      data-slot="situacao-da-aprovacao"
      data-situacao={situacao}
      className={cn(
        'inline-flex items-center rounded-item border-2 px-1.5 font-medium font-mono text-[0.75rem] uppercase tracking-[0.06em]',
        classe,
      )}
    >
      {rotulo}
    </span>
  )
}

/** O rótulo por extenso — para frase corrida, onde a pílula não cabe. */
export function rotuloDaSituacao(situacao: ApprovalRequestStatus): string {
  return SITUACOES[situacao].rotulo
}
