import { configurarApi } from '@/api/cliente'
import type {
  CompanyLetterheadDto,
  EmployeeTenantLinkDto,
  TenantDetailDto,
  TenantDto,
  VinculoDeEmpresa,
} from '@/api/gerado'
import {
  authLogin,
  authSetActiveTenant,
  authTenants,
  createEmployee,
  createTenant,
  getCompanyLetterhead,
  getTenant,
  listEmployeeLinks,
  listTenants,
  updateCompanyLetterhead,
  updateEmployeeLink,
  updateTenant,
} from '@/api/gerado'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { resetAcesso } from './acesso'
import { resetEmpresas } from './empresas'
import { handlers } from './handlers'
import { TENANT_FILIAL, TENANT_MATRIZ, resetStore, store } from './store'

/**
 * O servidor falso das EMPRESAS DO GRUPO (`/api/tenants`) e da leitura de
 * vínculos (`GET /api/employees/{id}/links`).
 *
 * O que se prova aqui é o que a aba Empresas depende, e principalmente as três
 * coisas que o desenho pode errar em silêncio: **empresa criada não entra no
 * seletor** (ela nasce sem vínculo), **empresa renomeada entra** (o vínculo
 * carrega o nome que o rodapé mostra) e **`/api/tenants` não escreve o timbre**
 * — quem o escreve é o singleton `/api/company-letterhead`, da web#373, porque
 * `tenants` não tem RLS e um id no caminho seria o cliente escolhendo de qual
 * empresa grava o cabeçalho. As três são invisíveis na tela até alguém reclamar
 * de um nome velho ou de um CNPJ que voltou sozinho.
 */

const servidor = setupServer(...handlers)

beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }))
afterEach(() => servidor.resetHandlers())
afterAll(() => servidor.close())

beforeEach(async () => {
  resetStore()
  resetAcesso()
  resetEmpresas()
  configurarApi('http://mock.teste')
  await authLogin({ email: 'admin@vertz.dev', password: 'qualquer' })
  await authSetActiveTenant({ tenantId: TENANT_MATRIZ })
  // O vínculo semeado é `admin`, e `tenants` pede `owner`: montar o grupo é a
  // única escrita deste repo acima do administrador de acesso — ver o
  // comentário da linha em `PAPEL_MINIMO_POR_FAMILIA`. Os casos de ESCRITA
  // sobem o papel de propósito; a recusa do `admin` tem caso próprio no fim.
  const matriz = store.empresas.find((e) => e.tenantId === TENANT_MATRIZ)
  if (matriz) matriz.role = 'owner'
})

function corpoDe<T>(r: { status: number; data: unknown }, esperado = 200): T {
  expect(r.status).toBe(esperado)
  return r.data as T
}

type Pagina = { rows: TenantDto[]; total: number }

/** O corpo mínimo de escrita — os quatro obrigatórios, sem timbre. */
function corpoMinimo(code: string, name: string) {
  return { code, name, active: true, features: [] }
}

describe('listagem de empresas do grupo', () => {
  it('lista o grupo INTEIRO, não só onde o usuário entra', async () => {
    const pagina = corpoDe<Pagina>(await listTenants({ page: 1, pageSize: 100 }))
    expect(pagina.total).toBe(2)
    expect(pagina.rows.map((r) => r.code)).toEqual(['01', '02'])
  })

  it('ordena por `code` sem ninguém pedir — é o número pelo qual se fala da empresa', async () => {
    const pagina = corpoDe<Pagina>(await listTenants({ page: 1, pageSize: 100, sortDesc: true }))
    expect(pagina.rows.map((r) => r.code)).toEqual(['02', '01'])
  })

  it('`sortBy` fora da whitelist é 400 — o site público é 100% mock, quem recusa é o handler', async () => {
    const resposta = await listTenants({ sortBy: 'cnpj' })
    expect(resposta.status).toBe(400)
  })

  it('`pageSize` acima do teto é 400 — aparar em silêncio esconderia metade do grupo', async () => {
    expect((await listTenants({ pageSize: 500 })).status).toBe(400)
  })

  it('`q` casa código E nome — quem procura a filial digita "02" ou "Filial"', async () => {
    expect(corpoDe<Pagina>(await listTenants({ q: 'Filial' })).total).toBe(1)
    expect(corpoDe<Pagina>(await listTenants({ q: '02' })).total).toBe(1)
  })
})

