import type { CrmOpportunityDto, CrmStageDto } from '@/api/gerado'
import { FalhaDoPainel } from '@/components/cabinet/falha-do-painel'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useEstagios, useMoverOportunidade } from '@/data/crm-api'
import { formatDateBR, formatMoneyBRL } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { Link } from '@tanstack/react-router'
import { Calendar, MoreHorizontal, Plus } from 'lucide-react'
import { type Apodrecimento, apodrecimentoDoCartao } from './apodrecimento'
import { type ColunaDoQuadro, colunasDoQuadro, quemDoCartao, somaDaColuna } from './funil-agrupa'
import { SeloDeApodrecimento } from './selo-de-apodrecimento'

/**
 * O QUADRO DO FUNIL — as oportunidades nas etapas configuradas.
 *
 * Estrutura colhida de `DealListContent.tsx`/`DealColumn.tsx`/`DealCard.tsx` do
 * Atomic CRM (MIT — ver `NOTICE`); a anatomia visual é a do quadro de Tarefas
 * (`src/features/tarefas/quadro.tsx`), que já resolveu este problema aqui.
 *
 * ## Move-se por CLIQUE, não por arrasto — como o quadro de Tarefas
 *
 * O material colhido trazia arrasto HTML5 nativo por cima do menu. Ele NÃO
 * atravessou, e o motivo já estava escrito no quadro de Tarefas: arrasto não
 * existe para quem opera por teclado nem em leitor de tela, e num ERP denso
 * concorre com a rolagem da coluna. Dois quadros no mesmo produto com regras de
 * interação diferentes seria pior que qualquer ganho de gesto.
 *
 * **A posição continua alcançável por clique:** o menu do cartão move para o
 * FIM de outra etapa, e — dentro da própria coluna — para o topo ou para o fim.
 * É o que faz o `precedeId` do contrato ser exercido sem gesto nenhum.
 *
 * ## Uma intenção, uma requisição
 *
 * Cada item do menu dispara UM `PATCH /api/crm/opportunities/{id}/stage` com
 * `{stageId, precedeId}`. Quem reordena a coluna inteira é o servidor, numa
 * transação — ver `docs/harvest/kanban-funil/integracao.md` para o desenho que
 * foi recusado (um `PUT` por linha deslocada, sem atomicidade).
 *
 * ## Os campos do cartão são os que o USER escolheu (2026-08-13)
 *
 * Título, quem (parceiro cadastrado ou o contato solto do lead), valor previsto
 * e data prevista. `topicos/transcricaosoftlux.md` não tem funil e
 * `topicos/dashboard.md` também não — então campo de cartão é pergunta ao user,
 * nunca inferência.
 *
 * ## O apodrecimento entrou depois (#87)
 *
 * `rotDays` × `stageChangedAt` estava no contrato desde a #75 e ficou de fora
 * na primeira escolha de campos. Entrou como SELO no rodapé do cartão, mais o
 * tingimento do cartão inteiro no último degrau — ver `apodrecimento.ts` para a
 * régua e `selo-de-apodrecimento.tsx` para o desenho.
 *
 * ## O quadro não consulta nada (view modes, #86)
 *
 * As oportunidades chegam PRONTAS, da listagem que também desenha a visão
 * Lista. É o que faz as duas visões responderem à mesma pergunta: com consulta
 * própria aqui, alternar quadro ⇄ lista mudaria de filtro sem avisar, e a
 * mesma tela mostraria duas contagens diferentes do mesmo funil.
 *
 * O que ele ainda consulta são as ETAPAS — que não são dado da listagem, são a
 * configuração do funil, e continuam sendo necessárias mesmo quando as colunas
 * agrupam por outro campo: o menu `Mover para` move entre ETAPAS sempre.
 */

/** O que o menu de um cartão pode fazer. `null` = fim da coluna de destino. */
export interface Destino {
  stageId: string
  precedeId: string | null
  rotulo: string
  /**
   * A etapa de destino é de PERDA (`isLost`)?
   *
   * É fato sobre a ETAPA, não sobre o movimento — e a distinção importa porque
   * o contrato cobra `lostReasonId` **toda vez que o destino é de perda**,
   * inclusive quando o cartão já está lá e só muda de posição na coluna.
   */
  perda: boolean
}

