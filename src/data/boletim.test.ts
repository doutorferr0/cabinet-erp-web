import { boletim } from '@/data/boletim'
import { URL_PARCEIROS } from '@/data/parceiros-api'
import { URL_PRODUTOS } from '@/data/produtos-api'
import { colaboradores } from '@/mocks/colaboradores'
import { orcamentos } from '@/mocks/orcamentos'
import { ordensCompra } from '@/mocks/ordens-compra'
import { instalarServidor, json, problema } from '@/test/servidor'
import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * Trava o contrato do boletim, como `provider.test.ts` trava o dos providers.
 * Toda grandeza tem que ser DERIVADA do mock — se um número aqui divergir da
 * contagem direta, alguém inventou métrica.
 *
 * As linhas de CADASTROS (Clientes, Fornecedores, Profissional Externo,
 * Produtos) pedem `data.<recurso>.list`, que é HTTP de verdade — por isso o
 * teste precisa do servidor falso (`docs/integracao.md`), não só dos arrays
 * de `src/mocks/`. `/api/partners` filtra por `role` (query param) e o stub
 * abaixo responde DIFERENTE por papel — se o boletim um dia pedir dois papéis
 * com a mesma consulta (bug de `fixa: { role }` perdido), o teste quebra em
 * vez de passar com número igual por coincidência.
 */

