import { ErroDaApi } from '@/data/api-provider'
import {
  TIPOS_DE_PROBLEMA,
  detalheDoErro,
  ehErroDePapelInsuficiente,
  ehErroDeSemVinculoComEmpresa,
  ehErroDeSenhaPrecisaTrocar,
  ehSemPermissao,
  mensagemDoErro,
  tipoDoErro,
} from '@/lib/erros'
import { describe, expect, it } from 'vitest'

function erroApi(status: number, corpo: Record<string, unknown>) {
  return new ErroDaApi(corpo.detail as string, status, corpo.detail as string, corpo)
}

describe('detalheDoErro', () => {
  it('devolve detail de ErroDaApi', () => {
    const erro = erroApi(400, { detail: 'campo inválido' })
    expect(detalheDoErro(erro)).toBe('campo inválido')
  })

  it('devolve undefined para erro comum', () => {
    expect(detalheDoErro(new Error('ops'))).toBeUndefined()
  })
})

describe('ehSemPermissao', () => {
  it('é true para 403', () => {
    expect(ehSemPermissao(erroApi(403, { detail: 'negado' }))).toBe(true)
  })

  it('é false para outros status', () => {
    expect(ehSemPermissao(erroApi(401, { detail: 'negado' }))).toBe(false)
    expect(ehSemPermissao(new Error('ops'))).toBe(false)
  })
})

describe('TIPOS_DE_PROBLEMA', () => {
  it('define as três URNs dos 403', () => {
    expect(TIPOS_DE_PROBLEMA).toEqual({
      senhaPrecisaTrocar: 'urn:cabinet:erro:senha-precisa-trocar',
      semVinculoComEmpresa: 'urn:cabinet:erro:sem-vinculo-com-empresa',
      papelInsuficiente: 'urn:cabinet:erro:papel-insuficiente',
    })
  })
})

describe('tipoDoErro', () => {
  it('classifica cada uma das três URNs', () => {
    expect(tipoDoErro(erroApi(403, { type: TIPOS_DE_PROBLEMA.papelInsuficiente }))).toBe(
      'papelInsuficiente',
    )
    expect(tipoDoErro(erroApi(403, { type: TIPOS_DE_PROBLEMA.senhaPrecisaTrocar }))).toBe(
      'senhaPrecisaTrocar',
    )
    expect(tipoDoErro(erroApi(403, { type: TIPOS_DE_PROBLEMA.semVinculoComEmpresa }))).toBe(
      'semVinculoComEmpresa',
    )
  })

  it('devolve undefined para 403 sem type conhecido', () => {
    expect(tipoDoErro(erroApi(403, { type: 'urn:outra:coisa' }))).toBeUndefined()
  })

  it('devolve undefined para status diferente de 403', () => {
    expect(tipoDoErro(erroApi(400, { type: TIPOS_DE_PROBLEMA.papelInsuficiente }))).toBeUndefined()
  })

  it('devolve undefined para erro que não é ErroDaApi', () => {
    expect(tipoDoErro(new Error('ops'))).toBeUndefined()
  })
})

describe('helpers específicos', () => {
  it('ehErroDePapelInsuficiente', () => {
    expect(
      ehErroDePapelInsuficiente(erroApi(403, { type: TIPOS_DE_PROBLEMA.papelInsuficiente })),
    ).toBe(true)
    expect(
      ehErroDePapelInsuficiente(erroApi(403, { type: TIPOS_DE_PROBLEMA.semVinculoComEmpresa })),
    ).toBe(false)
  })

  it('ehErroDeSenhaPrecisaTrocar', () => {
    expect(
      ehErroDeSenhaPrecisaTrocar(erroApi(403, { type: TIPOS_DE_PROBLEMA.senhaPrecisaTrocar })),
    ).toBe(true)
    expect(
      ehErroDeSenhaPrecisaTrocar(erroApi(403, { type: TIPOS_DE_PROBLEMA.papelInsuficiente })),
    ).toBe(false)
  })

  it('ehErroDeSemVinculoComEmpresa', () => {
    expect(
      ehErroDeSemVinculoComEmpresa(erroApi(403, { type: TIPOS_DE_PROBLEMA.semVinculoComEmpresa })),
    ).toBe(true)
    expect(
      ehErroDeSemVinculoComEmpresa(erroApi(403, { type: TIPOS_DE_PROBLEMA.papelInsuficiente })),
    ).toBe(false)
  })
})

describe('mensagemDoErro', () => {
  it('devolve detail truthy do ErroDaApi', () => {
    const erro = erroApi(400, { detail: 'campo inválido' })
    expect(mensagemDoErro(erro, 'fallback')).toBe('campo inválido')
  })

  it('cai no fallback quando detail é string vazia', () => {
    const erro = erroApi(400, { detail: '' })
    expect(mensagemDoErro(erro, 'fallback')).toBe('fallback')
  })

  it('devolve fallback para erro genérico truthy', () => {
    expect(mensagemDoErro(new Error('ops'), 'fallback')).toBe('fallback')
  })

  it('devolve null quando não há erro', () => {
    expect(mensagemDoErro(null, 'fallback')).toBeNull()
    expect(mensagemDoErro(undefined, 'fallback')).toBeNull()
  })
})
