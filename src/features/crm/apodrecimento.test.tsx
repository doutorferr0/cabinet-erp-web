import type { CrmOpportunityDto, CrmStageDto } from '@/api/gerado'
import { URL_FUNIS, URL_MOTIVOS_DE_PERDA, URL_OPORTUNIDADES } from '@/data/crm-api'
import { apodrecimentoDoCartao, diasParado } from '@/features/crm/apodrecimento'
import { json } from '@/test/servidor'
import { type FetchStub, renderRoute, respostaSessao, respostaVinculos } from '@/test/utils'
import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

/**
 * APODRECIMENTO (#87): régua pura primeiro, tela contra servidor falso depois.
 *
 * A régua é onde o defeito seria invisível — um limiar errado desenha um cartão
 * bonito com a informação trocada, e ninguém percebe até a venda se perder.
 */

const AGORA = new Date('2026-08-14T09:00:00Z')

function etapa(id: string, name: string, sort: number, extra: Partial<CrmStageDto> = {}) {
  return {
    id,
    pipelineId: 'funil-1',
    name,
    sort,
    probability: 100_000,
    isWon: false,
    isLost: false,
    rotDays: null,
    ...extra,
  }
}

function cartao(over: Partial<CrmOpportunityDto> & { id: string }): CrmOpportunityDto {
  return {
    name: 'Oportunidade',
    pipelineId: 'funil-1',
    pipelineName: 'Venda de projeto',
    stageId: 'e1',
    stageName: 'Contato',
    order: 1,
    partnerId: null,
    partnerName: null,
    contactName: null,
    contactEmail: null,
    contactPhone: null,
    ownerEmployeeId: null,
    ownerName: null,
    expectedValueCents: null,
    expectedCloseDate: null,
    source: null,
    stageChangedAt: '2026-08-14T09:00:00Z',
    lostReasonId: null,
    lostReasonName: null,
    quoteId: null,
    closedAt: null,
    ...over,
  }
}

/** Cartão que entrou na etapa há `n` dias, contando do `AGORA` dos testes. */
function paradoHa(dias: number, over: Partial<CrmOpportunityDto> = {}): CrmOpportunityDto {
  return paradoDesde(AGORA, dias, over)
}

/**
 * O mesmo, contando de AGORA DE VERDADE.
 *
 * A TELA chama `apodrecimentoDoCartao` sem `agora`, então ela usa o relógio da
 * máquina — e um cartão montado a partir da constante dos testes conta um dia a
 * mais ou a menos assim que a data real passa dela. **Já quebrou**: a suíte
 * rodou às 21h50 de 14/08 no fuso -03, que é 15/08 em UTC, e o selo disse 21
 * onde o teste esperava 20. Regra pura usa a constante; teste de tela usa o
 * relógio, que é o que a tela usa.
 */
function paradoAgoraHa(dias: number, over: Partial<CrmOpportunityDto> = {}): CrmOpportunityDto {
  return paradoDesde(new Date(), dias, over)
}

function paradoDesde(
  referencia: Date,
  dias: number,
  over: Partial<CrmOpportunityDto>,
): CrmOpportunityDto {
  const entrada = new Date(referencia.getTime() - dias * 86_400_000)
  return cartao({ id: `op-${dias}`, stageChangedAt: entrada.toISOString(), ...over })
}

