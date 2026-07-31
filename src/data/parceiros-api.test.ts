import { data } from '@/data'
import { ErroDaApi } from '@/data/api-provider'
import { ORDENAVEIS, URL_PARCEIROS, parceiros } from '@/data/parceiros-api'
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

describe('o que o contrato NÃO oferece', () => {
  // Enquanto isto valer, `Alterar`/`Consul.` ficam desabilitados nas três telas.
  // Quando o backend publicar o detalhe, este teste é o primeiro a mudar.
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
