import type { PartnerContactDto, PartnerContactWriteRequest } from '@/api/gerado'
import { http, HttpResponse } from 'msw'
import {
  TIPO,
  camposInvalidos,
  naoEncontrado,
  problemaJson,
  semEmpresaAtiva,
  semSessao,
} from './problema'
import { novoId, store } from './store'

/**
 * O "backend" dos CONTATOS do parceiro no modo mock (contrato #255).
 *
 * ## O contato é dado de ORGANIZAÇÃO, e o acesso passa pelo VÍNCULO
 *
 * As duas metades convivem e é fácil trocar uma pela outra. A tabela `Contatos`
 * do legado não tem `Emp_codigo`: quem atende no fornecedor é a mesma pessoa
 * para as duas empresas do grupo, e duplicá-la por empresa criaria dois
 * registros que divergem no dia em que o telefone mudar. Por isso o contato
 * pende do CADASTRO — aqui, do `ParceiroDaOrg`, e não do vínculo.
 *
 * Mas ler o cadastro continua exigindo vínculo com a empresa ativa: parceiro
 * que a empresa não atende responde **404**, exatamente como
 * `GET /api/partners/{id}` já responde. Um é sobre onde o dado MORA, o outro é
 * sobre quem pode PERGUNTAR — e o mock precisa ensinar os dois, porque a tela
 * que abrir a grade de contatos vai bater nos dois.
 *
 * ## Por que sub-recurso, e não `contacts[]` no `PartnerDto`
 *
 * `PUT /api/partners/{id}` é INTEGRAL: uma coleção dentro do corpo obrigaria
 * toda tela a devolver as N linhas que não mostra, e a regra "ausente ≠ nulo"
 * resolve escalar, não coleção — a primeira leitura velha venceria e apagaria o
 * contato que outra tela acabou de incluir. É a mesma forma das variantes do
 * produto, e a razão está escrita na descrição de `PartnerContactDto`.
 */

const ORDENAVEIS = ['name', 'role', 'active']

/** O contato COMO O STORE o guarda: o DTO mais de quem ele é. */
export interface ContatoDoParceiro extends PartnerContactDto {
  partnerId: string
}

interface EstadoDosContatos {
  contatos: ContatoDoParceiro[]
}

function estadoInicial(): EstadoDosContatos {
  return {
    contatos: [
      {
        id: 'contato-0001',
        partnerId: 'parc-0001',
        name: 'CARLA MENDES',
        role: 'REPRESENTANTE',
        phone: '11 3322-1200',
        mobilePhone: '11 98877-1200',
        fax: null,
        email: 'carla@evoled.dev',
        active: true,
      },
      {
        id: 'contato-0002',
        partnerId: 'parc-0001',
        name: 'PAULO RENNÓ',
        role: 'FINANCEIRO',
        phone: '11 3322-1210',
        mobilePhone: null,
        fax: '11 3322-1201',
        email: 'financeiro@evoled.dev',
        active: true,
      },
      {
        id: 'contato-0003',
        partnerId: 'parc-0001',
        // Desativado: é o registro que prova que a grade some do combo e
        // continua legível — §9 padrão 8, sem DELETE em lugar nenhum.
        name: 'ANTIGO REPRESENTANTE',
        role: 'REPRESENTANTE',
        phone: null,
        mobilePhone: null,
        fax: null,
        email: null,
        active: false,
      },
      {
        id: 'contato-0004',
        // De um parceiro que a MATRIZ não atende (`parc-0003` só tem vínculo
        // com a filial): é por ele que o 404 do vínculo se prova.
        partnerId: 'parc-0003',
        name: 'RECEPÇÃO HORIZONTE',
        role: null,
        phone: '11 4004-9000',
        mobilePhone: null,
        fax: null,
        email: null,
        active: true,
      },
    ],
  }
}

export const contatos: EstadoDosContatos = estadoInicial()

/** Devolve os contatos ao seed — o `resetStore()` daqui, para os testes. */
export function resetContatos(): void {
  Object.assign(contatos, estadoInicial())
}

/** O contato sem a chave de quem é dono — é isso que o contrato publica. */
function contactDto(contato: ContatoDoParceiro): PartnerContactDto {
  const { partnerId: _partnerId, ...doContrato } = contato
  return doContrato
}

