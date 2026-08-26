import { configurarApi } from '@/api/cliente'
import {
  authLogin,
  authSetActiveTenant,
  cancelOrder,
  concludeOrder,
  createOrder,
  createOrderFromQuote,
  getOrder,
  listOrderParticipants,
  listOrderProfessionalHistory,
  listOrders,
  returnDemoOrder,
  transferOrderProfessional,
  updateOrder,
} from '@/api/gerado'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { handlers } from './handlers'
import { resetObras } from './obras'
import { resetPedidos } from './pedidos'
import { resetQuotes } from './quotes'
import { TENANT_MATRIZ, resetStore, store } from './store'

/**
 * O PEDIDO DE VENDA no servidor falso — o módulo que faltava inteiro.
 *
 * **A tela existia e o mock não.** `src/features/vendas/` monta a listagem, a
 * folha e as ações do ciclo desde a leva do G13, e `/api/orders` não tinha
 * handler nenhum: medido pela fonte, o mock servia só três sub-caminhos de
 * entrega (`fulfillment`, `release`, `pick`, da PR do quadro de cargas). As
 * onze operações do documento saíam para a origem, e a SPA respondia
 * `index.html` com status 200 — em `cabinetonline.cc`, que é 100% mock, o item
 * `Vendas › Pedidos` do menu levava a uma tela que não carregava.
 *
 * Os testes da tela não pegavam isso, e a razão vale guardar: eles montam
 * servidor próprio (`instalarServidor`) e nunca exercitam esta lista. Verde ali
 * mede a tela contra o contrato; o que ninguém media era o SERVIDOR que o site
 * público usa.
 *
 * ## O que esta bateria mede
 *
 * Não é "o handler responde 200" — é o que ele **RECUSA**, e o que ele DERIVA.
 * Mock que aceita o que o servidor recusa é pior que mock ausente: ensina à
 * tela um caminho que só falha em produção, e o site público o demonstra como
 * se funcionasse.
 */

const servidor = setupServer(...handlers)

beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }))
afterEach(() => servidor.resetHandlers())
afterAll(() => servidor.close())

beforeEach(async () => {
  resetStore()
  resetQuotes()
  resetObras()
  resetPedidos()
  configurarApi('http://mock.teste')
  await authLogin({ email: 'admin@vertz.dev', password: 'qualquer' })
  await authSetActiveTenant({ tenantId: TENANT_MATRIZ })
})

/** Os quatro do seed que cada caso usa pelo estado, não pela ordem da lista. */
const ATIVO = 'ped-21606'
const CONCLUIDO = 'ped-21608'
const CANCELADO = 'ped-21609'
const DEMONSTRACAO = 'ped-21610'
/**
 * O seed da §8.1 alterna documento COM e SEM grade (`i % 3 === 0` nasce vazio),
 * e o pedido herda isso da conversão. Os casos que medem itens e ambientes
 * apontam para este, e não para o `ATIVO` — asserção sobre coleção vazia passa
 * por vacuidade e não protege nada.
 */
const COM_GRADE = 'ped-21607'

function corpoMinimo(over: Record<string, unknown> = {}) {
  return {
    customerId: 'cli-0001',
    discountMode: 'product',
    discountPercent: 0,
    environments: [],
    items: [],
    ...over,
  }
}

/** O corpo de um `PUT` que não muda nada — a foto do documento como ele está. */
async function corpoDeReescrita(id: string, over: Record<string, unknown> = {}) {
  const atual = await getOrder(id)
  if (atual.status !== 200) throw new Error('leitura falhou')
  return {
    series: atual.data.series,
    issuedAt: atual.data.issuedAt,
    customerId: atual.data.customerId,
    projectName: atual.data.projectName,
    folderNumber: atual.data.folderNumber,
    discountMode: atual.data.discountMode,
    discountPercent: atual.data.discountPercent,
    environments: atual.data.environments,
    items: atual.data.items,
    ...over,
  }
}

