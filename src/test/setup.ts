import { configure } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MotionGlobalConfig } from 'motion/react'
import { vi } from 'vitest'

// A entrada de tela da fase 1.6 (`components/cabinet/entrada.tsx`) parte de
// `opacity: 0` e sobe até 1 numa mola de ~300ms. Sem esta linha cada teste de
// tela pagaria a mola inteira antes de o conteúdo ficar visível; com ela, o
// motion salta para o estado final no PRIMEIRO quadro.
//
// Primeiro quadro, não mesmo tick: logo depois de `render()` o elemento ainda
// está em `opacity: 0`, e uma asserção SÍNCRONA de `toBeVisible` reprova. Quem
// asserta visibilidade dentro da folha usa `findBy*`/`waitFor` — que é o que a
// suíte já faz, por causa da latência do provider mock.
MotionGlobalConfig.instantAnimations = true

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
