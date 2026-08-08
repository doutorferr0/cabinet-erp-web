import type { PlanItemDto, PlanItemDtoKind, PlanPhaseDto, ProjectPlanDto } from '@/api/gerado'
import type { Modulo } from '@/app/modulo'
import { Button } from '@/components/ui/button'
import { Popover, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { FILTROS, type FiltroDeProjeto, usePlanoDoProjeto, useProjetos } from '@/data/planner-api'
import { FalhaDoPainel } from '@/features/dashboard/falha'
import { Barra as BarraDeProgresso, Painel } from '@/features/dashboard/painel'
import { formatDateBR } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import {
  type Escala,
  escalaDoPlano,
  faixaDoItem,
  periodoDaFase,
  posicaoDeHoje,
  progressoDoProjeto,
} from './escala'

/**
 * PLANNER — o gantt do projeto, em LEITURA.
 *
 * Fase 1 é ler: não arrasta barra, não redimensiona, não liga dependência entre
 * itens e não troca a escala de tempo (a spec põe os três fora). O que a tela
 * responde é "o que está acontecendo quando", que é a pergunta que hoje não tem
 * resposta em lugar nenhum do sistema.
 *
 * ## A cor da barra segue o TIPO, não a fase
 *
 * A memória deixou a escolha para cá e pediu que fosse registrada. Fase já é
 * lida pela coluna da esquerda, que agrupa e nomeia; pintar a barra pela fase
 * repetiria essa informação e desperdiçaria o único canal de cor que sobra. Pelo
 * TIPO, a cor passa a dizer o que a barra É — e usa o par de módulo que o
 * sistema já ensinou em outras telas: pedido é Compras, entrega é Estoque,
 * tarefa é Vendas. O mesmo mapa da agenda do Dashboard, de propósito.
 *
 * A barra de progresso é VIOLETA, não verde: verde é dinheiro, e progresso não
 * é dinheiro. O DESIGN.md já dá a barra de progresso ao violeta de ação.
 */

const TIPOS: Record<PlanItemDtoKind, { rotulo: string; modulo: Modulo }> = {
  task: { rotulo: 'Tarefa', modulo: 'vendas' },
  order: { rotulo: 'Pedido', modulo: 'compras' },
  delivery: { rotulo: 'Entrega', modulo: 'estoque' },
}

function CabecalhoDeMeses({ escala }: { escala: Escala }) {
  return (
    <div
      className="grid border-b-2"
      style={{ gridTemplateColumns: `repeat(${escala.meses.length}, minmax(72px, 1fr))` }}
    >
      {escala.meses.map((mes, i) => (
        <span
          key={`${mes.ano}-${mes.mes}`}
          className={cn(
            'truncate px-2 py-1 text-center font-mono text-[0.75rem] font-medium uppercase tracking-[0.06em]',
            // Coluna alternada com faixa de fundo: sem ela, uma grade de 13
            // colunas vira listra indistinta e o olho perde a conta do mês.
            i % 2 === 1 && 'bg-surface-sunken',
          )}
        >
          {mes.rotulo}
        </span>
      ))}
    </div>
  )
}

function Barra({ item, escala }: { item: PlanItemDto; escala: Escala }) {
  const faixa = faixaDoItem(item, escala)
  const tipo = TIPOS[item.kind]

  return (
    <PopoverTrigger>
      <Button
        variant="outline"
        // A barra é um controle de verdade (foco, Enter, leitor de tela), e não
        // uma `div` clicável: é o que faz o gantt inteiro operável sem mouse.
        //
        // O pastel /02 do tipo entra no PRÓPRIO botão, e não numa camada por
        // baixo: o `outline` já pinta `bg-card` opaco, e um fundo colorido atrás
        // dele ficava escondido — na conferência renderizada as barras saíam
        // todas brancas. O `cn` resolve o conflito de `bg-*` a favor de quem
        // chega por último.
        data-modulo={tipo.modulo}
        className="absolute h-7 justify-start overflow-hidden bg-modulo px-2 text-left"
        style={{ left: `${faixa.esquerda}%`, width: `${faixa.largura}%` }}
        aria-label={`${tipo.rotulo}: ${item.label}`}
      >
        {/* Só o rótulo do item. A etiqueta do TIPO saiu daqui: numa barra de
            duas semanas ela vinha truncada em "TA…" e ocupava metade do espaço
            do nome. O tipo continua dito de três formas — na cor, no nome
            acessível do botão e por escrito no cartão de detalhe. */}
        <span className="truncate text-sm font-semibold">{item.label}</span>
      </Button>

      <Popover className="w-72 p-3">
        <div className="flex flex-col gap-2">
          <span className="font-display font-bold">{item.label}</span>
          <dl className="grid grid-cols-2 gap-1 text-sm">
            <dt className="text-muted-foreground">Tipo</dt>
            <dd className="text-right">{tipo.rotulo}</dd>
            <dt className="text-muted-foreground">Início</dt>
            <dd className="text-right tabular-nums">{formatDateBR(item.startsOn)}</dd>
            <dt className="text-muted-foreground">Previsão de término</dt>
            <dd className="text-right tabular-nums">{formatDateBR(item.endsOn)}</dd>
          </dl>
          <div className="flex items-center gap-2">
            {/* Trilho + preenchimento: a porcentagem também vai por escrito, ao
                lado — barra sozinha obriga a estimar no olho. */}
            {/* A barra é DESENHO do número que está escrito ao lado, e por isso
                se declara decoração. Um `role="progressbar"` aqui anunciaria a
                mesma porcentagem duas vezes no leitor de tela — e exigiria foco
                num elemento que não faz nada quando focado. */}
            <div aria-hidden="true" className="h-2.5 flex-1 border-2 bg-card">
              <div className="h-full bg-primary" style={{ width: `${item.progressPercent}%` }} />
            </div>
            <span className="font-mono text-[0.75rem] font-medium tabular-nums">
              {item.progressPercent}% concluído
            </span>
          </div>
        </div>
      </Popover>
    </PopoverTrigger>
  )
}

function Fase({ fase, escala }: { fase: PlanPhaseDto; escala: Escala }) {
  const hoje = posicaoDeHoje(escala)
  return (
    <div className="grid grid-cols-[minmax(180px,240px)_1fr] items-stretch border-b-2 last:border-b-0">
      <div className="flex gap-2 border-r-2 p-2">
        {/* Barra vertical da fase: marca o bloco sem gastar uma cor de módulo,
            que aqui já tem dono (o tipo do item). */}
        <span aria-hidden="true" className="w-1.5 shrink-0 border-2 bg-accent" />
        <div className="min-w-0">
          <p className="truncate font-semibold">{fase.name}</p>
          <p className="font-mono text-[0.75rem] font-medium text-muted-foreground">
            {fase.items.length} {fase.items.length === 1 ? 'item' : 'itens'}
          </p>
          <p className="text-sm text-muted-foreground">{periodoDaFase(fase)}</p>
        </div>
      </div>

      <div className="relative flex flex-col justify-center gap-1.5 py-2">
        {/* A linha do AGORA atravessa cada faixa de fase, e por isso é desenhada
            dentro dela: uma linha única por cima da grade teria de flutuar sobre
            o cabeçalho e a coluna de fases, e passaria por dentro do texto. */}
        {hoje !== null ? (
          <span
            aria-hidden="true"
            data-slot="hoje"
            className="absolute inset-y-0 w-0.5 bg-primary"
            style={{ left: `${hoje}%` }}
          />
        ) : null}
        {fase.items.map((item) => (
          // Cada barra na própria faixa: duas barras da mesma fase que se
          // sobrepõem no tempo se empilhariam e uma esconderia a outra.
          <div key={item.id} className="relative h-7">
            <Barra item={item} escala={escala} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function PlannerTela() {
  const [filtro, setFiltro] = useState<FiltroDeProjeto>(FILTROS.emCurso)
  const [projetoEscolhido, setProjetoEscolhido] = useState<string | null>(null)

  const projetos = useProjetos(filtro)
  // Enquanto ninguém escolheu, vale o primeiro da lista — o Planner sem projeto
  // seria uma tela vazia por decisão de ninguém.
  const projetoId = projetoEscolhido ?? projetos.data?.[0]?.id ?? null
  const plano = usePlanoDoProjeto(projetoId)
  const escala = plano.data ? escalaDoPlano(plano.data.phases) : null

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-rule-strong border-b pb-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-[-0.012em]">Planner</h1>
          <p className="text-sm text-muted-foreground">As fases do projeto na linha do tempo.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 font-mono text-[0.75rem] font-medium uppercase tracking-[0.06em]">
            Projeto
            <select
              className="h-9 border-2 border-input bg-card px-2.5 font-sans text-sm normal-case tracking-normal outline-none focus-visible:focus-ring"
              value={projetoId ?? ''}
              onChange={(evento) => setProjetoEscolhido(evento.target.value)}
              disabled={projetos.isPending || (projetos.data?.length ?? 0) === 0}
            >
              {(projetos.data ?? []).map((projeto) => (
                <option key={projeto.id} value={projeto.id}>
                  {projeto.name}
                </option>
              ))}
            </select>
          </label>

          {/* Dois botões, não um interruptor: o par diz quais são os dois
              recortes possíveis antes de o operador clicar. */}
          <div className="flex">
            <Button
              variant={filtro === FILTROS.emCurso ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setFiltro(FILTROS.emCurso)
                setProjetoEscolhido(null)
              }}
            >
              Ativos e propostos
            </Button>
            <Button
              variant={filtro === FILTROS.encerrados ? 'default' : 'outline'}
              size="sm"
              className="-ml-0.5"
              onClick={() => {
                setFiltro(FILTROS.encerrados)
                setProjetoEscolhido(null)
              }}
            >
              Encerrados
            </Button>
          </div>
        </div>
      </header>

      {projetos.isError ? (
        <FalhaDoPainel
          titulo="Os projetos não carregaram"
          erro={projetos.error}
          aoTentar={() => projetos.refetch()}
        />
      ) : plano.isError ? (
        <FalhaDoPainel
          titulo="O plano não carregou"
          erro={plano.error}
          aoTentar={() => plano.refetch()}
        />
      ) : // `enabled: false` deixa a query em `pending` PARA SEMPRE (TanStack v5:
      // pending = "ainda não tem dado", e sem projeto ela nunca vai buscar).
      // Sem a guarda do `projetoId`, o recorte sem projeto nenhum ficaria em
      // esqueleto eterno em vez de dizer que não há projeto.
      projetos.isPending || (projetoId !== null && plano.isPending) ? (
        <Skeleton className="h-64 w-full" />
      ) : projetoId === null ? (
        <p className="rounded-panel border-2 bg-card p-6 text-center text-sm text-muted-foreground">
          Nenhum projeto neste recorte.
        </p>
      ) : !escala ? (
        <p className="rounded-panel border-2 bg-card p-6 text-center text-sm text-muted-foreground">
          Este projeto ainda não tem fases planejadas.
        </p>
      ) : (
        <>
          {plano.data ? <AndamentoDoProjeto plano={plano.data} /> : null}
          <div className="overflow-x-auto rounded-panel border-2 bg-card">
            <div className="min-w-[840px]">
              <div className="grid grid-cols-[minmax(180px,240px)_1fr]">
                <span className="border-r-2 border-b-2 px-2 py-1 font-mono text-[0.75rem] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                  Fase
                </span>
                <CabecalhoDeMeses escala={escala} />
              </div>
              {plano.data?.phases.map((fase) => (
                <Fase key={fase.id} fase={fase} escala={escala} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * ANDAMENTO — o mesmo bloco de "Task Progress" da referência de dashboard, com
 * os números que ESTE plano tem: itens concluídos, em andamento e não
 * iniciados, mais a média de progresso.
 *
 * Fica ACIMA da grade porque responde a pergunta que se faz antes de olhar as
 * barras ("como está o projeto?"); a grade responde a seguinte ("o que acontece
 * quando?").
 */
function AndamentoDoProjeto({ plano }: { plano: ProjectPlanDto }) {
  const p = progressoDoProjeto(plano)
  if (p.percentual === null) return null

  return (
    <Painel titulo="Andamento">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex flex-wrap gap-y-3 divide-x divide-rule-hair">
          <Grandeza rotulo="Concluídos" valor={p.concluidos} />
          <Grandeza rotulo="Em andamento" valor={p.emAndamento} />
          <Grandeza rotulo="Não iniciados" valor={p.naoIniciados} />
          <Grandeza rotulo="Itens" valor={p.total} />
        </div>
        <div className="flex min-w-[200px] flex-1 items-center gap-3">
          <BarraDeProgresso percentual={p.percentual} />
          <span className="shrink-0 font-mono text-sm font-medium tabular-nums">
            {p.percentual}%
          </span>
        </div>
      </div>
    </Painel>
  )
}

function Grandeza({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 px-4 first:pl-0 last:pr-0">
      <span className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        {rotulo}
      </span>
      <span className="font-display text-3xl font-bold tracking-[-0.012em] tabular-nums">
        {valor}
      </span>
    </div>
  )
}
