import type { AgendaEventDto } from '@/api/gerado'
import { FalhaDoPainel } from '@/components/cabinet/falha-do-painel'
import { Painel } from '@/components/cabinet/painel'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { useAgenda, useMarcarTodo, useTodos } from '@/data/dashboard-api'
import {
  DIAS_DA_SEMANA,
  type Mes,
  diaLocalISO,
  gradeDoMes,
  horaLocal,
  limitesDoMes,
  mesDeslocado,
  nomeDoMes,
} from '@/lib/datas'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { MarcaDeTipo, TIPOS, TIPOS_NA_ORDEM, eventosDoDia } from './tipos-de-evento'

/**
 * A LINHA DO "HOJE" — calendário do mês, agenda do dia e a lista A fazer.
 *
 * Calendário e agenda leem a MESMA consulta (`useAgenda` do mês visível) e é
 * decisão: são duas vistas do mesmo dado, e duas consultas fariam o dia marcado
 * no calendário e a linha da agenda virem de instantes diferentes — o operador
 * veria um ponto no dia 12 e uma agenda que não o conhece.
 *
 * ## De onde vem a cor de cada um dos três painéis
 *
 * O mockup de cores dá ao calendário o azul de Estoque e à agenda o par de
 * Compras. É EMPRÉSTIMO de cor de módulo para uma região temática, e não é
 * novidade nesta tela: `tipos-de-evento.tsx` já empresta os mesmos pares aos
 * tipos de compromisso (entrega é Estoque, reunião é Compras), e o Planner faz
 * o mesmo com os tipos de item. A faixa do painel passa a repetir a cor que a
 * marca de cada linha já usa por baixo, em vez de introduzir uma cor nova.
 *
 * `A fazer` é o que quebra o padrão, e de propósito: pendência é ESTADO, não
 * assunto, então a faixa lê a zona de foco. Sem selo — amarelo é cor com dono, e
 * ornamento não usa as três cores com dono.
 */

function Contador({ n }: { n: number }) {
  // Contador é DADO, e dado mora dentro de caixa (staging neobrutalism-aria).
  return (
    <span className="rounded-item border-2 px-1.5 font-mono text-[0.75rem] font-medium tabular-nums">
      {n}
    </span>
  )
}

/**
 * As duas setas do mês. Ficam no `acao` do painel, e o MÊS é o título dele —
 * antes o nome do mês era um terceiro elemento no meio das setas, competindo
 * com a legenda do compartimento, que dizia "Calendário". Duas coisas nomeando
 * a mesma região.
 */
function NavegacaoDoMes({ mes, aoTrocarMes }: { mes: Mes; aoTrocarMes: (novo: Mes) => void }) {
  return (
    <>
      <Button
        variant="outline"
        size="icon-sm"
        onClick={() => aoTrocarMes(mesDeslocado(mes, -1))}
        aria-label="Mês anterior"
      >
        <ChevronLeft />
      </Button>
      <Button
        variant="outline"
        size="icon-sm"
        onClick={() => aoTrocarMes(mesDeslocado(mes, 1))}
        aria-label="Próximo mês"
      >
        <ChevronRight />
      </Button>
    </>
  )
}

function Calendario({
  mes,
  aoTrocarMes,
  eventos,
  carregando,
}: {
  mes: Mes
  aoTrocarMes: (novo: Mes) => void
  eventos: AgendaEventDto[]
  carregando: boolean
}) {
  const hoje = diaLocalISO()
  const celulas = gradeDoMes(mes)

  return (
    // `flex-[0_1_300px]`: encolhe (`shrink`) antes dos outros dois, mas nunca
    // CRESCE (`grow:0`) além de 300px — é o painel mais estreito da fileira, e
    // o mockup não quer que ele vire o mais largo só porque sobrou espaço.
    <Painel
      titulo={nomeDoMes(mes)}
      modulo="estoque"
      acao={<NavegacaoDoMes mes={mes} aoTrocarMes={aoTrocarMes} />}
      className="min-w-0 flex-[0_1_300px]"
    >
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {DIAS_DA_SEMANA.map((dia) => (
          <abbr
            key={dia.nome}
            title={dia.nome}
            className="pb-1 font-mono text-[0.75rem] font-medium uppercase no-underline text-muted-foreground"
          >
            {dia.inicial}
          </abbr>
        ))}

        {celulas.map((celula) => {
          const doDia = eventosDoDia(eventos, celula.iso)
          const ehHoje = celula.iso === hoje
          return (
            <div
              key={celula.iso}
              // Célula do calendário é ITEM: canto reto, encostada na vizinha.
              // `py-2` (8px) é o respiro do Dashboard (§@casca-global).
              className={cn(
                'flex min-h-8 flex-col items-center justify-center gap-0.5 rounded-item py-2 text-sm tabular-nums',
                celula.deFora && 'text-muted-foreground opacity-60',
                // Hoje é o único estado FORTE da grade — violeta é a cor do que
                // está ativo no sistema (§Acentos).
                ehHoje && 'bg-primary font-bold text-primary-foreground',
              )}
              {...(ehHoje && { 'data-hoje': 'true' })}
            >
              <span>{celula.dia}</span>
              {/* Os pontos dizem QUANTOS e DE QUE TIPO sem abrir espaço para
                  texto: no máximo três, porque a partir daí a fileira estoura a
                  célula e vira borrão. O quarto compromisso continua na agenda. */}
              <span className="flex h-1.5 items-center gap-0.5">
                {doDia.slice(0, 3).map((evento) => (
                  <MarcaDeTipo key={evento.id} kind={evento.kind} className="size-1.5 border" />
                ))}
              </span>
            </div>
          )
        })}
      </div>

      {carregando ? (
        <Skeleton className="h-4 w-full" />
      ) : (
        // `gap-2.75` (11px) e `pt-4.5` (18px): respiro do Dashboard
        // (§@casca-global).
        <ul className="grid grid-cols-2 gap-2.75 border-t pt-4.5">
          {TIPOS_NA_ORDEM.map((kind) => (
            <li key={kind} className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MarcaDeTipo kind={kind} className="size-2.5" />
              {TIPOS[kind].rotulo}
            </li>
          ))}
        </ul>
      )}
    </Painel>
  )
}

