import { configurarApi } from '@/api/cliente'
import type { PermissionCatalogDto, RoleDetailDto, RoleDto } from '@/api/gerado'
import {
  authLogin,
  authSetActiveTenant,
  createRole,
  getRole,
  listPermissions,
  listRoles,
  updateRole,
} from '@/api/gerado'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { resetAcesso } from './acesso'
import { handlers } from './handlers'
import { TENANT_FILIAL, TENANT_MATRIZ, resetStore } from './store'

/**
 * O servidor falso de papéis e permissões (web#292 · api#84).
 *
 * Não há tela ainda, e é por isso que este arquivo existe: o handler é o único
 * lugar onde as regras do desenho estão escritas em código executável, e sem
 * teste elas seriam prosa no cabeçalho. O que se prova aqui é o que a tela de
 * checkboxes vai depender quando vier.
 */

const servidor = setupServer(...handlers)

beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }))
afterEach(() => servidor.resetHandlers())
afterAll(() => servidor.close())

beforeEach(async () => {
  resetStore()
  resetAcesso()
  configurarApi('http://mock.teste')
  await authLogin({ email: 'admin@vertz.dev', password: 'qualquer' })
  await authSetActiveTenant({ tenantId: TENANT_MATRIZ })
})

/**
 * O corpo de sucesso, com o status conferido no caminho.
 *
 * O cliente gerado tipa `data` como a UNIÃO do sucesso com `ProblemDetails` —
 * é o que faz o chamador tratar o erro. Aqui o status já é a asserção, então o
 * estreitamento é honesto: se ele não bater, o teste falha antes do cast.
 */
function corpoDe<T>(r: { status: number; data: unknown }, esperado = 200): T {
  expect(r.status).toBe(esperado)
  return r.data as T
}

type Pagina = { rows: RoleDto[]; total: number }

describe('catálogo de permissões', () => {
  it('vem INTEIRO, sem página — meia lista de caixas grava papel incompleto', async () => {
    const catalogo = corpoDe<PermissionCatalogDto>(await listPermissions())
    expect(catalogo.modules.length).toBeGreaterThan(5)
    expect(catalogo.version).toBeTruthy()
    // Nenhum módulo vazio: módulo sem permissão é ruído na tela.
    expect(catalogo.modules.every((m) => m.permissions.length > 0)).toBe(true)
  })

  it('a granularidade é por AÇÃO, no formato `modulo:acao`', async () => {
    const catalogo = corpoDe<PermissionCatalogDto>(await listPermissions())
    const chaves = catalogo.modules.flatMap((m) => m.permissions.map((p) => p.key))
    expect(chaves).toContain('depositos:gerenciar')
    expect(chaves.every((k) => /^[a-z]+:[a-z]+$/.test(k))).toBe(true)
    // O prefixo da chave é o módulo que a agrupa — senão o agrupamento mente.
    for (const modulo of catalogo.modules) {
      expect(modulo.permissions.every((p) => p.key.startsWith(`${modulo.key}:`))).toBe(true)
    }
  })

  it('cada permissão traz o rótulo — a tela não inventa nome de caixa', async () => {
    const catalogo = corpoDe<PermissionCatalogDto>(await listPermissions())
    expect(catalogo.modules.every((m) => m.label && m.permissions.every((p) => p.label))).toBe(true)
  })
})

describe('listagem de papéis', () => {
  it('traz `permissionCount`, não o conjunto — a linha não carrega o catálogo', async () => {
    const pagina = corpoDe<Pagina>(await listRoles())
    expect(pagina.total).toBeGreaterThan(0)
    const linha = pagina.rows[0] as RoleDto & { permissions?: unknown }
    expect(linha.permissionCount).toBeGreaterThan(0)
    expect(linha.permissions).toBeUndefined()
  })

  it('os dois de sistema e os templates de fábrica convivem na mesma lista', async () => {
    const pagina = corpoDe<Pagina>(await listRoles({ pageSize: 50 }))
    expect(pagina.rows.filter((p) => p.system).map((p) => p.name)).toEqual([
      'Proprietário',
      'Administrador',
    ])
    // Os três templates são os papéis antigos que sobram da escala (fase 3).
    expect(pagina.rows.filter((p) => p.template).map((p) => p.name)).toEqual([
      'Operador',
      'Operador de Vendas',
      'Consulta',
    ])
  })

  it('`sortBy` fora da whitelist é 400, como o contrato publica', async () => {
    const r = await listRoles({ sortBy: 'permissionCount' })
    expect(r.status).toBe(400)
  })
})

