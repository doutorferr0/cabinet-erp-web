/**
 * Transporte único do cliente gerado (mutator do Orval).
 *
 * Todo request do app passa por aqui — é o ponto único de:
 * - `credentials: 'include'`: a sessão é um COOKIE opaco (ADR-010, D2); sem
 *   isso o navegador não o envia em requisição cross-origin e o back
 *   responderia 401 em tudo, parecendo bug de autenticação.
 * - shape `{ data, status, headers }` (convenção do cliente gerado): quem
 *   decide o que é falha é a porta única (`src/data/api-provider.ts`), não o
 *   transporte. Lançar por status HTTP aqui tiraria dela a decisão que é dela
 *   (o 404 do `itemOuNulo` é resposta, não erro).
 * - **rede fora = `status: 0`**: a requisição que nem chegou a ter resposta
 *   não tem status HTTP; 0 nunca colide com um status real e os helpers o
 *   tratam como falha. O union gerado não o declara — o cast é o preço de o
 *   gerador só conhecer as respostas do contrato.
 *
 * **O padrão de base é `/` — mesma origem.** Em desenvolvimento quem leva
 * `/api` e `/auth` até o backend é o proxy do `vite.config.ts`; o cookie não
 * atravessa origem nenhuma. `VITE_API_URL` fica para implantação em origens
 * separadas — configuração de implantação, não contrato (o contrato não traz
 * `servers` de propósito).
 */

let baseUrl = '/'

export function configurarApi(novo: string = import.meta.env.VITE_API_URL ?? '/') {
  baseUrl = novo
}

function urlCompleta(url: string): string {
  if (baseUrl === '/' || baseUrl === '') return url
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  return base + url
}

/**
 * Corpo como veio: JSON quando é JSON, texto quando não é, `undefined` quando
 * não há corpo (204). Um 500 com HTML de proxy no meio não pode explodir o
 * parse — vira texto e o `detalheDoProblema` decide o que mostrar.
 */
async function corpoDaResposta(response: Response): Promise<unknown> {
  const texto = await response.text()
  if (!texto) return undefined
  try {
    return JSON.parse(texto)
  } catch {
    return texto
  }
}

/**
 * Os DOIS únicos tipos que o contrato devolve com corpo — conferido varrendo
 * `contracts/openapi-v1.json`: toda resposta com `content` declara
 * `application/json` ou `application/problem+json`, e nada mais.
 *
 * Por isso a regra pode ser fechada em vez de heurística: corpo que chega com
 * outro tipo NÃO é a API.
 */
function ehJsonDoContrato(tipo: string | null): boolean {
  if (!tipo) return false
  const base = tipo.split(';')[0]?.trim().toLowerCase() ?? ''
  return base === 'application/json' || base.endsWith('+json')
}

/**
 * `200` NÃO PROVA QUE A RESPOSTA É DA API — e este é o ponto onde isso para de
 * passar batido (issue #226).
 *
 * O par local tem uma forma de mentir que não gera erro nenhum no caminho: o
 * MSW libera a passagem de uma rota, o proxy do dev server não está montado, e
 * `/api/...` cai no **fallback da SPA**, que responde o `index.html` com status
 * **200**. `respostaOk()` vê 200, `dadosOuErro()` devolve a string HTML como se
 * fosse o corpo, e o defeito só aparece na primeira operação de array, longe
 * daqui — `empresas.find is not a function`, que não diz nada sobre proxy.
 *
 * A resposta vira falha com `status: 0`, o mesmo canal de "não houve resposta
 * utilizável" que a rede fora já usa: os helpers da porta única o tratam como
 * falha e nenhum deles precisa aprender um caso novo. Mas o corpo sintético
 * carrega a CAUSA PROVÁVEL, para a tela ter o que dizer — `detalheDoProblema`
 * lê `detail`, então a frase chega ao operador em vez de morrer no console.
 *
 * Só vale quando HÁ corpo: `204` e `205` não têm `content-type` e são resposta
 * legítima de `logout`, `active-tenant` e `change-password`.
 */
function respostaQueNaoEDaApi(url: string, response: Response): RespostaBruta {
  const tipo = response.headers.get('content-type') ?? 'sem content-type'
  return {
    data: {
      type: 'urn:cabinet:erro:resposta-nao-json',
      title: 'Resposta não é da API',
      status: response.status,
      detail: `\`${url}\` respondeu ${response.status} com \`${tipo}\`, e o contrato só devolve JSON. ${causaProvavel(response.status)}`,
    },
    status: 0,
    headers: response.headers,
    url,
  }
}

