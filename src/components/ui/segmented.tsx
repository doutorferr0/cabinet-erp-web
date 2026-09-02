import { cn } from '@/lib/utils'
import {
  RadioGroup as RadioGroupPrimitive,
  type RadioGroupProps,
  Radio as RadioPrimitive,
  type RadioProps,
  composeRenderProps,
} from 'react-aria-components'

/**
 * SEGMENTED CONTROL (Reface 2.0, issue #470 · mockup `.seg`).
 *
 * Uma escolha exclusiva entre 2 e 4 alternativas de MODO, onde as opções são
 * faces da mesma coisa e o operador troca de uma para outra o tempo todo:
 * Lista / Kanban / Calendário, Compacta / Confortável, Entrada / Saída /
 * Ajuste. Três radios empilhados diriam a mesma coisa gastando três linhas e
 * uma leitura vertical; o segmentado diz em uma faixa de 28px, e a peça inteira
 * ocupa o espaço de um chip.
 *
 * Desenho: UMA borda n-300 no grupo, cantos de controle, `overflow-hidden` — os
 * itens não têm borda própria e a divisão interna é uma hairline entre irmãos
 * (`+ label`), nunca uma borda por item, que dobraria o traço em cada junta. O
 * ativo é tinta cheia com o rótulo em folha, o mesmo par do `Checkbox` marcado,
 * e inverte sozinho no tema escuro.
 *
 * **Por que sobre `RadioGroup` da RAC e não sobre botões.** É escolha exclusiva
 * de verdade: a RAC dá navegação por setas dentro do grupo, `aria-checked`,
 * roving tabindex e o rótulo do grupo — tudo que uma fileira de `<button>`
 * teria de imitar à mão e normalmente não imita. Visualmente não sobra nada de
 * radio: o círculo não é renderizado.
 *
 * **Consumidor.** Nasce ligado ao `SegmentedField` de
 * `components/cabinet/form-controls.tsx`. As telas que o mockup desenha com ele
 * — alternador de visão (D12), densidade da DataTable (D8) e natureza da
 * movimentação (D24) — são zona de outras issues desta rodada, então o
 * componente entra pronto e testado, e cada uma o monta na sua vez.
 */
function Segmented({ className, ...props }: RadioGroupProps) {
  return (
    <RadioGroupPrimitive
      data-slot="segmented"
      className={composeRenderProps(className, (className) =>
        cn(
          'inline-flex w-fit overflow-hidden rounded-[var(--r-ctrl)] border border-[color:var(--n-300)] bg-[color:var(--n-0)] data-[orientation=vertical]:flex-col',
          className,
        ),
      )}
      {...props}
    />
  )
}

/**
 * Um segmento. `children` é o rótulo; um ícone lucide dentro sai a 14px, como
 * no mockup.
 *
 * O foco é `focus-ring-inset` e não `focus-ring`: o anel por fora invadiria os
 * vizinhos dentro de uma faixa sem folga, que é exatamente o caso que a
 * variante inset do `index.css` existe para resolver.
 */
function SegmentedItem({ className, children, ...props }: RadioProps) {
  return (
    <RadioPrimitive
      data-slot="segmented-item"
      className={composeRenderProps(className, (className) =>
        cn(
          'group/segmented desabilitado t-ui flex h-7 cursor-pointer items-center justify-center gap-1.5 px-2.5 whitespace-nowrap text-[color:var(--n-500)]! outline-none transition-colors select-none',
          // A hairline mora ENTRE irmãos, nunca em cada item: borda por item
          // dobraria o traço em toda junta da faixa.
          '[&+&]:border-l [&+&]:border-l-[color:var(--n-300)]',
          'hover:bg-[var(--hover)] data-focus-visible:focus-ring-inset',
          'data-selected:bg-[color:var(--n-900)] data-selected:text-[color:var(--n-0)]!',
          'data-[disabled]:cursor-not-allowed',
          '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-[14px]',
          className,
        ),
      )}
      {...props}
    >
      {children}
    </RadioPrimitive>
  )
}

export { Segmented, SegmentedItem }
