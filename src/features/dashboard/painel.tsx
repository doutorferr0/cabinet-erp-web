import { cn } from '@/lib/utils'

/**
 * PAINEL do Dashboard — a caixa que agrupa um assunto da tela de visão.
 *
 * ## Por que não é o `FormBlock`
 *
 * O `FormBlock` é COMPARTIMENTO DE FORMULÁRIO: `fieldset`/`legend`, fundo
 * afundado, goteira de 12px. Ele existe para agrupar CAMPOS, e a legenda sobre
 * a borda é citação do groupbox do legado. Painel de dashboard não tem campo
 * nenhum — usar `fieldset` ali dizia ao leitor de tela que vinha um grupo de
 * controles onde vem uma leitura.
 *
 * ## O respiro é maior aqui, e é decisão
 *
 * O princípio do sistema é "densidade de comanda vence respiro decorativo", e
 * ele continua valendo onde se OPERA: listagem, formulário, grade. A tela de
 * visão é outra coisa — nela o operador lê, não digita, e a referência de
 * dashboard aprovada pelo user (`brutalism.tailwinddashboard.com`) trabalha com
 * `p-6` no cartão contra os `p-3` do nosso compartimento.
 *
 * Fica no meio, `p-5`: o respiro que separa um painel do outro sem transformar
 * três painéis lado a lado em três telas. **Densidade continua intocada na
 * listagem e no formulário** — é a fronteira que mantém o sistema coerente.
 */
export function Painel({
  titulo,
  acao,
  children,
  className,
}: {
  titulo: string
  /** Contador, botão ou o que a região precisar no fim do cabeçalho. */
  acao?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      data-slot="painel"
      className={cn('flex flex-col gap-3 rounded-panel border-2 bg-card p-5 shadow-el2', className)}
    >
      <header className="flex items-center gap-2">
        {/* Título de painel em Display: é o degrau abaixo do título da tela, e
            o que o olho usa para saltar de assunto em assunto. */}
        <h2 className="font-display text-lg font-bold tracking-[-0.012em] first-letter:uppercase">
          {titulo}
        </h2>
        {acao ? <div className="ml-auto flex items-center gap-2">{acao}</div> : null}
      </header>
      {children}
    </section>
  )
}

/**
 * A barra de progresso do sistema: trilho com traço, preenchimento em VIOLETA.
 *
 * Violeta porque progresso é ação em curso — verde é dinheiro e nada mais
 * (§Acentos). Altura de 8px, a mesma da referência (`h-2`).
 *
 * `aria-hidden` de propósito: a peça sempre aparece ao lado do número escrito
 * por extenso, e um `progressbar` anunciaria a mesma porcentagem duas vezes.
 */
export function Barra({ percentual, className }: { percentual: number; className?: string }) {
  return (
    <div aria-hidden="true" className={cn('h-2 w-full border-2 bg-card', className)}>
      <div
        className="h-full bg-primary"
        style={{ width: `${Math.max(0, Math.min(100, percentual))}%` }}
      />
    </div>
  )
}
