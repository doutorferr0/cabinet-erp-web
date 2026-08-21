import type { CrmOpportunityDto, CrmStageDto } from '@/api/gerado'
import { cadastroActions } from '@/components/cabinet/cadastro-actions'
import { type VisaoDaListagem, VitraDataTable } from '@/components/cabinet/data-table'
import { PageHeader } from '@/components/cabinet/page-header'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { oportunidadesDoFunil, useEstagios, useFunis } from '@/data/crm-api'
import { useReadOnlyPorPapel } from '@/data/papeis'
import type { CampoFiltravel } from '@/lib/filtro-de-consulta'
import { formatDateBR, formatMoneyBRL } from '@/lib/formatters'
import { Link, useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { Calendar, LayoutGrid, TrendingDown } from 'lucide-react'
import { useMemo, useState } from 'react'
import { apodrecimentoDoCartao } from './apodrecimento'
import { CoberturaDoFunil } from './cobertura-do-funil'
import { AGRUPAMENTOS_DO_FUNIL, quemDoCartao } from './funil-agrupa'
import { PerderOportunidadeDialog } from './perder-oportunidade-dialog'
import { QuadroDoFunil } from './quadro-do-funil'
import { RelatorioDePerdasDialog } from './relatorio-de-perdas-dialog'
import { SeloDeApodrecimento } from './selo-de-apodrecimento'

/**
 * A página do quadro: a ESCOLHA do funil em cima, a listagem embaixo.
 *
 * A empresa tem vários funis (modelos de venda distintos), e o funil escolhido
 * mora na URL — `/crm/funil/{id}`. Não é enfeite: o quadro é a tela que o
 * operador deixa aberta e manda por link, e um seletor só em estado local
 * devolveria o funil padrão a cada recarga.
 *
 * A escolha é uma fileira de botões, e não um combo: são poucos funis, todos
 * cabem à vista, e um clique basta. Combo esconderia a lista inteira atrás de
 * um clique para escolher entre dois.
 *
 * ## Uma LISTAGEM com duas visões, não duas telas (view modes, #86)
 *
 * O quadro e a tabela são a MESMA `VitraDataTable`: mesma busca, mesmo filtro
 * estruturado, mesmas consultas salvas, mesma requisição. O alternador troca só
 * o desenho — é o piloto do padrão aprovado para todo o ERP (core @decisoes,
 * ponto 6).
 *
 * **Por que não duas telas lado a lado:** o quadro com filtro próprio e a
 * listagem com o dela dariam duas perguntas parecidas na mesma tela, e o
 * operador que estreitasse o quadro e clicasse em `Lista` veria a listagem
 * inteira de volta sem entender por quê. Aqui o filtro é um só porque o estado
 * dele é um só.
 *
 * **A tela abre no QUADRO.** Ela é o funil; abrir na tabela cobraria um clique
 * diário para chegar onde o operador já ia.
 */

/**
 * O funil é sempre um só na tela — a coluna de funil seria a mesma palavra
 * repetida.
 *
 * `etapasPorId` entra porque o apodrecimento é um fato sobre a ETAPA (`rotDays`)
 * cruzado com o cartão (`stageChangedAt`), e a linha da listagem só tem o
 * segundo. Sem ele, o negócio empacado seria visível no quadro e invisível na
 * tabela — a mesma consulta contando duas histórias.
 */
function colunasDaOportunidade(
  etapasPorId: Map<string, CrmStageDto>,
): ColumnDef<CrmOpportunityDto>[] {
  return [
    { accessorKey: 'name', header: 'Título' },
    {
      accessorKey: 'partnerName',
      header: 'Cliente',
      // O parceiro cadastrado OU o contato solto do lead — a mesma regra do
      // cartão. A ordenação segue por `partnerName` porque é o que a whitelist
      // do servidor aceita: ordenar por um campo calculado na tela daria uma
      // ordem que a página seguinte não repetiria.
      cell: ({ row }) => quemDoCartao(row.original) ?? '',
    },
    {
      accessorKey: 'stageName',
      header: 'Etapa',
      cell: ({ row }) => {
        const apodrecimento = apodrecimentoDoCartao(
          row.original,
          etapasPorId.get(row.original.stageId),
        )
        return (
          <span className="flex items-center gap-2">
            {row.original.stageName}
            {apodrecimento ? <SeloDeApodrecimento apodrecimento={apodrecimento} /> : null}
          </span>
        )
      },
    },
    {
      accessorKey: 'ownerName',
      header: 'Responsável',
      // Fora da whitelist de `sortBy` do contrato: cabeçalho clicável aqui
      // responderia 400 no primeiro clique.
      enableSorting: false,
      cell: ({ row }) => row.original.ownerName ?? '',
    },
    {
      accessorKey: 'expectedValueCents',
      header: 'Valor previsto',
      meta: { numeric: true },
      // Centavos inteiros no dado, R$ só aqui. `null` é "ainda não estimado", e
      // fica em branco: zero diria que o negócio não vale nada.
      cell: ({ row }) =>
        row.original.expectedValueCents === null || row.original.expectedValueCents === undefined
          ? ''
          : formatMoneyBRL(row.original.expectedValueCents),
    },
    {
      accessorKey: 'expectedCloseDate',
      header: 'Previsão',
      cell: ({ row }) =>
        row.original.expectedCloseDate ? formatDateBR(row.original.expectedCloseDate) : '',
    },
  ]
}

export function PaginaDoFunil({ pipelineId }: { pipelineId: string }) {
  const funis = useFunis()
  const etapas = useEstagios(pipelineId)
  const navigate = useNavigate()
  const { readOnly } = useReadOnlyPorPapel('crm')
  const atual = funis.data?.find((funil) => funil.id === pipelineId)

  // O provider carrega o `pipelineId`: as duas visões perguntam pelo funil que
  // está na URL, e nenhuma delas monta consulta própria.
  const fetcher = useMemo(() => oportunidadesDoFunil(pipelineId).list, [pipelineId])
  const etapasPorId = useMemo(
    () => new Map((etapas.data ?? []).map((etapa) => [etapa.id, etapa])),
    [etapas.data],
  )
  const columns = useMemo(() => colunasDaOportunidade(etapasPorId), [etapasPorId])

  /**
   * Campos filtráveis — a whitelist que o contrato publica para o recurso.
   *
   * `Etapa` é SELEÇÃO e não texto: as etapas do funil são conhecidas, e digitar
   * "negociacao" sem acento devolveria zero registros de um funil cheio. As
   * opções saem das etapas configuradas, não de uma lista escrita à mão.
   *
   * Valor previsto não entra: é dinheiro em centavos e o filtro não tem
   * variante que converta na borda — ver `FILTRAVEIS_OPORTUNIDADE`.
   */
  const camposFiltraveis: CampoFiltravel[] = useMemo(
    () => [
      { id: 'name', rotulo: 'Título', variante: 'text' },
      { id: 'partnerName', rotulo: 'Cliente', variante: 'text' },
      {
        id: 'stageName',
        rotulo: 'Etapa',
        variante: 'select',
        opcoes: (etapas.data ?? []).map((etapa) => ({ valor: etapa.name, rotulo: etapa.name })),
      },
      { id: 'expectedCloseDate', rotulo: 'Previsão', variante: 'date', icon: Calendar },
      { id: 'stageChangedAt', rotulo: 'Na etapa desde', variante: 'date', icon: Calendar },
    ],
    [etapas.data],
  )

  const visoes: VisaoDaListagem<CrmOpportunityDto>[] = useMemo(
    () => [
      {
        id: 'quadro',
        rotulo: 'Quadro',
        icon: LayoutGrid,
        agrupa: true,
        render: ({ rows, agruparPor }) => (
          <QuadroDoFunil
            pipelineId={pipelineId}
            oportunidades={rows}
            agruparPor={agruparPor}
            aoPerder={(oportunidade, etapaId) => setPerda({ oportunidade, etapaId })}
          />
        ),
      },
    ],
    [pipelineId],
  )

  // A oportunidade nova nasce na PRIMEIRA etapa do funil (a mesma regra do
  // servidor quando o `stageId` não vem). No quadro o `Incluir` é por coluna e
  // sabe a etapa; na barra, não há coluna para perguntar.
  const primeiraEtapa = etapas.data?.[0]

  /**
   * O diálogo de perda mora AQUI, e não dentro do quadro, porque os dois
   * caminhos que levam a ele são de visões diferentes: o menu do cartão e a
   * barra da listagem. Um diálogo por visão daria dois estados para a mesma
   * decisão, e o que estivesse aberto sumiria ao alternar a visão.
   */
  const [perdasAbertas, setPerdasAbertas] = useState(false)
  const [perda, setPerda] = useState<{
    oportunidade: CrmOpportunityDto
    /** Etapa já escolhida no menu do cartão; ausente quando veio da barra. */
    etapaId?: string
  } | null>(null)

  // As etapas de perda vêm da CONFIGURAÇÃO do funil. Um funil pode ter mais de
  // uma ("Perdido", "Sem verba") e pode não ter nenhuma — e nesse caso não há
  // perda a registrar, então a ação não entra na barra.
  const etapasDePerda = useMemo(
    () => (etapas.data ?? []).filter((etapa) => etapa.isLost),
    [etapas.data],
  )
  // `data` carregada e VAZIA — diferente de ainda carregando, que não autoriza
  // afirmar nada sobre a configuração do funil.
  const semEtapas = etapas.data !== undefined && etapas.data.length === 0

  function abrir(oportunidadeId: string) {
    void navigate({
      to: '/crm/oportunidades/$oportunidadeId',
      params: { oportunidadeId },
    })
  }

  const actions = cadastroActions<CrmOpportunityDto>({
    entidade: 'oportunidade',
    readOnly,
    onIncluir: () => {
      if (!primeiraEtapa) return
      void navigate({
        to: '/crm/oportunidades/$oportunidadeId',
        params: { oportunidadeId: 'novo' },
        search: { funilId: pipelineId, etapaId: primeiraEtapa.id },
      })
    },
    onAbrir: (row) => abrir(row.id),
    // Oportunidade não desativa nem se apaga: o contrato não publica `DELETE` e
    // o registro não tem `active`. Perder um negócio é MUDAR DE ETAPA, com
    // motivo catalogado — apagar a linha jogaria fora a razão da perda, que é
    // justamente o que o ano inteiro vai somar.
    motivoSemExcluir: 'Negócio não se exclui: mova para uma etapa de perda, com o motivo.',
  })

  /**
   * `Perder…` entra na barra padrão, ao lado das ações de linha.
   *
   * O quadro tem o menu do cartão; a LISTA não tem coluna nenhuma para arrastar
   * nem menu por linha, e sem esta ação a visão tabela seria a única em que
   * marcar uma perda é impossível — o operador teria de trocar de visão para
   * fazer o que estava vendo. Só existe quando o funil TEM etapa de perda:
   * botão que abre diálogo sem destino possível promete o que não cumpre.
   */
  if (etapasDePerda.length > 0) {
    actions.splice(actions.length - 1, 0, {
      id: 'perder',
      label: 'Perder…',
      icon: TrendingDown,
      needsSelection: true,
      variant: 'destructive',
      onClick: (row) => row && setPerda({ oportunidade: row }),
    })
  }

  /**
   * `Incluir` sobe para o cabeçalho da página (Polaris-2, #197) e SAI da barra
   * da tabela: é a ação forte da tela, e ela mora no mesmo canto em toda a
   * seção.
   *
   * As ações de LINHA ficam onde estão, e aqui isso não é meia-migração: nesta
   * tela a seleção depende da VISÃO — o quadro não tem linha para marcar, e é a
   * barra da tabela que sabe disso e explica ("Só na visão Lista: …"). Levá-las
   * para um `⋯` que não conhece a visão trocaria a explicação certa por
   * "escolha uma linha" numa tela onde não há linha nenhuma. A #198 (linha
   * clicável) é quem resolve isso para valer.
   */
  const incluir = actions.find((a) => a.id === 'incluir')
  const acoesDaTabela = actions.filter((a) => a.id !== 'incluir')

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        titulo={atual?.name ?? 'Funil'}
        {...(incluir
          ? {
              primaria: {
                id: incluir.id,
                label: incluir.label,
                ...(incluir.icon ? { icon: incluir.icon } : {}),
                onClick: () => incluir.onClick?.(null),
              },
            }
          : {})}
      >
        {funis.isPending ? (
          <Skeleton className="h-8 w-40" />
        ) : (
          <nav aria-label="Funis" className="flex flex-wrap items-center gap-2">
            {(funis.data ?? []).map((funil) => (
              // `Link` do router com a pele do botão: o funil escolhido mora na
              // URL, então isto é NAVEGAÇÃO — botão com `onClick` que navega
              // perderia o meio-clique, o "abrir em nova aba" e o endereço na
              // barra de status.
              <Link
                key={funil.id}
                to="/crm/funil/$funilId"
                params={{ funilId: funil.id }}
                className={buttonVariants({
                  variant: funil.id === pipelineId ? 'default' : 'outline',
                  size: 'sm',
                })}
              >
                {funil.name}
              </Link>
            ))}
          </nav>
        )}

        {/* A análise fica ao lado do funil porque é onde a pergunta nasce: quem
            vê a coluna de perdidos encher é quem quer saber por quê. Em DIÁLOGO
            e não em painel fixo — é pergunta ocasional, e um painel permanente
            custaria uma requisição por visita ao quadro para respondê-la
            quando ninguém perguntou. */}
        <Button type="button" variant="outline" size="sm" onClick={() => setPerdasAbertas(true)}>
          <TrendingDown aria-hidden="true" className="text-modulo" />
          Perdas por motivo
        </Button>

        {/* Caminho para a configuração a partir de onde ela é sentida: quem vê
            uma etapa faltando no quadro está aqui, não no menu lateral. */}
        <Link to="/crm/funis" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          Configurar funis
        </Link>
      </PageHeader>

      {/* Com backend real as colunas vêm do Postgres e os cartões do mock — o
          quadro sai vazio e vazio parece "não há negócio". Ver
          `cobertura-do-funil.tsx`; some junto com o 501 das oportunidades. */}
      <CoberturaDoFunil />

      {semEtapas ? (
        // Funil sem etapa é estado legítimo: funil nasce vazio, de propósito. E
        // o aviso vem NO LUGAR da listagem, não ao lado dela: sem etapa não há
        // oportunidade possível, e a listagem diria "nenhum registro" — que
        // mandaria cadastrar negócio quando o que falta é configurar o funil.
        <p className="rounded-card border-2 bg-card p-6 text-center text-sm text-muted-foreground">
          Este funil ainda não tem etapas. Configure as etapas no Cadastro de Funis.
        </p>
      ) : (
        <VitraDataTable
          columns={columns}
          // A chave carrega o FUNIL, e não é detalhe de cache: ela também é a
          // identidade da tela para as consultas favoritas, e um favorito que
          // filtra por etapa de um funil não faz sentido no funil do lado.
          queryKey={['crm', 'oportunidades', 'listagem', pipelineId]}
          fetcher={fetcher}
          actions={acoesDaTabela}
          searchPlaceholder="Busca por título ou cliente:"
          filtros={camposFiltraveis}
          visoes={visoes}
          agrupamentos={AGRUPAMENTOS_DO_FUNIL}
          visaoInicial="quadro"
          pageSizeOptions={[20, 50, 100]}
        />
      )}

      <PerderOportunidadeDialog
        aberto={perda !== null}
        oportunidade={perda?.oportunidade ?? null}
        etapasDePerda={etapasDePerda}
        {...(perda?.etapaId ? { etapaSugerida: perda.etapaId } : {})}
        onFechar={() => setPerda(null)}
      />

      <RelatorioDePerdasDialog
        aberto={perdasAbertas}
        pipelineId={pipelineId}
        onFechar={() => setPerdasAbertas(false)}
      />
    </div>
  )
}
