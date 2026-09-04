import { buttonVariants } from '@/components/ui/button'
import { describe, expect, it } from 'vitest'

/**
 * O botão é onde a receita de PROFUNDIDADE do sistema se prova.
 *
 * A regra que estes testes guardam é do user e não mudou com a Reface 2.0:
 * **consumir token, nunca literal de cor** — a recalibração de tokens tem que
 * mudar tudo de um ponto só. O botão tinha justamente o contrário,
 * `shadow-[3px_3px_0_hsl(38_14%_74%)]` escrito à mão em duas variantes, e
 * nenhuma troca de token o alcançava.
 *
 * O que MUDOU na #470 é onde a regra morde. A fase 1.5 proibia a sintaxe
 * `shadow-[…]` inteira, porque naquela fase toda elevação vinha de uma utility
 * (`lift-control`) e qualquer colchete era sinal de valor escrito à mão. A
 * tecla da 2.0 tem quatro degraus de sombra (repouso 2px/3px, hover 3px/4px,
 * afundado zero) e só dois deles têm token — `--key-1` e `--key-2`. Proibir a
 * sintaxe agora obrigaria a inventar tokens que a fundação (zona da D1) não
 * publica, ou a abandonar o desenho. Então a guarda passou a medir o que
 * sempre importou: **nenhuma COR literal dentro da sombra**. Todo valor de cor,
 * em qualquer variante, sai de `var(--…)`.
 */
const VARIANTES = [
  'default',
  'primary',
  'outline',
  'secondary',
  'icon',
  'ghost',
  'destructive',
  'danger',
  'link',
] as const

/** As que são TECLA: repousam sobre uma borda inferior e afundam no clique. */
const TECLAS = ['default', 'primary', 'outline', 'secondary', 'destructive', 'danger'] as const

describe('Button — profundidade por token, nunca por literal de cor', () => {
  it('nenhuma variante escreve cor à mão — nem em sombra, nem em borda, nem em fundo', () => {
    // hsl(…)/rgb(…)/#rrggbb dentro de um valor arbitrário. `var(--x)` passa.
    const corLiteral = /\[[^\]]*(#[0-9a-fA-F]{3,8}|hsl\(|rgb\(|oklch\()[^\]]*\]/

    for (const variant of VARIANTES) {
      expect(buttonVariants({ variant }), `variante ${variant}`).not.toMatch(corLiteral)
    }
  })

  it('toda sombra declarada referencia um token', () => {
    for (const variant of VARIANTES) {
      const classes = buttonVariants({ variant })
      for (const sombra of classes.match(/shadow-\[[^\]]+\]/g) ?? []) {
        expect(sombra, `variante ${variant}`).toContain('var(--')
      }
    }
  })

  it('as teclas repousam sobre a borda inferior e afundam no clique', () => {
    for (const variant of TECLAS) {
      const classes = buttonVariants({ variant })
      expect(classes, `variante ${variant} repousa elevada`).toMatch(/shadow-\[(var\(--key-|0_2px)/)
      expect(classes, `variante ${variant} afunda`).toContain('active:shadow-none')
      expect(classes, `variante ${variant} desce no clique`).toMatch(/active:translate-y-/)
    }
  })

  it('o primário afunda MAIS que o secundário — a tecla mais alta tem mais curso', () => {
    expect(buttonVariants({ variant: 'default' })).toContain('shadow-[var(--key-2)]')
    expect(buttonVariants({ variant: 'default' })).toContain('active:translate-y-[3px]')
    expect(buttonVariants({ variant: 'outline' })).toContain('shadow-[var(--key-1)]')
    expect(buttonVariants({ variant: 'outline' })).toContain('active:translate-y-0.5')
  })

  it('ghost e link NÃO são tecla — são texto, e texto sem caixa treme em vez de elevar', () => {
    for (const variant of ['ghost', 'link'] as const) {
      expect(buttonVariants({ variant }), `variante ${variant}`).not.toMatch(/shadow-\[/)
      expect(buttonVariants({ variant }), `variante ${variant}`).not.toMatch(/active:translate-y-/)
    }
  })

  it('nenhum controle secundário carrega mais a borda de 2px preta', () => {
    // A meta declarada da issue #470. `border-2` era o vocabulário da 1.5 e
    // punha o peso da ação principal em toda peça da barra de ações.
    for (const variant of VARIANTES) {
      expect(buttonVariants({ variant }), `variante ${variant}`).not.toMatch(/\bborder-2\b/)
    }
  })

  it('a tinta do sistema vem dos degraus n-*, não de cor de fase antiga', () => {
    expect(buttonVariants({ variant: 'outline' })).toContain('border-[color:var(--n-900)]')
    expect(buttonVariants({ variant: 'icon' })).toContain('border-[color:var(--n-300)]')
  })

  it('o foco vem da receita única, em toda variante', () => {
    for (const variant of VARIANTES) {
      expect(buttonVariants({ variant }), `variante ${variant}`).toContain(
        'focus-visible:focus-ring',
      )
    }
  })

  it('o texto sai de um degrau da §Hierarquia, nunca de font-size literal', () => {
    for (const variant of VARIANTES) {
      const classes = buttonVariants({ variant })
      expect(classes, `variante ${variant}`).toContain('t-ui')
      expect(classes, `variante ${variant}`).not.toMatch(/text-\[\d|text-(xs|sm|base|lg)\b/)
    }
  })

  it('raio é o de CONTROLE, pela natureza da peça', () => {
    expect(buttonVariants({ variant: 'default' })).toContain('rounded-[var(--r-ctrl)]')
  })

  it('as alturas são as três do mockup — 28 / 34 / 40', () => {
    expect(buttonVariants({ size: 'sm' })).toContain('h-7')
    expect(buttonVariants({ size: 'default' })).toContain('h-[34px]')
    expect(buttonVariants({ size: 'md' })).toContain('h-[34px]')
    expect(buttonVariants({ size: 'lg' })).toContain('h-10')
    expect(buttonVariants({ size: 'icon' })).toContain('size-[34px]')
  })

  it('botão desabilitado NÃO mata os eventos de mouse — senão o `title` some', () => {
    // A barra de ações da DataTable explica pelo `title` por que a ação está
    // morta, e `pointer-events: none` faz o browser parar de mostrar o título
    // nativo: a explicação existiria no DOM e nunca na tela. Não clicar já é
    // garantido pelo atributo `disabled`.
    expect(buttonVariants({ variant: 'default' })).not.toContain('disabled:pointer-events-none')
    expect(buttonVariants({ variant: 'default' })).toContain('desabilitado')
  })
})
