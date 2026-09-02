import { atalhosDoModulo } from '@/components/cabinet/hub-de-modulo'
import { instalarServidor } from '@/test/servidor'
import { type FetchStub, renderRoute } from '@/test/utils'
import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * O HUB é a rota-índice de quatro módulos — e o que ele mostra é a taxonomia,
 * não uma lista própria. Por isso o teste monta a ROTA, e não o componente:
 * `gruposVisiveis` recorta por recurso da empresa ativa, que só existe com
 * sessão respondida.
 *
 * A empresa aqui NÃO tem `suppliers` de propósito. É o par que prova o recorte:
 * `Fornecedores` some do hub de Compras sem ninguém escrever uma exceção.
 */
const EMPRESAS = [
  {
    tenantId: 'aaaa-1111',
    name: 'VERTZ ILUMINAÇÃO',
    role: 'owner',
    features: ['professionals', 'employees'],
  },
]

/**
 * O agregado do módulo, com números que NÃO se confundem: `14` ordens abertas
 * contra `3` atrasadas prova qual campo foi para qual tile — se o componente
 * trocasse os dois, um resumo de números iguais passaria verde.
 */
const RESUMO_DE_COMPRAS = {
  openOrders: 14,
  openOrdersValueCents: 4_890_000,
  lateOrders: 3,
  arrivingThisWeek: 7,
  monthValueCents: 18_240_000,
  previousMonthValueCents: 16_285_714,
  monthlyValueSeries: [12_000_00, 14_000_00, 18_240_00],
}

let fetchStub: FetchStub

