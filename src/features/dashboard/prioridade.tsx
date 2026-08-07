import type { TaskDtoPriority } from '@/api/gerado'
import { cn } from '@/lib/utils'

/**
 * A PILL DE PRIORIDADE — a mesma no cartão do quadro e na linha da lista.
 *
 * Leva a ZONA por conteúdo, não a cor cheia: é um chip pequeno dentro de peça
 * que já tem caixa, e cheia ali brigaria com o título ao lado.
 *
 * **Vermelho em `Alta` é exceção registrada.** A cor de bloqueio tem dono —
 * erro — e a memória prevê exatamente este caso ("se usar vermelho para alta,
 * registrar a exceção"). Vale porque prioridade alta é o que TRAVA a fila do
 * dia, que é a mesma família de significado; o que a exceção não autoriza é
 * ornamento vermelho ao lado, nem vermelho em qualquer outro lugar do
 * Dashboard.
 *
 * O rótulo é escrito, nunca só a cor: três chips que só diferem de tom seriam
 * ilegíveis para daltônico e mudos no leitor de tela (WCAG 1.4.1).
 */
const PRIORIDADES: Record<TaskDtoPriority, { rotulo: string; classe: string }> = {
  high: { rotulo: 'Alta', classe: 'bg-zone-danger' },
  medium: { rotulo: 'Média', classe: 'bg-zone-warn' },
  low: { rotulo: 'Baixa', classe: 'bg-zone-info' },
}

export function Prioridade({ prioridade }: { prioridade: TaskDtoPriority }) {
  const { rotulo, classe } = PRIORIDADES[prioridade]
  return (
    <span
      data-slot="prioridade"
      data-prioridade={prioridade}
      className={cn(
        'inline-flex items-center rounded-item border-2 px-1.5 font-mono text-[0.75rem] font-medium uppercase tracking-[0.06em]',
        classe,
      )}
    >
      {rotulo}
    </span>
  )
}
