import { configurarApi } from '@/api/cliente'
import {
  authLogin,
  authSetActiveTenant,
  createService,
  getQuote,
  listServices,
  updateQuote,
  updateService,
} from '@/api/gerado'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { handlers } from './handlers'
import { resetQuotes } from './quotes'
import { TENANT_FILIAL, TENANT_MATRIZ, resetStore, store } from './store'

/**
 * O MOCK DOS SERVIÇOS — o cadastro e a aba do documento (contrato S2).
 *
 * Trava as SEMÂNTICAS, não o dado do seed. As que este arquivo existe para
 * provar são as que somem em silêncio se ninguém as cobrar:
 *
 * 1. **O cadastro é POR EMPRESA**, e sem empresa ativa a LEITURA DE LISTA é
 *    vazia enquanto a ESCRITA é 409 — a assimetria do contrato inteiro.
 * 2. **`electricianPercent` da linha HERDA do cadastro quando é `null`, e `0` é
 *    override.** É a única regra desta entrega que o cliente não consegue
 *    aplicar sozinho, e a distinção `null` × `0` é toda a razão de o campo ser
 *    nulável na escrita e não-nulável na leitura.
 * 3. **A emissão CONGELA.** Alterar o cadastro depois não reescreve documento —
 *    é o que já vale para o produto, e o que faria o orçamento do ano passado
 *    mudar de valor sozinho se não valesse.
 * 4. **O total do documento soma as DUAS coleções.** Um total que olha só os
 *    produtos esconde a instalação, que é linha de `VendaServico` no legado.
 *
 * Exercita pelo CLIENTE GERADO, e não por `fetch` cru — é o caminho inteiro que
 * a tela vai usar quando houver tela.
 */

const servidor = setupServer(...handlers)

beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }))
afterEach(() => servidor.resetHandlers())
afterAll(() => servidor.close())

beforeEach(() => {
  resetStore()
  resetQuotes()
  configurarApi('http://mock.teste')
})

async function entrar(tenantId = TENANT_MATRIZ) {
  await authLogin({ email: 'admin@vertz.dev', password: 'qualquer' })
  await authSetActiveTenant({ tenantId })
}

const CORPO_BASE = {
  code: 'MONT-TRILHO',
  description: 'MONTAGEM DE TRILHO',
  priceCents: 15_000,
  electricianPercent: 300_000,
  type: 'INSTALACAO',
  installationMinutes: 30,
  nfseCode: '7.02',
  productGroup: 'SERVIÇOS',
  priceLocked: false,
  delivery: false,
  active: true,
}

describe('o cadastro de serviços é da EMPRESA', () => {
  it('a listagem mostra só os serviços da empresa ativa', async () => {
    await entrar()
    const lista = await listServices({ page: 1, pageSize: 100 })

    expect(lista.status).toBe(200)
    if (lista.status !== 200) return
    expect(lista.data.rows.map((s) => s.code)).toEqual([
      'INST-LUM',
      'PROJ-LUM',
      'FRETE',
      'RETRABALHO',
    ])
  })

  it('empresa sem serviço nenhum responde lista vazia, e não erro', async () => {
    await entrar(TENANT_FILIAL)
    const lista = await listServices({ page: 1, pageSize: 100 })

    expect(lista.status).toBe(200)
    if (lista.status === 200) expect(lista.data.total).toBe(0)
  })

  it('sem empresa ativa a LEITURA é vazia e a ESCRITA é 409', async () => {
    await entrar()
    store.activeTenantId = null

    const lista = await listServices({ page: 1, pageSize: 10 })
    expect(lista.status).toBe(200)
    if (lista.status === 200) expect(lista.data.total).toBe(0)

    // "Sem empresa" não é erro de formulário: o pedido está bem formado e falta
    // uma ESCOLHA da pessoa.
    const criado = await createService(CORPO_BASE)
    expect(criado.status).toBe(409)
  })

  it('sortBy fora da whitelist é 400', async () => {
    await entrar()
    const lista = await listServices({ sortBy: 'electricianPercent', page: 1, pageSize: 10 })

    expect(lista.status).toBe(400)
  })

  it('ordena preço como NÚMERO, não como texto', async () => {
    await entrar()
    const lista = await listServices({ sortBy: 'priceCents', page: 1, pageSize: 100 })

    expect(lista.status).toBe(200)
    if (lista.status !== 200) return
    // Como texto, '12000' viria antes de '8000' — e o cadastro mostraria a
    // instalação como mais barata que o frete.
    expect(lista.data.rows.map((s) => s.priceCents)).toEqual([0, 8_000, 12_000, 95_000])
  })

  it('código repetido na empresa é 409', async () => {
    await entrar()
    const criado = await createService({ ...CORPO_BASE, code: 'INST-LUM' })

    expect(criado.status).toBe(409)
  })

  it('o PUT substitui o registro INTEIRO — campo ausente APAGA', async () => {
    await entrar()
    const alterado = await updateService('serv-0001', {
      code: 'INST-LUM',
      description: 'INSTALAÇÃO DE LUMINÁRIA',
      priceCents: 12_000,
      electricianPercent: 400_000,
      priceLocked: false,
      delivery: false,
      active: true,
    })

    expect(alterado.status).toBe(200)
    if (alterado.status !== 200) return
    // `nfseCode`, `type` e `installationMinutes` não vieram no corpo: o
    // documento perde o que o corpo não trouxe, e não preserva o que estava.
    expect(alterado.data.nfseCode).toBeNull()
    expect(alterado.data.type).toBeNull()
    expect(alterado.data.installationMinutes).toBeNull()
  })

  it('não existe DELETE — desativar é `active: false`, e a linha continua na lista', async () => {
    await entrar()
    const lista = await listServices({ page: 1, pageSize: 100 })

    expect(lista.status).toBe(200)
    if (lista.status !== 200) return
    // O serviço inativo do seed continua visível: quem some da lista some
    // também dos documentos que o referenciam.
    expect(lista.data.rows.find((s) => s.code === 'RETRABALHO')?.active).toBe(false)
  })
})

