import { cn } from '@/lib/utils'
import type { Apodrecimento } from './apodrecimento'
import { descricaoDoApodrecimento } from './apodrecimento'

/**
 * O selo de apodrecimento — anatomia de CARIMBO (DESIGN.md §Stamp): caixa de
 * traço 2px, canto reto, conteúdo em Meta.
 *
 * ## Por que não o `<Stamp>` compartilhado
 *
 * Os quatro tons dele (`neutral`/`open`/`done`/`void`) são de SITUAÇÃO de
 * documento, e usar `open` (amarelo) para "perto de apodrecer" diria que o
 * negócio está aberto — que é verdade e é outra coisa. Dois significados no
 * mesmo tom apagam os dois.
 *
 * ## As cores são as ZONAS que já existem
 *
 * `--zone-warn` e `--zone-danger`, os mesmos pastéis /02 que a coluna de ganho
 * e a de perda já usam. Nenhuma cor nova, como a issue pede.
 *
 * **Quem delimita é o traço preto, não o pastel.** A medição da #73 mediu que
 * os oito /02 reprovam 3:1 contra as duas superfícies — a reprovação é
 * condicional ao contorno, e aqui ele está, em 2px. O TEXTO é que carrega o
 * contraste, e ele é `text-foreground` sobre o pastel: passa com folga nos dois
 * temas.
 *
 * ## E a cor não é a única forma de ler
 *
 * O número está escrito (`12/7 D` = doze dias parado, limite sete), a razão
 * maior que 1 já diz "passou", e o `title` mais o texto acessível dizem a
 * frase inteira. Um cartão apodrecido continua legível em monocromático e em
 * leitor de tela.
 */
const TONS: Record<'perto' | 'apodrecido', string> = {
  perto: 'bg-zone-warn',
  apodrecido: 'bg-zone-danger',
}

export function SeloDeApodrecimento({
  apodrecimento,
  className,
}: {
  apodrecimento: Apodrecimento
  className?: string
}) {
  // `fresco` não desenha nada: sinal em todo cartão vira ruído de fundo, e o
  // operador para de vê-lo justamente onde ele importa.
  if (apodrecimento.estado === 'fresco') return null

  const descricao = descricaoDoApodrecimento(apodrecimento)
  return (
    <span
      data-slot="apodrecimento"
      data-estado={apodrecimento.estado}
      title={descricao}
      className={cn(
        'inline-flex items-center border-2 px-1 font-bold font-mono text-[0.75rem] text-foreground tabular-nums tracking-[0.07em]',
        TONS[apodrecimento.estado],
        className,
      )}
    >
      {/* O número é para o olho; a frase inteira, para quem ouve. `aria-hidden`
          no visual evita o leitor ler "doze barra sete dê" antes da frase. */}
      <span aria-hidden="true">
        {apodrecimento.dias}/{apodrecimento.limite} D
      </span>
      <span className="sr-only">{descricao}</span>
    </span>
  )
}
