import type { Modulo } from '@/app/modulo'
import { Ornamento } from '@/components/cabinet/ornamento'
import { Skeleton } from '@/components/ui/skeleton'
import { useResumoDoDashboard, variacaoDoMes } from '@/data/dashboard-api'
import { formatMoneyBRL } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { Link } from '@tanstack/react-router'
import { FalhaDoPainel } from './falha'

/**
 * FAIXA DE INDICADORES — os quatro números do topo do Dashboard.
 *
 * ## Por que cada cartão tem ornamento, se o teto é de 1 por região
 *
 * O teto da memória (§@ornamentos) existe contra POLUIÇÃO: três desenhos
 * disputando a mesma leitura. A fileira de KPIs é o outro caso, o mesmo da
 * fileira da sidebar — cada shape marca um LUGAR diferente (Vendas, Compras,
 * Estoque), e é justamente a variação que faz a fileira se ler como um mapa. É
 * papel de ÍCONE, não de decoração: 20px, ao lado do rótulo.
 *
 * A cor vem do `data-modulo` do próprio cartão, e não do módulo da rota: o
 * Dashboard não é módulo nenhum (a tabela de cor travada pelo user cobre oito, e
 * este não é um deles), então cada cartão declara o escopo do número que ele
 * mostra.
 *
 * **Três dos quatro, não os quatro:** o cartão de dinheiro fica sem ornamento,
 * porque o número dele não pertence a módulo — pertence a verde, cor que
 * ornamento não pode usar. Ver o comentário na montagem da lista.
 *
 * ## Nem todo número leva a algum lugar
 *
 * Cartão vira link só quando existe tela que mostra AQUELE recorte. Orçamentos e
 * Pedidos têm listagem; estoque crítico não tem tela (o `/estoque` segue vazio,
 * decisão registrada) e o total de vendas do mês também não. Cartão clicável que
 * despeja o operador numa tela vazia é pior que cartão parado — ele aprende que
 * clicar ali não resolve, e para de clicar nos que resolvem.
 */

interface Indicador {
  /**
   * Módulo a que o número pertence — dá shape e cor ao ornamento. Ausente no
   * número que não é de módulo nenhum: ver o cartão de dinheiro abaixo.
   */
  modulo?: Modulo
  rotulo: string
  valor: string
  apoio: string
  /** Tela que mostra este recorte; ausente = o número não tem para onde levar. */
  href?: string
  /** Dinheiro leva a zona de valor e escreve em verde (DESIGN.md §Acentos). */
  dinheiro?: boolean
}

function Cartao({ indicador }: { indicador: Indicador }) {
  const conteudo = (
    <>
      <div className="flex items-center gap-2">
        {indicador.modulo ? <Ornamento shape={indicador.modulo} tom="modulo" tamanho={20} /> : null}
        <span className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          {indicador.rotulo}
        </span>
      </div>
      <span
        className={cn(
          'font-display text-2xl font-bold tracking-[-0.012em] tabular-nums',
          indicador.dinheiro && 'text-money',
        )}
      >
        {indicador.valor}
      </span>
      <span className="text-sm text-muted-foreground">{indicador.apoio}</span>
    </>
  )

  const classe = cn(
    'flex flex-col gap-1 rounded-card border-2 p-4 no-underline',
    indicador.dinheiro ? 'bg-zone-money' : 'bg-card',
  )

  if (!indicador.href) {
    return (
      <div
        {...(indicador.modulo && { 'data-modulo': indicador.modulo })}
        data-slot="indicador"
        className={cn(classe, 'shadow-el1')}
      >
        {conteudo}
      </div>
    )
  }

  return (
    <Link
      to={indicador.href}
      {...(indicador.modulo && { 'data-modulo': indicador.modulo })}
      data-slot="indicador"
      // Peça solta e clicável: leva o pulo do sistema (§Lift), como botão e
      // cartão de tarefa. Cartão parado não leva.
      className={cn(classe, 'lift-control border-border focus-visible:focus-ring')}
    >
      {conteudo}
    </Link>
  )
}

export function Indicadores() {
  const query = useResumoDoDashboard()

  if (query.isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {['k1', 'k2', 'k3', 'k4'].map((chave) => (
          <Skeleton key={chave} className="h-[104px] w-full" />
        ))}
      </div>
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

  const indicadores: Indicador[] = [
    {
      modulo: 'vendas',
      rotulo: 'Orçamentos abertos',
      valor: String(resumo.openQuotes),
      apoio:
        resumo.openQuotesDueThisWeek === 1
          ? '1 vence esta semana'
          : `${resumo.openQuotesDueThisWeek} vencem esta semana`,
      href: '/vendas/orcamentos',
    },
    {
      modulo: 'compras',
      rotulo: 'Pedidos a receber',
      valor: String(resumo.incomingOrders),
      apoio:
        resumo.incomingOrdersToday === 1
          ? '1 chega hoje'
          : `${resumo.incomingOrdersToday} chegam hoje`,
      href: '/compras/pedidos',
    },
    {
      modulo: 'estoque',
      rotulo: 'Estoque crítico',
      valor: String(resumo.criticalStockItems),
      apoio: 'abaixo do mínimo',
    },
    {
      // SEM ornamento, e é decisão: este número não é de módulo nenhum — é
      // DINHEIRO, e dinheiro é verde, cor que ornamento não pode usar (regra
      // dura: as três cores com dono estão fora). Emprestar o shape de Produtos
      // ou de Vendas diria que o total do mês pertence àquele cadastro. Quem
      // marca o cartão aqui é a zona de valor e o verde do número, que é
      // exatamente o que o DESIGN.md manda para indicador de dinheiro.
      rotulo: 'Vendas do mês',
      valor: formatMoneyBRL(resumo.monthSalesCents),
      // Sem base de comparação a tela DIZ isso, em vez de mostrar "+0%": zero
      // por cima de zero é conta que ninguém pode conferir.
      apoio:
        variacao === null
          ? 'sem base de comparação'
          : `${variacao >= 0 ? '+' : ''}${variacao}% vs mês anterior`,
      dinheiro: true,
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {indicadores.map((indicador) => (
        <Cartao key={indicador.rotulo} indicador={indicador} />
      ))}
    </div>
  )
}
