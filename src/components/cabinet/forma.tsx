import { type Modulo, moduloDaRota } from '@/app/modulo'
import { cn } from '@/lib/utils'
import { useRouter, useRouterState } from '@tanstack/react-router'

/**
 * FORMA — o sistema gráfico da marca (Reface 2.0, D35 · pesquisa §1). A marca é duas casas
 * concêntricas em contorno, e isso já é gramática: **contorno duplo, concêntrico, sem
 * preenchimento, cantos vivos**. Uma forma por módulo serve vazio, 404, login, hub, favicon e
 * loading, no lugar das 465 linhas da peça que morreu (16 desenhos de acervo lidos por regex).
 */
export type TipoDeForma = 'casa' | 'caixa' | 'quadrado' | 'seta' | 'funil' | 'circulo' | 'barras'

/** Externa → interna, no viewBox de 64. A casa tem o nível do meio: é a marca do login. */
export const FORMAS: Record<TipoDeForma, readonly string[]> = {
  casa: ['M32 5 L59 26 V59 H5 V26 Z', 'M32 16 L50 30 V50 H14 V30 Z', 'M32 21 L46 32 V46 H18 V32 Z'],
  caixa: ['M32 4 L58 18 V46 L32 60 L6 46 V18 Z', 'M32 20 L45 27 V41 L32 48 L19 41 V27 Z'],
  quadrado: ['M6 6 H58 V58 H6 Z', 'M20 20 H44 V44 H20 Z'],
  seta: ['M8 32 L32 6 L56 32 L44 32 V58 H20 V32 Z', 'M22 32 L32 21 L42 32 L37 32 V46 H27 V32 Z'],
  funil: ['M6 8 H58 L38 34 V56 L26 60 V34 Z', 'M20 18 H44 L34 32 V44 L30 46 V32 Z'],
  circulo: ['M6 32a26 26 0 1 0 52 0a26 26 0 1 0-52 0', 'M20 32a12 12 0 1 0 24 0a12 12 0 1 0-24 0'],
  barras: ['M6 58 V38 H23 V24 H40 V10 H58 V58 Z', 'M18 46 H27 V36 H37 V26 H46 V46 Z'],
}

/** Módulo → forma e matiz. `relatorios` é rota e não `Modulo`: pede `barras` na mão. */
export const DO_MODULO: Record<Modulo, readonly [TipoDeForma, string]> = {
  boletim: ['casa', 'hoje'],
  clientes: ['circulo', 'pessoas'],
  fornecedores: ['circulo', 'pessoas'],
  profissionais: ['circulo', 'pessoas'],
  compras: ['caixa', 'compras'],
  estoque: ['quadrado', 'estoque'],
  produtos: ['quadrado', 'produtos'],
  vendas: ['seta', 'vendas'],
  crm: ['funil', 'crm'],
}

/** Fio em px de TELA (5/4 em 64 · 4/3 em 120 · 7/6/5 em 360, e 2/1.5 no papel de ícone): o mesmo `d` serve o selo de 12 e a marca de 360, e traço que escala some num e vira mancha no outro. */
const fioDe = (t: number) =>
  t >= 360 ? [7, 6, 5] : t >= 120 ? [4, 3] : t >= 48 ? [5, 4] : [2, 1.5]

const RESPIRA =
  '/*fill-box faz 50% 50% ser o centro do path, não o do svg*/[data-respira]{animation:forma-respira 2.4s ease-in-out infinite;transform-origin:50% 50%;transform-box:fill-box}@keyframes forma-respira{0%,100%{transform:scale(1)}50%{transform:scale(.94)}}@media (prefers-reduced-motion:reduce){[data-respira]{animation:none}}'

export interface FormaProps {
  tipo: TipoDeForma
  tamanho?: number
  /** Token (`--mod-compras`): tinge a externa a 18% e a interna a 55%. Sem ele, só traço. */
  tint?: string
  /** Três níveis em vez de dois — só a casa tem o do meio, e ele é a marca do login. */
  niveis?: 2 | 3
  /** A interna respira (loading); desliga sozinha em `prefers-reduced-motion`. */
  respira?: boolean
  className?: string
}

export function Forma({ tipo, tamanho = 64, tint, niveis = 2, respira, className }: FormaProps) {
  const todas = FORMAS[tipo]
  const camadas = niveis === 3 && todas.length === 3 ? todas : [todas[0], todas.at(-1) as string]
  const fio = fioDe(tamanho)
  const op = camadas.length === 3 ? [18, 55, 100] : [18, 55]
  const classe = cn('inline-block shrink-0 stroke-current [stroke-linejoin:miter]', className)
  const svg = { 'data-slot': 'forma', 'data-tipo': tipo, viewBox: '0 0 64 64' }
  return (
    <svg {...svg} aria-hidden="true" width={tamanho} height={tamanho} className={classe}>
      {respira ? <style>{RESPIRA}</style> : null}
      {camadas.map((d, i) => (
        <path
          key={d}
          d={d}
          strokeWidth={fio[i] ?? fio.at(-1)}
          vectorEffect="non-scaling-stroke"
          fill={tint ? `color-mix(in oklab, var(${tint}) ${op[i]}%, transparent)` : 'none'}
          data-respira={respira && i === camadas.length - 1 ? '' : undefined}
        />
      ))}
    </svg>
  )
}

/** A forma do módulo em que o operador ESTÁ; rota sem módulo cai na casa, que é a marca. */
export function FormaDoModulo(props: Omit<FormaProps, 'tipo' | 'tint'>) {
  // `warn: false`: exigir router por decoração quebraria todo teste isolado.
  return useRouter({ warn: false }) ? <FormaDaRotaAtual {...props} /> : null
}

function FormaDaRotaAtual(props: Omit<FormaProps, 'tipo' | 'tint'>) {
  const modulo = moduloDaRota(useRouterState().location.pathname)
  const [tipo, matiz] = DO_MODULO[modulo ?? 'boletim']
  return <Forma tipo={tipo} tint={`--mod-${matiz}`} {...props} />
}
