import { configurarApi } from '@/api/cliente'
import { authLogin, authSetActiveTenant } from '@/api/gerado'
import {
  atualizarParceiro,
  corpoDeEscrita,
  corpoDeInclusao,
  enderecoOuNulo,
  incluirParceiro,
  obterParceiro,
} from '@/data/parceiros-api'
import { papelCliente } from '@/features/parceiro/papeis/cliente'
import { papelFornecedor } from '@/features/parceiro/papeis/fornecedor'
import { papelProfissional } from '@/features/parceiro/papeis/profissional'
import { handlers } from '@/mocks/api/handlers'
import { TENANT_MATRIZ, resetStore } from '@/mocks/api/store'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

/**
 * A IDA E A VOLTA DO CONTATO E DO ENDEREÇO (#244).
 *
 * O defeito que originou a issue não se vê em teste de unidade: um user
 * preencheu o celular no par local, gravou, e o valor não voltou. Cada peça
 * estava certa — o formulário tinha o campo, o Zod o validava, o `PUT` subia —
 * e o campo não existia no contrato, então o corpo era montado sem ele e o
 * dado morria no caminho, calado.
 *
 * Por isso este teste percorre o caminho INTEIRO, e contra o mock que responde
 * de verdade (`handlers`), não contra um stub: **linha do servidor → registro
 * do formulário → corpo do `PUT` → servidor → releitura**. É o único formato em
 * que "o valor não voltou" pode falhar.
 *
 * Os três papéis entram porque editam conjuntos DIFERENTES do mesmo
 * `PartnerWriteRequest` — o Fornecedor não tem celular, o Profissional guarda
 * os telefones sob um prefixo — e um mapa errado em um deles passaria
 * despercebido se só um fosse testado.
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

const ENDERECO_DIGITADO = {
  cep: '13100200',
  logradouro: 'Rua Barão de Jaguara',
  numero: '1030',
  complemento: 'Sala 12',
  bairro: 'Centro',
  cidadeCodigo: null,
  cidadeNome: 'CAMPINAS',
  uf: 'SP',
}

describe('contato e endereço fazem a volta inteira', () => {
  it('CLIENTE: o celular digitado volta do servidor', async () => {
    const parceiro = await obterParceiro('parc-0002')
    if (!parceiro) throw new Error('o seed do mock precisa ter o parceiro parc-0002')

    const registro = papelCliente.dtoParaForm(parceiro)
    const editado = { ...registro, celular: '19 98888-7777', endereco: ENDERECO_DIGITADO }
    await atualizarParceiro(
      parceiro.id,
      corpoDeEscrita(parceiro, papelCliente.paraEscrita(editado, parceiro)),
    )

    const relido = await obterParceiro(parceiro.id)
    expect(relido?.mobilePhone).toBe('19 98888-7777')
    expect(relido?.address).toEqual({
      zipCode: '13100200',
      street: 'Rua Barão de Jaguara',
      number: '1030',
      complement: 'Sala 12',
      district: 'Centro',
      city: 'CAMPINAS',
      state: 'SP',
    })
    // E a volta completa a volta: o formulário relê o que gravou.
    expect(papelCliente.dtoParaForm(relido as never).endereco).toEqual({
      ...ENDERECO_DIGITADO,
      // O código da cidade NÃO volta, e está declarado assim em
      // `enderecoDoContrato`: o contrato publica o nome, não o id do lookup.
      cidadeCodigo: null,
    })
  })

  it('FORNECEDOR: o telefone do bloco obrigatório é o COMERCIAL, e volta', async () => {
    const parceiro = await obterParceiro('parc-0001')
    if (!parceiro) throw new Error('o seed do mock precisa ter o parceiro parc-0001')

    const registro = papelFornecedor.dtoParaForm(parceiro)
    expect(registro.fone1).toBe('11 3322-1200')

    const editado = { ...registro, fone1: '11 4004-0001', fax: '' }
    await atualizarParceiro(
      parceiro.id,
      corpoDeEscrita(parceiro, papelFornecedor.paraEscrita(editado, parceiro)),
    )

    const relido = await obterParceiro(parceiro.id)
    expect(relido?.businessPhone).toBe('11 4004-0001')
    // Apagar de verdade: campo esvaziado na tela vira `null`, não `''`.
    expect(relido?.fax).toBeNull()
    // O que a tela de Fornecedor NÃO tem continua lá — é a rede do
    // `corpoDeEscrita`, e sem ela gravar aqui apagaria o celular que o cadastro
    // já tinha.
    expect(relido?.mobilePhone).toBe('11 98877-1200')
  })

  it('PROFISSIONAL: os quatro telefones moram sob `telefones.` e viajam planos', async () => {
    const parceiro = await obterParceiro('parc-0002')
    if (!parceiro) throw new Error('o seed do mock precisa ter o parceiro parc-0002')

    const registro = papelProfissional.dtoParaForm(parceiro)
    expect(registro.telefones.celular).toBe('19 99712-4488')

    const editado = {
      ...registro,
      telefones: {
        celular: '19 90000-0001',
        foneComercial: '19 3000-0002',
        foneResidencial: '19 3000-0003',
        fax: '19 3000-0004',
      },
    }
    await atualizarParceiro(
      parceiro.id,
      corpoDeEscrita(parceiro, papelProfissional.paraEscrita(editado, parceiro)),
    )

    const relido = await obterParceiro(parceiro.id)
    expect(relido?.mobilePhone).toBe('19 90000-0001')
    expect(relido?.businessPhone).toBe('19 3000-0002')
    expect(relido?.homePhone).toBe('19 3000-0003')
    expect(relido?.fax).toBe('19 3000-0004')
    // O conselho e a conta continuam intactos: esta tela os edita, e o teste
    // que grava telefone não pode ser o que os perde.
    expect(relido?.registration).toBe('CAU A123456-7')
    expect(relido?.payoutBankInfo).toEqual(parceiro.payoutBankInfo)
  })

  it('endereço em branco é `null`, não um endereço vazio', () => {
    expect(enderecoOuNulo(papelCliente.vazio(0).endereco)).toBeNull()
    expect(enderecoOuNulo({ ...ENDERECO_DIGITADO, cep: '' })).not.toBeNull()
  })

  it('o cadastro NOVO nasce com o contato que o operador digitou', async () => {
    const criado = await incluirParceiro(
      corpoDeInclusao(
        papelCliente.role,
        papelCliente.paraInclusao({
          ...papelCliente.vazio(0),
          nome: 'NOVO CLIENTE',
          cpf: '98765432100',
          celular: '19 91111-2222',
          endereco: ENDERECO_DIGITADO,
        }),
      ),
    )

    expect(criado.mobilePhone).toBe('19 91111-2222')
    expect(criado.address?.city).toBe('CAMPINAS')
    // Nasce com o que a tela mandou e nada mais: o que ela não tem nasce nulo,
    // não herdado de outro cadastro.
    expect(criado.registration).toBeNull()

    const relido = await obterParceiro(criado.id)
    expect(relido?.mobilePhone).toBe('19 91111-2222')
  })

  /**
   * A REGRESSÃO QUE ESTA ISSUE ENCONTROU DE LADO.
   *
   * O `partnerDto` do mock publicava só o que o `PartnerDto` declara em
   * `required`, e `corpoDeEscrita` RECUSA gravar quando um opcional que o
   * servidor grava não veio na linha (a guarda de "ausente não é nulo"). As
   * duas decisões estão certas e, juntas, quebravam o `Gravar` de toda tela de
   * parceiro no modo mock — que é o modo do site público. Medido em
   * 2026-08-20.
   */
  it('gravar pelo mock NÃO é recusado pela guarda de campo ausente', async () => {
    // O cadastro SEM contato do seed é o de outra empresa; aqui basta um do
    // vínculo ativo — a guarda não olha valor, olha presença da chave.
    const parceiro = await obterParceiro('parc-0002')
    if (!parceiro) throw new Error('o seed do mock precisa ter o parceiro parc-0002')

    const registro = papelCliente.dtoParaForm(parceiro)
    expect(() =>
      corpoDeEscrita(parceiro, papelCliente.paraEscrita(registro, parceiro)),
    ).not.toThrow()
  })
})
