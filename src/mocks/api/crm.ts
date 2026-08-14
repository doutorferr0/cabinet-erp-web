import type {
  CrmLostReasonDto,
  CrmLostReasonWriteRequest,
  CrmOpportunityDto,
  CrmOpportunityStagePatchRequest,
  CrmOpportunityWriteRequest,
  CrmPipelineDto,
  CrmPipelineWriteRequest,
  CrmStageDto,
  CrmStageWriteRequest,
  EmployeeDto,
  ListFilter,
} from '@/api/gerado'
import {
  type FiltroDaTabela,
  type OperadorDeFiltro,
  type VarianteDeFiltro,
  linhaPassaNosFiltros,
} from '@/lib/filtro-de-consulta'
import { http, HttpResponse } from 'msw'
import { novoId, store } from './store'

/**
 * O "backend" do CRM no modo mock (`VITE_API_MODE=mock`).
 *
 * Arquivo próprio, e não mais um bloco em `handlers.ts`, por duas razões: o CRM
 * tem ESTADO próprio (funis, estágios, cartões e a ordem dentro da coluna) que
 * não pertence ao store das telas antigas, e a árvore tem mais de um agente —
 * arquivo novo não conflita com quem está editando o vizinho.
 *
 * Os handlers gerados pelo Orval (`index.msw.ts`) respondem faker sem estado:
 * provam SHAPE, não fluxo. Um quadro de funil precisa provar fluxo — "arrastei
 * o cartão, ele ficou onde eu soltei, e continua lá quando eu volto" é a única
 * coisa que a tela do funil tem para mostrar.
 *
 * O que este mock reproduz de propósito, porque é onde o desenho pode estar
 * errado:
 *
 * - **a reordenação inteira acontece do lado do servidor**, numa chamada só
 *   (`PATCH .../stage`), com `precedeId` apontando o VIZINHO;
 * - **estágio de perda exige motivo** — sem `lostReasonId`, 400;
 * - **`closedAt` é escrito e apagado pelo servidor**, conforme o cartão entra e
 *   sai de estágio ganho/perdido;
 * - **mover de FUNIL não é movimento de coluna**: o `PATCH` recusa estágio de
 *   outro funil com 400, como a FK composta do banco recusaria.
 */

const PROBLEMA = 'application/problem+json'

/**
 * Cópia LOCAL dos utilitários de `handlers.ts` (problem+json e o contrato de
 * listagem). Importá-los de lá criaria ciclo — `handlers.ts` já importa este
 * arquivo para registrar os handlers. São ~30 linhas, e a semântica que elas
 * carregam está escrita em `docs/integracao.md`, não na cópia.
 */
function problemaJson(status: number, detail: string) {
  return HttpResponse.json(
    { type: 'about:blank', title: 'Erro', status, detail },
    { status, headers: { 'content-type': PROBLEMA } },
  )
}

const SEM_SESSAO = () => problemaJson(401, 'Não autenticado.')
const SEM_EMPRESA = () => problemaJson(409, 'Nenhuma empresa ativa na sessão.')

/**
 * Filtro estruturado do lado do SERVIDOR falso.
 *
 * Existe porque o contrário é pior do que não ter filtro: o parâmetro `filters`
 * sai da tela, chega aqui e é DESCARTADO em silêncio — a listagem devolve tudo
 * enquanto o painel mostra a condição aplicada. O operador lê "3 registros
 * atendem" numa lista de 40 e não tem como saber de quem é o erro.
 *
 * O tipo de cada campo é do SERVIDOR, não da tela: `variante` não viaja no
 * contrato (é decisão de qual controle desenhar), e sem ela a comparação de
 * data cairia em texto — `lte '2026-08-05'` deixaria de fora o próprio dia 5,
 * que tem hora no ISO guardado.
 *
 * `undefined` = **o recurso não publica `filters`**. Aí o filtro que chegar é
 * 400, exatamente como o contrato manda, em vez de resposta larga demais.
 */
type CamposFiltraveis = Record<string, VarianteDeFiltro>

