import { cn } from '@/lib/utils'

/**
 * SEÇÃO de documento (fusão v5 r4, mockup `docs/design/fusao-v5/`): a
 * caixa-filha numerada que agrupa um assunto do formulário — retângulo branco
 * de traço fino, barra de zona de 4px à esquerda (PREENCHIMENTO, não traço),
 * título em caixa pastel da mesma zona e número em Meta.
 *
 * Harmonia (referências do user, 2026-08-19): a cor entra SUAVE (zona pastel
 * no título, cheia só na barra de 4px) e o contorno + a construção idêntica
 * entre seções é o que amarra hues diferentes numa página só — pastel com
 * contorno lê como sistema; cheia em área grande lê como grito.
 *
 * Cores por ZONA (emprego fixo do repo), não por módulo: `id` identidade ·
 * `info` leitura · `warn` pendência/ajuste · `money` valor.
 */
const BARRA = {
  id: 'bg-accent',
  info: 'bg-info',
  warn: 'bg-warn',
  money: 'bg-money',
} as const

const CAIXA = {
  id: 'bg-zone-id border-accent',
  info: 'bg-zone-info border-info',
  warn: 'bg-zone-warn border-warn',
  money: 'bg-zone-money border-money',
} as const

export type SecaoCor = keyof typeof BARRA

export function Secao({
  numero,
  titulo,
  cor = 'id',
  className,
  children,
}: {
  /** Ordinal em Meta ("01", "02"…) — o mapa da página. */
  numero?: string
  titulo: string
  cor?: SecaoCor
  className?: string
  children: React.ReactNode
}) {
  return (
    <section
      data-slot="secao"
      className={cn('relative overflow-hidden rounded-card border bg-card p-4 pl-5', className)}
    >
      <span aria-hidden="true" className={cn('absolute inset-y-0 left-0 w-1', BARRA[cor])} />
      <div className="mb-3 flex items-center gap-2.5">
        <h2
          className={cn(
            'rounded-item border px-2.5 py-1 font-extrabold text-[0.8125rem] text-foreground leading-none',
            CAIXA[cor],
          )}
        >
          {titulo}
        </h2>
        {numero ? (
          <span className="font-mono text-[10px] text-muted-foreground tracking-[0.1em]">
            {numero}
          </span>
        ) : null}
        <span aria-hidden="true" className="flex-1 border-rule-hair border-t border-dashed" />
      </div>
      {children}
    </section>
  )
}
