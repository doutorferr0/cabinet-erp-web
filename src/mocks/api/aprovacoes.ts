import type {
  ApprovalDecisionRequest,
  ApprovalRejectionRequest,
  ApprovalRequestDto,
  ApprovalRequestStatus,
  ApprovalSummaryDto,
} from '@/api/gerado'
import { podeEscrever } from '@/data/papeis'
import { http, HttpResponse } from 'msw'
import { papelDaSessao } from './permissao'
import { TIPO, camposInvalidos, naoEncontrado, problemaJson, semSessao } from './problema'
import { detalheDoOrcamento, orcamentoPorId } from './quotes'
import { TENANT_FILIAL, TENANT_MATRIZ, store } from './store'

/**
 * O "backend" da FILA DE APROVAÇÕES no modo mock (`/api/approval-requests`).
 *
 * ## O que este mock existe para ensinar
 *
 * A tela da fila nasce ANTES do gancho no documento — o `cabinet-erp-api#237`
 * (fase 1 do approval flow) implementa quem CRIA o pedido, e enquanto isso não
 * existe a fila só teria como ficar vazia. Vazia ela não prova nada: não mostra
 * a diferença entre "o aprovador vê tudo" e "o vendedor vê o próprio", nem que
 * quem pediu não decide, nem que recusa exige motivo.
 *
 * Por isso a semente traz seis pedidos, e cada um está lá por uma razão:
 *
 * 1. **Dois pendentes de OUTRAS pessoas** — a fila de trabalho do aprovador.
 * 2. **Um pendente do PRÓPRIO operador** (`emp-admin`, que é quem a sessão do
 *    mock é) — `canDecide: false` mesmo com papel de sobra. É a regra do
 *    solicitante ficando visível sem ninguém ter de trocar de usuário.
 * 3. **Um aprovado e um recusado**, os dois com quem decidiu e quando — a fila
 *    decidida é HISTÓRICO, e some da tela se a listagem escondesse o que não
 *    está pendente.
 * 4. **Um na FILIAL, aberto pelo próprio operador** — na filial o vínculo é
 *    `viewer`, e ali a mesma tela mostra uma linha e nenhum botão. Trocar de
 *    empresa no rodapé é o jeito mais barato de ver as duas metades da regra.
 *
 * ## O que o mock NÃO faz, e é o buraco declarado
 *
 * **Não existe criação.** Não há `POST /api/approval-requests` no contrato (ver
 * `ApprovalRequestDto`), e o gancho que geraria o pedido vive no servidor, ao
 * gravar orçamento com desconto acima do teto. Aqui, gravar orçamento com 30%
 * de desconto não põe nada na fila — e é assim que fica visível que a metade que
 * falta é do api, não da tela.
 *
 * **Aprovar não destrava documento nenhum.** No servidor de verdade a decisão
 * volta para o orçamento; aqui ela só muda o pedido. Fingir o efeito exigiria
 * inventar no `QuoteDto` um estado que o contrato não publica — que é o caso em
 * que o mock começa a mentir com cara de servidor.
 */

/**
 * A whitelist de `sortBy` — conferida contra a DESCRIÇÃO do contrato por
 * `src/data/whitelist-do-contrato.test.ts`, que cobra IGUALDADE.
 *
 * Os três nomes congelados (`subjectLabel`, `customerName`, `requestedByName`)
 * ficam de fora pelo motivo que já tirou `customerName` do romaneio: são cópia
 * de outra tabela, e prometer ordem sobre elas é prometer índice que o servidor
 * não tem.
 */
export const ORDENAVEIS = ['requestedAt', 'status', 'requestedPercent', 'discountCents']

/** O `employeeId` que a sessão do mock devolve (`sessaoAtual()` em `handlers.ts`). */
const EU = 'emp-admin'

/** O pedido COMO O STORE o guarda: o DTO sem o campo que é resposta, mais o `tenantId`. */
interface PedidoGuardado extends Omit<ApprovalRequestDto, 'canDecide'> {
  tenantId: string
}

interface Estado {
  pedidos: PedidoGuardado[]
}

let estado: Estado = estadoInicial()

/** Volta ao seed entre testes — o par do `resetQuotes`. */
export function resetAprovacoes(): void {
  estado = estadoInicial()
}

/**
 * Um pedido do seed, com os valores TIRADOS do orçamento que o gerou.
 *
 * Os números não são inventados: `discountCents` e `documentTotalCents` saem do
 * documento de verdade, porque a fila decide olhando para dinheiro e um valor
 * de fachada faria a coluna mais importante da tela ser a única falsa.
 */
