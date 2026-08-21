import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

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

/** Tinta do NÚMERO ordinal — display condensado na cor da zona (r5). */
const NUMERO = {
  id: 'text-accent',
  info: 'text-info',
  warn: 'text-warn',
  money: 'text-money',
} as const

export type SecaoCor = keyof typeof BARRA

export function Secao({
  numero,
  titulo,
  cor = 'id',
  icone: Icone,
  nota,
  className,
  children,
}: {
  /** Símbolo da seção, traço preto sobre a caixa pastel (referências r5). */
  icone?: LucideIcon
  /** Meia-frase em serifa itálica ao lado do título — a voz editorial (r7). */
  nota?: string
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
            'inline-flex items-center gap-1.5 rounded-item border px-2.5 py-1 font-extrabold text-[0.875rem] text-foreground leading-none',
            CAIXA[cor],
          )}
        >
          {Icone ? <Icone aria-hidden="true" className="size-3.5 shrink-0" /> : null}
          {titulo}
        </h2>
        {numero ? (
          <span
            className={cn(
              'font-[family-name:var(--font-display-condensada)] text-[1.125rem] leading-none tracking-[0.06em]',
              NUMERO[cor],
            )}
          >
            {numero}
          </span>
        ) : null}
        {nota ? (
          <span className="font-[family-name:var(--font-nome)] text-[0.875rem] text-muted-foreground italic">
            {nota}
          </span>
        ) : null}
        <span aria-hidden="true" className="flex-1 border-rule-hair border-t border-dashed" />
      </div>
      {children}
    </section>
  )
}
