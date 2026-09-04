import { renderRoute } from '@/test/utils'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('rota /estoque/movimentacao', () => {
  it('responde e aparece no grupo ESTOQUE da barra, preenchendo o slot reservado (§10)', async () => {
    const { user } = renderRoute('/')

    // A barra 2.0 (D4) tem TODOS os módulos numa lista só, com o grupo da rota
    // aberto e os outros dobrados. Na raiz o grupo aberto é HOJE, então chegar
    // à Movimentação são dois gestos: abrir ESTOQUE e clicar no item.
    //
    // O rótulo do grupo é `<button>` e não `<Link>`: ele NÃO navega, e a
    // diferença é a informação — o modelo anterior tinha um ícone-link por
    // seção, e clicar nele levava à primeira tela dela. Aqui abrir o grupo e
    // escolher a tela são dois atos separados.
    await user.click(await screen.findByRole('button', { name: /Estoque/ }))
    await user.click(await screen.findByRole('link', { name: 'Movimentação' }))

    expect(await screen.findByRole('heading', { name: 'Movimentação' })).toBeInTheDocument()
  })
})
