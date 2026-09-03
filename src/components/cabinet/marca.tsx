import markCompacta from '@/assets/marca/cabinet-mark-compact.svg?raw'
import markCheia from '@/assets/marca/cabinet-mark.svg?raw'
import wordmark from '@/assets/marca/cabinet-wordmark.svg?raw'
import { cn } from '@/lib/utils'

/**
 * MARCA — o símbolo e o nome do Cabinet. Desenho do user, não do acervo.
 *
 * **Não passa pela `<Forma>`, e não é preferência de organização.** A `<Forma>`
 * é uma tabela FECHADA de sete desenhos que o código conhece de cor, um por
 * módulo, e o que ela varia é tint e fio. A marca é o contrário em dois pontos:
 * o desenho vem de um `.svg` que o user edita, e ela tem um wordmark deitado ao
 * lado do símbolo, que forma nenhuma tem. Dito isso, a gramática é a MESMA — a
 * casa de três níveis do login é esta casa, e é dela que as sete derivam.
 *
 * **Dois pesos, e o corte é de LEGIBILIDADE, não de gosto** (medido em render,
 * 2026-08-13):
 *
 * - `cabinet-mark.svg` — 3 níveis + moldura arredondada. Piso 64px: abaixo
 *   disso a moldura come 20% do quadro e empurra o traço interno para
 *   sub-pixel, e a casa vira borrão.
 * - `cabinet-mark-compact.svg` — 2 níveis, sem moldura, traço 3× mais grosso.
 *   Legível até 16px, que é o favicon pequeno.
 *
 * Quem escolhe é o `tamanho`, nunca a tela: pedir a marca é pedir a marca, e a
 * decisão de peso é do componente. Ver `PISO_DA_MOLDURA`.
 *
 * **A cor sai de `currentColor`.** A marca é traço, e traço é tinta: herda o
 * `color` de quem a hospeda e vira sozinha no tema escuro. Não recebe tom de
 * módulo de propósito — a marca responde "que produto é este", pergunta cuja
 * resposta não muda ao navegar. Um roxo fixo aqui seria a mesma falha muda do
 * `text-white` da fase 3, com a marca sumindo na bancada escura.
 *
 * **O favicon é CÓPIA, não import** (`public/favicon.svg`): quem o lê é o
 * browser antes de existir bundle. Mudou o desenho, mudam os dois arquivos.
 */

/** `id="Vector_1"` também contém `d="`; o espaço antes garante que é o atributo. */
const ATRIBUTO_D = /\sd="([^"]+)"/g
const ATRIBUTO_VIEWBOX = /viewBox="([^"]+)"/
const ATRIBUTO_TRACO = /stroke-width="([\d.]+)"/

interface Desenho {
  viewBox: string
  paths: string[]
  /** Espessura em unidades do `viewBox`, como está no arquivo. 0 = desenho de massa. */
  traco: number
  /** Largura ÷ altura do `viewBox` — o wordmark é deitado, o símbolo é quadrado. */
  proporcao: number
}

/**
 * O arquivo continua sendo a FONTE. O que o componente faz é reler `viewBox`,
 * espessura e caminhos e remontar o SVG com o tamanho pedido. Editar o desenho é
 * editar o `.svg`, nunca este arquivo.
 */
function lerDesenho(raw: string): Desenho {
  const viewBox = ATRIBUTO_VIEWBOX.exec(raw)?.[1] ?? '0 0 100 100'
  const [, , largura = 100, altura = 100] = viewBox.split(/\s+/).map(Number)
  return {
    viewBox,
    paths: [...raw.matchAll(ATRIBUTO_D)].map(([, d]) => d ?? '').filter((d) => d.length > 0),
    traco: Number(ATRIBUTO_TRACO.exec(raw)?.[1] ?? 0),
    proporcao: largura / altura,
  }
}

const DESENHOS = {
  cheia: lerDesenho(markCheia),
  compacta: lerDesenho(markCompacta),
  nome: lerDesenho(wordmark),
} as const

