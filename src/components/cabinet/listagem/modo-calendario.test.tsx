import { ModoCalendario } from '@/components/cabinet/listagem/modo-calendario'
import { diaLocalISO } from '@/lib/datas'
import { renderWithQuery } from '@/test/utils'
import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

interface Linha {
  id: string
  titulo: string
  quando: string | null
}

const HOJE = diaLocalISO()

/** Um dia do MESMO mês de hoje — a grade abre no mês corrente. */
function noMes(dia: number): string {
  return `${HOJE.slice(0, 8)}${String(dia).padStart(2, '0')}`
}

function montar(rows: Linha[], props: Record<string, unknown> = {}) {
  return renderWithQuery(
    <ModoCalendario
      rows={rows}
      campoDeData="quando"
      chave={(linha) => linha.id}
      evento={(linha) => ({ titulo: linha.titulo, tom: 'info' })}
      {...props}
    />,
  )
}

function celula(container: HTMLElement, iso: string): HTMLElement {
  const alvo = container.querySelector<HTMLElement>(`[data-dia="${iso}"]`)
  if (!alvo) throw new Error(`célula ${iso} não está na grade`)
  return alvo
}

describe('ModoCalendario', () => {
  it('põe o evento no dia do campo de data', () => {
    const { container } = montar([{ id: 'a', titulo: 'Chegada Stella', quando: noMes(12) }])

    expect(within(celula(container, noMes(12))).getByText('Chegada Stella')).toBeInTheDocument()
  })

  it('marca HOJE — o único preenchimento sólido da grade', () => {
    const { container } = montar([])

    expect(celula(container, HOJE)).toHaveAttribute('data-hoje')
  })

  /**
   * O `+n` existe para a altura da célula NÃO variar.
   *
   * Célula que cresce com o dia cheio empurraria as outras seis semanas para
   * fora da tela; o resumo mantém a grade do mesmo tamanho e o resto a um
   * clique.
   */
  it('resume o excesso em `+n` e abre o dia inteiro ao clicar', async () => {
    const cheios = [1, 2, 3, 4, 5].map((n) => ({
      id: `e${n}`,
      titulo: `Evento ${n}`,
      quando: noMes(15),
    }))
    const { user, container } = montar(cheios)

    const dia = celula(container, noMes(15))
    expect(within(dia).getByText('Evento 3')).toBeInTheDocument()
    expect(within(dia).queryByText('Evento 4')).not.toBeInTheDocument()

    await user.click(within(dia).getByRole('button', { name: '+2' }))
    expect(within(dia).getByText('Evento 5')).toBeInTheDocument()
  })

  /**
   * LINHA SEM DATA NÃO SOME CALADA.
   *
   * O calendário não tem onde pô-la, e omiti-la em silêncio faria a grade
   * contar menos que a barra da listagem — o operador leria dois números para o
   * mesmo conjunto e acreditaria no menor.
   */
  it('declara no rodapé quantos registros ficaram sem data', () => {
    montar([
      { id: 'a', titulo: 'Com data', quando: noMes(3) },
      { id: 'b', titulo: 'Sem data', quando: null },
    ])

    expect(screen.getByText('1 registro sem data não aparece no calendário.')).toBeInTheDocument()
  })

  it('lê o DIA de uma data com hora — a grade é por dia, não por instante', () => {
    const { container } = montar([
      { id: 'a', titulo: 'Reunião', quando: `${noMes(7)}T14:30:00.000Z` },
    ])

    expect(within(celula(container, noMes(7))).getByText('Reunião')).toBeInTheDocument()
  })

  /**
   * Controlado, o calendário AVISA em vez de guardar o mês — é o que a agenda
   * precisa, porque lá quem consulta pergunta por intervalo.
   */
  it('com `mes` controlado, andar de mês avisa quem consulta', async () => {
    const aoMudarMes = vi.fn()
    const { user } = montar([], { mes: { ano: 2026, mes: 9 }, aoMudarMes })

    await user.click(screen.getByRole('button', { name: 'Próximo' }))

    expect(aoMudarMes).toHaveBeenCalledWith({ ano: 2026, mes: 10 })
  })

  it('a escala Semana mostra sete células', async () => {
    const { user, container } = montar([])

    await user.click(screen.getByLabelText('Semana'))

    expect(container.querySelectorAll('[data-dia]')).toHaveLength(7)
  })
})
