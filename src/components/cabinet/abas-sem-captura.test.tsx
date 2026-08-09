import { AbasSemCaptura } from '@/components/cabinet/abas-sem-captura'
import { Tabs } from '@/components/ui/tabs'
import { renderWithQuery } from '@/test/utils'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('AbasSemCaptura', () => {
  it('renderiza a aba capturada e as abas ainda sem transcrição', async () => {
    const { user } = renderWithQuery(
      <Tabs defaultValue="principal">
        <AbasSemCaptura
          capturada={['principal', 'Principal']}
          abas={[
            ['cobranca', 'Cobrança'],
            ['obra', 'Obra'],
          ]}
        >
          <p>conteúdo capturado</p>
        </AbasSemCaptura>
      </Tabs>,
    )

    expect(screen.getByRole('tab', { name: 'Principal' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Cobrança' })).toBeInTheDocument()
    expect(screen.getByText('conteúdo capturado')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Cobrança' }))
    expect(screen.getByText(/Aba Cobrança não capturada/)).toBeInTheDocument()
  })
})