function pedidoDoSeed(entrada: {
  id: string
  tenantId: string
  status: ApprovalRequestStatus
  requestedByEmployeeId: string
  requestedByName: string
  requestedAt: string
  orcamentoId: string
  requestedPercent: number
  limitPercent: number
  decidedAt?: string
  decidedByName?: string
  decisionReason?: string
}): PedidoGuardado {
  const orcamento = orcamentoPorId(entrada.orcamentoId)
  const detalhe = orcamento ? detalheDoOrcamento(orcamento) : undefined
  const total = detalhe?.totalCents ?? 0
  // O desconto em dinheiro, a partir do total JÁ descontado: o percentual do
  // contrato tem 4 casas escaladas (10000 = 1%), a mesma unidade do documento.
  const bruto = Math.round(total / (1 - entrada.requestedPercent / 1_000_000))
  return {
    id: entrada.id,
    tenantId: entrada.tenantId,
    kind: 'quote-discount',
    status: entrada.status,
    subjectType: 'quote',
    subjectId: entrada.orcamentoId,
    subjectLabel: detalhe?.number ?? null,
    customerName: detalhe?.customerName ?? null,
    requestedByEmployeeId: entrada.requestedByEmployeeId,
    requestedByName: entrada.requestedByName,
    requestedAt: entrada.requestedAt,
    requestedPercent: entrada.requestedPercent,
    limitPercent: entrada.limitPercent,
    discountCents: bruto - total,
    documentTotalCents: total,
    decidedAt: entrada.decidedAt ?? null,
    decidedByEmployeeId: entrada.decidedAt ? EU : null,
    decidedByName: entrada.decidedByName ?? null,
    decisionReason: entrada.decisionReason ?? null,
  }
}

function estadoInicial(): Estado {
  return {
    pedidos: [
      pedidoDoSeed({
        id: 'apr-0001',
        tenantId: TENANT_MATRIZ,
        status: 'pending',
        orcamentoId: 'orc-0001',
        requestedByEmployeeId: 'emp-0002',
        requestedByName: 'BEATRIZ CAMARGO',
        requestedAt: '2026-08-25T13:20:00.000Z',
        requestedPercent: 180000,
        limitPercent: 100000,
      }),
      pedidoDoSeed({
        id: 'apr-0002',
        tenantId: TENANT_MATRIZ,
        status: 'pending',
        orcamentoId: 'orc-0003',
        requestedByEmployeeId: 'emp-0003',
        requestedByName: 'CARLOS EDUARDO PINTO',
        requestedAt: '2026-08-26T18:05:00.000Z',
        requestedPercent: 250000,
        limitPercent: 100000,
      }),
      // O do PRÓPRIO operador: papel de sobra e `canDecide: false` mesmo assim.
      pedidoDoSeed({
        id: 'apr-0003',
        tenantId: TENANT_MATRIZ,
        status: 'pending',
        orcamentoId: 'orc-0005',
        requestedByEmployeeId: EU,
        requestedByName: 'Henrique',
        requestedAt: '2026-08-27T11:40:00.000Z',
        requestedPercent: 150000,
        limitPercent: 100000,
      }),
      pedidoDoSeed({
        id: 'apr-0004',
        tenantId: TENANT_MATRIZ,
        status: 'approved',
        orcamentoId: 'orc-0002',
        requestedByEmployeeId: 'emp-0002',
        requestedByName: 'BEATRIZ CAMARGO',
        requestedAt: '2026-08-20T14:00:00.000Z',
        requestedPercent: 120000,
        limitPercent: 100000,
        decidedAt: '2026-08-20T16:30:00.000Z',
        decidedByName: 'Henrique',
        decisionReason: 'Cliente recorrente, fecha a obra inteira conosco.',
      }),
      pedidoDoSeed({
        id: 'apr-0005',
        tenantId: TENANT_MATRIZ,
        status: 'rejected',
        orcamentoId: 'orc-0004',
        requestedByEmployeeId: 'emp-0003',
        requestedByName: 'CARLOS EDUARDO PINTO',
        requestedAt: '2026-08-21T09:15:00.000Z',
        requestedPercent: 400000,
        limitPercent: 100000,
        decidedAt: '2026-08-21T10:02:00.000Z',
        decidedByName: 'Henrique',
        decisionReason: 'Margem fica negativa. Refaça em 2% e mande de novo.',
      }),
      // Na FILIAL o vínculo é `viewer`: a mesma tela, uma linha e nenhum botão.
      pedidoDoSeed({
        id: 'apr-0006',
        tenantId: TENANT_FILIAL,
        status: 'pending',
        orcamentoId: 'orc-0006',
        requestedByEmployeeId: EU,
        requestedByName: 'Henrique',
        requestedAt: '2026-08-27T15:10:00.000Z',
        requestedPercent: 200000,
        limitPercent: 100000,
      }),
    ],
  }
}

