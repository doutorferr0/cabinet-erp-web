import { URL_PRODUTOS } from '@/data/produtos-api'
import { json, problema } from '@/test/servidor'
import { type FetchStub, renderRoute, respostaSessao, respostaVinculos } from '@/test/utils'
import { screen, waitFor, within } from '@testing-library/react'
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

/** Id da variante: é ele que separa alterar a linha (PUT) de criar outra (POST). */
const VARIANTE_ID = '9c858901-8a57-4791-81fe-4c455b099bc9'

const DETALHE = {
  ...LINHA,
  variants: [
    {
      id: VARIANTE_ID,
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

/**
 * Servidor de produtos que também ACEITA escrita, guardando verbo e corpo.
 *
 * Verbo e corpo vêm do `Request` que o cliente gerado monta — o `init` chega
 * vazio (ver `src/test/servidor.ts`). Só desvia o que NÃO é `GET`: a listagem
 * pós-gravação continua respondendo pelo caminho normal.
 */
function servidorComEscrita(resposta: () => Response, rotas: Record<string, () => Response> = {}) {
  const chamadas: { metodo: string; caminho: string; corpo: unknown }[] = []
  const base = servidorDeProdutos(rotas)

  const stub: FetchStub = async (entrada) => {
    const requisicao = entrada instanceof Request ? entrada : null
    if (requisicao && requisicao.method.toUpperCase() !== 'GET') {
      const caminho = new URL(requisicao.url, 'http://localhost').pathname
      if (caminho.startsWith(URL_PRODUTOS)) {
        chamadas.push({
          metodo: requisicao.method.toUpperCase(),
          // O caminho separa escrita de PRODUTO de escrita de VARIANTE — as duas
          // saem do mesmo Gravar e vão para endpoints diferentes.
          caminho,
          corpo: JSON.parse(await requisicao.clone().text()),
        })
        return resposta()
      }
    }
    return base(entrada)
  }

  return { stub, chamadas }
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

  // `Excluir` na UI de cadastro é DESATIVAÇÃO (padrão 8), e antes disto o botão
  // era destrutivo na aparência e inerte no efeito: sem `onExcluir`, a ação caía
  // no `console.info` e o operador concluía que tinha desativado.
  it('Excluir confirma, desativa por PUT e manda a linha inteira', async () => {
    const escrita = servidorComEscrita(() => json({ ...LINHA, active: false }))
    const { user } = renderRoute('/cadastros/produtos', escrita.stub)

    await user.click(await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO'))
    await user.click(screen.getByRole('button', { name: 'Excluir' }))

    const dialogo = await screen.findByRole('dialog')
    expect(dialogo).toHaveTextContent('Desativar produto?')
    expect(dialogo).toHaveTextContent('não é apagado')
    await user.click(within(dialogo).getByRole('button', { name: 'Desativar' }))

    // O `PUT` substitui o registro inteiro: `code` e `description` voltam como
    // vieram. Corpo com eles nulos apagaria o cadastro para desativá-lo.
    await waitFor(() => {
      expect(escrita.chamadas).toEqual([
        {
          metodo: 'PUT',
          caminho: `${URL_PRODUTOS}/${ID}`,
          corpo: {
            code: '1201',
            description: 'PENDENTE REDONDO ALUMÍNIO PRETO',
            active: false,
          },
        },
      ])
    })
  }, 15_000)

  it('Cancelar no diálogo não manda escrita nenhuma', async () => {
    const escrita = servidorComEscrita(() => json({ ...LINHA, active: false }))
    const { user } = renderRoute('/cadastros/produtos', escrita.stub)

    await user.click(await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO'))
    await user.click(screen.getByRole('button', { name: 'Excluir' }))
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancelar' }),
    )

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(escrita.chamadas).toEqual([])
  }, 15_000)

  // `PUT` que não muda nada voltaria 200 e a tela diria "desativado" — o
  // operador concluiria que a situação mudou nesta hora, quando já era assim.
  it('linha já inativa não vira PUT: o diálogo só informa', async () => {
    const escrita = servidorComEscrita(() => json({ ...LINHA, active: false }), {
      [URL_PRODUTOS]: () => json({ rows: [{ ...LINHA, active: false }], total: 1 }),
    })
    const { user } = renderRoute('/cadastros/produtos', escrita.stub)

    await user.click(await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO'))
    await user.click(screen.getByRole('button', { name: 'Excluir' }))

    const dialogo = await screen.findByRole('dialog')
    expect(dialogo).toHaveTextContent('já está inativo')
    expect(within(dialogo).queryByRole('button', { name: 'Desativar' })).not.toBeInTheDocument()
    expect(escrita.chamadas).toEqual([])
  }, 15_000)

  // Recusa do servidor não pode fechar o diálogo: fechar sem escrita valeria
  // como "desativado" para quem está olhando.
  it('falha ao desativar mantém o diálogo e mostra o detail', async () => {
    const escrita = servidorComEscrita(() =>
      problema(403, 'Sem permissão para gravar nesta empresa.', 'Forbidden'),
    )
    const { user } = renderRoute('/cadastros/produtos', escrita.stub)

    await user.click(await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO'))
    await user.click(screen.getByRole('button', { name: 'Excluir' }))
    const dialogo = await screen.findByRole('dialog')
    await user.click(within(dialogo).getByRole('button', { name: 'Desativar' }))

    expect(await within(dialogo).findByRole('alert')).toHaveTextContent(
      'Sem permissão para gravar nesta empresa.',
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  }, 15_000)
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

  it('grava mandando POST com os 3 campos e volta para a listagem', async () => {
    const escrita = servidorComEscrita(() =>
      json({ id: ID, code: '9999', description: 'PENDENTE TESTE', active: true }, 201),
    )
    const { router, user } = renderRoute('/cadastros/produtos/novo', escrita.stub)

    await user.type(await screen.findByLabelText('Nosso Código'), '9999')
    await user.type(screen.getByLabelText('Nossa Descrição'), 'PENDENTE TESTE')
    await user.click(screen.getByRole('button', { name: /Gravar/ }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/cadastros/produtos')
    })
    // O que a tela GRAVOU, não só para onde ela foi: sem asserir o corpo, o
    // teste passaria de novo com o Gravar sem destino que existia antes.
    expect(escrita.chamadas).toEqual([
      {
        metodo: 'POST',
        caminho: URL_PRODUTOS,
        corpo: { code: '9999', description: 'PENDENTE TESTE', active: true },
      },
    ])
  }, 15_000)

  // A grade passou a viajar — no endpoint DELA. O Gravar é um clique e vira
  // duas escritas: produto e variante, nessa ordem (a variante pendura no id).
  it('editar o Valor de Tabela grava a variante por PUT no endpoint dela', async () => {
    const escrita = servidorComEscrita(() => json(DETALHE))
    const { user } = renderRoute(`/cadastros/produtos/${ID}`, escrita.stub)

    await screen.findByLabelText('Nosso Código')
    await user.click(screen.getByRole('tab', { name: /Valores/ }))
    const valor = await screen.findByLabelText('Valor de Tabela linha 1')
    await user.clear(valor)
    await user.type(valor, '12345')
    await user.click(screen.getByRole('button', { name: /Gravar/ }))

    await waitFor(() => {
      expect(escrita.chamadas.some((c) => c.caminho.includes('/variants'))).toBe(true)
    })
    const variante = escrita.chamadas.find((c) => c.caminho.includes('/variants'))
    expect(variante?.metodo).toBe('PUT')
    expect(variante?.caminho).toBe(`${URL_PRODUTOS}/${ID}/variants/${VARIANTE_ID}`)
    // `stockQty` não está no corpo: estoque atual é saldo de movimento (kardex),
    // não campo de cadastro. Mandá-lo aqui seria escrever no que é derivado.
    expect(variante?.corpo).toEqual({
      finish: 'PRETO',
      size: 'ÚNICO',
      active: true,
      priceCents: 12345,
      minStock: 2,
    })
  }, 20_000)

  it('grade intocada não vira escrita de variante', async () => {
    const escrita = servidorComEscrita(() => json(DETALHE))
    const { user } = renderRoute(`/cadastros/produtos/${ID}`, escrita.stub)

    const descricao = await screen.findByLabelText('Nossa Descrição')
    await user.clear(descricao)
    await user.type(descricao, 'SÓ O PRODUTO')
    await user.click(screen.getByRole('button', { name: /Gravar/ }))

    await waitFor(() => {
      expect(escrita.chamadas.some((c) => c.caminho === `${URL_PRODUTOS}/${ID}`)).toBe(true)
    })
    expect(escrita.chamadas.filter((c) => c.caminho.includes('/variants'))).toEqual([])
  }, 20_000)

  // Escrita recusada não pode virar volta silenciosa para a listagem: o operador
  // acharia que gravou. Fica na tela, com a frase que o backend escolheu.
  it('falha ao gravar mantém na tela e mostra o detail do servidor', async () => {
    const escrita = servidorComEscrita(() =>
      problema(403, 'Sem permissão para gravar nesta empresa.', 'Forbidden'),
    )
    const { router, user } = renderRoute('/cadastros/produtos/novo', escrita.stub)

    await user.type(await screen.findByLabelText('Nosso Código'), '9999')
    await user.type(screen.getByLabelText('Nossa Descrição'), 'PENDENTE TESTE')
    await user.click(screen.getByRole('button', { name: /Gravar/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Sem permissão para gravar nesta empresa.',
    )
    expect(router.state.location.pathname).toBe('/cadastros/produtos/novo')
  }, 15_000)

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
