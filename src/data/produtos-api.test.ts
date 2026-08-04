import { ErroDaApi } from '@/data/api-provider'
import {
  URL_PRODUTOS,
  corpoDeDesativacao,
  gravarProduto,
  produtoDoContrato,
  produtoParaContrato,
  produtosApi,
  varianteParaContrato,
} from '@/data/produtos-api'
import { instalarServidor, json, problema } from '@/test/servidor'
import { tableState } from '@/test/utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * Contrato da fronteira de produtos — o primeiro cadastro servido pelo backend.
 *
 * As promessas asseridas aqui são as MESMAS que `provider.test.ts` cobra dos
 * providers mock (paginação 1-based, total pós-filtro, item inexistente = `null`).
 * Mudou o lado que responde, não o contrato: por isso `produtos` saiu de lá e
 * entrou aqui, em vez de perder a cobertura.
 */

const ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301'

function detalhe(over: Record<string, unknown> = {}) {
  return {
    id: ID,
    code: '1201',
    description: 'PENDENTE REDONDO ALUMÍNIO PRETO',
    active: true,
    variants: [
      {
        id: '9c858901-8a57-4791-81fe-4c455b099bc9',
        finish: 'PRETO',
        size: 'ÚNICO',
        active: true,
        priceCents: 8990,
        stockQty: 12.5,
        minStock: 2,
      },
    ],
    ...over,
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('listagem de produtos', () => {
  it('consulta o endpoint do contrato com os parâmetros da tabela', async () => {
    const servidor = instalarServidor({
      [URL_PRODUTOS]: () =>
        json({ rows: [{ id: ID, code: '1201', description: 'X', active: true }], total: 45 }),
    })

    const pagina = await produtosApi.list(
      tableState({ q: 'pendente', sort: { id: 'code', desc: true }, page: 2 }),
    )

    const url = new URL(servidor.em(URL_PRODUTOS)[0]?.url as string)
    expect(url.searchParams.get('q')).toBe('pendente')
    // `sortBy` viaja com o nome do campo NO CONTRATO — a whitelist do servidor é
    // `code`/`description`/`active`, e nome em português voltaria 400.
    expect(url.searchParams.get('sortBy')).toBe('code')
    expect(url.searchParams.get('sortDesc')).toBe('true')
    expect(url.searchParams.get('page')).toBe('2')

    // Total pós-filtro do servidor, não o tamanho da página.
    expect(pagina.rows).toHaveLength(1)
    expect(pagina.total).toBe(45)
  })
})

describe('detalhe de produto', () => {
  it('traz código, descrição, situação e a grade de variantes', async () => {
    instalarServidor({ [`${URL_PRODUTOS}/${ID}`]: () => json(detalhe()) })

    const produto = await produtosApi.get(ID)

    expect(produto).toMatchObject({
      id: ID,
      nossoCodigo: '1201',
      nossaDescricao: 'PENDENTE REDONDO ALUMÍNIO PRETO',
      ativo: true,
    })
    expect(produto?.variantes[0]).toMatchObject({
      acabamento: 'PRETO',
      tamanho: 'ÚNICO',
      ativo: true,
      valorTabelaCentavos: 8990,
      estoqueMinimo: '2',
    })
  })

  it('campo fora do contrato v1 fica em BRANCO, nunca herdado do mock', () => {
    const produto = produtoDoContrato(detalhe())

    // Se algum destes vier preenchido, é dado inventado com cara de dado do
    // servidor — o operador não teria como distinguir.
    expect(produto.marca).toBe('')
    expect(produto.fabrica).toBe('')
    expect(produto.tipoProduto).toBe('')
    expect(produto.ncm).toBe('')
    expect(produto.fornecedores).toEqual([])
    // Preço mora na VARIANTE (§6.3 e schema do backend); no produto fica 0.
    expect(produto.valorTabelaCentavos).toBe(0)
  })

  it('preserva "sem valor" da variante em vez de zerar', () => {
    const produto = produtoDoContrato(
      detalhe({ variants: [{ ...detalhe().variants[0], priceCents: null, minStock: null }] }),
    )

    // `null` é "não precificada"; 0 seria "de graça".
    expect(produto.variantes[0]?.valorTabelaCentavos).toBeNull()
    expect(produto.variantes[0]?.estoqueMinimo).toBe('')
  })

  it('quantidade da variante sai em pt-BR com até 3 casas', () => {
    const produto = produtoDoContrato(
      detalhe({ variants: [{ ...detalhe().variants[0], minStock: 2.5 }] }),
    )

    expect(produto.variantes[0]?.estoqueMinimo).toBe('2,5')
  })

  it('404 devolve null — o produto não está lá', async () => {
    instalarServidor({
      [`${URL_PRODUTOS}/${ID}`]: () => problema(404, 'Produto não encontrado.', 'Not Found'),
    })

    await expect(produtosApi.get(ID)).resolves.toBeNull()
  })

  // 409 é "nenhuma empresa ativa na sessão" (contrato-http-listagem.md). Virar
  // `null` diria "esse produto não existe" para quem só não escolheu empresa.
  it('409 REJEITA com o detail do servidor, não vira "não encontrado"', async () => {
    instalarServidor({
      [`${URL_PRODUTOS}/${ID}`]: () => problema(409, 'Nenhuma empresa ativa na sessão.'),
    })

    const erro = (await produtosApi.get(ID).catch((e: unknown) => e)) as ErroDaApi
    expect(erro).toBeInstanceOf(ErroDaApi)
    expect(erro.status).toBe(409)
    expect(erro.detail).toBe('Nenhuma empresa ativa na sessão.')
  })
})

describe('registro em branco', () => {
  it('nasce sem id — a chave técnica é do servidor', () => {
    const novo = produtosApi.empty()

    expect(novo.id).toBe('')
    expect(novo.ativo).toBe(true)
    expect(novo.variantes).toEqual([])
  })
})

describe('escrita de produto', () => {
  it('corpo leva SÓ os 3 campos do contrato — sem id, tenantId nem variantes', () => {
    const produto = produtoDoContrato(detalhe())

    const corpo = produtoParaContrato(produto)

    // Nem a grade de variantes (que a LEITURA tem) viaja: o ProductWriteRequest
    // não a conhece. Chave a mais aqui = campo que o cliente não deveria escolher.
    expect(corpo).toEqual({
      code: '1201',
      description: 'PENDENTE REDONDO ALUMÍNIO PRETO',
      active: true,
    })
  })

  // A desativação parte da LINHA da listagem, não do detalhe: o
  // `ProductWriteRequest` é subconjunto do `ProductDto`, então a linha já traz
  // todo campo gravável. O risco que este teste vigia é o do `PUT` que
  // substitui tudo — corpo só com `active` apagaria código e descrição.
  it('desativar devolve a linha inteira com active falso', () => {
    const corpo = corpoDeDesativacao({
      id: ID,
      code: '1201',
      description: 'PENDENTE REDONDO ALUMÍNIO PRETO',
      active: true,
    })

    expect(corpo).toEqual({
      code: '1201',
      description: 'PENDENTE REDONDO ALUMÍNIO PRETO',
      active: false,
    })
  })

  it('Incluir faz POST e devolve o registro com o id do servidor', async () => {
    const servidor = instalarServidor({
      [URL_PRODUTOS]: () => json({ id: ID, code: '9999', description: 'X', active: true }, 201),
    })
    const novo = { ...produtosApi.empty(), nossoCodigo: '9999', nossaDescricao: 'X' }

    const gravado = await gravarProduto({ values: novo })

    const chamada = servidor.em(URL_PRODUTOS)[0]
    expect(chamada?.metodo).toBe('POST')
    expect(chamada?.corpo).toEqual({ code: '9999', description: 'X', active: true })
    expect(gravado.id).toBe(ID)
  })

  it('Alterar faz PUT no id da rota — o id NÃO vai no corpo', async () => {
    const servidor = instalarServidor({
      [`${URL_PRODUTOS}/${ID}`]: () => json(detalhe()),
    })
    const produto = produtoDoContrato(detalhe())

    await gravarProduto({
      values: { ...produto, nossaDescricao: 'DESCRIÇÃO NOVA' },
      original: produto,
    })

    const chamada = servidor.em(`${URL_PRODUTOS}/${ID}`)[0]
    expect(chamada?.metodo).toBe('PUT')
    expect(chamada?.corpo).toEqual({
      code: '1201',
      description: 'DESCRIÇÃO NOVA',
      active: true,
    })
  })

  // Na escrita, escopo errado não é tela vazia: é o RLS recusando com 403 e a
  // frase do backend no detail. Silenciar aqui esconderia a recusa.
  it('falha do servidor rejeita com o detail do problem+json', async () => {
    instalarServidor({
      [`${URL_PRODUTOS}/${ID}`]: () =>
        problema(403, 'Sem permissão para gravar nesta empresa.', 'Forbidden'),
    })
    const produto = produtoDoContrato(detalhe())

    const erro = (await gravarProduto({ values: produto, original: produto }).catch(
      (e: unknown) => e,
    )) as ErroDaApi
    expect(erro).toBeInstanceOf(ErroDaApi)
    expect(erro.status).toBe(403)
    expect(erro.detail).toBe('Sem permissão para gravar nesta empresa.')
  })
})

describe('escrita de variante (a grade de Valores)', () => {
  const VARIANTE = '9c858901-8a57-4791-81fe-4c455b099bc9'
  const URL_VARIANTES = `${URL_PRODUTOS}/${ID}/variants`

  it('corpo tem os 5 campos do contrato — estoque atual NÃO é um deles', () => {
    const [linha] = produtoDoContrato(detalhe()).variantes

    const corpo = linha ? varianteParaContrato(linha) : null

    // `stockQty` está no DTO de leitura e fora do de escrita: o saldo é derivado
    // do kardex (append-only), então não se grava estoque, grava-se movimento.
    expect(corpo).toEqual({
      finish: 'PRETO',
      size: 'ÚNICO',
      active: true,
      priceCents: 8990,
      minStock: 2,
    })
  })

  it('Est.Mínimo em pt-BR vira número; vazio vira null', () => {
    const [linha] = produtoDoContrato(detalhe()).variantes
    if (!linha) throw new Error('sem linha')

    expect(varianteParaContrato({ ...linha, estoqueMinimo: '1.234,5' }).minStock).toBe(1234.5)
    expect(varianteParaContrato({ ...linha, estoqueMinimo: '' }).minStock).toBeNull()
  })

  it('linha nova (sem id) vira POST no produto', async () => {
    const servidor = instalarServidor({
      [`${URL_PRODUTOS}/${ID}`]: () => json(detalhe()),
      [URL_VARIANTES]: () => json({ id: 'nova', finish: 'BRANCO', size: 'P' }, 201),
    })
    const produto = produtoDoContrato(detalhe())
    const comLinhaNova = {
      ...produto,
      variantes: [
        ...produto.variantes,
        {
          id: null,
          ativo: true,
          acabamento: 'BRANCO',
          tamanho: 'P',
          valorTabelaCentavos: 4990,
          indice: '',
          estoqueMinimo: '3',
          tipoValor: null,
        },
      ],
    }

    await gravarProduto({ values: comLinhaNova, original: produto })

    const chamada = servidor.em(URL_VARIANTES)[0]
    expect(chamada?.metodo).toBe('POST')
    expect(chamada?.corpo).toEqual({
      finish: 'BRANCO',
      size: 'P',
      active: true,
      priceCents: 4990,
      minStock: 3,
    })
  })

  it('linha alterada vira PUT no id da variante', async () => {
    const servidor = instalarServidor({
      [`${URL_PRODUTOS}/${ID}`]: () => json(detalhe()),
      [`${URL_VARIANTES}/${VARIANTE}`]: () => json({ id: VARIANTE }),
    })
    const produto = produtoDoContrato(detalhe())
    const editado = {
      ...produto,
      variantes: produto.variantes.map((v) => ({ ...v, valorTabelaCentavos: 12345 })),
    }

    await gravarProduto({ values: editado, original: produto })

    const chamada = servidor.em(`${URL_VARIANTES}/${VARIANTE}`)[0]
    expect(chamada?.metodo).toBe('PUT')
    expect(chamada?.corpo).toMatchObject({ priceCents: 12345, finish: 'PRETO' })
  })

  // A grade tem N linhas e o Gravar é um clique: mandar todas seria N escritas
  // por gravação, cada uma carimbando alteração em registro que ninguém tocou.
  it('linha intocada não vira requisição nenhuma', async () => {
    const servidor = instalarServidor({
      [`${URL_PRODUTOS}/${ID}`]: () => json(detalhe()),
    })
    const produto = produtoDoContrato(detalhe())

    await gravarProduto({
      values: { ...produto, nossaDescricao: 'SÓ O PRODUTO' },
      original: produto,
    })

    expect(servidor.chamadas.filter((c) => c.caminho.includes('/variants'))).toEqual([])
  })

  // Sem transação entre endpoints: quando a variante falha, o produto JÁ foi
  // gravado. A mensagem tem de dizer isso, senão o operador tenta de novo sobre
  // um estado que já mudou.
  it('falha na variante diz qual linha caiu e que o produto já foi gravado', async () => {
    instalarServidor({
      [`${URL_PRODUTOS}/${ID}`]: () => json(detalhe()),
      [`${URL_VARIANTES}/${VARIANTE}`]: () => problema(409, 'Acabamento repetido.', 'Conflict'),
    })
    const produto = produtoDoContrato(detalhe())
    const editado = {
      ...produto,
      variantes: produto.variantes.map((v) => ({ ...v, valorTabelaCentavos: 1 })),
    }

    const erro = (await gravarProduto({ values: editado, original: produto }).catch(
      (e: unknown) => e,
    )) as ErroDaApi

    expect(erro).toBeInstanceOf(ErroDaApi)
    expect(erro.status).toBe(409)
    expect(erro.detail).toBe('Acabamento repetido.')
    expect(erro.message).toContain('PRETO / ÚNICO')
    expect(erro.message).toContain('reabra o produto')
  })
})
