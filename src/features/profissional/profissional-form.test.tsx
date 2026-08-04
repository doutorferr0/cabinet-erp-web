import { parceiro, servidorDeParceiros, stubDeParceiros } from '@/test/parceiros'
import { renderRoute } from '@/test/utils'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('tela Profissional Externo', () => {
  it('listagem mostra os profissionais do servidor, pedindo só o papel da tela', async () => {
    const urls: string[] = []
    const linhas = [
      parceiro({
        code: 'P006',
        legalName: 'FLAVIO COSSA ARQUITETURA',
        tradeName: 'FLAVIO COSSA',
        isProfessional: true,
        isSupplier: false,
      }),
    ]
    renderRoute('/cadastros/profissionais', (entrada) => {
      urls.push(String(entrada instanceof Request ? entrada.url : entrada))
      return stubDeParceiros(linhas)(entrada)
    })

    expect(await screen.findByText('FLAVIO COSSA')).toBeInTheDocument()
    expect(screen.getByText('Cadastro de Profissional Externo')).toBeInTheDocument()
    expect(urls.find((u) => u.includes('/api/partners'))).toContain('role=professional')
  })

  it('formulário grava novo profissional, com o papel desta tela', async () => {
    const { stub, chamadas } = servidorDeParceiros()
    const { router, user } = renderRoute('/cadastros/profissionais/novo', stub)

    const nome = await screen.findByLabelText('Nome de Apresentação')
    await user.type(nome, 'PROFISSIONAL TESTE')

    await user.click(screen.getByRole('button', { name: /Gravar/ }))

    await waitFor(
      () => {
        expect(router.state.location.pathname).toBe('/cadastros/profissionais')
      },
      { timeout: 5000 },
    )

    expect(chamadas.find((c) => c.metodo === 'POST')?.corpo).toMatchObject({
      tradeName: 'PROFISSIONAL TESTE',
      isProfessional: true,
      isCustomer: false,
      isSupplier: false,
    })
  }, 15_000)

  it('abrir por id direto busca o registro no servidor', async () => {
    renderRoute('/cadastros/profissionais/7a1d6f30-1f2b-4c8a-9e55-2b3c4d5e6f70', stubDeParceiros())

    expect(await screen.findByLabelText('Nome')).toHaveValue('STELLA ILUMINAÇÃO LTDA')
    expect(screen.queryByText(/Abra o profissional pela listagem/i)).not.toBeInTheDocument()
  }, 15_000)
})
