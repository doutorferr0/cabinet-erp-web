import type { StockBalanceDto, StockLocationDto, StockMovementDto } from '@/api/gerado'
import {
  type ModoDeLancamento,
  deltaDoLancamento,
  quantidadeDoTexto,
} from '@/features/estoque/lancar-movimento'
import { type ChamadaFalsa, instalarServidor, json, problema } from '@/test/servidor'
import { renderRoute, respostaSessao, respostaVinculos } from '@/test/utils'
import { screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * AS TRÊS ESCRITAS de estoque — entrada, saída e ajuste — contra servidor falso.
 *
 * O que estes testes travam, e cada um é um defeito que já custou caro em algum
 * módulo deste repo:
 *
 * 1. **O SINAL do `delta` sai do gesto.** O contrato tem UMA escrita e nenhum
 *    campo de tipo: se o sinal se perder, "Saída" vira entrada e o estoque cresce
 *    quando deveria baixar. Nada na tela denunciaria — o kardex mostraria o
 *    movimento com o motivo certo e o número ao contrário.
 * 2. **O corpo tem TRÊS campos, e `locationId` nulo é escolha.** Mandar `''` ou
 *    omitir de outro jeito faria o servidor procurar depósito de id vazio (404)
 *    em vez de usar o padrão da empresa.
 * 3. **A tela NÃO pré-valida saldo.** O pedido que o saldo da tela diria ser
 *    impossível TEM de chegar ao servidor: quem conta é quem grava, e uma
 *    recusa local esconderia tanto o 409 legítimo quanto o movimento que o
 *    servidor aceitaria.
 * 4. **A recusa aparece pelo `detail`, e o diálogo não fecha.** Fechar em cima
 *    do erro é a forma mais barata de fazer o operador acreditar que gravou.
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
]

const PRODUTO = {
  id: 'prod-1',
  code: 'PD-1001',
  description: 'PENDENTE VIDRO FUMÊ 30CM',
  active: true,
}

/**
 * `resposta` decide o que o POST devolve — 201 por padrão, ou a recusa que o
 * caso quer exercitar. O GET do mesmo caminho continua servindo o kardex: os
 * dois verbos moram na mesma URL, e um handler que ignorasse o método
 * responderia a listagem ao `Lançar`.
 */
function servidor(resposta?: (chamada: ChamadaFalsa) => Response) {
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
            stockQty: 12,
            minStock: 2,
          },
        ],
      }),
    '/api/stock-locations': () => json({ rows: [PRINCIPAL, SHOWROOM], total: 2 }),
    '/api/variants/var-1/stock-balances': () => json({ rows: SALDOS, total: SALDOS.length }),
    '/api/variants/var-1/stock-movements': (chamada) => {
      if (chamada.metodo !== 'POST') return json({ rows: MOVIMENTOS, total: MOVIMENTOS.length })
      if (resposta) return resposta(chamada)
      return json({ ...MOVIMENTOS[0], id: 'mov-novo' }, 201)
    },
  })
}

/** Escolhe o produto pela janela de busca e a única variante dele. */
async function escolherAPeca(user: ReturnType<typeof renderRoute>['user']) {
  await user.click(await screen.findByRole('button', { name: 'Buscar produto' }))
  await user.click(await screen.findByText('PD-1001'))
  await user.click(screen.getByRole('button', { name: 'Selecionar' }))
  const variante = await screen.findByRole('combobox', { name: /variante/i })
  await user.selectOptions(variante, 'var-1')
}

/**
 * Abre o diálogo do modo e devolve ele — SEMPRE escopado.
 *
 * O escopo não é zelo: "Depósito" rotula o filtro da tela E o campo do diálogo,
 * e `getByRole('combobox', {name:/depósito/i})` acharia dois. Um teste que
 * preenchesse o de fora passaria mandando o depósito do FILTRO, que é o mesmo
 * valor por sugestão — e continuaria passando no dia em que a sugestão sumisse.
 */
async function abrir(
  user: ReturnType<typeof renderRoute>['user'],
  modo: 'Entrada' | 'Saída' | 'Ajuste',
): Promise<HTMLElement> {
  await user.click(await screen.findByRole('button', { name: modo }))
  return await screen.findByRole('dialog')
}

async function preencher(
  user: ReturnType<typeof renderRoute>['user'],
  dialogo: HTMLElement,
  quantidade: string,
  motivo: string,
) {
  await user.type(within(dialogo).getByLabelText(/quantidade/i), quantidade)
  await user.type(within(dialogo).getByLabelText(/motivo/i), motivo)
  await user.click(within(dialogo).getByRole('button', { name: 'Lançar' }))
}

/** Os POST do kardex, que é o que estes testes medem — o GET mora na mesma URL. */
function lancamentos(falso: ReturnType<typeof instalarServidor>) {
  return falso.em('/api/variants/var-1/stock-movements').filter((c) => c.metodo === 'POST')
}

