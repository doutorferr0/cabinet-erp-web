import {
  acaoNaLinha,
  renderRoute,
  respostaLookups,
  respostaSessao,
  respostaVinculos,
} from '@/test/utils'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * O QUE O POSTGRES REVELOU (2026-08-18, par local ligado).
 *
 * `GET /api/products` **não devolve `specs`** — medido contra o
 * `cabinet-erp-api`: a listagem traz os 16 campos da linha e para em
 * `factoryName`; a ficha técnica só vem no detalhe (`GET /api/products/{id}`).
 * O contrato permite: `specs` não está no `required` do `ProductDto`.
 *
 * E o `PUT` é INTEGRAL — substitui o registro. Somando as duas coisas,
 * `Excluir` na listagem (que é DESATIVAÇÃO, padrão 8) montava o corpo a partir
 * da linha e mandava a ficha técnica vazia: desativar um produto **apagava
 * watts, lúmen, garantia e as medidas**.
 *
 * **O mock escondia** porque a listagem mockada devolve o objeto inteiro, com
 * `specs` dentro. Lá `linha.specs` existia, e o corpo saía correto.
 */

const ID = '6a774dd0-b5cd-49c0-b346-de3fe57b9ac4'

/** Linha como o BACKEND REAL a devolve: sem `specs`. */
const LINHA_REAL = {
  id: ID,
  code: 'LUM-001',
  description: 'Pendente Cobre Escovado',
  active: true,
  specialCode: null,
  shortCode: null,
  unitIn: null,
  unitInQty: null,
  unitOut: null,
  unitOutQty: null,
  productTypeId: null,
  productTypeName: null,
  brandId: null,
  brandName: null,
  factoryId: null,
  factoryName: null,
}

/** Detalhe do mesmo produto — aqui a ficha técnica existe. */
const DETALHE_REAL = {
  ...LINHA_REAL,
  variants: [],
  specs: {
    watts: '18',
    volts: '220',
    lumen: '1600',
    warrantyMonths: '24',
    colorTemperature: '3000K',
    beamAngle: null,
    biVolts: null,
    clearSpan: null,
    lampsPerBallast: null,
    netWeight: null,
    grossWeight: null,
    nicheCut: null,
    installationMinutes: null,
    productDimensions: null,
    packageDimensions: null,
  },
}

interface Escrita {
  metodo: string
  corpo: Record<string, unknown>
}

function servidorDeProdutos(escritas: Escrita[]) {
  return async (entrada: RequestInfo | URL) => {
    const req = entrada instanceof Request ? entrada : null
    const url = String(req ? req.url : entrada)
    const metodo = req?.method ?? 'GET'

    if (url.includes('/auth/me')) return respostaSessao()
    if (url.includes('/auth/tenants')) return respostaVinculos()
    if (url.includes('/api/catalog-lookups')) return respostaLookups()

    if (url.includes('/api/products')) {
      if (metodo === 'PUT') {
        escritas.push({ metodo, corpo: (await req?.json()) as Record<string, unknown> })
        return new Response(JSON.stringify({ ...LINHA_REAL, active: false }), {
          headers: { 'content-type': 'application/json' },
        })
      }
      // detalhe por id
      if (/\/api\/products\/[0-9a-f-]{8,}/.test(url)) {
        return new Response(JSON.stringify(DETALHE_REAL), {
          headers: { 'content-type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ rows: [LINHA_REAL], total: 1 }), {
        headers: { 'content-type': 'application/json' },
      })
    }
    return undefined
  }
}

describe('desativar produto pela listagem', () => {
  it('não apaga a ficha técnica que a LINHA não traz', async () => {
    const escritas: Escrita[] = []
    const { user } = renderRoute('/cadastros/produtos', servidorDeProdutos(escritas) as never)

    await screen.findByText('Pendente Cobre Escovado')

    // marca a linha e aciona o Excluir (= desativação, padrão 8). O gesto mora
    // no helper porque já mudou três vezes (#197, #198).
    await acaoNaLinha(user, 'Pendente Cobre Escovado', /Excluir/i)
    await user.click(await screen.findByRole('button', { name: /Desativar|Confirmar/i }))

    await waitFor(() => expect(escritas).toHaveLength(1))

    const corpo = escritas[0]?.corpo as { active: boolean; specs: Record<string, unknown> | null }
    expect(corpo.active).toBe(false)

    // O PUT substitui o registro inteiro: mandar `specs` vazio porque a linha
    // não o trazia apagaria a ficha técnica do produto para desativá-lo.
    expect(corpo.specs).not.toBeNull()
    expect(corpo.specs?.watts).toBe('18')
    expect(corpo.specs?.lumen).toBe('1600')
    expect(corpo.specs?.warrantyMonths).toBe('24')
  })
})
