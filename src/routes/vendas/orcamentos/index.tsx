import type { QuoteDto } from '@/api/gerado'
import { cadastroActions } from '@/components/cabinet/cadastro-actions'
import type { OpcaoDeAgrupamento } from '@/components/cabinet/data-table'
import { FaixaDeKpi, KpiTile } from '@/components/cabinet/kpi-tile'
import { TelaDeListagem } from '@/components/cabinet/tela-de-listagem'
import { Button } from '@/components/ui/button'
import { data } from '@/data'
import { useResumoDeOrcamentos, variacao } from '@/data/agregados-api'
import { useReadOnlyPorPapel } from '@/data/papeis'
import { useCancelarOrcamento } from '@/data/quotes-api'
import { RevisarOrcamento } from '@/features/orcamento/revisar-orcamento'
import { GerarPedido } from '@/features/vendas/gerar-pedido'
import type { CampoFiltravel } from '@/lib/filtro-de-consulta'
import { formatDateBR } from '@/lib/formatters'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { CalendarDays, CopyPlus, FileOutput, HardHat, Hash, User } from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/vendas/orcamentos/')({
  component: OrcamentosPage,
})

/**
 * Colunas LITERAIS da transcrição §8.1 — com o `accessorKey` em INGLÊS.
 *
 * O rótulo que o operador lê continua o da transcrição; o que muda é a CHAVE,
 * que é o nome que a whitelist de `sortBy` do servidor aceita. Traduzir a chave
 * quebraria a ordenação com 400 ao primeiro clique no cabeçalho (padrão 1).
 */
const columns: ColumnDef<QuoteDto>[] = [
  {
    accessorKey: 'number',
    header: 'Número',
    meta: { tipo: 'id' },
    /**
     * A REVISÃO viaja no número, e não numa coluna própria.
     *
     * As colunas desta grade são as LITERAIS da transcrição §8.1, e uma coluna
     * a mais mostraria "—" em quase toda linha: a revisão é a exceção, não o
     * caso. Mas ela precisa aparecer AQUI, porque o problema que ela resolve é
     * de LISTAGEM — dois orçamentos do mesmo cliente no mesmo dia, e nada
     * dizendo que o segundo substitui o primeiro. Quem lê a lista contava dois
     * negócios onde havia um; a marca no número é o que faz o par ser lido
     * como um só.
     *
     * Ausente ou `1` não imprime nada: o original é o documento comum.
     */
    cell: ({ row }) => {
      const revisao = row.original.revision ?? 1
      return (
        <span>
          {row.original.number}
          {revisao > 1 ? (
            <span className="ml-1.5 text-muted-foreground text-xs">rev. {revisao}</span>
          ) : null}
        </span>
      )
    },
  },
  // `series` não está na whitelist do contrato: a coluna aparece e não ordena,
  // o que é melhor que um cabeçalho clicável que responde 400.
  { accessorKey: 'series', header: 'Série', enableSorting: false, meta: { tipo: 'texto' } },
  {
    id: 'customerName',
    header: 'Cliente',
    // A obra vira subtítulo do cliente: as duas se leem juntas ("Alphaville,
    // da Construtora X") e a coluna própria mostrava `—` na maioria das linhas.
    accessorFn: (row) => ({
      nome: row.customerName ?? '—',
      ...(row.projectName ? { subtitulo: row.projectName } : {}),
    }),
    meta: { tipo: 'entidade' },
  },
  {
    accessorKey: 'issuedAt',
    header: 'Data Emissão',
    cell: ({ getValue }) => formatDateBR(getValue<string | null>()),
    meta: { tipo: 'data' },
  },
  {
    accessorKey: 'expiresAt',
    header: 'Data Validade',
    cell: ({ getValue }) => formatDateBR(getValue<string | null>()),
    meta: { tipo: 'data' },
  },
  {
    id: 'status',
    header: 'Situação',
    accessorFn: (row) => ({
      tom: row.status === 'cancelled' ? ('void' as const) : ('open' as const),
      label: row.status === 'cancelled' ? 'Cancelado' : 'Em aberto',
    }),
    meta: { tipo: 'status' },
  },
  { accessorKey: 'totalCents', header: 'Total', meta: { tipo: 'dinheiro' } },
]

