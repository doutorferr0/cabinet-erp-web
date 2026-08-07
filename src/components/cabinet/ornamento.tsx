import { type Modulo, moduloDaRota } from '@/app/modulo'
import brutalist022 from '@/assets/brutalist/brutalist-022.svg?url'
import brutalist029 from '@/assets/brutalist/brutalist-029.svg?url'
import brutalist064 from '@/assets/brutalist/brutalist-064.svg?url'
import brutalist072 from '@/assets/brutalist/brutalist-072.svg?url'
import shape128 from '@/assets/brutalist/brutalist-shape-128.svg?url'
import shape133 from '@/assets/brutalist/brutalist-shape-133.svg?url'
import shape135 from '@/assets/brutalist/brutalist-shape-135.svg?url'
import shape159 from '@/assets/brutalist/brutalist-shape-159.svg?url'
import shape160 from '@/assets/brutalist/brutalist-shape-160.svg?url'
import shape193 from '@/assets/brutalist/brutalist-shape-193.svg?url'
import { cn } from '@/lib/utils'
import { useRouter, useRouterState } from '@tanstack/react-router'

/**
 * ORNAMENTO — a forma decorativa que dá cara a um módulo e a um estado.
 *
 * **Recolorido por MÁSCARA, nunca editando o `fill`.** Os SVGs saem do Figma
 * com `fill="white"` e máscaras internas; trocar o fill na mão quebra a forma.
 * Aqui o arquivo entra como `mask-image` e quem pinta é o `background-color` —
 * o desenho vira um recorte, e a cor vem de token. É por isso que existe UM
 * componente e `mask-image` solto pelos arquivos é proibido: a técnica está
 * escrita num lugar só.
 *
 * **Sempre colorido, nunca preto nem cinza** (regra dura do user). Preto é a
 * tinta do dado e da borda; ornamento na mesma tinta compete com o conteúdo em
 * vez de emoldurá-lo. Também estão fora as três cores com dono — verde é
 * dinheiro, amarelo é foco, vermelho é erro — exceto onde o significado É
 * aquele estado, que é o caso do 404.
 *
 * **É decoração, e se declara como tal:** `aria-hidden`. Quem carrega o sentido
 * é o texto ao lado. Estado vazio cuja única explicação fosse o desenho seria
 * uma tela muda para quem usa leitor.
 *
 * **Um por região visível** (teto de densidade da memória §@ornamentos). Se
 * três aparecerem juntos numa tela real, cortar o de menor hierarquia — não
 * diminuir os três.
 *
 * Só os SVGs efetivamente usados entram no repo: são 520 no staging, e um
 * barrel com todos eles arrastaria a coleção inteira para o bundle.
 */

/** Shape por MÓDULO — fixo. Mesmo módulo, mesmo desenho, sempre. */
const SHAPE_DO_MODULO: Record<Modulo, string> = {
  produtos: shape159, // etiqueta de borda serrilhada
  estoque: brutalist072, // empilhamento de camadas
  vendas: shape128, // linhas horizontais = documento
  compras: brutalist022, // sacola / volume
  clientes: brutalist064, // cabeça + corpo = pessoa
  fornecedores: brutalist029, // casa / galpão = empresa
  profissionais: shape133, // losango dentro de losango = crachá
  boletim: shape135, // anéis concêntricos = panorama
}

/**
 * Shapes de ESTADO — não pertencem a módulo nenhum.
 *
 * `rota-inexistente` e `alerta` apontam para o MESMO arquivo de propósito: a
 * memória dá a bandeira torta aos dois usos (404 e confirmação destrutiva), e
 * os dois são a mesma ideia — algo saiu do trilho. Ficam com nomes separados
 * porque quem escreve a tela pensa no ESTADO, não no número do SVG; e se um dia
 * a memória separar os dois desenhos, muda aqui e em nenhum consumidor.
 */
const SHAPE_DE_ESTADO = {
  'busca-vazia': shape160, // círculos que não se cruzam
  'rota-inexistente': shape193, // bandeira torta
  alerta: shape193, // a mesma bandeira: confirmação destrutiva
} as const

