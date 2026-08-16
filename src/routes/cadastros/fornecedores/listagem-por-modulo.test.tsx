import { parceiro, stubDeParceiros } from '@/test/parceiros'
import { renderRoute } from '@/test/utils'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('listagem de Fornecedor com filtro por módulo', () => {
  it('a faixa de chips por módulo aparece na tela', async () => {
    const linhas = [parceiro({ code: 'F001', legalName: 'STELLA ILUMINAÇÃO LTDA' })]
    renderRoute('/cadastros/fornecedores', stubDeParceiros(linhas))

    expect(await screen.findByText('STELLA ILUMINAÇÃO LTDA')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Identificação/ })).toBeInTheDocument()
  })

  it('filtrar por CNPJ com máscara manda só os dígitos', async () => {
    const urls: string[] = []
    const linhas = [parceiro({ code: 'F001', legalName: 'STELLA ILUMINAÇÃO LTDA' })]
    const { user } = renderRoute('/cadastros/fornecedores', (entrada) => {
      urls.push(String(entrada instanceof Request ? entrada.url : entrada))
      return stubDeParceiros(linhas)(entrada)
    })

    await screen.findByText('STELLA ILUMINAÇÃO LTDA')

    await user.click(screen.getByRole('button', { name: /Identificação/ }))
    await user.type(await screen.findByLabelText('CNPJ'), '12.345.678/0001-90')

    await waitFor(() => {
      const consulta = urls.filter((u) => u.includes('filters=')).at(-1)
      expect(consulta).toBeDefined()
      const filtros = JSON.parse(new URL(consulta as string).searchParams.get('filters') as string)
      expect(filtros).toEqual([{ field: 'document', operator: 'iLike', value: '12345678000190' }])
    })
  })
})
