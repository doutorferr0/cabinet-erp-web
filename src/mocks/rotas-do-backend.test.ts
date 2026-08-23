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

/**
 * Operações que o contrato publica e a passagem NÃO liga, com o motivo.
 *
 * Ficou vazia da #274 até a #292: o backend `3089106` não respondia 501 em
 * nenhuma das 78. Papéis e permissões reabrem a lista porque o contrato voltou
 * a andar na frente — é o estado normal deste repo, que é o DONO do contrato.
 *
 * **Medição (2026-08-22, `cabinet-erp-api` `92e61eb`):** não existe rota de
 * papéis no servidor — a busca por `api/roles` no repo inteiro devolve zero, e
 * a api#84 está ABERTA, com a fase 1 (catálogo + tabelas + enforcement) por
 * entregar. Não é nem o 501 da fase: é caminho que o servidor não tem. Ligar
 * qualquer uma destas tiraria o mock e entregaria 404 a uma tela que ainda nem
 * existe.
 *
 * Entrada nova aqui exige a medição junto, no comentário.
 */
const FORA_DE_PROPOSITO: readonly string[] = [
  'get /api/permissions',
  'get /api/roles',
  'post /api/roles',
  'get /api/roles/{id}',
  'put /api/roles/{id}',
  // Os DEPÓSITOS (#291). **A razão MUDOU, e a linha ficou:** a nota anterior
  // dizia "no servidor de hoje não há handler nenhum", e isso venceu.
  //
  // **REMEDIDO em 2026-08-23** contra `cabinet-erp-api` main `cc7ccd0`, par
  // local próprio (Postgres migrado até a `0057`, servidor em `:3020`, sessão
  // real de `semear-dev`): a fase 2 da api#79 ENTROU — migração `0030` e
  // `src/modules/estoque/{depositos,saldos}.ts`. As três LEITURAS respondem
  // 200 com dado do Postgres, e o `locationId` vem preenchido nas duas que o
  // carregam:
  //
  //   GET /api/stock-locations                      200 · 1 depósito (PRINCIPAL)
  //   GET /api/variants/{variantId}/stock-balances  200 · 1 linha, qty -10
  //   GET /api/variants/{variantId}/stock-movements 200 · 2 linhas com locationId
  //
  // As duas ESCRITAS respondem **403 `papel-insuficiente`**, e ali é DECISÃO,
  // não herança: `classificacao.ts` do api pede a ação `depositos:gerenciar`,
  // que só `Proprietário` e `Administrador` têm por `grants_all` — `Operação
  // completa` movimenta estoque sem redesenhar o galpão. O 403 não vai cair
  // sozinho como caiu o da lista de apoio.
  //
  //   POST /api/stock-locations       403 urn:cabinet:erro:papel-insuficiente
  //   PUT  /api/stock-locations/{id}  (mesma matriz, mesmo papel)
  //
  // Continuam FORA porque a família só sai INTEIRA — meia família põe id do
  // servidor de um lado e id inventado do outro —, e ligar as cinco com a
  // escrita em 403 é a mesma escolha que a lista de apoio fez uma vez: foi
  // DECISÃO do user, não default. Enquanto ela não vier, a tela de estoque
  // (`src/features/estoque/`) lê do mock, que serve os mesmos shapes.
  'get /api/stock-locations',
  'post /api/stock-locations',
  'put /api/stock-locations/{id}',
  'get /api/variants/{variantId}/stock-balances',
  // PAGAMENTO (S4) pela MESMA razão dos depósitos, e não pela do 501: o contrato
  // especifica agora o que a fase S4b da api vai implementar, e no servidor de
  // hoje não há handler nenhum.
  //
  // **Medição (2026-08-22, `cabinet-erp-api` `e47827e`):** `git grep` por
  // `payment-terms`, `installment-policy` e `PaymentTerm` em `src/` e `tests/`
  // devolve ZERO, e a cópia do contrato de lá tem 87 operações — as 87 de antes
  // desta PR. Não é o 501 da fase: é caminho que o servidor não tem, e o par
  // local devolve o 404 do Fastify. Ligar qualquer uma tiraria o mock e
  // entregaria 404 ao site público, que é 100% mock.
  //
  // Saem daqui em FAMÍLIA — as cinco juntas, e só quando as cinco responderem.
  // A condição sem a política deixaria o mock recusando um plano de 10x que o
  // servidor aceita (ou o contrário), e a divergência apareceria como 400 numa
  // gravação que a tela achava válida.
  'get /api/payment-terms',
  'post /api/payment-terms',
  'put /api/payment-terms/{id}',
  'get /api/installment-policy',
  'put /api/installment-policy',
  // Os SERVIÇOS (S2) pela MESMA razão dos depósitos, e não pela do 501: o
  // contrato os publica AGORA porque é ele que especifica o que o S2b vai
  // implementar do lado do api, e no servidor de hoje não há handler nenhum.
  //
  // **Medição (2026-08-22, `cabinet-erp-api` `e47827e`):** a busca por
  // `services` no repo inteiro do api devolve duas ocorrências, e as duas são
  // `services:` de `docker-compose` — não existe rota, não existe módulo, e a
  // cópia do contrato de lá ainda tem 78 operações. Não é nem o 501 da fase: é
  // caminho que o servidor não tem, e ligar qualquer uma tiraria o mock para
  // entregar 404 a uma tela que ainda nem existe.
  //
  // Saem daqui em FAMÍLIA, e só quando a família INTEIRA responder.
  'get /api/services',
  'post /api/services',
  'put /api/services/{id}',
  // Os RELATÓRIOS (#310) pela MESMA razão dos depósitos e do pagamento, e não
  // pela do 501: o contrato publica a família AGORA porque é ele que especifica
  // o que a Fase B do api vai implementar (módulo `reports` só-leitura,
  // api#111), e no servidor de hoje não há handler nenhum.
  //
  // **Medição (2026-08-22, `cabinet-erp-api` `0c8b13b`):** `git grep` por
  // `api/reports` em `src/` e `tests/` devolve ZERO, e a cópia do contrato de lá
  // tem 87 operações — as 87 de antes desta PR. Não é o 501 da fase: é caminho
  // que o servidor não tem, e o par local devolve o 404 do Fastify.
  //
  // Saem daqui em FAMÍLIA, e por uma razão própria desta: a tela de Relatórios
  // (Fase C) é UMA seção com dez abas. Ligar metade poria seis abas lendo o
  // Postgres e quatro lendo ficção na mesma tela, sem nada na interface
  // distinguindo as duas — que é a costura mais cara de perceber deste repo.
  'get /api/reports/abc-curve',
  'get /api/reports/products-sold',
  'get /api/reports/sales-comparison',
  'get /api/reports/salesperson-performance',
  'get /api/reports/professional-ranking',
  'get /api/reports/supplier-movement',
  'get /api/reports/stock-valuation',
  'get /api/reports/stock-aging',
  'get /api/reports/quote-vs-stock',
  'get /api/reports/birthdays',
  // O CICLO DE VIDA do documento de venda (G13) pela MESMA razão dos depósitos e
  // dos serviços, e não pela do 501: o contrato especifica agora o que a fase B
  // do api vai implementar, e no servidor de hoje não há handler nenhum.
  //
  // **Medição (2026-08-22, `cabinet-erp-api` `0c8b13b`):** `git grep` por
  // `conclude`, `demo-return`, `professional-history`, `revise` e `ConcludeOrder`
  // em `src/` e `tests/` devolve ZERO nas cinco buscas. Não é o 501 da fase: é
  // caminho que o servidor não tem, e o par local devolve o 404 do Fastify.
  //
  // **Estas NÃO saem em família com o resto de `/api/orders` e `/api/quotes`,** e
  // aqui a regra da família aponta para o outro lado: as famílias já estão na
  // passagem inteiras, e são as OPERAÇÕES novas que ainda não têm servidor.
  // Ligá-las junto tiraria o mock de rota nenhuma (não há mock de pedido) para
  // entregar 404 onde a tela esperaria documento.
  'post /api/orders/{id}/conclude',
  'post /api/orders/{id}/demo-return',
  'post /api/orders/{id}/professional',
  'get /api/orders/{id}/professional-history',
  'post /api/quotes/{id}/revise',
  // COMPRAS (G2) — as 14 operações do módulo. Respondem 501 hoje: o contrato
  // entrou primeiro, por decisão da fase, e o handler é a FASE B do trilho, no
  // `cabinet-erp-api`. Declaradas uma a uma, e não por prefixo, porque é assim
  // que a lista foi desenhada — prefixo esconderia a operação nova que nascesse
  // no mesmo caminho.
  'get /api/purchase-requests',
  'post /api/purchase-requests',
  'get /api/purchase-requests/{id}',
  'put /api/purchase-requests/{id}',
  'post /api/purchase-requests/{id}/cancel',
  'get /api/purchase-orders',
  'post /api/purchase-orders',
  'get /api/purchase-orders/{id}',
  'put /api/purchase-orders/{id}',
  'post /api/purchase-orders/{id}/send',
  'post /api/purchase-orders/{id}/reschedule',
  'post /api/purchase-orders/{id}/cancel',
  'get /api/purchases/arrival-forecast',
  'get /api/purchases/stock-replenishment',
]

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

  it('o MOCK continua íntegro — é ele quem serve o site público', async () => {
    // Este teste TROCOU de alvo na #274, e a troca é o fato mais importante
    // desta rodada. Ele provava "rota fora da lista é atendida pelo mock", e
    // usava `/api/crm/opportunities` como exemplo. **Não existe mais rota do
    // contrato fora da lista** — as 78 passam —, então o exemplo morreu e a
    // pergunta teve de mudar: o que ainda depende do mock?
    //
    // O SITE PÚBLICO. `cabinetonline.cc` builda sem `VITE_API_PROXY`, a
    // passagem nasce vazia lá e o mock serve tudo. Por isso a prova aqui é
    // montada SEM os handlers de passagem: é o worker do site publicado.
    const soMock = setupServer(...handlers)
    soMock.listen({ onUnhandledRequest: 'bypass' })
    try {
      const r = await fetch(`${base}/api/crm/opportunities`)

      expect(r.headers.get('x-origem')).toBeNull()
      expect(r.status).toBe(200)
      // shape da listagem do contrato (`{ rows, total }`), que só o mock monta
      expect(await r.json()).toHaveProperty('rows')
    } finally {
      soMock.close()
    }
  })

  it('a divisão continua sendo por VERBO — caminho com N verbos tem N entradas', () => {
    // Enquanto o backend respondia 501 na escrita, este teste exercitava a
    // divisão de verdade: `GET /api/products` saía e `POST /api/products`
    // ficava no mock. Hoje os dois saem, e exercitar deixou de ser possível —
    // mas a ESTRUTURA que tornava aquilo possível continua sendo o que segura
    // a próxima operação que nascer sem servidor, e é ela que se prova aqui.
    //
    // A conta sai do contrato: se um caminho publica quatro verbos, a lista tem
    // de trazer os quatro em linhas separadas. Uma entrada por caminho (em vez
    // de por par verbo+caminho) reabriria a porta que a divisão fechou.
    const contrato = JSON.parse(readFileSync('contracts/openapi-v1.json', 'utf8')) as {
      paths: Record<string, Record<string, unknown>>
    }
    const VERBOS = ['get', 'post', 'put', 'patch', 'delete']

    const multiverbo = Object.entries(contrato.paths).filter(
      ([, ops]) => Object.keys(ops).filter((m) => VERBOS.includes(m)).length > 1,
    )
    // Se isto zerar, o teste virou tautologia e alguém precisa saber.
    expect(multiverbo.length).toBeGreaterThan(0)

    for (const [caminho, ops] of multiverbo) {
      // Operação declarada fora de propósito sai da conta dos DOIS lados: ela
      // não está na lista de propósito, e cobrá-la aqui obrigaria a ligar rota
      // que o servidor não tem. A guarda que importa continua de pé — verbo do
      // mesmo caminho que o backend SERVE e alguém esqueceu segue reprovando.
      const noContrato = Object.keys(ops)
        .filter((m) => VERBOS.includes(m))
        .filter((m) => !FORA_DE_PROPOSITO.includes(`${m} ${caminho}`))
      const naLista = ROTAS_DO_BACKEND.filter((r) => r.caminho === caminho).map((r) => r.metodo)

      // Caminho INTEIRAMENTE fora da passagem é o outro estado legítimo: nasceu
      // no contrato antes de existir servidor, e o mock responde por ele todo.
      // O que este caso NÃO pode ser é esquecimento — quem o cobra é o
      // `FORA_DE_PROPOSITO` do teste abaixo, que exige a declaração operação a
      // operação. O que continua proibido aqui é a MEIA família.
      if (naLista.length === 0) continue

      expect(
        [...naLista].sort(),
        `${caminho} publica ${noContrato.join('/')} e a lista traz ${naLista.join('/') || 'nada'}`,
      ).toEqual([...noContrato].sort())
    }
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
   * A COSTURA QUE SOBROU — e ela não é mais desta lista.
   *
   * Eram duas. A do **quadro do funil** morreu na #274: as oportunidades
   * entraram na passagem junto com os motivos de perda e o `.../quote`, as duas
   * metades do quadro passaram a vir do mesmo lado e `cobertura-do-funil.tsx`
   * saiu inteiro — como o próprio componente dizia que sairia. O teste dele
   * saiu junto, e de propósito: um caso que só verifica um arquivo apagado
   * passa verde para sempre sem medir nada.
   *
   * A que fica é a do **colaborador**, e a diferença importa: as seis operações
   * de `/api/employees` passam desde antes, o buraco é do lado do MOCK (sem
   * handler de `GET /api/employees/{id}`, com duas sementes de pessoas que são
   * conjuntos diferentes). Enquanto `data.colaboradores` for provider de mock, a
   * tela tem de dizer isso ao operador — e tirar o aviso antes da hora tem de
   * doer.
   */
  it.each([
    {
      costura: 'cadastro de colaborador',
      passa: '/api/employees',
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

  it('o funil não avisa mais de uma falta que não existe', () => {
    // O CONTRÁRIO do teste acima, e a #274 precisou dos dois.
    //
    // `CoberturaDoFunil` dizia ao operador que "as oportunidades ainda não vêm
    // do servidor". Com a família ligada, isso virou falso — e aviso de falta
    // inexistente é a mesma mentira com o sinal trocado, com o agravante de
    // ensinar que avisos deste tipo podem ser ignorados. O próximo será de
    // verdade.
    const funilPassaInteiro = ['/api/crm/pipelines', '/api/crm/opportunities'].every((c) =>
      ROTAS_DO_BACKEND.some((r) => r.caminho.startsWith(c)),
    )
    if (!funilPassaInteiro) return

    // A prova é o IMPORT, não a string solta: a tela guarda no comentário o
    // registro de que o aviso existiu ali e por que saiu, e procurar o nome no
    // arquivo inteiro daria vermelho por causa da própria nota histórica.
    // Componente só monta se for importado.
    const tela = readFileSync('src/features/crm/pagina-do-funil.tsx', 'utf8')
    expect(
      /^import\s.*\bCoberturaDoFunil\b/m.test(tela),
      'o funil passa inteiro e a tela ainda monta o aviso da costura — ele descreve uma metade que não falta mais',
    ).toBe(false)
  })

  it('a passagem cobre o contrato INTEIRO — nenhuma operação ficou no mock', () => {
    // A GUARDA QUE SUBSTITUI A DÍVIDA.
    //
    // Enquanto o contrato era maior que o backend, o que precisava de guarda
    // era o excesso: rota adiantada tirava o mock e entregava 501 à tela. Com
    // as 78 ligadas (#274), o risco inverteu de lado e ficou mais silencioso:
    //
    // - **operação nova no contrato** que ninguém pôs aqui fica mockada no meio
    //   de uma passagem completa. A tela lê dado do Postgres em toda parte e
    //   ficção num canto só, e nada na interface distingue os dois.
    // - **linha removida daqui** por engano (num rebase, num conflito deste
    //   arquivo — que já teve três mãos no mesmo dia) produz exatamente a mesma
    //   costura, sem nenhum sintoma.
    //
    // Falhar aqui NÃO significa "acrescente a linha": significa medir a
    // operação nova contra o par local. Se ela responder 501, o certo é deixá-la
    // fora e escrever o porquê — e este teste é o lugar onde essa exceção tem de
    // ser declarada, para nunca ser um esquecimento passando por decisão.
    const contrato = JSON.parse(readFileSync('contracts/openapi-v1.json', 'utf8')) as {
      paths: Record<string, Record<string, unknown>>
    }
    const VERBOS = ['get', 'post', 'put', 'patch', 'delete']

    const naLista = new Set(ROTAS_DO_BACKEND.map((r) => `${r.metodo} ${r.caminho}`))
    const faltando: string[] = []

    for (const [caminho, ops] of Object.entries(contrato.paths)) {
      for (const metodo of Object.keys(ops)) {
        if (!VERBOS.includes(metodo)) continue
        const op = `${metodo} ${caminho}`
        if (!naLista.has(op) && !FORA_DE_PROPOSITO.includes(op)) faltando.push(op)
      }
    }

    expect(
      faltando,
      `operação no contrato e fora da passagem: ${faltando.join(', ')} — meça contra o par local antes de acrescentar, e se for 501 declare em FORA_DE_PROPOSITO com o motivo`,
    ).toEqual([])
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
   * FAMÍLIA INTEIRA — e agora o risco é só de REMOÇÃO.
   *
   * Enquanto `api#48`/`api#53` não existiam, a lista `ROTAS_DO_BLOCO_2` vivia
   * separada e o teste garantia que ninguém a ligasse cedo — rota adiantada
   * tira o mock e entrega 501 à tela. Medido o par local em 2026-08-20, as
   * sete entraram em `ROTAS_DO_BACKEND` e a constante morreu junto.
   *
   * O que este teste protege é o inverso: que elas continuem lá, e INTEIRAS.
   * Tirar uma volta a pôr id do servidor de um lado e id do mock do outro, que
   * é a costura calada de sempre.
   *
   * As famílias da #274 entraram aqui pelo mesmo motivo, e cada uma tem a sua
   * razão de não poder ser dividida — escritas no bloco de cada uma em
   * `rotas-do-backend.ts`. As mais frágeis: produto e variantes são gravados
   * pelo MESMO botão, e motivos de perda são o catálogo que a oportunidade
   * referencia por `lostReasonId`.
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
      familia: 'produto com variantes e kardex',
      caminhos: [
        '/api/products',
        '/api/products/{id}',
        '/api/products/{productId}/variants',
        '/api/products/{productId}/variants/{id}',
        '/api/variants/{variantId}/stock-movements',
      ],
    },
    {
      familia: 'oportunidades do CRM',
      caminhos: [
        '/api/crm/opportunities',
        '/api/crm/opportunities/{id}',
        '/api/crm/opportunities/{id}/stage',
        '/api/crm/opportunities/{id}/quote',
      ],
    },
    {
      familia: 'motivos de perda',
      caminhos: ['/api/crm/lost-reasons', '/api/crm/lost-reasons/{id}'],
    },
    { familia: 'dashboard', caminhos: ['/api/dashboard/summary', '/api/dashboard/agenda'] },
    {
      // Inteira INCLUSIVE a escrita. Ela entrou respondendo 403 por papel, e
      // ligamos assim mesmo porque mockar a gravação enquanto o servidor recusa
      // ensinaria que o `+...` funciona. O 403 caiu logo depois (`api#70`
      // afrouxou a matriz, que tinha `admin` por herança): medido em
      // `30a098e`, `POST` é 201 e `PUT` é 200.
      familia: 'listas de apoio',
      caminhos: ['/api/catalog-lookups', '/api/catalog-lookups/{id}'],
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

  it.each([
    // As cinco famílias que a #274 ligou, exercitadas na ROTA e não só na
    // lista: "ligado" numa constante que ninguém chama é uma linha, não uma
    // passagem. Cada caso é o caminho que a tela realmente pede.
    { familia: 'escrita de produto', metodo: 'POST', url: '/api/products' },
    { familia: 'variante', metodo: 'POST', url: '/api/products/prod-0001/variants' },
    { familia: 'kardex', metodo: 'GET', url: '/api/variants/var-0001/stock-movements' },
    { familia: 'indicadores', metodo: 'GET', url: '/api/dashboard/summary' },
    {
      familia: 'agenda',
      metodo: 'GET',
      url: '/api/dashboard/agenda?from=2026-08-01&to=2026-08-31',
    },
    { familia: 'oportunidades', metodo: 'GET', url: '/api/crm/opportunities' },
    {
      familia: 'oportunidade → orçamento',
      metodo: 'POST',
      url: '/api/crm/opportunities/opo-1/quote',
    },
    { familia: 'motivos de perda', metodo: 'GET', url: '/api/crm/lost-reasons' },
    {
      familia: 'relatório de perdas',
      metodo: 'GET',
      url: '/api/crm/reports/lost-reasons?from=2026-01-01&to=2026-12-31',
    },
    // A escrita de lookup sai para a rede: quem decide se ela é aceita é o
    // servidor, não o mock. Entrou quando ele ainda recusava com 403 por papel,
    // e continua valendo agora que ele aceita (`api#70`) — o que este teste
    // prova é a SAÍDA, e ela não depende da resposta.
    { familia: 'escrita de lista de apoio', metodo: 'POST', url: '/api/catalog-lookups' },
  ])('$familia ($metodo) SAI para a rede', async ({ metodo, url }) => {
    const init: RequestInit = { method: metodo }
    if (metodo === 'POST') {
      init.headers = { 'content-type': 'application/json' }
      // Corpo qualquer: quem responde aqui é o servidor de mentira, e o que se
      // mede é a requisição ter SAÍDO. O corpo válido importa na sonda contra o
      // par local, que é outro teste (`ao-vivo.test.ts`).
      init.body = JSON.stringify({ marca: MARCA })
    }
    const r = await fetch(base + url, init)

    expect(r.headers.get('x-origem')).toBe(MARCA)
    expect(await r.json()).toMatchObject({ origem: MARCA, metodo })
  })
})
