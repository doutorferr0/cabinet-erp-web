import { configurarApi } from '@/api/cliente'
import type {
  EmployeeDetailDto,
  PagedResultOfEmployeeDto,
  PagedResultOfRoleDto,
} from '@/api/gerado'
import {
  authLogin,
  authSetActiveTenant,
  createEmployee,
  linkEmployee,
  listEmployees,
  listRoles,
  resetEmployeePassword,
  updateEmployeeLink,
} from '@/api/gerado'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { resetAcesso } from './acesso'
import { handlers } from './handlers'
import { TENANT_MATRIZ, resetStore } from './store'

/**
 * Os handlers de USUÁRIO DE ACESSO do mock — o comportamento que a tela
 * `/config/usuarios` assume e que o servidor promete.
 *
 * O que se trava aqui: usuário nasce sem credencial e o `reset-password` é o
 * único caminho que a cria (a senha aparece UMA vez, com forma humana de
 * digitar); e-mail ausente é 409 de ESTADO, não 400 de forma; o papel do
 * vínculo entra por `roleId` e papel inexistente é a URN `papel-invalido` — a
 * tela distingue "campo em branco" de "combo desatualizado" por isso.
 */

const servidor = setupServer(...handlers)

beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }))
afterEach(() => servidor.resetHandlers())
afterAll(() => servidor.close())

beforeEach(async () => {
  resetAcesso()
  resetStore()
  configurarApi('http://mock.teste')
  await authLogin({ email: 'admin@vertz.dev', password: 'qualquer' })
  await authSetActiveTenant({ tenantId: TENANT_MATRIZ })
})

afterEach(() => {
  resetAcesso()
})

function corpoDe<T>(r: { status: number; data: unknown }, esperado: number): T {
  expect(r.status).toBe(esperado)
  return r.data as T
}

async function criarUsuario(email: string | null = 'ana@vertz.com.br') {
  const r = await createEmployee({
    name: 'Ana Acesso',
    document: null,
    email,
    phone: null,
    active: true,
  })
  return corpoDe<EmployeeDetailDto>(r, 201)
}

async function papelAtivo(): Promise<string> {
  const r = await listRoles({ page: 1, pageSize: 100 })
  const corpo = corpoDe<PagedResultOfRoleDto>(r, 200)
  const papel = corpo.rows.find((p) => p.active)
  if (!papel) throw new Error('semente sem papel ativo')
  return papel.id
}

describe('usuários de acesso (mock)', () => {
  it('nasce VINCULADO ao papel de menor poder — como o servidor faz', async () => {
    const usuario = await criarUsuario()
    // O CreateEmployee do api vincula ao `viewer` no mesmo request; o mock
    // espelha com o template `Consulta`. Usuário sem vínculo nenhum é estado
    // que a tela não sabe mostrar — e é por isso que a atribuição é PUT.
    expect(usuario.roleId).not.toBeNull()
    expect(usuario.roleName).toBe('Consulta')
  })

  it('o papel escolhido entra por PUT (substituição) e a senha sai UMA vez, digitável', async () => {
    const usuario = await criarUsuario()
    const roleId = await papelAtivo()

    const vinculo = await updateEmployeeLink(usuario.id, { roleId, active: true })
    const detalhe = corpoDe<EmployeeDetailDto>(vinculo, 200)
    expect(detalhe.roleId).toBe(roleId)
    expect(detalhe.roleName).not.toBeNull()

    const reset = await resetEmployeePassword(usuario.id)
    const { temporaryPassword } = corpoDe<{ temporaryPassword: string }>(reset, 200)
    // Forma humana: 12 do alfabeto sem ambíguos (sem 0/O, 1/l/I).
    expect(temporaryPassword).toMatch(/^[a-zA-Z2-9]{12}$/)
    expect(temporaryPassword).not.toMatch(/[01OlI]/)
  })

  it('o usuário criado APARECE na listagem compartilhada', async () => {
    const usuario = await criarUsuario()
    const lista = await listEmployees({ page: 1, pageSize: 100 })
    const corpo = corpoDe<PagedResultOfEmployeeDto>(lista, 200)
    expect(corpo.rows.some((linha) => linha.id === usuario.id)).toBe(true)
  })

  it('sem e-mail não há credencial: o reset é 409 de ESTADO', async () => {
    // Quem não tem e-mail é o colaborador da SEMENTE (a transcrição não traz) —
    // pelo contrato não dá para criar um assim: o cadastro exige e-mail.
    const lista = await listEmployees({ page: 1, pageSize: 100 })
    const corpo = corpoDe<PagedResultOfEmployeeDto>(lista, 200)
    const daSemente = corpo.rows.find((linha) => !linha.id.startsWith('usuario'))
    if (!daSemente) throw new Error('semente sem colaborador')
    const reset = await resetEmployeePassword(daSemente.id)
    expect(reset.status).toBe(409)
  })

  it('cadastro sem e-mail é 400 — o servidor exige a credencial', async () => {
    const r = await createEmployee({
      name: 'Sem Porta',
      document: null,
      email: null,
      phone: null,
      active: true,
    })
    expect(r.status).toBe(400)
  })

  it('papel inexistente no vínculo é a URN papel-invalido, não campo em branco', async () => {
    const usuario = await criarUsuario()

    const semPapel = await linkEmployee(usuario.id, { active: true })
    expect(semPapel.status).toBe(400)
    const corpoSemPapel = semPapel.data as { fields?: { path: string }[] }
    expect(corpoSemPapel.fields?.[0]?.path).toBe('roleId')

    const papelFalso = await linkEmployee(usuario.id, {
      roleId: '99999999-9999-4999-8999-999999999999',
      active: true,
    })
    expect(papelFalso.status).toBe(400)
    expect((papelFalso.data as { type: string }).type).toBe('urn:cabinet:erro:papel-invalido')
  })

  it('POST no vínculo que já existe é 409 — o PUT é quem substitui', async () => {
    const usuario = await criarUsuario()
    const roleId = await papelAtivo()
    const corpo = { roleId, active: true }

    // O vínculo existe desde o cadastro (papel inicial), então o POST é 409
    // direto — o mesmo que o servidor responderia.
    expect((await linkEmployee(usuario.id, corpo)).status).toBe(409)
    expect((await updateEmployeeLink(usuario.id, corpo)).status).toBe(200)
  })

  it('e-mail repetido é 409 — a credencial é única, sem diferença de caixa', async () => {
    await criarUsuario('ana@vertz.com.br')
    const repetido = await createEmployee({
      name: 'Outra Ana',
      document: null,
      email: 'ANA@vertz.com.br',
      phone: null,
      active: true,
    })
    expect(repetido.status).toBe(409)
  })
})
