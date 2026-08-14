import { MenuDeFiltros } from '@/components/cabinet/menu-de-filtros'
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
]

function Hospedeiro({ juncao = 'and' }: { juncao?: Juncao }) {
  const [filtros, setFiltros] = useState<FiltroDaTabela[]>([])
  return (
    <>
      <MenuDeFiltros
        campos={campos}
        filtros={filtros}
        juncao={juncao}
        onFiltrosChange={setFiltros}
      />
      <output data-testid="estado">{JSON.stringify(filtros)}</output>
    </>
  )
}

function estado(): FiltroDaTabela[] {
  return JSON.parse(screen.getByTestId('estado').textContent ?? '[]')
}

function setup(props: { juncao?: Juncao } = {}) {
  const user = userEvent.setup()
  render(<Hospedeiro {...props} />)
  return { user }
}

async function escolherCampo(user: ReturnType<typeof userEvent.setup>, rotulo: RegExp) {
  await user.click(screen.getByRole('button', { name: /^Filtro/ }))
  await user.click(await screen.findByRole('menuitem', { name: rotulo }))
}

describe('MenuDeFiltros', () => {
  it('a paleta lista os campos e o escolhido vira etiqueta na barra', async () => {
    const { user } = setup()
    await escolherCampo(user, /Nome/)

    expect(estado()).toHaveLength(1)
    expect(estado()[0]).toMatchObject({ id: 'nome', operador: 'iLike', valor: '' })
    // A etiqueta traz o valor editável nela mesma, não num painel à parte.
    expect(await screen.findByLabelText('Valor do filtro 1')).toBeInTheDocument()
  })

  it('o valor se digita na própria etiqueta', async () => {
    const { user } = setup()
    await escolherCampo(user, /Nome/)
    await user.type(await screen.findByLabelText('Valor do filtro 1'), 'carla')

    expect(estado()[0]?.valor).toBe('carla')
  })

  it('o operador se troca na própria etiqueta, e "está vazio" recolhe o valor', async () => {
    const { user } = setup()
    await escolherCampo(user, /Nome/)
    await user.selectOptions(await screen.findByLabelText('Operador do filtro 1'), 'isEmpty')

    expect(screen.queryByLabelText('Valor do filtro 1')).not.toBeInTheDocument()
    expect(estado()[0]?.operador).toBe('isEmpty')
  })

  it('cada etiqueta tem o seu × — apagar não depende de tecla', async () => {
    const { user } = setup()
    await escolherCampo(user, /Nome/)
    await escolherCampo(user, /Setor/)
    expect(estado()).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: 'Remover o filtro 1' }))

    expect(estado()).toHaveLength(1)
    expect(estado()[0]?.id).toBe('setor')
  })

  it('limpar some junto com o último filtro', async () => {
    const { user } = setup()
    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).not.toBeInTheDocument()

    await escolherCampo(user, /Nome/)
    await user.click(await screen.findByRole('button', { name: 'Limpar filtros' }))

    expect(estado()).toEqual([])
  })

  it('a junção aparece ENTRE as etiquetas, como leitura — sem seletor aqui', async () => {
    const { user } = setup({ juncao: 'or' })
    await escolherCampo(user, /Nome/)
    await escolherCampo(user, /Setor/)

    expect(screen.getByText('ou')).toBeInTheDocument()
    expect(screen.queryByLabelText('Junção entre os filtros')).not.toBeInTheDocument()
  })

  it('campo select oferece as opções do campo, não texto livre', async () => {
    const { user } = setup()
    await escolherCampo(user, /Setor/)

    const valor = await screen.findByLabelText('Valor do filtro 1')
    await user.selectOptions(valor, 'ESTOQUE')
    expect(estado()[0]?.valor).toBe('ESTOQUE')
  })
})
