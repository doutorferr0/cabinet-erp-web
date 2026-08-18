import { cadastroActions } from '@/components/cabinet/cadastro-actions'
import { TelaDeListagem } from '@/components/cabinet/tela-de-listagem'
import { renderWithQuery } from '@/test/utils'
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

interface Linha {
  id: string
  nome: string
}

const LINHAS: Linha[] = [
  { id: '1', nome: 'STELLA' },
  { id: '2', nome: 'LUMINA' },
  { id: '3', nome: 'FAROL' },
]

function montar(over: { onAbrir?: (l: Linha) => void; onConsultar?: (l: Linha) => void } = {}) {
  const onIncluir = vi.fn()
  const onAbrir = over.onAbrir ?? vi.fn()
  const onConsultar = over.onConsultar ?? vi.fn()
  const onExcluir = vi.fn()
  const actions = cadastroActions<Linha>({
    entidade: 'teste',
    onIncluir,
    onAbrir,
    onConsultar,
    onExcluir,
  })
  const r = renderWithQuery(
    <TelaDeListagem<Linha>
      titulo="Cadastro de Testes"
      columns={[{ accessorKey: 'nome', header: 'Nome' }]}
      queryKey={['index-table-teste']}
      fetcher={async () => ({ rows: LINHAS, total: LINHAS.length })}
      actions={actions}
    />,
  )
  return { ...r, onIncluir, onAbrir, onConsultar, onExcluir }
}

function linhaDe(nome: string): HTMLElement {
  const celula = screen.getByText(nome)
  const linha = celula.closest('tr')
  if (!linha) throw new Error(`"${nome}" não está numa linha`)
  return linha
}

/**
 * O que estes testes travam é o GESTO da listagem (#198), não o desenho:
 * a linha abre, o checkbox marca, e a ação de registro só aparece depois de
 * haver o que agir. Cada um desses três já foi outra coisa neste repo — barra
 * fixa de sete botões, depois menu `⋯` — e a regressão silenciosa aqui é o
 * operador clicando na linha e nada acontecer.
 */
describe('listagem no gesto IndexTable', () => {
  it('clicar na linha ABRE o registro, sem passar por botão nenhum', async () => {
    const onConsultar = vi.fn()
    const { user } = montar({ onConsultar })

    await user.click(await screen.findByText('STELLA'))

    expect(onConsultar).toHaveBeenCalledWith(LINHAS[0])
  })

  it('marcar não abre: o checkbox é alvo próprio', async () => {
    const onConsultar = vi.fn()
    const { user } = montar({ onConsultar })

    await screen.findByText('STELLA')
    await user.click(within(linhaDe('STELLA')).getByRole('checkbox'))

    expect(onConsultar).not.toHaveBeenCalled()
    expect(await screen.findByText('1 linha marcada')).toBeInTheDocument()
  })

  it('a barra de seleção NÃO existe antes de haver seleção', async () => {
    montar()
    await screen.findByText('STELLA')

    // Ação de registro fora da tela até fazer sentido — o contrário é um botão
    // desabilitado ocupando o topo o dia inteiro.
    expect(document.querySelector('[data-slot="barra-de-selecao"]')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Alterar' })).not.toBeInTheDocument()
  })

  it('Alterar age sobre a linha marcada', async () => {
    const onAbrir = vi.fn()
    const { user } = montar({ onAbrir })

    await screen.findByText('LUMINA')
    await user.click(within(linhaDe('LUMINA')).getByRole('checkbox'))
    await user.click(await screen.findByRole('button', { name: 'Alterar' }))

    expect(onAbrir).toHaveBeenCalledWith(LINHAS[1])
  })

  it('com VÁRIAS marcadas, ação de um registro recusa em voz alta', async () => {
    const { user } = montar()

    await screen.findByText('STELLA')
    await user.click(within(linhaDe('STELLA')).getByRole('checkbox'))
    await user.click(within(linhaDe('LUMINA')).getByRole('checkbox'))

    expect(await screen.findByText('2 linhas marcadas')).toBeInTheDocument()
    const alterar = screen.getByRole('button', { name: 'Alterar' })
    expect(alterar).toBeDisabled()
    // Botão morto e mudo é lido como defeito — aqui o motivo é o desenho.
    expect(alterar).toHaveAttribute('title', expect.stringContaining('um registro por vez'))
  })

  it('marcar todas marca A PÁGINA, e o rótulo não promete mais que isso', async () => {
    const { user } = montar()

    await screen.findByText('STELLA')
    await user.click(screen.getByRole('checkbox', { name: 'Marcar todas as linhas desta página' }))

    expect(await screen.findByText('3 linhas marcadas')).toBeInTheDocument()
  })

  it('Limpar seleção devolve a tela ao estado de leitura', async () => {
    const { user } = montar()

    await screen.findByText('STELLA')
    await user.click(within(linhaDe('STELLA')).getByRole('checkbox'))
    await user.click(await screen.findByRole('button', { name: 'Limpar seleção' }))

    await waitFor(() => {
      expect(document.querySelector('[data-slot="barra-de-selecao"]')).toBeNull()
    })
  })

  it('o cabeçalho fica fixo na rolagem', async () => {
    montar()
    await screen.findByText('STELLA')

    const cabecalho = screen.getByRole('table').querySelector('thead')
    expect(cabecalho?.className).toContain('sticky')
    // Fundo opaco não é enfeite: sem ele as linhas passam por baixo do
    // cabeçalho fixo e o texto se mistura ao dado.
    expect(cabecalho?.className).toContain('bg-card')
  })
})
