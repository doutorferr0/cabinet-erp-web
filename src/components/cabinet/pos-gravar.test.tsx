import { posGravar } from '@/components/cabinet/pos-gravar'
import { parceiro, servidorDeParceiros } from '@/test/parceiros'
import { renderRoute } from '@/test/utils'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

/**
 * O DESTINO PÓS-GRAVAR É DETERMINÍSTICO (issue #405).
 *
 * O defeito que este arquivo tranca não era "o destino errado": era **destino
 * que dependia do relógio**. O E2E do par vivo mediu, no mesmo commit, ora a
 * listagem, ora o documento ainda na tela — porque a navegação morava no
 * `onSuccess` das opções do `mutate()`, que o TanStack Query só chama DEPOIS do
 * `onSuccess` da mutation e, quando esse devolve promise, só depois de ela
 * resolver. Como quem estava ali era a invalidação, a troca de tela passava a
 * durar o tempo de uma ida à rede.
 *
 * Daí a forma dos testes abaixo: eles não perguntam só "para onde foi", mas
 * "para onde foi SEM depender de nenhuma leitura responder".
 */
describe('a regra do destino', () => {
  it('registro NOVO abre o documento, pelo id que o SERVIDOR devolveu', () => {
    const abrirDocumento = vi.fn()
    posGravar({ eraNovo: true, abrirDocumento })({ id: 'uuid-do-servidor' })
    expect(abrirDocumento).toHaveBeenCalledWith('uuid-do-servidor')
  })

  it('EDIÇÃO permanece: quem responde ao clique é o toast, não uma troca de tela', () => {
    const abrirDocumento = vi.fn()
    posGravar({ eraNovo: false, abrirDocumento })({ id: 'uuid-do-servidor' })
    expect(abrirDocumento).not.toHaveBeenCalled()
  })

  /**
   * Sem id não há endereço para onde ir, e inventar um levaria a tela para um
   * documento que não existe — "não encontrado" logo depois de gravar é pior
   * que ficar parado com o toast.
   */
  it('inclusão sem id no que voltou permanece, como a edição', () => {
    const abrirDocumento = vi.fn()
    posGravar<{ id?: string }>({ eraNovo: true, abrirDocumento })({})
    expect(abrirDocumento).not.toHaveBeenCalled()
  })

  it('o id sai de onde o chamador disser, quando não é `id`', () => {
    const abrirDocumento = vi.fn()
    posGravar<{ quoteId: string }>({
      eraNovo: true,
      abrirDocumento,
      idDoGravado: (g) => g.quoteId,
    })({ quoteId: 'q-1' })
    expect(abrirDocumento).toHaveBeenCalledWith('q-1')
  })
})

describe('o destino na tela, sem depender do relógio', () => {
  /**
   * A ASSERÇÃO É A DA CAUSA: depois do `201`, NENHUMA leitura responde — e a
   * tela troca assim mesmo.
   *
   * O stub pendura para sempre todo `GET` posterior à escrita. Com a navegação
   * encadeada atrás da invalidação (o estado que a #405 encontrou), este teste
   * esgota o tempo: o `onSuccess` da tela nunca é chamado porque o refetch
   * nunca volta. É a única forma de a suíte enxergar uma diferença que, contra
   * um servidor rápido, aparece só como alguns milissegundos.
   */
  it('a inclusão abre o cadastro que nasceu mesmo com toda leitura pendurada', async () => {
    const { stub } = servidorDeParceiros()
    let gravou = false
    const pendurado = new Promise<Response>(() => {})

    const { router, user } = renderRoute('/cadastros/clientes/novo', async (entrada) => {
      const requisicao = entrada instanceof Request ? entrada : null
      const metodo = (requisicao?.method ?? 'GET').toUpperCase()
      const caminho = new URL(String(requisicao ? requisicao.url : entrada), 'http://localhost')
        .pathname
      // Só as leituras de PARCEIRO: sessão e listas de apoio continuam
      // respondendo, senão a tela nem monta e o teste falharia por outro motivo.
      if (gravou && metodo === 'GET' && caminho.startsWith('/api/partners')) return pendurado
      const resposta = await stub(entrada)
      if (metodo === 'POST') gravou = true
      return resposta
    })

    await user.type(await screen.findByLabelText('Nome'), 'CLIENTE DA #405')
    await user.click(screen.getByRole('button', { name: /Gravar/ }))

    await waitFor(
      () => {
        expect(router.state.location.pathname).toBe(`/cadastros/clientes/${parceiro().id}`)
      },
      { timeout: 5000 },
    )
  }, 20_000)

  /**
   * E o `/novo` não fica no histórico: a navegação é `replace`. Sem isto, o
   * Voltar do navegador devolveria um formulário em branco que já foi gravado
   * — o convite para gravar o mesmo cadastro duas vezes.
   */
  it('o formulário em branco não fica no histórico atrás do documento', async () => {
    const { stub } = servidorDeParceiros()
    const { router, user } = renderRoute('/cadastros/clientes/novo', stub)

    await user.type(await screen.findByLabelText('Nome'), 'CLIENTE DA #405')
    await user.click(screen.getByRole('button', { name: /Gravar/ }))

    await waitFor(
      () => {
        expect(router.state.location.pathname).toBe(`/cadastros/clientes/${parceiro().id}`)
      },
      { timeout: 5000 },
    )

    router.history.back()
    await waitFor(() => {
      expect(router.state.location.pathname).not.toBe('/cadastros/clientes/novo')
    })
  }, 20_000)

  it('a alteração permanece no documento aberto', async () => {
    const linha = parceiro({ code: 'C001', legalName: 'ANDRÉ BATALHA', isCustomer: true })
    const { stub, chamadas } = servidorDeParceiros([linha])
    const { router, user } = renderRoute(`/cadastros/clientes/${linha.id}`, stub)

    await user.clear(await screen.findByLabelText('Nome'))
    await user.type(screen.getByLabelText('Nome'), 'ANDRÉ BATALHA JUNIOR')
    await user.click(screen.getByRole('button', { name: /Gravar/ }))

    await waitFor(() => expect(chamadas.some((c) => c.metodo === 'PUT')).toBe(true), {
      timeout: 5000,
    })
    expect(router.state.location.pathname).toBe(`/cadastros/clientes/${linha.id}`)
  }, 20_000)
})