afterEach(() => {
  vi.unstubAllGlobals()
})

// Teto próprio: são quatro gestos de usuário sobre uma tela que monta duas
// grades, e sob carga a suíte inteira estoura o teto padrão de 15s com falha que
// se lê como asserção errada ("Unable to find an element…").
const TETO = 30_000

describe('lançamento manual de estoque', () => {
  it(
    'entrada manda delta POSITIVO, no depósito do filtro',
    async () => {
      const falso = servidor()
      const { user } = renderRoute('/estoque/movimentacao', falso.fetch)
      await escolherAPeca(user)
      await user.selectOptions(screen.getByRole('combobox', { name: /depósito/i }), 'dep-2')

      const dialogo = await abrir(user, 'Entrada')
      await preencher(user, dialogo, '5', 'Compra avulsa')

      expect(lancamentos(falso)).toHaveLength(1)
      expect(lancamentos(falso)[0]?.corpo).toEqual({
        locationId: 'dep-2',
        delta: 5,
        reason: 'Compra avulsa',
      })
    },
    TETO,
  )

  it(
    'saída manda o MESMO gesto com delta NEGATIVO',
    async () => {
      const falso = servidor()
      const { user } = renderRoute('/estoque/movimentacao', falso.fetch)
      await escolherAPeca(user)

      const dialogo = await abrir(user, 'Saída')
      await preencher(user, dialogo, '2', 'Consumo interno')

      expect(lancamentos(falso)[0]?.corpo).toMatchObject({ delta: -2, reason: 'Consumo interno' })
    },
    TETO,
  )

  it(
    'sem depósito no filtro, o corpo vai com locationId NULO — o padrão da empresa',
    async () => {
      const falso = servidor()
      const { user } = renderRoute('/estoque/movimentacao', falso.fetch)
      await escolherAPeca(user)

      const dialogo = await abrir(user, 'Entrada')
      await preencher(user, dialogo, '1', 'Ajuste de carga')

      // `null`, não `''` nem ausente: o contrato diz que nulo significa "o
      // depósito padrão da empresa ativa, criado sob demanda". Id vazio daria 404.
      expect(lancamentos(falso)[0]?.corpo).toMatchObject({ locationId: null })
    },
    TETO,
  )

  it(
    'ajuste pergunta o SENTIDO, e retirar manda negativo',
    async () => {
      const falso = servidor()
      const { user } = renderRoute('/estoque/movimentacao', falso.fetch)
      await escolherAPeca(user)

      const dialogo = await abrir(user, 'Ajuste')
      // O sentido só existe no ajuste: entrada e saída já disseram para que lado
      // a peça anda, e reperguntar desfaria o que o clique informou.
      await user.click(within(dialogo).getByRole('radio', { name: 'Retirar' }))
      await preencher(user, dialogo, '3', 'Quebra no transporte')

      expect(lancamentos(falso)[0]?.corpo).toMatchObject({ delta: -3 })
    },
    TETO,
  )

  it(
    'a tela NÃO pré-valida saldo: pede mais do que tem e o servidor é quem recusa',
    async () => {
      const falso = servidor(() =>
        problema(409, 'O movimento deixaria o saldo do depósito negativo.', 'Conflict'),
      )
      const { user } = renderRoute('/estoque/movimentacao', falso.fetch)
      await escolherAPeca(user)

      // O saldo na tela é 12. Pedir 999 de saída é o pedido que uma pré-validação
      // local recusaria — e ele TEM de chegar ao servidor.
      const dialogo = await abrir(user, 'Saída')
      await preencher(user, dialogo, '999', 'Baixa geral')

      expect(lancamentos(falso)).toHaveLength(1)
      expect(lancamentos(falso)[0]?.corpo).toMatchObject({ delta: -999 })

      // A frase é a do SERVIDOR (o `detail` do problem+json), não o fallback da
      // tela — e o diálogo continua aberto, porque nada foi gravado.
      expect(
        await within(dialogo).findByText('O movimento deixaria o saldo do depósito negativo.'),
      ).toBeInTheDocument()
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    },
    TETO,
  )

  it(
    'variante nunca precificada não é barrada aqui — a recusa, se vier, é do servidor',
    async () => {
      // O servidor CRIA a linha de `product_tenant` no primeiro movimento
      // (decisão do user, 2026-08-18). A tela não tem regra sobre isso: este caso
      // trava a AUSÊNCIA de pré-validação, que é o que o dia da mudança quebraria.
      const falso = servidor()
      const { user } = renderRoute('/estoque/movimentacao', falso.fetch)
      await escolherAPeca(user)

      const dialogo = await abrir(user, 'Entrada')
      await preencher(user, dialogo, '1', 'Primeira peça')

      expect(lancamentos(falso)).toHaveLength(1)
    },
    TETO,
  )

  it(
    'sem peça o segmented ABRE a gaveta, e quem recusa é o Lançar — dizendo por quê',
    async () => {
      // A inversão do desenho 2.0. Antes os três botões nasciam desabilitados e
      // a frase morava ao lado deles: o operador chegava para lançar e a
      // primeira coisa que a tela mostrava era o que ele não podia fazer. Agora
      // o clique sempre abre; a recusa desceu para o rodapé da gaveta, junto do
      // campo que a resolve. O que NÃO mudou é que o desabilitado continua
      // falando — botão mudo é o que faz o operador concluir que a tela quebrou.
      const falso = servidor()
      const { user } = renderRoute('/estoque/movimentacao', falso.fetch)

      const entrada = await screen.findByRole('button', { name: 'Entrada' })
      expect(entrada).toBeEnabled()
      expect(screen.getByRole('button', { name: 'Saída' })).toBeEnabled()
      expect(screen.getByRole('button', { name: 'Ajuste' })).toBeEnabled()

      await user.click(entrada)

      const dialogo = await screen.findByRole('dialog')
      expect(within(dialogo).getByRole('button', { name: 'Lançar' })).toBeDisabled()
      expect(
        within(dialogo).getByText(/Escolha a peça: o lançamento é por variante/),
      ).toBeInTheDocument()
    },
    TETO,
  )

  it(
    'a peça se escolhe DENTRO da gaveta, e o lançamento sai de lá',
    async () => {
      // O caminho que a inversão criou, e o que ele prova: a gaveta não guarda
      // estado de peça próprio — quem escolhe dentro dela escolhe para a tela
      // inteira. Duas cópias do mesmo estado divergiriam no primeiro `Cancelar`,
      // e o lançamento cairia na variante que a tela de trás ainda mostrava.
      const falso = servidor()
      const { user } = renderRoute('/estoque/movimentacao', falso.fetch)

      await user.click(await screen.findByRole('button', { name: 'Saída' }))
      const dialogo = await screen.findByRole('dialog')

      // O campo de dentro é o mesmo `EscolherPeca`, sem a lupa: abrir um dialog
      // por cima do sheet empilharia duas camadas modais, e a segunda prenderia
      // o foco da primeira. Por isso aqui o caminho é a busca INLINE.
      await user.type(within(dialogo).getByLabelText(/produto/i), 'PD-1')
      await user.click(await within(dialogo).findByText('PENDENTE VIDRO FUMÊ 30CM'))
      await user.selectOptions(
        await within(dialogo).findByRole('combobox', { name: /variante/i }),
        'var-1',
      )

      await preencher(user, dialogo, '2', 'Quebra na montagem')

      expect(lancamentos(falso)).toHaveLength(1)
      // Saída: o sinal saiu do GESTO, e o gesto foi o botão clicado lá atrás —
      // não um campo dentro da gaveta.
      expect(lancamentos(falso)[0]?.corpo).toEqual({
        locationId: null,
        delta: -2,
        reason: 'Quebra na montagem',
      })
    },
    TETO,
  )
})