function destinosDoCartao(
  oportunidade: CrmOpportunityDto,
  etapas: readonly CrmStageDto[],
  coluna: readonly CrmOpportunityDto[],
  colunaEhEtapa: boolean,
): Destino[] {
  const outras = etapas
    .filter((etapa) => etapa.id !== oportunidade.stageId)
    .map((etapa) => ({
      stageId: etapa.id,
      precedeId: null,
      rotulo: etapa.name,
      perda: etapa.isLost,
    }))

  // Reposicionar é um fato sobre a ORDEM DENTRO DA ETAPA (`precedeId` aponta o
  // vizinho de etapa). Agrupado por responsável, "topo desta coluna" pediria ao
  // servidor uma posição relativa a cartões de etapas diferentes — pergunta que
  // o contrato não tem como responder, e cujo efeito o operador não veria.
  if (!colunaEhEtapa) return outras

  const primeiro = coluna[0]
  const ultimo = coluna[coluna.length - 1]
  const dentroDaColuna: Destino[] = []
  // A etapa em que o cartão JÁ ESTÁ pode ser de perda, e reposicionar dentro
  // dela continua sendo um `PATCH` com `stageId` de etapa `isLost` — o servidor
  // cobra o motivo do mesmo jeito.
  const aquiEhPerda = etapas.find((etapa) => etapa.id === oportunidade.stageId)?.isLost ?? false

  // Reposicionar só faz sentido com vizinho: numa coluna de um cartão só, os
  // dois itens moveriam o cartão para onde ele já está.
  if (primeiro && ultimo && primeiro.id !== ultimo.id) {
    if (oportunidade.id !== primeiro.id) {
      dentroDaColuna.push({
        stageId: oportunidade.stageId,
        precedeId: primeiro.id,
        rotulo: 'Topo desta etapa',
        perda: aquiEhPerda,
      })
    }
    if (oportunidade.id !== ultimo.id) {
      dentroDaColuna.push({
        stageId: oportunidade.stageId,
        precedeId: null,
        rotulo: 'Fim desta etapa',
        perda: aquiEhPerda,
      })
    }
  }

  return [...dentroDaColuna, ...outras]
}

