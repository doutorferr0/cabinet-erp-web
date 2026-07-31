import { stubDeParceiros } from '@/test/parceiros'
import { renderRoute } from '@/test/utils'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('tela Fornecedor', () => {
  it('listagem mostra os fornecedores do servidor', async () => {
    renderRoute('/cadastros/fornecedores', stubDeParceiros())

    expect(await screen.findByText('STELLA ILUMINAÇÃO LTDA')).toBeInTheDocument()
    expect(screen.getByText('STELLA')).toBeInTheDocument()
    expect(screen.getByText('F001')).toBeInTheDocument()
    expect(screen.getByText('Cadastro de Fornecedores')).toBeInTheDocument()
  })

  // `role` errado é 400 no backend, não filtro ignorado — a tela de Fornecedores
  // mostraria clientes e ninguém desconfiaria de uma lista cheia.
  it('pede só o papel da tela', async () => {
    const urls: string[] = []
    renderRoute('/cadastros/fornecedores', (entrada) => {
      urls.push(String(entrada instanceof Request ? entrada.url : entrada))
      return stubDeParceiros()(entrada)
    })

    await screen.findByText('STELLA ILUMINAÇÃO LTDA')
    const consulta = urls.find((u) => u.includes('/api/partners'))
    expect(consulta).toContain('role=supplier')
  })

  // Sem `GET /api/partners/{id}` não há o que abrir. Botão morto e mudo faria o
  // operador reportar defeito — e ele estaria certo em achar que é um.
  it('Alterar e Consul. ficam desabilitados, com o motivo', async () => {
    const { user } = renderRoute('/cadastros/fornecedores', stubDeParceiros())

    await user.click(await screen.findByText('STELLA ILUMINAÇÃO LTDA'))

    for (const nome of ['Alterar', 'Consul.']) {
      const botao = screen.getByRole('button', { name: nome })
      expect(botao).toBeDisabled()
      expect(botao).toHaveAttribute('title', expect.stringContaining('detalhe'))
    }
    // Incluir continua: abrir em branco não depende do servidor.
    expect(screen.getByRole('button', { name: 'Incluir' })).toBeEnabled()
  })

  it('formulário inclui contato na grade e grava (volta para a listagem)', async () => {
    const { router, user } = renderRoute('/cadastros/fornecedores/novo')

    const razao = await screen.findByLabelText('Razão Social')
    await user.type(razao, 'FORNECEDOR TESTE LTDA')

    // grade Contatos: Incluir linha e preencher
    await user.click(screen.getByRole('button', { name: /Incluir/ }))
    await user.type(screen.getByLabelText('Nome linha 1'), 'MARIA')
    await user.type(screen.getByLabelText('Vínculo linha 1'), 'COMPRAS')

    await user.click(screen.getByRole('button', { name: /Gravar/ }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/cadastros/fornecedores')
    })
  })

  it('abrir por id direto explica que o detalhe não existe no contrato', async () => {
    renderRoute('/cadastros/fornecedores/7a1d6f30-1f2b-4c8a-9e55-2b3c4d5e6f70')

    expect(await screen.findByText(/só pode ser aberto/i)).toBeInTheDocument()
    expect(screen.queryByLabelText('Razão Social')).not.toBeInTheDocument()
  })
})
