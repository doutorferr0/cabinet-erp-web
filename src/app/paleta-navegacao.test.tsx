import { CHAVE_RECENTES } from '@/app/comandos'
import { json } from '@/test/servidor'
import { renderRoute } from '@/test/utils'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * A PALETA COMO CAMINHO — `⌘K`, as teclas `g` e o que a linha mostra.
 *
 * O que a lista de comandos contém está em `comandos.test.ts`, sem tela; a
 * busca de registro está em `paleta-busca-registro.test.tsx`. Aqui se prova o
 * gesto: a tecla abre de qualquer rota, a linha diz onde a tela mora e qual é o
 * atalho dela, e `g c` chega sozinho ao módulo.
 *
 * Router REAL (`renderRoute`): os atalhos vivem num efeito da paleta, que só
 * existe montada dentro do shell, e o destino de `g c` sai do menu daquela
 * empresa. Com componente isolado nada disso estaria em jogo.
 */

const VINCULO = {
  tenantId: 'aaaa-1111',
  name: 'VERTZ ILUMINAÇÃO',
  role: 'owner',
  features: ['suppliers', 'professionals', 'employees'],
}

/**
 * Um `fetch` que responde vazio a qualquer listagem.
 *
 * As telas de destino consultam ao montar, e o que este arquivo mede é PARA
 * ONDE se chega — não o que aparece lá. Sem o coringa, cada rota nova exigiria
 * um stub próprio e o teste falharia por um caminho que ele nem afirma.
 */
function servidorSilencioso(entrada: RequestInfo | URL): Promise<Response> {
  const url = String(entrada instanceof Request ? entrada.url : entrada)
  const caminho = new URL(url, 'http://localhost').pathname
  if (caminho === '/auth/tenants') return Promise.resolve(json([VINCULO]))
  if (caminho === '/auth/me') {
    return Promise.resolve(
      json({
        organizationId: 'org-1',
        employeeId: 'emp-1',
        activeTenantId: VINCULO.tenantId,
        expiresAt: '2099-01-01T00:00:00Z',
        mustChangePassword: false,
      }),
    )
  }
  return Promise.resolve(json({ rows: [], total: 0 }))
}

beforeEach(() => {
  window.localStorage.removeItem(CHAVE_RECENTES)
})

afterEach(() => vi.unstubAllGlobals())

function montar(rota = '/') {
  const user = userEvent.setup()
  return { ...renderRoute(rota, servidorSilencioso), user }
}

describe('paleta — a tecla abre e o item navega', () => {
  it('⌘K abre de uma rota qualquer', async () => {
    const { user } = montar('/vendas/orcamentos')
    // Sem a paleta aberta, o campo não existe: é o que separa "abriu" de
    // "sempre esteve lá".
    expect(screen.queryByPlaceholderText(/nome\/número de um registro/)).not.toBeInTheDocument()

    await user.keyboard('{Control>}k{/Control}')

    expect(await screen.findByPlaceholderText(/nome\/número de um registro/)).toBeInTheDocument()
  })

  it('escolher um destino navega e fecha a caixa', async () => {
    const { user, router } = montar()

    await user.keyboard('{Control>}k{/Control}')
    await screen.findByPlaceholderText(/nome\/número de um registro/)
    await user.click(await screen.findByRole('menuitem', { name: /^Clientes/ }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/cadastros/clientes'))
    expect(screen.queryByPlaceholderText(/nome\/número de um registro/)).not.toBeInTheDocument()
  })

  /**
   * O caminho é o que separa homônimos (`Pedidos` existe em Compras e em
   * Vendas) e o atalho é como a tecla se aprende — quem chegou pelo mouse lê
   * a tecla no caminho de volta.
   */
  it('a linha mostra onde a tela mora e o atalho dela', async () => {
    const { user } = montar()

    await user.keyboard('{Control>}k{/Control}')
    await screen.findByPlaceholderText(/nome\/número de um registro/)

    const clientes = await screen.findByRole('menuitem', { name: /^Clientes/ })
    expect(clientes).toHaveTextContent('Pessoas')

    const ordens = await screen.findByRole('menuitem', { name: /^Ordem de Compra/ })
    expect(ordens).toHaveTextContent('G C')
  })
})

describe('paleta — teclas de ir para', () => {
  it('`g c` leva a Compras sem passar pela caixa', async () => {
    const { user, router } = montar()
    await screen.findByRole('button', { name: 'Abrir a paleta de comandos' })

    await user.keyboard('gc')

    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/compras/))
  })

  it('`g v` leva a Vendas', async () => {
    const { user, router } = montar()
    await screen.findByRole('button', { name: 'Abrir a paleta de comandos' })

    await user.keyboard('gv')

    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/vendas/))
  })

  /** O `g` sozinho não navega — é a segunda tecla que decide. */
  it('`g` sozinho fica onde está', async () => {
    const { user, router } = montar()
    await screen.findByRole('button', { name: 'Abrir a paleta de comandos' })

    await user.keyboard('g')

    expect(router.state.location.pathname).toBe('/')
  })

  /**
   * `n` abre o cadastro em branco da listagem aberta. Só onde há o que incluir:
   * numa tela de visão a tecla não existe, em vez de prometer o que a tela não
   * cumpre.
   */
  it('`n` abre o registro novo da listagem aberta', async () => {
    const { user, router } = montar('/cadastros/clientes')
    await screen.findByRole('button', { name: 'Abrir a paleta de comandos' })

    await user.keyboard('n')

    await waitFor(() => expect(router.state.location.pathname).toBe('/cadastros/clientes/novo'))
  })
})

describe('paleta — recentes', () => {
  /**
   * Dois casos e não um ciclo só: abrir a paleta duas vezes na mesma montagem
   * custa o dobro do tempo de render e encostava no teto de 15s do vitest.
   * Aqui se prova que o destino é GUARDADO; abaixo, que o guardado é MOSTRADO.
   */
  it('o destino escolhido fica guardado', async () => {
    const { user } = montar()

    await user.keyboard('{Control>}k{/Control}')
    await screen.findByPlaceholderText(/nome\/número de um registro/)
    await user.click(await screen.findByRole('menuitem', { name: /^Clientes/ }))

    await waitFor(() =>
      expect(window.localStorage.getItem(CHAVE_RECENTES)).toContain('/cadastros/clientes'),
    )
  })

  it('e o que ficou guardado encabeça a caixa, atravessando o recarregamento', async () => {
    window.localStorage.setItem(CHAVE_RECENTES, JSON.stringify(['/cadastros/clientes']))
    const { user } = montar()

    await user.keyboard('{Control>}k{/Control}')
    await screen.findByPlaceholderText(/nome\/número de um registro/)

    // O primeiro grupo da caixa é Recentes, e o primeiro item dele é o destino
    // guardado — nenhuma seção do menu vem antes.
    const itens = await screen.findAllByRole('menuitem')
    expect(itens[0]).toHaveTextContent('Clientes')
    expect(await screen.findByText('Recentes')).toBeInTheDocument()
  })
})
