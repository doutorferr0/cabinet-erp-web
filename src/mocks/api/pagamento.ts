import type {
  DocumentInstallmentDto,
  InstallmentPolicyDto,
  InstallmentPolicyWriteRequest,
  PaymentTermDto,
  PaymentTermGroupAdjustmentDto,
  PaymentTermWriteRequest,
} from '@/api/gerado'
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
import { type CondicaoDaEmpresa, novoId, store } from './store'

/**
 * O "backend" do PAGAMENTO no modo mock: `/api/payment-terms` e
 * `/api/installment-policy` (contrato S4).
 *
 * ## O que este mock ENSINA, e que só se vê rodando
 *
 * 1. **A política EXISTE sempre.** Empresa sem linha gravada lê o PADRÃO — os
 *    três números do legado —, e não 404. É a diferença entre "não configurado"
 *    e "configurado com o padrão", e só a segunda é verdade: o parcelamento
 *    acontece com ou sem alguém ter aberto a tela de configuração.
 * 2. **Os limites recusam PLANO, não condição.** `maxInstallments` corta na hora
 *    de cadastrar a condição; `minTotalToInstallCents` e `minInstallmentCents`
 *    só têm o que medir quando há um TOTAL, e o total é do documento. Por isso a
 *    mesma condição de 6× é aceita no cadastro e recusada num orçamento de
 *    R$ 240 — a parcela sairia R$ 40, abaixo do mínimo.
 * 3. **O plano é CARIMBADO na gravação do documento**, não derivado na leitura.
 *    Alterar a condição depois não mexe no orçamento já gravado, e
 *    `pagamento.test.ts` exercita exatamente esse caminho: gravar, alterar a
 *    condição, reler o documento e achar as datas de antes.
 *
 * ## O que ele NÃO faz
 *
 * Não há `DELETE` — condição usada por documento antigo não some, ela desativa
 * (padrão 8).
 *
 * ## O ajuste por GRUPO DE PRODUTO entra, e uma das recusas NÃO é exercitável
 *
 * `groupAdjustments` (`Forma_PagamentoGrupProd` do legado) é servido e gravado.
 * O argumento que o adiava — grupo é texto livre, e casar por texto faria
 * "PENDENTES" e "Pendentes" renderem descontos diferentes — caiu quando
 * `QuoteItemDto.productGroupId` publicou o id.
 *
 * **O que este mock NÃO consegue medir é a recusa por grupo INEXISTENTE:** o
 * kind `GRUPO_PRODUTO` ainda não existe em `catalog-lookups`, dívida já
 * declarada — `compras.test.ts` escreve o par (fornecedor, grupo) direto no
 * store pelo mesmo motivo. Validar contra `store.lookups` aqui recusaria TODO
 * `productGroupId`, o certo inclusive, e a tela aprenderia que o campo não
 * funciona. As outras quatro recusas não dependem de catálogo e estão todas
 * aqui: repetido, negativo, desconto acima de 100% e os dois lados > 0. Quem
 * servir o kind fecha a quinta sem mexer no resto.
 */

/**
 * A whitelist de `sortBy` — conferida contra a DESCRIÇÃO do contrato por
 * `src/data/whitelist-do-contrato.test.ts`, que cobra IGUALDADE.
 *
 * Não se ordena por parcela: ela é linha de DENTRO da condição, e ordenar a
 * coleção por campo do filho é ordenar por qual dos N.
 */
export const ORDENAVEIS_CONDICAO = ['name', 'active', 'installmentCount']

/**
 * A política PADRÃO — os três números da instalação da Vertz, que é o que o
 * legado tem em `Paramentros`: parcela só acima de R$ 100, parcela mínima
 * R$ 50, no máximo 6×.
 *
 * Ela mora aqui como PADRÃO de leitura, não como constante de regra: é
 * exatamente a distinção que a operação existe para fazer. Empresa que grava a
 * dela deixa de ver estes números.
 */
export const POLITICA_PADRAO: InstallmentPolicyDto = {
  minTotalToInstallCents: 10000,
  minInstallmentCents: 5000,
  maxInstallments: 6,
}

/** A `PaymentTermDto` do contrato: a condição do store sem a coluna de RLS. */
function condicaoDto(condicao: CondicaoDaEmpresa): PaymentTermDto {
  const { tenantId: _tenantId, ...doContrato } = condicao
  return {
    ...doContrato,
    installmentCount: condicao.installments.length,
    // Sempre ARRAY na leitura, nunca ausente: "esta condição não ajusta grupo
    // nenhum" é o caso comum, e é `[]`. A tela que tivesse de tratar
    // `undefined` inventaria um terceiro estado — mesmo argumento do 404 que a
    // política não dá.
    groupAdjustments: condicao.groupAdjustments ?? [],
  }
}

