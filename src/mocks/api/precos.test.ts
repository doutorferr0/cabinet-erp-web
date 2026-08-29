import { configurarApi } from '@/api/cliente'
import {
  authLogin,
  authSetActiveTenant,
  createCostProfile,
  createPriceIndex,
  listCostProfiles,
  listPriceIndexes,
  listVariantTablePrices,
  replaceVariantTablePrices,
  simulateCostProfile,
  updatePriceIndex,
} from '@/api/gerado'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { handlers } from './handlers'
import { resetPrecos } from './precos'
import { TENANT_MATRIZ, resetStore } from './store'

/**
 * O MOCK DE PREÇO (G9 · #379) — o que ele guarda e o que ele RECUSA.
 *
 * Trava as semânticas, não o dado do seed. As que este arquivo existe para
 * provar são as que somem em silêncio se ninguém as cobrar:
 *
 * 1. **A simulação responde 501, e responde por decisão.** É a linha inteira
 *    deste mock: cadastro ele guarda, apuração ele recusa. Um dia alguém
 *    "conserta" isto devolvendo um `CostSimulationDto` de zeros, e a partir daí
 *    a tela mostra margem inventada com cara de apuração — que é exatamente o
 *    que `rotas-do-backend.ts` escreveu para não acontecer.
 * 2. **O `PUT` de tabelas SUBSTITUI a lista inteira.** Um mock que fizesse
 *    merge deixaria a tela passar aqui e apagar preço no servidor real.
 * 3. **Um índice por fornecedor.** Dois ativos fariam o preço depender de qual
 *    linha a consulta encontrasse primeiro.
 * 4. **O perfil tem de ser do MESMO fornecedor.** Apontar para o de outro
 *    precificaria a peça com o desconto que ninguém negociou para ela.
 * 5. **`viewer` não escreve preço.** O contrato exige `precos:gerenciar`, que
 *    nenhum template de fábrica concede.
 *
 * Exercita pelo CLIENTE GERADO, e não por `fetch` cru — é o caminho inteiro que
 * a aba usa.
 */

const servidor = setupServer(...handlers)

beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }))
afterEach(() => servidor.resetHandlers())
afterAll(() => servidor.close())

beforeEach(() => {
  resetStore()
  resetPrecos()
  configurarApi('http://mock.teste')
})

async function entrar(tenantId = TENANT_MATRIZ) {
  await authLogin({ email: 'admin@vertz.dev', password: 'qualquer' })
  await authSetActiveTenant({ tenantId })
}

const EVOLED = 'parc-0001'
const MISTER_LED = 'parc-0006'
/** A variante do seed com DUAS tabelas — a que prova a chave (variante×fornecedor). */
const VAR_DOIS_FORNECEDORES = 'var-0001'
/** A variante do seed SEM tabela — o vazio honesto de uma peça recém-cadastrada. */
const VAR_SEM_TABELA = 'var-0002'
const PERFIL_EVOLED = 'cst-0001'

/**
 * Estreita a união do cliente gerado pelo STATUS — é como o resto do repo faz.
 *
 * As respostas do Orval são `{status, data}` discriminadas: sem estreitar, `data`
 * é `ProblemDetails | T` e todo acesso a campo do DTO é erro de tipo. `throw` em
 * vez de `expect` porque o caso que chegou aqui já falhou por outro motivo, e a
 * mensagem do status diz mais do que um `undefined` três linhas abaixo.
 */
function corpo<T>(resposta: { status: number; data: unknown }, esperado = 200): T {
  if (resposta.status !== esperado) {
    throw new Error(`esperava ${esperado}, veio ${resposta.status}`)
  }
  return resposta.data as T
}

describe('a simulação de margem RECUSA, e é a linha deste mock', () => {
  it('responde 501 `nao-implementado`, não um extrato de zeros', async () => {
    await entrar()

    const resposta = await simulateCostProfile(PERFIL_EVOLED, { tablePriceCents: 74_180 })

    expect(resposta.status).toBe(501)
    // A URN importa tanto quanto o status: é por ela que o backend real e este
    // mock dizem a MESMA coisa, e é o que faz `ehModuloEmConstrucao` acender o
    // aviso certo em vez do bloco genérico de falha.
    expect((resposta.data as { type?: string }).type).toBe('urn:cabinet:erro:nao-implementado')
  })

  it('mas ainda confere se o perfil existe — 404 antes de 501', async () => {
    await entrar()

    // A ordem importa: um 501 para perfil inexistente diria ao operador "o
    // servidor não faz isso" quando o problema é o id que ele mandou.
    const resposta = await simulateCostProfile('cst-que-nao-existe', { tablePriceCents: 100 })

    expect(resposta.status).toBe(404)
  })
})

