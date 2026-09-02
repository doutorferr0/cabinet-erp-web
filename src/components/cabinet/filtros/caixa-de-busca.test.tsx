import { CaixaDeBusca } from '@/components/cabinet/filtros/caixa-de-busca'
import type { CampoFiltravel } from '@/lib/filtro-de-consulta'
import { renderWithQuery } from '@/test/utils'
import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

/**
 * O realce é o único retorno que a caixa dá sobre ter entendido o prefixo. Sem
 * ele, `forn: stella` e `fornn: stella` encolhem a lista de jeitos diferentes
 * sem nada na tela dizendo qual dos dois filtrou.
 */

const CAMPOS = [
  { id: 'supplierName', rotulo: 'Fornecedor', variante: 'text' },
  {
    id: 'status',
    rotulo: 'Situação',
    variante: 'multiSelect',
    opcoes: [{ valor: 'sent', rotulo: 'Enviada' }],
  },
] as const satisfies readonly CampoFiltravel[]

function montar(valor: string) {
  const onChange = vi.fn()
  const render = renderWithQuery(<CaixaDeBusca valor={valor} onChange={onChange} campos={CAMPOS} />)
  return { ...render, onChange }
}

function realces(container: HTMLElement, tipo: string): string[] {
  return Array.from(container.querySelectorAll(`[data-realce="${tipo}"]`)).map(
    (el) => el.textContent ?? '',
  )
}

describe('CaixaDeBusca', () => {
  it('pinta o valor do prefixo que virou filtro', () => {
    const { container } = montar('forn: mister led')
    expect(realces(container, 'valor').map((t) => t.trim())).toEqual(['mister led'])
    expect(realces(container, 'prefixo')).toEqual(['forn:'])
  })

  it('não pinta nada quando o prefixo não vira filtro', () => {
    // `sit: chegou` não é situação nenhuma — pintar prometeria um filtro que a
    // lista não sofreu.
    const { container } = montar('sit: chegou')
    expect(realces(container, 'valor')).toEqual([])
    expect(realces(container, 'prefixo')).toEqual([])
  })

  it('o espelho reproduz o texto inteiro, incluindo o que é busca livre', () => {
    const { container } = montar('luminária forn: stella')
    const espelho = container.querySelector('[aria-hidden="true"].t-ui')
    expect(espelho?.textContent).toBe('luminária forn: stella')
  })

  it('a caixa continua sendo um campo de busca de verdade', async () => {
    const { user, onChange } = montar('')
    await user.type(screen.getByRole('textbox', { name: 'Busca' }), 'a')
    expect(onChange).toHaveBeenCalledWith('a')
  })

  it('a dica dos prefixos só aparece com o campo vazio e focado', async () => {
    const { user } = montar('')
    expect(screen.queryByText(/Filtre pelo campo/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('textbox', { name: 'Busca' }))

    expect(screen.getByText(/Filtre pelo campo/)).toBeInTheDocument()
    expect(screen.getByText('for:')).toBeInTheDocument()
  })
})
