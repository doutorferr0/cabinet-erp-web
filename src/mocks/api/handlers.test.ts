import { configurarApi } from '@/api/cliente'
import {
  authLogin,
  authLogout,
  authMe,
  authSetActiveTenant,
  createPartner,
  createProduct,
  createStockMovement,
  getProduct,
  listProducts,
  listStockMovements,
} from '@/api/gerado'
import { data } from '@/data'
import type { FiltroDaTabela, OperadorDeFiltro } from '@/lib/filtro-de-consulta'
import { tableState } from '@/test/utils'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { handlers } from './handlers'
import { TENANT_MATRIZ, resetStore } from './store'

/**
 * Trava as SEMÂNTICAS do modo mock — não o dado do seed.
 *
 * O mock é o "backend" das telas enquanto o backend Node não existe, e estas
 * semânticas são as de `docs/integracao.md`: se o mock divergir delas, as telas
 * treinam contra um servidor errado e a re-integração cobra depois. Exercita
 * pelo CLIENTE GERADO, não por fetch cru — o caminho inteiro que a tela usa.
 */

const servidor = setupServer(...handlers)

beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }))
afterEach(() => servidor.resetHandlers())
afterAll(() => servidor.close())

beforeEach(() => {
  resetStore()
  configurarApi('http://mock.teste')
})

async function entrarComEmpresa() {
  await authLogin({ email: 'admin@vertz.dev', password: 'qualquer' })
  await authSetActiveTenant({ tenantId: TENANT_MATRIZ })
}

describe('sessão', () => {
  it('login abre a sessão, logout fecha — /auth/me conta a verdade', async () => {
    expect((await authMe()).status).toBe(401)

    const login = await authLogin({ email: 'admin@vertz.dev', password: 'qualquer' })
    expect(login.status).toBe(200)
    expect((await authMe()).status).toBe(200)

    await authLogout()
    expect((await authMe()).status).toBe(401)
  })

  it('senha "temporaria" liga mustChangePassword — o fluxo da guarda existe no mock', async () => {
    await authLogin({ email: 'admin@vertz.dev', password: 'temporaria' })
    const sessao = await authMe()
    expect(sessao.status).toBe(200)
    if (sessao.status === 200) expect(sessao.data.mustChangePassword).toBe(true)
  })
})

describe('empresa ativa', () => {
  it('sem empresa o domínio responde VAZIO, não erro', async () => {
    await authLogin({ email: 'admin@vertz.dev', password: 'qualquer' })
    const resposta = await listProducts({ page: 1, pageSize: 10 })
    expect(resposta.status).toBe(200)
    if (resposta.status === 200) {
      expect(resposta.data).toEqual({ rows: [], total: 0 })
    }
  })
})

describe('contrato de listagem', () => {
  it('pagina 1-based e devolve total COM o filtro', async () => {
    await entrarComEmpresa()

    const tudo = await listProducts({ page: 1, pageSize: 2 })
    expect(tudo.status).toBe(200)
    if (tudo.status === 200) {
      expect(tudo.data.rows).toHaveLength(2)
      expect(tudo.data.total).toBe(3)
    }

    const filtrado = await listProducts({ q: 'pendente', page: 1, pageSize: 10 })
    if (filtrado.status === 200) {
      expect(filtrado.data.total).toBe(1)
      expect(filtrado.data.rows[0]?.code).toBe('PD-1001')
    }
  })

  it('pageSize acima do teto de 100 é 400, não truncagem silenciosa', async () => {
    await entrarComEmpresa()
    const resposta = await listProducts({ page: 1, pageSize: 101 })
    expect(resposta.status).toBe(400)
  })

  it('sortBy fora da whitelist é 400', async () => {
    await entrarComEmpresa()
    const resposta = await listProducts({ page: 1, pageSize: 10, sortBy: 'paymentTerms' })
    expect(resposta.status).toBe(400)
  })
})

