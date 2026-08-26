import { configurarApi } from '@/api/cliente'
import { listarContatos, sincronizarContatos } from '@/data/contatos-api'
import { renderRoute } from '@/test/utils'
import { screen } from '@testing-library/react'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * A FRONTEIRA DOS CONTATOS CONTRA O POSTGRES — desligada por padrão.
 *
 * `contatos-api.test.ts` prova a fronteira contra um servidor de mentira: que o
 * `POST` vai no caminho da coleção, que a linha sumida vira `PUT active:false`.
 * O que ele não pode provar é que do outro lado existe um backend que ENTENDE
 * isso — e, principalmente, **o que ele DEVOLVE na leitura**.
 *
 * É essa a razão de este arquivo existir separado do `ao-vivo.test.ts`: aquele
 * mede a PASSAGEM (a rota atravessa o proxy e chega no Postgres); este mede a
 * DECISÃO que a fronteira toma sobre o que chegou. A diferença apareceu na
 * medição de 2026-08-22 contra o par local: `GET .../contacts` devolveu QUATRO
 * contatos do cadastro semeado, **dois deles com `active: false`**. O contrato
 * não publica filtro de situação nessa operação, então quem separa é aqui — e
 * sem a separação a grade mostraria os dois removidos e o `Gravar` seguinte os
 * traria de volta vivos, desfazendo a remoção de outra pessoa.
 *
 * Não pode viver na suíte: o CI não tem Postgres, e teste que precisa de infra
 * externa vira vermelho por ambiente — que é como uma suíte aprende a ser
 * ignorada. Ver `src/mocks/ao-vivo.test.ts`, mesma disciplina.
 *
 *     cd ../cabinet-erp-api && pnpm dev          # :3000
 *     CABINET_AO_VIVO=1 npx vitest run src/data/contatos-ao-vivo.test.ts
 */

const BACKEND = process.env.CABINET_BACKEND ?? 'http://localhost:3000'
const EMAIL = process.env.CABINET_EMAIL ?? 'demo@vertz.dev'
const SENHA = process.env.CABINET_SENHA ?? 'senha-de-desenvolvimento'

/** Marca desta rodada nos registros que ela cria — some da grade no fim. */
const MARCA = 'AO VIVO CONTATOS'

/**
 * Nomes do PAR que o `beforeAll` garante existir. Ver `semearOPar`.
 *
 * Distintos entre si e da `MARCA` do ciclo: os três casos convivem no mesmo
 * cadastro, e um nome só faria a asserção de um caso casar com a linha de
 * outro.
 */
const NOME_ATIVO = 'AO VIVO ATIVO'
const NOME_INATIVO = 'AO VIVO REMOVIDO'

let cookie = ''
let partnerId = ''
/** Ids do par semeado — a régua de todos os casos que olham situação. */
let ativoId = ''
let inativoId = ''
const fetchOriginal = globalThis.fetch

