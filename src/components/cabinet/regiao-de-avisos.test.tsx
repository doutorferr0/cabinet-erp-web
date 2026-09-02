import { RegiaoDeAvisos } from '@/components/cabinet/regiao-de-avisos'
import { avisar, avisosAtuais, dispensarAviso, limparAvisos } from '@/lib/avisos'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  limparAvisos()
  vi.useRealTimers()
})

/**
 * O aviso de conclusão (#201). O que estes testes travam:
 *
 * 1. Que ele SOBREVIVE à troca de tela — a fila mora em módulo justamente
 *    porque o `Gravar` navega de volta para a listagem, e um estado de
 *    componente morreria junto com o formulário.
 * 2. Que ele sai sozinho e também PELA MÃO — relógio não serve a quem lê
 *    devagar.
 * 3. Que a região é viva desde o começo: `aria-live` criado junto com o texto
 *    costuma não ser anunciado, porque o leitor precisa já estar observando o
 *    nó quando o conteúdo muda.
 */
describe('região de avisos', () => {
  it('a região existe VAZIA, esperando: é isso que faz o leitor de tela anunciar', () => {
    render(<RegiaoDeAvisos />)
    const regiao = document.querySelector('[data-slot="regiao-de-avisos"]')
    expect(regiao).toHaveAttribute('aria-live', 'polite')
    expect(regiao?.textContent).toBe('')
  })

  it('mostra o que a fronteira avisou, com o detalhe do registro', async () => {
    render(<RegiaoDeAvisos />)
    act(() => {
      avisar('Cadastro incluído.', 'STELLA ILUMINAÇÃO LTDA')
    })

    expect(await screen.findByText('Cadastro incluído.')).toBeInTheDocument()
    expect(screen.getByText('STELLA ILUMINAÇÃO LTDA')).toBeInTheDocument()
  })

  it('sai pela mão de quem leu, sem esperar o relógio', async () => {
    const user = userEvent.setup()
    render(<RegiaoDeAvisos />)
    act(() => {
      avisar('Alterações gravadas.')
    })

    await user.click(await screen.findByRole('button', { name: /Dispensar aviso/ }))
    await waitFor(() => {
      expect(screen.queryByText('Alterações gravadas.')).not.toBeInTheDocument()
    })
  })

  it('sai sozinho depois do tempo — aviso é resposta, não estado permanente', async () => {
    vi.useFakeTimers()
    render(<RegiaoDeAvisos />)
    act(() => {
      avisar('Produto gravado.')
    })
    expect(screen.getByText('Produto gravado.')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(6000)
    })
    expect(screen.queryByText('Produto gravado.')).not.toBeInTheDocument()
  })

  /**
   * O TOM pinta a faixa e decide o relógio (Reface 2.0 · D5). Confirmação sai
   * sozinha; falha e alerta ficam até alguém dispensar — é exatamente o que o
   * `lib/avisos` diz do que não pode sumir em cinco segundos: o que o operador
   * precisa LER e AGIR.
   */
  it('confirmação sai pelo relógio; alerta e falha ficam', () => {
    vi.useFakeTimers()
    render(<RegiaoDeAvisos />)
    act(() => {
      avisar('Produto gravado.')
      avisar('Estoque abaixo do mínimo.', undefined, 'warn')
      avisar('A gravação falhou.', undefined, 'bad')
    })

    act(() => {
      vi.advanceTimersByTime(6000)
    })

    expect(screen.queryByText('Produto gravado.')).not.toBeInTheDocument()
    expect(screen.getByText('Estoque abaixo do mínimo.')).toBeInTheDocument()
    expect(screen.getByText('A gravação falhou.')).toBeInTheDocument()
  })

  it('a faixa é tinta do tom, sem borda preta nem sombra', () => {
    render(<RegiaoDeAvisos />)
    act(() => {
      avisar('Estoque abaixo do mínimo.', undefined, 'warn')
    })

    const faixa = document.querySelector('[data-slot="faixa-de-aviso"]') as HTMLElement
    expect(faixa).toHaveAttribute('data-tom', 'warn')
    expect(faixa.className).toContain('bg-[var(--warn-bg)]')
    // Tint é UMA ferramenta de separação; borda e sombra em cima dela seriam a
    // segunda e a terceira na mesma fronteira (§Hierarquia).
    expect(faixa.className).not.toMatch(/\bborder-2\b/)
    expect(faixa.className).not.toMatch(/\bshadow-/)
  })

  /**
   * `polite` espera a leitura em curso terminar — certo para "gravou", errado
   * para "falhou": quem está ouvindo outra coisa continuaria agindo sobre um
   * registro que não gravou.
   */
  it('falha interrompe a leitura; o resto espera a vez', () => {
    render(<RegiaoDeAvisos />)
    const regiao = () => document.querySelector('[data-slot="regiao-de-avisos"]')

    act(() => {
      avisar('Cadastro incluído.')
    })
    expect(regiao()).toHaveAttribute('aria-live', 'polite')

    act(() => {
      avisar('A gravação falhou.', undefined, 'bad')
    })
    expect(regiao()).toHaveAttribute('aria-live', 'assertive')
  })

  it('dispensa repetida não deixa a fila inconsistente', () => {
    const id = avisar('Um.')
    expect(avisosAtuais()).toHaveLength(1)
    act(() => {
      // O clique e o relógio chegando juntos é o caso real.
      dispensarAviso(id)
      dispensarAviso(id)
    })
    expect(avisosAtuais()).toHaveLength(0)
  })
})
