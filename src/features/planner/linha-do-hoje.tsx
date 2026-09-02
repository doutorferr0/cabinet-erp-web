import { useCallback, useEffect, useState } from 'react'
import { type JanelaDoPlano, mesesAteODia, mesesDaJanela } from './dados-do-gantt'

/**
 * A LINHA DO HOJE — 2px de tinta atravessando a grade, e o rótulo no topo.
 *
 * ## Por que isto voltou a ser nosso
 *
 * O gantt caseiro desenhava a "linha do agora"; a troca de motor a entregou ao
 * `markers` do SVAR, e o `planner.tsx` passou a declarar
 * `markers={[{ start: new Date(), text: 'Hoje' }]}` com um comentário dizendo
 * que o marcador "já vem estilizado". **Nunca desenhou nada.** Medido no
 * navegador em 02/09/2026, com o plano de setembro dentro da janela: zero
 * elementos `.wx-marker` no DOM. A razão está no `init` da store do SVAR, que
 * faz `t.markers = []` e `t._markers = []` na MESMA linha em que zera
 * `baselines`, `criticalPath`, `schedule`, `rollups` e `slack` — a lista de
 * recursos PRO que o cabeçalho do `planner.tsx` já registrava. `markers`
 * estava nessa lista e ninguém sabia.
 *
 * `highlightTime`, que é o outro gancho de tempo da lib e não é pago, também
 * não serve: o próprio código dele desiste com `if (unit !== 'day' && unit !==
 * 'hour') return ''`, e a escala do Planner é de MÊS.
 *
 * ## Como a posição é achada
 *
 * A matemática é pura e mora em `dados-do-gantt` (`mesesAteODia`): quantos
 * meses fracionários separam o início da janela de hoje. O que sobra aqui é a
 * única coisa que precisa do navegador — **quanto vale um mês em pixels** —, e
 * ela é lida do próprio cabeçalho de escala do SVAR, não estimada:
 * `larguraDoQuadro / mesesDaJanela`. Ler a largura da lib em vez de recalcular
 * a partir de `cellWidth` mantém a linha grudada na grade mesmo quando o
 * `autoScale` estica as colunas para preencher o espaço, que é o que ele faz
 * por padrão.
 *
 * A linha vive num overlay recortado sobre a área do gráfico e é reposicionada
 * no rolar horizontal do `.wx-chart`. Não dá para pendurá-la DENTRO do
 * `.wx-chart` (onde ela rolaria de graça, como o `.wx-markers` da lib faz)
 * porque aquele nó é filho do React da lib: um irmão inserido à mão ali é
 * candidato a ser removido na próxima reconciliação.
 *
 * `null` quando hoje está fora da janela — projeto que acabou ano passado não
 * ganha uma linha encostada na borda esquerda fingindo que hoje é o começo.
 */
export function LinhaDoHoje({
  janela,
  quadro,
}: {
  janela: JanelaDoPlano
  /** O container com `data-slot="gantt"`. */
  quadro: React.RefObject<HTMLDivElement | null>
}) {
  const [geo, setGeo] = useState<{ x: number; area: DOMRect } | null>(null)

  const medir = useCallback(() => {
    const raiz = quadro.current
    if (!raiz) return setGeo(null)

    const chart = raiz.querySelector<HTMLElement>('.wx-chart')
    const escala = raiz.querySelector<HTMLElement>('.wx-scale')
    if (!chart || !escala) return setGeo(null)

    const meses = mesesDaJanela(janela)
    const posicao = mesesAteODia(janela, new Date())
    if (meses <= 0 || posicao === null) return setGeo(null)

    const escalaRect = escala.getBoundingClientRect()
    const larguraDoMes = escalaRect.width / meses
    const raizRect = raiz.getBoundingClientRect()
    const chartRect = chart.getBoundingClientRect()

    // A área começa ABAIXO do cabeçalho de meses. O cabeçalho é sticky e
    // precisa continuar por cima de tudo que rola sob ele; uma linha que
    // atravessasse os meses cortaria o rótulo do mês em duas metades e o
    // rótulo "Hoje" cairia em cima do ano.
    const topo = chartRect.top - raizRect.top + escalaRect.height

    setGeo({
      x: posicao * larguraDoMes - chart.scrollLeft,
      area: new DOMRect(
        chartRect.left - raizRect.left,
        topo,
        chartRect.width,
        Math.max(chartRect.height - escalaRect.height, 0),
      ),
    })
  }, [janela, quadro])

  useEffect(() => {
    const raiz = quadro.current
    if (!raiz) return

    // **O quadro NASCE sem altura, e medir uma vez é medir zero.** Medido:
    // na primeira passada o `.wx-chart` responde `height: 0` — o SVAR só o
    // dimensiona depois do primeiro layout. Observar apenas a raiz não
    // resolve, porque quem cresce de 0 para 600px é o filho, e a raiz já
    // estava do tamanho final. Por isso o observer olha os DOIS, e o chart
    // entra na lista assim que existe (`observe` repetido é no-op).
    const observer = new ResizeObserver(() => medir())
    observer.observe(raiz)

    let chart: HTMLElement | null = null
    const ligarNoChart = () => {
      const achado = raiz.querySelector<HTMLElement>('.wx-chart')
      if (!achado || achado === chart) return
      chart?.removeEventListener('scroll', medir)
      chart = achado
      observer.observe(chart)
      // O rolar horizontal move a grade sem mudar tamanho nenhum: o observer
      // não vê, e sem isto a linha ficaria parada enquanto os meses passam
      // por baixo dela.
      chart.addEventListener('scroll', medir, { passive: true })
    }

    ligarNoChart()
    medir()
    // Segunda passada no quadro seguinte, para o caso de o chart ainda não
    // existir no DOM quando este efeito roda.
    const quadroSeguinte = requestAnimationFrame(() => {
      ligarNoChart()
      medir()
    })

    return () => {
      cancelAnimationFrame(quadroSeguinte)
      observer.disconnect()
      chart?.removeEventListener('scroll', medir)
    }
  }, [medir, quadro])

  // Fora da janela recortada não se desenha: a linha some ao rolar para longe,
  // em vez de encostar na moldura e virar uma borda que não é borda.
  if (!geo || geo.x < 0 || geo.x > geo.area.width) return null

  // O DESENHO mora em `gantt-2.0.css`, e não em utilities aqui, por causa da
  // CASCATA: `tokens-2.0.css` entra sem `@layer`, e regra sem camada vence
  // regra em camada — `.t-rotulo` derrubaria um `text-[var(--n-0)]` do
  // Tailwind e o rótulo sairia n-500 sobre n-900. Aqui fica só a GEOMETRIA,
  // que é medida e por isso é inline por natureza.
  return (
    <div
      aria-hidden="true"
      data-slot="planner-hoje"
      style={{
        left: geo.area.x,
        top: geo.area.y,
        width: geo.area.width,
        height: geo.area.height,
      }}
    >
      <div className="traco" style={{ left: geo.x }} />
      <span className="rotulo" style={{ left: geo.x }}>
        Hoje
      </span>
    </div>
  )
}
