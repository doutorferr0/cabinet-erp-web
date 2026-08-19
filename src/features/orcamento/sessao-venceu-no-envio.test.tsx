import { renderRoute, respostaLookups, respostaSessao, respostaVinculos } from '@/test/utils'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * SESSÃO VENCIDA NO MEIO DO ENVIO (#124, ponto 3) — o pior caso do trilho.
 *
 * O operador preencheu o documento, clicou em `Gravar`, e o cookie já não
 * valia. O mecanismo de recuperação existe em `src/data/sessao-expirada.ts`
 * desde que o trilho foi desenhado — com o payload guardado e tudo — e **tela
 * nenhuma o chamava**.
 *
 * O que faz a digitação se perder não é o 401: é a TELA SAIR. Por isso o
 * tratamento é local — a folha fica montada, diz o que houve, e oferece entrar
 * ali mesmo. Reautenticado, o MESMO payload é reenviado.
 */

const ID = '7c5b2a10-8f3e-4d21-9c6b-2f1a4e8d0b33'

const DETALHE = {
  id: ID,
  number: '10231',
  series: '1',
  folderNumber: 'P-88',
  issuedAt: '2026-08-10',
  expiresAt: '2026-08-15',
  closedAt: null,
  customerId: '3f2a91cc-1d44-4a90-9f77-5b0e2c8a7d11',
  customerName: 'STELLA ILUMINAÇÃO LTDA',
  projectName: 'Residência Alphaville',
  salespersonId: null,
  salespersonName: null,
  professionalId: null,
  professionalName: null,
  status: 'open',
  totalCents: 250000,
  discountMode: 'product',
  discountPercent: 0,
  environments: [],
  items: [],
}

function json(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function problema(status: number, detail: string) {
  return new Response(JSON.stringify({ type: 'about:blank', status, detail }), {
    status,
    headers: { 'content-type': 'application/problem+json' },
  })
}

interface Escrita {
  metodo: string
  corpo: Record<string, unknown> | null
}

/**
 * Servidor que recusa a PRIMEIRA escrita com 401 e aceita as seguintes — é o
 * desenho da expiração: o cookie venceu entre abrir a tela e gravar.
 */
function servidor(escritas: Escrita[], logins: unknown[], statusInicial = 401) {
  return async (entrada: RequestInfo | URL) => {
    const req = entrada instanceof Request ? entrada : null
    const url = String(req ? req.url : entrada)
    const metodo = req?.method ?? 'GET'

    if (url.includes('/auth/login')) {
      logins.push(JSON.parse((await req?.text()) ?? 'null'))
      return json({ mustChangePassword: false })
    }
    if (url.includes('/auth/me')) return respostaSessao()
    if (url.includes('/auth/tenants')) return respostaVinculos()
    if (url.includes('/api/catalog-lookups')) return respostaLookups()
    // O painel de Atividades (#90) passou a montar nesta rota; sem resposta
    // aqui o `fetch` do teste devolve `undefined` e a falha aparece longe.
    if (url.includes('/api/activities')) return json({ rows: [], total: 0 })

    if (url.includes('/api/quotes')) {
      if (metodo !== 'GET') {
        const cru = await req?.text()
        escritas.push({ metodo, corpo: cru ? JSON.parse(cru) : null })
        if (escritas.length === 1 && statusInicial !== 200) {
          return problema(statusInicial, 'Sessão expirada.')
        }
        return json(DETALHE)
      }
      if (url.includes(ID)) return json(DETALHE)
      return json({ rows: [], total: 0 })
    }
    return undefined
  }
}

async function abrirEGravar(statusInicial: number) {
  const escritas: Escrita[] = []
  const logins: unknown[] = []
  const render = renderRoute(
    `/vendas/orcamentos/${ID}`,
    servidor(escritas, logins, statusInicial) as never,
  )

  await waitFor(() => expect(screen.getByLabelText(/Nº Pasta/i)).toHaveValue('P-88'))
  await render.user.type(screen.getByLabelText(/Nº Pasta/i), '-REV2')
  await render.user.click(screen.getByRole('button', { name: /^Gravar$/i }))
  await waitFor(() => expect(escritas.length).toBe(1))

  return { ...render, escritas, logins }
}

describe('sessão vencida no meio do envio', () => {
  it('a folha FICA e oferece entrar de novo — não manda para o login', async () => {
    const { router } = await abrirEGravar(401)

    expect(await screen.findByText(/sessão expirou/i)).toBeInTheDocument()
    // Sair da tela é o que perde a digitação. A rota não muda.
    expect(router.state.location.pathname).toContain(ID)
    expect(screen.getByLabelText(/Nº Pasta/i)).toHaveValue('P-88-REV2')
  })

  it('reentrar reenvia o MESMO payload, sem redigitar', async () => {
    const { user, escritas, logins } = await abrirEGravar(401)

    await screen.findByText(/sessão expirou/i)
    await user.type(screen.getByLabelText(/^E-mail$/i), 'demo@vertziluminacao.com.br')
    await user.type(screen.getByLabelText(/^Senha$/i), 'senha1234')
    await user.click(screen.getByRole('button', { name: /Entrar e enviar de novo/i }))

    await waitFor(() => expect(logins.length).toBe(1))
    await waitFor(() => expect(escritas.length).toBe(2))
    // O segundo envio é o primeiro, inteiro — inclusive o que foi digitado
    // depois de a tela carregar.
    expect(escritas[1]?.corpo).toEqual(escritas[0]?.corpo)
    expect((escritas[1]?.corpo as { folderNumber: string }).folderNumber).toBe('P-88-REV2')
  })

  it('recusa comum (400) segue sendo recusa: nada de pedir senha', async () => {
    await abrirEGravar(400)

    expect(await screen.findByText(/Sessão expirada\./i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/^Senha$/i)).not.toBeInTheDocument()
  })
})
