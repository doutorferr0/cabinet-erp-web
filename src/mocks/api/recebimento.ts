import type { GoodsReceiptDto, GoodsReceiptItemDto, GoodsReceiptWriteRequest } from '@/api/gerado'
import { colaboradores, idDeColaborador } from '@/mocks/colaboradores'
import { http, HttpResponse } from 'msw'
import {
  type LinhaDeRecebimento,
  type RecebimentoGuardado,
  casaTexto,
  daEmpresa,
  estadoDeCompras,
  faltaChegar,
  fornecedorDoCadastro,
  lerConsulta,
  linhaDeOrdemPara,
  nomeDeParceiro,
  responder,
} from './compras'
import { aplicarSaldo, depositoDoMovimento } from './depositos'
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
import { novoId, store } from './store'

/**
 * O "backend" do RECEBIMENTO DE COMPRA no modo mock — a nota do fornecedor
 * virando entrada no estoque (contrato G3, seis operações).
 *
 * **O motivo que mantinha isto fora do mock venceu.** `whitelist-do-contrato.test.ts`
 * dizia, sobre `ListGoodsReceipts`: *"a grade confronta o que a ordem de compra
 * pediu com o que chegou, e o mock não guarda ordem; mockar a conferência sem a
 * ordem dona daria divergência calculada contra número inventado"*. Era verdade
 * quando foi escrito e deixou de ser: `compras.ts` guarda ordem, com linha,
 * quantidade e fornecedor — e desde a #354 o contrato publica o VÍNCULO por
 * linha (`purchaseOrderId` + `purchaseOrderLine`), que é justamente o que faz a
 * divergência ser medida contra a ordem de verdade e não contra um número
 * digitado. É a mesma passagem que compras e os dez relatórios já fizeram.
 *
 * **Por que isto importa mesmo sem tela:** `cabinetonline.cc` é 100% mock, e
 * caminho sem handler não devolve 404 — cai no fallback da SPA e volta
 * `index.html` com 200, que o cliente lê como `resposta-nao-json`. A Fase C
 * nasce contra um servidor falso que existe, e não contra o index.
 *
 * ## O estado mora em `compras.ts`, e os handlers moram aqui
 *
 * O recebimento é documento da MESMA família (o contrato marca as seis com
 * `tags: compras`) e a grade dele só significa alguma coisa contra a ordem: a
 * divergência é `recebido − pedido`, e `PurchaseOrderItemDto.quantityReceived`,
 * `qtyOnOrder` e a previsão de chegada são derivados dos recebimentos LANÇADOS.
 * Um estado em cada arquivo faria os dois se importarem em círculo; um estado
 * só, com os handlers separados, deixa a dependência numa direção — daqui para
 * `compras.ts`, nunca de volta.
 *
 * ## O que este mock NÃO faz
 *
 * Não guarda `audit_log` (nenhum handler do mock guarda) e não fala em dinheiro:
 * custo de compra e imposto ficam fora do recebimento no contrato inteiro, e
 * inventá-los aqui ensinaria a tela a ler campo que o servidor não manda.
 */

/**
 * A whitelist de `sortBy`, IGUAL à publicada em `ListGoodsReceipts`.
 *
 * `supplierName` fica de fora pelo motivo de sempre — é eco de outra tabela. A
 * ordem padrão é `receivedAt` decrescente: "o que chegou por último" é a
 * pergunta que abre a tela.
 */
export const ORDENAVEIS_RECEBIMENTO = [
  'receivedAt',
  'issuedAt',
  'invoiceNumber',
  'status',
  'postedAt',
]

const PADRAO_DA_LISTA = { campo: 'receivedAt', desc: true }

// ------------------------------------------------------------------ leitura

function varianteDoCadastro(variantId: string) {
  for (const produto of store.produtos) {
    const variante = produto.variants.find((v) => v.id === variantId)
    if (variante) return { produto, variante }
  }
  return undefined
}

