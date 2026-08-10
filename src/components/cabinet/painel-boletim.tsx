import { cn } from '@/lib/utils'

export type CorDoPainel = 'boletim' | 'foco' | 'cadastros'

/**
 * A cor da moldura vem de UMA de duas fontes, nunca de literal na classe.
 *
 * - **`modulo`** — a região fala de um módulo do sistema, e a moldura lê o
 *   `--modulo-01` daquele par pelo `border-double-modulo`. `cadastros` empresta
 *   o azure do Estoque pelo mesmo mecanismo de `aparencia` que já rege
 *   Dashboard (empresta Boletim) e Colaboradores (empresta Clientes) em
 *   `navigation.ts` — nenhuma nona cor inventada.
 * - **`tinta`** — a região é um ESTADO, não um módulo: pendência lê a zona
 *   `warn`, que é a família que já significa foco no repo.
 *
 * Literal de cor na classe (era `border-[hsl(206,100%,50%)]`) sai porque a
 * recalibração de paleta e o modo escuro mexem no token, não no consumidor: o
 * hex ficaria parado enquanto o resto da tela andasse.
 */
const CORES: Record<CorDoPainel, { modulo?: string; classe: string }> = {
  boletim: { modulo: 'boletim', classe: 'border-double-modulo' },
  foco: { classe: 'border-2 border-warn outline outline-1 outline-warn outline-offset-[3px]' },
  cadastros: { modulo: 'estoque', classe: 'border-double-modulo' },
}

/**
 * PainelBoletim — moldura dupla colorida com legend vazado na borda
 * (REFACE Boletim, decisão user 2026-08-07).
 *
 * A cor da moldura varia por região: laranja do Boletim no movimento,
 * amarelo de foco nas pendências, azul nos cadastros. Interior com papel
 * quadriculado (bg-paper-grid).
 *
 * **A legenda é a MESMA do `FormBlock`** — Meta (mono, caixa alta pequena) em
 * `text-strong`. Os dois componentes falam a mesma gramática de compartimento e
 * divergir na tinta da legenda faria a tela de Boletim parecer de outro sistema.
 *
 * Depois do Boletim, este componente propaga para Dashboard e Planner.
 */
export function PainelBoletim({
  cor,
  legend,
  className,
  children,
}: {
  cor: CorDoPainel
  legend?: string
  className?: string
  children: React.ReactNode
}) {
  const cfg = CORES[cor]

  return (
    <fieldset
      {...(cfg.modulo ? { 'data-modulo': cfg.modulo } : {})}
      className={cn('rounded-lg bg-paper-grid p-3', cfg.classe, className)}
    >
      {legend ? (
        <legend className="px-1 font-mono text-[0.75rem] font-medium uppercase tracking-[0.06em] text-text-strong">
          {legend}
        </legend>
      ) : null}
      {children}
    </fieldset>
  )
}
