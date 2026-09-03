import { FalhaDoPainel } from '@/components/cabinet/falha-do-painel'
import { FaixaDeKpi, KpiTile, type TintDeKpi } from '@/components/cabinet/kpi-tile'
import { Skeleton } from '@/components/ui/skeleton'
import { useResumoDoDashboard, variacaoDoMes } from '@/data/dashboard-api'
import { Link } from '@tanstack/react-router'

/**
 * OS QUATRO KPIs DO DASHBOARD — a faixa de tinta da tela.
 *
 * ## O que mudou da versão 1.x
 *
 * Os quatro cartões eram peças próprias desta tela: `p-5`, fundo na pastel /02
 * do módulo, um `Selo` ornamental de 20px, o valor em `NumeroHeroi` (display
 * CONDENSADO a 38px) e o delta dentro de um chip tonal com borda. Nada disso
 * sobrevive à 2.0, por três motivos que não são de gosto:
 *
 * 1. **A peça existe** — `KpiTile` (D11, `#479`) é o cartão de KPI do sistema, e
 *    é ele que o mockup desenha aqui. Tela nova COMPÕE; reimplementar o cartão
 *    aqui daria duas âncoras de faixa com medidas diferentes, que é exatamente
 *    a deriva que a fusão v5 fechou.
 * 2. **`NumeroHeroi` saiu.** A quinta família (display condensado, 36–48px)
 *    dependia da Bebas, que a D1 removeu; `--font-display-condensada` passou a
 *    apontar para a Gambarino, e §Hierarquia não tem degrau acima de 30px fora
 *    do display. O valor do KPI agora é mono a 24px (`escala="destaque"`), que é
 *    a medida do mockup. O `kpi-tile.tsx` já anotava que a peça sai "em D15 e
 *    D20"; esta é a metade D20.
 * 3. **O ornamento saiu.** §Hierarquia não tem lugar para um shape de 20px
 *    dentro do cartão, e o que marca o assunto na 2.0 é a TINTA do tile —
 *    lilac, sky, sand, mint, na ordem do mockup.
 *
 * ## Nem todo número leva a algum lugar
 *
 * Cartão vira link só quando existe tela que mostra AQUELE recorte. Orçamentos e
 * Pedidos têm listagem; estoque crítico não tem tela e o total de vendas do mês
 * também não. Cartão clicável que despeja o operador numa tela vazia é pior que
 * cartão parado — ele aprende que clicar ali não resolve e para de clicar nos
 * que resolvem.
 *
 * O link envolve o tile em vez de virar prop do tile: a borda, a sombra dura e o
 * padding são do cartão, e um `<a>` com a geometria do cartão duplicaria a
 * decisão de desenho fora do arquivo que a tomou.
 */

interface Indicador {
  rotulo: string
  tint: TintDeKpi
  /** Contagem já formatada. Mutuamente exclusivo com `valorCentavos`. */
  valor?: string
  /** Dinheiro em CENTAVOS. */
  valorCentavos?: number
  nota: string
  delta?: number | null
  serie?: readonly number[]
  /** Tela que mostra este recorte; ausente = o número não tem para onde levar. */
  href?: string
  /** O número que é PROBLEMA, não informação: pinta o valor em `--bad`. */
  alerta?: boolean
}

function Tile({ indicador }: { indicador: Indicador }) {
  const tile = (
    <KpiTile
      rotulo={indicador.rotulo}
      {...(indicador.valor !== undefined && { valor: indicador.valor })}
      {...(indicador.valorCentavos !== undefined && { valorCentavos: indicador.valorCentavos })}
      {...(indicador.delta !== undefined && { delta: indicador.delta })}
      {...(indicador.serie && { serie: indicador.serie })}
      {...(indicador.alerta && { alerta: true })}
      nota={indicador.nota}
      tint={indicador.tint}
      escala="destaque"
      className={indicador.href ? 'h-full' : undefined}
    />
  )

  if (!indicador.href) return tile

  return (
    <Link to={indicador.href} className="flex min-w-0 no-underline focus-visible:focus-ring">
      <span className="flex min-w-0 flex-1 flex-col">{tile}</span>
    </Link>
  )
}

export function Indicadores() {
  const query = useResumoDoDashboard()

  if (query.isPending) {
    return (
      <FaixaDeKpi>
        {['k1', 'k2', 'k3', 'k4'].map((chave) => (
          <Skeleton key={chave} className="h-[92px] w-full" />
        ))}
      </FaixaDeKpi>
    )
  }

  if (query.isError || !query.data) {
    return (
      <FalhaDoPainel
        titulo="Os indicadores não carregaram"
        erro={query.error}
        aoTentar={() => query.refetch()}
      />
    )
  }

  const resumo = query.data
  const variacao = variacaoDoMes(resumo)
  const anterior = resumo.previousMonthSalesCents

  const indicadores: Indicador[] = [
    {
      rotulo: 'Orçamentos abertos',
      tint: 'lilac',
      valor: String(resumo.openQuotes),
      nota:
        resumo.openQuotesDueThisWeek === 1
          ? '1 vence esta semana'
          : `${resumo.openQuotesDueThisWeek} vencem esta semana`,
      href: '/vendas/orcamentos',
    },
    {
      rotulo: 'Pedidos a receber',
      tint: 'sky',
      valor: String(resumo.incomingOrders),
      nota:
        resumo.incomingOrdersToday === 1
          ? '1 chega hoje'
          : `${resumo.incomingOrdersToday} chegam hoje`,
      href: '/compras/pedidos',
    },
    {
      rotulo: 'Estoque crítico',
      tint: 'sand',
      valor: String(resumo.criticalStockItems),
      nota: 'abaixo do mínimo',
      // O `.kpi.warn` do mockup: o número é problema, e o valor vai para `--bad`
      // enquanto a tinta do tile continua sendo a do assunto.
      alerta: resumo.criticalStockItems > 0,
    },
    {
      rotulo: 'Vendas do mês',
      tint: 'mint',
      valorCentavos: resumo.monthSalesCents,
      // Sem base de comparação a tela DIZ isso, em vez de mostrar "+0%": zero
      // por cima de zero é conta que ninguém pode conferir.
      nota: variacao === null ? 'sem base de comparação' : 'vs. mês anterior',
      delta: variacao,
      // A sparkline do mockup, com os DOIS pontos que o DTO publica
      // (`previousMonthSalesCents` → `monthSalesCents`). São dois, que é o
      // mínimo que `Sparkline` desenha, e é a curva de verdade — não uma série
      // inventada para a linha ficar bonita. Vira curva de doze meses no dia em
      // que o DTO publicar a série; é acréscimo de campo, não rota nova.
      //
      // Mesma guarda do `variacaoDoMes`: base zero não tem tendência, e uma
      // linha subindo do chão diria "cresceu infinito".
      ...(anterior === 0 ? {} : { serie: [anterior, resumo.monthSalesCents] }),
    },
  ]

  return (
    <FaixaDeKpi>
      {indicadores.map((indicador) => (
        <Tile key={indicador.rotulo} indicador={indicador} />
      ))}
    </FaixaDeKpi>
  )
}
