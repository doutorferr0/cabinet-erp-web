import { destinoDepoisDoLogin, rotaDeOrigemValida } from '@/lib/rota-de-origem'
import { describe, expect, it } from 'vitest'

describe('rotaDeOrigemValida', () => {
  it('aceita caminho interno, com e sem busca', () => {
    expect(rotaDeOrigemValida('/cadastros/clientes')).toBe(true)
    expect(rotaDeOrigemValida('/cadastros/clientes/123?modo=consulta')).toBe(true)
    expect(rotaDeOrigemValida('/')).toBe(true)
  })

  it('recusa o que não é caminho', () => {
    expect(rotaDeOrigemValida('')).toBe(false)
    expect(rotaDeOrigemValida('cadastros/clientes')).toBe(false)
    expect(rotaDeOrigemValida(undefined)).toBe(false)
    expect(rotaDeOrigemValida(42)).toBe(false)
  })

  // O ponto do helper. Sem estas quatro linhas ele não precisaria existir.
  it('recusa destino que sai do site — open redirect', () => {
    expect(rotaDeOrigemValida('https://exemplo.test/phishing')).toBe(false)
    // Protocol-relative: começa com barra e MESMO ASSIM vai para outro host.
    expect(rotaDeOrigemValida('//exemplo.test/phishing')).toBe(false)
    // O browser normaliza a contrabarra para barra: mesma saída, outra grafia.
    expect(rotaDeOrigemValida('/\\exemplo.test')).toBe(false)
    expect(rotaDeOrigemValida('/javascript:alert(1)')).toBe(false)
  })

  it('recusa o próprio login — voltar para ele depois de entrar é laço', () => {
    expect(rotaDeOrigemValida('/login')).toBe(false)
    expect(rotaDeOrigemValida('/login?redirect=/dashboard')).toBe(false)
  })
})

describe('destinoDepoisDoLogin', () => {
  it('abre a origem preservada quando ela é válida', () => {
    expect(destinoDepoisDoLogin('/cadastros/clientes/123')).toBe('/cadastros/clientes/123')
  })

  it('cai no Dashboard quando não há origem ou ela é recusada', () => {
    expect(destinoDepoisDoLogin(undefined)).toBe('/dashboard')
    expect(destinoDepoisDoLogin('//exemplo.test')).toBe('/dashboard')
  })
})
