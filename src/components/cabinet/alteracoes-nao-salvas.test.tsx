import { useAutosave } from '@/components/cabinet/alteracoes-nao-salvas'
import { IndicadorDeGravacao } from '@/components/cabinet/documento'
import { ID_DO_COLABORADOR, stubDeColaboradores } from '@/test/colaboradores'
import { renderRoute, renderWithQuery } from '@/test/utils'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

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

/**
 * AUTOSAVE DO REGISTRO (#483) — o outro regime, o do documento 2.0.
 *
 * Testado pelo HOOK e pelo indicador, e não por rota: a fila é o comportamento
 * (debounce por campo, uma gravação por registro, erro que se pode repetir), e
 * nenhuma rota de documento a liga ainda — quem liga são as fichas de D16/D19.
 * O `useBlocker` da `GuardaDeAutosave` é o pedaço que exige router, e é o mesmo
 * da barra do cadastro, já provado acima.
 */
function Sonda({
  salvar,
  debounceMs = 20,
}: {
  salvar: (campos: readonly string[]) => Promise<unknown>
  debounceMs?: number
}) {
  const fila = useAutosave({ salvar, debounceMs })
  return (
    <div>
      <input aria-label="Número" onChange={() => fila.agendar('numero')} />
      <input aria-label="Data" onChange={() => fila.agendar('data')} />
      <button type="button" onClick={() => fila.descarregar()}>
        Descarregar
      </button>
      <IndicadorDeGravacao estado={fila.estado} onTentarDeNovo={fila.tentarDeNovo} />
      <output aria-label="fila">{fila.filaVazia() ? 'vazia' : 'cheia'}</output>
    </div>
  )
}

/** Promessa que o teste resolve na hora que quiser — para provar a fila. */
function adiada<T>() {
  let resolver!: (v: T) => void
  let rejeitar!: (e: unknown) => void
  const promessa = new Promise<T>((res, rej) => {
    resolver = res
    rejeitar = rej
  })
  return { promessa, resolver, rejeitar }
}

describe('useAutosave', () => {
  it('três teclas no mesmo campo gravam UMA vez — o debounce é do campo', async () => {
    const salvar = vi.fn(() => Promise.resolve())
    // 300ms e não os 20 das outras sondas: `user.type` leva mais que 20ms entre
    // duas teclas em jsdom, e com a janela curta o teste provaria o contrário
    // do que afirma — cada tecla cairia numa rodada própria.
    const { user } = renderWithQuery(<Sonda salvar={salvar} debounceMs={300} />)

    await user.type(screen.getByLabelText('Número'), 'abc')

    await screen.findByText(/salvo/, {}, { timeout: 2_000 })
    expect(salvar).toHaveBeenCalledOnce()
    expect(salvar).toHaveBeenCalledWith(['numero'])
  })

  it('nada foi digitado, nada é gravado — a fila nasce ociosa', () => {
    const salvar = vi.fn(() => Promise.resolve())
    renderWithQuery(<Sonda salvar={salvar} />)
    expect(salvar).not.toHaveBeenCalled()
    expect(screen.getByLabelText('fila')).toHaveTextContent('vazia')
  })

  it('duas gravações não correm juntas: a segunda espera a resposta da primeira', async () => {
    const primeira = adiada<void>()
    const salvar = vi.fn((_campos: readonly string[]) => primeira.promessa)
    const { user } = renderWithQuery(<Sonda salvar={salvar} />)

    await user.type(screen.getByLabelText('Número'), 'a')
    // Espera-se a CHAMADA, não o texto: "salvando…" também é o que a fase
    // `pendente` mostra (a diferença de 800ms não é informação para quem olha),
    // então casar o texto passaria antes de a gravação ter saído.
    await waitFor(() => expect(salvar).toHaveBeenCalledOnce())

    // Chega alteração de OUTRO campo com a primeira ainda em voo. Duas
    // requisições concorrentes chegariam fora de ordem e a última a chegar
    // venceria — que pode ser a primeira que saiu.
    await user.type(screen.getByLabelText('Data'), 'b')
    await waitFor(() => expect(screen.getByLabelText('fila')).toHaveTextContent('cheia'))
    expect(salvar).toHaveBeenCalledOnce()

    primeira.resolver()
    await waitFor(() => expect(salvar).toHaveBeenCalledTimes(2))
    expect(salvar).toHaveBeenLastCalledWith(['data'])
  })

  it('erro fica visível e o retry regrava os MESMOS campos', async () => {
    let tentativas = 0
    const salvar = vi.fn((_campos: readonly string[]) => {
      tentativas += 1
      return tentativas === 1 ? Promise.reject(new Error('sem servidor')) : Promise.resolve()
    })
    const { user } = renderWithQuery(<Sonda salvar={salvar} />)

    await user.type(screen.getByLabelText('Número'), 'a')
    await screen.findByText('erro ao salvar')
    // Gravação invisível que falha é pior que botão que não grava: sem este
    // estado, o operador não teria nem o botão para tentar de novo.
    expect(screen.getByLabelText('fila')).toHaveTextContent('cheia')

    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }))

    await screen.findByText(/salvo/)
    // Os campos VOLTARAM para a fila: um retry sem eles gravaria uma rodada
    // vazia e mostraria "salvo" sem ter salvado nada.
    expect(salvar).toHaveBeenLastCalledWith(['numero'])
  })

  it('409 é conflito, e conflito não se resolve repetindo', async () => {
    const salvar = vi.fn(() => Promise.reject({ status: 409, detail: 'versão mais nova' }))
    const { user, container } = renderWithQuery(<Sonda salvar={salvar} />)

    await user.type(screen.getByLabelText('Número'), 'a')

    await waitFor(() =>
      expect(container.querySelector('[data-slot="autosave"]')).toHaveAttribute(
        'data-fase',
        'conflito',
      ),
    )
  })

  it('descarregar não espera o debounce — é o blur e a ação primária', async () => {
    const salvar = vi.fn(() => Promise.resolve())
    const { user } = renderWithQuery(<Sonda salvar={salvar} debounceMs={5_000} />)

    await user.type(screen.getByLabelText('Número'), 'a')
    expect(salvar).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Descarregar' }))

    await waitFor(() => expect(salvar).toHaveBeenCalledOnce())
  })
})
