import { FalhaDoPainel } from '@/components/cabinet/falha-do-painel'
import { ModoCalendario } from '@/components/cabinet/listagem/modo-calendario'
import { ModoKanban } from '@/components/cabinet/listagem/modo-kanban'
import { PageHeader } from '@/components/cabinet/page-header'
import { useAgenda } from '@/data/dashboard-api'
import { type Mes, horaLocal, limitesDoMes, mesDe } from '@/lib/datas'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { COLUNAS_POR_TIPO, ROTULOS_DO_TIPO, TOM_DO_TIPO } from './eventos'

/** Os dois desenhos que a agenda oferece — os mesmos modos da listagem. */
const MODOS = [
  { id: 'calendario', rotulo: 'Calendário' },
  { id: 'kanban', rotulo: 'Quadro' },
] as const

type ModoDaAgenda = (typeof MODOS)[number]['id']

/**
 * AGENDA — os compromissos no calendário 2.0, e não mais uma biblioteca.
 *
 * A tela deixou de ser dona de um calendário próprio (Schedule-X) e passou a
 * ser uma VISÃO: quem desenha é o `ModoCalendario`, o mesmo que a listagem de
 * ordens usa para a previsão de chegada. É a issue D12 em uma frase — três
 * telas que tinham calendário ou quadro próprio agora compartilham um desenho
 * só, e o operador reconhece a grade em qualquer lugar do ERP.
 *
 * **O que se perdeu de propósito:** o tema do Schedule-X (que exigia amarrar
 * claro/escuro à mão), a agenda-do-dia embaixo do mês e o polyfill de
 * `Temporal` no bundle. O que se ganhou: a mesma grade, os mesmos tokens, e
 * nenhuma segunda linguagem visual para o mesmo objeto.
 *
 * ## Quem consulta é AQUI, e o calendário só avisa
 *
 * A agenda pergunta por intervalo (`GET /api/dashboard/agenda?from&to`), então andar de
 * mês precisa virar consulta nova — por isso o `mes`/`aoMudarMes` do modo
 * calendário, que é a exceção declarada do padrão 9: a visão continua sem
 * consultar nada, ela reporta.
 *
 * Mês sem compromisso e consulta que não chegou desenham a MESMA grade limpa —
 * e é a primeira que o operador acredita. Por isso a falha aparece inteira, em
 * vez de deixar a grade vazia contando a história errada.
 */
export function AgendaTela() {
  const [modo, setModo] = useState<ModoDaAgenda>('calendario')
  const [mes, setMes] = useState<Mes>(() => mesDe())
  const { de, ate } = limitesDoMes(mes)
  const agenda = useAgenda(de, ate)

  if (agenda.isError) {
    return (
      <FalhaDoPainel
        titulo="A agenda não carregou"
        erro={agenda.error}
        aoTentar={() => agenda.refetch()}
      />
    )
  }

  const eventos = agenda.data ?? []

  return (
    <div className="flex flex-col" style={{ gap: 'var(--s-5)' }}>
      <PageHeader
        titulo="Agenda"
        contexto="Entregas, orçamentos, reuniões e pagamentos do período."
      />
      {/* O SEGMENTED dos modos — rádio de verdade com pele de botão, como o
          alternador de visões da listagem: as opções são exclusivas, e o nativo
          dá as setas, uma parada de Tab e o estado dito a quem ouve. */}
      <fieldset className="flex items-center gap-1 self-start">
        <legend className="sr-only">Modo da agenda</legend>
        {MODOS.map((opcao) => {
          const ativo = opcao.id === modo
          return (
            <label
              key={opcao.id}
              className={cn(
                't-ui cursor-pointer rounded-item border border-[var(--n-300)] px-2 py-0.5',
                ativo && 'bg-[var(--n-900)] text-[var(--n-0)]',
                'has-[:focus-visible]:focus-ring',
              )}
            >
              <input
                type="radio"
                className="sr-only"
                name="modo-da-agenda"
                value={opcao.id}
                checked={ativo}
                onChange={() => setModo(opcao.id)}
              />
              {opcao.rotulo}
            </label>
          )
        })}
      </fieldset>

      {modo === 'calendario' ? (
        <ModoCalendario
          rows={eventos}
          campoDeData="startsAt"
          chave={(evento) => evento.id}
          // A HORA entra no rótulo porque o compromisso tem hora e a célula do
          // mês não tem eixo de tempo: sem ela, três reuniões do mesmo dia ficam
          // em ordem sem que nada diga por quê.
          evento={(evento) => ({
            titulo: `${horaLocal(evento.startsAt)} ${evento.title}`,
            tom: TOM_DO_TIPO[evento.kind],
          })}
          mes={mes}
          aoMudarMes={setMes}
        />
      ) : (
        /* O quadro é LEITURA: sem `onMover`, porque o contrato da agenda não
           tem caminho para trocar o tipo de um compromisso — a entrega não vira
           reunião. Quadro que aceitasse o arrasto prometeria uma escrita que
           não existe. */
        <ModoKanban
          rows={eventos}
          campoDeColuna="kind"
          colunas={COLUNAS_POR_TIPO}
          chave={(evento) => evento.id}
          cartao={(evento) => ({
            titulo: evento.title,
            subtitulo: evento.context ?? null,
            badge: { rotulo: ROTULOS_DO_TIPO[evento.kind], tom: TOM_DO_TIPO[evento.kind] },
            data: evento.startsAt,
          })}
        />
      )}
      {/* A cor é REFORÇO, nunca a informação sozinha (WCAG 1.4.1): a pílula já
          traz o texto do compromisso, e a legenda nomeia cada tom. */}
      <ul className="flex flex-wrap items-center" style={{ gap: 'var(--s-3)' }}>
        {Object.entries(ROTULOS_DO_TIPO).map(([tipo, rotulo]) => (
          <li key={tipo} className="t-meta flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-2 rounded-full"
              style={{ background: `var(--${TOM_DO_TIPO[tipo as keyof typeof TOM_DO_TIPO]})` }}
            />
            {rotulo}
          </li>
        ))}
      </ul>
    </div>
  )
}
