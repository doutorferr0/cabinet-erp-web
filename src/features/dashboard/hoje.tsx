import type { AgendaEventDto } from '@/api/gerado'
import { FalhaDoPainel } from '@/components/cabinet/falha-do-painel'
import { DCard, MarcaDeCard } from '@/components/cabinet/painel'
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
import { Link } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { FeedDeAtividade } from './atividade'
import { MarcaDeTipo, TIPOS, TIPOS_NA_ORDEM, eventosDoDia } from './tipos-de-evento'

/**
 * A GRADE DO DASHBOARD 2.0 — três colunas de card QUIETO, `1.2fr 1fr 1fr`.
 *
 * Coluna larga: `Agenda de hoje` e `Atividade`, no MESMO card, separadas por uma
 * hairline (é o que o mockup desenha, aba Dashboard). Coluna do meio: `A fazer`.
 * Coluna estreita: o calendário compacto.
 *
 * ## O que mudou da versão 1.x, por regra
 *
 * - **Nada aqui tem borda preta.** Os três cards são `--hard-soft` sobre borda
 *   `n-300`; a única sombra de tinta da tela é dos quatro KPIs acima
 *   (auditoria §2.4, §Hierarquia "uma sombra dura de tinta por tela").
 * - **A pastel saiu das LINHAS.** A agenda 1.x pintava a linha inteira com a
 *   pastel do módulo do tipo, e três linhas de três cores diferentes numa lista
 *   de três itens é enfeite, não dado. Fica a faixa de 4px, que é a marca que a
 *   legenda do calendário ensina — e é UMA ferramenta na fronteira.
 * - **Fronteira entre linhas = hairline**, entre colunas = espaço `--s-4` (16),
 *   sem linha nenhuma.
 * - **Calendário e agenda continuam lendo a MESMA consulta** (`useAgenda` do mês
 *   visível): são duas vistas do mesmo dado, e duas consultas fariam o ponto do
 *   dia 12 e a linha da agenda virem de instantes diferentes.
 *
 * ## Uma divergência do mockup, e é a régua que manda
 *
 * O mockup escreve o nome do mês em Gambarino de 17px. §Hierarquia proíbe
 * Gambarino abaixo de 20px **e** limita a tela a um Gambarino (dois no máximo) —
 * a saudação já é o desta. Então o mês fala em `.t-bloco`, que é o degrau de
 * título de bloco. Onde régua e mockup divergem em NÚMERO, a régua é lei; o
 * precedente é o de `kpi-tile.tsx`.
 */

/**
 * Uma linha da agenda: hora mono · faixa do tipo · assunto · tag.
 *
 * Grade de quatro colunas com a hora em largura fixa (`52px`), como o mockup: em
 * `flex` a hora encolheria conforme o texto do compromisso e as três horas
 * deixariam de formar coluna — que é o único jeito de ler uma agenda de relance.
 */
function LinhaDaAgenda({ evento }: { evento: AgendaEventDto }) {
  const tipo = TIPOS[evento.kind]

  return (
    <li
      data-slot="agenda-linha"
      className="grid items-center border-[var(--hairline)] border-b last:border-b-0"
      style={{
        gridTemplateColumns: '52px 4px minmax(0, 1fr) auto',
        gap: 'var(--s-3)',
        padding: 'var(--s-2) var(--s-4)',
      }}
    >
      <span className="t-dado">{horaLocal(evento.startsAt)}</span>
      <MarcaDeTipo kind={evento.kind} className="h-7 w-1 rounded-[2px]" />
      <span className="min-w-0">
        <span className="t-ui block truncate">{evento.title}</span>
        {evento.context ? <span className="t-meta block truncate">{evento.context}</span> : null}
      </span>
      {/* A tag NOMEIA a cor da faixa — é o que cumpre WCAG 1.4.1 sem legenda
          própria nesta lista. `.t-rotulo` e, como manda a régua, sem caixa,
          borda ou fundo. */}
      <span className="t-rotulo">{tipo.rotulo}</span>
    </li>
  )
}

/**
 * O card largo: agenda + atividade. Dois cabeçalhos num card só, e não dois
 * cards — a coluna da esquerda é UM objeto no mockup, e dois cards ali daria
 * duas bordas onde o desenho tem uma.
 */
