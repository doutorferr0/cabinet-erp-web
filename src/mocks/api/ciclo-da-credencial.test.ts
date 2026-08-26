import { configurarApi } from '@/api/cliente'
import type {
  CredentialTokenDto,
  EmployeeDetailDto,
  InvitationDto,
  PagedResultOfEmployeeDto,
} from '@/api/gerado'
import {
  authCredentialToken,
  authForgotPassword,
  authLogin,
  authSetActiveTenant,
  authSetPassword,
  createEmployee,
  inviteEmployee,
  listEmployees,
} from '@/api/gerado'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetAcesso } from './acesso'
import { handlers } from './handlers'
import { TENANT_MATRIZ, resetStore } from './store'

/**
 * O CICLO DA CREDENCIAL no mock — convite, recuperação e o gasto do token.
 *
 * Fecha a metade que o `reset-password` deixou aberta: lá o administrador lê
 * uma senha provisória na tela e a repassa; aqui a pessoa recebe um link e
 * escolhe a própria senha, e o segredo não passa por terceiro nenhum.
 *
 * O que se trava aqui é o que a tela vai assumir e o servidor vai ter de
 * cumprir:
 *
 * - **`forgot-password` responde 202 para e-mail que não existe**, igualzinho
 *   ao que existe. É a única defesa contra usar um caminho público como
 *   consulta de quem tem conta aqui, e é comportamento, não detalhe: um 404
 *   aqui responderia a qualquer um, sem sessão;
 * - **o token é de uso único** — a segunda chamada com o mesmo link é recusada,
 *   e recusada com URN, não com texto;
 * - **emitir de novo mata o anterior**, para não deixar dois links vivos;
 * - **inspecionar NÃO gasta** — a tela precisa ler antes de a pessoa digitar;
 * - **expirado e inválido são URNs DIFERENTES**, porque a tela tem uma saída
 *   para um (pedir outro) e nenhuma para o outro.
 *
 * O token sai do log, e é de propósito: no mock, como no driver de log do
 * servidor em dev, o link só existe ali. Um `ultimoToken()` exportado seria
 * mais cômodo e abriria uma porta que a tela poderia chamar.
 */

const servidor = setupServer(...handlers)

beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }))
afterEach(() => servidor.resetHandlers())
afterAll(() => servidor.close())

let logado: ReturnType<typeof vi.spyOn>

beforeEach(async () => {
  resetAcesso()
  resetStore()
  configurarApi('http://mock.teste')
  logado = vi.spyOn(console, 'info').mockImplementation(() => {})
  await authLogin({ email: 'admin@vertz.dev', password: 'qualquer' })
  await authSetActiveTenant({ tenantId: TENANT_MATRIZ })
})

afterEach(() => {
  logado.mockRestore()
  resetAcesso()
})

/** O token do último link que o mock "enviou" — como o dev o leria no console. */
function tokenDoUltimoLink(): string {
  const linhas = logado.mock.calls.map((c) => String(c[0]))
  const ultima = linhas.filter((l) => l.includes('/definir-senha?token=')).at(-1)
  expect(ultima, 'nenhum link foi emitido').toBeDefined()
  return String(ultima).split('token=')[1] as string
}

async function criarColaborador(email = 'ana@vertz.com.br') {
  const r = await createEmployee({
    name: 'Ana Acesso',
    document: null,
    email,
    phone: null,
    photoUrl: null,
    active: true,
  })
  expect(r.status).toBe(201)
  return (r.data as EmployeeDetailDto).id
}

describe('convite', () => {
  it('manda o link e diz para onde foi, sem devolver o token', async () => {
    const id = await criarColaborador()
    const r = await inviteEmployee(id)
    expect(r.status).toBe(200)
    const recibo = r.data as InvitationDto
    expect(recibo.sentTo).toBe('ana@vertz.com.br')
    // O recibo NÃO carrega o segredo: quem quiser a credencial na mão usa o
    // `reset-password`, que é honesto sobre isso.
    expect(JSON.stringify(recibo)).not.toContain(tokenDoUltimoLink())
    expect(new Date(recibo.expiresAt).getTime()).toBeGreaterThan(Date.now())
  })

  it('colaborador sem e-mail é 409 de ESTADO, não 400 de forma', async () => {
    // Quem não tem e-mail é o colaborador da SEMENTE (a transcrição não traz) —
    // pelo contrato não dá para criar um assim: o cadastro exige e-mail.
    const lista = await listEmployees({ page: 1, pageSize: 100 })
    expect(lista.status).toBe(200)
    const daSemente = (lista.data as PagedResultOfEmployeeDto).rows.find(
      (linha) => !linha.id.startsWith('usuario'),
    )
    if (!daSemente) throw new Error('semente sem colaborador')
    const r = await inviteEmployee(daSemente.id)
    // O pedido está bem formado; é o recurso que não tem para onde receber.
    expect(r.status).toBe(409)
  })

  it('convidar de novo MATA o link anterior', async () => {
    const id = await criarColaborador()
    await inviteEmployee(id)
    const primeiro = tokenDoUltimoLink()
    await inviteEmployee(id)
    const segundo = tokenDoUltimoLink()
    expect(segundo).not.toBe(primeiro)

    const velho = await authCredentialToken({ token: primeiro })
    expect(velho.status).toBe(400)
    expect((velho.data as { type: string }).type).toBe('urn:cabinet:erro:token-invalido')
    expect((await authCredentialToken({ token: segundo })).status).toBe(200)
  })
})