function Cartao({
  oportunidade,
  destinos,
  mostraEtapa,
  apodrecimento,
  aoPerder,
}: {
  oportunidade: CrmOpportunityDto
  destinos: Destino[]
  /** A coluna não é a etapa — então a etapa precisa estar escrita no cartão. */
  mostraEtapa: boolean
  /** `null` = a etapa deste cartão não apodrece (sem `rotDays`, ou fecha). */
  apodrecimento: Apodrecimento | null
  /** Pede o motivo antes de perder. Quem tem o diálogo é a PÁGINA. */
  aoPerder: (oportunidade: CrmOpportunityDto, etapaId: string) => void
}) {
  const mover = useMoverOportunidade()
  const quem = quemDoCartao(oportunidade)
  // O contrato declara os dois anuláveis E opcionais, então o tipo gerado é
  // `number | null | undefined`. Colapsar em `null` aqui evita repetir a
  // dupla checagem em cada uso — ausente e nulo significam a mesma coisa: o
  // servidor não tem o dado.
  const valorCents = oportunidade.expectedValueCents ?? null
  const dataPrevista = oportunidade.expectedCloseDate ?? null

  /**
   * O item do menu dispara três coisas diferentes, e confundi-las é o defeito
   * que esta issue conserta.
   *
   * 1. **Destino comum** — `PATCH` direto, como sempre foi.
   * 2. **Destino de perda, cartão ainda ABERTO** — abre o diálogo. O motivo é
   *    dado novo, e só o operador o tem; mandar sem ele era o 400 que deixava o
   *    cartão parado com um recado que ninguém podia atender.
   * 3. **Destino de perda, cartão JÁ perdido** — reenvia o motivo que está
   *    gravado. Acontece ao reposicionar dentro da coluna de perda e ao trocar
   *    de uma etapa de perda para outra; o contrato cobra `lostReasonId` nos
   *    dois casos, e perguntar de novo o que a tela tem em mãos seria diálogo
   *    para confirmar o já dito.
   */
  function escolher(destino: Destino) {
    if (destino.perda && !oportunidade.lostReasonId) {
      aoPerder(oportunidade, destino.stageId)
      return
    }
    mover.mutate({
      id: oportunidade.id,
      destino: {
        stageId: destino.stageId,
        precedeId: destino.precedeId,
        ...(destino.perda ? { lostReasonId: oportunidade.lostReasonId } : {}),
      },
    })
  }

  return (
    <li
      data-slot="cartao"
      className={cn(
        'rounded-card border-2 bg-card p-2.5',
        // O TINGIMENTO é o terceiro degrau, e só no fim: nada → selo → selo +
        // cartão tingido. Tingir já no aviso gastaria o sinal forte antes de o
        // prazo estourar, e aí o vermelho não significaria mais nada.
        apodrecimento?.estado === 'apodrecido' && 'bg-zone-danger',
      )}
    >
      <div className="flex items-start gap-1">
        {/* Link do router, não `onClick` na caixa: o cartão leva a uma URL
            própria, e link preserva meio-clique, "abrir em nova aba" e o
            endereço na barra de status. Caixa inteira clicável também não é
            alcançável por teclado e engoliria o clique do menu. */}
        <Link
          to="/crm/oportunidades/$oportunidadeId"
          params={{ oportunidadeId: oportunidade.id }}
          className="flex-1 font-display font-semibold leading-tight underline-offset-2 hover:underline"
        >
          {oportunidade.name}
        </Link>

        <DropdownMenuTrigger>
          <Button
            variant="ghost"
            size="icon-sm"
            className="ml-auto"
            aria-label={`Ações de ${oportunidade.name}`}
          >
            <MoreHorizontal className="text-modulo" />
          </Button>
          <DropdownMenu placement="bottom end">
            <DropdownMenuLabel>Mover para</DropdownMenuLabel>
            {destinos.map((destino) => (
              <DropdownMenuItem
                key={`${destino.stageId}-${destino.precedeId ?? 'fim'}`}
                onAction={() => escolher(destino)}
              >
                {destino.rotulo}
              </DropdownMenuItem>
            ))}
          </DropdownMenu>
        </DropdownMenuTrigger>
      </div>

      {quem ? <p className="mt-1 text-sm text-muted-foreground">{quem}</p> : null}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-1.5 text-sm text-muted-foreground">
        {/* Agrupado por outro campo, a coluna deixa de dizer em que etapa o
            negócio está — e sem isso o item `Mover para` do menu levaria o
            cartão para um lugar que a tela não mostra. O carimbo devolve o que
            a coluna deixou de contar. */}
        {mostraEtapa ? (
          <span className="border-2 border-border px-1.5 font-mono text-[0.75rem] uppercase tracking-[0.06em] text-foreground">
            {oportunidade.stageName}
          </span>
        ) : null}
        {/* Dinheiro em centavos inteiros; R$ só aqui, na borda de exibição.
            `null` é "ainda não estimado" e some — zero diria outra coisa. */}
        {valorCents === null ? null : (
          <span className="font-mono tabular-nums text-foreground">
            {formatMoneyBRL(valorCents)}
          </span>
        )}
        {dataPrevista ? (
          <span className="flex items-center gap-1 tabular-nums">
            <Calendar className="size-3.5" aria-hidden="true" />
            {formatDateBR(dataPrevista)}
          </span>
        ) : null}
        {/* No fim da fileira de rodapé, e não no alto: o apodrecimento é sobre o
            TEMPO do cartão, e mora ao lado da data prevista — não competindo
            com o título, que é o que o operador lê primeiro. */}
        {apodrecimento ? (
          <SeloDeApodrecimento apodrecimento={apodrecimento} className="ml-auto" />
        ) : null}
      </div>

      {mover.isError ? (
        // O `detail` do problem+json diz o motivo — "estágio de perda exige
        // motivo", por exemplo. Sem ele o cartão simplesmente não se mexeria.
        <p role="alert" className="mt-1 text-[0.75rem] text-destructive">
          {mover.error instanceof Error ? mover.error.message : 'Falha ao mover.'}
        </p>
      ) : null}
    </li>
  )
}

