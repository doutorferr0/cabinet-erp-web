import { renderWithQuery } from '@/test/utils'
import { describe, expect, it } from 'vitest'
import { Nome, Produto } from './nome'

describe('Nome', () => {
  it('põe o nome próprio na voz de quem, um degrau acima do vizinho', () => {
    // O degrau existe porque a altura-x da família de título é menor: no mesmo
    // tamanho, o nome do cliente lê como texto secundário e a hierarquia da
    // linha inverte. Em `em` para acompanhar o vizinho, seja célula ou título.
    const { container } = renderWithQuery(<Nome>Construtora Almeida Ltda</Nome>)

    const nome = container.querySelector('[data-slot="nome"]')
    expect(nome).toHaveTextContent('Construtora Almeida Ltda')
    expect(nome).toHaveClass('font-nome')
    expect(nome).toHaveClass('text-[1.15em]')
  })

  it('só o peso forte engrossa — coluna inteira em 700 não destaca nada', () => {
    const { container: normal } = renderWithQuery(<Nome>Helena Prado</Nome>)
    const { container: forte } = renderWithQuery(<Nome peso="forte">Helena Prado</Nome>)

    expect(normal.querySelector('[data-slot="nome"]')).not.toHaveClass('font-bold')
    expect(forte.querySelector('[data-slot="nome"]')).toHaveClass('font-bold')
  })
})

describe('Produto', () => {
  it('fala na voz de o quê, e recuado', () => {
    // O recuo é o que impede o empate visual entre três famílias na mesma
    // linha: em `--foreground` o produto disputa com o nome do cliente.
    const { container } = renderWithQuery(<Produto>Pendente Bordeaux</Produto>)

    const produto = container.querySelector('[data-slot="produto"]')
    expect(produto).toHaveClass('font-display')
    expect(produto).toHaveClass('text-muted-foreground')
  })

  it('a classe de quem chama vence, para onde o produto é o assunto', () => {
    const { container } = renderWithQuery(
      <Produto className="text-foreground">Trilho Aura 1,5m</Produto>,
    )

    expect(container.querySelector('[data-slot="produto"]')).toHaveClass('text-foreground')
    expect(container.querySelector('[data-slot="produto"]')).not.toHaveClass(
      'text-muted-foreground',
    )
  })
})
