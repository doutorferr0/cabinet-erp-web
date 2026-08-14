import { VitraDataTable } from '@/components/cabinet/data-table'
import { ErroDaApi } from '@/data/api-provider'
import { createMockListProvider, normalize } from '@/data/provider'
import type { CampoFiltravel } from '@/lib/filtro-de-consulta'
import { type Produto, produtos } from '@/mocks/produtos'
import { renderWithQuery } from '@/test/utils'
import type { ColumnDef } from '@tanstack/react-table'
import { screen, waitFor } from '@testing-library/react'
import type userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

/**
 * Provider LOCAL sobre o mock de produtos.
 *
 * NÃO usar `data.produtos` do registry: desde que o backend publicou
 * `GET /api/products`, ele fala HTTP — e este arquivo testa a DataTable, não a
 * fronteira de rede. Os dados são só material de teste; o que se afirma aqui é o
 * comportamento do componente diante de um fetcher qualquer.
 */
const produtosMock = createMockListProvider<Produto>({
  rows: produtos,
  matches: (p, q) =>
    normalize(p.nossoCodigo).includes(q) || normalize(p.nossaDescricao).includes(q),
})

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
      fetcher={(state) => produtosMock.list(state, 0)}
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
        fetcher={(state) => produtosMock.list(state, 0)}
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

  // A linha é o controle de seleção da listagem inteira (Alterar/Excluir/Consul.
  // dependem dela). Como `<tr onClick>` ela só existia para o mouse: sem parada
  // de foco, sem estado anunciado, invisível para quem navega por teclado ou
  // leitor de tela. A interface continua sendo por clique — isto não cria
  // atalho, só devolve à linha o que um controle precisa ter.
  it('linha é parada de foco e anuncia o estado de seleção', async () => {
    const { user } = setup()
    const descricao = await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')
    const linha = descricao.closest('tr')

    expect(linha).toHaveAttribute('tabindex', '0')
    expect(linha).toHaveAttribute('aria-selected', 'false')
    await user.click(descricao)
    expect(linha).toHaveAttribute('aria-selected', 'true')
  })

  it('teclado seleciona a linha focada e devolve a seleção à ação', async () => {
    let alterado: unknown = 'nada'
    const { user } = renderWithQuery(
      <VitraDataTable
        columns={columns}
        queryKey={['produtos-test-teclado']}
        fetcher={(state) => produtosMock.list(state, 0)}
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

    const descricao = await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')
    const linha = descricao.closest('tr') as HTMLElement
    linha.focus()
    await user.keyboard('{Enter}')
    expect(linha).toHaveAttribute('aria-selected', 'true')

    // Espaço alterna de volta — a mesma regra do clique (clicar de novo solta).
    await user.keyboard(' ')
    expect(linha).toHaveAttribute('aria-selected', 'false')

    await user.keyboard('{Enter}')
    await user.click(screen.getByRole('button', { name: 'Alterar' }))
    expect((alterado as Produto | null)?.nossaDescricao).toBe('PENDENTE REDONDO ALUMÍNIO PRETO')
  })

  it('foco da linha usa o anel de LINHA, não o de peça sem borda', async () => {
    setup()
    const descricao = await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')
    const linha = descricao.closest('tr')

    // `focus-ring-inset` põe `box-shadow` no próprio elemento, e sob o
    // `border-collapse` que a tabela herda do preflight um `<tr>` não pinta
    // sombra — o anel existiria no CSS e não na tela. `focus-ring-row` monta o
    // anel nas CÉLULAS, que pintam, e emenda as partes numa moldura só.
    expect(linha?.className).toContain('focus-visible:focus-ring-row')
    expect(linha?.className).not.toContain('focus-ring-inset')
  })

  // Ordenação anunciada: quem usa leitor de tela ouve "ordenado crescente" em vez
  // de descobrir pela setinha, que é informação só visual.
  it('cabeçalho ordenável anuncia a ordem em aria-sort', async () => {
    const { user } = setup()
    await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')
    const head = screen.getByRole('columnheader', { name: /Marca/ })

    expect(head).toHaveAttribute('aria-sort', 'none')
    await user.click(screen.getByRole('button', { name: /Marca/ }))
    await waitFor(() => expect(head).toHaveAttribute('aria-sort', 'ascending'))
    await user.click(screen.getByRole('button', { name: /Marca/ }))
    await waitFor(() => expect(head).toHaveAttribute('aria-sort', 'descending'))
  })

  // Radius 0 é lei (DESIGN.md): o select do rodapé ficou de fora da fase 1 e era
  // o único canto arredondado dentro da caixa da listagem.
  it('select do rodapé usa a caixa preta 2px, sem canto arredondado', async () => {
    setup()
    await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')
    const select = screen.getByLabelText('Por página:')
    expect(select.className).toContain('border-2')
    expect(select.className).not.toContain('rounded')
  })

  it('cabeçalho é etiqueta INVERTIDA em 42px: caixa clara, letra preta, régua de 3px', async () => {
    setup()
    await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')
    const head = screen.getByRole('columnheader', { name: 'Marca' })
    expect(head.className).toContain('h-[42px]')
    // A barra preta sólida da fundação anterior é o que sai (DESIGN.md §Don'ts):
    // a força vem da régua e da caixa alta, não de um bloco de tinta.
    expect(head.className).toContain('bg-neutral')
    expect(head.className).toContain('text-foreground')
    expect(head.className).toContain('border-b-[3px]')
    expect(head.className).not.toContain('bg-primary')
    expect(head.className).toContain('font-mono')
    expect(head.className).toContain('uppercase')
    expect(head.className).toContain('tracking-[0.12em]')
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
        fetcher={(state) => produtosMock.list(state, 0)}
      />,
    )
    const head = await screen.findByRole('columnheader', { name: 'Valor de Tabela' })
    expect(head.className).toContain('text-right')
    // Espera o dado carregar — o skeleton inicial também usa <td> (role cell).
    await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')
    const celula = screen.getAllByRole('cell').find((c) => c.className.includes('tabular-nums'))
    expect(celula?.className).toContain('text-right')
  })

  it('linha selecionada é violeta cheio, e o estado não depende só de cor', async () => {
    const { user } = setup()
    const descricao = await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')
    await user.click(descricao)
    const linha = descricao.closest('tr')

    // Violeta é a cor da AÇÃO, e a linha selecionada é sobre o que as ações da
    // barra vão agir. O marcador amarelo saiu junto: amarelo virou foco, e foco
    // e seleção são estados diferentes que precisam de sinais diferentes.
    expect(linha?.className).toContain('[&>td]:bg-primary')
    expect(linha?.className).toContain('[&>td]:text-primary-foreground')
    expect(linha?.className).not.toContain('anchor')

    // Cor sozinha não basta (WCAG 1.4.1): peso e `aria-selected` dizem o mesmo.
    expect(linha?.className).toContain('font-semibold')
    expect(linha).toHaveAttribute('aria-selected', 'true')
  })

  it('rowNumbers: primeira coluna de 40px em Meta, sequencial global entre páginas', async () => {
    const { user } = renderWithQuery(
      <VitraDataTable
        columns={columns}
        queryKey={['produtos-test-num']}
        fetcher={(state) => produtosMock.list(state, 0)}
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
    expect(numero?.className).toContain('text-[11px]')
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
        fetcher={(state) => produtosMock.list(state, 0)}
      />,
    )

    await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')
    const grupo = screen.getByRole('columnheader', { name: 'Identificação' })
    expect(grupo.getAttribute('colspan')).toBe('2')
    expect(grupo.className).toContain('text-center')
    // A fileira do grupo é separada das sub-colunas por Fio, não pela sublinha forte.
    expect(grupo.closest('tr')?.className).toContain('border-rule-hair')
  })

  // Com backend real a consulta pode FALHAR. Cair em "Nenhum registro." diria ao
  // operador que a consulta voltou vazia — que é justamente o que não se sabe.
  it('falha da consulta NÃO se disfarça de listagem vazia', async () => {
    const falhar = true
    renderWithQuery(
      <VitraDataTable
        columns={columns}
        queryKey={['produtos-test-falha']}
        fetcher={(state) =>
          falhar ? Promise.reject(new Error('500')) : produtosMock.list(state, 0)
        }
      />,
    )

    expect(await screen.findByText(/não foi possível carregar a consulta/i)).toBeInTheDocument()
    expect(screen.queryByText('Nenhum registro')).not.toBeInTheDocument()
    // Contagem não mente sobre uma consulta que não voltou.
    expect(screen.getByText('— registros')).toBeInTheDocument()
  })

  it('vazio de BUSCA e vazio de MÓDULO não dizem a mesma coisa', async () => {
    const { user } = renderWithQuery(
      <VitraDataTable
        columns={columns}
        queryKey={['produtos-test-vazio']}
        fetcher={(state) =>
          // Sempre vazio, mas o `state.q` distingue as duas situações.
          Promise.resolve({ rows: [] as Produto[], total: 0, page: state.page })
        }
      />,
    )

    // Sem busca: não existe registro — o caminho é cadastrar.
    expect(await screen.findByText('Nenhum registro')).toBeInTheDocument()
    expect(screen.getByText(/ainda não há nada cadastrado/i)).toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: 'Busca' }), 'parafuso')

    // Com busca: o termo é que não achou — o caminho é corrigir o termo.
    expect(await screen.findByText('Nenhum registro encontrado')).toBeInTheDocument()
    expect(screen.getByText(/“parafuso”/)).toBeInTheDocument()
    expect(screen.queryByText(/ainda não há nada cadastrado/i)).not.toBeInTheDocument()
  })

  it('mostra o detail que o servidor mandou no problem+json', async () => {
    renderWithQuery(
      <VitraDataTable
        columns={columns}
        queryKey={['produtos-test-detail']}
        fetcher={() =>
          Promise.reject(new ErroDaApi('Falha ao consultar.', 400, 'sortBy inválido.'))
        }
      />,
    )

    await screen.findByText(/não foi possível carregar a consulta/i)
    // Sem isso o operador lê "algo deu errado" quando o backend explicou o quê.
    expect(screen.getByText('sortBy inválido.')).toBeInTheDocument()
  })

  it('tentar de novo refaz a consulta que falhou', async () => {
    let falhar = true
    const { user } = renderWithQuery(
      <VitraDataTable
        columns={columns}
        queryKey={['produtos-test-retry']}
        fetcher={(state) =>
          falhar ? Promise.reject(new Error('500')) : produtosMock.list(state, 0)
        }
      />,
    )

    await screen.findByText(/não foi possível carregar a consulta/i)
    falhar = false
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }))

    expect(await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')).toBeInTheDocument()
  })
})

