import { Painel } from '@/components/cabinet/painel'
import { renderWithQuery } from '@/test/utils'
import { describe, expect, it } from 'vitest'

describe('Painel', () => {
  it('sem módulo e sem tinta, o cabeçalho fica na superfície afundada', () => {
    const { container } = renderWithQuery(<Painel titulo="Andamento">conteúdo</Painel>)

    const cabecalho = container.querySelector('[data-slot="painel"] > header')
    expect(cabecalho).toHaveClass('bg-surface-sunken')
    expect(container.querySelector('[data-slot="selo"]')).toBeNull()
  })

  it('com módulo, a faixa lê a pastel do par e o selo entra antes do título', () => {
    const { container } = renderWithQuery(
      <Painel titulo="Agenda de hoje" modulo="compras">
        conteúdo
      </Painel>,
    )

    const painel = container.querySelector('[data-slot="painel"]')
    // O `data-modulo` na própria seção é o que faz `bg-modulo` resolver o par
    // sem ninguém passar cor por propriedade.
    expect(painel).toHaveAttribute('data-modulo', 'compras')
    expect(painel?.querySelector('header')).toHaveClass('bg-modulo')
    // Compras é a caixa, pela mesma tabela que o vazio e o favicon leem.
    expect(painel?.querySelector('[data-slot="forma"]')).toHaveAttribute('data-tipo', 'caixa')
  })

  it('a tinta de zona vale para região que NÃO é de módulo, e não leva selo', () => {
    // Pendência é estado, não assunto. E o desenho não usa as cores com dono —
    // um selo amarelo aqui violaria a regra dura da paleta.
    const { container } = renderWithQuery(
      <Painel titulo="A fazer" tinta="warn">
        conteúdo
      </Painel>,
    )

    const painel = container.querySelector('[data-slot="painel"]')
    expect(painel).not.toHaveAttribute('data-modulo')
    expect(painel?.querySelector('header')).toHaveClass('bg-zone-warn')
    expect(container.querySelector('[data-slot="selo"]')).toBeNull()
  })

  it('havendo módulo, a tinta é ignorada — uma faixa tem uma fonte de cor só', () => {
    const { container } = renderWithQuery(
      <Painel titulo="Calendário" modulo="estoque" tinta="warn">
        conteúdo
      </Painel>,
    )

    const cabecalho = container.querySelector('[data-slot="painel"] > header')
    expect(cabecalho).toHaveClass('bg-modulo')
    expect(cabecalho).not.toHaveClass('bg-zone-warn')
  })
})
