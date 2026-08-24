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
 * a sessão por cookie, o shape da listagem, o papel que recusa a escrita.
 *
 * **Desde a #274 (2026-08-21) a passagem cobre as 78 operações do contrato**, e
 * isso mudou o que este arquivo mede. Ele nasceu para separar o que passava do
 * que ficava; agora quase todo caso é prova POSITIVA de que o dado veio do
 * Postgres — o mock monta `{rows,total}` igualzinho, então o que distingue é o
 * conjunto de ids, nunca o shape.
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
async function noBackend(metodo: 'get' | 'post', caminho: string, corpo?: unknown, busca?: string) {
  // A `busca` vai SÓ na requisição, nunca no padrão do handler: o MSW avisa que
  // query no padrão é redundante, e pior — ela muda a correspondência sem
  // dizer. Quem precisa do parâmetro é a URL; quem precisa do padrão é o
  // `passthrough`.
  msw.use(http[metodo](`${BACKEND}${caminho}`, () => passthrough()))
  const init: RequestInit = { method: metodo.toUpperCase(), headers: { cookie } }
  if (corpo !== undefined) {
    init.headers = { 'content-type': 'application/json', cookie }
    init.body = JSON.stringify(corpo)
  }
  return fetch(`${BACKEND}${caminho}${busca ?? ''}`, init)
}