describe('régua do apodrecimento', () => {
  const COM_PRAZO = etapa('e1', 'Contato', 1, { rotDays: 9 })

  it('conta por DIA, não por instante — a hora de entrada não muda a conta', () => {
    // Mesmo dia de calendário, horas opostas: os dois estão parados há 3 dias.
    expect(diasParado('2026-08-11T23:50:00Z', AGORA)).toBe(3)
    expect(diasParado('2026-08-11T00:10:00Z', AGORA)).toBe(3)
  })

  it('fresco até dois terços, perto a partir deles, apodrecido no limite', () => {
    // `rotDays: 9` → aviso no dia 6 (dois terços), apodrecido no dia 9.
    expect(apodrecimentoDoCartao(paradoHa(5), COM_PRAZO, AGORA)?.estado).toBe('fresco')
    expect(apodrecimentoDoCartao(paradoHa(6), COM_PRAZO, AGORA)?.estado).toBe('perto')
    expect(apodrecimentoDoCartao(paradoHa(8), COM_PRAZO, AGORA)?.estado).toBe('perto')
    expect(apodrecimentoDoCartao(paradoHa(9), COM_PRAZO, AGORA)?.estado).toBe('apodrecido')
    expect(apodrecimentoDoCartao(paradoHa(30), COM_PRAZO, AGORA)?.estado).toBe('apodrecido')
  })

  it('prazo curto ainda tem os três estados', () => {
    const curta = etapa('e2', 'Balcão', 1, { rotDays: 3 })
    expect(apodrecimentoDoCartao(paradoHa(1), curta, AGORA)?.estado).toBe('fresco')
    expect(apodrecimentoDoCartao(paradoHa(2), curta, AGORA)?.estado).toBe('perto')
    expect(apodrecimentoDoCartao(paradoHa(3), curta, AGORA)?.estado).toBe('apodrecido')
  })

  /**
   * REGRESSÃO. A primeira versão arredondava os dois terços para CIMA, e com
   * `rotDays: 2` o aviso caía no dia 2 — o mesmo dia do apodrecimento, que é
   * testado primeiro. O estado `perto` nunca acontecia neste prazo, e nada na
   * tela denunciava: o cartão ia de fresco a podre sem passar pelo aviso.
   */
  it('prazo DOIS ainda avisa antes de apodrecer', () => {
    const doisDias = etapa('e6', 'Retirada', 1, { rotDays: 2 })
    expect(apodrecimentoDoCartao(paradoHa(0), doisDias, AGORA)?.estado).toBe('fresco')
    expect(apodrecimentoDoCartao(paradoHa(1), doisDias, AGORA)?.estado).toBe('perto')
    expect(apodrecimentoDoCartao(paradoHa(2), doisDias, AGORA)?.estado).toBe('apodrecido')
  })

  /** Prazo UM não tem meio-termo, e não há como ter — mas não pode nascer podre. */
  it('prazo UM: entrou hoje é fresco, amanhã já apodreceu', () => {
    const umDia = etapa('e7', 'Expresso', 1, { rotDays: 1 })
    expect(apodrecimentoDoCartao(paradoHa(0), umDia, AGORA)?.estado).toBe('fresco')
    expect(apodrecimentoDoCartao(paradoHa(1), umDia, AGORA)?.estado).toBe('apodrecido')
  })

  it('etapa SEM prazo não apodrece — e a ausência é `null`, não "fresco"', () => {
    expect(apodrecimentoDoCartao(paradoHa(90), etapa('e3', 'Sem prazo', 1), AGORA)).toBeNull()
    expect(apodrecimentoDoCartao(paradoHa(90), undefined, AGORA)).toBeNull()
  })

  /**
   * Negócio FECHADO não está empacado, está fechado. Marcar de vermelho a
   * coluna de ganhos diria que fechar a venda foi o problema.
   */
  it('etapa que ganha ou perde não apodrece, mesmo com rotDays gravado', () => {
    const ganho = etapa('e4', 'Ganho', 5, { isWon: true, rotDays: 1 })
    const perdido = etapa('e5', 'Perdido', 6, { isLost: true, rotDays: 1 })
    expect(apodrecimentoDoCartao(paradoHa(90), ganho, AGORA)).toBeNull()
    expect(apodrecimentoDoCartao(paradoHa(90), perdido, AGORA)).toBeNull()
  })

  it('futuro não vira dia negativo', () => {
    expect(diasParado('2026-09-01T00:00:00Z', AGORA)).toBe(0)
  })
})

const FUNIL = { id: 'funil-1', name: 'Venda de projeto', sort: 1, isDefault: true, active: true }

const ETAPAS: CrmStageDto[] = [
  etapa('e1', 'Contato', 1, { rotDays: 9 }),
  etapa('e2', 'Sem prazo', 2),
  etapa('e3', 'Ganho', 3, { isWon: true, rotDays: 1 }),
]

/** Um cartão de cada estado, em etapas que existem no funil do teste. */
const CARTOES: CrmOpportunityDto[] = [
  { ...paradoAgoraHa(1), id: 'op-fresco', name: 'Fresco' },
  { ...paradoAgoraHa(7), id: 'op-perto', name: 'Quase la' },
  { ...paradoAgoraHa(20), id: 'op-podre', name: 'Podre' },
  {
    ...paradoAgoraHa(90),
    id: 'op-sem-prazo',
    // Título diferente do nome da ETAPA de propósito: com os dois iguais, a
    // busca por texto acha a coluna e o cartão, e a asserção não sabe qual pegou.
    name: 'Eterno',
    stageId: 'e2',
    stageName: 'Sem prazo',
  },
  { ...paradoAgoraHa(90), id: 'op-ganho', name: 'Ganho velho', stageId: 'e3', stageName: 'Ganho' },
]

