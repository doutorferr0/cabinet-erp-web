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
  }, 15_000)

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

  // Bloco 3 (#270). Antes disto o operador abria `Documentos e dados pessoais`,
  // preenchia os cinco campos, gravava — e voltava tudo em branco: o corpo do
  // `PUT` é montado a partir do contrato, e o contrato não publicava nenhum
  // deles. É o mesmo defeito que a #244 consertou para o telefone.
  it('o bloco Documentos leva RG, órgão, UF, nascimento e sexo ao servidor', async () => {
    const { stub, chamadas } = servidorDeParceiros([
      parceiro({ code: 'C001', legalName: 'ANDRÉ BATALHA', isCustomer: true }),
    ])
    const { router, user } = renderRoute('/cadastros/clientes', stub)

    await acaoNaLinha(user, 'ANDRÉ BATALHA', 'Alterar')
    await screen.findByLabelText('Nome')
    await user.click(screen.getByRole('button', { name: /Documentos e dados pessoais/ }))

    await user.type(await screen.findByLabelText('RG'), '123456789')
    await user.type(screen.getByLabelText('Órgão Expedição'), 'SSP')
    await user.selectOptions(screen.getByLabelText('UF'), 'SP')
    await user.type(screen.getByLabelText('Dt. de Nasc.'), '1985-04-12')
    await user.selectOptions(screen.getByLabelText('Sexo'), 'FEMININO')

    await user.click(screen.getByRole('button', { name: /Gravar/ }))

    await waitFor(
      () => {
        expect(router.state.location.pathname).toBe('/cadastros/clientes')
      },
      { timeout: 5000 },
    )

    // Os nomes são os do contrato, e `personType` não está aqui: o radio fica
    // no bloco obrigatório e tem teste próprio, porque é o único que traduz
    // vocabulário em vez de só trocar de nome.
    expect(chamadas.find((c) => c.metodo === 'PUT')?.corpo).toMatchObject({
      identityDocument: '123456789',
      identityIssuer: 'SSP',
      identityIssuerState: 'SP',
      birthDate: '1985-04-12',
      gender: 'FEMININO',
    })
  }, 20_000)

  // O `enum` do contrato é `individual`/`company`; o radio mostra os rótulos do
  // legado. Mandar `JURIDICA` dá 400 na validação — medido contra o servidor
  // real em 2026-08-21.
  it('o Tipo de pessoa viaja no vocabulário do contrato, não no do radio', async () => {
    const { stub, chamadas } = servidorDeParceiros([
      parceiro({ code: 'C001', legalName: 'ANDRÉ BATALHA', isCustomer: true }),
    ])
    const { router, user } = renderRoute('/cadastros/clientes', stub)

    await acaoNaLinha(user, 'ANDRÉ BATALHA', 'Alterar')
    await screen.findByLabelText('Nome')

    await user.click(screen.getByRole('radio', { name: 'JURÍDICA' }))
    await user.click(screen.getByRole('button', { name: /Gravar/ }))

    await waitFor(
      () => {
        expect(router.state.location.pathname).toBe('/cadastros/clientes')
      },
      { timeout: 5000 },
    )

    expect(chamadas.find((c) => c.metodo === 'PUT')?.corpo).toMatchObject({
      personType: 'company',
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

  /**
   * OS TELEFONES SAEM DA ESPEC, E QUEM PROVA É O CORPO DO `PUT`.
   *
   * Esta tela desenhava `Fone Comer.`, `FAX` e `Fone Resid.` à mão enquanto
   * `moduloContatos` já declarava os três com `campo`, `dto` e rótulo. Duas
   * fontes para a mesma resposta, e já divergindo no rótulo — a espec diz
   * `Fax`, a tela dizia `FAX`.
   *
   * O teste pede os campos pelos rótulos DA ESPEC: quem voltar a desenhá-los à
   * mão com os rótulos antigos reprova aqui. E mede o corpo do `PUT` porque
   * rótulo certo com caminho Zod errado daria um campo bonito que não viaja —
   * o defeito exato que a #244 pagou.
   */
  it('os telefones vêm do módulo compartilhado e chegam ao PUT', async () => {
    const { stub, chamadas } = servidorDeParceiros([
      parceiro({ code: 'C001', legalName: 'ANDRÉ BATALHA', isCustomer: true }),
    ])
    const { router, user } = renderRoute('/cadastros/clientes', stub)

    await acaoNaLinha(user, 'ANDRÉ BATALHA', 'Alterar')
    await screen.findByLabelText('Nome')

    await user.click(screen.getByRole('button', { name: 'Outros contatos' }))
    const contatos = within(screen.getByRole('group', { name: 'Outros contatos' }))
    await user.type(contatos.getByLabelText('Telefone comercial'), '11 3322-1200')
    await user.type(contatos.getByLabelText('Telefone residencial'), '11 3322-1210')
    await user.type(contatos.getByLabelText('Fax'), '11 3322-1201')

    // `name` EXATO, e não `/Gravar/`: com o bloco `Outros contatos` aberto há
    // dois botões que casam — o do rodapé e o `Gravar contatos` da grade, que
    // tem gravação própria de propósito. A regex pegava os dois e o caso
    // morria antes de medir o corpo.
    await user.click(screen.getByRole('button', { name: 'Gravar' }))

    await waitFor(
      () => {
        expect(router.state.location.pathname).toBe('/cadastros/clientes')
      },
      { timeout: 5000 },
    )

    const corpo = chamadas.find((c) => c.metodo === 'PUT')?.corpo as Record<string, unknown>
    expect(corpo.businessPhone).toBe('11 3322-1200')
    expect(corpo.homePhone).toBe('11 3322-1210')
    expect(corpo.fax).toBe('11 3322-1201')
  }, 30_000)

  /**
   * A LACUNA DO COMUNICADOR NÃO PODE SUMIR JUNTO COM O CAMPO À MÃO.
   *
   * `moduloContatos({ comunicadores: false })` deixa os quatro comunicadores
   * sem `campo` de propósito — o mockup os pede e o contrato não os publica
   * (zero ocorrência de `communicator` nos schemas). Renderizando pela espec,
   * `CampoDoModulo` os pula; sem `<Pendencias>` no bloco, a falta ficaria
   * invisível na tela e contável só em relatório, que é como dívida declarada
   * vira dívida esquecida.
   */
  it('o bloco de contatos diz o que ainda não guarda, sem desenhar o campo', async () => {
    const { stub } = servidorDeParceiros([
      parceiro({ code: 'C001', legalName: 'ANDRÉ BATALHA', isCustomer: true }),
    ])
    const { user } = renderRoute('/cadastros/clientes', stub)

    await acaoNaLinha(user, 'ANDRÉ BATALHA', 'Alterar')
    await screen.findByLabelText('Nome')

    await user.click(screen.getByRole('button', { name: 'Outros contatos' }))
    const contatos = within(screen.getByRole('group', { name: 'Outros contatos' }))

    expect(contatos.getByText(/Ainda não guardamos/)).toHaveTextContent('Comunicador')
    // Dito, e não desenhado: campo que aceita digitação e é descartado no
    // `Gravar` é pior que campo ausente, porque parece que funcionou.
    expect(contatos.queryByLabelText('Comunicador')).not.toBeInTheDocument()
    // E o rodapé não pode acusar a GRADE de contatos, que existe e está logo
    // acima — é sub-recurso, não lacuna.
    expect(contatos.getByText(/Ainda não guardamos/)).not.toHaveTextContent('Contatos')
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
    // O nome vai ANCORADO: desde o bloco 2 (#293) a tela tem também `Endereço
    // de cobrança` e `Endereço comercial e empresa`, e `/Endereço/` casaria os
    // três — abrindo o módulo errado e procurando a busca onde ela não está.
    await user.click(screen.getByRole('button', { name: /^Endereço$/ }))
    await user.click(await screen.findByRole('button', { name: 'Buscar cidade' }))

    // janela de busca com a MESMA DataTable
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('Busca de Cidade')

    // CURITIBA está além da primeira página: usa a busca da janela
    await user.type(within(dialog).getByLabelText('Busca'), 'curitiba')

    // seleciona linha CURITIBA e confirma
    const linha = await screen.findByText('CURITIBA')
    await user.click(linha)
    await user.click(screen.getByRole('button', { name: 'Selecionar' }))

    // A asserção vai ESCOPADA ao módulo `Endereço`, pelo mesmo motivo do
    // seletor do botão: os três endereços têm um campo `Cidade`, e o global
    // acharia três. Escopar também PROVA o que importa aqui — a busca gravou
    // no endereço que o operador abriu, não em um dos outros dois.
    const endereco = within(screen.getByRole('group', { name: /^Endereço$/ }))
    await waitFor(() => {
      expect(endereco.getByLabelText('Cidade')).toHaveValue('CURITIBA')
    })
    // código da cidade aparece ao lado do campo; UF (PR) no rótulo derivado
    expect(screen.getByText('355')).toBeInTheDocument()
  })

  /**
   * OS CONTATOS DO CLIENTE — #293.
   *
   * O `FrmCliente` do Softlux tem `TabSheet4`, `Caption = Con&tato`, com uma
   * grade EDITÁVEL de seis colunas sobre `select * from contatos where
   * Con_codigo = :codigo and Con_tpcadastro = 'CLI'` — e a tabela `Contatos` do
   * dump tem 52 linhas, então não é aba morta. O contrato publica o
   * sub-recurso e o servidor o serve desde a #255; Fornecedor e Profissional
   * passaram a consumi-lo na #299/#302 e o Cliente ficou de fora. Estes dois
   * casos são o que impede o buraco de voltar.
   */
  it('em Incluir não há contato a pendurar, e a tela diz por quê', async () => {
    const { stub } = servidorDeParceiros()
    const { user } = renderRoute('/cadastros/clientes/novo', stub)

    await screen.findByLabelText('Nome')
    // `Outros contatos` é opcional e nasce recolhido — hierarquia da diretriz 3
    // funcionando, não passo extra do teste.
    await user.click(screen.getByRole('button', { name: 'Outros contatos' }))

    expect(await screen.findByText(/depois de gravar o cadastro/)).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Gravar contatos' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Nome linha 1')).not.toBeInTheDocument()
  }, 15_000)

  it('a grade dos contatos lê e grava pelo caminho do sub-recurso', async () => {
    const { stub, chamadas } = servidorDeParceiros(
      [parceiro({ isCustomer: true, legalName: 'ANDRÉ BATALHA' })],
      {
        contatos: [
          {
            id: 'ct-1',
            name: 'SÍLVIA DO SERVIDOR',
            role: 'Compras',
            phone: null,
            mobilePhone: null,
            fax: null,
            email: null,
            active: true,
          },
        ],
      },
    )
    const { user } = renderRoute('/cadastros/clientes/7a1d6f30-1f2b-4c8a-9e55-2b3c4d5e6f70', stub)

    await screen.findByLabelText('Nome')
    await user.click(screen.getByRole('button', { name: 'Outros contatos' }))

    // Veio do caminho do sub-recurso, não de campo nenhum do `PartnerDto` — o
    // `PartnerDto` não tem `contacts[]`.
    await waitFor(() => {
      expect(screen.getByLabelText('Nome linha 1')).toHaveValue('SÍLVIA DO SERVIDOR')
    })

    await user.click(screen.getByRole('button', { name: 'Incluir' }))
    await user.type(screen.getByLabelText('Nome linha 2'), 'RENATA')
    await user.type(screen.getByLabelText('Vínculo linha 2'), 'OBRA')
    await user.click(screen.getByRole('button', { name: 'Gravar contatos' }))

    await waitFor(() => {
      expect(chamadas.some((c) => c.metodo === 'POST' && c.caminho.endsWith('/contacts'))).toBe(
        true,
      )
    })
    const inclusao = chamadas.find((c) => c.metodo === 'POST' && c.caminho.endsWith('/contacts'))
    expect(inclusao?.corpo).toMatchObject({ name: 'RENATA', role: 'OBRA', active: true })

    // A linha que já existia NÃO recebe escrita: ninguém encostou nela. Até a
    // #331 esta asserção era `toBe(true)` e congelava o defeito — o `Gravar`
    // dos contatos carimbava data de alteração em cadastro alheio que não
    // mudou. Quem prova o `PUT` da linha MEXIDA é o caso seguinte.
    expect(chamadas.some((c) => c.metodo === 'PUT' && c.caminho.endsWith('/contacts/ct-1'))).toBe(
      false,
    )
    expect(chamadas.some((c) => c.metodo !== 'GET' && !c.caminho.includes('/contacts'))).toBe(false)
  }, 30_000)

  it('editar a linha existente manda PUT — e só nela', async () => {
    // A outra metade da regra. A asserção `false` do caso acima, sozinha,
    // passaria numa fronteira que NUNCA grava alteração; é este caso que
    // prende o outro lado — e a segunda linha, intocada, mostra que a régua é
    // por linha, não "a grade mudou".
    const { stub, chamadas } = servidorDeParceiros(
      [parceiro({ isCustomer: true, legalName: 'ANDRÉ BATALHA' })],
      {
        contatos: [
          {
            id: 'ct-1',
            name: 'SÍLVIA DO SERVIDOR',
            role: 'Compras',
            phone: null,
            mobilePhone: null,
            fax: null,
            email: null,
            active: true,
          },
          {
            id: 'ct-2',
            name: 'JOSÉ PARADO',
            role: 'Obra',
            phone: null,
            mobilePhone: null,
            fax: null,
            email: null,
            active: true,
          },
        ],
      },
    )
    const { user } = renderRoute('/cadastros/clientes/7a1d6f30-1f2b-4c8a-9e55-2b3c4d5e6f70', stub)

    await screen.findByLabelText('Nome')
    await user.click(screen.getByRole('button', { name: 'Outros contatos' }))
    await waitFor(() => {
      expect(screen.getByLabelText('Nome linha 1')).toHaveValue('SÍLVIA DO SERVIDOR')
    })

    await user.type(screen.getByLabelText('Vínculo linha 1'), ' E OBRA')
    await user.click(screen.getByRole('button', { name: 'Gravar contatos' }))

    await waitFor(() => {
      expect(chamadas.some((c) => c.metodo === 'PUT' && c.caminho.endsWith('/contacts/ct-1'))).toBe(
        true,
      )
    })
    const alteracao = chamadas.find(
      (c) => c.metodo === 'PUT' && c.caminho.endsWith('/contacts/ct-1'),
    )
    expect(alteracao?.corpo).toMatchObject({ role: 'Compras E OBRA', active: true })

    // A vizinha não foi junto.
    expect(chamadas.some((c) => c.caminho.endsWith('/contacts/ct-2'))).toBe(false)
  }, 30_000)

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
