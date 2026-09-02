import { VitraDataTable } from '@/components/cabinet/data-table'
import { createMockListProvider, normalize } from '@/data/provider'
import { type Produto, produtos } from '@/mocks/produtos'
import { renderWithQuery } from '@/test/utils'
import type { ColumnDef } from '@tanstack/react-table'
import { screen, waitFor, within } from '@testing-library/react'
import { Printer } from 'lucide-react'
import { describe, expect, it, vi } from 'vitest'

/**
 * A GRADE da 2.0 (#476 · D8) — o que muda de fato no desenho da listagem.
 *
 * Estes casos travam decisões que já foram outra coisa neste repo e que voltam
 * sozinhas na primeira PR distraída: a régua entre linhas (era 2px de tinta, e
 * cada linha lia como caixa própria), o cabeçalho (era barra preta), a linha
 * marcada (era violeta cheio, que lavava o dado) e a densidade (o nome `padrao`
 * ficou gravado em favorito de máquina de operador).
 *
 * O que NÃO está aqui é de propósito: filtro é D9 e agrupamento é D10.
 */

const provider = createMockListProvider<Produto>({
  rows: produtos,
  matches: (p, q) =>
    normalize(p.nossoCodigo).includes(q) || normalize(p.nossaDescricao).includes(q),
})

/** Colunas TIPADAS: é assim que a tela declara o que cada valor é. */
const colunasTipadas: ColumnDef<Produto>[] = [
  { accessorKey: 'nossoCodigo', header: 'Código', meta: { tipo: 'id' } },
  { accessorKey: 'nossaDescricao', header: 'Descrição', meta: { tipo: 'texto' } },
  { accessorKey: 'marca', header: 'Marca', meta: { tipo: 'entidade' } },
  { accessorKey: 'valorTabelaCentavos', header: 'Total', meta: { tipo: 'dinheiro' } },
]

function montar(over: Partial<Parameters<typeof VitraDataTable<Produto>>[0]> = {}) {
  return renderWithQuery(
    <VitraDataTable<Produto>
      columns={colunasTipadas}
      queryKey={['grade-2-0']}
      fetcher={(state) => provider.list(state, 0)}
      pageSizeOptions={[5]}
      {...over}
    />,
  )
}

/**
 * MONTA e devolve a primeira linha de dado.
 *
 * O `montar()` estava faltando aqui, e a suíte da D8 chegou vermelha com sete
 * casos falhando contra um `<body />` vazio — o helper esperava por um texto
 * que nada tinha renderizado. Achado ao ligar a barra 2.0 (D9) e conferido
 * contra a base: falha herdada, não regressão.
 */
async function primeiraLinha(over: Parameters<typeof montar>[0] = {}) {
  // Monta só se ninguém montou: metade dos casos precisa passar props próprias
  // e já chamou `montar` antes: montar de novo poria DUAS grades no documento,
  // e `getAllByRole('row')[1]` passaria a ler a linha da tabela errada.
  if (document.body.childElementCount === 0) montar(over)
  await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')
  const linha = screen.getAllByRole('row')[1]
  if (!linha) throw new Error('a grade não tem linha de dado')
  return linha
}

describe('grade 2.0: separação', () => {
  it('a régua entre linhas é HAIRLINE — nenhuma linha de 2px', async () => {
    const linha = await primeiraLinha()

    // §Separação: hairline separa itens do MESMO tipo; a caixa (borda + sombra)
    // separa o objeto do plano, e aparece UMA vez, no contêiner. Com 2px nas
    // duas fronteiras, a listagem virava pilha de caixas sem hierarquia.
    expect(linha.className).toContain('border-b')
    expect(linha.className).not.toContain('border-b-2')
    const corpo = linha.closest('tbody')
    expect(corpo?.className).toContain('border-rule-hair')
    expect(corpo?.className).not.toContain('border-b-2')
  })

  it('a caixa da grade tem UM traço fino, não a borda de 2px', async () => {
    await primeiraLinha()
    const caixa = document.querySelector('[data-slot="grade"]')
    expect(caixa?.className).toContain('border-input')
    expect(caixa?.className).not.toContain('border-2')
  })
})

