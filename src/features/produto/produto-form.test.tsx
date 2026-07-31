import { URL_PRODUTOS } from '@/data/produtos-api'
import { json, problema } from '@/test/servidor'
import { type FetchStub, renderRoute, respostaSessao, respostaVinculos } from '@/test/utils'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * Tela de produtos contra o BACKEND (servidor falso no `fetch`).
 *
 * Desde `GET /api/products` e `GET /api/products/{id}`, esta tela não lê mais o
 * mock. O teste passa a exercitar o cliente gerado de verdade — mudança de URL,
 * de nome de campo ou da forma da resposta quebra aqui, que é o ponto.
 *
 * O que o contrato v1 NÃO cobre (as 4 abas de detalhe da §6) é asserido como
 * BRANCO: é a diferença entre "o cadastro está vazio" e "o servidor não guarda".
 */

const ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301'

const LINHA = { id: ID, code: '1201', description: 'PENDENTE REDONDO ALUMÍNIO PRETO', active: true }

const DETALHE = {
  ...LINHA,
  variants: [
    {
      id: '9c858901-8a57-4791-81fe-4c455b099bc9',
      finish: 'PRETO',
      size: 'ÚNICO',
      active: true,
      priceCents: 8990,
      stockQty: 12,
      minStock: 2,
    },
  ],
}

/** Sessão válida + produtos; qualquer outro caminho rejeita alto (como o padrão). */
function servidorDeProdutos(rotas: Record<string, () => Response> = {}): FetchStub {
  return (entrada) => {
    const url = String(entrada instanceof Request ? entrada.url : entrada)
    const caminho = new URL(url, 'http://localhost').pathname

    if (caminho === '/auth/me') return Promise.resolve(respostaSessao())
    if (caminho === '/auth/tenants') return Promise.resolve(respostaVinculos())

    const rota = rotas[caminho]
    if (rota) return Promise.resolve(rota())
    if (caminho === URL_PRODUTOS) return Promise.resolve(json({ rows: [LINHA], total: 1 }))
    if (caminho === `${URL_PRODUTOS}/${ID}`) return Promise.resolve(json(DETALHE))

    return Promise.reject(new Error(`fetch sem stub no teste: ${url}`))
  }
}

