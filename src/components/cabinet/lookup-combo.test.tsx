import { configurarApi } from '@/api/cliente'
import { LookupCombo } from '@/components/cabinet/lookup-combo'
import { instalarServidor, json, problema } from '@/test/servidor'
import { renderWithQuery } from '@/test/utils'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * As opções vêm do backend (ADR-011, endpoint `/api/catalog-lookups`).
 *
 * O teste intercepta o `fetch`, e não o SDK gerado, de propósito: assim ele
 * exercita o CLIENTE GERADO de verdade — se o codegen mudar a URL, o nome do
 * parâmetro ou a forma da resposta, isto quebra. Dublar o SDK esconderia
 * exatamente a fronteira que este teste existe para vigiar.
 */
const OPCOES = ['EVOLED', 'STELLA']

function respostaDaApi(nomes: readonly string[]) {
  return new Response(
    JSON.stringify({
      rows: nomes.map((name, i) => ({ id: `id-${i}`, kind: 'MARCA', name, active: true })),
      total: nomes.length,
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )
}

function Harness({ kind = 'marca' as const }) {
  const [value, setValue] = useState<string | null>(null)
  return (
    <div>
      <LookupCombo kind={kind} value={value} onChange={setValue} />
      <output data-testid="valor">{value ?? ''}</output>
    </div>
  )
}

let chamadas: string[] = []

/** O papel do vínculo que o dublê declara; o `+...` depende dele. */
let papelDaSessao = 'admin'

const TENANT = 'tenant-teste'

function respostaJson(corpo: unknown) {
  return new Response(JSON.stringify(corpo), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

/**
 * O dublê responde POR ROTA, e não a mesma coisa para tudo.
 *
 * Ele já foi um `fetch` que devolvia a lista de apoio para qualquer URL. Isso
 * bastou enquanto o combo pedia uma coisa só; hoje ele também pergunta o PAPEL
 * do vínculo, para esconder o `+...` de quem não escreve lista de apoio. Com o
 * dublê cego, `/auth/tenants` respondia `{rows,total}` onde o código espera um
 * array de vínculos — e o sintoma era `empresas.find is not a function`, um
 * TypeError que não fala de papel nem de sessão.
 *
 * Responder por rota é o que o teste já dizia querer no cabeçalho: exercitar o
 * cliente gerado de verdade. Um dublê que casa qualquer caminho não exercita
 * caminho nenhum.
 */
function dublarFetch(deLookup: () => Response) {
  vi.stubGlobal(
    'fetch',
    vi.fn((entrada: RequestInfo | URL) => {
      const url = String(entrada instanceof Request ? entrada.url : entrada)
      if (url.includes('/auth/tenants')) {
        return Promise.resolve(
          respostaJson([{ tenantId: TENANT, tradeName: 'Matriz', role: papelDaSessao }]),
        )
      }
      if (url.includes('/auth/me')) {
        return Promise.resolve(respostaJson({ activeTenantId: TENANT }))
      }
      // `chamadas` conta só as da LISTA DE APOIO — é sobre elas que as
      // asserções de URL falam, e somar as de sessão faria "uma requisição"
      // virar três sem nada ter mudado no que o teste mede.
      chamadas.push(url)
      return Promise.resolve(deLookup())
    }),
  )
}

beforeEach(() => {
  chamadas = []
  papelDaSessao = 'admin'
  configurarApi('http://api.teste')
  dublarFetch(() => respostaDaApi(OPCOES))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/**
 * Abre o cadastro rápido — que na 2.0 é um ITEM da lista, não um botão ao lado.
 *
 * O `...` saiu na D16: ele era um segundo alvo, fora do popover, para uma ação
 * que só faz sentido depois de o operador procurar e não achar. Inline, a saída
 * está onde a procura terminou — e o caminho do teste passa a ser o caminho da
 * pessoa: abre o combo, não acha, cadastra.
 */
async function abrirCadastroRapido(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: /Selecione marca/i }))
  await user.click(await screen.findByText(/Cadastrar marca/i))
}

describe('LookupCombo', () => {
  it('pede ao backend o kind certo, dentro do teto do contrato', async () => {
    renderWithQuery(<Harness />)

    await waitFor(() => expect(chamadas).toHaveLength(1))

    const url = new URL(chamadas[0] as string)
    expect(url.pathname).toBe('/api/catalog-lookups')

    // O front nomeia em camelCase; o banco, em MAIÚSCULA_COM_UNDERSCORE.
    expect(url.searchParams.get('kind')).toBe('MARCA')

    // Teto do contrato de listagem. Lista de apoio maior que isso deixou de ser
    // lista de apoio — vira busca, e aí o componente é outro.
    expect(url.searchParams.get('pageSize')).toBe('100')
  })

  it('escolhe pelo ID e mostra o NOME (issue #94)', async () => {
    const { user } = renderWithQuery(<Harness />)

    await user.click(screen.getByRole('button', { name: /Selecione marca/i }))
    await user.click(await screen.findByRole('menuitem', { name: /STELLA/ }))

    // O que vai para o formulário é o id — antes ia o nome, e o submit tinha de
    // traduzir de volta. É a mudança inteira da issue, em uma asserção.
    expect(screen.getByTestId('valor')).toHaveTextContent('id-1')
    // E o botão continua mostrando o nome: o operador nunca vê a chave.
    expect(screen.getByRole('button', { name: /STELLA/ })).toBeInTheDocument()
  })

  it('id fora da lista exibe o rótulo que o registro trouxe', async () => {
    // Item desativado depois de gravado, ou lista cortada no teto de 100. Sem o
    // rótulo de reserva o campo abriria em branco — e gravar de novo apagaria
    // um valor que ninguém pediu para apagar.
    renderWithQuery(
      <LookupCombo
        kind="marca"
        value="id-de-marca-aposentada"
        rotulo="MARCA ANTIGA"
        onChange={() => {}}
      />,
    )

    expect(await screen.findByRole('button', { name: /MARCA ANTIGA/ })).toBeInTheDocument()
  })

  it('sem rótulo de reserva, id desconhecido não vira texto cru na tela', async () => {
    renderWithQuery(<LookupCombo kind="marca" value="id-orfao" onChange={() => {}} />)

    // Mostrar o uuid seria pior que o placeholder: o operador leria uma chave
    // achando que é o valor. Aqui ele vê que não há escolha feita.
    expect(await screen.findByRole('button', { name: /Selecione marca/i })).toBeInTheDocument()
  })

  /**
   * O `+...` VIRA `POST /api/catalog-lookups` (#254).
   *
   * Era estado local: o combo inventava `novo:<kind>:<NOME>`, punha na lista e
   * o formulário gravava essa string. Desde que `categoryId`/`specifierId`
   * entraram no contrato como uuid (#250), esse id ia no corpo do `PUT` — o
   * operador via o nome que escolheu e o servidor recebia uma referência que
   * combo nenhum relê.
   *
   * Os três testes abaixo medem o CORPO da requisição e o que o campo passou a
   * valer, não o status: 201 e 409 com o campo em branco seriam os dois
   * "passou" de um teste que só olha o número da resposta.
   */
  it('cadastra pelo servidor e escolhe o item que ELE devolveu', async () => {
    const { user } = renderWithQuery(<Harness />)
    await waitFor(() => expect(chamadas).toHaveLength(1))

    // Instalado no meio: o GET já respondeu, e agora o servidor precisa saber
    // responder ao POST e devolver a lista JÁ com o item novo — é a releitura
    // que prova que o cadastro existe do lado de lá.
    const criado = { id: 'id-do-servidor', kind: 'MARCA', name: 'MARCA NOVA X', active: true }
    const servidor = instalarServidor(
      {
        '/api/catalog-lookups': (chamada) => {
          if (chamada.metodo === 'POST') return json(criado, 201)
          return json({
            rows: [
              ...OPCOES.map((name, i) => ({ id: `id-${i}`, kind: 'MARCA', name, active: true })),
              criado,
            ],
            total: 3,
          })
        },
      },
      'http://api.teste',
    )

    await abrirCadastroRapido(user)
    await user.type(screen.getByLabelText(/^Nome/), 'Marca Nova X')
    await user.click(screen.getByRole('button', { name: 'Gravar' }))

    const post = servidor.em('/api/catalog-lookups').find((c) => c.metodo === 'POST')
    // Vocabulário de apoio é caixa alta no legado inteiro; `active` viaja
    // explícito porque o contrato o exige explícito.
    expect(post?.corpo).toEqual({ kind: 'MARCA', name: 'MARCA NOVA X', active: true })

    // O id gravado é o do SERVIDOR — não um inventado aqui.
    await waitFor(() => expect(screen.getByTestId('valor')).toHaveTextContent('id-do-servidor'))
    expect(screen.getByRole('button', { name: /MARCA NOVA X/ })).toBeInTheDocument()
  })

  it('409 escolhe o item que já existe, em vez de dizer que falhou', async () => {
    const { user } = renderWithQuery(<Harness />)
    await waitFor(() => expect(chamadas).toHaveLength(1))

    instalarServidor(
      {
        '/api/catalog-lookups': (chamada) => {
          if (chamada.metodo === 'POST') {
            return problema(409, 'Já existe "STELLA" na lista MARCA.', 'Conflict')
          }
          return respostaDaApi(OPCOES)
        },
      },
      'http://api.teste',
    )

    await abrirCadastroRapido(user)
    await user.type(screen.getByLabelText(/^Nome/), 'Stella')
    await user.click(screen.getByRole('button', { name: 'Gravar' }))

    // O contrato diz que o 409 NÃO carrega o id: quem acha o item existente é o
    // cliente, pelo nome, na lista que já tem. Cadastrar de novo seria o par
    // duplicado que o 409 existe para impedir.
    await waitFor(() => expect(screen.getByTestId('valor')).toHaveTextContent('id-1'))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('409 de item FORA da lista carregada não escolhe nada — e diz por quê', async () => {
    const { user } = renderWithQuery(<Harness />)
    await waitFor(() => expect(chamadas).toHaveLength(1))

    instalarServidor(
      {
        '/api/catalog-lookups': (chamada) => {
          if (chamada.metodo === 'POST') {
            return problema(409, 'Já existe "MARCA APOSENTADA" na lista MARCA.', 'Conflict')
          }
          return respostaDaApi(OPCOES)
        },
      },
      'http://api.teste',
    )

    await abrirCadastroRapido(user)
    await user.type(screen.getByLabelText(/^Nome/), 'Marca Aposentada')
    await user.click(screen.getByRole('button', { name: 'Gravar' }))

    // Item desativado, ou lista cortada no teto de 100. Escolher um id chutado
    // gravaria a referência errada; ficar calado mandaria o operador cadastrar
    // de novo o que já existe.
    expect(await screen.findByRole('alert')).toHaveTextContent(/fora das opções carregadas/i)
    expect(screen.getByTestId('valor')).toHaveTextContent('')
  })

  /**
   * **409 NÃO É UM ERRO SÓ** (#269). O contrato o descreve como o conflito de
   * sete coisas, e quem diz QUAL é o `type` — `status` só agrupa.
   *
   * O caso que este teste fixa é real e chegava até a tela: operador recém-
   * criado, ainda sem empresa escolhida, clica no `+...`. O servidor responde
   * 409 `sem-empresa-ativa`, e enquanto o combo lia só o número ele anunciava
   * "já existe MARCA NOVA" — um item que ninguém cadastrou, numa lista onde o
   * operador não vai achar nada. A recusa por nome repetido é a GENÉRICA
   * (`about:blank`), porque o vocabulário não reserva URN para ela.
   */
  it('409 `sem-empresa-ativa` NÃO é duplicado: não escolhe item nenhum', async () => {
    const { user } = renderWithQuery(<Harness />)
    await waitFor(() => expect(chamadas).toHaveLength(1))

    instalarServidor(
      {
        '/api/catalog-lookups': (chamada) => {
          if (chamada.metodo === 'POST') {
            return new Response(
              JSON.stringify({
                type: 'urn:cabinet:erro:sem-empresa-ativa',
                title: 'Nenhuma empresa ativa',
                status: 409,
                detail: 'Nenhuma empresa ativa na sessão.',
              }),
              { status: 409, headers: { 'content-type': 'application/problem+json' } },
            )
          }
          return respostaDaApi(OPCOES)
        },
      },
      'http://api.teste',
    )

    await abrirCadastroRapido(user)
    await user.type(screen.getByLabelText(/^Nome/), 'Stella')
    await user.click(screen.getByRole('button', { name: 'Gravar' }))

    // Falha de verdade: o diálogo continua aberto e nada foi escolhido. O que
    // NÃO pode acontecer é o campo passar a valer `id-1` — seria o combo
    // afirmando que "STELLA" foi recusada por já existir.
    expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível cadastrar/i)
    expect(screen.getByTestId('valor')).toHaveTextContent('')
  })

  it('busca filtra as opções', async () => {
    const { user } = renderWithQuery(<Harness />)

    await user.click(screen.getByRole('button', { name: /Selecione marca/i }))
    await user.type(screen.getByPlaceholderText(/buscar marca/i), 'evo')

    expect(await screen.findByRole('menuitem', { name: /EVOLED/ })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /STELLA/ })).not.toBeInTheDocument()
  })

  // A busca do combo filtra só o que chegou. Com a lista cortada, o item
  // procurado pode nem estar ali — e sem aviso o operador cadastraria duplicado
  // pelo botão "...".
  it('avisa quando a lista veio cortada no teto do contrato', async () => {
    dublarFetch(() =>
      respostaJson({
        rows: OPCOES.map((name, i) => ({ id: `id-${i}`, kind: 'MARCA', name, active: true })),
        total: 240,
      }),
    )

    const { user } = renderWithQuery(<Harness />)
    await user.click(screen.getByRole('button', { name: /Selecione marca/i }))

    expect(await screen.findByText(/A lista é maior/)).toBeInTheDocument()
  })

  it('lista inteira NÃO exibe aviso de corte', async () => {
    const { user } = renderWithQuery(<Harness />)
    await user.click(screen.getByRole('button', { name: /Selecione marca/i }))

    await screen.findByRole('menuitem', { name: /STELLA/ })
    expect(screen.queryByText(/A lista é maior/)).not.toBeInTheDocument()
  })

  it('falha do servidor NÃO se disfarça de lista vazia', async () => {
    // Estados distintos importam: o operador precisa saber se deve esperar,
    // avisar alguém, ou se a lista está mesmo vazia.
    dublarFetch(() => new Response('', { status: 500 }))

    const { user } = renderWithQuery(<Harness />)
    await user.click(screen.getByRole('button', { name: /Selecione marca/i }))

    expect(await screen.findByText(/não foi possível carregar/i)).toBeInTheDocument()
  })
  /**
   * O `+...` por PAPEL — a metade da #245 que a PR #257 deixou de fora.
   *
   * A matriz de papéis existe desde a #257, mas nenhum componente a consumia:
   * o botão aparecia para todo mundo, em 19 telas, e a recusa só chegava
   * depois de a pessoa abrir o diálogo e digitar o nome.
   */
  describe('o + ... obedece ao papel do vínculo', () => {
    it('some para quem não escreve lista de apoio', async () => {
      papelDaSessao = 'operator-sales'

      renderWithQuery(<Harness />)

      // O combo em si continua inteiro: LEITURA não é filtrada por papel.
      const gatilho = await screen.findByRole('button', { name: /Selecione marca/i })
      await userEvent.setup().click(gatilho)
      await waitFor(() => expect(screen.queryByText(/Cadastrar marca/i)).not.toBeInTheDocument())
    })

    it('fica para operator-full — a decisão da api#66', async () => {
      papelDaSessao = 'operator-full'

      renderWithQuery(<Harness />)

      await userEvent.setup().click(await screen.findByRole('button', { name: /Selecione marca/i }))
      expect(await screen.findByText(/Cadastrar marca/i)).toBeInTheDocument()
    })

    /**
     * Enquanto o vínculo não chega, a tela NÃO afirma que não pode.
     *
     * Esconder no desconhecido piscaria o botão em toda montagem e negaria
     * antes de saber; e o 403 do servidor continua tratado do outro lado, que
     * é o que torna este otimismo barato.
     */
    it('continua visível quando o vínculo não chegou', async () => {
      dublarFetch(() => respostaDaApi(OPCOES))
      vi.stubGlobal(
        'fetch',
        vi.fn((entrada: RequestInfo | URL) => {
          const url = String(entrada instanceof Request ? entrada.url : entrada)
          if (url.includes('/auth/')) return Promise.resolve(new Response('', { status: 500 }))
          return Promise.resolve(respostaDaApi(OPCOES))
        }),
      )

      renderWithQuery(<Harness />)

      await userEvent.setup().click(await screen.findByRole('button', { name: /Selecione marca/i }))
      expect(await screen.findByText(/Cadastrar marca/i)).toBeInTheDocument()
    })
  })
})
