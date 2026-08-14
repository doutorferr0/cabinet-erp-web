import { ListaDeFiltros } from '@/components/cabinet/lista-de-filtros'
import type { CampoFiltravel, FiltroDaTabela, Juncao } from '@/lib/filtro-de-consulta'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

const campos: CampoFiltravel[] = [
  { id: 'nome', rotulo: 'Nome', variante: 'text' },
  {
    id: 'setor',
    rotulo: 'Setor',
    variante: 'select',
    opcoes: [
      { valor: 'VENDAS', rotulo: 'VENDAS' },
      { valor: 'ESTOQUE', rotulo: 'ESTOQUE' },
    ],
  },
  { id: 'ativo', rotulo: 'Ativo', variante: 'boolean' },
  {
    id: 'cargo',
    rotulo: 'Cargo',
    variante: 'multiSelect',
    opcoes: [
      { valor: 'VENDEDOR', rotulo: 'VENDEDOR' },
      { valor: 'GERENTE', rotulo: 'GERENTE' },
    ],
  },
]

/**
 * O componente é controlado; o hospedeiro de teste guarda o estado e o expõe
 * como texto para as asserções falarem do DADO que sai, não do pixel que entra.
 */
function Hospedeiro() {
  const [filtros, setFiltros] = useState<FiltroDaTabela[]>([])
  const [juncao, setJuncao] = useState<Juncao>('and')
  return (
    <>
      <ListaDeFiltros
        campos={campos}
        filtros={filtros}
        juncao={juncao}
        onFiltrosChange={setFiltros}
        onJuncaoChange={setJuncao}
      />
      <output data-testid="estado">{JSON.stringify({ filtros, juncao })}</output>
    </>
  )
}

function estado(): { filtros: FiltroDaTabela[]; juncao: Juncao } {
  return JSON.parse(screen.getByTestId('estado').textContent ?? '{}')
}

function setup() {
  const user = userEvent.setup()
  render(<Hospedeiro />)
  return { user }
}

async function abrirPainel(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /^Filtro/ }))
  return screen.findByRole('button', { name: 'Adicionar filtro' })
}

describe('ListaDeFiltros', () => {
  it('painel fechado por padrão; o gatilho é o botão Filtro da barra', async () => {
    setup()
    expect(screen.getByRole('button', { name: 'Filtro — nenhum aplicado' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Adicionar filtro' })).not.toBeInTheDocument()
  })

  it('adiciona a primeira linha já com campo e operador padrão', async () => {
    const { user } = setup()
    const adicionar = await abrirPainel(user)
    await user.click(adicionar)

    expect(await screen.findByText('Onde')).toBeInTheDocument()
    const [primeiro] = estado().filtros
    expect(primeiro).toMatchObject({ id: 'nome', variante: 'text', operador: 'iLike', valor: '' })
  })

  it('digitar o valor completa a frase do filtro', async () => {
    const { user } = setup()
    await user.click(await abrirPainel(user))
    await user.type(await screen.findByLabelText('Valor do filtro 1'), 'carla')

    expect(estado().filtros[0]?.valor).toBe('carla')
  })

  it('trocar de campo troca variante, operador e zera o valor', async () => {
    const { user } = setup()
    await user.click(await abrirPainel(user))
    await user.type(await screen.findByLabelText('Valor do filtro 1'), 'carla')

    await user.click(screen.getByRole('button', { name: 'Campo do filtro 1' }))
    await user.click(await screen.findByRole('menuitemradio', { name: /Ativo/ }))

    // Valor herdado de outro campo viraria consulta que ninguém escreveu.
    expect(estado().filtros[0]).toMatchObject({ id: 'ativo', variante: 'boolean', valor: '' })
  })

  it('operador que dispensa valor faz o campo de valor sumir', async () => {
    const { user } = setup()
    await user.click(await abrirPainel(user))
    await user.type(await screen.findByLabelText('Valor do filtro 1'), 'carla')

    await user.selectOptions(screen.getByLabelText('Operador do filtro 1'), 'isEmpty')

    expect(screen.queryByLabelText('Valor do filtro 1')).not.toBeInTheDocument()
    expect(estado().filtros[0]).toMatchObject({ operador: 'isEmpty', valor: '' })
  })

  it('a junção aparece só na segunda linha, e vale para a lista inteira', async () => {
    const { user } = setup()
    const adicionar = await abrirPainel(user)
    await user.click(adicionar)
    expect(screen.queryByLabelText('Junção entre os filtros')).not.toBeInTheDocument()

    await user.click(adicionar)
    await user.selectOptions(await screen.findByLabelText('Junção entre os filtros'), 'or')
    expect(estado().juncao).toBe('or')

    // Terceira linha ecoa a mesma junção em texto — não vira um segundo seletor.
    await user.click(adicionar)
    expect(screen.getAllByLabelText('Junção entre os filtros')).toHaveLength(1)
  })

  it('remove uma linha sem tocar nas outras', async () => {
    const { user } = setup()
    const adicionar = await abrirPainel(user)
    await user.click(adicionar)
    await user.type(await screen.findByLabelText('Valor do filtro 1'), 'carla')
    await user.click(adicionar)

    await user.click(screen.getByRole('button', { name: 'Remover o filtro 2' }))

    const { filtros } = estado()
    expect(filtros).toHaveLength(1)
    expect(filtros[0]?.valor).toBe('carla')
  })

  it('limpar devolve a lista vazia e a junção ao padrão', async () => {
    const { user } = setup()
    const adicionar = await abrirPainel(user)
    await user.click(adicionar)
    await user.click(adicionar)
    await user.selectOptions(await screen.findByLabelText('Junção entre os filtros'), 'or')

    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }))

    expect(estado()).toEqual({ filtros: [], juncao: 'and' })
  })

  it('o gatilho conta os filtros mesmo com o painel fechado', async () => {
    const { user } = setup()
    await user.click(await abrirPainel(user))

    await user.keyboard('{Escape}')
    expect(
      await screen.findByRole('button', { name: 'Filtro — 1 aplicado(s)' }),
    ).toBeInTheDocument()
  })

  it('múltipla escolha acumula opções sem fechar a lista', async () => {
    const { user } = setup()
    await user.click(await abrirPainel(user))

    await user.click(screen.getByRole('button', { name: 'Campo do filtro 1' }))
    await user.click(await screen.findByRole('menuitemradio', { name: /Cargo/ }))

    await user.click(await screen.findByLabelText('Valor do filtro 1'))
    await user.click(await screen.findByRole('menuitemcheckbox', { name: /VENDEDOR/ }))
    await user.click(await screen.findByRole('menuitemcheckbox', { name: /GERENTE/ }))

    expect(estado().filtros[0]?.valor).toEqual(['VENDEDOR', 'GERENTE'])
  })
})
