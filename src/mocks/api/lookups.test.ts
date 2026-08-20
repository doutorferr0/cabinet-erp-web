import { configurarApi } from '@/api/cliente'
import {
  authLogin,
  authSetActiveTenant,
  createCatalogLookup,
  listCatalogLookups,
  updateCatalogLookup,
} from '@/api/gerado'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { handlers } from './handlers'
import { TENANT_MATRIZ, resetStore } from './store'

/**
 * A ESCRITA das listas de apoio no mock — e o 409 que o front nunca tinha visto.
 *
 * O contrato declara `POST`/`PUT /api/catalog-lookups` desde a #250, com a regra
 * de unicidade escrita na descrição do 409. Handler nenhum a servia: o cadastro
 * rápido do combo grava local, então a tela que trate "nome repetido" só
 * descobriria a recusa contra o backend real.
 *
 * O que este arquivo trava é a REGRA e o FORMATO do erro — não o dado do seed.
 */

const servidor = setupServer(...handlers)

beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }))
afterEach(() => servidor.resetHandlers())
afterAll(() => servidor.close())

beforeEach(() => {
  resetStore()
  configurarApi('http://mock.teste')
})

async function entrar() {
  await authLogin({ email: 'admin@vertz.dev', password: 'qualquer' })
  await authSetActiveTenant({ tenantId: TENANT_MATRIZ })
}

/** As opções de um kind, já estreitadas — a listagem responde 200 ou não responde. */
async function opcoesDe(kind: string) {
  const lista = await listCatalogLookups({ kind, pageSize: 100 })
  if (lista.status !== 200) throw new Error(`listagem de ${kind} respondeu ${lista.status}`)
  return lista.data.rows
}

/** O corpo como o `+...` do combo o manda. */
function novaOpcao(kind: string, name: string, active = true) {
  return { kind, name, active }
}

describe('inclusão pelo `+...`', () => {
  it('grava e a lista do kind passa a trazer o item', async () => {
    await entrar()
    const criada = await createCatalogLookup(novaOpcao('MARCA', 'LUMINA'))

    expect(criada.status).toBe(201)
    expect((await opcoesDe('MARCA')).map((l) => l.name)).toContain('LUMINA')
  })

  it('nome repetido no MESMO kind é 409, e o detail nomeia o nome', async () => {
    await entrar()
    const resposta = await createCatalogLookup(novaOpcao('MARCA', 'STELLA'))

    expect(resposta.status).toBe(409)
    expect(resposta.data).toMatchObject({
      type: 'about:blank',
      title: 'Conflito',
      status: 409,
      detail: 'Já existe "STELLA" nesta lista.',
    })
  })

  /**
   * A comparação é a do índice do backend (`sem_acento`, que é `lower` +
   * `unaccent`). Sem isso, "Stella" e "STELLA" viram duas linhas que o operador
   * lê como a mesma, e a escolha entre elas passa a ser sorteio.
   */
  it('o repetido não escapa por caixa nem por acento', async () => {
    await entrar()
    const caixa = await createCatalogLookup(novaOpcao('MARCA', 'stella'))
    expect(caixa.status).toBe(409)

    const acento = await createCatalogLookup(novaOpcao('MATERIAIS', 'ALUMINIO'))
    expect(acento.status).toBe(409)
  })

  it('o mesmo nome em OUTRA lista entra — a unicidade é por kind', async () => {
    await entrar()
    const resposta = await createCatalogLookup(novaOpcao('SETOR', 'STELLA'))
    expect(resposta.status).toBe(201)
  })

  /** Item inativo é histórico, e histórico não disputa nome com ninguém. */
  it('nome que só existe em item INATIVO não barra', async () => {
    await entrar()
    const stella = (await opcoesDe('MARCA')).find((l) => l.name === 'STELLA')
    await updateCatalogLookup(String(stella?.id), { name: 'STELLA', active: false })

    const resposta = await createCatalogLookup(novaOpcao('MARCA', 'STELLA'))
    expect(resposta.status).toBe(201)
  })

  it('kind fora do vocabulário do servidor é 400 apontando o campo', async () => {
    await entrar()
    const resposta = await createCatalogLookup(novaOpcao('LISTA_QUE_NAO_EXISTE', 'X'))

    expect(resposta.status).toBe(400)
    expect(resposta.data).toMatchObject({
      type: 'urn:cabinet:erro:campos-invalidos',
      title: 'Campos inválidos',
    })
    const problema = resposta.data as { fields?: { path: string }[] }
    expect(problema.fields?.map((c) => c.path)).toEqual(['kind'])
  })

  it('nome em branco é 400 com o campo destacado', async () => {
    await entrar()
    const resposta = await createCatalogLookup(novaOpcao('MARCA', '   '))

    expect(resposta.status).toBe(400)
    const problema = resposta.data as { fields?: { path: string }[] }
    expect(problema.fields?.map((c) => c.path)).toEqual(['name'])
  })
})

