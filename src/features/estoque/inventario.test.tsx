import type { StockBalanceDto, StockLocationDto } from '@/api/gerado'
import {
  type ItemDaContagem,
  diferencaDoItem,
  limparContagem,
  resumoDaContagem,
} from '@/data/inventario-api'
import { contagemDoTexto } from '@/features/estoque/inventario'
import { type Rota, instalarServidor, json, problema } from '@/test/servidor'
import { renderRoute, respostaSessao, respostaVinculos } from '@/test/utils'
import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * O CICLO DO INVENTÁRIO, contra servidor falso e pelo cliente gerado.
 *
 * O que estes testes travam:
 *
 * 1. O ciclo inteiro — abrir por depósito, contar, ver a diferença, aplicar — e
 *    o ajuste sai como `CreateStockMovement` com o `delta` da diferença **no
 *    corpo**, não só com a tela dizendo que saiu. Asserir sobre o texto da tela
 *    deixaria passar um POST com `delta` trocado de sinal.
 * 2. Linha que bate com o sistema NÃO vira movimento. Kardex com movimento de
 *    zero é ruído que some do olho de quem procura o que mudou.
 * 3. Contar ZERO é contagem, e não linha em branco: a diferença é o saldo
 *    inteiro com sinal negativo.
 * 4. Saldo que mudou entre contar e aplicar — o `delta` sai contra o saldo de
 *    AGORA (senão o depósito não fica com o contado) e a tela nomeia a peça.
 * 5. O ajuste é do depósito da contagem: `locationId` viaja no corpo.
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

/** 12 no principal e 3 no showroom: o recorte por depósito é metade do teste. */
const SALDOS: StockBalanceDto[] = [
  { locationId: 'dep-1', variantId: 'var-1', qty: 12, updatedAt: '2026-08-01T12:00:00.000Z' },
  { locationId: 'dep-2', variantId: 'var-1', qty: 3, updatedAt: '2026-08-02T09:30:00.000Z' },
]

const PRODUTO = {
  id: 'prod-1',
  code: 'PD-1001',
  description: 'PENDENTE VIDRO FUMÊ 30CM',
  active: true,
}

const DETALHE = {
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
}

const VARIANTE = 'PRETO FOSCO · 30CM'

function servidor(sobrepoe: Record<string, Rota> = {}) {
  return instalarServidor({
    '/auth/me': () => respostaSessao(),
    '/auth/tenants': () => respostaVinculos(),
    '/api/catalog-lookups': () => json({ rows: [], total: 0 }),
    '/api/products': () => json({ rows: [PRODUTO], total: 1 }),
    '/api/products/prod-1': () => json(DETALHE),
    '/api/stock-locations': () => json({ rows: [PRINCIPAL, SHOWROOM], total: 2 }),
    '/api/variants/var-1/stock-balances': () => json({ rows: SALDOS, total: SALDOS.length }),
    ...sobrepoe,
  })
}

type Usuario = ReturnType<typeof renderRoute>['user']

/** Abre a contagem do depósito principal. */
async function abrirNoPrincipal(user: Usuario) {
  await user.selectOptions(await screen.findByRole('combobox', { name: /depósito/i }), 'dep-1')
  await user.click(screen.getByRole('button', { name: 'Abrir contagem' }))
}

/** Põe a peça na folha: busca, seleciona a linha e escolhe a variante. */
async function acrescentarAPeca(user: Usuario) {
  await user.click(await screen.findByRole('button', { name: /Adicionar peça/ }))
  await user.click(await screen.findByText('PD-1001'))
  await user.click(screen.getByRole('button', { name: 'Selecionar' }))
  await user.click(await screen.findByRole('button', { name: VARIANTE }))
}

async function contar(user: Usuario, quanto: string) {
  const campo = await screen.findByRole('textbox', { name: `Contado — PD-1001 ${VARIANTE}` })
  await user.clear(campo)
  if (quanto !== '') await user.type(campo, quanto)
}

async function aplicar(user: Usuario, motivo = 'Inventário de agosto') {
  await user.type(await screen.findByRole('textbox', { name: /motivo/i }), motivo)
  await user.click(screen.getByRole('button', { name: 'Aplicar ajuste' }))
}