describe('VitraDataTable — filtro estruturado', () => {
  const camposFiltraveis: CampoFiltravel[] = [{ id: 'marca', rotulo: 'Marca', variante: 'text' }]

  function setupComFiltro() {
    return renderWithQuery(
      <VitraDataTable
        columns={columns}
        queryKey={['produtos-filtro']}
        fetcher={(state) => produtosMock.list(state, 0)}
        actions={[{ id: 'filtro', label: 'Filtro' }]}
        filtros={camposFiltraveis}
      />,
    )
  }

  it('o filtro OCUPA o lugar do botão Filtro da barra, não soma um botão', async () => {
    setupComFiltro()
    await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')

    // Um só caminho para filtrar: o gatilho é o mesmo botão da barra padrão.
    expect(screen.getAllByRole('button', { name: /^Filtro/ })).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Filtro — nenhum aplicado' })).toBeInTheDocument()
  })

  it('sem campos filtráveis a barra segue com o botão Filtro de sempre', async () => {
    renderWithQuery(
      <VitraDataTable
        columns={columns}
        queryKey={['produtos-sem-filtro']}
        fetcher={(state) => produtosMock.list(state, 0)}
        actions={[{ id: 'filtro', label: 'Filtro' }]}
      />,
    )
    await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')

    expect(screen.getByRole('button', { name: 'Filtro' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /nenhum aplicado/ })).not.toBeInTheDocument()
  })

  it('o filtro chega ao provider e estreita a listagem', async () => {
    const { user } = setupComFiltro()
    await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')
    expect(screen.getByText('45 registros')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^Filtro/ }))
    await user.click(await screen.findByRole('button', { name: 'Adicionar filtro' }))
    await user.type(await screen.findByLabelText('Valor do filtro 1'), 'stella')

    // Debounce de 300ms, como o da busca: a consulta sai com a frase pronta.
    // 12 marcas cíclicas sobre 44 linhas geradas — STELLA cai em 4 delas.
    expect(await screen.findByText('4 registros')).toBeInTheDocument()
    expect(screen.getAllByText('STELLA')).toHaveLength(4)
  })

  it('filtro que não acha nada NÃO diz "ainda não há nada cadastrado"', async () => {
    const { user } = setupComFiltro()
    await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')

    await user.click(screen.getByRole('button', { name: /^Filtro/ }))
    await user.click(await screen.findByRole('button', { name: 'Adicionar filtro' }))
    await user.type(await screen.findByLabelText('Valor do filtro 1'), 'marca-que-nao-existe')

    // Mandar cadastrar registro que existe e está fora do filtro é o erro que
    // faz o operador duplicar cadastro.
    expect(await screen.findByText(/Nenhum registro atende aos filtros/i)).toBeInTheDocument()
  })
})

