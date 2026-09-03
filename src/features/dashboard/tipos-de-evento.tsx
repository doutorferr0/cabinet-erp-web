import type { AgendaEventDto, AgendaEventDtoKind } from '@/api/gerado'
import { COR_DE_ZONA } from '@/components/cabinet/painel'
import { diaDoInstante } from '@/lib/datas'
import { cn } from '@/lib/utils'

/**
 * OS QUATRO TIPOS DE COMPROMISSO — rótulo e cor num lugar só.
 *
 * O calendário marca o dia, a legenda explica a cor e a agenda pinta a faixa da
 * linha: três leituras da MESMA informação. Escritas em três lugares, elas
 * divergem — e a divergência aqui é silenciosa, porque cada uma continua
 * parecendo certa sozinha.
 *
 * ## Reface 2.0: a cor deixou de vir do módulo e passou a vir da SEMÂNTICA
 *
 * No 1.x três tipos pegavam a cor emprestada do módulo a que pertencem (entrega
 * = estoque, orçamento = vendas, reunião = compras) e pagamento ficava com o
 * verde do dinheiro. O mockup (`docs/design/mockup-reface-hibrido-2026-09-02.html`,
 * legenda do calendário na aba Dashboard) troca isso pelos quatro tokens
 * semânticos: `--ok` entrega · `--info` orçamento · `--warn` reunião · `--main`
 * pagamento. O motivo é o da rodada inteira: a cor de módulo 1.x é a paleta neon
 * pré-2.0, e §Hierarquia dá ao módulo um quadradinho, não uma faixa de dado.
 *
 * **Uma discordância fica registrada, e não escondida.** O repo escreve que
 * "verde tem dono e o dono é dinheiro"; o mockup dá o verde à ENTREGA e o
 * chartreuse ao PAGAMENTO. Segui o mockup, porque a régua da rodada é explícita
 * — onde mockup e código divergem em desenho, o mockup vence (issue-mãe #469,
 * meta da rodada) —, e porque as quatro cores continuam distintas e nomeadas na
 * legenda. Se o user preferir manter o verde no dinheiro, a troca é uma linha
 * aqui: `payment` fica com `money` e `delivery` com `id`.
 *
 * Os valores saem de `COR_DE_ZONA` (`painel.tsx`), e não de `var(--info)` /
 * `var(--warn)` diretos: aqueles dois nomes ainda estão sombreados pelo
 * `index.css` 1.x como tripla HSL, e a faixa saía TRANSPARENTE — o defeito foi
 * medido nesta agenda, e está contado por extenso lá.
 */
export const TIPOS: Record<AgendaEventDtoKind, { rotulo: string; cor: string }> = {
  delivery: { rotulo: 'entrega', cor: COR_DE_ZONA.money },
  quote: { rotulo: 'orçamento', cor: COR_DE_ZONA.info },
  meeting: { rotulo: 'reunião', cor: COR_DE_ZONA.warn },
  payment: { rotulo: 'pagamento', cor: COR_DE_ZONA.id },
}

/** A ordem da legenda — fixa, para o olho reencontrar a cor no mesmo lugar. */
export const TIPOS_NA_ORDEM: AgendaEventDtoKind[] = ['delivery', 'quote', 'meeting', 'payment']

/**
 * A marca de cor de um tipo. Não é ornamento — é DADO codificado em cor.
 *
 * Cor sozinha nunca diz o que é (WCAG 1.4.1): a legenda ao lado nomeia cada cor,
 * e toda linha da agenda traz o texto do compromisso mais a tag do tipo por
 * escrito. Aqui a cor é reforço.
 *
 * Sem borda, e é a régua: no 1.x a marca levava `border-2` para devolver
 * contraste ao neon claro do módulo. Com token semântico não há neon para
 * corrigir, e um contorno de 2px numa peça de 4px de largura deixa a peça sendo
 * quase só contorno.
 */
export function MarcaDeTipo({ kind, className }: { kind: AgendaEventDtoKind; className?: string }) {
  return (
    <span
      aria-hidden="true"
      data-slot="marca-de-tipo"
      data-kind={kind}
      className={cn('shrink-0', className)}
      style={{ background: TIPOS[kind].cor }}
    />
  )
}

/** Os compromissos de UM dia, na ordem em que a agenda já veio (por hora). */
export function eventosDoDia(eventos: AgendaEventDto[], dia: string): AgendaEventDto[] {
  return eventos.filter((evento) => diaDoInstante(evento.startsAt) === dia)
}
