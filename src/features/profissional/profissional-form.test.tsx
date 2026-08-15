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

    const nome = await screen.findByLabelText('Nome de apresentação')
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

  // O CONTRATO CRESCEU (2026-08-13): a engenharia reversa do legado confirmou
  // `partners.registration` (CREA/CAU/CFT) e os dados bancários de comissão, e
  // os dois entraram como `Proposto`. Antes disto o formulário mostrava os
  // campos e o `Gravar` NÃO os enviava — o aviso de cobertura dizia isso ao
  // operador. O teste trava que agora enviam.
  it('grava Registro Profissional e a conta de comissão', async () => {
    const { stub, chamadas } = servidorDeParceiros()
    const { user } = renderRoute('/cadastros/profissionais/novo', stub)

    await user.type(await screen.findByLabelText('Nome de apresentação'), 'MARINA BERTOLUCI')
    await user.click(screen.getByRole('button', { name: 'Documentos e dados pessoais' }))
    await user.type(screen.getByLabelText(/Registro profissional/), 'CAU A123456-7')
    await user.click(screen.getByRole('button', { name: 'Dados bancários' }))
    await user.type(screen.getByLabelText('Nº da agência'), '1234')
    await user.type(screen.getByLabelText('Nº da conta'), '56789-0')

    await user.click(screen.getByRole('button', { name: /Gravar/ }))

    await waitFor(() => {
      expect(chamadas.find((c) => c.metodo === 'POST')).toBeDefined()
    })
    expect(chamadas.find((c) => c.metodo === 'POST')?.corpo).toMatchObject({
      registration: 'CAU A123456-7',
      payoutBankInfo: { branchNumber: '1234', accountNumber: '56789-0' },
    })
  }, 15_000)

  // Conta em branco não é conta vazia: são estados diferentes, e o contrato os
  // distingue. Mandar quatro strings vazias gravaria um registro bancário que
  // existe e não serve para pagar ninguém.
  it('sem nenhum dado bancário, a conta viaja como null', async () => {
    const { stub, chamadas } = servidorDeParceiros()
    const { user } = renderRoute('/cadastros/profissionais/novo', stub)

    await user.type(await screen.findByLabelText('Nome de apresentação'), 'SEM CONTA')
    await user.click(screen.getByRole('button', { name: /Gravar/ }))

    await waitFor(() => {
      expect(chamadas.find((c) => c.metodo === 'POST')).toBeDefined()
    })
    expect(chamadas.find((c) => c.metodo === 'POST')?.corpo).toMatchObject({
      payoutBankInfo: null,
    })
  }, 15_000)

  // `Nº do banco` era `TextField` livre, sem busca nenhuma — o único dos 10
  // `[busca +...]` da transcrição sem janela por trás (§3, §9 padrão 3;
  // mapa em `frente-visual.md` §@mapa-softlux). Vira `SearchDialog` contra
  // `data.bancos` (código COMPE, dado público).
  it('busca de banco preenche número e nome, com código COMPE público', async () => {
    const { user } = renderRoute('/cadastros/profissionais/novo', stubDeParceiros())

    // O bloco nasce FECHADO — é opcional, e a diretriz 3 manda opcional
    // recolhido. Abrir faz parte do fluxo agora, e o teste anda por ele.
    await user.click(await screen.findByRole('button', { name: 'Dados bancários' }))
    await user.click(await screen.findByRole('button', { name: 'Buscar banco' }))

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('Busca de Banco')
    await user.click(await screen.findByText('BANCO BRADESCO S.A.'))
    await user.click(screen.getByRole('button', { name: 'Selecionar' }))

    await waitFor(() => {
      expect(screen.getByLabelText('Nº do banco')).toHaveValue('237')
    })
    expect(screen.getByLabelText('Nome do banco')).toHaveValue('BANCO BRADESCO S.A.')
  })

  it('abrir por id direto busca o registro no servidor', async () => {
    renderRoute('/cadastros/profissionais/7a1d6f30-1f2b-4c8a-9e55-2b3c4d5e6f70', stubDeParceiros())

    expect(await screen.findByLabelText('Nome completo')).toHaveValue('STELLA ILUMINAÇÃO LTDA')
    expect(screen.queryByText(/Abra o profissional pela listagem/i)).not.toBeInTheDocument()
  }, 15_000)
  /**
   * HIERARQUIA (#101, diretriz 3): a tela mais atrasada do repo tinha 3 blocos,
   * 1 nomeado, e despejava tudo de uma vez. Agora os módulos do schema mandam,
   * e a invariante é a que importa — o que trava o Gravar nunca fica escondido.
   */
  describe('hierarquia por módulo', () => {
    it('só o bloco obrigatório abre; os opcionais nascem recolhidos', async () => {
      renderRoute('/cadastros/profissionais/novo', stubDeParceiros())

      // Aberto: o campo obrigatório está alcançável sem clique nenhum.
      expect(await screen.findByLabelText('Nome completo')).toBeInTheDocument()
      // Recolhido: o campo continua NO FORM (fechar um bloco não pode apagar o
      // que já foi digitado), e por isso a asserção é por ROLE — `hidden` tira
      // da árvore de acessibilidade sem tirar do DOM.
      expect(screen.getByLabelText('RG')).toBeInTheDocument()
      expect(screen.queryByRole('textbox', { name: 'RG' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Documentos e dados pessoais' })).toHaveAttribute(
        'aria-expanded',
        'false',
      )
    })

    it('o progresso conta os obrigatórios e diz o que falta, pelo nome', async () => {
      const { user } = renderRoute('/cadastros/profissionais/novo', stubDeParceiros())

      const progresso = await screen.findByTestId('progresso')
      // `1 de 6` num formulário em branco não é bug: `Tipo de pessoa` nasce
      // com `Física` marcada, e um rádio com valor É um obrigatório atendido.
      expect(progresso).toHaveTextContent('1 de 6 obrigatórios')
      expect(progresso).toHaveTextContent('Falta: Nome de apresentação')

      await user.type(screen.getByLabelText('Nome de apresentação'), 'MARINA')

      expect(progresso).toHaveTextContent('2 de 6 obrigatórios')
      expect(progresso).not.toHaveTextContent('Nome de apresentação')
    })
  })
})
