import { parceiro, servidorDeParceiros, stubDeParceiros } from '@/test/parceiros'
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

  // O contrato tem `PUT /api/partners/{id}` e não tem `GET` por id — mas o
  // `PartnerWriteRequest` é subconjunto do `PartnerDto`, então a LINHA já traz
  // todo campo gravável. Quem faz o papel do detalhe é a linha selecionada.
  it('Alterar abre o formulário com o que veio na linha', async () => {
    const { user } = renderRoute('/cadastros/fornecedores', stubDeParceiros())

    await user.click(await screen.findByText('STELLA ILUMINAÇÃO LTDA'))
    await user.click(screen.getByRole('button', { name: 'Alterar' }))

    expect(await screen.findByLabelText('Razão Social')).toHaveValue('STELLA ILUMINAÇÃO LTDA')
    expect(screen.getByLabelText('Nome Fantasia')).toHaveValue('STELLA')
    expect(screen.getByLabelText('CNPJ/CPF')).toHaveValue('12345678000199')
    // O que o contrato não cobre segue em branco, e a tela avisa.
    expect(screen.getByText(/envia ao servidor apenas/)).toBeInTheDocument()
  })

  it('Gravar manda PUT e devolve intacto o que a tela não mostra', async () => {
    const { stub, chamadas } = servidorDeParceiros([
      parceiro({ code: 'F001', paymentTerms: '30/60/90', isCustomer: true, isSupplier: true }),
    ])
    const { router, user } = renderRoute('/cadastros/fornecedores', stub)

    await user.click(await screen.findByText('STELLA ILUMINAÇÃO LTDA'))
    await user.click(screen.getByRole('button', { name: 'Alterar' }))

    const fantasia = await screen.findByLabelText('Nome Fantasia')
    await user.clear(fantasia)
    await user.type(fantasia, 'LUZ')
    await user.click(screen.getByRole('button', { name: /Gravar/ }))

    // A volta espera o PUT E a reconsulta da listagem (`invalidateQueries`).
    await waitFor(
      () => {
        expect(router.state.location.pathname).toBe('/cadastros/fornecedores')
      },
      { timeout: 5000 },
    )

    const put = chamadas.find((c) => c.metodo === 'PUT')
    // `PUT` substitui o registro inteiro: `code`, `paymentTerms` e os papéis não
    // têm campo nesta tela e voltam como vieram — mandá-los nulos apagaria dado
    // que ninguém pediu para apagar.
    expect(put?.corpo).toEqual({
      legalName: 'STELLA ILUMINAÇÃO LTDA',
      tradeName: 'LUZ',
      document: '12345678000199',
      email: 'contato@stella.com.br',
      active: true,
      code: 'F001',
      paymentTerms: '30/60/90',
      isCustomer: true,
      isSupplier: true,
      isProfessional: false,
    })
    // 15s: este caso monta DUAS telas (listagem e formulário completo) e ainda
    // digita — o limite padrão de 5s do vitest não cobre isso nesta máquina.
  }, 15_000)

  it('formulário inclui contato na grade e grava (volta para a listagem)', async () => {
    const { stub } = servidorDeParceiros()
    const { router, user } = renderRoute('/cadastros/fornecedores/novo', stub)

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

  // O papel vem da TELA: incluir por Fornecedores cria fornecedor, e só. Marcar
  // os três "por precaução" faria o cadastro novo aparecer nas três listagens.
  it('Incluir manda POST com o papel desta tela', async () => {
    const { stub, chamadas } = servidorDeParceiros()
    const { router, user } = renderRoute('/cadastros/fornecedores/novo', stub)

    await user.type(await screen.findByLabelText('Razão Social'), 'NOVA LTDA')
    await user.click(screen.getByRole('button', { name: /Gravar/ }))

    await waitFor(
      () => {
        expect(router.state.location.pathname).toBe('/cadastros/fornecedores')
      },
      { timeout: 5000 },
    )

    const post = chamadas.find((c) => c.metodo === 'POST')
    expect(post?.corpo).toMatchObject({
      legalName: 'NOVA LTDA',
      isSupplier: true,
      isCustomer: false,
      isProfessional: false,
      // Do VÍNCULO com a empresa, e nenhum formulário tem campo para eles.
      code: null,
      paymentTerms: null,
    })
  }, 15_000)

  // Link direto e recarga não têm linha — e sem leitura por id não há de onde
  // tirá-la. A tela manda voltar à listagem em vez de abrir formulário vazio.
  it('abrir por id direto manda usar a listagem', async () => {
    renderRoute('/cadastros/fornecedores/7a1d6f30-1f2b-4c8a-9e55-2b3c4d5e6f70')

    expect(await screen.findByText(/Abra o fornecedor pela listagem/i)).toBeInTheDocument()
    expect(screen.queryByLabelText('Razão Social')).not.toBeInTheDocument()
  })
})
