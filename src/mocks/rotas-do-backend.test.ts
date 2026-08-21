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
    // `/api/crm/opportunities` segue mockada — não por 501 (o backend a serve
    // desde `3af4f01`), e sim porque a família dela não fechou. É o caminho que
    // sustenta o funil inteiro fora da lista de passagem.
    const r = await fetch(`${base}/api/crm/opportunities`)

    expect(r.headers.get('x-origem')).toBeNull()
    expect(r.status).toBe(200)
    // shape da listagem do contrato (`{ rows, total }`), que só o mock monta
    expect(await r.json()).toHaveProperty('rows')
  })

  /**
   * A GUARDA QUE MEDE MEIA FAMÍLIA.
   *
   * Aqui vivia um teste de "divisão por VERBO": `GET /api/products` saía e
   * `POST` ficava, e o caso existia porque o backend respondia 501 na escrita.
   * Ele deixou de existir — produto foi inteiro (#274) —, e ao procurar outro
   * exemplo apareceu o último caminho partido da lista: `GET
   * /api/catalog-lookups` atravessava e a escrita ficava no mock.
   *
   * **Ninguém tinha visto, porque o sintoma não é erro.** Com o par local de
   * pé, o operador cadastrava um setor pelo `+...` do `LookupCombo`, recebia
   * 201 do mock, e o item não aparecia no combo — que lê do servidor. Item que
   * some depois de gravar.
   *
   * Então o teste trocou de pergunta, e a nova é mais forte que a antiga: em
   * vez de conferir UM exemplo de divisão, conferir que **nenhum caminho do
   * contrato está partido**. É a regra "a unidade de ligação é a FAMÍLIA" dita
   * em código, e ela não envelhece com a lista — caminho novo entra na conta
   * sozinho.
   */
  it('nenhum caminho do contrato fica PARTIDO por verbo', () => {
    const contrato = JSON.parse(readFileSync('contracts/openapi-v1.json', 'utf8')) as {
      paths: Record<string, Record<string, unknown>>
    }
    const VERBOS = ['get', 'post', 'put', 'patch', 'delete']

    const partidos: string[] = []
    for (const [caminho, operacoes] of Object.entries(contrato.paths)) {
      const metodos = Object.keys(operacoes).filter((m) => VERBOS.includes(m))
      const dentro = metodos.filter((m) =>
        ROTAS_DO_BACKEND.some((r) => r.caminho === caminho && r.metodo === m),
      )
      if (dentro.length > 0 && dentro.length !== metodos.length) {
        const fora = metodos.filter((m) => !dentro.includes(m))
        partidos.push(`${caminho}: passa ${dentro.join('/')}, fica ${fora.join('/')}`)
      }
    }

    expect(
      partidos,
      'caminho com um verbo na passagem e outro no mock: a tela lê de um lado e grava no outro',
    ).toEqual([])
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
    //
    // Estes pares estão CUMPRIDOS hoje (as duas metades passam): o teste existe
    // para o dia em que alguém tirar uma delas da lista, que é quando a costura
    // reaparece calada.
    {
      // `atividade-dialogo.tsx` escolhe o `assigneeEmployeeId` neste combo:
      // atividade real com pessoa do mock grava no Postgres um uuid que o
      // servidor não conhece, e o responsável volta em branco.
      tela: 'diálogo de atividade',
      metade: '/api/activities',
      outraMetade: '/api/employees',
    },
    {
      // `catalog-lookups` é a raiz de quase todo combo. Catálogo mockado ao
      // lado de registro do servidor faz `sectorId`/`jobTitleId` apontarem para
      // id que o mock nunca viu, e o rótulo sai em branco na leitura.
      tela: 'cadastro de colaborador',
      metade: '/api/employees',
      outraMetade: '/api/catalog-lookups',
    },
    {
      // O orçamento resolve o cliente por `customerId`: linha do servidor com
      // parceiro do mock mostraria documento sem nome de cliente.
      tela: 'orçamento',
      metade: '/api/quotes',
      outraMetade: '/api/partners',
    },
    {
      // A grade de contatos vive DENTRO do cadastro do parceiro, e o `PUT` de
      // contato leva o `partnerId` no caminho: contato do mock pendurado em
      // parceiro do servidor gravaria em um id que o outro lado não conhece.
      tela: 'contatos do parceiro',
      metade: '/api/partners/{partnerId}/contacts',
      outraMetade: '/api/partners',
    },
    {
      // A obra aponta o cliente por `customerId` e a listagem devolve
      // `customerName` resolvido por junção: obra do servidor com parceiro do
      // mock mostraria obra sem dono.
      tela: 'obra do cliente',
      metade: '/api/works',
      outraMetade: '/api/partners',
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

  /**
   * AS DUAS COSTURAS que a passagem por família deixou, e as duas são
   * deliberadas.
   *
   * Ligar família servida ao lado de família em 501 (ou de tela ainda mockada)
   * deixa costura, e costura ESCONDIDA é o defeito que esta lista existe para
   * evitar. As duas foram para a tela, que é onde o operador as vê. Este teste
   * amarra as pontas: tirar o aviso enquanto a metade faltar tem de doer.
   */
  it.each([
    {
      // O quadro do funil recebe colunas do servidor e pede as oportunidades ao
      // mock, que nunca viu aquele `pipelineId`: lista vazia com status 200 — e
      // vazio se lê como "não há negócio".
      costura: 'quadro do funil',
      passa: '/api/crm/pipelines',
      falta: '/api/crm/opportunities',
      tela: 'src/features/crm/pagina-do-funil.tsx',
      aviso: '<CoberturaDoFunil />',
    },
    {
      // `listEmployees` passa (as atividades dependem dele), mas
      // `data.colaboradores` ainda é provider de mock: duas listas de quem
      // trabalha aqui, cada tela mostrando uma.
      costura: 'cadastro de colaborador',
      passa: '/api/employees',
      falta: '/api/employees/{id}-na-tela',
      tela: 'src/routes/cadastros/colaboradores/index.tsx',
      aviso: '<CoberturaDoColaborador />',
    },
  ])('$costura: passa pela metade, então a tela AVISA', ({ passa, tela, aviso }) => {
    const passaMesmo = ROTAS_DO_BACKEND.some((r) => r.caminho.startsWith(passa))
    if (!passaMesmo) return

    expect(
      readFileSync(tela, 'utf8').includes(aviso),
      `${passa} passa e ${tela} não avisa — o operador lê a metade como se fosse o todo`,
    ).toBe(true)
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

  /**
   * O BLOCO 2 FOI LIGADO, e agora o risco trocou de lado.
   *
   * Enquanto `api#48`/`api#53` não existiam, a lista `ROTAS_DO_BLOCO_2` vivia
   * separada e o teste garantia que ninguém a ligasse cedo — rota adiantada
   * tira o mock e entrega 501 à tela. Medido o par local em 2026-08-20, as
   * sete entraram em `ROTAS_DO_BACKEND` e a constante morreu junto.
   *
   * O que este teste passa a proteger é o inverso: que elas continuem lá, e
   * INTEIRAS. Tirar uma volta a pôr id do servidor de um lado e id do mock do
   * outro, que é a costura calada de sempre.
   */
  it.each([
    { familia: 'obra', caminhos: ['/api/works', '/api/works/{id}'] },
    {
      familia: 'contatos do parceiro',
      caminhos: [
        '/api/partners/{partnerId}/contacts',
        '/api/partners/{partnerId}/contacts/{contactId}',
      ],
    },
    {
      // A família de produto é a maior ligada até aqui, e a mais fácil de
      // partir pela metade: o mesmo botão grava o produto e depois as
      // variantes, e o kardex pende da variante. Meia família aqui poria
      // `productId` do Postgres na grade que o mock guarda.
      familia: 'produto',
      caminhos: [
        '/api/products',
        '/api/products/{id}',
        '/api/products/{productId}/variants',
        '/api/products/{productId}/variants/{id}',
        '/api/variants/{variantId}/stock-movements',
      ],
    },
  ])('$familia passa INTEIRA — nenhuma operação dela ficou no mock', ({ caminhos }) => {
    const contrato = JSON.parse(readFileSync('contracts/openapi-v1.json', 'utf8')) as {
      paths: Record<string, Record<string, unknown>>
    }

    // A conta sai do CONTRATO, não de uma lista escrita aqui: operação nova no
    // caminho (um `delete` de contato, por exemplo) entra na verificação
    // sozinha, e a família só continua inteira se ela também for ligada.
    for (const caminho of caminhos) {
      for (const metodo of Object.keys(contrato.paths[caminho] ?? {})) {
        expect(
          ROTAS_DO_BACKEND.some((r) => r.caminho === caminho && r.metodo === metodo),
          `${metodo.toUpperCase()} ${caminho} está no contrato e ficou fora da passagem`,
        ).toBe(true)
      }
    }
  })

  it('obra e contato SAEM para a rede — o mock não os responde mais', async () => {
    // A prova é a mesma das outras rotas ligadas: só quem está do outro lado da
    // rede pode testemunhar que a requisição saiu. Sem isto, "ligado" seria uma
    // linha numa lista que ninguém exercita.
    const obras = await fetch(`${base}/api/works`)
    expect(obras.headers.get('x-origem')).toBe(MARCA)
    expect(await obras.json()).toMatchObject({ origem: MARCA, metodo: 'GET' })

    const contatos = await fetch(`${base}/api/partners/parc-0001/contacts`)
    expect(contatos.headers.get('x-origem')).toBe(MARCA)

    // O sub-recurso passa no VERBO de escrita também — a grade do parceiro
    // grava contato, e meia família aqui gravaria no mock o que a tela leu do
    // servidor.
    const criado = await fetch(`${base}/api/partners/parc-0001/contacts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'CONTATO DA PASSAGEM', active: true }),
    })
    expect(criado.headers.get('x-origem')).toBe(MARCA)
    expect(await criado.json()).toMatchObject({ metodo: 'POST' })
  })

  it('a ESCRITA de produto SAI para a rede — junto com variante e kardex', async () => {
    // Até a #274 este era o caso contrário, e o teste acima provava que o POST
    // ficava. O que mudou não foi o desenho: foi o backend, que deixou de
    // responder 501 na gravação. Manter a leitura no servidor e a escrita no
    // mock passaria a ser o defeito — o operador consultaria o produto do
    // Postgres, gravaria no mock, e a alteração sumiria na leitura seguinte.
    const gravado = await fetch(`${base}/api/products`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: 'PASS-2', description: 'Produto do teste', active: true }),
    })
    expect(gravado.headers.get('x-origem')).toBe(MARCA)
    expect(await gravado.json()).toMatchObject({ metodo: 'POST' })

    // A variante é gravada pelo MESMO botão do produto: se ela ficasse, a grade
    // do formulário apontaria para um `productId` que o mock nunca viu.
    const variante = await fetch(`${base}/api/products/prod-1/variants`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ finish: 'X', size: 'M', active: true, priceCents: 1, minStock: 0 }),
    })
    expect(variante.headers.get('x-origem')).toBe(MARCA)

    // O kardex pende da variante, e o saldo é derivado dele.
    const kardex = await fetch(`${base}/api/variants/var-1/stock-movements`)
    expect(kardex.headers.get('x-origem')).toBe(MARCA)
  })
})
