import { PilulasDeFiltro } from '@/components/cabinet/filtros/pilulas-de-filtro'
import type { CampoFiltravel, FiltroDaTabela, Juncao } from '@/lib/filtro-de-consulta'
import { renderWithQuery } from '@/test/utils'
import { screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

/**
 * O que se trava aqui é o GESTO da pílula (#199), não o desenho: escolher o
 * campo já dá onde digitar, a frase conta o que foi filtrado e o `×` desfaz num
 * clique. Cada um dos três já foi outra coisa neste repo — painel em lista,
 * depois etiqueta com três controles encostados —, e a regressão silenciosa é a
 * lista encolher sem a tela dizer por quê.
 */

const CAMPOS: readonly CampoFiltravel[] = [
  { id: 'name', rotulo: 'Nome', variante: 'text' },
  { id: 'active', rotulo: 'Ativo', variante: 'boolean' },
]

/** Casca controlada: quem guarda o filtro na vida real é a `VitraDataTable`. */
function Cobaia({ inicial = [] }: { inicial?: FiltroDaTabela[] }) {
  const [filtros, setFiltros] = useState<FiltroDaTabela[]>(inicial)
  const [juncao, setJuncao] = useState<Juncao>('and')
  return (
    <PilulasDeFiltro
      campos={CAMPOS}
      filtros={filtros}
      juncao={juncao}
      onFiltrosChange={setFiltros}
      onJuncaoChange={setJuncao}
    />
  )
}

function montar(inicial?: FiltroDaTabela[]) {
  return renderWithQuery(<Cobaia {...(inicial ? { inicial } : {})} />)
}

function filtroDeNome(valor: string, filtroId = 'f1'): FiltroDaTabela {
  return { filtroId, id: 'name', variante: 'text', operador: 'iLike', valor }
}

describe('PilulasDeFiltro', () => {
  it('escolher o campo já abre onde digitar — sem segundo clique na coisa recém-criada', async () => {
    const { user } = montar()

    await user.click(screen.getByRole('button', { name: /^Adicionar filtro/ }))
    await user.click(await screen.findByRole('menuitem', { name: 'Nome' }))

    expect(await screen.findByLabelText('Valor do filtro 1')).toBeInTheDocument()
  })

  it('a pílula conta a frase inteira depois de digitada', async () => {
    const { user } = montar()

    await user.click(screen.getByRole('button', { name: /^Adicionar filtro/ }))
    await user.click(await screen.findByRole('menuitem', { name: 'Nome' }))
    await user.type(await screen.findByLabelText('Valor do filtro 1'), 'STELLA')
    // O popover é modal (RAC): com ele aberto o resto da barra sai da árvore
    // acessível, então a frase só se lê depois de fechar — como o operador lê.
    await user.keyboard('{Escape}')

    expect(
      await screen.findByRole('button', { name: 'Editar o filtro 1: Nome contém STELLA' }),
    ).toBeInTheDocument()
  })

  it('o `×` remove em UM clique, sem abrir nem confirmar', async () => {
    const { user } = montar([filtroDeNome('STELLA')])

    await user.click(screen.getByRole('button', { name: /^Remover o filtro 1/ }))

    expect(screen.queryByRole('button', { name: /^Editar o filtro 1/ })).not.toBeInTheDocument()
  })

  it('removida a pílula, o foco vai para `Adicionar filtro` e não para o vazio', async () => {
    // O `×` clicado sai do documento junto com a pílula: sem devolução, quem
    // usa teclado perde o lugar na barra.
    const { user } = montar([filtroDeNome('STELLA')])

    await user.click(screen.getByRole('button', { name: /^Remover o filtro 1/ }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Adicionar filtro/ })).toHaveFocus()
    })
  })

  it('a junção se troca entre as pílulas e vale para a lista inteira', async () => {
    const { user } = montar([filtroDeNome('A', 'f1'), filtroDeNome('B', 'f2')])

    await user.click(screen.getByRole('button', { name: /Junção entre os filtros: e/ }))

    expect(
      await screen.findByRole('button', { name: /Junção entre os filtros: ou/ }),
    ).toBeInTheDocument()
  })

  it('`Limpar` some junto com o último filtro — botão sem efeito é botão morto', async () => {
    const { user } = montar([filtroDeNome('STELLA')])
    expect(screen.getByRole('button', { name: 'Limpar filtros' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }))

    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).not.toBeInTheDocument()
  })

  it('trocar para um operador que dispensa valor apaga o valor guardado', async () => {
    // Senão o texto antigo continuaria escondido embaixo de "está vazio" e
    // voltaria sozinho ao trocar o operador de volta.
    const { user } = montar([filtroDeNome('STELLA')])

    await user.click(screen.getByRole('button', { name: /^Editar o filtro 1/ }))
    await user.selectOptions(await screen.findByLabelText('Operador do filtro 1'), 'isEmpty')
    await user.keyboard('{Escape}')

    expect(
      await screen.findByRole('button', { name: 'Editar o filtro 1: Nome está vazio' }),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Valor do filtro 1')).not.toBeInTheDocument()
  })

  it('campo que a tela não oferece mais não desenha pílula órfã', async () => {
    // Consulta salva meses atrás sobre coluna que saiu da listagem: a pílula
    // sem campo não teria rótulo nem controle para editar.
    montar([{ filtroId: 'f9', id: 'sumiu', variante: 'text', operador: 'eq', valor: 'x' }])

    expect(screen.queryByRole('button', { name: /^Editar o filtro/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Adicionar filtro/ })).toBeInTheDocument()
  })
})