/** Condições do contrato → o vocabulário de `filtro-de-consulta`, ou o 400. */
function condicoesDoPedido(
  bruto: string,
  filtraveis: CamposFiltraveis | undefined,
): FiltroDaTabela[] | string {
  if (!filtraveis) return 'Este recurso não publica o parâmetro filters.'

  let pedidos: unknown
  try {
    pedidos = JSON.parse(bruto)
  } catch {
    return 'filters não é JSON válido.'
  }
  if (!Array.isArray(pedidos)) return 'filters é um array JSON de condições.'

  const condicoes: FiltroDaTabela[] = []
  for (const [indice, pedido] of (pedidos as ListFilter[]).entries()) {
    const variante = filtraveis[pedido?.field ?? '']
    if (!variante) {
      return `Campo não filtrável: ${pedido?.field}. A whitelist é ${Object.keys(filtraveis).join(', ')}.`
    }
    condicoes.push({
      // A chave de linha é da TELA e não viaja; aqui ela só precisa ser única.
      filtroId: `condicao-${indice}`,
      id: pedido.field,
      variante,
      operador: pedido.operator as OperadorDeFiltro,
      valor: pedido.value ?? '',
    })
  }
  return condicoes
}

function listar<T>(
  itens: readonly T[],
  url: URL,
  ordenaveis: readonly string[],
  textoDe: (item: T) => (string | null | undefined)[],
  filtraveis?: CamposFiltraveis,
) {
  const q = url.searchParams.get('q')
  const sortBy = url.searchParams.get('sortBy')
  const sortDesc = url.searchParams.get('sortDesc') === 'true'
  const page = Number(url.searchParams.get('page') ?? '1')
  const pageSize = Number(url.searchParams.get('pageSize') ?? '10')

  if (page < 1 || pageSize < 1 || pageSize > 100) {
    return problemaJson(400, 'Paginação inválida: page é 1-based e pageSize vai até 100.')
  }
  if (sortBy && !ordenaveis.includes(sortBy)) {
    return problemaJson(400, `sortBy inválido: ${sortBy}.`)
  }

  let rows = [...itens]
  if (q) {
    const alvo = q.toLowerCase()
    rows = rows.filter((item) => textoDe(item).some((texto) => texto?.toLowerCase().includes(alvo)))
  }

  // `filters` se soma ao `q` com AND, como o contrato descreve: `q` é texto
  // livre sobre os campos que o recurso escolheu, `filters` é campo a campo.
  const pedidoDeFiltro = url.searchParams.get('filters')
  if (pedidoDeFiltro) {
    const condicoes = condicoesDoPedido(pedidoDeFiltro, filtraveis)
    if (typeof condicoes === 'string') return problemaJson(400, condicoes)
    const juncao = url.searchParams.get('joinOperator') === 'or' ? 'or' : 'and'
    rows = rows.filter((item) => linhaPassaNosFiltros(item, condicoes, juncao))
  }

  if (sortBy) {
    const chave = sortBy as keyof T
    rows.sort((a, b) => {
      const va = String(a[chave] ?? '')
      const vb = String(b[chave] ?? '')
      return sortDesc ? vb.localeCompare(va) : va.localeCompare(vb)
    })
  }

  const total = rows.length
  const inicio = (page - 1) * pageSize
  return HttpResponse.json({ rows: rows.slice(inicio, inicio + pageSize), total })
}

/**
 * A oportunidade GUARDADA — só ids, como a linha do banco. Os campos `*Name` do
 * DTO são resolvidos na resposta: guardá-los aqui deixaria o nome do estágio
 * envelhecer dentro do cartão no dia em que alguém renomeasse a coluna.
 */
interface OportunidadeGuardada {
  id: string
  name: string
  pipelineId: string
  stageId: string
  order: number
  partnerId: string | null
  contactName: string | null
  contactEmail: string | null
  contactPhone: string | null
  ownerEmployeeId: string | null
  expectedValueCents: number | null
  expectedCloseDate: string | null
  source: string | null
  stageChangedAt: string
  lostReasonId: string | null
  quoteId: string | null
  closedAt: string | null
}

