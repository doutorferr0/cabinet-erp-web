import { describe, expect, it } from 'vitest'
import { formatarCep, somenteDigitos } from './cep'

describe('CEP', () => {
  it('mantém apenas oito dígitos e aplica a máscara brasileira', () => {
    expect(somenteDigitos('13.010-111')).toBe('13010111')
    expect(formatarCep('13010111999')).toBe('13010-111')
  })
})