describe('renomear e desativar', () => {
  async function idDeUmaMarca(nome: string) {
    return String((await opcoesDe('MARCA')).find((l) => l.name === nome)?.id)
  }

  it('renomeia', async () => {
    await entrar()
    const id = await idDeUmaMarca('BRILIA')
    const resposta = await updateCatalogLookup(id, { name: 'BRILIA LED', active: true })

    expect(resposta.status).toBe(200)
    expect((await opcoesDe('MARCA')).map((l) => l.name)).toContain('BRILIA LED')
  })

  it('gravar o item com o próprio nome não é conflito consigo mesmo', async () => {
    await entrar()
    const id = await idDeUmaMarca('BRILIA')
    const resposta = await updateCatalogLookup(id, { name: 'BRILIA', active: true })
    expect(resposta.status).toBe(200)
  })

  it('renomear para o nome de outro ATIVO do kind é 409', async () => {
    await entrar()
    const id = await idDeUmaMarca('BRILIA')
    const resposta = await updateCatalogLookup(id, { name: 'STELLA', active: true })

    expect(resposta.status).toBe(409)
    expect(resposta.data).toMatchObject({ status: 409, detail: 'Já existe "STELLA" nesta lista.' })
  })

  /**
   * O `kind` não viaja no corpo do `PUT` — o contrato não o declara. Se vier
   * mesmo assim, mudá-lo é recusa: mover o item mudaria o significado de toda
   * referência que já aponta para o id.
   */
  it('trocar o kind pelo corpo é recusado, apontando o campo', async () => {
    await entrar()
    const id = await idDeUmaMarca('BRILIA')
    const resposta = await updateCatalogLookup(id, {
      name: 'BRILIA',
      active: true,
      kind: 'SETOR',
    } as never)

    expect(resposta.status).toBe(400)
    const problema = resposta.data as { fields?: { path: string }[] }
    expect(problema.fields?.map((c) => c.path)).toEqual(['kind'])
  })

  it('id que não existe é 404 com o tipo declarado', async () => {
    await entrar()
    const resposta = await updateCatalogLookup('lk-que-nao-existe', {
      name: 'QUALQUER',
      active: true,
    })

    expect(resposta.status).toBe(404)
    expect(resposta.data).toMatchObject({
      type: 'urn:cabinet:erro:nao-encontrado',
      title: 'Não encontrado',
    })
  })
})

describe('sessão e empresa', () => {
  it('sem sessão é 401 do tipo `sem-sessao`', async () => {
    const resposta = await createCatalogLookup(novaOpcao('MARCA', 'LUMINA'))

    expect(resposta.status).toBe(401)
    expect(resposta.data).toMatchObject({ type: 'urn:cabinet:erro:sem-sessao' })
  })

  /**
   * A LISTA responde sem empresa (o combo de um cadastro novo pergunta antes),
   * mas a ESCRITA para em 409 — é onde a borda do backend real para, e o mock
   * para no mesmo lugar.
   */
  it('escrita sem empresa ativa é 409 `sem-empresa-ativa`, com a leitura intacta', async () => {
    await authLogin({ email: 'admin@vertz.dev', password: 'qualquer' })

    const lista = await listCatalogLookups({ kind: 'MARCA', pageSize: 100 })
    expect(lista.status).toBe(200)

    const resposta = await createCatalogLookup(novaOpcao('MARCA', 'LUMINA'))
    expect(resposta.status).toBe(409)
    expect(resposta.data).toMatchObject({
      type: 'urn:cabinet:erro:sem-empresa-ativa',
      title: 'Sem empresa ativa',
    })
  })
})
