import type {
  CostProfileDto,
  CostProfileWriteRequest,
  PriceIndexDto,
  PriceIndexWriteRequest,
  VariantTablePriceDto,
  VariantTablePricesWriteRequest,
} from '@/api/gerado'
import { http, HttpResponse } from 'msw'
import { verificarEscrita } from './permissao'
import {
  TIPO,
  camposInvalidos,
  conflito,
  naoEncontrado,
  naoImplementado,
  problemaJson,
  semEmpresaAtiva,
  semSessao,
} from './problema'
import { TENANT_MATRIZ, novoId, store } from './store'

/**
 * O módulo PREÇO no modo mock — e ele guarda o CADASTRO e RECUSA a APURAÇÃO.
 *
 * As dez operações (perfil de custo, índice de venda, tabela do fornecedor)
 * estão no contrato desde a #335/G9 e as dez estão em `ROTAS_DO_BACKEND` — com
 * `VITE_API_PROXY` elas atravessam para o servidor real, e nada aqui é
 * consultado. Este arquivo é o outro ambiente: o **modo mock puro**, que é o do
 * site público e o de quem não subiu o backend.
 *
 * Até agora elas não tinham handler nenhum, e a decisão estava escrita em
 * `rotas-do-backend.ts` com o motivo certo: *"o mock teria de reimplementar a
 * cascata inteira para a simulação devolver número, e número de margem
 * inventado com cara de apuração é pior do que tela vazia"*. Aquilo continua
 * valendo — o que mudou é que a issue #379 lhes deu TELA, e o pior caso do
 * ambiente sem handler é conhecido e documentado: a requisição cai no fallback
 * da SPA e volta `index.html` com **200**, que o cliente lê como
 * `resposta-nao-json`. Uma aba que pede preço e recebe HTML não ensina nada a
 * ninguém.
 *
 * ## A linha onde ele para, e por que é exatamente ali
 *
 * | o que | o mock | por quê |
 * |---|---|---|
 * | tabela do fornecedor, índice de venda, perfil de custo | **guarda** | é o número que o operador DIGITOU. Guardá-lo não inventa nada — é a mesma coisa que o mock já faz com o preço da variante. |
 * | `POST /cost-profiles/{id}/simulate` | **501** | é APURAÇÃO: vinte e três parcelas, quatro delas incidindo sobre a venda e não sobre a compra, e a ordem do arredondamento é dado MEDIDO (o custo se arredonda antes da subtração, e é isso que faz o lucro bater em 357 dos 376 índices reais em vez de 179). Reproduzir isso aqui é copiar regra de servidor para dentro do mock. |
 *
 * O 501 não é buraco: é `urn:cabinet:erro:nao-implementado`, o mesmo que o
 * backend responde por caminho que ele ainda não serve, e a tela o reconhece
 * por `ehModuloEmConstrucao` e mostra o aviso de módulo em construção. **O modo
 * mock passa a ENSINAR a recusa em vez de escondê-la**, que é o que a DoD da
 * issue pede quando diz "mock espelha as recusas do servidor".
 *
 * ## As outras recusas que ele espelha
 *
 * - **403 `papel-insuficiente`** nas duas escritas. O contrato exige
 *   `precos:gerenciar`, ação que nenhum template de fábrica concede — só
 *   `Proprietário` e `Administrador` alcançam, por `grants_all`. No mock isso é
 *   a família `prices` da matriz de papéis, com piso `admin`.
 * - **409** no segundo índice do mesmo fornecedor. Um índice por fornecedor por
 *   empresa é regra do contrato, e dois ativos deixariam a precificação
 *   depender de qual linha a consulta encontrasse primeiro — o sintoma seria
 *   preço mudando sozinho entre dois orçamentos.
 * - **400** no perfil de OUTRO fornecedor. Apontar o índice para o perfil de um
 *   terceiro faria a peça ser precificada com o desconto que ninguém negociou
 *   para ela.
 * - **404** na variante que a empresa não tem.
 *
 * ## O ICMS não está aqui, e não é esquecimento
 *
 * `CostProfileDto` não publica `Cus_TributacaoICMS` nem os seis campos que
 * dependem dele — sete caminhos de cálculo, substituição tributária em 317 dos
 * 385 perfis reais, e qual reproduzir é decisão de contador, pendente. O
 * seed não os tem porque o schema não os tem.
 *
 * ## Estado LOCAL, como em `compras.ts`
 *
 * Não entra em `store.ts`: o módulo é novo, ninguém mais o consulta, e um campo
 * a mais no store compartilhado é um conflito a mais para todo agente que
 * estiver na árvore. Parceiro e produto continuam vindo do `store`, que é a
 * fonte deles.
 */

