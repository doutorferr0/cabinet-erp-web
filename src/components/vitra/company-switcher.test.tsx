import { SidebarProvider } from '@/components/ui/sidebar'
import { CompanySwitcher } from '@/components/vitra/company-switcher'
import { type ServidorFalso, instalarServidor } from '@/test/servidor'
import { renderWithQuery } from '@/test/utils'
import { screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * A empresa ativa vem do backend (`/auth/tenants` + `/auth/me`) e a troca vai
 * para `/auth/active-tenant`. O servidor falso intercepta o `fetch` (e não o SDK)
 * para exercitar o cliente gerado de verdade — ver `src/test/servidor.ts`.
 */
const VERTZ = { tenantId: 'aaaa-1111', name: 'VERTZ ILUMINAÇÃO', role: 'owner' }
const VIA_HF = { tenantId: 'bbbb-2222', name: 'VIA HF', role: 'operator-sales' }

let servidor: ServidorFalso
let vinculos = [VERTZ, VIA_HF]
let ativa: string | null = VIA_HF.tenantId

/** Servidor COM ESTADO: a troca muda o que `/auth/me` responde depois. */
function subirServidor() {
  servidor = instalarServidor({
    '/auth/tenants': () => vinculos,
    '/auth/me': () => ({
      organizationId: 'org-1',
      employeeId: 'emp-1',
      activeTenantId: ativa,
      expiresAt: '2026-08-01T00:00:00Z',
    }),
    '/auth/active-tenant': ({ corpo }) => {
      ativa = (corpo as { tenantId: string }).tenantId
      return new Response(null, { status: 204 })
    },
  })
}

function montar() {
  return renderWithQuery(
    <SidebarProvider>
      <CompanySwitcher />
    </SidebarProvider>,
  )
}

beforeEach(() => {
  vinculos = [VERTZ, VIA_HF]
  ativa = VIA_HF.tenantId
  subirServidor()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('CompanySwitcher', () => {
  it('mostra a empresa do CONTEXTO da sessão, não a primeira da lista', async () => {
    montar()

    // `activeTenantId` aponta para a VIA HF, que é a segunda do vínculo.
    expect(await screen.findByText('VIA HF')).toBeInTheDocument()
    expect(servidor.em('/auth/tenants')).toHaveLength(1)
  })

  it('traduz o papel do contrato para o rótulo em PT-BR', async () => {
    montar()

    // O conjunto é fechado pelo CHECK de `employee_company.role` no schema do
    // backend; o rótulo é UI, o identificador continua sendo o do contrato.
    expect(await screen.findByText('Operador de Vendas')).toBeInTheDocument()
    expect(screen.queryByText('operator-sales')).not.toBeInTheDocument()
  })

  it('troca de empresa com PUT em /auth/active-tenant', async () => {
    const { user } = montar()

    await user.click(await screen.findByRole('button', { name: /via hf/i }))
    await user.click(await screen.findByRole('menuitem', { name: /vertz iluminação/i }))

    await waitFor(() => expect(servidor.em('/auth/active-tenant')).toHaveLength(1))
    const troca = servidor.em('/auth/active-tenant')[0]
    expect(troca?.metodo).toBe('PUT')
    expect(troca?.corpo).toEqual({ tenantId: VERTZ.tenantId })
  })

  it('a troca invalida as consultas — o rótulo passa a mostrar a empresa nova', async () => {
    const { user } = montar()

    await user.click(await screen.findByRole('button', { name: /via hf/i }))
    await user.click(await screen.findByRole('menuitem', { name: /vertz iluminação/i }))

    // Dado é escopado por empresa: sem reconsulta, a tela mostraria a anterior.
    expect(await screen.findByText('VERTZ ILUMINAÇÃO')).toBeInTheDocument()
    await waitFor(() => expect(servidor.em('/auth/me').length).toBeGreaterThan(1))
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
