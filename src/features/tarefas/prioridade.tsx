import type { TaskDtoPriority } from '@/api/gerado'
import { cn } from '@/lib/utils'

/**
 * A PILL DE PRIORIDADE — a mesma no cartão do quadro e na linha da lista.
 *
 * Leva o PREENCHIMENTO FLAT com contorno preto (decisão user 2026-08-09,
 * §@paleta-flat): o degrau do meio entre a tinta /01 e a pastel /02.
 * Chip pequeno dentro de peça que já tem caixa — o fill mais saturado
 * destaca sem competir com o título ao lado, e o contorno preto (~20:1)
 * mantém a forma legível mesmo com a cor viva.
 *
 * **Vermelho em `Alta` é exceção registrada.** A cor de bloqueio tem dono —
 * erro — e a memória prevê exatamente este caso ("se usar vermelho para alta,
 * registrar a exceção"). Vale porque prioridade alta é o que TRAVA a fila do
 * dia, que é a mesma família de significado; o que a exceção não autoriza é
 * desenho vermelho ao lado, nem vermelho em qualquer outro lugar do
 * Dashboard.
 *
 * O rótulo é escrito, nunca só a cor: três chips que só diferem de tom seriam
 * ilegíveis para daltônico e mudos no leitor de tela (WCAG 1.4.1).
 *
 * `Baixa` mantém a zona pastel: não há fill flat para info na paleta, e
 * baixa prioridade é o que MENOS pede atenção — o fill saturado aqui
 * gritaria onde não precisa.
 */
const PRIORIDADES: Record<TaskDtoPriority, { rotulo: string; classe: string }> = {
  high: { rotulo: 'Alta', classe: 'bg-fill-error' },
  medium: { rotulo: 'Média', classe: 'bg-fill-focus' },
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