/** Botões do rodapé da listagem — §8.1 (telas próprias ainda não capturadas). */
const BOTOES_RODAPE = [
  'Produtos Desativados',
  'Alterar Limites',
  'Atualizar Valores',
  'Margem de Lucro',
  'Quadro',
] as const

function RodapeDeOrcamento() {
  return (
    <div className="flex flex-wrap gap-2">
      {BOTOES_RODAPE.map((label) => (
        <Button
          key={label}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => console.info(`[mock] ${label}`)}
        >
          {label}
        </Button>
      ))}
    </div>
  )
}

/**
 * Campos filtráveis da §8.1. **Primeira listagem a filtrar por DATA**, e é a
 * consulta que uma tela de documento pede antes de qualquer outra: "os
 * orçamentos de agosto", "o que vence esta semana".
 *
 * A data usa `<input type="date">` nativo — o dado é ISO (`yyyy-mm-dd`), que é
 * exatamente o que o input fala, e o calendário vem do sistema operacional.
 *
 * `Série` fica de fora: é o mesmo valor em toda linha, e filtro por campo de
 * valor único não estreita nada. Valor e desconto também: trafegam em unidade
 * que o operador não digita (centavos, percentual com 4 casas implícitas) e não
 * há variante que converta na borda.
 *
 * Recurso HTTP desde a #134: quem responde é `/api/quotes`, e os `id` daqui
 * são os nomes do DTO — o contrato publica `filters` com a mesma whitelist do
 * `sortBy`, e campo fora dela é barrado na fronteira antes de sair.
 */
const camposFiltraveis: readonly CampoFiltravel[] = [
  { id: 'number', rotulo: 'Número', variante: 'text', icon: Hash, placeholder: 'Ex.: 21653' },
  {
    id: 'customerName',
    rotulo: 'Cliente',
    variante: 'text',
    icon: User,
    placeholder: 'Parte do nome…',
  },
  {
    id: 'projectName',
    rotulo: 'Descrição da Obra',
    variante: 'text',
    icon: HardHat,
    placeholder: 'Parte da descrição…',
  },
  { id: 'issuedAt', rotulo: 'Data Emissão', variante: 'date', icon: CalendarDays },
  { id: 'expiresAt', rotulo: 'Data Validade', variante: 'date', icon: CalendarDays },
]

/** Dias inteiros entre hoje e a validade; negativo = já venceu. */
function diasAteVencer(validade: string | null | undefined, hoje = new Date()) {
  if (!validade) return null
  const limite = new Date(`${validade.slice(0, 10)}T00:00:00`)
  const dia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  return Math.round((limite.getTime() - dia.getTime()) / 86_400_000)
}

/**
 * A VALIDADE é o que este documento tem de urgente, e a lista não a dizia.
 *
 * `bad` é o orçamento que já venceu e ninguém fechou — o prejuízo já
 * aconteceu; `warn` é o que vence dentro de três dias, que é a janela em que
 * ainda dá para ligar para o cliente. O cancelado vira `muted` antes das duas
 * contas: documento fora do jogo não tem prazo a cobrar.
 *
 * O contrato publica DUAS situações (`active`, `cancelled`). "Vencido" não é
 * uma delas — é a data contra hoje, e por isso mora aqui e não numa coluna.
 */
const JANELA_DE_VENCIMENTO_EM_DIAS = 3

function decoracaoDoOrcamento(o: QuoteDto) {
  if (o.status === 'cancelled') return 'muted' as const
  const dias = diasAteVencer(o.expiresAt)
  if (dias === null) return undefined
  if (dias < 0) return 'bad' as const
  if (dias <= JANELA_DE_VENCIMENTO_EM_DIAS) return 'warn' as const
  return undefined
}

