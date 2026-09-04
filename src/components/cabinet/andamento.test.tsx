import { Andamento, type EventoDeAndamento } from '@/components/cabinet/andamento'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * ANDAMENTO (Reface 2.0, D18) — o que a peça promete é dizer ONDE o documento
 * está, não listar o que aconteceu.
 *
 * Por isso os testes daqui perguntam pelo `atual` e pelo `futuro`, e não pela
 * contagem de linhas: uma timeline que renderiza três itens e não distingue
 * qual é o de hoje é a aba de histórico de novo, com outra tipografia.
 */

const EVENTOS: EventoDeAndamento[] = [
  { id: 'aberta', titulo: 'Ordem aberta', data: '2026-08-30', estado: 'feito' },
  { id: 'enviada', titulo: 'Enviada ao fornecedor', data: '2026-09-01', estado: 'atual' },
  { id: 'chegada', titulo: 'Chegada prevista', data: '2026-09-15', estado: 'futuro' },
]

describe('Andamento', () => {
  it('marca UM evento como o atual, e diz isso a quem ouve a tela', () => {
    render(<Andamento eventos={EVENTOS} />)

    const itens = screen.getAllByRole('listitem')
    const atuais = itens.filter((item) => item.getAttribute('aria-current') === 'step')

    // A forma do ponto (anel vs cheio) não chega a quem ouve; `aria-current`
    // é o que o leitor de tela anuncia como posição na lista.
    expect(atuais).toHaveLength(1)
    expect(atuais[0]).toHaveTextContent('Enviada ao fornecedor')
  })

  it('diz o estado por extenso — o ponto é forma e cor, e nenhuma das duas se ouve', () => {
    render(<Andamento eventos={EVENTOS} />)

    const itens = screen.getAllByRole('listitem')

    for (const [indice, porExtenso] of ['concluído', 'etapa atual', 'pendente'].entries()) {
      const item = itens[indice]
      expect(item).toBeDefined()
      expect(within(item as HTMLElement).getByText(new RegExp(porExtenso))).toBeInTheDocument()
    }
  })

  it('desenha o futuro apagado e o feito cheio, sem trocar o tamanho do ponto', () => {
    render(<Andamento eventos={EVENTOS} />)

    const itens = screen.getAllByRole('listitem')
    expect(itens.map((item) => item.dataset.estado)).toEqual(['feito', 'atual', 'futuro'])
  })

  it('mostra a data em ordem brasileira, sem voltar um dia no fuso', () => {
    render(<Andamento eventos={EVENTOS} />)

    // `new Date('2026-09-01')` é UTC e cairia em 31/08 no horário do Brasil —
    // a data do documento viraria a véspera na tela.
    expect(screen.getByText('01/09/2026')).toBeInTheDocument()
  })

  it('põe o motivo ao lado da data quando a etapa foi reprometida', () => {
    render(
      <Andamento
        eventos={[
          {
            id: 'chegada',
            titulo: 'Chegada reprometida',
            data: '2026-09-20',
            motivo: 'fornecedor sem estoque',
            estado: 'atual',
          },
        ]}
      />,
    )

    const item = screen.getByRole('listitem')
    expect(within(item).getByText(/fornecedor sem estoque/)).toBeInTheDocument()
  })

  it('diz que não há movimentação em vez de desenhar uma linha vazia', () => {
    render(<Andamento eventos={[]} />)

    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.getByText(/Sem movimentação registrada/)).toBeInTheDocument()
  })
})
