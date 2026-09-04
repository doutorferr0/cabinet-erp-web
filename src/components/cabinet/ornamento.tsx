import { type Modulo, moduloDaRota } from '@/app/modulo'
import { cn } from '@/lib/utils'
import { useRouter, useRouterState } from '@tanstack/react-router'

/**
 * ORNAMENTO — UMA forma só, parametrizada (Reface 2.0, D28). O 1.x montava 16 desenhos
 * de acervo lendo o `d` de cada SVG com regex: 465 linhas para dizer que Fornecedores é
 * um galpão. Sobram os anéis concêntricos do login, e o `shape` deixou de escolher
 * DESENHO para escolher o MATIZ do anel externo — a superfície pública não mudou.
 */

export type ShapeDeEstado = 'busca-vazia' | 'rota-inexistente' | 'alerta' | 'falha-rede' | 'empresa'
export type ShapeDeLugar = 'dashboard' | 'planner' | 'colaboradores' | 'tarefas'

/** O tom é o PAPEL da cor, e pinta só o FIO — `icone` herda de quem hospeda. */
const TONS = {
  modulo: 'text-modulo',
  info: 'text-info',
  erro: 'text-destructive',
  offline: 'text-offline',
  empresa: 'text-empresa',
  icone: '',
} as const

/** Matiz do anel externo: cada módulo tem o seu (auditoria §5a), o resto é lilac. */
const MATIZ =
  'compras:lilac estoque:mint produtos:mint vendas:sky crm:sand clientes:violet fornecedores:violet profissionais:violet colaboradores:violet boletim:teal'

export type TomDeOrnamento = keyof typeof TONS

export interface OrnamentoProps {
  shape: Modulo | ShapeDeEstado | ShapeDeLugar
  /** Lado em px: 12–20 como ícone · 24–360 como decoração. */
  tamanho: number
  tom: TomDeOrnamento
  className?: string
}

export function Ornamento({ shape, tamanho, tom, className }: OrnamentoProps) {
  const externo = new RegExp(` ${shape}:(\\w+)`).exec(` ${MATIZ}`)?.[1] ?? 'lilac'
  const meio = externo === 'sand' ? 'lilac' : 'sand' // dois tints iguais viram um disco só
  // Fio em px de TELA (`non-scaling-stroke`): no viewBox de 360 ele sumiria.
  const fio = { stroke: 'currentColor', vectorEffect: 'non-scaling-stroke' } as const
  const anel = { ...fio, strokeWidth: 1.5, cx: 180, cy: 180 } as const
  return (
    <svg
      aria-hidden="true"
      data-slot="ornamento"
      data-shape={shape}
      data-matiz={externo}
      viewBox="0 0 360 360"
      width={tamanho}
      height={tamanho}
      className={cn('inline-block shrink-0 overflow-visible', TONS[tom], className)}
    >
      <circle {...anel} r={150} fill={`var(--tint-${externo})`} />
      <circle {...anel} r={100} fill={`var(--tint-${meio})`} />
      <circle {...anel} r={50} fill="var(--main)" />
      <path {...fio} strokeWidth={1} d="M30 180h300M180 30v300" fill="none" strokeDasharray="3 5" />
    </svg>
  )
}

export type OrnamentoDoModuloProps = Omit<OrnamentoProps, 'shape' | 'tom'> & {
  tom?: TomDeOrnamento
}

/** O ornamento do módulo em que o operador ESTÁ — peça compartilhada não sabe qual é. */
export function OrnamentoDoModulo(props: OrnamentoDoModuloProps) {
  // `warn: false`: exigir router por decoração quebraria todo teste isolado.
  const router = useRouter({ warn: false })
  return router ? <OrnamentoDaRotaAtual {...props} /> : null
}

function OrnamentoDaRotaAtual({ tom = 'modulo', tamanho, className = '' }: OrnamentoDoModuloProps) {
  const modulo = moduloDaRota(useRouterState().location.pathname)
  return modulo ? (
    <Ornamento shape={modulo} tom={tom} tamanho={tamanho} className={className} />
  ) : null
}
