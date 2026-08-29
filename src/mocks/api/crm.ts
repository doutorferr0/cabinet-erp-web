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
  EmployeeDetailDto,
  EmployeeDto,
  EmployeeWriteRequest,
} from '@/api/gerado'
import { idDeColaborador, colaboradores as pessoas } from '@/mocks/colaboradores'
import { nomeDeApoio } from '@/mocks/lookups'
import { http, HttpResponse } from 'msw'
import { type CamposFiltraveis, aplicarFiltros } from './filtro-do-servidor'
import { verificarEscrita } from './permissao'
import {
  TIPO,
  camposInvalidos,
  conflito,
  naoEncontrado,
  problemaJson,
  semEmpresaAtiva,
  semSessao,
} from './problema'
import { criarOrcamento, detalheDoOrcamento } from './quotes'
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

/**
 * As whitelists de `sortBy` deste módulo, cópia da descrição do contrato.
 *
 * Exportadas para `src/data/whitelist-do-contrato.test.ts` conferi-las contra o
 * `contracts/openapi-v1.json` — o site público é 100% mock, e whitelist menor
 * aqui é 400 no clique do cabeçalho lá, sem sintoma em teste nenhum.
 */
export const ORDENAVEIS_FUNIL = ['name', 'sort', 'active'] as const
export const ORDENAVEIS_MOTIVO = ['name', 'active'] as const
export const ORDENAVEIS_COLABORADOR = ['name', 'sector', 'jobTitle', 'active'] as const
/**
 * A whitelist do FILTRO da oportunidade é a do `sortBy` **menos o dinheiro** —
 * ver `FILTRAVEIS_OPORTUNIDADE` em `src/data/crm-api.ts`, onde a subtração está
 * justificada: `1000` em centavos é R$ 10,00 para quem procurava mil reais.
 * Aqui ela reaparece porque, em modo mock, quem recusa é este mapa.
 */
export const FILTRAVEIS_OPORTUNIDADE: CamposFiltraveis = {
  name: 'text',
  partnerName: 'text',
  stageName: 'text',
  expectedCloseDate: 'date',
  stageChangedAt: 'date',
}

