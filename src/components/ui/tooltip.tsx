import { cn } from '@/lib/utils'
import * as React from 'react'
import {
  Focusable,
  Tooltip as TooltipPrimitive,
  TooltipTrigger as TooltipTriggerPrimitive,
} from 'react-aria-components'

function TooltipTrigger({
  delay = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipTriggerPrimitive>) {
  const [trigger, tooltip] = React.Children.toArray(children)

  return (
    <TooltipTriggerPrimitive data-slot="tooltip-trigger" delay={delay} {...props}>
      <Focusable>{trigger as React.ComponentProps<typeof Focusable>['children']}</Focusable>
      {tooltip}
    </TooltipTriggerPrimitive>
  )
}

/**
 * DICA — a etiqueta curta que aparece ao pousar sobre um controle.
 *
 * ## O que o 2.0 tirou (D29)
 *
 * 1. **A seta.** Era um quadrado girado 45° encostado na borda, e existia para
 *    dizer de QUAL controle a caixa falava quando havia vizinhos a 8px — o caso
 *    da sidebar colapsada. O 2.0 resolve isso com distância: `offset` de 6px
 *    mantém a caixa colada no gatilho, e o gatilho fica realçado enquanto a
 *    dica está aberta. A seta custava uma peça posicionada à mão em quatro
 *    direções, com meio pixel de sobreposição para não abrir fresta.
 * 2. **Caixa alta e mono.** §Hierarquia: caixa alta só em `--t-rotulo`, e mono
 *    só para o que se copia, compara ou soma. A dica é uma frase curta — nem
 *    rótulo de coluna, nem dado. Em versalete ela ainda pedia mais atenção que
 *    o botão que a disparou.
 *
 * ## Por que a tipografia é literal aqui, e não `t-*`
 *
 * A dica é **superfície invertida**: tinta n-900 com letra na cor da folha. As
 * utilities `--t-*` carregam tamanho, peso E COR (§Hierarquia, coluna "Cor"), e
 * todas as cores da régua são tintas escuras sobre papel — aplicá-las aqui
 * pintaria letra escura sobre fundo escuro. O tamanho segue o degrau
 * `--t-meta` (12), só sem a cor dele. Mesma situação vale para qualquer peça
 * de fundo invertido; se aparecer uma terceira, vira variante na régua.
 */
function Tooltip({
  className,
  placement = 'top',
  offset = 6,
  crossOffset = 0,
  children,
  ...props
}: Omit<React.ComponentProps<typeof TooltipPrimitive>, 'children' | 'className'> & {
  className?: string
  children?: React.ReactNode
}) {
  return (
    <TooltipPrimitive
      data-slot="tooltip-content"
      placement={placement}
      offset={offset}
      crossOffset={crossOffset}
      className={cn(
        'z-50 inline-flex w-fit max-w-xs origin-(--trigger-anchor-point) items-center gap-1.5',
        // Raio 4 (`rounded-data`) e folha sobre tinta: a dica é a peça mais
        // leve do sistema e não leva borda nem sombra — quem a separa do fundo
        // é o contraste da própria tinta.
        'rounded-data bg-foreground px-2 py-1 text-background',
        'pop-spring text-xs font-medium',
        className,
      )}
      {...props}
    >
      {children}
    </TooltipPrimitive>
  )
}

export { Tooltip, TooltipTrigger }