/**
 * A DIVERGÊNCIA da linha: recebido menos pedido.
 *
 * `null` no avulso, e isso não é zero: zero diz "bateu certinho", nulo diz que
 * não há com o que comparar. Devolver zero no avulso seria afirmação sobre uma
 * ordem que não existe.
 */
function divergencia(linha: LinhaDeRecebimento): number | null {
  if (linha.quantityOrdered === null) return null
  return linha.quantityReceived - linha.quantityOrdered
}

function divergiu(linha: LinhaDeRecebimento): boolean {
  const delta = divergencia(linha)
  return delta !== null && delta !== 0
}

function linhaDto(linha: LinhaDeRecebimento): GoodsReceiptItemDto {
  const ordem = linha.purchaseOrderId
    ? estadoDeCompras().ordens.find((o) => o.id === linha.purchaseOrderId)
    : undefined
  return {
    lineNumber: linha.lineNumber,
    variantId: linha.variantId,
    description: linha.description,
    purchaseOrderId: linha.purchaseOrderId,
    purchaseOrderNumber: ordem?.number ?? null,
    purchaseOrderLine: linha.purchaseOrderLine,
    quantityOrdered: linha.quantityOrdered,
    quantityReceived: linha.quantityReceived,
    divergence: divergencia(linha),
    divergenceReason: linha.divergenceReason,
  }
}

function nomeDeDeposito(id: string): string {
  return store.depositos.find((d) => d.id === id)?.name ?? id
}

/**
 * Quem respondeu pelo recebimento — a MESMA leitura de pessoa que o resto do
 * mock faz (`idDeColaborador`), e não o cadastro de parceiros.
 *
 * Id que não estiver na semente ecoa como veio, em vez de virar `null`: o mock
 * não é a autoridade sobre a lista de pessoas do servidor, e apagar o campo
 * diria que o recebimento não tem responsável quando ele tem.
 */
function nomeDeColaborador(id: string | null): string | null {
  if (!id) return null
  const pessoa = colaboradores.find((c) => idDeColaborador(c.id) === id)
  return pessoa?.nome ?? id
}

function recebimentoDto(recebimento: RecebimentoGuardado): GoodsReceiptDto {
  return {
    id: recebimento.id,
    status: recebimento.status,
    supplierId: recebimento.supplierId,
    supplierName: nomeDeParceiro(recebimento.supplierId) ?? '',
    carrierId: recebimento.carrierId,
    carrierName: nomeDeParceiro(recebimento.carrierId),
    locationId: recebimento.locationId,
    locationName: nomeDeDeposito(recebimento.locationId),
    invoiceNumber: recebimento.invoiceNumber,
    issuedAt: recebimento.issuedAt,
    receivedAt: recebimento.receivedAt,
    postedAt: recebimento.postedAt,
    employeeId: recebimento.employeeId,
    employeeName: nomeDeColaborador(recebimento.employeeId),
    notes: recebimento.notes,
    items: recebimento.itens.map(linhaDto),
  }
}

// ---------------------------------------------------------------- validação

/**
 * A validação da ESCRITA — a mesma no `POST` e no `PUT`, como em toda a família.
 *
 * O caminho do erro é `items[i]` pelo ÍNDICE DO ARRAY que o cliente mandou, e
 * não pelo `lineNumber`: aqui existe um array de verdade, vindo do corpo, e é
 * nele que a tela põe o cursor. Na transição `check` não há corpo nenhum, e lá o
 * índice é o `lineNumber` — que é o que o `cabinet-erp-api` também faz.
 */
