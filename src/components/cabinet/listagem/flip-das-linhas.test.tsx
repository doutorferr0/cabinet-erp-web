import { useFlipDasLinhas } from '@/components/cabinet/listagem/flip-das-linhas'
import { render } from '@testing-library/react'
import { useRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * O FLIP não tem captura que o prove — animação de 200ms não sai em PNG — e no
 * navegador ele falha do jeito mais silencioso possível: as linhas continuam
 * indo para o lugar certo, só que sem deslizar. Por isso o que se afirma aqui é
 * a CHAMADA: quem mudou de posição pede animação, quem não mudou não pede, e
 * `prefers-reduced-motion` cala todas.
 */

/** Uma lista cujas linhas trocam de lugar — o mínimo que o hook precisa ver. */
function Lista({ ordem, assinatura }: { ordem: readonly string[]; assinatura: string }) {
  const raiz = useRef<HTMLDivElement | null>(null)
  useFlipDasLinhas(raiz, assinatura)
  return (
    <div ref={raiz}>
      {ordem.map((id) => (
        <div key={id} data-linha-id={id} />
      ))}
    </div>
  )
}

const animate = vi.fn()

/**
 * Os originais guardados à mão, e NÃO `vi.restoreAllMocks()`: o `setup.ts`
 * global instala `window.matchMedia` como um `vi.fn()`, e o restore o esvazia
 * para o resto do arquivo — o sintoma foi um `Cannot read properties of
 * undefined (reading 'matches')` no segundo caso, vindo de código que o
 * primeiro caso tinha desarmado.
 */
const rectOriginal = Element.prototype.getBoundingClientRect
const animateOriginal = Element.prototype.animate
const matchMediaOriginal = window.matchMedia

beforeEach(() => {
  animate.mockClear()
  // jsdom não tem layout: `getBoundingClientRect` devolve zero para tudo, e o
  // hook nunca veria movimento nenhum. A posição vem da ORDEM no pai, que é
  // exatamente o que o navegador mediria numa lista empilhada.
  Element.prototype.getBoundingClientRect = function medir(this: Element) {
    const irmaos = [...(this.parentElement?.children ?? [])]
    return { top: irmaos.indexOf(this) * 40 } as DOMRect
  }
  Element.prototype.animate = animate as unknown as Element['animate']
})

afterEach(() => {
  Element.prototype.getBoundingClientRect = rectOriginal
  Element.prototype.animate = animateOriginal
  window.matchMedia = matchMediaOriginal
})

describe('FLIP das linhas', () => {
  it('anima só quem MUDOU de lugar quando a ordem muda', () => {
    const { rerender } = render(<Lista ordem={['a', 'b', 'c']} assinatura="por-nada" />)
    expect(animate).not.toHaveBeenCalled()

    rerender(<Lista ordem={['c', 'a', 'b']} assinatura="por-situacao" />)

    // As três trocaram de linha; a de fora (nenhuma, aqui) não entraria.
    expect(animate).toHaveBeenCalledTimes(3)
    const [quadros] = animate.mock.calls[0] as [Keyframe[]]
    // FLIP: parte do deslocamento INVERTIDO e volta a zero.
    // A primeira linha do DOM é a que veio de baixo: estava a 80px, agora está
    // a 0, então parte de +80 e volta.
    expect(quadros[0]).toMatchObject({ transform: 'translateY(80px)' })
    expect(quadros[1]).toMatchObject({ transform: 'none' })
  })

  it('render sem troca de ordem não anima nada — a grade não treme sob o mouse', () => {
    const { rerender } = render(<Lista ordem={['a', 'b']} assinatura="por-nada" />)
    rerender(<Lista ordem={['b', 'a']} assinatura="por-nada" />)

    expect(animate).not.toHaveBeenCalled()
  })

  it('`prefers-reduced-motion` desliga: é movimento de CONTEÚDO', () => {
    window.matchMedia = ((consulta: string) =>
      ({ matches: true, media: consulta }) as MediaQueryList) as typeof window.matchMedia

    const { rerender } = render(<Lista ordem={['a', 'b']} assinatura="por-nada" />)
    rerender(<Lista ordem={['b', 'a']} assinatura="por-situacao" />)

    expect(animate).not.toHaveBeenCalled()
  })
})
