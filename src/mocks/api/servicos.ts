import type { ServiceDto, ServiceWriteRequest } from '@/api/gerado'
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
import { type ServicoDaEmpresa, novoId, store } from './store'

/**
 * O "backend" dos SERVIÇOS no modo mock (`/api/services`, contrato S2).
 *
 * ## Por que a família existe
 *
 * Instalação, projeto e entrega são o que a Vertz cobra à parte do material, e
 * no legado eles têm tabela própria (`Servicos`, 16 colunas) porque não cabem em
 * produto: serviço não tem variante, não tem saldo, não entra no kardex, e tem
 * duas colunas que produto nenhum tem — o percentual do eletricista e o código
 * do serviço na NFS-e. O legado ainda guardava `1000 = SERVIÇOS` e
 * `1001 = FRETE` como pseudo-produtos em `GrupoProduto`; aqui a gambiarra não se
 * repete.
 *
 * ## O que este mock ENSINA, e que só se vê rodando
 *
 * 1. **O cadastro é POR EMPRESA.** A matriz tem quatro serviços, a filial
 *    nenhum — e sem empresa ativa a LEITURA DE LISTA é `{rows:[],total:0}`, não
 *    erro, enquanto a ESCRITA é 409. É a mesma assimetria do resto do contrato,
 *    e ela existe porque "sem empresa" descreve o operador recém-criado, não um
 *    pedido malformado.
 * 2. **Não há `DELETE`.** Serviço apagado deixaria linha de documento apontando
 *    para cadastro inexistente. `active: false` é o padrão 8, e aqui ele também
 *    é integridade — por isso o seed traz um serviço INATIVO.
 * 3. **`priceLocked` é sobre a PRÓXIMA linha, não sobre as que já existem.**
 *    Alterar preço aqui não reescreve documento nenhum: `QuoteServiceItemDto`
 *    congela `description`, `unitPriceCents` e `electricianPercent` na emissão.
 *
 * ## O que ele NÃO faz
 *
 * Não há `GET /api/services/{id}`, e a razão é a mesma do depósito: o
 * `ServiceDto` é plano, então a LINHA da listagem já é o registro inteiro. Um
 * detalhe seria requisição para buscar o que a tela tem na mão.
 */

/**
 * A whitelist de `sortBy` — conferida contra a DESCRIÇÃO do contrato por
 * `src/data/whitelist-do-contrato.test.ts`, que cobra IGUALDADE.
 *
 * `priceCents` entra porque "do mais caro para o mais barato" é pergunta real
 * num cadastro de preço. `type` e `productGroup` ficam fora: são texto livre no
 * legado, e coluna sem vocabulário normalizado ordena por acaso de digitação.
 */
export const ORDENAVEIS_SERVICO = ['code', 'description', 'priceCents', 'active']

/** O `ServiceDto` do contrato: o serviço do store sem a coluna de RLS. */
function servicoDto(servico: ServicoDaEmpresa): ServiceDto {
  const { tenantId: _tenantId, ...doContrato } = servico
  return doContrato
}

/** Os serviços da empresa ativa. Fora dela, o serviço não existe para quem pergunta. */
function daEmpresa(tenantId: string): ServicoDaEmpresa[] {
  return store.servicos.filter((servico) => servico.tenantId === tenantId)
}

/**
 * O serviço do cadastro, para a linha do documento herdar o percentual.
 *
 * Exportada porque quem precisa dela é o orçamento: `serviceId` sem
 * `electricianPercent` explícito herda daqui, e essa resolução é do SERVIDOR.
 */
export function servicoDoCadastro(
  tenantId: string,
  serviceId: string | null | undefined,
): ServicoDaEmpresa | undefined {
  if (!serviceId) return undefined
  return daEmpresa(tenantId).find((servico) => servico.id === serviceId)
}