/**
 * A CAUSA PROVÁVEL DEPENDE DO STATUS — e antes não dependia.
 *
 * A frase era uma só: *"o proxy do dev server não está no ar; suba o par local
 * com `VITE_API_PROXY`"*. Ela é certeira no caso que criou esta guarda (issue
 * #226) — mas o mesmo texto chegava ao operador em `app.cabinetonline.cc`, que
 * não tem proxy nenhum: ali a base é absoluta (`VITE_API_URL`) e não existe
 * fallback de SPA no caminho. Instrução de desenvolvimento em tela de produção
 * não é ruído: manda quem lê mexer onde não há nada para mexer.
 *
 * **Quem separa os dois casos é o STATUS, e não a base.** O fallback da SPA é a
 * única forma conhecida de um corpo que não é JSON chegar com **2xx** — a página
 * inteira, com status de sucesso, é exatamente o que ele devolve. Status de erro
 * com corpo de texto é outra coisa: veio de alguém ENTRE o navegador e a API, e
 * o 524 do Cloudflare — medido em 2026-08-28 no `app.`, com `text/plain` — é o
 * caso comum.
 *
 * Discriminar pela base seria mais direto e não é possível: em teste a base é
 * sempre absoluta, porque `new Request('/caminho')` sem origem LANÇA no
 * transporte do Node. Uma condição que nenhum teste consegue exercitar é uma
 * condição que ninguém verifica.
 */
function causaProvavel(status: number): string {
  if (status < 400) {
    return 'A causa provável é o proxy do dev server não estar no ar: sem ele `/api` e `/auth` caem no fallback da SPA, que devolve o index.html com status 200. Suba o par local com `VITE_API_PROXY` (ver .env.example).'
  }
  const alvo = baseUrl === '/' || baseUrl === '' ? 'o servidor' : `\`${baseUrl}\``
  return `Status de erro com corpo que não é JSON não vem da API: quem respondeu foi a camada entre o navegador e ${alvo} — proxy reverso ou CDN. O 524 do Cloudflare, que chega como texto, é o caso comum e quer dizer que o servidor não chegou a responder.`
}

/**
 * TEMPO MÁXIMO DE UMA REQUISIÇÃO — sem ele, "servidor pendurado" é tela girando
 * para sempre.
 *
 * Medido em 2026-08-28 contra `api.cabinetonline.cc` (issue #386): o processo
 * responde `/health` em 0,4s e devolve 401 em 0,3s, mas toda rota que toca o
 * Postgres pendura — o `POST /auth/login` ficou **125s** sem resposta até o
 * Cloudflare cortar com 524. Do lado de cá não havia `AbortController` nenhum:
 * a promessa do `fetch` simplesmente não resolvia, o botão de gravar ficava
 * desabilitado e a única saída do operador era recarregar a página.
 *
 * **45s, e só a borda de cima é medida.** Em cima, o prazo precisa ficar ABAIXO
 * do corte da CDN (100s no Cloudflare) — senão quem fala com o operador é a
 * página de erro dela, em inglês e sem relação com o sistema, e esta mensagem
 * nunca aparece. Embaixo, a folga é estimada: a operação mais lenta do contrato
 * é a impressão, que renderiza PDF por Chromium no servidor, e ela **não foi
 * cronometrada** — 45s é o dobro largo do que uma API saudável leva no pior
 * caso. Se um dia a impressão estourar o prazo, o sintoma será claro (a
 * mensagem desta espera numa operação que costumava terminar), e é aí que o
 * número se remede em vez de nascer com um chute mais alto "por garantia".
 *
 * Constante, e não variável de ambiente: seria uma segunda autoridade sobre o
 * mesmo comportamento, e a que ninguém testa é a que ganha.
 */
const TEMPO_MAXIMO_MS = 45_000

