import type {
  QuoteDetailDto,
  QuoteDto,
  QuoteEnvironmentDto,
  QuoteItemDto,
  QuoteWriteRequest,
} from '@/api/gerado'
import { type Orcamento, orcamentos } from '@/mocks/orcamentos'
import { http, HttpResponse } from 'msw'
import { store } from './store'

/**
 * O "backend" do ORÇAMENTO no modo mock (`/api/quotes`).
 *
 * `/api/quotes` está em `contracts/openapi-v1.json` desde 2026-08-11 e **nenhum
 * handler o servia**: a tela continuava lendo o array de `src/mocks/orcamentos`,
 * com id numérico. Enquanto isso durou, o orçamento e o CRM viviam em mundos
 * diferentes — e a issue #89 (conversão oportunidade→orçamento) travou nisso,
 * porque `crm_opportunities.quote_id` referencia um id que só o servidor
 * atribui.
 *
 * Arquivo próprio, e não mais um bloco em `handlers.ts`, pela mesma razão que
 * `crm.ts` nasceu separado: estado próprio, e arquivo novo não disputa linha com
 * quem estiver editando o vizinho.
 *
 * ## O seed continua sendo o da transcrição
 *
 * As 17 linhas literais da §8.1 (`src/mocks/orcamentos.ts`) seguem sendo a
 * origem: o site demo não pode perder conteúdo por causa de uma troca de
 * transporte. O que mudou é quem as serve.
 *
 * ## O que este mock reproduz de propósito
 *
 * - **`number` é do SERVIDOR.** `QuoteWriteRequest` não tem o campo, e a criação
 *   atribui o próximo da sequência. Cliente que escolhe número colide entre
 *   empresas — está escrito no próprio contrato.
 * - **`totalCents` é calculado**, nunca recebido: total que o cliente manda é
 *   total que diverge do item na primeira arredondada.
 * - **`PUT` substitui o documento inteiro**, itens e ambientes junto.
 * - **`status` não muda por `PUT`** — só por `POST …/cancel`.
 */

const PROBLEMA = 'application/problem+json'

/** Cópia local dos utilitários de `handlers.ts` — ver a nota em `crm.ts`. */
function problemaJson(status: number, detail: string) {
  return HttpResponse.json(
    { type: 'about:blank', title: 'Erro', status, detail },
    { status, headers: { 'content-type': PROBLEMA } },
  )
}

const SEM_SESSAO = () => problemaJson(401, 'Não autenticado.')
const SEM_EMPRESA = () => problemaJson(409, 'Nenhuma empresa ativa na sessão.')

/** Whitelist de `sortBy` — a MESMA da descrição do contrato. */
const ORDENAVEIS = ['number', 'issuedAt', 'expiresAt', 'customerName', 'projectName']

/**
 * O orçamento GUARDADO. É o `Orcamento` do seed: o mock guarda o que a
 * transcrição capturou, e a tradução para o vocabulário do contrato acontece na
 * resposta — do mesmo jeito que os `*Name` do CRM são resolvidos na saída.
 */
interface Estado {
  linhas: Orcamento[]
  proximoNumero: number
}

let estado: Estado = estadoInicial()

function estadoInicial(): Estado {
  const linhas = orcamentos.map((o) => ({ ...o, itens: o.itens.map((i) => ({ ...i })) }))
  const maior = linhas.reduce((max, o) => Math.max(max, Number(o.numero) || 0), 0)
  return { linhas, proximoNumero: maior + 1 }
}

/** Volta ao seed entre testes — o par do `resetCrm`. */
export function resetQuotes(): void {
  estado = estadoInicial()
}

/** Desconto de 4 casas implícitas (10000 = 1%) aplicado sobre centavos. */
function comDesconto(centavos: number, percentual: number | null): number {
  if (!percentual) return centavos
  return Math.round(centavos * (1 - percentual / 1_000_000))
}

/**
 * Total do documento, em centavos.
 *
 * Quantidade vem como TEXTO da grade (a transcrição a captura assim, com até 3
 * casas) e é convertida aqui — no servidor de verdade ela é numérica, e o total
 * é dele. Desconto por PRODUTO usa o do item; desconto GERAL usa o do cabeçalho.
 */
function totalDoOrcamento(o: Orcamento): number {
  const bruto = o.itens.reduce((soma, item) => {
    const quantidade = quantidadeDe(item.quantidade)
    const unitario = item.valorUnitarioCentavos ?? 0
    const linha = Math.round(quantidade * unitario)
    return (
      soma + (o.modoDesconto === 'PRODUTO' ? comDesconto(linha, item.descontoPercentual) : linha)
    )
  }, 0)
  return o.modoDesconto === 'GERAL' ? comDesconto(bruto, o.descontoPercentual) : bruto
}

