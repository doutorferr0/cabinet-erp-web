import { renderRoute } from '@/test/utils'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * `/boletim` caía na tela de endereço inexistente, e o nome estava em uso no
 * sistema inteiro.
 *
 * A tela é chamada de "Boletim" na sidebar, no 404 ("Ir para o Boletim") e no
 * mockup do Dashboard 2.0, que põe uma ação `Boletim do dia` no cabeçalho — mas
 * o único endereço que existia era `/`. Quem digitasse ou linkasse o nome caía
 * no 404.
 *
 * O teste afirma as DUAS metades: que o 404 sumiu, e para ONDE o endereço leva.
 * Só a primeira passaria com uma rota que renderizasse uma tela vazia.
 */
describe('/boletim', () => {
  it('responde em vez de cair no 404, e leva à folha do dia', async () => {
    const { router } = renderRoute('/boletim')

    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(screen.queryByText('Este endereço não existe')).not.toBeInTheDocument()
  })
})
