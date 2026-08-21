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
import { handlersDeAtividades } from './atividades'
import { handlersDeContatos } from './contatos'
import { handlersDoCrm } from './crm'
import { type CamposFiltraveis, aplicarFiltros } from './filtro-do-servidor'
import { handlersDeLookups } from './lookups'
import { handlersDeObras } from './obras'
import {
  TIPO,
  camposInvalidos,
  conflito,
  naoEncontrado,
  problemaJson,
  semEmpresaAtiva,
  semSessao,
} from './problema'
import { handlersDeOrcamento } from './quotes'
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

interface ConsultaDeLista {
  q: string | null
  sortBy: string | null
  sortDesc: boolean
  page: number
  pageSize: number
  /** A URL inteira: `filters`/`joinOperator` são lidos por `aplicarFiltros`. */
  url: URL
}

function lerConsulta(url: URL): ConsultaDeLista {
  return {
    q: url.searchParams.get('q'),
    sortBy: url.searchParams.get('sortBy'),
    sortDesc: url.searchParams.get('sortDesc') === 'true',
    page: Number(url.searchParams.get('page') ?? '1'),
    pageSize: Number(url.searchParams.get('pageSize') ?? '10'),
    url,
  }
}

/**
 * O contrato de listagem, num lugar só: filtro por `q` nos campos de texto,
 * **filtro estruturado por `filters`**, whitelist de `sortBy` (fora dela → 400),
 * paginação 1-based com teto 100 e `total` calculado DEPOIS do filtro.
 *
 * `filtraveis` é o quinto argumento e é OPCIONAL de propósito: ausente significa
 * "este recurso não publica `filters`", e o filtro que chegar vira 400. É o que
 * separa `/api/products` (publica) de `/api/catalog-lookups` (não publica) sem
 * que nenhum dos dois precise repetir a regra.
 *
 * **Isto estava faltando, e o buraco era visível no ar** (achado no PR #114): o
 * parâmetro chegava aqui e era descartado em silêncio — a listagem devolvia a
 * lista inteira enquanto o painel da tela mostrava a condição aplicada. Em
 * `cabinetonline.cc`, que roda em modo mock, isso não era limitação de mock; era
 * a tela afirmando o que não é.
 */
