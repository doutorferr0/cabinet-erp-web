import { cn } from '@/lib/utils'
import { LabelContext, Label as LabelPrimitive, type LabelProps } from 'react-aria-components'

/**
 * Rótulo de campo como ETIQUETA INVERTIDA (DESIGN.md §Overview, `.rot` da
 * amostra): caixa clara de traço 2px com letra preta, mono 10px, caixa alta,
 * tracking 0.12em. A força vem da borda, da caixa e do tracking — não de fundo
 * cheio, que é o que a barra preta da fundação anterior fazia.
 *
 * `w-fit` + `self-start` são parte da peça, não enfeite: a etiqueta é uma
 * caixa que embrulha o texto. Sem eles ela esticaria na largura do campo e
 * viraria uma faixa, que é outra coisa.
 *
 * Raio de ITEM (0): etiqueta encosta em campo, e canto arredondado ali abre
 * fresta. Ver §Foco para o anel — a etiqueta não é focável, quem recebe foco
 * é o controle que ela nomeia.
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
        'inline-flex w-fit items-center gap-2 self-start rounded-item border-2 border-border bg-card px-[7px] py-[2px] font-mono text-[10px] leading-none tracking-[0.12em] text-foreground uppercase select-none group-data-[disabled=true]:pointer-events-none peer-disabled:cursor-not-allowed',
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