describe('a listagem existe no modo mock', () => {
  it('responde com o seed — que é o caso que não existia', async () => {
    const r = await listOrders()

    expect(r.status).toBe(200)
    if (r.status !== 200) return
    expect(r.data.total).toBe(6)
    // O seed cobre os três estados e os dois tipos: sem isso, quatro caminhos
    // da tela não teriam nada para exercitar na demo pública.
    const situacoes = new Set(r.data.rows.map((p) => p.status))
    expect([...situacoes].sort()).toEqual(['active', 'cancelled', 'concluded'])
    expect(r.data.rows.some((p) => p.type === 'demo')).toBe(true)
  })

  it('a procedência do seed é REAL: cinco vieram de orçamento, um foi lançado direto', async () => {
    const r = await listOrders({ pageSize: 100 })
    if (r.status !== 200) throw new Error('listagem falhou')

    const comOrigem = r.data.rows.filter((p) => p.quoteId !== null)
    expect(comOrigem).toHaveLength(5)
    // O elo aponta para orçamento que EXISTE. Um `quoteId` inventado deixaria a
    // folha mostrando "veio do orçamento" com um número que não abre.
    const folha = await getOrder(comOrigem[0]?.id ?? '')
    if (folha.status !== 200) throw new Error('leitura falhou')
    expect(folha.data.quoteNumber).toBeTruthy()
  })

  it('`sortBy` fora da whitelist é 400 — a lista não volta em outra ordem, ela não volta', async () => {
    const r = await listOrders({ sortBy: 'totalCents' })

    expect(r.status).toBe(400)
  })
})

describe('o filtro de vocabulário fechado', () => {
  it('`status` recorta de verdade', async () => {
    const r = await listOrders({
      filters: JSON.stringify([{ field: 'status', operator: 'eq', value: 'cancelled' }]),
    } as never)

    expect(r.status).toBe(200)
    if (r.status !== 200) return
    expect(r.data.total).toBe(1)
    expect(r.data.rows[0]?.id).toBe(CANCELADO)
  })

  it('valor fora do enum é 400, e NÃO lista vazia', async () => {
    // O operador diria "cancelado", em português. Lista vazia com a condição
    // desenhada no painel é indistinguível de "não há nenhum" — que é
    // exatamente o que o contrato manda impedir.
    const r = await listOrders({
      filters: JSON.stringify([{ field: 'status', operator: 'eq', value: 'cancelado' }]),
    } as never)

    expect(r.status).toBe(400)
  })
})

describe('`salespersonId` é LEITURA do atendente principal', () => {
  it('a folha resolve o consultor pela participação, não por um campo próprio', async () => {
    const folha = await getOrder(ATIVO)
    const participacao = await listOrderParticipants(ATIVO)
    if (folha.status !== 200 || participacao.status !== 200) throw new Error('leitura falhou')

    const principal = participacao.data.rows.find((p) => p.role === 'attendant' && p.isPrincipal)
    expect(principal).toBeDefined()
    // Os dois lados do MESMO dado. Se divergirem, a tela mostra um nome no
    // campo e outro na grade, e nenhum dos dois é conferível.
    expect(folha.data.salespersonId).toBe(principal?.employeeId)
    expect(folha.data.salespersonName).toBe(principal?.employeeName)
  })

  it('o `salespersonId` da CRIAÇÃO vira a participação, e volta pela leitura dela', async () => {
    const criado = await createOrder(corpoMinimo({ salespersonId: 'emp-0002' }) as never)
    if (criado.status !== 201) throw new Error('criação falhou')

    expect(criado.data.salespersonId).toBe('emp-0002')
    const participacao = await listOrderParticipants(criado.data.id)
    if (participacao.status !== 200) throw new Error('leitura falhou')
    const principal = participacao.data.rows.find((p) => p.role === 'attendant' && p.isPrincipal)
    expect(principal?.employeeId).toBe('emp-0002')
    // UM por papel, no máximo — o contrato recusa dois principais.
    expect(
      participacao.data.rows.filter((p) => p.role === 'attendant' && p.isPrincipal),
    ).toHaveLength(1)
  })

  it('documento sem atendente principal responde `null`, e não escolhe um', async () => {
    const criado = await createOrder(corpoMinimo() as never)
    if (criado.status !== 201) throw new Error('criação falhou')

    // Venda de balcão sem consultor é caso legítimo. "O primeiro da lista"
    // inventaria um responsável — e responsável é quem recebe comissão.
    expect(criado.data.salespersonId).toBeNull()
    expect(criado.data.salespersonName).toBeNull()
  })
})

