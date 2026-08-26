import type {
  CompanyLetterheadDto,
  CompanyLetterheadWriteRequest,
  TenantDetailDto,
  TenantDto,
  TenantWriteRequest,
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
import { TENANT_FILIAL, TENANT_MATRIZ, novoId, store } from './store'

/**
 * As EMPRESAS DO GRUPO no modo mock — `/api/tenants`.
 *
 * Arquivo próprio, como `acesso.ts`: estado que não é do store das telas
 * antigas, e arquivo novo não disputa linha com quem edita o vizinho.
 *
 * **Esta lista e `store.empresas` não são a mesma coisa, e a diferença é o
 * ponto.** `store.empresas` é `VinculoDeEmpresa[]` — as empresas em que o
 * usuário LOGADO entra, que é o que alimenta o seletor do rodapé e a
 * navegação. Aqui ficam as empresas que EXISTEM. Uma empresa recém-criada
 * aparece nesta lista e não naquela, porque ninguém foi vinculado a ela ainda —
 * e se as duas fossem a mesma estrutura, criar empresa entraria sozinha no
 * seletor de quem só queria cadastrá-la.
 *
 * **O que as liga é a EDIÇÃO, e ela é de mão única.** Renomear a empresa ou
 * mexer em `features` reescreve o vínculo correspondente, se houver: o nome que
 * o rodapé mostra e o menu que a barra desenha saem de `VinculoDeEmpresa`, e
 * deixá-los para trás faria a tela gravar "Vertz Matriz" e o rodapé continuar
 * dizendo "Vertz Iluminação — Matriz" até o próximo login. O contrário não
 * vale: mexer no vínculo não mexe na empresa.
 *
 * O que este mock reproduz de propósito, porque é onde o desenho pode estar
 * errado:
 *
 * - **`code` é único no sistema** — repetido é 409, em criar e em alterar;
 * - **`organizationId` não entra pelo corpo**: nem existe aqui, e é essa
 *   ausência que espelha o servidor;
 * - **`PUT` substitui o registro INTEIRO** — campo omitido vira `null`, e é por
 *   isso que o formulário manda todos.
 *
 * ## O TIMBRE mora aqui também, e em outra rota
 *
 * `/api/company-letterhead` é da web#373 e NÃO é `/api/tenants`: ele é o
 * SINGLETON da empresa ATIVA, e o id não viaja nele de propósito — `tenants` é
 * tabela global, sem política de RLS nenhuma, então aceitar um id do cliente
 * seria deixá-lo escolher o timbre de qual empresa grava. As duas rotas moram
 * neste arquivo porque escrevem a MESMA linha de `tenants`, e separá-las em dois
 * arquivos era o convite para as duas divergirem sobre o que `null` significa.
 *
 * Ele entrou na PASSAGEM sem handler de mock, e a justificativa escrita foi
 * "nenhuma tela chama as três". Esta PR dá tela a ele — e sem `VITE_API_PROXY`
 * (o site público é 100% mock) a passagem nasce vazia, então a rota sem handler
 * cairia no fallback da SPA e devolveria `index.html` com 200.
 */

/**
 * A empresa como o mock a guarda: o `TenantDetailDto` mais o TIMBRE, que o
 * `Dto` não publica.
 *
 * Uma estrutura só para as duas rotas porque no banco é uma LINHA só — `tenants`
 * — e duas cópias divergiriam no dia em que uma delas aprendesse a apagar campo.
 */
type EmpresaGuardada = Omit<TenantDetailDto, 'cnpj'> & {
  /**
   * `cnpj` sai do `Omit` porque o contrato o marca `readOnly` — e o orval
   * traduz isso para `readonly` no tipo, que é exatamente o certo do lado de
   * QUEM CONSOME. Aqui é o lado de quem GUARDA: o mock é a linha de `tenants`,
   * e a linha é escrita pelo timbre.
   */
  cnpj: string | null
  timbre: Omit<CompanyLetterheadDto, 'name'>
}

function semear(): EmpresaGuardada[] {
  return [
    {
      id: TENANT_MATRIZ,
      code: '01',
      name: 'Vertz Iluminação — Matriz',
      cnpj: '12345678000199',
      active: true,
      features: ['suppliers', 'professionals', 'employees'],
      timbre: {
        cnpj: '12345678000199',
        legalName: 'Vertz Comércio de Iluminação Ltda.',
        stateRegistration: '110042490114',
        address: {
          zipCode: '01310-100',
          street: 'Avenida Paulista',
          number: '1000',
          complement: 'Conjunto 12',
          district: 'Bela Vista',
          city: 'São Paulo',
          state: 'SP',
        },
        phone: '1132001000',
        email: 'contato@vertziluminacao.com.br',
      },
    },
    {
      /**
       * A FILIAL nasce SEM TIMBRE, e isso é semente, não descuido: é o estado
       * real de uma unidade aberta há pouco, é o que o contrato descreve como o
       * caso normal (200 com os campos em `null`, nunca 404), e é ele que faz a
       * tela mostrar o que acontece quando o cabeçalho da proposta sai vazio.
       * `features: []` é a mesma decisão de `store.empresas` — a Filial só vende.
       */
      id: TENANT_FILIAL,
      code: '02',
      name: 'Vertz Iluminação — Filial',
      cnpj: null,
      active: true,
      features: [],
      timbre: {
        cnpj: null,
        legalName: null,
        stateRegistration: null,
        address: null,
        phone: null,
        email: null,
      },
    },
  ]
}

let empresas: EmpresaGuardada[] = semear()

/** Devolve as empresas à semente — irmão de `resetAcesso`, para o teste isolar. */
export function resetEmpresas(): void {
  empresas = semear()
}

/** O nome fantasia de uma empresa, para quem só tem o id. `undefined` = não existe. */
export function nomeDaEmpresa(tenantId: string): string | undefined {
  return empresas.find((e) => e.id === tenantId)?.name
}

/** `sortBy` desta listagem — a whitelist que o contrato publica. */
export const ORDENAVEIS_EMPRESA = ['code', 'name', 'active'] as const

function linha(e: EmpresaGuardada): TenantDto {
  // `cnpj ?? null` e não `e.cnpj`: sob `exactOptionalPropertyTypes` o DTO
  // opcional carrega `undefined`, e o contrato publica o campo como anulável e
  // SEMPRE presente — omiti-lo faria a coluna sumir do JSON em vez de vir vazia.
  return { id: e.id, code: e.code, name: e.name, cnpj: e.cnpj ?? null, active: e.active }
}

/**
 * Valida o corpo de escrita. Devolve a resposta de erro, ou `undefined`.
 *
 * `features` com valor fora do conjunto fechado é `campos-invalidos` apontando
 * o campo, e não 400 genérico: a tela tem uma caixa por recurso e precisa saber
 * em qual pousar o erro.
 */
const RECURSOS_VALIDOS = ['suppliers', 'professionals', 'employees']

function recusarCorpo(corpo: TenantWriteRequest, id: string | null) {
  if (!corpo.code?.trim()) {
    return camposInvalidos([{ path: 'code', message: 'Código da empresa é obrigatório.' }])
  }
  if (!corpo.name?.trim()) {
    return camposInvalidos([{ path: 'name', message: 'Nome da empresa é obrigatório.' }])
  }
  const forasteiros = (corpo.features ?? []).filter((f) => !RECURSOS_VALIDOS.includes(f))
  if (forasteiros.length > 0) {
    return camposInvalidos([
      { path: 'features', message: `Recurso desconhecido: ${forasteiros.join(', ')}.` },
    ])
  }
  const repetido = empresas.some(
    (e) => e.id !== id && e.code.trim().toLowerCase() === corpo.code.trim().toLowerCase(),
  )
  if (repetido) return conflito('Já existe uma empresa com este código.')
  return undefined
}

/** O `TenantDetailDto` que a rota devolve — o guardado MENOS o timbre. */
function detalhe(e: EmpresaGuardada): TenantDetailDto {
  return {
    id: e.id,
    code: e.code,
    name: e.name,
    cnpj: e.cnpj ?? null,
    active: e.active,
    features: [...e.features],
  }
}

/**
 * Aplica o corpo sobre a empresa — `PUT` substitui o registro INTEIRO, então
 * campo ausente vira `null` e não conserva o valor antigo.
 *
 * O TIMBRE fica de fora porque não está no corpo: quem o grava é
 * `/api/company-letterhead`. `cnpj` também — ele é do timbre, e o `TenantDto`
 * só o LÊ, para a linha da listagem dizer de qual empresa se está falando.
 */
function aplicar(alvo: EmpresaGuardada, corpo: TenantWriteRequest): void {
  alvo.code = corpo.code.trim()
  alvo.name = corpo.name.trim()
  alvo.active = corpo.active ?? true
  alvo.features = [...(corpo.features ?? [])]
}

/**
 * Reescreve o VÍNCULO do usuário logado quando a empresa muda de nome ou de
 * recursos — ver o cabeçalho: nome e menu saem de `VinculoDeEmpresa`.
 *
 * Silencioso quando não há vínculo, e é o certo: alterar empresa em que não se
 * entra é caso normal para quem administra o grupo.
 */
function espelharNoVinculo(e: EmpresaGuardada): void {
  const vinculo = store.empresas.find((v) => v.tenantId === e.id)
  if (!vinculo) return
  vinculo.name = e.name
  vinculo.features = [...e.features]
}

/** A empresa da sessão; `undefined` quando não há empresa ativa escolhida. */
function empresaAtiva(): EmpresaGuardada | undefined {
  if (!store.activeTenantId) return undefined
  return empresas.find((e) => e.id === store.activeTenantId)
}

/**
 * O `CompanyLetterheadDto` — o timbre guardado mais o `name`, que é só de
 * leitura ali e serve para a tela dizer de quem é o timbre que está editando.
 */
function comONome(e: EmpresaGuardada): CompanyLetterheadDto {
  return { name: e.name, ...e.timbre }
}

/**
 * Os campos que o `PUT` do timbre exige PRESENTES. Ausente é 400; `null` apaga.
 * `name` não está aqui porque não está no corpo — quem renomeia a empresa é
 * `PUT /api/tenants/{id}`.
 */
const OBRIGATORIOS_DO_TIMBRE = [
  'cnpj',
  'legalName',
  'stateRegistration',
  'address',
  'phone',
  'email',
] as const

export const handlersDeEmpresas = [
  http.get('*/api/tenants', ({ request }) => {
    if (!store.logado) return semSessao()
    // Sem recorte por empresa ativa: administrar o grupo é anterior a estar
    // dentro de uma das empresas dele. Ver a descrição de `ListTenants`.
    const url = new URL(request.url)
    const q = url.searchParams.get('q')
    const sortBy = url.searchParams.get('sortBy')
    const sortDesc = url.searchParams.get('sortDesc') === 'true'
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
    if (sortBy && !ORDENAVEIS_EMPRESA.some((o) => o === sortBy)) {
      return problemaJson(400, `sortBy inválido: ${sortBy}.`, {}, TIPO.ordenacaoInvalida)
    }

    let rows = empresas.map(linha)
    if (q) {
      const alvo = q.toLowerCase()
      rows = rows.filter(
        (r) => r.name.toLowerCase().includes(alvo) || r.code.toLowerCase().includes(alvo),
      )
    }
    // Ordem padrão por `code`: é o número que o operador usa para falar da
    // empresa, e a ordem de cadastro não diz nada a ninguém.
    const chave = (sortBy ?? 'code') as 'code' | 'name' | 'active'
    rows.sort((a, b) => {
      const va = String(a[chave] ?? '')
      const vb = String(b[chave] ?? '')
      return sortDesc ? vb.localeCompare(va) : va.localeCompare(vb)
    })
    const total = rows.length
    const inicio = (page - 1) * pageSize
    return HttpResponse.json({ rows: rows.slice(inicio, inicio + pageSize), total })
  }),

  http.post('*/api/tenants', async ({ request }) => {
    if (!store.logado) return semSessao()
    const semPermissao = verificarEscrita('tenants')
    if (semPermissao) return semPermissao
    const corpo = (await request.json()) as TenantWriteRequest
    const recusa = recusarCorpo(corpo, null)
    if (recusa) return recusa
    const nova: EmpresaGuardada = {
      id: novoId('empresa'),
      code: '',
      name: '',
      // Nasce sem CNPJ e sem timbre: quem os grava é o singleton do timbre,
      // depois de a empresa nova estar ATIVA.
      cnpj: null,
      active: true,
      features: [],
      timbre: {
        cnpj: null,
        legalName: null,
        stateRegistration: null,
        address: null,
        phone: null,
        email: null,
      },
    }
    aplicar(nova, corpo)
    empresas.push(nova)
    // NÃO entra em `store.empresas`: a empresa nasce sem vínculo, inclusive o
    // de quem a criou. Ver a descrição de `CreateTenant`.
    return HttpResponse.json(detalhe(nova), { status: 201 })
  }),

  http.get('*/api/tenants/:id', ({ params }) => {
    if (!store.logado) return semSessao()
    const achada = empresas.find((e) => e.id === String(params.id))
    if (!achada) return naoEncontrado('Empresa não encontrada.')
    return HttpResponse.json(detalhe(achada))
  }),

  http.put('*/api/tenants/:id', async ({ params, request }) => {
    if (!store.logado) return semSessao()
    const semPermissao = verificarEscrita('tenants')
    if (semPermissao) return semPermissao
    const achada = empresas.find((e) => e.id === String(params.id))
    if (!achada) return naoEncontrado('Empresa não encontrada.')
    const corpo = (await request.json()) as TenantWriteRequest
    const recusa = recusarCorpo(corpo, achada.id)
    if (recusa) return recusa
    aplicar(achada, corpo)
    espelharNoVinculo(achada)
    return HttpResponse.json(detalhe(achada))
  }),

  /**
   * O TIMBRE — singleton da empresa ATIVA (web#373).
   *
   * Sem empresa ativa é 409 e não lista vazia: o contrato reserva esse código
   * para "este recurso exige empresa", e aqui não há o que devolver — timbre é
   * de UMA empresa, e sem saber qual não existe resposta honesta.
   *
   * Empresa COM empresa ativa e SEM timbre é **200 com tudo em `null`**, nunca
   * 404: ausência de timbre é o estado inicial de toda empresa nova, e é a tela
   * de cadastro que existe para resolvê-la.
   */
  http.get('*/api/company-letterhead', () => {
    if (!store.logado) return semSessao()
    const ativa = empresaAtiva()
    if (!ativa) return semEmpresaAtiva()
    return HttpResponse.json(comONome(ativa))
  }),

  http.put('*/api/company-letterhead', async ({ request }) => {
    if (!store.logado) return semSessao()
    const semPermissao = verificarEscrita('tenants')
    if (semPermissao) return semPermissao
    const ativa = empresaAtiva()
    if (!ativa) return semEmpresaAtiva()
    const corpo = (await request.json()) as CompanyLetterheadWriteRequest
    // `PUT` de singleton: campo AUSENTE é 400, campo `null` APAGA. Os dois são
    // diferentes de propósito — meio timbre grava meio cabeçalho.
    const faltando = OBRIGATORIOS_DO_TIMBRE.filter((c) => !(c in corpo))
    if (faltando.length > 0) {
      return camposInvalidos(
        faltando.map((path) => ({
          path,
          message: 'Campo obrigatório na presença; use null para apagar.',
        })),
      )
    }
    ativa.timbre = {
      cnpj: corpo.cnpj ?? null,
      legalName: corpo.legalName ?? null,
      stateRegistration: corpo.stateRegistration ?? null,
      address: corpo.address ?? null,
      phone: corpo.phone ?? null,
      email: corpo.email ?? null,
    }
    // O CNPJ da LINHA acompanha: é a mesma coluna de `tenants`, e deixar as
    // duas leituras divergirem faria a listagem exibir o CNPJ de antes.
    ativa.cnpj = ativa.timbre.cnpj
    return HttpResponse.json(comONome(ativa))
  }),
]