/**
 * Esta sessão DECIDE pedidos nesta empresa?
 *
 * Sai da matriz de papéis, não de uma regra própria: `approval-requests` está em
 * `PAPEL_MINIMO_POR_FAMILIA` como `admin`, pela mesma linha de corte que já pôs
 * o depósito e a condição de pagamento ali — quem libera desconto acima do teto
 * está decidindo o que TODO vendedor pode oferecer.
 */
function podeDecidir(): boolean {
  const papel = papelDaSessao()
  return papel !== null && podeEscrever(papel, 'approval-requests')
}

/** Quem olha pode decidir ESTE pedido? Pendente, com papel, e não sendo o solicitante. */
function decidivel(pedido: PedidoGuardado): boolean {
  return pedido.status === 'pending' && podeDecidir() && pedido.requestedByEmployeeId !== EU
}

function comoDto(pedido: PedidoGuardado): ApprovalRequestDto {
  const { tenantId: _tenantId, ...doContrato } = pedido
  return { ...doContrato, canDecide: decidivel(pedido) }
}

/**
 * O que ESTA sessão enxerga da empresa ativa.
 *
 * Quem decide vê a fila inteira; quem não decide vê só o que ele mesmo abriu —
 * é o recorte que o contrato manda o SERVIDOR fazer, e fazê-lo aqui é o que
 * mantém o mock honesto: recortar na tela mandaria ao navegador exatamente o
 * que se quer esconder.
 */
function visiveis(tenantId: string): PedidoGuardado[] {
  const meus = estado.pedidos.filter((p) => p.tenantId === tenantId)
  return podeDecidir() ? meus : meus.filter((p) => p.requestedByEmployeeId === EU)
}

function paginar(linhas: ApprovalRequestDto[], url: URL) {
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
  const inicio = (page - 1) * pageSize
  return HttpResponse.json({ rows: linhas.slice(inicio, inicio + pageSize), total: linhas.length })
}