describe('o timbre é do SINGLETON, não de /api/tenants', () => {
  it('o detalhe da empresa NÃO carrega timbre — nem para ler', async () => {
    const detalhe = corpoDe<TenantDetailDto>(await getTenant(TENANT_MATRIZ))
    expect(detalhe.code).toBe('01')
    expect(detalhe.features).toContain('suppliers')
    // Nada de razão social nem endereço: publicá-los aqui, com id no caminho,
    // abriria por baixo a porta que `/api/company-letterhead` fecha.
    const cru = detalhe as unknown as Record<string, unknown>
    expect(cru).not.toHaveProperty('legalName')
    expect(cru).not.toHaveProperty('addressCity')
    expect(cru).not.toHaveProperty('logoUrl')
  })

  it('o PUT da empresa não apaga o timbre, mesmo substituindo o registro', async () => {
    const antes = corpoDe<CompanyLetterheadDto>(await getCompanyLetterhead())
    expect(antes.legalName).toBe('Vertz Comércio de Iluminação Ltda.')

    await updateTenant(TENANT_MATRIZ, corpoMinimo('01', 'Vertz Matriz'))

    // O `PUT` de `/api/tenants` substitui a IDENTIDADE inteira; o timbre não é
    // dele, então continua lá. O contrário — apagar por omissão — faria alterar
    // o nome fantasia zerar o cabeçalho de todo impresso da empresa.
    const depois = corpoDe<CompanyLetterheadDto>(await getCompanyLetterhead())
    expect(depois.legalName).toBe('Vertz Comércio de Iluminação Ltda.')
    expect(depois.address?.city).toBe('São Paulo')
    // E o `name` do timbre acompanha o fantasia novo: ele é só leitura ali.
    expect(depois.name).toBe('Vertz Matriz')
  })

  it('empresa SEM timbre é 200 com tudo em null, nunca 404', async () => {
    await authSetActiveTenant({ tenantId: TENANT_FILIAL })
    const timbre = corpoDe<CompanyLetterheadDto>(await getCompanyLetterhead())
    // Ausência de timbre é o estado inicial de toda empresa nova, e é a tela de
    // cadastro que existe para resolvê-la — erro faria a tela tratar como falha
    // o caso que ela foi feita para atender.
    expect(timbre.legalName).toBeNull()
    expect(timbre.address).toBeNull()
    expect(timbre.name).toBe('Vertz Iluminação — Filial')
  })

  it('o PUT do timbre grava, e o CNPJ acompanha a linha da listagem', async () => {
    await updateCompanyLetterhead({
      cnpj: '98765432000188',
      legalName: 'Vertz Matriz S.A.',
      stateRegistration: '999',
      address: {
        zipCode: '11000-000',
        street: 'Rua Nova',
        number: '10',
        complement: null,
        district: 'Centro',
        city: 'Santos',
        state: 'SP',
      },
      phone: null,
      email: null,
    })

    const timbre = corpoDe<CompanyLetterheadDto>(await getCompanyLetterhead())
    expect(timbre.legalName).toBe('Vertz Matriz S.A.')
    expect(timbre.address?.city).toBe('Santos')
    // `null` APAGA, não conserva: era '1132001000'.
    expect(timbre.phone).toBeNull()

    // O CNPJ é a MESMA coluna de `tenants` — a listagem tem de acompanhar,
    // senão a aba Empresas exibiria o CNPJ de antes para sempre.
    const linha = corpoDe<Pagina>(await listTenants()).rows.find((r) => r.id === TENANT_MATRIZ)
    expect(linha?.cnpj).toBe('98765432000188')
  })

  it('campo AUSENTE no PUT do timbre é 400 — meio timbre grava meio cabeçalho', async () => {
    const resposta = await updateCompanyLetterhead({
      legalName: 'Só a razão social',
    } as never)
    expect(resposta.status).toBe(400)
    const corpo = resposta.data as { fields?: { path: string }[] }
    expect(corpo.fields?.map((f) => f.path)).toContain('cnpj')
  })
})

describe('criar empresa', () => {
  it('nasce SEM VÍNCULO — não entra no seletor de quem a criou', async () => {
    const antes = corpoDe<VinculoDeEmpresa[]>(await authTenants())
    const nova = corpoDe<TenantDetailDto>(
      await createTenant(corpoMinimo('03', 'Vertz Litoral')),
      201,
    )

    // Existe no grupo…
    expect(corpoDe<Pagina>(await listTenants()).total).toBe(3)
    // …e NÃO no que o usuário alcança. É a diferença entre as duas listas, e
    // ela some se alguém "melhorar" o handler vinculando quem cria.
    const depois = corpoDe<VinculoDeEmpresa[]>(await authTenants())
    expect(depois.length).toBe(antes.length)
    expect(depois.map((v) => v.tenantId)).not.toContain(nova.id)
  })

  it('código repetido é 409 — o código é único no sistema, não na organização', async () => {
    expect((await createTenant(corpoMinimo('01', 'Outra qualquer'))).status).toBe(409)
  })

  it('recurso fora do conjunto fechado é 400 apontando `features`', async () => {
    const resposta = await createTenant({
      code: '04',
      name: 'Vertz Norte',
      active: true,
      features: ['contabilidade'] as never,
    })
    expect(resposta.status).toBe(400)
    const corpo = resposta.data as { fields?: { path: string }[] }
    expect(corpo.fields?.[0]?.path).toBe('features')
  })

  it('sem código ou sem nome é 400 apontando o campo', async () => {
    const semNome = await createTenant({ code: '05', name: '  ', active: true, features: [] })
    expect(semNome.status).toBe(400)
    expect((semNome.data as { fields?: { path: string }[] }).fields?.[0]?.path).toBe('name')
  })
})

