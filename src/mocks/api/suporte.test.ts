import { configurarApi } from '@/api/cliente'
import {
  authLogin,
  authMe,
  authSetActiveTenant,
  getSupportGrant,
  listPartners,
  listSupportGrantAudit,
  listSupportGrants,
  openSupportGrant,
  revokeSupportGrant,
} from '@/api/gerado'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { handlers } from './handlers'
import { TENANT_MATRIZ, resetStore } from './store'
import {
  TETO_DO_PRAZO_MS,
  adiantarRelogioDoSuporte,
  agoraDoSuporte,
  entrarComoSuporte,
  resetSuporte,
} from './suporte'

/**
 * O BREAK-GLASS do suporte-da-plataforma — item 6 da fundação.
 *
 * O que estes casos existem para impedir é UMA coisa: que "acesso da plataforma
 * a dado de cliente" volte a ser um booleano. Um booleano passa em qualquer
 * teste de shape — ele tem o tipo certo, o nome certo e responde 200. O que ele
 * não tem é motivo, prazo e trilha, e é exatamente isso que se assere aqui.
 *
 * Prova pelo CLIENTE GERADO, como o resto: é o caminho que a tela vai percorrer.
 * Chamar o handler direto provaria a função, não o comportamento.
 */

const servidor = setupServer(...handlers)

beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }))
afterEach(() => servidor.resetHandlers())
afterAll(() => servidor.close())

beforeEach(async () => {
  resetStore()
  resetSuporte()
  configurarApi('http://mock.teste')
  await authLogin({ email: 'admin@vertz.dev', password: 'qualquer' })
  await authSetActiveTenant({ tenantId: TENANT_MATRIZ })
})

/** Daqui a uma hora — dentro do teto de 8h, longe da fronteira dos dois lados. */
function daquiUmaHora(): string {
  return new Date(agoraDoSuporte() + 60 * 60 * 1000).toISOString()
}

const MOTIVO = 'Chamado 4471 — cliente relata orçamento sem itens'

async function abrirEm(organizationId: string, reason = MOTIVO) {
  return openSupportGrant({ organizationId, reason, expiresAt: daquiUmaHora() })
}

describe('a identidade de suporte não concede nada', () => {
  it('sem ser do suporte, a superfície inteira responde 403', async () => {
    // O caso PADRÃO, e o que substitui o `super-admin`: o alcance começa em
    // zero. Admin da organização — inclusive `owner` — bate aqui e leva 403.
    const lista = await listSupportGrants()
    expect(lista.status).toBe(403)

    const abertura = await abrirEm('org-mobili')
    expect(abertura.status).toBe(403)
  })

  it('SENDO do suporte e sem concessão, a sessão não mostra organização alguma', async () => {
    entrarComoSuporte()

    // 200 na superfície administrativa — a identidade dá isto e só isto.
    const lista = await listSupportGrants()
    expect(lista.status).toBe(200)
    expect(lista.data).toMatchObject({ total: 0 })

    // E `support` continua nulo: ser do suporte não é estar dentro de ninguém.
    const sessao = await authMe()
    expect(sessao.status).toBe(200)
    expect((sessao.data as { support: unknown }).support).toBeNull()
  })
})

describe('acesso sem prazo ou sem motivo é recusado', () => {
  beforeEach(() => entrarComoSuporte())

  it('sem motivo, 400 apontando `reason` — e nada é aberto', async () => {
    const resposta = await openSupportGrant({
      organizationId: 'org-mobili',
      reason: '',
      expiresAt: daquiUmaHora(),
    } as never)

    expect(resposta.status).toBe(400)
    expect(resposta.data).toMatchObject({ type: 'urn:cabinet:erro:campos-invalidos' })
    const campos = (resposta.data as { fields: Array<{ path: string }> }).fields
    expect(campos.map((c) => c.path)).toContain('reason')

    // A recusa é de verdade: não sobrou concessão nenhuma nem linha de trilha.
    const lista = await listSupportGrants()
    expect(lista.data).toMatchObject({ total: 0 })
  })

  it('motivo de fachada (curto demais) também é recusado', async () => {
    // "asdf" tem o tipo certo e preenche o campo. Não é motivo.
    const resposta = await openSupportGrant({
      organizationId: 'org-mobili',
      reason: 'asdf',
      expiresAt: daquiUmaHora(),
    })
    expect(resposta.status).toBe(400)
  })

  it('sem prazo, 400 apontando `expiresAt`', async () => {
    const resposta = await openSupportGrant({
      organizationId: 'org-mobili',
      reason: MOTIVO,
    } as never)

    expect(resposta.status).toBe(400)
    const campos = (resposta.data as { fields: Array<{ path: string }> }).fields
    expect(campos.map((c) => c.path)).toContain('expiresAt')
  })

  it('prazo além do teto de 8 horas é recusado — prazo longo é flag com data', async () => {
    const resposta = await openSupportGrant({
      organizationId: 'org-mobili',
      reason: MOTIVO,
      expiresAt: new Date(agoraDoSuporte() + TETO_DO_PRAZO_MS + 60_000).toISOString(),
    })

    expect(resposta.status).toBe(400)
    const campos = (resposta.data as { fields: Array<{ path: string }> }).fields
    expect(campos.map((c) => c.path)).toContain('expiresAt')
  })

  it('prazo no passado é recusado', async () => {
    const resposta = await openSupportGrant({
      organizationId: 'org-mobili',
      reason: MOTIVO,
      expiresAt: new Date(agoraDoSuporte() - 1000).toISOString(),
    })
    expect(resposta.status).toBe(400)
  })
})