interface EstadoDoCrm {
  funis: CrmPipelineDto[]
  estagios: CrmStageDto[]
  oportunidades: OportunidadeGuardada[]
  motivos: CrmLostReasonDto[]
  /**
   * Colaboradores. Não é CRM, e mora aqui por um motivo verificável:
   * `GET /api/employees` está no contrato desde o corte do orçamento e NENHUM
   * handler o servia — o `EmployeeDto` só chegava embutido nas tarefas. O campo
   * `Responsável` da oportunidade é o primeiro consumidor de verdade, e sem
   * handler o modo mock deixaria o combo vazio sem dizer por quê.
   *
   * Move para `handlers.ts` no dia em que a tela de Colaboradores consumir o
   * endpoint — aí ele deixa de ser exclusividade desta fronteira.
   */
  colaboradores: EmployeeDto[]
}

/** Dias atrás, em ISO — o apodrecimento do cartão precisa de data relativa ao dia da execução. */
function diasAtras(dias: number): string {
  return new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString()
}

function estadoInicial(): EstadoDoCrm {
  const funis: CrmPipelineDto[] = [
    { id: 'funil-projeto', name: 'Venda de projeto', sort: 1, isDefault: true, active: true },
    {
      id: 'funil-balcao',
      name: 'Balcão / pronta entrega',
      sort: 2,
      isDefault: false,
      active: true,
    },
  ]

  // `probability` é int com 4 casas implícitas (10000 = 1%), a convenção do
  // contrato — 100% é 1000000.
  const estagios: CrmStageDto[] = [
    est('etapa-contato', 'funil-projeto', 'Contato', 1, 100_000, { rotDays: 7 }),
    est('etapa-visita', 'funil-projeto', 'Visita técnica', 2, 250_000, { rotDays: 10 }),
    est('etapa-proposta', 'funil-projeto', 'Proposta enviada', 3, 500_000, { rotDays: 15 }),
    est('etapa-negociacao', 'funil-projeto', 'Negociação', 4, 750_000, { rotDays: 10 }),
    est('etapa-ganho', 'funil-projeto', 'Ganho', 5, 1_000_000, { isWon: true }),
    est('etapa-perdido', 'funil-projeto', 'Perdido', 6, 0, { isLost: true }),
    est('balcao-atendimento', 'funil-balcao', 'Atendimento', 1, 300_000, { rotDays: 3 }),
    est('balcao-fechado', 'funil-balcao', 'Fechado', 2, 1_000_000, { isWon: true }),
  ]

  const motivos: CrmLostReasonDto[] = [
    { id: 'perda-preco', name: 'Preço acima do orçamento do cliente', active: true },
    { id: 'perda-prazo', name: 'Prazo de entrega', active: true },
    { id: 'perda-concorrente', name: 'Fechou com concorrente', active: true },
    { id: 'perda-sem-retorno', name: 'Cliente sumiu', active: true },
  ]

  const oportunidades: OportunidadeGuardada[] = [
    cartao('op-0001', 'Residência Alphaville — iluminação completa', 'etapa-contato', 1, {
      partnerId: 'parc-0002',
      expectedValueCents: 4_800_000,
      expectedCloseDate: '2026-09-30',
      source: 'indicação de arquiteto',
      stageChangedAt: diasAtras(2),
    }),
    cartao('op-0002', 'Loja Centro — trilhos e spots', 'etapa-contato', 2, {
      contactName: 'Marina Duarte',
      contactPhone: '11988887777',
      expectedValueCents: 1_250_000,
      source: 'site',
      stageChangedAt: diasAtras(12), // apodrecido: rotDays do estágio é 7
    }),
    cartao('op-0003', 'Construtora Horizonte — torre B', 'etapa-visita', 1, {
      partnerId: 'parc-0003',
      expectedValueCents: 23_400_000,
      expectedCloseDate: '2026-11-15',
      stageChangedAt: diasAtras(4),
    }),
    cartao('op-0004', 'Apartamento Higienópolis — sala e cozinha', 'etapa-proposta', 1, {
      contactName: 'Ricardo Sanches',
      contactEmail: 'ricardo@exemplo.dev',
      expectedValueCents: 3_100_000,
      expectedCloseDate: '2026-09-05',
      stageChangedAt: diasAtras(6),
    }),
    cartao('op-0005', 'Escritório Faria Lima — luminárias lineares', 'etapa-negociacao', 1, {
      partnerId: 'parc-0002',
      expectedValueCents: 8_900_000,
      expectedCloseDate: '2026-08-29',
      stageChangedAt: diasAtras(1),
    }),
    cartao('op-0006', 'Casa de praia — área externa', 'etapa-perdido', 1, {
      contactName: 'Juliana Prado',
      expectedValueCents: 2_200_000,
      lostReasonId: 'perda-preco',
      stageChangedAt: diasAtras(20),
      closedAt: diasAtras(20),
    }),
  ]

  const colaboradores: EmployeeDto[] = [
    {
      id: 'emp-admin',
      name: 'Henrique Ferro',
      sector: 'COMERCIAL',
      jobTitle: 'DIRETOR',
      active: true,
    },
    {
      id: 'emp-0002',
      name: 'Ana Beatriz Lima',
      sector: 'COMERCIAL',
      jobTitle: 'CONSULTORA',
      active: true,
    },
    {
      id: 'emp-0003',
      name: 'Caio Nogueira',
      sector: 'PROJETOS',
      jobTitle: 'PROJETISTA',
      active: true,
    },
  ]

  return { funis, estagios, oportunidades, motivos, colaboradores }
}

