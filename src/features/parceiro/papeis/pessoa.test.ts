import type { PartnerDto } from '@/api/gerado'
import { describe, expect, it } from 'vitest'
import { ausentesNoServidor, tipoDePessoaDoContrato, tipoDePessoaParaContrato } from './pessoa'

/**
 * O ROUND-TRIP QUE A GUARDA DE ESCRITA NÃO CONSEGUE FAZER.
 *
 * `cobertura-de-escrita.test.ts` compara literais — o valor que o servidor
 * mandou tem de chegar igual do outro lado. `personType` é o único campo do
 * parceiro que muda de VOCABULÁRIO no caminho, então lá ele entra como exceção
 * declarada e a prova vem para cá: ida e volta, e o 400 que o par local mediu.
 */
describe('tipo de pessoa — o formulário fala português, o contrato fala inglês', () => {
  it('traduz nos dois sentidos sem perder o valor', () => {
    expect(tipoDePessoaDoContrato('individual')).toBe('FISICA')
    expect(tipoDePessoaDoContrato('company')).toBe('JURIDICA')
    expect(tipoDePessoaParaContrato('FISICA')).toBe('individual')
    expect(tipoDePessoaParaContrato('JURIDICA')).toBe('company')
  })

  it('o que sai do formulário está no enum do contrato', () => {
    // O 400 medido no par local em 2026-08-21 foi exatamente este:
    // `body/personType must be equal to one of the allowed values`. O enum
    // aceita três valores, e o rótulo do radio não é nenhum deles.
    const permitidos = ['individual', 'company', null]
    expect(permitidos).toContain(tipoDePessoaParaContrato('FISICA'))
    expect(permitidos).toContain(tipoDePessoaParaContrato('JURIDICA'))
  })

  it('ausência não vira `FISICA` no contrato', () => {
    // O caminho de volta PRECISA de um default (o radio é controlado), mas o
    // de ida não: mandar `individual` para um cadastro em que ninguém escolheu
    // afirmaria ao servidor uma coisa que a tela não sabe.
    expect(tipoDePessoaParaContrato(null)).toBeNull()
    expect(tipoDePessoaParaContrato('')).toBeNull()
    expect(tipoDePessoaDoContrato(null)).toBe('FISICA')
  })

  it('valor desconhecido do servidor não derruba o formulário', () => {
    // Enum que cresce do outro lado é caso normal num contrato `Proposto`. O
    // formulário mostra o default em vez de quebrar, e `ausentesNoServidor`
    // não o esconde: o servidor MANDOU alguma coisa, ela é que não é conhecida.
    expect(tipoDePessoaDoContrato('nonprofit')).toBe('FISICA')
  })
})

describe('ausentesNoServidor — a ficha não repete o default do radio', () => {
  const linha = (personType: string | null): PartnerDto =>
    ({ id: 'x', personType }) as unknown as PartnerDto

  it('lista `tipoPessoa` quando o servidor não guardou', () => {
    expect(ausentesNoServidor(linha(null))).toEqual(['tipoPessoa'])
  })

  it('não lista nada quando o servidor guardou', () => {
    expect(ausentesNoServidor(linha('company'))).toEqual([])
  })

  it('sem linha não há o que apagar', () => {
    // `Incluir` e a janela entre a rota abrir e a query responder. Devolver
    // `['tipoPessoa']` aqui esconderia o campo de um formulário em branco.
    expect(ausentesNoServidor(null)).toEqual([])
  })
})
