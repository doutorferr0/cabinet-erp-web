import type { StockLocationDto, StockLocationWriteRequest } from '@/api/gerado'
import { http, HttpResponse } from 'msw'
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
import { type DepositoDaEmpresa, novoId, store } from './store'

/**
 * O "backend" dos DEPÓSITOS no modo mock (`/api/stock-locations`, contrato #291).
 *
 * ## Por que a dimensão existe
 *
 * O saldo era por variante × empresa. O legado tem `EstTp_Codigo` na chave de
 * `Estoque_produto`, com quatro locais: carregar sem a dimensão soma os quatro
 * num número só, e essa perda não se desfaz. `stock_balances` entra como cache
 * derivado do kardex por (depósito, variante), e `balanceAfter` passa a ser o
 * saldo do DEPÓSITO — decisão 2 do user em 2026-08-22 (api#79).
 *
 * ## O que este mock ENSINA, e que só se vê rodando
 *
 * 1. **O depósito padrão nasce SOB DEMANDA.** Movimentar numa empresa sem
 *    depósito nenhum cria o `PRINCIPAL` e pendura o movimento nele. É
 *    comportamento do SERVIDOR, não operação do contrato — e a filial do seed
 *    começa vazia justamente para isso ser observável no navegador.
 * 2. **A árvore vem PLANA.** A resposta traz `parentId` e nada de `parentName`:
 *    quem pediu o conjunto já tem o pai na mão. Devolver o nome aqui treinaria a
 *    tela a esperar do servidor o que ela mesma resolve.
 * 3. **Depósito inativo recusa movimento** (409), e o padrão não se desativa
 *    (409) — um padrão inativo é estado que não se sustenta, porque o servidor
 *    voltaria a apontar para ele no movimento seguinte.
 *
 * ## O que ele NÃO faz
 *
 * Não há `DELETE` — nem aqui nem em lugar nenhum do contrato. E não há troca de
 * `isDefault`: mover o padrão exige apagar o anterior na MESMA transação para
 * não haver dois, e essa operação não está publicada. Escrevê-la aqui seria o
 * mock inventando caminho que o servidor não vai ter.
 */

/**
 * A whitelist de `sortBy` — conferida contra a DESCRIÇÃO do contrato por
 * `src/data/whitelist-do-contrato.test.ts`, que cobra IGUALDADE.
 *
 * `parentId` fica fora pelo motivo que tirou `customerId` do `sortBy` da obra:
 * ordem de uuid não põe nada em ordem para quem lê a tela. `isDefault` também —
 * há UM padrão por empresa, e ordenar por coluna que separa 1 linha de todas as
 * outras é agrupar, não ordenar.
 */
export const ORDENAVEIS_DEPOSITO = ['code', 'name', 'active']

/** A de saldo: lista curta, e a única ordem que responde pergunta é "onde tem mais". */
export const ORDENAVEIS_SALDO = ['qty']

/** O `StockLocationDto` do contrato: o depósito do store sem a coluna de RLS. */
function locationDto(deposito: DepositoDaEmpresa): StockLocationDto {
  const { tenantId: _tenantId, ...doContrato } = deposito
  return doContrato
}

/** Os depósitos da empresa ativa. Fora dela, o depósito não existe para quem pergunta. */
function daEmpresa(tenantId: string): DepositoDaEmpresa[] {
  return store.depositos.filter((deposito) => deposito.tenantId === tenantId)
}

/**
 * O padrão da empresa, CRIANDO-O se ela ainda não tem nenhum.
 *
 * Mesmo precedente da linha de `product_tenant`, que já nasce no primeiro
 * movimento de variante nunca precificada: o kardex não pode depender de alguém
 * ter lembrado de cadastrar depósito. O nome vem do legado (`EstoqueTipo`, cujo
 * primeiro local é `PRINCIPAL`).
 */
export function depositoPadrao(tenantId: string): DepositoDaEmpresa {
  const existente = daEmpresa(tenantId).find((deposito) => deposito.isDefault)
  if (existente) return existente
  const criado: DepositoDaEmpresa = {
    id: novoId('dep'),
    tenantId,
    parentId: null,
    code: 'PRINCIPAL',
    name: 'DEPÓSITO PRINCIPAL',
    isDefault: true,
    active: true,
  }
  store.depositos.push(criado)
  return criado
}