/** As condições da empresa ativa. Fora dela, a condição não existe para quem pergunta. */
function daEmpresa(tenantId: string): CondicaoDaEmpresa[] {
  return store.condicoesDePagamento.filter((c) => c.tenantId === tenantId)
}

/**
 * A política da empresa: a gravada, ou o PADRÃO.
 *
 * Nunca devolve `undefined` — é o que faz o `GET` não ter um terceiro estado.
 */
export function politicaDaEmpresa(tenantId: string): InstallmentPolicyDto {
  return store.politicasDeParcelamento[tenantId] ?? POLITICA_PADRAO
}

/** Condição ATIVA da empresa, por id — o que o documento pode escolher. */
export function condicaoAtiva(
  tenantId: string,
  id: string | null | undefined,
): CondicaoDaEmpresa | undefined {
  if (!id) return undefined
  return daEmpresa(tenantId).find((c) => c.id === id && c.active)
}

/**
 * Resolve o plano do DOCUMENTO: a condição aplicada a um total e a uma emissão.
 *
 * Devolve `{ parcelas }` ou `{ erro }` — e o erro é 400, porque quem escolheu
 * uma condição que não cabe na política mandou um corpo que o servidor não pode
 * gravar. Aparar (parcelar menos, arredondar para o mínimo) daria um documento
 * com plano que ninguém pediu.
 *
 * **A sobra do arredondamento vai para a ÚLTIMA parcela.** É onde o legado a
 * põe, e é a única posição em que ela é conferível a olho contra o total
 * impresso: N-1 parcelas iguais e uma diferente.
 */
export function planoDoDocumento(
  tenantId: string,
  condicao: CondicaoDaEmpresa,
  totalCents: number,
  issuedAt: string | null,
): { parcelas: DocumentInstallmentDto[] } | { erro: ReturnType<typeof problemaJson> } {
  const politica = politicaDaEmpresa(tenantId)
  const quantas = condicao.installments.length

  // As três recusas têm `type` PRÓPRIO, e não `campos-invalidos`: são três
  // correções diferentes na tela (oferecer só as condições de parcela única ·
  // recortar por número de parcelas · dizer que esta condição não serve PARA
  // ESTE total), e conflatá-las obrigaria a tela a ler a frase para saber qual.
  if (quantas > politica.maxInstallments) {
    return {
      erro: problemaJson(
        400,
        `A condição tem ${quantas} parcelas e o limite da empresa é ${politica.maxInstallments}.`,
        {},
        TIPO.parcelasAcimaDoTeto,
      ),
    }
  }
  if (quantas > 1 && totalCents < politica.minTotalToInstallCents) {
    return {
      erro: problemaJson(
        400,
        'O total do documento não alcança o mínimo para parcelar.',
        {},
        TIPO.valorNaoParcelavel,
      ),
    }
  }

  const parcelas: DocumentInstallmentDto[] = []
  let distribuido = 0
  condicao.installments.forEach((parcela, i) => {
    const ultima = i === quantas - 1
    const bruto =
      parcela.amountCents ?? Math.round((totalCents * (parcela.percent ?? 0)) / 1_000_000)
    const valor = ultima ? totalCents - distribuido : bruto
    distribuido += valor
    parcelas.push({
      number: parcela.number,
      dueDate: vencimento(issuedAt, parcela.daysAfterIssue),
      amountCents: valor,
    })
  })

  const menor = parcelas.reduce((m, p) => Math.min(m, p.amountCents), Number.POSITIVE_INFINITY)
  if (quantas > 1 && menor < politica.minInstallmentCents) {
    return {
      erro: problemaJson(
        400,
        'Alguma parcela ficaria abaixo do valor mínimo da empresa.',
        {},
        TIPO.parcelaAbaixoDoMinimo,
      ),
    }
  }

  return { parcelas }
}

/**
 * `issuedAt` + dias, em DIA (o contrato publica `format: date`).
 *
 * Sem emissão, a base é a data de hoje — que é o que o servidor faria com um
 * documento gravado sem data: o vencimento não pode ficar sem valor num campo
 * que o contrato declara obrigatório.
 */