/** Validação comum ao `POST` e ao `PUT`. */
function corpoInvalido(corpo: ServiceWriteRequest) {
  const fields = []
  if (!corpo.code) fields.push({ path: 'code', message: 'Informe o código do serviço.' })
  if (!corpo.description) {
    fields.push({ path: 'description', message: 'Informe a descrição do serviço.' })
  }
  // Preço zero é legítimo (o retrabalho em garantia do seed), negativo não é.
  if ((corpo.priceCents ?? 0) < 0) {
    fields.push({ path: 'priceCents', message: 'O preço não pode ser negativo.' })
  }
  if ((corpo.electricianPercent ?? 0) < 0) {
    fields.push({
      path: 'electricianPercent',
      message: 'O percentual do eletricista não pode ser negativo.',
    })
  }
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

/** O corpo INTEGRAL aplicado sobre a linha guardada — `PUT` apaga o que não veio. */
function daEscrita(corpo: ServiceWriteRequest): Omit<ServicoDaEmpresa, 'id' | 'tenantId'> {
  return {
    code: corpo.code as string,
    description: corpo.description as string,
    priceCents: corpo.priceCents ?? 0,
    electricianPercent: corpo.electricianPercent ?? 0,
    type: corpo.type ?? null,
    installationMinutes: corpo.installationMinutes ?? null,
    nfseCode: corpo.nfseCode ?? null,
    productGroup: corpo.productGroup ?? null,
    priceLocked: corpo.priceLocked ?? false,
    delivery: corpo.delivery ?? false,
    active: corpo.active ?? false,
  }
}

export const handlersDeServicos = [
  http.get('*/api/services', ({ request }) => {
    if (!store.logado) return semSessao()
    // Sem empresa ativa a leitura de LISTA é vazia, não erro — o cadastro É da
    // empresa, e vazio é literalmente a verdade para quem ainda não escolheu.
    if (!store.activeTenantId) return HttpResponse.json({ rows: [], total: 0 })

    const url = new URL(request.url)
    const sortBy = url.searchParams.get('sortBy')
    if (sortBy && !ORDENAVEIS_SERVICO.includes(sortBy)) {
      return problemaJson(400, `sortBy inválido: ${sortBy}.`, {}, TIPO.ordenacaoInvalida)
    }

    let linhas = daEmpresa(store.activeTenantId).map(servicoDto)

    const q = url.searchParams.get('q')
    if (q) {
      const alvo = q.toLowerCase()
      linhas = linhas.filter((servico) =>
        [servico.code, servico.description, servico.nfseCode].some((texto) =>
          (texto ?? '').toLowerCase().includes(alvo),
        ),
      )
    }

    if (sortBy) {
      const desc = url.searchParams.get('sortDesc') === 'true'
      const chave = sortBy as keyof ServiceDto
      linhas.sort((a, b) => {
        const va = a[chave]
        const vb = b[chave]
        // `priceCents` é dinheiro: comparar como texto poria 9000 antes de 12000.
        const ordem =
          typeof va === 'number' && typeof vb === 'number'
            ? va - vb
            : String(va ?? '').localeCompare(String(vb ?? ''))
        return desc ? -ordem : ordem
      })
    }

    return paginar(linhas, url)
  }),

  http.post('*/api/services', async ({ request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('services')
    if (semPermissao) return semPermissao

    const corpo = (await request.json()) as ServiceWriteRequest
    const invalido = corpoInvalido(corpo)
    if (invalido) return invalido

    if (daEmpresa(store.activeTenantId).some((s) => s.code === corpo.code)) {
      return conflito('Já existe serviço com este código.', TIPO.codigoJaCadastrado)
    }

    const servico: ServicoDaEmpresa = {
      id: novoId('serv'),
      tenantId: store.activeTenantId,
      ...daEscrita(corpo),
      // Só na CRIAÇÃO o ausente vira ativo: cadastro nasce em uso. No `PUT` o
      // ausente APAGA, e é por isso que `daEscrita` devolve `false` lá.
      active: corpo.active ?? true,
    }
    store.servicos.push(servico)
    return HttpResponse.json(servicoDto(servico), { status: 201 })
  }),

  http.put('*/api/services/:id', async ({ params, request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('services')
    if (semPermissao) return semPermissao

    const servico = daEmpresa(store.activeTenantId).find((s) => s.id === params.id)
    if (!servico) return naoEncontrado('Serviço não encontrado.')

    const corpo = (await request.json()) as ServiceWriteRequest
    const invalido = corpoInvalido(corpo)
    if (invalido) return invalido

    if (daEmpresa(store.activeTenantId).some((s) => s.id !== servico.id && s.code === corpo.code)) {
      return conflito('Já existe serviço com este código.', TIPO.codigoJaCadastrado)
    }

    // `PUT` INTEGRAL: o que o corpo não trouxer é apagado, e não preservado.
    Object.assign(servico, daEscrita(corpo))
    return HttpResponse.json(servicoDto(servico))
  }),
]
