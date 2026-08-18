import { resumoDoFiltro } from '@/components/cabinet/filtros/resumo-do-filtro'
import type { CampoFiltravel, FiltroDaTabela, VarianteDeFiltro } from '@/lib/filtro-de-consulta'
import { describe, expect, it } from 'vitest'

/**
 * A frase da pílula é o que o operador lê para saber por que a lista encolheu.
 * Errada, ela não quebra nada — só mente em silêncio, que é o defeito que ninguém
 * abre chamado para reportar.
 */

const CAMPOS: Record<string, CampoFiltravel> = {
  nome: { id: 'name', rotulo: 'Nome', variante: 'text' },
  criado: { id: 'createdAt', rotulo: 'Criado', variante: 'date' },
  ativo: { id: 'active', rotulo: 'Ativo', variante: 'boolean' },
  setor: {
    id: 'sector',
    rotulo: 'Setor',
    variante: 'select',
    opcoes: [
      { valor: 's1', rotulo: 'Arquitetura' },
      { valor: 's2', rotulo: 'Obra' },
    ],
  },
  cidades: {
    id: 'city',
    rotulo: 'Cidade',
    variante: 'multiSelect',
    opcoes: [
      { valor: 'c1', rotulo: 'Bauru' },
      { valor: 'c2', rotulo: 'Jaú' },
      { valor: 'c3', rotulo: 'Lins' },
    ],
  },
  preco: { id: 'price', rotulo: 'Preço', variante: 'number' },
}

function filtro(over: Partial<FiltroDaTabela> & { id: string; variante: VarianteDeFiltro }) {
  return {
    filtroId: 'f1',
    operador: 'iLike',
    valor: '',
    ...over,
  } as FiltroDaTabela
}

describe('resumoDoFiltro', () => {
  it('lê como frase: campo, operador e valor', () => {
    const f = filtro({ id: 'name', variante: 'text', operador: 'iLike', valor: 'STELLA' })
    expect(resumoDoFiltro(f, CAMPOS.nome as CampoFiltravel)).toBe('Nome contém STELLA')
  })

  it('operador que dispensa valor é a frase INTEIRA — sem sobra pendurada', () => {
    const f = filtro({ id: 'name', variante: 'text', operador: 'isEmpty', valor: '' })
    expect(resumoDoFiltro(f, CAMPOS.nome as CampoFiltravel)).toBe('Nome está vazio')
  })

  it('sem valor ainda, as reticências dizem que falta digitar', () => {
    const f = filtro({ id: 'name', variante: 'text', operador: 'iLike', valor: '' })
    // A pílula não pode sumir no meio da montagem: ela é o lugar onde se digita.
    expect(resumoDoFiltro(f, CAMPOS.nome as CampoFiltravel)).toBe('Nome contém…')
  })

  it('data aparece em pt-BR, não no ISO que o dado guarda', () => {
    const f = filtro({ id: 'createdAt', variante: 'date', operador: 'lt', valor: '2026-08-18' })
    expect(resumoDoFiltro(f, CAMPOS.criado as CampoFiltravel)).toBe('Criado antes de 18/08/2026')
  })

  it('intervalo mostra as duas pontas ligadas pela conjunção', () => {
    const f = filtro({
      id: 'createdAt',
      variante: 'date',
      operador: 'isBetween',
      valor: ['2026-08-01', '2026-08-31'],
    })
    expect(resumoDoFiltro(f, CAMPOS.criado as CampoFiltravel)).toBe(
      'Criado entre 01/08/2026 e 31/08/2026',
    )
  })

  it('intervalo pela metade mostra a ponta que existe, sem inventar a outra', () => {
    const f = filtro({
      id: 'price',
      variante: 'number',
      operador: 'isBetween',
      valor: ['10', ''],
    })
    expect(resumoDoFiltro(f, CAMPOS.preco as CampoFiltravel)).toBe('Preço está entre 10')
  })

  it('booleano vira Sim/Não — `true` seria código na cara do operador', () => {
    const f = filtro({ id: 'active', variante: 'boolean', operador: 'eq', valor: 'true' })
    expect(resumoDoFiltro(f, CAMPOS.ativo as CampoFiltravel)).toBe('Ativo é Sim')
  })

  it('seleção mostra o RÓTULO da opção, não o id gravado', () => {
    const f = filtro({ id: 'sector', variante: 'select', operador: 'eq', valor: 's2' })
    expect(resumoDoFiltro(f, CAMPOS.setor as CampoFiltravel)).toBe('Setor é Obra')
  })

  it('múltipla escolha curta cabe por nome', () => {
    const f = filtro({
      id: 'city',
      variante: 'multiSelect',
      operador: 'inArray',
      valor: ['c1', 'c2'],
    })
    expect(resumoDoFiltro(f, CAMPOS.cidades as CampoFiltravel)).toBe('Cidade é um de Bauru, Jaú')
  })

  it('múltipla escolha longa vira contagem — pílula do tamanho da barra não é pílula', () => {
    const f = filtro({
      id: 'city',
      variante: 'multiSelect',
      operador: 'inArray',
      valor: ['c1', 'c2', 'c3'],
    })
    expect(resumoDoFiltro(f, CAMPOS.cidades as CampoFiltravel)).toBe('Cidade é um de 3 opções')
  })
})
