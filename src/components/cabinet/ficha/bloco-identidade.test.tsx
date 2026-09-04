import { BlocoIdentidade } from '@/components/cabinet/ficha/bloco-identidade'
import { monograma } from '@/components/cabinet/monograma'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * BlocoIdentidade (D16, issue #484) — o card lateral que substituiu a
 * `BandaDeIdentidade`.
 */
describe('BlocoIdentidade', () => {
  it('é um card tintado, e o tint é a única cor do bloco', () => {
    render(<BlocoIdentidade nome="Mister LED Comercio de Iluminação Ltda" />)

    const bloco = screen.getByRole('group', { name: 'Identidade' })
    expect(bloco.className).toContain('[background:var(--tint-lilac)]')
    // Tint separa REGIÃO POR NATUREZA; a faixa de gradiente e o contorno de 2px
    // da banda antiga não voltam por outra porta.
    expect(bloco.className).not.toContain('border-2')
    expect(bloco.className).not.toContain('linear-gradient')
  })

  it('o nome é `.t-ui`, o documento é mono e a cidade é meta', () => {
    render(
      <BlocoIdentidade nome="Mister LED" documento="12.345.678/0001-90" cidade="Campinas/SP" />,
    )

    expect(screen.getByText('Mister LED').className).toContain('t-ui')
    // Documento se copia e se compara — mono, sem exceção.
    expect(screen.getByText('12.345.678/0001-90').className).toContain('t-dado-meta')
    expect(screen.getByText(/Campinas\/SP/).className).toContain('t-meta')
  })

  it('o monograma é decorativo — o nome já está escrito ao lado', () => {
    const { container } = render(<BlocoIdentidade nome="Mister LED Comercio Ltda" />)

    const marca = container.querySelector('[data-slot="monograma"]')
    // Um leitor de tela que anunciasse "ML" antes de "Mister LED" leria a mesma
    // coisa duas vezes, a primeira em código.
    expect(marca).toHaveAttribute('aria-hidden', 'true')
    expect(marca?.textContent).toBe('ML')
  })

  it('os pares saem em `dl`, que é a estrutura que diz o que pertence a quê', () => {
    render(
      <BlocoIdentidade
        nome="Mister LED"
        pares={[
          { termo: 'Contato', valor: 'Renata Souza' },
          { termo: 'Pagamento', valor: '28 dd · boleto' },
        ]}
      />,
    )

    const termo = screen.getByText('Contato')
    expect(termo.tagName).toBe('DT')
    expect(screen.getByText('Renata Souza').tagName).toBe('DD')
    expect(termo.closest('dl')).not.toBeNull()
  })

  it('sem pares e sem rodapé, o card é só a identidade', () => {
    const { container } = render(<BlocoIdentidade nome="Mister LED" />)
    expect(container.querySelector('dl')).toBeNull()
  })

  it('o rodapé fala na tinta do primário, que é o único texto com acento', () => {
    render(<BlocoIdentidade nome="Mister LED" rodape={<a href="/x">Ver cadastro →</a>} />)
    const rodape = screen.getByText('Ver cadastro →').parentElement
    expect(rodape?.className).toContain('[color:var(--primary-text)]')
  })
})

describe('monograma', () => {
  it('pega as duas primeiras palavras que valem como nome', () => {
    // "de", "da", "e" não são iniciais de ninguém — daí o corte em 2 letras.
    expect(monograma('Mister LED Comercio de Iluminação Ltda')).toBe('ML')
    expect(monograma('Renata Souza')).toBe('RS')
    // A última palavra de razão social é "Ltda"/"ME"/"S/A": primeira+última
    // faria todo fornecedor terminar na mesma letra.
    expect(monograma('Vertz Iluminação Ltda')).toBe('VI')
  })

  it('nome de uma palavra usa as duas primeiras letras dela', () => {
    expect(monograma('Vertz')).toBe('VE')
  })

  it('não quebra com nome curto ou vazio de palavras longas', () => {
    expect(monograma('Al')).toBe('AL')
    expect(monograma('  ')).toBe('')
  })
})
