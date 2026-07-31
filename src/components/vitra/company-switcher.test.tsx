import { configurarApi } from '@/api/cliente'
import { SidebarProvider } from '@/components/ui/sidebar'
import { CompanySwitcher } from '@/components/vitra/company-switcher'
import { renderWithQuery } from '@/test/utils'
import { screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * A empresa ativa vem do backend (`/auth/tenants` + `/auth/me`) e a troca vai
 * para `/auth/active-tenant`.
 *
 * O teste intercepta o `fetch`, não o SDK gerado — se o codegen mudar a URL, o
 * verbo ou a forma do corpo, isto quebra. Dublar o SDK esconderia a fronteira
 * que o teste existe para vigiar.
 */
const VERTZ = { tenantId: 'aaaa-1111', name: 'VERTZ ILUMINAÇÃO', role: 'owner' }
const VIA_HF = { tenantId: 'bbbb-2222', name: 'VIA HF', role: 'operator-sales' }

interface Chamada {
  url: string
  metodo: string
  corpo: unknown
}

let chamadas: Chamada[] = []
let vinculos = [VERTZ, VIA_HF]
let ativa: string | null = VIA_HF.tenantId

function json(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/**
 * Servidor falso com estado: a troca muda o que `/auth/me` responde depois.
 *
 * O cliente gerado chama `fetch(new Request(...))` — verbo e corpo vêm do
 * Request, não do segundo argumento, que vem vazio.
 */
async function servidor(entrada: RequestInfo | URL, init?: RequestInit) {
  const requisicao = entrada instanceof Request ? entrada : null
  const url = String(requisicao ? requisicao.url : entrada)
  const metodo = (requisicao?.method ?? init?.method ?? 'GET').toUpperCase()
  const corpo = requisicao
    ? await requisicao
        .clone()
        .text()
        .then((t) => (t ? JSON.parse(t) : null))
    : init?.body
      ? JSON.parse(String(init.body))
      : null
  chamadas.push({ url, metodo, corpo })

  const caminho = new URL(url).pathname
  if (caminho === '/auth/tenants') return json(vinculos)
  if (caminho === '/auth/me') {
    return json({
      organizationId: 'org-1',
      employeeId: 'emp-1',
      activeTenantId: ativa,
      expiresAt: '2026-08-01T00:00:00Z',
    })
  }
  if (caminho === '/auth/active-tenant') {
    ativa = (corpo as { tenantId: string }).tenantId
    return new Response(null, { status: 204 })
  }
  return new Response('', { status: 404 })
}

function montar() {
  return renderWithQuery(
    <SidebarProvider>
      <CompanySwitcher />
    </SidebarProvider>,
  )
}

const chamadasEm = (caminho: string) => chamadas.filter((c) => new URL(c.url).pathname === caminho)

beforeEach(() => {
  chamadas = []
  vinculos = [VERTZ, VIA_HF]
  ativa = VIA_HF.tenantId
  configurarApi('http://api.teste')
  vi.stubGlobal('fetch', vi.fn(servidor))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('CompanySwitcher', () => {
  it('mostra a empresa do CONTEXTO da sessão, não a primeira da lista', async () => {
    montar()

    // `activeTenantId` aponta para a VIA HF, que é a segunda do vínculo.
    expect(await screen.findByText('VIA HF')).toBeInTheDocument()
    expect(screen.getByText('operator-sales')).toBeInTheDocument()
    expect(chamadasEm('/auth/tenants')).toHaveLength(1)
  })

  it('troca de empresa com PUT em /auth/active-tenant', async () => {
    const { user } = montar()

    await user.click(await screen.findByRole('button', { name: /via hf/i }))
    await user.click(await screen.findByRole('menuitem', { name: /vertz iluminação/i }))

    await waitFor(() => expect(chamadasEm('/auth/active-tenant')).toHaveLength(1))
    const troca = chamadasEm('/auth/active-tenant')[0] as Chamada
    expect(troca.metodo).toBe('PUT')
    expect(troca.corpo).toEqual({ tenantId: VERTZ.tenantId })
  })

  it('a troca invalida as consultas — o rótulo passa a mostrar a empresa nova', async () => {
    const { user } = montar()

    await user.click(await screen.findByRole('button', { name: /via hf/i }))
    await user.click(await screen.findByRole('menuitem', { name: /vertz iluminação/i }))

    // Dado é escopado por empresa: sem reconsulta, a tela mostraria a anterior.
    expect(await screen.findByText('VERTZ ILUMINAÇÃO')).toBeInTheDocument()
    await waitFor(() => expect(chamadasEm('/auth/me').length).toBeGreaterThan(1))
  })

  it('falha do servidor NÃO se disfarça de empresa ausente', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('', { status: 500 }))),
    )
    montar()

    expect(await screen.findByText('Empresas indisponíveis')).toBeInTheDocument()
  })

  it('usuário sem vínculo vê o motivo, não um menu vazio', async () => {
    vinculos = []
    ativa = null
    const { user } = montar()

    await user.click(await screen.findByRole('button', { name: /nenhuma empresa ativa/i }))
    expect(await screen.findByText(/nenhuma empresa vinculada/i)).toBeInTheDocument()
  })
})
