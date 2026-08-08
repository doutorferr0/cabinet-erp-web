import type { Modulo } from '@/app/modulo'
import { cn } from '@/lib/utils'
import { Ornamento, type ShapeDeEstado, type TomDeOrnamento } from './ornamento'

/**
 * SELO — o ornamento dentro de uma caixa própria.
 *
 * Vem do mockup `mockup-dashboard-cores.html` (user, 07/08/2026), onde é a peça
 * que mais se repete: cada KPI, cada cabeçalho de painel e cada cabeçalho de
 * coluna carrega um quadrado com contorno e um shape colorido dentro.
 *
 * ## Por que a caixa, se o ornamento já sabe se pintar
 *
 * Porque o preenchimento colorido chegou ao FUNDO da região. Um ornamento em
 * cheia /01 pousado direto sobre a pastel /02 do mesmo módulo é a mesma matiz
 * duas vezes, e o desenho perde o recorte — foi por isso que o mockup pôs papel
 * branco e contorno em volta de todos eles. A caixa é o que devolve ao shape o
 * contraste que a superfície tirou.
 *
 * ## O teto de "um ornamento por região" continua valendo
 *
 * O teto (§@ornamentos) existe contra POLUIÇÃO — desenhos grandes disputando a
 * mesma leitura. O selo é papel de ÍCONE, o mesmo caso já registrado na fileira
 * de KPIs e na fileira da sidebar: cada shape marca um LUGAR diferente, e é a
 * variação que faz a fileira se ler como mapa. Por isso a escala aqui para em
 * 24px de desenho, dentro dos 12–20 do papel de ícone mais o `lg` de 24 que a
 * faixa de indicadores usa como âncora da região.
 *
 * **Decoração declarada:** `aria-hidden`. Quem carrega o sentido é o texto ao
 * lado, sempre — selo sozinho seria um rótulo mudo no leitor de tela.
 */
const TAMANHOS = {
  /** Linha de lista, cabeçalho de coluna, chip. */
  sm: { caixa: 'size-[22px] rounded-item', ornamento: 12 },
  /** Cabeçalho de painel — o padrão. */
  md: { caixa: 'size-[26px] rounded-item', ornamento: 14 },
  /** Âncora de região: o cartão de indicador. Leva elevação, como toda peça solta. */
  lg: { caixa: 'size-[42px] rounded-card shadow-el1', ornamento: 24 },
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
      // `bg-card`, e não a superfície da região: o papel branco é justamente o
      // que separa o shape do preenchimento colorido por baixo.
      className={cn('grid shrink-0 place-content-center border-2 bg-card', escala.caixa, className)}
    >
      <Ornamento shape={shape} tom={tom} tamanho={escala.ornamento} />
    </span>
  )
}