/**
 * O parceiro está ao alcance da empresa ativa?
 *
 * Buscar no cadastro da ORG sem conferir o vínculo abriria o contato do
 * parceiro da empresa vizinha — a mesma regra (e a mesma resposta, 404) do
 * detalhe de parceiro.
 */
function parceiroAoAlcance(partnerId: string): boolean {
  const parceiro = store.parceiros.find((p) => p.id === partnerId)
  return Boolean(store.activeTenantId && parceiro?.vinculos[store.activeTenantId])
}

export const handlersDeContatos = [
  http.get('*/api/partners/:partnerId/contacts', ({ params, request }) => {
    if (!store.logado) return semSessao()
    const partnerId = String(params.partnerId)
    if (!parceiroAoAlcance(partnerId)) return naoEncontrado('Parceiro não encontrado.')

    const url = new URL(request.url)
    const sortBy = url.searchParams.get('sortBy')
    if (sortBy && !ORDENAVEIS.includes(sortBy)) {
      return problemaJson(400, `sortBy inválido: ${sortBy}.`, {}, TIPO.ordenacaoInvalida)
    }
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

    let linhas = contatos.contatos.filter((c) => c.partnerId === partnerId).map(contactDto)

    const q = url.searchParams.get('q')
    if (q) {
      const alvo = q.toLowerCase()
      linhas = linhas.filter((c) =>
        [c.name, c.role, c.email].some((texto) => texto?.toLowerCase().includes(alvo)),
      )
    }

    if (sortBy) {
      const desc = url.searchParams.get('sortDesc') === 'true'
      const chave = sortBy as keyof PartnerContactDto
      linhas.sort((a, b) => {
        const va = String(a[chave] ?? '')
        const vb = String(b[chave] ?? '')
        return desc ? vb.localeCompare(va) : va.localeCompare(vb)
      })
    }

    const inicio = (page - 1) * pageSize
    return HttpResponse.json({
      rows: linhas.slice(inicio, inicio + pageSize),
      total: linhas.length,
    })
  }),

  http.post('*/api/partners/:partnerId/contacts', async ({ params, request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const partnerId = String(params.partnerId)
    if (!parceiroAoAlcance(partnerId)) return naoEncontrado('Parceiro não encontrado.')

    const corpo = (await request.json()) as PartnerContactWriteRequest
    if (!corpo.name) {
      return camposInvalidos([{ path: 'name', message: 'Informe o nome do contato.' }])
    }

    const contato: ContatoDoParceiro = {
      id: novoId('contato'),
      partnerId,
      name: corpo.name,
      role: corpo.role ?? null,
      phone: corpo.phone ?? null,
      mobilePhone: corpo.mobilePhone ?? null,
      fax: corpo.fax ?? null,
      email: corpo.email ?? null,
      active: corpo.active ?? true,
    }
    contatos.contatos.push(contato)
    return HttpResponse.json(contactDto(contato), { status: 201 })
  }),

  http.put('*/api/partners/:partnerId/contacts/:contactId', async ({ params, request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const partnerId = String(params.partnerId)
    if (!parceiroAoAlcance(partnerId)) return naoEncontrado('Parceiro não encontrado.')

    // O contato precisa ser DESTE parceiro: casar só pelo id do contato deixaria
    // `PUT /api/partners/A/contacts/{de-B}` gravar no cadastro do vizinho, e o
    // caminho inteiro passaria a mentir sobre de quem é o registro.
    const contato = contatos.contatos.find(
      (c) => c.id === params.contactId && c.partnerId === partnerId,
    )
    if (!contato) return naoEncontrado('Contato não encontrado.')

    const corpo = (await request.json()) as PartnerContactWriteRequest
    if (!corpo.name) {
      return camposInvalidos([{ path: 'name', message: 'Informe o nome do contato.' }])
    }

    // `PUT` INTEGRAL, como no resto do contrato.
    contato.name = corpo.name
    contato.role = corpo.role ?? null
    contato.phone = corpo.phone ?? null
    contato.mobilePhone = corpo.mobilePhone ?? null
    contato.fax = corpo.fax ?? null
    contato.email = corpo.email ?? null
    contato.active = corpo.active ?? false
    return HttpResponse.json(contactDto(contato))
  }),
]