describe('listagem de produtos', () => {
  it('mostra as colunas que o contrato preenche', async () => {
    renderRoute('/cadastros/produtos', servidorDeProdutos())

    expect(await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')).toBeInTheDocument()
    expect(screen.getByText('Nosso Código')).toBeInTheDocument()
    expect(screen.getByText('1201')).toBeInTheDocument()
    expect(screen.getByText('Sim')).toBeInTheDocument()
  })

  // A whitelist do servidor é `code`/`description`/`active`: mandar o nome em
  // português voltaria 400 e a listagem quebraria só ao clicar no cabeçalho.
  it('ordenar pelo cabeçalho manda o campo do contrato em sortBy', async () => {
    const urls: string[] = []
    const { user } = renderRoute('/cadastros/produtos', (entrada) => {
      const url = String(entrada instanceof Request ? entrada.url : entrada)
      urls.push(url)
      return servidorDeProdutos()(entrada)
    })

    await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')
    await user.click(screen.getByRole('button', { name: 'Nosso Código' }))

    await waitFor(() => {
      const consulta = urls.filter((u) => u.includes('sortBy')).at(-1)
      expect(consulta).toContain('sortBy=code')
    })
  })

  it('abre o formulário pela ação Incluir', async () => {
    const { router, user } = renderRoute('/cadastros/produtos', servidorDeProdutos())

    await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')
    await user.click(screen.getByRole('button', { name: 'Incluir' }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/cadastros/produtos/novo')
    })
    expect(await screen.findByRole('tab', { name: 'Dados Principais' })).toBeInTheDocument()
  })
})

describe('formulário de produto', () => {
  it('carrega do servidor o que o contrato v1 cobre', async () => {
    renderRoute(`/cadastros/produtos/${ID}`, servidorDeProdutos())

    expect(await screen.findByLabelText('Nosso Código')).toHaveValue('1201')
    expect(screen.getByLabelText('Nossa Descrição')).toHaveValue('PENDENTE REDONDO ALUMÍNIO PRETO')
    expect(screen.getByLabelText('Ativo')).toBeChecked()
  })

  it('avisa que os campos fora do contrato vêm em branco', async () => {
    const { user } = renderRoute(`/cadastros/produtos/${ID}`, servidorDeProdutos())

    await screen.findByLabelText('Nosso Código')
    expect(screen.getByText(/Gravar não os envia/)).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Outros Dados' }))
    expect(await screen.findByLabelText('Temperatura Cor')).toHaveValue('')

    await user.click(screen.getByRole('tab', { name: 'Tributação' }))
    expect(await screen.findByLabelText('NCM')).toHaveValue('')
  })

  it('grade de variantes mostra o preço em centavos e o Ativo da linha', async () => {
    const { user } = renderRoute(`/cadastros/produtos/${ID}`, servidorDeProdutos())

    await screen.findByLabelText('Nosso Código')
    await user.click(screen.getByRole('tab', { name: /Valores/ }))

    // 8990 centavos do `priceCents` = R$ 89,90 na borda de exibição.
    const valor = await screen.findByLabelText('Valor de Tabela linha 1')
    expect(valor).toHaveValue('89,90')
    expect(screen.getByLabelText('Ativo linha 1')).toBeChecked()
    expect(screen.getByLabelText('Acabamento linha 1')).toHaveTextContent('PRETO')

    await user.clear(valor)
    await user.type(valor, '12345')
    expect(valor).toHaveValue('123,45')
  })

  it('produto inexistente é "não encontrado", não erro', async () => {
    const inexistente = '11111111-1111-4111-8111-111111111111'
    renderRoute(
      `/cadastros/produtos/${inexistente}`,
      servidorDeProdutos({
        [`${URL_PRODUTOS}/${inexistente}`]: () => problema(404, 'Sem produto.', 'Not Found'),
      }),
    )

    expect(await screen.findByText('Produto não encontrado.')).toBeInTheDocument()
  })

  // 409 = nenhuma empresa ativa na sessão. Cair em "não encontrado" mandaria o
  // operador procurar um registro que está lá.
  it('falha do servidor mostra o detail e oferece nova tentativa', async () => {
    renderRoute(
      `/cadastros/produtos/${ID}`,
      servidorDeProdutos({
        [`${URL_PRODUTOS}/${ID}`]: () => problema(409, 'Nenhuma empresa ativa na sessão.'),
      }),
    )

    expect(await screen.findByText(/não foi possível carregar o produto/i)).toBeInTheDocument()
    expect(screen.getByText('Nenhuma empresa ativa na sessão.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
    expect(screen.queryByText('Produto não encontrado.')).not.toBeInTheDocument()
  })

  it('grade de fornecedores inclui e exclui linha', async () => {
    const { user } = renderRoute('/cadastros/produtos/novo', servidorDeProdutos())

    await screen.findByLabelText('Nosso Código')
    expect(screen.getAllByText('Nenhum item.').length).toBeGreaterThan(0)

    // A primeira grade da aba Dados Principais é a de Fornecedor.
    await user.click(screen.getAllByRole('button', { name: /Incluir$/ })[0] as HTMLElement)
    const fornecedor = await screen.findByLabelText('Fornecedor linha 1')
    await user.type(fornecedor, 'STELLA')
    expect(fornecedor).toHaveValue('STELLA')

    await user.click(screen.getByRole('button', { name: 'Excluir linha 1' }))
    await waitFor(() => {
      expect(screen.queryByLabelText('Fornecedor linha 1')).not.toBeInTheDocument()
    })
  })

  it('grava e volta para a listagem', async () => {
    const { router, user } = renderRoute('/cadastros/produtos/novo', servidorDeProdutos())

    await user.type(await screen.findByLabelText('Nosso Código'), '9999')
    await user.type(screen.getByLabelText('Nossa Descrição'), 'PENDENTE TESTE')
    await user.click(screen.getByRole('button', { name: /Gravar/ }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/cadastros/produtos')
    })
  })

  it('bloqueia gravar sem os campos obrigatórios', async () => {
    const { router, user } = renderRoute('/cadastros/produtos/novo', servidorDeProdutos())

    await screen.findByLabelText('Nosso Código')
    await user.click(screen.getByRole('button', { name: /Gravar/ }))

    const mensagem = await screen.findByText('Nosso Código é obrigatório')
    // Mensagem de validação em 0.75rem — DESIGN.md §CadastroForm (item 9).
    expect(mensagem).toHaveClass('text-xs')
    expect(router.state.location.pathname).toBe('/cadastros/produtos/novo')
  })
})