function vencimento(issuedAt: string | null, dias: number): string {
  const base = new Date(`${(issuedAt ?? new Date().toISOString()).slice(0, 10)}T12:00:00.000Z`)
  base.setUTCDate(base.getUTCDate() + dias)
  return base.toISOString().slice(0, 10)
}

/**
 * As quatro recusas do corpo, todas 400 e nenhuma aparada em silêncio.
 *
 * A quarta (misturar percentual e valor fixo) é a única que é DÍVIDA e não
 * regra: o legado permite, e a ordem de aplicação nunca foi decidida. Recusar
 * deixa a falta visível; escolher aqui a fixaria no servidor para sempre.
 */
function corpoInvalido(corpo: PaymentTermWriteRequest, maxInstallments: number) {
  const fields: { path: string; message: string }[] = []
  if (!corpo.name) fields.push({ path: 'name', message: 'Informe o nome da condição.' })

  const parcelas = corpo.installments ?? []
  if (parcelas.length === 0) {
    fields.push({ path: 'installments', message: 'A condição precisa de ao menos uma parcela.' })
  }
  // O TETO sai antes dos outros, e com `type` próprio: é a única recusa desta
  // função que não é erro de preenchimento — o corpo está certo, a empresa é que
  // não parcela tanto. `fields[]` a levaria ao controle errado (a grade inteira).
  if (parcelas.length > maxInstallments) {
    return problemaJson(
      400,
      `O limite de parcelas da empresa é ${maxInstallments}.`,
      {},
      TIPO.parcelasAcimaDoTeto,
    )
  }

  const numeros = parcelas.map((p) => p.number)
  const esperada = parcelas.map((_, i) => i + 1)
  if (parcelas.length > 0 && [...numeros].sort((a, b) => a - b).join() !== esperada.join()) {
    fields.push({
      path: 'installments',
      message: 'As parcelas precisam ser numeradas de 1 a N, sem repetir e sem buraco.',
    })
  }

  parcelas.forEach((parcela, i) => {
    const temPercentual = parcela.percent !== null && parcela.percent !== undefined
    const temValor = parcela.amountCents !== null && parcela.amountCents !== undefined
    if (temPercentual === temValor) {
      fields.push({
        path: `installments[${i}]`,
        message: 'Informe percentual OU valor fixo na parcela — exatamente um dos dois.',
      })
    }
    if ((parcela.daysAfterIssue ?? -1) < 0) {
      fields.push({
        path: `installments[${i}].daysAfterIssue`,
        message: 'Dias não pode ser negativo.',
      })
    }
  })

  const percentuais = parcelas.filter((p) => p.percent !== null && p.percent !== undefined)
  const fixas = parcelas.filter((p) => p.amountCents !== null && p.amountCents !== undefined)
  if (percentuais.length > 0 && fixas.length > 0) {
    fields.push({
      path: 'installments',
      message:
        'Condição mista (percentual e valor fixo) ainda não é suportada — a ordem de aplicação não foi decidida.',
    })
  } else if (percentuais.length === parcelas.length && parcelas.length > 0) {
    const soma = percentuais.reduce((t, p) => t + (p.percent ?? 0), 0)
    if (soma !== 1_000_000) {
      fields.push({
        path: 'installments',
        message: 'A soma das parcelas precisa fechar exatamente 100%.',
      })
    }
  }

  ajustesInvalidos(corpo, fields)

  return fields.length > 0 ? camposInvalidos(fields) : undefined
}

/**
 * As recusas de `groupAdjustments`, e nenhuma delas apara em silêncio.
 *
 * A quinta do contrato — `productGroupId` que não é um `GRUPO_PRODUTO` ativo —
 * fica de fora por falta de catálogo, não por decisão; ver o cabeçalho.
 *
 * A dos DOIS lados maiores que zero é a que parece rigor demais e não é: não
 * está decidido se o acréscimo incide antes ou depois do desconto, nem sobre
 * qual base. É a mesma família da condição mista logo acima — e, como lá, dado
 * real do legado não é recusado, porque os três `UPDATE` em massa que preenchem
 * a tabela gravam sempre um dos dois zerado.
 */