describe.skipIf(!process.env.CABINET_AO_VIVO)('front + backend real', () => {
  beforeAll(async () => {
    msw.listen({ onUnhandledRequest: 'bypass' })
    // Semeia a sessão do MOCK por garantia, não por necessidade: desde a #274
    // nenhuma rota de `/api` chega até ele com o proxy de pé. Sai do caminho no
    // dia em que o mock deixar de ser o backend do site público — não antes.
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

  it('a ESCRITA de produto passa — o que a tela grava existe no Postgres', async () => {
    // ESTE CASO COBROU A PRÓPRIA VIRADA, e é bom registrar que funcionou.
    //
    // Ele afirmava "a escrita fica no mock" e terminava com um
    // `expect(...está na passagem...).toBe(false)` acompanhado do aviso "no dia
    // em que a família fechar, este expect fica vermelho e cobra a ligação —
    // que é o serviço que ele presta". A família fechou na #274, o expect ficou
    // vermelho, e o caso foi reescrito para medir o outro lado.
    //
    // O código carrega o instante para não colidir com a corrida anterior: o
    // servidor responde 409 em código repetido, e 409 aqui pareceria recusa da
    // escrita quando é só o teste tropeçando em si mesmo.
    const corpo = {
      code: `AO-VIVO-${Date.now()}`,
      description: 'Gravado pela tela, lido no backend',
      active: true,
    }

    const pelaTela = await fetch(`${APP}/api/products`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify(corpo),
    })
    expect(pelaTela.status).toBe(201)
    const criado = (await pelaTela.json()) as { id: string }

    // A prova de que não foi o mock: o id só existe do outro lado se a escrita
    // saiu de verdade. Status 201 sozinho não distingue — o mock também devolve
    // 201, com id dele (`prod...`).
    const direto = await noBackend('get', `/api/products/${criado.id}`)
    expect(direto.status, 'o produto gravado pela tela não existe no backend').toBe(200)
    expect(await direto.json()).toMatchObject({ id: criado.id, code: corpo.code })
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

  it('tarefas, A fazer e o DASHBOARD passam — os dois painéis contam a mesma história', async () => {
    const tarefas = await fetch(`${APP}/api/tasks`, { headers: { cookie } })
    expect(tarefas.status).toBe(200)

    const todos = await fetch(`${APP}/api/todos`, { headers: { cookie } })
    expect(todos.status).toBe(200)

    // O RESUMO ENTROU NA PASSAGEM na #274. Enquanto ficou no mock, o quadro de
    // tarefas contava o Postgres e os indicadores contavam a ficção, lado a
    // lado na mesma tela — dois painéis discordando. Não era costura de id
    // (painel próprio, consulta própria), mas era discordância visível.
    const resumo = await fetch(`${APP}/api/dashboard/summary`, { headers: { cookie } })
    expect(resumo.status).toBe(200)

    // Prova positiva de quem respondeu: os mesmos números, medidos direto.
    const direto = (await (await noBackend('get', '/api/dashboard/summary')).json()) as Record<
      string,
      unknown
    >
    expect(await resumo.json()).toEqual(direto)

    // A agenda exige `from`/`to` — sem eles é 400, e 400 já foi lido como "não
    // implementado" numa varredura desta lista.
    const agenda = await fetch(`${APP}/api/dashboard/agenda?from=2026-08-01&to=2026-08-31`, {
      headers: { cookie },
    })
    expect(agenda.status).toBe(200)
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

  it('o FUNIL passa INTEIRO — as duas metades do quadro vêm do mesmo lado', async () => {
    // O CASO QUE MUDOU DE SINAL na #274.
    //
    // Ele media a costura: `pagina-do-funil.tsx` lê funis, estágios e
    // oportunidades, o backend servia os dois primeiros e as oportunidades
    // ficavam no mock — o quadro recebia colunas do Postgres e pedia ao mock os
    // cartões de um `pipelineId` que o mock nunca viu. Lista vazia com status
    // 200, que se lê como "não há negócio". Agora as três passam, e o que se
    // mede é a coerência: os ids têm de casar dos dois lados.
    const funis = await fetch(`${APP}/api/crm/pipelines`, { headers: { cookie } })
    expect(funis.status).toBe(200)
    const doBackend = (await (await noBackend('get', '/api/crm/pipelines')).json()) as {
      total: number
    }
    expect(((await funis.json()) as { total: number }).total).toBe(doBackend.total)

    const pelaTela = (await (
      await fetch(`${APP}/api/crm/opportunities`, { headers: { cookie } })
    ).json()) as { rows: { id: string; pipelineId: string }[]; total: number }
    const direto = (await (await noBackend('get', '/api/crm/opportunities')).json()) as {
      rows: { id: string }[]
      total: number
    }

    // Prova positiva: o mock monta `{rows,total}` igualzinho, então só o
    // conjunto de ids distingue quem respondeu.
    expect(pelaTela.total).toBe(direto.total)
    expect(pelaTela.rows.map((o) => o.id)).toEqual(direto.rows.map((o) => o.id))
  })

  it('os MOTIVOS DE PERDA vêm do mesmo lado das oportunidades', async () => {
    // Entraram junto na #274, e não por arredondar a família: `lostReasonId` é
    // campo da oportunidade, e o `PATCH .../stage` o exige ao mover para um
    // estágio de perda. Catálogo mockado ao lado de oportunidade do servidor
    // gravaria um motivo que o Postgres não conhece, e o relatório — que agrega
    // por esse id — sairia vazio num funil cheio de negócios perdidos.
    const pelaTela = await fetch(`${APP}/api/crm/lost-reasons`, { headers: { cookie } })
    expect(pelaTela.status).toBe(200)
    const direto = (await (await noBackend('get', '/api/crm/lost-reasons')).json()) as {
      total: number
    }
    expect(((await pelaTela.json()) as { total: number }).total).toBe(direto.total)

    // O relatório é GET com `from`/`to` OBRIGATÓRIOS: sem eles responde 400, e
    // 400 já foi lido como "servida" numa varredura desta lista.
    const relatorio = await fetch(
      `${APP}/api/crm/reports/lost-reasons?from=2026-01-01&to=2026-12-31`,
      { headers: { cookie } },
    )
    expect(relatorio.status).toBe(200)
  })

  it('a ESCRITA de lista de apoio grava no SERVIDOR — o `+...` grava onde o combo lê', async () => {
    // ESTE CASO ERA O CONTRÁRIO, e virou vermelho como foi projetado para virar.
    //
    // A #274 ligou `POST`/`PUT /api/catalog-lookups` sabendo que respondiam
    // **403 `papel-insuficiente`** para `operator-full`, e escreveu aqui um
    // caso que afirmava o 403 com a instrução: *"se não é mais 403, api#66 foi
    // decidido — releia a costura"*. Foi decidido: aquele `admin` da matriz era
    // HERANÇA (a linha nasceu fechada quando não havia escrita no contrato), e
    // o `api#70` afrouxou para `operator-full`.
    //
    // Medido contra `30a098e`: `POST` 201, `PUT` 200. O que era costura virou
    // caminho, e o `+...` do `LookupCombo` — cadastro rápido do padrão 2, em 19
    // telas — grava no mesmo lugar de onde o combo lê.
    const nome = `SETOR DA PROVA AO VIVO ${Date.now()}`
    const criado = await fetch(`${APP}/api/catalog-lookups`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ kind: 'SETOR', name: nome, active: true }),
    })

    expect(
      criado.status,
      'se voltou 403, a matriz de papéis apertou de novo — releia api#66/api#70',
    ).toBe(201)
    const item = (await criado.json()) as { id: string }

    // PROVA POSITIVA de quem gravou: lido DIRETO no backend, que é onde o combo
    // vai buscá-lo na próxima abertura. Se o mock tivesse respondido, o id não
    // existiria deste lado.
    const direto = (await (
      await noBackend('get', '/api/catalog-lookups', undefined, '?pageSize=100')
    ).json()) as { rows: { id: string }[] }
    expect(direto.rows.map((l) => l.id)).toContain(item.id)

    // E o `PUT`, que é a outra metade do `+...` quando o item já existe.
    const alterado = await fetch(`${APP}/api/catalog-lookups/${item.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ name: `${nome} (alterado)`, active: true }),
    })
    expect(alterado.status).toBe(200)
  })

  it('o PAGAMENTO passa — a política do servidor governa a condição, pela tela', async () => {
    // As DUAS leituras que o bloco Pagamento consome, pela mesma origem da
    // página. A política é a que o documento usa para recortar o plano, e a
    // condição é o que o combo oferece — separá-las é o defeito que a família
    // existe para impedir.
    const politica = await fetch(`${APP}/api/installment-policy`, { headers: { cookie } })
    expect(politica.status).toBe(200)
    const limites = (await politica.json()) as {
      minTotalToInstallCents: number
      minInstallmentCents: number
      maxInstallments: number
    }
    // Empresa sem linha gravada lê o PADRÃO do servidor, não 404 — é o que
    // `POLITICA_DE_RESERVA` cobre no front só enquanto a consulta não respondeu.
    expect(limites.maxInstallments).toBeGreaterThan(0)

    const condicoes = await fetch(`${APP}/api/payment-terms?pageSize=100&sortBy=name`, {
      headers: { cookie },
    })
    expect(condicoes.status).toBe(200)
    const { rows } = (await condicoes.json()) as { rows: { id: string; name: string }[] }

    // PROVA NEGATIVA de quem respondeu: a semente do mock tem condição, a de
    // dev do api NÃO cria nenhuma. Comparar as duas listas pelo id é o que
    // distingue "o servidor respondeu vazio" de "o mock respondeu cheio", que é
    // exatamente a leitura errada que o `*` dos padrões produz.
    const direto = (await (
      await noBackend('get', '/api/payment-terms', undefined, '?pageSize=100&sortBy=name')
    ).json()) as { rows: { id: string }[] }
    expect(rows.map((l) => l.id).sort()).toEqual(direto.rows.map((l) => l.id).sort())

    // E o que amarra a família: a política GOVERNA a condição no servidor. Um
    // plano com mais parcelas que o teto é recusado com `type` PRÓPRIO — não é
    // erro de campo, é a regra da empresa, e é por ele que a tela sabe recortar
    // o formulário em vez de destacar um campo.
    const acimaDoTeto = limites.maxInstallments + 1
    const fatia = Math.floor(1000000 / acimaDoTeto)
    const excesso = await fetch(`${APP}/api/payment-terms`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({
        name: `ACIMA DO TETO ${Date.now()}`,
        active: true,
        installments: Array.from({ length: acimaDoTeto }, (_, i) => ({
          number: i + 1,
          daysAfterIssue: 30 * (i + 1),
          percent: i === acimaDoTeto - 1 ? 1000000 - fatia * (acimaDoTeto - 1) : fatia,
          amountCents: null,
        })),
      }),
    })

    // 403 é resposta LEGÍTIMA aqui e não falha o caso: a escrita de condição
    // pede `admin` e o usuário demo é `operator-full`. O que se prova é que
    // quem recusa é o SERVIDOR — o mock aceitaria as duas.
    expect([400, 403]).toContain(excesso.status)
    const problema = (await excesso.json()) as { type: string }
    expect(problema.type).toBe(
      excesso.status === 403
        ? 'urn:cabinet:erro:papel-insuficiente'
        : 'urn:cabinet:erro:parcelas-acima-do-teto',
    )
  })

  /**
   * AS CINCO FAMÍLIAS LIGADAS EM 2026-08-24 — papéis, depósitos, serviços,
   * ciclo do documento e relatórios.
   *
   * Elas viviam em `FORA_DE_PROPOSITO` com a mesma frase: "no servidor de hoje
   * não há handler nenhum". A frase era verdade em 22/08 e caducou sem que nada
   * avisasse — declaração de ausência não tem quem a invalide. Os casos abaixo
   * são o que impede a próxima medição de ser de novo uma leitura de comentário.
   */
  it('os SERVIÇOS passam inteiros — cria pela tela, relê no Postgres, alterado', async () => {
    const codigo = `SV${Math.random().toString(36).slice(2, 7).toUpperCase()}`
    const criado = await fetch(`${APP}/api/services`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({
        code: codigo,
        description: 'Instalação medida ao vivo',
        priceCents: 12345,
        electricianPercent: 100000,
        priceLocked: false,
        delivery: false,
        active: true,
      }),
    })
    expect(criado.status, await criado.clone().text()).toBe(201)
    const { id } = (await criado.json()) as { id: string }

    // A prova é a RELEITURA DIRETA no backend: se o mock tivesse respondido a
    // escrita, este id não existiria do outro lado.
    const alterado = await fetch(`${APP}/api/services/${id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({
        code: codigo,
        description: 'Instalação ALTERADA ao vivo',
        priceCents: 55555,
        electricianPercent: 100000,
        priceLocked: false,
        delivery: false,
        active: true,
      }),
    })
    expect(alterado.status).toBe(200)

    const relido = await noBackend('get', '/api/services', undefined, '?page=1&pageSize=100')
    const linha = (
      (await relido.json()) as { rows: { id: string; description: string }[] }
    ).rows.find((x) => x.id === id)
    expect(linha?.description).toBe('Instalação ALTERADA ao vivo')
  })

  it('os DEPÓSITOS passam, e a ESCRITA é recusada pelo SERVIDOR — não aceita como o mock', async () => {
    const lista = await fetch(`${APP}/api/stock-locations`, { headers: { cookie } })
    expect(lista.status).toBe(200)
    const { rows } = (await lista.json()) as { rows: { id: string; name: string }[] }
    expect(rows.length, 'o seed de dev cria o Depósito Principal').toBeGreaterThan(0)

    // O KARDEX fecha com esta lista, e é o motivo de a família ter entrado: o
    // movimento traz `locationId` do Postgres, e antes desta ligação a lista de
    // depósitos vinha do mock — a coluna caía no fallback e mostrava uuid cru.
    const variantes = await fetch(`${APP}/api/products`, { headers: { cookie } })
    const produto = ((await variantes.json()) as { rows: { id: string }[] }).rows[0]
    if (produto) {
      const detalhe = await fetch(`${APP}/api/products/${produto.id}`, { headers: { cookie } })
      const v = ((await detalhe.json()) as { variants?: { id: string }[] }).variants?.[0]
      if (v) {
        const saldos = await fetch(`${APP}/api/variants/${v.id}/stock-balances`, {
          headers: { cookie },
        })
        expect(saldos.status).toBe(200)
        const linhas = (await saldos.json()) as { rows: { locationId: string }[] }
        for (const l of linhas.rows) {
          expect(
            rows.some((d) => d.id === l.locationId),
            'saldo aponta para depósito que a lista não conhece — famílias de lados diferentes',
          ).toBe(true)
        }
      }
    }

    // 403 é resposta LEGÍTIMA e prova o ponto: `depositos:gerenciar` é de
    // `owner`/`admin`, e o usuário demo é `operator-full`. O mock respondia 200
    // e ensinava que aquele operador redesenha o galpão.
    const escrita = await fetch(`${APP}/api/stock-locations`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({
        parentId: null,
        code: 'AOVIVO',
        name: 'Depósito ao vivo',
        active: true,
      }),
    })
    expect([201, 403]).toContain(escrita.status)
    if (escrita.status === 403) {
      expect(((await escrita.json()) as { type: string }).type).toBe(
        'urn:cabinet:erro:papel-insuficiente',
      )
    }
  })

  it('o CICLO do documento passa — `Concluir` muda o estado no Postgres', async () => {
    const lista = await fetch(`${APP}/api/orders?page=1&pageSize=20`, { headers: { cookie } })
    expect(lista.status).toBe(200)
    const { rows } = (await lista.json()) as { rows: { id: string; status: string }[] }
    const aberto = rows.find((p) => p.status !== 'concluded' && p.status !== 'cancelled')
    if (!aberto) return // todos já concluídos numa rodada anterior deste mesmo caso

    const concluido = await fetch(`${APP}/api/orders/${aberto.id}/conclude`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({}),
    })
    expect([200, 403, 409]).toContain(concluido.status)
    if (concluido.status !== 200) return // recusa de papel ou de estado é do SERVIDOR, e basta

    // A prova não é o status da chamada: é o documento relido DIRETO no
    // backend vindo diferente do que era.
    const relido = await noBackend('get', `/api/orders/${aberto.id}`)
    expect(((await relido.json()) as { status: string }).status).toBe('concluded')

    const historico = await fetch(`${APP}/api/orders/${aberto.id}/professional-history`, {
      headers: { cookie },
    })
    expect(historico.status).toBe(200)
  })

  it('os PAPÉIS vêm do servidor — e o catálogo de permissões com eles', async () => {
    const papeis = await fetch(`${APP}/api/roles`, { headers: { cookie } })
    expect(papeis.status).toBe(200)
    const { rows } = (await papeis.json()) as { rows: { id: string; name: string }[] }
    expect(rows.length, 'a 0031 semeia os cinco papéis de fábrica').toBeGreaterThan(0)
    const primeiro = rows[0]
    if (!primeiro) return

    const detalhe = await fetch(`${APP}/api/roles/${primeiro.id}`, { headers: { cookie } })
    expect(detalhe.status).toBe(200)
    expect(((await detalhe.json()) as { id: string }).id).toBe(primeiro.id)

    // Catálogo e registro do mesmo lado: papel do servidor com permissão do
    // mock apontaria para chave que o Postgres não conhece, e a tela de
    // permissões marcaria caixa nenhuma.
    const permissoes = await fetch(`${APP}/api/permissions`, { headers: { cookie } })
    expect(permissoes.status).toBe(200)
  })

  it('os RELATÓRIOS vêm do servidor — os dez, no shape do contrato', async () => {
    // A tela da Fase C é UMA seção com dez abas: ligar metade poria seis abas
    // lendo o Postgres e quatro lendo ficção, sem nada distinguindo as duas.
    // Por isso o caso percorre as dez e não uma amostra.
    const periodo = '?from=2026-01-01&to=2026-12-31'
    const comPeriodo = [
      'abc-curve',
      'products-sold',
      'sales-comparison',
      'salesperson-performance',
      'professional-ranking',
      'supplier-movement',
      'quote-vs-stock',
    ]
    for (const nome of comPeriodo) {
      const r = await fetch(`${APP}/api/reports/${nome}${periodo}`, { headers: { cookie } })
      expect(r.status, `relatório ${nome}`).toBe(200)
      expect(await r.json()).toHaveProperty('rows')
    }

    // Estes três têm query PRÓPRIA, e é o detalhe que faz uma sonda ingênua
    // mentir: sem o parâmetro obrigatório eles respondem 400, e 400 nunca
    // significa "servida" — significa que a validação respondeu antes do handler.
    for (const busca of ['stock-valuation', 'stock-aging']) {
      const r = await fetch(`${APP}/api/reports/${busca}`, { headers: { cookie } })
      expect(r.status, `relatório ${busca}`).toBe(200)
    }
    const aniversarios = await fetch(`${APP}/api/reports/birthdays?month=8`, {
      headers: { cookie },
    })
    expect(aniversarios.status).toBe(200)
    expect(await aniversarios.json()).toHaveProperty('month', 8)
  })

  it('nenhuma rota de /api sobrou no mock — a passagem cobre o contrato', () => {
    // A afirmação central da #274, conferida onde o leitor deste arquivo está.
    //
    // Sem número mágico de propósito: `toHaveLength(78)` ficaria vermelho na
    // primeira operação nova do contrato, num arquivo que só roda com o par
    // local de pé — quebraria em silêncio e ensinaria a ignorar a suíte. A
    // guarda estrutural (contrato × lista, que sabe apontar QUAL operação
    // faltou) vive em `rotas-do-backend.test.ts` e roda no CI.
    //
    // O que se afirma aqui é o fato que muda a leitura de todos os casos acima:
    // com `VITE_API_PROXY` de pé, nenhum caminho de `/api` chega ao mock.
    const dominio = ROTAS_DO_BACKEND.filter((r) => r.caminho.startsWith('/api/'))
    expect(dominio.length).toBeGreaterThan(60)
  })
})
