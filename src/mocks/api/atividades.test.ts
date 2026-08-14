import { configurarApi } from '@/api/cliente'
import {
  authLogin,
  authSetActiveTenant,
  completeActivity,
  createActivity,
  listActivities,
  updateActivity,
} from '@/api/gerado'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { resetAtividades } from './atividades'
import { resetCrm } from './crm'
import { handlers } from './handlers'
import { TENANT_MATRIZ, resetStore, store } from './store'

/**
 * Trava as SEMÂNTICAS da atividade no modo mock, não o dado do seed.
 *
 * O que se prova aqui é o desenho que o contrato pediu: o alvo é um par, quem
 * carimba a conclusão é o servidor, e a atividade não muda de registro. Se o
 * mock divergir disso, o painel treina contra um servidor que não existe — e o
 * preço aparece na integração.
 */

const servidor = setupServer(...handlers)

beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }))
afterEach(() => servidor.resetHandlers())
afterAll(() => servidor.close())

beforeEach(async () => {
  resetStore()
  resetCrm()
  resetAtividades()
  configurarApi('http://mock.teste')
  await authLogin({ email: 'admin@vertz.dev', password: 'qualquer' })
  await authSetActiveTenant({ tenantId: TENANT_MATRIZ })
})

const DA_OPORTUNIDADE = { entityType: 'opportunity', entityId: 'op-0001', pageSize: 100 } as const

describe('atividades no mock', () => {
  it('o alvo é um PAR: entityId sem entityType é 400, não a lista inteira', async () => {
    const resposta = await listActivities({ entityId: 'op-0001' })
    expect(resposta.status).toBe(400)
  })

  it('a listagem do registro traz só o dele, pendentes antes de concluídas', async () => {
    const resposta = await listActivities(DA_OPORTUNIDADE)
    expect(resposta.status).toBe(200)
    if (resposta.status !== 200) return

    const linhas = resposta.data.rows
    expect(linhas.every((a) => a.entityId === 'op-0001')).toBe(true)

    const concluidas = linhas.map((a) => Boolean(a.doneAt))
    expect(concluidas, 'concluída no meio das pendentes quebra a leitura do painel').toEqual(
      [...concluidas].sort((a, b) => Number(a) - Number(b)),
    )
  })

  it('entre pendentes, o prazo mais próximo vem primeiro e o sem prazo por último', async () => {
    const resposta = await listActivities({ pageSize: 100 })
    expect(resposta.status).toBe(200)
    if (resposta.status !== 200) return

    const prazos = resposta.data.rows.filter((a) => !a.doneAt).map((a) => a.dueDate ?? null)
    const comPrazo = prazos.filter((p): p is string => p !== null)
    expect(comPrazo, 'a ordem do painel é a do prazo').toEqual([...comPrazo].sort())
    expect(prazos.indexOf(null) === -1 || prazos.indexOf(null) === prazos.length - 1).toBe(true)
  })

  it('`open` separa o que espera alguém do que já é histórico', async () => {
    const abertas = await listActivities({ ...DA_OPORTUNIDADE, open: true })
    const fechadas = await listActivities({ ...DA_OPORTUNIDADE, open: false })
    if (abertas.status !== 200 || fechadas.status !== 200) throw new Error('listagem falhou')

    expect(abertas.data.rows.every((a) => !a.doneAt)).toBe(true)
    expect(fechadas.data.rows.every((a) => Boolean(a.doneAt))).toBe(true)
    expect(fechadas.data.total).toBeGreaterThan(0)
  })

  it('criar sobre registro que não existe é 404 — a tabela não tem FK para o alvo', async () => {
    const resposta = await createActivity({
      entityType: 'opportunity',
      entityId: 'op-que-nao-existe',
      kind: 'call',
      title: 'Ligar',
    })
    expect(resposta.status).toBe(404)
  })

  it('a criada nasce PENDENTE, com o nome do responsável resolvido pelo servidor', async () => {
    const criada = await createActivity({
      entityType: 'opportunity',
      entityId: 'op-0001',
      kind: 'meeting',
      title: 'Visita técnica',
      dueDate: '2026-09-01',
      assigneeEmployeeId: 'emp-0002',
    })
    expect(criada.status).toBe(201)
    if (criada.status !== 201) return

    expect(criada.data.doneAt ?? null).toBeNull()
    // O nome NÃO vem no corpo de escrita: quem o resolve é quem guarda o id.
    expect(criada.data.assigneeName).toBe('Ana Beatriz Lima')
  })

  it('concluir carimba a hora NO SERVIDOR, e a segunda vez é 409', async () => {
    const concluida = await completeActivity('ativ-0001')
    expect(concluida.status).toBe(200)
    if (concluida.status !== 200) return
    expect(concluida.data.doneAt).toBeTruthy()

    const denovo = await completeActivity('ativ-0001')
    expect(denovo.status, 'reconcluir reescreveria a data do que já é histórico').toBe(409)
  })

  it('o PUT não move a atividade de registro', async () => {
    const resposta = await updateActivity('ativ-0001', {
      entityType: 'partner',
      entityId: 'parc-0002',
      kind: 'call',
      title: 'Sequestrada para outro cadastro',
    })
    expect(resposta.status).toBe(400)
  })

  it('o PUT substitui o registro inteiro — campo ausente é campo apagado', async () => {
    const resposta = await updateActivity('ativ-0001', {
      entityType: 'opportunity',
      entityId: 'op-0001',
      kind: 'task',
      title: 'Só o título mudou',
    })
    expect(resposta.status).toBe(200)
    if (resposta.status !== 200) return

    expect(resposta.data.title).toBe('Só o título mudou')
    expect(resposta.data.dueDate ?? null).toBeNull()
    expect(resposta.data.assigneeEmployeeId ?? null).toBeNull()
    expect(resposta.data.notes ?? null).toBeNull()
  })

  it('concluir NÃO passa pelo corpo de escrita: o PUT não tem doneAt para mandar', async () => {
    await completeActivity('ativ-0001')
    const resposta = await updateActivity('ativ-0001', {
      entityType: 'opportunity',
      entityId: 'op-0001',
      kind: 'call',
      title: 'Alterada depois de concluída',
    })
    expect(resposta.status).toBe(200)
    if (resposta.status !== 200) return

    // A conclusão sobrevive à alteração: o `PUT` não a toca nem a apaga.
    expect(resposta.data.doneAt).toBeTruthy()
  })

  it('sessão sem empresa ativa responde lista VAZIA, não erro', async () => {
    store.activeTenantId = null
    const resposta = await listActivities(DA_OPORTUNIDADE)
    expect(resposta.status).toBe(200)
    if (resposta.status !== 200) return
    expect(resposta.data.rows).toHaveLength(0)
  })
})