function recebimentoInvalido(corpo: GoodsReceiptWriteRequest, tenantId: string) {
  const fields: { path: string; message: string }[] = []

  const semFornecedor = fornecedorInvalidoNoCabecalho(corpo.supplierId)
  if (semFornecedor) fields.push(semFornecedor)

  if (corpo.carrierId && !store.parceiros.some((p) => p.id === corpo.carrierId)) {
    fields.push({ path: 'carrierId', message: 'Transportadora não encontrada.' })
  }

  const linhasVistas = new Set<number>()
  const vinculosVistos = new Set<string>()

  for (const [i, linha] of (corpo.items ?? []).entries()) {
    const base = `items[${i}]`

    if (linhasVistas.has(linha.lineNumber)) {
      fields.push({ path: `${base}.lineNumber`, message: 'Número de linha repetido.' })
    }
    linhasVistas.add(linha.lineNumber)

    // A variante é OBRIGATÓRIA, ao contrário da linha do orçamento: recebimento
    // move estoque, e estoque é de variante. Item digitado à mão seria uma
    // entrada que o kardex não sabe onde lançar.
    if (!linha.variantId || !varianteDoCadastro(linha.variantId)) {
      fields.push({ path: `${base}.variantId`, message: 'Variante não encontrada.' })
    }
    if (!(linha.quantityReceived >= 0)) {
      fields.push({
        path: `${base}.quantityReceived`,
        message: 'O recebido não pode ser negativo — devolução é documento próprio.',
      })
    }

    const temOrdem = Boolean(linha.purchaseOrderId)
    const temLinha = linha.purchaseOrderLine !== null && linha.purchaseOrderLine !== undefined
    // **Meio vínculo é pior que nenhum:** ele parece ligação e não fecha linha
    // nenhuma. O contrato cobra o par junto, e é aqui que ele é cobrado.
    if (temOrdem !== temLinha) {
      fields.push({
        path: `${base}.purchaseOrderLine`,
        message: 'A ordem e a linha da ordem viajam juntas.',
      })
    } else if (temOrdem && temLinha && linha.purchaseOrderId && linha.purchaseOrderLine) {
      const chave = `${linha.purchaseOrderId}#${linha.purchaseOrderLine}`
      if (vinculosVistos.has(chave)) {
        fields.push({
          path: `${base}.purchaseOrderLine`,
          message:
            'Duas linhas deste recebimento fechariam a mesma linha da ordem — parcela em caminhão separado é recebimento separado.',
        })
      }
      vinculosVistos.add(chave)

      const alvo = linhaDeOrdemPara(tenantId, linha.purchaseOrderId, linha.purchaseOrderLine)
      if (!alvo) {
        fields.push({
          path: `${base}.purchaseOrderId`,
          message: 'Linha de ordem de compra não encontrada.',
        })
      } else if (alvo.ordem.status !== 'sent') {
        // Ordem em rascunho é intenção do comprador: ninguém a mandou, e por
        // isso não há chegada a fechar. Cancelada, idem.
        fields.push({
          path: `${base}.purchaseOrderId`,
          message: 'Só ordem ENVIADA se fecha por recebimento.',
        })
      } else if (alvo.ordem.supplierId !== corpo.supplierId) {
        fields.push({
          path: `${base}.purchaseOrderId`,
          message: 'A ordem é de outro fornecedor — quem entregou é quem está na nota.',
        })
      }
    } else if (
      linha.quantityOrdered !== null &&
      linha.quantityOrdered !== undefined &&
      !(linha.quantityOrdered > 0)
    ) {
      // Sem vínculo, o pedido é declaração do operador — e zero diria "a ordem
      // pedia nada", que não é linha de ordem nenhuma. Quem não tem ordem manda
      // nulo.
      fields.push({
        path: `${base}.quantityOrdered`,
        message: 'O pedido, quando informado, é maior que zero.',
      })
    }
  }

  return fields.length > 0 ? camposInvalidos(fields) : undefined
}

function fornecedorInvalidoNoCabecalho(supplierId: string) {
  if (!supplierId) return { path: 'supplierId', message: 'Informe o fornecedor.' }
  if (!fornecedorDoCadastro(supplierId)) {
    return { path: 'supplierId', message: 'Este parceiro não é fornecedor.' }
  }
  return undefined
}