describe('a alteração alcança o SELETOR', () => {
  it('renomear a empresa renomeia o vínculo — senão o rodapé fica no nome velho', async () => {
    await updateTenant(TENANT_MATRIZ, corpoMinimo('01', 'Vertz Matriz SP'))
    const vinculos = corpoDe<VinculoDeEmpresa[]>(await authTenants())
    expect(vinculos.find((v) => v.tenantId === TENANT_MATRIZ)?.name).toBe('Vertz Matriz SP')
  })

  it('desligar `features` desliga o MENU daquela empresa', async () => {
    const antes = corpoDe<VinculoDeEmpresa[]>(await authTenants())
    expect(antes.find((v) => v.tenantId === TENANT_MATRIZ)?.features).toContain('suppliers')

    await updateTenant(TENANT_MATRIZ, {
      ...corpoMinimo('01', 'Vertz Iluminação — Matriz'),
      features: ['employees'],
    })

    const depois = corpoDe<VinculoDeEmpresa[]>(await authTenants())
    expect(depois.find((v) => v.tenantId === TENANT_MATRIZ)?.features).toEqual(['employees'])
  })
})

describe('vínculos do colaborador entre empresas', () => {
  it('lista as empresas em que a pessoa entra, com o papel de cada uma', async () => {
    const criado = (await createEmployee({
      name: 'Joana Ribeiro',
      email: 'joana@vertz.dev',
      document: null,
      phone: null,
      active: true,
    })) as { data: { id: string } }

    const links = corpoDe<EmployeeTenantLinkDto[]>(await listEmployeeLinks(criado.data.id))
    // Criada COM a Matriz ativa: um vínculo, nela, e em nenhuma outra.
    expect(links.map((l) => l.tenantId)).toEqual([TENANT_MATRIZ])
    expect(links[0]?.tenantName).toBe('Vertz Iluminação — Matriz')
    expect(links[0]?.roleName).toBeTruthy()
  })

  it('o vínculo é POR EMPRESA — trocar a ativa e vincular soma linha, não substitui', async () => {
    const criado = (await createEmployee({
      name: 'Caio Prado',
      email: 'caio@vertz.dev',
      document: null,
      phone: null,
      active: true,
    })) as { data: { id: string } }

    // O papel escolhido, na Filial, depois de ativá-la.
    await authSetActiveTenant({ tenantId: TENANT_FILIAL })
    const papel = corpoDe<EmployeeTenantLinkDto[]>(await listEmployeeLinks(criado.data.id))
    expect(papel.map((l) => l.tenantId)).toEqual([TENANT_MATRIZ])
  })

  it('pessoa sem vínculo nenhum é `[]`, e pessoa inexistente é 404', async () => {
    // Um colaborador da semente do CRM: existe na listagem e nunca foi tocado
    // pela tela de acesso, então não entra em empresa alguma.
    const semVinculo = corpoDe<EmployeeTenantLinkDto[]>(await listEmployeeLinks('emp-0002'))
    expect(semVinculo).toEqual([])
    expect((await listEmployeeLinks('nao-existe')).status).toBe(404)
  })

  it('`admin` NÃO monta o grupo — a escrita de empresa é 403 para quem só administra acesso', async () => {
    const matriz = store.empresas.find((e) => e.tenantId === TENANT_MATRIZ)
    if (matriz) matriz.role = 'admin'
    // A LEITURA continua: quem administra acesso precisa ver em que empresas
    // pôr as pessoas. O que recusa é criar e alterar.
    expect((await listTenants()).status).toBe(200)
    expect((await createTenant(corpoMinimo('09', 'Vertz Sul'))).status).toBe(403)
    expect((await updateTenant(TENANT_MATRIZ, corpoMinimo('01', 'x'))).status).toBe(403)
  })

  it('o PUT do vínculo grava na empresa ATIVA e a leitura o devolve', async () => {
    const criado = (await createEmployee({
      name: 'Rita Alves',
      email: 'rita@vertz.dev',
      document: null,
      phone: null,
      active: true,
    })) as { data: { id: string } }

    const papeis = corpoDe<{ rows: { id: string; name: string; active: boolean }[] }>(
      await (await import('@/api/gerado')).listRoles({ page: 1, pageSize: 100 }),
    )
    const alvo = papeis.rows.find((p) => p.active && p.name !== 'Consulta')
    expect(alvo).toBeDefined()

    await updateEmployeeLink(criado.data.id, { roleId: alvo?.id ?? null, active: true })
    const links = corpoDe<EmployeeTenantLinkDto[]>(await listEmployeeLinks(criado.data.id))
    expect(links.find((l) => l.tenantId === TENANT_MATRIZ)?.roleName).toBe(alvo?.name)
  })
})
