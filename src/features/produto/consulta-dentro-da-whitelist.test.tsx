import { ORDENAVEIS } from '@/data/produtos-api'
import { renderRoute, respostaLookups, respostaSessao, respostaVinculos } from '@/test/utils'
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * GUARDA: a tela não pode oferecer consulta que o servidor recusa.
 *
 * As whitelists do backend foram MEDIDAS no par local (2026-08-18) e são as
 * mesmas dos dois lados hoje — `code`, `description`, `active`:
 *
 *     GET /api/products?sortBy=brandName
 *     400 · "Não dá para ordenar por `brandName`. Aceitos: code, description, active."
 *
 * O que não existe é impedimento estrutural: `ORDENAVEIS` é uma cópia escrita à
 * mão da lista do servidor, e a listagem ganha coluna toda vez que o DTO cresce
 * (`Marca`, `Fábrica` e `Tipo de Produto` voltaram assim). Coluna nova nasce
 * ordenável por padrão no TanStack Table — quem não quiser precisa escrever
 * `enableSorting: false`. Esquecer disso entrega uma tela que quebra **no
 * clique**, não na carga: a consulta abre, o operador ordena e leva 400.
 *
 * Por isso o teste é sobre o GESTO, e não sobre a lista: ele clica em cada
 * cabeçalho clicável e confere que o `sortBy` que sai está na whitelist.
 */

const LINHA = {
  id: '6a774dd0-b5cd-49c0-b346-de3fe57b9ac4',
  code: 'LUM-001',
  description: 'Pendente Cobre Escovado',
  active: true,
  specialCode: null,
  shortCode: null,
  unitIn: null,
  unitInQty: null,
  unitOut: null,
  unitOutQty: null,
  productTypeId: null,
  productTypeName: null,
  brandId: null,
  brandName: null,
  factoryId: null,
  factoryName: null,
}

function servidor(urls: string[]) {
  return (entrada: RequestInfo | URL) => {
    const url = String(entrada instanceof Request ? entrada.url : entrada)
    if (url.includes('/auth/me')) return respostaSessao()
    if (url.includes('/auth/tenants')) return respostaVinculos()
    if (url.includes('/api/catalog-lookups')) return respostaLookups()
    if (url.includes('/api/products')) {
      urls.push(url)
      return new Response(JSON.stringify({ rows: [LINHA], total: 1 }), {
        headers: { 'content-type': 'application/json' },
      })
    }
    return undefined
  }
}

describe('a consulta da listagem cabe na whitelist do servidor', () => {
  it('todo cabeçalho que ordena manda um `sortBy` que o servidor aceita', async () => {
    const urls: string[] = []
    const { user } = renderRoute('/cadastros/produtos', servidor(urls) as never)
    await screen.findByText('Pendente Cobre Escovado')

    const cabecalho = screen.getAllByRole('columnheader')
    const clicaveis = cabecalho.flatMap((c) => within(c).queryAllByRole('button'))
    // Se um dia nenhum cabeçalho ordenar, o teste vira decoração — então ele
    // também exige que ainda haja o que testar.
    expect(clicaveis.length).toBeGreaterThan(0)

    for (const botao of clicaveis) {
      await user.click(botao)
      await waitFor(() => expect(urls.at(-1)).toContain('sortBy='))
      const sortBy = new URL(urls.at(-1) as string).searchParams.get('sortBy')
      expect(
        ORDENAVEIS,
        `a tela ordenou por \`${sortBy}\`, que o servidor recusa com 400`,
      ).toContain(sortBy)
    }
  })

  // O FILTRO não precisa de guarda aqui: `filtrosDaTabela` (fronteira) já
  // LANÇA quando o campo não está na whitelist do recurso, antes de a
  // requisição sair. A ordenação não tinha equivalente — `sortBy` viaja direto
  // do `accessorKey` da coluna —, e é essa a metade que este arquivo cobre.
})