describe('o documento encerrado não se reescreve', () => {
  it('`PUT` em pedido CONCLUÍDO é 409, não 400', async () => {
    const corpo = await corpoDeReescrita(CONCLUIDO)

    const r = await updateOrder(CONCLUIDO, corpo as never)

    expect(r.status).toBe(409)
  })

  it('`PUT` em pedido CANCELADO é 409', async () => {
    const corpo = await corpoDeReescrita(CANCELADO)

    const r = await updateOrder(CANCELADO, corpo as never)

    expect(r.status).toBe(409)
  })

  it('trocar o TIPO no `PUT` é 409 — demonstração e venda movimentam estoque diferente', async () => {
    const corpo = await corpoDeReescrita(ATIVO, { type: 'demo', demoDueDate: '2026-01-01' })

    const r = await updateOrder(ATIVO, corpo as never)

    expect(r.status).toBe(409)
  })
})

describe('o `PUT` NÃO move o profissional', () => {
  it('o corpo que manda outro profissional não troca a indicação', async () => {
    const antes = await getOrder(ATIVO)
    if (antes.status !== 200) throw new Error('leitura falhou')
    const outro = store.parceiros.find((p) => p.isProfessional)
    expect(outro).toBeDefined()

    const corpo = await corpoDeReescrita(ATIVO, { professionalId: outro?.id })
    const depois = await updateOrder(ATIVO, corpo as never)

    expect(depois.status).toBe(200)
    if (depois.status !== 200) return
    // A troca tem data e trilha, e quem a faz é `POST .../professional`. Deixar
    // o `PUT` reescrever apagaria a vigência sem dizer — e a comissão passaria
    // a ser paga a quem não indicou.
    expect(depois.data.professionalId).toBe(antes.data.professionalId)
  })
})

describe('o ciclo da demonstração', () => {
  it('concluir com a peça na rua é 409 `demonstracao-em-aberto`', async () => {
    const r = await concludeOrder(DEMONSTRACAO)

    expect(r.status).toBe(409)
    if (r.status !== 409) return
    // URN PRÓPRIA, e não a de transição: esta recusa tem saída (registrar o
    // retorno) e a outra não tem nenhuma. A tela usa a diferença para dizer
    // onde está o botão.
    expect(r.data.type).toBe('urn:cabinet:erro:demonstracao-em-aberto')
  })

  it('depois do retorno, conclui — e o retorno NÃO conclui sozinho', async () => {
    const retorno = await returnDemoOrder(DEMONSTRACAO)

    expect(retorno.status).toBe(200)
    if (retorno.status !== 200) return
    expect(retorno.data.demoReturnedAt).not.toBeNull()
    // Demonstração que voltou pode virar venda; concluir é decisão de quem
    // vendeu, não consequência de a peça ter voltado.
    expect(retorno.data.status).toBe('active')

    const concluido = await concludeOrder(DEMONSTRACAO)
    expect(concluido.status).toBe(200)
    if (concluido.status !== 200) return
    expect(concluido.data.status).toBe('concluded')
    // Carimba `closedAt` quando ela está nula — o `FrmFecha_projeto` do legado.
    expect(concluido.data.closedAt).not.toBeNull()
  })

  it('registrar retorno duas vezes é 409', async () => {
    await returnDemoOrder(DEMONSTRACAO)

    const segunda = await returnDemoOrder(DEMONSTRACAO)

    expect(segunda.status).toBe(409)
  })

  it('pedido de VENDA não tem retorno a registrar — 409', async () => {
    const r = await returnDemoOrder(ATIVO)

    expect(r.status).toBe(409)
  })

  it('a demonstração exige prazo, e a venda o proíbe — as duas são 400', async () => {
    const semPrazo = await createOrder(corpoMinimo({ type: 'demo' }) as never)
    expect(semPrazo.status).toBe(400)

    const prazoNaVenda = await createOrder(corpoMinimo({ demoDueDate: '2026-01-01' }) as never)
    expect(prazoNaVenda.status).toBe(400)
  })
})

