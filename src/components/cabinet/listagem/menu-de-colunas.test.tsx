import { type ColunaDoMenu, MenuDeColunas } from '@/components/cabinet/listagem/menu-de-colunas'
import { renderWithQuery } from '@/test/utils'
import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

/**
 * O menu responde "como esta lista está montada". O que se trava aqui é que ele
 * DIZ o que escondeu: coluna oculta em silêncio vira o chamado "sumiu a coluna
 * de total" três dias depois.
 */

const COLUNAS: ColunaDoMenu[] = [
  { id: 'number', rotulo: 'Número', visivel: true, fixa: true },
  { id: 'supplierName', rotulo: 'Fornecedor', visivel: true },
  { id: 'expectedAt', rotulo: 'Previsão', visivel: false },
  { id: 'total', rotulo: 'Total', visivel: true },
]

function montar(over: Partial<React.ComponentProps<typeof MenuDeColunas>> = {}) {
  const props = {
    colunas: COLUNAS,
    onAlternar: vi.fn(),
    onReordenar: vi.fn(),
    ...over,
  }
  return { ...renderWithQuery(<MenuDeColunas {...props} />), props }
}

describe('MenuDeColunas', () => {
  it('o rótulo conta quantas colunas estão escondidas', () => {
    montar()
    expect(screen.getByRole('button', { name: 'Colunas — 1 oculta(s)' })).toBeInTheDocument()
  })

  it('sem nada escondido, o rótulo é só `Colunas`', () => {
    montar({ colunas: COLUNAS.map((c) => ({ ...c, visivel: true })) })
    expect(screen.getByRole('button', { name: 'Colunas' })).toBeInTheDocument()
  })

  it('desmarcar uma coluna devolve o id dela', async () => {
    const { user, props } = montar()
    await user.click(screen.getByRole('button', { name: /Colunas/ }))

    await user.click(await screen.findByRole('checkbox', { name: /Fornecedor/ }))

    expect(props.onAlternar).toHaveBeenCalledWith('supplierName')
  })

  it('a coluna fixa aparece marcada, travada e com o motivo escrito', async () => {
    const { user } = montar()
    await user.click(screen.getByRole('button', { name: /Colunas/ }))

    const numero = await screen.findByRole('checkbox', { name: /Número/ })
    expect(numero).toBeChecked()
    expect(numero).toBeDisabled()
    expect(screen.getByText('fixa')).toBeInTheDocument()
  })

  it('a seta devolve a ORDEM inteira, não o movimento', async () => {
    const { user, props } = montar()
    await user.click(screen.getByRole('button', { name: /Colunas/ }))

    await user.click(await screen.findByRole('button', { name: 'Subir a coluna Previsão' }))

    expect(props.onReordenar).toHaveBeenCalledWith([
      'number',
      'expectedAt',
      'supplierName',
      'total',
    ])
  })

  it('a primeira não sobe e a última não desce', async () => {
    const { user } = montar()
    await user.click(screen.getByRole('button', { name: /Colunas/ }))

    expect(await screen.findByRole('button', { name: 'Subir a coluna Número' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Descer a coluna Total' })).toBeDisabled()
  })

  it('coluna opcional que a grade ainda não desenha entra por grupo, e não conta como oculta', async () => {
    const onAlternarOpcional = vi.fn()
    const { user } = montar({
      opcionais: [
        {
          id: 'bancarios',
          titulo: 'Dados bancários',
          colunas: [{ id: 'bank', rotulo: 'Banco', ligada: false }],
        },
      ],
      onAlternarOpcional,
    })

    // Continua "1 oculta": disponível não é escondida.
    expect(screen.getByRole('button', { name: 'Colunas — 1 oculta(s)' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Colunas/ }))
    await user.click(await screen.findByRole('checkbox', { name: 'Banco' }))

    expect(onAlternarOpcional).toHaveBeenCalledWith('bank')
  })
})
