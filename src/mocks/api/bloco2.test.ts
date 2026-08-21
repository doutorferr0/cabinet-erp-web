import { configurarApi } from '@/api/cliente'
import {
  authLogin,
  authSetActiveTenant,
  createPartnerContact,
  createWork,
  getWork,
  listPartnerContacts,
  listWorks,
  updatePartnerContact,
  updateWork,
} from '@/api/gerado'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { resetContatos } from './contatos'
import { handlers } from './handlers'
import { resetObras } from './obras'
import { TENANT_FILIAL, TENANT_MATRIZ, resetStore } from './store'

/**
 * O MOCK DO BLOCO 2 — obra e contatos (#255, contrato na `main` pela #259).
 *
 * Trava as SEMÂNTICAS, não o dado do seed. Enquanto o `cabinet-erp-api` não
 * serve estas rotas (`api#42`/`#43`), é este mock que as telas vão treinar — e
 * um mock que divergir do contrato ensina o desenho errado, que só aparece no
 * dia da migração.
 *
 * As duas semânticas que este arquivo existe para provar são as CAMADAS, que
 * são opostas e fáceis de trocar uma pela outra:
 *
 * - **obra é da EMPRESA** — recorte por empresa ativa, e obra de outra empresa
 *   é 404;
 * - **contato é da ORGANIZAÇÃO** — pende do cadastro, mas quem pergunta precisa
 *   ter vínculo, exatamente como no detalhe de parceiro.
 *
 * Exercita pelo CLIENTE GERADO, e não por `fetch` cru: é o caminho inteiro que
 * a tela vai usar, incluindo a serialização de `filters` que o codegen faz.
 */

const servidor = setupServer(...handlers)

beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }))
afterEach(() => servidor.resetHandlers())
afterAll(() => servidor.close())

beforeEach(() => {
  resetStore()
  resetObras()
  resetContatos()
  configurarApi('http://mock.teste')
})

async function entrar(tenantId = TENANT_MATRIZ) {
  await authLogin({ email: 'admin@vertz.dev', password: 'qualquer' })
  await authSetActiveTenant({ tenantId })
}

