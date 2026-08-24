import type { PartnerContactDto } from '@/api/gerado'
import {
  type ContatoDaGrade,
  contatoDoContrato,
  contatoParaContrato,
  listarContatos,
  planoDeSincronizacao,
  sincronizarContatos,
} from '@/data/contatos-api'
import { instalarServidor, json, problema } from '@/test/servidor'
import { afterEach, describe, expect, it, vi } from 'vitest'
import contrato from '../../contracts/openapi-v1.json'

/**
 * FRONTEIRA DOS CONTATOS contra servidor falso.
 *
 * O que se afirma aqui é a decisão errável do sub-recurso: **qual verbo cada
 * linha da grade merece**. Linha nova é `POST`, linha conhecida é `PUT`, linha
 * que sumiu é `PUT` com `active: false` — e as duas últimas são a MESMA
 * chamada no MESMO caminho, distintas só pelo corpo. Um teste que casasse por
 * caminho não veria a troca; este lê o corpo do `Request`, que é de onde verbo
 * e corpo realmente vêm.
 */

const PARCEIRO = 'b589e18a-9136-450e-bed8-629c2ff21134'
const CONTATOS = `/api/partners/${PARCEIRO}/contacts`

const DTO: PartnerContactDto = {
  id: 'ct-1',
  name: 'MARIA DA PROVA',
  role: 'Compras',
  phone: '19 3333-1111',
  mobilePhone: '19 99999-1111',
  fax: null,
  email: 'maria@prova.dev',
  active: true,
}

