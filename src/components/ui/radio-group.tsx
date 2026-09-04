import { cn } from '@/lib/utils'
import {
  RadioGroup as RadioGroupPrimitive,
  type RadioGroupProps,
  Radio as RadioPrimitive,
  type RadioProps,
  composeRenderProps,
} from 'react-aria-components'

function RadioGroup({ className, ...props }: RadioGroupProps) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={composeRenderProps(className, (className) =>
        // Irmãos separados por `gap`, nunca por margem própria (§Hierarquia,
        // ferramenta 1: espaço). `--s-2` = 8px.
        cn('grid w-full gap-2', className),
      )}
      {...props}
    />
  )
}

/**
 * Opção exclusiva (○/●). O rótulo é `children` — a RAC associa sozinha.
 * Círculo é a única exceção ao canto reto: ● é vocabulário, não decoração.
 *
 * Reface 2.0 (#470): traço 1.5px de controle e ponto em TINTA, não em
 * chartreuse — o acento é fill de ação, e um ponto de 8px em amarelo-limão
 * sobre folha clara é o pior contraste do sistema justamente no elemento que
 * diz qual opção está escolhida. Mesmo vocabulário do `Checkbox`.
 *
 * O radio só sobrevive onde há escolha exclusiva DE FATO; escolha de modo
 * (lista/quadro, compacta/confortável) é `Segmented`, não três bolinhas.
 *
 * Desabilitado (§Desabilitado): apaga o CÍRCULO (`marca-desabilitada`), nunca o
 * rótulo — e o ponto de dentro fica, porque ele é a escolha, não o estado.
 */
function RadioGroupItem({ className, children, ...props }: RadioProps) {
  return (
    <RadioPrimitive
      data-slot="radio-group-item"
      className={composeRenderProps(className, (className) =>
        cn(
          'group/radio t-corpo flex items-center gap-2 outline-none data-[disabled]:cursor-not-allowed',
          className,
        ),
      )}
      {...props}
    >
      {composeRenderProps(children, (children, { isSelected }) => (
        <>
          <span
            data-slot="radio-group-indicator"
            className="marca-desabilitada relative flex size-[15px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-[color:var(--n-300)] bg-[color:var(--n-0)] transition-colors group-data-focus-visible/radio:focus-ring group-data-selected/radio:border-[color:var(--n-900)]"
          >
            {isSelected && <span className="size-2 rounded-full bg-[color:var(--n-900)]" />}
          </span>
          {children}
        </>
      ))}
    </RadioPrimitive>
  )
}

export { RadioGroup, RadioGroupItem }
