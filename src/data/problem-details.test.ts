import { configurarApi } from '@/api/cliente'
import { authLogin, authSetActiveTenant, createPartner, createProduct } from '@/api/gerado'
import { type ErroDaApi, dadosOuErro } from '@/data/api-provider'
import { handlers } from '@/mocks/api/handlers'
import { TENANT_MATRIZ, resetStore } from '@/mocks/api/store'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import contrato from '../../contracts/openapi-v1.json'

/**
 * O CONTRATO TEM UM FORMATO DE ERRO SÓ — e esta é a guarda.
 *
 * Sem formato único, cada caminho do backend inventa o seu e a tela trata caso
 * a caso. A guarda lê o contrato DIRETO, não uma lista mantida à mão: caminho
 * novo com 4xx entra na verificação sozinho, que é a única forma de a regra
 * sobreviver ao crescimento do arquivo.
 */

type Json = Record<string, unknown>

const doc = contrato as unknown as {
  paths: Record<string, Record<string, { responses?: Record<string, Json> }>>
  components: { schemas: Record<string, Json> }
}

/** Toda resposta 4xx/5xx do contrato, com o `$ref` e o content-type de cada uma. */
function respostasDeErro() {
  const saida: { onde: string; refs: string[]; tipos: string[] }[] = []
  for (const [caminho, ops] of Object.entries(doc.paths)) {
    for (const [verbo, op] of Object.entries(ops)) {
      for (const [code, resposta] of Object.entries(op.responses ?? {})) {
        if (!/^[45]/.test(code)) continue
        const content = (resposta.content ?? {}) as Record<string, { schema?: { $ref?: string } }>
        saida.push({
          onde: `${verbo.toUpperCase()} ${caminho} → ${code}`,
          refs: Object.values(content).map((c) => c.schema?.$ref ?? ''),
          tipos: Object.keys(content),
        })
      }
    }
  }
  return saida
}

describe('Problem Details no contrato', () => {
  it('TODA resposta 4xx/5xx aponta para ProblemDetails — com uma exceção declarada', () => {
    const fora = respostasDeErro().filter(
      (r) => !r.refs.some((ref) => ref.endsWith('/ProblemDetails')),
    )

    // A prova de vida é lida por orquestrador, não por operador: devolve o
    // documento de prontidão, e enfiá-lo em `detail` obrigaria quem chama a
    // parsear frase. É a ÚNICA exceção, e está escrita no próprio contrato.
    expect(fora.map((r) => r.onde)).toEqual(['GET /health/db → 503'])
  })

  it('erro viaja como application/problem+json, nunca como application/json', () => {
    const errado = respostasDeErro()
      .filter((r) => r.refs.some((ref) => ref.endsWith('/ProblemDetails')))
      .filter((r) => !r.tipos.every((t) => t === 'application/problem+json'))

    expect(errado.map((r) => r.onde)).toEqual([])
  })

  it('`title` e `status` são obrigatórios — o corpo circula fora da resposta', () => {
    const schema = doc.components.schemas.ProblemDetails as {
      required?: string[]
      properties: Record<string, Json>
    }
    expect(schema.required).toEqual(expect.arrayContaining(['title', 'status']))
    // `fields` é a extensão de validação; `existingPartnerId`, a do 409 de
    // parceiro. As duas DECLARADAS: extensão solta na resposta de um caminho só
    // é o que faz o front descobri-la por acidente.
    expect(Object.keys(schema.properties)).toEqual(
      expect.arrayContaining(['type', 'title', 'status', 'detail', 'fields', 'existingPartnerId']),
    )
  })

  it('não sobrou schema de erro paralelo (LoginFalhou saiu)', () => {
    expect(Object.keys(doc.components.schemas)).not.toContain('LoginFalhou')
  })
})

const servidor = setupServer(...handlers)
beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }))
afterEach(() => servidor.resetHandlers())
afterAll(() => servidor.close())

beforeEach(async () => {
  resetStore()
  configurarApi('http://mock.teste')
  await authLogin({ email: 'admin@vertz.dev', password: 'qualquer' })
  await authSetActiveTenant({ tenantId: TENANT_MATRIZ })
})

