import type { TaskDtoStatus } from '@/api/gerado'
import { PageHeader } from '@/components/cabinet/page-header'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { ListaDeTarefas } from './lista'
import { NovaTarefa } from './nova-tarefa'
import { ProgressoDoQuadro } from './progresso'
import { Quadro } from './quadro'

/**
 * TAREFAS — o quadro do que precisa ser feito, com a lista da mesma consulta.
 *
 * **Saiu do Dashboard** (§@casca-global, PR da casca global): o user reclamou
 * duas vezes seguidas — "muito bege e vazio" (resolvido pelo preenchimento por
 * cor) e depois "está muita coisa/poluído". A segunda se resolve com uma tela
 * por assunto: o Dashboard olha o que está POR VIR (KPIs, calendário, agenda),
 * esta olha o que precisa ser TRABALHADO agora — quadro, lista, progresso.
 * Mover, não duplicar: quadro/lista/progresso/nova-tarefa são os MESMOS
 * arquivos que já existiam em `features/dashboard/`, só de endereço novo.
 *
 * `ProgressoDoQuadro` e `Carga por Responsável` vieram junto: leem a mesma
 * consulta do quadro (`useTarefas`) e respondem "como vai o quadro", não "o
 * que vem por aí" — a mesma linha que tirou o quadro do Dashboard tira o
 * progresso dele também.
 */
export function TarefasTela() {
  const [busca, setBusca] = useState('')
  const [incluindoEm, setIncluindoEm] = useState<TaskDtoStatus | null>(null)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        titulo="Tarefas"
        primaria={{
          id: 'nova-tarefa',
          label: 'Nova tarefa',
          icon: Plus,
          onClick: () => setIncluindoEm('todo'),
        }}
      />

      <ProgressoDoQuadro />

      <Tabs defaultValue="quadro">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="quadro">Quadro</TabsTrigger>
            <TabsTrigger value="lista">Lista</TabsTrigger>
          </TabsList>

          {/* A busca vale para as DUAS abas: é a mesma consulta por baixo, e
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
          <Quadro busca={busca} aoIncluir={setIncluindoEm} />
        </TabsContent>
        <TabsContent value="lista">
          <ListaDeTarefas busca={busca} />
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
