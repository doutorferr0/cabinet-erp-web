import { TabelaEditavel } from '@/components/cabinet/tabela-editavel'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

interface Item {
  id: string
  name: string
  active: boolean
}

const ITENS: Item[] = [
  { id: 'a', name: 'STELA', active: true },
  { id: 'b', name: 'APOSENTADA', active: false },
]

function montar(props: Partial<React.ComponentProps<typeof TabelaEditavel<Item>>> = {}) {
  const aoGravarCelula = vi.fn()
  const aoIncluir = vi.fn()
  const aoAlternarAtivo = vi.fn()
  const user = userEvent.setup()
  render(
    <TabelaEditavel<Item>
      linhas={ITENS}
      colunas={[{ id: 'name', rotulo: 'Nome', valor: (i) => i.name, editavel: true }]}
      chave={(i) => i.id}
      nome={(i) => i.name}
      ativo={(i) => i.active}
      entidade="item da lista"
      rotuloDaInclusao="Novo item"
      aoGravarCelula={aoGravarCelula}
      aoIncluir={aoIncluir}
      aoAlternarAtivo={aoAlternarAtivo}
      {...props}
    />,
  )
  return { user, aoGravarCelula, aoIncluir, aoAlternarAtivo }
}

describe('TabelaEditavel', () => {
  it('a célula VIRA input no clique, e Enter grava o valor novo', async () => {
    const { user, aoGravarCelula } = montar()

    // Em repouso não há campo nenhum: a grade se lê como grade. O gatilho é
    // botão, e o rótulo diz coluna E registro — numa lista de 30, "Editar"
    // sozinho não diz o quê.
    await user.click(screen.getByRole('button', { name: 'Editar Nome de STELA' }))

    const campo = screen.getByRole('textbox', { name: 'Nome de STELA' })
    await user.clear(campo)
    await user.type(campo, 'STELLA{Enter}')

    expect(aoGravarCelula).toHaveBeenCalledWith(ITENS[0], 'name', 'STELLA')
    // Voltou a ser texto: quem manda no que se lê é o dado, não o rascunho.
    expect(screen.queryByRole('textbox', { name: 'Nome de STELA' })).not.toBeInTheDocument()
  })

  it('Esc desfaz sem escrever — desistir não é gravar', async () => {
    const { user, aoGravarCelula } = montar()

    await user.click(screen.getByRole('button', { name: 'Editar Nome de STELA' }))
    await user.clear(screen.getByRole('textbox', { name: 'Nome de STELA' }))
    await user.type(screen.getByRole('textbox', { name: 'Nome de STELA' }), 'OUTRA{Escape}')

    expect(aoGravarCelula).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Editar Nome de STELA' })).toBeInTheDocument()
  })

  it('sair sem mudar nada NÃO escreve', async () => {
    const { user, aoGravarCelula } = montar()

    // Um `PUT` que repõe o mesmo valor voltaria 200 e ensinaria ao operador que
    // ele mexeu numa linha em que não mexeu.
    await user.click(screen.getByRole('button', { name: 'Editar Nome de STELA' }))
    await user.tab()

    expect(aoGravarCelula).not.toHaveBeenCalled()
  })

  it('a linha nova mora no rodapé e esvazia para o próximo', async () => {
    const { user, aoIncluir } = montar()

    const campo = screen.getByRole('textbox', { name: 'Novo item' })
    await user.type(campo, 'MARCA NOVA{Enter}')

    expect(aoIncluir).toHaveBeenCalledWith('MARCA NOVA')
    // Quem povoa uma lista digita vários seguidos: o campo limpo é o que torna
    // isso um gesto só.
    expect(campo).toHaveValue('')
  })

  it('DESATIVAR confirma; REATIVAR não — confirmação de gesto reversível ensina a clicar Sim sem ler', async () => {
    const { user, aoAlternarAtivo } = montar()

    const linhas = screen.getAllByRole('row')
    // A linha de STELA (ativa) pede confirmação antes de escrever.
    await user.click(within(linhas[1] as HTMLElement).getByRole('button', { name: 'Desativar' }))
    expect(aoAlternarAtivo).not.toHaveBeenCalled()

    const dialogo = await screen.findByRole('alertdialog')
    await user.click(within(dialogo).getByRole('button', { name: /desativar/i }))
    expect(aoAlternarAtivo).toHaveBeenCalledWith(ITENS[0], false)

    // A linha de APOSENTADA (inativa) volta ao combo direto.
    aoAlternarAtivo.mockClear()
    await user.click(within(linhas[2] as HTMLElement).getByRole('button', { name: 'Reativar' }))
    expect(aoAlternarAtivo).toHaveBeenCalledWith(ITENS[1], true)
  })

  it('o item INATIVO aparece — é ele que alguém vem aqui reativar', () => {
    montar()
    expect(screen.getByText('APOSENTADA')).toBeInTheDocument()
    expect(screen.getByText('Inativo')).toBeInTheDocument()
  })

  it('pendente trava a edição: escrita em curso não aceita a segunda', async () => {
    const { user, aoGravarCelula } = montar({ pendente: true })

    // Sem gatilho de edição enquanto a escrita corre — duas células abertas
    // dariam duas escritas no mesmo registro, e a segunda venceria a primeira.
    expect(screen.queryByRole('button', { name: 'Editar Nome de STELA' })).not.toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Desativar' })[0] as HTMLElement)
    expect(aoGravarCelula).not.toHaveBeenCalled()
  })
})
