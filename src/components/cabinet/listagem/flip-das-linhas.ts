import { useLayoutEffect, useRef } from 'react'

/**
 * FLIP nas linhas da grade (D33 · pesquisa §8) — quando a lista se reordena, as
 * linhas DESLIZAM para o lugar novo em vez de piscarem nele.
 *
 * First-Last-Invert-Play: guarda onde cada linha estava, mede onde ela ficou
 * depois do commit, aplica o deslocamento invertido e deixa o navegador animar
 * de volta a zero. O DOM já está no estado final o tempo todo — o que anima é
 * só a pintura —, então nada aqui pode divergir do que a tabela renderizou.
 *
 * ## Por que isto importa numa grade de ERP
 *
 * Agrupar por Situação move trinta linhas de uma vez. Sem transição, o operador
 * vê uma tela nova e precisa reencontrar a linha que estava olhando; com ela, o
 * olho ACOMPANHA a linha até o grupo dela. É a diferença entre "a lista mudou" e
 * "a lista se organizou", e a segunda é o que o gesto quis dizer.
 *
 * ## Identidade pela linha, não pela posição
 *
 * A chave é o `data-linha-id` que a grade escreve — o id da `Row` do TanStack.
 * Medir por posição faria a primeira linha "virar" a segunda no mapa e a
 * animação inverteria o sentido: as linhas deslizariam para o lado errado, o que
 * é pior que não animar.
 *
 * ## Onde ele NÃO roda
 *
 * `prefers-reduced-motion` desliga (é movimento de conteúdo, o caso mais forte
 * da preferência), e ambiente sem `Element.animate` — jsdom — simplesmente não
 * anima: o teste continua vendo o DOM final, que é o que ele afirma.
 */
export function useFlipDasLinhas(
  raiz: { current: HTMLElement | null },
  /**
   * O que MUDOU a ordem — agrupamento, ordenação, página.
   *
   * O efeito roda a cada render para manter as posições frescas, mas só ANIMA
   * quando esta assinatura muda. Sem isso, um render disparado por hover
   * animaria linhas que ninguém mexeu — e a grade tremeria sob o mouse.
   */
  assinatura: string,
): void {
  const posicoes = useRef(new Map<string, number>())
  const anterior = useRef(assinatura)

  useLayoutEffect(() => {
    const elemento = raiz.current
    if (!elemento) return

    const mudou = anterior.current !== assinatura
    anterior.current = assinatura

    const reduzido =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const antes = posicoes.current
    const agora = new Map<string, number>()

    for (const linha of elemento.querySelectorAll<HTMLElement>('[data-linha-id]')) {
      const id = linha.dataset.linhaId
      if (id === undefined) continue
      const topo = linha.getBoundingClientRect().top
      agora.set(id, topo)

      if (!mudou || reduzido) continue
      const partiu = antes.get(id)
      if (partiu === undefined || partiu === topo) continue
      if (typeof linha.animate !== 'function') continue

      linha.animate(
        [{ transform: `translateY(${partiu - topo}px)` }, { transform: 'none' }],
        // 200ms/`--ease-out` é a "distância longa" da §8 da pesquisa: a linha
        // atravessa a grade inteira. Os valores estão escritos aqui porque a
        // Web Animations API não lê `var()` — e o comentário é o que impede
        // que eles divirjam do token no dia em que a curva mudar.
        { duration: 200, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
      )
    }

    posicoes.current = agora
  })
}
