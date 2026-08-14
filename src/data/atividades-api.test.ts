import type { ActivityDto } from '@/api/gerado'
import { completeActivity, createActivity, listActivities, updateActivity } from '@/api/gerado'
import { ErroDaApi, dadosOuErro } from '@/data/api-provider'
import {
  ORDENAVEIS_ATIVIDADE,
  atividadeAtrasada,
  atividadeDoContrato,
  atividadeParaContrato,
  atividadeVazia,
} from '@/data/atividades-api'
import { instalarServidor, json, problema } from '@/test/servidor'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import contrato from '../../contracts/openapi-v1.json'

/**
 * A fronteira das atividades contra SERVIDOR FALSO, nunca contra mock do módulo.
 *
 * O cliente gerado chama `fetch(new Request(...))`: verbo e corpo vêm do
 * `Request`. Aqui isso importa mais do que de costume, porque o recurso tem
 * `POST` em dois caminhos (`/api/activities` e `…/{id}/done`) e um `PUT` — stub
 * que casasse só por caminho deixaria os três se confundirem em silêncio.
 */

function atividade(over: Partial<ActivityDto> = {}): ActivityDto {
  return {
    id: 'ativ-1',
    entityType: 'opportunity',
    entityId: 'op-1',
    kind: 'call',
    title: 'Ligar para confirmar a visita',
    dueDate: '2026-08-20',
    assigneeEmployeeId: 'emp-2',
    assigneeName: 'Ana Beatriz Lima',
    doneAt: null,
    notes: 'Depois das 14h.',
    ...over,
  }
}

describe('fronteira das atividades', () => {
  let servidor: ReturnType<typeof instalarServidor>

  beforeEach(() => {
    servidor = instalarServidor({
      '/api/activities': (chamada) =>
        chamada.metodo === 'POST'
          ? json(atividade({ id: 'ativ-nova' }), 201)
          : json({ rows: [atividade()], total: 1 }),
      '/api/activities/ativ-1': () => json(atividade({ title: 'Ligar de novo' })),
      '/api/activities/ativ-1/done': () => json(atividade({ doneAt: '2026-08-14T12:00:00Z' })),
    })
  })

  afterEach(() => vi.unstubAllGlobals())

  it('o alvo viaja como PAR — entityType e entityId na mesma consulta', async () => {
    await listActivities({ entityType: 'opportunity', entityId: 'op-1', page: 1, pageSize: 100 })

    const url = new URL(servidor.em('/api/activities')[0]?.url ?? '')
    expect(url.searchParams.get('entityType')).toBe('opportunity')
    expect(url.searchParams.get('entityId')).toBe('op-1')
    expect(url.searchParams.get('pageSize')).toBe('100')
  })

  it('criar é POST na coleção e alterar é PUT no item — caminhos e verbos distintos', async () => {
    await createActivity(atividadeParaContrato(atividadeDoContrato(atividade())))
    await updateActivity('ativ-1', atividadeParaContrato(atividadeDoContrato(atividade())))

    expect(servidor.em('/api/activities')[0]?.metodo).toBe('POST')
    expect(servidor.em('/api/activities/ativ-1')[0]?.metodo).toBe('PUT')
  })

  it('concluir é UM POST no caminho próprio, com corpo VAZIO — a hora é do servidor', async () => {
    const resposta = await completeActivity('ativ-1')
    const concluida = dadosOuErro<ActivityDto>(resposta, 'falhou')

    const chamadas = servidor.em('/api/activities/ativ-1/done')
    expect(chamadas).toHaveLength(1)
    expect(chamadas[0]?.metodo).toBe('POST')
    expect(chamadas[0]?.corpo).toBeNull()
    expect(concluida.doneAt).toBe('2026-08-14T12:00:00Z')
    // Nenhum PUT junto: concluir não reescreve o registro inteiro.
    expect(servidor.em('/api/activities/ativ-1')).toHaveLength(0)
  })

  it('o corpo de escrita NÃO carrega doneAt — o cliente não carimba histórico', async () => {
    const corpo = atividadeParaContrato(atividadeDoContrato(atividade({ doneAt: '2026-08-01' })))
    expect(corpo).not.toHaveProperty('doneAt')
  })

  it('prazo e observação em branco viajam como null, não como texto vazio', () => {
    const corpo = atividadeParaContrato(atividadeVazia({ tipo: 'partner', id: 'parc-1' }))
    expect(corpo.dueDate).toBeNull()
    expect(corpo.notes).toBeNull()
    expect(corpo.entityType).toBe('partner')
    expect(corpo.entityId).toBe('parc-1')
  })

  it('o 400 do alvo incompleto chega com o detail do servidor, não "algo deu errado"', async () => {
    vi.unstubAllGlobals()
    instalarServidor({
      '/api/activities': () => problema(400, 'entityType e entityId viajam juntos.'),
    })

    const resposta = await listActivities({ entityId: 'op-1' })
    try {
      dadosOuErro(resposta, 'Falha ao carregar as atividades.')
      expect.unreachable('deveria ter lançado')
    } catch (erro) {
      expect(erro).toBeInstanceOf(ErroDaApi)
      expect((erro as ErroDaApi).status).toBe(400)
      expect((erro as ErroDaApi).detail).toBe('entityType e entityId viajam juntos.')
    }
  })

  it('concluir a já concluída é 409, e o erro carrega o motivo', async () => {
    vi.unstubAllGlobals()
    instalarServidor({
      '/api/activities/ativ-1/done': () => problema(409, 'Atividade já concluída.'),
    })

    const resposta = await completeActivity('ativ-1')
    try {
      dadosOuErro(resposta, 'Falha ao concluir a atividade.')
      expect.unreachable('deveria ter lançado')
    } catch (erro) {
      expect((erro as ErroDaApi).status).toBe(409)
      expect((erro as ErroDaApi).detail).toBe('Atividade já concluída.')
    }
  })
})

/**
 * Atraso é comparação por DIA, e é o que o painel usa para tingir a linha.
 * Errar o lado disto marca de vermelho a atividade que vence hoje.
 */
describe('atraso da atividade', () => {
  it('vencida e pendente está atrasada; a de hoje não está', () => {
    expect(atividadeAtrasada(atividade({ dueDate: '2026-08-13' }), '2026-08-14')).toBe(true)
    expect(atividadeAtrasada(atividade({ dueDate: '2026-08-14' }), '2026-08-14')).toBe(false)
  })

  it('concluída nunca está atrasada, nem sem prazo', () => {
    expect(
      atividadeAtrasada(atividade({ dueDate: '2026-08-01', doneAt: '2026-08-05' }), '2026-08-14'),
    ).toBe(false)
    expect(atividadeAtrasada(atividade({ dueDate: null }), '2026-08-14')).toBe(false)
  })
})

/**
 * A ordenação da tabela é a whitelist do SERVIDOR, e a divergência é muda: o
 * `sortBy` fora da lista responde 400 só quando alguém pedir aquela ordem. Por
 * isso a lista se confere contra o TEXTO do contrato, não contra cópia à mão.
 */
describe('whitelist de ordenação', () => {
  it('ORDENAVEIS_ATIVIDADE é o que o contrato declara aceitar', () => {
    const descricao = (
      contrato as unknown as { paths: Record<string, { get: { description: string } }> }
    ).paths['/api/activities']?.get.description

    for (const campo of ORDENAVEIS_ATIVIDADE) {
      expect(descricao, `contrato não cita ${campo} como ordenável`).toContain(`\`${campo}\``)
    }
  })
})