describe('criação', () => {
  it('nasce sempre `system: false` — o corpo não se declara de sistema', async () => {
    const criado = corpoDe<RoleDetailDto>(
      await createRole({
        name: 'Financeiro',
        description: null,
        permissions: ['orcamento:ver', 'pedidos:ver'],
        active: true,
        // biome-ignore lint/suspicious/noExplicitAny: prova que a marca é do servidor, não do corpo
        ...({ system: true, template: true } as any),
      }),
      201,
    )
    expect(criado.system).toBe(false)
    expect(criado.template).toBe(false)
    expect(criado.permissionCount).toBe(2)
  })

  it('permissão fora do catálogo é 400 apontando o CAMPO', async () => {
    const problema = corpoDe<{ type?: string; fields?: { path: string }[] }>(
      await createRole({
        name: 'Inventado',
        description: null,
        permissions: ['produtos:ver', 'foguete:lancar'],
        active: true,
      }),
      400,
    )
    expect(problema.type).toBe('urn:cabinet:erro:campos-invalidos')
    expect(problema.fields?.map((f) => f.path)).toEqual(['permissions'])
  })

  it('nome repetido na organização é 409', async () => {
    const r = await createRole({
      name: 'Consulta',
      description: null,
      permissions: [],
      active: true,
    })
    expect(r.status).toBe(409)
  })

  it('clonar um template é ler o detalhe e postar o que veio', async () => {
    const lista = corpoDe<Pagina>(await listRoles({ pageSize: 50 }))
    const modelo = lista.rows.find((p) => p.name === 'Operador de Vendas')
    const detalhe = corpoDe<RoleDetailDto>(await getRole(modelo?.id as string))

    const clone = corpoDe<RoleDetailDto>(
      await createRole({
        name: 'Vendedor externo',
        description: null,
        permissions: detalhe.permissions,
        active: true,
      }),
      201,
    )
    expect(clone.permissions).toEqual(detalhe.permissions)
    expect(clone.template).toBe(false)
  })
})

describe('alteração', () => {
  async function idDe(nome: string) {
    const pagina = corpoDe<Pagina>(await listRoles({ pageSize: 50 }))
    return pagina.rows.find((p) => p.name === nome)?.id as string
  }

  it('papel de sistema é 409 com URN própria, não 403', async () => {
    const problema = corpoDe<{ type?: string }>(
      await updateRole(await idDe('Administrador'), {
        name: 'Administrador',
        description: null,
        permissions: [],
        active: true,
      }),
      409,
    )
    expect(problema.type).toBe('urn:cabinet:erro:papel-de-sistema')
  })

  it('desativar papel de sistema também é recusado', async () => {
    const r = await updateRole(await idDe('Proprietário'), {
      name: 'Proprietário',
      description: null,
      permissions: [],
      active: false,
    })
    expect(r.status).toBe(409)
  })

  it('template de fábrica é editável — `template` conta origem, não proteção', async () => {
    const alterado = corpoDe<RoleDetailDto>(
      await updateRole(await idDe('Consulta'), {
        name: 'Consulta',
        description: 'editado',
        permissions: ['produtos:ver'],
        active: true,
      }),
    )
    expect(alterado.permissions).toEqual(['produtos:ver'])
    expect(alterado.template).toBe(true)
  })

  it('`permissions` é o conjunto FINAL — desmarcar tem efeito', async () => {
    const id = await idDe('Operador')
    const antes = corpoDe<RoleDetailDto>(await getRole(id))
    expect(antes.permissions.length).toBeGreaterThan(1)

    await updateRole(id, {
      name: 'Operador',
      description: null,
      permissions: ['produtos:ver'],
      active: true,
    })
    const depois = corpoDe<RoleDetailDto>(await getRole(id))
    expect(depois.permissions).toEqual(['produtos:ver'])
    expect(depois.permissionCount).toBe(1)
  })
})

describe('quem pode mexer', () => {
  it('papel que não alcança a família recusa a escrita com 403', async () => {
    // A Filial é o vínculo `viewer` da semente — o mesmo par que exercita a
    // matriz nos outros handlers.
    await authSetActiveTenant({ tenantId: TENANT_FILIAL })
    const r = await createRole({
      name: 'Tentativa',
      description: null,
      permissions: [],
      active: true,
    })
    expect(r.status).toBe(403)
  })

  it('sem sessão, nem o catálogo responde', async () => {
    resetStore()
    const r = await listPermissions()
    expect(r.status).toBe(401)
  })
})
