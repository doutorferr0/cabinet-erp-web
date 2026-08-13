import { FalhaDoPainel } from '@/components/cabinet/falha-do-painel'
import { Barra, Painel } from '@/components/cabinet/painel'
import { Skeleton } from '@/components/ui/skeleton'
import { cargaPorPessoa, progressoDoQuadro, useTarefas } from '@/data/dashboard-api'

/**
 * PROGRESSO DO QUADRO e CARGA POR PESSOA.
 *
 * Conteúdo tirado da referência de dashboard aprovada pelo user (a página
 * `project` do Brutalism): lá são "Task Progress" com Complete/Remaining/Total e
 * "Workload" com uma barra por pessoa. As duas perguntas que faltavam aqui —
 * *quanto do trabalho já fechou* e *quem está carregando o quê* — e nenhuma
 * delas precisa de campo novo: saem das tarefas que o quadro já carregou.
 *
 * **O que da referência NÃO veio, e por quê:** Budget, Performance e Project
 * Costs. Não existe orçamento nem custo de projeto no contrato, e um cartão
 * "54% · R$ 2.700 restantes" seria número inventado com cara de número do
 * servidor — o proibido nº 1 deste repo. Entram quando houver caminho.
 *
 * Lê a MESMA consulta do quadro (`useTarefas`), sem busca: o TanStack Query
 * devolve o cache, então não há requisição a mais. Passar a busca aqui faria a
 * contagem mudar ao digitar, e "3 de 8 concluídas" viraria uma fração do filtro
 * em vez do retrato do trabalho.
 */
export function ProgressoDoQuadro() {
  const query = useTarefas()

  if (query.isPending) return <Skeleton className="h-[140px] w-full" />
  if (query.isError || !query.data) {
    return (
      <FalhaDoPainel
        titulo="O progresso não carregou"
        erro={query.error}
        aoTentar={() => query.refetch()}
      />
    )
  }

  const progresso = progressoDoQuadro(query.data)
  const carga = cargaPorPessoa(query.data)

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <Painel titulo="Progresso das Tarefas">
        <div className="flex flex-wrap gap-y-3 divide-x divide-rule-hair">
          <Grandeza rotulo="Concluídas" valor={progresso.concluidas} />
          <Grandeza rotulo="Em aberto" valor={progresso.emAberto} />
          <Grandeza rotulo="Total" valor={progresso.total} />
        </div>

        {/* Sem tarefa nenhuma não há barra: 0 de 0 não é "0% concluído", e uma
            barra vazia diria que o time está atrasado num quadro que ninguém
            começou. */}
        {progresso.percentual === null ? (
          <p className="text-sm text-muted-foreground">Nenhuma tarefa no quadro.</p>
        ) : (
          /* `mt-auto`: a barra desce para o rodapé do painel. Sem isso ela
             ficava colada nos números e o painel terminava num vazio do tamanho
             da diferença para o painel vizinho, que é mais alto. */
          <div className="mt-auto flex items-center gap-3">
            <Barra percentual={progresso.percentual} />
            <span className="shrink-0 font-mono text-sm font-medium tabular-nums">
              {progresso.percentual}%
            </span>
          </div>
        )}
      </Painel>

      <Painel titulo="Carga por Responsável">
        {carga.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma tarefa tem responsável — a carga aparece quando alguém assume.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {carga.map((pessoa) => (
              <li key={pessoa.id} className="flex items-center gap-3">
                {/* Roxo de marca é o tom de avatar do sistema, igual para todos:
                    cor por pessoa viraria uma paleta paralela à de módulo. */}
                <span className="grid size-8 shrink-0 place-content-center rounded-item border-2 bg-accent font-mono text-[0.75rem] font-medium">
                  {pessoa.iniciais}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-baseline gap-2">
                    <span className="truncate font-semibold">{pessoa.nome}</span>
                    <span className="ml-auto shrink-0 font-mono text-sm tabular-nums text-muted-foreground">
                      {pessoa.concluidas}/{pessoa.total}
                    </span>
                  </div>
                  <Barra percentual={pessoa.percentual} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Painel>
    </div>
  )
}

/** Rótulo em Meta acima, número na voz de QUANTO abaixo — a tira de apuração. */
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
