import { Monograma, iniciaisDe, tintDe } from '@/components/cabinet/monograma'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * MONOGRAMA — duas letras numa caixa de tint (#471, D3).
 *
 * A regra das iniciais é a parte que erra em produção: nome composto com
 * partícula ("Maria da Silva") e razão social de uma palavra só ("Vertz").
 */
describe('iniciaisDe', () => {
  it('pega a primeira e a última palavra, ignorando partícula', () => {
    expect(iniciaisDe('Maria da Silva')).toBe('MS')
    expect(iniciaisDe('José dos Santos Oliveira')).toBe('JO')
    expect(iniciaisDe('Ana Maria')).toBe('AM')
  })

  it('nome de uma palavra usa as duas primeiras letras dela', () => {
    // Uma letra sozinha ficaria perdida na caixa e colidiria com meio cadastro.
    expect(iniciaisDe('Vertz')).toBe('VE')
  })

  it('não quebra com espaço sobrando nem com nome vazio', () => {
    expect(iniciaisDe('  Vertz   Iluminação  ')).toBe('VI')
    expect(iniciaisDe('')).toBe('—')
    expect(iniciaisDe('   ')).toBe('—')
  })

  it('nome que é só partícula ainda devolve algo', () => {
    expect(iniciaisDe('de')).toBe('—')
  })
})

describe('tintDe', () => {
  it('o mesmo nome cai sempre na mesma tint', () => {
    // É isto que dá à lista uma textura reconhecível numa segunda passada; cor
    // instável seria pior que cor nenhuma.
    expect(tintDe('Vertz Iluminação')).toBe(tintDe('Vertz Iluminação'))
  })

  it('distribui pelas cinco tints', () => {
    const nomes = ['Alfa', 'Beta', 'Gama', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Teta']
    const tints = new Set(nomes.map(tintDe))
    // Não exige as 5 em 8 nomes (hash colide), mas um hash que sempre devolve a
    // mesma cor é um defeito que passaria despercebido.
    expect(tints.size).toBeGreaterThan(1)
  })
})

describe('Monograma', () => {
  it('é mudo — quem carrega o sentido é o nome ao lado', () => {
    const { container } = render(<Monograma nome="Vertz Iluminação" />)
    const mono = container.querySelector('[data-slot="monograma"]') as HTMLElement

    expect(mono).toHaveAttribute('aria-hidden', 'true')
    expect(mono.textContent).toBe('VI')
  })

  it('26px em mono, com a hairline que o mockup desenha', () => {
    const { container } = render(<Monograma nome="Ana Maria" />)
    const mono = container.querySelector('[data-slot="monograma"]') as HTMLElement

    expect(mono.className).toContain('size-[26px]')
    // `.t-dado` traz a família mono e o tamanho do degrau — nada de font-size
    // literal em componente (§Hierarquia).
    expect(mono.className).toContain('t-dado')
    // Uma ferramenta por fronteira: aqui é a hairline, porque o monograma
    // também pousa sobre card tintado, onde a sombra a 18% sumiria.
    expect(mono.className).toContain('border-[var(--n-200)]')
    expect(mono.className).not.toContain('shadow-')
  })

  it('a cor declarada vence o hash do nome', () => {
    // Serve para o monograma não brigar com a cor da região quando a entidade
    // já tem cor no contexto.
    const { container } = render(<Monograma nome="Ana Maria" cor="rose" />)
    const mono = container.querySelector('[data-slot="monograma"]') as HTMLElement
    expect(mono).toHaveAttribute('data-tint', 'rose')
  })
})