/**
 * O `signal` do chamador continua valendo — ele é o CANCELAMENTO, e cancelar
 * não é expirar.
 *
 * O TanStack Query aborta a consulta quando a tela sai do ar; o relógio aqui
 * aborta quando o servidor não respondeu. Sobrescrever o `signal` que vem em
 * `options` mataria o primeiro, e ignorar o relógio mataria o segundo — por isso
 * os dois são compostos e o `expirou()` diz qual deles disparou. Só o relógio
 * vira mensagem: consulta cancelada não é falha para mostrar a ninguém.
 *
 * **`AbortSignal.any` seria uma linha e não é usado**, ao contrário do que o
 * óbvio sugere: ele é de 2024 (Safari 17.4, Chrome 116) e a API mais nova que
 * este repositório assume hoje é `.at(-1)`, de 2022 — dois anos de navegadores
 * no meio. E a falha não seria pequena: isto roda ANTES do `try` do `apiFetch`,
 * então em navegador sem o método o `TypeError` escaparia do transporte e
 * derrubaria a tela em vez de virar uma requisição com erro. A composição à mão
 * custa cinco linhas e não tem esse dia ruim.
 */
function relogioDaRequisicao(externo: AbortSignal | null | undefined) {
  const relogio = AbortSignal.timeout(TEMPO_MAXIMO_MS)
  const expirou = () => relogio.aborted
  if (!externo) return { signal: relogio, expirou }

  const composto = new AbortController()
  for (const sinal of [externo, relogio]) {
    if (sinal.aborted) {
      composto.abort(sinal.reason)
      break
    }
    sinal.addEventListener('abort', () => composto.abort(sinal.reason), { once: true })
  }
  return { signal: composto.signal, expirou }
}

/**
 * A espera que estourou vira falha NOMEADA, no mesmo canal `status: 0` que a
 * rede fora e o HTML da SPA já usam — nenhum consumidor precisa aprender caso
 * novo. O que muda é o corpo: `detalheDoProblema` lê `detail`, então o operador
 * recebe "o servidor não respondeu em 45s" em vez do texto genérico da tela.
 */
function respostaQueExpirou(url: string): RespostaBruta {
  return {
    data: {
      type: 'urn:cabinet:erro:sem-resposta',
      title: 'O servidor não respondeu',
      status: 0,
      detail: `\`${url}\` não respondeu em ${TEMPO_MAXIMO_MS / 1000}s e a espera foi encerrada. O pedido pode ter chegado ao servidor — confira antes de repetir uma gravação.`,
    },
    status: 0,
    headers: new Headers(),
    url,
  }
}

interface RespostaBruta {
  data: unknown
  status: number
  headers: Headers
  /**
   * O caminho pedido, como a operação gerada o montou (`/api/quotes/{id}` já
   * resolvido, com a query).
   *
   * Viaja porque a FALHA precisa dele e nenhuma camada acima o tem: quando o
   * servidor responde 501 (`urn:cabinet:erro:nao-implementado`), quem monta o
   * aviso é um componente compartilhado, longe da tela — sem o caminho ele não
   * tem como saber de QUAL módulo está falando, e "esta parte do sistema" é o
   * tipo de frase que faz o operador reler duas vezes sem entender.
   *
   * Sai daqui, e não de quem chama, porque este é o único ponto por onde todo
   * request passa; qualquer outro lugar seria uma segunda cópia da URL.
   */
  url: string
}

export const apiFetch = async <T>(url: string, options: RequestInit): Promise<T> => {
  const relogio = relogioDaRequisicao(options.signal)
  try {
    // `fetch(new Request(...))`, e não `fetch(url, init)`: o servidor falso dos
    // testes lê verbo e corpo do `Request` — é a forma que exercita a fronteira
    // de verdade (ver src/test/servidor.ts) e a que o cliente anterior usava.
    const response = await fetch(
      new Request(urlCompleta(url), {
        credentials: 'include',
        ...options,
        // Depois do espalhamento, de propósito: `relogioDaRequisicao` já
        // COMPÔS o sinal do chamador com o relógio, e deixar o original vencer
        // apagaria o prazo.
        signal: relogio.signal,
      }),
    )
    const data = await corpoDaResposta(response)
    if (data !== undefined && !ehJsonDoContrato(response.headers.get('content-type'))) {
      return respostaQueNaoEDaApi(url, response) as T
    }
    return {
      data,
      status: response.status,
      headers: response.headers,
      url,
    } as T
  } catch {
    if (relogio.expirou()) return respostaQueExpirou(url) as T
    return { data: undefined, status: 0, headers: new Headers(), url } as T
  }
}
