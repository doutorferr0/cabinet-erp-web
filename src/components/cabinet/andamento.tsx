import { cn } from '@/lib/utils'

/**
 * ANDAMENTO — o histórico do registro deixa de ser aba escondida e vira coluna
 * que se lê de relance (Reface 2.0, D18).
 *
 * A pergunta que a timeline responde não é "o que já aconteceu": é **onde este
 * documento está agora**. Por isso os três estados não são decoração, são a
 * única informação da peça — `feito` é passado registrado, `atual` é onde o
 * documento parou, `futuro` é o que ainda não tem data. Uma lista de eventos
 * só do passado seria o log de auditoria com outra tipografia; ela não diz ao
 * operador qual é o próximo gesto.
 *
 * ## Por que `atual` é ANEL e `feito` é CHEIO
 *
 * Cheio = fato consumado, e é a única marca que ganha cor semântica (`--ok`,
 * hoje pelo alias `--stamp-done`). O `atual` é anel de tinta n-900: o ponto
 * está desenhado mas ainda vazio por dentro, que é literalmente o estado do
 * documento. `futuro` é ponto apagado (n-300) — presente na linha para o
 * operador saber que a etapa existe, sem prometer que ela aconteceu.
 *
 * Nenhum dos três usa cor para SEPARAR nada (§Hierarquia: cor decorativa em
 * linha de dado é proibida). O que separa os eventos é espaço; o que os liga é
 * uma hairline vertical — uma ferramenta por fronteira.
 *
 * ## Acessibilidade
 *
 * `<ol>` porque a ordem é a informação. O estado de cada etapa é forma e cor,
 * então cada `<li>` carrega o estado por extenso em `sr-only` — sem isso, quem
 * ouve a tela recebe uma lista de títulos sem saber qual é o de hoje. O evento
 * `atual` leva `aria-current="step"`, que é o que o leitor de tela anuncia
 * como posição.
 *
 * ## Fonte dos eventos
 *
 * Quem MONTA a lista é o chamador, e de propósito: o `audit_log` do servidor
 * ainda não existe no contrato, e cada documento sabe derivar o próprio
 * andamento das datas que já carrega (ver `andamentoDaOrdem`, em
 * `features/ordem-compra/lateral-da-ordem.tsx`). Quando o `audit_log` chegar,
 * troca-se a função que monta — este componente não muda.
 */

export type EstadoDoEvento = 'feito' | 'atual' | 'futuro'

export interface EventoDeAndamento {
  id: string
  /** O que aconteceu, em uma linha. Peso 500 — é o dado da etapa. */
  titulo: string
  estado: EstadoDoEvento
  /** ISO. Sai em mono, porque data é dado: se copia e se compara. */
  data?: string | null
  /** Quem fez. Prosa, nunca mono. */
  quem?: string | null
  /** Por que — o motivo do reagendamento, do cancelamento. Prosa. */
  motivo?: string | null
}

/** O que o leitor de tela ouve no lugar da forma do ponto. */
const ESTADO_POR_EXTENSO: Record<EstadoDoEvento, string> = {
  feito: 'concluído',
  atual: 'etapa atual',
  futuro: 'pendente',
}

/**
 * A marca de 16px. `border-2` nos três para que o diâmetro NÃO mude entre
 * estados — ponto que encolhe ao virar futuro desalinharia a linha vertical,
 * e o olho leria como movimento o que é só troca de preenchimento.
 */
const PONTO: Record<EstadoDoEvento, string> = {
  // `--stamp-done` é o alias que a D1 aponta para `--ok`: quando os tokens 2.0
  // entrarem, esta linha já está certa e não precisa de PR de conserto.
  feito: 'border-stamp-done bg-stamp-done',
  atual: 'border-foreground bg-card',
  // n-300 (o alias 1.x é `--input`, a borda de controle), e NÃO o `--disabled`
  // de n-400: a etapa futura não está desabilitada, está por acontecer. O
  // degrau mais escuro a leria como campo bloqueado.
  futuro: 'border-input bg-input',
}

function formatarData(iso: string): string {
  // `T` cortado antes do `Date`: `new Date('2026-09-02')` é UTC e volta um dia
  // no fuso do Brasil — a data do documento viraria a véspera na tela.
  const [ano, mes, dia] = iso.slice(0, 10).split('-')
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : iso
}

export function Andamento({
  eventos,
  className,
}: {
  eventos: EventoDeAndamento[]
  className?: string
}) {
  if (eventos.length === 0) {
    return <p className="t-meta">Sem movimentação registrada neste documento.</p>
  }

  return (
    <ol className={cn('flex flex-col', className)}>
      {eventos.map((evento, indice) => {
        const ultimo = indice === eventos.length - 1
        // Data em mono, o resto em prosa: mono é dado (§Hierarquia — "se está
        // em mono, é algo que se copia, compara ou soma"). Juntar tudo numa
        // string só obrigaria a escolher UMA família para os dois papéis.
        const complemento = [evento.quem, evento.motivo].filter(Boolean).join(' · ')

        return (
          <li
            key={evento.id}
            {...(evento.estado === 'atual' ? { 'aria-current': 'step' } : {})}
            data-slot="andamento-evento"
            data-estado={evento.estado}
            className={cn('relative flex gap-3', !ultimo && 'pb-4')}
          >
            {/* A hairline que LIGA — some no último evento, senão pendura no
                vazio. `left-2 -translate-x-1/2` a centra sob o ponto de 16px
                sem medida mágica: 8px é o meio de 16. */}
            {ultimo ? null : (
              <span
                aria-hidden="true"
                className="-translate-x-1/2 absolute top-4 bottom-0 left-2 w-px bg-rule-hair"
              />
            )}
            <span
              aria-hidden="true"
              className={cn('mt-0.5 size-4 shrink-0 rounded-full border-2', PONTO[evento.estado])}
            />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="t-ui">
                {evento.titulo}
                <span className="sr-only"> — {ESTADO_POR_EXTENSO[evento.estado]}</span>
              </span>
              {evento.data || complemento ? (
                <span className="t-meta">
                  {evento.data ? (
                    <span className="t-dado-meta">{formatarData(evento.data)}</span>
                  ) : null}
                  {evento.data && complemento ? ' · ' : null}
                  {complemento}
                </span>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
