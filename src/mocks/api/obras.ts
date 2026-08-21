import type { WorkDto, WorkWriteRequest } from '@/api/gerado'
import { http, HttpResponse } from 'msw'
import { type CamposFiltraveis, aplicarFiltros } from './filtro-do-servidor'
import {
  TIPO,
  camposInvalidos,
  naoEncontrado,
  problemaJson,
  semEmpresaAtiva,
  semSessao,
} from './problema'
import { TENANT_FILIAL, TENANT_MATRIZ, novoId, store } from './store'

/**
 * O "backend" das OBRAS no modo mock (`/api/works`, contrato #255).
 *
 * Arquivo próprio pela mesma razão do CRM e das atividades: estado que não
 * pertence ao store das telas antigas, e uma árvore com mais de um agente —
 * arquivo novo não conflita com quem edita o vizinho.
 *
 * ## A obra é dado de EMPRESA, e é isso que este mock ENSINA
 *
 * A decisão está escrita na descrição de `WorkDto` e foi medida no legado: a
 * tabela `Obras` carrega `Emp_codigo`, e a `Venda` que a referencia é da
 * empresa. Aqui ela vira comportamento observável: **a listagem recorta pela
 * empresa ativa, e obra de outra empresa responde 404** — não lista vazia, não
 * 403. É a mesma resposta que `GET /api/partners/{id}` dá para parceiro sem
 * vínculo, e pelo mesmo motivo: do ponto de vista de quem pergunta, não está lá.
 *
 * Um mock que ignorasse o recorte deixaria a tela nascer certa por acidente e
 * quebrar no dia da migração, que é justamente o dia em que ninguém está
 * olhando para a listagem de obras.
 *
 * ## O que este mock NÃO faz, e por quê
 *
 * O contrato diz que **trocar o cliente de uma obra que já tem orçamento é
 * 409**. Aqui a condição é INEXPRIMÍVEL: o `QuoteDto` ainda não publica
 * `workId` (é o item que ficou no hub da #255), então nenhum orçamento do mock
 * aponta para obra nenhuma. Escrever a recusa assim mesmo daria um 409 que
 * nunca dispara — código morto com cara de regra — ou, pior, um 409 sempre, que
 * é uma regra diferente da que o contrato escreveu. Quando `workId` entrar no
 * orçamento, a checagem nasce AQUI, e o teste que a cobra nasce junto.
 */

/**
 * A whitelist de `sortBy` — e ela NÃO é mais a de `filters`.
 *
 * `customerName` ordena e não filtra, e é o contrato que separa as duas: filtrar
 * por nome de cliente seria uma segunda forma de perguntar o que `customerId` já
 * responde (o combo escolhe o cliente e manda o id), enquanto ordenar acontece
 * sobre o que já veio — e o operador ordena pelo que LÊ, que é o nome.
 *
 * Ordenar aqui é barato porque a lista já foi montada com `workDto`, que resolve
 * `customerName` a partir de `store.parceiros`. No servidor o campo sai de
 * `LEFT JOIN partners`, como `partnerName` em `/api/crm/opportunities`.
 */
const ORDENAVEIS = ['customerId', 'description', 'workType', 'active', 'customerName']

/** A de `filters`, menor de propósito — ver acima. */
const FILTRAVEIS: CamposFiltraveis = {
  customerId: 'text',
  description: 'text',
  workType: 'text',
  active: 'boolean',
}

/**
 * A obra COMO O STORE a guarda: o `WorkDto` mais o `tenantId`.
 *
 * `tenantId` não está no DTO de propósito — o servidor não devolve a coluna de
 * RLS, ele a USA para decidir o que devolver. Guardá-la fora do DTO é o que
 * mantém o mock incapaz de vazá-la para a tela por descuido.
 */
export interface ObraDaEmpresa extends Omit<WorkDto, 'customerName'> {
  tenantId: string
}

interface EstadoDasObras {
  obras: ObraDaEmpresa[]
}

function estadoInicial(): EstadoDasObras {
  return {
    obras: [
      {
        id: 'obra-0001',
        tenantId: TENANT_MATRIZ,
        // A cliente do seed (`parc-0002`) é a arquiteta: é dela que saem as
        // obras, e é o par que a tela de orçamento vai exercitar.
        customerId: 'parc-0002',
        description: 'APARTAMENTO IBIRAPUERA 142',
        workType: 'RESIDENCIAL',
        address: {
          zipCode: '04094050',
          street: 'Alameda dos Arapanés',
          number: '142',
          complement: 'AP 91',
          district: 'Indianópolis',
          city: 'SÃO PAULO',
          state: 'SP',
        },
        active: true,
      },
      {
        id: 'obra-0002',
        tenantId: TENANT_MATRIZ,
        customerId: 'parc-0002',
        // Obra SEM endereço: no legado ela nasce com a descrição e ganha o
        // endereço depois. `null` no objeto inteiro é um estado do contrato.
        description: 'SHOWROOM CAMBUÍ',
        workType: 'COMERCIAL',
        address: null,
        active: true,
      },
      {
        id: 'obra-0003',
        // De OUTRA empresa, e é o registro mais útil do seed: é ele que prova
        // que o recorte por empresa existe. Some da listagem da matriz e
        // responde 404 no detalhe, em vez de aparecer para quem não é dono.
        tenantId: TENANT_FILIAL,
        customerId: 'parc-0003',
        description: 'CONDOMÍNIO HORIZONTE — TORRE B',
        workType: 'CORPORATIVA',
        address: null,
        active: false,
      },
    ],
  }
}

export const obras: EstadoDasObras = estadoInicial()

