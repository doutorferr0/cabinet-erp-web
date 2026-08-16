import { parceiro, stubDeParceiros } from '@/test/parceiros'
import { renderRoute } from '@/test/utils'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * A #104 é sobre a TELA, não sobre o componente. `filtro-por-modulo.test.tsx`
 * monta o `FiltroPorModulo` direto e prova a mecânica; nada até aqui provava
 * que a listagem real chega a desenhá-lo — e a condição que libera o bloco de
 * filtro na DataTable olha para `filtros`, não para `entidade`.
 */
describe('listagem de Profissional com filtro por módulo', () => {
  it('a faixa de chips por módulo aparece na tela', async () => {
    const linhas = [parceiro({ code: 'P001', legalName: 'MARINA DUARTE', isProfessional: true })]
    renderRoute('/cadastros/profissionais', stubDeParceiros(linhas))

    expect(await screen.findByText('MARINA DUARTE')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Identificação/ })).toBeInTheDocument()
  })

  // A faixa por módulo monta o filtro a partir do schema, mas quem sabe LIMPAR
  // a máscara é a whitelist da tela (`normalizar`). São listas diferentes, e o
  // valor só sai em dígito puro se as duas estiverem ligadas — este teste é o
  // que prova que estão.
  it('filtrar por CPF/CNPJ com máscara manda só os dígitos', async () => {
    const urls: string[] = []
    const linhas = [parceiro({ code: 'P001', legalName: 'MARINA DUARTE', isProfessional: true })]
    const { user } = renderRoute('/cadastros/profissionais', (entrada) => {
      urls.push(String(entrada instanceof Request ? entrada.url : entrada))
      return stubDeParceiros(linhas)(entrada)
    })

    await screen.findByText('MARINA DUARTE')

    await user.click(screen.getByRole('button', { name: /Identificação/ }))
    await user.type(await screen.findByLabelText('CPF / CNPJ'), '12.345.678/0001-90')

    await waitFor(() => {
      const consulta = urls.filter((u) => u.includes('filters=')).at(-1)
      expect(consulta).toBeDefined()
      const filtros = JSON.parse(new URL(consulta as string).searchParams.get('filters') as string)
      expect(filtros).toEqual([{ field: 'document', operator: 'iLike', value: '12345678000190' }])
    })
  })
})
