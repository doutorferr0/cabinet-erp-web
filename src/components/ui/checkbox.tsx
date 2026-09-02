import { cn } from '@/lib/utils'
import { CheckIcon, MinusIcon } from 'lucide-react'
import {
  Checkbox as CheckboxPrimitive,
  type CheckboxProps,
  composeRenderProps,
} from 'react-aria-components'

/**
 * Checkbox 2.0 (#470): 15px, canto `--r-data` (4px), traço 1.5px de controle.
 *
 * Marcado é TINTA (n-900) com o sinal em folha (`--n-0`), não chartreuse. O
 * acento é fill de ação, e um quadradinho chartreuse numa coluna de seleção
 * pinta a tabela inteira de amarelo — além de perder contraste contra a folha
 * clara. n-900/n-0 inverte sozinho no escuro: lá o fundo marcado fica claro e o
 * sinal, escuro.
 *
 * Indeterminado ganha traço próprio (`MinusIcon`), não o mesmo check do
 * marcado: "alguns selecionados" e "todos selecionados" são estados diferentes
 * e a tabela precisa que se leiam diferente no cabeçalho.
 *
 * Desabilitado (§Desabilitado): apaga o QUADRADO (`marca-desabilitada`), nunca
 * o rótulo.
 */
function Checkbox({ className, children, ...props }: CheckboxProps) {
  return (
    <CheckboxPrimitive
      data-slot="checkbox"
      className={composeRenderProps(className, (className) =>
        cn(
          'group/checkbox t-corpo flex items-center gap-2 outline-none data-[disabled]:cursor-not-allowed',
          className,
        ),
      )}
      {...props}
    >
      {composeRenderProps(children, (children, { isSelected, isIndeterminate }) => (
        <>
          <span
            data-slot="checkbox-indicator"
            className="marca-desabilitada grid size-[15px] shrink-0 place-content-center rounded-[var(--r-data)] border-[1.5px] border-[color:var(--n-300)] bg-[color:var(--n-0)] text-[color:var(--n-0)] transition-colors group-data-focus-visible/checkbox:focus-ring group-data-selected/checkbox:border-[color:var(--n-900)] group-data-selected/checkbox:bg-[color:var(--n-900)] group-data-indeterminate/checkbox:border-[color:var(--n-900)] group-data-indeterminate/checkbox:bg-[color:var(--n-900)] [&>svg]:size-3 [&>svg]:stroke-[3]"
          >
            {isIndeterminate ? <MinusIcon /> : isSelected ? <CheckIcon /> : null}
          </span>
          {children}
        </>
      ))}
    </CheckboxPrimitive>
  )
}

export { Checkbox }
