import type { Modulo } from '@/app/modulo'
import { cn } from '@/lib/utils'
import { Ornamento, type ShapeDeEstado, type TomDeOrnamento } from './ornamento'

/**
 * SELO — o ornamento dentro de uma caixa própria. Reface 2.0, #471 (D3).
 *
 * Vem do mockup `mockup-dashboard-cores.html` (user, 07/08/2026), onde é a peça
 * que mais se repete: cada KPI, cada cabeçalho de painel e cada cabeçalho de
 * coluna carrega um quadrado com um shape colorido dentro.
 *
 * ## A caixa continua; a BORDA saiu
 *
 * A caixa existe porque o preenchimento colorido chegou ao FUNDO da região: um
 * ornamento em cheia /01 pousado direto sobre a pastel /02 do mesmo módulo é a
 * mesma matiz duas vezes, e o desenho perde o recorte. O papel branco é o que
 * devolve ao shape o contraste que a superfície tirou — isso não mudou.
 *
 * O que mudou é COMO a caixa se separa do que está atrás. A 1.x usava `border-2`
 * preta. A §Hierarquia da 2.0 admite **uma ferramenta de separação por
 * fronteira**, e a mais barata que resolve esta é a sombra dura de 1px — a
 * mesma do `<Badge>`, o que faz selo e badge se lerem como peças da mesma
 * família em vez de dois sistemas de recorte na mesma linha. A meta da rodada é
 * explícita: nada com borda.
 *
 * O `lg` é a exceção e não é inconsistência: ele é o KPI, a âncora de região, e
 * a §Hierarquia reserva a sombra dura de tinta (`--hard-1`) para KPI e painel
 * de página. Ele já tem a sua ferramenta — somar a de 1px seriam duas na mesma
 * fronteira.
 *
 * ## O teto de "um ornamento por região" continua valendo
 *
 * O teto (§@ornamentos) existe contra POLUIÇÃO — desenhos grandes disputando a
 * mesma leitura. O selo é papel de ÍCONE: cada shape marca um LUGAR diferente, e
 * é a variação que faz a fileira se ler como mapa. Por isso a escala aqui para
 * em 24px de desenho.
 *
 * **Decoração declarada:** `aria-hidden`. Quem carrega o sentido é o texto ao
 * lado, sempre — selo sozinho seria um rótulo mudo no leitor de tela. Mesma
 * regra do `<Monograma>`, que é a peça irmã: caixa de 26px marcando um lugar,
 * uma com shape, a outra com as iniciais.
 */
const TAMANHOS = {
  /** Linha de lista, cabeçalho de coluna, chip. */
  sm: {
    caixa:
      'size-[22px] rounded-[var(--r-item)] shadow-[0_1px_0_0_color-mix(in_oklab,var(--n-900)_18%,transparent)]',
    ornamento: 12,
  },
  /** Cabeçalho de painel — o padrão. */
  md: {
    caixa:
      'size-[26px] rounded-[var(--r-item)] shadow-[0_1px_0_0_color-mix(in_oklab,var(--n-900)_18%,transparent)]',
    ornamento: 14,
  },
  /** Âncora de região: o cartão de indicador. Leva a sombra dura de KPI. */
  lg: { caixa: 'size-[42px] rounded-[var(--r-card)] shadow-[var(--hard-1)]', ornamento: 24 },
} as const

export type TamanhoDeSelo = keyof typeof TAMANHOS

export interface SeloProps {
  shape: Modulo | ShapeDeEstado
  tamanho?: TamanhoDeSelo
  /**
   * Papel da cor do shape. O padrão lê a cheia /01 do `[data-modulo]` do escopo
   * — é o que faz o mesmo selo sair cyan em Produtos e coral no Boletim sem
   * receber cor nenhuma.
   */
  tom?: TomDeOrnamento
  className?: string
}

export function Selo({ shape, tamanho = 'md', tom = 'modulo', className }: SeloProps) {
  const escala = TAMANHOS[tamanho]

  return (
    <span
      aria-hidden="true"
      data-slot="selo"
      data-tamanho={tamanho}
      // `bg-[var(--n-0)]`, e não a superfície da região: o papel branco é justamente o
      // que separa o shape do preenchimento colorido por baixo.
      className={cn('grid shrink-0 place-content-center bg-[var(--n-0)]', escala.caixa, className)}
    >
      <Ornamento shape={shape} tom={tom} tamanho={escala.ornamento} />
    </span>
  )
}