/**
 * O FILTRO ESTRUTURADO CHEGA E É APLICADO — o buraco que o PR #114 achou.
 *
 * Antes disto, `filters` saía da tela, chegava aqui e era DESCARTADO em
 * silêncio: a listagem devolvia tudo enquanto o painel da tela mostrava a
 * condição aplicada. Em `cabinetonline.cc`, que roda em modo mock, o operador
 * lia "Ativo é não" e via a lista inteira, com os ativos dentro.
 *
 * Os testes passam pela FRONTEIRA de verdade (`data.produtos.list`), e não pelo
 * cliente gerado direto: o `filters` do contrato viaja como array JSON
 * url-encoded, montado por `filtrosDaTabela`, e a serialização que o Orval faria
 * de um array de params é OUTRA. Testar pelo caminho que a tela não usa provaria
 * o que ninguém executa.
 */
describe('filtro estruturado do servidor falso', () => {
  function condicao(
    id: string,
    operador: OperadorDeFiltro,
    valor: string,
    variante: 'text' | 'boolean' = 'text',
  ): FiltroDaTabela {
    return { filtroId: `f-${id}`, id, variante, operador, valor }
  }

  it('produtos: a condição RECORTA a lista, e o total conta o recorte', async () => {
    await entrarComEmpresa()

    const tudo = await data.produtos.list(tableState({ pageSize: 50 }))
    expect(tudo.total).toBe(3)

    const so1042 = await data.produtos.list(
      tableState({ pageSize: 50, filtros: [condicao('code', 'iLike', 'PD-')] }),
    )
    expect(so1042.total, 'total tem de contar o RECORTE, não a lista inteira').toBe(1)
    expect(so1042.rows[0]?.code).toBe('PD-1001')
  })

  it('produtos: booleano recorta os inativos — o caso que o operador vê no ar', async () => {
    await entrarComEmpresa()

    const inativos = await data.produtos.list(
      tableState({ pageSize: 50, filtros: [condicao('active', 'eq', 'false', 'boolean')] }),
    )
    expect(inativos.rows.every((p) => !p.active)).toBe(true)
    expect(inativos.total).toBe(1)
  })

  it('parceiros: duas condições se somam com AND, e `or` muda a resposta', async () => {
    await entrarComEmpresa()

    const e = await data.clientes.list(
      tableState({
        pageSize: 50,
        filtros: [condicao('legalName', 'iLike', 'MARIA'), condicao('code', 'iLike', 'C-9')],
      }),
    )
    expect(e.total, 'AND de duas condições que ninguém atende junto').toBe(0)

    const ou = await data.clientes.list(
      tableState({
        pageSize: 50,
        juncao: 'or',
        filtros: [condicao('legalName', 'iLike', 'MARIA'), condicao('code', 'iLike', 'C-9')],
      }),
    )
    expect(ou.total, 'OR devolve quem atende UMA delas').toBe(1)
  })

  it('parceiros: o filtro se soma ao `q`, não o substitui', async () => {
    await entrarComEmpresa()

    const so_q = await data.clientes.list(tableState({ q: 'maria', pageSize: 50 }))
    expect(so_q.total).toBe(1)

    const q_mais_filtro = await data.clientes.list(
      tableState({
        q: 'maria',
        pageSize: 50,
        filtros: [condicao('code', 'iLike', 'INEXISTENTE')],
      }),
    )
    expect(q_mais_filtro.total, '`q` e `filters` se somam com AND').toBe(0)
  })

  it('campo fora da whitelist é 400 do SERVIDOR, não filtro ignorado', async () => {
    await entrarComEmpresa()

    // A fronteira barra antes de sair (é o desenho), então para provar o 400 do
    // servidor a requisição precisa ser montada aqui, como um cliente qualquer.
    const url = `http://mock.teste/api/products?page=1&pageSize=10&filters=${encodeURIComponent(
      JSON.stringify([{ field: 'paymentTerms', operator: 'iLike', value: 'x' }]),
    )}`
    const resposta = await fetch(url)
    expect(resposta.status).toBe(400)
    expect((await resposta.json()).detail).toContain('Campo não filtrável')
  })

  it('operador fora do vocabulário é 400 — antes passava TUDO em silêncio', async () => {
    await entrarComEmpresa()

    // Achado escrevendo estes testes: `contains` não existe no vocabulário (o
    // nome é `iLike`), e a condição com ele não recortava nada — a listagem
    // devolvia os 3 produtos como se não houvesse filtro. Mesmo sintoma do
    // parâmetro descartado, uma camada abaixo.
    const url = `http://mock.teste/api/products?page=1&pageSize=10&filters=${encodeURIComponent(
      JSON.stringify([{ field: 'code', operator: 'contains', value: 'PD-' }]),
    )}`
    const resposta = await fetch(url)
    expect(resposta.status).toBe(400)
    expect((await resposta.json()).detail).toContain('Operador inválido')
  })

  it('o parceiro filtra por `parentId` — a hierarquia sai por `filters`', async () => {
    await entrarComEmpresa()

    // O contrato publica `parentId` nas DUAS whitelists do parceiro, e é a
    // decisão que ele tomou quando recusou `/api/partners/{id}/children`. O mock
    // não tinha o campo em nenhuma das duas: a tela desenha a coluna e manda a
    // condição, e aqui vinha 400 — só aqui, porque contra o `:3000` funciona.
    const comFiltro = async (valor: string) =>
      fetch(
        `http://mock.teste/api/partners?pageSize=100&filters=${encodeURIComponent(
          JSON.stringify([{ field: 'parentId', operator: 'eq', value: valor }]),
        )}`,
      )

    const inexistente = await comFiltro('parc-9999')
    expect(inexistente.status).toBe(200)
    // Zero, e não a lista inteira: é o que separa "filtrou" de "aceitou e
    // ignorou" — um 200 sozinho não distingue os dois.
    expect(((await inexistente.json()) as { total: number }).total).toBe(0)

    const ordenado = await fetch('http://mock.teste/api/partners?sortBy=parentId&pageSize=100')
    expect(ordenado.status).toBe(200)
  })

  it('recurso que NÃO publica `filters` recusa em voz alta', async () => {
    await entrarComEmpresa()

    // `/api/catalog-lookups` não tem o parâmetro no contrato. Aceitar calado
    // devolveria a lista inteira para quem pediu um recorte.
    const url = `http://mock.teste/api/catalog-lookups?page=1&pageSize=10&filters=${encodeURIComponent(
      JSON.stringify([{ field: 'name', operator: 'iLike', value: 'x' }]),
    )}`
    const resposta = await fetch(url)
    expect(resposta.status).toBe(400)
    expect((await resposta.json()).detail).toContain('não publica o parâmetro filters')
  })
})

