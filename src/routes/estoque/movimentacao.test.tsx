import { renderRoute } from '@/test/utils'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('rota /estoque/movimentacao', () => {
  it('responde e aparece no menu de Estoque, preenchendo o slot reservado (§10)', async () => {
    const { user } = renderRoute('/')

    // A barra é CONTEXTUAL desde a Nav-2: ela mostra a seção da rota, e na raiz
    // isso é Início. Trocar de seção é o passo que o operador dá — e desde a
    // volta da fileira de ícones ao topo (v7) o ícone da seção é `<Link>`, não
    // mais um cabeçalho de bloco na própria barra.
    await user.click(await screen.findByRole('link', { name: 'Estoque' }))
    await user.click(await screen.findByRole('link', { name: 'Movimentação' }))

    expect(await screen.findByRole('heading', { name: 'Movimentação' })).toBeInTheDocument()
  })
})
