import { ErroDeCarregamento } from '@/components/cabinet/estado-de-consulta'
import { SemPermissao } from '@/components/cabinet/sem-permissao'
import { ErroDaApi } from '@/data/api-provider'
import { renderWithQuery } from '@/test/utils'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/** O 403 do contrato, como a fronteira o entrega às telas. */
function erro403(detail?: string) {
  return new ErroDaApi('Sem permissão', 403, detail)
}

describe('SemPermissao', () => {
  it('diz o que houve e para onde ir, sem prometer repetição', () => {
    renderWithQuery(<SemPermissao />)

    expect(screen.getByText('Sem permissão')).toBeInTheDocument()
    expect(screen.getByText(/Peça a quem administra/)).toBeInTheDocument()
    // O ponto do componente: nada de "tentar de novo" — repetir com a mesma
    // sessão dá 403 outra vez.
    expect(screen.queryByRole('button', { name: 'Tentar de novo' })).not.toBeInTheDocument()
  })

  it('prefere o detail do servidor, que sabe qual permissão faltou', () => {
    renderWithQuery(<SemPermissao erro={erro403('Você não pode ver preços de custo.')} />)

    expect(screen.getByText('Você não pode ver preços de custo.')).toBeInTheDocument()
    expect(screen.queryByText(/Peça a quem administra/)).not.toBeInTheDocument()
  })

  it('nomeia o contexto quando a tela o informa', () => {
    renderWithQuery(<SemPermissao contexto="esta ficha de produto" />)

    expect(screen.getByText(/esta ficha de produto/)).toBeInTheDocument()
  })
})

describe('ErroDeCarregamento desvia o 403', () => {
  it('mostra a tela de sem permissão no lugar do erro genérico', () => {
    renderWithQuery(
      <ErroDeCarregamento
        mensagem="Não foi possível carregar o cliente."
        erro={erro403()}
        refazer={() => {}}
      />,
    )

    expect(screen.getByText('Sem permissão')).toBeInTheDocument()
    // A mensagem genérica da tela some: ela descreveria como falha o que é recusa.
    expect(screen.queryByText('Não foi possível carregar o cliente.')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tentar de novo' })).not.toBeInTheDocument()
  })

  it('falha de verdade continua oferecendo nova tentativa', () => {
    renderWithQuery(
      <ErroDeCarregamento
        mensagem="Não foi possível carregar o cliente."
        erro={new ErroDaApi('Servidor fora', 500)}
        refazer={() => {}}
      />,
    )

    expect(screen.getByText('Não foi possível carregar o cliente.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
    expect(screen.queryByText('Sem permissão')).not.toBeInTheDocument()
  })
})
