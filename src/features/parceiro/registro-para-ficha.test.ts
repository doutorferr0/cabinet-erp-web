import { cliente, fornecedor } from '@/features/cadastro/modulos'
import { clienteVazio } from '@/mocks/clientes'
import { fornecedorVazio } from '@/mocks/fornecedores'
import { describe, expect, it } from 'vitest'
import { registroParaFicha } from './registro-para-ficha'

/**
 * A regra em uma frase: **campo sem `dto` não afirma nada na ficha.**
 *
 * O teste de tela (`ficha-sem-invencao.test.tsx`) prova o efeito no que o
 * operador lê; este prova a regra sobre a estrutura, que é onde ela é decidida.
 */
describe('registroParaFicha', () => {
  it('apaga o campo que o contrato NÃO carrega', () => {
    const registro = { ...clienteVazio(0), nome: 'PROVA', tipoPessoa: 'FISICA' as const }

    const paraFicha = registroParaFicha(registro, cliente)

    // `tipoPessoa` não tem `dto` no schema: o servidor não guarda, então a ficha
    // não pode dizer "Física" só porque o formulário precisa de um default.
    expect('tipoPessoa' in paraFicha).toBe(false)
  })

  it('preserva o campo que o contrato carrega', () => {
    const registro = { ...clienteVazio(0), nome: 'PROVA CURL LTDA', ativo: true }

    const paraFicha = registroParaFicha(registro, cliente)

    // `nome` → `legalName`, `ativo` → `active`: os dois vêm do servidor.
    expect(paraFicha.nome).toBe('PROVA CURL LTDA')
    expect(paraFicha.ativo).toBe(true)
  })

  it('apaga BOOLEANO sem cobertura — `false` também é afirmação', () => {
    const registro = fornecedorVazio(0)
    expect(registro.forneceRevenda).toBe(false)

    const paraFicha = registroParaFicha(registro, fornecedor)

    // Era o caso que o dado real revelou: a ficha lia `false` e escrevia "Não",
    // que o servidor nunca disse. Apagar é diferente de trocar por `false`.
    expect('forneceRevenda' in paraFicha).toBe(false)
  })

  it('não muda o registro que recebeu — o formulário continua com os defaults', () => {
    const registro = { ...clienteVazio(0), tipoPessoa: 'FISICA' as const }

    registroParaFicha(registro, cliente)

    // A mesma tela monta ficha E formulário. Mutar aqui deixaria o formulário
    // com campo `undefined`, que é o defeito de input controlado que o
    // `clienteVazio` existe para evitar.
    expect(registro.tipoPessoa).toBe('FISICA')
  })

  it('atravessa caminho pontilhado sem criar o que não existe', () => {
    // `telefones.foneComercial` é caminho de outro papel; num registro que não o
    // tem, apagar não pode inventar o objeto intermediário.
    const registro = { nome: 'X' } as Record<string, unknown>

    const paraFicha = registroParaFicha(registro, fornecedor)

    expect(paraFicha).toEqual({ nome: 'X' })
  })
})
