import { useLogin } from '@/data/sessao'
import { type ServidorFalso, instalarServidor } from '@/test/servidor'
import { renderWithQuery } from '@/test/utils'
import { useQuery } from '@tanstack/react-query'
import { screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * O login troca a IDENTIDADE, não só a sessão: os vínculos em cache são do
 * usuário anterior e precisam ser reconsultados. Regressão do furo registrado
 * na memória (pendência 5) — invalidar só `['sessao']` deixava o seletor
 * mostrando a empresa de quem saiu por até 30s.
 */

/** Sonda: mantém a consulta de vínculos montada enquanto dispara o login. */
function Sonda() {
  const vinculos = useQuery({
    queryKey: ['auth', 'tenants'],
    queryFn: async () => {
      const resposta = await fetch('http://api.teste/auth/tenants')
      return (await resposta.json()) as unknown[]
    },
  })
  const login = useLogin()

  return (
    <button
      type="button"
      onClick={() => login.mutate({ email: 'ana@vertz.com.br', password: 'segredo123' })}
    >
      {vinculos.data ? `${vinculos.data.length} empresas` : 'carregando'}
    </button>
  )
}

let servidor: ServidorFalso

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useLogin', () => {
  it('login com sucesso invalida TUDO — os vínculos são reconsultados', async () => {
    servidor = instalarServidor({
      '/auth/tenants': () => [{ tenantId: 't1', name: 'VERTZ ILUMINAÇÃO', role: 'owner' }],
      '/auth/login': () => ({ mustChangePassword: false }),
    })
    const { user } = renderWithQuery(<Sonda />)

    await screen.findByText('1 empresas')
    expect(servidor.em('/auth/tenants')).toHaveLength(1)

    await user.click(screen.getByRole('button'))

    // Com a invalidação só da sessão, esta segunda consulta NÃO acontecia.
    await waitFor(() => expect(servidor.em('/auth/tenants').length).toBeGreaterThan(1))
  })
})
