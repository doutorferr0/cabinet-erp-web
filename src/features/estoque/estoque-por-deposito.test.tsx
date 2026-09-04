import type { StockBalanceDto, StockLocationDto, StockMovementDto } from '@/api/gerado'
import { saldosDoDeposito, somaDosSaldos } from '@/data/estoque-api'
import { type Rota, instalarServidor, json, problema } from '@/test/servidor'
import { renderRoute, respostaSessao, respostaVinculos } from '@/test/utils'
import { screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * A tela de estoque POR DEPÓSITO, contra servidor falso e pelo cliente gerado.
 *
 * O que estes testes travam:
 *
 * 1. O saldo aparece uma linha POR DEPÓSITO, com o NOME resolvido de
 *    `ListStockLocations` — as duas respostas de estoque só trazem `locationId`,
 *    e a junção é da tela.
 * 2. O filtro de depósito recorta o saldo e o TOTAL junto. Total que não
 *    acompanha o recorte é a mentira clássica de relatório paginado.
 * 3. O kardex ganhou a coluna Depósito, e ela NÃO é filtrada pelo mesmo
 *    seletor — a grade é paginada pelo servidor, e recortar a página corrente
 *    diria "3 movimentos" onde há 300.
 * 4. Nenhuma das três chamadas manda `locationId` na query: o contrato não
 *    publica o parâmetro, e mandá-lo daria 400 no servidor real enquanto o mock
 *    o ignorava em silêncio.
 */

const PRINCIPAL: StockLocationDto = {
  id: 'dep-1',
  parentId: null,
  code: 'PRINCIPAL',
  name: 'DEPÓSITO PRINCIPAL',
  isDefault: true,
  active: true,
}

const SHOWROOM: StockLocationDto = {
  id: 'dep-2',
  parentId: null,
  code: 'SHOWROOM',
  name: 'SHOWROOM CENTRO',
  isDefault: false,
  active: true,
}

const SALDOS: StockBalanceDto[] = [
  { locationId: 'dep-1', variantId: 'var-1', qty: 12, updatedAt: '2026-08-01T12:00:00.000Z' },
  { locationId: 'dep-2', variantId: 'var-1', qty: 3, updatedAt: '2026-08-02T09:30:00.000Z' },
]

const MOVIMENTOS: StockMovementDto[] = [
  {
    id: 'mov-1',
    variantId: 'var-1',
    locationId: 'dep-1',
    delta: 12,
    balanceAfter: 12,
    reason: 'Carga inicial',
    occurredAt: '2026-08-01T12:00:00.000Z',
    employeeId: null,
  },
  {
    id: 'mov-2',
    variantId: 'var-1',
    locationId: 'dep-2',
    delta: 3,
    balanceAfter: 3,
    reason: 'Transferência para a vitrine',
    occurredAt: '2026-08-02T09:30:00.000Z',
    employeeId: null,
  },
]

const PRODUTO = {
  id: 'prod-1',
  code: 'PD-1001',
  description: 'PENDENTE VIDRO FUMÊ 30CM',
  active: true,
}

function servidor(sobrepoe: Record<string, Rota> = {}) {
  return instalarServidor({
    '/auth/me': () => respostaSessao(),
    '/auth/tenants': () => respostaVinculos(),
    '/api/catalog-lookups': () => json({ rows: [], total: 0 }),
    '/api/products': () => json({ rows: [PRODUTO], total: 1 }),
    '/api/products/prod-1': () =>
      json({
        ...PRODUTO,
        variants: [
          {
            id: 'var-1',
            finish: 'PRETO FOSCO',
            size: '30CM',
            active: true,
            priceCents: 189900,
            stockQty: 15,
            minStock: 2,
          },
        ],
      }),
    '/api/stock-locations': () => json({ rows: [PRINCIPAL, SHOWROOM], total: 2 }),
    '/api/variants/var-1/stock-balances': () => json({ rows: SALDOS, total: SALDOS.length }),
    '/api/variants/var-1/stock-movements': () =>
      json({ rows: MOVIMENTOS, total: MOVIMENTOS.length }),
    ...sobrepoe,
  })
}

/**
 * A tabela de SALDO é a primeira da tela; a do KARDEX, a segunda.
 *
 * O escopo importa: o nome do depósito aparece nos dois lugares MAIS no
 * `<option>` do seletor, e uma asserção sobre o documento inteiro não distingue
 * "está na grade de saldo" de "está na lista de escolha".
 */
async function tabelaDeSaldo(): Promise<HTMLElement> {
  const tabelas = await screen.findAllByRole('table')
  return tabelas[0] as HTMLElement
}

async function tabelaDoKardex(): Promise<HTMLElement> {
  const tabelas = await screen.findAllByRole('table')
  return tabelas[1] as HTMLElement
}

/** Escolhe o produto pela janela de busca e a única variante dele. */
async function escolherAPeca(user: ReturnType<typeof renderRoute>['user']) {
  await user.click(await screen.findByRole('button', { name: 'Buscar produto' }))
  // A janela de busca (§9 padrão 5) pede DOIS gestos: marcar a linha e
  // confirmar. Clicar só na linha deixa o dialog aberto sobre a tela.
  await user.click(await screen.findByText('PD-1001'))
  await user.click(screen.getByRole('button', { name: 'Selecionar' }))
  const variante = await screen.findByRole('combobox', { name: /variante/i })
  await user.selectOptions(variante, 'var-1')
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('estoque por depósito', () => {
  it('mostra o saldo uma linha por depósito, com o nome resolvido', async () => {
    const falso = servidor()
    const { user } = renderRoute('/estoque/movimentacao', falso.fetch)
    await escolherAPeca(user)

    // O NOME, não o uuid: a junção com `ListStockLocations` é o serviço que a
    // tela presta, e é ela que este teste vigia.
    const saldo = await tabelaDeSaldo()
    await within(saldo).findByText('DEPÓSITO PRINCIPAL')
    expect(within(saldo).getByText('SHOWROOM CENTRO')).toBeInTheDocument()
    expect(within(saldo).getByText('12')).toBeInTheDocument()
    expect(within(saldo).getByText('3')).toBeInTheDocument()
    expect(screen.getByText(/Total na empresa/)).toHaveTextContent('15')
  })

  it('o filtro de depósito recorta o saldo E o total', async () => {
    const falso = servidor()
    const { user } = renderRoute('/estoque/movimentacao', falso.fetch)
    await escolherAPeca(user)
    await within(await tabelaDeSaldo()).findByText('SHOWROOM CENTRO')

    await user.selectOptions(screen.getByRole('combobox', { name: /depósito/i }), 'dep-2')

    // A linha do PRINCIPAL sai da tabela de saldo — mas o nome continua na tela,
    // porque o seletor de depósito o lista. Por isso a asserção é sobre a
    // TABELA de saldo, não sobre o documento inteiro.
    const saldo = await tabelaDeSaldo()
    expect(within(saldo).getByText('SHOWROOM CENTRO')).toBeInTheDocument()
    expect(within(saldo).queryByText('DEPÓSITO PRINCIPAL')).toBeNull()
    expect(screen.getByText(/Total no depósito/)).toHaveTextContent('3')
  })

  it('o kardex tem coluna de depósito, e o filtro do saldo NÃO o recorta', async () => {
    const falso = servidor()
    const { user } = renderRoute('/estoque/movimentacao', falso.fetch)
    await escolherAPeca(user)

    const kardex = await tabelaDoKardex()
    await within(kardex).findByText('Carga inicial')
    expect(within(kardex).getByRole('columnheader', { name: 'Depósito' })).toBeInTheDocument()
    expect(within(kardex).getByText('Transferência para a vitrine')).toBeInTheDocument()
    // O nome do depósito resolvido também na grade do kardex, linha a linha.
    expect(within(kardex).getByText('SHOWROOM CENTRO')).toBeInTheDocument()

    await user.selectOptions(screen.getByRole('combobox', { name: /depósito/i }), 'dep-2')

    // Os DOIS movimentos continuam: a grade é paginada pelo servidor, e o
    // recorte da página seria um número que a tela não pode afirmar.
    const depois = await tabelaDoKardex()
    expect(within(depois).getByText('Carga inicial')).toBeInTheDocument()
    expect(within(depois).getByText('Transferência para a vitrine')).toBeInTheDocument()
  })

  it('nenhuma consulta de ESTOQUE manda locationId — as duas não publicam o parâmetro', async () => {
    const falso = servidor()
    const { user } = renderRoute('/estoque/movimentacao', falso.fetch)
    await escolherAPeca(user)
    await within(await tabelaDeSaldo()).findByText('SHOWROOM CENTRO')
    await user.selectOptions(screen.getByRole('combobox', { name: /depósito/i }), 'dep-2')

    // A asserção é sobre as DUAS operações de estoque, e não sobre a tela
    // inteira: `ListStockBalances` e `ListStockMovements` não publicam
    // `locationId`, e mandá-lo daria 400 no servidor e verde no mock.
    const deEstoque = falso.chamadas.filter((c) => c.caminho.startsWith('/api/variants/'))
    expect(deEstoque.filter((c) => c.url.includes('locationId'))).toEqual([])

    // A consulta de REPOSIÇÃO é outra história, e por isso o filtro acima não
    // pode varrer o documento inteiro: `GetPurchaseStockReplenishment` publica
    // `locationId`, e é dela que saem os cartões de reservado e disponível. Um
    // teste que proibisse o parâmetro em toda chamada travaria o recorte legítimo
    // do único número que a tela sabe recortar por depósito.
    const reposicao = falso.em('/api/purchases/stock-replenishment')
    expect(reposicao.some((c) => c.url.includes('locationId=dep-2'))).toBe(true)
  })
})

describe('saldo que não chegou', () => {
  /**
   * "NÃO ACHEI" NÃO PODE SAIR COMO "NUNCA EXISTIU".
   *
   * O ternário da tela ia de `isPending` direto para `linhas.length === 0`, e o vazio
   * dali afirma o PASSADO — "esta variante nunca esteve em depósito nenhum" — para uma
   * peça que pode estar em três. Quem procura a peça conclui que ela nunca entrou e
   * cadastra de novo o que já está no galpão.
   */
  /*
   * 409 e não 500, e a escolha é do PRODUTO, não do teste: `repetirSeValeAPena` só
   * repete 5xx e rede fora — 4xx é a resposta do servidor SOBRE o pedido e nunca se
   * repete. Com 500 o erro só chegaria à tela depois de três esperas crescentes (~7s),
   * e o teste mediria a política de repetição em vez do estado da folha. O 409 aqui é
   * caso real: é o que o contrato responde quando não há empresa ativa na sessão.
   */
  it('a falha da consulta não vira "nunca esteve em depósito nenhum"', async () => {
    const falso = servidor({
      '/api/variants/var-1/stock-balances': () => problema(409, 'Nenhuma empresa ativa na sessão.'),
    })
    const { user } = renderRoute('/estoque/movimentacao', falso.fetch)
    await escolherAPeca(user)

    expect(await screen.findByText('O saldo não carregou')).toBeInTheDocument()
    expect(screen.getByText('Nenhuma empresa ativa na sessão.')).toBeInTheDocument()
    expect(screen.queryByText(/nunca esteve em depósito nenhum/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/nunca esteve neste depósito/i)).not.toBeInTheDocument()
  })
})

describe('recorte do saldo (regra pura)', () => {
  it('sem depósito escolhido devolve tudo, e a soma é a da empresa', () => {
    expect(saldosDoDeposito(SALDOS, null)).toHaveLength(2)
    expect(somaDosSaldos(saldosDoDeposito(SALDOS, null))).toBe(15)
  })

  it('com depósito escolhido devolve só o dele', () => {
    expect(saldosDoDeposito(SALDOS, 'dep-2')).toEqual([SALDOS[1]])
    expect(somaDosSaldos(saldosDoDeposito(SALDOS, 'dep-2'))).toBe(3)
  })

  it('depósito sem linha é lista vazia — nunca uma linha zerada', () => {
    // Completar com zero afirmaria contagem que ninguém fez: um depósito que
    // nunca viu a peça diz outra coisa de um que a zerou.
    expect(saldosDoDeposito(SALDOS, 'dep-9')).toEqual([])
  })
})
