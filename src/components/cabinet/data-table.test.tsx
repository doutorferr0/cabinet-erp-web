import { VitraDataTable } from '@/components/cabinet/data-table'
import { ErroDaApi } from '@/data/api-provider'
import { createMockListProvider, normalize } from '@/data/provider'
import type { CampoFiltravel } from '@/lib/filtro-de-consulta'
import { type Produto, produtos } from '@/mocks/produtos'
import { renderWithQuery } from '@/test/utils'
import type { ColumnDef } from '@tanstack/react-table'
import { screen, waitFor, within } from '@testing-library/react'
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

/**
 * O rodapé da 2.0 não é mais uma frase só: à esquerda "n de N registros · soma"
 * com os números em mono (elementos próprios), à direita a FAIXA "1–20 de 340".
 * Por isso a asserção é por conteúdo do bloco, e não por nó de texto — o texto
 * está partido entre `<span>`s de propósito, que é o que faz o número alinhar.
 */
function contagem() {
  return screen.getByTestId('contagem-da-grade')
}
function faixa() {
  return screen.getByTestId('faixa-da-pagina')
}

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
    expect(contagem()).toHaveTextContent('de 45 registros')
    expect(faixa()).toHaveTextContent('1–10 de 45')
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
    expect(contagem()).toHaveTextContent('5 de 5 registros')
  })

  it('paginação troca os registros exibidos', async () => {
    const { user } = setup([3])

    await waitFor(() => expect(faixa()).toHaveTextContent('1–3 de 45'))
    const firstPageText = screen.getAllByRole('row')[1]?.textContent

    await user.click(screen.getByRole('button', { name: 'Próxima página' }))

    await waitFor(() => expect(faixa()).toHaveTextContent('4–6 de 45'))
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

    // `within(head)`: com a barra 2.0 a ordenação também aparece na barra
    // (`Ordenar: Marca ↑`), e um `getByRole` solto passaria a achar os dois.
    const ordenar = within(head).getByRole('button', { name: /Marca/ })

    expect(head).toHaveAttribute('aria-sort', 'none')
    await user.click(ordenar)
    await waitFor(() => expect(head).toHaveAttribute('aria-sort', 'ascending'))
    await user.click(ordenar)
    await waitFor(() => expect(head).toHaveAttribute('aria-sort', 'descending'))
  })

  // O select do rodapé segue o controle da 2.0: traço fino em `n-300` e o raio
  // de controle. A caixa preta de 2px saiu da grade inteira — ela empatava com
  // a borda da própria tabela, e nada se destacava de nada.
  it('select do rodapé é controle fino, não caixa de 2px', async () => {
    setup()
    await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')
    const select = screen.getByLabelText('Por página')
    expect(select.className).toContain('border-input')
    expect(select.className).not.toContain('border-2')
  })

  it('cabeçalho é RÓTULO sobre tint, não barra preta', async () => {
    setup()
    await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')
    const head = screen.getByRole('columnheader', { name: 'Marca' })
    expect(head.className).toContain('h-[38px]')
    // Reface 2.0: header de tabela é REGIÃO de outra natureza, e a §Separação
    // nomeia tint para isso. A barra preta atravessando a tela era a peça mais
    // pesada de uma listagem cujo assunto é o dado.
    expect(head.className).toContain('bg-surface-sunken')
    expect(head.className).not.toContain('bg-primary')
    // O degrau tipográfico vem da classe da §Hierarquia — `font-size` literal em
    // componente é proibido, e três lugares copiando 10.5px divergem no
    // primeiro ajuste.
    expect(head.className).toContain('t-rotulo')
    expect(head.className).not.toContain('text-[10px]')
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

  it('linha selecionada é tint com faixa, e o estado não depende só de cor', async () => {
    const { user } = setup()
    const descricao = await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')
    await user.click(descricao)
    const linha = descricao.closest('tr')

    // Reface 2.0: `--primary-soft` de fundo mais a faixa de 3px em chartreuse na
    // borda esquerda. O violeta cheio da 1.x lavava o dado da linha justo quando
    // o operador confere o que marcou — e conferir é o que ele faz ali.
    expect(linha?.className).toContain('--primary-soft')
    expect(linha?.className).toContain('inset_3px_0_0_0')
    expect(linha?.className).not.toContain('[&>td]:bg-primary]')

    // Cor sozinha não basta (WCAG 1.4.1): a faixa é forma, e `aria-selected`
    // diz o mesmo a quem ouve.
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

    await waitFor(() => expect(faixa()).toHaveTextContent('1–3 de 45'))
    // Primeira célula da primeira linha de dados: número em Meta, à direita.
    const primeiraLinha = screen.getAllByRole('row')[1]
    const numero = primeiraLinha?.querySelector('td')
    expect(numero?.textContent).toBe('1')
    expect(numero?.className).toContain('w-10')
    expect(numero?.className).toContain('font-mono')
    expect(numero?.className).toContain('text-[11px]')
    expect(numero?.className).toContain('text-right')

    // A numeração é da consulta, não da página: "linha 4" na página 2.
    await user.click(screen.getByRole('button', { name: 'Próxima página' }))
    await waitFor(() => expect(faixa()).toHaveTextContent('4–6 de 45'))
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

/**
 * Monta uma pílula como o operador monta (#199): `Adicionar filtro` abre a lista
 * de campos, o campo escolhido nasce como pílula com o popover JÁ aberto, e o
 * valor se digita nele.
 */
async function montarPilula(
  user: ReturnType<typeof userEvent.setup>,
  campo: string,
  valor: string,
) {
  await user.click(screen.getByRole('button', { name: /^Adicionar filtro/ }))
  await user.click(await screen.findByRole('menuitem', { name: campo }))
  await user.type(await screen.findByLabelText('Valor do filtro 1'), valor)
  await user.keyboard('{Escape}')
}

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

    // Um só caminho para filtrar: o gatilho é o mesmo botão da barra padrão,
    // agora com o rótulo das pílulas (#199).
    expect(screen.queryByRole('button', { name: /^Filtro/ })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^Adicionar filtro/ })).toHaveLength(1)
    expect(
      screen.getByRole('button', { name: 'Adicionar filtro — nenhum aplicado' }),
    ).toBeInTheDocument()
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
    expect(contagem()).toHaveTextContent('de 45 registros')

    await montarPilula(user, 'Marca', 'stella')

    // Debounce de 300ms, como o da busca: a consulta sai com a frase pronta.
    // 12 marcas cíclicas sobre 44 linhas geradas — STELLA cai em 4 delas.
    await waitFor(() => expect(contagem()).toHaveTextContent('4 de 4 registros'))
    expect(screen.getAllByText('STELLA')).toHaveLength(4)
  })

  it('filtro que não acha nada NÃO diz "ainda não há nada cadastrado"', async () => {
    const { user } = setupComFiltro()
    await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')

    await montarPilula(user, 'Marca', 'marca-que-nao-existe')

    // Mandar cadastrar registro que existe e está fora do filtro é o erro que
    // faz o operador duplicar cadastro.
    expect(await screen.findByText(/Nenhum registro atende aos filtros/i)).toBeInTheDocument()
  })
})

