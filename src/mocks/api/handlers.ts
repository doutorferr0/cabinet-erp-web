import type {
  LoginRequest,
  PartnerLinkRequest,
  PartnerWriteRequest,
  ProductVariantDto,
  ProductWriteRequest,
  SessaoAtual,
  StockMovementRequest,
  TaskDto,
  TaskPatchRequest,
  TaskWriteRequest,
  TodoPatchRequest,
  TrocarEmpresaRequest,
  VariantWriteRequest,
} from '@/api/gerado'
import { diaDoInstante, diaLocalISO } from '@/lib/datas'
import { http, HttpResponse } from 'msw'
import { handlersDoCrm } from './crm'
import { type ParceiroDaOrg, novoId, partnerDto, store } from './store'

/**
 * Handlers do modo mock — o "backend" do `VITE_API_MODE=mock`.
 *
 * Implementam as SEMÂNTICAS INEGOCIÁVEIS de `docs/integracao.md` sobre o store
 * em memória. Divergir daqui do que o contrato manda seria treinar as telas
 * contra um servidor que não existe — os pontos que importam:
 *
 * - listagem: `q`/`sortBy`/`sortDesc`/`page` (1-based)/`pageSize` (teto 100) →
 *   `{ rows, total }`, `total` COM filtro; `sortBy` fora da whitelist → 400;
 * - erro: `application/problem+json` (RFC 9457), com membro de extensão quando
 *   o contrato o usa (`existingPartnerId` no 409 de documento repetido);
 * - sessão sem empresa ativa: domínio responde LISTA VAZIA, não erro; escrita
 *   sem empresa responde 409;
 * - estoque não se escreve: movimenta (`stock_movements`), e o saldo é
 *   derivado — `balanceAfter` sai do saldo novo, saldo negativo é 409;
 * - `PUT` substitui o registro inteiro.
 *
 * Os paths usam `*` de prefixo para casar tanto o worker do browser (URLs
 * relativas) quanto o `setupServer` dos testes (URL absoluta de mentira).
 */

function problemaJson(status: number, detail: string, extras: Record<string, unknown> = {}) {
  return HttpResponse.json(
    { type: 'about:blank', title: 'Erro', status, detail, ...extras },
    { status, headers: { 'content-type': 'application/problem+json' } },
  )
}

const SEM_SESSAO = () => problemaJson(401, 'Não autenticado.')
const SEM_EMPRESA = () => problemaJson(409, 'Nenhuma empresa ativa na sessão.')

interface ConsultaDeLista {
  q: string | null
  sortBy: string | null
  sortDesc: boolean
  page: number
  pageSize: number
}

function lerConsulta(url: URL): ConsultaDeLista {
  return {
    q: url.searchParams.get('q'),
    sortBy: url.searchParams.get('sortBy'),
    sortDesc: url.searchParams.get('sortDesc') === 'true',
    page: Number(url.searchParams.get('page') ?? '1'),
    pageSize: Number(url.searchParams.get('pageSize') ?? '10'),
  }
}

/**
 * O contrato de listagem, num lugar só: filtro por `q` nos campos de texto,
 * whitelist de `sortBy` (fora dela → 400), paginação 1-based com teto 100 e
 * `total` calculado DEPOIS do filtro.
 */
function listar<T>(
  itens: readonly T[],
  consulta: ConsultaDeLista,
  ordenaveis: readonly string[],
  textoDe: (item: T) => (string | null | undefined)[],
) {
  if (consulta.page < 1 || consulta.pageSize < 1 || consulta.pageSize > 100) {
    return problemaJson(400, 'Paginação inválida: page é 1-based e pageSize vai até 100.')
  }
  if (consulta.sortBy && !ordenaveis.includes(consulta.sortBy)) {
    return problemaJson(400, `sortBy inválido: ${consulta.sortBy}.`)
  }

  let rows = [...itens]
  if (consulta.q) {
    const alvo = consulta.q.toLowerCase()
    rows = rows.filter((item) => textoDe(item).some((texto) => texto?.toLowerCase().includes(alvo)))
  }
  if (consulta.sortBy) {
    const chave = consulta.sortBy as keyof T
    rows.sort((a, b) => {
      const va = String(a[chave] ?? '')
      const vb = String(b[chave] ?? '')
      return consulta.sortDesc ? vb.localeCompare(va) : va.localeCompare(vb)
    })
  }

  const total = rows.length
  const inicio = (consulta.page - 1) * consulta.pageSize
  return HttpResponse.json({ rows: rows.slice(inicio, inicio + consulta.pageSize), total })
}

