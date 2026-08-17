import { describe, expect, it } from 'vitest'
import contrato from '../../contracts/openapi-v1.json'

/**
 * O CONTRATO DIZ QUE EXIGE SESSÃO — e esta é a guarda.
 *
 * Até a issue #122/#124 fecharem esta parte, nenhuma das 58 operações declarava
 * autenticação: o backend exigia sessão em tudo, respondia 401 e 403, e o
 * contrato não sabia de nada. **Front e back concordavam de fato e discordavam
 * no papel** — e é o papel que gera cliente, documentação e mock.
 *
 * O buraco não era acadêmico. Ele já custou caro uma vez, no repo de referência:
 * quatro rotas subiram sem `security` num contrato de 55, e o defeito só apareceu
 * na revisão humana — lint, tipos e 102 testes verdes passaram por cima.
 *
 * A guarda lê o contrato DIRETO e cobra a regra por CAMINHO, não por lista
 * escrita à mão: operação nova nasce exigindo sessão, e quem quiser abrir uma
 * exceção precisa vir aqui declarar por quê.
 */

type Operacao = {
  operationId: string
  security?: unknown[]
  responses?: Record<string, unknown>
}

const doc = contrato as unknown as {
  security?: Array<Record<string, unknown[]>>
  paths: Record<string, Record<string, Operacao>>
  components: { securitySchemes: Record<string, Record<string, string>> }
}

/**
 * As quatro que NÃO exigem sessão. Lista fechada, e cada uma tem um motivo que
 * não é conveniência:
 *
 * - `Health`/`HealthDb` — prova de vida é lida por ORQUESTRADOR, que não tem
 *   sessão. Exigir uma faria o balanceador derrubar a instância por não saber
 *   logar nela.
 * - `AuthLogin` — é o caminho que CRIA a sessão.
 * - `AuthLogout` — encerrar o que já não existe é 204, não 401. Um 401 aqui
 *   deixaria o cliente sem como limpar um cookie vencido.
 */
const PUBLICAS = ['AuthLogin', 'AuthLogout', 'Health', 'HealthDb']

function operacoes(): Array<{ caminho: string; verbo: string; op: Operacao }> {
  return Object.entries(doc.paths).flatMap(([caminho, verbos]) =>
    Object.entries(verbos).map(([verbo, op]) => ({ caminho, verbo, op })),
  )
}

describe('security do contrato', () => {
  it('o documento exige sessão por PADRÃO, no topo', () => {
    // Herança, não repetição: declarar operação a operação faria a próxima
    // nascer sem — que é exatamente como o buraco apareceu.
    expect(doc.security).toEqual([{ sessaoCabinet: [] }])
  })

  it('o esquema é cookie opaco, e não bearer', () => {
    // Não existe tipo `cookieSession` no OpenAPI; `apiKey`+`cookie` é como se
    // expressa. Descrever como `http`/`bearer` descreveria OUTRO mecanismo — e
    // o cliente gerado passaria a montar um cabeçalho que o servidor ignora.
    expect(doc.components.securitySchemes.sessaoCabinet).toMatchObject({
      type: 'apiKey',
      in: 'cookie',
      name: 'cabinet_sessao',
    })
  })

  it('só as quatro públicas desligam a exigência', () => {
    const abertas = operacoes()
      .filter(({ op }) => Array.isArray(op.security) && op.security.length === 0)
      .map(({ op }) => op.operationId)
      .sort()
    expect(abertas).toEqual(PUBLICAS)
  })

  it('toda operação que exige sessão declara 401', () => {
    // Sem o 401 declarado, o cliente gerado não tipa a resposta e o tratamento
    // global de "sessão caiu" fica sem contrato que o justifique.
    const sem = operacoes()
      .filter(({ op }) => !PUBLICAS.includes(op.operationId))
      .filter(({ op }) => op.responses?.['401'] === undefined)
      .map(({ verbo, caminho }) => `${verbo.toUpperCase()} ${caminho}`)
    expect(sem).toEqual([])
  })

  it('toda operação de domínio declara 403', () => {
    // `mustChangePassword` bloqueia o domínio INTEIRO com 403 — leitura
    // inclusive. Declarar só nas escritas (como estava) deixaria metade do
    // domínio devolvendo um código que o contrato não prevê.
    const sem = operacoes()
      .filter(({ caminho }) => caminho.startsWith('/api/'))
      .filter(({ op }) => op.responses?.['403'] === undefined)
      .map(({ verbo, caminho }) => `${verbo.toUpperCase()} ${caminho}`)
    expect(sem).toEqual([])
  })

  it('401 e 403 apontam para a resposta REUTILIZÁVEL, nunca para uma cópia', () => {
    // Duas descrições do mesmo erro divergem com o tempo, e a que diverge é
    // sempre a que ninguém está lendo.
    const copias = operacoes().flatMap(({ verbo, caminho, op }) =>
      (['401', '403'] as const)
        .filter((codigo) => {
          const resposta = op.responses?.[codigo] as { $ref?: string } | undefined
          if (resposta === undefined) return false
          // O 401 de `AuthLogin` é o único inline, e de propósito: lá ele diz
          // "credencial inválida", não "não autenticado".
          if (op.operationId === 'AuthLogin') return false
          return resposta.$ref === undefined
        })
        .map((codigo) => `${verbo.toUpperCase()} ${caminho} → ${codigo}`),
    )
    expect(copias).toEqual([])
  })
})
