import { resolverIdDoLookup } from '@/data/lookups-api'
import { describe, expect, it } from 'vitest'

/**
 * A TRADUÇÃO NOME → ID, e a regra que a governa: **falhar barulhento, nunca
 * chutar** (decisão do user, 2026-08-13).
 *
 * O combo do formulário escolhe por NOME — é o que a lista de apoio expõe ao
 * operador — e o contrato grava por ID. Alguém tem de traduzir, e o perigo mora
 * aqui: **nome não é chave.** Dois itens homônimos no mesmo kind, ou um item
 * renomeado entre a carga da lista e o clique em Gravar, e uma tradução
 * "otimista" grava o id de outro registro. O operador não teria como perceber:
 * a tela mostra o nome que ele escolheu.
 *
 * Por isso a função devolve FALHA como valor, e a tela transforma isso em erro
 * visível em vez de gravar o palpite.
 */
describe('resolverIdDoLookup', () => {
  const lista = new Map<string, string[]>([
    ['STELLA', ['11111111-1111-4111-8111-111111111111']],
    ['ILUMINAR', ['22222222-2222-4222-8222-222222222222']],
    // Homônimos: acontece quando duas empresas do grupo cadastram a mesma marca,
    // ou quando alguém duplica sem perceber. A lista não impede — quem impede é
    // a recusa aqui.
    ['DUPLICADA', ['33333333-3333-4333-8333-333333333333', '44444444-4444-4444-8444-444444444444']],
  ])

  it('resolve o nome que existe uma vez só', () => {
    expect(resolverIdDoLookup(lista, 'STELLA')).toEqual({
      ok: true,
      id: '11111111-1111-4111-8111-111111111111',
    })
  })

  it('recusa nome AMBÍGUO em vez de pegar o primeiro', () => {
    // Pegar `ids[0]` seria o atalho óbvio, e gravaria a marca errada em metade
    // dos casos — sem erro, sem log, sem jeito de o operador saber.
    expect(resolverIdDoLookup(lista, 'DUPLICADA')).toEqual({ ok: false, motivo: 'ambiguo' })
  })

  it('recusa nome que não está na lista', () => {
    // Três causas reais, mesmo desfecho: renomeado depois da carga, desativado,
    // ou fora das 100 primeiras da lista truncada.
    expect(resolverIdDoLookup(lista, 'NÃO EXISTE')).toEqual({ ok: false, motivo: 'desconhecido' })
  })

  it('nome vazio resolve para null — limpar o campo é escolha legítima', () => {
    expect(resolverIdDoLookup(lista, '')).toEqual({ ok: true, id: null })
    expect(resolverIdDoLookup(lista, '   ')).toEqual({ ok: true, id: null })
  })

  it('ignora espaço nas bordas antes de decidir', () => {
    // O valor chega de um combo com texto livre; espaço sobrando não pode virar
    // "nome desconhecido" e barrar uma gravação legítima.
    expect(resolverIdDoLookup(lista, '  STELLA  ')).toEqual({
      ok: true,
      id: '11111111-1111-4111-8111-111111111111',
    })
  })
})