describe('VitraDataTable — consultas salvas em abas', () => {
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
    await montarPilula(user, 'Marca', valor)
  }

  /** Salva a consulta que está na tela pelo `Salvar consulta` da tira de abas. */
  async function salvarConsulta(user: ReturnType<typeof userEvent.setup>, nome: string) {
    await user.click(screen.getByRole('button', { name: /Salvar consulta/ }))
    await user.type(await screen.findByLabelText('Nome'), nome)
    await user.click(screen.getByRole('button', { name: 'Gravar' }))
  }

  beforeEach(() => {
    localStorage.clear()
  })

  it('sem filtro montado não há o que salvar', async () => {
    setupComFavoritos()
    await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')

    // A tira nasce em `Todos`: nada montado, nada a nomear.
    expect(screen.getByRole('tab', { name: 'Todos' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('button', { name: /Salvar consulta/ })).toBeDisabled()
  })

  it('salva a consulta montada e ela vira ABA no topo da lista', async () => {
    const { user } = setupComFavoritos()
    await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')
    await montarFiltro(user, 'stella')

    // Consulta montada e ainda sem nome: a aba diz isso em vez de deixar a tira
    // sem nenhuma acesa.
    expect(await screen.findByRole('tab', { name: 'Não salva' })).toBeInTheDocument()

    await salvarConsulta(user, 'Só Stella')

    const aba = await screen.findByRole('tab', { name: 'Só Stella' })
    expect(aba).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByRole('tab', { name: 'Não salva' })).not.toBeInTheDocument()
  })

  it('a aba acesa segue o que ESTÁ na tela, não o último clique', async () => {
    const { user } = setupComFavoritos()
    await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')
    await montarFiltro(user, 'stella')
    await salvarConsulta(user, 'Só Stella')
    await screen.findByRole('tab', { name: 'Só Stella' })

    // Volta para `Todos` e reaplica pela aba: é o ciclo completo da consulta
    // salva, sem passar por popover nenhum.
    await user.click(screen.getByRole('tab', { name: 'Todos' }))
    await waitFor(() => expect(contagem()).toHaveTextContent('de 45 registros'))
    expect(screen.getByRole('tab', { name: 'Todos' })).toHaveAttribute('aria-selected', 'true')

    await user.click(screen.getByRole('tab', { name: 'Só Stella' }))
    await waitFor(() => expect(contagem()).toHaveTextContent('4 de 4 registros'))
  })

  it('mexer no filtro de uma consulta salva APAGA a aba dela', async () => {
    const { user } = setupComFavoritos()
    await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')
    await montarFiltro(user, 'stella')
    await salvarConsulta(user, 'Só Stella')
    await screen.findByRole('tab', { name: 'Só Stella' })

    // Um clique remove a pílula — e a tela deixa de ser a consulta salva.
    await user.click(screen.getByRole('button', { name: /^Remover o filtro 1/ }))

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Só Stella' })).toHaveAttribute(
        'aria-selected',
        'false',
      )
    })
    await waitFor(() => expect(contagem()).toHaveTextContent('de 45 registros'))
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

    await waitFor(() => expect(contagem()).toHaveTextContent('4 de 4 registros'))
  })

  it('cada tela tem as suas — a consulta de Produtos não aparece em outra listagem', async () => {
    localStorage.setItem(
      'cabinet.consultas-favoritas.v1',
      JSON.stringify({ 'produtos-fav': [{ id: 'f1', nome: 'Só Stella', filtros: [] }] }),
    )

    setupComFavoritos(['outra-tela'])
    await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')

    expect(screen.queryByRole('tab', { name: 'Só Stella' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('tab')).toHaveLength(1)
  })

  it('favorito gravado ilegível não derruba a listagem', async () => {
    localStorage.setItem('cabinet.consultas-favoritas.v1', '{quebrado')

    setupComFavoritos()

    // A tela abre normalmente, sem favorito — perder a listagem por causa de um
    // valor gravado seria defeito; perder o favorito é aborrecimento.
    expect(await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')).toBeInTheDocument()
    expect(screen.getAllByRole('tab')).toHaveLength(1)
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
    expect(contagem()).toHaveTextContent('de 45 registros')
    expect(screen.queryByTestId('faixa-da-pagina')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Por página')).not.toBeInTheDocument()
  })

  it('o `Agrupar por` só existe na visão que agrupa', async () => {
    const { user } = setupComVisao()

    // Na barra 2.0 o agrupamento é um CHIP, como o filtro: os dois são
    // condições sobre a lista, e o chip diz por qual campo sem abrir nada.
    expect(await screen.findByRole('button', { name: /^Agrupado por/ })).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Lista' }))

    await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')
    expect(screen.queryByRole('button', { name: /^Agrup/ })).not.toBeInTheDocument()
  })

  it('o agrupamento escolhido chega à visão', async () => {
    const { user } = setupComVisao()

    expect(await screen.findByText('agrupado por marca')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Agrupado por/ }))
    await user.click(await screen.findByRole('button', { name: 'Código' }))
    expect(await screen.findByText('agrupado por nossoCodigo')).toBeInTheDocument()
  })

  it('sem a prop `visoes` não há alternador — as oito telas seguem iguais', async () => {
    setup()

    await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')
    expect(screen.queryByRole('radio', { name: 'Lista' })).not.toBeInTheDocument()
  })
})

