import type { Modulo } from '@/app/modulo'
import { cn } from '@/lib/utils'
import { DO_MODULO, Forma } from './forma'

/**
 * SELO — a forma do módulo dentro de uma caixa própria.
 *
 * Vem do mockup `mockup-dashboard-cores.html` (user, 07/08/2026), onde é a peça
 * que mais se repete: cada KPI, cada cabeçalho de painel e cada cabeçalho de
 * coluna carrega um quadrado com contorno e um shape colorido dentro.
 *
 * ## Por que a caixa, se a forma já sabe se pintar
 *
 * Porque o preenchimento colorido chegou ao FUNDO da região. Uma forma tingida
 * pousada direto sobre a tinta do mesmo módulo é a mesma matiz duas vezes, e o
 * desenho perde o recorte — foi por isso que o mockup pôs papel branco e
 * contorno em volta de todos eles. A caixa é o que devolve à forma o contraste
 * que a superfície tirou.
 *
 * ## O teto de "um desenho grande por região" continua valendo
 *
 * O teto (memória, §desenho por região) existe contra POLUIÇÃO — desenhos grandes disputando a
 * mesma leitura. O selo é papel de ÍCONE, o mesmo caso já registrado na fileira
 * de KPIs: cada forma marca um MÓDULO diferente, e é a variação que faz a
 * fileira se ler como mapa. Por isso a escala aqui para em 24px de desenho, e
 * nesse degrau a `<Forma>` afina o fio para 2/1.5 — contorno duplo com o fio de
 * 64px viraria mancha.
 *
 * **Decoração declarada:** `aria-hidden`. Quem carrega o sentido é o texto ao
 * lado, sempre — selo sozinho seria um rótulo mudo no leitor de tela.
 */
const TAMANHOS = {
  /** Linha de lista, cabeçalho de coluna, chip. */
  sm: { caixa: 'size-[22px] rounded-item', forma: 12 },
  /** Cabeçalho de painel — o padrão. */
  md: { caixa: 'size-[26px] rounded-item', forma: 14 },
  /** Âncora de região: o cartão de indicador. Leva elevação, como toda peça solta. */
  lg: { caixa: 'size-[42px] rounded-card shadow-el1', forma: 24 },
} as const

export type TamanhoDeSelo = keyof typeof TAMANHOS

export interface SeloProps {
  /** O selo é sempre de um MÓDULO: é a única coisa que a forma sabe dizer. */
  modulo: Modulo
  tamanho?: TamanhoDeSelo
  className?: string
}

export function Selo({ modulo, tamanho = 'md', className }: SeloProps) {
  const escala = TAMANHOS[tamanho]
  const [tipo, matiz] = DO_MODULO[modulo]

  return (
    <span
      aria-hidden="true"
      data-slot="selo"
      data-tamanho={tamanho}
      // `bg-card`, e não a superfície da região: o papel branco é justamente o
      // que separa o shape do preenchimento colorido por baixo.
      className={cn('grid shrink-0 place-content-center border-2 bg-card', escala.caixa, className)}
    >
      <Forma tipo={tipo} tint={`--mod-${matiz}`} tamanho={escala.forma} />
    </span>
  )
}