interface TabelaDaEmpresa extends VariantTablePriceDto {
  tenantId: string
  variantId: string
}

interface IndiceDaEmpresa extends PriceIndexDto {
  tenantId: string
}

interface PerfilDaEmpresa extends CostProfileDto {
  tenantId: string
}

interface Estado {
  tabelas: TabelaDaEmpresa[]
  indices: IndiceDaEmpresa[]
  perfis: PerfilDaEmpresa[]
}

/** 1% em quatro casas — a escala de todo percentual deste contrato. */
const UM_PORCENTO = 10_000

function estadoInicial(): Estado {
  return {
    /**
     * A mesma peça comprada de DOIS fornecedores, com preços diferentes — é o
     * caso que justifica a chave ser (variante × fornecedor) e não só a
     * variante, e sem ele a tela nasceria sem saber desenhar a segunda linha.
     *
     * `var-0002` fica de fora de propósito: variante sem tabela de preço é o
     * estado normal de uma peça recém-cadastrada, e a aba precisa mostrar o
     * vazio honesto em vez de nunca o encontrar.
     */
    tabelas: [
      {
        tenantId: TENANT_MATRIZ,
        variantId: 'var-0001',
        supplierId: 'parc-0001',
        supplierName: 'EVOLED ILUMINACAO LTDA',
        supplierCode: 'EV-PEND-30F',
        tablePriceCents: 74_180,
      },
      {
        tenantId: TENANT_MATRIZ,
        variantId: 'var-0001',
        supplierId: 'parc-0006',
        supplierName: 'MISTER LED COMERCIO DE ILUMINACAO LTDA',
        supplierCode: 'ML-3001',
        tablePriceCents: 81_000,
      },
      {
        tenantId: TENANT_MATRIZ,
        variantId: 'var-0003',
        supplierId: 'parc-0001',
        supplierName: 'EVOLED ILUMINACAO LTDA',
        supplierCode: null,
        tablePriceCents: 17_930,
      },
    ],
    /**
     * Os dois casos que o contrato nomeia, e o segundo é o blocker nº 1 do ETL.
     *
     * A EVOLED tem índice **2,5600** — a mediana das 376 linhas do legado — e um
     * perfil de custo ligado. A MISTER LED tem índice **1,0000 e perfil nulo**:
     * `null` em `costProfileId` é caso real e não pendência (fornecedor sem
     * cascata e sem crédito existe às dezenas), e 1,0000 é literalmente vender
     * pelo líquido de compra. São 16 índices assim no legado, 11 deles de
     * fornecedores reais, e migrá-los à letra reproduz **margem zero** — a
     * pergunta comercial que o Harvest-5 levantou e ninguém respondeu ainda.
     * Semear o caso é o que faz a tela ter de mostrá-lo em vez de escondê-lo.
     */
    indices: [
      {
        tenantId: TENANT_MATRIZ,
        id: 'idx-0001',
        supplierId: 'parc-0001',
        supplierName: 'EVOLED ILUMINACAO LTDA',
        costProfileId: 'cst-0001',
        costProfileName: 'EVOLED PADRÃO',
        indexValue: 25_600,
        active: true,
      },
      {
        tenantId: TENANT_MATRIZ,
        id: 'idx-0002',
        supplierId: 'parc-0006',
        supplierName: 'MISTER LED COMERCIO DE ILUMINACAO LTDA',
        costProfileId: null,
        costProfileName: null,
        indexValue: 10_000,
        active: true,
      },
    ],
    /**
     * Um perfil, com a cascata de quatro descontos preenchida — 20% + 10% em
     * cascata é 28%, não 30%, e é justamente o que o operador precisa ver a
     * conta fazer. Os percentuais são os do contrato: inteiro escalado por
     * 10.000.
     */
    perfis: [
      {
        tenantId: TENANT_MATRIZ,
        id: 'cst-0001',
        supplierId: 'parc-0001',
        supplierName: 'EVOLED ILUMINACAO LTDA',
        name: 'EVOLED PADRÃO',
        active: true,
        discount1Percent: 20 * UM_PORCENTO,
        discount2Percent: 10 * UM_PORCENTO,
        discount3Percent: 0,
        discount4Percent: 0,
        ipiPercent: 5 * UM_PORCENTO,
        packagingPercent: 0,
        financialPercent: 2 * UM_PORCENTO,
        freightPercent: 3 * UM_PORCENTO,
        otherPercent: 0,
        simplesPercent: 4 * UM_PORCENTO,
        cardPercent: 0,
        fixedCostPercent: 8 * UM_PORCENTO,
        costDiscountPercent: 0,
        icmsCreditPercent: 0,
        pisCreditPercent: 165 * 100,
        cofinsCreditPercent: 76 * 100,
        freightInPurchase: true,
        createdAt: '2026-01-15T12:00:00.000Z',
        updatedAt: '2026-01-15T12:00:00.000Z',
      },
    ],
  }
}

