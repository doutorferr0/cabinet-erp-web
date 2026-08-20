import type { CatalogLookupCreateRequest, CatalogLookupUpdateRequest } from '@/api/gerado'
import { normalize } from '@/lib/texto'
import { VOCABULARIO_DE_APOIO } from '@/mocks/lookups'
import { http, HttpResponse } from 'msw'
import { camposInvalidos, conflito, naoEncontrado, semEmpresaAtiva, semSessao } from './problema'
import { novoId, store } from './store'

/**
 * A ESCRITA das listas de apoio — o `+...` de todo combo (§9 padrão 2).
 *
 * `POST /api/catalog-lookups` e `PUT /api/catalog-lookups/{id}` estão no
 * contrato desde a #250 e **nenhum handler os servia**: o cadastro rápido do
 * `LookupCombo` grava LOCAL, com id prefixado `novo:`, e o operador do modo mock
 * nunca via a recusa que o servidor de verdade dá. As duas regras que mais
 * importam — vocabulário de `kind` e nome único no kind — só existiam do lado do
 * backend, então o defeito de tela contra elas ficaria guardado para a
 * integração. Elas existem aqui agora, com o MESMO formato de erro.
 *
 * A leitura (`GET`) continua em `handlers.ts`: ela depende do `listar`/
 * `lerConsulta` de lá, que são privados, e importá-los daqui fecharia o ciclo
 * que `crm.ts`, `obras.ts` e `atividades.ts` já contornam do mesmo jeito.
 *
 * ## O que este mock espelha do `cabinet-erp-api`
 *
 * - **`kind` é vocabulário do SERVIDOR, não do contrato.** O contrato declara
 *   `kind` como string livre de propósito (lista é dado de instalação), e é o
 *   servidor que decide o que aceita gravar — kind digitado errado criaria lista
 *   fantasma que combo nenhum lê, e a leitura daquele kind responderia 200 vazio
 *   para sempre. Aqui o vocabulário é o do próprio mock (`VOCABULARIO_DE_APOIO`).
 * - **Nome único entre os ATIVOS do mesmo kind**, comparado sem acento e sem
 *   caixa — a `sem_acento` do índice `uq_catalog_lookups_kind_nome`. Item que
 *   nasce inativo não disputa nome com ninguém, que é o `WHERE active` do índice.
 * - **`kind` não muda no `PUT`.** Mover um item de lista mudaria o significado
 *   de toda referência que já aponta para o id.
 * - **Escrita exige empresa ativa** (409), mesmo o recurso sendo da organização:
 *   é a borda do backend que para antes do handler, e o mock para no mesmo lugar.
 *
 * O que ele NÃO espelha: o 403 de papel insuficiente (`admin` para lista de
 * apoio). O mock ainda não tem papel na sessão — quem o trouxer traz o 403 com
 * `urn:cabinet:erro:papel-insuficiente`, que já está no vocabulário do contrato.
 */

/** Os kinds que este servidor falso aceita gravar — os que ele mesmo semeia. */
const KINDS = Object.keys(VOCABULARIO_DE_APOIO)

/** Nome e `active` são obrigatórios de NEGÓCIO nas duas escritas. */
function conferirNomeEAtivo(nome: string, active: boolean | null | undefined) {
  const erros = []
  if (!nome) erros.push({ path: 'name', message: 'Informe o nome.' })
  // O contrato declara os obrigatórios como chave presente com valor anulável:
  // `null` aqui é 400 com o campo destacado, não gravação de item sem estado.
  if (active === null || active === undefined) {
    erros.push({ path: 'active', message: 'Informe se a opção está ativa.' })
  }
  return erros
}

/**
 * O nome já está em uso NESTA lista?
 *
 * `ignorandoId` é o próprio item no `PUT` — sem ele, renomear "Stella" para
 * "Stella" seria conflito consigo mesmo.
 */
function nomeOcupado(kind: string, nome: string, ativo: boolean, ignorandoId: string | null) {
  if (!ativo) return false
  return store.lookups.some(
    (l) =>
      l.kind === kind && l.active && l.id !== ignorandoId && normalize(l.name) === normalize(nome),
  )
}

export const handlersDeLookups = [
  http.post('*/api/catalog-lookups', async ({ request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()

    const corpo = (await request.json()) as CatalogLookupCreateRequest
    const kind = (corpo.kind ?? '').trim()
    const nome = (corpo.name ?? '').trim()
    const erros = []
    if (!kind) {
      erros.push({ path: 'kind', message: 'Informe a lista.' })
    } else if (!KINDS.includes(kind)) {
      erros.push({ path: 'kind', message: `Lista desconhecida. Use uma de: ${KINDS.join(', ')}.` })
    }
    erros.push(...conferirNomeEAtivo(nome, corpo.active))
    if (erros.length > 0) return camposInvalidos(erros)

    if (nomeOcupado(kind, nome, corpo.active === true, null)) {
      return conflito(`Já existe "${nome}" nesta lista.`)
    }

    const item = { id: novoId('lk'), kind, name: nome, active: corpo.active }
    store.lookups.push(item)
    return HttpResponse.json(item, { status: 201 })
  }),

  http.put('*/api/catalog-lookups/:id', async ({ params, request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()

    const item = store.lookups.find((l) => l.id === params.id)
    if (!item) return naoEncontrado('Opção de lista não encontrada.')

    const corpo = (await request.json()) as CatalogLookupUpdateRequest & { kind?: string | null }
    const nome = (corpo.name ?? '').trim()
    const erros = []
    const kindPedido = (corpo.kind ?? '').trim()
    // `kind` ausente é o normal: o contrato não o declara no corpo do `PUT`.
    // Recusar a ausência quebraria o cliente que segue o contrato à risca.
    if (kindPedido && kindPedido !== item.kind) {
      erros.push({
        path: 'kind',
        message: 'A lista de uma opção não muda. Desative esta e inclua na lista certa.',
      })
    }
    erros.push(...conferirNomeEAtivo(nome, corpo.active))
    if (erros.length > 0) return camposInvalidos(erros)

    if (nomeOcupado(item.kind, nome, corpo.active === true, item.id)) {
      return conflito(`Já existe "${nome}" nesta lista.`)
    }

    item.name = nome
    item.active = corpo.active
    return HttpResponse.json(item)
  }),
]