const AGRUPAMENTOS: readonly OpcaoDeAgrupamento<QuoteDto>[] = [
  {
    id: 'status',
    rotulo: 'Situação',
    valorDaLinha: (o) => (o.status === 'cancelled' ? 'Cancelado' : 'Em aberto'),
    tomDoValor: (valor) => (valor === 'Cancelado' ? 'void' : 'open'),
  },
  // Cliente não tinge: nome próprio não é estado (§Hierarquia).
  { id: 'customerName', rotulo: 'Cliente', valorDaLinha: (o) => o.customerName ?? '—' },
]

/**
 * O que o vendedor pergunta antes de abrir orçamento nenhum: quanto está na
 * mesa, o que vence esta semana, quantos fecharam no mês e quanto isso deu.
 *
 * `Vence esta semana` é o KPI-problema desta tela — é o único dos quatro cujo
 * número alto pede ação hoje, e é a mesma pergunta que a decoração `warn` da
 * linha responde uma linha por vez.
 */
function KpisDeOrcamentos() {
  const { data: resumo } = useResumoDeOrcamentos()
  if (!resumo) return null

  return (
    <FaixaDeKpi>
      <KpiTile
        rotulo="Em aberto"
        valorCentavos={resumo.openQuotesValueCents}
        nota={`${resumo.openQuotes} ${resumo.openQuotes === 1 ? 'orçamento' : 'orçamentos'}`}
        tint="lilac"
      />
      <KpiTile rotulo="Vencem esta semana" valor={resumo.expiringThisWeek} alerta tint="sand" />
      <KpiTile
        rotulo="Fechados no mês"
        valor={resumo.wonThisMonth}
        unidade={resumo.wonThisMonth === 1 ? 'orçamento' : 'orçamentos'}
        tint="sky"
      />
      <KpiTile
        rotulo="Valor fechado no mês"
        valorCentavos={resumo.monthValueCents}
        delta={variacao(resumo.monthValueCents, resumo.previousMonthValueCents)}
        serie={resumo.monthlyValueSeries}
        tint="mint"
      />
    </FaixaDeKpi>
  )
}

