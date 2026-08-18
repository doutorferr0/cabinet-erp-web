import {
  type ConsultaNaUrl,
  consultaDaUrl,
  consultaParaUrl,
} from '@/components/cabinet/filtros/filtro-na-url'
import type { CampoFiltravel } from '@/lib/filtro-de-consulta'
import { describe, expect, it } from 'vitest'

/**
 * O ENDEREÇO é a única memória que o navegador guarda de graça e que se manda
 * por mensagem. O que se trava aqui é que ele fale o MESMO idioma do contrato
 * (`filters`/`joinOperator`, operadores em inglês) e que endereço torto não
 * derrube a listagem.
 */

const CAMPOS: readonly CampoFiltravel[] = [
  { id: 'name', rotulo: 'Nome', variante: 'text' },
  { id: 'createdAt', rotulo: 'Criado', variante: 'date' },
  { id: 'city', rotulo: 'Cidade', variante: 'multiSelect', opcoes: [] },
]

function consulta(over: Partial<ConsultaNaUrl> = {}): ConsultaNaUrl {
  return { q: '', filtros: [], juncao: 'and', ...over }
}

describe('consultaParaUrl', () => {
  it('listagem crua não escreve nada no endereço', () => {
    // `?q=&filters=` seria o estado normal de toda tela recém-aberta, e um
    // endereço que anuncia filtro onde não há.
    expect(consultaParaUrl(consulta())).toEqual({
      q: undefined,
      filters: undefined,
      joinOperator: undefined,
    })
  })

  it('usa os NOMES do contrato, e o valor viaja no `value`', () => {
    const params = consultaParaUrl(
      consulta({
        q: 'stella',
        filtros: [
          { filtroId: 'f1', id: 'name', variante: 'text', operador: 'iLike', valor: 'STELLA' },
        ],
      }),
    )
    expect(params.q).toBe('stella')
    // Lista, não texto: quem serializa é o router (ver `consultaParaUrl`).
    expect(params.filters).toEqual([{ field: 'name', operator: 'iLike', value: 'STELLA' }])
  })

  it('`and` não vai para o endereço; `or` vai', () => {
    const um = { filtroId: 'f1', id: 'name', variante: 'text', operador: 'eq', valor: 'A' } as const
    expect(consultaParaUrl(consulta({ filtros: [um] })).joinOperator).toBeUndefined()
    expect(consultaParaUrl(consulta({ filtros: [um], juncao: 'or' })).joinOperator).toBe('or')
  })

  it('operador que dispensa valor não leva `value` junto', () => {
    const params = consultaParaUrl(
      consulta({
        filtros: [{ filtroId: 'f1', id: 'name', variante: 'text', operador: 'isEmpty', valor: '' }],
      }),
    )
    expect(params.filters).toEqual([{ field: 'name', operator: 'isEmpty' }])
  })
})

describe('consultaDaUrl', () => {
  it('ida e volta devolve a mesma consulta', () => {
    const original = consulta({
      q: 'stella',
      juncao: 'or',
      filtros: [
        { filtroId: 'f1', id: 'name', variante: 'text', operador: 'iLike', valor: 'STELLA' },
        {
          filtroId: 'f2',
          id: 'city',
          variante: 'multiSelect',
          operador: 'inArray',
          valor: ['c1', 'c2'],
        },
      ],
    })
    const params = consultaParaUrl(original)
    const lida = consultaDaUrl(params as Record<string, unknown>, CAMPOS)

    expect(lida.q).toBe('stella')
    expect(lida.juncao).toBe('or')
    // `filtroId` é chave de linha em memória, nasce nova a cada leitura — é o
    // resto que tem de bater.
    expect(lida.filtros.map(({ filtroId, ...resto }) => resto)).toEqual(
      original.filtros.map(({ filtroId, ...resto }) => resto),
    )
  })

  it('a VARIANTE vem do campo declarado pela tela, não do endereço', () => {
    const lida = consultaDaUrl(
      { filters: '[{"field":"createdAt","operator":"lt","value":"2026-08-18"}]' },
      CAMPOS,
    )
    expect(lida.filtros[0]?.variante).toBe('date')
  })

  it('campo que a tela não oferece é DESCARTADO', () => {
    // Endereço editado à mão não pode injetar filtro que o contrato responde
    // com 400 — a tela mostraria erro de servidor por um link torto.
    const lida = consultaDaUrl(
      { filters: '[{"field":"segredo","operator":"eq","value":"x"}]' },
      CAMPOS,
    )
    expect(lida.filtros).toHaveLength(0)
  })

  it('operador inventado é descartado junto com o filtro', () => {
    const lida = consultaDaUrl(
      { filters: '[{"field":"name","operator":"dropTable","value":"x"}]' },
      CAMPOS,
    )
    expect(lida.filtros).toHaveLength(0)
  })

  it('JSON quebrado abre a tela sem filtro em vez de derrubá-la', () => {
    // URL truncada ao ser colada é o caso comum, e perder a listagem por causa
    // dela seria trocar uma consulta perdida por uma tela perdida.
    expect(consultaDaUrl({ filters: '[{"field":' }, CAMPOS).filtros).toHaveLength(0)
    expect(consultaDaUrl({ filters: 'null' }, CAMPOS).filtros).toHaveLength(0)
    expect(consultaDaUrl({}, CAMPOS)).toEqual({ q: '', filtros: [], juncao: 'and' })
  })

  it('junção desconhecida cai no `and` do contrato', () => {
    expect(consultaDaUrl({ joinOperator: 'xor' }, CAMPOS).juncao).toBe('and')
  })
})