export const ORDENAVEIS_OPORTUNIDADE = [
  'name',
  'partnerName',
  'stageName',
  'expectedValueCents',
  'expectedCloseDate',
  'stageChangedAt',
] as const

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
    return problemaJson(
      400,
      'Paginação inválida: page é 1-based e pageSize vai até 100.',
      {},
      TIPO.paginacaoInvalida,
    )
  }
  if (sortBy && !ordenaveis.includes(sortBy)) {
    return problemaJson(400, `sortBy inválido: ${sortBy}.`, {}, TIPO.ordenacaoInvalida)
  }

  let rows = [...itens]
  if (q) {
    const alvo = q.toLowerCase()
    rows = rows.filter((item) => textoDe(item).some((texto) => texto?.toLowerCase().includes(alvo)))
  }

  const filtradas = aplicarFiltros(rows, url, filtraveis)
  if (typeof filtradas === 'string') return problemaJson(400, filtradas, {}, TIPO.filtroInvalido)
  rows = filtradas

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
  /**
   * As FICHAS — `EmployeeDetailDto`, o que `GET /api/employees/{id}` devolve.
   *
   * Separadas das linhas porque são um tipo diferente (o detalhe publica
   * `sectorId` E `sector`, e mais nove campos que a listagem não manda), e
   * MUTÁVEIS porque `PUT /api/employees/{id}` existe desde a #402. Antes o
   * detalhe era derivado da semente importada a cada requisição — leitura pura,
   * sem onde gravar: o `Gravar` respondia 200 e a próxima abertura mostrava o
   * valor velho.
   *
   * As duas listas andam JUNTAS: quem escreve aqui sincroniza a linha em
   * `colaboradores` (`sincronizarLinha`), senão o nome muda na ficha e a grade
   * continua mostrando o anterior.
   */
  fichas: EmployeeDetailDto[]
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
      // PERTO de apodrecer: `rotDays` da proposta é 15, e o aviso começa a dois
      // terços (dia 10). O seed precisa exercitar os TRÊS estados — com só
      // fresco e apodrecido, o degrau do meio nunca aparece no site demo.
      stageChangedAt: diasAtras(11),
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
    // Mais duas perdas, com motivos DIFERENTES e uma repetição: o relatório de
    // perdas por motivo com uma linha só não mostra o que ele é — a ordenação
    // por contagem, que é a pergunta ("qual é o maior motivo"), só aparece com
    // empate desfeito.
    cartao('op-0007', 'Clínica Vila Nova — recepção', 'etapa-perdido', 2, {
      partnerId: 'parc-0003',
      expectedValueCents: 1_700_000,
      lostReasonId: 'perda-preco',
      stageChangedAt: diasAtras(41),
      closedAt: diasAtras(41),
    }),
    cartao('op-0008', 'Loja de calçados — vitrine', 'etapa-perdido', 3, {
      contactName: 'Fábio Menezes',
      expectedValueCents: 900_000,
      lostReasonId: 'perda-prazo',
      stageChangedAt: diasAtras(9),
      closedAt: diasAtras(9),
    }),
  ]

  /**
   * As pessoas vêm da MESMA semente que a tela de colaborador lê
   * (`src/mocks/colaboradores.ts`), e não de uma lista escrita à mão aqui.
   *
   * Antes da #276 eram duas: três nomes neste arquivo alimentavam o combo de
   * responsável das atividades, dez outros alimentavam o cadastro, e a
   * interseção era VAZIA — no mock puro, que é o `cabinetonline.cc`. Duas
   * listas de quem trabalha aqui, e o operador via a errada dependendo da tela.
   *
   * `sector` e `jobTitle` saem como RÓTULO porque é o que o `EmployeeDto`
   * publica; a semente guarda o id do item de apoio, e `nomeDeApoio` faz a
   * volta. Os dois lados (`sectorId` + `sector`) só existem no DTO de DETALHE.
   */
  const colaboradores: EmployeeDto[] = pessoas.map((p) => ({
    id: idDeColaborador(p.id),
    name: p.nome,
    sector: nomeDeApoio(p.setor),
    jobTitle: nomeDeApoio(p.cargo),
    active: p.ativo,
  }))

  // A ficha sai da MESMA semente da listagem, para o que o combo oferece e o
  // que o detalhe abre serem a mesma pessoa. Campo que a transcrição não tem
  // sai `null` — `document`, `email`, `phone`, `photoUrl`, `linkActive` —, e
  // não preenchido com invenção: dado de mentira com cara de dado do servidor é
  // o que o `AvisoDeCobertura` existe para evitar.
  const fichas: EmployeeDetailDto[] = pessoas.map((p) => ({
    id: idDeColaborador(p.id),
    name: p.nome,
    document: null,
    email: null,
    phone: null,
    photoUrl: null,
    active: p.ativo,
    roleId: null,
    roleName: null,
    sectorId: p.setor,
    sector: nomeDeApoio(p.setor),
    jobTitleId: p.cargo,
    jobTitle: nomeDeApoio(p.cargo),
    hiredAt: p.dataAdmissao,
    dismissedAt: p.dataDemissao,
    customerFacing: p.atendimentoCliente,
    linkActive: null,
  }))

  return { funis, estagios, oportunidades, motivos, colaboradores, fichas }
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

/**
 * A linha da grade segue a ficha. As duas leituras da mesma pessoa não podem
 * divergir: sem isto, alterar o nome mudaria o formulário e deixaria a listagem
 * (e o combo de responsável das atividades) com o valor anterior.
 *
 * `sector` e `jobTitle` saem como RÓTULO porque é o que o `EmployeeDto`
 * publica; a ficha guarda os dois lados.
 */
