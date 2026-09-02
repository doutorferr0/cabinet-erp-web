import { ModoKanban } from '@/components/cabinet/listagem/modo-kanban'
import { renderWithQuery } from '@/test/utils'
import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

interface Linha {
  id: string
  numero: string
  cliente: string
  situacao: string
  quando: string | null
  totalCents: number | null
}

const LINHAS: Linha[] = [
  {
    id: 'a',
    numero: 'OC-0001',
    cliente: 'Stella Iluminação',
    situacao: 'aberta',
    quando: '2026-09-10',
    totalCents: 125_00,
  },
  {
    id: 'b',
    numero: 'OC-0002',
    cliente: 'Casa & Luz',
    situacao: 'aberta',
    quando: null,
    totalCents: null,
  },
  {
    id: 'c',
    numero: 'OC-0003',
    cliente: 'Vertz',
    situacao: 'recebida',
    quando: '2026-09-01',
    totalCents: 4_990_00,
  },
]

function montar(props: Partial<Parameters<typeof ModoKanban<Linha>>[0]> = {}) {
  return renderWithQuery(
    <ModoKanban
      rows={LINHAS}
      campoDeColuna="situacao"
      chave={(linha) => linha.id}
      cartao={(linha) => ({
        titulo: linha.numero,
        subtitulo: linha.cliente,
        badge: { rotulo: linha.situacao, tom: 'info' },
        data: linha.quando,
        valorCents: linha.totalCents,
      })}
      {...props}
    />,
  )
}

describe('ModoKanban', () => {
  it('empilha as linhas nas colunas do campo, com a contagem no cabeçalho', () => {
    montar()

    // As colunas saem dos valores distintos, na ordem em que a consulta os
    // trouxe — reordenar aqui trocaria a ordem do servidor por preferência de
    // tela.
    expect(screen.getByRole('region', { name: 'aberta: 2' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'recebida: 1' })).toBeInTheDocument()
  })

  it('o cartão mostra título, subtítulo, selo, data e dinheiro formatado', () => {
    montar()

    expect(screen.getByText('OC-0001')).toBeInTheDocument()
    expect(screen.getByText('Stella Iluminação')).toBeInTheDocument()
    expect(screen.getByText('10/09/2026')).toBeInTheDocument()
    expect(screen.getByText(/125,00/)).toBeInTheDocument()
  })

  it('valor nulo some do cartão — zero diria que o registro não vale nada', () => {
    montar()

    // A linha `b` não tem total; nenhuma das duas colunas mostra "R$ 0,00".
    expect(screen.queryByText(/R\$\s*0,00/)).not.toBeInTheDocument()
  })

  it('sem `onMover` o quadro é leitura: nenhum cartão oferece mover', () => {
    montar()

    expect(screen.queryByRole('button', { name: /^Mover/ })).not.toBeInTheDocument()
  })

  /**
   * O MENU É A PARTE ACESSÍVEL DO GESTO.
   *
   * Arrasto não existe para quem opera por teclado nem em leitor de tela — a
   * regra que os dois quadros anteriores (#229) já seguem. O teste vigia o
   * caminho por clique, que é o que o arrasto SOMA e nunca substitui.
   */
  it('o menu do cartão move para outra coluna e avisa a tela', async () => {
    const onMover = vi.fn()
    const { user } = montar({ onMover })

    await user.click(screen.getByRole('button', { name: 'Mover OC-0001' }))
    await user.click(await screen.findByRole('menuitem', { name: 'recebida' }))

    expect(onMover).toHaveBeenCalledWith(LINHAS[0], 'recebida')
  })

  it('colunas declaradas mandam na ordem — e a vazia continua na tela', () => {
    montar({
      colunas: [
        { id: 'recebida', rotulo: 'Recebida' },
        { id: 'aberta', rotulo: 'Aberta' },
        { id: 'cancelada', rotulo: 'Cancelada' },
      ],
    })

    // Coluna sem cartão nenhum não some: ficar vazia É a informação no dia em
    // que ninguém cancelou nada.
    expect(screen.getByRole('region', { name: 'Cancelada: 0' })).toBeInTheDocument()
    const colunas = screen.getAllByRole('region').map((el) => el.getAttribute('data-coluna'))
    expect(colunas).toEqual(['recebida', 'aberta', 'cancelada'])
  })
})
