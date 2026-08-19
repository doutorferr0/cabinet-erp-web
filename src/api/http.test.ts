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
