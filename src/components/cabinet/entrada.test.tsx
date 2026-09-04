import { Entrada } from '@/components/cabinet/entrada'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * Entrada, depois da D16 — o componente ficou, a animação saiu.
 *
 * Os três casos que morreram aqui (`escalona de 80ms em 80ms`, `trava o atraso
 * no teto`, `não aceita atraso negativo`) mediam `atrasoDaOrdem`, a função que
 * calculava o escalonamento da mola. A regra 7 da issue-mãe #469 proíbe
 * animação de entrada de tela; sem mola não há atraso a calcular, e um teste
 * que continuasse verde sobre `atrasoDaOrdem` estaria fixando o comportamento
 * que a rodada mandou apagar.
 *
 * O que sobra é o que sempre importou: a região aparece, e aparece VISÍVEL. Ela
 * agora é visível no primeiro quadro, que é o ponto.
 */
describe('Entrada', () => {
  it('renderiza visível de imediato — sem primeiro quadro transparente', () => {
    render(
      <Entrada>
        <p>Cadastro de fornecedores</p>
      </Entrada>,
    )
    // Síncrono de propósito: antes esta asserção precisava de `waitFor` porque a
    // peça partia de `opacity: 0`. Precisar esperar ERA o defeito.
    expect(screen.getByText('Cadastro de fornecedores')).toBeVisible()
  })

  it('repassa `data-slot` e `className` — o shell continua marcando as regiões', () => {
    render(
      <Entrada data-slot="page-frame" className="flex-1" ordem={3}>
        <p>conteúdo</p>
      </Entrada>,
    )
    const regiao = screen.getByText('conteúdo').parentElement
    expect(regiao).toHaveAttribute('data-slot', 'page-frame')
    expect(regiao?.className).toContain('flex-1')
  })
})
