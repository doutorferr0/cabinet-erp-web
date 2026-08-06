import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import * as React from 'react'

/**
 * CARROSSEL — fileira que rola na horizontal, com botões de avançar e voltar.
 *
 * **Rola de verdade; não é slide trocado por JavaScript.** O trilho é um
 * elemento com `overflow-x: auto` e `scroll-snap`, e os botões só chamam
 * `scrollBy`. A consequência é que tudo que o browser já faz continua
 * funcionando de graça: roda do mouse, gesto de trackpad, arrastar em tela de
 * toque, `Home`/`End` e setas quando o trilho tem foco, e — o que mais importa
 * num sistema de trabalho — **a busca da página encontra o que está fora da
 * vista**, porque nenhum item foi desmontado. Carrossel que troca slide por
 * estado esconde conteúdo do `Ctrl+F` e do leitor de tela.
 *
 * **Sem passar sozinho.** Não há autoplay aqui e não deve haver: conteúdo que
 * se move sem o operador pedir é o oposto do que uma ferramenta de oito horas
 * precisa, e a WCAG 2.2.2 exigiria um botão de pausa para consertar um problema
 * que é mais simples não criar.
 *
 * **Onde cabe neste ERP:** fotos de um produto, anexos de um documento,
 * miniaturas de comprovante. Onde NÃO cabe: qualquer coisa que se compare — se
 * o operador precisa ver dois valores lado a lado para decidir, a peça certa é
 * tabela, e esconder metade das linhas atrás de um botão é perder a comparação.
 */

interface CarouselContextValue {
  trilhoRef: React.RefObject<HTMLUListElement | null>
  podeVoltar: boolean
  podeAvancar: boolean
  rolar: (direcao: -1 | 1) => void
}

const CarouselContext = React.createContext<CarouselContextValue | null>(null)

function useCarousel(quem: string): CarouselContextValue {
  const ctx = React.useContext(CarouselContext)
  if (!ctx) throw new Error(`<${quem}> precisa estar dentro de <Carousel>`)
  return ctx
}

export interface CarouselProps {
  /** Nome do conjunto — obrigatório: "carrossel" sozinho não diz de quê. */
  label: string
  className?: string
  children: React.ReactNode
}

function Carousel({ label, className, children }: CarouselProps) {
  const trilhoRef = React.useRef<HTMLUListElement>(null)
  const [pontas, setPontas] = React.useState({ inicio: true, fim: false })

  const medir = React.useCallback(() => {
    const trilho = trilhoRef.current
    if (!trilho) return
    const { scrollLeft, scrollWidth, clientWidth } = trilho
    // Folga de 1px: navegador arredonda `scrollLeft` fracionário e o botão
    // ficaria vivo no fim do trilho, sem ter para onde rolar.
    setPontas({
      inicio: scrollLeft <= 1,
      fim: scrollLeft + clientWidth >= scrollWidth - 1,
    })
  }, [])

  React.useEffect(() => {
    medir()
    const trilho = trilhoRef.current
    if (!trilho) return
    trilho.addEventListener('scroll', medir, { passive: true })
    // O trilho muda de tamanho com a janela e com o conteúdo; sem observar,
    // o botão de avançar seguiria desabilitado depois de o layout crescer.
    const observador = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(medir)
    observador?.observe(trilho)
    return () => {
      trilho.removeEventListener('scroll', medir)
      observador?.disconnect()
    }
  }, [medir])

  const rolar = React.useCallback((direcao: -1 | 1) => {
    const trilho = trilhoRef.current
    if (!trilho) return
    // Uma janela por clique, menos uma lasca: sobra sempre um item do quadro
    // anterior à vista, que é o que diz ao olho que a fileira continuou de
    // onde estava em vez de pular para outro lugar.
    trilho.scrollBy({ left: direcao * trilho.clientWidth * 0.8, behavior: 'smooth' })
  }, [])

  const valor = React.useMemo<CarouselContextValue>(
    () => ({ trilhoRef, podeVoltar: !pontas.inicio, podeAvancar: !pontas.fim, rolar }),
    [pontas.inicio, pontas.fim, rolar],
  )

  return (
    <CarouselContext.Provider value={valor}>
      <section
        data-slot="carousel"
        // `aria-roledescription` é o que faz o leitor de tela anunciar
        // "carrossel" em vez de "grupo"; sem o `aria-label` junto, o anúncio
        // seria "carrossel" e nada mais.
        aria-roledescription="carrossel"
        aria-label={label}
        className={cn('flex flex-col gap-2', className)}
      >
        {children}
      </section>
    </CarouselContext.Provider>
  )
}

function CarouselTrack({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  const { trilhoRef } = useCarousel('CarouselTrack')
  return (
    <ul
      ref={trilhoRef}
      data-slot="carousel-track"
      // `tabIndex=0` porque o trilho ROLA: região rolável que não recebe foco
      // é conteúdo inalcançável por teclado (WCAG 2.1.1). Com foco, as setas
      // do teclado rolam sozinhas, sem código nenhum.
      //
      // biome-ignore lint/a11y/noNoninteractiveTabindex: duas regras de a11y em
      // conflito, e aqui quem vale é a outra. A do Biome protege contra pôr no
      // caminho do Tab um elemento que não faz nada; a `scrollable-region-focusable`
      // do axe EXIGE foco em região que rola, senão quem não usa mouse não
      // alcança o conteúdo. Este `<ul>` rola de verdade (`overflow-x-auto`).
      tabIndex={0}
      className={cn(
        'flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth p-1 outline-none focus-visible:focus-ring',
        className,
      )}
    >
      {children}
    </ul>
  )
}

function CarouselSlide({ className, children, ...props }: React.ComponentProps<'li'>) {
  return (
    <li
      data-slot="carousel-slide"
      aria-roledescription="item"
      className={cn('shrink-0 snap-start', className)}
      {...props}
    >
      {children}
    </li>
  )
}

function CarouselPrevious({ className, ...props }: React.ComponentProps<typeof Button>) {
  const { podeVoltar, rolar } = useCarousel('CarouselPrevious')
  return (
    <Button
      data-slot="carousel-previous"
      variant="outline"
      size="icon-sm"
      // Desabilitado na ponta, e não escondido: botão que some muda o layout
      // e faz o vizinho pular para debaixo do ponteiro.
      disabled={!podeVoltar}
      onClick={() => rolar(-1)}
      className={cn(className)}
      {...props}
    >
      <ChevronLeftIcon />
      <span className="sr-only">Item anterior</span>
    </Button>
  )
}

function CarouselNext({ className, ...props }: React.ComponentProps<typeof Button>) {
  const { podeAvancar, rolar } = useCarousel('CarouselNext')
  return (
    <Button
      data-slot="carousel-next"
      variant="outline"
      size="icon-sm"
      disabled={!podeAvancar}
      onClick={() => rolar(1)}
      className={cn(className)}
      {...props}
    >
      <ChevronRightIcon />
      <span className="sr-only">Próximo item</span>
    </Button>
  )
}

export { Carousel, CarouselTrack, CarouselSlide, CarouselPrevious, CarouselNext }
