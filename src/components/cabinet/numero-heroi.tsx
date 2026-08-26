import { cn } from '@/lib/utils'

/**
 * Escala do display condensado (issue #236). Três nomeadas, e não um `size`
 * livre: o número-herói é um papel do desenho, não um tamanho que cada tela
 * escolhe. Deixar a medida aberta traria de volta exatamente a deriva que a
 * fusão v5 fechou — três telas com três âncoras de tamanhos diferentes.
 *
 * `cartao` é 38px, e não 36, porque já era: a contagem do cartão de indicador
 * (`features/dashboard/indicadores.tsx`) falava em condensada desde a r7, com
 * a medida solta na tela. Ela entra aqui com o valor que tinha — aparar 2px
 * para arredondar a escala seria mudar o dashboard sem ninguém ter pedido, e
 * a medida solta é justamente o que este componente existe para recolher.
 */
export type EscalaHeroi = 'documento' | 'total' | 'cartao'

const ESCALA: Record<EscalaHeroi, string> = {
  /** Nº do documento, na banda de identidade — 36px. */
  documento: 'text-[2.25rem]',
  /** GRAND TOTAL, no fecho do documento — 48px, o maior dado da tela. */
  total: 'text-[3rem]',
  /** Contagem do cartão de indicador — 38px (r7, ref. Devora). */
  cartao: 'text-[2.375rem]',
}

export interface NumeroHeroiProps extends React.ComponentProps<'span'> {
  escala: EscalaHeroi
}

/**
 * NÚMERO-HERÓI (fusão v5 r3, issue #236): o dado que a tela existe para
 * mostrar, em display CONDENSADO — a quinta família, decisão do user de
 * 2026-08-19 sobre o teto de quatro, com UM peso e emprego único.
 *
 * Condensada aqui não é estilo, é o que torna o tamanho POSSÍVEL: medido em
 * `docs/design/medir-tabular.py`, `R$ 9.999.999,99` sai a 222px em Bebas
 * contra 363px em Sora — no segundo caso o total não caberia na largura do
 * documento a 48px. A opção de condensar o Sora foi levantada e é INERTE:
 * nenhum peso do `@fontsource/sora` tem eixo `wdth`, todos declaram
 * `usWidthClass = 5`, e browser nenhum condensa sinteticamente.
 *
 * `tabular-nums` fica declarado embora a Bebas já publique `tnum` e tenha
 * avanço uniforme nos dez dígitos: quem alinha a casa decimal aqui pode ser o
 * fallback da pilha (`Archivo Narrow`, `ui-sans-serif`), e esse não foi
 * medido. Sem isso, o total mudaria de largura enquanto o operador digita os
 * itens — foi o defeito que reprovou o Sora, que varia 35% entre `1.111` e
 * `9.999`.
 */
export function NumeroHeroi({ escala, className, ...props }: NumeroHeroiProps) {
  return (
    <span
      data-slot="numero-heroi"
      className={cn(
        'font-[family-name:var(--font-display-condensada)] leading-none tabular-nums',
        // Caixa alta com respiro: a Bebas é toda-maiúscula por desenho e
        // aperta os dígitos por padrão.
        'tracking-[0.02em]',
        ESCALA[escala],
        className,
      )}
      {...props}
    />
  )
}
