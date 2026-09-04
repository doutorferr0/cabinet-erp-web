import { VitraDataTable } from '@/components/cabinet/data-table'
import { createMockListProvider, normalize } from '@/data/provider'
import type { CampoFiltravel } from '@/lib/filtro-de-consulta'
import { type Produto, produtos } from '@/mocks/produtos'
import { renderWithQuery } from '@/test/utils'
import type { ColumnDef } from '@tanstack/react-table'
import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * MODO PLANILHA (D33) — o teclado, que é a issue inteira.
 *
 * Um modo que existe para ser operado por tecla não se prova por captura: o que
 * a captura mostra é o anel de foco; o que o operador precisa é que a seta leve
 * o foco para a célula certa, que Enter abra o editor na coluna que edita e
 * abra o REGISTRO na que não edita, e que `⌘C` ponha na área de transferência o
 * que está na tela. Cada um destes casos falha em silêncio — a tela continua
 * bonita e nada acontece.
 */

const produtosMock = createMockListProvider<Produto>({
  rows: produtos,
  matches: (p, q) =>
    normalize(p.nossoCodigo).includes(q) || normalize(p.nossaDescricao).includes(q),
})

/**
 * Colunas TIPADAS, e uma delas editável.
 *
 * `nossaDescricao` é a que aceita edição porque é a única do trio que um
 * operador corrigiria sem abrir a ficha. As outras duas provam o caminho
 * `senão`: Enter nelas abre o registro.
 */
const columns: ColumnDef<Produto>[] = [
  { accessorKey: 'nossoCodigo', header: 'Nosso Código', meta: { tipo: 'id' } },
  {
    accessorKey: 'nossaDescricao',
    header: 'Nossa Descrição',
    meta: { tipo: 'texto', editavel: true },
  },
  { accessorKey: 'marca', header: 'Marca' },
]

const filtraveis: CampoFiltravel[] = [{ id: 'marca', rotulo: 'Marca', variante: 'text' }]

function montar(props: Partial<Parameters<typeof VitraDataTable<Produto>>[0]> = {}) {
  return renderWithQuery(
    <VitraDataTable
      columns={columns}
      queryKey={['produtos-planilha']}
      fetcher={(state) => produtosMock.list(state, 0)}
      {...props}
    />,
  )
}

/** A célula pelo endereço visual, que é como o modo a nomeia. */
function celula(linha: number, coluna: number) {
  const alvo = document.querySelector<HTMLElement>(`[data-celula="${linha}:${coluna}"]`)
  if (!alvo) throw new Error(`célula ${linha}:${coluna} não está na grade`)
  return alvo
}

async function entrarNaPlanilha(user: ReturnType<typeof renderWithQuery>['user']) {
  await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')
  await user.click(screen.getByRole('button', { name: 'Planilha' }))
}

beforeEach(() => {
  localStorage.clear()
})