function servidorDoFunil(): FetchStub {
  return (entrada) => {
    const url = String(entrada instanceof Request ? entrada.url : entrada)
    const caminho = new URL(url, 'http://localhost').pathname

    if (caminho === '/auth/me') return Promise.resolve(respostaSessao())
    if (caminho === '/auth/tenants') return Promise.resolve(respostaVinculos())
    if (caminho === URL_FUNIS) return Promise.resolve(json({ rows: [FUNIL], total: 1 }))
    if (caminho === `${URL_FUNIS}/funil-1/stages`) return Promise.resolve(json(ETAPAS))
    if (caminho === URL_MOTIVOS_DE_PERDA) return Promise.resolve(json({ rows: [], total: 0 }))
    if (caminho === URL_OPORTUNIDADES) {
      return Promise.resolve(json({ rows: CARTOES, total: CARTOES.length }))
    }
    return Promise.reject(new Error(`fetch sem stub no teste: ${url}`))
  }
}

/** O `<li>` do cartão, pelo título — é onde o tingimento é aplicado. */
function cartaoDe(titulo: string): HTMLElement {
  const link = screen.getByText(titulo)
  const item = link.closest('[data-slot="cartao"]')
  if (!item) throw new Error(`cartão de ${titulo} não encontrado`)
  return item as HTMLElement
}

beforeEach(() => {
  localStorage.clear()
})

describe('apodrecimento no quadro', () => {
  it('cartão fresco não ganha selo — sinal em todo cartão vira ruído', async () => {
    renderRoute('/crm/funil/funil-1', servidorDoFunil())

    await screen.findByText('Fresco')
    expect(cartaoDe('Fresco').querySelector('[data-slot="apodrecimento"]')).toBeNull()
  })

  it('perto e apodrecido ganham selo, e só o apodrecido tinge o cartão', async () => {
    renderRoute('/crm/funil/funil-1', servidorDoFunil())

    await screen.findByText('Quase la')
    const perto = cartaoDe('Quase la').querySelector('[data-slot="apodrecimento"]')
    expect(perto?.getAttribute('data-estado')).toBe('perto')
    expect(cartaoDe('Quase la').className).not.toContain('bg-zone-danger')

    const podre = cartaoDe('Podre').querySelector('[data-slot="apodrecimento"]')
    expect(podre?.getAttribute('data-estado')).toBe('apodrecido')
    expect(cartaoDe('Podre').className).toContain('bg-zone-danger')
  })

  /** O selo sozinho seria um número mudo — a frase inteira vai junto. */
  it('o selo diz a frase, não só o número', async () => {
    renderRoute('/crm/funil/funil-1', servidorDoFunil())

    await screen.findByText('Podre')
    expect(
      within(cartaoDe('Podre')).getByText(
        /Apodrecido\. Parado há 20 dias; o limite desta etapa é 9/,
      ),
    ).toBeInTheDocument()
  })

  it('etapa sem prazo e etapa de ganho não apodrecem, por mais velhas que sejam', async () => {
    renderRoute('/crm/funil/funil-1', servidorDoFunil())

    await screen.findByText('Eterno')
    expect(cartaoDe('Eterno').querySelector('[data-slot="apodrecimento"]')).toBeNull()
    expect(cartaoDe('Ganho velho').querySelector('[data-slot="apodrecimento"]')).toBeNull()
  })

  /**
   * Mesma consulta, duas visões (#86): um negócio empacado visível no quadro e
   * invisível na tabela seria a tela contando duas histórias.
   */
  it('a visão Lista mostra o mesmo selo, na coluna Etapa', async () => {
    const { user } = renderRoute('/crm/funil/funil-1', servidorDoFunil())

    await screen.findByText('Podre')
    await user.click(screen.getByRole('radio', { name: 'Lista' }))

    const linha = (await screen.findByText('Podre')).closest('tr')
    expect(linha?.querySelector('[data-estado="apodrecido"]')).not.toBeNull()
  })
})