function ajustesInvalidos(
  corpo: PaymentTermWriteRequest,
  fields: { path: string; message: string }[],
) {
  const ajustes = corpo.groupAdjustments
  if (ajustes === undefined) return

  const vistos = new Set<string>()
  ajustes.forEach((ajuste, i) => {
    if (vistos.has(ajuste.productGroupId)) {
      fields.push({
        path: `groupAdjustments[${i}].productGroupId`,
        message: 'Cada grupo de produto aparece uma vez só na condição.',
      })
    }
    vistos.add(ajuste.productGroupId)

    if (ajuste.discountPercent < 0) {
      fields.push({
        path: `groupAdjustments[${i}].discountPercent`,
        message: 'Desconto não pode ser negativo — o acréscimo tem coluna própria.',
      })
    }
    if (ajuste.surchargePercent < 0) {
      fields.push({
        path: `groupAdjustments[${i}].surchargePercent`,
        message: 'Acréscimo não pode ser negativo — o desconto tem coluna própria.',
      })
    }
    // Teto só no DESCONTO: acima de 100% ele faria a linha do grupo valer
    // negativo. O acréscimo não tem teto de propósito — dobrar o preço de um
    // grupo é estranho e é legítimo, e um teto inventado recusaria dado real na
    // importação.
    if (ajuste.discountPercent > 1_000_000) {
      fields.push({
        path: `groupAdjustments[${i}].discountPercent`,
        message: 'Desconto não passa de 100%.',
      })
    }
    if (ajuste.discountPercent > 0 && ajuste.surchargePercent > 0) {
      fields.push({
        path: `groupAdjustments[${i}]`,
        message:
          'Desconto e acréscimo no mesmo grupo ainda não é suportado — a ordem de aplicação não foi decidida.',
      })
    }
  })
}

/** O corpo de escrita → as parcelas como o store as guarda. */
function parcelasDaEscrita(corpo: PaymentTermWriteRequest): CondicaoDaEmpresa['installments'] {
  return (corpo.installments ?? [])
    .map((p) => ({
      number: p.number,
      daysAfterIssue: p.daysAfterIssue,
      percent: p.percent ?? null,
      amountCents: p.amountCents ?? null,
    }))
    .sort((a, b) => a.number - b.number)
}

/**
 * O corpo de escrita → os ajustes como o store os guarda.
 *
 * **`undefined` conserva o que está gravado; `[]` apaga.** É a única assimetria
 * do corpo, e ela existe porque este campo nasceu DEPOIS das telas que já gravam
 * condição: sem a distinção, a primeira tela antiga a salvar um nome apagaria em
 * silêncio os ajustes configurados na tela nova, com 200.
 */
function ajustesDaEscrita(
  corpo: PaymentTermWriteRequest,
  atuais: PaymentTermGroupAdjustmentDto[],
): PaymentTermGroupAdjustmentDto[] {
  if (corpo.groupAdjustments === undefined) return atuais
  return corpo.groupAdjustments
    .map((a) => ({
      productGroupId: a.productGroupId,
      // O nome é ECOADO pelo servidor, e aqui ele não tem de onde vir enquanto o
      // kind não existir. String vazia seria mentira de dado; o id é o que a
      // tela tem, e é por ele que ela casa.
      productGroupName: nomeDoGrupo(a.productGroupId),
      discountPercent: a.discountPercent,
      surchargePercent: a.surchargePercent,
    }))
    .sort((a, b) => a.productGroupName.localeCompare(b.productGroupName))
}

/**
 * O nome do grupo, ecoado. Cai no próprio id quando o catálogo não tem a linha —
 * que hoje é SEMPRE, porque o kind `GRUPO_PRODUTO` ainda não existe. Devolver o
 * id é o que `nomeDeEmpresa` do store já faz no mesmo aperto: a tela mostra algo
 * estável e ninguém confunde com nome de verdade.
 */