/**
 * Monta a grade GUARDADA a partir da grade escrita.
 *
 * Dois campos do corpo são ignorados de propósito, e o contrato diz por quê:
 * `description` é copiada do cadastro da variante (aceitá-la deixaria a
 * conferência dizer que recebeu uma peça e o catálogo dizer que ela é outra, com
 * o `variantId` intacto entre as duas), e `quantityOrdered` é lida da ORDEM
 * quando há vínculo — sem isso a divergência mediria o que o operador lembrou,
 * não o que a ordem pede.
 *
 * E o que se lê da ordem é o SALDO A CHEGAR, não o total: pediu 10, vieram 8
 * hoje e 2 amanhã, e a segunda carga confere contra as 2 que faltavam. Contra as
 * 10, toda parcela nasceria divergente e pediria motivo para uma diferença que
 * já tem explicação — o caminhão anterior.
 */
function montarGrade(corpo: GoodsReceiptWriteRequest, tenantId: string): LinhaDeRecebimento[] {
  return (corpo.items ?? []).map((linha) => {
    const cadastro = varianteDoCadastro(linha.variantId)
    const alvo =
      linha.purchaseOrderId && linha.purchaseOrderLine
        ? linhaDeOrdemPara(tenantId, linha.purchaseOrderId, linha.purchaseOrderLine)
        : undefined
    return {
      lineNumber: linha.lineNumber,
      variantId: linha.variantId,
      description: cadastro?.produto.description ?? '',
      purchaseOrderId: linha.purchaseOrderId ?? null,
      purchaseOrderLine: linha.purchaseOrderLine ?? null,
      quantityOrdered: alvo ? faltaChegar(alvo.ordem, alvo.linha) : (linha.quantityOrdered ?? null),
      quantityReceived: linha.quantityReceived,
      divergenceReason: linha.divergenceReason ?? null,
    }
  })
}

function recebimentoDaEmpresa(id: string | readonly string[] | undefined) {
  if (!store.activeTenantId) return undefined
  return daEmpresa(estadoDeCompras().recebimentos, store.activeTenantId).find((r) => r.id === id)
}

// ---------------------------------------------------------------- handlers

