import { configurarApi } from '@/api/cliente'
import { authTenants } from '@/api/gerado'
import { type RespostaDaApi, dadosOuErro, respostaOk } from '@/data/api-provider'
import { instalarServidor, json, problema } from '@/test/servidor'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * `200` NÃO PROVA QUE A RESPOSTA É DA API (issue #226).
 *
 * O par local tem uma forma de mentir que não deixa rastro no caminho: o MSW
 * libera a passagem de uma rota, o proxy do dev server não está montado, e
 * `/api/...` cai no **fallback da SPA** — que devolve o `index.html` com status
 * **200**. Medido em 2026-08-19 com a api em `:3010` e o front em `:5180`.
 *
 * O que chegava ao operador era `empresas.find is not a function`, em
 * `empresas-api.ts`, uma pilha inteira depois da causa: `respostaOk()` via 200,
 * `dadosOuErro()` devolvia a string HTML como se fosse o corpo, e o defeito só
 * estourava na primeira operação de array.
 *
 * A bateria prova os dois lados — que o HTML vira falha NOMEADA, e que o que é
 * JSON de verdade continua passando. Guarda que reprova demais seria trocada por
 * um defeito pior: a fronteira recusando resposta boa.
 */

const HTML_DA_SPA =
  '<!doctype html><html><head><title>Cabinet</title></head><body><div id="root"></div></body></html>'

beforeEach(() => {
  vi.unstubAllGlobals()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('resposta que não é da API', () => {
  it('200 com text/html vira FALHA, e não dado', async () => {
    instalarServidor({
      '/auth/tenants': () =>
        new Response(HTML_DA_SPA, { status: 200, headers: { 'content-type': 'text/html' } }),
    })

    const resposta: RespostaDaApi = await authTenants()

    // O status 200 do fallback não sobrevive: vira `0`, o mesmo canal de "não
    // houve resposta utilizável" que a rede fora já usava. Sem isso o
    // `respostaOk` daria verde para uma página HTML.
    expect(respostaOk(resposta)).toBe(false)
    expect(resposta.status).toBe(0)
  })

  it('a falha NOMEIA a causa provável — proxy fora do ar, fallback da SPA', async () => {
    // `x.find is not a function` não diz o que fazer. O texto tem de citar o
    // proxy e o fallback, que é onde o operador vai mexer — e tem de vir do
    // TRANSPORTE de verdade: montar o corpo à mão aqui provaria só que o
    // `dadosOuErro` lê `detail`, e não que a mensagem existe.
    //
    // O status importa: 2xx com corpo que não é JSON é o fallback da SPA, e é o
    // único caso em que a frase do proxy cabe (ver `causaProvavel`).
    instalarServidor({
      '/auth/tenants': () =>
        new Response(HTML_DA_SPA, { status: 200, headers: { 'content-type': 'text/html' } }),
    })

    const resposta: RespostaDaApi = await authTenants()

    try {
      dadosOuErro(resposta, 'Falha ao carregar as empresas.')
      expect.unreachable('deveria ter lançado')
    } catch (erro) {
      const detalhe = (erro as { detail?: string }).detail ?? ''
      expect(detalhe).toContain('text/html')
      expect(detalhe).toContain('proxy')
      expect(detalhe).toContain('fallback da SPA')
      expect(detalhe).toContain('VITE_API_PROXY')
    }
  })

  it('o corpo HTML não chega à tela — era ele que virava `empresas.find is not a function`', async () => {
    instalarServidor({
      '/auth/tenants': () =>
        new Response(HTML_DA_SPA, { status: 200, headers: { 'content-type': 'text/html' } }),
    })

    const resposta: RespostaDaApi = await authTenants()

    // A regressão que importa: antes, `dadosOuErro` DEVOLVIA a string e a tela
    // chamava `.find` nela. Agora lança — e o `?? []` de quem consome passa a
    // ter efeito, porque a consulta fica em estado de erro.
    expect(() => dadosOuErro(resposta, 'Falha ao carregar as empresas.')).toThrow()
    expect(typeof resposta.data === 'string').toBe(false)
  })

  it('JSON de verdade continua passando — a guarda não pode recusar demais', async () => {
    const vinculos = [{ tenantId: 'emp-1', name: 'Matriz', role: 'owner', features: [] }]
    instalarServidor({ '/auth/tenants': () => json(vinculos) })

    const resposta: RespostaDaApi = await authTenants()

    expect(resposta.status).toBe(200)
    expect(dadosOuErro(resposta, 'Falha ao carregar as empresas.')).toEqual(vinculos)
  })

  it('`application/problem+json` continua sendo erro do SERVIDOR, com o detail dele', async () => {
    // O erro do contrato não pode ser confundido com o do proxy: são causas
    // diferentes e levam a ações diferentes.
    instalarServidor({
      '/auth/tenants': () => problema(403, 'Troque a senha antes de operar.', 'Forbidden'),
    })

    const resposta: RespostaDaApi = await authTenants()

    expect(resposta.status).toBe(403)
    try {
      dadosOuErro(resposta, 'Falha ao carregar as empresas.')
      expect.unreachable('deveria ter lançado')
    } catch (erro) {
      expect((erro as { detail?: string }).detail).toBe('Troque a senha antes de operar.')
    }
  })

  it('o 524 da CDN não manda mexer no proxy — em produção não há proxy para mexer', async () => {
    // Medido em 2026-08-28: `app.cabinetonline.cc` fala com
    // `api.cabinetonline.cc` por base absoluta, o backend pendurou e o
    // Cloudflare cortou com **524 em `text/plain`**. A guarda transformava
    // aquilo em "suba o par local com `VITE_API_PROXY`" — instrução de
    // desenvolvimento numa tela de produção, para uma falha que não é essa.
    instalarServidor(
      { '/auth/tenants': () => new Response('error code: 524', { status: 524 }) },
      'https://api.cabinetonline.cc',
    )

    const resposta: RespostaDaApi = await authTenants()

    expect(resposta.status).toBe(0)
    try {
      dadosOuErro(resposta, 'Falha ao carregar as empresas.')
      expect.unreachable('deveria ter lançado')
    } catch (erro) {
      const detalhe = (erro as { detail?: string }).detail ?? ''
      expect(detalhe).toContain('https://api.cabinetonline.cc')
      expect(detalhe).toContain('não chegou a responder')
      expect(detalhe).not.toContain('VITE_API_PROXY')
      expect(detalhe).not.toContain('dev server')
    }
  })

  it('204 sem corpo não é recusado — logout e troca de empresa respondem assim', async () => {
    // Corpo `null`, e não `''`: a especificação proíbe corpo em status 204 e o
    // `new Response('', { status: 204 })` LANÇA — a fixture errada fazia o
    // teste medir o `catch` do transporte em vez do 204.
    instalarServidor({ '/auth/tenants': () => new Response(null, { status: 204 }) })

    const resposta: RespostaDaApi = await authTenants()

    // Sem corpo não há content-type para conferir, e 204 é resposta legítima.
    // Uma guarda que olhasse só o cabeçalho reprovaria aqui.
    expect(resposta.status).toBe(204)
    expect(resposta.data).toBeUndefined()
  })
})

/**
 * SERVIDOR PENDURADO — medido em produção, e até 2026-08-28 sem defesa nenhuma.
 *
 * `api.cabinetonline.cc` respondia `/health` em 0,4s e 401 em 0,3s, mas toda
 * rota que tocava o Postgres não respondia: o `POST /auth/login` ficou **125s**
 * até o Cloudflare cortar com 524 (issue #386). Do lado do front não havia
 * `AbortController` nenhum — a promessa do `fetch` não resolvia, o formulário
 * ficava desabilitado e a saída era recarregar a página.
 *
 * O prazo real é 45s. Aqui o relógio é trocado por um de milissegundos com
 * `vi.spyOn(AbortSignal, 'timeout')`: o código continua pedindo o prazo dele, e
 * é isso que mantém o teste medindo o TRANSPORTE em vez de uma constante
 * exportada só para ele.
 */
describe('servidor que não responde', () => {
  /**
   * Stub direto do `fetch`, e NÃO `instalarServidor`: o servidor falso embrulha
   * o que a rota devolver com `json(...)` sem esperar, então uma promessa
   * pendente vira `{}` com status 200 — o oposto do que este bloco mede.
   */
  function servidorMudo() {
    configurarApi('http://api.teste')
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (entrada: RequestInfo | URL) =>
          new Promise<Response>((_, rejeitar) => {
            // Nunca responde, MAS honra o `signal` — é o que o `fetch` de
            // verdade faz. Um stub que ignorasse o sinal penduraria o próprio
            // teste e não mediria nada: foi o que aconteceu na primeira volta.
            const { signal } = entrada as Request
            signal.addEventListener('abort', () => rejeitar(signal.reason))
          }),
      ),
    )
  }

  // O original guardado ANTES do espião: `mockImplementation(() =>
  // AbortSignal.timeout(ms))` chamaria o próprio espião e estoura a pilha.
  const relogioDeVerdade = AbortSignal.timeout.bind(AbortSignal)

  function relogioCurto(ms = 5) {
    vi.spyOn(AbortSignal, 'timeout').mockImplementation(() => relogioDeVerdade(ms))
  }

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('a espera termina e vira falha NOMEADA, em vez de pendurar', async () => {
    servidorMudo()
    relogioCurto()

    const resposta: RespostaDaApi = await authTenants()

    expect(respostaOk(resposta)).toBe(false)
    expect(resposta.status).toBe(0)
    expect(resposta.data).toMatchObject({ type: 'urn:cabinet:erro:sem-resposta' })
  })

  it('o texto diz o prazo e avisa do risco de repetir uma gravação', async () => {
    // A dúvida do operador depois de uma espera longa é sempre a mesma: "gravou
    // ou não?". Quem não respondeu pode ter recebido — repetir às cegas duplica
    // documento.
    servidorMudo()
    relogioCurto()

    const resposta: RespostaDaApi = await authTenants()

    try {
      dadosOuErro(resposta, 'Falha ao carregar as empresas.')
      expect.unreachable('deveria ter lançado')
    } catch (erro) {
      const detalhe = (erro as { detail?: string }).detail ?? ''
      expect(detalhe).toContain('45s')
      expect(detalhe).toContain('gravação')
    }
  })

  it('o `signal` do chamador CHEGA ao request — cancelar continua possível', async () => {
    // O TanStack Query aborta a consulta quando a tela sai do ar. Se o relógio
    // SOBRESCREVESSE `options.signal` em vez de compor com ele, o cancelamento
    // sumiria sem erro nenhum: a requisição seguiria viva até os 45s.
    //
    // O servidor falso não olha `signal` — quem o respeita é o `fetch` de
    // verdade. Então o que se mede aqui é o que é mensurável e é o que importa:
    // o sinal que chega ao `Request` já está abortado quando o chamador abortou.
    let requisicao: Request | undefined
    vi.stubGlobal(
      'fetch',
      vi.fn(async (entrada: RequestInfo | URL) => {
        requisicao = entrada as Request
        return new Response(null, { status: 204 })
      }),
    )
    const cancelamento = new AbortController()
    cancelamento.abort()

    await authTenants({ signal: cancelamento.signal })

    expect(requisicao?.signal.aborted).toBe(true)
  })

  it('falha de rede continua SEM mensagem de espera — não foi o prazo que estourou', async () => {
    // O `catch` do transporte é um só. Sem distinguir quem abortou, toda falha
    // de rede passaria a dizer "não respondeu em 45s" — uma frase que seria
    // mentira sobre o que aconteceu.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    )

    const resposta: RespostaDaApi = await authTenants()

    expect(resposta.status).toBe(0)
    expect(resposta.data).toBeUndefined()
  })

  it('resposta dentro do prazo não é tocada — a guarda não pode cortar quem responde', async () => {
    const vinculos = [{ tenantId: 'emp-1', name: 'Matriz', role: 'owner', features: [] }]
    instalarServidor({ '/auth/tenants': () => json(vinculos) })

    const resposta: RespostaDaApi = await authTenants()

    expect(resposta.status).toBe(200)
    expect(dadosOuErro(resposta, 'Falha ao carregar as empresas.')).toEqual(vinculos)
  })
})