function nomeDoGrupo(id: string): string {
  return store.lookups.find((l) => l.id === id && l.kind === 'GRUPO_PRODUTO')?.name ?? id
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

export const handlersDePagamento = [
  http.get('*/api/payment-terms', ({ request }) => {
    if (!store.logado) return semSessao()
    // Sem empresa ativa a LEITURA DE LISTA é vazia, não erro — a coleção é da
    // empresa, e vazio é literalmente a verdade para quem ainda não tem uma.
    if (!store.activeTenantId) return HttpResponse.json({ rows: [], total: 0 })

    const url = new URL(request.url)
    const sortBy = url.searchParams.get('sortBy')
    if (sortBy && !ORDENAVEIS_CONDICAO.includes(sortBy)) {
      return problemaJson(400, `sortBy inválido: ${sortBy}.`, {}, TIPO.ordenacaoInvalida)
    }

    let linhas = daEmpresa(store.activeTenantId).map(condicaoDto)

    const q = url.searchParams.get('q')
    if (q) {
      const alvo = q.toLowerCase()
      linhas = linhas.filter((c) => c.name.toLowerCase().includes(alvo))
    }

    if (sortBy) {
      const desc = url.searchParams.get('sortDesc') === 'true'
      const chave = sortBy as keyof PaymentTermDto
      linhas.sort((a, b) => {
        const va = a[chave]
        const vb = b[chave]
        if (typeof va === 'number' && typeof vb === 'number') return desc ? vb - va : va - vb
        return desc
          ? String(vb ?? '').localeCompare(String(va ?? ''))
          : String(va ?? '').localeCompare(String(vb ?? ''))
      })
    }

    return paginar(linhas, url)
  }),

  http.post('*/api/payment-terms', async ({ request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('payment-terms')
    if (semPermissao) return semPermissao

    const corpo = (await request.json()) as PaymentTermWriteRequest
    const invalido = corpoInvalido(corpo, politicaDaEmpresa(store.activeTenantId).maxInstallments)
    if (invalido) return invalido

    if (daEmpresa(store.activeTenantId).some((c) => c.name === corpo.name)) {
      return conflito('Já existe condição de pagamento com este nome.')
    }

    const condicao: CondicaoDaEmpresa = {
      id: novoId('cond'),
      tenantId: store.activeTenantId,
      name: corpo.name as string,
      active: corpo.active ?? true,
      installments: parcelasDaEscrita(corpo),
      groupAdjustments: ajustesDaEscrita(corpo, []),
    }
    store.condicoesDePagamento.push(condicao)
    return HttpResponse.json(condicaoDto(condicao), { status: 201 })
  }),

  http.put('*/api/payment-terms/:id', async ({ params, request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('payment-terms')
    if (semPermissao) return semPermissao

    const condicao = daEmpresa(store.activeTenantId).find((c) => c.id === params.id)
    if (!condicao) return naoEncontrado('Condição de pagamento não encontrada.')

    const corpo = (await request.json()) as PaymentTermWriteRequest
    const invalido = corpoInvalido(corpo, politicaDaEmpresa(store.activeTenantId).maxInstallments)
    if (invalido) return invalido

    if (
      daEmpresa(store.activeTenantId).some((c) => c.name === corpo.name && c.id !== condicao.id)
    ) {
      return conflito('Já existe condição de pagamento com este nome.')
    }

    // Corpo INTEGRAL: as parcelas que vieram passam a ser as parcelas. O
    // documento já gravado não sente — ele carimbou o plano dele.
    condicao.name = corpo.name as string
    condicao.active = corpo.active ?? true
    condicao.installments = parcelasDaEscrita(corpo)
    condicao.groupAdjustments = ajustesDaEscrita(corpo, condicao.groupAdjustments ?? [])
    return HttpResponse.json(condicaoDto(condicao))
  }),

  http.get('*/api/installment-policy', () => {
    if (!store.logado) return semSessao()
    // Aqui NÃO é lista: sem empresa ativa não há política de quem, e o contrato
    // reserva 409 para "este recurso exige empresa".
    if (!store.activeTenantId) return semEmpresaAtiva()
    return HttpResponse.json(politicaDaEmpresa(store.activeTenantId))
  }),

  http.put('*/api/installment-policy', async ({ request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('installment-policy')
    if (semPermissao) return semPermissao

    const corpo = (await request.json()) as InstallmentPolicyWriteRequest
    const fields: { path: string; message: string }[] = []
    if (!(corpo.maxInstallments >= 1)) {
      fields.push({ path: 'maxInstallments', message: 'O teto de parcelas é no mínimo 1.' })
    }
    if (!(corpo.minInstallmentCents >= 0)) {
      fields.push({ path: 'minInstallmentCents', message: 'Valor mínimo não pode ser negativo.' })
    }
    if (!(corpo.minTotalToInstallCents >= 0)) {
      fields.push({
        path: 'minTotalToInstallCents',
        message: 'Total mínimo não pode ser negativo.',
      })
    }
    if (fields.length > 0) return camposInvalidos(fields)

    const politica: InstallmentPolicyDto = {
      minTotalToInstallCents: corpo.minTotalToInstallCents,
      minInstallmentCents: corpo.minInstallmentCents,
      maxInstallments: corpo.maxInstallments,
    }
    store.politicasDeParcelamento[store.activeTenantId] = politica
    return HttpResponse.json(politica)
  }),
]
