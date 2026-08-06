import { buttonVariants } from '@/components/ui/button'
import { describe, expect, it } from 'vitest'

/**
 * O botão é onde a receita de elevação da fase 1.5 se prova.
 *
 * A regra que estes testes guardam é do user, e vale para a fase inteira:
 * **consumir token/utility, nunca literal de sombra, raio ou cor de foco** — a
 * recalibração de tokens prevista tem que mudar tudo de um ponto só. O botão
 * tinha justamente o contrário, `shadow-[3px_3px_0_hsl(38_14%_74%)]` escrito à
 * mão em duas variantes, e nenhuma troca de token o alcançava.
 */
describe('Button — elevação por utility, não por literal', () => {
  it('nenhuma variante escreve sombra, raio ou translate à mão', () => {
    const literais = /shadow-\[|rounded-\[|translate-[xy]-\[|shadow-\[.*hsl/

    for (const variant of [
      'default',
      'outline',
      'secondary',
      'ghost',
      'destructive',
      'link',
    ] as const) {
      expect(buttonVariants({ variant }), `variante ${variant}`).not.toMatch(literais)
    }
  })

  it('as variantes com caixa consomem a lift-control', () => {
    for (const variant of ['default', 'outline', 'secondary', 'destructive'] as const) {
      expect(buttonVariants({ variant }), `variante ${variant}`).toContain('lift-control')
    }
  })

  it('ghost e link NÃO levantam — são texto, e texto sem caixa treme em vez de elevar', () => {
    expect(buttonVariants({ variant: 'ghost' })).not.toContain('lift-control')
    expect(buttonVariants({ variant: 'link' })).not.toContain('lift-control')
  })

  it('o foco vem da receita única, em toda variante', () => {
    for (const variant of [
      'default',
      'outline',
      'secondary',
      'ghost',
      'destructive',
      'link',
    ] as const) {
      expect(buttonVariants({ variant }), `variante ${variant}`).toContain(
        'focus-visible:focus-ring',
      )
    }
  })

  it('raio é o de CONTROLE, pela natureza da peça', () => {
    expect(buttonVariants({ variant: 'default' })).toContain('rounded-control')
  })
})
