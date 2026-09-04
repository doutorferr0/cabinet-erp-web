import { VitraDataTable } from '@/components/cabinet/data-table'
import { createMockListProvider, normalize } from '@/data/provider'
import type { CampoFiltravel } from '@/lib/filtro-de-consulta'
import { type Produto, produtos } from '@/mocks/produtos'
import { renderWithQuery } from '@/test/utils'
import type { ColumnDef } from '@tanstack/react-table'
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * A BARRA 2.0 (#477 · D9) ATRAVESSA — é o que estes casos travam.
 *
 * Barra bonita que não mexe na grade é a falha desta base: o `ColunasPorModulo`
 * viveu meses com três testes verdes e nenhuma tela o montando. Por isso cada
 * caso aqui aperta a barra e cobra a GRADE — o prefixo tem de estreitar a
 * lista, a coluna desmarcada tem de sumir do cabeçalho.
 */

const provider = createMockListProvider<Produto>({
  rows: produtos,
  matches: (p, q) =>
    normalize(p.nossoCodigo).includes(q) || normalize(p.nossaDescricao).includes(q),
})

const colunas: ColumnDef<Produto>[] = [
  { accessorKey: 'nossoCodigo', header: 'Código', meta: { tipo: 'id' } },
  { accessorKey: 'nossaDescricao', header: 'Descrição', meta: { tipo: 'texto' } },
  { accessorKey: 'marca', header: 'Marca', meta: { tipo: 'texto' } },
]

const campos: readonly CampoFiltravel[] = [
  { id: 'marca', rotulo: 'Marca', variante: 'text' },
  { id: 'nossaDescricao', rotulo: 'Descrição', variante: 'text' },
]

function montar() {
  return renderWithQuery(
    <VitraDataTable<Produto>
      columns={colunas}
      queryKey={['barra-2-0']}
      fetcher={(state) => provider.list(state, 0)}
      pageSizeOptions={[50]}
      filtros={campos}
    />,
  )
}

function cabecalhos() {
  return screen.getAllByRole('columnheader').map((th) => th.textContent ?? '')
}

describe('barra 2.0: a busca com prefixo estreita a lista', () => {
  it('`mar: ` filtra pela coluna, e o valor aparece realçado', async () => {
    const { user, container } = montar()
    await screen.findAllByText('PENDENTE REDONDO ALUMÍNIO PRETO')
    const linhasAntes = screen.getAllByRole('row').length

    await user.type(screen.getByRole('textbox', { name: 'Busca' }), 'mar: stella')

    await waitFor(() => {
      expect(screen.getAllByRole('row').length).toBeLessThan(linhasAntes)
    })
    // O realce é o retorno que diz "isto virou filtro" — sem ele, quem digita
    // não distingue o prefixo entendido do prefixo ignorado.
    expect(container.querySelector('[data-realce="valor"]')?.textContent?.trim()).toBe('stella')

    const marcas = screen
      .getAllByRole('row')
      .slice(1)
      .map((linha) => within(linha).getAllByRole('cell')[2]?.textContent ?? '')
    expect(marcas.every((marca) => normalize(marca).includes('stella'))).toBe(true)
  })

  it('prefixo que não é campo nenhum continua sendo busca livre', async () => {
    const { user, container } = montar()
    await screen.findAllByText('PENDENTE REDONDO ALUMÍNIO PRETO')

    await user.type(screen.getByRole('textbox', { name: 'Busca' }), 'zzz: pendente')

    await waitFor(() => {
      expect(screen.queryAllByText('PENDENTE REDONDO ALUMÍNIO PRETO').length).toBeGreaterThan(0)
    })
    expect(container.querySelector('[data-realce="valor"]')).toBeNull()
  })
})

describe('barra 2.0: o menu Colunas mexe na grade', () => {
  it('desmarcar a coluna a tira do cabeçalho, e o rótulo conta quantas sumiram', async () => {
    const { user } = montar()
    await screen.findAllByText('PENDENTE REDONDO ALUMÍNIO PRETO')
    expect(cabecalhos().some((texto) => texto.includes('Marca'))).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Colunas' }))
    await user.click(await screen.findByRole('checkbox', { name: /Marca/ }))
    // O popover do react-aria é MODAL: com ele aberto a grade sai da árvore
    // acessível, e perguntar pelos cabeçalhos aqui não acharia nenhum.
    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(cabecalhos().some((texto) => texto.includes('Marca'))).toBe(false)
    })
    expect(screen.getByRole('button', { name: 'Colunas — 1 oculta(s)' })).toBeInTheDocument()
  })

  it('a primeira coluna é a identidade da linha e não se esconde', async () => {
    const { user } = montar()
    await screen.findAllByText('PENDENTE REDONDO ALUMÍNIO PRETO')

    await user.click(screen.getByRole('button', { name: 'Colunas' }))

    const codigo = await screen.findByRole('checkbox', { name: /Código/ })
    expect(codigo).toBeChecked()
    expect(codigo).toBeDisabled()
  })

  it('a seta reordena a grade de verdade', async () => {
    const { user } = montar()
    await screen.findAllByText('PENDENTE REDONDO ALUMÍNIO PRETO')
    expect(cabecalhos()[1]).toContain('Descrição')

    await user.click(screen.getByRole('button', { name: 'Colunas' }))
    await user.click(await screen.findByRole('button', { name: 'Subir a coluna Marca' }))
    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(cabecalhos()[1]).toContain('Marca')
    })
  })
})

describe('barra 2.0: o chip diz o que está filtrado', () => {
  it('o filtro montado no `+ Filtro` vira chip com campo e valor', async () => {
    const { user } = montar()
    await screen.findAllByText('PENDENTE REDONDO ALUMÍNIO PRETO')

    await user.click(screen.getByRole('button', { name: /^Adicionar filtro/ }))
    await user.click(await screen.findByRole('menuitem', { name: 'Marca' }))
    await user.type(await screen.findByLabelText('Valor do filtro 1'), 'BELLA')
    await user.keyboard('{Escape}')

    // O operador padrão some da frase: os dois-pontos já dizem "é isto".
    const chip = await screen.findByRole('button', { name: /^Editar o filtro 1/ })
    expect(chip.textContent).toBe('Marca:BELLA')
  })

  it('a ordenação aparece na barra e o clique a inverte', async () => {
    const { user } = montar()
    await screen.findAllByText('PENDENTE REDONDO ALUMÍNIO PRETO')
    expect(screen.queryByRole('button', { name: /^Ordenado por/ })).not.toBeInTheDocument()

    const cabecalho = screen.getByRole('columnheader', { name: /Marca/ })
    await user.click(within(cabecalho).getByRole('button', { name: /Marca/ }))

    const naBarra = await screen.findByRole('button', { name: /^Ordenado por Marca, crescente/ })
    await user.click(naBarra)
    expect(
      await screen.findByRole('button', { name: /^Ordenado por Marca, decrescente/ }),
    ).toBeInTheDocument()
  })
})
