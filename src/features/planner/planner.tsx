import type { PlanItemDtoKind, ProjectPlanDto } from '@/api/gerado'
import { FalhaDoPainel } from '@/components/cabinet/falha-do-painel'
import { Barra as BarraDeProgresso, Painel } from '@/components/cabinet/painel'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { FILTROS, type FiltroDeProjeto, usePlanoDoProjeto, useProjetos } from '@/data/planner-api'
import { Gantt } from '@svar-ui/react-gantt'
// O tema do gantt vem COM o gantt, e não do `src/main.tsx` (#227): folha de
// lib importada na entrada é paga em toda página por causa de uma tela. O
// especificador é `style.css` e não `all.css` — este último traz grid, editor,
// menu e toolbar da suíte SVAR, que o planner não monta.
import '@svar-ui/react-gantt/style.css'
import { useMemo, useState } from 'react'
import {
  TIPOS,
  janelaDoPlano,
  progressoDoProjeto,
  tarefasDoPlano,
  totalDeItens,
} from './dados-do-gantt'

/**
 * PLANNER — o gantt do projeto, em LEITURA, agora sobre `@svar-ui/react-gantt`.
 *
 * ## O que a troca tirou daqui
 *
 * Saiu `escala.ts` inteiro: a grade em porcentagem, o cabeçalho de meses, a
 * largura mínima de um dia, a linha do agora e o empilhamento de barras que se
 * sobrepõem. Era código correto e testado, e a razão de ir embora não é ele ser
 * ruim — é ser NOSSO. Geometria de gantt é problema resolvido, e manter uma
 * segunda solução ao lado da que a lib traz custa o dobro a cada mudança
 * (decisão do user, 2026-08-19: substituir, não manter em paralelo).
 *
 * O que ficou é o que o SVAR não sabe: o recorte de projeto, o Andamento e as
 * três frases de estado vazio — que são deste domínio, não do gantt.
 *
 * ## O que a troca NÃO ligou, de propósito
 *
 * `readonly` fica ligado, e as três coisas que a lib traz de graça — arrastar
 * barra, redimensionar e ligar dependência — continuam desligadas: a spec
 * aprovada (`topicos/dashboard.md` @planner) põe as três fora da fase 1, que é
 * de leitura. A troca é de motor, não de escopo; ligá-las é decisão de produto e
 * merece a própria issue.
 *
 * **Nada de `schedule`, `baselines` ou `criticalPath`:** os três existem na
 * tipagem e são PRO PAGO no SVAR. A spec não pede nenhum, e por isso a troca
 * passou sem virar blocker — mas ligar qualquer um deles depois é decisão
 * comercial, não técnica.
 *
 * ## A cor continua seguindo o TIPO
 *
 * A decisão registrada quando o gantt era caseiro vale igual: a fase já é lida
 * pela coluna da esquerda, e a barra usa o par de módulo que o sistema ensinou
 * em outras telas. O que muda é ONDE isso é dito — antes era classe no botão,
 * agora é o `taskTemplate`, que é o gancho do SVAR para o conteúdo da barra.
 */

/** Nomes de mês em pt-BR — o SVAR não traz locale nosso. */
const MES = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' })

/**
 * Duas faixas no cabeçalho: ano e mês.
 *
 * A spec pede "13 colunas, ex. jan'26–jan'27". Uma faixa só de `mar 26` repete
 * o ano treze vezes; separar em ano + mês devolve a leitura do mockup e libera
 * a linha de baixo para o mês curto.
 */
const ESCALAS = [
  { unit: 'year' as const, step: 1, format: 'yyyy' },
  { unit: 'month' as const, step: 1, format: (data: Date) => MES.format(data) },
]

/**
 * O conteúdo da barra. É aqui que a cor por TIPO entra.
 *
 * `data-modulo` é o mesmo atributo que o resto do app usa para puxar o par de
 * cor do módulo — a barra não inventa cor, herda a que o design system já
 * publicou. O `aria-label` repete tipo e nome porque a barra do SVAR é uma
 * `div`: sem ele o leitor de tela anuncia só o texto solto.
 */
