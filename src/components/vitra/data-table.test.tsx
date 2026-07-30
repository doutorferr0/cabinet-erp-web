import { VitraDataTable } from '@/components/vitra/data-table'
import { data } from '@/data'
import type { Produto } from '@/mocks/produtos'
import { renderWithQuery } from '@/test/utils'
import type { ColumnDef } from '@tanstack/react-table'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

const columns: ColumnDef<Produto>[] = [
  { accessorKey: 'nossoCodigo', header: 'Nosso Código' },
  { accessorKey: 'nossaDescricao', header: 'Nossa Descrição' },
  { accessorKey: 'marca', header: 'Marca' },
]

function setup(pageSizeOptions = [10, 20]) {
  return renderWithQuery(
    <VitraDataTable
      columns={columns}
      queryKey={['produtos-test']}
      fetcher={(state) => data.produtos.list(state, 0)}
      pageSizeOptions={pageSizeOptions}
    />,
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
    const { user } = setup()

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
    const { user } = setup([3])

    await screen.findByText('Página 1 de 15')
    const firstPageText = screen.getAllByRole('row')[1]?.textContent

    await user.click(screen.getByRole('button', { name: 'Próxima' }))

    await screen.findByText('Página 2 de 15')
    await waitFor(() => {
      expect(screen.getAllByRole('row')[1]?.textContent).not.toBe(firstPageText)
    })
  })

  it('seleção habilita ação que exige linha', async () => {
    let alterado: Produto | null = null
    const { user } = renderWithQuery(
      <VitraDataTable
        columns={columns}
        queryKey={['produtos-test-acao']}
        fetcher={(state) => data.produtos.list(state, 0)}
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
      />,
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

  it('cabeçalho usa etiqueta Meta (mono, caixa alta) em 36px', async () => {
    setup()
    await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')
    const head = screen.getByRole('columnheader', { name: 'Marca' })
    expect(head.className).toContain('h-9')
    expect(head.className).toContain('font-mono')
    expect(head.className).toContain('uppercase')
    expect(head.className).toContain('tracking-[0.06em]')
  })

  it('coluna numeric alinha à direita com numerais tabulares', async () => {
    renderWithQuery(
      <VitraDataTable
        columns={[
          ...columns,
          {
            accessorKey: 'valorTabelaCentavos',
            header: 'Valor de Tabela',
            meta: { numeric: true },
          },
        ]}
        queryKey={['produtos-test-numeric']}
        fetcher={(state) => data.produtos.list(state, 0)}
      />,
    )
    const head = await screen.findByRole('columnheader', { name: 'Valor de Tabela' })
    expect(head.className).toContain('text-right')
    // Espera o dado carregar — o skeleton inicial também usa <td> (role cell).
    await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')
    const celula = screen.getAllByRole('cell').find((c) => c.className.includes('tabular-nums'))
    expect(celula?.className).toContain('text-right')
  })

  it('linha selecionada recebe marcador de 2px em Régua Forte além da tinta', async () => {
    const { user } = setup()
    const descricao = await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')
    await user.click(descricao)
    const linha = descricao.closest('tr')
    expect(linha?.className).toContain('bg-muted')
    expect(linha?.className).toContain('shadow-[inset_2px_0_0_hsl(var(--rule-strong))]')
  })

  it('rowNumbers: primeira coluna de 40px em Meta, sequencial global entre páginas', async () => {
    const { user } = renderWithQuery(
      <VitraDataTable
        columns={columns}
        queryKey={['produtos-test-num']}
        fetcher={(state) => data.produtos.list(state, 0)}
        pageSizeOptions={[3]}
        rowNumbers
      />,
    )

    await screen.findByText('Página 1 de 15')
    // Primeira célula da primeira linha de dados: número em Meta, à direita.
    const primeiraLinha = screen.getAllByRole('row')[1]
    const numero = primeiraLinha?.querySelector('td')
    expect(numero?.textContent).toBe('1')
    expect(numero?.className).toContain('w-10')
    expect(numero?.className).toContain('font-mono')
    expect(numero?.className).toContain('text-[0.75rem]')
    expect(numero?.className).toContain('text-right')

    // A numeração é da consulta, não da página: "linha 4" na página 2.
    await user.click(screen.getByRole('button', { name: 'Próxima' }))
    await screen.findByText('Página 2 de 15')
    const primeiraPagina2 = screen.getAllByRole('row')[1]
    expect(primeiraPagina2?.querySelector('td')?.textContent).toBe('4')
  })

  it('cabeçalho agrupado: rótulo centralizado sobre sub-colunas, separado por Fio', async () => {
    renderWithQuery(
      <VitraDataTable
        columns={[
          {
            header: 'Identificação',
            columns: [
              { accessorKey: 'nossoCodigo', header: 'Nosso Código' },
              { accessorKey: 'nossaDescricao', header: 'Nossa Descrição' },
            ],
          },
          { accessorKey: 'marca', header: 'Marca' },
        ]}
        queryKey={['produtos-test-grupo']}
        fetcher={(state) => data.produtos.list(state, 0)}
      />,
    )

    await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')
    const grupo = screen.getByRole('columnheader', { name: 'Identificação' })
    expect(grupo.getAttribute('colspan')).toBe('2')
    expect(grupo.className).toContain('text-center')
    // A fileira do grupo é separada das sub-colunas por Fio, não pela sublinha forte.
    expect(grupo.closest('tr')?.className).toContain('border-rule-hair')
  })
})