describe('tabela de preço do fornecedor', () => {
  it('devolve uma linha por fornecedor da variante', async () => {
    await entrar()

    const resposta = await listVariantTablePrices(VAR_DOIS_FORNECEDORES)

    const linhas = corpo<{ supplierId: string }[]>(resposta)
    expect(linhas).toHaveLength(2)
    expect(linhas.map((l) => l.supplierId).sort()).toEqual([EVOLED, MISTER_LED].sort())
  })

  it('variante sem tabela devolve lista VAZIA, não 404', async () => {
    await entrar()

    // Peça sem preço cadastrado é estado normal. 404 mandaria a tela dizer que
    // a variante não existe, quando ela existe e só não tem preço.
    const resposta = await listVariantTablePrices(VAR_SEM_TABELA)

    expect(resposta.status).toBe(200)
    expect(resposta.data).toEqual([])
  })

  it('variante que não existe é 404', async () => {
    await entrar()

    const resposta = await listVariantTablePrices('var-inexistente')

    expect(resposta.status).toBe(404)
  })

  it('o `supplierCode` vem da grade de fornecedores do produto, não do corpo', async () => {
    await entrar()

    // O `PUT` não recebe `supplierCode`: é junção, e o servidor a resolve do
    // `ProductSupplierDto`. Se o mock a guardasse do corpo, a tela poderia
    // gravar um código que o cadastro do produto desmente.
    await replaceVariantTablePrices(VAR_DOIS_FORNECEDORES, {
      prices: [{ supplierId: EVOLED, tablePriceCents: 90_000 }],
    })
    const resposta = await listVariantTablePrices(VAR_DOIS_FORNECEDORES)

    expect(corpo<{ supplierCode: string }[]>(resposta)[0]?.supplierCode).toBe('EV-PEND-30F')
  })

  it('o `PUT` SUBSTITUI a lista — fornecedor fora do corpo SAI', async () => {
    await entrar()

    await replaceVariantTablePrices(VAR_DOIS_FORNECEDORES, {
      prices: [{ supplierId: EVOLED, tablePriceCents: 90_000 }],
    })
    const resposta = await listVariantTablePrices(VAR_DOIS_FORNECEDORES)

    const linhas = corpo<{ supplierId: string; tablePriceCents: number }[]>(resposta)
    expect(linhas).toHaveLength(1)
    expect(linhas[0]?.supplierId).toBe(EVOLED)
    expect(linhas[0]?.tablePriceCents).toBe(90_000)
  })

  it('lista vazia APAGA todas as tabelas da variante', async () => {
    await entrar()

    // O caso extremo da regra acima, e o que a tela avisa em voz alta: excluir
    // todas as linhas e gravar apaga o preço no servidor.
    await replaceVariantTablePrices(VAR_DOIS_FORNECEDORES, { prices: [] })
    const resposta = await listVariantTablePrices(VAR_DOIS_FORNECEDORES)

    expect(resposta.data).toEqual([])
  })

  it('o mesmo fornecedor duas vezes é 409, não "o último vence"', async () => {
    await entrar()

    const resposta = await replaceVariantTablePrices(VAR_DOIS_FORNECEDORES, {
      prices: [
        { supplierId: EVOLED, tablePriceCents: 10_000 },
        { supplierId: EVOLED, tablePriceCents: 20_000 },
      ],
    })

    expect(resposta.status).toBe(409)
  })

  it('preço negativo é 400 com o campo apontado', async () => {
    await entrar()

    const resposta = await replaceVariantTablePrices(VAR_DOIS_FORNECEDORES, {
      prices: [{ supplierId: EVOLED, tablePriceCents: -1 }],
    })

    expect(resposta.status).toBe(400)
    expect((resposta.data as { fields?: { path: string }[] }).fields?.[0]?.path).toContain(
      'tablePriceCents',
    )
  })

  it('`viewer` não grava preço — 403 `papel-insuficiente`', async () => {
    // O contrato exige `precos:gerenciar`, ação que nenhum template de fábrica
    // concede. Quem vende usa o preço; quem o define responde pela margem.
    await entrar('tenant-filial')

    const resposta = await replaceVariantTablePrices(VAR_DOIS_FORNECEDORES, {
      prices: [{ supplierId: EVOLED, tablePriceCents: 1 }],
    })

    expect(resposta.status).toBe(403)
    expect((resposta.data as { type?: string }).type).toBe('urn:cabinet:erro:papel-insuficiente')
  })
})