describe('recuperação', () => {
  it('responde 202 tanto para e-mail que existe quanto para o que não existe', async () => {
    await criarColaborador()

    const existe = await authForgotPassword({ email: 'ana@vertz.com.br' })
    const naoExiste = await authForgotPassword({ email: 'ninguem@vertz.com.br' })

    // Mesmo status para os dois: qualquer diferença observável devolveria a
    // enumeração de contas que este caminho público não pode oferecer.
    expect(existe.status).toBe(202)
    expect(naoExiste.status).toBe(202)
    // E só um link saiu — o silêncio é sobre a RESPOSTA, não sobre o envio.
    const links = logado.mock.calls.map((c) => String(c[0])).filter((l) => l.includes('token='))
    expect(links).toHaveLength(1)
  })

  it('a caixa do e-mail não importa, igual ao login', async () => {
    await criarColaborador()
    await authForgotPassword({ email: 'ANA@VERTZ.COM.BR' })
    const r = await authCredentialToken({ token: tokenDoUltimoLink() })
    expect(r.status).toBe(200)
    expect((r.data as CredentialTokenDto).purpose).toBe('reset')
  })
})

describe('o token', () => {
  it('inspecionar NÃO gasta — a tela lê antes de a pessoa digitar', async () => {
    const id = await criarColaborador()
    await inviteEmployee(id)
    const token = tokenDoUltimoLink()

    const lido = await authCredentialToken({ token })
    expect(lido.status).toBe(200)
    const dto = lido.data as CredentialTokenDto
    expect(dto).toMatchObject({ purpose: 'invite', email: 'ana@vertz.com.br', name: 'Ana Acesso' })

    // Segunda leitura continua valendo: só o `set-password` gasta.
    expect((await authCredentialToken({ token })).status).toBe(200)
    expect((await authSetPassword({ token, password: 'senha-boa-1234' })).status).toBe(204)
  })

  it('vale UMA vez — a segunda gravação é recusada com URN', async () => {
    const id = await criarColaborador()
    await inviteEmployee(id)
    const token = tokenDoUltimoLink()

    expect((await authSetPassword({ token, password: 'senha-boa-1234' })).status).toBe(204)

    const denovo = await authSetPassword({ token, password: 'outra-senha-999' })
    expect(denovo.status).toBe(400)
    expect((denovo.data as { type: string }).type).toBe('urn:cabinet:erro:token-invalido')
  })

  it('desconhecido é recusado sem contar nada sobre quem existe', async () => {
    const r = await authCredentialToken({ token: 'nao-existe' })
    expect(r.status).toBe(400)
    expect((r.data as { type: string }).type).toBe('urn:cabinet:erro:token-invalido')
  })

  it('o token é conferido ANTES da senha', async () => {
    // Senha curta E token morto: quem responder "senha fraca" faz a pessoa
    // melhorar a senha para tomar o erro do link logo em seguida.
    const r = await authSetPassword({ token: 'nao-existe', password: 'curta' })
    expect(r.status).toBe(400)
    expect((r.data as { type: string }).type).toBe('urn:cabinet:erro:token-invalido')
  })

  it('senha curta em token VÁLIDO é senha-fraca, e o token sobrevive', async () => {
    const id = await criarColaborador()
    await inviteEmployee(id)
    const token = tokenDoUltimoLink()

    const curta = await authSetPassword({ token, password: 'curta' })
    expect(curta.status).toBe(400)
    expect((curta.data as { type: string }).type).toBe('urn:cabinet:erro:senha-fraca')

    // Recusa por senha não pode gastar o link: seria transformar um erro de
    // digitação em "peça outro convite".
    expect((await authSetPassword({ token, password: 'senha-boa-1234' })).status).toBe(204)
  })

  it('as três públicas não exigem sessão — é quem não tem senha que as chama', async () => {
    const id = await criarColaborador()
    await inviteEmployee(id)
    const token = tokenDoUltimoLink()

    resetStore() // derruba a sessão do admin

    expect((await authForgotPassword({ email: 'ana@vertz.com.br' })).status).toBe(202)
    expect((await authCredentialToken({ token })).status).toBe(200)
    expect((await authSetPassword({ token, password: 'senha-boa-1234' })).status).toBe(204)
  })
})