function est(
  id: string,
  pipelineId: string,
  name: string,
  sort: number,
  probability: number,
  extra: Partial<CrmStageDto> = {},
): CrmStageDto {
  return {
    id,
    pipelineId,
    name,
    sort,
    probability,
    isWon: false,
    isLost: false,
    rotDays: null,
    ...extra,
  }
}

function cartao(
  id: string,
  name: string,
  stageId: string,
  order: number,
  extra: Partial<OportunidadeGuardada> = {},
): OportunidadeGuardada {
  return {
    id,
    name,
    pipelineId: 'funil-projeto',
    stageId,
    order,
    partnerId: null,
    contactName: null,
    contactEmail: null,
    contactPhone: null,
    ownerEmployeeId: null,
    expectedValueCents: null,
    expectedCloseDate: null,
    source: null,
    stageChangedAt: diasAtras(0),
    lostReasonId: null,
    quoteId: null,
    closedAt: null,
    ...extra,
  }
}

export const crm: EstadoDoCrm = estadoInicial()

/** Devolve o CRM ao seed — o `resetStore()` do CRM, para os testes. */
export function resetCrm(): void {
  Object.assign(crm, estadoInicial())
}

// ------------------------------------------------------------------ resolução

function funil(id: string): CrmPipelineDto | undefined {
  return crm.funis.find((f) => f.id === id)
}

function estagio(id: string | null | undefined): CrmStageDto | undefined {
  return crm.estagios.find((e) => e.id === id)
}

/** O DTO do contrato: a linha guardada mais os nomes que o servidor resolve. */
function oportunidadeDto(o: OportunidadeGuardada): CrmOpportunityDto {
  const etapa = estagio(o.stageId)
  const parceiro = store.parceiros.find((p) => p.id === o.partnerId)
  return {
    ...o,
    pipelineName: funil(o.pipelineId)?.name ?? '',
    stageName: etapa?.name ?? '',
    partnerName: parceiro?.legalName ?? null,
    ownerName: o.ownerEmployeeId ? 'Henrique' : null,
    lostReasonName: crm.motivos.find((m) => m.id === o.lostReasonId)?.name ?? null,
  }
}

/** Os cartões de um estágio, na ordem da coluna. */
function coluna(stageId: string): OportunidadeGuardada[] {
  return crm.oportunidades.filter((o) => o.stageId === stageId).sort((a, b) => a.order - b.order)
}

/**
 * Reescreve a ordem de UMA coluna, densa a partir de 1.
 *
 * É o que o servidor faria dentro da transação do `PATCH`. Guardar índice denso
 * é decisão de quem persiste — o cliente só disse ao lado de QUEM o cartão fica.
 */
function renumerar(stageId: string): void {
  coluna(stageId).forEach((cartaoDaColuna, i) => {
    cartaoDaColuna.order = i + 1
  })
}