const linha = (parcial: Partial<ContatoDaGrade> = {}): ContatoDaGrade => ({
  id: null,
  nome: 'NOVO CONTATO',
  vinculo: '',
  fone: '',
  celular: '',
  fax: '',
  email: '',
  ...parcial,
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('tradução — o que a grade edita e o que o contrato guarda', () => {
  it('ida e volta preserva os seis campos', () => {
    const daGrade = contatoDoContrato(DTO)

    expect(daGrade).toEqual({
      id: 'ct-1',
      nome: 'MARIA DA PROVA',
      vinculo: 'Compras',
      fone: '19 3333-1111',
      celular: '19 99999-1111',
      fax: '',
      email: 'maria@prova.dev',
    })

    // `fax` volta como `null` e não como `''`: devolver texto vazio trocaria
    // "não informado" por "informado em branco" a cada gravação — o mesmo
    // defeito que `textoOuNulo` conserta no parceiro.
    expect(contatoParaContrato(daGrade, true)).toEqual({
      name: 'MARIA DA PROVA',
      role: 'Compras',
      phone: '19 3333-1111',
      mobilePhone: '19 99999-1111',
      fax: null,
      email: 'maria@prova.dev',
      active: true,
    })
  })

  it('o corpo tem exatamente as chaves que o contrato declara', () => {
    const schema = (contrato as { components: { schemas: Record<string, unknown> } }).components
      .schemas.PartnerContactWriteRequest as { properties: Record<string, unknown> }

    expect(Object.keys(contatoParaContrato(contatoDoContrato(DTO), true)).sort()).toEqual(
      Object.keys(schema.properties).sort(),
    )
  })
})

describe('plano de sincronização — o verbo certo para cada linha', () => {
  const existente = contatoDoContrato(DTO)

  it('linha sem id é inclusão', () => {
    const plano = planoDeSincronizacao([], [linha()])
    expect(plano.incluir).toHaveLength(1)
    expect(plano.alterar).toHaveLength(0)
    expect(plano.desativar).toHaveLength(0)
  })

  it('linha em branco NÃO vira contato', () => {
    // A grade nasce com uma linha vazia e `Incluir linha` põe outra. Sem esta
    // regra, cada `Gravar` criaria um contato anônimo no cadastro.
    const plano = planoDeSincronizacao([], [linha({ nome: '   ' })])
    expect(plano.incluir).toHaveLength(0)
  })

  it('linha com id MEXIDA é alteração', () => {
    const plano = planoDeSincronizacao([existente], [{ ...existente, vinculo: 'Gerente' }])
    expect(plano.alterar).toEqual([{ ...existente, vinculo: 'Gerente' }])
    expect(plano.desativar).toHaveLength(0)
  })

  it('linha INTOCADA não vira PUT', () => {
    // A regra que a #302 prometeu no comentário da issue e não implementou, e
    // que a #331 mediu quebrada na tela: gravar só a linha nova disparava `PUT`
    // na linha que ninguém encostou. Cada `PUT` é escrita DATADA no cadastro de
    // outra pessoa — quem abre a ficha para conferir um telefone não pode sair
    // carimbando os contatos de quem editou antes.
    const plano = planoDeSincronizacao([existente], [existente])
    expect(plano.alterar).toHaveLength(0)
    expect(plano.incluir).toHaveLength(0)
    expect(plano.desativar).toHaveLength(0)
  })

  it('das duas conhecidas, só a mexida sai — a outra fica quieta', () => {
    // O caso que um teste de uma linha só não pega: a régua tem de ser POR
    // LINHA. Comparar "a grade mudou?" mandaria as duas.
    const outra: ContatoDaGrade = { ...existente, id: 'ct-2', nome: 'JOSÉ PARADO' }
    const plano = planoDeSincronizacao(
      [existente, outra],
      [{ ...existente, fone: '19 3333-9999' }, outra],
    )
    expect(plano.alterar.map((l) => l.id)).toEqual(['ct-1'])
  })

  it('mudança que o corpo não carrega não vira PUT', () => {
    // `contatoParaContrato` faz `trim` e traduz vazio em `null`: espaço no fim
    // de um campo produz linha diferente e corpo IGUAL. Pela linha crua seria
    // um `PUT` que não muda nada — por isso a régua é o corpo de escrita.
    const plano = planoDeSincronizacao(
      [existente],
      [{ ...existente, vinculo: `${existente.vinculo}  ` }],
    )
    expect(plano.alterar).toHaveLength(0)
  })

  it('linha com id DESCONHECIDO vira PUT, por precaução', () => {
    // A tela não produz isto hoje. Não sabendo o que o servidor tem, escrever é
    // o lado errável mais barato — o outro perderia a edição em silêncio.
    const plano = planoDeSincronizacao([], [existente])
    expect(plano.alterar).toEqual([existente])
  })

  it('linha que sumiu da grade é desativação, não alteração', () => {
    // A distinção que este arquivo existe para vigiar: as duas viram `PUT` no
    // mesmo caminho, e trocá-las gravaria o contato removido por cima do que
    // ficou.
    const plano = planoDeSincronizacao([existente], [])
    expect(plano.desativar).toEqual([existente])
    expect(plano.alterar).toHaveLength(0)
  })
})

describe('contra o servidor', () => {
  it('a listagem pede o conjunto inteiro e devolve as linhas da grade', async () => {
    const servidor = instalarServidor({
      [CONTATOS]: () => json({ rows: [DTO], total: 1 }),
    })

    const linhas = await listarContatos(PARCEIRO)

    expect(linhas).toHaveLength(1)
    expect(linhas[0]?.nome).toBe('MARIA DA PROVA')
    // Sem paginação no bloco: `pageSize` no teto do contrato.
    expect(servidor.em(CONTATOS)[0]?.url).toContain('pageSize=100')
  })

  it('o contato DESATIVADO não volta para a grade', async () => {
    // Medido no par local (2026-08-22): o `GET` devolve os inativos junto, e o
    // contrato não publica filtro de situação nesta operação. Se a linha
    // voltasse, o `Gravar` seguinte a regravaria com `active: true` — a
    // remoção desfeita por quem só quis corrigir um telefone.
    instalarServidor({
      [CONTATOS]: () =>
        json({ rows: [DTO, { ...DTO, id: 'ct-9', name: 'QUEM SAIU', active: false }], total: 2 }),
    })

    const linhas = await listarContatos(PARCEIRO)

    expect(linhas.map((l) => l.nome)).toEqual(['MARIA DA PROVA'])
  })

  it('inclui com POST, altera com PUT e remove com PUT active:false', async () => {
    const existente = contatoDoContrato(DTO)
    // Uma quarta linha, conhecida e INTOCADA, viaja no cenário inteiro: é ela
    // que prova pela REDE que a régua nova vale — nenhuma chamada sai no
    // caminho dela.
    const parado: ContatoDaGrade = { ...existente, id: 'ct-7', nome: 'JOSÉ PARADO' }
    const servidor = instalarServidor({
      [CONTATOS]: () => json(DTO, 201),
      [`${CONTATOS}/ct-1`]: () => json(DTO),
      [`${CONTATOS}/ct-7`]: () => json({ ...DTO, id: 'ct-7' }),
      [`${CONTATOS}/ct-9`]: () => json({ ...DTO, id: 'ct-9', active: false }),
    })

    await sincronizarContatos(
      PARCEIRO,
      [existente, parado, { ...existente, id: 'ct-9', nome: 'QUEM SAIU' }],
      [{ ...existente, fone: '19 3333-7777' }, parado, linha({ nome: 'QUEM CHEGOU' })],
    )

    const inclusao = servidor.em(CONTATOS).find((c) => c.metodo === 'POST')
    expect(inclusao?.corpo).toMatchObject({ name: 'QUEM CHEGOU', active: true })

    expect(servidor.em(`${CONTATOS}/ct-1`)[0]?.metodo).toBe('PUT')
    expect(servidor.em(`${CONTATOS}/ct-1`)[0]?.corpo).toMatchObject({
      phone: '19 3333-7777',
      active: true,
    })

    // A linha que ninguém encostou não recebe escrita nenhuma. Sem isto, abrir
    // a ficha e gravar um contato novo carimbava data de alteração em todos os
    // outros — rastro de edição que não houve.
    expect(servidor.em(`${CONTATOS}/ct-7`)).toHaveLength(0)

    // O que saiu da grade não é apagado — o contrato não publica DELETE, e
    // cadastro deste produto se desativa (CLAUDE.md, padrão 8).
    expect(servidor.em(`${CONTATOS}/ct-9`)[0]?.metodo).toBe('PUT')
    expect(servidor.em(`${CONTATOS}/ct-9`)[0]?.corpo).toMatchObject({
      name: 'QUEM SAIU',
      active: false,
    })
  })

  it('a recusa do servidor chega com o `detail`, dizendo QUAL contato', async () => {
    instalarServidor({
      [CONTATOS]: () => problema(400, 'Nome do contato é obrigatório.'),
    })

    // Sequencial, e a mensagem nomeia a linha: em paralelo a primeira falha
    // deixaria as outras pela metade sem ninguém saber onde parou.
    await expect(sincronizarContatos(PARCEIRO, [], [linha({ nome: 'SEM SORTE' })])).rejects.toThrow(
      /SEM SORTE/,
    )
  })
})

describe('o contrato publica o que esta fronteira usa', () => {
  it('as três operações existem', () => {
    const paths = (contrato as { paths: Record<string, Record<string, unknown>> }).paths
    expect(paths['/api/partners/{partnerId}/contacts']).toHaveProperty('get')
    expect(paths['/api/partners/{partnerId}/contacts']).toHaveProperty('post')
    expect(paths['/api/partners/{partnerId}/contacts/{contactId}']).toHaveProperty('put')
  })

  it('NÃO existe DELETE — a remoção da grade tem de ser lógica', () => {
    const paths = (contrato as { paths: Record<string, Record<string, unknown>> }).paths
    expect(paths['/api/partners/{partnerId}/contacts/{contactId}']).not.toHaveProperty('delete')
  })
})
