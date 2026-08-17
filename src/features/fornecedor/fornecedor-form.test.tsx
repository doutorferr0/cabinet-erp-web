import { parceiro, servidorDeParceiros, stubDeParceiros } from '@/test/parceiros'
import { acaoDoCabecalho, renderRoute } from '@/test/utils'
import { screen, waitFor, within } from '@testing-library/react'
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
    await acaoDoCabecalho(user, 'Alterar')

    expect(await screen.findByLabelText('Razão Social')).toHaveValue('STELLA ILUMINAÇÃO LTDA')
    expect(screen.getByLabelText('Nome Fantasia')).toHaveValue('STELLA')
    expect(screen.getByLabelText('CNPJ/CPF')).toHaveValue('12345678000199')
    // O que o contrato não cobre segue em branco, e a tela avisa.
    expect(screen.getByText(/envia ao servidor apenas/)).toBeInTheDocument()
  })

  // Ordem da tela: nome primeiro, ressalva depois. O aviso de cobertura fala do
  // que a tela NÃO grava — lido antes do título, é ressalva sobre assunto que o
  // operador ainda não sabe qual é.
  it('o título vem antes do aviso de cobertura', async () => {
    const { user } = renderRoute('/cadastros/fornecedores', stubDeParceiros())

    await user.click(await screen.findByText('STELLA ILUMINAÇÃO LTDA'))
    await acaoDoCabecalho(user, 'Alterar')

    const titulo = await screen.findByRole('heading', { level: 1 })
    const aviso = screen.getByText(/envia ao servidor apenas/)
    // DOCUMENT_POSITION_FOLLOWING = o aviso vem DEPOIS do título no documento.
    expect(titulo.compareDocumentPosition(aviso) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('Gravar manda PUT e devolve intacto o que a tela não mostra', async () => {
    const { stub, chamadas } = servidorDeParceiros([
      parceiro({ code: 'F001', paymentTerms: '30/60/90', isCustomer: true, isSupplier: true }),
    ])
    const { router, user } = renderRoute('/cadastros/fornecedores', stub)

    await user.click(await screen.findByText('STELLA ILUMINAÇÃO LTDA'))
    await acaoDoCabecalho(user, 'Alterar')

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
    // `PUT` substitui o registro inteiro: `code`, `paymentTerms`, os papéis e —
    // desde 2026-08-13 — o registro profissional e a conta de comissão não têm
    // campo NESTA tela e voltam como vieram. Mandá-los nulos apagaria dado que
    // ninguém pediu para apagar; no caso da conta bancária, dado que faz o
    // pagamento da comissão do profissional.
    expect(put?.corpo).toEqual({
      legalName: 'STELLA ILUMINAÇÃO LTDA',
      tradeName: 'LUZ',
      document: '12345678000199',
      email: 'contato@stella.com.br',
      active: true,
      registration: null,
      payoutBankInfo: null,
      code: 'F001',
      paymentTerms: '30/60/90',
      isCustomer: true,
      isSupplier: true,
      isProfessional: false,
      // Hierarquia pai/filho (#91): o vínculo não é campo desta tela e volta
      // como veio, pela mesma regra do registro profissional acima.
      parentId: null,
    })
    // 15s: este caso monta DUAS telas (listagem e formulário completo) e ainda
    // digita — o limite padrão de 5s do vitest não cobre isso nesta máquina.
  }, 15_000)

  it('formulário inclui contato na grade e grava (volta para a listagem)', async () => {
    const { stub } = servidorDeParceiros()
    const { router, user } = renderRoute('/cadastros/fornecedores/novo', stub)

    const razao = await screen.findByLabelText('Razão Social')
    await user.type(razao, 'FORNECEDOR TESTE LTDA')

    // grade Contatos: o módulo `Representante e contatos` é opcional e nasce
    // recolhido — a grade só existe depois de abrir. É a hierarquia da
    // diretriz 3 funcionando, não um passo extra do teste.
    await user.click(screen.getByRole('button', { name: 'Representante e contatos' }))
    await user.click(await screen.findByRole('button', { name: /Incluir/ }))
    await user.type(screen.getByLabelText('Nome linha 1'), 'MARIA')
    await user.type(screen.getByLabelText('Vínculo linha 1'), 'COMPRAS')

    await user.click(screen.getByRole('button', { name: /Gravar/ }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/cadastros/fornecedores')
    })
  })

  // `Cidade` era digitação livre — `EnderecoBlock` já suportava a busca, mas
  // Fornecedor nunca passava `onBuscaCidade` (transcrição §4: "Cidade
  // `[busca +...]`"). Mapa em `frente-visual.md` §@mapa-softlux.
  it('busca de cidade preenche cidade e UF (era digitação livre)', async () => {
    const { user } = renderRoute('/cadastros/fornecedores/novo', servidorDeParceiros().stub)

    await screen.findByLabelText('Razão Social')
    await user.click(screen.getByRole('button', { name: 'Endereço' }))
    await user.click(await screen.findByRole('button', { name: 'Buscar cidade' }))

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('Busca de Cidade')
    await user.type(within(dialog).getByLabelText('Busca'), 'curitiba')
    const linha = await screen.findByText('CURITIBA')
    await user.click(linha)
    await user.click(screen.getByRole('button', { name: 'Selecionar' }))

    await waitFor(() => {
      expect(screen.getByLabelText('Cidade')).toHaveValue('CURITIBA')
    })
  })

  // O papel vem da TELA: incluir por Fornecedores cria fornecedor, e só. Marcar
  // os três "por precaução" faria o cadastro novo aparecer nas três listagens.
  /**
   * Diretriz 3, no Fornecedor: era a tela mais desigual do repo — 13 blocos
   * montados à mão, 6 nomeados, contra 11/4 do Cliente sobre a mesma base. Os
   * dois passam a sair do mesmo schema, e este teste é o que impede o drift de
   * voltar.
   */
  it('o obrigatório está aberto, o opcional nasce fechado e as abas mortas sumiram', async () => {
    renderRoute('/cadastros/fornecedores/novo')

    // Obrigatórios à vista, sem clique.
    expect(await screen.findByLabelText('Razão Social')).toBeVisible()
    expect(screen.getByLabelText('CNPJ/CPF')).toBeVisible()
    expect(screen.getByLabelText('Fone 1')).toBeVisible()
    expect(screen.getByLabelText('E-mail')).toBeVisible()

    // Opcional no DOM e invisível — segue registrado no RHF, então validação e
    // contagem enxergam o formulário inteiro.
    expect(screen.getByLabelText('Site')).not.toBeVisible()
    expect(screen.getByRole('button', { name: 'Representante e contatos' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )

    // As sete abas não capturadas da §4 saíram: módulo recolhível diz a mesma
    // coisa sem ocupar a tela com aba que não abre.
    expect(screen.queryByRole('tab', { name: /Dados Bancários/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /Comissão/ })).not.toBeInTheDocument()
  })

  /**
   * DECISÃO DO USER (2026-08-14): perfil de custo e índice de valor de venda
   * ficam opcionais, mesmo sendo deles que sai o preço de venda — e a tela
   * AVISA em vez de travar. Travar impediria registrar quem já está fornecendo
   * só porque o preço ainda não foi negociado.
   */
  it('o bloco comercial avisa o efeito de não ter perfil de custo, e não trava', async () => {
    const { user } = renderRoute('/cadastros/fornecedores/novo')

    await screen.findByLabelText('Razão Social')
    await user.click(screen.getByRole('button', { name: 'Comercial e preço' }))

    expect(await screen.findByText(/não tem\s+preço de venda calculado/)).toBeVisible()
    // O bloco é `Opcional` — o carimbo é do próprio FormBlock, e é o que diz
    // ao operador que ele pode gravar sem isto.
    expect(screen.getByRole('button', { name: 'Comercial e preço' })).toBeInTheDocument()
  })

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

  // O 409 de documento repetido não é beco: o cadastro existe no GRUPO e falta
  // esta empresa se ligar a ele. Criar outro duplicaria o mesmo CNPJ.
  it('documento repetido oferece vincular, e vincular volta para a listagem', async () => {
    const OUTRO = '11111111-1111-4111-8111-111111111111'
    const { stub, chamadas } = servidorDeParceiros([parceiro()], { documentoRepetido: OUTRO })
    const { router, user } = renderRoute('/cadastros/fornecedores/novo', stub)

    await user.type(await screen.findByLabelText('Razão Social'), 'REPETIDA LTDA')
    await user.click(screen.getByRole('button', { name: /Gravar/ }))

    const vincular = await screen.findByRole('button', {
      name: /Vincular esta empresa ao cadastro existente/,
    })
    // O `detail` do servidor explica o caso; o botão é o que resolve.
    expect(screen.getByRole('alert')).toHaveTextContent(/Vincular em vez de criar outro/)

    await user.click(vincular)

    await waitFor(
      () => {
        expect(router.state.location.pathname).toBe('/cadastros/fornecedores')
      },
      { timeout: 5000 },
    )
    expect(chamadas.some((c) => c.caminho === `/api/partners/${OUTRO}/link`)).toBe(true)
  }, 15_000)

  it('erro comum de gravação NÃO oferece vincular', async () => {
    const { stub } = servidorDeParceiros()
    const { user } = renderRoute('/cadastros/fornecedores/novo', stub)

    await screen.findByLabelText('Razão Social')
    await user.click(screen.getByRole('button', { name: /Gravar/ }))

    // Razão Social vazia: o formulário nem chega ao servidor.
    expect(await screen.findByText('Razão Social é obrigatória')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Vincular esta empresa/ })).not.toBeInTheDocument()
  })

  // `Excluir` na UI de cadastro é DESATIVAÇÃO (padrão 8). O diálogo existe
  // porque o rótulo herdado do legado e o efeito real não batem: quem clica
  // precisa ler o que vai acontecer antes de acontecer.
  it('Excluir confirma, desativa por PUT e a linha volta como Não', async () => {
    const { stub, chamadas } = servidorDeParceiros([parceiro({ code: 'F001', active: true })])
    const { user } = renderRoute('/cadastros/fornecedores', stub)

    await user.click(await screen.findByText('STELLA ILUMINAÇÃO LTDA'))
    await acaoDoCabecalho(user, 'Excluir')

    const dialogo = await screen.findByRole('alertdialog')
    expect(dialogo).toHaveTextContent('Desativar fornecedor?')
    expect(dialogo).toHaveTextContent('não é apagado')
    await user.click(within(dialogo).getByRole('button', { name: 'Desativar' }))

    await waitFor(() => {
      expect(chamadas.find((c) => c.metodo === 'PUT')).toBeDefined()
    })
    // Só a situação muda: `code`, `paymentTerms` e os papéis voltam como vieram.
    expect(chamadas.find((c) => c.metodo === 'PUT')?.corpo).toMatchObject({
      active: false,
      code: 'F001',
      legalName: 'STELLA ILUMINAÇÃO LTDA',
    })
  }, 15_000)

  it('Cancelar no diálogo não manda escrita nenhuma', async () => {
    const { stub, chamadas } = servidorDeParceiros()
    const { user } = renderRoute('/cadastros/fornecedores', stub)

    await user.click(await screen.findByText('STELLA ILUMINAÇÃO LTDA'))
    await acaoDoCabecalho(user, 'Excluir')
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }),
    )

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(chamadas.every((c) => c.metodo === 'GET')).toBe(true)
  }, 15_000)

  // Desativar o que já está desativado gastaria uma escrita para não mudar nada
  // — e o sucesso faria o operador concluir que a linha mudou de estado.
  it('linha já inativa não vira PUT: o diálogo só informa', async () => {
    const { stub, chamadas } = servidorDeParceiros([parceiro({ active: false })])
    const { user } = renderRoute('/cadastros/fornecedores', stub)

    await user.click(await screen.findByText('STELLA ILUMINAÇÃO LTDA'))
    await acaoDoCabecalho(user, 'Excluir')

    const dialogo = await screen.findByRole('alertdialog')
    expect(dialogo).toHaveTextContent('já está inativo')
    expect(within(dialogo).queryByRole('button', { name: 'Desativar' })).not.toBeInTheDocument()
    expect(chamadas.every((c) => c.metodo === 'GET')).toBe(true)
  }, 15_000)

  // O buraco mais antigo desta fronteira: link direto e recarga não têm a linha
  // da listagem em cache. Com GET /api/partners/{id} (#35 do backend), a tela
  // busca por id em vez de mandar voltar à listagem.
  it('abrir por id direto busca o registro no servidor', async () => {
    renderRoute('/cadastros/fornecedores/7a1d6f30-1f2b-4c8a-9e55-2b3c4d5e6f70', stubDeParceiros())

    expect(await screen.findByLabelText('Razão Social')).toHaveValue('STELLA ILUMINAÇÃO LTDA')
    expect(screen.queryByText(/Abra o fornecedor pela listagem/i)).not.toBeInTheDocument()
  }, 15_000)

  // Falhou não é o mesmo que não existir: 404 é registro que não está lá.
  it('id inexistente é "não encontrado", não erro', async () => {
    renderRoute('/cadastros/fornecedores/11111111-1111-4111-8111-111111111111', stubDeParceiros())

    expect(await screen.findByText('Fornecedor não encontrado.')).toBeInTheDocument()
  })
})
