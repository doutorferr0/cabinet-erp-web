import type { PartnerDto } from '@/api/gerado'
import { corpoDeEscrita } from '@/data/parceiros-api'
import { describe, expect, it } from 'vitest'

/**
 * O CORPO DO `PUT` DE PARCEIRO, medido contra o Postgres (2026-08-18).
 *
 * O `PUT` é integral: o que não voltar no corpo é apagado. As duas armadilhas
 * cobertas aqui são as que o dado real expôs no produto (PR #216) e que este
 * arquivo mede no parceiro — uma acontecendo hoje, outra armada para o dia em
 * que o servidor mudar de ideia sobre o que a listagem devolve.
 *
 * **A listagem de parceiro NÃO omite nada hoje** — medido campo a campo com um
 * registro rico (conselho, conta bancária e vínculo pai): 16 campos na linha, os
 * mesmos 16 no detalhe. É por isso que a segunda guarda é sobre o CONTRATO, e
 * não sobre o servidor: `registration`, `payoutBankInfo` e `parentId` não estão
 * no `required` do `PartnerDto`, então a omissão é permitida a qualquer momento.
 */

/** Parceiro como o Postgres o devolve: os opcionais nulos, e-mail sem valor. */
const LINHA: PartnerDto = {
  id: 'b589e18a-9136-450e-bed8-629c2ff21134',
  code: null,
  legalName: 'PROVA CURL LTDA 2',
  tradeName: 'Prova',
  document: '33333333000191',
  email: null,
  isCustomer: true,
  isSupplier: false,
  isProfessional: false,
  paymentTerms: null,
  active: true,
  registrationActive: true,
  registration: null,
  payoutBankInfo: null,
  parentId: null,
  parentName: null,
  // Contato e endereço (#244). Nulos aqui porque o cadastro medido não os
  // tinha — e as CHAVES existem porque o `PUT` as substitui. Enquanto a
  // migração irmã (`cabinet-erp-api#35`) não estiver na `main` do backend, a
  // listagem não manda estas chaves e `corpoDeEscrita` RECUSA gravar: é a
  // recusa em voz alta, preferida a um Gravar que apaga endereço em silêncio.
  mobilePhone: null,
  businessPhone: null,
  homePhone: null,
  fax: null,
  address: null,
  // Fase 1 (#250) — mesma leitura: chaves presentes e nulas. A janela de
  // recusa é a mesma, e agora com sete campos a mais dentro dela.
  stateRegistration: null,
  ruralProducerRegistration: null,
  categoryId: null,
  categoryName: null,
  specifierId: null,
  specifierName: null,
  notes: null,
  facebook: null,
  instagram: null,
} as PartnerDto

describe('corpo do PUT de parceiro', () => {
  it('devolve campo vazio como NULO, não como texto vazio', () => {
    // É o que o formulário produz depois de carregar um registro com `email`
    // nulo: `dtoParaForm` faz `?? ''` porque input controlado precisa de string.
    const corpo = corpoDeEscrita(LINHA, {
      legalName: 'PROVA CURL LTDA 2',
      tradeName: 'Prova',
      document: '33333333000191',
      email: '',
      active: true,
    })

    // Abrir e gravar sem editar não pode alterar o registro. `''` grava texto
    // vazio onde havia "não informado" — e no `PUT` integral isso É alteração.
    expect(corpo.email).toBeNull()
  })

  it('mantém nulos os campos que o servidor mandou nulos', () => {
    const corpo = corpoDeEscrita(LINHA, {
      legalName: 'PROVA CURL LTDA 2',
      tradeName: 'Prova',
      document: '33333333000191',
      email: 'a@b.c',
      active: true,
    })

    expect(corpo.code).toBeNull()
    expect(corpo.paymentTerms).toBeNull()
  })

  it('RECUSA montar o corpo quando a linha não trouxe um campo gravável', () => {
    // O contrato permite: os três estão fora do `required` do `PartnerDto`, e o
    // tipo gerado os declara `| undefined`. Se um dia a listagem parar de
    // mandá-los, `?? null` os apagaria — silenciosamente, e só na próxima
    // consulta alguém notaria que o profissional perdeu o registro no conselho.
    const { registration: _r, payoutBankInfo: _p, parentId: _pi, ...semOpcionais } = LINHA

    expect(() =>
      corpoDeEscrita(semOpcionais as PartnerDto, {
        legalName: 'X',
        tradeName: 'X',
        document: '1',
        email: 'a@b.c',
        active: false,
      }),
    ).toThrow(/apagaria o campo/)
  })

  it('quem EDITA o campo pode mandá-lo, mesmo que a linha não o traga', () => {
    // A recusa é sobre devolver às cegas o que não se leu. A tela do
    // Profissional, que tem os campos, continua podendo gravá-los.
    const { registration: _r, payoutBankInfo: _p, parentId: _pi, ...semOpcionais } = LINHA

    const corpo = corpoDeEscrita(semOpcionais as PartnerDto, {
      legalName: 'X',
      tradeName: 'X',
      document: '1',
      email: 'a@b.c',
      active: true,
      registration: 'CAU-123456',
      payoutBankInfo: null,
      parentId: null,
    })

    expect(corpo.registration).toBe('CAU-123456')
  })
})