describe('a conclusão e o cancelamento', () => {
  it('concluir duas vezes é 409 — `concluded` é terminal', async () => {
    await concludeOrder(ATIVO)

    const segunda = await concludeOrder(ATIVO)

    expect(segunda.status).toBe(409)
  })

  it('cancelar guarda motivo, nota e data — e resolve o NOME na leitura', async () => {
    const r = await cancelOrder(ATIVO, {
      reasonId: 'lk-MOTIVO_CANCELAMENTO-2',
      note: 'cliente fechou com o concorrente',
    })

    expect(r.status).toBe(200)
    if (r.status !== 200) return
    expect(r.data.status).toBe('cancelled')
    expect(r.data.cancelReasonName).toBe('PREÇO')
    expect(r.data.cancelNote).toBe('cliente fechou com o concorrente')
    expect(r.data.cancelledAt).not.toBeNull()
  })

  it('cancelar duas vezes é 409, e o motivo do primeiro FICA', async () => {
    await cancelOrder(ATIVO, { reasonId: 'lk-MOTIVO_CANCELAMENTO-2', note: 'o primeiro' })

    const segunda = await cancelOrder(ATIVO, {
      reasonId: 'lk-MOTIVO_CANCELAMENTO-1',
      note: 'o segundo',
    })

    expect(segunda.status).toBe(409)
    const folha = await getOrder(ATIVO)
    if (folha.status !== 200) throw new Error('leitura falhou')
    expect(folha.data.cancelNote).toBe('o primeiro')
  })

  it('motivo de OUTRA lista é 400 — quem separa motivo de marca é o `kind`', async () => {
    const r = await cancelOrder(ATIVO, { reasonId: 'lk-MARCA-1' })

    expect(r.status).toBe(400)
  })
})

describe('a transferência da indicação', () => {
  it('parceiro sem o papel `professional` é 400 apontando o campo', async () => {
    const semPapel = store.parceiros.find((p) => !p.isProfessional)
    expect(semPapel).toBeDefined()

    const r = await transferOrderProfessional(ATIVO, { professionalId: semPapel?.id ?? null })

    expect(r.status).toBe(400)
  })

  it('transferir para o MESMO é 409 — vigência de duração zero não é trilha', async () => {
    const folha = await getOrder(ATIVO)
    if (folha.status !== 200) throw new Error('leitura falhou')

    const r = await transferOrderProfessional(ATIVO, {
      professionalId: folha.data.professionalId ?? null,
    })

    expect(r.status).toBe(409)
  })

  it('a transferência fecha a vigência corrente, abre outra e leva a PARTICIPAÇÃO junto', async () => {
    const novo = store.parceiros.find((p) => p.isProfessional)
    expect(novo).toBeDefined()

    const r = await transferOrderProfessional(ATIVO, {
      professionalId: novo?.id ?? null,
      note: 'cliente pediu troca de especificador',
    })

    expect(r.status).toBe(200)
    if (r.status !== 200) return
    expect(r.data.professionalId).toBe(novo?.id)

    const trilha = await listOrderProfessionalHistory(ATIVO)
    if (trilha.status !== 200) throw new Error('leitura falhou')
    // UMA linha aberta, e é ela que casa com `professionalId` do documento — se
    // as duas divergirem, a trilha mente.
    const abertas = trilha.data.rows.filter((l) => l.endedAt === null)
    expect(abertas).toHaveLength(1)
    expect(abertas[0]?.professionalId).toBe(novo?.id)
    expect(trilha.data.rows.filter((l) => l.endedAt !== null)).toHaveLength(1)

    const participacao = await listOrderParticipants(ATIVO)
    if (participacao.status !== 200) throw new Error('leitura falhou')
    const principal = participacao.data.rows.find((p) => p.role === 'professional' && p.isPrincipal)
    // A grade acompanha: deixá-la para trás pagaria a Reserva Técnica a quem saiu.
    expect(principal?.partnerId).toBe(novo?.id)
  })

  it('documento encerrado não troca de dono — 409', async () => {
    const novo = store.parceiros.find((p) => p.isProfessional)

    const r = await transferOrderProfessional(CANCELADO, { professionalId: novo?.id ?? null })

    expect(r.status).toBe(409)
  })
})