describe('quantidade digitada (regra pura)', () => {
  it('aceita vírgula e ponto, porque o operador digita nos dois', () => {
    expect(quantidadeDoTexto('1,5')).toBe(1.5)
    expect(quantidadeDoTexto('1.5')).toBe(1.5)
    expect(quantidadeDoTexto(' 12 ')).toBe(12)
  })

  it('recusa a QUARTA casa em vez de aparar', () => {
    // `numeric(18,3)` é a escala do servidor. Aparar em silêncio faria quem
    // digitou `0,0005` gravar zero e concluir que gravou meio milésimo.
    expect(quantidadeDoTexto('0,001')).toBe(0.001)
    expect(quantidadeDoTexto('0,0005')).toBeNull()
  })

  it('recusa zero, negativo e o que não é número', () => {
    // O servidor ACEITA delta zero de propósito, e o negativo é a saída. Quem
    // recusa aqui é a tela, porque a direção já veio do modo.
    expect(quantidadeDoTexto('0')).toBeNull()
    expect(quantidadeDoTexto('-3')).toBeNull()
    expect(quantidadeDoTexto('')).toBeNull()
    expect(quantidadeDoTexto('duas')).toBeNull()
  })
})

describe('sinal do delta (regra pura)', () => {
  const casos: [ModoDeLancamento, 'acrescentar' | 'retirar', number][] = [
    ['entrada', 'acrescentar', 4],
    ['entrada', 'retirar', 4],
    ['saida', 'acrescentar', -4],
    ['saida', 'retirar', -4],
    ['ajuste', 'acrescentar', 4],
    ['ajuste', 'retirar', -4],
  ]

  it.each(casos)('%s + %s = %d', (modo, sentido, esperado) => {
    // Entrada e saída IGNORAM o sentido — o botão já disse. O ajuste é o único
    // que o consulta, e as duas primeiras linhas provam a diferença.
    expect(deltaDoLancamento(modo, sentido, 4)).toBe(esperado)
  })
})
