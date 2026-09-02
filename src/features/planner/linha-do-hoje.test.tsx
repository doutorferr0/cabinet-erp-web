import { renderWithQuery } from '@/test/utils'
import { useRef } from 'react'
import { describe, expect, it } from 'vitest'
import { LinhaDoHoje } from './linha-do-hoje'

/**
 * O QUE ESTA BATERIA PODE PROVAR — e o limite é o mesmo do resto do Planner.
 *
 * `jsdom` não faz layout: `getBoundingClientRect` devolve zeros e o miolo do
 * SVAR nem monta (ver o cabeçalho de `planner.test.tsx`). Então a POSIÇÃO em
 * pixels da linha não é alcançável aqui, e fingir que é — medindo contra um
 * `.wx-chart` dublado — provaria o dublê.
 *
 * O que É alcançável e importa: a decisão de DESENHAR OU NÃO. Um projeto que
 * acabou ano passado não pode ganhar uma linha "hoje" encostada na borda
 * esquerda, porque a linha continua bonita mentindo. A conta que decide isso é
 * pura (`mesesAteODia`) e está coberta em `dados-do-gantt.test.ts`; aqui se
 * prova que o componente a obedece.
 */

function Palco({ inicio, fim }: { inicio: Date; fim: Date }) {
  const quadro = useRef<HTMLDivElement>(null)
  return (
    <div ref={quadro} data-slot="gantt">
      {/* Os nós que o componente procura. Sem tamanho — é o que jsdom dá. */}
      <div className="wx-chart">
        <div className="wx-scale" />
      </div>
      <LinhaDoHoje janela={{ inicio, fim }} quadro={quadro} />
    </div>
  )
}

const HOJE = new Date()

describe('linha do hoje', () => {
  it('não desenha quando hoje está FORA da janela do plano', () => {
    const ano = HOJE.getFullYear()
    renderWithQuery(<Palco inicio={new Date(ano - 2, 0, 1)} fim={new Date(ano - 1, 0, 1)} />)
    expect(document.querySelector('[data-slot="planner-hoje"]')).toBeNull()
  })

  it('não desenha quando a janela é de zero mês', () => {
    // `mesesDaJanela` daria 0 e a divisão por ela produziria `Infinity` — uma
    // linha em `left: Infinity px` some do quadro sem ninguém saber por quê.
    const dia = new Date(HOJE.getFullYear(), HOJE.getMonth(), 1)
    renderWithQuery(<Palco inicio={dia} fim={dia} />)
    expect(document.querySelector('[data-slot="planner-hoje"]')).toBeNull()
  })

  it('some junto com o quadro — sem `.wx-chart` não sobra linha solta', () => {
    // O gantt monta em duas etapas; entre elas a linha não tem em que se
    // apoiar, e desenhar mesmo assim a colaria na moldura fingindo ser borda.
    function SemQuadro() {
      const quadro = useRef<HTMLDivElement>(null)
      return (
        <div ref={quadro} data-slot="gantt">
          <LinhaDoHoje
            janela={{
              inicio: new Date(HOJE.getFullYear(), HOJE.getMonth(), 1),
              fim: new Date(HOJE.getFullYear(), HOJE.getMonth() + 3, 1),
            }}
            quadro={quadro}
          />
        </div>
      )
    }
    renderWithQuery(<SemQuadro />)
    expect(document.querySelector('[data-slot="planner-hoje"]')).toBeNull()
  })
})