function AgendaEAtividade({
  eventos,
  carregando,
  className,
}: { eventos: AgendaEventDto[]; carregando: boolean; className?: string }) {
  const doDia = eventosDoDia(eventos, diaLocalISO())

  return (
    <DCard
      titulo="Agenda de hoje"
      marca={<MarcaDeCard cor={TIPOS.quote.cor} />}
      nota={
        carregando
          ? undefined
          : doDia.length === 1
            ? '1 compromisso'
            : `${doDia.length} compromissos`
      }
      {...(className ? { className } : {})}
    >
      {carregando ? (
        <div className="flex flex-col" style={{ gap: 'var(--s-2)', padding: 'var(--s-4)' }}>
          {['a1', 'a2', 'a3'].map((chave) => (
            <Skeleton key={chave} className="h-10 w-full" />
          ))}
        </div>
      ) : doDia.length === 0 ? (
        <p className="t-meta text-center" style={{ padding: 'var(--s-5) var(--s-4)' }}>
          Nenhum compromisso para hoje.
        </p>
      ) : (
        <ul className="flex flex-col">
          {doDia.map((evento) => (
            <LinhaDaAgenda key={evento.id} evento={evento} />
          ))}
        </ul>
      )}

      <FeedDeAtividade />
    </DCard>
  )
}

/** O calendário compacto: mês, grade de 7, ponto por tipo e legenda. */
function Calendario({
  mes,
  aoTrocarMes,
  eventos,
  carregando,
  className,
}: {
  mes: Mes
  aoTrocarMes: (novo: Mes) => void
  eventos: AgendaEventDto[]
  carregando: boolean
  className?: string
}) {
  const hoje = diaLocalISO()
  const celulas = gradeDoMes(mes)

  return (
    // Sem `titulo`: o mês É o título, e ele mora na barra de navegação junto com
    // as setas. Um cabeçalho "Calendário" acima do nome do mês seriam duas
    // coisas nomeando a mesma região — defeito que a versão 1.x já tinha
    // consertado e que não se reintroduz aqui.
    <DCard {...(className ? { className } : {})} corpoComPadding>
      <div className="flex items-center" style={{ gap: 'var(--s-2)' }}>
        <b className="t-bloco first-letter:uppercase">{nomeDoMes(mes)}</b>
        <div className="ml-auto flex items-center" style={{ gap: 'var(--s-1)' }}>
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
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center">
        {DIAS_DA_SEMANA.map((dia) => (
          <abbr key={dia.nome} title={dia.nome} className="t-rotulo h-5 no-underline">
            {dia.inicial}
          </abbr>
        ))}

        {celulas.map((celula) => {
          const doDia = eventosDoDia(eventos, celula.iso)
          const ehHoje = celula.iso === hoje
          return (
            <div
              key={celula.iso}
              className={cn(
                't-dado-meta relative grid h-[30px] place-items-center rounded-[var(--r-ctrl)]',
                // HOJE é o único estado forte da grade — quadrado de tinta, como
                // no mockup. É marca de POSIÇÃO, não de assunto: por isso n-900
                // e não a cor de um dos quatro tipos.
                ehHoje && 'font-medium',
              )}
              style={{
                ...(celula.deFora ? { color: 'var(--n-400)' } : { color: 'var(--n-700)' }),
                ...(ehHoje ? { background: 'var(--n-900)', color: 'var(--n-0)' } : {}),
              }}
              {...(ehHoje && { 'data-hoje': 'true' })}
            >
              {celula.dia}
              {/* Um ponto só, e é decisão: a célula tem 30px e o mockup marca
                  presença, não quantidade. Três pontos de 4px numa célula de
                  30px viram um borrão, e quem quer saber quantos abre o dia. */}
              {doDia.length > 0 ? (
                <MarcaDeTipo
                  kind={(doDia[0] as AgendaEventDto).kind}
                  className="absolute bottom-[3px] size-1 rounded-full"
                />
              ) : null}
            </div>
          )
        })}
      </div>

      {carregando ? (
        <Skeleton className="h-4 w-full" />
      ) : (
        <ul className="flex flex-wrap" style={{ gap: 'var(--s-2) var(--s-3)' }}>
          {TIPOS_NA_ORDEM.map((kind) => (
            <li
              key={kind}
              className="t-meta inline-flex items-center"
              style={{ gap: 'var(--s-1)' }}
            >
              <MarcaDeTipo kind={kind} className="size-2 rounded-[2px]" />
              {TIPOS[kind].rotulo}
            </li>
          ))}
        </ul>
      )}
    </DCard>
  )
}

