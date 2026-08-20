import { configurarApi } from '@/api/cliente'
import { authLogin, authSetActiveTenant } from '@/api/gerado'
import {
  atualizarParceiro,
  corpoDeEscrita,
  corpoDeInclusao,
  incluirParceiro,
  obterParceiro,
} from '@/data/parceiros-api'
import { papelCliente } from '@/features/parceiro/papeis/cliente'
import { papelProfissional } from '@/features/parceiro/papeis/profissional'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { handlers } from './handlers'
import { TENANT_MATRIZ, novoId, resetStore, store } from './store'

/**
 * O MOCK RESPONDE O CADASTRO INTEIRO — e o preço de não responder era o Gravar.
 *
 * `corpoDeEscrita` RECUSA montar o corpo quando a linha chega sem um campo que
 * o `PUT` substitui: com escrita integral, "não veio" e "está vazio" são
 * indistinguíveis, e adivinhar apagaria dado. A regra está certa e o #244 já a
 * aplicou aos cinco campos de contato — **mas `registration`, `payoutBankInfo`
 * e `parentId` continuavam fora do `partnerDto`**, e as duas decisões corretas,
 * juntas, quebravam o `Gravar` de TODA tela de parceiro no modo mock, que é o
 * modo do site público:
 *
 *     Error: O registro veio do servidor sem `registration`, e o PUT substitui
 *     o cadastro inteiro: gravar assim apagaria o campo. Nada foi enviado.
 *
 * Medido na `main` em 2026-08-20. Nenhum teste pegava porque os testes de
 * escrita usam servidor falso (`src/test/parceiros.ts`), cujo helper já devolve
 * as chaves — o mock do navegador era o único caminho sem cobertura, e é o
 * único que o operador usa.
 */

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

describe('o mock devolve o cadastro inteiro', () => {
  it('a linha traz TODA chave opcional do PartnerDto, mesmo nula', async () => {
    // O fornecedor do seed: os três nascem NULOS nele, que é justamente o caso
    // em que omitir a chave passaria por "está vazio".
    const parceiro = await obterParceiro('parc-0001')
    if (!parceiro) throw new Error('o seed precisa ter o parceiro parc-0001')

    // `toHaveProperty` e não truthiness: o defeito é a chave AUSENTE, e
    // `null` é resposta legítima — são estados diferentes, e é essa diferença
    // que a guarda do `corpoDeEscrita` lê.
    for (const chave of ['registration', 'payoutBankInfo', 'parentId', 'parentName']) {
      expect(parceiro, `o mock omitiu \`${chave}\``).toHaveProperty(chave)
    }
  })

  it('Gravar pela tela de Cliente NÃO é recusado pela guarda de campo ausente', async () => {
    const parceiro = await obterParceiro('parc-0002')
    if (!parceiro) throw new Error('o seed precisa ter o parceiro parc-0002')

    const registro = papelCliente.dtoParaForm(parceiro)
    expect(() =>
      corpoDeEscrita(parceiro, papelCliente.paraEscrita(registro, parceiro)),
    ).not.toThrow()
  })

  it('o conselho e a conta do profissional sobrevivem ao Gravar de OUTRA tela', async () => {
    const parceiro = await obterParceiro('parc-0002')
    if (!parceiro) throw new Error('o seed precisa ter o parceiro parc-0002')
    expect(parceiro.registration).toBe('CAU A123456-7')

    // A tela de Clientes não mostra conselho nem conta bancária. Gravar por ela
    // é o caminho por onde a perda mais doeria — e o `Excluir` da listagem é o
    // mesmo `PUT`, montado a partir da linha.
    const registro = papelCliente.dtoParaForm(parceiro)
    await atualizarParceiro(
      parceiro.id,
      corpoDeEscrita(parceiro, papelCliente.paraEscrita(registro, parceiro)),
    )

    const relido = await obterParceiro(parceiro.id)
    expect(relido?.registration).toBe('CAU A123456-7')
    expect(relido?.payoutBankInfo).toEqual(parceiro.payoutBankInfo)
  })

  it('o que a tela de Profissional edita chega ao servidor e volta', async () => {
    const parceiro = await obterParceiro('parc-0002')
    if (!parceiro) throw new Error('o seed precisa ter o parceiro parc-0002')

    const registro = papelProfissional.dtoParaForm(parceiro)
    const editado = { ...registro, registroProfissional: 'CREA 98765-4' }
    await atualizarParceiro(
      parceiro.id,
      corpoDeEscrita(parceiro, papelProfissional.paraEscrita(editado, parceiro)),
    )

    // O `PUT` do mock ignorava os três: o operador digitava o conselho novo, o
    // servidor respondia 200 com o valor VELHO e a tela voltava para a
    // listagem — sucesso visível, escrita perdida.
    expect((await obterParceiro(parceiro.id))?.registration).toBe('CREA 98765-4')
  })
})

describe('id gerado não colide com o seed', () => {
  /**
   * O contador é UM SÓ para todos os prefixos e o seed grava ids à mão
   * (`parc-0001`…): saindo de 1, o primeiro cadastro incluído nascia
   * `parc-0002`. Nada quebrava na inclusão — quebrava na releitura por id, que
   * encontrava o registro do SEED e devolvia outro cadastro, com a cara exata
   * de "não gravou".
   */
  it('o próximo id não é o de um registro que já existe', () => {
    expect(store.parceiros.map((p) => p.id)).not.toContain(novoId('parc'))
  })

  it('o cadastro incluído é o que a releitura por id devolve', async () => {
    const criado = await incluirParceiro(
      corpoDeInclusao(papelCliente.role, {
        ...papelCliente.paraInclusao({
          ...papelCliente.vazio(0),
          nome: 'CADASTRO NOVO LTDA',
          cpf: '98765432100',
        }),
      }),
    )

    const relido = await obterParceiro(criado.id)
    expect(relido?.legalName).toBe('CADASTRO NOVO LTDA')
  })
})
