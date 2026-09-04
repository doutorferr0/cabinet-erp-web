import { renderRoute } from '@/test/utils'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('rota inexistente', () => {
  it('endereço errado explica em PT-BR, não em vocabulário de roteador', async () => {
    renderRoute('/cadastros/inexistente-de-proposito')

    expect(await screen.findByText('Este endereço não existe')).toBeInTheDocument()
    // O default do TanStack fala de "route" e da árvore de rotas — palavra de
    // quem escreveu o roteador, não de quem opera o sistema.
    expect(screen.queryByText(/route/i)).not.toBeInTheDocument()
  })

  it('oferece uma SAÍDA nomeada — 404 que só informa deixa o operador na barra de endereço', async () => {
    renderRoute('/nao-existe')

    const saida = await screen.findByRole('link', { name: 'Ir para o início' })
    expect(saida).toHaveAttribute('href', '/')
  })
})
