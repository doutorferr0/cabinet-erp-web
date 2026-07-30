import { cadastroActions } from '@/components/vitra/cadastro-actions'
import { VitraDataTable } from '@/components/vitra/data-table'
import { data } from '@/data'
import type { Produto } from '@/mocks/produtos'
import { renderWithQuery } from '@/test/utils'
import type { ColumnDef } from '@tanstack/react-table'
import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const columns: ColumnDef<Produto>[] = [
  { accessorKey: 'nossoCodigo', header: 'Nosso Código' },
  { accessorKey: 'nossaDescricao', header: 'Nossa Descrição' },
]

function setup() {
  const onIncluir = vi.fn()
  const onAbrir = vi.fn()
  const onExcluir = vi.fn()
  const { user } = renderWithQuery(
    <VitraDataTable
      columns={columns}
      queryKey={['produtos-actions-test']}
      fetcher={(state) => data.produtos.list(state, 0)}
      actions={cadastroActions<Produto>({ entidade: 'produto', onIncluir, onAbrir, onExcluir })}
    />,
  )
  return { onIncluir, onAbrir, onExcluir, user }
}

describe('cadastroActions', () => {
  it('monta a barra padrão da transcrição §9', () => {
    setup()
    for (const label of ['Filtro', 'Incluir', 'Alterar', 'Consul.', 'Excluir', 'Imprimir']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
  })

  it('ações de registro ficam desabilitadas sem seleção', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Alterar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Consul.' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Excluir' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Incluir' })).toBeEnabled()
  })

  it('Incluir dispara sem seleção', async () => {
    const { onIncluir, user } = setup()

    await user.click(screen.getByRole('button', { name: 'Incluir' }))
    expect(onIncluir).toHaveBeenCalledTimes(1)
  })

  it('selecionar linha habilita Alterar e entrega o registro', async () => {
    const { onAbrir, onExcluir, user } = setup()

    await user.click(await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO'))

    const alterar = screen.getByRole('button', { name: 'Alterar' })
    expect(alterar).toBeEnabled()
    await user.click(alterar)
    expect(onAbrir.mock.calls[0]?.[0]).toMatchObject({
      nossaDescricao: 'PENDENTE REDONDO ALUMÍNIO PRETO',
    })

    // A seleção persiste após a ação; Consul. cai em onAbrir sem onConsultar.
    await user.click(screen.getByRole('button', { name: 'Consul.' }))
    expect(onAbrir).toHaveBeenCalledTimes(2)

    await user.click(screen.getByRole('button', { name: 'Excluir' }))
    expect(onExcluir).toHaveBeenCalledTimes(1)
  })
})
