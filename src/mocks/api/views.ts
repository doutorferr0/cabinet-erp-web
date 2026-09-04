import type { SavedViewDto, SavedViewWriteRequest } from '@/api/gerado'
import { http, HttpResponse } from 'msw'
import { camposInvalidos, naoEncontrado, semEmpresaAtiva, semSessao } from './problema'
import { store } from './store'

/**
 * O "backend" das VIEWS SALVAS no modo mock — `/api/me/views` (D13).
 *
 * ## Por que este é o único mock que grava FORA do store
 *
 * Todo o resto de `src/mocks/api/` vive no `store` em memória, e some no F5 de
 * propósito: dado de demonstração que sobrevivesse ao recarregamento deixaria o
 * `cabinetonline.cc` divergindo de visitante para visitante, e a semente
 * deixaria de ser a mesma coisa para todo mundo.
 *
 * **View salva é o oposto disso.** Ela existe justamente para durar mais que a
 * sessão: o operador nomeia a consulta que refaz toda segunda-feira, fixa na
 * barra lateral, e na segunda seguinte ela tem de estar lá. Um mock que a
 * perdesse no reload ensinaria que o recurso não funciona — e o site público é
 * 100% mock, então o que ele ensina é o que o produto parece ser.
 *
 * Por isso `localStorage`, com a chave carregando `v1`: mudança de forma vira
 * chave nova, em vez de conteúdo velho lido como se fosse novo. Toda leitura
 * tolera lixo — view corrompida sai da lista e as outras seguem; perder uma view
 * é aborrecimento, perder a barra lateral por causa de um valor gravado é
 * defeito.
 *
 * ## "Por usuário" aqui é "por navegador", e a diferença é honesta
 *
 * O contrato diz que o dono sai da SESSÃO, e nunca do corpo nem da URL. O mock
 * não tem mais de um usuário para separar — `store.logado` é booleano —, então
 * a separação que ele consegue oferecer é a do navegador. É menos do que o
 * servidor fará e é tudo o que este lado pode afirmar; inventar um `userId`
 * aqui daria a impressão de que a regra está coberta quando quem a cobre é o
 * backend.
 */

const CHAVE = 'cabinet.views-salvas.v1'

function ehView(valor: unknown): valor is SavedViewDto {
  if (!valor || typeof valor !== 'object') return false
  const v = valor as Partial<SavedViewDto>
  return typeof v.id === 'string' && typeof v.route === 'string' && typeof v.name === 'string'
}

/** Completa o que faltar: a view gravada por uma versão anterior continua válida. */
function normalizar(v: SavedViewDto): SavedViewDto {
  return {
    ...v,
    color: v.color ?? 'neutro',
    filters: Array.isArray(v.filters) ? v.filters : [],
    joinOperator: v.joinOperator === 'or' ? 'or' : 'and',
    sortBy: v.sortBy ?? null,
    sortDesc: v.sortDesc === true,
    groupBy: typeof v.groupBy === 'string' ? v.groupBy : '',
    columns: Array.isArray(v.columns) ? v.columns : [],
    mode: typeof v.mode === 'string' ? v.mode : '',
    favorite: v.favorite === true,
    position: typeof v.position === 'number' ? v.position : 0,
  }
}

export function lerViews(): SavedViewDto[] {
  try {
    const bruto = localStorage.getItem(CHAVE)
    if (!bruto) return []
    const lido: unknown = JSON.parse(bruto)
    if (!Array.isArray(lido)) return []
    return lido.filter(ehView).map(normalizar)
  } catch {
    // Sem `localStorage` (modo privado, política do navegador) ou com JSON
    // quebrado, o operador abre sem view salva. É o único fim aceitável: a
    // listagem não depende delas para funcionar.
    return []
  }
}

function gravarViews(views: readonly SavedViewDto[]): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(views))
  } catch {
    // Cota estourada ou armazenamento bloqueado: a resposta já foi montada e a
    // tela segue com a view em cache. Falhar a gravação não pode desfazer o que
    // o operador acabou de nomear.
  }
}

/** Só a de dentro da tela: `position` primeiro, `name` para desempatar. */
function emOrdem(views: readonly SavedViewDto[]): SavedViewDto[] {
  return [...views].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0) || a.name.localeCompare(b.name, 'pt-BR'),
  )
}

function corpoInvalido(corpo: Partial<SavedViewWriteRequest>) {
  const fields = [
    ...(corpo.name?.trim() ? [] : [{ path: 'name', message: 'Dê um nome à consulta.' }]),
    ...(corpo.route?.trim() ? [] : [{ path: 'route', message: 'Informe a tela da consulta.' }]),
  ]
  return fields.length > 0 ? camposInvalidos(fields) : null
}

/** O corpo inteiro vira registro: PUT substitui, campo omitido volta ao padrão. */
function daEscrita(corpo: SavedViewWriteRequest, id: string): SavedViewDto {
  return normalizar({ ...(corpo as SavedViewDto), id })
}

export const handlersDeViews = [
  http.get('*/api/me/views', ({ request }) => {
    if (!store.logado) return semSessao()

    const rota = new URL(request.url).searchParams.get('route')
    const todas = emOrdem(lerViews())
    return HttpResponse.json(rota ? todas.filter((v) => v.route === rota) : todas)
  }),

  http.post('*/api/me/views', async ({ request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()

    const corpo = (await request.json()) as SavedViewWriteRequest
    const invalido = corpoInvalido(corpo)
    if (invalido) return invalido

    const views = lerViews()
    // A POSIÇÃO é do servidor: a view entra no fim da fila da tela dela. O
    // `favorite`, não — quem cria decide. "Salvar consulta" na listagem manda
    // `false` (a estrela é um segundo gesto, e salvar já fixado encheria a barra
    // lateral); a estrela do item de nav manda `true`, porque ali o gesto É
    // fixar. Forçar `false` aqui obrigaria a estrela a fazer POST e PUT para um
    // clique só, com uma janela entre os dois em que a view existe sem aparecer.
    const criada = daEscrita(
      { ...corpo, position: views.filter((v) => v.route === corpo.route).length },
      crypto.randomUUID(),
    )
    gravarViews([...views, criada])
    return HttpResponse.json(criada, { status: 201 })
  }),

  http.put('*/api/me/views/:id', async ({ params, request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()

    const views = lerViews()
    const alvo = views.find((v) => v.id === String(params.id))
    if (!alvo) return naoEncontrado('Consulta salva não encontrada.')

    const corpo = (await request.json()) as SavedViewWriteRequest
    const invalido = corpoInvalido(corpo)
    if (invalido) return invalido

    const atualizada = daEscrita(corpo, alvo.id)
    gravarViews(views.map((v) => (v.id === alvo.id ? atualizada : v)))
    return HttpResponse.json(atualizada)
  }),

  http.delete('*/api/me/views/:id', ({ params }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()

    const views = lerViews()
    if (!views.some((v) => v.id === String(params.id))) {
      return naoEncontrado('Consulta salva não encontrada.')
    }

    gravarViews(views.filter((v) => v.id !== String(params.id)))
    return new HttpResponse(null, { status: 204 })
  }),
]
