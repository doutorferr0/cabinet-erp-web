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
    return {
      data: await corpoDaResposta(response),
      status: response.status,
      headers: response.headers,
    } as T
  } catch {
    return { data: undefined, status: 0, headers: new Headers() } as T
  }
}
