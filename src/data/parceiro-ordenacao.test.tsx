import { ORDENAVEIS } from '@/data/parceiros-api'
import { parceiro, stubDeParceiros } from '@/test/parceiros'
import { renderRoute } from '@/test/utils'
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * A TELA NÃO PODE OFERECER ORDENAÇÃO QUE O SERVIDOR RECUSA.
 *
 * Whitelist medida no par local (2026-08-18), contra o `cabinet-erp-api`:
 *
 *     GET /api/partners?sortBy=code|legalName|tradeName|document|active|parentId  → 200
 *     GET /api/partners?sortBy=registration                                       → 400
 *     "Não dá para ordenar por `registration`. Aceitos: code, legalName,
 *      tradeName, document, active, parentId."
 *
 * Coluna nova nasce ordenável no TanStack Table — quem não quiser precisa
 * escrever `enableSorting: false`. Não há impedimento estrutural, e o defeito
 * aparece só no CLIQUE: a consulta abre, o operador ordena e leva 400.
 *
 * **Mora em `src/data/` de propósito.** O natural seria ao lado das telas, mas
 * `src/features/parceiro/**` e as rotas de cadastro estão na zona da PR #215,
 * aberta. A guarda pertence a esta rodada; o arquivo se muda de casa quando
 * aquela mergear.
 */

function stub(linhas: ReturnType<typeof parceiro>[], urls: string[]) {
  const base = stubDeParceiros(linhas)
  return (entrada: RequestInfo | URL) => {
    const url = String(entrada instanceof Request ? entrada.url : entrada)
    if (url.includes('/api/partners')) urls.push(url)
    return base(entrada)
  }
}

async function ordenacoesQueSaem(rota: string, linha: ReturnType<typeof parceiro>) {
  const urls: string[] = []
  const { user } = renderRoute(rota, stub([linha], urls))
  await screen.findByText(linha.legalName as string)

  const clicaveis = screen
    .getAllByRole('columnheader')
    .flatMap((c) => within(c).queryAllByRole('button'))
  expect(clicaveis.length).toBeGreaterThan(0)

  const saiu: (string | null)[] = []
  for (const botao of clicaveis) {
    await user.click(botao)
    await waitFor(() => expect(urls.at(-1)).toContain('sortBy='))
    saiu.push(new URL(urls.at(-1) as string).searchParams.get('sortBy'))
  }
  return saiu
}

describe('ordenação das listagens de parceiro', () => {
  it('Clientes só ordena por campo que o servidor aceita', async () => {
    const saiu = await ordenacoesQueSaem(
      '/cadastros/clientes',
      parceiro({ legalName: 'CLIENTE UM', isCustomer: true }),
    )
    for (const campo of saiu) expect(ORDENAVEIS).toContain(campo)
  }, 20_000)

  it('Fornecedores só ordena por campo que o servidor aceita', async () => {
    const saiu = await ordenacoesQueSaem(
      '/cadastros/fornecedores',
      parceiro({ legalName: 'FORNECEDOR UM', isSupplier: true }),
    )
    for (const campo of saiu) expect(ORDENAVEIS).toContain(campo)
  }, 20_000)

  /**
   * DEFEITO ABERTO, e por isso `it.fails`: a coluna `Registro` da tela de
   * Profissionais (`accessorKey: 'registration'`) não tem `enableSorting:
   * false`, então clicar no cabeçalho manda `sortBy=registration` e o servidor
   * responde **400**. A correção é uma linha em
   * `src/routes/cadastros/profissionais/index.tsx`, que está na zona da PR #215
   * — fora do alcance desta rodada, e registrada como blocker.
   *
   * `it.fails` mantém o defeito EXECUTÁVEL em vez de virar comentário: hoje o
   * teste passa porque falha, e no dia em que a linha entrar ele fica vermelho
   * pedindo para virar um `it` comum. Um `it.skip` não faria isso.
   */
  it.fails(
    'Profissionais oferece `registration`, que o servidor recusa (#215)',
    async () => {
      const saiu = await ordenacoesQueSaem(
        '/cadastros/profissionais',
        parceiro({ legalName: 'PROFISSIONAL UM', isProfessional: true, registration: 'CAU-1' }),
      )
      for (const campo of saiu) expect(ORDENAVEIS).toContain(campo)
    },
    20_000,
  )
})
