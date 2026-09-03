import type { TaskDto, TaskDtoStatus } from '@/api/gerado'
import { ModoCalendario } from '@/components/cabinet/listagem/modo-calendario'
import type { TomDoCartao } from '@/components/cabinet/listagem/modo-kanban'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTarefas } from '@/data/dashboard-api'
import { Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { apurarQuadro, estaAtrasada, hojeISO } from './apuracao'
import { FaixaDoQuadro } from './faixa'
import { ListaDeTarefas } from './lista'
import { NovaTarefa } from './nova-tarefa'
import { Quadro } from './quadro'

/**
 * TAREFAS — o quadro do que precisa ser feito, com a lista e o calendário da
 * mesma consulta.
 *
 * **Saiu do Dashboard** (§@casca-global): o user reclamou duas vezes seguidas —
 * "muito bege e vazio" e depois "está muita coisa/poluído". A segunda se
 * resolve com uma tela por assunto: o Dashboard olha o que está POR VIR, esta
 * olha o que precisa ser TRABALHADO agora.
 *
 * ## O que a Reface 2.0 mudou (mockup, aba Quadro)
 *
 * 1. **Cabeçalho 2.0**: título em `--t-pagina` (Gambarino 28), subtítulo com a
 *    apuração do quadro em `--t-meta`, e as ações à direita — segmented de
 *    visão, busca, e a única peça forte (`+ Nova tarefa`).
 * 2. **A faixa substituiu o painel de progresso**: três KPIs tintados e a carga
 *    por responsável (`faixa.tsx`), no lugar de dois painéis de contorno grosso.
 * 3. **Terceira visão, Calendário**, que o mockup pede e o 1.x não tinha. Ela é
 *    o `ModoCalendario` genérico de D12 recebendo as MESMAS linhas — não uma
 *    consulta nova, que é o que faria a contagem mudar ao trocar de aba.
 *
 * ## Por que o cabeçalho é local, e não o `PageHeader`
 *
 * `components/cabinet/page-header.tsx` ainda é 1.x nesta base (título em Inter
 * bold 24px por classe literal) e sua faixa de ações não acomoda o segmented à
 * direita: `children` entra ANTES do `ml-auto`, colado ao título. Reescrevê-lo
 * é zona de D5. O cabeçalho daqui usa só degraus `--t-*`, e a tela volta a
 * compor o `PageHeader` quando ele chegar ao 2.0.
 */
export function TarefasTela() {
  const [busca, setBusca] = useState('')
  const [incluindoEm, setIncluindoEm] = useState<TaskDtoStatus | null>(null)
  const hoje = hojeISO()

  // A MESMA consulta do quadro, sem busca: o TanStack Query devolve o cache,
  // então não há requisição a mais. Passar a busca aqui faria a apuração mudar
  // ao digitar, e "1 atrasada" viraria uma fração do filtro em vez do retrato
  // do trabalho.
  const query = useTarefas()
  const tarefas = query.data ?? []

  return (
    <div className="flex flex-col" style={{ gap: 'var(--s-5)' }}>
      {/* O segmented mora DENTRO do `Tabs` abaixo — o `TabsList` É ele, e o
          estado da visão é dele. O cabeçalho fica com o que não depende de
          visão nenhuma: o título, a apuração e a única ação forte. */}
      <Cabecalho tarefas={tarefas} hoje={hoje} aoIncluir={() => setIncluindoEm('todo')} />

      {/* A faixa só aparece com dado. Enquanto a consulta corre, o quadro já
          mostra os esqueletos das colunas — três tiles vazios acima deles
          seriam duas esperas onde há uma. */}
      {query.isSuccess ? <FaixaDoQuadro tarefas={tarefas} hoje={hoje} /> : null}

      <Tabs defaultValue="quadro">
        <div className="flex flex-wrap items-center justify-between" style={{ gap: 'var(--s-2)' }}>
          <TabsList>
            <TabsTrigger value="quadro">Quadro</TabsTrigger>
            <TabsTrigger value="lista">Lista</TabsTrigger>
            <TabsTrigger value="calendario">Calendário</TabsTrigger>
          </TabsList>

          {/* A busca vale para as TRÊS visões: é a mesma consulta por baixo, e
              trocar de vista não deve descartar o que o operador digitou. */}
          <div className="relative w-full sm:w-64">
            <Search
              className="pointer-events-none absolute top-2.5 left-2 size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              aria-label="Buscar tarefa"
              placeholder="Buscar tarefa…"
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <TabsContent value="quadro">
          <Quadro busca={busca} hoje={hoje} aoIncluir={setIncluindoEm} />
        </TabsContent>
        <TabsContent value="lista">
          <ListaDeTarefas busca={busca} />
        </TabsContent>
        <TabsContent value="calendario">
          <CalendarioDeTarefas busca={busca} hoje={hoje} />
        </TabsContent>
      </Tabs>

      <NovaTarefa
        aberto={incluindoEm !== null}
        statusInicial={incluindoEm ?? 'todo'}
        onOpenChange={(aberto) => setIncluindoEm(aberto ? (incluindoEm ?? 'todo') : null)}
      />
    </div>
  )
}

/**
 * O cabeçalho da página: título, o que o quadro está dizendo hoje, e as ações.
 *
 * O subtítulo é a mesma apuração da faixa em uma linha — resumo do resumo. Ele
 * existe porque o mockup o desenha e porque a faixa some quando a consulta
 * ainda corre: sem ele, o topo da tela ficaria mudo na abertura.
 */
function Cabecalho({
  tarefas,
  hoje,
  aoIncluir,
}: {
  tarefas: readonly TaskDto[]
  hoje: string
  aoIncluir: () => void
}) {
  const apuracao = apurarQuadro(tarefas, hoje)

  return (
    <header
      data-slot="tarefas-header"
      className="flex flex-wrap items-end"
      style={{ gap: 'var(--s-4)' }}
    >
      <div className="min-w-0">
        <h1 className="t-pagina">Tarefas</h1>
        {/* Fronteira entre título e subtítulo = espaço, nunca linha: a régua
            manda a mais barata que resolve, e a antiga borda inferior do
            cabeçalho era a segunda ferramenta sobre a mesma dobra. */}
        <p className="t-meta" style={{ marginTop: 'var(--s-1)' }}>
          {apuracao.total} {apuracao.total === 1 ? 'tarefa' : 'tarefas'} · {apuracao.concluidas}{' '}
          {apuracao.concluidas === 1 ? 'concluída' : 'concluídas'} · {apuracao.atrasadas}{' '}
          {apuracao.atrasadas === 1 ? 'atrasada' : 'atrasadas'}
        </p>
      </div>

      <div className="ml-auto flex flex-wrap items-center" style={{ gap: 'var(--s-2)' }}>
        <Button onClick={aoIncluir}>
          <Plus aria-hidden="true" />
          Nova tarefa
        </Button>
      </div>
    </header>
  )
}

/**
 * A cor do evento no calendário diz o ESTADO, e as três são as que já
 * significam estado no sistema: o que fechou, o que passou do prazo, o resto.
 */
function tomDaTarefa(tarefa: TaskDto, hoje: string): TomDoCartao {
  if (tarefa.status === 'done') return 'ok'
  return estaAtrasada(tarefa, hoje) ? 'warn' : 'info'
}

/**
 * A visão CALENDÁRIO — o `ModoCalendario` de D12 sobre as tarefas com prazo.
 *
 * Ele recebe as mesmas linhas e não consulta nada, que é o que garante o "mesmo
 * filtro" do padrão 9: alternar quadro ⇄ lista ⇄ calendário não pode mudar o
 * conjunto sem avisar.
 *
 * Tarefa SEM prazo fica de fora, e isso é dito no rodapé em vez de silenciado:
 * um calendário que engole seis tarefas invisíveis é pior que um que mostra
 * quatro e conta as outras.
 */
function CalendarioDeTarefas({ busca, hoje }: { busca: string; hoje: string }) {
  const query = useTarefas(busca)
  const tarefas = query.data ?? []
  const comPrazo = tarefas.filter((tarefa) => tarefa.dueOn)
  const semPrazo = tarefas.length - comPrazo.length

  return (
    <div className="flex flex-col" style={{ gap: 'var(--s-2)' }}>
      <ModoCalendario
        rows={comPrazo}
        campoDeData="dueOn"
        chave={(tarefa) => tarefa.id}
        evento={(tarefa) => ({ titulo: tarefa.title, tom: tomDaTarefa(tarefa, hoje) })}
      />
      {semPrazo > 0 ? (
        <p className="t-meta">
          {semPrazo === 1
            ? '1 tarefa sem prazo não aparece aqui'
            : `${semPrazo} tarefas sem prazo não aparecem aqui`}{' '}
          — elas continuam no quadro e na lista.
        </p>
      ) : null}
    </div>
  )
}
