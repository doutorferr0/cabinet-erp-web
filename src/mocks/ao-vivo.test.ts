import { http, passthrough } from 'msw'
import { setupServer } from 'msw/node'
import { beforeAll, describe, expect, it } from 'vitest'
import { handlers } from './api/handlers'
import { semearSessaoAutenticada } from './api/store'
import { ROTAS_DO_BACKEND, handlersDePassagem } from './rotas-do-backend'

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

const msw = setupServer(...handlersDePassagem(APP), ...handlers)

let cookie = ''

/**
 * Mede o BACKEND, não o mock.
 *
 * Os padrões da passagem começam com `*` e casam qualquer origem — inclusive a
 * do backend. Sem este `use()` explícito por chamada, medir `${BACKEND}/x` seria
 * atendido pelo próprio mock e o resultado pareceria integração. Custou uma
 * medição errada antes de aparecer, e reaparece toda vez que alguém acrescenta
 * uma asserção nova aqui.
 */
async function noBackend(metodo: 'get' | 'post', caminho: string, corpo?: unknown) {
  msw.use(http[metodo](`${BACKEND}${caminho}`, () => passthrough()))
  const init: RequestInit = { method: metodo.toUpperCase(), headers: { cookie } }
  if (corpo !== undefined) {
    init.headers = { 'content-type': 'application/json', cookie }
    init.body = JSON.stringify(corpo)
  }
  return fetch(`${BACKEND}${caminho}`, init)
}

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

  it('a LEITURA de produto passa inteira — listagem e detalhe do mesmo id', async () => {
    // O par importa mais que cada metade: com a listagem no servidor e o
    // detalhe no mock, `Alterar` pedia ao mock um uuid que só existe no
    // Postgres e o formulário nem abria.
    const lista = await fetch(`${APP}/api/products`, { headers: { cookie } })
    expect(lista.status).toBe(200)
    const { rows } = (await lista.json()) as { rows: { id: string }[] }
    const primeiro = rows[0]
    if (!primeiro) return // banco de dev vazio: nada a casar

    const detalhe = await fetch(`${APP}/api/products/${primeiro.id}`, { headers: { cookie } })
    expect(detalhe.status).toBe(200)
    expect((await detalhe.json()) as { id: string }).toMatchObject({ id: primeiro.id })
  })

  /**
   * O BLOCO 2, ligado em 2026-08-20 (obra `api#48`, contatos `api#53`).
   *
   * As duas famílias entraram inteiras, e é aqui que "inteira" deixa de ser
   * palavra: o registro é criado ATRAVÉS do app e relido DIRETO no backend. Se
   * o mock tivesse respondido a escrita, o id não existiria do outro lado.
   */
  it('a OBRA passa inteira — o que a tela cria existe no Postgres, pelo mesmo id', async () => {
    const parceiros = await fetch(`${APP}/api/partners?role=customer`, { headers: { cookie } })
    const cliente = ((await parceiros.json()) as { rows: { id: string }[] }).rows[0]
    if (!cliente) return // banco de dev sem cliente: nada a instalar

    const criado = await fetch(`${APP}/api/works`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({
        customerId: cliente.id,
        description: 'OBRA DA PROVA AO VIVO',
        workType: 'RESIDENCIAL',
        address: null,
        active: true,
      }),
    })
    expect(criado.status).toBe(201)
    const obra = (await criado.json()) as { id: string; customerName: string | null }

    // `customerName` é junção com `partners` — o mock semeia outros nomes, e
    // por isso o corpo distingue quem respondeu. Status 201 sozinho não.
    expect(obra.customerName).toBeTruthy()

    const direto = await noBackend('get', `/api/works/${obra.id}`)
    expect(direto.status, 'a obra criada pela tela não existe no backend').toBe(200)
    expect(await direto.json()).toMatchObject({
      id: obra.id,
      description: 'OBRA DA PROVA AO VIVO',
    })
  })

  it('os CONTATOS do parceiro passam — sub-recurso e dono vindo do mesmo lugar', async () => {
    const parceiros = await fetch(`${APP}/api/partners`, { headers: { cookie } })
    const parceiro = ((await parceiros.json()) as { rows: { id: string }[] }).rows[0]
    if (!parceiro) return

    const criado = await fetch(`${APP}/api/partners/${parceiro.id}/contacts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ name: 'CONTATO DA PROVA AO VIVO', role: 'COMPRAS', active: true }),
    })
    expect(criado.status).toBe(201)
    const contato = (await criado.json()) as { id: string }

    // A listagem lida DIRETO no backend tem de conter o que a tela gravou: é o
    // par (sub-recurso + dono) que a costura quebraria.
    const direto = (await (
      await noBackend('get', `/api/partners/${parceiro.id}/contacts`)
    ).json()) as { rows: { id: string }[] }
    expect(direto.rows.map((c) => c.id)).toContain(contato.id)
  })

  it('a ESCRITA de produto fica no mock — a divisão é por verbo', async () => {
    const corpo = { code: 'AO-VIVO-1', description: 'Só no mock', active: true }

    const pelaTela = await fetch(`${APP}/api/products`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify(corpo),
    })
    expect(pelaTela.status).toBe(201)

    // A ESCRITA JÁ EXISTE DO OUTRO LADO — medido em 2026-08-20 contra
    // `cabinet-erp-api` `33db0df`, onde `POST /api/products` responde 201 (e
    // 409 na segunda vez, por código repetido). O que este caso mede deixou de
    // ser "o backend não implementa" e passou a ser DÍVIDA: quem grava produto
    // na tela continua sendo o mock, porque a família de produto ainda tem
    // operação em 501 (variantes) e meia família é a costura que esta lista
    // existe para evitar.
    //
    // Asserção pelo que é verdade hoje: o servidor RESPONDE (não é 501) e a
    // passagem NÃO liga. No dia em que a família fechar, o segundo `expect`
    // fica vermelho e cobra a ligação — que é o serviço que ele presta.
    const noServidor = await noBackend('post', '/api/products', corpo)
    expect(noServidor.status, 'se voltou a ser 501, remeça a família').not.toBe(501)
    expect(
      ROTAS_DO_BACKEND.some((r) => r.metodo === 'post' && r.caminho === '/api/products'),
      'o backend já grava produto: ou liga a família inteira, ou este caso passa a mentir',
    ).toBe(false)
  })

  it('o ORÇAMENTO inteiro passa — listagem do servidor, com o shape do contrato', async () => {
    const r = await fetch(`${APP}/api/quotes`, { headers: { cookie } })
    expect(r.status).toBe(200)
    const corpo = (await r.json()) as {
      total: number
      rows: { id: string; customerName: string | null }[]
    }

    // PROVA POSITIVA de quem respondeu: a mesma consulta feita direto no
    // backend tem de dar o mesmo conjunto de ids. Comparar só o shape não
    // distingue mock de servidor — os dois montam `{rows,total}`, que é o
    // ponto do contrato.
    const direto = (await (await noBackend('get', '/api/quotes')).json()) as {
      total: number
      rows: { id: string }[]
    }
    expect(corpo.total).toBe(direto.total)
    expect(corpo.rows.map((l) => l.id)).toEqual(direto.rows.map((l) => l.id))

    // O dado do servidor traz `null` onde o mock sempre mandou valor. Quem
    // consome estas linhas é `quotes-api.ts`, e é ele que precisa aguentar.
    for (const linha of corpo.rows) expect(linha).toHaveProperty('customerName')
  })

  it('a ordenação do orçamento usa a whitelist do SERVIDOR — fora dela é 400', async () => {
    // `ORDENAVEIS_ORCAMENTO` do front e o `CAMPOS` do backend publicam os
    // mesmos cinco campos. Traduzir a coluna para português quebraria a
    // ordenação com 400 só ao clicar no cabeçalho — silencioso até o clique.
    const ok = await fetch(`${APP}/api/quotes?sortBy=customerName&sortDir=asc`, {
      headers: { cookie },
    })
    expect(ok.status).toBe(200)

    const fora = await fetch(`${APP}/api/quotes?sortBy=cliente`, { headers: { cookie } })
    expect(fora.status).toBe(400)
  })

  it('regravar o orçamento NÃO troca o nome do ambiente pelo código', async () => {
    // O defeito que ligar `/api/quotes` expôs: `environments` era derivado dos
    // itens, e a grade guarda o CÓDIGO — a escrita saía com `name: code`. Como
    // o `PUT` é integral, o servidor gravava o uuid por cima do nome congelado.
    // Só o par de verdade prova: o mock aceitava os dois.
    const parceiros = await fetch(`${APP}/api/partners?role=customer`, { headers: { cookie } })
    const cliente = ((await parceiros.json()) as { rows: { id: string }[] }).rows[0]
    if (!cliente) return // banco de dev sem cliente: nada a gravar

    const ambiente = {
      code: '9f1c7b20-3a55-4e18-8b90-6d2f4c1a7e33',
      name: 'SALA DE ESTAR',
      order: 1,
    }
    const corpo = {
      customerId: cliente.id,
      projectName: 'Prova ao vivo',
      discountMode: 'product',
      discountPercent: 0,
      environments: [ambiente],
      items: [
        {
          lineNumber: 1,
          environmentCode: ambiente.code,
          description: 'Pendente',
          quantity: 1,
          unitPriceCents: 10_000,
          discountPercent: 0,
        },
      ],
    }

    const criado = await fetch(`${APP}/api/quotes`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify(corpo),
    })
    expect(criado.status).toBe(201)
    const { id } = (await criado.json()) as { id: string }

    const regravado = await fetch(`${APP}/api/quotes/${id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify(corpo),
    })
    expect(regravado.status).toBe(200)
    expect(((await regravado.json()) as { environments: unknown[] }).environments).toEqual([
      ambiente,
    ])
  })

  it('tarefas e A fazer passam; os indicadores do dashboard continuam no mock', async () => {
    const tarefas = await fetch(`${APP}/api/tasks`, { headers: { cookie } })
    expect(tarefas.status).toBe(200)

    const todos = await fetch(`${APP}/api/todos`, { headers: { cookie } })
    expect(todos.status).toBe(200)

    // O resumo é painel próprio, com consulta própria e sem id em comum: o mock
    // responde e a tela monta. É o que separa este caso do funil.
    const resumo = await fetch(`${APP}/api/dashboard/summary`, { headers: { cookie } })
    expect(resumo.status).toBe(200)

    // MEDIDO em 2026-08-20: o backend passou a servir o resumo (200, com
    // números do Postgres) — era 501 quando este caso foi escrito. Continua
    // fora da passagem, e agora por decisão a tomar, não por ausência de
    // servidor. Ver `## Para o hub` da PR que ligou o bloco 2.
    expect((await noBackend('get', '/api/dashboard/summary')).status).not.toBe(501)
  })

  it('colaborador, atividades e listas de apoio vêm do SERVIDOR', async () => {
    // As três entraram na mesma leva, e a razão é uma só: o combo de
    // responsável (`listEmployees`) alimenta a atividade, e o catálogo
    // (`catalog-lookups`) alimenta setor e cargo do colaborador. Passar uma sem
    // as outras põe id do servidor de um lado e id do mock do outro.
    for (const caminho of ['/api/employees', '/api/activities', '/api/catalog-lookups']) {
      const pelaTela = await fetch(`${APP}${caminho}`, { headers: { cookie } })
      expect(pelaTela.status, caminho).toBe(200)

      // PROVA POSITIVA de quem respondeu: a mesma consulta direto no backend
      // tem de dar o mesmo total. O mock monta `{rows,total}` igualzinho, então
      // comparar shape não distinguiria nada.
      const direto = await (await noBackend('get', caminho)).json()
      const viaTela = (await pelaTela.json()) as { total: number }
      expect(viaTela.total, caminho).toBe((direto as { total: number }).total)
    }
  })

  it('o FUNIL passa pela metade, e é por isso que a tela avisa', async () => {
    // `pagina-do-funil.tsx` lê funis, estágios e oportunidades. O backend serve
    // os dois primeiros e responde 501 no terceiro — então o quadro recebe
    // colunas do Postgres e pede ao mock as oportunidades de um `pipelineId`
    // que o mock nunca viu. A resposta é lista vazia com status 200, e vazio
    // parece "não há negócio": `CoberturaDoFunil` é quem desfaz a leitura.
    const funis = await fetch(`${APP}/api/crm/pipelines`, { headers: { cookie } })
    expect(funis.status).toBe(200)

    const doBackend = (await (await noBackend('get', '/api/crm/pipelines')).json()) as {
      total: number
    }
    expect(((await funis.json()) as { total: number }).total).toBe(doBackend.total)

    // A outra metade continua no MOCK — mas não mais por falta de servidor.
    // MEDIDO em 2026-08-20: `GET /api/crm/opportunities` responde 200 com
    // oportunidades do Postgres. Enquanto a passagem não a liga, a costura que
    // `CoberturaDoFunil` descreve continua existindo, e agora ela é dívida
    // nossa, não do outro repo.
    const oportunidades = await fetch(`${APP}/api/crm/opportunities`, { headers: { cookie } })
    expect(oportunidades.status).toBe(200)
    expect((await noBackend('get', '/api/crm/opportunities')).status).not.toBe(501)
    expect(
      ROTAS_DO_BACKEND.some((r) => r.caminho === '/api/crm/opportunities'),
      'o funil pode fechar inteiro: o backend já serve oportunidades',
    ).toBe(false)
  })
})
