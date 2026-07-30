import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FormBlock } from './form-block'

/**
 * FormBlock — DESIGN.md §Shapes: compartimento fechado (borda Régua, canto
 * 4px) com `<legend>` em Meta (mono 0.75rem, caixa alta) sobre a borda.
 */
describe('FormBlock', () => {
  it('renderiza fieldset com canto 4px e borda', () => {
    render(<FormBlock legend="Transportadora">conteúdo</FormBlock>)

    const fieldset = screen.getByText('conteúdo').closest('fieldset')
    expect(fieldset?.className).toContain('rounded-lg')
    expect(fieldset?.className).toContain('border')
  })

  it('legend usa tipografia Meta (mono, caixa alta, tracking)', () => {
    render(<FormBlock legend="Transportadora">conteúdo</FormBlock>)

    const legend = screen.getByText('Transportadora')
    expect(legend.tagName).toBe('LEGEND')
    expect(legend.className).toContain('font-mono')
    expect(legend.className).toContain('text-[0.75rem]')
    expect(legend.className).toContain('uppercase')
    expect(legend.className).toContain('tracking-[0.06em]')
    expect(legend.className).toContain('text-muted-foreground')
  })
})