function OrcamentosPage() {
  const navigate = useNavigate()
  const [paraCancelar, setParaCancelar] = useState<QuoteDto | null>(null)
  const [paraConverter, setParaConverter] = useState<QuoteDto | null>(null)
  const [paraRevisar, setParaRevisar] = useState<QuoteDto | null>(null)
  const cancelar = useCancelarOrcamento()
  const { readOnly } = useReadOnlyPorPapel('quotes')

  function abrir(orcamentoId: string, modo?: 'consulta') {
    void navigate({
      to: '/vendas/orcamentos/$orcamentoId',
      params: { orcamentoId },
      search: modo ? { modo } : {},
    })
  }

  const actions = cadastroActions<QuoteDto>({
    entidade: 'orçamento',
    readOnly,
    onIncluir: () => abrir('novo'),
    onAbrir: (o) => abrir(o.id),
    onConsultar: (o) => abrir(o.id, 'consulta'),
  })

  // Orçamento não se apaga, se cancela (§8.1) — e cancelar é caminho PRÓPRIO
  // do contrato (`POST /api/quotes/{id}/cancel`), não um `PUT` com situação
  // trocada: quem decide a transição é o servidor.
  const actionsOrcamento = actions.map((a) =>
    a.id === 'excluir'
      ? {
          ...a,
          label: 'Cancelar',
          // Abre a confirmação; a escrita só sai de lá. Cancelamento é
          // terminal (o contrato não publica reabertura), e ação irreversível
          // atrás de um clique só é a que o operador dá sem querer.
          onClick: (o: QuoteDto | null) => setParaCancelar(o),
        }
      : a,
  )

  /**
   * `Gerar Pedido` é a SÉTIMA ação, e não substitui nenhuma das seis.
   *
   * A barra do padrão 4 (`Filtro · Incluir · Alterar · Consul. · Excluir ·
   * Imprimir`) é a mesma em toda tela, e continua sendo: esta entra depois, com
   * `needsSelection`, então ela desce para a barra de SELEÇÃO — a que só existe
   * quando há uma linha marcada. É onde a ação pertence, porque converter é
   * sobre ESTE orçamento, e é o único lugar em que ela não disputa espaço com a
   * fileira que o operador já conhece de cor.
   *
   * O papel que ela exige é o do ORÇAMENTO, não o do pedido: a borda do backend
   * classifica `POST /api/quotes/{id}/order` por prefixo de caminho, e o prefixo
   * é `/api/quotes`. Pedir o papel de pedido aqui recusaria na tela quem o
   * servidor aceitaria — e passaria a acusar o papel errado.
   */
  const acoesDaTela = [
    ...actionsOrcamento,
    {
      id: 'gerar-pedido',
      label: 'Gerar Pedido',
      icon: FileOutput,
      needsSelection: true,
      ...(readOnly
        ? { disabled: true, title: 'O papel deste vínculo não permite alterações.' }
        : {}),
      onClick: (o: QuoteDto | null) => setParaConverter(o),
    },
    /**
     * `Revisar` é a OITAVA, e desce para a barra de seleção pelo mesmo motivo
     * que `Gerar Pedido`: é sobre ESTE orçamento, não sobre a tela.
     *
     * Ela fica ao lado da conversão de propósito — as duas são o que se faz
     * com um orçamento depois de ele existir, e são as duas saídas do mesmo
     * momento: o cliente aprovou (gera pedido) ou mudou de ideia (revisa).
     * Separá-las esconderia que a escolha é entre elas.
     *
     * O papel exigido é o do ORÇAMENTO: a borda do backend classifica
     * `POST /api/quotes/{id}/revise` por prefixo de caminho, e o prefixo é
     * `/api/quotes`.
     */
    {
      id: 'revisar',
      label: 'Revisar',
      icon: CopyPlus,
      needsSelection: true,
      ...(readOnly
        ? { disabled: true, title: 'O papel deste vínculo não permite alterações.' }
        : {}),
      onClick: (o: QuoteDto | null) => setParaRevisar(o),
    },
  ]

  return (
    <>
      <TelaDeListagem
        titulo="Orçamento"
        columns={columns}
        queryKey={['orcamentos']}
        fetcher={data.orcamentos.list}
        actions={acoesDaTela}
        filtros={camposFiltraveis}
        rodape={<RodapeDeOrcamento />}
        resumo={<KpisDeOrcamentos />}
        decoracao={decoracaoDoOrcamento}
        agrupamentos={AGRUPAMENTOS}
        subtotalDoGrupo={(o) => o.totalCents ?? 0}
        cancelamento={{
          documento: 'orçamento',
          registro: paraCancelar,
          numero: (o) => o.number,
          cancelado: (o) => o.status === 'cancelled',
          pendente: cancelar.isPending,
          erro: cancelar.error,
          onFechar: () => {
            setParaCancelar(null)
            cancelar.reset()
          },
          comMotivo: true,
          onConfirmar: (motivo) => {
            if (!paraCancelar) return
            // Fecha no SUCESSO. Fechar antes esconderia a recusa do servidor
            // junto com o diálogo, e a listagem voltaria igual — indistinguível
            // de um cancelamento que deu certo.
            cancelar.mutate(
              { id: paraCancelar.id, motivo },
              { onSuccess: () => setParaCancelar(null) },
            )
          },
        }}
      />
      {/* IRMÃ da listagem, e não dentro dela: a caixa precisa do orçamento
          SELECIONADO, e quem guarda a seleção é esta página. O `rodape` da
          `TelaDeListagem` é o lugar dos botões que valem para a tela inteira,
          não para uma linha. */}
      <GerarPedido orcamento={paraConverter} onFechar={() => setParaConverter(null)} />
      <RevisarOrcamento orcamento={paraRevisar} onFechar={() => setParaRevisar(null)} />
    </>
  )
}
