import { cn } from '@/lib/utils'
import { Slot } from '@radix-ui/react-slot'
import * as React from 'react'
import { Popover as PopoverPrimitive } from 'react-aria-components'

/**
 * HOVER CARD — o cartão que aparece ao pousar o mouse numa peça e mostra mais
 * do que caberia nela.
 *
 * **Não é tooltip, e a diferença não é de tamanho.** A dica é um rótulo curto
 * com `role="tooltip"`, some ao primeiro movimento e nunca contém coisa
 * clicável. Este cartão CONTÉM conteúdo — lista de telas, resumo de um
 * registro — e por isso segue vivo enquanto o ponteiro estiver sobre ele, para
 * que dê tempo de andar até lá e clicar.
 *
 * **A regra que vem junto:** nada que só exista aqui dentro pode ser
 * necessário para operar. Conteúdo de hover é inalcançável para quem usa toque
 * e cansativo para quem navega por teclado — o cartão ACRESCENTA (atalho para
 * a tela irmã, contexto do registro), nunca substitui um caminho.
 *
 * A `react-aria-components` não tem hover card; tem `Popover`, que é a peça
 * certa por baixo. O que este arquivo acrescenta é a política de abrir e
 * fechar:
 *
 * - abre só com ponteiro de MOUSE (`pointerType`): em toque, `pointerenter`
 *   dispara junto com o toque e o cartão abriria por cima do que o dedo veio
 *   tocar;
 * - abre também no FOCO, senão quem usa teclado nunca o vê;
 * - espera para abrir e espera para fechar. A espera de fechar é o que permite
 *   atravessar o vão entre gatilho e cartão sem ele sumir no meio do caminho.
 */

interface HoverCardContextValue {
  aberto: boolean
  triggerRef: React.RefObject<HTMLElement | null>
  agendarAbertura: () => void
  agendarFechamento: () => void
  cancelarAgenda: () => void
  fecharAgora: () => void
}

const HoverCardContext = React.createContext<HoverCardContextValue | null>(null)

function useHoverCard(quem: string): HoverCardContextValue {
  const ctx = React.useContext(HoverCardContext)
  if (!ctx) throw new Error(`<${quem}> precisa estar dentro de <HoverCard>`)
  return ctx
}

export interface HoverCardProps {
  /** Espera antes de abrir. Longa de propósito: o mouse que só passa não abre. */
  delayAbrir?: number
  /** Espera antes de fechar — é a ponte entre o gatilho e o cartão. */
  delayFechar?: number
  children: React.ReactNode
}

function HoverCard({ delayAbrir = 200, delayFechar = 300, children }: HoverCardProps) {
  const [aberto, setAberto] = React.useState(false)
  const triggerRef = React.useRef<HTMLElement | null>(null)
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancelarAgenda = React.useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  // Timer pendente com o componente desmontado chamaria `setState` num nó que
  // não existe mais — acontece de verdade ao navegar com o cartão agendado.
  React.useEffect(() => cancelarAgenda, [cancelarAgenda])

  const agendar = React.useCallback(
    (valor: boolean, espera: number) => {
      cancelarAgenda()
      timer.current = setTimeout(() => setAberto(valor), espera)
    },
    [cancelarAgenda],
  )

  const valor = React.useMemo<HoverCardContextValue>(
    () => ({
      aberto,
      triggerRef,
      agendarAbertura: () => agendar(true, delayAbrir),
      agendarFechamento: () => agendar(false, delayFechar),
      cancelarAgenda,
      fecharAgora: () => {
        cancelarAgenda()
        setAberto(false)
      },
    }),
    [aberto, agendar, cancelarAgenda, delayAbrir, delayFechar],
  )

  return <HoverCardContext.Provider value={valor}>{children}</HoverCardContext.Provider>
}

/**
 * Envolve a peça que dispara o cartão SEM criar caixa: é um `Slot`, então os
 * eventos e a ref entram no próprio filho. Um `<span>` de embrulho aqui
 * quebraria o layout de quem já é filho direto de um flex — o botão da
 * sidebar, por exemplo.
 */
function HoverCardTrigger({ children }: { children: React.ReactElement }) {
  const { triggerRef, agendarAbertura, agendarFechamento, fecharAgora } =
    useHoverCard('HoverCardTrigger')

  return (
    <Slot
      ref={triggerRef}
      data-slot="hover-card-trigger"
      onPointerEnter={(e: React.PointerEvent) => {
        // Só mouse: em toque o `pointerenter` chega junto com o toque, e o
        // cartão abriria em cima justamente do que o dedo foi tocar.
        if (e.pointerType === 'mouse') agendarAbertura()
      }}
      onPointerLeave={(e: React.PointerEvent) => {
        if (e.pointerType === 'mouse') agendarFechamento()
      }}
      onFocus={agendarAbertura}
      onBlur={fecharAgora}
    >
      {children}
    </Slot>
  )
}

function HoverCardContent({
  className,
  placement = 'right top',
  offset = 2,
  children,
  ...props
}: Omit<React.ComponentProps<typeof PopoverPrimitive>, 'className' | 'children'> & {
  className?: string
  children: React.ReactNode
}) {
  const { aberto, triggerRef, cancelarAgenda, agendarFechamento, fecharAgora } =
    useHoverCard('HoverCardContent')

  return (
    <PopoverPrimitive
      data-slot="hover-card-content"
      triggerRef={triggerRef}
      isOpen={aberto}
      onOpenChange={(estaAberto) => {
        // Fechar vem do Escape e do clique fora, que a RAC já trata.
        if (!estaAberto) fecharAgora()
      }}
      // NÃO modal: o cartão é apoio. Modal travaria o foco e a rolagem da
      // página por causa de algo que apareceu sozinho, sem o operador pedir.
      isNonModal
      placement={placement}
      offset={offset}
      className={cn(
        // QUIET (D29): traço de 1px e `--hard-soft` (alias `shadow-el1`).
        // §Hierarquia dá uma sombra dura por tela, e ela pertence ao painel da
        // página — o cartão que aparece porque o ponteiro passou por cima não
        // pode competir com a peça que o operador foi buscar. Com `el-3` e
        // borda de 2px ele pesava como diálogo, e diálogo é coisa que se pede.
        //
        // Translúcido a 85% com desfoque leve, que continua: o cartão é APOIO, e
        // deixar a tela aparecer por baixo diz isso sem precisar de mais traço.
        // O desfoque é o que segura a legibilidade sobre a grade do papel.
        'z-50 w-64 max-w-xs rounded-card border border-border bg-popover/85 p-3 text-popover-foreground t-corpo pop-spring shadow-el1 outline-none backdrop-blur-sm',
        className,
      )}
      // Enquanto o ponteiro estiver sobre o CARTÃO — padding incluído — ele não
      // fecha. Estes handlers já moraram num `div` interno, e o `p-3` virava
      // faixa morta: o ponteiro entrava no cartão e o fechamento seguia
      // agendado. Ponte tem de começar na borda, não depois dela.
      onPointerEnter={cancelarAgenda}
      onPointerLeave={agendarFechamento}
      {...props}
    >
      {children}
    </PopoverPrimitive>
  )
}

export { HoverCard, HoverCardTrigger, HoverCardContent }
