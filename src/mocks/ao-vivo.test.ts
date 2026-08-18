import { http, passthrough } from 'msw'
import { setupServer } from 'msw/node'
import { beforeAll, describe, expect, it } from 'vitest'
import { handlers } from './api/handlers'
import { semearSessaoAutenticada } from './api/store'
import { handlersDePassagem } from './rotas-do-backend'

/**
 * A PROVA AO VIVO — desligada por padrão, e é o único jeito honesto.
 *
 * `rotas-do-backend.test.ts` prova a DIVISÃO contra um servidor de mentira: que
 * o passthrough sai para a rede e que o resto fica no mock. O que ele não pode
 * provar é que do outro lado da rede existe um backend que ENTENDE o que sai —
 * a sessão por cookie, o shape da listagem, o 501 no que não foi implementado.
 * Isso exige o par local de pé, e por isso não pode viver na suíte: o CI não
 * tem Postgres, e teste que precisa de infra externa vira teste vermelho por
 * ambiente, que é como uma suíte aprende a ser ignorada.
 *
 *     # 1. backend
 *     cd ../cabinet-erp-api && cp .env.example .env && pnpm setup:dev && pnpm dev
 *     # 2. um usuário com senha de verdade (o banco de dev nasce VAZIO)
 *     #    ver CLAUDE.md §Provar contra o backend real
 *     # 3. front
 *     VITE_API_PROXY=http://localhost:3000 pnpm dev
 *     # 4. aqui
 *     CABINET_AO_VIVO=1 CABINET_SENHA='...' npx vitest run src/mocks/ao-vivo.test.ts
 *
 * Monta os MESMOS handlers que o `browser.ts` monta, na mesma ordem, e aponta
 * para o Vite — o que passa atravessa o proxy e chega no Postgres.
 */

const APP = process.env.CABINET_APP ?? 'http://localhost:5173'
const BACKEND = process.env.CABINET_BACKEND ?? 'http://localhost:3000'
const EMAIL = process.env.CABINET_EMAIL ?? 'demo@vertz.dev'
const SENHA = process.env.CABINET_SENHA ?? 'senha-de-desenvolvimento'

const msw = setupServer(...handlersDePassagem(), ...handlers)

let cookie = ''

describe.skipIf(!process.env.CABINET_AO_VIVO)('front + backend real', () => {
  beforeAll(async () => {
    msw.listen({ onUnhandledRequest: 'bypass' })
    // as rotas que seguem mockadas exigem sessão do MOCK; a de verdade vem do
    // cookie, e as duas coexistem sem se ver
    semearSessaoAutenticada()

    const login = await fetch(`${APP}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: SENHA }),
    })
    expect(login.status, 'login real falhou — backend no ar? usuário semeado?').toBe(200)
    cookie = login.headers.get('set-cookie')?.split(';')[0] ?? ''
  })

  it('o login real emite o cookie de sessão, e ele atravessa o proxy', () => {
    // Em Node o cookie é reenviado à mão; no navegador quem faz isso é o
    // `credentials: 'include'` do transporte. O que se prova aqui é o que o
    // proxy preserva: o `Set-Cookie` chega do outro lado íntegro.
    expect(cookie).toMatch(/^cabinet_sessao=.+/)
  })

  it('/auth/me responde com a sessão do BANCO, não do store', async () => {
    const r = await fetch(`${APP}/auth/me`, { headers: { cookie } })
    expect(r.status).toBe(200)
    const corpo = (await r.json()) as { activeTenantId: string; employeeId: string }
    expect(corpo.employeeId).toBeTruthy()
    expect(corpo.activeTenantId).toBeTruthy()
  })

  it('GET /api/products vem do BACKEND — códigos que só existem no Postgres', async () => {
    const r = await fetch(`${APP}/api/products`, { headers: { cookie } })
    expect(r.status).toBe(200)
    const corpo = (await r.json()) as { rows: { code: string }[] }
    // o seed do mock usa outros códigos; um deles aqui significaria que o
    // passthrough não aconteceu
    expect(corpo.rows.some((p) => p.code.startsWith('LUM-'))).toBe(true)
  })

  it('GET /api/quotes fica no MOCK — no backend a mesma rota é 501', async () => {
    const pelaTela = await fetch(`${APP}/api/quotes`, { headers: { cookie } })
    expect(pelaTela.status).toBe(200)
    expect(await pelaTela.json()).toHaveProperty('rows')

    // **A armadilha de medição desta bateria:** os padrões do mock começam com
    // `*`, então casam QUALQUER origem — inclusive o endereço do backend. Sem
    // este `use()` explícito, a chamada abaixo seria atendida pelo próprio mock
    // e o teste "provaria" um 200 que o servidor nunca deu. Custou uma medição
    // errada antes de aparecer.
    msw.use(http.get(`${BACKEND}/api/quotes`, () => passthrough()))
    const noBackend = await fetch(`${BACKEND}/api/quotes`, { headers: { cookie } })
    expect(noBackend.status).toBe(501)
  })

  it('POST /api/products fica no mock — a divisão é por verbo', async () => {
    const corpo = { code: 'AO-VIVO-1', description: 'Só no mock', active: true }

    const pelaTela = await fetch(`${APP}/api/products`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify(corpo),
    })
    expect(pelaTela.status).toBe(201)

    msw.use(http.post(`${BACKEND}/api/products`, () => passthrough()))
    const noBackend = await fetch(`${BACKEND}/api/products`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify(corpo),
    })
    // GET passa, POST não: o backend ainda não implementa a escrita, e é por
    // isso que o caminho inteiro não pode entrar na lista.
    expect(noBackend.status).toBe(501)
  })
})
