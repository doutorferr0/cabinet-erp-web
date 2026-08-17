import { FichaDeCadastro } from '@/components/cabinet/ficha/ficha-de-cadastro'
import { cliente as entidadeCliente } from '@/features/cadastro/modulos'
import { clienteVazio } from '@/mocks/clientes'
import { renderWithQuery } from '@/test/utils'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

/**
 * O ÍNDICE LATERAL da ficha (issue #103) — montado pela moldura de verdade,
 * não sozinho: o que ele promete é sobre a PÁGINA ao lado, e testá-lo isolado
 * provaria só que ele desenha uma lista.
 */

function registro() {
  return { ...clienteVazio(1), nome: 'ANDRÉ BATALHA', email: 'andre@teste.com.br' }
}

function montar(aoEditar = vi.fn()) {
  return renderWithQuery(
    <FichaDeCadastro
      entidade={entidadeCliente}
      registro={registro()}
      titulo="Cadastro de Clientes"
      aoFechar={vi.fn()}
      aoEditar={aoEditar}
    />,
  )
}

describe('índice de módulos', () => {
  it('lista todos os módulos e marca quais têm dado', () => {
    montar()

    const indice = screen.getByRole('navigation', { name: 'Módulos do cadastro' })
    // Todo módulo do schema tem entrada — o índice não escolhe o que indexar.
    const entradas = within(indice).getAllByRole('link')
    expect(entradas).toHaveLength(entidadeCliente.modulos.length)

    // Cheio × vazio é o que o índice existe para dizer ANTES da rolagem.
    expect(
      entradas.find((a) => a.dataset.indiceModulo === 'identificacao')?.dataset.vazio,
    ).toBeUndefined()
    expect(entradas.find((a) => a.dataset.indiceModulo === 'endereco')?.dataset.vazio).toBe('true')
  })

  /**
   * O índice mente se apontar para seção que não existe — e mentiria em
   * silêncio: âncora sem destino não dá erro, só não rola. Este é o teste de
   * paridade entre as duas metades da página.
   */
  it('cada âncora tem a seção correspondente na ficha', () => {
    const { container } = montar()

    const indice = screen.getByRole('navigation', { name: 'Módulos do cadastro' })
    for (const ancora of within(indice).getAllByRole('link')) {
      const destino = ancora.getAttribute('href')?.slice(1) ?? ''
      expect(container.querySelector(`section[id="${destino}"]`)).not.toBeNull()
    }
  })

  it('o lápis pede AQUELE módulo; o rodapé, o cadastro inteiro', async () => {
    const usuario = userEvent.setup()
    const aoEditar = vi.fn()
    montar(aoEditar)

    await usuario.click(screen.getByRole('button', { name: 'Alterar Identificação' }))
    expect(aoEditar).toHaveBeenCalledWith('identificacao')

    // Módulo vazio convida pelo `+ Preencher`, e o convite leva ao mesmo lugar.
    await usuario.click(screen.getByRole('button', { name: 'Preencher Endereço' }))
    expect(aoEditar).toHaveBeenCalledWith('endereco')

    await usuario.click(screen.getByRole('button', { name: /^Alterar$/ }))
    expect(aoEditar).toHaveBeenLastCalledWith()
  })
})