describe('VitraDataTable — consultas favoritas', () => {
  const camposFiltraveis: CampoFiltravel[] = [{ id: 'marca', rotulo: 'Marca', variante: 'text' }]

  function setupComFavoritos(queryKey: readonly unknown[] = ['produtos-fav']) {
    return renderWithQuery(
      <VitraDataTable
        columns={columns}
        queryKey={queryKey}
        fetcher={(state) => produtosMock.list(state, 0)}
        actions={[{ id: 'filtro', label: 'Filtro' }]}
        filtros={camposFiltraveis}
      />,
    )
  }

  async function montarFiltro(user: ReturnType<typeof userEvent.setup>, valor: string) {
    await user.click(screen.getByRole('button', { name: /^Filtro/ }))
    await user.click(await screen.findByRole('button', { name: 'Adicionar filtro' }))
    await user.type(await screen.findByLabelText('Valor do filtro 1'), valor)
    await user.keyboard('{Escape}')
  }

  beforeEach(() => {
    localStorage.clear()
  })

  it('sem filtro montado não há o que salvar', async () => {
    const { user } = setupComFavoritos()
    await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')

    await user.click(screen.getByRole('button', { name: /^Consultas salvas/ }))
    expect(await screen.findByRole('button', { name: /Salvar consulta atual/ })).toBeDisabled()
  })

  it('salva a consulta montada e a lista passa a mostrá-la', async () => {
    const { user } = setupComFavoritos()
    await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')
    await montarFiltro(user, 'stella')

    await user.click(screen.getByRole('button', { name: /^Consultas salvas/ }))
    await user.click(await screen.findByRole('button', { name: /Salvar consulta atual/ }))
    await user.type(await screen.findByLabelText('Nome'), 'Só Stella')
    await user.click(screen.getByRole('button', { name: 'Gravar' }))

    expect(await screen.findByRole('button', { name: 'Consultas salvas — 1' })).toBeInTheDocument()
  })

  it('aplicar uma consulta salva reconstrói o filtro na tela', async () => {
    const { user } = setupComFavoritos()
    await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')
    await montarFiltro(user, 'stella')

    await user.click(screen.getByRole('button', { name: /^Consultas salvas/ }))
    await user.click(await screen.findByRole('button', { name: /Salvar consulta atual/ }))
    await user.type(await screen.findByLabelText('Nome'), 'Só Stella')
    await user.click(screen.getByRole('button', { name: 'Gravar' }))

    // Limpa e reaplica pela consulta salva.
    await user.click(screen.getByRole('button', { name: /^Filtro/ }))
    await user.click(await screen.findByRole('button', { name: 'Limpar filtros' }))
    // `Escape` fecha porque o foco voltou para dentro do painel (`Adicionar
    // filtro`); sem essa devolução ele cairia num nó já removido.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Adicionar filtro' })).toHaveFocus()
    })
    await user.keyboard('{Escape}')
    expect(await screen.findByText('45 registros')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^Consultas salvas/ }))
    await user.click(await screen.findByRole('button', { name: 'Só Stella' }))

    expect(await screen.findByText('4 registros')).toBeInTheDocument()
  })

  it('a consulta PADRÃO abre a tela sozinha — o caso de todo dia é zero clique', async () => {
    // Grava direto no armazenamento: o que se testa aqui é a ABERTURA da tela.
    localStorage.setItem(
      'cabinet.consultas-favoritas.v1',
      JSON.stringify({
        'produtos-padrao': [
          {
            id: 'f1',
            nome: 'Só Stella',
            filtros: [
              {
                filtroId: 'x',
                id: 'marca',
                variante: 'text',
                operador: 'iLike',
                valor: 'stella',
              },
            ],
            juncao: 'and',
            sort: null,
            padrao: true,
          },
        ],
      }),
    )

    setupComFavoritos(['produtos-padrao'])

    expect(await screen.findByText('4 registros')).toBeInTheDocument()
  })

  it('cada tela tem as suas — a consulta de Produtos não aparece em outra listagem', async () => {
    localStorage.setItem(
      'cabinet.consultas-favoritas.v1',
      JSON.stringify({ 'produtos-fav': [{ id: 'f1', nome: 'Só Stella', filtros: [] }] }),
    )

    setupComFavoritos(['outra-tela'])
    await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')

    expect(screen.getByRole('button', { name: 'Consultas salvas — nenhuma' })).toBeInTheDocument()
  })

  it('favorito gravado ilegível não derruba a listagem', async () => {
    localStorage.setItem('cabinet.consultas-favoritas.v1', '{quebrado')

    setupComFavoritos()

    // A tela abre normalmente, sem favorito — perder a listagem por causa de um
    // valor gravado seria defeito; perder o favorito é aborrecimento.
    expect(await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Consultas salvas — nenhuma' })).toBeInTheDocument()
  })
})