/**
 * A partir de 64px a moldura tem espaço para existir; abaixo, não.
 *
 * Não é escala contínua: são dois desenhos diferentes, e o compacto tem menos
 * níveis. Interpolar espessura no mesmo desenho foi o que falhou — foi assim
 * que a logo original chegou, com 4 contornos a 0,9% de espessura ilegíveis
 * abaixo de 32px.
 */
const PISO_DA_MOLDURA = 64

/**
 * Altura do nome em relação ao lado do símbolo, na assinatura.
 *
 * O `viewBox` do wordmark vai do topo do "C" à linha de base, sem descida —
 * então a altura é praticamente a altura de caixa alta. A 0,62 do símbolo ele
 * lê com o mesmo peso do rótulo de 18px que substituiu no topo da barra; a 1,0
 * ele domina o símbolo e a assinatura vira letreiro.
 */
const PROPORCAO_DO_NOME = 0.62

/** Respiro entre símbolo e nome, na escala do símbolo. */
const RESPIRO = 0.29

export type VarianteDeMarca = 'simbolo' | 'nome' | 'assinatura'

export interface MarcaProps {
  /**
   * `simbolo` a casa · `nome` o wordmark · `assinatura` os dois lado a lado.
   *
   * Assinatura é UM elemento com UM nome acessível, e não dois `<Marca>`
   * empilhados na tela: dois elementos rotulados "Cabinet" lado a lado fazem o
   * leitor de tela anunciar o produto duas vezes na primeira parada da barra.
   */
  variante?: VarianteDeMarca
  /** Lado do símbolo em px. Na variante `nome`, a ALTURA do wordmark. */
  tamanho: number
  className?: string
  /**
   * Classe do NOME dentro da assinatura — existe por causa da barra colapsada,
   * onde o wordmark some e o símbolo fica. O nome tem de sumir por CSS e não
   * por condição de render: a barra anima a largura, e desmontar o wordmark no
   * meio da transição faz a assinatura pular.
   */
  classeDoNome?: string
}

export function Marca({ variante = 'simbolo', tamanho, className, classeDoNome }: MarcaProps) {
  const simbolo = variante !== 'nome'
  const nome = variante !== 'simbolo'
  const alturaDoNome = variante === 'nome' ? tamanho : Math.round(tamanho * PROPORCAO_DO_NOME)

  return (
    // O nome acessível mora no envoltório, e as peças são decoração: assim
    // `simbolo`, `nome` e `assinatura` se anunciam do mesmo jeito — "Cabinet" —
    // e trocar de variante nunca muda o que o leitor de tela ouve.
    <span
      role="img"
      aria-label="Cabinet"
      data-slot="marca"
      data-variante={variante}
      className={cn('inline-flex shrink-0 items-center', className)}
      style={{ gap: nome && simbolo ? Math.round(tamanho * RESPIRO) : undefined }}
    >
      {simbolo ? <Simbolo tamanho={tamanho} /> : null}
      {nome ? <Nome altura={alturaDoNome} className={classeDoNome} /> : null}
    </span>
  )
}

function Simbolo({ tamanho }: { tamanho: number }) {
  const desenho = tamanho >= PISO_DA_MOLDURA ? DESENHOS.cheia : DESENHOS.compacta

  return (
    <svg
      aria-hidden="true"
      data-slot="marca-simbolo"
      data-peso={tamanho >= PISO_DA_MOLDURA ? 'cheia' : 'compacta'}
      viewBox={desenho.viewBox}
      width={tamanho}
      height={tamanho}
      className="block shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={desenho.traco}
      // Canto vivo: a casa do user é reta, e `round` a 16px arredonda a cumeeira
      // até ela parecer um arco.
      strokeLinejoin="miter"
    >
      {desenho.paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}

function Nome({ altura, className }: { altura: number; className: string | undefined }) {
  const desenho = DESENHOS.nome

  return (
    <svg
      aria-hidden="true"
      data-slot="marca-nome"
      viewBox={desenho.viewBox}
      width={Math.round(altura * desenho.proporcao)}
      height={altura}
      className={cn('block shrink-0', className)}
      fill="currentColor"
    >
      {desenho.paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}