function resumoDto(o: Orcamento): QuoteDto {
  return {
    id: o.id,
    number: o.numero,
    series: o.serie,
    issuedAt: o.dataEmissao,
    expiresAt: o.dataValidade,
    customerId: o.clienteId,
    customerName: o.cliente,
    projectName: o.descricaoObra,
    // Documento CANCELA, não desativa — `active`/`cancelled` é o enum do
    // contrato, espelhando `Ven_Situacao` (A/C) do legado. Data de FECHAMENTO
    // não é cancelamento: um orçamento fechado continua ativo.
    status: o.cancelado ? 'cancelled' : 'active',
    totalCents: totalDoOrcamento(o),
  }
}

function quantidadeDe(texto: string): number {
  // A grade captura quantidade como TEXTO (§8.2, até 3 casas, vírgula decimal);
  // o contrato a declara `number`. A conversão é da borda, e o zero de um campo
  // meio digitado é melhor que `NaN` viajando para o servidor.
  return Number(String(texto).replace(',', '.')) || 0
}

function itemDto(item: Orcamento['itens'][number], indice: number): QuoteItemDto {
  const quantidade = quantidadeDe(item.quantidade)
  const unitario = item.valorUnitarioCentavos ?? 0
  return {
    lineNumber: indice + 1,
    environmentCode: item.ambiente,
    // `variantId` é a ligação com o produto do catálogo, e o seed da transcrição
    // não a tem: a grade fala a língua do FORNECEDOR (§8.2). `null` é o
    // honesto — inventar um uuid casaria com produto que não existe.
    variantId: null,
    description: item.descricaoFornecedor,
    finish: item.acabamento,
    size: item.tamanho,
    quantity: quantidade,
    unit: item.unidade,
    // O contrato exige os dois inteiros: `null` na tela é "não preenchido", e
    // do lado do servidor isso é zero — não ausência de coluna.
    unitPriceCents: item.valorUnitarioCentavos ?? 0,
    discountPercent: item.descontoPercentual ?? 0,
    supplierId: null,
    supplierName: item.fornecedor,
    supplierCode: item.codigoFornecedor,
    supplierDescription: item.descricaoFornecedor,
    productGroup: item.grupoProduto,
    pieceType: item.tipoPeca,
    totalCents: Math.round(quantidade * unitario),
  }
}

function ambientesDto(o: Orcamento): QuoteEnvironmentDto[] {
  // Ambiente não é cadastro à parte no seed: ele existe porque um item o cita.
  const vistos: string[] = []
  for (const item of o.itens) {
    if (item.ambiente && !vistos.includes(item.ambiente)) vistos.push(item.ambiente)
  }
  // `name` é CONGELADO no documento (o contrato diz, e o legado já faz em
  // `VendaAmbiente.VenAmb_Descricao`): renomear no catálogo não reescreve
  // orçamento emitido. No seed o código é o próprio nome.
  return vistos.map((code, i) => ({ code, name: code, order: i + 1 }))
}

function detalheDto(o: Orcamento): QuoteDetailDto {
  return {
    ...resumoDto(o),
    folderNumber: o.numeroPasta,
    closedAt: o.dataFechamento,
    salespersonId: o.consultorId,
    salespersonName: o.consultor,
    professionalId: o.profissionalId,
    professionalName: o.profissionalExterno,
    discountMode: o.modoDesconto === 'GERAL' ? 'general' : 'product',
    discountPercent: o.descontoPercentual,
    environments: ambientesDto(o),
    items: o.itens.map(itemDto),
  }
}

/** Corpo de escrita → a linha guardada. `id` e `numero` vêm de fora. */
function daEscrita(corpo: QuoteWriteRequest, base: Orcamento): Orcamento {
  return {
    ...base,
    serie: corpo.series ?? '',
    numeroPasta: corpo.folderNumber ?? '',
    dataEmissao: corpo.issuedAt ?? null,
    dataValidade: corpo.expiresAt ?? null,
    dataFechamento: corpo.closedAt ?? null,
    // `status` NÃO vem da escrita: cancelar tem verbo próprio.
    cancelado: base.cancelado,
    clienteId: corpo.customerId,
    // O NOME é resolvido pelo servidor. Aqui não há tabela de parceiros que
    // case com o seed da transcrição, então o que já estava guardado se mantém
    // quando o cliente não muda — e some quando muda, que é o sintoma correto
    // de "o servidor ainda não resolveu este id".
    cliente: corpo.customerId === base.clienteId ? base.cliente : '',
    descricaoObra: corpo.projectName ?? '',
    consultorId: corpo.salespersonId ?? null,
    consultor: corpo.salespersonId === base.consultorId ? base.consultor : null,
    profissionalId: corpo.professionalId ?? null,
    profissionalExterno:
      corpo.professionalId === base.profissionalId ? base.profissionalExterno : null,
    modoDesconto: corpo.discountMode === 'general' ? 'GERAL' : 'PRODUTO',
    descontoPercentual: corpo.discountPercent,
    itens: (corpo.items ?? []).map((item, i) => ({
      item: String(i + 1),
      codigoFornecedor: item.supplierCode ?? '',
      descricaoFornecedor: item.description ?? '',
      acabamento: item.finish ?? '',
      tamanho: item.size ?? '',
      quantidade: String(item.quantity ?? ''),
      unidade: item.unit ?? '',
      valorUnitarioCentavos: item.unitPriceCents ?? null,
      descontoPercentual: item.discountPercent ?? null,
      grupoProduto: item.productGroup ?? '',
      tipoPeca: item.pieceType ?? '',
      fornecedor: item.supplierName ?? '',
      ambiente: item.environmentCode ?? '',
    })),
  }
}

