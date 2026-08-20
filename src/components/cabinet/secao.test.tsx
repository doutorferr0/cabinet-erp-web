import { Secao } from '@/components/cabinet/secao'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * A seção é a caixa-filha do documento (fusão v5 r4): cor SUAVE no título
 * (zona pastel + contorno), cheia SÓ na barra de 4px. O teste guarda a regra
 * de harmonia — cheia em área grande foi o defeito fotografado em Clientes
 * (seis faixas neon, decisão do user de 2026-08-19 encerrou).
 */
describe('Secao — caixa-filha numerada', () => {
  it('título em caixa pastel de zona, nunca em cheia', () => {
    render(
      <Secao numero="01" titulo="Cliente & Obra" cor="id">
        <p>campos</p>
      </Secao>,
    )
    const titulo = screen.getByRole('heading', { name: 'Cliente & Obra' })
    expect(titulo.className).toContain('bg-zone-id')
    expect(titulo.className).not.toContain('bg-modulo-cheia')
  })

  it('numera em Meta e desenha a barra de zona', () => {
    const { container } = render(
      <Secao numero="02" titulo="Identificação" cor="info">
        <p>campos</p>
      </Secao>,
    )
    // r5: o ordinal fala em display condensado na cor da zona.
    expect(screen.getByText('02').className).toContain(
      'font-[family-name:var(--font-display-condensada)]',
    )
    expect(screen.getByText('02').className).toContain('text-info')
    expect(container.querySelector('[data-slot="secao"] > span')?.className).toContain('bg-info')
  })
})
