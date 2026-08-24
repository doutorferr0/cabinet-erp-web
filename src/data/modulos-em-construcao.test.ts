import { ErroDaApi, repetirSeValeAPena } from '@/data/api-provider'
import {
  ehModuloEmConstrucao,
  mensagemDeConstrucao,
  moduloDoErro,
} from '@/data/modulos-em-construcao'
import { orcamentosApi } from '@/data/quotes-api'
import { instalarServidor } from '@/test/servidor'
import { tableState } from '@/test/utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import contrato from '../../contracts/openapi-v1.json'

/**
 * O 501 do contrato, da resposta do servidor até o que a camada de dado entrega.
 *
 * O caso é REAL e não hipotético: `contracts/openapi-v1.json` declara a resposta
 * `NaoImplementado` em seis operações de escrita, e o combinado do repo é que
 * operação sem handler responda 501 e nunca 404. O que faltava era o front
 * reconhecer — e enquanto não reconhecia, o 501 saía como falha de rede, com um
 * `Tentar de novo` que devolve o mesmo 501.
 */

/** Como o servidor responde de verdade: problem+json com a URN do contrato. */
function naoImplementado(detail: string) {
  return new Response(
    JSON.stringify({
      type: 'urn:cabinet:erro:nao-implementado',
      title: 'Não implementado',
      status: 501,
      detail,
    }),
    { status: 501, headers: { 'content-type': 'application/problem+json' } },
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('501 na fronteira de dado', () => {
  beforeEach(() => {
    instalarServidor({
      '/api/quotes': () => naoImplementado('O desconto por grupo ainda não é gravado.'),
    })
  })

  it('a listagem falha em vez de virar lista vazia', async () => {
    // A regra que já vale para toda falha: "deu erro" e "não há registro" pedem
    // reações opostas do operador, e um 501 que virasse `{rows: []}` diria
    // "não há orçamento" sobre um módulo que nem foi consultado.
    await expect(orcamentosApi.list(tableState())).rejects.toBeInstanceOf(ErroDaApi)
  })

  it('o erro chega reconhecível como módulo em construção', async () => {
    const erro = await orcamentosApi.list(tableState()).catch((e: unknown) => e)

    expect(ehModuloEmConstrucao(erro)).toBe(true)
    expect((erro as ErroDaApi).status).toBe(501)
  })

  it('o erro carrega o CAMINHO, que é como o módulo se descobre', async () => {
    // Sem o caminho o aviso só teria como dizer "esta parte do sistema" — a
    // frase que faz o operador reler duas vezes sem entender de que tela se
    // fala. Ele vem do transporte, que é o único ponto que conhece a URL.
    const erro = (await orcamentosApi.list(tableState()).catch((e: unknown) => e)) as ErroDaApi

    expect(erro.caminho).toContain('/api/quotes')
    expect(moduloDoErro(erro)?.nome).toBe('Orçamento')
  })

  it('mostra o `detail` do servidor, não o fallback de quem chamou', async () => {
    const erro = await orcamentosApi.list(tableState()).catch((e: unknown) => e)

    expect(mensagemDeConstrucao(erro)).toBe('O desconto por grupo ainda não é gravado.')
  })
})

describe('reconhecimento do 501', () => {
  it('501 não se repete, apesar de ser 5xx', () => {
    // O contrato diz em letra que o cliente NÃO deve reenviar o mesmo corpo. Com
    // a repetição padrão a tela ficava ~7s em esqueleto para chegar à resposta
    // que a primeira tentativa já tinha dado.
    expect(repetirSeValeAPena(0, new ErroDaApi('x', 501))).toBe(false)
  })

  it('500 continua se repetindo — aí repetir resolve mesmo', () => {
    expect(repetirSeValeAPena(0, new ErroDaApi('x', 500))).toBe(true)
  })

  it('não confunde com as outras recusas', () => {
    for (const status of [400, 401, 403, 404, 409, 500]) {
      expect(ehModuloEmConstrucao(new ErroDaApi('x', status))).toBe(false)
    }
    expect(ehModuloEmConstrucao(new Error('rede fora'))).toBe(false)
    expect(ehModuloEmConstrucao(null)).toBe(false)
  })

  it('501 sem caminho conhecido continua sendo 501, só que anônimo', () => {
    // Caminho fora do registro NÃO ganha nome por aproximação: o operador leria
    // o nome de uma tela que não é a dele. Perde o nome, mantém o aviso.
    const erro = new ErroDaApi('x', 501, undefined, undefined, '/api/inventado')

    expect(ehModuloEmConstrucao(erro)).toBe(true)
    expect(moduloDoErro(erro)).toBeUndefined()
    expect(mensagemDeConstrucao(erro)).toContain('Nada foi alterado')
  })

  it('a query não engana o casamento por prefixo', () => {
    const erro = new ErroDaApi('x', 501, undefined, undefined, '/api/quotes?page=1&pageSize=20')

    expect(moduloDoErro(erro)?.nome).toBe('Orçamento')
  })
})

describe('o registro fala do contrato de verdade', () => {
  /**
   * A guarda contra registro fantasiado: todo caminho nomeado aqui tem de ser
   * caminho do contrato. Sem isto, o mapa poderia envelhecer nomeando módulo
   * que o documento não tem mais — e o aviso continuaria saindo, com o nome
   * errado, sem nada acender.
   */
  it('todo módulo do registro aponta caminho que o contrato declara', () => {
    const caminhos = Object.keys((contrato as { paths: Record<string, unknown> }).paths)

    for (const prefixo of ['/api/partners', '/api/quotes', '/api/orders']) {
      expect(caminhos).toContain(prefixo)
      expect(moduloDoErro(new ErroDaApi('x', 501, undefined, undefined, prefixo))).toBeDefined()
    }
  })

  it('e o contrato ainda declara a resposta que este arquivo existe para tratar', () => {
    const componentes = contrato as { components: { responses: Record<string, unknown> } }

    expect(componentes.components.responses).toHaveProperty('NaoImplementado')
  })
})
