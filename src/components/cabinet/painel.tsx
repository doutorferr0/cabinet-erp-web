import type { Modulo } from '@/app/modulo'
import { Selo } from '@/components/cabinet/selo'
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
 *
 * ## A faixa de cabeçalho — o preenchimento colorido do mockup
 *
 * `mockup-dashboard-cores.html` (user, 07/08/2026) tinge o cabeçalho de cada
 * painel com a pastel /02 da região e põe um selo antes do título. O que muda é
 * só o PREENCHIMENTO: contorno, raio, elevação e a voz Display do título são os
 * mesmos de antes.
 *
 * A cor da faixa vem de UMA de duas fontes, nunca das duas:
 *
 * - **`modulo`** — a região fala de um cadastro do sistema. A faixa lê a pastel
 *   /02 daquele par e o selo lê a cheia /01, os dois pelo `[data-modulo]` que a
 *   própria `<section>` declara. É por isso que o painel não recebe cor nenhuma
 *   por propriedade.
 * - **`tinta`** — a região NÃO é de módulo: é um estado do sistema (pendência,
 *   valor, informação). Aí a faixa lê a ZONA correspondente, que é a família que
 *   já significa isso no repo. Emprestar a cor de um módulo aqui diria que "A
 *   fazer" pertence a Vendas.
 *
 * Sem `modulo` e sem `tinta` o cabeçalho fica na superfície afundada — o painel
 * neutro continua existindo, e é o certo para a região que não é de lugar nenhum.
 */

/** Zonas de estado, para a região que não pertence a módulo. */
const TINTAS = {
  /** Pendência, foco — o que espera alguém. */
  warn: 'bg-zone-warn',
  /** Valor. Verde tem dono e este é ele. */
  money: 'bg-zone-money',
  /** Leitura informativa, sem pendência. */
  info: 'bg-zone-info',
  /** Identidade: a região que diz de que assunto é a tela. */
  id: 'bg-zone-id',
} as const

export type TintaDePainel = keyof typeof TINTAS

export function Painel({
  titulo,
  modulo,
  tinta,
  selo = true,
  acao,
  children,
  className,
}: {
  titulo: string
  /** Módulo da região: dá a pastel /02 à faixa e a cheia /01 ao selo. */
  modulo?: Modulo
  /** Zona de estado, para região que não é de módulo. Ignorada quando há `modulo`. */
  tinta?: TintaDePainel
  /**
   * Selo antes do título. Só desenha quando há `modulo` — o shape vem do módulo,
   * e ornamento não empresta cor de zona (verde é dinheiro, amarelo é foco).
   */
  selo?: boolean
  /** Contador, botão ou o que a região precisar no fim do cabeçalho. */
  acao?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      data-slot="painel"
      {...(modulo && { 'data-modulo': modulo })}
      // `overflow-hidden`: a faixa do cabeçalho vai até a borda, e sem isso o
      // canto colorido escapa por fora do raio do painel.
      className={cn(
        'flex flex-col overflow-hidden rounded-panel border-2 bg-card shadow-el2',
        className,
      )}
    >
      <header
        className={cn(
          'flex items-center gap-2 border-b-2 px-4 py-2.5',
          modulo ? 'bg-modulo' : tinta ? TINTAS[tinta] : 'bg-surface-sunken',
        )}
      >
        {modulo && selo ? <Selo shape={modulo} tamanho="sm" /> : null}
        {/* Título de painel em Display: é o degrau abaixo do título da tela, e
            o que o olho usa para saltar de assunto em assunto. */}
        <h2 className="font-display text-lg font-bold tracking-[-0.012em] first-letter:uppercase">
          {titulo}
        </h2>
        {acao ? <div className="ml-auto flex items-center gap-2">{acao}</div> : null}
      </header>
      {/* `flex-1` no corpo, e não no `section`: é o que deixa o `mt-auto` de um
          filho empurrar a peça para o rodapé do painel. */}
      <div className="flex flex-1 flex-col gap-3 p-5">{children}</div>
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
