import { configurarApi } from '@/api/cliente'
import type { SavedViewDto } from '@/api/gerado'
import {
  authLogin,
  authSetActiveTenant,
  createMyView,
  deleteMyView,
  listMyViews,
  updateMyView,
} from '@/api/gerado'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { handlers } from './handlers'
import { TENANT_MATRIZ, resetStore } from './store'

/**
 * As SEMÂNTICAS das views salvas no modo mock (D13).
 *
 * O caminho é `Proposto` e nenhum servidor o implementa: este arquivo e o
 * `views.ts` ao lado são a primeira especificação executável da regra. E aqui
 * ela tem uma parte que nenhum outro mock tem — **a gravação sobrevive ao
 * recarregamento**, porque view salva que some no F5 ensina que o recurso não
 * funciona, e o site público é 100% mock.
 */

const servidor = setupServer(...handlers)

beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }))
afterEach(() => servidor.resetHandlers())
afterAll(() => servidor.close())

beforeEach(async () => {
  resetStore()
  localStorage.clear()
  configurarApi('http://mock.teste')
  await authLogin({ email: 'admin@vertz.dev', password: 'qualquer' })
  await authSetActiveTenant({ tenantId: TENANT_MATRIZ })
})

const CONSULTA = {
  route: '/compras/ordens',
  name: 'Atrasadas',
  color: 'amber' as const,
  filters: [{ field: 'status', operator: 'eq' as const, value: 'late' }],
  joinOperator: 'and' as const,
  sortBy: 'code',
  sortDesc: true,
  groupBy: '',
  columns: ['code', 'supplierName'],
  mode: 'lista',
  favorite: false,
}

/** A resposta gerada é união por status; ler `.data` direto não compila. */
function criada(resposta: { status: number; data?: unknown }): SavedViewDto {
  if (resposta.status !== 201) throw new Error(`esperava 201, veio ${resposta.status}`)
  return resposta.data as SavedViewDto
}

function lidas(resposta: { status: number; data?: unknown }): SavedViewDto[] {
  if (resposta.status !== 200) throw new Error(`esperava 200, veio ${resposta.status}`)
  return resposta.data as SavedViewDto[]
}

describe('views salvas no mock', () => {
  it('cria, lê de volta e devolve o que foi mandado', async () => {
    const view = criada(await createMyView(CONSULTA))

    expect(view.id).toMatch(/[0-9a-f-]{36}/)
    expect(view).toMatchObject({ name: 'Atrasadas', color: 'amber', sortBy: 'code' })
    expect(view.filters).toEqual([{ field: 'status', operator: 'eq', value: 'late' }])

    expect(lidas(await listMyViews())).toHaveLength(1)
  })

  it('quem cria decide a estrela — e sem dizer nada ela nasce apagada', async () => {
    // A listagem salva consulta sem fixar; a estrela do item de nav cria já
    // fixada. Um clique, uma requisição — ver o comentário em `views.ts`.
    expect(criada(await createMyView({ ...CONSULTA, favorite: true })).favorite).toBe(true)

    const { favorite: _fora, ...semDizer } = CONSULTA
    expect(criada(await createMyView(semDizer)).favorite).toBe(false)
  })

  it('a gravação sobrevive ao recarregamento — é o ponto do localStorage', async () => {
    await createMyView(CONSULTA)

    // O F5 do modo mock é isto: o estado em memória some inteiro. Todo o resto
    // de `src/mocks/api/` volta à semente aqui; a view salva NÃO pode voltar.
    resetStore()
    await authLogin({ email: 'admin@vertz.dev', password: 'qualquer' })
    await authSetActiveTenant({ tenantId: TENANT_MATRIZ })

    expect(lidas(await listMyViews()).map((v) => v.name)).toEqual(['Atrasadas'])
    // E o dado está mesmo FORA do store — a chave versionada é onde ele mora.
    expect(localStorage.getItem('cabinet.views-salvas.v1')).toContain('Atrasadas')
  })

  it('recorta por rota quando a tela pede, e devolve tudo quando a barra pede', async () => {
    await createMyView(CONSULTA)
    await createMyView({ ...CONSULTA, route: '/vendas/orcamentos', name: 'Semana' })

    expect(lidas(await listMyViews({ route: '/vendas/orcamentos' })).map((v) => v.name)).toEqual([
      'Semana',
    ])
    expect(lidas(await listMyViews())).toHaveLength(2)
  })

  it('PUT substitui o registro inteiro — campo omitido volta ao padrão', async () => {
    const view = criada(await createMyView(CONSULTA))

    const resposta = await updateMyView(view.id, { route: CONSULTA.route, name: 'Só o nome' })

    expect(resposta.status).toBe(200)
    const atualizada = resposta.data as SavedViewDto
    expect(atualizada).toMatchObject({ name: 'Só o nome', color: 'neutro', sortBy: null })
    expect(atualizada.filters).toEqual([])
  })

  it('favoritar é o mesmo PUT, e a leitura seguinte já traz a estrela', async () => {
    const view = criada(await createMyView(CONSULTA))

    await updateMyView(view.id, { ...CONSULTA, favorite: true })

    expect(lidas(await listMyViews())[0]?.favorite).toBe(true)
  })

  it('apaga, e apagar de novo é 404', async () => {
    const view = criada(await createMyView(CONSULTA))

    expect((await deleteMyView(view.id)).status).toBe(204)
    expect(lidas(await listMyViews())).toEqual([])
    expect((await deleteMyView(view.id)).status).toBe(404)
  })

  it('sem nome é 400 com o campo apontado, não uma view sem rótulo', async () => {
    const resposta = await createMyView({ ...CONSULTA, name: '   ' })

    expect(resposta.status).toBe(400)
    expect(resposta.data).toMatchObject({
      fields: [{ path: 'name', message: 'Dê um nome à consulta.' }],
    })
  })

  it('sem empresa ativa a escrita é 409 — a borda recusa antes do handler', async () => {
    resetStore()
    await authLogin({ email: 'admin@vertz.dev', password: 'qualquer' })
    // Sem `authSetActiveTenant`: o login do mock já escolhe a primeira empresa,
    // então o estado sem empresa se produz zerando o que ele escolheu.
    const { store } = await import('./store')
    store.activeTenantId = null

    expect((await createMyView(CONSULTA)).status).toBe(409)
  })

  it('a lista sai em ordem: posição primeiro, nome no empate', async () => {
    await createMyView({ ...CONSULTA, name: 'Bravo' })
    await createMyView({ ...CONSULTA, name: 'Alfa' })

    // Criadas na mesma rota, ganham posições 0 e 1 — a ordem de criação vale, e
    // o nome só decide quando a posição empata.
    expect(lidas(await listMyViews()).map((v) => v.name)).toEqual(['Bravo', 'Alfa'])
  })
})
