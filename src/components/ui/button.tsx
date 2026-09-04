import { cn } from '@/lib/utils'
import { type VariantProps, cva } from 'class-variance-authority'
import * as React from 'react'
import {
  Button as ButtonPrimitive,
  type ButtonProps as ButtonPrimitiveProps,
  Link as LinkPrimitive,
  type LinkProps as LinkPrimitiveProps,
} from 'react-aria-components'

/**
 * BOTÃO = TECLA (Reface 2.0, issue #470 · mockup `Tokens › Profundidade`).
 *
 * A profundidade deixa de ser uma sombra diagonal com blur e passa a ser a
 * borda inferior de um keycap: o botão repousa sobre `--key-1` (2px) ou
 * `--key-2` (3px), LEVANTA 1px no hover (a sombra cresce junto, como se a peça
 * subisse do teclado) e AFUNDA no clique — 2px no secundário, 3px no primário —
 * com a sombra zerada. O movimento é vertical, não diagonal: tecla não escorrega
 * de lado.
 *
 * A borda de 2px preta que TODA variante carregava saiu. Ela era o vocabulário
 * da fase brut e transformava a barra de ações numa fileira de caixas pretas
 * com o mesmo peso da ação principal. Agora só quem é tecla tem traço de tinta,
 * e a 1.5px; o botão-ícone fica na borda de controle (n-300) com relevo quieto
 * (`--hard-soft`), e o `ghost` não tem borda nenhuma até o hover.
 *
 * Ordem de leitura do peso: `primary` (chartreuse + tinta + 3px) › `secondary`
 * (folha + tinta + 2px) › `icon` (n-300 + relevo quieto) › `ghost` (nada).
 *
 * **Por que `!` na cor de algumas variantes.** Os degraus `.t-*` moram em
 * `src/styles/tokens-2.0.css`, que entra por `@import` SEM `layer()` — as
 * regras ficam fora de camada e DEPOIS das utilities no arquivo final (medido
 * no `dist`: `.t-ui` em ~82k, `.text-*` em ~36k). Com a mesma especificidade,
 * quem vem por último ganha, então `.t-ui{color:var(--n-900)}` apagaria
 * qualquer `text-*` do Tailwind. O `!` é o que devolve a cor ao componente sem
 * editar `tokens-2.0.css` (zona da D1) — registrado na #469.
 *
 * `ghost` e `link` continuam sem tecla: são texto. Levantar texto sem caixa não
 * lê como elevação, lê como tremor.
 */