function sessaoAtual(): SessaoAtual {
  return {
    organizationId: 'org-vertz',
    employeeId: 'emp-admin',
    displayName: 'Henrique',
    activeTenantId: store.activeTenantId,
    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    mustChangePassword: store.mustChangePassword,
  }
}

export const handlers = [
  // ---------------- auth ----------------
  http.post('*/auth/login', async ({ request }) => {
    const corpo = (await request.json()) as LoginRequest
    // Credencial única do build demo (site público de preview): definida em
    // tempo de build via VITE_DEMO_USER/VITE_DEMO_PASS. Sem as duas (dev,
    // testes), o bloco não existe e o comportamento histórico segue intacto.
    const demoUser = import.meta.env.VITE_DEMO_USER
    const demoPass = import.meta.env.VITE_DEMO_PASS
    if (demoUser && demoPass) {
      if (corpo.email !== demoUser || corpo.password !== demoPass) {
        return problemaJson(401, 'E-mail ou senha inválidos.')
      }
      store.logado = true
      store.mustChangePassword = false
      store.activeTenantId = null
      return HttpResponse.json({ mustChangePassword: false })
    }
    // Senha 'errada' falha de propósito — é o caminho de teste do 401 na tela.
    if (corpo.password === 'errada') {
      return problemaJson(401, 'E-mail ou senha inválidos.')
    }
    store.logado = true
    // Senha 'temporaria' liga o fluxo de troca obrigatória — exercita a guarda.
    store.mustChangePassword = corpo.password === 'temporaria'
    store.activeTenantId = null
    return HttpResponse.json({ mustChangePassword: store.mustChangePassword })
  }),

  http.post('*/auth/logout', () => {
    store.logado = false
    store.activeTenantId = null
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('*/auth/me', () => {
    if (!store.logado) return SEM_SESSAO()
    return HttpResponse.json(sessaoAtual())
  }),

  http.post('*/auth/change-password', async ({ request }) => {
    if (!store.logado) return SEM_SESSAO()
    const corpo = (await request.json()) as { currentPassword?: string }
    if (corpo.currentPassword === 'errada') {
      return problemaJson(400, 'A senha atual não confere.')
    }
    store.mustChangePassword = false
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('*/auth/tenants', () => {
    if (!store.logado) return SEM_SESSAO()
    return HttpResponse.json(store.empresas)
  }),

  http.put('*/auth/active-tenant', async ({ request }) => {
    if (!store.logado) return SEM_SESSAO()
    const corpo = (await request.json()) as TrocarEmpresaRequest
    if (!store.empresas.some((e) => e.tenantId === corpo.tenantId)) {
      return problemaJson(400, 'Empresa fora dos vínculos do usuário.')
    }
    store.activeTenantId = corpo.tenantId
    return new HttpResponse(null, { status: 204 })
  }),

  // ---------------- catalog-lookups (da ORG — respondem sem empresa ativa) ----------------
  http.get('*/api/catalog-lookups', ({ request }) => {
    if (!store.logado) return SEM_SESSAO()
    const url = new URL(request.url)
    const kind = url.searchParams.get('kind')
    const base = kind ? store.lookups.filter((l) => l.kind === kind) : store.lookups
    return listar(base, lerConsulta(url), ['name', 'kind'], (l) => [l.name, l.kind])
  }),

  // ---------------- products ----------------
  http.get('*/api/products/:id', ({ params }) => {
    if (!store.logado) return SEM_SESSAO()
    if (!store.activeTenantId) return SEM_EMPRESA()
    const produto = store.produtos.find((p) => p.id === params.id)
    if (!produto) return problemaJson(404, 'Produto não encontrado.')
    return HttpResponse.json(produto)
  }),

  http.get('*/api/products', ({ request }) => {
    if (!store.logado) return SEM_SESSAO()
    const url = new URL(request.url)
    // Sem empresa ativa o domínio devolve VAZIO, não erro — modo de falhar da
    // Etapa 0, intacto até no mock.
    if (!store.activeTenantId) return HttpResponse.json({ rows: [], total: 0 })
    const rows = store.produtos.map(({ id, code, description, active }) => ({
      id,
      code,
      description,
      active,
    }))
    return listar(rows, lerConsulta(url), ['code', 'description', 'active'], (p) => [
      p.code,
      p.description,
    ])
  }),

  http.post('*/api/products', async ({ request }) => {
    if (!store.logado) return SEM_SESSAO()
    if (!store.activeTenantId) return SEM_EMPRESA()
    const corpo = (await request.json()) as ProductWriteRequest
    // `fields[]` (extensão do problem+json): o erro chega ao CONTROLE, não vira
    // frase solta no topo do formulário. Sem ele, o operador de um cadastro de
    // 20 campos lê "campos obrigatórios" e caça qual.
    //
    // A condição fica no `if`, e não numa lista montada antes, porque é ela que
    // estreita `code`/`description` para `string` no resto do handler — o
    // contrato os declara anuláveis.
    if (!corpo.code || !corpo.description) {
      return problemaJson(400, 'Confira os campos destacados.', {
        fields: [
          ...(corpo.code ? [] : [{ path: 'code', message: 'Informe o código do produto.' }]),
          ...(corpo.description ? [] : [{ path: 'description', message: 'Informe a descrição.' }]),
        ],
      })
    }
    if (store.produtos.some((p) => p.code === corpo.code)) {
      return problemaJson(409, `Já existe produto com o código ${corpo.code}.`)
    }
    const produto = {
      id: novoId('prod'),
      code: corpo.code,
      description: corpo.description,
      active: corpo.active ?? true,
      variants: [],
    }
    store.produtos.push(produto)
    const { variants: _, ...dto } = produto
    return HttpResponse.json(dto, { status: 201 })
  }),

  http.put('*/api/products/:id', async ({ params, request }) => {
    if (!store.logado) return SEM_SESSAO()
    if (!store.activeTenantId) return SEM_EMPRESA()
    const produto = store.produtos.find((p) => p.id === params.id)
    if (!produto) return problemaJson(404, 'Produto não encontrado.')
    const corpo = (await request.json()) as ProductWriteRequest
    if (!corpo.code || !corpo.description) {
      return problemaJson(400, 'Código e descrição são obrigatórios.')
    }
    // PUT substitui o registro inteiro — campo ausente APAGA, não preserva.
    produto.code = corpo.code
    produto.description = corpo.description
    produto.active = corpo.active ?? false
    const { variants: _, ...dto } = produto
    return HttpResponse.json(dto)
  }),

  // ---------------- variants ----------------
  http.post('*/api/products/:productId/variants', async ({ params, request }) => {
    if (!store.logado) return SEM_SESSAO()
    if (!store.activeTenantId) return SEM_EMPRESA()
    const produto = store.produtos.find((p) => p.id === params.productId)
    if (!produto) return problemaJson(404, 'Produto não encontrado.')
    const corpo = (await request.json()) as VariantWriteRequest
    const variante: ProductVariantDto = {
      id: novoId('var'),
      finish: corpo.finish ?? '',
      size: corpo.size ?? '',
      active: corpo.active ?? true,
      priceCents: corpo.priceCents ?? null,
      stockQty: 0,
      minStock: corpo.minStock ?? null,
    }
    produto.variants.push(variante)
    return HttpResponse.json(variante, { status: 201 })
  }),

  http.put('*/api/products/:productId/variants/:id', async ({ params, request }) => {
    if (!store.logado) return SEM_SESSAO()
    if (!store.activeTenantId) return SEM_EMPRESA()
    const produto = store.produtos.find((p) => p.id === params.productId)
    const variante = produto?.variants.find((v) => v.id === params.id)
    if (!produto || !variante) return problemaJson(404, 'Variante não encontrada.')
    const corpo = (await request.json()) as VariantWriteRequest
    variante.finish = corpo.finish ?? ''
    variante.size = corpo.size ?? ''
    variante.active = corpo.active ?? false
    variante.priceCents = corpo.priceCents ?? null
    variante.minStock = corpo.minStock ?? null
    return HttpResponse.json(variante)
  }),

  // ---------------- kardex (ADR-009: saldo é DERIVADO do movimento) ----------------
  http.get('*/api/variants/:variantId/stock-movements', ({ params, request }) => {
    if (!store.logado) return SEM_SESSAO()
    if (!store.activeTenantId) return HttpResponse.json({ rows: [], total: 0 })
    const url = new URL(request.url)
    const rows = store.movimentos.filter((m) => m.variantId === params.variantId).reverse()
    return listar(rows, lerConsulta(url), ['occurredAt'], (m) => [m.reason])
  }),

  http.post('*/api/variants/:variantId/stock-movements', async ({ params, request }) => {
    if (!store.logado) return SEM_SESSAO()
    if (!store.activeTenantId) return SEM_EMPRESA()
    const variante = store.produtos
      .flatMap((p) => p.variants)
      .find((v) => v.id === params.variantId)
    if (!variante) return problemaJson(404, 'Variante não encontrada.')
    const corpo = (await request.json()) as StockMovementRequest
    if (!corpo.delta || !corpo.reason) {
      return problemaJson(400, 'Movimento exige delta diferente de zero e um motivo.')
    }
    const saldoNovo = (variante.stockQty ?? 0) + corpo.delta
    if (saldoNovo < 0) {
      return problemaJson(409, 'Movimento deixaria o saldo negativo.')
    }
    variante.stockQty = saldoNovo
    const movimento = {
      id: novoId('mov'),
      variantId: variante.id,
      delta: corpo.delta,
      balanceAfter: saldoNovo,
      reason: corpo.reason,
      occurredAt: new Date().toISOString(),
      employeeId: 'emp-admin',
    }
    store.movimentos.push(movimento)
    return HttpResponse.json(movimento, { status: 201 })
  }),

  // ---------------- partners ----------------
  http.get('*/api/partners/:id', ({ params }) => {
    if (!store.logado) return SEM_SESSAO()
    if (!store.activeTenantId) return SEM_EMPRESA()
    const parceiro = store.parceiros.find((p) => p.id === params.id)
    // Sem vínculo com a empresa ativa = 404: buscar no cadastro da ORG abriria
    // parceiro da vizinha (mesma regra do backend — 404, não 403).
    if (!parceiro || !parceiro.vinculos[store.activeTenantId]) {
      return problemaJson(404, 'Parceiro não encontrado.')
    }
    return HttpResponse.json(partnerDto(parceiro, store.activeTenantId))
  }),

  http.get('*/api/partners', ({ request }) => {
    if (!store.logado) return SEM_SESSAO()
    const url = new URL(request.url)
    if (!store.activeTenantId) return HttpResponse.json({ rows: [], total: 0 })
    const tenantId = store.activeTenantId
    const role = url.searchParams.get('role')
    if (role && !['customer', 'supplier', 'professional'].includes(role)) {
      return problemaJson(400, `role inválido: ${role}.`)
    }
    const doPapel = (p: ParceiroDaOrg) =>
      role === 'customer'
        ? p.isCustomer
        : role === 'supplier'
          ? p.isSupplier
          : role === 'professional'
            ? p.isProfessional
            : true
    const rows = store.parceiros
      .filter((p) => p.vinculos[tenantId] && doPapel(p))
      .map((p) => partnerDto(p, tenantId))
    return listar(
      rows,
      lerConsulta(url),
      ['code', 'legalName', 'tradeName', 'document', 'active'],
      (p) => [p.code, p.legalName, p.tradeName, p.document],
    )
  }),

  http.post('*/api/partners', async ({ request }) => {
    if (!store.logado) return SEM_SESSAO()
    if (!store.activeTenantId) return SEM_EMPRESA()
    const corpo = (await request.json()) as PartnerWriteRequest
    if (!corpo.legalName) {
      return problemaJson(400, 'Confira os campos destacados.', {
        fields: [{ path: 'legalName', message: 'Informe a razão social.' }],
      })
    }
    const existente = corpo.document
      ? store.parceiros.find((p) => p.document === corpo.document)
      : undefined
    if (existente) {
      // O 409 carrega o membro de extensão que a tela usa para oferecer o
      // vínculo — é a semântica do backend, não invenção do mock.
      return problemaJson(409, 'Documento já cadastrado no grupo.', {
        existingPartnerId: existente.id,
      })
    }
    const parceiro: ParceiroDaOrg = {
      id: novoId('parc'),
      legalName: corpo.legalName,
      tradeName: corpo.tradeName ?? null,
      document: corpo.document ?? null,
      email: corpo.email ?? null,
      isCustomer: corpo.isCustomer ?? false,
      isSupplier: corpo.isSupplier ?? false,
      isProfessional: corpo.isProfessional ?? false,
      registrationActive: true,
      vinculos: {
        [store.activeTenantId]: {
          code: corpo.code ?? null,
          paymentTerms: corpo.paymentTerms ?? null,
          active: corpo.active ?? true,
        },
      },
    }
    store.parceiros.push(parceiro)
    return HttpResponse.json(partnerDto(parceiro, store.activeTenantId), { status: 201 })
  }),

  http.put('*/api/partners/:id', async ({ params, request }) => {
    if (!store.logado) return SEM_SESSAO()
    if (!store.activeTenantId) return SEM_EMPRESA()
    const parceiro = store.parceiros.find((p) => p.id === params.id)
    if (!parceiro || !parceiro.vinculos[store.activeTenantId]) {
      return problemaJson(404, 'Parceiro não encontrado.')
    }
    const corpo = (await request.json()) as PartnerWriteRequest
    if (!corpo.legalName) {
      return problemaJson(400, 'Confira os campos destacados.', {
        fields: [{ path: 'legalName', message: 'Informe a razão social.' }],
      })
    }
    parceiro.legalName = corpo.legalName
    parceiro.tradeName = corpo.tradeName ?? null
    parceiro.document = corpo.document ?? null
    parceiro.email = corpo.email ?? null
    parceiro.isCustomer = corpo.isCustomer ?? false
    parceiro.isSupplier = corpo.isSupplier ?? false
    parceiro.isProfessional = corpo.isProfessional ?? false
    parceiro.vinculos[store.activeTenantId] = {
      code: corpo.code ?? null,
      paymentTerms: corpo.paymentTerms ?? null,
      active: corpo.active ?? false,
    }
    return HttpResponse.json(partnerDto(parceiro, store.activeTenantId))
  }),

  http.post('*/api/partners/:id/link', async ({ params, request }) => {
    if (!store.logado) return SEM_SESSAO()
    if (!store.activeTenantId) return SEM_EMPRESA()
    const parceiro = store.parceiros.find((p) => p.id === params.id)
    if (!parceiro) return problemaJson(404, 'Parceiro não encontrado.')
    const corpo = (await request.json()) as PartnerLinkRequest
    parceiro.vinculos[store.activeTenantId] = {
      code: corpo.code ?? null,
      paymentTerms: corpo.paymentTerms ?? null,
      active: corpo.active ?? true,
    }
    return HttpResponse.json(partnerDto(parceiro, store.activeTenantId))
  }),

  // ---------------- dashboard ----------------

  /**
   * Os quatro indicadores. Três dos quatro são DERIVADOS do próprio store — a
   * contagem de estoque crítico sai das variantes com saldo abaixo do mínimo, e
   * o quadro de tarefas alimenta o que está em aberto. Número constante aqui
   * mentiria de um jeito específico: continuaria igual depois de o operador
   * mexer no cadastro, e ninguém desconfia de um KPI parado.
   */
  http.get('*/api/dashboard/summary', () => {
    if (!store.logado) return SEM_SESSAO()
    // Sem empresa ativa o domínio responde VAZIO, não erro (semântica da Etapa
    // 0) — e vazio, para número, é zero.
    if (!store.activeTenantId) {
      return HttpResponse.json({
        openQuotes: 0,
        openQuotesDueThisWeek: 0,
        incomingOrders: 0,
        incomingOrdersToday: 0,
        criticalStockItems: 0,
        monthSalesCents: 0,
        previousMonthSalesCents: 0,
      })
    }

    const criticos = store.produtos
      .flatMap((p) => p.variants ?? [])
      .filter((v) => v.active && (v.stockQty ?? 0) < (v.minStock ?? 0)).length
    const emAberto = store.tarefas.filter((t) => t.status !== 'done')
    const hoje = diaLocalISO()
    const emUmaSemana = diaLocalISO(new Date(Date.now() + 7 * 86400000))

    return HttpResponse.json({
      openQuotes: emAberto.length,
      openQuotesDueThisWeek: emAberto.filter((t) => t.dueOn && t.dueOn <= emUmaSemana).length,
      incomingOrders: store.tarefas.filter((t) => t.status === 'doing').length,
      incomingOrdersToday: store.tarefas.filter((t) => t.dueOn === hoje).length,
      criticalStockItems: criticos,
      monthSalesCents: 18_240_000,
      previousMonthSalesCents: 16_285_000,
    })
  }),

  http.get('*/api/dashboard/agenda', ({ request }) => {
    if (!store.logado) return SEM_SESSAO()
    if (!store.activeTenantId) return HttpResponse.json([])
    const url = new URL(request.url)
    const de = url.searchParams.get('from')
    const ate = url.searchParams.get('to')
    // `from`/`to` são obrigatórios no contrato: sem eles a resposta seria a
    // agenda inteira, e a tela pediria um mês achando que recebeu um mês.
    if (!de || !ate) return problemaJson(400, 'Informe from e to (datas ISO).')

    // O dia é o LOCAL do operador, não o de UTC: `startsAt.slice(0,10)` jogaria
    // todo compromisso da noite para o dia seguinte no fuso do Brasil.
    const dentro = store.agenda
      .filter((ev) => {
        const dia = diaDoInstante(ev.startsAt)
        return dia >= de && dia <= ate
      })
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    return HttpResponse.json(dentro)
  }),

  http.get('*/api/tasks', ({ request }) => {
    if (!store.logado) return SEM_SESSAO()
    if (!store.activeTenantId) return HttpResponse.json([])
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const q = url.searchParams.get('q')?.toLowerCase()

    let tarefas = [...store.tarefas]
    if (status) tarefas = tarefas.filter((t) => t.status === status)
    if (q) {
      tarefas = tarefas.filter(
        (t) => t.title.toLowerCase().includes(q) || (t.description ?? '').toLowerCase().includes(q),
      )
    }
    return HttpResponse.json(tarefas)
  }),

  http.post('*/api/tasks', async ({ request }) => {
    if (!store.logado) return SEM_SESSAO()
    if (!store.activeTenantId) return SEM_EMPRESA()
    const corpo = (await request.json()) as TaskWriteRequest
    if (!corpo.title?.trim()) return problemaJson(400, 'Título é obrigatório.')

    const tarefa: TaskDto = {
      id: novoId('task'),
      title: corpo.title,
      description: corpo.description ?? null,
      status: corpo.status,
      priority: corpo.priority,
      dueOn: corpo.dueOn ?? null,
      commentCount: 0,
      attachmentCount: 0,
      assignees: [],
    }
    store.tarefas.push(tarefa)
    return HttpResponse.json(tarefa, { status: 201 })
  }),

  /**
   * PATCH parcial: campo AUSENTE fica como está, campo `null` apaga. É a
   * distinção que o contrato promete, e ela só existe se o handler olhar a
   * presença da chave em vez do valor — `corpo.dueOn ?? tarefa.dueOn` trataria
   * `null` como ausente e tornaria impossível limpar um prazo.
   */
  http.patch('*/api/tasks/:taskId', async ({ params, request }) => {
    if (!store.logado) return SEM_SESSAO()
    if (!store.activeTenantId) return SEM_EMPRESA()
    const tarefa = store.tarefas.find((t) => t.id === params.taskId)
    if (!tarefa) return problemaJson(404, 'Tarefa não encontrada.')

    const corpo = (await request.json()) as TaskPatchRequest
    if ('title' in corpo) {
      if (!corpo.title?.trim()) return problemaJson(400, 'Título é obrigatório.')
      tarefa.title = corpo.title
    }
    if ('description' in corpo) tarefa.description = corpo.description ?? null
    if ('status' in corpo && corpo.status) tarefa.status = corpo.status
    if ('priority' in corpo && corpo.priority) tarefa.priority = corpo.priority
    if ('dueOn' in corpo) tarefa.dueOn = corpo.dueOn ?? null
    return HttpResponse.json(tarefa)
  }),

  http.get('*/api/todos', () => {
    if (!store.logado) return SEM_SESSAO()
    if (!store.activeTenantId) return HttpResponse.json([])
    return HttpResponse.json(store.todos)
  }),

  http.patch('*/api/todos/:todoId', async ({ params, request }) => {
    if (!store.logado) return SEM_SESSAO()
    if (!store.activeTenantId) return SEM_EMPRESA()
    const item = store.todos.find((t) => t.id === params.todoId)
    if (!item) return problemaJson(404, 'Item não encontrado.')
    const corpo = (await request.json()) as TodoPatchRequest
    if (typeof corpo.done !== 'boolean') return problemaJson(400, 'done é obrigatório.')
    item.done = corpo.done
    return HttpResponse.json(item)
  }),

  // ---------------- planner ----------------

  http.get('*/api/projects', ({ request }) => {
    if (!store.logado) return SEM_SESSAO()
    if (!store.activeTenantId) return HttpResponse.json([])
    const status = new URL(request.url).searchParams.get('status')
    if (!status) return HttpResponse.json(store.projetos)
    // Lista separada por vírgula: o toggle do Planner manda dois status de uma
    // vez (`active,proposed`), e é assim que o contrato o descreve.
    const aceitos = status.split(',').map((s) => s.trim())
    return HttpResponse.json(store.projetos.filter((p) => aceitos.includes(p.status)))
  }),

  http.get('*/api/projects/:projectId/plan', ({ params }) => {
    if (!store.logado) return SEM_SESSAO()
    if (!store.activeTenantId) return SEM_EMPRESA()
    const plano = store.planos[String(params.projectId)]
    if (!plano) return problemaJson(404, 'Projeto não encontrado.')
    return HttpResponse.json(plano)
  }),

  // ---------------- crm ----------------
  // Estado e handlers do funil vivem em `crm.ts`: estado próprio, e arquivo
  // novo não disputa linha com quem estiver editando este aqui.
  ...handlersDoCrm,

  // ---------------- health ----------------
  http.get('*/health', () => HttpResponse.json({ status: 'ok' })),
  http.get('*/health/db', () =>
    HttpResponse.json({ status: 'ok', detail: null, pendingMigrations: null }),
  ),
]
