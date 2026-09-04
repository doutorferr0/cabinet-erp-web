import type { AnyRouter } from '@tanstack/react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NOME_DO_TITULO, TETO_MS, ligarTransicaoDeRota, marcarTitulo } from './transicao-de-rota'

/**
 * A mecânica das View Transitions se testa AQUI e não montando rota, e o motivo
 * é o ambiente: jsdom não tem `startViewTransition`, então um teste de tela
 * exercitaria só o caminho em que a função não faz nada — passaria verde sem
 * medir a única coisa que ela faz.
 *
 * O router falso entrega os dois eventos na mão; o `startViewTransition` falso
 * guarda o callback em vez de fotografar a tela. O que se afirma é a ORDEM: a
 * foto abre antes do DOM trocar, o título é marcado dos dois lados, e a foto
 * solta quando o render termina — ou quando o teto vence.
 */

interface RouterFalso {
  router: AnyRouter
  navegar: () => void
  renderizar: () => void
  assinaturas: () => number
}

function routerFalso(): RouterFalso {
  const ouvintes = new Map<string, Set<() => void>>()
  const router = {
    subscribe: (evento: string, fn: () => void) => {
      const conjunto = ouvintes.get(evento) ?? new Set()
      conjunto.add(fn)
      ouvintes.set(evento, conjunto)
      return () => conjunto.delete(fn)
    },
  } as unknown as AnyRouter
  const disparar = (evento: string) => {
    for (const fn of ouvintes.get(evento) ?? []) fn()
  }
  return {
    router,
    navegar: () => disparar('onBeforeNavigate'),
    renderizar: () => disparar('onRendered'),
    assinaturas: () => [...ouvintes.values()].reduce((total, c) => total + c.size, 0),
  }
}

interface TransicaoFalsa {
  chamadas: number
  soltar: () => void
  terminou: () => Promise<void>
}

function instalarTransicao(): TransicaoFalsa {
  const estado: TransicaoFalsa = {
    chamadas: 0,
    soltar: () => {},
    terminou: async () => {},
  }
  Object.defineProperty(document, 'startViewTransition', {
    configurable: true,
    writable: true,
    value: (callback: () => void | Promise<void>) => {
      estado.chamadas += 1
      const pronta = Promise.resolve(callback())
      estado.terminou = () => pronta.then(() => {})
      return { finished: pronta }
    },
  })
  return estado
}

function montarTela(titulos: string[]) {
  document.body.innerHTML = `<main>${titulos.map((t) => `<h1>${t}</h1>`).join('')}</main>`
}

beforeEach(() => {
  montarTela(['Cadastro de Clientes'])
  Object.defineProperty(document, 'readyState', { configurable: true, value: 'complete' })
})

afterEach(() => {
  vi.useRealTimers()
  Reflect.deleteProperty(document, 'startViewTransition')
  document.body.innerHTML = ''
})

describe('marcarTitulo', () => {
  it('marca o h1 da tela como shared element', () => {
    const titulo = marcarTitulo(document)
    expect(titulo?.style.viewTransitionName).toBe(NOME_DO_TITULO)
  })

  it('não marca nada quando há dois títulos', () => {
    // Dois nós com o mesmo `view-transition-name` abortam a transição inteira,
    // e o browser reclama num console que ninguém lê. Sem marca, a troca de
    // rota continua acontecendo — só sem o elemento compartilhado.
    montarTela(['Pedidos', 'Itens'])
    expect(marcarTitulo(document)).toBeNull()
    for (const h1 of document.querySelectorAll('h1')) {
      expect(h1.style.viewTransitionName).toBe('')
    }
  })
})

describe('ligarTransicaoDeRota', () => {
  it('não assina nada onde a API não existe', () => {
    const falso = routerFalso()
    ligarTransicaoDeRota(falso.router)
    expect(falso.assinaturas()).toBe(0)
  })

  it('abre a transição na saída e solta quando a tela renderiza', async () => {
    const transicao = instalarTransicao()
    const falso = routerFalso()
    const desligar = ligarTransicaoDeRota(falso.router)

    falso.navegar()
    expect(transicao.chamadas).toBe(1)
    expect(document.querySelector('h1')?.style.viewTransitionName).toBe(NOME_DO_TITULO)

    // A folha remonta: o título novo é outro nó, e precisa da marca antes de a
    // foto soltar — é entre estas duas linhas que o shared element existe dos
    // dois lados.
    montarTela(['Cliente 1042'])
    falso.renderizar()
    await transicao.terminou()

    expect(document.querySelector('h1')?.style.viewTransitionName).toBe('')
    desligar()
  })

  it('a segunda navegação não abre uma transição por cima da primeira', () => {
    const transicao = instalarTransicao()
    const falso = routerFalso()
    ligarTransicaoDeRota(falso.router)

    falso.navegar()
    falso.navegar()

    expect(transicao.chamadas).toBe(1)
  })

  it('o teto solta a tela quando o render não chega', () => {
    vi.useFakeTimers()
    const transicao = instalarTransicao()
    const falso = routerFalso()
    ligarTransicaoDeRota(falso.router)

    falso.navegar()
    expect(transicao.chamadas).toBe(1)
    vi.advanceTimersByTime(TETO_MS)

    // Soltou: a próxima navegação é aceita de novo. Sem o teto, uma navegação
    // que espera dado lento deixaria o operador olhando para um retrato.
    falso.navegar()
    expect(transicao.chamadas).toBe(2)
  })

  it('não anima com prefers-reduced-motion', () => {
    const transicao = instalarTransicao()
    vi.mocked(window.matchMedia).mockReturnValueOnce({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })
    const falso = routerFalso()
    ligarTransicaoDeRota(falso.router)

    falso.navegar()

    expect(transicao.chamadas).toBe(0)
  })

  it('não anima antes de a página terminar de carregar', () => {
    // Transição durante o carregamento fotografa uma tela pela metade e cruza
    // para outra pela metade — pior que o corte seco.
    Object.defineProperty(document, 'readyState', { configurable: true, value: 'loading' })
    const transicao = instalarTransicao()
    const falso = routerFalso()
    ligarTransicaoDeRota(falso.router)

    falso.navegar()

    expect(transicao.chamadas).toBe(0)
  })

  it('desassina os dois eventos ao desligar', () => {
    instalarTransicao()
    const falso = routerFalso()
    const desligar = ligarTransicaoDeRota(falso.router)
    expect(falso.assinaturas()).toBe(2)
    desligar()
    expect(falso.assinaturas()).toBe(0)
  })
})
