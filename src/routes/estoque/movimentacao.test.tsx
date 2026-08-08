import { renderRoute } from '@/test/utils'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('rota /estoque/movimentacao', () => {
  it('responde e aparece no menu de Estoque, preenchendo o slot reservado (§10)', async () => {
    const { user } = renderRoute('/')

    await user.click(await screen.findByRole('link', { name: 'Movimentação' }))

    expect(await screen.findByRole('heading', { name: 'Movimentação' })).toBeInTheDocument()
  })
})