describe('Problem Details no mock', () => {
  it('validação recusada volta com fields[], apontando o CAMPO', async () => {
    // Corpo COMPLETO com os campos vazios — é o que um formulário submetido em
    // branco manda. Omitir a chave testaria outra coisa (corpo malformado).
    const resposta = await createProduct({ code: '', description: '', active: true })
    expect(resposta.status).toBe(400)

    try {
      dadosOuErro(resposta, 'Falha ao gravar o produto.')
      expect.unreachable('deveria ter lançado')
    } catch (erro) {
      const api = erro as ErroDaApi
      expect(api.titulo).toBeTruthy()
      expect(api.campos.map((c) => c.path)).toEqual(['code', 'description'])
      expect(api.campos[0]?.message).toBeTruthy()
    }
  })

  it('só o campo que faltou entra na lista', async () => {
    const resposta = await createProduct({ code: 'PD-9', description: '', active: true })
    try {
      dadosOuErro(resposta, 'Falha ao gravar o produto.')
      expect.unreachable('deveria ter lançado')
    } catch (erro) {
      expect((erro as ErroDaApi).campos.map((c) => c.path)).toEqual(['description'])
    }
  })

  /**
   * O 400 de FILTRO fora da whitelist — o item que a DoD pede nominalmente.
   *
   * Ele não existia quando este arquivo nasceu: na `main` daquele momento o
   * `filters` de `/api/products` ainda era descartado em silêncio, e a
   * requisição voltava 200 com a lista inteira. Quem o criou foi o #117, que
   * esta branch agora contém — por isso o teste pôde entrar.
   */
  it('o 400 do FILTRO fora da whitelist é problem+json com detail acionável', async () => {
    const url = `http://mock.teste/api/products?page=1&pageSize=10&filters=${encodeURIComponent(
      JSON.stringify([{ field: 'paymentTerms', operator: 'iLike', value: 'x' }]),
    )}`
    const resposta = await fetch(url)

    expect(resposta.status).toBe(400)
    expect(resposta.headers.get('content-type')).toContain('application/problem+json')
    const corpo = (await resposta.json()) as Json
    expect(corpo.title).toBe('Requisição inválida')
    expect(corpo.status).toBe(400)
    expect(String(corpo.detail)).toContain('Campo não filtrável')
  })

  it('o 400 da whitelist de ordenação é problem+json com detail acionável', async () => {
    const resposta = await fetch(
      'http://mock.teste/api/products?page=1&pageSize=10&sortBy=paymentTerms',
    )

    expect(resposta.status).toBe(400)
    expect(resposta.headers.get('content-type')).toContain('application/problem+json')
    const corpo = (await resposta.json()) as Json
    expect(corpo.title).toBeTruthy()
    expect(corpo.status).toBe(400)
    expect(String(corpo.detail)).toContain('sortBy')
  })

  /**
   * O `title` é o rótulo do TIPO, e o mock mandava `'Erro'` em 100% das
   * respostas. Não era detalhe: `ErroDoServidor` mostra o `title` como cabeçalho
   * e a frase da tela abaixo, então no modo mock — o único ambiente que existe
   * hoje — todo erro aparecia como "Erro" em cima e a informação útil embaixo,
   * menor. Achado em revisão de outra sessão; o componente estava certo, a
   * resposta é que não distinguia nada.
   */
  it('o title DISTINGUE o tipo do erro, em vez de dizer "Erro" sempre', async () => {
    const naoEncontrado = await fetch('http://mock.teste/api/products/prod-que-nao-existe')
    expect(naoEncontrado.status).toBe(404)
    expect(((await naoEncontrado.json()) as Json).title).toBe('Não encontrado')

    const invalido = await fetch('http://mock.teste/api/products?page=1&pageSize=10&sortBy=xpto')
    expect(((await invalido.json()) as Json).title).toBe('Requisição inválida')
  })

  it('o handler do CRM usa o MESMO helper — formato em duas cópias vira dois formatos', async () => {
    const semFunil = await fetch('http://mock.teste/api/crm/pipelines/funil-que-nao-existe')
    expect(semFunil.status).toBe(404)
    const corpo = (await semFunil.json()) as Json
    expect(corpo.title).toBe('Não encontrado')
    expect(semFunil.headers.get('content-type')).toContain('application/problem+json')
  })

  it('erro SEM campo não inventa fields[] — nem lista vazia', async () => {
    const resposta = await createPartner({
      // O documento do fornecedor do seed: o 409 é o de cadastro repetido.
      document: '11222333000144',
      legalName: 'REPETIDA',
      tradeName: null,
      email: null,
      isCustomer: true,
      isSupplier: false,
      isProfessional: false,
      code: null,
      paymentTerms: null,
      active: true,
      registration: null,
      payoutBankInfo: null,
    })
    expect(resposta.status).toBe(409)
    const corpo = resposta.data as unknown as Json
    expect(corpo.fields).toBeUndefined()
    // A extensão do 409 continua: é ela que habilita a oferta de vincular.
    expect(corpo.existingPartnerId).toBeTruthy()
  })
})
