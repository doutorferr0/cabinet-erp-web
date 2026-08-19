import { readFileSync } from 'node:fs'
import { type Server, createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { setupServer } from 'msw/node'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { handlers } from './api/handlers'
import { resetStore, semearSessaoAutenticada } from './api/store'
import { ROTAS_DO_BACKEND, handlersDePassagem } from './rotas-do-backend'

/**
 * PROVA A DIVISÃO, não a lista.
 *
 * O risco desta rodada não é errar um caminho — é a divisão não existir: um
 * passthrough que na verdade responde pelo mock passaria por "integrado" no dia
 * da demonstração, e um mock que deixou de responder derrubaria tela que
 * funcionava. Os dois falham CALADOS, porque nos dois casos chega uma resposta
 * bem formada.
 *
 * Por isso aqui há um servidor HTTP de VERDADE (`node:http`, porta efêmera) em
 * vez de outro handler MSW fazendo de servidor: `passthrough()` significa
 * "saia para a rede", e só quem está do outro lado da rede pode testemunhar que
 * a requisição saiu. Handler nenhum consegue provar isso sobre si mesmo.
 */

const MARCA = 'backend-de-verdade'

let servidorDeVerdade: Server
let base: string

const msw = setupServer(...handlersDePassagem('http://backend-de-mentira'), ...handlers)

beforeAll(async () => {
  servidorDeVerdade = createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'application/json', 'x-origem': MARCA })
    res.end(JSON.stringify({ origem: MARCA, metodo: req.method, caminho: req.url }))
  })
  await new Promise<void>((ok) => servidorDeVerdade.listen(0, '127.0.0.1', ok))
  base = `http://127.0.0.1:${(servidorDeVerdade.address() as AddressInfo).port}`

  // `bypass`: o que não casar handler nenhum vai para a rede. É o padrão do
  // navegador em `worker.start()` e o que faz o servidor de verdade ser
  // alcançável — com `error`, o passthrough morreria antes de sair.
  msw.listen({ onUnhandledRequest: 'bypass' })
})

afterAll(async () => {
  msw.close()
  await new Promise<void>((ok) => servidorDeVerdade.close(() => ok()))
})

beforeEach(() => {
  resetStore()
  // O mock exige sessão nas rotas de domínio. Sem semear, ele responderia 401 e
  // o teste provaria só "não veio do servidor" — quero a prova positiva de que
  // o MOCK respondeu, com corpo dele.
  semearSessaoAutenticada()
})

describe('passthrough por rota', () => {
  it('rota da lista SAI para a rede — o servidor de verdade responde', async () => {
    const r = await fetch(`${base}/api/products`)

    expect(r.headers.get('x-origem')).toBe(MARCA)
    expect(await r.json()).toMatchObject({ origem: MARCA, metodo: 'GET' })
  })

  it('rota fora da lista é atendida pelo MOCK, sem tocar a rede', async () => {
    // `/api/crm/opportunities` é 501 no backend e por isso segue mockada — é o
    // caminho que sustenta o funil inteiro fora da lista de passagem.
    const r = await fetch(`${base}/api/crm/opportunities`)

    expect(r.headers.get('x-origem')).toBeNull()
    expect(r.status).toBe(200)
    // shape da listagem do contrato (`{ rows, total }`), que só o mock monta
    expect(await r.json()).toHaveProperty('rows')
  })

  it('a divisão é por VERBO, não por caminho: GET /api/products sai, POST fica', async () => {
    const escrita = await fetch(`${base}/api/products`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: 'PASS-1', description: 'Produto do teste', active: true }),
    })

    // O backend responde 501 em `POST /api/products`; deixar o verbo inteiro
    // passar quebraria o cadastro de produto para ganhar a consulta. O 201 com
    // id de mock (`prod...`) é a prova positiva de quem gravou.
    expect(escrita.headers.get('x-origem')).toBeNull()
    expect(escrita.status).toBe(201)
    expect(await escrita.json()).toMatchObject({ code: 'PASS-1' })
  })

  it('sem backend real a lista nasce VAZIA — é o que mantém o site público mock', () => {
    // `cabinetonline.cc` builda sem `VITE_API_PROXY`. Se a passagem fosse
    // montada mesmo assim, a tela publicada tentaria falar com um `localhost`
    // que não existe para quem abre o site — erro de rede em produção, e não
    // um mock respondendo. Enquanto a condição vivia numa expressão do
    // `browser.ts`, nada a testava: aquele arquivo importa `msw/browser` e não
    // roda em Node.
    expect(handlersDePassagem(undefined)).toEqual([])
    expect(handlersDePassagem('')).toEqual([])
    expect(handlersDePassagem('http://localhost:3000')).toHaveLength(ROTAS_DO_BACKEND.length)
  })

  it.each([
    // Cada par é uma tela que consome as duas metades. Meia passagem põe id do
    // servidor de um lado e id inventado do outro, e o resultado tem cara de
    // dado — não de erro. A regra é a mesma que o registry aplica ao `get`,
    // lida no tamanho da TELA.
    {
      tela: 'quadro do funil',
      metade: '/api/crm/pipelines',
      outraMetade: '/api/crm/opportunities',
    },
    {
      // `atividade-dialogo.tsx` escolhe o `assigneeEmployeeId` neste combo:
      // atividade real com pessoa do mock grava no Postgres um uuid que o
      // servidor não conhece, e o responsável volta em branco.
      tela: 'diálogo de atividade',
      metade: '/api/activities',
      outraMetade: '/api/employees',
    },
    {
      // `ActivityDto.entityType` inclui `opportunity`: atividade real pendurada
      // em oportunidade do mock é registro apontando para id inexistente.
      tela: 'atividade sobre oportunidade',
      metade: '/api/activities',
      outraMetade: '/api/crm/opportunities',
    },
  ])('$tela: $metade não entra sozinha, sem $outraMetade', ({ metade, outraMetade }) => {
    const listado = (caminho: string) =>
      ROTAS_DO_BACKEND.some((r) => r.caminho === caminho || r.caminho.startsWith(`${caminho}/`))

    if (listado(metade)) {
      expect(
        listado(outraMetade),
        `${metade} passa direto, mas ${outraMetade} continua no mock — a mesma tela lê as duas`,
      ).toBe(true)
    }
  })

  it('toda rota da lista existe no contrato — typo aqui seria silencioso', () => {
    const contrato = JSON.parse(readFileSync('contracts/openapi-v1.json', 'utf8')) as {
      paths: Record<string, Record<string, unknown>>
    }

    for (const { metodo, caminho } of ROTAS_DO_BACKEND) {
      // Caminho errado não derruba nada em tempo de execução: o padrão
      // simplesmente não casa, o mock responde no lugar e a integração parece
      // funcionar. O teste é o único lugar onde isso vira ruído.
      expect(contrato.paths[caminho], `caminho fora do contrato: ${caminho}`).toBeDefined()
      expect(
        contrato.paths[caminho]?.[metodo],
        `operação inexistente: ${metodo} ${caminho}`,
      ).toBeDefined()
    }
  })
})
