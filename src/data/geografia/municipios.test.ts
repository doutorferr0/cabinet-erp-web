import { carregarMunicipios, municipiosIbge } from '@/data/geografia/municipios'
import { tableState } from '@/test/utils'
import { describe, expect, it } from 'vitest'

/**
 * O que estes casos guardam é o ASSET, não o código: o gerador roda à mão, e
 * dataset truncado (uma UF que sumiu, código de 6 dígitos) não quebra nada em
 * tempo de compilação — some cidade da busca em silêncio.
 */
describe('municípios do IBGE', () => {
  it('carrega os 5571 municípios, com as 27 UFs', async () => {
    const municipios = await carregarMunicipios()

    expect(municipios).toHaveLength(5571)
    expect(new Set(municipios.map((m) => m.uf)).size).toBe(27)
  })

  it('todo código é do IBGE: 7 dígitos, texto, e único', async () => {
    const municipios = await carregarMunicipios()

    expect(municipios.every((m) => /^\d{7}$/.test(m.codigo))).toBe(true)
    expect(new Set(municipios.map((m) => m.codigo)).size).toBe(municipios.length)
  })

  it('memoiza a carga — duas chamadas, o mesmo array', async () => {
    expect(await carregarMunicipios()).toBe(await carregarMunicipios())
  })

  it('acha por nome sem acento e sem caixa', async () => {
    const r = await municipiosIbge.list(tableState({ q: 'sao paulo' }))

    expect(r.rows[0]).toEqual({ codigo: '3550308', nome: 'São Paulo', uf: 'SP' })
  })

  it('acha pelo prefixo do código', async () => {
    const r = await municipiosIbge.list(tableState({ q: '3509502' }))

    expect(r.rows).toEqual([{ codigo: '3509502', nome: 'Campinas', uf: 'SP' }])
  })

  /**
   * Homônimo entre estados é a regra, não a exceção — e é o que torna o código
   * necessário na gravação: 'Bom Jesus' existe em seis UFs, e nome+UF é o que o
   * operador lê, mas não é o que identifica.
   */
  it('nome repetido entre UFs continua distinguível pelo código', async () => {
    const r = await municipiosIbge.list(tableState({ q: 'bom jesus', pageSize: 50 }))
    const exatos = r.rows.filter((m) => m.nome === 'Bom Jesus')

    expect(exatos.length).toBeGreaterThan(1)
    expect(new Set(exatos.map((m) => m.codigo)).size).toBe(exatos.length)
  })

  it('a origem é local — nem servidor, nem exemplo', () => {
    expect(municipiosIbge.origem).toBe('local')
  })
})