describe('a conversão do orçamento em pedido', () => {
  it('copia o documento e liga a procedência nos dois sentidos', async () => {
    // `orc-0006` não está entre os cinco que o seed já converteu.
    const r = await createOrderFromQuote('orc-0006')

    expect(r.status).toBe(201)
    if (r.status !== 201) return
    expect(r.data.quoteId).toBe('orc-0006')
    expect(r.data.quoteNumber).toBeTruthy()
    // O número é do SERVIDOR e é NOVO: converter cria um documento, não renomeia
    // o que já existia.
    expect(r.data.number).not.toBe(r.data.quoteNumber)
    expect(r.data.items.length).toBeGreaterThan(0)
  })

  it('a cópia é PROFUNDA — esvaziar o pedido não mexe no orçamento assinado', async () => {
    const { getQuote } = await import('@/api/gerado')
    const pedido = await createOrderFromQuote('orc-0006')
    if (pedido.status !== 201) throw new Error('conversão falhou')
    expect(pedido.data.items.length).toBeGreaterThan(0)

    const corpo = await corpoDeReescrita(pedido.data.id, { environments: [], items: [] })
    await updateOrder(pedido.data.id, corpo as never)

    // Compartilhar o array faria o `PUT` do pedido apagar a grade do documento
    // que o cliente já assinou — e sem erro em lugar nenhum.
    const orcamento = await getQuote('orc-0006')
    if (orcamento.status !== 200) throw new Error('leitura falhou')
    expect(orcamento.data.items.length).toBeGreaterThan(0)
  })

  it('converter duas vezes é 409 — pedido em duplicata sai como compra dobrada', async () => {
    await createOrderFromQuote('orc-0006')

    const segunda = await createOrderFromQuote('orc-0006')

    expect(segunda.status).toBe(409)
    if (segunda.status !== 409) return
    expect(segunda.data.type).toBe('urn:cabinet:erro:pedido-ja-convertido')
  })

  it('orçamento CANCELADO não vira pedido', async () => {
    const { cancelQuote } = await import('@/api/gerado')
    await cancelQuote('orc-0007', {})

    const r = await createOrderFromQuote('orc-0007')

    expect(r.status).toBe(409)
  })
})

describe('o que é do servidor não vem do cliente', () => {
  it('o NÚMERO é atribuído aqui, e a sequência anda', async () => {
    const primeiro = await createOrder(corpoMinimo() as never)
    const segundo = await createOrder(corpoMinimo() as never)
    if (primeiro.status !== 201 || segundo.status !== 201) throw new Error('criação falhou')

    expect(Number(segundo.data.number)).toBe(Number(primeiro.data.number) + 1)
  })

  it('o TOTAL é calculado dos itens, não recebido', async () => {
    const criado = await createOrder(
      corpoMinimo({
        items: [
          {
            lineNumber: 1,
            description: 'PENDENTE ESFERA',
            quantity: 3,
            unitPriceCents: 25000,
            discountPercent: 0,
          },
        ],
      }) as never,
    )

    expect(criado.status).toBe(201)
    if (criado.status !== 201) return
    expect(criado.data.totalCents).toBe(75000)
  })

  it('o `PUT` é INTEGRAL: ambiente que não vier no corpo, o documento perde', async () => {
    const antes = await getOrder(COM_GRADE)
    if (antes.status !== 200) throw new Error('leitura falhou')
    expect(antes.data.environments.length).toBeGreaterThan(0)

    const corpo = await corpoDeReescrita(COM_GRADE, { environments: [], items: [] })
    const depois = await updateOrder(COM_GRADE, corpo as never)

    expect(depois.status).toBe(200)
    if (depois.status !== 200) return
    expect(depois.data.environments).toEqual([])
  })
})
