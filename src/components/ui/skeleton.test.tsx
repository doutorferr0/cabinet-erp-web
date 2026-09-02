import { Skeleton } from '@/components/ui/skeleton'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * O ESQUELETO É FORMA, NÃO INFORMAÇÃO — e as duas asserções aqui são as duas
 * maneiras de ele esquecer isso.
 *
 * Sem `aria-hidden`, uma listagem carregando anuncia vinte caixas vazias para
 * quem usa leitor de tela. E com animação incondicional, ela pisca vinte vezes
 * no canto do olho de quem pediu movimento reduzido no sistema — justamente no
 * momento em que a tela mais se mexe.
 */
describe('Skeleton', () => {
  it('é invisível para o leitor de tela', () => {
    render(<Skeleton data-testid="osso" className="h-4 w-24" />)
    expect(screen.getByTestId('osso')).toHaveAttribute('aria-hidden', 'true')
  })

  it('respira sem brilho, e só quem aceita movimento vê', () => {
    render(<Skeleton data-testid="osso" />)
    const osso = screen.getByTestId('osso')

    // `motion-safe:` e não `animate-pulse` cru: a variante do Tailwind só
    // aplica sob `prefers-reduced-motion: no-preference`. Com a preferência
    // ligada o esqueleto fica PARADO na tinta cheia — continua dizendo "aqui
    // vem dado", sem se mexer.
    expect(osso.className).toContain('motion-safe:animate-pulse')
    // Nada percorrendo a caixa: o shimmer é gradiente em movimento, e numa
    // listagem são vinte varreduras simultâneas. A respiração de opacidade diz
    // a mesma coisa sem arrastar nada pela tela.
    expect(osso.className).not.toContain('animate-shimmer')
    expect(osso.className).not.toContain('bg-gradient')
  })
})