let estado: Estado = estadoInicial()

/** Volta ao seed entre testes — o par do `resetCompras`/`resetQuotes`. */
export function resetPrecos(): void {
  estado = estadoInicial()
}

// ---------------------------------------------------------------- listagem

/**
 * AS WHITELISTS DE `sortBy`, cópia da descrição do contrato.
 *
 * Exportadas porque `whitelist-do-contrato.test.ts` as confere contra o
 * `openapi-v1.json`: **o site público é 100% mock**, então whitelist menor aqui
 * é coluna que ordena contra o `:3000` e responde 400 na demo — defeito que
 * aparece no clique do cabeçalho e nunca na suíte.
 */
export const ORDENAVEIS_PERFIL_DE_CUSTO = ['name', 'supplierName', 'active', 'createdAt'] as const
export const ORDENAVEIS_INDICE = ['supplierName', 'indexValue', 'active'] as const

/** Nenhuma das duas listagens publica `filters` — o que chegar é 400. */
const conflitoDeFiltro = () =>
  problemaJson(400, 'Este recurso não publica o parâmetro filters.', {}, TIPO.filtroInvalido)

const paginacaoInvalida = (detalhe: string) =>
  problemaJson(400, detalhe, {}, TIPO.paginacaoInvalida)

const ordenacaoInvalida = (sortBy: string) =>
  problemaJson(400, `sortBy inválido: ${sortBy}.`, {}, TIPO.ordenacaoInvalida)

interface Pagina {
  page: number
  pageSize: number
  sortBy: string | null
  sortDesc: boolean
}

function lerConsulta(
  url: URL,
  ordenaveis: readonly string[],
): { recusa: Response } | { pagina: Pagina } {
  if (url.searchParams.has('filters')) {
    return { recusa: conflitoDeFiltro() }
  }

  const page = Number(url.searchParams.get('page') ?? '1')
  const pageSize = Number(url.searchParams.get('pageSize') ?? '10')
  if (!Number.isInteger(page) || !Number.isInteger(pageSize)) {
    return { recusa: paginacaoInvalida('Paginação inválida: page e pageSize são inteiros.') }
  }
  if (page < 1 || pageSize < 1 || pageSize > 100) {
    return {
      recusa: paginacaoInvalida('Paginação inválida: page é 1-based e pageSize vai até 100.'),
    }
  }

  const sortBy = url.searchParams.get('sortBy')
  if (sortBy && !ordenaveis.includes(sortBy)) {
    return { recusa: ordenacaoInvalida(sortBy) }
  }

  return {
    pagina: { page, pageSize, sortBy, sortDesc: url.searchParams.get('sortDesc') === 'true' },
  }
}

/**
 * Ordena e corta a página. `total` é o conjunto FILTRADO, não a página — é o
 * que o rodapé da tabela mostra, e devolver o tamanho da página faria toda
 * listagem dizer "10 de 10".
 */