describe('409 de documento repetido', () => {
  it('carrega existingPartnerId — o membro de extensão que a tela usa', async () => {
    await entrarComEmpresa()
    const resposta = await createPartner({
      legalName: 'OUTRA RAZAO SOCIAL',
      tradeName: null,
      document: '11222333000144',
      email: null,
      isCustomer: false,
      isSupplier: true,
      isProfessional: false,
      code: null,
      paymentTerms: null,
      active: true,
    })
    expect(resposta.status).toBe(409)
    const corpo = resposta.data as { existingPartnerId?: string }
    expect(corpo.existingPartnerId).toBe('parc-0001')
  })
})

describe('kardex — o saldo é derivado do movimento (ADR-009)', () => {
  it('movimento muda o saldo e devolve balanceAfter; saldo negativo é 409', async () => {
    await entrarComEmpresa()

    const saida = await createStockMovement('var-0001', { delta: -2, reason: 'venda' })
    expect(saida.status).toBe(201)
    if (saida.status === 201) expect(saida.data.balanceAfter).toBe(10)

    const entrada = await createStockMovement('var-0001', { delta: 5, reason: 'compra' })
    if (entrada.status === 201) expect(entrada.data.balanceAfter).toBe(15)

    const invalido = await createStockMovement('var-0001', { delta: -999, reason: 'ajuste' })
    expect(invalido.status).toBe(409)

    const extrato = await listStockMovements('var-0001', { page: 1, pageSize: 10 })
    expect(extrato.status).toBe(200)
    if (extrato.status === 200) expect(extrato.data.total).toBe(2)
  })
})

