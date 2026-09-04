import { cn } from '@/lib/utils'
import type * as React from 'react'
import { Input as InputPrimitive, composeRenderProps } from 'react-aria-components'

/**
 * CAMPO REBAIXADO (Reface 2.0, issue #470 · mockup `Formulário`).
 *
 * A caixa preta de 2px saiu. O campo agora é um sulco no papel: borda 1px de
 * controle (n-300), fundo folha e `--inset` — a sombra interna que rebaixa a
 * superfície um degrau. É o oposto do botão, que é tecla e se levanta: quem
 * recebe digitação afunda, quem recebe clique sobe. A distinção passa a ser de
 * FORMA, não de espessura de traço, e é o que faz uma tela de formulário parar
 * de parecer uma grade de caixas iguais.
 *
 * Estados:
 * - foco: borda de tinta (n-900) + a receita única de anel do repo
 *   (`focus-ring`: 3px amarelos com fio preto por fora). O `--ring-outline` de
 *   `tokens-2.0.css` não serve enquanto a D1 não fizer os aliases — o `--ring`
 *   do 1.x ainda é triplet HSL, e `0 0 0 5px 47 100% 50%` é declaração
 *   inválida, o que apagaria o foco inteiro. Registrado na #469.
 * - `readOnly`: folha-2 e SEM inset — o campo sobe ao plano do papel, dizendo
 *   pela forma que ali não se digita.
 * - `aria-invalid`: borda `--bad`.
 * - `numeric`: mono tabular alinhado à direita, porque número que se compara
 *   coluna a coluna precisa dos dígitos na mesma largura.
 *
 * Desabilitado pela utility `desabilitado` (index.css §Desabilitado): o valor
 * digitado continua em tinta cheia e quem apaga é a superfície e o traço. O
 * inset também sai — superfície morta não é sulco.
 */
function Input({
  className,
  type,
  variante = 'texto',
  ...props
}: React.ComponentProps<typeof InputPrimitive> & {
  /** `numeric`: mono tabular à direita (quantidade, valor, código). */
  variante?: 'texto' | 'numeric'
}) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      data-variante={variante}
      className={composeRenderProps(className, (className) =>
        cn(
          'desabilitado h-[34px] w-full min-w-0 rounded-[var(--r-ctrl)] border border-[color:var(--n-300)] bg-[color:var(--n-0)] px-2.5 shadow-[var(--inset)] outline-none transition-colors',
          'placeholder:text-[color:var(--n-400)] focus-visible:border-[color:var(--n-900)] focus-visible:focus-ring aria-invalid:border-[color:var(--bad)]',
          'read-only:bg-[color:var(--n-50)] read-only:shadow-none disabled:shadow-none',
          'file:inline-flex file:h-6 file:border-0 file:bg-transparent file:font-medium',
          variante === 'numeric' ? 't-dado text-right' : 't-corpo',
          className,
        ),
      )}
      {...props}
    />
  )
}

export { Input }
