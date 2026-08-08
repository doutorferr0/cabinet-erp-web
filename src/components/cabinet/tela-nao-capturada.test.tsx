import { renderWithQuery } from '@/test/utils'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TelaNaoCapturada } from './tela-nao-capturada'

describe('TelaNaoCapturada', () => {
  it('mostra o título e diz de que menu é a tela, sem inventar campo', () => {
    renderWithQuery(<TelaNaoCapturada titulo="Movimentação" menu="Movimentação" />)

    expect(screen.getByRole('heading', { name: 'Movimentação' })).toBeInTheDocument()
    expect(screen.getByText(/sem transcrição de campo/)).toBeInTheDocument()
  })
})