function sincronizarLinha(ficha: EmployeeDetailDto): void {
  const linha = crm.colaboradores.find((c) => c.id === ficha.id)
  if (!linha) return
  linha.name = ficha.name
  linha.sector = ficha.sector ?? null
  linha.jobTitle = ficha.jobTitle ?? null
  linha.active = ficha.active
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
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return HttpResponse.json({ rows: [], total: 0 })
    return listar(
      [...crm.funis].sort((a, b) => a.sort - b.sort),
      new URL(request.url),
      ORDENAVEIS_FUNIL,
      (f) => [f.name],
    )
  }),

  http.post('*/api/crm/pipelines', async ({ request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('crm')
    if (semPermissao) return semPermissao
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
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const achado = funil(String(params.id))
    if (!achado) return naoEncontrado('Funil não encontrado.')
    return HttpResponse.json(achado)
  }),

  http.put('*/api/crm/pipelines/:id', async ({ params, request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('crm')
    if (semPermissao) return semPermissao
    const achado = funil(String(params.id))
    if (!achado) return naoEncontrado('Funil não encontrado.')
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
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return HttpResponse.json([])
    const id = String(params.pipelineId)
    if (!funil(id)) return naoEncontrado('Funil não encontrado.')
    return HttpResponse.json(
      crm.estagios.filter((e) => e.pipelineId === id).sort((a, b) => a.sort - b.sort),
    )
  }),

  http.post('*/api/crm/pipelines/:pipelineId/stages', async ({ params, request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('crm')
    if (semPermissao) return semPermissao
    const pipelineId = String(params.pipelineId)
    if (!funil(pipelineId)) return naoEncontrado('Funil não encontrado.')
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
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('crm')
    if (semPermissao) return semPermissao
    const achado = estagio(String(params.id))
    if (!achado || achado.pipelineId !== String(params.pipelineId)) {
      return naoEncontrado('Estágio não encontrado neste funil.')
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
    if (!store.logado) return semSessao()
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
      ORDENAVEIS_OPORTUNIDADE,
      (o) => [o.name, o.partnerName, o.contactName, o.stageName],
      // A whitelist do filtro é a do `sortBy` MENOS o dinheiro — ver
      // `FILTRAVEIS_OPORTUNIDADE` em `src/data/crm-api.ts`, onde a subtração
      // está justificada. Aqui ela reaparece porque quem recusa é o servidor.
      FILTRAVEIS_OPORTUNIDADE,
    )
  }),

  http.post('*/api/crm/opportunities', async ({ request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('crm')
    if (semPermissao) return semPermissao
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
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const achado = crm.oportunidades.find((o) => o.id === String(params.id))
    if (!achado) return naoEncontrado('Oportunidade não encontrada.')
    return HttpResponse.json(oportunidadeDto(achado))
  }),

  http.put('*/api/crm/opportunities/:id', async ({ params, request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('crm')
    if (semPermissao) return semPermissao
    const achado = crm.oportunidades.find((o) => o.id === String(params.id))
    if (!achado) return naoEncontrado('Oportunidade não encontrada.')
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
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('crm')
    if (semPermissao) return semPermissao
    const achado = crm.oportunidades.find((o) => o.id === String(params.id))
    if (!achado) return naoEncontrado('Oportunidade não encontrada.')

    const corpo = (await request.json()) as CrmOpportunityStagePatchRequest
    const destino = estagio(corpo.stageId)
    if (!destino) return naoEncontrado('Estágio não encontrado.')
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

  /**
   * CONVERSÃO oportunidade → orçamento: cria o documento e grava o vínculo na
   * MESMA operação.
   *
   * Não é `POST /api/quotes` seguido de `PUT` na oportunidade, e a razão é a
   * mesma do `PATCH …/stage`: falha entre as duas deixaria um orçamento órfão —
   * criado, sem vínculo, invisível para quem pediu a conversão e visível na
   * listagem de orçamentos.
   *
   * O documento nasce SEM ITEM, com cliente e nome do projeto vindos da
   * oportunidade. É a amarra do núcleo: a oportunidade não congela
   * especificação nem preço. Copiar o `expectedValueCents` para um item
   * inventado daria documento com preço que ninguém cotou.
   */
  http.post('*/api/crm/opportunities/:id/quote', ({ params }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('crm')
    if (semPermissao) return semPermissao

    const achado = crm.oportunidades.find((o) => o.id === String(params.id))
    if (!achado) return naoEncontrado('Oportunidade não encontrada.')
    if (achado.quoteId) {
      return problemaJson(409, 'Esta oportunidade já tem orçamento.')
    }
    if (!achado.partnerId) {
      // `fields[]` entra aqui quando a #131 mergear — o `problemaJson` deste
      // arquivo ainda não aceita membro de extensão. O `detail` já diz o que
      // fazer, que é o mínimo acionável.
      return problemaJson(400, 'Lead sem cadastro não vira orçamento: cadastre o cliente antes.')
    }

    const orcamento = criarOrcamento({
      customerId: achado.partnerId,
      projectName: achado.name,
      discountMode: 'product',
      discountPercent: 0,
      environments: [],
      items: [],
    })
    // O vínculo é gravado JUNTO — é o que torna a operação uma só.
    achado.quoteId = orcamento.id
    return HttpResponse.json(detalheDoOrcamento(orcamento), { status: 201 })
  }),

  // ---------------- colaboradores (ver EstadoDoCrm.colaboradores) ----------------

  http.get('*/api/employees', ({ request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return HttpResponse.json({ rows: [], total: 0 })
    return listar(crm.colaboradores, new URL(request.url), ORDENAVEIS_COLABORADOR, (c) => [
      c.name,
      c.sector,
      c.jobTitle,
    ])
  }),

  /**
   * O DETALHE do colaborador — o handler que faltava.
   *
   * O contrato publica `GET /api/employees/{id}` e o backend o serve; o mock
   * não tinha nenhum, e era o pré-requisito que o `CLAUDE.md` já registrava
   * para a tela migrar: sem ele o cadastro ficaria sem detalhe **no site
   * público**, que é 100% mock.
   *
   * Sai da MESMA semente da listagem, então o que o combo oferece e o que o
   * detalhe abre são a mesma pessoa. Campo que a transcrição não tem sai
   * `null` — `document`, `email`, `phone`, `photoUrl`, `linkActive` —,
   * e não preenchido com invenção: dado de mentira com cara de dado do
   * servidor é exatamente o que o `AvisoDeCobertura` existe para evitar.
   *
   * Aqui os dois lados do par aparecem, ao contrário do `EmployeeDto`: o
   * `EmployeeDetailDto` publica `sectorId` E `sector`, porque o formulário
   * precisa do id para gravar e do rótulo para mostrar.
   */
  http.get('*/api/employees/:id', ({ params }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const achada = crm.fichas.find((f) => f.id === String(params.id))
    if (!achada) return naoEncontrado('Colaborador não encontrado.')
    return HttpResponse.json(achada)
  }),

  /**
   * `PUT /api/employees/{id}` — a escrita que a #402 ligou na tela.
   *
   * Faltava handler, e a falta não aparecia como erro: no modo mock puro (o
   * `cabinetonline.cc`) uma rota sem handler cai no fallback da SPA e devolve
   * `index.html` com **status 200**. O `Gravar` do site público teria
   * "gravado" uma página HTML.
   *
   * **Substitui o registro inteiro**, como o contrato manda: campo omitido do
   * corpo vira `null`, não conserva o que havia. É o que faz a guarda de
   * `corpoDeEscrita` (devolver `document` e `photoUrl` como vieram) valer a
   * pena aqui também, e não só contra o Postgres.
   *
   * **Não toca no VÍNCULO.** Cargo, setor, admissão, demissão e papel ficam
   * como estão — mudam por `PUT /api/employees/{id}/link`, que é outra
   * operação. Gravar a ficha numa empresa não reescreve o cargo da outra.
   */
  http.put('*/api/employees/:id', async ({ params, request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    // A matriz do api reserva `/api/employees` a quem administra: vínculo é o
    // que decide o papel dos OUTROS. O mock espelha a recusa (403
    // `papel-insuficiente`) para a tela poder exercitá-la sem backend.
    const semPermissao = verificarEscrita('employees')
    if (semPermissao) return semPermissao
    const achada = crm.fichas.find((f) => f.id === String(params.id))
    if (!achada) return naoEncontrado('Colaborador não encontrado.')

    const corpo = (await request.json()) as EmployeeWriteRequest
    if (!corpo.name?.trim()) {
      return camposInvalidos([{ path: 'name', message: 'Nome é obrigatório.' }])
    }
    // `employees.email` é NOT NULL no servidor e é por ele que a pessoa entra —
    // o mesmo motivo por que o `POST` daqui o exige.
    if (!corpo.email?.trim()) {
      return camposInvalidos([
        { path: 'email', message: 'Informe o e-mail — é por ele que a pessoa entra.' },
      ])
    }
    const email = corpo.email.trim().toLowerCase()
    // 409 e não 400: o pedido está bem formado — a credencial é única no
    // produto inteiro, sem diferença de caixa.
    if (crm.fichas.some((f) => f.id !== achada.id && f.email?.toLowerCase() === email)) {
      return conflito('Já existe um colaborador com este e-mail.')
    }

    achada.name = corpo.name.trim()
    achada.document = corpo.document ?? null
    achada.email = email
    achada.phone = corpo.phone ?? null
    achada.photoUrl = corpo.photoUrl ?? null
    achada.active = corpo.active ?? true
    sincronizarLinha(achada)
    return HttpResponse.json(achada)
  }),

  // ---------------- motivos de perda ----------------

  http.get('*/api/crm/lost-reasons', ({ request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return HttpResponse.json({ rows: [], total: 0 })
    return listar(crm.motivos, new URL(request.url), ORDENAVEIS_MOTIVO, (m) => [m.name])
  }),

  http.post('*/api/crm/lost-reasons', async ({ request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('crm')
    if (semPermissao) return semPermissao
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
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('crm')
    if (semPermissao) return semPermissao
    const achado = crm.motivos.find((m) => m.id === String(params.id))
    if (!achado) return naoEncontrado('Motivo não encontrado.')
    const corpo = (await request.json()) as CrmLostReasonWriteRequest
    if (!corpo.name?.trim()) return problemaJson(400, 'Nome do motivo é obrigatório.')
    achado.name = corpo.name
    achado.active = corpo.active ?? false
    return HttpResponse.json(achado)
  }),

  // ---------------- relatório de perdas ----------------

  /**
   * Por que perdemos, somado no período.
   *
   * A apuração mora AQUI, e não na tela, pelo motivo escrito no contrato: a
   * listagem tem teto de 100 por página, então contar do lado do cliente daria
   * número certo em base pequena e errado, sem sintoma, na primeira que
   * passasse do teto. O mock conta a base inteira porque é o que o servidor
   * fará.
   */
  http.get('*/api/crm/reports/lost-reasons', ({ request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()

    const url = new URL(request.url)
    const de = url.searchParams.get('from')
    const ate = url.searchParams.get('to')
    if (!de || !ate) return problemaJson(400, 'O período (`from` e `to`) é obrigatório.')
    if (de > ate) return problemaJson(400, 'O início do período é depois do fim.')
    const pipelineId = url.searchParams.get('pipelineId')

    const perdidas = crm.oportunidades.filter((o) => {
      if (pipelineId && o.pipelineId !== pipelineId) return false
      if (!estagio(o.stageId)?.isLost) return false
      // Por DIA, não por instante: quem pergunta por agosto quer o dia 31
      // inteiro, e o `closedAt` guardado tem hora.
      const dia = (o.closedAt ?? '').slice(0, 10)
      return dia !== '' && dia >= de && dia <= ate
    })

    const contagem = new Map<string, number>()
    for (const o of perdidas) {
      const chave = o.lostReasonId ?? ''
      contagem.set(chave, (contagem.get(chave) ?? 0) + 1)
    }

    const rows = [...contagem.entries()]
      .map(([id, count]) => ({
        lostReasonId: id === '' ? null : id,
        // Motivo DESATIVADO continua legível no relatório do ano passado: é
        // por isso que a desativação é lógica. Cair no genérico aqui apagaria
        // a razão da perda de tudo que veio antes da aposentadoria.
        lostReasonName:
          id === ''
            ? 'Sem motivo registrado'
            : (crm.motivos.find((m) => m.id === id)?.name ?? 'Motivo removido'),
        count,
      }))
      // A pergunta é qual é o MAIOR motivo; empate desempata por nome, para a
      // ordem não dançar entre duas consultas iguais.
      .sort((a, b) => b.count - a.count || a.lostReasonName.localeCompare(b.lostReasonName))

    return HttpResponse.json({ from: de, to: ate, total: perdidas.length, rows })
  }),
]
