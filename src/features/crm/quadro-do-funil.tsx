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
import { useEstagios, useMoverOportunidade, useOportunidades } from '@/data/crm-api'
import { formatDateBR, formatMoneyBRL } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { Calendar, MoreHorizontal } from 'lucide-react'
import { agruparPorEtapa, quemDoCartao, somaDaColuna } from './funil-agrupa'

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
 * nunca inferência. O sinal de apodrecimento (`rotDays` × `stageChangedAt`)
 * ficou de FORA por escolha dele, embora o contrato já o sirva.
 */

/** O que o menu de um cartão pode fazer. `null` = fim da coluna de destino. */
interface Destino {
  stageId: string
  precedeId: string | null
  rotulo: string
}

function destinosDoCartao(
  oportunidade: CrmOpportunityDto,
  etapas: readonly CrmStageDto[],
  coluna: readonly CrmOpportunityDto[],
): Destino[] {
  const outras = etapas
    .filter((etapa) => etapa.id !== oportunidade.stageId)
    .map((etapa) => ({ stageId: etapa.id, precedeId: null, rotulo: etapa.name }))

  const primeiro = coluna[0]
  const ultimo = coluna[coluna.length - 1]
  const dentroDaColuna: Destino[] = []

  // Reposicionar só faz sentido com vizinho: numa coluna de um cartão só, os
  // dois itens moveriam o cartão para onde ele já está.
  if (primeiro && ultimo && primeiro.id !== ultimo.id) {
    if (oportunidade.id !== primeiro.id) {
      dentroDaColuna.push({
        stageId: oportunidade.stageId,
        precedeId: primeiro.id,
        rotulo: 'Topo desta etapa',
      })
    }
    if (oportunidade.id !== ultimo.id) {
      dentroDaColuna.push({
        stageId: oportunidade.stageId,
        precedeId: null,
        rotulo: 'Fim desta etapa',
      })
    }
  }

  return [...dentroDaColuna, ...outras]
}

function Cartao({
  oportunidade,
  destinos,
}: {
  oportunidade: CrmOpportunityDto
  destinos: Destino[]
}) {
  const mover = useMoverOportunidade()
  const quem = quemDoCartao(oportunidade)
  // O contrato declara os dois anuláveis E opcionais, então o tipo gerado é
  // `number | null | undefined`. Colapsar em `null` aqui evita repetir a
  // dupla checagem em cada uso — ausente e nulo significam a mesma coisa: o
  // servidor não tem o dado.
  const valorCents = oportunidade.expectedValueCents ?? null
  const dataPrevista = oportunidade.expectedCloseDate ?? null

  return (
    <li data-slot="cartao" className="rounded-card border-2 bg-card p-2.5">
      <div className="flex items-start gap-1">
        {/* TÍTULO, não link: a tela de detalhe da oportunidade ainda não
            existe (o contrato tem `GET /api/crm/opportunities/{id}`, a tela
            não). Botão que não leva a lugar nenhum é pior que texto — promete
            uma ação e devolve nada. Vira link no dia em que a tela existir. */}
        <span className="flex-1 font-display font-semibold leading-tight">{oportunidade.name}</span>

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
                onAction={() =>
                  mover.mutate({
                    id: oportunidade.id,
                    destino: { stageId: destino.stageId, precedeId: destino.precedeId },
                  })
                }
              >
                {destino.rotulo}
              </DropdownMenuItem>
            ))}
          </DropdownMenu>
        </DropdownMenuTrigger>
      </div>

      {quem ? <p className="mt-1 text-sm text-muted-foreground">{quem}</p> : null}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-1.5 text-sm text-muted-foreground">
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
  etapa,
  cartoes,
  etapas,
}: {
  etapa: CrmStageDto
  cartoes: CrmOpportunityDto[]
  etapas: readonly CrmStageDto[]
}) {
  return (
    <section
      data-slot="coluna"
      aria-label={etapa.name}
      // A coluna é caixa própria na superfície afundada e os cartões ficam em
      // `bg-card` por cima — é o contraste que separa o cartão da coluna. O
      // preenchimento NÃO varia por etapa: aqui a cor já é a do módulo (o verde
      // do CRM), e pintar cada etapa de um tom diria que etapa é módulo.
      className={cn(
        'flex min-w-0 flex-col gap-2 rounded-panel border-2 bg-surface-sunken p-2.5 shadow-el1',
        // Ganho e perda são propriedades da ETAPA, e o quadro as mostra: a
        // coluna que fecha o negócio não é uma etapa qualquer no meio do fluxo.
        etapa.isWon && 'bg-zone-money',
        etapa.isLost && 'bg-zone-warn',
      )}
    >
      <header className="flex items-center gap-2 rounded-card border-2 bg-card px-2 py-1.5">
        <h3 className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.06em]">
          {etapa.name}
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
              destinos={destinosDoCartao(oportunidade, etapas, cartoes)}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

export function QuadroDoFunil({ pipelineId }: { pipelineId: string }) {
  const etapas = useEstagios(pipelineId)
  const oportunidades = useOportunidades({ pipelineId })

  if (etapas.isPending || oportunidades.isPending) {
    return (
      <div className="grid grid-cols-[repeat(auto-fit,minmax(238px,1fr))] gap-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    )
  }

  if (etapas.isError || oportunidades.isError) {
    return (
      <FalhaDoPainel
        titulo="O funil não carregou"
        erro={etapas.error ?? oportunidades.error}
        aoTentar={() => {
          void etapas.refetch()
          void oportunidades.refetch()
        }}
      />
    )
  }

  const colunas = etapas.data ?? []

  if (colunas.length === 0) {
    // Funil sem etapa é estado legítimo: funil nasce vazio, de propósito. A
    // saída é o cadastro, e a tela diz qual — em branco não diz nada.
    return (
      <p className="rounded-card border-2 bg-card p-6 text-center text-sm text-muted-foreground">
        Este funil ainda não tem etapas. Configure as etapas no Cadastro de Funis.
      </p>
    )
  }

  const porEtapa = agruparPorEtapa(oportunidades.data?.rows ?? [], colunas)

  return (
    // `auto-fit`/`minmax`, nunca `@media`: as colunas espremem antes de quebrar
    // em duas linhas, e a quebra reage ao espaço REAL — inclusive à gaveta de
    // notificações encolhendo o `<main>`, que um breakpoint fixo não veria.
    // `items-start`: cada coluna para onde os cartões dela param.
    <div className="grid grid-cols-[repeat(auto-fit,minmax(238px,1fr))] items-start gap-4">
      {colunas.map((etapa) => (
        <Coluna key={etapa.id} etapa={etapa} etapas={colunas} cartoes={porEtapa[etapa.id] ?? []} />
      ))}
    </div>
  )
}
