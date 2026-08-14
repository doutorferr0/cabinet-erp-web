import {
  URL_PARCEIROS,
  corpoDeEscrita,
  corpoDeInclusao,
  corpoDeVinculoPai,
  filhosDoParceiro,
  motivoDeRecusaDoVinculo,
} from '@/data/parceiros-api'
import { parceiro } from '@/test/parceiros'
import { instalarServidor, json } from '@/test/servidor'
import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * HIERARQUIA PAI/FILHO NA FRONTEIRA (issue #91).
 *
 * `parentId` entrou no contrato como `Proposto`; `partners.parent_id` já existia
 * no schema do banco. O que estes casos protegem não é o campo — é a regra do
 * `PUT` em volta dele: **substituir o registro inteiro significa que omitir
 * desvincula**, e a hierarquia é a propriedade em que isso mais dói, porque
 * nenhuma das três telas tem campo de formulário para ela.
 */

const PAI = '11111111-1111-4111-8111-111111111111'
const FILHO = '22222222-2222-4222-8222-222222222222'

const CAMPOS = {
  legalName: 'X',
  tradeName: 'Y',
  document: '1',
  email: 'a@b.c',
  active: true,
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('o `PUT` não pode desvincular por omissão', () => {
  it('a tela que não edita o vínculo devolve o `parentId` como veio', () => {
    // O caso que quebra o cadastro em silêncio: o operador abre um profissional
    // pela tela de Clientes, corrige o e-mail, grava — e o arquiteto perde o
    // escritório sem ninguém tocar em nada parecido com hierarquia.
    const linha = parceiro({ parentId: PAI, parentName: 'ESTÚDIO FERRARI' })
    expect(corpoDeEscrita(linha, CAMPOS).parentId).toBe(PAI)
  })

  it('quem EDITA o vínculo manda o valor novo, inclusive `null`', () => {
    const linha = parceiro({ parentId: PAI })
    expect(corpoDeEscrita(linha, { ...CAMPOS, parentId: null }).parentId).toBeNull()
    expect(corpoDeEscrita(linha, { ...CAMPOS, parentId: FILHO }).parentId).toBe(FILHO)
  })

  it('na inclusão nasce nulo — não há registro anterior a preservar', () => {
    expect(corpoDeInclusao('customer', CAMPOS).parentId).toBeNull()
  })

  it('`corpoDeVinculoPai` troca SÓ o vínculo e devolve o resto intacto', () => {
    const linha = parceiro({
      parentId: null,
      code: 'F001',
      paymentTerms: '30/60/90',
      registration: 'CAU A1',
    })
    const corpo = corpoDeVinculoPai(linha, PAI)

    expect(corpo.parentId).toBe(PAI)
    // O que a ação não menciona viaja de volta como veio — é a mesma promessa
    // que `corpoDeDesativacao` faz, e a razão de o corpo não ser montado à mão
    // na tela.
    expect(corpo.code).toBe('F001')
    expect(corpo.paymentTerms).toBe('30/60/90')
    expect(corpo.registration).toBe('CAU A1')
    expect(corpo.legalName).toBe(linha.legalName)
    expect(corpo.isSupplier).toBe(linha.isSupplier)
    expect(corpo.active).toBe(linha.active)
  })

  it('desvincular é a MESMA chamada, com `null`', () => {
    expect(corpoDeVinculoPai(parceiro({ parentId: PAI }), null).parentId).toBeNull()
  })
})

describe('os filhos saem do `filters`, não de um caminho novo', () => {
  it('consulta por `parentId` e devolve as linhas', async () => {
    const servidor = instalarServidor({
      [URL_PARCEIROS]: () => json({ rows: [parceiro({ id: FILHO })], total: 1 }),
    })

    const filhos = await filhosDoParceiro(PAI)

    expect(filhos.map((f) => f.id)).toEqual([FILHO])
    // O parâmetro viaja como array JSON — o formato que o contrato descreve, e
    // que o `getListPartnersUrl` do codegen NÃO produz (ele faz `String(value)`,
    // que num array de objetos dá `[object Object]`). Por isso a consulta passa
    // pelo provider.
    const url = new URL(servidor.chamadas[0]?.url as string)
    expect(JSON.parse(url.searchParams.get('filters') as string)).toEqual([
      { field: 'parentId', operator: 'eq', value: PAI },
    ])
    // Sem `role`: o vínculo é do CADASTRO, não do papel. Recortar por papel
    // esconderia um filho que também é cliente.
    expect(url.searchParams.get('role')).toBeNull()
  })
})

describe('o laço é recusado ANTES de gravar', () => {
  const filhos = [parceiro({ id: FILHO })]

  it('não se vincula a si mesmo', () => {
    expect(motivoDeRecusaDoVinculo(PAI, PAI, [])).toMatch(/si mesmo/)
  })

  it('não se vincula a um dos próprios filhos — é o A→B→A da issue', () => {
    expect(motivoDeRecusaDoVinculo(PAI, FILHO, filhos)).toMatch(/laço/)
  })

  it('vínculo legítimo passa', () => {
    expect(motivoDeRecusaDoVinculo(PAI, '33333333-3333-4333-8333-333333333333', filhos)).toBeNull()
  })

  it('ciclo de três níveis NÃO é recusado aqui, e isso é deliberado', () => {
    // A tela conhece um nível para baixo e nenhum para cima: A→B→C→A não é
    // visível daqui. Quem fecha é o servidor, com 400. Este caso existe para
    // que ninguém leia a função como garantia de árvore sem laço.
    const neto = '44444444-4444-4444-8444-444444444444'
    expect(motivoDeRecusaDoVinculo(PAI, neto, filhos)).toBeNull()
  })
})
