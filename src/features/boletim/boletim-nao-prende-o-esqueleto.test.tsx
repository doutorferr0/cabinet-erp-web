import { ErroDaApi } from '@/data/api-provider'
import { renderRoute, respostaSessao, respostaVinculos } from '@/test/utils'
import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

/**
 * A FOLHA DE ENTRADA NÃO PODE FICAR PRESA NO ESQUELETO.
 *
 * A forma que estava na tela era `query.isPending || !dados ? <BoletimSkeleton />`. No
 * erro, `isPending` cai para falso e `dados` continua indefinido — então o segundo termo
 * do `||` segurava o carregamento PARA SEMPRE, na rota `/`, que é por onde todo mundo
 * entra. É a mesma forma que mordeu na rota de incluir em 20/08.
 *
 * ## Por que este teste dubla `fetchBoletim`, em vez de derrubar um endpoint
 *
 * Porque hoje NENHUM endpoint derruba esta consulta, e isso é deliberado:
 * `linhaDeCadastro` (`data/boletim.ts`) embrulha cada uma das quatro listagens num
 * `try/catch` e degrada a linha para `total: null` em vez de rejeitar — para que uma
 * lista fora do ar não apague o Movimento do dia, que é mock puro. O resultado é que o
 * ramo de erro da tela é, hoje, INALCANÇÁVEL pela rede.
 *
 * Isso não torna o defeito teórico: torna-o ARMADO. O cabeçalho de `fetchBoletim`
 * promete o endpoint de resumo que vem ("mesma assinatura que o endpoint de resumo
 * terá"), e no dia em que a consulta passar a rejeitar, a folha de entrada congela — a
 * não ser que o ramo já esteja aqui. O dublê é o único jeito de a guarda saber ficar
 * vermelha antes desse dia; sem ele, o conserto seria código que nada exercita.
 */
vi.mock('@/data/boletim', async (original) => ({
  ...(await original<typeof import('@/data/boletim')>()),
  fetchBoletim: () =>
    Promise.reject(
      new ErroDaApi('Falha ao montar o boletim.', 409, 'Nenhuma empresa ativa na sessão.', {
        type: 'about:blank',
        title: 'Sem empresa ativa',
        status: 409,
        detail: 'Nenhuma empresa ativa na sessão.',
      }),
    ),
}))

describe('boletim que não carregou', () => {
  it('vira aviso com saída, e não esqueleto eterno', async () => {
    renderRoute('/', (entrada: RequestInfo | URL) => {
      const caminho = new URL(
        String(entrada instanceof Request ? entrada.url : entrada),
        'http://localhost',
      ).pathname
      if (caminho === '/auth/me') return Promise.resolve(respostaSessao())
      if (caminho === '/auth/tenants') return Promise.resolve(respostaVinculos())
      return Promise.reject(new Error(`fetch sem stub no teste: ${caminho}`))
    })

    expect(await screen.findByText('O boletim não carregou')).toBeInTheDocument()
    // O `detail` do problem+json chega ao operador — é a única parte acionável.
    expect(screen.getByText('Nenhuma empresa ativa na sessão.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()

    // E o esqueleto SAIU. Sem esta asserção o teste passaria com os dois na tela, que é
    // exatamente o estado que o defeito produzia.
    expect(document.querySelector('[data-testid="esqueleto-cabecalho"]')).toBeNull()
    expect(screen.queryByText('Orçamentos do dia')).not.toBeInTheDocument()
  })
})
