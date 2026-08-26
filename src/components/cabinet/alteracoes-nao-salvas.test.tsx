import { ID_DO_COLABORADOR, stubDeColaboradores } from '@/test/colaboradores'
import { renderRoute } from '@/test/utils'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * Teste de ROTA e não de componente isolado, e isso é parte do que ele afirma:
 * a guarda de saída é `useBlocker`, que só existe dentro do router. Montar o
 * formulário sozinho provaria a barra e deixaria de fora a metade que impede o
 * trabalho de sumir — que é a razão da issue #200.
 *
 * A tela é o cadastro de colaborador porque o provider dele é mock e síncrono:
 * o que está sob teste é o estado do formulário, não a ida ao servidor.
 */
describe('alterações não salvas', () => {
  it('a barra só aparece depois de o operador mexer', async () => {
    const { user } = renderRoute(
      `/cadastros/colaboradores/${ID_DO_COLABORADOR}`,
      stubDeColaboradores(),
    )

    const nome = await screen.findByLabelText('Nome completo')
    expect(screen.queryByText('Alterações não salvas')).not.toBeInTheDocument()
    // Formulário limpo continua com o `Gravar` no rodapé, onde o legado o pôs.
    expect(screen.getByRole('button', { name: /Gravar/ })).toBeInTheDocument()

    await user.type(nome, ' JUNIOR')

    expect(await screen.findByText('Alterações não salvas')).toBeInTheDocument()
  })

  it('o Gravar SOBE para a barra — nunca dois na mesma tela', async () => {
    const { user } = renderRoute(
      `/cadastros/colaboradores/${ID_DO_COLABORADOR}`,
      stubDeColaboradores(),
    )

    await user.type(await screen.findByLabelText('Nome completo'), 'X')
    await screen.findByText('Alterações não salvas')

    // Um só, e é o da barra: dois botões com o mesmo rótulo e o mesmo efeito
    // fariam o operador procurar a diferença entre eles.
    expect(screen.getAllByRole('button', { name: /Gravar/ })).toHaveLength(1)
  })

  it('Descartar devolve o valor do servidor e a barra sai', async () => {
    const { user } = renderRoute(
      `/cadastros/colaboradores/${ID_DO_COLABORADOR}`,
      stubDeColaboradores(),
    )

    const nome = await screen.findByLabelText('Nome completo')
    const original = (nome as HTMLInputElement).value
    await user.type(nome, ' RASCUNHO')
    expect(nome).not.toHaveValue(original)

    await user.click(await screen.findByRole('button', { name: /Descartar/ }))

    await waitFor(() => expect(nome).toHaveValue(original))
    expect(screen.queryByText('Alterações não salvas')).not.toBeInTheDocument()
  })

  it('sair com alteração pendente PERGUNTA, e Continuar editando fica na tela', async () => {
    const { router, user } = renderRoute(
      `/cadastros/colaboradores/${ID_DO_COLABORADOR}`,
      stubDeColaboradores(),
    )

    await user.type(await screen.findByLabelText('Nome completo'), 'X')
    await user.click(screen.getByRole('button', { name: /Cancelar/ }))

    const dialogo = await screen.findByRole('alertdialog')
    expect(dialogo).toHaveTextContent('Sair sem gravar?')

    await user.click(screen.getByRole('button', { name: 'Continuar editando' }))

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    })
    expect(router.state.location.pathname).toBe(`/cadastros/colaboradores/${ID_DO_COLABORADOR}`)
  })

  it('Sair sem gravar leva embora — a decisão é do operador, não da tela', async () => {
    const { router, user } = renderRoute(
      `/cadastros/colaboradores/${ID_DO_COLABORADOR}`,
      stubDeColaboradores(),
    )

    await user.type(await screen.findByLabelText('Nome completo'), 'X')
    await user.click(screen.getByRole('button', { name: /Cancelar/ }))
    await user.click(await screen.findByRole('button', { name: 'Sair sem gravar' }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/cadastros/colaboradores')
    })
  })

  it('Gravar sai da tela sem passar pela guarda', async () => {
    const { router, user } = renderRoute(
      `/cadastros/colaboradores/${ID_DO_COLABORADOR}`,
      stubDeColaboradores(),
    )

    await user.type(await screen.findByLabelText('Nome completo'), 'X')
    await user.click(await screen.findByRole('button', { name: /Gravar/ }))

    // A navegação que o próprio `Gravar` provoca acontece no mesmo tique do
    // `submit` — a guarda lê um `ref`, não estado, justamente para não barrar
    // a saída que ela deveria estar protegendo.
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/cadastros/colaboradores')
    })
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})