describe('modo Planilha — a terceira densidade', () => {
  it('entra pelo segmented, ao lado das outras duas densidades', async () => {
    const { user } = montar()
    await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')

    for (const rotulo of ['Compacta', 'Confortável', 'Planilha']) {
      expect(screen.getByRole('button', { name: rotulo })).toBeInTheDocument()
    }

    // Fora da planilha a grade é uma TABELA: `role="grid"` promete navegação por
    // célula a quem ouve, e prometê-la nas outras duas densidades seria mentira.
    expect(document.querySelector('[role="grid"]')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Planilha' }))
    expect(document.querySelector('[role="grid"]')).not.toBeNull()
  })

  it('a dica das teclas só aparece na planilha — legenda parada vira cenário', async () => {
    const { user } = montar()
    await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')

    expect(document.querySelector('[data-slot="dica-da-densidade"]')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Planilha' }))
    expect(screen.getByText(/navega/)).toHaveTextContent('Enter edita')

    await user.click(screen.getByRole('button', { name: 'Confortável' }))
    expect(document.querySelector('[data-slot="dica-da-densidade"]')).toBeNull()
  })

  /**
   * ROVING TABINDEX: uma parada de Tab para a grade inteira. Com `tabIndex=0`
   * em cada célula, uma consulta de vinte linhas × três colunas poria sessenta
   * paradas entre a busca e a paginação.
   */
  it('só UMA célula é parada de Tab, e a linha deixa de ser', async () => {
    const { user } = montar()
    await entrarNaPlanilha(user)

    const focaveis = [...document.querySelectorAll('[data-celula]')].filter(
      (celulaDaGrade) => celulaDaGrade.getAttribute('tabindex') === '0',
    )
    expect(focaveis).toHaveLength(1)
    expect(focaveis[0]).toBe(celula(0, 0))

    // A linha cede a parada para a célula: com as duas, um Tab pousaria na
    // linha e o seguinte na célula, sem sair do lugar.
    for (const linha of document.querySelectorAll('tbody tr[data-linha-id]')) {
      expect(linha.getAttribute('tabindex')).toBe('-1')
    }
  })

  it('as setas andam pela grade, e a parada de Tab acompanha', async () => {
    const { user } = montar()
    await entrarNaPlanilha(user)

    await user.click(celula(0, 0))
    expect(document.activeElement).toBe(celula(0, 0))

    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(celula(0, 1))
    expect(celula(0, 1).getAttribute('tabindex')).toBe('0')
    expect(celula(0, 0).getAttribute('tabindex')).toBe('-1')

    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(celula(1, 1))

    await user.keyboard('{ArrowLeft}')
    expect(document.activeElement).toBe(celula(1, 0))

    await user.keyboard('{ArrowUp}')
    expect(document.activeElement).toBe(celula(0, 0))
  })

  it('a seta não sai da grade pela borda — canto é canto', async () => {
    const { user } = montar()
    await entrarNaPlanilha(user)

    await user.click(celula(0, 0))
    await user.keyboard('{ArrowUp}{ArrowLeft}')

    expect(document.activeElement).toBe(celula(0, 0))
  })

  it('Tab avança para a célula seguinte e dobra para a próxima linha', async () => {
    const { user } = montar()
    await entrarNaPlanilha(user)

    await user.click(celula(0, 1))
    await user.keyboard('{Tab}')
    expect(document.activeElement).toBe(celula(0, 2))

    // Última coluna: a próxima célula é a PRIMEIRA da linha de baixo, que é
    // como se lê uma planilha.
    await user.keyboard('{Tab}')
    expect(document.activeElement).toBe(celula(1, 0))

    await user.keyboard('{Shift>}{Tab}{/Shift}')
    expect(document.activeElement).toBe(celula(0, 2))
  })

  /**
   * A grade não SEQUESTRA o Tab: na última célula ele volta a ser o Tab do
   * navegador. Grade de onde não se sai sem mouse é armadilha para quem navega
   * por teclado.
   */
  it('na última célula o Tab devolve o foco ao navegador', async () => {
    const { user } = montar()
    await entrarNaPlanilha(user)

    const linhas = document.querySelectorAll('tbody tr[data-linha-id]').length
    const ultima = celula(linhas - 1, 2)
    await user.click(ultima)
    await user.keyboard('{Tab}')

    expect(document.activeElement).not.toBe(ultima)
  })

  it('Enter na coluna que NÃO edita abre o registro', async () => {
    const abrir = vi.fn()
    const { user } = montar({ aoAbrirLinha: abrir })
    await entrarNaPlanilha(user)

    await user.click(celula(0, 0))
    await user.keyboard('{Enter}')

    expect(abrir).toHaveBeenCalledTimes(1)
    expect(document.querySelector('.editor-da-planilha')).toBeNull()
  })

  it('Enter na coluna editável abre o editor, e Enter grava', async () => {
    const gravar = vi.fn()
    const { user } = montar({ aoEditarCelula: gravar })
    await entrarNaPlanilha(user)

    await user.click(celula(0, 1))
    await user.keyboard('{Enter}')

    const editor = screen.getByLabelText('nossaDescricao, linha 1')
    expect(editor).toHaveFocus()

    await user.clear(editor)
    await user.type(editor, 'ARANDELA NOVA')
    await user.keyboard('{Enter}')

    expect(gravar).toHaveBeenCalledWith(expect.anything(), 'nossaDescricao', 'ARANDELA NOVA')
    // O foco VOLTA para a célula: o operador que gravou continua de onde
    // estava, e não no começo da grade.
    await waitFor(() => expect(document.activeElement).toBe(celula(0, 1)))
  })

  it('Esc cancela a edição sem gravar', async () => {
    const gravar = vi.fn()
    const { user } = montar({ aoEditarCelula: gravar })
    await entrarNaPlanilha(user)

    await user.click(celula(0, 1))
    await user.keyboard('{Enter}')
    await user.type(screen.getByLabelText('nossaDescricao, linha 1'), 'NAO VALE')
    await user.keyboard('{Escape}')

    expect(gravar).not.toHaveBeenCalled()
    expect(screen.queryByLabelText('nossaDescricao, linha 1')).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(celula(0, 1)))
  })

  /**
   * Sem `aoEditarCelula` a coluna editável NÃO edita: um editor cujo Enter não
   * grava em lugar nenhum é pior que editor nenhum — ele aceita a digitação e a
   * perde sem dizer.
   */
  it('coluna editável sem quem grave volta a abrir o registro', async () => {
    const abrir = vi.fn()
    const { user } = montar({ aoAbrirLinha: abrir })
    await entrarNaPlanilha(user)

    await user.click(celula(0, 1))
    await user.keyboard('{Enter}')

    expect(screen.queryByLabelText('nossaDescricao, linha 1')).toBeNull()
    expect(abrir).toHaveBeenCalledTimes(1)
  })

  it('⌘C copia o texto da célula — o que está na tela, não o dado cru', async () => {
    const { user } = montar()
    await entrarNaPlanilha(user)

    await user.click(celula(0, 0))
    const naTela = celula(0, 0).textContent?.trim()
    await user.keyboard('{Control>}c{/Control}')

    await waitFor(async () => {
      expect(await navigator.clipboard.readText()).toBe(naTela)
    })
  })

  it('Shift+setas estende a faixa, e a cópia sai em TSV', async () => {
    const { user } = montar()
    await entrarNaPlanilha(user)

    await user.click(celula(0, 0))
    await user.keyboard('{Shift>}{ArrowRight}{ArrowDown}{/Shift}')

    // Quatro células marcadas: o retângulo entre a âncora e o cursor.
    expect(document.querySelectorAll('[data-celula][aria-selected="true"]')).toHaveLength(4)

    await user.keyboard('{Control>}c{/Control}')

    const esperado = [
      [celula(0, 0), celula(0, 1)].map((c) => c.textContent?.trim()).join('\t'),
      [celula(1, 0), celula(1, 1)].map((c) => c.textContent?.trim()).join('\t'),
    ].join('\n')

    await waitFor(async () => {
      expect(await navigator.clipboard.readText()).toBe(esperado)
    })
  })

  it('Esc colapsa a faixa antes de qualquer outra coisa', async () => {
    const { user } = montar()
    await entrarNaPlanilha(user)

    await user.click(celula(0, 0))
    await user.keyboard('{Shift>}{ArrowRight}{/Shift}')
    expect(document.querySelectorAll('[aria-selected="true"][data-celula]')).toHaveLength(2)

    await user.keyboard('{Escape}')
    expect(document.querySelectorAll('[aria-selected="true"][data-celula]')).toHaveLength(0)
  })

  it('a planilha entra no favorito e volta com ele', async () => {
    const { user } = renderWithQuery(
      <VitraDataTable
        columns={columns}
        queryKey={['produtos-planilha-fav']}
        fetcher={(state) => produtosMock.list(state, 0)}
        actions={[{ id: 'filtro', label: 'Filtro' }]}
        filtros={filtraveis}
      />,
    )

    await entrarNaPlanilha(user)
    await user.click(screen.getByRole('button', { name: /Salvar consulta/ }))
    await user.type(screen.getByLabelText('Nome'), 'Conferência')
    await user.click(screen.getByRole('button', { name: 'Gravar' }))

    const guardado = JSON.parse(localStorage.getItem('cabinet.consultas-favoritas.v1') ?? '{}')
    expect(guardado['produtos-planilha-fav']?.[0]).toMatchObject({ densidade: 'planilha' })

    await user.click(screen.getByRole('button', { name: 'Confortável' }))
    expect(document.querySelector('[role="grid"]')).toBeNull()

    await user.click(screen.getByRole('tab', { name: 'Conferência' }))
    expect(document.querySelector('[role="grid"]')).not.toBeNull()
  })
})

describe('a barra de lote FLUTUA — não empurra a grade', () => {
  const acoesDeSelecao = [{ id: 'imprimir', label: 'Imprimir' }]

  it('a barra nasce dentro de um ancoradouro de altura ZERO', async () => {
    const { user } = renderWithQuery(
      <VitraDataTable
        columns={columns}
        queryKey={['produtos-lote']}
        fetcher={(state) => produtosMock.list(state, 0)}
        acoesDeSelecao={acoesDeSelecao}
        aoAbrirLinha={() => {}}
      />,
    )
    await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')

    const grade = document.querySelector('[data-slot="grade"]')
    if (!grade) throw new Error('grade não montada')
    const filhosAntes = grade.childElementCount

    await user.click(screen.getAllByRole('checkbox')[1] as HTMLElement)
    await screen.findByText(/selecionada/)

    // A grade não ganhou nem perdeu peça no fluxo: o ancoradouro já estava lá,
    // vazio. Se a barra voltar para o fluxo do painel, esta contagem muda — que
    // é exatamente o defeito de 2026-09 (marcar uma linha descia a grade e a
    // linha mirada saía de baixo do cursor).
    expect(grade.childElementCount).toBe(filhosAntes)

    const ancora = document.querySelector('[data-slot="ancora-da-barra-de-selecao"]')
    const barra = document.querySelector('[data-slot="barra-de-selecao"]')
    if (!ancora || !barra) throw new Error('barra fora do ancoradouro')
    expect(ancora.contains(barra)).toBe(true)
    expect(ancora.className).toContain('h-0')
    expect(ancora.className).toContain('sticky')
  })

  it('a barra some quando a seleção acaba', async () => {
    const { user } = renderWithQuery(
      <VitraDataTable
        columns={columns}
        queryKey={['produtos-lote-saida']}
        fetcher={(state) => produtosMock.list(state, 0)}
        acoesDeSelecao={acoesDeSelecao}
        aoAbrirLinha={() => {}}
      />,
    )
    await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')

    const caixa = screen.getAllByRole('checkbox')[1] as HTMLElement
    await user.click(caixa)
    await screen.findByText(/selecionada/)

    await user.click(caixa)
    await waitFor(() => {
      expect(document.querySelector('[data-slot="barra-de-selecao"]')).toBeNull()
    })
  })
})

describe('largura de coluna estável', () => {
  it('a grade declara largura POR TIPO, e a entidade fica flexível', async () => {
    montar()
    await screen.findByText('PENDENTE REDONDO ALUMÍNIO PRETO')

    const tabela = document.querySelector('table')
    expect(tabela?.className).toContain('table-fixed')

    const colunas = [...document.querySelectorAll('colgroup col')]
    // `id 110` (a coluna tipada) · texto e sem tipo sem largura: são as que
    // dividem a sobra.
    expect(colunas[0]?.getAttribute('style')).toContain('110px')
    expect(colunas[1]?.getAttribute('style')).toBeNull()
    expect(colunas[2]?.getAttribute('style')).toBeNull()
  })
})
