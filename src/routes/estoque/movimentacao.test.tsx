import { renderRoute } from '@/test/utils'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('rota /estoque/movimentacao', () => {
  it('responde e aparece no menu de Estoque, preenchendo o slot reservado (§10)', async () => {
    const { user } = renderRoute('/')

    // A barra é CONTEXTUAL desde a Nav-2: ela mostra a seção da rota, e na raiz
    // isso é Início. Abrir a seção Estoque é o passo que o operador dá — e o
    // que este teste passou a exercitar junto.
    await user.click(await screen.findByRole('button', { name: 'Estoque' }))
    await user.click(await screen.findByRole('link', { name: 'Movimentação' }))

    expect(await screen.findByRole('heading', { name: 'Movimentação' })).toBeInTheDocument()
  })
})
