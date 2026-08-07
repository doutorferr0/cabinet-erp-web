import type { AgendaEventDto, AgendaEventDtoKind } from '@/api/gerado'
import type { Modulo } from '@/app/modulo'
import { diaDoInstante } from '@/lib/datas'
import { cn } from '@/lib/utils'

/**
 * OS QUATRO TIPOS DE COMPROMISSO — rótulo e cor num lugar só.
 *
 * O calendário marca o dia, a legenda explica a cor e a agenda pinta a barra da
 * linha: três leituras da MESMA informação. Escritas em três lugares, elas
 * divergem — e a divergência aqui é silenciosa, porque cada uma continua
 * parecendo certa sozinha.
 *
 * Três tipos pegam a cor emprestada do MÓDULO a que pertencem (entrega é
 * estoque, orçamento é vendas, reunião é o par de compras); pagamento é
 * DINHEIRO, e dinheiro tem dono — verde, e só ele (DESIGN.md §Acentos). É o
 * único que não vem de módulo, justamente porque a regra de cor é mais forte
 * que a arrumação por módulo.
 */
export const TIPOS: Record<AgendaEventDtoKind, { rotulo: string; modulo?: Modulo }> = {
  delivery: { rotulo: 'entrega', modulo: 'estoque' },
  quote: { rotulo: 'orçamento', modulo: 'vendas' },
  meeting: { rotulo: 'reunião', modulo: 'compras' },
  payment: { rotulo: 'pagamento' },
}

/** A ordem da legenda — fixa, para o olho reencontrar a cor no mesmo lugar. */
export const TIPOS_NA_ORDEM: AgendaEventDtoKind[] = ['delivery', 'quote', 'meeting', 'payment']

/**
 * A marca de cor de um tipo. Não é ornamento — é DADO codificado em cor, e por
 * isso pode ser verde onde o significado é dinheiro.
 *
 * Cor sozinha nunca diz o que é (WCAG 1.4.1): a legenda ao lado nomeia cada
 * cor, e toda linha da agenda traz o texto do compromisso. Aqui a cor é reforço.
 */
export function MarcaDeTipo({ kind, className }: { kind: AgendaEventDtoKind; className?: string }) {
  const tipo = TIPOS[kind]
  return (
    <span
      aria-hidden="true"
      data-slot="marca-de-tipo"
      {...(tipo.modulo && { 'data-modulo': tipo.modulo })}
      className={cn('shrink-0 border-2', tipo.modulo ? 'bg-modulo-cheia' : 'bg-money', className)}
    />
  )
}

/** Os compromissos de UM dia, na ordem em que a agenda já veio (por hora). */
export function eventosDoDia(eventos: AgendaEventDto[], dia: string): AgendaEventDto[] {
  return eventos.filter((evento) => diaDoInstante(evento.startsAt) === dia)
}
