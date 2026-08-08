import type { TaskDtoStatus } from '@/api/gerado'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSessao } from '@/data/sessao'
import { dataPorExtenso, saudacao } from '@/lib/datas'
import { Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { LinhaDeHoje } from './hoje'
import { Indicadores } from './indicadores'
import { ListaDeTarefas } from './lista'
import { NovaTarefa } from './nova-tarefa'
import { ProgressoDoQuadro } from './progresso'
import { Quadro } from './quadro'

/**
 * DASHBOARD — a tela de entrada depois do login.
 *
 * **Não é o Boletim, e não o substitui.** O Boletim (`/`) é a folha do
 * MOVIMENTO: o que a operação fez na data de referência, em ledger, para
 * conferir e fechar. O Dashboard é o que está EM CURSO — o que vence, o que
 * chega, o que alguém precisa tocar hoje. Um olha para trás e fecha, o outro
 * olha para a frente e distribui. Fundi-los daria uma tela que não faz nem uma
 * coisa nem outra.
 *
 * ## O que o mockup pedia e não entrou, com o motivo
 *
 * - **Topbar própria** (busca global, sino, engrenagem, chip de usuário): o
 *   shell já tem cabeçalho, e a spec manda conciliar em vez de duplicar. A
 *   saudação e a data — a parte que o mockup queria "sempre visível" — ficaram
 *   no cabeçalho DA PÁGINA. Notificação e configuração não existem no sistema:
 *   um sino que não toca é pior que sino nenhum.
 * - **`Exportar`**: exportação/impressão é decidido-adiado (PRODUCT.md). Botão
 *   que não gera arquivo ensina o operador a não confiar na barra de ações.
 * - **`Filtrar` e `Personalizar`**: seriam botões mortos. A busca da barra é o
 *   filtro que existe de verdade, e ela filtra NO SERVIDOR.
 * - **Aba `Linha do tempo`**: a linha do tempo do projeto é o **Planner**, que é
 *   tela própria com rota própria. Uma terceira aba inerte prometeria aqui o que
 *   está uma linha acima na sidebar.
 */
export function DashboardTela() {
  const [busca, setBusca] = useState('')
  const [incluindoEm, setIncluindoEm] = useState<TaskDtoStatus | null>(null)
  const { data: sessao } = useSessao()

  // Nome só quando o servidor sabe (o campo é `Proposto` e nullable). Sem ele a
  // saudação fica sozinha — inventar "Usuário" ou mostrar o id seria pior.
  const nome = sessao?.displayName?.trim()

  return (
    <div className="flex flex-col gap-8">
      <header
        data-slot="dashboard-header"
        className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-rule-strong border-b pb-3"
      >
        <div>
          <h1 className="font-display text-3xl font-bold tracking-[-0.012em]">
            {saudacao()}
            {nome ? `, ${nome}` : ''}
          </h1>
          {/* A data por extenso é o que ancora tudo que a tela chama de "hoje". */}
          <p className="text-sm text-muted-foreground first-letter:uppercase">{dataPorExtenso()}</p>
        </div>
        <Button onClick={() => setIncluindoEm('todo')}>
          <Plus />
          Nova tarefa
        </Button>
      </header>

      <Indicadores />

      <ProgressoDoQuadro />

      <LinhaDeHoje />

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