function servidorDeCadastros() {
  return instalarServidor({
    [URL_PARCEIROS]: ({ url }) => {
      const role = new URL(url).searchParams.get('role')
      if (role === 'customer') {
        return json({
          rows: [
            { id: 'c1', active: true },
            { id: 'c2', active: false },
          ],
          total: 2,
        })
      }
      if (role === 'supplier') {
        return json({
          rows: [
            { id: 's1', active: true },
            { id: 's2', active: true },
            { id: 's3', active: false },
          ],
          total: 3,
        })
      }
      if (role === 'professional') {
        return json({ rows: [{ id: 'pf1', active: true }], total: 1 })
      }
      throw new Error(`role inesperado na consulta de parceiros: ${role}`)
    },
    [URL_PRODUTOS]: () =>
      json({
        rows: [
          { id: 'pr1', active: true },
          { id: 'pr2', active: true },
          { id: 'pr3', active: false },
          { id: 'pr4', active: true },
        ],
        total: 4,
      }),
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('boletim', () => {
  it('ancora na data mais recente dos documentos, não em hoje', async () => {
    servidorDeCadastros()
    const b = await boletim()
    const maisRecente = orcamentos
      .map((o) => o.dataEmissao)
      .filter((d): d is string => !!d)
      .sort()
      .at(-1)

    expect(b.dataReferencia).toBe(maisRecente)
    // Formata pt-BR na borda; o dado continua ISO.
    expect(b.dataReferenciaBR).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
  })

  it('conta orçamentos do dia batendo com a contagem direta do mock', async () => {
    servidorDeCadastros()
    const b = await boletim()
    const esperado = orcamentos.filter((o) => o.dataEmissao === b.dataReferencia).length

    expect(b.orcamentosDoDia).toBe(esperado)
    expect(b.movimento.filter((m) => m.especie === 'Orçamento')).toHaveLength(esperado)
  })

  it('lista só ordens com Data Envio em branco, da mais parada para a menos', async () => {
    servidorDeCadastros()
    const b = await boletim()
    const esperado = ordensCompra.filter((o) => !o.dataEnvio).length

    expect(b.ordensSemEnvio).toBe(esperado)
    expect(b.semEnvio).toHaveLength(esperado)

    const dias = b.semEnvio.map((l) => l.diasParado)
    expect(dias).toEqual([...dias].sort((a, c) => c - a))
    // Derivação, não enumeração: nenhuma linha carrega nome de situação.
    for (const linha of b.semEnvio) {
      expect(linha.dataOrdem).not.toBe(null)
    }
  })

  it('valores ficam em centavos (int), nunca float', async () => {
    servidorDeCadastros()
    const b = await boletim()

    expect(Number.isInteger(b.valorOrcadoCentavos)).toBe(true)
    expect(Number.isInteger(b.valorOrdenadoCentavos)).toBe(true)
    for (const linha of b.movimento) {
      expect(Number.isInteger(linha.valorCentavos)).toBe(true)
    }
  })

  it('cadastros de parceiro e produto contam pela MESMA fonte da listagem (HTTP)', async () => {
    const servidor = servidorDeCadastros()
    const b = await boletim()

    expect(b.cadastros.length).toBeGreaterThan(0)
    for (const linha of b.cadastros) {
      expect(linha.total).toBeGreaterThan(0)
      expect(linha.inativos).toBeLessThanOrEqual(linha.total ?? Number.POSITIVE_INFINITY)
    }

    // Clientes (customer, total 2/1 inativo), Fornecedores (supplier, 3/1) e
    // Profissional Externo (professional, 1/0) pedem `/api/partners` com
    // `role` distinto — resposta diferente por papel prova que o filtro
    // chegou ao servidor, não só que o boletim leu de algum lugar HTTP.
    const porNome = Object.fromEntries(b.cadastros.map((l) => [l.nome, l]))
    expect(porNome.Clientes).toMatchObject({ total: 2, inativos: 1, inativosParcial: false })
    expect(porNome.Fornecedores).toMatchObject({ total: 3, inativos: 1, inativosParcial: false })
    expect(porNome['Profissional Externo']).toMatchObject({
      total: 1,
      inativos: 0,
      inativosParcial: false,
    })
    expect(porNome.Produtos).toMatchObject({ total: 4, inativos: 1, inativosParcial: false })

    const chamadasDeParceiro = servidor.em(URL_PARCEIROS)
    const roles = chamadasDeParceiro.map((c) => new URL(c.url).searchParams.get('role')).sort()
    expect(roles).toEqual(['customer', 'professional', 'supplier'])
  })

  it('cadastro cuja listagem falha fica indisponível, sem apagar o resto do boletim', async () => {
    instalarServidor({
      [URL_PARCEIROS]: () => problema(409, 'Nenhuma empresa ativa na sessão.'),
      [URL_PRODUTOS]: () => json({ rows: [{ id: 'pr1', active: true }], total: 1 }),
    })

    const b = await boletim()

    const porNome = Object.fromEntries(b.cadastros.map((l) => [l.nome, l]))
    expect(porNome.Clientes).toMatchObject({ total: null, inativos: null })
    expect(porNome.Fornecedores).toMatchObject({ total: null, inativos: null })
    expect(porNome['Profissional Externo']).toMatchObject({ total: null, inativos: null })
    // Produtos respondeu — não é o `Promise.all` derrubando tudo junto.
    expect(porNome.Produtos).toMatchObject({ total: 1, inativos: 0 })
    // Colaboradores é mock puro — nem passa perto do servidor falso.
    expect(porNome.Colaboradores).toMatchObject({ total: colaboradores.length })
  })

  it('inativos vira piso (`inativosParcial`) quando a listagem pagina antes do total', async () => {
    instalarServidor({
      [URL_PARCEIROS]: ({ url }) => {
        const role = new URL(url).searchParams.get('role')
        if (role !== 'customer') return json({ rows: [], total: 0 })
        // `total` do servidor é maior que o teto de página do boletim: as
        // linhas devolvidas não são o cadastro inteiro.
        return json({ rows: [{ id: 'c1', active: false }], total: 150 })
      },
      [URL_PRODUTOS]: () => json({ rows: [], total: 0 }),
    })

    const b = await boletim()
    const clientes = b.cadastros.find((l) => l.nome === 'Clientes')

    expect(clientes).toMatchObject({ total: 150, inativos: 1, inativosParcial: true })
  })
})