describe('grades do produto — fornecedores (§6.1) e relacionados (§6.4)', () => {
  it('o DETALHE emite as duas, com o padrão único e a quantidade que separa kit de sugestão', async () => {
    await entrarComEmpresa()

    const detalhe = await getProduct('prod-0001')
    expect(detalhe.status).toBe(200)
    if (detalhe.status !== 200) return

    const fornecedores = detalhe.data.suppliers ?? []
    expect(fornecedores).toHaveLength(2)
    // O padrão é UM: é ele que o documento de compra carimba sem perguntar, e
    // dois padrões fariam o carimbo depender da ordem da lista.
    expect(fornecedores.filter((f) => f.isDefault)).toHaveLength(1)
    const padrao = fornecedores.find((f) => f.isDefault)
    expect(padrao?.supplierId, 'a grade aponta para o PARCEIRO fornecedor').toBe('parc-0001')
    expect(padrao?.supplierCode).toBe('EV-PEND-30F')
    // `null` é dado, não ausência: fornecedor que não batiza a peça deixa a
    // coluna em branco, e a tela não pode confundir isso com "não carregou".
    expect(fornecedores.find((f) => !f.isDefault)?.supplierDescription).toBeNull()

    const relacionados = detalhe.data.relatedProducts ?? []
    expect(relacionados).toHaveLength(2)
    // A QUANTIDADE é o discriminador — não há campo de tipo ao lado.
    const kits = relacionados.filter((r) => r.quantity !== null)
    const sugestoes = relacionados.filter((r) => r.quantity === null)
    expect(kits).toHaveLength(1)
    expect(kits[0]?.quantity, 'decimal em string, 3 casas').toBe('2.000')
    expect(kits[0]?.relatedProductCode, 'código e descrição vêm juntos').toBe('AR-2001')
    expect(sugestoes).toHaveLength(1)
    // Ordem do DADO, não da tela.
    expect(relacionados.map((r) => r.sortOrder)).toEqual([1, 2])
  })

  it('vazio ≠ ausente: produto sem grade devolve `[]`, e produto novo também', async () => {
    await entrarComEmpresa()

    // O contrato distingue os dois: ausente é "o servidor não serve a grade",
    // `[]` é "não há linha". O mock SERVE, então nunca omite.
    const semGrade = await getProduct('prod-0003')
    if (semGrade.status === 200) {
      expect(semGrade.data.suppliers).toEqual([])
      expect(semGrade.data.relatedProducts).toEqual([])
    }

    const criado = await createProduct({
      code: 'PD-9001',
      description: 'PRODUTO NOVO DO ENSAIO',
      active: true,
    })
    expect(criado.status).toBe(201)
    if (criado.status !== 201) return
    // A ESCRITA devolve `ProductDto` — sem grade nenhuma, que é o que o
    // contrato declara para o `POST`.
    expect(criado.data).not.toHaveProperty('suppliers')
    expect(criado.data).not.toHaveProperty('variants')

    const novo = await getProduct(criado.data.id)
    if (novo.status === 200) {
      expect(novo.data.suppliers, 'o detalhe do recém-criado serve as grades vazias').toEqual([])
      expect(novo.data.relatedProducts).toEqual([])
    }
  })
})