/**
 * A fazer — checkbox, texto riscado no concluído, e o `+ Adicionar` no pé.
 *
 * **Sem a coluna de responsável do mockup**, e é falta de DADO, não de desenho:
 * `TodoDto` publica `id`, `title` e `done`, e nada mais. As iniciais "HF"/"RA"
 * do mockup viriam de um campo que o contrato não tem — inventá-las daria dado
 * de mentira com cara de dado do servidor.
 *
 * `+ Adicionar tarefa` leva a `/tarefas`, que é onde a fila se TRABALHA. Um
 * campo de digitação aqui abriria uma segunda porta de criação para a mesma
 * lista, com metade dos campos da outra.
 */
function AFazer({ className }: { className?: string }) {
  const query = useTodos()
  const marcar = useMarcarTodo()
  const itens = query.data ?? []
  const feitos = itens.filter((item) => item.done).length

  return (
    <DCard
      titulo="A fazer"
      marca={<MarcaDeCard cor="var(--n-900)" />}
      nota={query.isPending || query.isError ? undefined : `${feitos} / ${itens.length}`}
      {...(className ? { className } : {})}
    >
      {query.isPending ? (
        <div className="flex flex-col" style={{ gap: 'var(--s-2)', padding: 'var(--s-4)' }}>
          {['t1', 't2', 't3'].map((chave) => (
            <Skeleton key={chave} className="h-6 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <div style={{ padding: 'var(--s-4)' }}>
          <FalhaDoPainel
            titulo="A lista não carregou"
            erro={query.error}
            aoTentar={() => query.refetch()}
          />
        </div>
      ) : itens.length === 0 ? (
        <p className="t-meta text-center" style={{ padding: 'var(--s-5) var(--s-4)' }}>
          Nada anotado.
        </p>
      ) : (
        <ul className="flex flex-col">
          {itens.map((item) => (
            <li
              key={item.id}
              className="border-[var(--hairline)] border-b last:border-b-0"
              style={{ padding: 'var(--s-2) var(--s-4)' }}
            >
              {/* O rótulo é o próprio texto do item: clicar na frase marca, que
                  é o alvo que o dedo e o mouse procuram. */}
              <Checkbox
                isSelected={item.done}
                onChange={(feito) => marcar.mutate({ id: item.id, feito })}
                isDisabled={marcar.isPending}
              >
                <span
                  className="t-corpo"
                  style={
                    item.done
                      ? { color: 'var(--n-500)', textDecoration: 'line-through' }
                      : undefined
                  }
                >
                  {item.title}
                </span>
              </Checkbox>
            </li>
          ))}
        </ul>
      )}

      {/* Fronteira TRACEJADA, como no mockup: o pé não é um item da lista, é a
          porta de saída dela — e o tracejado é a mesma separação com menos voz.
          `--primary-text` é o único texto com acento que a régua libera (link,
          id); chartreuse cheia em texto está proibida. */}
      <Link
        to="/tarefas"
        className="t-ui mt-auto block no-underline"
        style={{
          padding: 'var(--s-2) var(--s-4)',
          borderTop: '1px dashed var(--n-300)',
          color: 'var(--primary-text)',
        }}
      >
        + Adicionar tarefa
      </Link>
    </DCard>
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
    // `1.2fr 1fr 1fr` é o mockup — e sai de `flex-wrap` com `flex-basis`, não de
    // `grid-template-columns`, porque a quebra não pode vir de `@media`
    // (proibição 7 da rodada) e `auto-fit` só sabe fazer colunas IGUAIS. Com
    // flex, as três dividem 1,2 : 1 : 1 enquanto couberem na linha e quebram
    // sozinhas quando não couberem — o que acontece antes com a sidebar aberta
    // do que com ela recolhida, e é justamente o que um breakpoint fixo não sabe.
    //
    // Fronteira entre colunas = espaço `--s-4` (16), sem linha nenhuma.
    <div
      data-slot="grade-do-dashboard"
      className="flex flex-wrap items-start"
      style={{ gap: 'var(--s-4)' }}
    >
      <AgendaEAtividade
        eventos={eventos}
        carregando={agenda.isPending}
        className="flex-[1.2_1_340px]"
      />
      <AFazer className="flex-[1_1_260px]" />
      <Calendario
        mes={mes}
        aoTrocarMes={setMes}
        eventos={eventos}
        carregando={agenda.isPending}
        className="flex-[1_1_260px]"
      />
    </div>
  )
}