describe('obra — dado de EMPRESA', () => {
  it('a listagem mostra só as obras da empresa ativa', async () => {
    await entrar()
    const resposta = await listWorks({ page: 1, pageSize: 50 })

    expect(resposta.status).toBe(200)
    if (resposta.status !== 200) return
    // O seed tem três obras, e uma delas é da FILIAL. Uma listagem que
    // devolvesse as três passaria despercebida — as linhas têm cara de dado.
    expect(resposta.data.rows.map((o) => o.id)).toEqual(['obra-0001', 'obra-0002'])
    expect(resposta.data.total).toBe(2)
  })

  it('a mesma consulta, de outra empresa, devolve OUTRO conjunto', async () => {
    await entrar(TENANT_FILIAL)
    const resposta = await listWorks({ page: 1, pageSize: 50 })

    expect(resposta.status).toBe(200)
    if (resposta.status !== 200) return
    expect(resposta.data.rows.map((o) => o.id)).toEqual(['obra-0003'])
  })

  it('obra de outra empresa responde 404 — não lista vazia, não 403', async () => {
    // 404 é a resposta do detalhe de parceiro sem vínculo, e vale pelo mesmo
    // motivo: do ponto de vista de quem pergunta, o registro não está lá. Um
    // 403 confirmaria a existência da obra da vizinha.
    await entrar()
    expect((await getWork('obra-0003')).status).toBe(404)
    expect((await getWork('obra-0001')).status).toBe(200)
  })

  it('o nome do cliente é DERIVADO do id, e não guardado', async () => {
    await entrar()
    const resposta = await getWork('obra-0001')

    expect(resposta.status).toBe(200)
    if (resposta.status !== 200) return
    expect(resposta.data.customerId).toBe('parc-0002')
    expect(resposta.data.customerName).toBe('MARIA HELENA ARQUITETURA ME')
  })

  it('`filters` recorta por cliente — é como a tela pede "as obras deste"', async () => {
    // O parâmetro é a razão de a obra ser coleção própria em vez de caminho
    // aninhado em parceiro. Se ele não funcionar, o desenho inteiro perde o pé.
    //
    // **Este é o único caso do arquivo por `fetch` cru, e não por preguiça:** o
    // `getListWorksUrl` do codegen serializa todo parâmetro com `String(value)`,
    // e um array de objetos vira `[object Object]` na query — armadilha já
    // paga em `parceiros-api.ts`, que por isso monta `filters` no provider com
    // `JSON.stringify`. Passar pelo cliente gerado aqui provaria o serializador
    // do orval, não o filtro do mock.
    await entrar()
    const filtro = [{ field: 'customerId', operator: 'eq', value: 'parc-0002' }]
    const busca = new URLSearchParams({
      page: '1',
      pageSize: '50',
      filters: JSON.stringify(filtro),
    })
    const resposta = await fetch(`http://mock.teste/api/works?${busca}`)

    expect(resposta.status).toBe(200)
    const pagina = (await resposta.json()) as { rows: unknown[]; total: number }
    expect(pagina.total).toBe(2)

    // E o campo fora da whitelist é recusado ALTO, não ignorado: filtro
    // descartado em silêncio faria a tela mostrar a lista inteira com a
    // condição desenhada no painel.
    const fora = new URLSearchParams({
      filters: JSON.stringify([{ field: 'address', operator: 'eq', value: 'x' }]),
    })
    expect((await fetch(`http://mock.teste/api/works?${fora}`)).status).toBe(400)
  })

  it('`sortBy` fora da whitelist é 400 — o contrato publica quatro campos', async () => {
    await entrar()
    expect((await listWorks({ sortBy: 'address' })).status).toBe(400)
    expect((await listWorks({ sortBy: 'description' })).status).toBe(200)
  })

  it('ordena pelo NOME do cliente, que é a coluna que a tela mostra', async () => {
    // `WorkDto.customerName` existe declaradamente "para a listagem de obras
    // mostrar de quem é sem uma segunda consulta". Campo publicado para ser
    // coluna e não ordenável é a coluna que quebra com 400 no clique do
    // cabeçalho — o padrão 1 do `CLAUDE.md` descreve esse modo de falhar.
    // `/api/quotes` e `/api/orders` já ordenam pelo mesmo par; obra era a
    // exceção, e deixou de ser (#273).
    await entrar()
    const resposta = await listWorks({ sortBy: 'customerName', pageSize: 50 })
    expect(resposta.status).toBe(200)
    if (resposta.status !== 200) return

    const nomes = resposta.data.rows.map((obra) => obra.customerName ?? '')
    expect(nomes.length).toBeGreaterThan(1)
    expect([...nomes].sort((a, b) => a.localeCompare(b))).toEqual(nomes)
  })

  it('as DUAS whitelists divergem: uuid filtra e não ordena', async () => {
    // O ponto da #273, e o que a separação torna exprimível. `customerId`
    // continua sendo COMO a tela pede "as obras deste cliente" — o caso acima
    // prova que o filtro por ele recorta —, mas ordenar por uuid é ordem sem
    // significado, e o contrato parou de publicar isso.
    await entrar()
    expect((await listWorks({ sortBy: 'customerId' })).status).toBe(400)

    const porNome = new URLSearchParams({
      pageSize: '50',
      filters: JSON.stringify([
        { field: 'customerName', operator: 'iLike', value: 'MARIA HELENA' },
      ]),
    })
    const resposta = await fetch(`http://mock.teste/api/works?${porNome}`)
    expect(resposta.status).toBe(200)
    const pagina = (await resposta.json()) as { rows: { customerName: string }[]; total: number }
    // Filtrar pelo TRECHO do nome é o que a tela de busca faz; com só o uuid, a
    // única pergunta possível era a igualdade exata de um valor que ninguém
    // digita.
    expect(pagina.total).toBe(2)
    expect(pagina.rows.every((obra) => obra.customerName.includes('MARIA HELENA'))).toBe(true)
  })

  it('incluir para cliente que a empresa não atende é 404', async () => {
    // `parc-0003` só tem vínculo com a filial. Aceitar aqui criaria obra
    // pendurada num cliente que a tela desta empresa nunca lista.
    await entrar()
    const resposta = await createWork({
      customerId: 'parc-0003',
      description: 'OBRA DE CLIENTE ALHEIO',
      active: true,
    })
    expect(resposta.status).toBe(404)
  })

  it('a obra incluída nasce na empresa ativa e volta na listagem dela', async () => {
    await entrar()
    const criada = await createWork({
      customerId: 'parc-0002',
      description: 'COBERTURA JARDINS',
      workType: 'RESIDENCIAL',
      active: true,
    })

    expect(criada.status).toBe(201)
    if (criada.status !== 201) return
    expect(criada.data.customerName).toBe('MARIA HELENA ARQUITETURA ME')

    const daMatriz = await listWorks({ page: 1, pageSize: 50 })
    expect(daMatriz.status === 200 && daMatriz.data.rows.map((o) => o.id)).toContain(criada.data.id)

    // E NÃO aparece para a outra empresa: é o recorte funcionando na escrita,
    // não só na leitura.
    await authSetActiveTenant({ tenantId: TENANT_FILIAL })
    const daFilial = await listWorks({ page: 1, pageSize: 50 })
    expect(daFilial.status === 200 && daFilial.data.rows.map((o) => o.id)).not.toContain(
      criada.data.id,
    )
  })

  it('o `PUT` é INTEGRAL: o que o corpo não trouxer é apagado', async () => {
    // A regra mais cara do contrato, e a que o mock precisa reproduzir para a
    // tela aprender a devolver o que não edita.
    await entrar()
    const resposta = await updateWork('obra-0001', {
      customerId: 'parc-0002',
      description: 'APARTAMENTO IBIRAPUERA 142',
      active: true,
    })

    expect(resposta.status).toBe(200)
    if (resposta.status !== 200) return
    expect(resposta.data.address).toBeNull()
    expect(resposta.data.workType).toBeNull()
  })

  it('escrita sem empresa ativa é 409 — falta uma ESCOLHA, não um campo', async () => {
    await authLogin({ email: 'admin@vertz.dev', password: 'qualquer' })
    const resposta = await createWork({
      customerId: 'parc-0002',
      description: 'SEM EMPRESA',
      active: true,
    })
    expect(resposta.status).toBe(409)
  })
})

