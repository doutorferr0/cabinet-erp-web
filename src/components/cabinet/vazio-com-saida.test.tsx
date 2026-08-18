import { VitraDataTable } from '@/components/cabinet/data-table'
import { createMockListProvider, normalize } from '@/data/provider'
import type { PagedResult } from '@/lib/table-query'
import { type Produto, produtos } from '@/mocks/produtos'
import { renderWithQuery } from '@/test/utils'
import type { ColumnDef } from '@tanstack/react-table'
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

/**
 * O VAZIO PRECISA TER SAÍDA (#201) — e a saída depende de QUAL vazio é.
 *
 * Desde a #202 o `Incluir` mora no cabeçalho da página, longe da caixa que diz
 * "Nenhum registro": a tela informava o vazio e não oferecia nada para fazer
 * a respeito. Duas saídas diferentes, porque os dois vazios não são o mesmo
 * problema — módulo vazio pede CADASTRAR, consulta vazia pede DESFAZER a
 * pergunta.
 */

const columns: ColumnDef<Produto>[] = [
  { accessorKey: 'nossoCodigo', header: 'Nosso Código' },
  { accessorKey: 'nossaDescricao', header: 'Nossa Descrição' },
  { accessorKey: 'marca', header: 'Marca' },
]

const comProdutos = createMockListProvider<Produto>({
  rows: produtos,
  matches: (p, q) =>
    normalize(p.nossoCodigo).includes(q) || normalize(p.nossaDescricao).includes(q),
})

const semNada = createMockListProvider<Produto>({ rows: [], matches: () => false })

describe('vazio com saída', () => {
  it('módulo vazio oferece a ação de incluir', async () => {
    const incluir = vi.fn()
    const { user } = renderWithQuery(
      <VitraDataTable
        columns={columns}
        queryKey={['vazio-incluir']}
        fetcher={(state) => semNada.list(state, 0)}
        acaoDoVazio={{ label: 'Incluir produto', onClick: incluir }}
      />,
    )

    const vazio = await screen.findByTestId('vazio-da-consulta')
    await user.click(within(vazio).getByRole('button', { name: 'Incluir produto' }))
    expect(incluir).toHaveBeenCalledTimes(1)
  })

  it('sem ação declarada o vazio segue sem botão — é a janela de busca', async () => {
    renderWithQuery(
      <VitraDataTable
        columns={columns}
        queryKey={['vazio-sem-acao']}
        fetcher={(state) => semNada.list(state, 0)}
      />,
    )

    const vazio = await screen.findByTestId('vazio-da-consulta')
    expect(within(vazio).queryByRole('button')).not.toBeInTheDocument()
  })

  it('vazio de BUSCA não manda cadastrar: manda limpar, e limpar traz a lista de volta', async () => {
    const incluir = vi.fn()
    const { user } = renderWithQuery(
      <VitraDataTable
        columns={columns}
        queryKey={['vazio-busca']}
        fetcher={(state) => comProdutos.list(state, 0)}
        acaoDoVazio={{ label: 'Incluir produto', onClick: incluir }}
      />,
    )

    await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')
    await user.type(screen.getByLabelText('Busca'), 'zzzzzz')

    const vazio = await screen.findByTestId('vazio-da-consulta')
    // Cadastrar não resolve "a busca não achou" — o registro pode existir do
    // lado de fora do termo digitado.
    expect(within(vazio).queryByRole('button', { name: 'Incluir produto' })).not.toBeInTheDocument()

    await user.click(within(vazio).getByRole('button', { name: 'Limpar busca' }))
    expect(await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')).toBeInTheDocument()
    expect(screen.getByLabelText('Busca')).toHaveValue('')
  })
})

describe('esqueleto com a forma da página', () => {
  it('carregando desenha uma célula por coluna, não uma barra atravessando a linha', async () => {
    // Consulta que nunca responde: o esqueleto é o estado permanente do teste.
    renderWithQuery(
      <VitraDataTable
        columns={columns}
        queryKey={['esqueleto']}
        fetcher={() => new Promise<PagedResult<Produto>>(() => {})}
      />,
    )

    const linhas = await screen.findAllByTestId('linha-de-esqueleto')
    // Uma célula por coluna declarada. Uma barra só, com `colSpan`, mede o
    // vazio errado: a linha nasce inteira e se parte em três quando o dado
    // chega, e a tela salta na frente do operador.
    for (const linha of linhas) {
      expect(within(linha).getAllByTestId('celula-de-esqueleto')).toHaveLength(columns.length)
    }
    await waitFor(() => expect(screen.queryByRole('columnheader', { name: 'Marca' })).toBeTruthy())
  })
})
