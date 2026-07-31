import { configurarApi } from '@/api/cliente'
import { vi } from 'vitest'

/**
 * Servidor falso para teste, no nível do `fetch`.
 *
 * POR QUE NO `fetch` E NÃO NO SDK: interceptar aqui exercita o CLIENTE GERADO de
 * verdade — mudança de URL, de nome de parâmetro ou da forma da resposta quebra o
 * teste. Dublar o SDK esconderia exatamente a fronteira que o teste existe para
 * vigiar. É a escolha que o teste dos lookups fez primeiro; isto só a torna
 * reutilizável, porque toda tela vai precisar dela quando os endpoints saírem.
 *
 * O cliente gerado chama `fetch(new Request(...))`: verbo e corpo vêm do
 * `Request`, não do segundo argumento — que chega vazio. Ler `init.method` daria
 * sempre `GET`, e foi o que custou uma rodada quando isto era código solto.
 */

export interface ChamadaFalsa {
  url: string
  caminho: string
  metodo: string
  corpo: unknown
}

/** Resposta de um caminho: valor JSON, `Response` pronta, ou função dos dois. */
export type Rota = (chamada: ChamadaFalsa) => unknown

export interface ServidorFalso {
  /** Toda chamada feita, na ordem. */
  chamadas: ChamadaFalsa[]
  /** Chamadas de um caminho (`/auth/me`), na ordem. */
  em(caminho: string): ChamadaFalsa[]
}

export function json(valor: unknown, status = 200): Response {
  return new Response(JSON.stringify(valor), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/** `application/problem+json` (RFC 9457) — a forma de erro que o contrato exige. */
export function problema(status: number, detail: string, title = 'Erro'): Response {
  return new Response(JSON.stringify({ type: 'about:blank', title, status, detail }), {
    status,
    headers: { 'content-type': 'application/problem+json' },
  })
}

/**
 * Instala o servidor falso. Chamar dentro de `beforeEach`; desinstalar com
 * `vi.unstubAllGlobals()` no `afterEach`.
 *
 * Caminho sem rota responde **404**, de propósito: assim um endpoint que a tela
 * chama sem o teste saber aparece como falha, em vez de receber dado de outro.
 */
export function instalarServidor(rotas: Record<string, Rota>, baseUrl = 'http://api.teste') {
  const chamadas: ChamadaFalsa[] = []
  configurarApi(baseUrl)

  vi.stubGlobal(
    'fetch',
    vi.fn(async (entrada: RequestInfo | URL, init?: RequestInit) => {
      const requisicao = entrada instanceof Request ? entrada : null
      const url = String(requisicao ? requisicao.url : entrada)
      const texto = requisicao ? await requisicao.clone().text() : String(init?.body ?? '')

      const chamada: ChamadaFalsa = {
        url,
        caminho: new URL(url).pathname,
        metodo: (requisicao?.method ?? init?.method ?? 'GET').toUpperCase(),
        corpo: texto ? JSON.parse(texto) : null,
      }
      chamadas.push(chamada)

      const rota = rotas[chamada.caminho]
      if (!rota) return new Response('', { status: 404 })

      const resposta = rota(chamada)
      return resposta instanceof Response ? resposta : json(resposta)
    }),
  )

  return {
    chamadas,
    em: (caminho: string) => chamadas.filter((c) => c.caminho === caminho),
  } satisfies ServidorFalso
}