describe('a aba Serviços do documento', () => {
  it('vem sempre — vazia quando o orçamento não tem serviço', async () => {
    await entrar()
    const semServico = await getQuote('orc-0002')

    expect(semServico.status).toBe(200)
    if (semServico.status === 200) expect(semServico.data.serviceItems).toEqual([])
  })

  it('o total do documento soma as DUAS coleções', async () => {
    await entrar()
    const comServico = await getQuote('orc-0001')
    const semServico = await getQuote('orc-0002')

    expect(comServico.status).toBe(200)
    expect(semServico.status).toBe(200)
    if (comServico.status !== 200 || semServico.status !== 200) return
    // 4 × R$ 120,00 = R$ 480,00 de instalação, dentro do total do documento.
    expect(comServico.data.serviceItems[0]?.totalCents).toBe(48_000)
    expect(comServico.data.totalCents).toBeGreaterThan(
      comServico.data.items.reduce((soma, i) => soma + i.totalCents, 0),
    )
  })

  it('`electricianPercent` null HERDA do cadastro; 0 é override', async () => {
    await entrar()
    const atual = await getQuote('orc-0001')
    expect(atual.status).toBe(200)
    if (atual.status !== 200) return

    const corpo = {
      customerId: atual.data.customerId,
      discountMode: atual.data.discountMode,
      discountPercent: atual.data.discountPercent,
      environments: atual.data.environments,
      items: [],
      serviceItems: [
        {
          lineNumber: 1,
          environmentCode: null,
          serviceId: 'serv-0001',
          description: 'INSTALAÇÃO DE LUMINÁRIA',
          quantity: 2,
          unitPriceCents: 12_000,
          discountPercent: 0,
          // `null` = "use o que o cadastro diz".
          electricianPercent: null,
        },
        {
          lineNumber: 2,
          environmentCode: null,
          serviceId: 'serv-0001',
          description: 'INSTALAÇÃO — CORTESIA',
          quantity: 1,
          unitPriceCents: 12_000,
          discountPercent: 0,
          // `0` = "esta linha NÃO paga instalador". Não é a mesma coisa que
          // omitir, e é por isso que o campo é nulável.
          electricianPercent: 0,
        },
      ],
    }
    const gravado = await updateQuote('orc-0001', corpo)

    expect(gravado.status).toBe(200)
    if (gravado.status !== 200) return
    const [herdada, cortesia] = gravado.data.serviceItems
    expect(herdada?.electricianPercent).toBe(400_000)
    expect(herdada?.electricianAmountCents).toBe(9_600)
    expect(cortesia?.electricianPercent).toBe(0)
    expect(cortesia?.electricianAmountCents).toBe(0)
  })

  it('a emissão CONGELA: alterar o cadastro não reescreve documento fechado', async () => {
    await entrar()
    const alterado = await updateService('serv-0001', {
      ...CORPO_BASE,
      code: 'INST-LUM',
      description: 'INSTALAÇÃO (NOVO NOME)',
      priceCents: 99_000,
      electricianPercent: 10_000,
    })
    expect(alterado.status).toBe(200)

    const depois = await getQuote('orc-0001')
    expect(depois.status).toBe(200)
    if (depois.status !== 200) return
    const linha = depois.data.serviceItems[0]
    expect(linha?.description).toBe('INSTALAÇÃO DE LUMINÁRIA')
    expect(linha?.unitPriceCents).toBe(12_000)
    expect(linha?.electricianPercent).toBe(400_000)
  })

  it('o PUT sem `serviceItems` APAGA a aba — ausente é vazio, não "preserva"', async () => {
    await entrar()
    const atual = await getQuote('orc-0001')
    expect(atual.status).toBe(200)
    if (atual.status !== 200) return
    expect(atual.data.serviceItems).toHaveLength(1)

    await updateQuote('orc-0001', {
      customerId: atual.data.customerId,
      discountMode: atual.data.discountMode,
      discountPercent: atual.data.discountPercent,
      environments: atual.data.environments,
      items: [],
    })

    const depois = await getQuote('orc-0001')
    expect(depois.status).toBe(200)
    if (depois.status === 200) expect(depois.data.serviceItems).toEqual([])
  })
})