beforeEach(() => {
  const servidor = instalarServidor({
    '/auth/tenants': () => EMPRESAS,
    '/auth/me': () => ({
      organizationId: 'org-1',
      employeeId: 'emp-1',
      activeTenantId: 'aaaa-1111',
      expiresAt: '2026-12-01T00:00:00Z',
    }),
    '/api/purchases/orders-summary': () => RESUMO_DE_COMPRAS,
  })
  fetchStub = servidor.fetch
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/** A grade de atalhos, pelo rótulo que a `<section>` publica. */
function grade() {
  return screen.getByRole('region', { name: 'Telas do módulo' })
}

describe('hub de módulo', () => {
  it('põe as telas do módulo como atalho na rota-índice', async () => {
    renderRoute('/compras', fetchStub)

    expect(await screen.findByRole('heading', { level: 1, name: 'Compras' })).toBeInTheDocument()

    const atalhos = within(grade()).getAllByRole('link')
    const destinos = atalhos.map((a) => a.getAttribute('href'))
    expect(destinos).toContain('/compras/ordens')
    expect(destinos).toContain('/compras/pedidos')
    expect(destinos).toContain('/compras/previsao')
  })

  it('não mostra atalho de outro módulo nem a própria raiz', async () => {
    renderRoute('/compras', fetchStub)
    await screen.findByRole('heading', { level: 1, name: 'Compras' })

    const destinos = within(grade())
      .getAllByRole('link')
      .map((a) => a.getAttribute('href'))
    // A raiz é o pai colapsável, não uma tela: card que leva onde já se está.
    expect(destinos).not.toContain('/compras')
    expect(destinos.every((d) => d?.startsWith('/compras/'))).toBe(true)
  })

  /**
   * Tela FUTURA aparece na barra lateral apagada, com selo, porque ali ela é o
   * desenho de para onde o sistema cresce. Card de atalho é outra coisa: ele é
   * uma promessa de navegação, e `Reserva Técnica` não tem rota — o clique
   * cairia em 404.
   */
  it('não oferece como atalho a tela que ainda não existe', async () => {
    renderRoute('/estoque', fetchStub)
    await screen.findByRole('heading', { level: 1, name: 'Estoque' })

    const destinos = within(grade())
      .getAllByRole('link')
      .map((a) => a.getAttribute('href'))
    expect(destinos).toContain('/estoque/movimentacao')
    expect(destinos).not.toContain('/estoque/reserva')
  })

  /**
   * O `Incluir` no card é o clique mais frequente de quem abre um módulo. Ele
   * só existe onde a taxonomia declara `incluir` — tela de consulta não cria
   * registro, e um `+` nela levaria a uma rota que o roteador recusa.
   */
  it('oferece incluir só na tela que inclui', async () => {
    renderRoute('/compras', fetchStub)
    await screen.findByRole('heading', { level: 1, name: 'Compras' })

    const incluir = within(grade()).getByRole('link', { name: 'Incluir em Ordem de Compra' })
    expect(incluir).toHaveAttribute('href', '/compras/ordens/novo')
    expect(
      within(grade()).queryByRole('link', { name: 'Incluir em Previsão de Chegada' }),
    ).toBeNull()
  })

  /**
   * O KPI vem do AGREGADO do servidor, não de contagem de linha. Asserir o
   * rótulo sozinho passaria com o tile vazio; o par rótulo→valor é o que prova
   * que cada campo do DTO chegou ao seu tile.
   */
  it('mostra os quatro indicadores do módulo, com o número do agregado', async () => {
    renderRoute('/compras', fetchStub)
    await screen.findByRole('heading', { level: 1, name: 'Compras' })

    const faixa = await screen.findByRole('region', { name: 'Indicadores de Compras' })
    for (const [rotulo, valor] of [
      ['Ordens em aberto', '14'],
      ['Chegando esta semana', '7'],
      ['Atrasadas', '3'],
    ] as const) {
      const tile = (await within(faixa).findByText(rotulo)).closest('[data-slot="kpi-tile"]')
      expect(tile).not.toBeNull()
      expect(tile).toHaveTextContent(valor)
    }
    // Dinheiro em centavos vira R$ só na borda de exibição.
    expect(faixa).toHaveTextContent('182.400')
  })

  it('abre hub em estoque, vendas e crm', async () => {
    for (const [url, titulo] of [
      ['/estoque', 'Estoque'],
      ['/vendas', 'Vendas'],
      ['/crm', 'CRM'],
    ] as const) {
      const { unmount } = renderRoute(url, fetchStub)
      expect(await screen.findByRole('heading', { level: 1, name: titulo })).toBeInTheDocument()
      unmount()
    }
  })

  /**
   * O redirecionamento de `/cadastros` só vale se o operador ENTENDER que caiu
   * noutro lugar. Asserir a URL sem asserir o recado deixaria passar o
   * redirecionamento mudo, que é o defeito que a rota existe para não ter.
   */
  it('manda /cadastros para o hub de vendas dizendo o que mudou', async () => {
    const { router } = renderRoute('/cadastros', fetchStub)

    await waitFor(() => expect(router.state.location.pathname).toBe('/vendas'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Vendas' })).toBeInTheDocument()
    expect(await screen.findByRole('status')).toHaveTextContent(
      /grupo Cadastros deixou de existir/i,
    )
  })

  it('não mostra o recado quando o operador pediu Vendas', async () => {
    renderRoute('/vendas', fetchStub)
    await screen.findByRole('heading', { level: 1, name: 'Vendas' })

    expect(screen.queryByRole('status')).toBeNull()
  })
})

/**
 * O RECORTE POR RECURSO se prova fora dos quatro hubs, e isso é informação:
 * nenhuma tela sob `/compras`, `/estoque`, `/vendas` ou `/crm` depende de
 * recurso da empresa hoje. Asserir a ausência de `Fornecedores` no hub de
 * Compras passaria verde com o filtro arrancado — `/cadastros/fornecedores`
 * nunca esteve sob aquele prefixo. A função é que carrega a regra, então é ela
 * que o teste interroga, com a raiz onde a regra tem efeito.
 */
describe('atalhosDoModulo', () => {
  it('deixa de fora a tela cujo recurso a empresa não tem', () => {
    const comFornecedor = atalhosDoModulo('/cadastros', (r) => r === 'suppliers')
    const semNada = atalhosDoModulo('/cadastros', () => false)

    expect(comFornecedor.map((i) => i.url)).toContain('/cadastros/fornecedores')
    expect(semNada.map((i) => i.url)).not.toContain('/cadastros/fornecedores')
    // O que não depende de recurso continua nos dois — senão o teste estaria
    // medindo a lista inteira sumindo, não o recorte.
    expect(semNada.map((i) => i.url)).toContain('/cadastros/clientes')
  })
})