describe('uma organização por vez', () => {
  beforeEach(() => entrarComoSuporte())

  it('a segunda concessão é 409 e diz QUAL está aberta', async () => {
    const primeira = await abrirEm('org-mobili')
    expect(primeira.status).toBe(201)

    const segunda = await abrirEm('org-luz-norte')
    expect(segunda.status).toBe(409)
    expect(segunda.data).toMatchObject({
      type: 'urn:cabinet:erro:suporte-ja-em-organizacao',
      // Sem o `openGrantId` o 409 seria beco sem saída: a tela não teria o que
      // oferecer encerrar. Membro de extensão DECLARADO no contrato — não
      // declarado, ele seria apagado na fronteira e o teste passaria vazio.
      openGrantId: (primeira.data as { id: string }).id,
    })
  })

  it('reabrir na MESMA organização também é 409', async () => {
    // Senão o segundo motivo se esconderia dentro do prazo do primeiro.
    await abrirEm('org-mobili')
    const denovo = await abrirEm('org-mobili', 'Chamado 4472 — outro assunto')
    expect(denovo.status).toBe(409)
  })

  it('encerrando a atual, a próxima abre — e as duas ficam na lista', async () => {
    const primeira = await abrirEm('org-mobili')
    const id = (primeira.data as { id: string }).id

    const encerrada = await revokeSupportGrant(id)
    expect(encerrada.status).toBe(200)
    expect(encerrada.data).toMatchObject({ status: 'revoked' })
    expect((encerrada.data as { revokedAt: string | null }).revokedAt).not.toBeNull()

    const segunda = await abrirEm('org-luz-norte')
    expect(segunda.status).toBe(201)

    // O corte fica registrado: histórico não some ao ser substituído.
    const lista = await listSupportGrants()
    expect(lista.data).toMatchObject({ total: 2 })
  })

  it('encerrar duas vezes é 409, não um segundo encerramento', async () => {
    const grant = await abrirEm('org-mobili')
    const id = (grant.data as { id: string }).id
    await revokeSupportGrant(id)

    const denovo = await revokeSupportGrant(id)
    expect(denovo.status).toBe(409)
    expect(denovo.data).toMatchObject({ type: 'urn:cabinet:erro:concessao-encerrada' })
  })
})

