import { moduloDaRota } from '@/app/modulo'
import { describe, expect, it } from 'vitest'

describe('moduloDaRota', () => {
  it('casa a raiz EXATAMENTE — `/` é prefixo de tudo', () => {
    expect(moduloDaRota('/')).toBe('boletim')
    expect(moduloDaRota('/vendas/orcamentos')).toBe('vendas')
  })

  it('vale para a listagem e para o que estiver abaixo dela', () => {
    expect(moduloDaRota('/cadastros/produtos')).toBe('produtos')
    expect(moduloDaRota('/cadastros/produtos/novo')).toBe('produtos')
    expect(moduloDaRota('/cadastros/produtos/abc-123')).toBe('produtos')
  })

  it('separa os três papéis de parceiro, que dividem o mesmo pai', () => {
    expect(moduloDaRota('/cadastros/clientes')).toBe('clientes')
    expect(moduloDaRota('/cadastros/fornecedores')).toBe('fornecedores')
    expect(moduloDaRota('/cadastros/profissionais')).toBe('profissionais')
  })

  it('devolve indefinido onde não há cor atribuída — sem chutar módulo', () => {
    // Colaboradores fica fora da tabela de cor travada pelo user; cai no par
    // padrão do `:root` em vez de receber a cor do vizinho.
    expect(moduloDaRota('/cadastros/colaboradores')).toBeUndefined()
    expect(moduloDaRota('/cadastros')).toBeUndefined()
    expect(moduloDaRota('/login')).toBeUndefined()
  })

  it('não casa prefixo pela metade', () => {
    expect(moduloDaRota('/vendasx')).toBeUndefined()
  })
})
