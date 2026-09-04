import { Badge, type TomDeBadge } from '@/components/cabinet/badge'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * BADGE — a pílula pastel da 2.0 (#471, D3).
 *
 * Estes testes travam o que a rodada NÃO pode desfazer: nenhum tom preenchido
 * de cor cheia, nenhuma borda, o ponto presente e mudo, e o estado sempre
 * escrito por extenso. Os VALORES de cor não são asseridos — quem os define é
 * `tokens-2.0.css`, e travar hex aqui reprovaria a própria rodada de design. O
 * que É asserido é que a tinta sai do TOKEN corrigido, não de cor solta: a
 * correção de 25% é o que põe os dez pares acima de 4,5:1 (ver `badge.tsx`).
 */
const PREENCHIDOS: TomDeBadge[] = ['ok', 'info', 'warn', 'bad', 'mut']

describe('Badge', () => {
  it('todo tom preenchido leva ponto, e o ponto é mudo', () => {
    for (const tom of PREENCHIDOS) {
      const { unmount } = render(<Badge tom={tom}>Estado</Badge>)
      const pilula = screen.getByText('Estado')
      const ponto = pilula.querySelector('[data-slot="badge-ponto"]')

      expect(ponto, `tom ${tom} sem ponto`).not.toBeNull()
      // O ponto acelera a varredura de quem vê cor; quem carrega o sentido é o
      // texto. Ponto anunciado seria ruído no leitor de tela (WCAG 1.4.1).
      expect(ponto).toHaveAttribute('aria-hidden', 'true')
      unmount()
    }
  })

  it('nenhum tom é cheio nem tem borda — a separação é a sombra dura de 1px', () => {
    for (const tom of PREENCHIDOS) {
      const { unmount } = render(<Badge tom={tom}>Estado</Badge>)
      const pilula = screen.getByText('Estado')

      // "Nada cheio": o carimbo 1.x pintava `done` de verde saturado com letra
      // branca em cima. Texto branco é a assinatura desse bloco cheio.
      expect(pilula.className).not.toContain('text-white')
      expect(pilula.className).not.toContain('text-primary-foreground')
      // "Nada com borda": §Hierarquia admite UMA ferramenta por fronteira, e
      // aqui ela é a sombra. Borda seria a segunda.
      expect(pilula.className).not.toMatch(/\bborder\b/)
      expect(pilula.className).toContain(
        'shadow-[0_1px_0_0_color-mix(in_oklab,var(--n-900)_18%,transparent)]',
      )
      unmount()
    }
  })

  it('outline é o tracejado sem ponto — o que ainda não é', () => {
    render(<Badge tom="outline">Rascunho</Badge>)
    const pilula = screen.getByText('Rascunho')

    expect(pilula.className).toContain('border-dashed')
    expect(pilula.className).toContain('[color:color-mix(in_oklab,var(--mut),var(--n-900)_25%)]')
    // Sem ponto: rascunho não tem estado a sinalizar de longe.
    expect(pilula.querySelector('[data-slot="badge-ponto"]')).toBeNull()
    // Sem fundo pastel — é o único tom que não pinta.
    expect(pilula.className).not.toMatch(/bg-\[var\(--\w+-bg\)\]/)
  })

  it('é pílula de 22px, não retângulo de canto reto', () => {
    render(<Badge tom="ok">Ativo</Badge>)
    const pilula = screen.getByText('Ativo')
    expect(pilula.className).toContain('h-[22px]')
    expect(pilula.className).toContain('rounded-[var(--r-pill)]')
  })

  it('todo tom tira fundo E tinta do par de tokens do próprio tom', () => {
    // A regressão que este caso pega é a mais provável desta peça: alguém
    // "arruma o contraste" trocando a expressão por um hex, e o tema escuro
    // perde a inversão — `--n-900` é quase preto no claro e quase branco no
    // escuro, e é isso que faz UMA expressão servir aos dois temas.
    for (const tom of PREENCHIDOS) {
      const { unmount } = render(<Badge tom={tom}>Estado</Badge>)
      const pilula = screen.getByText('Estado')

      expect(pilula.className, `${tom} sem o fundo do token`).toContain(`bg-[var(--${tom}-bg)]`)
      expect(pilula.className, `${tom} sem a correção de contraste`).toContain(
        `color-mix(in_oklab,var(--${tom}),var(--n-900)_25%)`,
      )
      unmount()
    }
  })

  it('expõe o tom da 2.0 num atributo que alias nenhum sobrescreve', () => {
    // `Stamp` reescreve `data-slot`/`data-tom` para os nomes legados; é
    // `data-badge-tom` que continua dizendo em que tom a peça saiu.
    render(
      <Badge tom="info" data-slot="stamp" data-tom="open">
        Em aberto
      </Badge>,
    )
    const pilula = screen.getByText('Em aberto')
    expect(pilula).toHaveAttribute('data-slot', 'stamp')
    expect(pilula).toHaveAttribute('data-tom', 'open')
    expect(pilula).toHaveAttribute('data-badge-tom', 'info')
  })
})