function listar<T>(
  itens: readonly T[],
  consulta: ConsultaDeLista,
  ordenaveis: readonly string[],
  textoDe: (item: T) => (string | null | undefined)[],
  filtraveis?: CamposFiltraveis,
) {
  if (consulta.page < 1 || consulta.pageSize < 1 || consulta.pageSize > 100) {
    return problemaJson(
      400,
      'Paginação inválida: page é 1-based e pageSize vai até 100.',
      {},
      TIPO.paginacaoInvalida,
    )
  }
  if (consulta.sortBy && !ordenaveis.includes(consulta.sortBy)) {
    return problemaJson(400, `sortBy inválido: ${consulta.sortBy}.`, {}, TIPO.ordenacaoInvalida)
  }

  let rows = [...itens]
  if (consulta.q) {
    const alvo = consulta.q.toLowerCase()
    rows = rows.filter((item) => textoDe(item).some((texto) => texto?.toLowerCase().includes(alvo)))
  }

  const filtradas = aplicarFiltros(rows, consulta.url, filtraveis)
  if (typeof filtradas === 'string') return problemaJson(400, filtradas, {}, TIPO.filtroInvalido)
  rows = filtradas

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

/** Métodos que ESCREVEM — os que o ensaio de expiração intercepta. */
const ESCRITA = ['POST', 'PUT', 'PATCH', 'DELETE']

export const handlers = [
  // ---------------- ensaio de expiração (#124, ponto 4) ----------------
  //
  // PRIMEIRO da lista de propósito: o MSW resolve na ordem, e um gatilho que
  // corresse depois do handler do recurso já teria deixado a escrita acontecer
  // — o store mudaria e a resposta 401 mentiria sobre o que o servidor fez.
  //
  // Armado por `armarExpiracaoDaProximaEscrita()`; desarma ao disparar.
  http.all('*', async ({ request }) => {
    if (!store.expiraProximaEscrita) return undefined
    if (!ESCRITA.includes(request.method.toUpperCase())) return undefined
    // O login NUNCA expira: é por ele que o operador reentra depois de tomar o
    // 401. Interceptá-lo deixaria o ensaio sem saída — a tela pediria para
    // entrar de novo e a reentrada tomaria 401 também.
    if (new URL(request.url).pathname.endsWith('/auth/login')) return undefined

    store.expiraProximaEscrita = false
    return semSessao()
  }),

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
    if (!store.logado) return semSessao()
    return HttpResponse.json(sessaoAtual())
  }),

  http.post('*/auth/change-password', async ({ request }) => {
    if (!store.logado) return semSessao()
    const corpo = (await request.json()) as { currentPassword?: string }
    if (corpo.currentPassword === 'errada') {
      return problemaJson(400, 'A senha atual não confere.', {}, TIPO.senhaAtualInvalida)
    }
    store.mustChangePassword = false
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('*/auth/tenants', () => {
    if (!store.logado) return semSessao()
    return HttpResponse.json(store.empresas)
  }),

  http.put('*/auth/active-tenant', async ({ request }) => {
    if (!store.logado) return semSessao()
    const corpo = (await request.json()) as TrocarEmpresaRequest
    // 403, e não o 400 que estava aqui: escolher empresa fora dos vínculos é
    // pedido BEM formado que o servidor recusa — é o caso 2 do `SemPermissao`
    // do contrato, e é o que o backend real responde. 404 seria pior ainda:
    // esconderia a existência de uma empresa cujo id viaja em `/auth/tenants`.
    if (!store.empresas.some((e) => e.tenantId === corpo.tenantId)) {
      return problemaJson(
        403,
        'Usuário não tem vínculo com a empresa informada.',
        {},
        TIPO.semVinculoComEmpresa,
      )
    }
    store.activeTenantId = corpo.tenantId
    return new HttpResponse(null, { status: 204 })
  }),

  // ---------------- catalog-lookups (da ORG — respondem sem empresa ativa) ----------------
  http.get('*/api/catalog-lookups', ({ request }) => {
    if (!store.logado) return semSessao()
    const url = new URL(request.url)
    const kind = url.searchParams.get('kind')
    const base = kind ? store.lookups.filter((l) => l.kind === kind) : store.lookups
    return listar(base, lerConsulta(url), ['name', 'kind'], (l) => [l.name, l.kind])
  }),

  // O `POST` do `+...` NÃO mora aqui: ele é `handlersDeLookups`, em
  // `lookups.ts` (#269), com o vocabulário de `kind`, o `fields[]` e o
  // `sem-empresa-ativa` que o backend real responde. Esta PR chegou a escrever
  // um segundo handler neste arquivo, e o rebase mostrou o preço: registrado
  // ANTES do outro, o MSW casava o ingênuo e o da #269 nunca rodava — cinco
  // asserções do vocabulário de erro ficaram vermelhas sem que ninguém
  // tivesse mexido nelas. Rota com dois donos é a rota que responde pelo dono
  // errado.

  // ---------------- products ----------------
  http.get('*/api/products/:id', ({ params }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const produto = store.produtos.find((p) => p.id === params.id)
    if (!produto) return naoEncontrado('Produto não encontrado.')
    return HttpResponse.json(produto)
  }),

  http.get('*/api/products', ({ request }) => {
    if (!store.logado) return semSessao()
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
    return listar(
      rows,
      lerConsulta(url),
      ['code', 'description', 'active'],
      (p) => [p.code, p.description],
      // A whitelist do contrato para `/api/products`, com o TIPO de cada campo —
      // é o servidor que sabe se `active` é booleano, não a tela.
      { code: 'text', description: 'text', active: 'boolean' },
    )
  }),

  http.post('*/api/products', async ({ request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const corpo = (await request.json()) as ProductWriteRequest
    // `fields[]` (extensão do problem+json): o erro chega ao CONTROLE, não vira
    // frase solta no topo do formulário. Sem ele, o operador de um cadastro de
    // 20 campos lê "campos obrigatórios" e caça qual.
    //
    // A condição fica no `if`, e não numa lista montada antes, porque é ela que
    // estreita `code`/`description` para `string` no resto do handler — o
    // contrato os declara anuláveis.
    if (!corpo.code || !corpo.description) {
      return camposInvalidos([
        ...(corpo.code ? [] : [{ path: 'code', message: 'Informe o código do produto.' }]),
        ...(corpo.description ? [] : [{ path: 'description', message: 'Informe a descrição.' }]),
      ])
    }
    if (store.produtos.some((p) => p.code === corpo.code)) {
      return conflito(`Já existe produto com o código ${corpo.code}.`, TIPO.codigoJaCadastrado)
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
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const produto = store.produtos.find((p) => p.id === params.id)
    if (!produto) return naoEncontrado('Produto não encontrado.')
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
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const produto = store.produtos.find((p) => p.id === params.productId)
    if (!produto) return naoEncontrado('Produto não encontrado.')
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
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const produto = store.produtos.find((p) => p.id === params.productId)
    const variante = produto?.variants.find((v) => v.id === params.id)
    if (!produto || !variante) return naoEncontrado('Variante não encontrada.')
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
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return HttpResponse.json({ rows: [], total: 0 })
    const url = new URL(request.url)
    const rows = store.movimentos.filter((m) => m.variantId === params.variantId).reverse()
    return listar(rows, lerConsulta(url), ['occurredAt'], (m) => [m.reason])
  }),

  http.post('*/api/variants/:variantId/stock-movements', async ({ params, request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const variante = store.produtos
      .flatMap((p) => p.variants)
      .find((v) => v.id === params.variantId)
    if (!variante) return naoEncontrado('Variante não encontrada.')
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
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const parceiro = store.parceiros.find((p) => p.id === params.id)
    // Sem vínculo com a empresa ativa = 404: buscar no cadastro da ORG abriria
    // parceiro da vizinha (mesma regra do backend — 404, não 403).
    if (!parceiro || !parceiro.vinculos[store.activeTenantId]) {
      return naoEncontrado('Parceiro não encontrado.')
    }
    return HttpResponse.json(partnerDto(parceiro, store.activeTenantId))
  }),

  http.get('*/api/partners', ({ request }) => {
    if (!store.logado) return semSessao()
    const url = new URL(request.url)
    if (!store.activeTenantId) return HttpResponse.json({ rows: [], total: 0 })
    const tenantId = store.activeTenantId
    const role = url.searchParams.get('role')
    if (role && !['customer', 'supplier', 'professional'].includes(role)) {
      return problemaJson(400, `role inválido: ${role}.`, {}, TIPO.papelInvalido)
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
      // A whitelist do contrato para `/api/partners`. `document` é `text` e o
      // dado é guardado SEM máscara — quem tira a pontuação do que o operador
      // digitou é o `normalizar` do campo, na saída da tela (§Filtro estruturado).
      {
        code: 'text',
        legalName: 'text',
        tradeName: 'text',
        document: 'text',
        active: 'boolean',
      },
    )
  }),

  http.post('*/api/partners', async ({ request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const corpo = (await request.json()) as PartnerWriteRequest
    if (!corpo.legalName) {
      return camposInvalidos([{ path: 'legalName', message: 'Informe a razão social.' }])
    }
    const existente = corpo.document
      ? store.parceiros.find((p) => p.document === corpo.document)
      : undefined
    if (existente) {
      // O 409 carrega o membro de extensão que a tela usa para oferecer o
      // vínculo — é a semântica do backend, não invenção do mock.
      return conflito('Documento já cadastrado no grupo.', TIPO.documentoJaCadastrado, {
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
      // Nasce com o que o corpo trouxe, campo a campo. O conselho e a conta
      // vêm da tela de Profissional; ignorá-los aqui faria o cadastro novo
      // perdê-los entre o 201 e a primeira releitura.
      registration: corpo.registration ?? null,
      payoutBankInfo: corpo.payoutBankInfo ?? null,
      parentId: corpo.parentId ?? null,
      mobilePhone: corpo.mobilePhone ?? null,
      businessPhone: corpo.businessPhone ?? null,
      homePhone: corpo.homePhone ?? null,
      fax: corpo.fax ?? null,
      address: corpo.address ?? null,
      stateRegistration: corpo.stateRegistration ?? null,
      ruralProducerRegistration: corpo.ruralProducerRegistration ?? null,
      categoryId: corpo.categoryId ?? null,
      specifierId: corpo.specifierId ?? null,
      notes: corpo.notes ?? null,
      facebook: corpo.facebook ?? null,
      instagram: corpo.instagram ?? null,
      billingAddress: corpo.billingAddress ?? null,
      businessAddress: corpo.businessAddress ?? null,
      businessName: corpo.businessName ?? null,
      businessRole: corpo.businessRole ?? null,
      businessDocument: corpo.businessDocument ?? null,
      foundedOn: corpo.foundedOn ?? null,
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
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const parceiro = store.parceiros.find((p) => p.id === params.id)
    if (!parceiro || !parceiro.vinculos[store.activeTenantId]) {
      return naoEncontrado('Parceiro não encontrado.')
    }
    const corpo = (await request.json()) as PartnerWriteRequest
    if (!corpo.legalName) {
      return camposInvalidos([{ path: 'legalName', message: 'Informe a razão social.' }])
    }
    parceiro.legalName = corpo.legalName
    parceiro.tradeName = corpo.tradeName ?? null
    parceiro.document = corpo.document ?? null
    parceiro.email = corpo.email ?? null
    parceiro.isCustomer = corpo.isCustomer ?? false
    parceiro.isSupplier = corpo.isSupplier ?? false
    parceiro.isProfessional = corpo.isProfessional ?? false
    // `PUT` substitui o registro inteiro: o que o corpo não trouxer é apagado,
    // e é por isso que a tela devolve como veio o que não edita. O mock
    // apagando de verdade é o que torna a regra observável no navegador — um
    // mock que preservasse o campo omitido esconderia o defeito até a produção.
    parceiro.registration = corpo.registration ?? null
    parceiro.payoutBankInfo = corpo.payoutBankInfo ?? null
    parceiro.parentId = corpo.parentId ?? null
    parceiro.mobilePhone = corpo.mobilePhone ?? null
    parceiro.businessPhone = corpo.businessPhone ?? null
    parceiro.homePhone = corpo.homePhone ?? null
    parceiro.fax = corpo.fax ?? null
    parceiro.address = corpo.address ?? null
    parceiro.stateRegistration = corpo.stateRegistration ?? null
    parceiro.ruralProducerRegistration = corpo.ruralProducerRegistration ?? null
    parceiro.categoryId = corpo.categoryId ?? null
    parceiro.specifierId = corpo.specifierId ?? null
    parceiro.notes = corpo.notes ?? null
    parceiro.facebook = corpo.facebook ?? null
    parceiro.instagram = corpo.instagram ?? null
    parceiro.billingAddress = corpo.billingAddress ?? null
    parceiro.businessAddress = corpo.businessAddress ?? null
    parceiro.businessName = corpo.businessName ?? null
    parceiro.businessRole = corpo.businessRole ?? null
    parceiro.businessDocument = corpo.businessDocument ?? null
    parceiro.foundedOn = corpo.foundedOn ?? null
    parceiro.vinculos[store.activeTenantId] = {
      code: corpo.code ?? null,
      paymentTerms: corpo.paymentTerms ?? null,
      active: corpo.active ?? false,
    }
    return HttpResponse.json(partnerDto(parceiro, store.activeTenantId))
  }),

  http.post('*/api/partners/:id/link', async ({ params, request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const parceiro = store.parceiros.find((p) => p.id === params.id)
    if (!parceiro) return naoEncontrado('Parceiro não encontrado.')
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
    if (!store.logado) return semSessao()
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
    if (!store.logado) return semSessao()
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
    if (!store.logado) return semSessao()
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
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
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
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const tarefa = store.tarefas.find((t) => t.id === params.taskId)
    if (!tarefa) return naoEncontrado('Tarefa não encontrada.')

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
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return HttpResponse.json([])
    return HttpResponse.json(store.todos)
  }),

  http.patch('*/api/todos/:todoId', async ({ params, request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const item = store.todos.find((t) => t.id === params.todoId)
    if (!item) return naoEncontrado('Item não encontrado.')
    const corpo = (await request.json()) as TodoPatchRequest
    if (typeof corpo.done !== 'boolean') return problemaJson(400, 'done é obrigatório.')
    item.done = corpo.done
    return HttpResponse.json(item)
  }),

  // ---------------- planner ----------------

  http.get('*/api/projects', ({ request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return HttpResponse.json([])
    const status = new URL(request.url).searchParams.get('status')
    if (!status) return HttpResponse.json(store.projetos)
    // Lista separada por vírgula: o toggle do Planner manda dois status de uma
    // vez (`active,proposed`), e é assim que o contrato o descreve.
    const aceitos = status.split(',').map((s) => s.trim())
    return HttpResponse.json(store.projetos.filter((p) => aceitos.includes(p.status)))
  }),

  http.get('*/api/projects/:projectId/plan', ({ params }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const plano = store.planos[String(params.projectId)]
    if (!plano) return naoEncontrado('Projeto não encontrado.')
    return HttpResponse.json(plano)
  }),

  // ---------------- crm ----------------
  // Estado e handlers do funil vivem em `crm.ts`: estado próprio, e arquivo
  // novo não disputa linha com quem estiver editando este aqui.
  ...handlersDoCrm,

  // ---------------- orçamento ----------------
  // Mesma razão do CRM: estado e handlers em `quotes.ts`.
  ...handlersDeOrcamento,

  // ---------------- atividades ----------------
  // Mesma decisão do CRM, e aqui ela pesa mais: a tabela é POLIMÓRFICA e o
  // painel monta em oportunidade, parceiro, orçamento e pedido — o estado não é
  // de nenhum módulo em particular.
  ...handlersDeAtividades,

  // ---------------- bloco 2 do comparativo (#255) ----------------
  //
  // Obra e contatos moram em arquivo próprio, como CRM e atividades: estado que
  // não é do store das telas antigas, e arquivo novo não conflita com quem
  // edita o vizinho.
  //
  // Os contatos convivem com `*/api/partners/:id`, que está mais acima: o
  // parâmetro do MSW não atravessa `/`, então `/api/partners/x/contacts` não
  // casa o padrão do detalhe. Isso é sutileza de matcher, e sutileza que a
  // rota certa depende para responder merece teste — tem um, e ele falha se
  // o dia em que a biblioteca mudar de ideia chegar.
  ...handlersDeObras,
  ...handlersDeContatos,

  // A ESCRITA das listas de apoio (o `+...` do combo). A leitura ficou aqui em
  // cima porque depende do `listar`/`lerConsulta` deste arquivo; as regras da
  // escrita moram no arquivo próprio — ver o cabeçalho de `lookups.ts`.
  ...handlersDeLookups,

  // ---------------- health ----------------
  http.get('*/health', () => HttpResponse.json({ status: 'ok' })),
  http.get('*/health/db', () =>
    HttpResponse.json({ status: 'ok', detail: null, pendingMigrations: null }),
  ),
]
