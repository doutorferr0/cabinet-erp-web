import { cn } from '@/lib/utils'

/**
 * FormBlock — a forma-assinatura do agrupamento em formulário (DESIGN.md
 * §Shapes): `<fieldset>` + `<legend>` sobre a borda superior, citação direta
 * do groupbox do SoftLux. Compartimento fechado: borda em Régua, canto 4px,
 * goteira interna de 12px. O `<legend>` usa Meta (mono, caixa alta pequena)
 * — é o rótulo de compartimento, não um subtítulo.
 *
 * `legend` é opcional porque a transcrição registra molduras sem nome (§2,
 * "Bloco separado por moldura"). Compartimento sem legenda continua sendo
 * compartimento: a caixa é o agrupamento, a legenda só o nomeia.
 *
 * Blocos irmãos NUNCA compartilham parede — cada um tem caixa própria e são
 * separados por goteira de 12px (`{spacing.md}`). Parede compartilhada é
 * gramática de grade, não de compartimento.
 *
 * **Fundo afundado (1.6):** o compartimento é quase-branco, não branco. A folha
 * virou branca nesta fase e com isso caixa dentro de caixa passou a se separar
 * só pelo traço; meio grau de luz devolve o degrau sem gastar cor. E é degrau,
 * não zona: quem tem cor de verdade aqui é o bloco cujo CONTEÚDO tem dono
 * (valor, identidade, pendência), e esse recebe a zona por cima desta classe.
 */
export function FormBlock({
  legend,
  className,
  children,
}: {
  legend?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <fieldset className={cn('rounded-lg border bg-surface-sunken p-3', className)}>
      {legend ? (
        <legend className="px-1 font-mono text-[0.75rem] font-medium uppercase tracking-[0.06em] text-text-strong">
          {legend}
        </legend>
      ) : null}
      {children}
    </fieldset>
  )
}
