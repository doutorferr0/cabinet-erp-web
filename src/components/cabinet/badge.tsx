import { cn } from '@/lib/utils'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

/**
 * BADGE — a pílula pastel com ponto. Reface 2.0, issue #471 (D3).
 *
 * É a peça ÚNICA de estado do app: todo "Ativo", todo "Em aberto", todo
 * "Cancelado" passa por aqui. Substitui o carimbo da 1.x — retângulo de borda
 * 2px com o fundo cheio — por uma pílula de fundo pastel, tinta escura e um
 * ponto de 6px na frente.
 *
 * ## Por que trocar carimbo cheio por pílula pastel
 *
 * O carimbo 1.x pintava `done` de VERDE CHEIO com letra branca em cima. Numa
 * listagem de 25 cadastros, em que quase toda linha está ativa, isso enche a
 * coluna inteira de blocos saturados: o que devia ser um sinal vira o fundo da
 * tela, e o estado EXCEPCIONAL — o inativo, o cancelado — passa a competir com
 * 24 vizinhos gritando. Fundo pastel + tinta escura inverte a economia: a
 * coluna fica calma e quem destoa se lê de longe.
 *
 * O **ponto** é o que devolve a leitura periférica que o bloco cheio dava, sem
 * o custo de área: 6px de cor saturada bastam para o olho achar a linha, e o
 * texto continua legível porque a tinta está sobre pastel, não sobre saturado.
 *
 * ## O ponto NÃO é a informação
 *
 * O rótulo escreve o estado por extenso, sempre. Cor sozinha é muda para quem
 * não distingue os tons e para o leitor de tela (WCAG 1.4.1) — o ponto é
 * `aria-hidden` e existe só para acelerar a varredura de quem enxerga a cor.
 *
 * ## Separação: sombra, nunca borda
 *
 * O fundo `--<tom>-bg` é alpha de 18–22% do matiz: ele encosta na folha e não
 * se delimita sozinho. Quem recorta a pílula é a sombra dura de 1px, que é a
 * ferramenta mais barata da §Hierarquia capaz de resolver esta fronteira.
 * Borda seria a SEGUNDA ferramenta na mesma fronteira, e a régua proíbe duas.
 * `outline` é a única exceção, e por isso mesmo é tracejada: ele marca o que
 * ainda NÃO É — rascunho, provisório —, e tracejado é a convenção de "linha
 * que não fechou".
 *
 * ## A tinta é o token do tom escurecido 25% — e isso foi MEDIDO
 *
 * A fundação (`src/styles/tokens-2.0.css`) publica os pares `--ok`/`--ok-bg`,
 * `--info`/`--info-bg`, etc. Usar o par cru REPROVA o mínimo de 4,5:1 que a
 * §Hierarquia exige para texto pequeno — medido nos dois temas, com o fundo
 * alpha composto sobre folha (`--n-0`) e sobre folha-2 (`--n-50`):
 *
 * | par cru | pior caso |
 * |---|---|
 * | `mut` sobre n-50, claro  | **3,33:1** |
 * | `bad` sobre n-50, escuro | **3,71:1** |
 * | `info` sobre n-50, escuro| **3,74:1** |
 * | `ok` sobre n-50, claro   | **4,21:1** |
 *
 * Puxar a tinta 25% na direção de `--n-900` resolve os dez pares de uma vez, e
 * com UMA expressão só porque `--n-900` é a TINTA DO TEMA: no claro ela é
 * quase preta e escurece o tom; no escuro ela é quase branca e o clareia. Pior
 * par depois da correção: **4,99:1** (`mut` sobre n-50, claro). Medição em
 * oklab (mesmo espaço do `color-mix`), com composição alpha real do fundo.
 *
 * Não é token novo em zona alheia: é o consumo do token existente com a
 * correção declarada num lugar só. O certo é a fundação publicar `--ok-text` &
 * cia. — pedido registrado na #469. Quando existirem, este mapa vira
 * `text-[var(--ok-text)]` linha a linha e mais nada muda; os testes travam o
 * MAPEAMENTO (ativo→ok, open→info…), que é o que não pode mudar.
 */
export type TomDeBadge = 'ok' | 'info' | 'warn' | 'bad' | 'mut' | 'outline'

/**
 * Classes por tom. Estáticas de propósito: o Tailwind não enxerga classe
 * montada por interpolação, então `bg-[var(--${tom}-bg)]` sairia do bundle sem
 * erro nenhum e o badge apareceria transparente só em produção.
 *
 * TODO(D1/#469): trocar cada `color-mix` por `var(--<tom>-text)` quando a
 * fundação publicar o par de texto.
 */
const TONS: Record<Exclude<TomDeBadge, 'outline'>, string> = {
  ok: 'bg-[var(--ok-bg)] [color:color-mix(in_oklab,var(--ok),var(--n-900)_25%)]',
  info: 'bg-[var(--info-bg)] [color:color-mix(in_oklab,var(--info),var(--n-900)_25%)]',
  warn: 'bg-[var(--warn-bg)] [color:color-mix(in_oklab,var(--warn),var(--n-900)_25%)]',
  bad: 'bg-[var(--bad-bg)] [color:color-mix(in_oklab,var(--bad),var(--n-900)_25%)]',
  mut: 'bg-[var(--mut-bg)] [color:color-mix(in_oklab,var(--mut),var(--n-900)_25%)]',
}

export interface BadgeProps extends Omit<ComponentPropsWithoutRef<'span'>, 'color'> {
  tom: TomDeBadge
  /** O estado POR EXTENSO. Cor sozinha não diz estado nenhum. */
  children: ReactNode
}

export function Badge({ tom, children, className, ...rest }: BadgeProps) {
  const preenchido = tom !== 'outline'

  return (
    <span
      data-slot="badge"
      data-tom={tom}
      // Fonte de verdade do mapeamento: os aliases (`Stamp`, `CelulaAtivo`)
      // sobrescrevem `data-slot`/`data-tom` para não quebrar quem os consulta,
      // e este atributo continua dizendo em que tom da 2.0 a peça saiu.
      data-badge-tom={tom}
      className={cn(
        // Pílula de 22px com padding de chip (`--s-2`, 8px) e ponto de 6px.
        // O tamanho é o único número desta peça que NÃO tem degrau na
        // §Hierarquia (11 degraus, nenhum 11.5/600) — daí o `var()` com
        // fallback, que é o que a regra 4 do regime manda fazer com token
        // faltando. Pedido aberto na #469.
        'inline-flex h-[22px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[var(--r-pill)] px-[var(--s-2)] font-sans font-semibold leading-none tracking-[0.01em] [font-size:var(--t-badge,11.5px)]',
        preenchido
          ? cn(
              TONS[tom],
              // A sombra dura de 1px — ver §Separação acima. Alpha sobre
              // `--n-900` para o escuro não ganhar uma linha preta invisível.
              'shadow-[0_1px_0_0_color-mix(in_oklab,var(--n-900)_18%,transparent)]',
            )
          : // Rascunho: tracejado n-300, tinta secundária, sem ponto, sem fundo.
            // A tinta leva a MESMA correção de 25% dos outros tons — `--mut`
            // cru sobre folha dá 4,35:1 no claro, abaixo do mínimo.
            'border border-[var(--n-300)] border-dashed [color:color-mix(in_oklab,var(--mut),var(--n-900)_25%)]',
        className,
      )}
      {...rest}
    >
      {preenchido && (
        <span
          aria-hidden="true"
          data-slot="badge-ponto"
          className="size-1.5 shrink-0 rounded-full bg-current"
        />
      )}
      {children}
    </span>
  )
}