function paginar<T>(
  linhas: readonly T[],
  pagina: Pagina,
  padrao: string,
): { rows: T[]; total: number } {
  const campo = pagina.sortBy ?? padrao
  const desc = pagina.sortBy ? pagina.sortDesc : false
  const valor = (linha: T) => (linha as Record<string, unknown>)[campo]
  const ordenadas = [...linhas].sort((a, b) => comparar(valor(a), valor(b), desc))
  const inicio = (pagina.page - 1) * pagina.pageSize
  return { rows: ordenadas.slice(inicio, inicio + pagina.pageSize), total: linhas.length }
}

/**
 * Ausente é desconhecido e vai para o FIM nos dois sentidos.
 *
 * `costProfileName` nulo é o caso real do fornecedor sem cascata; tratá-lo como
 * string vazia o levaria para o topo do crescente, na frente dos que têm perfil.
 */
function comparar(a: unknown, b: unknown, desc: boolean): number {
  const aVazio = a === undefined || a === null
  const bVazio = b === undefined || b === null
  if (aVazio && bVazio) return 0
  if (aVazio) return 1
  if (bVazio) return -1
  const ordem =
    typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b))
  return desc ? -ordem : ordem
}

// ---------------------------------------------------------------- derivações

function daEmpresa<T extends { tenantId: string }>(linhas: T[], tenantId: string): T[] {
  return linhas.filter((linha) => linha.tenantId === tenantId)
}

/** A variante existe na empresa ativa? Preço pende de peça, e peça é do catálogo. */
function variantePertence(variantId: string): boolean {
  return store.produtos.some((produto) => produto.variants?.some((v) => v.id === variantId))
}

/** Razão social do fornecedor — `null` quando o parceiro sumiu do cadastro. */
function nomeDeFornecedor(supplierId: string): string | null {
  return store.parceiros.find((p) => p.id === supplierId && p.isSupplier)?.legalName ?? null
}

/**
 * O código da peça NO fornecedor, tirado da grade de fornecedores do produto.
 *
 * É junção, não escrita: o `PUT` de tabelas não recebe `supplierCode` e o
 * servidor o resolve do mesmo lugar — `ProductSupplierDto`. É a língua em que o
 * comprador confere a lista de preços que chegou, porque o código do Cabinet
 * não aparece nela.
 */
function codigoNoFornecedor(variantId: string, supplierId: string): string | null {
  const produto = store.produtos.find((p) => p.variants?.some((v) => v.id === variantId))
  return produto?.suppliers?.find((s) => s.supplierId === supplierId)?.supplierCode ?? null
}

/** A resposta de leitura: sem os campos de RLS, que o servidor USA e não devolve. */
function comoTabelaDto(linha: TabelaDaEmpresa): VariantTablePriceDto {
  return {
    supplierId: linha.supplierId,
    supplierName: nomeDeFornecedor(linha.supplierId) ?? linha.supplierName ?? null,
    supplierCode: codigoNoFornecedor(linha.variantId, linha.supplierId),
    tablePriceCents: linha.tablePriceCents,
  }
}

function comoIndiceDto(linha: IndiceDaEmpresa): PriceIndexDto {
  const { tenantId: _t, ...dto } = linha
  return dto
}

function comoPerfilDto(linha: PerfilDaEmpresa): CostProfileDto {
  const { tenantId: _t, ...dto } = linha
  return dto
}

// ---------------------------------------------------------------- handlers

