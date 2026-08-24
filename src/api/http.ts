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
  return {
    data: {
      type: 'urn:cabinet:erro:resposta-nao-json',
      title: 'Resposta não é da API',
      status: response.status,
      detail: `\`${url}\` respondeu ${response.status} com \`${
        response.headers.get('content-type') ?? 'sem content-type'
      }\`, e o contrato só devolve JSON. A causa provável é o proxy do dev server não estar no ar: sem ele \`/api\` e \`/auth\` caem no fallback da SPA, que devolve o index.html com status 200. Suba o par local com \`VITE_API_PROXY\` (ver .env.example).`,
    },
    status: 0,
    headers: response.headers,
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
  try {
    // `fetch(new Request(...))`, e não `fetch(url, init)`: o servidor falso dos
    // testes lê verbo e corpo do `Request` — é a forma que exercita a fronteira
    // de verdade (ver src/test/servidor.ts) e a que o cliente anterior usava.
    const response = await fetch(
      new Request(urlCompleta(url), {
        credentials: 'include',
        ...options,
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
    return { data: undefined, status: 0, headers: new Headers(), url } as T
  }
}
