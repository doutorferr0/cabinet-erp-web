import { VitraDataTable } from '@/components/vitra/data-table'
import { type Produto, fetchProdutos } from '@/mocks/produtos'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

const columns: ColumnDef<Produto>[] = [
  { accessorKey: 'nossoCodigo', header: 'Nosso Código' },
  { accessorKey: 'nossaDescricao', header: 'Nossa Descrição' },
  { accessorKey: 'marca', header: 'Marca' },
]

function setup(pageSizeOptions = [10, 20]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <VitraDataTable
        columns={columns}
        queryKey={['produtos-test']}
        fetcher={(state) => fetchProdutos(state, 0)}
        pageSizeOptions={pageSizeOptions}
      />
    </QueryClientProvider>,
  )
}

describe('VitraDataTable', () => {
  it('renderiza colunas e primeira página', async () => {
    setup()
    expect(screen.getByText('Nosso Código')).toBeInTheDocument()
    expect(screen.getByText('Nossa Descrição')).toBeInTheDocument()
    expect(screen.getByText('Marca')).toBeInTheDocument()

    // delayMs=0, mas a promessa ainda é assíncrona.
    expect(await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')).toBeInTheDocument()
    expect(screen.getByText('45 registros')).toBeInTheDocument()
    expect(screen.getByText('Página 1 de 5')).toBeInTheDocument()
  })

  it('busca filtra registros via provider', async () => {
    const user = userEvent.setup()
    setup()

    await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')
    await user.type(screen.getByLabelText('Busca'), 'cristal')

    // Debounce de 300ms: aguarda o resultado filtrado.
    expect(await screen.findByText('LUSTRE CRISTAL 8 BRAÇOS CROMADO')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.queryByText('PENDENTE REDONDO ALUMÍNIO PRETO')).not.toBeInTheDocument()
    })
    expect(screen.getByText('5 registros')).toBeInTheDocument()
  })

  it('paginação troca os registros exibidos', async () => {
    const user = userEvent.setup()
    setup([3])

    await screen.findByText('Página 1 de 15')
    const firstPageText = screen.getAllByRole('row')[1]?.textContent

    await user.click(screen.getByRole('button', { name: 'Próxima' }))

    await screen.findByText('Página 2 de 15')
    await waitFor(() => {
      expect(screen.getAllByRole('row')[1]?.textContent).not.toBe(firstPageText)
    })
  })

  it('seleção habilita ação que exige linha', async () => {
    const user = userEvent.setup()
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    let alterado: Produto | null = null
    render(
      <QueryClientProvider client={queryClient}>
        <VitraDataTable
          columns={columns}
          queryKey={['produtos-test-acao']}
          fetcher={(state) => fetchProdutos(state, 0)}
          actions={[
            {
              id: 'alterar',
              label: 'Alterar',
              needsSelection: true,
              onClick: (p) => {
                alterado = p
              },
            },
          ]}
        />
      </QueryClientProvider>,
    )

    const alterar = screen.getByRole('button', { name: 'Alterar' })
    expect(alterar).toBeDisabled()

    const descricao = await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')
    await user.click(descricao)
    expect(alterar).toBeEnabled()
    await user.click(alterar)
    const selecionado = alterado as Produto | null
    expect(selecionado?.nossaDescricao).toBe('PENDENTE REDONDO ALUMÍNIO PRETO')
  })
})
