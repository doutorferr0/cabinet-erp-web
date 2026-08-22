import { parceiro, servidorDeParceiros, stubDeParceiros } from '@/test/parceiros'
import { acaoNaLinha, renderRoute } from '@/test/utils'
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('tela Cliente', () => {
  it('listagem mostra os clientes do servidor, pedindo só o papel da tela', async () => {
    const urls: string[] = []
    const linhas = [parceiro({ code: 'C001', legalName: 'ANDRÉ BATALHA', isCustomer: true })]
    renderRoute('/cadastros/clientes', (entrada) => {
      urls.push(String(entrada instanceof Request ? entrada.url : entrada))
      return stubDeParceiros(linhas)(entrada)
    })

    expect(await screen.findByText('ANDRÉ BATALHA')).toBeInTheDocument()
    expect(screen.getByText('Cadastro de Clientes')).toBeInTheDocument()
    expect(urls.find((u) => u.includes('/api/partners'))).toContain('role=customer')
  })

  // O dado trafega em dígito puro; o operador digita com pontuação. Sem a
  // normalização na saída, a consulta responderia "nenhum registro" para um
  // cliente que existe — e ele conferiria o CNPJ dígito a dígito.
  it('filtrar por CNPJ digitado com máscara manda só os dígitos', async () => {
    const urls: string[] = []
    const linhas = [parceiro({ code: 'C001', legalName: 'ANDRÉ BATALHA', isCustomer: true })]
    const { user } = renderRoute('/cadastros/clientes', (entrada) => {
      urls.push(String(entrada instanceof Request ? entrada.url : entrada))
      return stubDeParceiros(linhas)(entrada)
    })

    await screen.findByText('ANDRÉ BATALHA')

    // A tela filtra POR MÓDULO (#104): o campo entra pelo painel do módulo a
    // que pertence, não pela barra plana. Quem normaliza continua sendo a
    // whitelist da tela — é isso que este teste protege.
    await user.click(screen.getByRole('button', { name: /Identificação/ }))
    await user.type(await screen.findByLabelText('CPF / CNPJ'), '12.345.678/0001-90')

    await waitFor(() => {
      const consulta = urls.filter((u) => u.includes('filters=')).at(-1)
      expect(consulta).toBeDefined()
      const filtros = JSON.parse(new URL(consulta as string).searchParams.get('filters') as string)
      expect(filtros).toEqual([{ field: 'document', operator: 'iLike', value: '12345678000190' }])
    })

    // O campo continua mostrando o que foi digitado: normalizar na tela apagaria
    // a máscara embaixo do cursor.
    expect(await screen.findByLabelText('CPF / CNPJ')).toHaveValue('12.345.678/0001-90')
  })

  it('formulário grava e volta para a listagem, com o papel desta tela', async () => {
    const { stub, chamadas } = servidorDeParceiros()
    const { router, user } = renderRoute('/cadastros/clientes/novo', stub)

    await user.type(await screen.findByLabelText('Nome'), 'CLIENTE TESTE')
    await user.click(screen.getByRole('button', { name: /Gravar/ }))

    await waitFor(
      () => {
        expect(router.state.location.pathname).toBe('/cadastros/clientes')
      },
      { timeout: 5000 },
    )

    expect(chamadas.find((c) => c.metodo === 'POST')?.corpo).toMatchObject({
      legalName: 'CLIENTE TESTE',
      isCustomer: true,
      isSupplier: false,
      isProfessional: false,
    })
    // 20s: o formulário do Cliente ganhou dois blocos de endereço em #293, e
    // montá-lo inteiro (os três `EnderecoBlock` ficam no DOM, fechados, para o
    // RHF enxergar o formulário todo) passou a custar mais que os 15s daqui
    // quando a suíte roda em paralelo. Medido: 5,9s isolado, verde com
    // `--maxWorkers=2`, estourando só sob contenção.
  }, 20_000)

  /**
   * Diretriz 3: o que trava o `Gravar` fica FORA de accordion.
   *
   * Este é o teste que impede o drift de voltar. Antes desta migração o Cliente
   * tinha 11 blocos montados à mão e o Fornecedor 13 — mesma base de código,
   * agrupamentos diferentes. Agora quais existem, em que ordem e qual é
   * obrigatório sai de `ENTIDADES.cliente`.
   */
  it('o bloco obrigatório está aberto e os opcionais nascem fechados', async () => {
    renderRoute('/cadastros/clientes/novo')

    // Os obrigatórios estão à vista sem nenhum clique.
    expect(await screen.findByLabelText('Nome')).toBeInTheDocument()
    expect(screen.getByLabelText('CPF')).toBeInTheDocument()
    expect(screen.getByLabelText('Celular')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()

    // O opcional não: `RG` mora em `Documentos e dados pessoais`, recolhido.
    // Ele está no DOM e NÃO visível — e isso é desenho, não detalhe: o campo
    // continua registrado no react-hook-form, então a validação do `Gravar` e a
    // contagem do topo enxergam o formulário inteiro, aberto ou fechado.
    expect(screen.getByLabelText('RG')).not.toBeVisible()

    const gatilho = screen.getByRole('button', { name: 'Documentos e dados pessoais' })
    expect(gatilho).toHaveAttribute('aria-expanded', 'false')
  })

  it('o bloco opcional abre por clique e mostra o que guardava', async () => {
    const { user } = renderRoute('/cadastros/clientes/novo')

    await screen.findByLabelText('Nome')
    await user.click(screen.getByRole('button', { name: 'Documentos e dados pessoais' }))

    expect(screen.getByLabelText('RG')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Documentos e dados pessoais' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  it('o topo conta quantos obrigatórios faltam, e nomeia o que falta', async () => {
    const { user } = renderRoute('/cadastros/clientes/novo')

    const nome = await screen.findByLabelText('Nome')
    // Registro em branco: nenhum dos obrigatórios com lastro está preenchido.
    expect(screen.getByText(/de \d+ obrigatórios/)).toBeInTheDocument()
    expect(screen.getByText(/Falta:/)).toHaveTextContent('Nome')

    await user.type(nome, 'ANDRÉ BATALHA')

    // Preenchido, ele sai da lista do que falta — a barra responde à digitação.
    await waitFor(() => {
      expect(screen.getByText(/Falta:/)).not.toHaveTextContent('Nome')
    })
  }, 15_000)

  /**
   * A IE DA EMPRESA ESTÁ NA TELA, e é campo PRÓPRIO (#254).
   *
   * Duas inscrições, dois campos: `Cli_IE_rg` (empresa) e `Cli_IEProdRural`
   * (produtor rural). Produtor rural pessoa física tem a segunda sem ter a
   * primeira — juntá-las num campo só apagaria uma na primeira gravação.
   */
  it('o bloco Fiscal tem as DUAS inscrições, e o Gravar leva a que foi digitada', async () => {
    const { stub, chamadas } = servidorDeParceiros([
      parceiro({ code: 'C001', legalName: 'ANDRÉ BATALHA', isCustomer: true }),
    ])
    const { router, user } = renderRoute('/cadastros/clientes', stub)

    await acaoNaLinha(user, 'ANDRÉ BATALHA', 'Alterar')
    await screen.findByLabelText('Nome')
    await user.click(screen.getByRole('button', { name: 'Fiscal' }))

    const ie = screen.getByLabelText('Inscrição Estadual')
    expect(ie).toBeVisible()
    expect(screen.getByLabelText('Inscrição Estadual Produtor Rural')).toBeVisible()

    await user.type(ie, '110055443322')
    await user.click(screen.getByRole('button', { name: /Gravar/ }))

    await waitFor(
      () => {
        expect(router.state.location.pathname).toBe('/cadastros/clientes')
      },
      { timeout: 5000 },
    )

    // O que o operador digitou chegou ao corpo do `PUT`. Sem o campo na tela, a
    // IE do cliente só existia se outra tela a tivesse gravado.
    expect(chamadas.find((c) => c.metodo === 'PUT')?.corpo).toMatchObject({
      stateRegistration: '110055443322',
      ruralProducerRegistration: null,
    })
  }, 20_000)

  /**
   * COBRANÇA E COMERCIAL — o contrato publicava, a tela não desenhava (#293).
   *
   * Os seis campos entraram no contrato pelo bloco 2 (#255) e nenhuma tela os
   * mostrava: o legado tinha a aba `Cobrança\Comercial`, o servidor tinha a
   * coluna, e o operador não tinha onde ver. Este teste mede o corpo do `PUT`,
   * não o que aparece na tela — campo desenhado é campo que VIAJA.
   */
  it('os endereços de cobrança e comercial chegam ao PUT, cada um no seu campo', async () => {
    const { stub, chamadas } = servidorDeParceiros([
      parceiro({ code: 'C001', legalName: 'ANDRÉ BATALHA', isCustomer: true }),
    ])
    const { router, user } = renderRoute('/cadastros/clientes', stub)

    await acaoNaLinha(user, 'ANDRÉ BATALHA', 'Alterar')
    await screen.findByLabelText('Nome')

    await user.click(screen.getByRole('button', { name: 'Endereço de cobrança' }))
    const cobranca = within(screen.getByRole('group', { name: 'Endereço de cobrança' }))
    await user.type(cobranca.getByLabelText('Endereço'), 'RUA DO BOLETO')

    await user.click(screen.getByRole('button', { name: 'Endereço comercial e empresa' }))
    const comercial = within(screen.getByRole('group', { name: 'Endereço comercial e empresa' }))
    await user.type(comercial.getByLabelText('Endereço'), 'AV DO TRABALHO')
    await user.type(comercial.getByLabelText('Empresa'), 'CONSTRUTORA X')
    await user.type(comercial.getByLabelText('Cargo'), 'ARQUITETA')

    await user.click(screen.getByRole('button', { name: /Gravar/ }))

    await waitFor(
      () => {
        expect(router.state.location.pathname).toBe('/cadastros/clientes')
      },
      { timeout: 5000 },
    )

    const corpo = chamadas.find((c) => c.metodo === 'PUT')?.corpo as Record<string, unknown>
    // Cada rua no SEU endereço: o que separa os três é o prefixo do formulário,
    // e trocá-los mandaria o boleto para a casa do cliente sem ninguém ver.
    expect(corpo.billingAddress).toMatchObject({ street: 'RUA DO BOLETO' })
    expect(corpo.businessAddress).toMatchObject({ street: 'AV DO TRABALHO' })
    expect(corpo.businessName).toBe('CONSTRUTORA X')
    expect(corpo.businessRole).toBe('ARQUITETA')
    // O endereço do CADASTRO não foi tocado, e continua nulo — endereço com os
    // sete campos em branco não é endereço.
    expect(corpo.address).toBeNull()
  }, 30_000)

  it('o que o servidor mandou nos dois endereços volta para a tela', async () => {
    const { stub } = servidorDeParceiros([
      parceiro({
        legalName: 'ANDRÉ BATALHA',
        isCustomer: true,
        billingAddress: {
          zipCode: null,
          street: 'RUA DO BOLETO',
          number: null,
          complement: null,
          district: null,
          city: 'CAMPINAS',
          state: 'SP',
        },
        businessName: 'CONSTRUTORA X',
      }),
    ])
    const { user } = renderRoute('/cadastros/clientes', stub)

    await acaoNaLinha(user, 'ANDRÉ BATALHA', 'Alterar')
    await screen.findByLabelText('Nome')
    await user.click(screen.getByRole('button', { name: 'Endereço de cobrança' }))

    const cobranca = within(screen.getByRole('group', { name: 'Endereço de cobrança' }))
    expect(cobranca.getByLabelText('Endereço')).toHaveValue('RUA DO BOLETO')
    expect(cobranca.getByLabelText('Cidade')).toHaveValue('CAMPINAS')
  }, 30_000)

  it('busca de cidade (janela auxiliar) preenche cidade e UF', async () => {
    const { user } = renderRoute('/cadastros/clientes/novo')

    await screen.findByLabelText('Nome')
    // `Endereço` é módulo opcional: nasce fechado, e o operador o abre. O botão
    // de busca só existe depois disso — é a hierarquia funcionando.
    //
    // Nome EXATO, não `/Endereço/`: desde #293 o Cliente tem três blocos de
    // endereço (cadastro, cobrança e comercial), e o regex casaria os três.
    await user.click(screen.getByRole('button', { name: 'Endereço' }))

    // Daqui em diante a consulta é DENTRO do bloco: os três `EnderecoBlock` do
    // Cliente têm os mesmos rótulos, e o que os distingue é o `<fieldset>` de
    // cada módulo — que é também o que um leitor de tela anuncia antes do
    // campo ("Endereço de cobrança, grupo … Cidade").
    const bloco = within(screen.getByRole('group', { name: 'Endereço' }))
    await user.click(await bloco.findByRole('button', { name: 'Buscar cidade' }))

    // janela de busca com a MESMA DataTable
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('Busca de Cidade')

    // CURITIBA está além da primeira página: usa a busca da janela
    await user.type(within(dialog).getByLabelText('Busca'), 'curitiba')

    // seleciona linha CURITIBA e confirma
    const linha = await screen.findByText('CURITIBA')
    await user.click(linha)
    await user.click(screen.getByRole('button', { name: 'Selecionar' }))

    await waitFor(() => {
      expect(bloco.getByLabelText('Cidade')).toHaveValue('CURITIBA')
    })
    // código da cidade aparece ao lado do campo; UF (PR) no rótulo derivado
    expect(bloco.getByText('355')).toBeInTheDocument()
  })

  // O buraco mais antigo desta fronteira: link direto e recarga não têm a linha
  // da listagem em cache. Com GET /api/partners/{id} (#35 do backend), a tela
  // busca por id em vez de mandar voltar à listagem. Fornecedor e Profissional
  // já cobriam isto — Cliente não tinha teste de detalhe por id nenhum.
  it('abrir por id direto busca o registro no servidor', async () => {
    renderRoute(
      '/cadastros/clientes/7a1d6f30-1f2b-4c8a-9e55-2b3c4d5e6f70',
      stubDeParceiros([
        parceiro({ isCustomer: true, legalName: 'ANDRÉ BATALHA', document: '11122233344' }),
      ]),
    )

    expect(await screen.findByLabelText('Nome')).toHaveValue('ANDRÉ BATALHA')
    expect(screen.getByLabelText('CPF')).toHaveValue('11122233344')
  }, 15_000)

  // Falhou não é o mesmo que não existir: 404 é registro que não está lá.
  it('id inexistente é "não encontrado", não erro', async () => {
    renderRoute('/cadastros/clientes/11111111-1111-4111-8111-111111111111', stubDeParceiros())

    expect(await screen.findByText('Cliente não encontrado.')).toBeInTheDocument()
  })
})
