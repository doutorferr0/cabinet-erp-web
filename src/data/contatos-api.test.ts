import {
  type ContatoDaGrade,
  contatoVazio,
  listarContatos,
  planoDeSincronizacao,
  sincronizarContatos,
} from '@/data/contatos-api'
import { instalarServidor, json, problema } from '@/test/servidor'
import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * Contrato da fronteira dos contatos do parceiro (#293).
 *
 * Servidor falso e não mock de módulo, pela razão do CLAUDE.md: o cliente
 * gerado chama `fetch(new Request(...))`, então verbo e corpo saem do `Request`.
 * Aqui isso não é detalhe — o plano de sincronização decide entre `POST` e dois
 * `PUT` DIFERENTES no MESMO caminho, e um stub que casasse só por caminho
 * deixaria a troca passar sem ninguém notar.
 */

const PARTNER = '11111111-1111-1111-1111-111111111111'
const LISTA = `/api/partners/${PARTNER}/contacts`
const UM = (id: string) => `${LISTA}/${id}`

function dto(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'c1',
    name: 'Marina',
    role: 'Representante',
    phone: '1130001000',
    mobilePhone: null,
    fax: null,
    email: null,
    active: true,
    ...over,
  }
}

function linha(over: Partial<ContatoDaGrade> = {}): ContatoDaGrade {
  return { ...contatoVazio(), id: 'c1', nome: 'Marina', vinculo: 'Representante', ...over }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('leitura', () => {
  it('pede o conjunto inteiro e traduz o DTO para a linha da grade', async () => {
    const servidor = instalarServidor({
      [LISTA]: () => json({ rows: [dto()], total: 1 }),
    })

    const { linhas, cortou } = await listarContatos(PARTNER)

    const url = new URL(servidor.em(LISTA)[0]?.url as string)
    expect(url.searchParams.get('pageSize')).toBe('100')
    expect(linhas).toEqual([
      {
        id: 'c1',
        nome: 'Marina',
        vinculo: 'Representante',
        fone: '1130001000',
        celular: '',
        fax: '',
        email: '',
      },
    ])
    expect(cortou).toBe(false)
  })

  it('DESCARTA o contato inativo — senão o próximo Gravar o ressuscita', async () => {
    // `ListPartnerContacts` não publica filtro por `active`: quem separa é a
    // tela. Se o inativo entrasse na grade, a sincronização o gravaria de volta
    // com `active: true`, desfazendo a remoção de outra pessoa.
    instalarServidor({
      [LISTA]: () =>
        json({ rows: [dto(), dto({ id: 'c2', name: 'Saiu', active: false })], total: 2 }),
    })

    const { linhas, total } = await listarContatos(PARTNER)

    expect(linhas.map((l) => l.id)).toEqual(['c1'])
    // O total continua o do servidor: ele é o que denuncia o corte, e contar só
    // o que sobrou esconderia a diferença.
    expect(total).toBe(2)
  })

  it('diz quando o teto da página cortou a lista', async () => {
    instalarServidor({ [LISTA]: () => json({ rows: [dto()], total: 140 }) })

    expect((await listarContatos(PARTNER)).cortou).toBe(true)
  })

  it('erro do servidor vira ErroDaApi com a frase do contrato', async () => {
    instalarServidor({ [LISTA]: () => problema(403, 'Sem permissão nesta empresa.') })

    await expect(listarContatos(PARTNER)).rejects.toThrow()
  })
})

describe('plano de sincronização', () => {
  it('linha nova é inclusão; linha sem nome não é nada', () => {
    const plano = planoDeSincronizacao(
      [],
      [linha({ id: null, nome: 'Nova' }), linha({ id: null, nome: '   ' })],
    )

    expect(plano.incluir.map((l) => l.nome)).toEqual(['Nova'])
    expect(plano.alterar).toEqual([])
    expect(plano.desativar).toEqual([])
  })

  it('linha INTOCADA fica de fora do alterar', () => {
    // Cada PUT é uma escrita datada no cadastro alheio: quem abriu a ficha para
    // olhar não pode sair dela reescrevendo os contatos de quem editou.
    const antes = [linha(), linha({ id: 'c2', nome: 'Paulo' })]

    const plano = planoDeSincronizacao(antes, [...antes])

    expect(plano.alterar).toEqual([])
  })

  it('linha mexida entra no alterar, e só ela', () => {
    const antes = [linha(), linha({ id: 'c2', nome: 'Paulo' })]
    const depois = [linha({ fone: '1140004000' }), linha({ id: 'c2', nome: 'Paulo' })]

    const plano = planoDeSincronizacao(antes, depois)

    expect(plano.alterar.map((l) => l.id)).toEqual(['c1'])
  })

  it('linha que sumiu da grade vai para desativar, não para alterar', () => {
    const plano = planoDeSincronizacao([linha(), linha({ id: 'c2', nome: 'Paulo' })], [linha()])

    expect(plano.desativar.map((l) => l.id)).toEqual(['c2'])
    expect(plano.alterar).toEqual([])
  })
})

describe('escrita', () => {
  it('inclui com POST, altera com PUT e remove com PUT active:false', async () => {
    const servidor = instalarServidor({
      [LISTA]: () => json(dto({ id: 'novo' }), 201),
      [UM('c1')]: () => json(dto()),
      [UM('c2')]: () => json(dto({ id: 'c2', active: false })),
    })

    await sincronizarContatos(
      PARTNER,
      [linha(), linha({ id: 'c2', nome: 'Paulo' })],
      [linha({ fone: '1140004000' }), linha({ id: null, nome: 'Nova' })],
    )

    const inclusao = servidor.em(LISTA)[0]
    expect(inclusao?.metodo).toBe('POST')
    expect(inclusao?.corpo).toMatchObject({ name: 'Nova', active: true })

    const alteracao = servidor.em(UM('c1'))[0]
    expect(alteracao?.metodo).toBe('PUT')
    expect(alteracao?.corpo).toMatchObject({ phone: '1140004000', active: true })

    // O que sumiu da grade é desativado — NUNCA gravado por cima de outro id.
    const remocao = servidor.em(UM('c2'))[0]
    expect(remocao?.metodo).toBe('PUT')
    expect(remocao?.corpo).toMatchObject({ name: 'Paulo', active: false })
  })

  it('campo em branco viaja como null, não como texto vazio', async () => {
    const servidor = instalarServidor({ [LISTA]: () => json(dto(), 201) })

    await sincronizarContatos(PARTNER, [], [linha({ id: null, nome: ' Nova ', vinculo: '  ' })])

    expect(servidor.em(LISTA)[0]?.corpo).toMatchObject({ name: 'Nova', role: null, email: null })
  })

  it('para na primeira recusa e diz de qual contato ela é', async () => {
    instalarServidor({
      [LISTA]: () => problema(400, 'Contato sem nome não identifica ninguém.'),
      [UM('c1')]: () => json(dto()),
    })

    await expect(
      sincronizarContatos(PARTNER, [], [linha({ id: null, nome: 'Nova' })]),
    ).rejects.toThrow(/Nova|nome/)
  })
})