describe('contato — dado de ORGANIZAÇÃO, com acesso pelo vínculo', () => {
  it('lista os contatos do parceiro, ativos e inativos', async () => {
    // Inativo entra na LEITURA de propósito: quem some do combo continua
    // legível na grade e no documento antigo que o citou. Quem filtra é a tela.
    await entrar()
    const resposta = await listPartnerContacts('parc-0001', { page: 1, pageSize: 50 })

    expect(resposta.status).toBe(200)
    if (resposta.status !== 200) return
    expect(resposta.data.total).toBe(3)
    expect(resposta.data.rows.filter((c) => c.active)).toHaveLength(2)
  })

  it('parceiro sem vínculo com a empresa ativa é 404, mesmo tendo contato', async () => {
    // O contato É do cadastro (organização) — e é justamente por isso que este
    // caso existe: sem a checagem de vínculo, a matriz leria o contato do
    // parceiro que só a filial atende.
    await entrar()
    expect((await listPartnerContacts('parc-0003')).status).toBe(404)

    await authSetActiveTenant({ tenantId: TENANT_FILIAL })
    const daFilial = await listPartnerContacts('parc-0003')
    expect(daFilial.status).toBe(200)
    expect(daFilial.status === 200 && daFilial.data.rows.map((c) => c.name)).toEqual([
      'RECEPÇÃO HORIZONTE',
    ])
  })

  it('o contato incluído aparece na grade daquele parceiro, e só dele', async () => {
    await entrar()
    const criado = await createPartnerContact('parc-0002', {
      name: 'JOÃO PEDRO',
      role: 'ESTAGIÁRIO',
      active: true,
    })

    expect(criado.status).toBe(201)
    if (criado.status !== 201) return

    const doParceiro = await listPartnerContacts('parc-0002')
    expect(doParceiro.status === 200 && doParceiro.data.rows.map((c) => c.id)).toEqual([
      criado.data.id,
    ])
    const doOutro = await listPartnerContacts('parc-0001')
    expect(doOutro.status === 200 && doOutro.data.rows.map((c) => c.id)).not.toContain(
      criado.data.id,
    )
  })

  it('alterar contato de OUTRO parceiro é 404 — o caminho não mente sobre o dono', async () => {
    // Casar só pelo id do contato deixaria `PUT /partners/A/contacts/{de-B}`
    // gravar no cadastro do vizinho, e o caminho inteiro passaria a mentir.
    await entrar()
    const resposta = await updatePartnerContact('parc-0002', 'contato-0001', {
      name: 'SEQUESTRADO',
      active: true,
    })
    expect(resposta.status).toBe(404)
  })

  it('desativar é o que existe no lugar de excluir', async () => {
    await entrar()
    const resposta = await updatePartnerContact('parc-0001', 'contato-0002', {
      name: 'PAULO RENNÓ',
      active: false,
    })

    expect(resposta.status).toBe(200)
    if (resposta.status !== 200) return
    expect(resposta.data.active).toBe(false)
    // `PUT` integral: o que não veio no corpo foi apagado, e o mock apaga de
    // verdade — é o que torna a regra visível no navegador.
    expect(resposta.data.email).toBeNull()

    const grade = await listPartnerContacts('parc-0001')
    expect(grade.status === 200 && grade.data.total).toBe(3)
  })

  it('contato sem nome é 400 — não identifica ninguém', async () => {
    await entrar()
    const resposta = await createPartnerContact('parc-0001', { name: '', active: true })
    expect(resposta.status).toBe(400)
  })
})