/**
 * VIEW MODES — o mecanismo genérico, sem CRM no meio.
 *
 * O funil é o piloto (`src/features/crm/`), mas quem carrega o padrão é a
 * DataTable: a próxima tela que ganhar gráfico ou calendário não deve
 * reimplementar alternador, agrupamento nem o corte do conjunto.
 */
describe('VitraDataTable — visões', () => {
  const visaoDeCartoes = {
    id: 'cartoes',
    rotulo: 'Cartões',
    agrupa: true,
    render: ({ rows, agruparPor }: { rows: Produto[]; agruparPor: string }) => (
      <div data-testid="cartoes">
        <p>agrupado por {agruparPor}</p>
        <p>{rows.length} cartões</p>
      </div>
    ),
  }

  function setupComVisao(visaoInicial = 'cartoes') {
    return renderWithQuery(
      <VitraDataTable
        columns={columns}
        queryKey={['produtos-visao']}
        fetcher={(state) => produtosMock.list(state, 0)}
        pageSizeOptions={[10, 20]}
        visoes={[visaoDeCartoes]}
        agrupamentos={[
          { id: 'marca', rotulo: 'Marca' },
          { id: 'nossoCodigo', rotulo: 'Código' },
        ]}
        visaoInicial={visaoInicial}
      />,
    )
  }

  it('a visão substitui a tabela, e o alternador traz a tabela de volta', async () => {
    const { user } = setupComVisao()

    expect(await screen.findByTestId('cartoes')).toBeInTheDocument()
    expect(screen.queryByRole('columnheader')).not.toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Lista' }))

    expect(await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')).toBeInTheDocument()
    expect(screen.queryByTestId('cartoes')).not.toBeInTheDocument()
  })

  /**
   * Coluna montada com a página 1 seria coluna FALSA — mostraria três cartões
   * numa etapa que tem trinta. A visão pede o conjunto inteiro, e o que passar
   * do teto do contrato é DITO, não cortado calado.
   */
  it('a visão pede o conjunto inteiro e o rodapé some com a paginação', async () => {
    setupComVisao()

    expect(await screen.findByText('45 cartões')).toBeInTheDocument()
    expect(screen.getByText('45 registros')).toBeInTheDocument()
    expect(screen.queryByText(/Página 1 de/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Por página:')).not.toBeInTheDocument()
  })

  it('o `Agrupar por` só existe na visão que agrupa', async () => {
    const { user } = setupComVisao()

    expect(await screen.findByLabelText('Agrupar por:')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Lista' }))

    await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')
    expect(screen.queryByLabelText('Agrupar por:')).not.toBeInTheDocument()
  })

  it('o agrupamento escolhido chega à visão', async () => {
    const { user } = setupComVisao()

    expect(await screen.findByText('agrupado por marca')).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Agrupar por:'), 'nossoCodigo')
    expect(await screen.findByText('agrupado por nossoCodigo')).toBeInTheDocument()
  })

  it('sem a prop `visoes` não há alternador — as oito telas seguem iguais', async () => {
    setup()

    await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')
    expect(screen.queryByRole('radio', { name: 'Lista' })).not.toBeInTheDocument()
  })
})