/** Devolve as obras ao seed — o `resetStore()` daqui, para os testes. */
export function resetObras(): void {
  Object.assign(obras, estadoInicial())
}

/** O `WorkDto` do contrato: a obra do store + o nome do cliente, DERIVADO. */
function workDto(obra: ObraDaEmpresa): WorkDto {
  const { tenantId: _tenantId, ...doContrato } = obra
  return {
    ...doContrato,
    // Derivado, nunca guardado — nome gravado é nome que diverge do id na
    // primeira alteração da razão social. É a mesma regra de `parentName`.
    customerName: store.parceiros.find((p) => p.id === obra.customerId)?.legalName ?? null,
  }
}

/** As obras da empresa ativa. Fora dela, a obra não existe para quem pergunta. */
function daEmpresa(tenantId: string): ObraDaEmpresa[] {
  return obras.obras.filter((obra) => obra.tenantId === tenantId)
}

/**
 * O cliente existe E está ao alcance da empresa ativa?
 *
 * 404 e não 400: `customerId` de um parceiro que a empresa não atende é, do
 * ponto de vista dela, um cliente que não está lá — a mesma leitura que o
 * detalhe de parceiro já faz.
 */
function clienteAoAlcance(customerId: string, tenantId: string): boolean {
  const parceiro = store.parceiros.find((p) => p.id === customerId)
  return Boolean(parceiro?.vinculos[tenantId])
}

export const handlersDeObras = [
  http.get('*/api/works', ({ request }) => {
    if (!store.logado) return semSessao()
    // Sem empresa ativa o domínio responde VAZIO, não erro (semântica da Etapa
    // 0) — e para uma coleção que É da empresa, vazio é literalmente a verdade.
    if (!store.activeTenantId) return HttpResponse.json({ rows: [], total: 0 })

    const url = new URL(request.url)
    const sortBy = url.searchParams.get('sortBy')
    if (sortBy && !ORDENAVEIS.includes(sortBy)) {
      return problemaJson(400, `sortBy inválido: ${sortBy}.`, {}, TIPO.ordenacaoInvalida)
    }
    const page = Number(url.searchParams.get('page') ?? '1')
    const pageSize = Number(url.searchParams.get('pageSize') ?? '10')
    if (page < 1 || pageSize < 1 || pageSize > 100) {
      return problemaJson(
        400,
        'Paginação inválida: page é 1-based e pageSize vai até 100.',
        {},
        TIPO.paginacaoInvalida,
      )
    }

    let linhas = daEmpresa(store.activeTenantId).map(workDto)

    const q = url.searchParams.get('q')
    if (q) {
      const alvo = q.toLowerCase()
      linhas = linhas.filter((obra) =>
        [obra.description, obra.workType, obra.customerName].some((texto) =>
          texto?.toLowerCase().includes(alvo),
        ),
      )
    }

    const filtradas = aplicarFiltros(linhas, url, FILTRAVEIS)
    if (typeof filtradas === 'string') return problemaJson(400, filtradas, {}, TIPO.filtroInvalido)
    linhas = filtradas

    if (sortBy) {
      const desc = url.searchParams.get('sortDesc') === 'true'
      const chave = sortBy as keyof WorkDto
      linhas.sort((a, b) => {
        const va = String(a[chave] ?? '')
        const vb = String(b[chave] ?? '')
        return desc ? vb.localeCompare(va) : va.localeCompare(vb)
      })
    }

    const inicio = (page - 1) * pageSize
    return HttpResponse.json({
      rows: linhas.slice(inicio, inicio + pageSize),
      total: linhas.length,
    })
  }),

  http.get('*/api/works/:id', ({ params }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return naoEncontrado('Obra não encontrada.')
    const obra = daEmpresa(store.activeTenantId).find((o) => o.id === params.id)
    if (!obra) return naoEncontrado('Obra não encontrada.')
    return HttpResponse.json(workDto(obra))
  }),

  http.post('*/api/works', async ({ request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const corpo = (await request.json()) as WorkWriteRequest

    if (!corpo.description) {
      return camposInvalidos([{ path: 'description', message: 'Informe a descrição da obra.' }])
    }
    if (!clienteAoAlcance(corpo.customerId, store.activeTenantId)) {
      return naoEncontrado('Cliente não encontrado.')
    }

    const obra: ObraDaEmpresa = {
      id: novoId('obra'),
      tenantId: store.activeTenantId,
      customerId: corpo.customerId,
      description: corpo.description,
      workType: corpo.workType ?? null,
      address: corpo.address ?? null,
      active: corpo.active ?? true,
    }
    obras.obras.push(obra)
    return HttpResponse.json(workDto(obra), { status: 201 })
  }),

  http.put('*/api/works/:id', async ({ params, request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const obra = daEmpresa(store.activeTenantId).find((o) => o.id === params.id)
    if (!obra) return naoEncontrado('Obra não encontrada.')

    const corpo = (await request.json()) as WorkWriteRequest
    if (!corpo.description) {
      return camposInvalidos([{ path: 'description', message: 'Informe a descrição da obra.' }])
    }
    if (!clienteAoAlcance(corpo.customerId, store.activeTenantId)) {
      return naoEncontrado('Cliente não encontrado.')
    }

    // `PUT` INTEGRAL: o que o corpo não trouxer é apagado, e não preservado.
    // O mock apagando de verdade é o que torna a regra observável no navegador.
    obra.customerId = corpo.customerId
    obra.description = corpo.description
    obra.workType = corpo.workType ?? null
    obra.address = corpo.address ?? null
    obra.active = corpo.active ?? false
    return HttpResponse.json(workDto(obra))
  }),
]