/**
 * O depósito de um movimento: o pedido, ou o padrão criado sob demanda.
 *
 * Devolve a RESPOSTA de erro quando não dá — 404 para depósito que a empresa não
 * tem (do ponto de vista dela, não está lá), 409 para depósito inativo.
 */
export function depositoDoMovimento(
  tenantId: string,
  locationId: string | null | undefined,
): { deposito: DepositoDaEmpresa } | { erro: ReturnType<typeof problemaJson> } {
  if (!locationId) return { deposito: depositoPadrao(tenantId) }
  const deposito = daEmpresa(tenantId).find((d) => d.id === locationId)
  if (!deposito) return { erro: naoEncontrado('Depósito não encontrado.') }
  if (!deposito.active) {
    return { erro: conflito('Depósito inativo não recebe movimento.') }
  }
  return { deposito }
}

/**
 * Aplica o delta no saldo do depósito e devolve o saldo NOVO — ou `null` quando
 * o movimento deixaria esse saldo negativo.
 *
 * A conta que recusa é a do LOCAL, não mais a do produto: é o que `balanceAfter`
 * passou a significar, e é contra esta linha que ele reconcilia.
 */
export function aplicarSaldo(
  tenantId: string,
  locationId: string,
  variantId: string,
  delta: number,
): number | null {
  const saldo = store.saldos.find(
    (s) => s.tenantId === tenantId && s.locationId === locationId && s.variantId === variantId,
  )
  const novo = (saldo?.qty ?? 0) + delta
  if (novo < 0) return null
  if (saldo) {
    saldo.qty = novo
    saldo.updatedAt = new Date().toISOString()
  } else {
    store.saldos.push({
      tenantId,
      locationId,
      variantId,
      qty: novo,
      updatedAt: new Date().toISOString(),
    })
  }
  return novo
}

/** `true` quando `candidato` é o próprio nó ou desce dele — o laço da árvore. */
function fecharia(tenantId: string, noId: string, candidato: string | null): boolean {
  let atual = candidato
  const vistos = new Set<string>()
  while (atual) {
    if (atual === noId) return true
    if (vistos.has(atual)) return true
    vistos.add(atual)
    atual = daEmpresa(tenantId).find((d) => d.id === atual)?.parentId ?? null
  }
  return false
}

/** Validação comum ao `POST` e ao `PUT`. */
function corpoInvalido(corpo: StockLocationWriteRequest) {
  const fields = []
  if (!corpo.code) fields.push({ path: 'code', message: 'Informe o código do depósito.' })
  if (!corpo.name) fields.push({ path: 'name', message: 'Informe o nome do depósito.' })
  return fields.length > 0 ? camposInvalidos(fields) : undefined
}