describe('grade 2.0: célula tipada', () => {
  it('o cabeçalho anuncia o TIPO da coluna com um ícone', async () => {
    await primeiraLinha()

    const total = screen.getByRole('columnheader', { name: /Total/ })
    expect(within(total).getByTestId ?? true).toBeTruthy()
    expect(total.querySelector('[data-slot="icone-de-tipo"]')?.getAttribute('data-tipo')).toBe(
      'dinheiro',
    )
    const codigo = screen.getByRole('columnheader', { name: /Código/ })
    expect(codigo.querySelector('[data-slot="icone-de-tipo"]')?.getAttribute('data-tipo')).toBe(
      'id',
    )
  })

  it('id vem em mono e na cor de acento; dinheiro vai para a direita', async () => {
    const linha = await primeiraLinha()
    const celulas = within(linha).getAllByRole('cell')

    const id = celulas.find((c) => c.dataset.tipo === 'id')
    expect(id?.className).toContain('t-dado')
    expect(id?.className).toContain('--primary-text')

    const dinheiro = celulas.find((c) => c.dataset.tipo === 'dinheiro')
    expect(dinheiro?.className).toContain('text-right')
    expect(dinheiro?.className).toContain('t-dado')
    // A moeda sai em Meta, separada do valor: `R$` repetido cinquenta vezes com
    // o peso do número é ruído que o olho tem de pular para achar o dígito.
    expect(dinheiro?.querySelector('[data-slot="celula-dinheiro"]')).not.toBeNull()
  })

  it('entidade traz monograma e nome — sem a tela desenhar nada', async () => {
    const linha = await primeiraLinha()
    const entidade = within(linha)
      .getAllByRole('cell')
      .find((c) => c.dataset.tipo === 'entidade')

    expect(entidade?.querySelector('[data-slot="monograma"]')).not.toBeNull()
  })

  it('coluna que declara `cell` próprio manda no conteúdo; o tipo só alinha', async () => {
    montar({
      columns: [
        ...colunasTipadas.slice(0, 3),
        {
          accessorKey: 'valorTabelaCentavos',
          header: 'Total',
          meta: { tipo: 'dinheiro' },
          cell: () => <span data-testid="celula-da-tela">à mão</span>,
        },
      ],
    })
    await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')

    // O conteúdo é o da tela — e a moldura (mono, direita) continua sendo a do
    // tipo. Era exatamente esse o caso frequente antes da tipagem: célula que
    // já formata e só quer alinhar como as irmãs.
    const celula = screen.getAllByTestId('celula-da-tela')[0]?.closest('td')
    expect(celula?.className).toContain('text-right')
  })
})

