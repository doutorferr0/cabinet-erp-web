import { PageFrame } from '@/app/page-frame'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * O CONTORNO DA FOLHA É ESTRUTURAL DESDE 2026-08-13, e este teste existe por
 * causa disso.
 *
 * Até 2026-08-12 bancada e folha se separavam por MATIZ — creme quente embaixo,
 * cinza frio em cima. O degrau térmico segurava a separação sozinho, e o traço
 * era acabamento. Com as duas superfícies cinzas, a separação é só de
 * luminância e ela é BAIXA de propósito: **1,10:1 medido**. A partir daí quem
 * delimita a folha é o traço preto de 2px.
 *
 * A consequência é a que ninguém enxerga lendo o diff: "suavizar a borda" não
 * deixa a folha mais leve — faz a folha DESAPARECER contra a bancada. Trocar
 * `border-2` por `border`, tirar `border-border` ou remover a sombra são
 * mudanças que passam em toda a suíte e só aparecem na tela, para o operador.
 */
describe('PageFrame — a folha', () => {
  it('é delimitada por traço de 2px no token do traço', () => {
    const { container } = render(
      <PageFrame>
        <p>conteúdo</p>
      </PageFrame>,
    )

    const folha = container.querySelector('[data-slot="page-frame"]')
    const classes = folha?.className.split(/\s+/) ?? []

    // O par que segura a folha: espessura E token. `border` sozinho (1px) ou um
    // literal no lugar do token quebram a delimitação sem quebrar nada mais.
    expect(classes).toContain('border-2')
    expect(classes).toContain('border-border')
    // Superfície da folha, não da bancada — o degrau de luz que o traço fecha.
    expect(classes).toContain('bg-card')
  })

  it('leva a elevação padrão, que é o segundo sinal de que a folha pousa sobre a bancada', () => {
    const { container } = render(
      <PageFrame>
        <p>conteúdo</p>
      </PageFrame>,
    )

    // FUSÃO v5 (fase 1.7): superfície estática usa a sombra MACIA; a escada
    // dura el1-5 ficou para o que é interativo ou decisão.
    expect(container.querySelector('[data-slot="page-frame"]')?.className).toContain('shadow-macia')
  })
})