describe('a trilha é gravada', () => {
  beforeEach(() => entrarComoSuporte())

  it('abrir grava `granted` com o motivo preservado na concessão', async () => {
    const grant = await abrirEm('org-mobili')
    const id = (grant.data as { id: string }).id

    expect(grant.data).toMatchObject({
      organizationId: 'org-mobili',
      organizationName: 'Mobili Casa',
      reason: MOTIVO,
      status: 'active',
    })

    const trilha = await listSupportGrantAudit(id)
    expect(trilha.status).toBe(200)
    const acoes = (trilha.data as { rows: Array<{ action: string }> }).rows.map((r) => r.action)
    expect(acoes).toContain('granted')
  })

  it('o acesso a dado de cliente vira linha — com verbo e caminho, sem corpo', async () => {
    const grant = await abrirEm('org-mobili')
    const id = (grant.data as { id: string }).id

    // Uma leitura qualquer de dado do cliente, pelo mesmo caminho que a tela usa.
    const parceiros = await listPartners({ role: 'customer' })
    expect(parceiros.status).toBe(200)

    const trilha = await listSupportGrantAudit(id)
    const linhas = (
      trilha.data as {
        rows: Array<{ action: string; method: string | null; path: string | null }>
      }
    ).rows
    const acesso = linhas.find((l) => l.action === 'accessed')

    expect(acesso).toBeDefined()
    expect(acesso?.method).toBe('GET')
    expect(acesso?.path).toBe('/api/partners')
    // A trilha diz QUE houve acesso e a QUÊ. Copiar o dado do cliente para
    // dentro dela faria o registro de auditoria virar uma segunda cópia do que
    // ele existe para proteger — por isso não há corpo em lugar nenhum.
    expect(Object.keys(acesso as object)).not.toContain('body')
  })

  it('sem concessão aberta, o mesmo acesso NÃO vira linha', async () => {
    // A trilha é do suporte, não um log de tudo: o operador do cliente lendo os
    // próprios parceiros não é acesso da plataforma. Sem este caso, uma trilha
    // que anotasse tudo passaria no teste acima e não significaria nada.
    const grant = await abrirEm('org-mobili')
    const id = (grant.data as { id: string }).id
    await revokeSupportGrant(id)

    await listPartners({ role: 'customer' })

    const trilha = await listSupportGrantAudit(id)
    const acoes = (trilha.data as { rows: Array<{ action: string }> }).rows.map((r) => r.action)
    expect(acoes.filter((a) => a === 'accessed')).toHaveLength(0)
  })

  it('encerrar grava `revoked`, e a trilha sobrevive ao fim da concessão', async () => {
    const grant = await abrirEm('org-mobili')
    const id = (grant.data as { id: string }).id
    await revokeSupportGrant(id)

    const trilha = await listSupportGrantAudit(id)
    const acoes = (trilha.data as { rows: Array<{ action: string }> }).rows.map((r) => r.action)
    expect(acoes).toContain('granted')
    expect(acoes).toContain('revoked')

    // Legível depois de encerrada: registro que some com o prazo não prova nada.
    const detalhe = await getSupportGrant(id)
    expect(detalhe.status).toBe(200)
  })
})

describe('a expiração é real', () => {
  beforeEach(() => entrarComoSuporte())

  it('passado o prazo, o `status` vira `expired` sem ninguém escrever nele', async () => {
    const grant = await abrirEm('org-mobili')
    const id = (grant.data as { id: string }).id
    expect(grant.data).toMatchObject({ status: 'active' })

    // Só o RELÓGIO andou. Nada tocou na concessão — nem `revoke`, nem escrita
    // de campo. Se `status` fosse gravado em vez de derivado, ele continuaria
    // dizendo `active` aqui, e o acesso continuaria valendo.
    adiantarRelogioDoSuporte(61 * 60 * 1000)

    const depois = await getSupportGrant(id)
    expect(depois.data).toMatchObject({ status: 'expired' })
    // Vencer não é encerrar: `revokedAt` continua nulo, e os dois fatos ficam
    // distinguíveis na trilha.
    expect((depois.data as { revokedAt: string | null }).revokedAt).toBeNull()
  })

  it('a sessão deixa de mostrar o acesso — sem a tela precisar expirar nada', async () => {
    await abrirEm('org-mobili')

    const dentro = await authMe()
    expect((dentro.data as { support: { organizationId: string } | null }).support).toMatchObject({
      organizationId: 'org-mobili',
      reason: MOTIVO,
    })

    adiantarRelogioDoSuporte(61 * 60 * 1000)

    const depois = await authMe()
    expect((depois.data as { support: unknown }).support).toBeNull()
  })

  it('o vencimento deixa a sua linha na trilha, como o encerramento deixa', async () => {
    const grant = await abrirEm('org-mobili')
    const id = (grant.data as { id: string }).id

    adiantarRelogioDoSuporte(61 * 60 * 1000)

    const trilha = await listSupportGrantAudit(id)
    const acoes = (trilha.data as { rows: Array<{ action: string }> }).rows.map((r) => r.action)
    expect(acoes).toContain('expired')
    // Uma vez, não uma por leitura: senão a trilha cresceria por ser consultada.
    expect(acoes.filter((a) => a === 'expired')).toHaveLength(1)
  })

  it('acesso depois do prazo não vira linha nova — o alcance acabou junto', async () => {
    const grant = await abrirEm('org-mobili')
    const id = (grant.data as { id: string }).id
    adiantarRelogioDoSuporte(61 * 60 * 1000)

    await listPartners({ role: 'customer' })

    const trilha = await listSupportGrantAudit(id)
    const acoes = (trilha.data as { rows: Array<{ action: string }> }).rows.map((r) => r.action)
    expect(acoes.filter((a) => a === 'accessed')).toHaveLength(0)
  })

  it('vencida, ela LIBERA a vez — a próxima organização abre', async () => {
    await abrirEm('org-mobili')
    adiantarRelogioDoSuporte(61 * 60 * 1000)

    // Sem isto, a regra de uma-por-vez viraria uma trava permanente na primeira
    // organização que alguém esquecesse aberta.
    const segunda = await abrirEm('org-luz-norte')
    expect(segunda.status).toBe(201)
  })
})
