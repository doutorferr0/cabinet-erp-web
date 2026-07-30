import { configure } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// O provider mock simula latência de rede (200-300ms, src/data/index.ts). Com 19
// arquivos de teste em jsdom paralelo, a espera real de um findBy* passa dos
// 1000ms padrão e a suíte falha de forma intermitente — arquivo isolado passa,
// suíte inteira reprova um subconjunto diferente a cada rodada.
configure({ asyncUtilTimeout: 5000 })

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

window.scrollTo = vi.fn()

// jsdom não tem ResizeObserver (cmdk/radix exigem).
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = window.ResizeObserver ?? ResizeObserverStub

// jsdom não implementa scrollIntoView (cmdk o chama ao selecionar item).
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? vi.fn()
