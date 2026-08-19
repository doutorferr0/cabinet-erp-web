import { cn } from '@/lib/utils'
import { LabelContext, Label as LabelPrimitive, type LabelProps } from 'react-aria-components'

/**
 * Rótulo de campo DISCRETO (fusão v5, decisão do user 2026-08-19 — supersede a
 * etiqueta invertida da fase 1.5): sem caixa, sem borda, sem mono. Sans 10px
 * bold, caixa alta, tracking 0.1em, tinta secundária. O diagnóstico que abriu a
 * fusão foi literalmente este: o rótulo-caixa gritava mais que o VALOR do
 * campo — vinte telas × dezenas de campos com a moldura mais barulhenta que o
 * dado. O rótulo agora sussurra; quem fala é o conteúdo.
 *
 * `w-fit` + `self-start` continuam: o rótulo embrulha o próprio texto e não
 * estica na largura do campo.
 *
 * Com o campo desabilitado a etiqueta NÃO muda (§Desabilitado): ela é o que diz
 * o que o campo é, e apagá-la tira o nome do dado justamente quando o operador
 * não pode mexer nele. Era `peer-disabled:opacity-50` + `group-…:opacity-50`.
 * Conferido em render no modo consulta de Produtos: etiqueta nítida sobre campo
 * apagado lê melhor do que os dois apagados juntos.
 */
function Label({ className, htmlFor, slot, ...props }: LabelProps) {
  const label = (
    <LabelPrimitive
      data-slot="label"
      className={cn(
        'inline-flex w-fit items-center gap-2 self-start font-sans text-[10px] font-bold leading-none tracking-[0.1em] text-muted-foreground uppercase select-none group-data-[disabled=true]:pointer-events-none peer-disabled:cursor-not-allowed',
        className,
      )}
      {...props}
      htmlFor={htmlFor}
      slot={slot}
    />
  )

  // Com htmlFor explícito, sai do contexto da RAC (associação manual).
  if (htmlFor && slot === undefined) {
    return <LabelContext.Provider value={null}>{label}</LabelContext.Provider>
  }

  return label
}

export { Label }