const buttonVariants = cva(
  // `cursor-pointer` porque `<button>` nasce com `cursor: default` — o mesmo
  // ponteiro do texto morto ao lado. É a afirmação mais barata de "isto
  // responde ao clique", e é o que o operador confere sem pensar antes de
  // mirar.
  //
  // A `desabilitado` (index.css) traz o `cursor: not-allowed` e NÃO usa
  // `pointer-events: none` — a troca conserta uma armadilha: com
  // `pointer-events: none` o elemento não recebe evento de mouse NENHUM, e o
  // browser deixa de mostrar o `title` nativo. A barra de ações da DataTable
  // promete exatamente isso — "Motivo, no `title` do botão. Obrigatório na
  // prática quando `disabled`: botão morto e mudo faz o operador achar que é
  // defeito". Não clicar continua garantido pelo atributo `disabled`, que a RAC
  // escreve de verdade.
  //
  // A tecla morta perde o relevo e para de flutuar: `disabled:shadow-none` +
  // `disabled:translate-y-0` moram na BASE porque o apagamento de fundo e traço
  // vem da `desabilitado`, que não mexe em `box-shadow` nem em `transform` —
  // sem estas duas linhas o botão morto continuaria parecendo uma peça pronta
  // para ser apertada. `data-[disabled]` cobre o `LinkButton`, que é `<a>` e
  // não tem `:disabled`.
  //
  // `focus-visible:translate-y-0`: no foco quem manda no desenho é o anel
  // (`focus-ring`), e uma peça deslocada 1px com halo em volta são duas
  // leituras de estado brigando na mesma tecla.
  'group/button desabilitado t-ui inline-flex shrink-0 cursor-pointer items-center justify-center gap-[7px] whitespace-nowrap rounded-[var(--r-ctrl)] outline-none select-none transition-[transform,box-shadow,background-color,color,border-color] duration-[var(--dur-1)] ease-[var(--ease)] focus-visible:focus-ring focus-visible:translate-y-0 disabled:translate-y-0 disabled:shadow-none data-[disabled]:translate-y-0 data-[disabled]:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-[15px]',
  {
    variants: {
      variant: {
        // TECLA PRIMÁRIA — chartreuse é FILL, nunca texto: a tinta em cima é
        // `--main-fg`, que continua preta nos DOIS temas (o amarelo-limão não
        // inverte). Por isso o `!`: sem ele o `.t-ui` devolveria `--n-900`, que
        // no escuro é quase branco — texto claro sobre chartreuse.
        default:
          'border-[1.5px] border-[color:var(--n-900)] bg-[var(--main)] font-semibold! text-[color:var(--main-fg)]! shadow-[var(--key-2)] hover:-translate-y-px hover:bg-[var(--main-hover)] hover:shadow-[0_4px_0_0_var(--n-900)] active:translate-y-[3px] active:shadow-none',
        // Alias de intenção: o mockup chama de `primary`, o repo chamava de
        // `default`. Os dois nomes existem para a rodada não ter de reescrever
        // 100+ chamadas fora da zona desta issue.
        primary:
          'border-[1.5px] border-[color:var(--n-900)] bg-[var(--main)] font-semibold! text-[color:var(--main-fg)]! shadow-[var(--key-2)] hover:-translate-y-px hover:bg-[var(--main-hover)] hover:shadow-[0_4px_0_0_var(--n-900)] active:translate-y-[3px] active:shadow-none',
        // TECLA SECUNDÁRIA — folha com traço de tinta e 2px de relevo. É a
        // variante mais usada do app (115 chamadas com `outline`), e é ela que
        // deixa de ser caixa preta de 2px.
        outline:
          'border-[1.5px] border-[color:var(--n-900)] bg-[color:var(--n-0)] shadow-[var(--key-1)] hover:-translate-y-px hover:shadow-[0_3px_0_0_var(--n-900)] active:translate-y-0.5 active:shadow-none',
        secondary:
          'border-[1.5px] border-[color:var(--n-900)] bg-[color:var(--n-0)] shadow-[var(--key-1)] hover:-translate-y-px hover:shadow-[0_3px_0_0_var(--n-900)] active:translate-y-0.5 active:shadow-none',
        // BOTÃO-ÍCONE QUIETO — borda de controle e relevo sem tinta. Serve à
        // fileira de ações auxiliares, onde uma tecla preta por ícone
        // transformaria a barra num teclado inteiro competindo com o conteúdo.
        icon: 'border border-[color:var(--n-300)] bg-[color:var(--n-0)] shadow-[var(--hard-soft)] hover:bg-[var(--hover)] active:translate-y-0.5 active:shadow-none',
        // GHOST — sem borda em repouso; o hover empresta o traço de controle e
        // a lavagem de tinta a 5% (`--hover`). Não levanta.
        ghost:
          'border-[1.5px] border-transparent bg-transparent text-[color:var(--n-700)]! hover:border-[color:var(--n-300)] hover:bg-[var(--hover)]',
        // PERIGO — fundo é o alpha do matiz (um valor, dois temas) e o texto é
        // o próprio `--bad`, nunca branco: no escuro o vermelho clareia e o
        // branco em cima reprovava AA no estado mais perigoso da interface.
        destructive:
          'border-[1.5px] border-[color:var(--bad)] bg-[var(--bad-bg)] text-[color:var(--bad)]! shadow-[0_2px_0_0_var(--bad)] hover:-translate-y-px hover:shadow-[0_3px_0_0_var(--bad)] active:translate-y-0.5 active:shadow-none',
        danger:
          'border-[1.5px] border-[color:var(--bad)] bg-[var(--bad-bg)] text-[color:var(--bad)]! shadow-[0_2px_0_0_var(--bad)] hover:-translate-y-px hover:shadow-[0_3px_0_0_var(--bad)] active:translate-y-0.5 active:shadow-none',
        // LINK — o único texto que carrega o acento (`--main-text`, o lime-800
        // que passa contraste; o chartreuse cru é fill). Sublinhado 2px, sem
        // caixa e sem tecla. O hover era amarelo, que é o anel de foco: link sob
        // o mouse ficava com a cara de link focado.
        link: 'border-[1.5px] border-transparent text-[color:var(--main-text)]! underline decoration-2 underline-offset-[3px] hover:bg-[var(--hover)]',
      },
      size: {
        // 34px é a altura de controle da 2.0 — a mesma do `Input`, para campo e
        // botão fecharem a linha sem degrau. `px-[13px]` vem do §Hierarquia
        // ("padding interno padrão: botão 0 13"), que é a régua da rodada.
        default: 'h-[34px] px-[13px]',
        md: 'h-[34px] px-[13px]',
        sm: 'h-7 px-2.5',
        lg: 'h-10 px-5',
        icon: 'size-[34px] p-0',
        'icon-sm': 'size-7 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

type ButtonExtraProps = {
  className?: string | undefined
  /** Compat DOM→RAC: a RAC filtra `onClick`; o wrapper traduz para `onPress`. */
  onClick?: (() => void) | undefined
  /** Compat DOM→RAC: `disabled` vira `isDisabled`. */
  disabled?: boolean | undefined
  /** A RAC filtra `title`; o wrapper aplica no elemento (motivo de botão morto). */
  title?: string | undefined
} & VariantProps<typeof buttonVariants>

function Button({
  className,
  variant = 'default',
  size = 'default',
  onClick,
  onPress,
  disabled,
  isDisabled,
  title,
  ...props
}: Omit<ButtonPrimitiveProps, 'className'> &
  React.RefAttributes<HTMLButtonElement> &
  ButtonExtraProps) {
  const ref = React.useRef<HTMLButtonElement>(null)
  // `title` não atravessa o filterDOMProps da RAC; aplicado direto no elemento.
  React.useEffect(() => {
    if (!ref.current) return
    if (title) ref.current.setAttribute('title', title)
    else ref.current.removeAttribute('title')
  }, [title])

  const dis = isDisabled ?? disabled
  return (
    <ButtonPrimitive
      ref={ref}
      data-slot="button"
      data-variant={variant}
      data-size={size}
      {...(dis !== undefined && { isDisabled: dis })}
      onPress={(e) => {
        onPress?.(e)
        onClick?.()
      }}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

function LinkButton({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: Omit<LinkPrimitiveProps, 'className'> &
  VariantProps<typeof buttonVariants> & {
    className?: string
  }) {
  return (
    <LinkPrimitive
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, LinkButton, buttonVariants }