/** Ordem padrão do contrato: a do quadro — estágio por `sort`, depois `order`. */
function ordemDoQuadro(a: OportunidadeGuardada, b: OportunidadeGuardada): number {
  const sa = estagio(a.stageId)?.sort ?? 0
  const sb = estagio(b.stageId)?.sort ?? 0
  return sa === sb ? a.order - b.order : sa - sb
}

// ------------------------------------------------------------------ handlers

export const handlersDoCrm = [
  // ---------------- funis ----------------

  http.get('*/api/crm/pipelines', ({ request }) => {
    if (!store.logado) return SEM_SESSAO()
    if (!store.activeTenantId) return HttpResponse.json({ rows: [], total: 0 })
    return listar(
      [...crm.funis].sort((a, b) => a.sort - b.sort),
      new URL(request.url),
      ['name', 'sort', 'active'],
      (f) => [f.name],
    )
  }),

  http.post('*/api/crm/pipelines', async ({ request }) => {
    if (!store.logado) return SEM_SESSAO()
    if (!store.activeTenantId) return SEM_EMPRESA()
    const corpo = (await request.json()) as CrmPipelineWriteRequest
    if (!corpo.name?.trim()) return problemaJson(400, 'Nome do funil é obrigatório.')

    const novo: CrmPipelineDto = {
      id: novoId('funil'),
      name: corpo.name,
      sort: corpo.sort ?? crm.funis.length + 1,
      isDefault: corpo.isDefault ?? false,
      active: corpo.active ?? true,
    }
    if (novo.isDefault) for (const f of crm.funis) f.isDefault = false
    crm.funis.push(novo)
    return HttpResponse.json(novo, { status: 201 })
  }),

  http.get('*/api/crm/pipelines/:id', ({ params }) => {
    if (!store.logado) return SEM_SESSAO()
    if (!store.activeTenantId) return SEM_EMPRESA()
    const achado = funil(String(params.id))
    if (!achado) return problemaJson(404, 'Funil não encontrado.')
    return HttpResponse.json(achado)
  }),

  http.put('*/api/crm/pipelines/:id', async ({ params, request }) => {
    if (!store.logado) return SEM_SESSAO()
    if (!store.activeTenantId) return SEM_EMPRESA()
    const achado = funil(String(params.id))
    if (!achado) return problemaJson(404, 'Funil não encontrado.')
    const corpo = (await request.json()) as CrmPipelineWriteRequest
    if (!corpo.name?.trim()) return problemaJson(400, 'Nome do funil é obrigatório.')

    // `PUT` substitui o registro inteiro — o campo que não veio é o campo apagado.
    achado.name = corpo.name
    achado.sort = corpo.sort ?? 0
    achado.isDefault = corpo.isDefault ?? false
    achado.active = corpo.active ?? false
    if (achado.isDefault) {
      for (const f of crm.funis) if (f.id !== achado.id) f.isDefault = false
    }
    return HttpResponse.json(achado)
  }),

  // ---------------- estágios ----------------

  http.get('*/api/crm/pipelines/:pipelineId/stages', ({ params }) => {
    if (!store.logado) return SEM_SESSAO()
    if (!store.activeTenantId) return HttpResponse.json([])
    const id = String(params.pipelineId)
    if (!funil(id)) return problemaJson(404, 'Funil não encontrado.')
    return HttpResponse.json(
      crm.estagios.filter((e) => e.pipelineId === id).sort((a, b) => a.sort - b.sort),
    )
  }),

  http.post('*/api/crm/pipelines/:pipelineId/stages', async ({ params, request }) => {
    if (!store.logado) return SEM_SESSAO()
    if (!store.activeTenantId) return SEM_EMPRESA()
    const pipelineId = String(params.pipelineId)
    if (!funil(pipelineId)) return problemaJson(404, 'Funil não encontrado.')
    const corpo = (await request.json()) as CrmStageWriteRequest
    if (!corpo.name?.trim()) return problemaJson(400, 'Nome do estágio é obrigatório.')

    const novo = est(
      novoId('etapa'),
      pipelineId,
      corpo.name,
      corpo.sort ?? 0,
      corpo.probability ?? 0,
      {
        isWon: corpo.isWon ?? false,
        isLost: corpo.isLost ?? false,
        rotDays: corpo.rotDays ?? null,
      },
    )
    crm.estagios.push(novo)
    return HttpResponse.json(novo, { status: 201 })
  }),

  http.put('*/api/crm/pipelines/:pipelineId/stages/:id', async ({ params, request }) => {
    if (!store.logado) return SEM_SESSAO()
    if (!store.activeTenantId) return SEM_EMPRESA()
    const achado = estagio(String(params.id))
    if (!achado || achado.pipelineId !== String(params.pipelineId)) {
      return problemaJson(404, 'Estágio não encontrado neste funil.')
    }
    const corpo = (await request.json()) as CrmStageWriteRequest
    if (!corpo.name?.trim()) return problemaJson(400, 'Nome do estágio é obrigatório.')

    achado.name = corpo.name
    achado.sort = corpo.sort ?? 0
    achado.probability = corpo.probability ?? 0
    achado.isWon = corpo.isWon ?? false
    achado.isLost = corpo.isLost ?? false
    achado.rotDays = corpo.rotDays ?? null
    return HttpResponse.json(achado)
  }),

  // ---------------- oportunidades ----------------

  http.get('*/api/crm/opportunities', ({ request }) => {
    if (!store.logado) return SEM_SESSAO()
    if (!store.activeTenantId) return HttpResponse.json({ rows: [], total: 0 })
    const url = new URL(request.url)

    let linhas = [...crm.oportunidades].sort(ordemDoQuadro)
    const pipelineId = url.searchParams.get('pipelineId')
    const stageId = url.searchParams.get('stageId')
    const ownerEmployeeId = url.searchParams.get('ownerEmployeeId')
    if (pipelineId) linhas = linhas.filter((o) => o.pipelineId === pipelineId)
    if (stageId) linhas = linhas.filter((o) => o.stageId === stageId)
    if (ownerEmployeeId) linhas = linhas.filter((o) => o.ownerEmployeeId === ownerEmployeeId)
    if (url.searchParams.get('open') === 'true') {
      // Filtro por PROPRIEDADE do estágio, como o contrato descreve: quem sabe
      // quais estágios fecham é o servidor, não a tela.
      linhas = linhas.filter((o) => {
        const etapa = estagio(o.stageId)
        return !etapa?.isWon && !etapa?.isLost
      })
    }

    return listar(
      linhas.map(oportunidadeDto),
      url,
      [
        'name',
        'partnerName',
        'stageName',
        'expectedValueCents',
        'expectedCloseDate',
        'stageChangedAt',
      ],
      (o) => [o.name, o.partnerName, o.contactName, o.stageName],
      // A whitelist do filtro é a do `sortBy` MENOS o dinheiro — ver
      // `FILTRAVEIS_OPORTUNIDADE` em `src/data/crm-api.ts`, onde a subtração
      // está justificada. Aqui ela reaparece porque quem recusa é o servidor.
      {
        name: 'text',
        partnerName: 'text',
        stageName: 'text',
        expectedCloseDate: 'date',
        stageChangedAt: 'date',
      },
    )
  }),

  http.post('*/api/crm/opportunities', async ({ request }) => {
    if (!store.logado) return SEM_SESSAO()
    if (!store.activeTenantId) return SEM_EMPRESA()
    const corpo = (await request.json()) as CrmOpportunityWriteRequest
    if (!corpo.name?.trim()) return problemaJson(400, 'Título da oportunidade é obrigatório.')

    // Sem funil explícito, o `isDefault`; sem estágio, o primeiro do funil.
    const escolhido =
      (corpo.pipelineId ? funil(corpo.pipelineId) : undefined) ??
      crm.funis.find((f) => f.isDefault) ??
      crm.funis[0]
    if (!escolhido) return problemaJson(409, 'Nenhum funil configurado.')

    const doFunil = crm.estagios
      .filter((e) => e.pipelineId === escolhido.id)
      .sort((a, b) => a.sort - b.sort)
    const etapa = corpo.stageId ? estagio(corpo.stageId) : doFunil[0]
    if (!etapa) return problemaJson(400, 'Estágio inexistente.')
    if (etapa.pipelineId !== escolhido.id) {
      return problemaJson(400, 'O estágio informado é de outro funil.')
    }

    const novo = cartao(novoId('op'), corpo.name, etapa.id, coluna(etapa.id).length + 1, {
      pipelineId: escolhido.id,
      partnerId: corpo.partnerId ?? null,
      contactName: corpo.contactName ?? null,
      contactEmail: corpo.contactEmail ?? null,
      contactPhone: corpo.contactPhone ?? null,
      ownerEmployeeId: corpo.ownerEmployeeId ?? null,
      expectedValueCents: corpo.expectedValueCents ?? null,
      expectedCloseDate: corpo.expectedCloseDate ?? null,
      source: corpo.source ?? null,
      lostReasonId: corpo.lostReasonId ?? null,
      quoteId: corpo.quoteId ?? null,
      stageChangedAt: new Date().toISOString(),
    })
    crm.oportunidades.push(novo)
    return HttpResponse.json(oportunidadeDto(novo), { status: 201 })
  }),

  http.get('*/api/crm/opportunities/:id', ({ params }) => {
    if (!store.logado) return SEM_SESSAO()
    if (!store.activeTenantId) return SEM_EMPRESA()
    const achado = crm.oportunidades.find((o) => o.id === String(params.id))
    if (!achado) return problemaJson(404, 'Oportunidade não encontrada.')
    return HttpResponse.json(oportunidadeDto(achado))
  }),

  http.put('*/api/crm/opportunities/:id', async ({ params, request }) => {
    if (!store.logado) return SEM_SESSAO()
    if (!store.activeTenantId) return SEM_EMPRESA()
    const achado = crm.oportunidades.find((o) => o.id === String(params.id))
    if (!achado) return problemaJson(404, 'Oportunidade não encontrada.')
    const corpo = (await request.json()) as CrmOpportunityWriteRequest
    if (!corpo.name?.trim()) return problemaJson(400, 'Título da oportunidade é obrigatório.')

    const destino = corpo.stageId ? estagio(corpo.stageId) : estagio(achado.stageId)
    if (!destino) return problemaJson(400, 'Estágio inexistente.')
    const funilAlvo = corpo.pipelineId ?? destino.pipelineId
    if (destino.pipelineId !== funilAlvo) {
      return problemaJson(400, 'O estágio informado é de outro funil.')
    }

    const mudouDeEstagio = destino.id !== achado.stageId
    const origem = achado.stageId

    achado.name = corpo.name
    achado.pipelineId = funilAlvo
    achado.partnerId = corpo.partnerId ?? null
    achado.contactName = corpo.contactName ?? null
    achado.contactEmail = corpo.contactEmail ?? null
    achado.contactPhone = corpo.contactPhone ?? null
    achado.ownerEmployeeId = corpo.ownerEmployeeId ?? null
    achado.expectedValueCents = corpo.expectedValueCents ?? null
    achado.expectedCloseDate = corpo.expectedCloseDate ?? null
    achado.source = corpo.source ?? null
    achado.lostReasonId = corpo.lostReasonId ?? null
    achado.quoteId = corpo.quoteId ?? null

    if (mudouDeEstagio) {
      // Pelo `PUT` o cartão vai para o FIM da coluna nova: posicionar é o PATCH.
      achado.stageId = destino.id
      achado.order = Number.MAX_SAFE_INTEGER // fim da coluna; `renumerar` densifica
      achado.stageChangedAt = new Date().toISOString()
      renumerar(origem)
      renumerar(destino.id)
      achado.closedAt = destino.isWon || destino.isLost ? new Date().toISOString() : null
    }
    return HttpResponse.json(oportunidadeDto(achado))
  }),

  /**
   * O MOVIMENTO DO QUADRO — a razão de o contrato ter este caminho.
   *
   * Uma chamada resolve: valida o destino, tira o cartão da coluna de origem,
   * põe na de destino ao lado do vizinho e renumera as DUAS colunas. Quem
   * fizesse isso do lado do cliente mandaria uma requisição por linha
   * deslocada, e cada uma seria transação própria.
   */
  http.patch('*/api/crm/opportunities/:id/stage', async ({ params, request }) => {
    if (!store.logado) return SEM_SESSAO()
    if (!store.activeTenantId) return SEM_EMPRESA()
    const achado = crm.oportunidades.find((o) => o.id === String(params.id))
    if (!achado) return problemaJson(404, 'Oportunidade não encontrada.')

    const corpo = (await request.json()) as CrmOpportunityStagePatchRequest
    const destino = estagio(corpo.stageId)
    if (!destino) return problemaJson(404, 'Estágio não encontrado.')
    if (destino.pipelineId !== achado.pipelineId) {
      return problemaJson(
        400,
        'O estágio de destino é de outro funil — mover de funil é alteração.',
      )
    }
    if (destino.isLost && !corpo.lostReasonId) {
      return problemaJson(400, 'Estágio de perda exige o motivo (`lostReasonId`).')
    }
    if (corpo.lostReasonId && !crm.motivos.some((m) => m.id === corpo.lostReasonId)) {
      return problemaJson(400, 'Motivo de perda inexistente.')
    }

    const vizinho = corpo.precedeId
      ? crm.oportunidades.find((o) => o.id === corpo.precedeId)
      : undefined
    if (corpo.precedeId && (!vizinho || vizinho.stageId !== destino.id)) {
      return problemaJson(400, 'O cartão de referência não está no estágio de destino.')
    }

    const origem = achado.stageId
    if (origem !== destino.id) {
      achado.stageId = destino.id
      achado.stageChangedAt = new Date().toISOString()
    }
    achado.lostReasonId = destino.isLost ? (corpo.lostReasonId ?? null) : null
    achado.closedAt = destino.isWon || destino.isLost ? new Date().toISOString() : null

    // Posição: o cartão entra ANTES do vizinho; sem vizinho, no fim da coluna.
    // Meio ponto e renumeração — o servidor de verdade faria o mesmo dentro da
    // transação, ou guardaria racional e nem renumeraria.
    achado.order = vizinho ? vizinho.order - 0.5 : coluna(destino.id).length + 1
    renumerar(destino.id)
    if (origem !== destino.id) renumerar(origem)

    return HttpResponse.json(oportunidadeDto(achado))
  }),

  // ---------------- colaboradores (ver EstadoDoCrm.colaboradores) ----------------

  http.get('*/api/employees', ({ request }) => {
    if (!store.logado) return SEM_SESSAO()
    if (!store.activeTenantId) return HttpResponse.json({ rows: [], total: 0 })
    return listar(
      crm.colaboradores,
      new URL(request.url),
      ['name', 'sector', 'jobTitle', 'active'],
      (c) => [c.name, c.sector, c.jobTitle],
    )
  }),

  // ---------------- motivos de perda ----------------

  http.get('*/api/crm/lost-reasons', ({ request }) => {
    if (!store.logado) return SEM_SESSAO()
    if (!store.activeTenantId) return HttpResponse.json({ rows: [], total: 0 })
    return listar(crm.motivos, new URL(request.url), ['name', 'active'], (m) => [m.name])
  }),

  http.post('*/api/crm/lost-reasons', async ({ request }) => {
    if (!store.logado) return SEM_SESSAO()
    if (!store.activeTenantId) return SEM_EMPRESA()
    const corpo = (await request.json()) as CrmLostReasonWriteRequest
    if (!corpo.name?.trim()) return problemaJson(400, 'Nome do motivo é obrigatório.')
    const novo: CrmLostReasonDto = {
      id: novoId('perda'),
      name: corpo.name,
      active: corpo.active ?? true,
    }
    crm.motivos.push(novo)
    return HttpResponse.json(novo, { status: 201 })
  }),

  http.put('*/api/crm/lost-reasons/:id', async ({ params, request }) => {
    if (!store.logado) return SEM_SESSAO()
    if (!store.activeTenantId) return SEM_EMPRESA()
    const achado = crm.motivos.find((m) => m.id === String(params.id))
    if (!achado) return problemaJson(404, 'Motivo não encontrado.')
    const corpo = (await request.json()) as CrmLostReasonWriteRequest
    if (!corpo.name?.trim()) return problemaJson(400, 'Nome do motivo é obrigatório.')
    achado.name = corpo.name
    achado.active = corpo.active ?? false
    return HttpResponse.json(achado)
  }),
]
