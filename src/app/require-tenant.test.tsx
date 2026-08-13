import { RECURSOS_TODOS, renderRoute } from '@/test/utils'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

const VERTZ = '00000000-0000-0000-0000-000000000003'
const VIA_HF = '00000000-0000-0000-0000-000000000004'

/** Sessão válida no shape do contrato, com o contexto parametrizado. */
function respostaSessaoCom(activeTenantId: string | null) {
  return new Response(
    JSON.stringify({
      organizationId: '00000000-0000-0000-0000-000000000001',
      employeeId: '00000000-0000-0000-0000-000000000002',
      activeTenantId,
      expiresAt: '2099-01-01T00:00:00Z',
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )
}

/** Dois vínculos no shape do contrato (`VinculoDeEmpresa[]`). */
function respostaVinculosDuas() {
  return new Response(
    JSON.stringify([
      { tenantId: VERTZ, name: 'VERTZ ILUMINAÇÃO', role: 'owner', features: RECURSOS_TODOS },
      {
        tenantId: VIA_HF,
        name: 'VIA HF IMPORTADORA',
        role: 'operator-sales',
        features: RECURSOS_TODOS,
      },
    ]),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )
}

function caminhoDe(input: RequestInfo | URL) {
  const url = String(input instanceof Request ? input.url : input)
  return new URL(url, 'http://localhost').pathname
}

describe('guarda de empresa ativa (RequireTenant)', () => {
  it('sessão com empresa ativa passa direto para a tela', async () => {
    renderRoute('/')

    expect(await screen.findByRole('heading', { name: 'Boletim' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Escolha a Empresa' })).not.toBeInTheDocument()
  })

  it('sessão sem empresa ativa bloqueia a tela e oferece os vínculos', async () => {
    renderRoute('/', (input) => {
      const caminho = caminhoDe(input)
      if (caminho === '/auth/me') return Promise.resolve(respostaSessaoCom(null))
      if (caminho === '/auth/tenants') return Promise.resolve(respostaVinculosDuas())
      return Promise.reject(new Error(`fetch sem stub no teste: ${caminho}`))
    })

    expect(await screen.findByRole('heading', { name: 'Escolha a Empresa' })).toBeInTheDocument()
    // O heading aparece já no skeleton; os botões só existem após os vínculos.
    expect(await screen.findByRole('button', { name: /VERTZ ILUMINAÇÃO/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /VIA HF IMPORTADORA/ })).toBeInTheDocument()
    // O sistema atrás da guarda NÃO renderiza — nada de shell nem de rota.
    expect(screen.queryByRole('heading', { name: 'Boletim' })).not.toBeInTheDocument()
  })

  it('escolher um vínculo chama o PUT do contrato e libera a tela', async () => {
    let tenantAtivo: string | null = null
    const corpos: unknown[] = []

    const { user } = renderRoute('/', async (input) => {
      const caminho = caminhoDe(input)
      // Armadilha conhecida: o cliente gerado chama `fetch(new Request(...))`,
      // então verbo e corpo vêm do Request, não do segundo argumento.
      const metodo = input instanceof Request ? input.method : 'GET'
      if (caminho === '/auth/me') return respostaSessaoCom(tenantAtivo)
      if (caminho === '/auth/tenants') return respostaVinculosDuas()
      if (caminho === '/auth/active-tenant' && metodo === 'PUT') {
        const corpo = await (input as Request).json()
        corpos.push(corpo)
        // Servidor de mentira com estado: depois do PUT o /auth/me muda.
        tenantAtivo = (corpo as { tenantId: string }).tenantId
        return new Response(null, { status: 204 })
      }
      throw new Error(`fetch sem stub no teste: ${metodo} ${caminho}`)
    })

    await user.click(await screen.findByRole('button', { name: /VIA HF IMPORTADORA/ }))

    // Body exato do contrato (`TrocarEmpresaRequest`), nada a mais.
    expect(corpos).toEqual([{ tenantId: VIA_HF }])
    expect(await screen.findByRole('heading', { name: 'Boletim' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Escolha a Empresa' })).not.toBeInTheDocument()
  })

  it('sessão sem vínculo nenhum informa o fato, sem ação inventada', async () => {
    renderRoute('/', (input) => {
      const caminho = caminhoDe(input)
      if (caminho === '/auth/me') return Promise.resolve(respostaSessaoCom(null))
      if (caminho === '/auth/tenants') {
        return Promise.resolve(
          new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } }),
        )
      }
      return Promise.reject(new Error(`fetch sem stub no teste: ${caminho}`))
    })

    expect(await screen.findByRole('heading', { name: 'Escolha a Empresa' })).toBeInTheDocument()
    expect(await screen.findByText('Nenhuma empresa vinculada a este usuário.')).toBeInTheDocument()
  })
})