export type ShapeDeEstado = keyof typeof SHAPE_DE_ESTADO

/**
 * O tom é o PAPEL da cor, não a cor. `modulo`/`modulo-suave` leem o par que o
 * `[data-modulo]` do ancestral definiu — por isso o mesmo componente pinta de
 * cyan em Produtos e de coral no Boletim sem receber cor nenhuma.
 */
const TONS = {
  /** Cheia /01 do módulo: ornamento em destaque. */
  modulo: 'bg-modulo-cheia',
  /** Pastel /02 do módulo: presença sem chamar atenção (item inativo). */
  'modulo-suave': 'bg-modulo',
  /** Info/01 — busca sem resultado. Nunca a cor do módulo: vazio de busca não é módulo vazio. */
  info: 'bg-info',
  /** Danger/01 — só onde o significado É erro. */
  erro: 'bg-destructive',
} as const

export type TomDeOrnamento = keyof typeof TONS

export interface OrnamentoProps {
  /** Módulo (usa o shape fixo dele) ou um shape de estado. */
  shape: Modulo | ShapeDeEstado
  tom: TomDeOrnamento
  /** Lado em px. A escala da fase: 18 item de menu · 20 seção · 24 banda · 96/128 vazio. */
  tamanho: number
  className?: string
}

/**
 * O ornamento do módulo em que o operador ESTÁ, resolvido pela rota.
 *
 * Existe porque peças compartilhadas — a banda de identidade, o estado vazio da
 * listagem — não sabem nem devem saber de que módulo são: elas aparecem em 19
 * telas. A cor já vem sozinha pelo `[data-modulo]` do shell, mas o SHAPE é
 * escolha de JavaScript, e alguém precisa fazer a ponte.
 *
 * Rota sem módulo atribuído não desenha nada: melhor ausência do que o desenho
 * de outro módulo.
 */
export interface OrnamentoDoModuloProps {
  tom?: TomDeOrnamento
  tamanho: number
  className?: string
}

export function OrnamentoDoModulo(props: OrnamentoDoModuloProps) {
  // `warn: false` devolve `undefined` em vez de estourar quando não há router.
  // Sem isto, peças compartilhadas como a banda de identidade e a DataTable
  // passariam a EXIGIR router só por causa de um desenho — e o teste de
  // componente isolado (`renderWithQuery`), que é a regra do repo, quebraria
  // em todas elas. Fora do router não há rota, logo não há módulo, logo não há
  // ornamento: ausência, nunca o desenho de outro módulo.
  const router = useRouter({ warn: false })
  if (!router) return null
  return <OrnamentoDaRotaAtual {...props} />
}

/**
 * Metade de baixo: só é montada quando existe router, e é por isso que o hook
 * do roteador mora aqui e não no componente acima — hook não pode ser
 * condicional, mas COMPONENTE pode.
 */
function OrnamentoDaRotaAtual({ tom = 'modulo', tamanho, className = '' }: OrnamentoDoModuloProps) {
  const { location } = useRouterState()
  const modulo = moduloDaRota(location.pathname)
  if (!modulo) return null
  return <Ornamento shape={modulo} tom={tom} tamanho={tamanho} className={className} />
}

export function Ornamento({ shape, tom, tamanho, className }: OrnamentoProps) {
  const url =
    shape in SHAPE_DE_ESTADO
      ? SHAPE_DE_ESTADO[shape as ShapeDeEstado]
      : SHAPE_DO_MODULO[shape as Modulo]

  return (
    <span
      // Decoração: o significado está no texto ao lado, sempre.
      aria-hidden="true"
      data-slot="ornamento"
      data-shape={shape}
      className={cn('inline-block shrink-0', TONS[tom], className)}
      style={{
        width: tamanho,
        height: tamanho,
        maskImage: `url(${url})`,
        maskSize: 'contain',
        maskRepeat: 'no-repeat',
        maskPosition: 'center',
      }}
    />
  )
}