/** O corpo dos POST de movimento, na ordem — é ele que prova o ajuste. */
function movimentosLancados(falso: ReturnType<typeof instalarServidor>) {
  return falso.chamadas
    .filter((c) => c.metodo === 'POST' && c.caminho === '/api/variants/var-1/stock-movements')
    .map((c) => c.corpo)
}

beforeEach(() => {
  limparContagem()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ciclo do inventário', () => {
  it('abre por depósito, conta, mostra a diferença e aplica como movimento', async () => {
    const falso = servidor({
      '/api/variants/var-1/stock-movements': () =>
        json(
          {
            id: 'mov-9',
            variantId: 'var-1',
            locationId: 'dep-1',
            delta: -2,
            balanceAfter: 10,
            reason: 'Inventário de agosto',
            occurredAt: '2026-08-28T10:00:00.000Z',
            employeeId: null,
          },
          201,
        ),
    })
    const { user } = renderRoute('/estoque/inventario', falso.fetch)

    await abrirNoPrincipal(user)
    await acrescentarAPeca(user)

    // O SISTEMA é o saldo DAQUELE depósito — 12 —, e não os 15 da variante
    // inteira. A folha do principal com o total da empresa acusaria falta de
    // três peças que estão no showroom.
    const folha = await screen.findByRole('table')
    expect(within(folha).getByText('12')).toBeInTheDocument()

    await contar(user, '10')
    expect(await screen.findByTestId('diferenca-var-1')).toHaveTextContent('-2')
    expect(screen.getByTestId('resumo-da-contagem')).toHaveTextContent('1 divergência')

    await aplicar(user)

    // O CORPO, não a tela: um POST com o sinal trocado passaria por qualquer
    // asserção sobre o texto do resultado.
    expect(movimentosLancados(falso)).toEqual([
      { locationId: 'dep-1', delta: -2, reason: 'Inventário de agosto' },
    ])
    expect(await screen.findByTestId('resultado-do-ajuste')).toHaveTextContent(
      '1 movimento lançado',
    )
  })

  it('linha que bate com o sistema não vira movimento', async () => {
    const falso = servidor()
    const { user } = renderRoute('/estoque/inventario', falso.fetch)

    await abrirNoPrincipal(user)
    await acrescentarAPeca(user)
    await contar(user, '12')

    expect(await screen.findByTestId('diferenca-var-1')).toHaveTextContent('0')
    await aplicar(user)

    // Nenhuma escrita: movimento de zero é ruído no kardex de quem procura o
    // que mudou.
    expect(movimentosLancados(falso)).toEqual([])
    expect(await screen.findByTestId('resultado-do-ajuste')).toHaveTextContent(
      '0 movimentos lançados',
    )
    expect(screen.getByTestId('resultado-do-ajuste')).toHaveTextContent('1 peça bateu')
  })

  it('contar ZERO é contagem, e tira o saldo inteiro', async () => {
    const falso = servidor({
      '/api/variants/var-1/stock-movements': () => json({ id: 'mov-9' }, 201),
    })
    const { user } = renderRoute('/estoque/inventario', falso.fetch)

    await abrirNoPrincipal(user)
    await acrescentarAPeca(user)
    await contar(user, '0')

    // Prateleira vazia diz outra coisa de "ainda não contei": a diferença é o
    // saldo inteiro com sinal, e não o traço da linha em branco.
    expect(await screen.findByTestId('diferenca-var-1')).toHaveTextContent('-12')
    await aplicar(user, 'Prateleira vazia')

    expect(movimentosLancados(falso)).toEqual([
      { locationId: 'dep-1', delta: -12, reason: 'Prateleira vazia' },
    ])
  })

  it('linha em branco não é contagem: sem diferença e sem movimento', async () => {
    const falso = servidor()
    const { user } = renderRoute('/estoque/inventario', falso.fetch)

    await abrirNoPrincipal(user)
    await acrescentarAPeca(user)

    expect(await screen.findByTestId('diferenca-var-1')).toHaveTextContent('—')
    expect(screen.getByTestId('resumo-da-contagem')).toHaveTextContent('1 sem contar')
    await aplicar(user)
    expect(movimentosLancados(falso)).toEqual([])
  })

  it('saldo que mudou entre contar e aplicar: o delta é contra o de AGORA', async () => {
    // Primeira leitura 12 (a que entra na folha), segunda 8 (alguém vendeu
    // quatro no meio). O ajuste tem um trabalho só: deixar o depósito com o
    // contado — então o delta é 10 − 8, e não 10 − 12.
    let leituras = 0
    const falso = servidor({
      '/api/variants/var-1/stock-balances': () => {
        leituras += 1
        const qty = leituras === 1 ? 12 : 8
        return json({
          rows: [
            { locationId: 'dep-1', variantId: 'var-1', qty, updatedAt: '2026-08-01T12:00:00.000Z' },
          ],
          total: 1,
        })
      },
      '/api/variants/var-1/stock-movements': () => json({ id: 'mov-9' }, 201),
    })
    const { user } = renderRoute('/estoque/inventario', falso.fetch)

    await abrirNoPrincipal(user)
    await acrescentarAPeca(user)
    await contar(user, '10')
    await aplicar(user)

    expect(movimentosLancados(falso)).toEqual([
      { locationId: 'dep-1', delta: 2, reason: 'Inventário de agosto' },
    ])
    // E a tela NOMEIA a peça: o depósito ficou com o contado, mas a base contra
    // a qual se conferiu já não era a de agora, e calar isso é o pior caminho.
    const resultado = await screen.findByTestId('resultado-do-ajuste')
    expect(resultado).toHaveTextContent('O saldo mudou entre a contagem e o ajuste')
    expect(resultado).toHaveTextContent('PD-1001')
  })

  it('a recusa do servidor aparece, e aplicar de novo continua disponível', async () => {
    const falso = servidor({
      '/api/variants/var-1/stock-movements': () =>
        problema(409, 'Movimento deixaria o saldo do depósito negativo.', 'Conflito'),
    })
    const { user } = renderRoute('/estoque/inventario', falso.fetch)

    await abrirNoPrincipal(user)
    await acrescentarAPeca(user)
    await contar(user, '10')
    await aplicar(user)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Movimento deixaria o saldo do depósito negativo.',
    )
    // A folha continua aberta: repetir relê o saldo e lança só o que faltou.
    expect(screen.getByRole('button', { name: 'Aplicar ajuste' })).toBeInTheDocument()
  })
})