describe('grade 2.0: densidade', () => {
  function tabela() {
    return screen.getByRole('table')
  }

  it('abre em CONFORTÁVEL e a compacta encolhe a linha', async () => {
    const { user } = montar()
    await primeiraLinha()

    expect(screen.getByRole('button', { name: 'Confortável' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(tabela().className).not.toContain('[&_td]:h-10')

    await user.click(screen.getByRole('button', { name: 'Compacta' }))
    expect(tabela().className).toContain('[&_td]:h-10')
  })

  it('compacta esconde o subtítulo da entidade — 52 vira 40, não duas linhas espremidas', async () => {
    const linhas = produtos.slice(0, 3).map((p) => ({
      ...p,
      marca: { nome: p.marca, subtitulo: 'fornecedor de teste' } as unknown as string,
    }))
    const { user } = montar({
      fetcher: async () => ({ rows: linhas, total: linhas.length }),
    })

    expect(await screen.findAllByText('fornecedor de teste')).not.toHaveLength(0)

    await user.click(screen.getByRole('button', { name: 'Compacta' }))
    await waitFor(() => {
      expect(screen.queryByText('fornecedor de teste')).not.toBeInTheDocument()
    })
  })

  it('favorito gravado como `padrao` ainda abre em confortável', async () => {
    // A densidade se chamava `padrao` antes desta rodada, e há favoritos com
    // esse valor em máquina de operador. Descartá-los mudaria a tela sem
    // ninguém ter mexido no seletor.
    localStorage.setItem(
      'cabinet.consultas-favoritas.v1',
      JSON.stringify({
        'grade-densidade-velha': [
          { id: 'f1', nome: 'De antes', filtros: [], densidade: 'padrao', padrao: true },
        ],
      }),
    )
    montar({ queryKey: ['grade-densidade-velha'], filtros: [] })
    await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')

    expect(screen.getByRole('table').className).not.toContain('[&_td]:h-10')
  })
})

describe('grade 2.0: lote e ações de linha', () => {
  const acoesDeSelecao = [{ id: 'excluir', label: 'Cancelar ordens' }]

  it('a barra de lote conta as selecionadas e some com `esc`', async () => {
    const { user } = montar({ acoesDeSelecao })
    await primeiraLinha()

    const caixas = screen.getAllByRole('checkbox')
    await user.click(caixas[1] as HTMLElement)
    await user.click(caixas[2] as HTMLElement)

    const barra = await screen.findByText(/selecionadas/)
    expect(barra.textContent).toContain('2')

    // `esc` é a saída que quem usa lista já tem no dedo. Não é atalho novo: o
    // botão continua na barra, e a barra ANUNCIA a tecla.
    await user.keyboard('{Escape}')
    await waitFor(() => {
      expect(document.querySelector('[data-slot="barra-de-selecao"]')).toBeNull()
    })
  })

  it('marcar tudo pelo cabeçalho marca A PÁGINA, e desmarcar volta atrás', async () => {
    const { user } = montar({ acoesDeSelecao })
    await primeiraLinha()

    const todas = screen.getByRole('checkbox', { name: 'Marcar todas as linhas desta página' })
    await user.click(todas)
    expect((await screen.findByText(/selecionadas/)).textContent).toContain('5')

    await user.click(todas)
    await waitFor(() => {
      expect(document.querySelector('[data-slot="barra-de-selecao"]')).toBeNull()
    })
  })

  it('ação de linha age na linha e NÃO abre o registro', async () => {
    const imprimir = vi.fn()
    const abrir = vi.fn()
    const { user } = montar({
      aoAbrirLinha: abrir,
      acoesDeLinha: [{ id: 'imprimir', label: 'Imprimir', icon: Printer, onClick: imprimir }],
    })
    const linha = await primeiraLinha()

    await user.click(within(linha).getByRole('button', { name: 'Imprimir' }))

    expect(imprimir).toHaveBeenCalledTimes(1)
    // O clique da linha abre o registro; a ação tem de barrar a propagação,
    // senão imprimir levaria o operador para outra tela sem ele pedir.
    expect(abrir).not.toHaveBeenCalled()
  })

  it('`Abrir` é derivada de `aoAbrirLinha` — a tela não a declara', async () => {
    const abrir = vi.fn()
    const { user } = montar({ aoAbrirLinha: abrir })
    const linha = await primeiraLinha()

    await user.click(within(linha).getByRole('button', { name: 'Abrir' }))

    expect(abrir).toHaveBeenCalledTimes(1)
  })

  it('sem `aoAbrirLinha` e sem ações, a coluna de ações não existe', async () => {
    const linha = await primeiraLinha()
    expect(linha.querySelector('[data-slot="acoes-de-linha"]')).toBeNull()
  })
})

describe('grade 2.0: rodapé', () => {
  it('diz quantas de quantas e soma a coluna de dinheiro', async () => {
    montar()
    await primeiraLinha()

    const contagem = screen.getByTestId('contagem-da-grade')
    // Cinco na página de 45: o rodapé chama a soma de "da página", porque
    // chamá-la de filtrada seria um número certo com o nome errado — e ele
    // acabaria copiado para um relatório.
    expect(contagem).toHaveTextContent('5 de 45 registros')
    expect(contagem).toHaveTextContent('soma da página')
    expect(contagem.textContent).toContain('R$')
  })

  it('a paginação diz a FAIXA, não o número da página', async () => {
    const { user } = montar()
    await primeiraLinha()

    expect(screen.getByTestId('faixa-da-pagina')).toHaveTextContent('1–5 de 45')

    await user.click(screen.getByRole('button', { name: 'Próxima página' }))
    await waitFor(() => {
      expect(screen.getByTestId('faixa-da-pagina')).toHaveTextContent('6–10 de 45')
    })
  })
})
