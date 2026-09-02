import { ordemAtrasada } from '@/routes/compras/ordens/index'
import { parceiro, stubDeParceiros } from '@/test/parceiros'
import { renderRoute } from '@/test/utils'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * D14 — a Listagem 2.0 CHEGANDO nas rotas.
 *
 * `data-table-agrupamento.test.tsx` (D10) já prova que a tabela sabe decorar e
 * agrupar. O que ele não pode provar é que alguma tela LIGOU as duas coisas:
 * `decoracao` e `agrupamentos` são props opcionais, e uma listagem sem elas
 * passa verde em toda suíte que exista — foi assim que a grade ficou com a
 * peça pronta e nenhuma das onze rotas usando.
 *
 * Por isso o teste é de ROTA (`renderRoute`), não de componente: a asserção é
 * "a tela de clientes decora a linha inativa", não "a tabela sabe decorar".
 */
describe('Listagem 2.0 — cadastro', () => {
  it('o cadastro inativo se anuncia na própria linha, sem faixa', async () => {
    const linhas = [
      parceiro({ id: 'p-ativo', code: 'C001', legalName: 'ALPHA COMERCIO', active: true }),
      parceiro({ id: 'p-inativo', code: 'C002', legalName: 'OMEGA COMERCIO', active: false }),
    ]
    renderRoute('/cadastros/clientes', stubDeParceiros(linhas))

    const inativo = (await screen.findByText('OMEGA COMERCIO')).closest('tr')
    const ativo = screen.getByText('ALPHA COMERCIO').closest('tr')

    // `muted` rebaixa o texto e NÃO ganha faixa: quem saiu do jogo não compete
    // por atenção — a faixa é para o que ainda pede ação.
    expect(inativo?.className).toContain('text-muted-foreground')
    expect(inativo?.className).not.toContain('inset_3px_0_0')
    expect(ativo?.className).not.toContain('text-muted-foreground')
  })

  it('a tela oferece `Situação` no chip Agrupar, que antes não tinha nenhum', async () => {
    renderRoute('/cadastros/clientes', stubDeParceiros([parceiro({ legalName: 'ALPHA' })]))
    await screen.findByText('ALPHA')

    expect(screen.getByRole('button', { name: /nenhum agrupamento aplicado/ })).toBeInTheDocument()
  })
})

/**
 * ATRASO é derivado, e é a única regra de negócio que D14 acrescentou.
 *
 * O contrato publica `draft`, `sent` e `cancelled` para a ordem de compra — e
 * nenhuma delas é "atrasada". A conta mora na rota, e é testada aqui com a
 * data injetada: um teste que dependesse de `new Date()` real passaria hoje e
 * reprovaria sozinho quando as fixtures envelhecessem.
 */
describe('ordemAtrasada', () => {
  const HOJE = new Date(2026, 8, 2)
  const base = {
    id: 'oc-1',
    number: 'OC-5100',
    status: 'sent' as const,
    expectedAt: '2026-09-10',
    rescheduledAt: null,
  }

  it('a previsão que já passou, na ordem enviada, é atraso', () => {
    expect(ordemAtrasada({ ...base, expectedAt: '2026-08-25' } as never, HOJE)).toBe(true)
  })

  it('a prevista para HOJE ainda não atrasou — a comparação é por dia', () => {
    expect(ordemAtrasada({ ...base, expectedAt: '2026-09-02' } as never, HOJE)).toBe(false)
  })

  it('quem reagendou para frente deixa de estar atrasado', () => {
    // Sem isto a linha continuaria pintada por uma promessa que ninguém mantém
    // mais — é a mesma data que a coluna Previsão já mostra como válida.
    const reagendada = { ...base, expectedAt: '2026-08-20', rescheduledAt: '2026-09-30' }
    expect(ordemAtrasada(reagendada as never, HOJE)).toBe(false)
  })

  it('rascunho e cancelada nunca atrasam — não prometeram nada', () => {
    const vencida = { ...base, expectedAt: '2026-08-01' }
    expect(ordemAtrasada({ ...vencida, status: 'draft' } as never, HOJE)).toBe(false)
    expect(ordemAtrasada({ ...vencida, status: 'cancelled' } as never, HOJE)).toBe(false)
  })

  it('ordem sem previsão não é atraso — é ausência de promessa', () => {
    expect(ordemAtrasada({ ...base, expectedAt: null } as never, HOJE)).toBe(false)
  })
})
