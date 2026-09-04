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

describe('pilha por combo — a tecla tem UM dono', () => {
  it('o último a ligar atende, e o de baixo não dispara junto', () => {
    // O defeito real da #362: a paleta (shell, nunca desmonta) e a busca de
    // cidade do cadastro de cliente ligavam `Ctrl+K` ao mesmo tempo, e a tecla
    // abria as duas coisas uma por cima da outra.
    const paleta = vi.fn()
    const formulario = vi.fn()
    const offPaleta = bindShortcut('ctrl+k', paleta)
    const offFormulario = bindShortcut('ctrl+k', formulario)

    tecla({ key: 'k', ctrlKey: true })
    expect(formulario).toHaveBeenCalledTimes(1)
    expect(paleta).not.toHaveBeenCalled()

    offFormulario()
    offPaleta()
  })

  it('ao desmontar o de cima, a tecla volta para quem estava embaixo', () => {
    const paleta = vi.fn()
    const formulario = vi.fn()
    const offPaleta = bindShortcut('ctrl+k', paleta)
    const offFormulario = bindShortcut('ctrl+k', formulario)

    offFormulario()
    tecla({ key: 'k', ctrlKey: true })
    expect(paleta).toHaveBeenCalledTimes(1)

    offPaleta()
  })

  it('desmontar fora de ordem não deixa a tecla presa em quem já saiu', () => {
    // Ordem de desmontagem não é garantida entre componentes irmãos: soltar o
    // de baixo primeiro não pode fazer o de cima parar de responder.
    const debaixo = vi.fn()
    const decima = vi.fn()
    const offDebaixo = bindShortcut('alt+p', debaixo)
    const offDecima = bindShortcut('alt+p', decima)

    offDebaixo()
    tecla({ key: 'p', altKey: true })
    expect(decima).toHaveBeenCalledTimes(1)
    expect(debaixo).not.toHaveBeenCalled()

    offDecima()
    tecla({ key: 'p', altKey: true })
    expect(decima).toHaveBeenCalledTimes(1)
  })

  it('o mesmo handler ligado duas vezes solta uma ocorrência por cleanup', () => {
    // `useEffect(() => bindShortcut(...))` sem lista de dependências re-registra
    // a cada render — três telas fazem isso hoje. O cleanup do render anterior
    // não pode levar o registro do render novo junto.
    const handler = vi.fn()
    const primeiro = bindShortcut('alt+t', handler)
    const segundo = bindShortcut('alt+t', handler)

    primeiro()
    tecla({ key: 't', altKey: true })
    expect(handler).toHaveBeenCalledTimes(1)

    segundo()
    tecla({ key: 't', altKey: true })
    expect(handler).toHaveBeenCalledTimes(1)
  })
})

describe('shortcutLabel', () => {
  it('formata o combo para exibir junto do botão', () => {
    expect(shortcutLabel('alt+p')).toBe('Alt+P')
    expect(shortcutLabel('ctrl+k')).toBe('Ctrl+K')
  })
})

/**
 * SEQUÊNCIA `g` + letra (Reface 2.0, D6) — dois passos, não um acorde.
 *
 * O `g` arma e a letra seguinte navega. É o que dá três destinos sem gastar
 * três modificadores, e o que evita colisão com o navegador, que não publica
 * sequência nenhuma.
 */
describe('sequência de duas teclas', () => {
  it('dispara quando a segunda tecla vem depois da primeira', () => {
    const handler = vi.fn()
    const off = bindShortcut('g c', handler)

    tecla({ key: 'g' })
    expect(handler).not.toHaveBeenCalled()
    tecla({ key: 'c' })
    expect(handler).toHaveBeenCalledTimes(1)

    off()
  })

  it('a segunda tecla sozinha não faz nada — o `g` é que arma', () => {
    const handler = vi.fn()
    const off = bindShortcut('g c', handler)

    tecla({ key: 'c' })
    expect(handler).not.toHaveBeenCalled()

    off()
  })

  /** Tecla no meio desarma: `g x c` não é `g c`. */
  it('tecla estranha no meio cancela a sequência', () => {
    const handler = vi.fn()
    const off = bindShortcut('g c', handler)

    tecla({ key: 'g' })
    tecla({ key: 'x' })
    tecla({ key: 'c' })
    expect(handler).not.toHaveBeenCalled()

    off()
  })

  it('modificador cancela — `Ctrl+G` é comando do navegador', () => {
    const handler = vi.fn()
    const off = bindShortcut('g c', handler)

    tecla({ key: 'g', ctrlKey: true })
    tecla({ key: 'c' })
    expect(handler).not.toHaveBeenCalled()

    off()
  })

  /**
   * Duas sequências com o mesmo primeiro passo rastreiam o `g` separadamente —
   * é o que permite `g c` e `g e` coexistirem sem uma roubar a outra.
   */
  it('sequências irmãs não se atropelam', () => {
    const compras = vi.fn()
    const estoque = vi.fn()
    const offC = bindShortcut('g c', compras)
    const offE = bindShortcut('g e', estoque)

    tecla({ key: 'g' })
    tecla({ key: 'e' })
    expect(estoque).toHaveBeenCalledTimes(1)
    expect(compras).not.toHaveBeenCalled()

    offC()
    offE()
  })

  it('o rótulo sai com espaço, como o gesto — `G C`, não `G+C`', () => {
    expect(shortcutLabel('g c')).toBe('G C')
    expect(shortcutLabel('ctrl+k')).toBe('Ctrl+K')
  })
})

/**
 * TECLA NUA só fora de campo de texto — senão digitar "novo" numa busca abriria
 * um cadastro em branco no meio da frase. Acorde com modificador continua
 * valendo em qualquer lugar: é o caminho de quem já está no formulário.
 */
describe('guarda de digitação', () => {
  function teclaEm(alvo: Element, init: KeyboardEventInit) {
    alvo.dispatchEvent(new KeyboardEvent('keydown', { ...init, bubbles: true, cancelable: true }))
  }

  it('tecla nua não dispara dentro de um input', () => {
    const handler = vi.fn()
    const off = bindShortcut('n', handler)
    const input = document.createElement('input')
    document.body.append(input)

    teclaEm(input, { key: 'n' })
    expect(handler).not.toHaveBeenCalled()

    input.remove()
    off()
  })

  it('mas dispara fora dele', () => {
    const handler = vi.fn()
    const off = bindShortcut('n', handler)

    tecla({ key: 'n' })
    expect(handler).toHaveBeenCalledTimes(1)

    off()
  })

  it('sequência também não começa dentro de um input', () => {
    const handler = vi.fn()
    const off = bindShortcut('g c', handler)
    const input = document.createElement('input')
    document.body.append(input)

    teclaEm(input, { key: 'g' })
    teclaEm(input, { key: 'c' })
    expect(handler).not.toHaveBeenCalled()

    input.remove()
    off()
  })

  it('acorde com modificador continua valendo dentro do campo', () => {
    const handler = vi.fn()
    const off = bindShortcut('alt+p', handler)
    const input = document.createElement('input')
    document.body.append(input)

    teclaEm(input, { key: 'p', altKey: true })
    expect(handler).toHaveBeenCalledTimes(1)

    input.remove()
    off()
  })
})