function paginar<T>(linhas: T[], url: URL) {
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

export const handlersDeDepositos = [
  http.get('*/api/stock-locations', ({ request }) => {
    if (!store.logado) return semSessao()
    // Sem empresa ativa o domínio responde VAZIO, não erro — e para uma coleção
    // que É da empresa, vazio é literalmente a verdade.
    if (!store.activeTenantId) return HttpResponse.json({ rows: [], total: 0 })

    const url = new URL(request.url)
    const sortBy = url.searchParams.get('sortBy')
    if (sortBy && !ORDENAVEIS_DEPOSITO.includes(sortBy)) {
      return problemaJson(400, `sortBy inválido: ${sortBy}.`, {}, TIPO.ordenacaoInvalida)
    }

    let linhas = daEmpresa(store.activeTenantId).map(locationDto)

    const q = url.searchParams.get('q')
    if (q) {
      const alvo = q.toLowerCase()
      linhas = linhas.filter((deposito) =>
        [deposito.code, deposito.name].some((texto) => texto.toLowerCase().includes(alvo)),
      )
    }

    if (sortBy) {
      const desc = url.searchParams.get('sortDesc') === 'true'
      const chave = sortBy as keyof StockLocationDto
      linhas.sort((a, b) => {
        const va = String(a[chave] ?? '')
        const vb = String(b[chave] ?? '')
        return desc ? vb.localeCompare(va) : va.localeCompare(vb)
      })
    }

    return paginar(linhas, url)
  }),

  http.post('*/api/stock-locations', async ({ request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('stock-locations')
    if (semPermissao) return semPermissao

    const corpo = (await request.json()) as StockLocationWriteRequest
    const invalido = corpoInvalido(corpo)
    if (invalido) return invalido

    const daMinha = daEmpresa(store.activeTenantId)
    if (corpo.parentId && !daMinha.some((d) => d.id === corpo.parentId)) {
      return naoEncontrado('Depósito pai não encontrado.')
    }
    if (daMinha.some((d) => d.code === corpo.code)) {
      return conflito('Já existe depósito com este código.', TIPO.codigoJaCadastrado)
    }
    // Ciclo não é caso do POST: nó que acaba de nascer não tem descendente para
    // se pendurar. A checagem mora no PUT, onde ela pode disparar de verdade.

    const deposito: DepositoDaEmpresa = {
      id: novoId('dep'),
      tenantId: store.activeTenantId,
      parentId: corpo.parentId ?? null,
      code: corpo.code as string,
      name: corpo.name as string,
      // Nasce do SERVIDOR, nunca do corpo: o padrão é o da criação sob demanda,
      // e cadastro comum não disputa esse posto.
      isDefault: false,
      active: corpo.active ?? true,
    }
    store.depositos.push(deposito)
    return HttpResponse.json(locationDto(deposito), { status: 201 })
  }),

  http.put('*/api/stock-locations/:id', async ({ params, request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('stock-locations')
    if (semPermissao) return semPermissao

    const deposito = daEmpresa(store.activeTenantId).find((d) => d.id === params.id)
    if (!deposito) return naoEncontrado('Depósito não encontrado.')

    const corpo = (await request.json()) as StockLocationWriteRequest
    const invalido = corpoInvalido(corpo)
    if (invalido) return invalido

    const daMinha = daEmpresa(store.activeTenantId)
    if (corpo.parentId && !daMinha.some((d) => d.id === corpo.parentId)) {
      return naoEncontrado('Depósito pai não encontrado.')
    }
    if (daMinha.some((d) => d.id !== deposito.id && d.code === corpo.code)) {
      return conflito('Já existe depósito com este código.', TIPO.codigoJaCadastrado)
    }
    if (fecharia(store.activeTenantId, deposito.id, corpo.parentId ?? null)) {
      return conflito('O depósito não pode descer de si mesmo.', TIPO.hierarquiaEmLaco)
    }
    // O padrão não se desativa: o servidor voltaria a apontar para ele no
    // movimento seguinte, e padrão inativo é estado que não se sustenta.
    if (deposito.isDefault && corpo.active === false) {
      return conflito('O depósito padrão da empresa não pode ser desativado.')
    }

    // `PUT` INTEGRAL: o que o corpo não trouxer é apagado, e não preservado.
    deposito.parentId = corpo.parentId ?? null
    deposito.code = corpo.code as string
    deposito.name = corpo.name as string
    deposito.active = corpo.active ?? false
    return HttpResponse.json(locationDto(deposito))
  }),

  http.get('*/api/variants/:variantId/stock-balances', ({ params, request }) => {
    if (!store.logado) return semSessao()
    const variante = store.produtos
      .flatMap((produto) => produto.variants)
      .find((v) => v.id === params.variantId)
    if (!variante) return naoEncontrado('Variante não encontrada.')
    if (!store.activeTenantId) return HttpResponse.json({ rows: [], total: 0 })

    const url = new URL(request.url)
    const sortBy = url.searchParams.get('sortBy')
    if (sortBy && !ORDENAVEIS_SALDO.includes(sortBy)) {
      return problemaJson(400, `sortBy inválido: ${sortBy}.`, {}, TIPO.ordenacaoInvalida)
    }

    const linhas = store.saldos
      .filter((s) => s.tenantId === store.activeTenantId && s.variantId === params.variantId)
      .map(({ tenantId: _tenantId, ...doContrato }) => doContrato)

    if (sortBy) {
      const desc = url.searchParams.get('sortDesc') === 'true'
      linhas.sort((a, b) => (desc ? b.qty - a.qty : a.qty - b.qty))
    }

    return paginar(linhas, url)
  }),
]