describe('índice de venda', () => {
  it('lista os dois casos do seed, com e sem perfil', async () => {
    await entrar()

    const resposta = await listPriceIndexes({ page: 1, pageSize: 50 })

    const pagina = corpo<{
      rows: { supplierId: string; costProfileId: string | null; indexValue: number }[]
      total: number
    }>(resposta)
    expect(pagina.total).toBe(2)
    const semPerfil = pagina.rows.find((l) => l.supplierId === MISTER_LED)
    // `null` é caso REAL e não pendência: fornecedor sem cascata e sem crédito
    // existe às dezenas, e ali o líquido É o preço de tabela.
    expect(semPerfil?.costProfileId).toBeNull()
    expect(semPerfil?.indexValue).toBe(10_000)
  })

  it('o segundo índice do mesmo fornecedor é 409', async () => {
    await entrar()

    const resposta = await createPriceIndex({ supplierId: EVOLED, indexValue: 30_000 })

    expect(resposta.status).toBe(409)
  })

  it('índice zero é 400 — `10000` (1,0000) é o piso, e ele é válido', async () => {
    await entrar()

    // Zero não é "sem índice": seria vender de graça. Quem quer o líquido de
    // compra cadastra `10000`, que é 1,0000 e é aceito — o caso da MISTER LED
    // no seed, e o blocker nº 1 do ETL.
    const resposta = await updatePriceIndex('idx-0001', { supplierId: EVOLED, indexValue: 0 })

    expect(resposta.status).toBe(400)
    expect((resposta.data as { fields?: { path: string }[] }).fields?.[0]?.path).toBe('indexValue')
  })

  it('perfil de OUTRO fornecedor é 400 com o campo apontado', async () => {
    await entrar()

    // O perfil `cst-0001` é da EVOLED; apontar o índice da MISTER LED para ele
    // precificaria a peça dela com o desconto que ninguém negociou.
    const resposta = await updatePriceIndex('idx-0002', {
      supplierId: MISTER_LED,
      indexValue: 20_000,
      costProfileId: PERFIL_EVOLED,
    })

    expect(resposta.status).toBe(400)
    expect((resposta.data as { fields?: { path: string }[] }).fields?.[0]?.path).toBe(
      'costProfileId',
    )
  })

  it('o `PUT` substitui a linha INTEIRA — omitir `costProfileId` DESLIGA o perfil', async () => {
    await entrar()

    await updatePriceIndex('idx-0001', { supplierId: EVOLED, indexValue: 25_600 })
    const resposta = await listPriceIndexes({ page: 1, pageSize: 50 })

    const pagina = corpo<{ rows: { supplierId: string; costProfileId: string | null }[] }>(resposta)
    const evoled = pagina.rows.find((l) => l.supplierId === EVOLED)
    expect(evoled?.costProfileId).toBeNull()
  })

  it('`sortBy` fora da whitelist é 400 `ordenacao-invalida`', async () => {
    await entrar()

    // O site público é 100% mock: whitelist menor aqui é coluna que ordena
    // contra o `:3000` e responde 400 na demo.
    const resposta = await listPriceIndexes({ page: 1, pageSize: 50, sortBy: 'indexValor' })

    expect(resposta.status).toBe(400)
    expect((resposta.data as { type?: string }).type).toBe('urn:cabinet:erro:ordenacao-invalida')
  })
})

describe('perfil de custo', () => {
  it('filtra por `supplierId`, que não cabe em `q`', async () => {
    await entrar()

    const dele = await listCostProfiles({ page: 1, pageSize: 50, supplierId: EVOLED })
    const doOutro = await listCostProfiles({ page: 1, pageSize: 50, supplierId: MISTER_LED })

    expect(corpo<{ total: number }>(dele).total).toBe(1)
    expect(corpo<{ total: number }>(doOutro).total).toBe(0)
  })

  it('o mesmo fornecedor pode ter VÁRIOS perfis com nomes diferentes', async () => {
    await entrar()

    // "ILUMINAR", "ILUMINAR ESPECIAL" e "ILUMINAR PREÇO 2" são condições
    // comerciais distintas no legado, não duplicatas.
    const resposta = await createCostProfile({ supplierId: EVOLED, name: 'EVOLED ESPECIAL' })

    expect(resposta.status).toBe(201)
    const lista = await listCostProfiles({ page: 1, pageSize: 50, supplierId: EVOLED })
    expect(corpo<{ total: number }>(lista).total).toBe(2)
  })

  it('o mesmo NOME no mesmo fornecedor é 409', async () => {
    await entrar()

    const resposta = await createCostProfile({ supplierId: EVOLED, name: 'EVOLED PADRÃO' })

    expect(resposta.status).toBe(409)
  })

  it('percentual ausente nasce ZERO — `PUT` não preserva o anterior', async () => {
    await entrar()

    const criado = await createCostProfile({
      supplierId: MISTER_LED,
      name: 'SEM CASCATA',
    })

    const perfil = corpo<{ discount1Percent: number; ipiPercent: number; active: boolean }>(
      criado,
      201,
    )
    expect(perfil.discount1Percent).toBe(0)
    expect(perfil.ipiPercent).toBe(0)
    // `active` é a exceção declarada: ausente = `true`, porque perfil nasce
    // valendo e desativar é gesto explícito.
    expect(perfil.active).toBe(true)
  })
})

describe('sessão', () => {
  it('sem empresa ativa a LISTAGEM devolve vazio, nunca erro', async () => {
    await authLogin({ email: 'admin@vertz.dev', password: 'qualquer' })

    const resposta = await listPriceIndexes({ page: 1, pageSize: 50 })

    expect(resposta.status).toBe(200)
    expect(resposta.data).toEqual({ rows: [], total: 0 })
  })

  it('sem sessão é 401', async () => {
    const resposta = await listVariantTablePrices(VAR_DOIS_FORNECEDORES)

    expect(resposta.status).toBe(401)
  })
})