describe('as contas da folha', () => {
  function item(sobrepoe: Partial<ItemDaContagem> = {}): ItemDaContagem {
    return {
      variantId: 'var-1',
      produtoId: 'prod-1',
      produtoCodigo: 'PD-1001',
      produtoDescricao: 'PENDENTE',
      variante: 'Padrão',
      sistema: 10,
      contado: null,
      ...sobrepoe,
    }
  }

  it('diferença é nula enquanto não se contou, e zero quando bateu', () => {
    expect(diferencaDoItem(item())).toBeNull()
    expect(diferencaDoItem(item({ contado: 10 }))).toBe(0)
    expect(diferencaDoItem(item({ contado: 0 }))).toBe(-10)
  })

  it('o resumo separa pendente de divergente', () => {
    const contagem = {
      id: 'c1',
      locationId: 'dep-1',
      depositoNome: 'PRINCIPAL',
      abertaEm: '2026-08-28T10:00:00.000Z',
      aplicacao: null,
      itens: [
        item({ variantId: 'a', contado: 10 }),
        item({ variantId: 'b', contado: 12 }),
        item({ variantId: 'c', contado: 7 }),
        item({ variantId: 'd' }),
      ],
    }
    expect(resumoDaContagem(contagem)).toEqual({
      linhas: 4,
      contadas: 3,
      pendentes: 1,
      divergentes: 2,
      // +2 e −3 se cancelam parcialmente: o líquido é o que o estoque total
      // ganha, e não o tamanho do erro encontrado.
      ajusteLiquido: -1,
    })
  })

  it('o contado aceita zero e três casas, e recusa o negativo', () => {
    expect(contagemDoTexto('0')).toBe(0)
    expect(contagemDoTexto('1,5')).toBe(1.5)
    expect(contagemDoTexto('0,125')).toBe(0.125)
    // Quatro casas é a escala de `numeric(18,3)` estourada: aparar em silêncio
    // faria quem digitou meio milésimo gravar zero.
    expect(contagemDoTexto('0,0005')).toBeNull()
    expect(contagemDoTexto('-1')).toBeNull()
    expect(contagemDoTexto('')).toBeNull()
  })
})
