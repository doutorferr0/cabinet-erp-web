import { MapaDeAtalhosTela } from '@/features/ajuda/mapa-de-atalhos'
import { renderWithQuery } from '@/test/utils'
import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * A tela do mapa — o que ela tem de DIZER, não como desenha.
 *
 * O caso que importa é o do operador que aperta F6 esperando o produto: ele
 * precisa achar a linha do F6 e ler `Alt+P` ao lado. Se essa correspondência
 * sumir, a tela vira uma lista de teclas novas, que quem já sabia não precisa e
 * quem não sabia não procura.
 */
describe('mapa de atalhos', () => {
  function linhaDe(legado: string) {
    const celula = screen.getAllByText(legado)[0]
    const linha = celula?.closest('tr')
    if (!linha) throw new Error(`não há linha para ${legado}`)
    return within(linha)
  }

  it('mostra a tecla do sistema antigo ao lado da tecla de hoje', () => {
    renderWithQuery(<MapaDeAtalhosTela />)

    expect(linhaDe('F6').getByText('Alt+P')).toBeInTheDocument()
    expect(linhaDe('F5').getByText('Alt+A')).toBeInTheDocument()
  })

  it('diz que o F3 ficou SEM substituto, em vez de omiti-lo', () => {
    // Omitir a linha faria quem procura o F3 concluir que a tecla quebrou —
    // que é o mesmo silêncio de antes desta tela existir.
    renderWithQuery(<MapaDeAtalhosTela />)

    expect(linhaDe('F3').getByText(/sem tecla equivalente/)).toBeInTheDocument()
  })

  it('separa o que os navegadores publicam do que não publicam', () => {
    renderWithQuery(<MapaDeAtalhosTela />)

    // Ctrl+K é o único com conflito publicado nos dois; o resto tem de dizer
    // "não usa" em vez de ficar em branco, que se lê como "não conferido".
    expect(screen.getByText(/Pesquisar a partir de qualquer lugar da página/)).toBeInTheDocument()
    expect(screen.getAllByText('Não usa esta combinação').length).toBeGreaterThan(0)
  })

  it('não promete que as teclas foram testadas na máquina de quem opera', () => {
    renderWithQuery(<MapaDeAtalhosTela />)

    expect(screen.getByText(/Isto é o que os fabricantes publicam/)).toBeInTheDocument()
  })
})