function Coluna({
  coluna,
  etapas,
  pipelineId,
  aoPerder,
}: {
  coluna: ColunaDoQuadro
  etapas: readonly CrmStageDto[]
  pipelineId: string
  aoPerder: (oportunidade: CrmOpportunityDto, etapaId: string) => void
}) {
  const { etapa, cartoes } = coluna
  return (
    <section
      data-slot="coluna"
      aria-label={coluna.titulo}
      // A coluna é caixa própria na superfície afundada e os cartões ficam em
      // `bg-card` por cima — é o contraste que separa o cartão da coluna. O
      // preenchimento NÃO varia por etapa: aqui a cor já é a do módulo (o verde
      // do CRM), e pintar cada etapa de um tom diria que etapa é módulo.
      className={cn(
        'flex min-w-0 flex-col gap-2 rounded-panel border-2 bg-surface-sunken p-2.5 shadow-el1',
        // Ganho e perda são propriedades da ETAPA, e o quadro as mostra: a
        // coluna que fecha o negócio não é uma etapa qualquer no meio do fluxo.
        // Agrupado por outro campo, a coluna não é etapa nenhuma e não herda a
        // zona — pintar de verde a coluna de um vendedor diria que ele é o
        // negócio fechado.
        etapa?.isWon && 'bg-zone-money',
        etapa?.isLost && 'bg-zone-warn',
      )}
    >
      <header className="flex items-center gap-2 rounded-card border-2 bg-card px-2 py-1.5">
        <h3 className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.06em]">
          {coluna.titulo}
        </h3>
        <span className="rounded-item border-2 px-1.5 font-mono text-[0.75rem] font-medium tabular-nums">
          {cartoes.length}
        </span>
        {/* O total da etapa em centavos formatados, não em notação compacta: o
            operador confere este número contra o orçamento, e "R$ 12,3 mil" não
            se confere. */}
        <span className="ml-auto font-mono text-[0.75rem] tabular-nums">
          {formatMoneyBRL(somaDaColuna(cartoes))}
        </span>
        {/* Incluir NA COLUNA, e não um botão único no alto: o operador que abre
            uma oportunidade já sabe em que etapa ela nasce, e a etapa viaja na
            URL. Um `Incluir` genérico faria escolher a etapa duas vezes.
            Só existe quando a coluna É uma etapa: numa coluna de responsável, o
            cartão novo não teria etapa nenhuma para nascer, e escolher uma por
            ele seria o `Incluir` decidindo o funil. */}
        {etapa ? (
          <Link
            to="/crm/oportunidades/$oportunidadeId"
            params={{ oportunidadeId: 'novo' }}
            search={{ funilId: pipelineId, etapaId: etapa.id }}
            aria-label={`Incluir oportunidade em ${etapa.name}`}
            className="grid size-6 place-content-center rounded-item border-2 hover:bg-modulo"
          >
            <Plus className="size-3.5" aria-hidden="true" />
          </Link>
        ) : null}
      </header>

      {cartoes.length === 0 ? (
        <p className="rounded-card border-2 border-dashed p-3 text-center text-sm text-muted-foreground">
          Nenhuma oportunidade nesta etapa.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {cartoes.map((oportunidade) => (
            <Cartao
              key={oportunidade.id}
              oportunidade={oportunidade}
              mostraEtapa={etapa === undefined}
              // A etapa vem da CONFIGURAÇÃO, não da coluna: agrupado por
              // responsável a coluna não é etapa nenhuma, e o cartão continua
              // apodrecendo pelo prazo da etapa em que ele está.
              apodrecimento={apodrecimentoDoCartao(
                oportunidade,
                etapas.find((e) => e.id === oportunidade.stageId),
              )}
              destinos={destinosDoCartao(oportunidade, etapas, cartoes, etapa !== undefined)}
              aoPerder={aoPerder}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

export function QuadroDoFunil({
  pipelineId,
  oportunidades,
  agruparPor,
  aoPerder,
}: {
  pipelineId: string
  /** As linhas que a LISTAGEM trouxe — o quadro não consulta oportunidade. */
  oportunidades: readonly CrmOpportunityDto[]
  agruparPor: string
  /**
   * Pede o motivo antes de perder. O diálogo mora na PÁGINA, e não aqui, porque
   * a listagem também precisa dele: com um diálogo por visão, o operador teria
   * dois caminhos com estados diferentes para a mesma decisão.
   */
  aoPerder: (oportunidade: CrmOpportunityDto, etapaId: string) => void
}) {
  const etapas = useEstagios(pipelineId)

  if (etapas.isPending) {
    return (
      <div className="grid grid-cols-[repeat(auto-fit,minmax(238px,1fr))] gap-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    )
  }

  if (etapas.isError) {
    return (
      <FalhaDoPainel
        titulo="As etapas do funil não carregaram"
        erro={etapas.error}
        aoTentar={() => {
          void etapas.refetch()
        }}
      />
    )
  }

  // Funil SEM etapa não chega aqui: quem avisa é a página, antes da listagem —
  // ver `PaginaDoFunil`. O aviso subiu de nível porque o defeito não é da
  // visão: sem etapa, nem quadro nem tabela têm o que mostrar, e a listagem
  // diria "nenhum registro" para uma configuração que falta.
  const configuradas = etapas.data ?? []
  const colunas = colunasDoQuadro(oportunidades, configuradas, agruparPor)

  return (
    // `auto-fit`/`minmax`, nunca `@media`: as colunas espremem antes de quebrar
    // em duas linhas, e a quebra reage ao espaço REAL — inclusive à gaveta de
    // notificações encolhendo o `<main>`, que um breakpoint fixo não veria.
    // `items-start`: cada coluna para onde os cartões dela param.
    <div className="grid grid-cols-[repeat(auto-fit,minmax(238px,1fr))] items-start gap-4">
      {colunas.map((coluna) => (
        <Coluna
          key={coluna.chave}
          coluna={coluna}
          etapas={configuradas}
          pipelineId={pipelineId}
          aoPerder={aoPerder}
        />
      ))}
    </div>
  )
}