/** O texto em que o `q` procura — número do documento, cliente e quem pediu. */
function procuravel(pedido: ApprovalRequestDto): string {
  return [pedido.subjectLabel, pedido.customerName, pedido.requestedByName]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function ordenar(linhas: ApprovalRequestDto[], sortBy: string, desc: boolean) {
  const chave = sortBy as keyof ApprovalRequestDto
  linhas.sort((a, b) => {
    const va = a[chave]
    const vb = b[chave]
    if (typeof va === 'number' && typeof vb === 'number') return desc ? vb - va : va - vb
    return desc
      ? String(vb ?? '').localeCompare(String(va ?? ''))
      : String(va ?? '').localeCompare(String(vb ?? ''))
  })
}

/**
 * As duas recusas da decisão, num lugar só — as duas valem para aprovar E para
 * recusar, e escrevê-las duas vezes daria duas chances de divergirem.
 */
function recusaDaDecisao(pedido: PedidoGuardado | undefined) {
  if (!pedido) return naoEncontrado('Pedido de aprovação não encontrado.')
  if (pedido.requestedByEmployeeId === EU) {
    return problemaJson(
      403,
      'Quem pediu o desconto não decide o próprio pedido.',
      {},
      TIPO.aprovacaoDoSolicitante,
    )
  }
  if (pedido.status !== 'pending') {
    return problemaJson(
      409,
      'Este pedido já foi decidido. Recarregue a fila.',
      {},
      TIPO.aprovacaoJaDecidida,
    )
  }
  if (!podeDecidir()) {
    return problemaJson(
      403,
      'O papel deste vínculo não permite decidir pedidos de aprovação.',
      {},
      TIPO.papelInsuficiente,
    )
  }
  return undefined
}

/** O pedido da empresa ativa, por id. Fora dela, o pedido não existe para quem pergunta. */
function daEmpresa(id: string): PedidoGuardado | undefined {
  return estado.pedidos.find((p) => p.id === id && p.tenantId === store.activeTenantId)
}

export const handlersDeAprovacao = [
  // O `/summary` vem ANTES do `/{id}`: o MSW resolve no primeiro padrão que
  // casa, e `:id` engoliria a palavra `summary` — o badge receberia um 404 com
  // cara de "não há fila".
  http.get('*/api/approval-requests/summary', () => {
    if (!store.logado) return semSessao()
    const vazio: ApprovalSummaryDto = { pendingCount: 0, canDecide: false }
    if (!store.activeTenantId) return HttpResponse.json(vazio)

    const decide = podeDecidir()
    const pendentes = visiveis(store.activeTenantId).filter(
      (p) => p.status === 'pending' && p.requestedByEmployeeId !== EU,
    )
    const resposta: ApprovalSummaryDto = {
      pendingCount: decide ? pendentes.length : 0,
      canDecide: decide,
    }
    return HttpResponse.json(resposta)
  }),

  http.get('*/api/approval-requests', ({ request }) => {
    if (!store.logado) return semSessao()
    // Coleção que É da empresa: sem empresa ativa, vazio é literalmente a verdade.
    if (!store.activeTenantId) return HttpResponse.json({ rows: [], total: 0 })

    const url = new URL(request.url)
    const sortBy = url.searchParams.get('sortBy')
    if (sortBy && !ORDENAVEIS.includes(sortBy)) {
      return problemaJson(400, `sortBy inválido: ${sortBy}.`, {}, TIPO.ordenacaoInvalida)
    }

    let linhas = visiveis(store.activeTenantId).map(comoDto)

    const status = url.searchParams.get('status')
    if (status) linhas = linhas.filter((p) => p.status === status)

    const kind = url.searchParams.get('kind')
    if (kind) linhas = linhas.filter((p) => p.kind === kind)

    const subjectId = url.searchParams.get('subjectId')
    if (subjectId) linhas = linhas.filter((p) => p.subjectId === subjectId)

    const q = url.searchParams.get('q')
    if (q) {
      const alvo = q.toLowerCase()
      linhas = linhas.filter((p) => procuravel(p).includes(alvo))
    }

    if (sortBy) ordenar(linhas, sortBy, url.searchParams.get('sortDesc') === 'true')
    else ordenar(linhas, 'requestedAt', true)

    return paginar(linhas, url)
  }),

  http.get('*/api/approval-requests/:id', ({ params }) => {
    if (!store.logado) return semSessao()
    const pedido = daEmpresa(String(params.id))
    // Fora do que a sessão pode VER é 404, não 403: o recorte da listagem e o do
    // detalhe têm de ser o mesmo, senão o vendedor descobre pelo id o pedido do
    // colega que a fila escondeu dele.
    if (!pedido || !visiveis(store.activeTenantId ?? '').includes(pedido)) {
      return naoEncontrado('Pedido de aprovação não encontrado.')
    }
    return HttpResponse.json(comoDto(pedido))
  }),

  http.post('*/api/approval-requests/:id/approve', async ({ params, request }) => {
    if (!store.logado) return semSessao()
    const pedido = daEmpresa(String(params.id))
    const recusa = recusaDaDecisao(pedido)
    if (recusa) return recusa

    const corpo = (await request.json().catch(() => ({}))) as ApprovalDecisionRequest
    const decidido = decidir(pedido as PedidoGuardado, 'approved', corpo.reason ?? null)
    return HttpResponse.json(comoDto(decidido))
  }),

  http.post('*/api/approval-requests/:id/reject', async ({ params, request }) => {
    if (!store.logado) return semSessao()
    const pedido = daEmpresa(String(params.id))
    const recusa = recusaDaDecisao(pedido)
    if (recusa) return recusa

    const corpo = (await request.json().catch(() => ({}))) as ApprovalRejectionRequest
    // O motivo é `required` no contrato, e a recusa dele é do SERVIDOR: deixada
    // só no formulário, a primeira integração que não passasse pela tela
    // gravaria recusa muda.
    if (!corpo.reason || corpo.reason.trim().length < 3) {
      return camposInvalidos([{ path: 'reason', message: 'Diga por que o desconto não passou.' }])
    }

    const decidido = decidir(pedido as PedidoGuardado, 'rejected', corpo.reason.trim())
    return HttpResponse.json(comoDto(decidido))
  }),
]

/**
 * Carimba a decisão. Muda o pedido e SÓ ele — o efeito sobre o documento é do
 * servidor de verdade (ver o cabeçalho).
 */
function decidir(
  pedido: PedidoGuardado,
  status: 'approved' | 'rejected',
  motivo: string | null,
): PedidoGuardado {
  pedido.status = status
  pedido.decidedAt = new Date().toISOString()
  pedido.decidedByEmployeeId = EU
  pedido.decidedByName = 'Henrique'
  pedido.decisionReason = motivo
  return pedido
}
