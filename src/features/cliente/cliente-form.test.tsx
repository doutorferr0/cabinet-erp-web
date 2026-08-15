import { parceiro, servidorDeParceiros, stubDeParceiros } from '@/test/parceiros'
import { renderRoute } from '@/test/utils'
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

    await user.click(screen.getByRole('button', { name: /^Filtro/ }))
    await user.click(await screen.findByRole('button', { name: 'Adicionar filtro' }))
    await user.click(screen.getByRole('button', { name: 'Campo do filtro 1' }))
    await user.click(await screen.findByRole('menuitemradio', { name: /CNPJ/ }))
    await user.type(await screen.findByLabelText('Valor do filtro 1'), '12.345.678/0001-90')

    await waitFor(() => {
      const consulta = urls.filter((u) => u.includes('filters=')).at(-1)
      expect(consulta).toBeDefined()
      const filtros = JSON.parse(new URL(consulta as string).searchParams.get('filters') as string)
      expect(filtros).toEqual([{ field: 'document', operator: 'iLike', value: '12345678000190' }])
    })

    // O campo continua mostrando o que foi digitado: normalizar na tela apagaria
    // a máscara embaixo do cursor.
    expect(await screen.findByLabelText('Valor do filtro 1')).toHaveValue('12.345.678/0001-90')
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

  it('busca de cidade (janela auxiliar) preenche cidade e UF', async () => {
    const { user } = renderRoute('/cadastros/clientes/novo')

    await screen.findByLabelText('Nome')
    // `Endereço` é módulo opcional: nasce fechado, e o operador o abre. O botão
    // de busca só existe depois disso — é a hierarquia funcionando.
    await user.click(screen.getByRole('button', { name: /Endereço/ }))
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

    await waitFor(() => {
      expect(screen.getByLabelText('Cidade')).toHaveValue('CURITIBA')
    })
    // código da cidade aparece ao lado do campo; UF (PR) no rótulo derivado
    expect(screen.getByText('355')).toBeInTheDocument()
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