export const handlersDePrecos = [
  // ------------------------------------------------ tabela do fornecedor
  http.get('*/api/table-prices/:variantId', ({ params }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()

    const variantId = String(params.variantId)
    if (!variantePertence(variantId)) {
      return naoEncontrado('Variante não encontrada.')
    }

    const linhas = daEmpresa(estado.tabelas, store.activeTenantId)
      .filter((linha) => linha.variantId === variantId)
      .map(comoTabelaDto)
    return HttpResponse.json(linhas)
  }),

  /**
   * `PUT` SUBSTITUI a lista inteira — fornecedor que não vier no corpo SAI.
   *
   * Não é escolha deste mock: é o `PUT` de todo este contrato, e reproduzi-lo
   * é o ponto. Um mock que fizesse merge deixaria a tela passar no ambiente
   * mock e apagar preço no servidor real, que é a divergência mais cara que um
   * servidor falso pode produzir.
   */
  http.put('*/api/table-prices/:variantId', async ({ params, request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('prices')
    if (semPermissao) return semPermissao

    const variantId = String(params.variantId)
    if (!variantePertence(variantId)) {
      return naoEncontrado('Variante não encontrada.')
    }

    const corpo = (await request.json()) as VariantTablePricesWriteRequest
    const prices = corpo.prices ?? []

    // O mesmo fornecedor duas vezes é 409 e não "o último vence": duas tabelas
    // para o mesmo par deixariam o preço depender da ordem da lista.
    const vistos = new Set<string>()
    for (const linha of prices) {
      if (vistos.has(linha.supplierId)) {
        return conflito('O mesmo fornecedor aparece duas vezes na tabela.', TIPO.generico)
      }
      vistos.add(linha.supplierId)
    }

    const invalidos = prices
      .filter((linha) => !Number.isInteger(linha.tablePriceCents) || linha.tablePriceCents < 0)
      .map((linha) => ({
        path: `prices.${linha.supplierId}.tablePriceCents`,
        message: 'O preço de tabela precisa ser um valor em centavos, não negativo.',
      }))
    if (invalidos.length > 0) return camposInvalidos(invalidos)

    const naoFornecedor = prices.find((linha) => nomeDeFornecedor(linha.supplierId) === null)
    if (naoFornecedor) {
      return naoEncontrado('Fornecedor não encontrado.')
    }

    const tenantId = store.activeTenantId
    estado.tabelas = estado.tabelas.filter(
      (linha) => !(linha.tenantId === tenantId && linha.variantId === variantId),
    )
    for (const linha of prices) {
      estado.tabelas.push({
        tenantId,
        variantId,
        supplierId: linha.supplierId,
        supplierName: nomeDeFornecedor(linha.supplierId),
        supplierCode: codigoNoFornecedor(variantId, linha.supplierId),
        tablePriceCents: linha.tablePriceCents,
      })
    }

    const salvas = daEmpresa(estado.tabelas, tenantId)
      .filter((linha) => linha.variantId === variantId)
      .map(comoTabelaDto)
    return HttpResponse.json(salvas)
  }),

  // ------------------------------------------------ índice de venda
  http.get('*/api/price-indexes', ({ request }) => {
    if (!store.logado) return semSessao()
    // Sessão sem empresa ativa: LISTAGEM devolve vazio, nunca erro.
    if (!store.activeTenantId) return HttpResponse.json({ rows: [], total: 0 })

    const url = new URL(request.url)
    const consulta = lerConsulta(url, ORDENAVEIS_INDICE)
    if ('recusa' in consulta) return consulta.recusa

    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase()
    const linhas = daEmpresa(estado.indices, store.activeTenantId)
      .map(comoIndiceDto)
      .filter((linha) => !q || (linha.supplierName ?? '').toLowerCase().includes(q))
    return HttpResponse.json(paginar(linhas, consulta.pagina, 'supplierName'))
  }),

  http.post('*/api/price-indexes', async ({ request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('prices')
    if (semPermissao) return semPermissao

    const corpo = (await request.json()) as PriceIndexWriteRequest
    const recusa = validarIndice(corpo, null)
    if (recusa) return recusa

    const linha: IndiceDaEmpresa = {
      tenantId: store.activeTenantId,
      id: novoId('idx'),
      supplierId: corpo.supplierId,
      supplierName: nomeDeFornecedor(corpo.supplierId),
      costProfileId: corpo.costProfileId ?? null,
      costProfileName: nomeDePerfil(corpo.costProfileId ?? null),
      indexValue: corpo.indexValue,
      active: corpo.active ?? true,
    }
    estado.indices.push(linha)
    return HttpResponse.json(comoIndiceDto(linha), { status: 201 })
  }),

  http.put('*/api/price-indexes/:id', async ({ params, request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('prices')
    if (semPermissao) return semPermissao

    const id = String(params.id)
    const atual = daEmpresa(estado.indices, store.activeTenantId).find((linha) => linha.id === id)
    if (!atual) return naoEncontrado('Índice não encontrado.')

    const corpo = (await request.json()) as PriceIndexWriteRequest
    const recusa = validarIndice(corpo, id)
    if (recusa) return recusa

    // `PUT` substitui a linha INTEIRA: omitir `costProfileId` DESLIGA o perfil,
    // não o mantém. É o que o schema diz, e o mock que preservasse o valor
    // anterior ensinaria o oposto.
    atual.supplierId = corpo.supplierId
    atual.supplierName = nomeDeFornecedor(corpo.supplierId)
    atual.costProfileId = corpo.costProfileId ?? null
    atual.costProfileName = nomeDePerfil(corpo.costProfileId ?? null)
    atual.indexValue = corpo.indexValue
    atual.active = corpo.active ?? true
    return HttpResponse.json(comoIndiceDto(atual))
  }),

  // ------------------------------------------------ perfil de custo
  http.get('*/api/cost-profiles', ({ request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return HttpResponse.json({ rows: [], total: 0 })

    const url = new URL(request.url)
    const consulta = lerConsulta(url, ORDENAVEIS_PERFIL_DE_CUSTO)
    if ('recusa' in consulta) return consulta.recusa

    // `supplierId` não cabe em `q` e por isso é parâmetro próprio: `q` casa
    // TEXTO (o `name`), e aqui a chave é identidade.
    const supplierId = url.searchParams.get('supplierId')
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase()

    const linhas = daEmpresa(estado.perfis, store.activeTenantId)
      .filter((linha) => !supplierId || linha.supplierId === supplierId)
      .filter((linha) => !q || linha.name.toLowerCase().includes(q))
      .map(comoPerfilDto)
    return HttpResponse.json(paginar(linhas, consulta.pagina, 'name'))
  }),

  http.get('*/api/cost-profiles/:id', ({ params }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()

    const linha = daEmpresa(estado.perfis, store.activeTenantId).find(
      (perfil) => perfil.id === String(params.id),
    )
    if (!linha) return naoEncontrado('Perfil de custo não encontrado.')
    return HttpResponse.json(comoPerfilDto(linha))
  }),

  http.post('*/api/cost-profiles', async ({ request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('prices')
    if (semPermissao) return semPermissao

    const corpo = (await request.json()) as CostProfileWriteRequest
    if (nomeDeFornecedor(corpo.supplierId) === null) {
      return naoEncontrado('Fornecedor não encontrado.')
    }
    // O mesmo fornecedor pode ter VÁRIOS perfis — "ILUMINAR", "ILUMINAR
    // ESPECIAL" e "ILUMINAR PREÇO 2" são condições comerciais distintas, não
    // duplicatas. O que não pode repetir é o NOME dentro do fornecedor.
    const repetido = daEmpresa(estado.perfis, store.activeTenantId).some(
      (perfil) => perfil.supplierId === corpo.supplierId && perfil.name === corpo.name,
    )
    if (repetido) {
      return conflito('Este fornecedor já tem um perfil com esse nome.', TIPO.codigoJaCadastrado)
    }

    const linha = perfilDoCorpo(store.activeTenantId, novoId('cst'), corpo)
    estado.perfis.push(linha)
    return HttpResponse.json(comoPerfilDto(linha), { status: 201 })
  }),

  http.put('*/api/cost-profiles/:id', async ({ params, request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('prices')
    if (semPermissao) return semPermissao

    const id = String(params.id)
    const indice = estado.perfis.findIndex(
      (perfil) => perfil.id === id && perfil.tenantId === store.activeTenantId,
    )
    if (indice < 0) return naoEncontrado('Perfil de custo não encontrado.')

    const corpo = (await request.json()) as CostProfileWriteRequest
    if (nomeDeFornecedor(corpo.supplierId) === null) {
      return naoEncontrado('Fornecedor não encontrado.')
    }

    const anterior = estado.perfis[indice] as PerfilDaEmpresa
    const atualizado = perfilDoCorpo(anterior.tenantId, id, corpo)
    atualizado.createdAt = anterior.createdAt
    estado.perfis[indice] = atualizado
    return HttpResponse.json(comoPerfilDto(atualizado))
  }),

  /**
   * A SIMULAÇÃO — 501, e é a única resposta honesta que este arquivo pode dar.
   *
   * O `detail` diz o que falta e o que continua funcionando, porque quem o lê é
   * o operador: sem ele o aviso vira porta fechada, e a pessoa abandona a aba
   * inteira em vez de seguir cadastrando o preço, que é o que ela pode fazer.
   */
  http.post('*/api/cost-profiles/:id/simulate', ({ params }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()

    const existe = daEmpresa(estado.perfis, store.activeTenantId).some(
      (perfil) => perfil.id === String(params.id),
    )
    if (!existe) return naoEncontrado('Perfil de custo não encontrado.')

    return naoImplementado(
      'A apuração de custo e margem é feita pelo servidor, e este ambiente não o tem. O preço de tabela e o preço de venda sugerido continuam disponíveis.',
    )
  }),
]

// ---------------------------------------------------------------- validação

/** Nome do perfil, para a linha do índice não exigir uma segunda consulta. */
function nomeDePerfil(costProfileId: string | null): string | null {
  if (!costProfileId) return null
  return estado.perfis.find((perfil) => perfil.id === costProfileId)?.name ?? null
}

/**
 * As três recusas do índice, nesta ordem.
 *
 * `ignorarId` é a linha que está sendo alterada — sem ele, todo `PUT` colidiria
 * consigo mesmo e o cadastro ficaria imutável.
 */
function validarIndice(corpo: PriceIndexWriteRequest, ignorarId: string | null) {
  if (nomeDeFornecedor(corpo.supplierId) === null) {
    return naoEncontrado('Fornecedor não encontrado.')
  }

  if (!Number.isInteger(corpo.indexValue) || corpo.indexValue <= 0) {
    return camposInvalidos([
      { path: 'indexValue', message: 'O índice precisa ser maior que zero.' },
    ])
  }

  const duplicado = daEmpresa(estado.indices, store.activeTenantId as string).some(
    (linha) => linha.supplierId === corpo.supplierId && linha.id !== ignorarId,
  )
  if (duplicado) {
    return conflito('Este fornecedor já tem um índice de venda.', TIPO.generico)
  }

  // O perfil tem de ser do MESMO fornecedor: apontar para o de outro faria a
  // peça ser precificada com o desconto que ninguém negociou para ela.
  if (corpo.costProfileId) {
    const perfil = estado.perfis.find((p) => p.id === corpo.costProfileId)
    if (!perfil) return naoEncontrado('Perfil de custo não encontrado.')
    if (perfil.supplierId !== corpo.supplierId) {
      return camposInvalidos([
        { path: 'costProfileId', message: 'O perfil de custo é de outro fornecedor.' },
      ])
    }
  }

  return undefined
}

/** Corpo → linha, com o zero de `Ausente = zero` aplicado a cada percentual. */
function perfilDoCorpo(
  tenantId: string,
  id: string,
  corpo: CostProfileWriteRequest,
): PerfilDaEmpresa {
  const agora = new Date().toISOString()
  return {
    tenantId,
    id,
    supplierId: corpo.supplierId,
    supplierName: nomeDeFornecedor(corpo.supplierId) ?? corpo.supplierId,
    name: corpo.name,
    active: corpo.active ?? true,
    discount1Percent: corpo.discount1Percent ?? 0,
    discount2Percent: corpo.discount2Percent ?? 0,
    discount3Percent: corpo.discount3Percent ?? 0,
    discount4Percent: corpo.discount4Percent ?? 0,
    ipiPercent: corpo.ipiPercent ?? 0,
    packagingPercent: corpo.packagingPercent ?? 0,
    financialPercent: corpo.financialPercent ?? 0,
    freightPercent: corpo.freightPercent ?? 0,
    otherPercent: corpo.otherPercent ?? 0,
    simplesPercent: corpo.simplesPercent ?? 0,
    cardPercent: corpo.cardPercent ?? 0,
    fixedCostPercent: corpo.fixedCostPercent ?? 0,
    costDiscountPercent: corpo.costDiscountPercent ?? 0,
    icmsCreditPercent: corpo.icmsCreditPercent ?? 0,
    pisCreditPercent: corpo.pisCreditPercent ?? 0,
    cofinsCreditPercent: corpo.cofinsCreditPercent ?? 0,
    freightInPurchase: corpo.freightInPurchase ?? false,
    createdAt: agora,
    updatedAt: agora,
  }
}
