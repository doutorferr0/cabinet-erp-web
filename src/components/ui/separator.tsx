import { cn } from '@/lib/utils'
import { Separator as SeparatorPrimitive } from 'react-aria-components'

/**
 * HAIRLINE — a segunda das quatro ferramentas de separação do §Hierarquia, e a
 * única que este componente representa.
 *
 * Reface 2.0 (#470): a cor sai de `--border` (que na 1.x era o traço de
 * CONTROLE, mais escuro) e passa a ser `--n-200`, o degrau que existe só para
 * dividir item de lista e separar header de corpo dentro de um card. Um
 * separador na mesma tinta da borda de um campo compete com os controles à
 * volta; o degrau de hairline some quando não se olha para ele, que é o que um
 * divisor deve fazer.
 *
 * A régua que vale para quem monta: **nunca duas hairlines encostadas, nunca
 * hairline + fundo diferente na mesma fronteira**. Onde a fronteira já é tint
 * (header de tabela, rodapé de totais) ou espaço, este componente não entra.
 */
function Separator({
  className,
  orientation = 'horizontal',
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive>) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      className={cn(
        'block shrink-0 border-0 bg-[color:var(--n-200)] aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full aria-[orientation=vertical]:w-px aria-[orientation=vertical]:self-stretch',
        className,
      )}
      {...props}
    />
  )
}

export { Separator }