export const handlersDeRecebimento = [
  http.get('*/api/goods-receipts', ({ request }) => {
    if (!store.logado) return semSessao()
    const consulta = lerConsulta(new URL(request.url))
    // Sem empresa a LEITURA DE LISTA é vazia, não erro — a empresa vem da
    // sessão, e "sem empresa" descreve o operador recém-criado.
    if (!store.activeTenantId) return HttpResponse.json({ rows: [], total: 0 })

    const status = consulta.url.searchParams.get('status')
    const supplierId = consulta.url.searchParams.get('supplierId')

    const linhas = daEmpresa(estadoDeCompras().recebimentos, store.activeTenantId)
      .map(recebimentoDto)
      .filter((r) => (status ? r.status === status : true))
      .filter((r) => (supplierId ? r.supplierId === supplierId : true))
      .filter((r) => casaTexto(consulta.q, [r.invoiceNumber, r.supplierName, r.notes]))

    return responder(linhas, consulta, ORDENAVEIS_RECEBIMENTO, PADRAO_DA_LISTA)
  }),

  http.get('*/api/goods-receipts/:id', ({ params }) => {
    if (!store.logado) return semSessao()
    // O DETALHE por id é 409 e não lista vazia: é o código que o contrato
    // reserva para "este recurso exige empresa".
    if (!store.activeTenantId) return semEmpresaAtiva()

    const recebimento = recebimentoDaEmpresa(params.id)
    if (!recebimento) return naoEncontrado('Recebimento não encontrado.')
    return HttpResponse.json(recebimentoDto(recebimento))
  }),

  http.post('*/api/goods-receipts', async ({ request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('purchases')
    if (semPermissao) return semPermissao

    const corpo = (await request.json()) as GoodsReceiptWriteRequest
    const invalido = recebimentoInvalido(corpo, store.activeTenantId)
    if (invalido) return invalido

    // `locationId` é opcional na escrita e obrigatório no documento: omitido, o
    // servidor resolve o depósito padrão da empresa. Exigir a escolha na tela
    // toda faria o operador escolher sempre o mesmo — e escolher errado uma vez.
    const alvo = depositoDoMovimento(store.activeTenantId, corpo.locationId)
    if ('erro' in alvo) return alvo.erro

    const recebimento: RecebimentoGuardado = {
      id: novoId('rec'),
      tenantId: store.activeTenantId,
      // NASCE em rascunho: criar já conferido pularia a decisão que o estado do
      // meio existe para representar.
      status: 'draft',
      supplierId: corpo.supplierId,
      carrierId: corpo.carrierId ?? null,
      locationId: alvo.deposito.id,
      invoiceNumber: corpo.invoiceNumber ?? null,
      issuedAt: corpo.issuedAt ?? null,
      // Omitida, o servidor grava AGORA: o caso normal é "chegou agora", e o
      // campo existe para o lançamento retroativo.
      receivedAt: corpo.receivedAt ?? new Date().toISOString(),
      postedAt: null,
      employeeId: corpo.employeeId ?? null,
      notes: corpo.notes ?? null,
      itens: montarGrade(corpo, store.activeTenantId),
    }
    estadoDeCompras().recebimentos.push(recebimento)
    return HttpResponse.json(recebimentoDto(recebimento), { status: 201 })
  }),

  http.put('*/api/goods-receipts/:id', async ({ params, request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('purchases')
    if (semPermissao) return semPermissao

    const recebimento = recebimentoDaEmpresa(params.id)
    if (!recebimento) return naoEncontrado('Recebimento não encontrado.')
    // **409 fora do rascunho.** Conferido é decisão já tomada sobre a grade;
    // lançado já virou movimento no kardex, e reescrevê-lo faria o documento
    // divergir em silêncio do estoque que ele mesmo gerou.
    if (recebimento.status !== 'draft') {
      return conflito('Recebimento fora do rascunho não se reescreve.', TIPO.transicaoInvalida)
    }

    const corpo = (await request.json()) as GoodsReceiptWriteRequest
    const invalido = recebimentoInvalido(corpo, store.activeTenantId)
    if (invalido) return invalido

    const alvo = depositoDoMovimento(store.activeTenantId, corpo.locationId)
    if ('erro' in alvo) return alvo.erro

    // `PUT` INTEGRAL: o que o corpo não trouxer é apagado, grade junto.
    recebimento.supplierId = corpo.supplierId
    recebimento.carrierId = corpo.carrierId ?? null
    recebimento.locationId = alvo.deposito.id
    recebimento.invoiceNumber = corpo.invoiceNumber ?? null
    recebimento.issuedAt = corpo.issuedAt ?? null
    recebimento.receivedAt = corpo.receivedAt ?? recebimento.receivedAt
    recebimento.employeeId = corpo.employeeId ?? null
    recebimento.notes = corpo.notes ?? null
    recebimento.itens = montarGrade(corpo, store.activeTenantId)
    return HttpResponse.json(recebimentoDto(recebimento))
  }),

  /**
   * `draft` → `checked`: a conferência FECHA.
   *
   * É transição e não campo do PUT porque muda o que o documento PERMITE —
   * depois dela a grade para de ser editável e o lançamento passa a ser
   * possível. Um `status: "checked"` aceito no corpo faria essa passagem
   * acontecer no meio de uma digitação distraída.
   */
  http.post('*/api/goods-receipts/:id/check', ({ params }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('purchases')
    if (semPermissao) return semPermissao

    const recebimento = recebimentoDaEmpresa(params.id)
    if (!recebimento) return naoEncontrado('Recebimento não encontrado.')
    if (recebimento.status !== 'draft') {
      return conflito('Só um recebimento em rascunho pode ser conferido.', TIPO.transicaoInvalida)
    }
    // Conferência vazia declarada conferida é a nota dizendo que o caminhão veio
    // vazio — isso se corrige reescrevendo o rascunho, não fechando-o.
    if (recebimento.itens.length === 0) {
      return conflito('Recebimento sem itens não pode ser conferido.', TIPO.transicaoInvalida)
    }

    // **A regra que o banco de propósito não cobra.** Durante a contagem a linha
    // nasce com recebido zero e vai subindo, e nesse intervalo divergir sem
    // motivo é o estado NORMAL. A regra é da transição, e a recusa aponta LINHA
    // a linha para a tela pôr o cursor no lugar certo — um 409 diria só "não dá".
    const fields = recebimento.itens
      .filter((linha) => divergiu(linha) && !linha.divergenceReason?.trim())
      .map((linha) => ({
        path: `items[${linha.lineNumber}].divergenceReason`,
        message: 'Informe o motivo da divergência entre pedido e recebido.',
      }))
    if (fields.length > 0) return camposInvalidos(fields)

    recebimento.status = 'checked'
    return HttpResponse.json(recebimentoDto(recebimento))
  }),

  /**
   * `checked` → `posted`: cada linha COM quantidade vira entrada no kardex.
   *
   * **Permissão de ESTOQUE, não de compras.** Conferir é contar caixa; lançar é
   * mexer no saldo de que alguém responde, e o estado do meio existe justamente
   * porque as duas decisões são de pessoas diferentes. No mock a família que
   * guarda a escrita de estoque é `variants` — a mesma de
   * `POST /api/variants/{id}/stock-movements` —, e é ela que este handler cobra.
   *
   * **Divergência não bloqueia:** chegaram 8 das 10 com motivo declarado, lança
   * 8. Recusar faria a mercadoria que ESTÁ no galpão não existir no sistema, que
   * é o defeito que o kardex existe para não ter.
   */
  http.post('*/api/goods-receipts/:id/post', ({ params }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('variants')
    if (semPermissao) return semPermissao

    const recebimento = recebimentoDaEmpresa(params.id)
    if (!recebimento) return naoEncontrado('Recebimento não encontrado.')
    // Lançar de novo é 409, nunca repetição em silêncio: sem isso um duplo
    // clique dobraria o estoque.
    if (recebimento.status === 'posted') {
      return conflito('Recebimento já foi lançado.', TIPO.transicaoInvalida)
    }
    if (recebimento.status !== 'checked') {
      return conflito('Só um recebimento conferido pode ser lançado.', TIPO.transicaoInvalida)
    }

    const alvo = depositoDoMovimento(store.activeTenantId, recebimento.locationId)
    if ('erro' in alvo) return alvo.erro

    // **Recebido ZERO não gera movimento, e isso não é otimização:** um movimento
    // de delta zero afirma que algo aconteceu com a peça e nada aconteceu. O que
    // aconteceu — "foi pedida e não veio" — já está na linha, com a divergência
    // e o motivo.
    for (const linha of recebimento.itens.filter((l) => l.quantityReceived > 0)) {
      const saldo = aplicarSaldo(
        store.activeTenantId,
        alvo.deposito.id,
        linha.variantId,
        linha.quantityReceived,
      )
      if (saldo === null) {
        // Entrada nunca deixa saldo negativo; o guarda existe porque
        // `aplicarSaldo` é o mesmo dos dois caminhos e devolve o mesmo `null`.
        return problemaJson(409, 'Lançamento deixaria o saldo do depósito negativo.')
      }
      const cadastro = varianteDoCadastro(linha.variantId)
      if (cadastro) {
        cadastro.variante.stockQty = (cadastro.variante.stockQty ?? 0) + linha.quantityReceived
      }
      store.movimentos.push({
        id: novoId('mov'),
        variantId: linha.variantId,
        locationId: alvo.deposito.id,
        delta: linha.quantityReceived,
        balanceAfter: saldo,
        // O motivo carrega a divergência para quem lê o extrato da peça sem
        // abrir o documento.
        reason: divergiu(linha) ? 'Recebimento de compra (divergência)' : 'Recebimento de compra',
        occurredAt: new Date().toISOString(),
        employeeId: recebimento.employeeId,
      })
    }

    recebimento.status = 'posted'
    // Estado e carimbo andam juntos nos dois sentidos — o par incoerente não é
    // representável nem no banco do outro lado.
    recebimento.postedAt = new Date().toISOString()
    return HttpResponse.json(recebimentoDto(recebimento))
  }),
]
