import { SHORTCUTS, bindShortcut, shortcutLabel } from '@/lib/shortcuts'
import { describe, expect, it, vi } from 'vitest'

function tecla(init: KeyboardEventInit) {
  window.dispatchEvent(new KeyboardEvent('keydown', { ...init, cancelable: true }))
}

describe('registry de atalhos', () => {
  it('não usa F3-F6 (veto do CLAUDE.md por conflito com o browser)', () => {
    for (const combo of Object.values(SHORTCUTS)) {
      expect(combo).not.toMatch(/f[3-6]/i)
    }
  })

  it('mapeia as teclas de operação do legado', () => {
    // F6 produto, F5 ambiente, F4 transportadora/imagem — §7.2, §7.4, §8.2.
    expect(SHORTCUTS.produto).toBe('alt+p')
    expect(SHORTCUTS.ambiente).toBe('alt+a')
    expect(SHORTCUTS.transportadora).toBe('alt+t')
    expect(SHORTCUTS.imagemProduto).toBe('alt+i')
  })

  it('não tem combo repetido — dois handlers na mesma tecla seria ambíguo', () => {
    const combos = Object.values(SHORTCUTS)
    expect(new Set(combos).size).toBe(combos.length)
  })
})

describe('bindShortcut', () => {
  it('dispara o handler na combinação exata', () => {
    const handler = vi.fn()
    const off = bindShortcut('alt+p', handler)

    tecla({ key: 'p', altKey: true })
    expect(handler).toHaveBeenCalledTimes(1)

    off()
  })

  it('ignora a tecla sem o modificador e o modificador errado', () => {
    const handler = vi.fn()
    const off = bindShortcut('alt+p', handler)

    tecla({ key: 'p' })
    tecla({ key: 'p', ctrlKey: true })
    tecla({ key: 'p', altKey: true, shiftKey: true })
    expect(handler).not.toHaveBeenCalled()

    off()
  })

  it('o cleanup remove o listener', () => {
    const handler = vi.fn()
    const off = bindShortcut('ctrl+k', handler)
    off()

    tecla({ key: 'k', ctrlKey: true })
    expect(handler).not.toHaveBeenCalled()
  })

  it('previne o default do browser (Ctrl+K abre a busca do navegador)', () => {
    const off = bindShortcut('ctrl+k', () => {})
    const evento = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, cancelable: true })
    window.dispatchEvent(evento)

    expect(evento.defaultPrevented).toBe(true)
    off()
  })
})

describe('shortcutLabel', () => {
  it('formata o combo para exibir junto do botão', () => {
    expect(shortcutLabel('alt+p')).toBe('Alt+P')
    expect(shortcutLabel('ctrl+k')).toBe('Ctrl+K')
  })
})
