import { data } from '@/data'
import { ErroDaApi } from '@/data/api-provider'
import {
  ORDENAVEIS,
  URL_PARCEIROS,
  atualizarParceiro,
  corpoDeEscrita,
  parceiros,
} from '@/data/parceiros-api'
import { parceiro } from '@/test/parceiros'
import { instalarServidor, json, problema } from '@/test/servidor'
import { tableState } from '@/test/utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * Contrato da fronteira de parceiros — uma tabela, três papéis.
 *
 * Vale aqui a mesma promessa que `provider.test.ts` cobra dos providers mock
 * (paginação 1-based, total pós-filtro). O que NÃO vale é `get`: o contrato não
 * publicou `GET /api/partners/{id}`, e isso é asserido, não suposto.
 */

/** Campos que as telas editam — o recorte do corpo de escrita. */
const CAMPOS = {
  legalName: 'X',
  tradeName: 'Y',
  document: '1',
  email: 'a@b.c',
  active: true,
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('listagem por papel', () => {
  it('manda o papel da tela junto com a consulta da tabela', async () => {
    const servidor = instalarServidor({
      [URL_PARCEIROS]: () => json({ rows: [parceiro()], total: 40 }),
    })

    const pagina = await parceiros('supplier', () => null).list(
      tableState({ q: 'stella', sort: { id: 'legalName', desc: true }, page: 3 }),
    )

    const url = new URL(servidor.em(URL_PARCEIROS)[0]?.url as string)
    expect(url.searchParams.get('role')).toBe('supplier')
    expect(url.searchParams.get('q')).toBe('stella')
    expect(url.searchParams.get('sortBy')).toBe('legalName')
    expect(url.searchParams.get('sortDesc')).toBe('true')
    expect(url.searchParams.get('page')).toBe('3')

    // Total pós-filtro do servidor, dentro do RLS — nunca o tamanho da página.
    expect(pagina.rows).toHaveLength(1)
    expect(pagina.total).toBe(40)
  })

  it.each([
    ['clientes', 'customer'],
    ['fornecedores', 'supplier'],
    ['profissionais', 'professional'],
  ] as const)('%s pede role=%s', async (recurso, papel) => {
    const servidor = instalarServidor({ [URL_PARCEIROS]: () => json({ rows: [], total: 0 }) })

    await data[recurso].list(tableState())

    // Papel fora da lista é 400 no backend, não filtro ignorado: a tela de
    // Fornecedores mostraria clientes e a lista cheia não denunciaria nada.
    const url = new URL(servidor.em(URL_PARCEIROS)[0]?.url as string)
    expect(url.searchParams.get('role')).toBe(papel)
  })

  it('falha do servidor REJEITA, com o detail do problem+json', async () => {
    instalarServidor({
      [URL_PARCEIROS]: () => problema(409, 'Nenhuma empresa ativa na sessão.'),
    })

    const erro = (await data.fornecedores.list(tableState()).catch((e: unknown) => e)) as ErroDaApi
    expect(erro).toBeInstanceOf(ErroDaApi)
    expect(erro.status).toBe(409)
    expect(erro.detail).toBe('Nenhuma empresa ativa na sessão.')
  })
})

describe('escrita', () => {
  // `PUT` substitui o registro inteiro. O que a tela não mostra tem de voltar
  // como veio — senão gravar um Fornecedor apagaria o papel de Cliente do mesmo
  // parceiro, e o operador só descobriria na outra listagem.
  it('devolve intacto o que a tela não edita', () => {
    const original = parceiro({
      code: 'F001',
      paymentTerms: '30/60/90',
      isCustomer: true,
      isSupplier: true,
    })

    const corpo = corpoDeEscrita(original, {
      legalName: 'NOVA RAZÃO',
      tradeName: 'NOVO FANTASIA',
      document: '99999999000199',
      email: 'novo@teste.com',
      active: false,
    })

    expect(corpo).toEqual({
      legalName: 'NOVA RAZÃO',
      tradeName: 'NOVO FANTASIA',
      document: '99999999000199',
      email: 'novo@teste.com',
      active: false,
      code: 'F001',
      paymentTerms: '30/60/90',
      isCustomer: true,
      isSupplier: true,
      isProfessional: false,
    })
  })

  it('manda PUT no id e devolve o registro que o servidor gravou', async () => {
    const servidor = instalarServidor({
      [`${URL_PARCEIROS}/${parceiro().id}`]: () => json(parceiro({ legalName: 'GRAVADO' })),
    })

    const salvo = await atualizarParceiro(parceiro().id, corpoDeEscrita(parceiro(), CAMPOS))

    expect(servidor.em(`${URL_PARCEIROS}/${parceiro().id}`)[0]?.metodo).toBe('PUT')
    expect(salvo.legalName).toBe('GRAVADO')
  })

  // 403 é o RLS recusando escopo: a empresa da sessão não é a do registro.
  it('403 rejeita com o detail do servidor', async () => {
    instalarServidor({
      [`${URL_PARCEIROS}/${parceiro().id}`]: () => problema(403, 'Parceiro fora da empresa ativa.'),
    })

    const erro = (await atualizarParceiro(parceiro().id, corpoDeEscrita(parceiro(), CAMPOS)).catch(
      (e: unknown) => e,
    )) as ErroDaApi
    expect(erro).toBeInstanceOf(ErroDaApi)
    expect(erro.status).toBe(403)
    expect(erro.detail).toBe('Parceiro fora da empresa ativa.')
  })

  // Resposta vazia NÃO é sucesso silencioso: o contrato descreve `200` com o
  // `PartnerDto`, e aceitar corpo vazio seria aceitar resposta não descrita.
  it('corpo vazio no 200 é falha, não sucesso', async () => {
    instalarServidor({
      [`${URL_PARCEIROS}/${parceiro().id}`]: () => new Response('', { status: 204 }),
    })

    await expect(
      atualizarParceiro(parceiro().id, corpoDeEscrita(parceiro(), CAMPOS)),
    ).rejects.toBeInstanceOf(ErroDaApi)
  })
})

describe('o que o contrato NÃO oferece', () => {
  // A LEITURA por id não existe (o caminho `/api/partners/{id}` só tem `PUT`).
  // Quem faz o papel do detalhe é a linha da listagem.
  it.each(['clientes', 'fornecedores', 'profissionais'] as const)(
    '%s não expõe get — não há GET /api/partners/{id}',
    (recurso) => {
      expect(data[recurso]).not.toHaveProperty('get')
    },
  )

  it('mas o registro em branco do Incluir continua local', () => {
    expect(data.fornecedores.empty(1)).toHaveProperty('id', 1)
    expect(data.clientes.empty(2)).toHaveProperty('id', 2)
    expect(data.profissionais.empty(3)).toHaveProperty('id', 3)
  })
})

describe('whitelist de ordenação', () => {
  // Espelha `PartnerEndpoints.Ordenaveis` do backend. Coluna chaveada fora desta
  // lista responde 400 ao clicar no cabeçalho — `paymentTerms`, `email` e
  // `registrationActive` estão de fora de propósito.
  it('é a mesma lista que o backend aceita', () => {
    expect(ORDENAVEIS).toEqual(['code', 'legalName', 'tradeName', 'document', 'active'])
  })
})