/**
 * DENSIDADE (#123) — quantas linhas cabem é escolha do operador.
 *
 * O que se vigia aqui não é o pixel (isso é CSS), é o CONTRATO: a classe muda,
 * a escolha entra no favorito e volta com ele, e nada disso refaz a consulta.
 */
describe('VitraDataTable — densidade', () => {
  // Helpers próprios: os do bloco de favoritos são locais a ele, e reaproveitar
  // por escopo faria este bloco depender da ordem dos `describe`.
  const filtraveis: CampoFiltravel[] = [{ id: 'marca', rotulo: 'Marca', variante: 'text' }]

  function setupComFavoritos() {
    return renderWithQuery(
      <VitraDataTable
        columns={columns}
        queryKey={['produtos-fav']}
        fetcher={(state) => produtosMock.list(state, 0)}
        actions={[{ id: 'filtro', label: 'Filtro' }]}
        filtros={filtraveis}
      />,
    )
  }

  function tabela() {
    const linha = screen.getByText('PENDENTE REDONDO ALUMÍNIO PRETO').closest('table')
    if (!linha) throw new Error('tabela não encontrada')
    return linha
  }

  it('a grade nasce em tabular-nums — alinhar dígito não é opt-in por coluna', async () => {
    setup()

    await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')
    expect(tabela().className).toContain('tabular-nums')
  })

  it('compacta encolhe a linha, e confortável devolve', async () => {
    const { user } = setup()

    await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')
    expect(tabela().className).not.toContain('[&_td]:h-10')

    await user.click(screen.getByRole('button', { name: 'Compacta' }))
    expect(tabela().className).toContain('[&_td]:h-10')

    await user.click(screen.getByRole('button', { name: 'Confortável' }))
    expect(tabela().className).not.toContain('[&_td]:h-10')
  })

  it('trocar a densidade NÃO refaz a consulta — desenho não é pergunta', async () => {
    let consultas = 0
    const { user } = renderWithQuery(
      <VitraDataTable
        columns={columns}
        queryKey={['produtos-densidade']}
        fetcher={(state) => {
          consultas += 1
          return produtosMock.list(state, 0)
        }}
      />,
    )

    await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')
    const antes = consultas

    await user.click(screen.getByRole('button', { name: 'Compacta' }))
    expect(consultas).toBe(antes)
  })

  it('a densidade entra no favorito e volta com ele', async () => {
    const { user } = setupComFavoritos()

    await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')
    await user.click(screen.getByRole('button', { name: 'Compacta' }))

    await user.click(screen.getByRole('button', { name: /Salvar consulta/ }))
    await user.type(screen.getByLabelText('Nome'), 'Apertada')
    await user.click(screen.getByRole('button', { name: 'Gravar' }))

    const guardado = JSON.parse(localStorage.getItem('cabinet.consultas-favoritas.v1') ?? '{}')
    expect(guardado['produtos-fav']?.[0]).toMatchObject({ densidade: 'compacta' })

    // Volta ao confortável e reaplica o favorito: a densidade tem de voltar junto.
    await user.click(screen.getByRole('button', { name: 'Confortável' }))
    await user.click(screen.getByRole('tab', { name: 'Apertada' }))

    expect(tabela().className).toContain('[&_td]:h-10')
  })

  /**
   * Favorito gravado antes da densidade existir não pode significar "volte ao
   * padrão" — a mesma regra da visão e do agrupamento.
   */
  it('favorito antigo, sem densidade, não mexe na densidade da tela', async () => {
    localStorage.setItem(
      'cabinet.consultas-favoritas.v1',
      JSON.stringify({ 'produtos-fav': [{ id: 'f1', nome: 'De antes', filtros: [] }] }),
    )

    const { user } = setupComFavoritos()

    await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')
    await user.click(screen.getByRole('button', { name: 'Compacta' }))

    await user.click(screen.getByRole('tab', { name: 'De antes' }))

    expect(tabela().className).toContain('[&_td]:h-10')
  })
})