function BarraDoItem({ data }: { data: { text?: string; tipo?: PlanItemDtoKind } }) {
  const tipo = data.tipo ? TIPOS[data.tipo] : null
  return (
    <span
      data-slot="barra-do-plano"
      {...(tipo ? { 'data-modulo': tipo.modulo } : {})}
      className="flex h-full items-center overflow-hidden bg-modulo px-2 text-left"
      aria-label={tipo ? `${tipo.rotulo}: ${data.text ?? ''}` : (data.text ?? '')}
    >
      <span className="truncate text-sm font-semibold">{data.text}</span>
    </span>
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

  const tarefas = useMemo(() => (plano.data ? tarefasDoPlano(plano.data) : []), [plano.data])
  const janela = useMemo(() => (plano.data ? janelaDoPlano(plano.data.phases) : null), [plano.data])

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-rule-strong border-b pb-3">
        <div>
          <h1 className="font-nome text-3xl font-bold">Planner</h1>
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
      ) : !janela ? (
        <p className="rounded-panel border-2 bg-card p-6 text-center text-sm text-muted-foreground">
          Este projeto ainda não tem fases planejadas.
        </p>
      ) : (
        <>
          {plano.data ? <AndamentoDoProjeto plano={plano.data} /> : null}
          {/*
            A moldura é NOSSA e o miolo é da lib. O `rounded-panel border-2` é o
            mesmo da versão anterior e da folha das outras telas da seção — sem
            ele o gantt apareceria como um retângulo estrangeiro no meio da
            página, que é exatamente o que a issue quis evitar ao recusar a
            suíte SVAR inteira.

            `data-secao="dashboard"` mantém o Planner na cor da seção (laranja
            `#FF6B2C`, s120): quem lê a cor sabe em que parte do sistema está, e
            a troca de motor não pode mudar isso.
          */}
          <div
            data-secao="dashboard"
            data-slot="gantt"
            className="overflow-hidden rounded-panel border-2 bg-card"
          >
            <Gantt
              readonly
              tasks={tarefas}
              scales={ESCALAS}
              {...(janela ? { start: janela.inicio, end: janela.fim } : {})}
              taskTemplate={BarraDoItem}
              // Uma coluna só, a de nome — a versão anterior também mostrava
              // fase e nome e nada mais. `Duração` e `Início` do padrão do SVAR
              // repetiriam o que a própria barra já diz na horizontal.
              columns={[{ id: 'text', header: 'Fase', flexgrow: 1 }]}
              // A linha do AGORA, que o gantt caseiro desenhava à mão. Sem
              // `css`: uma classe própria aqui não teria folha de estilo — o
              // `index.css` é de outra zona — e classe que não pinta nada se lê
              // como pintada. Fica o marcador do SVAR, que já vem estilizado.
              markers={[{ start: new Date(), text: 'Hoje' }]}
            />
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
 *
 * Continua NOSSO depois da troca: o SVAR desenha o plano, não resume o projeto.
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
          <Grandeza rotulo="Itens" valor={totalDeItens(plano)} />
        </div>
        <div className="flex min-w-[200px] flex-1 items-center gap-3">
          {/* VIOLETA, não verde: verde é dinheiro e progresso não é dinheiro.
              O DESIGN.md já dá a barra de progresso ao violeta de ação. */}
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
      {/* A voz de QUANTO (PT Mono), e SEM negrito: o `@fontsource` publica só o
          peso 400 do PT Mono, e `font-bold` sem arquivo de 700 viraria negrito
          sintético — o browser engorda o traço por conta. Quem dá presença ao
          número aqui é a largura da mono e a tabularidade, não o peso
          (decisão do user, 2026-08-13). */}
      <span className="font-mono text-3xl tabular-nums">{valor}</span>
    </div>
  )
}