export const handlersDeOrcamento = [
  http.get('*/api/quotes', ({ request }) => {
    if (!store.logado) return SEM_SESSAO()
    if (!store.activeTenantId) return HttpResponse.json({ rows: [], total: 0 })

    const url = new URL(request.url)
    const q = url.searchParams.get('q')
    const sortBy = url.searchParams.get('sortBy')
    const sortDesc = url.searchParams.get('sortDesc') === 'true'
    const page = Number(url.searchParams.get('page') ?? '1')
    const pageSize = Number(url.searchParams.get('pageSize') ?? '10')

    if (page < 1 || pageSize < 1 || pageSize > 100) {
      return problemaJson(400, 'Paginação inválida: page é 1-based e pageSize vai até 100.')
    }
    if (sortBy && !ORDENAVEIS.includes(sortBy)) {
      return problemaJson(400, `sortBy inválido: ${sortBy}.`)
    }

    let linhas = estado.linhas.map(resumoDto)
    if (q) {
      const alvo = q.toLowerCase()
      linhas = linhas.filter((o) =>
        [o.number, o.customerName, o.projectName].some((t) => t?.toLowerCase().includes(alvo)),
      )
    }
    if (sortBy) {
      const chave = sortBy as keyof QuoteDto
      linhas.sort((a, b) => {
        const va = String(a[chave] ?? '')
        const vb = String(b[chave] ?? '')
        return sortDesc ? vb.localeCompare(va) : va.localeCompare(vb)
      })
    }

    const total = linhas.length
    const inicio = (page - 1) * pageSize
    return HttpResponse.json({ rows: linhas.slice(inicio, inicio + pageSize), total })
  }),

  http.get('*/api/quotes/:id', ({ params }) => {
    if (!store.logado) return SEM_SESSAO()
    if (!store.activeTenantId) return SEM_EMPRESA()
    const achado = estado.linhas.find((o) => o.id === String(params.id))
    if (!achado) return problemaJson(404, 'Orçamento não encontrado.')
    return HttpResponse.json(detalheDto(achado))
  }),

  http.post('*/api/quotes', async ({ request }) => {
    if (!store.logado) return SEM_SESSAO()
    if (!store.activeTenantId) return SEM_EMPRESA()
    const corpo = (await request.json()) as QuoteWriteRequest
    if (!corpo.customerId) return problemaJson(400, 'Cliente é obrigatório.')

    // O NÚMERO é do servidor, e a sequência é global do grupo: o contrato tira
    // o campo da escrita justamente para o cliente não escolher.
    const numero = String(estado.proximoNumero)
    estado.proximoNumero += 1
    const id = `orc-${numero}`
    const novo = daEscrita(corpo, { ...vazio(), id, numero })
    estado.linhas.unshift(novo)
    return HttpResponse.json(detalheDto(novo), { status: 201 })
  }),

  http.put('*/api/quotes/:id', async ({ params, request }) => {
    if (!store.logado) return SEM_SESSAO()
    if (!store.activeTenantId) return SEM_EMPRESA()
    const indice = estado.linhas.findIndex((o) => o.id === String(params.id))
    if (indice < 0) return problemaJson(404, 'Orçamento não encontrado.')
    const corpo = (await request.json()) as QuoteWriteRequest
    if (!corpo.customerId) return problemaJson(400, 'Cliente é obrigatório.')

    const anterior = estado.linhas[indice] as Orcamento
    estado.linhas[indice] = daEscrita(corpo, anterior)
    return HttpResponse.json(detalheDto(estado.linhas[indice] as Orcamento))
  }),

  http.post('*/api/quotes/:id/cancel', ({ params }) => {
    if (!store.logado) return SEM_SESSAO()
    if (!store.activeTenantId) return SEM_EMPRESA()
    const achado = estado.linhas.find((o) => o.id === String(params.id))
    if (!achado) return problemaJson(404, 'Orçamento não encontrado.')
    // Cancelar é verbo PRÓPRIO, e não um `PUT` com `status` dentro: mudar
    // situação por substituição do documento deixaria o cliente escolher o
    // estado de um fluxo que é do servidor.
    achado.cancelado = true
    return HttpResponse.json(detalheDto(achado))
  }),
]

function vazio(): Orcamento {
  return {
    id: '',
    numero: '',
    serie: '1',
    numeroPasta: '',
    dataEmissao: null,
    dataValidade: null,
    dataFechamento: null,
    clienteId: '',
    cliente: '',
    descricaoObra: '',
    consultorId: null,
    consultor: null,
    profissionalId: null,
    profissionalExterno: null,
    cancelado: false,
    modoDesconto: 'PRODUTO',
    descontoPercentual: 0,
    itens: [],
  }
}