describe.skipIf(!process.env.CABINET_AO_VIVO)('contatos contra o backend real', () => {
  beforeAll(async () => {
    const login = await fetchOriginal(`${BACKEND}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: SENHA }),
    })
    expect(login.status, 'login no par local — ver CLAUDE.md §Provar contra o backend real').toBe(
      200,
    )
    cookie = (login.headers.get('set-cookie') ?? '').split(';')[0] ?? ''
    expect(cookie).not.toBe('')

    /**
     * O cookie ENTRA por aqui, e não por `credentials: 'include'`.
     *
     * No navegador a sessão viaja sozinha porque `/api` sai da mesma origem da
     * página (é o que o proxy do Vite existe para garantir). Em Node não há
     * cookie jar: sem este envelope o cliente gerado chegaria ao backend sem
     * sessão e o teste mediria o 401, não a fronteira.
     */
    globalThis.fetch = ((entrada: RequestInfo | URL, init?: RequestInit) => {
      const requisicao = entrada instanceof Request ? entrada : new Request(String(entrada), init)
      requisicao.headers.set('cookie', cookie)
      return fetchOriginal(requisicao)
    }) as typeof fetch

    configurarApi(BACKEND)

    const lista = await fetchOriginal(`${BACKEND}/api/partners?role=supplier&pageSize=1`, {
      headers: { cookie },
    })
    const pagina = (await lista.json()) as { rows: { id: string }[] }
    partnerId = pagina.rows[0]?.id ?? ''
    expect(partnerId, 'o banco de dev precisa de ao menos um fornecedor semeado').not.toBe('')

    await semearOPar()
  })

  /**
   * O PAR ATIVO/INATIVO QUE OS CASOS MEDEM — semeado por ESTA rodada.
   *
   * ## Por que existe
   *
   * `semear-dev.ts` não escreve em `partner_contacts`: o fornecedor semeado
   * nasce com ZERO contatos (medido no par local em 2026-08-26, api `67aa331`).
   * Os casos abaixo pediam "qualquer ativo" e "qualquer inativo" do cadastro, e
   * em banco limpo os dois vinham `undefined` — o de tela morria com *"undefined
   * was passed instead of a matcher"*, e o de leitura reprovava na própria
   * pré-condição.
   *
   * Pior: rodando DUAS vezes seguidas, a segunda encontrava os inativos que a
   * primeira deixou (não há DELETE no contrato) e a pré-condição passava. O
   * caso media o resíduo da rodada anterior — verde que depende de ter rodado
   * antes é o tipo de verde que some quando alguém limpa o banco.
   *
   * ## Por que pelas ROTAS, e não por INSERT
   *
   * Semear por dentro do banco deixaria os casos verdes mesmo com `POST` e
   * `PUT` quebrados — o teste passaria por cima da porta que ele existe para
   * provar que está aberta. Aqui o próprio preparo exercita as duas operações
   * de escrita do sub-recurso, e é o primeiro lugar onde a rodada reprova se o
   * servidor deixar de aceitá-las.
   *
   * ## Idempotente de propósito
   *
   * Reaproveita o par quando ele já existe, em vez de empilhar uma dupla nova a
   * cada rodada: sem isto o cadastro de demonstração vira um depósito de linhas
   * de teste, e a grade que o operador abre no par local mostra vinte
   * `AO VIVO ...` antes do primeiro contato de verdade.
   *
   * O par, e SÓ o par. O caso do ciclo continua criando uma linha nova por
   * rodada e a deixando desativada no fim — é o preço de provar o `POST` num
   * contrato sem `DELETE`, e é deliberado. Quem rodar muitas vezes contra o
   * mesmo banco vai ver `AO VIVO CONTATOS` acumular; o par não acumula, e é ele
   * que os outros dois casos usam como régua.
   */
  async function semearOPar(): Promise<void> {
    const existentes = (await (
      await fetchOriginal(`${BACKEND}/api/partners/${partnerId}/contacts?pageSize=100`, {
        headers: { cookie },
      })
    ).json()) as { rows: { id: string; name: string; active: boolean }[] }

    async function garantir(nome: string, ativo: boolean): Promise<string> {
      const achado = existentes.rows.find((c) => c.name === nome)
      const corpo = JSON.stringify({
        name: nome,
        role: 'AO VIVO',
        phone: '1130009000',
        mobilePhone: null,
        fax: null,
        email: null,
        active: ativo,
      })
      if (achado) {
        // Reafirma a SITUAÇÃO: a rodada anterior pode ter deixado o ativo
        // desativado (o caso do ciclo mexe na lista inteira), e um par cuja
        // metade ativa não está ativa não é régua de nada.
        const resposta = await fetchOriginal(
          `${BACKEND}/api/partners/${partnerId}/contacts/${achado.id}`,
          { method: 'PUT', headers: { cookie, 'content-type': 'application/json' }, body: corpo },
        )
        expect(resposta.status, `PUT do contato ${nome} no par local`).toBe(200)
        return achado.id
      }
      const resposta = await fetchOriginal(`${BACKEND}/api/partners/${partnerId}/contacts`, {
        method: 'POST',
        headers: { cookie, 'content-type': 'application/json' },
        body: corpo,
      })
      expect(resposta.status, `POST do contato ${nome} no par local`).toBe(201)
      return ((await resposta.json()) as { id: string }).id
    }

    ativoId = await garantir(NOME_ATIVO, true)
    inativoId = await garantir(NOME_INATIVO, false)
  }

  afterAll(() => {
    globalThis.fetch = fetchOriginal
    configurarApi('/')
  })

  it('a leitura devolve só os ATIVOS, e o total do servidor denuncia o resto', async () => {
    // Prova positiva pelo BANCO, não pelo shape: o mock monta `{rows,total}`
    // igualzinho, então o que distingue é o conteúdo. Quem denuncia o resto é
    // a leitura CRUA logo abaixo — a fronteira devolve só os ativos, e a
    // diferença para o que o servidor guarda é o contato desativado.
    const linhas = await listarContatos(partnerId)
    // As DUAS metades, e nesta ordem: sem a primeira, "não contém o inativo"
    // passaria por a fronteira não ter devolvido nada.
    expect(linhas.map((l) => l.id)).toContain(ativoId)
    expect(linhas.map((l) => l.id)).not.toContain(inativoId)

    // Nenhum inativo atravessou: se um dia esta asserção cair, a grade está
    // prestes a ressuscitar contato removido no primeiro `Gravar`.
    const direto = await fetchOriginal(
      `${BACKEND}/api/partners/${partnerId}/contacts?pageSize=100`,
      { headers: { cookie } },
    )
    const todos = (await direto.json()) as { rows: { id: string; active: boolean }[] }
    const inativos = todos.rows.filter((c) => !c.active).map((c) => c.id)
    // O par semeado garante esta pré-condição — antes dele ela dependia de
    // resíduo de rodada anterior, e reprovava em banco limpo.
    expect(inativos, 'o par semeado precisa ter deixado um inativo').toContain(inativoId)
    for (const id of inativos) expect(linhas.map((l) => l.id)).not.toContain(id)
  })

  it('inclui, relê do servidor e remove — o ciclo inteiro da grade', async () => {
    const antes = await listarContatos(partnerId)

    // INCLUIR: linha nova (id nulo) é `POST` na coleção.
    await sincronizarContatos(partnerId, antes, [
      ...antes,
      {
        id: null,
        nome: MARCA,
        vinculo: 'COMPRAS',
        fone: '1130001000',
        celular: '',
        fax: '',
        email: '',
      },
    ])

    const comONovo = await listarContatos(partnerId)
    const criado = comONovo.find((l) => l.nome === MARCA)
    expect(criado, 'o contato incluído tem de voltar na leitura seguinte').toBeDefined()

    // ALTERAR: só a linha mexida vira `PUT`.
    await sincronizarContatos(
      partnerId,
      comONovo,
      comONovo.map((l) => (l.id === criado?.id ? { ...l, fone: '1140004000' } : l)),
    )
    const alterado = (await listarContatos(partnerId)).find((l) => l.id === criado?.id)
    expect(alterado?.fone).toBe('1140004000')

    // REMOVER: a linha sai da grade e o servidor recebe `active: false`. Não há
    // DELETE no contrato, e é isso que este passo prova contra o banco.
    const semEle = comONovo.filter((l) => l.id !== criado?.id)
    await sincronizarContatos(partnerId, comONovo, semEle)

    const depois = await listarContatos(partnerId)
    expect(depois.map((l) => l.id)).not.toContain(criado?.id)
    // Removido da grade, PRESENTE no servidor: desativação lógica, não exclusão.
    // A prova é a leitura CRUA — a linha continua lá, com `active: false`. É
    // mais forte que comparar totais: aponta o registro, não a contagem.
    const cru = await fetchOriginal(`${BACKEND}/api/partners/${partnerId}/contacts?pageSize=100`, {
      headers: { cookie },
    })
    const guardados = (await cru.json()) as { rows: { id: string; active: boolean }[] }
    const removido = guardados.rows.find((c) => c.id === criado?.id)
    expect(
      removido,
      'não há DELETE no contrato: o contato tem de continuar no servidor',
    ).toBeDefined()
    expect(removido?.active).toBe(false)
  })

  /**
   * A TELA, contra o Postgres — o degrau que os dois casos acima não alcançam.
   *
   * Eles medem a fronteira; este monta a ficha do fornecedor pelo router de
   * verdade e olha o que o operador veria. O `renderRoute` recebe um "stub" que
   * não é stub: ele troca o host de teste pelo do backend e injeta a sessão, de
   * modo que TODA requisição da tela — sessão, listas de apoio, o parceiro e os
   * contatos — sai para o Postgres.
   *
   * Curl no `:5173` não faria esse papel (armadilha 1 do current-state): o MSW
   * vive no navegador, e curl atravessaria o proxy medindo outra coisa.
   */
  it('a ficha do fornecedor mostra os contatos ativos do banco, e não os removidos', async () => {
    const doBackend = (entrada: RequestInfo | URL, init?: RequestInit) => {
      const requisicao = entrada instanceof Request ? entrada : new Request(String(entrada), init)
      const url = requisicao.url.replace('http://api.teste', BACKEND)
      const copia = new Request(url, requisicao)
      copia.headers.set('cookie', cookie)
      return fetchOriginal(copia)
    }

    const { user } = renderRoute(`/cadastros/fornecedores/${partnerId}`, doBackend)

    await user.click(await screen.findByRole('button', { name: 'Representante e contatos' }))

    // O par vem do `beforeAll`, com nome PRÓPRIO. Antes, o caso pegava "o
    // primeiro ativo" e "o primeiro inativo" do cadastro — e em banco limpo os
    // dois eram `undefined`, o que fazia o matcher morrer com *"undefined was
    // passed instead of a matcher"* em vez de dizer que faltava semente.
    const direto = await fetchOriginal(
      `${BACKEND}/api/partners/${partnerId}/contacts?pageSize=100`,
      { headers: { cookie } },
    )
    const todos = (await direto.json()) as { rows: { id: string; active: boolean }[] }
    expect(todos.rows.find((c) => c.id === ativoId)?.active, 'o par semeado').toBe(true)
    expect(todos.rows.find((c) => c.id === inativoId)?.active, 'o par semeado').toBe(false)

    // O nome que está no Postgres aparece na célula da grade.
    expect(await screen.findByDisplayValue(NOME_ATIVO)).toBeInTheDocument()
    // E o que foi removido não volta à tela — a desativação lógica se sustenta
    // do banco até a célula.
    expect(screen.queryByDisplayValue(NOME_INATIVO)).not.toBeInTheDocument()
  }, 30_000)
})
