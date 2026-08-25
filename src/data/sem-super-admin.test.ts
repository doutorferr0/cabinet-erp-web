import { describe, expect, it } from 'vitest'
import contrato from '../../contracts/openapi-v1.json'

/**
 * A GUARDA CONTRA A VOLTA DO `super-admin` — item 6 da fundação.
 *
 * O trilho quebrou o super-admin *antes de ele existir*, e é justamente por isso
 * que ele pode voltar sem ninguém notar: não há código a apagar, só um desenho a
 * preservar. A forma de ele voltar não é alguém escrever `superAdmin: true` com
 * má intenção — é um campo de conveniência num PR de outra coisa. `allTenants`
 * num DTO de sessão. `organizationIds` no lugar de `organizationId`. Um
 * `expiresAt` que vira opcional porque "no console interno não precisa".
 *
 * Cada um desses passa em revisão: são pequenos, são plausíveis e cada um tem um
 * motivo local bom. É essa classe que esta guarda cobra, lendo o CONTRATO
 * direto — não uma lista escrita à mão, que envelheceria com o documento.
 *
 * Ela vive em `src/data/` ao lado da `security-do-contrato.test.ts`, e pela
 * mesma razão: são as duas guardas de ACESSO do contrato, e quem mexe numa
 * costuma precisar da outra.
 */

const doc = contrato as unknown as {
  paths: Record<string, Record<string, { operationId?: string }>>
  components: {
    schemas: Record<
      string,
      {
        required?: string[]
        properties?: Record<string, { type?: unknown; $ref?: string; oneOf?: unknown[] }>
      }
    >
  }
}

/**
 * Os nomes que uma flag global teria. Não é lista de proibidos por gosto: cada
 * um destes, como booleano num schema, É o acesso irrestrito que a fundação
 * mandou não existir.
 */
const CARA_DE_FLAG_GLOBAL =
  /^(is)?(super|platform|global)?(admin|Admin|SuperAdmin|Support)$|^(all|every)(Tenants|Organizations|Orgs)$|^superAdmin$|^isSuperAdmin$|^platformAdmin$|^bypass/i

describe('o super-admin não volta pelo contrato', () => {
  it('nenhum schema carrega booleano com cara de flag global', () => {
    const achados: string[] = []
    for (const [nome, schema] of Object.entries(doc.components.schemas)) {
      for (const [prop, def] of Object.entries(schema.properties ?? {})) {
        const ehBooleano =
          def.type === 'boolean' ||
          (Array.isArray(def.type) && (def.type as string[]).includes('boolean'))
        if (ehBooleano && CARA_DE_FLAG_GLOBAL.test(prop)) achados.push(`${nome}.${prop}`)
      }
    }
    // Acesso da plataforma a dado de cliente é uma CONCESSÃO com prazo, motivo e
    // trilha — nunca um booleano. Se este caso ficou vermelho, o campo novo
    // precisa virar concessão, não entrar na lista de exceções.
    expect(achados).toEqual([])
  })

  it('a sessão não declara alcance próprio — ela aponta para UMA concessão', () => {
    const sessao = doc.components.schemas.SessaoAtual
    expect(sessao).toBeDefined()

    // `organizationId` é a organização da PESSOA; `support` é o alcance
    // emprestado. Um `organizationIds` plural aqui seria o super-admin de volta.
    expect(Object.keys(sessao.properties ?? {})).not.toContain('organizationIds')
    expect(sessao.properties?.support).toBeDefined()
  })

  it('a concessão nomeia UMA organização, no singular', () => {
    const pedido = doc.components.schemas.SupportGrantRequest
    const concessao = doc.components.schemas.SupportGrantDto

    for (const [nome, schema] of [
      ['SupportGrantRequest', pedido],
      ['SupportGrantDto', concessao],
      ['SupportContextDto', doc.components.schemas.SupportContextDto],
    ] as const) {
      const props = Object.keys(schema.properties ?? {})
      expect(props, `${nome} precisa nomear a organização`).toContain('organizationId')
      // O plural é o modo elegante de reconstruir a flag: um array de
      // organizações numa concessão é acesso a N clientes com um motivo só.
      expect(props, `${nome} não pode alcançar organizações no plural`).not.toContain(
        'organizationIds',
      )
    }

    expect(pedido.properties?.organizationId?.type).toBe('string')
  })

  it('motivo e prazo são OBRIGATÓRIOS no pedido — não há acesso sem os dois', () => {
    const pedido = doc.components.schemas.SupportGrantRequest
    // É a asserção central do trilho. Qualquer um dos dois virando opcional
    // devolve o acesso irrestrito, só que com um formulário na frente.
    expect(pedido.required).toContain('organizationId')
    expect(pedido.required).toContain('reason')
    expect(pedido.required).toContain('expiresAt')
  })

  it('a concessão publica prazo e estado, e o contexto da sessão publica o prazo', () => {
    expect(doc.components.schemas.SupportGrantDto.required).toEqual(
      expect.arrayContaining(['expiresAt', 'status', 'revokedAt', 'reason']),
    )
    // Sem `expiresAt` no contexto, a tela não teria como dizer até quando o
    // acesso vale — e acesso sem fim visível volta a parecer permanente.
    expect(doc.components.schemas.SupportContextDto.required).toEqual(
      expect.arrayContaining(['expiresAt', 'organizationId', 'reason']),
    )
  })

  it('a trilha existe e não tem como ser apagada pelo contrato', () => {
    const caminhoDaTrilha = doc.paths['/api/platform/support-grants/{id}/audit']
    expect(caminhoDaTrilha).toBeDefined()
    // Só leitura. `DELETE` publicado aqui deixaria a trilha ser limpa por quem
    // ela existe para vigiar, que é a única pessoa com motivo para limpá-la.
    expect(Object.keys(caminhoDaTrilha)).toEqual(['get'])
  })

  it('encerrar o acesso é publicado — entrar não pode ser mais fácil que sair', () => {
    expect(doc.paths['/api/platform/support-grants/{id}/revoke']?.post).toBeDefined()
  })

  it('as operações de suporte vivem em superfície separada, sob /api/platform/', () => {
    const deSuporte = Object.entries(doc.paths).filter(([, verbos]) =>
      Object.values(verbos).some((op) => /Support/.test(op.operationId ?? '')),
    )
    expect(deSuporte.length).toBeGreaterThan(0)
    for (const [caminho] of deSuporte) {
      // Fora de `/api/platform/`, a operação responderia ao papel da
      // organização — e o suporte passaria a ser um papel de cliente com
      // permissões demais, que é o desenho que este trilho desfez.
      expect(caminho.startsWith('/api/platform/'), `${caminho} fora da superfície`).toBe(true)
    }
  })
})
