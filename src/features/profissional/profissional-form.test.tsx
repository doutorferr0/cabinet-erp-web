import { parceiro, stubDeParceiros } from '@/test/parceiros'
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

  it('formulário grava novo profissional (volta para a listagem)', async () => {
    const { router, user } = renderRoute('/cadastros/profissionais/novo')

    const nome = await screen.findByLabelText('Nome de Apresentação')
    await user.type(nome, 'PROFISSIONAL TESTE')

    await user.click(screen.getByRole('button', { name: /Gravar/ }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/cadastros/profissionais')
    })
  })

  it('abrir por id direto explica que o detalhe não existe no contrato', async () => {
    renderRoute('/cadastros/profissionais/7a1d6f30-1f2b-4c8a-9e55-2b3c4d5e6f70')

    expect(await screen.findByText(/só pode ser aberto/i)).toBeInTheDocument()
  })
})