function Agenda({ eventos, carregando }: { eventos: AgendaEventDto[]; carregando: boolean }) {
  const doDia = eventosDoDia(eventos, diaLocalISO())

  return (
    // `flex-[1_1_330px]`: cresce e encolhe a partir de 330px, igual ao painel
    // de pendentes — os dois dividem o espaço que sobra depois do calendário.
    <Painel
      titulo="Agenda de hoje"
      modulo="compras"
      acao={<Contador n={doDia.length} />}
      className="min-w-0 flex-[1_1_330px]"
    >
      {carregando ? (
        <div className="flex flex-col gap-2">
          {['a1', 'a2', 'a3'].map((chave) => (
            <Skeleton key={chave} className="h-12 w-full" />
          ))}
        </div>
      ) : doDia.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Nenhum compromisso para hoje.
        </p>
      ) : (
        // `gap-3.5` entre linhas e `p-3.5` dentro de cada uma (14px): respiro
        // do Dashboard (§@casca-global).
        <ul className="flex flex-col gap-3.5">
          {doDia.map((evento) => {
            const tipo = TIPOS[evento.kind]
            return (
              <li
                key={evento.id}
                // A linha inteira passa a levar a pastel do TIPO — antes a cor do
                // compromisso cabia só na barrinha de 6px da esquerda, e a agenda
                // inteira se lia como uma pilha de linhas brancas iguais. A barra
                // fica: é ela que dá a cheia /01 ao lado da pastel, e é o par que
                // a legenda do calendário ensina.
                {...(tipo.modulo && { 'data-modulo': tipo.modulo })}
                className={cn(
                  'flex items-center gap-3 rounded-card border-2 p-3.5',
                  tipo.modulo ? 'bg-modulo' : 'bg-zone-money',
                )}
              >
                <MarcaDeTipo kind={evento.kind} className="h-8 w-1.5" />
                <span className="font-mono text-sm font-semibold tabular-nums">
                  {horaLocal(evento.startsAt)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{evento.title}</span>
                  {evento.context ? (
                    <span className="block truncate text-sm text-muted-foreground">
                      {evento.context}
                    </span>
                  ) : null}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </Painel>
  )
}

function AFazer() {
  const query = useTodos()
  const marcar = useMarcarTodo()
  const itens = query.data ?? []
  const pendentes = itens.filter((item) => !item.done).length

  return (
    // `flex-[1_1_330px]`: mesma base da Agenda — os dois se ajustam juntos.
    <Painel
      titulo="A fazer"
      tinta="warn"
      acao={<Contador n={pendentes} />}
      className="min-w-0 flex-[1_1_330px]"
    >
      {query.isPending ? (
        <div className="flex flex-col gap-2">
          {['t1', 't2', 't3'].map((chave) => (
            <Skeleton key={chave} className="h-7 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <FalhaDoPainel
          titulo="A lista não carregou"
          erro={query.error}
          aoTentar={() => query.refetch()}
        />
      ) : itens.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Nada anotado.</p>
      ) : (
        <ul className="flex flex-col">
          {itens.map((item) => (
            // Divisória TRACEJADA (mockup): dentro de um painel de pendência a
            // régua cheia lia como separador de seção. Tracejada é a mesma
            // separação com menos voz.
            // `py-3.5` (14px): respiro do Dashboard (§@casca-global).
            <li key={item.id} className="border-b border-dashed py-3.5 last:border-b-0">
              {/* O rótulo é o próprio texto do item: clicar na frase marca, que
                  é o alvo que o dedo e o mouse procuram. */}
              <Checkbox
                isSelected={item.done}
                onChange={(feito) => marcar.mutate({ id: item.id, feito })}
                isDisabled={marcar.isPending}
              >
                <span className={cn(item.done && 'text-muted-foreground line-through')}>
                  {item.title}
                </span>
              </Checkbox>
            </li>
          ))}
        </ul>
      )}
    </Painel>
  )
}

export function LinhaDeHoje() {
  const [mes, setMes] = useState<Mes>(() => ({
    ano: new Date().getFullYear(),
    mes: new Date().getMonth() + 1,
  }))
  const { de, ate } = limitesDoMes(mes)
  const agenda = useAgenda(de, ate)
  const eventos = agenda.data ?? []

  if (agenda.isError) {
    return (
      <FalhaDoPainel
        titulo="A agenda não carregou"
        erro={agenda.error}
        aoTentar={() => agenda.refetch()}
      />
    )
  }

  return (
    // `flex flex-wrap`, nunca `@media` (§@casca-global — regra de quebra):
    // os três painéis espremem primeiro, dentro dos limites de `flex-basis` de
    // cada um, e só quebram pra baixo quando nem espremendo cabem mais — o que
    // acontece antes com a gaveta de notificações aberta do que sem ela, e o
    // grid de breakpoint fixo (`lg:`) não sabia disso.
    // `gap-5.5` (22px): respiro do Dashboard (§@casca-global) — o mesmo salto
    // que a fileira de KPIs recebeu.
    <div className="flex flex-wrap gap-5.5">
      <Calendario mes={mes} aoTrocarMes={setMes} eventos={eventos} carregando={agenda.isPending} />
      <Agenda eventos={eventos} carregando={agenda.isPending} />
      <AFazer />
    </div>
  )
}
