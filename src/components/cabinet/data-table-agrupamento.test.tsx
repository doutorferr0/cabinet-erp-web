import {
  type DecoracaoDaLinha,
  type OpcaoDeAgrupamento,
  VitraDataTable,
  agruparLinhas,
} from '@/components/cabinet/data-table'
import type { CampoFiltravel } from '@/lib/filtro-de-consulta'
import { renderWithQuery } from '@/test/utils'
import type { ColumnDef } from '@tanstack/react-table'
import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * AGRUPAMENTO E DECORAÇÃO DA TABELA (D10) — a grade vira banco.
 *
 * Material de teste: ordem de compra, que é o caso do mockup (agrupada por
 * Situação, com subtotal). Os valores estão em CENTAVOS, como todo dinheiro do
 * sistema, e os totais escolhidos terminam em centavo justamente para que uma
 * soma feita em reais não passasse: `12345 + 6789` é `19134` centavos
 * (R$ 191,34), e somar `123,45 + 67,89` em ponto flutuante devolve
 * `191,34000000000003`.
 */
interface OrdemDeCompra {
  id: string
  numero: string
  fornecedor: string
  situacao: string
  /** Centavos, inteiro. */
  total: number
  atrasada?: boolean
  cancelada?: boolean
}

const ORDENS: OrdemDeCompra[] = [
  { id: '1', numero: 'OC-001', fornecedor: 'Stella', situacao: 'Em aberto', total: 12345 },
  {
    id: '2',
    numero: 'OC-002',
    fornecedor: 'Lumini',
    situacao: 'Em aberto',
    total: 6789,
    atrasada: true,
  },
  { id: '3', numero: 'OC-003', fornecedor: 'Bella', situacao: 'Recebida', total: 100_00 },
  {
    id: '4',
    numero: 'OC-004',
    fornecedor: 'Newline',
    situacao: 'Cancelada',
    total: 999,
    cancelada: true,
  },
]

const colunas: ColumnDef<OrdemDeCompra>[] = [
  { accessorKey: 'numero', header: 'Número' },
  { accessorKey: 'fornecedor', header: 'Fornecedor' },
  { accessorKey: 'situacao', header: 'Situação' },
]

const POR_SITUACAO: OpcaoDeAgrupamento<OrdemDeCompra> = {
  id: 'situacao',
  rotulo: 'Situação',
  valorDaLinha: (oc) => oc.situacao,
  tomDoValor: (valor) => (valor === 'Recebida' ? 'done' : valor === 'Cancelada' ? 'void' : 'open'),
}

const POR_FORNECEDOR: OpcaoDeAgrupamento<OrdemDeCompra> = {
  id: 'fornecedor',
  rotulo: 'Fornecedor',
  valorDaLinha: (oc) => oc.fornecedor,
}

const AGRUPAMENTOS: readonly OpcaoDeAgrupamento<OrdemDeCompra>[] = [POR_SITUACAO, POR_FORNECEDOR]

function decoracaoDaOrdem(oc: OrdemDeCompra): DecoracaoDaLinha | undefined {
  if (oc.cancelada === true) return 'muted'
  if (oc.atrasada === true) return 'bad'
  return undefined
}

function montar(props: Partial<Parameters<typeof VitraDataTable<OrdemDeCompra>>[0]> = {}) {
  return renderWithQuery(
    <VitraDataTable
      columns={colunas}
      queryKey={['ordens-de-compra-teste']}
      fetcher={async () => ({ rows: ORDENS, total: ORDENS.length })}
      agrupamentos={AGRUPAMENTOS}
      subtotalDoGrupo={(oc) => oc.total}
      decoracao={decoracaoDaOrdem}
      {...props}
    />,
  )
}

/** A faixa do grupo, pelo valor que ela anuncia. */
function faixaDoGrupo(valor: string) {
  const faixa = document.querySelector(`[data-slot="linha-de-grupo"][data-grupo="${valor}"]`)
  if (faixa === null) throw new Error(`faixa do grupo "${valor}" não está na tela`)
  return faixa as HTMLElement
}

describe('agruparLinhas', () => {
  it('soma em centavos inteiros, sem passar por real', () => {
    const grupos = agruparLinhas(
      ORDENS,
      (oc) => oc.situacao,
      (oc) => oc.total,
    )

    const emAberto = grupos.find((g) => g.valor === 'Em aberto')
    expect(emAberto?.linhas).toHaveLength(2)
    // 12345 + 6789 — inteiro exato, e é isso que o `toBe` cobra: a soma em
    // reais daria 191.34000000000003 e o `Number.isInteger` abaixo reprovaria.
    expect(emAberto?.subtotal).toBe(19134)
    expect(Number.isInteger(emAberto?.subtotal)).toBe(true)
  })

  it('mantém a ordem em que cada grupo apareceu, não a alfabética', () => {
    const grupos = agruparLinhas(ORDENS, (oc) => oc.situacao)
    expect(grupos.map((g) => g.valor)).toEqual(['Em aberto', 'Recebida', 'Cancelada'])
  })

  it('sem subtotal declarado o grupo diz `null`, não zero', () => {
    const grupos = agruparLinhas(ORDENS, (oc) => oc.situacao)
    expect(grupos.every((g) => g.subtotal === null)).toBe(true)
  })
})

describe('VitraDataTable — agrupamento na grade', () => {
  // O chip `Agrupar` da barra é o da D9 (`listagem/barra-de-filtros.tsx`); a
  // D10 o alimenta na visão LISTA e responde a ele com faixas. Os testes falam
  // pelos rótulos dele — se a D9 os mudar, é aqui que aparece.
  it('nasce sem agrupamento e o chip é o convite', async () => {
    montar()
    await screen.findByText('OC-001')

    expect(document.querySelectorAll('[data-slot="linha-de-grupo"]')).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Agrupar por um campo' })).toBeInTheDocument()
  })

  it('agrupa por Situação com contagem e subtotal em Money', async () => {
    const { user } = montar()
    await screen.findByText('OC-001')

    await user.click(screen.getByRole('button', { name: 'Agrupar por um campo' }))
    await user.click(await screen.findByRole('button', { name: 'Situação' }))

    const emAberto = faixaDoGrupo('Em aberto')
    expect(within(emAberto).getByText('2 itens')).toBeInTheDocument()
    expect(within(emAberto).getByText('R$ 191,34')).toBeInTheDocument()

    const recebida = faixaDoGrupo('Recebida')
    expect(within(recebida).getByText('1 item')).toBeInTheDocument()
    expect(within(recebida).getByText('R$ 100,00')).toBeInTheDocument()

    // O chip passa a dizer por onde a grade está partida.
    expect(screen.getByRole('button', { name: /Agrupado por Situação/ })).toBeInTheDocument()
  })

  it('clique na faixa colapsa o grupo e some com as linhas dele', async () => {
    const { user } = montar()
    await screen.findByText('OC-001')

    await user.click(screen.getByRole('button', { name: 'Agrupar por um campo' }))
    await user.click(await screen.findByRole('button', { name: 'Situação' }))
    expect(screen.getByText('OC-001')).toBeInTheDocument()

    const alternador = within(faixaDoGrupo('Em aberto')).getByRole('button')
    expect(alternador).toHaveAttribute('aria-expanded', 'true')
    await user.click(alternador)

    expect(alternador).toHaveAttribute('aria-expanded', 'false')
    // As duas linhas do grupo somem; as dos OUTROS grupos ficam — colapsar um
    // grupo é esconder aquele grupo, não filtrar a listagem.
    expect(screen.queryByText('OC-001')).not.toBeInTheDocument()
    expect(screen.queryByText('OC-002')).not.toBeInTheDocument()
    expect(screen.getByText('OC-003')).toBeInTheDocument()
    // A faixa fica: o subtotal do grupo fechado é justamente o que se foi ver.
    expect(within(faixaDoGrupo('Em aberto')).getByText('R$ 191,34')).toBeInTheDocument()
  })

  it('o × do chip desagrupa e devolve a lista corrida', async () => {
    const { user } = montar()
    await screen.findByText('OC-001')

    await user.click(screen.getByRole('button', { name: 'Agrupar por um campo' }))
    await user.click(await screen.findByRole('button', { name: 'Situação' }))
    expect(document.querySelectorAll('[data-slot="linha-de-grupo"]')).toHaveLength(3)

    await user.click(screen.getByRole('button', { name: /Desagrupar/ }))

    expect(document.querySelectorAll('[data-slot="linha-de-grupo"]')).toHaveLength(0)
    expect(screen.getByText('OC-001')).toBeInTheDocument()
    expect(screen.getByText('OC-004')).toBeInTheDocument()
  })

  it('a contagem usa o nome da ENTIDADE quando a tela o declara', async () => {
    const { user } = montar({
      entidade: {
        id: 'ordem-compra',
        nome: 'Ordem',
        plural: 'Ordens',
        fonte: 'mock',
        modulos: [],
      },
    })
    await screen.findByText('OC-001')

    await user.click(screen.getByRole('button', { name: 'Agrupar por um campo' }))
    await user.click(await screen.findByRole('button', { name: 'Situação' }))

    // Mockup: `2 ordens`, não `2 itens`. Singular e plural vêm do schema.
    expect(within(faixaDoGrupo('Em aberto')).getByText('2 ordens')).toBeInTheDocument()
    expect(within(faixaDoGrupo('Recebida')).getByText('1 ordem')).toBeInTheDocument()
  })

  it('a faixa é tintada pelo ESTADO, e o grupo sem tom fica na folha-2', async () => {
    const { user } = montar()
    await screen.findByText('OC-001')

    await user.click(screen.getByRole('button', { name: 'Agrupar por um campo' }))
    await user.click(await screen.findByRole('button', { name: 'Situação' }))

    // Mockup §Ordens: a faixa do grupo é tint da própria semântica do estado —
    // os tokens ALPHA do 2.0 deitados sobre o `n-50` que toda faixa tem.
    expect(faixaDoGrupo('Em aberto').className).toContain('var(--info-bg)')
    expect(faixaDoGrupo('Recebida').className).toContain('var(--ok-bg)')
    expect(faixaDoGrupo('Cancelada').className).toContain('var(--bad-bg)')
    for (const valor of ['Em aberto', 'Recebida', 'Cancelada']) {
      expect(faixaDoGrupo(valor).className).toContain('var(--n-50)')
    }
  })

  it('agrupar por campo SEM tom não pinta nada — nome próprio não é estado', async () => {
    const { user } = montar()
    await screen.findByText('OC-001')

    await user.click(screen.getByRole('button', { name: 'Agrupar por um campo' }))
    await user.click(await screen.findByRole('button', { name: 'Fornecedor' }))

    const stella = faixaDoGrupo('Stella')
    // Folha-2 e só: nem tinta de estado, nem carimbo em volta do nome.
    expect(stella.className).toContain('var(--n-50)')
    expect(stella.className).not.toContain('-bg)')
    expect(stella.querySelector('[data-slot="stamp"]')).toBeNull()
    expect(within(stella).getByText('Stella')).toBeInTheDocument()
  })

  it('campo sem `valorDaLinha` não entra no chip — a tabela não sabe lê-lo', async () => {
    const { user } = montar({
      agrupamentos: [{ id: 'etapa', rotulo: 'Etapa' }, POR_FORNECEDOR],
    })
    await screen.findByText('OC-001')

    await user.click(screen.getByRole('button', { name: 'Agrupar por um campo' }))
    expect(await screen.findByRole('button', { name: 'Fornecedor' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Etapa' })).not.toBeInTheDocument()
  })
})

describe('VitraDataTable — decoração da linha', () => {
  it('a linha atrasada carrega faixa e tint; a normal, nenhum dos dois', async () => {
    montar()
    const atrasada = (await screen.findByText('OC-002')).closest('tr')
    const normal = screen.getByText('OC-001').closest('tr')

    // A faixa é o sinal (Odoo) e o tint só a acompanha — as duas asserções
    // olham para os tokens 2.0, não para nome de utilitário 1.x: `bad` fecha
    // no semântico `--bad`, e o tint na rampa, a 8%.
    expect(atrasada?.className).toContain('inset_3px_0_0_var(--bad)')
    expect(atrasada?.className).toContain('var(--rose-400)_8%')
    expect(normal?.className).not.toContain('inset_3px_0_0')
    expect(normal?.className).not.toContain('var(--rose-400)_8%')
  })

  it('`muted` rebaixa o texto e NÃO ganha faixa — quem saiu do jogo não compete', async () => {
    montar()
    const cancelada = (await screen.findByText('OC-004')).closest('tr')

    expect(cancelada?.className).toContain('text-muted-foreground')
    expect(cancelada?.className).not.toContain('inset_3px_0_0')
  })

  it('sem `decoracao` nenhuma linha é decorada', async () => {
    // Sem a prop, e não com ela `undefined`: `exactOptionalPropertyTypes` trata
    // os dois como coisas diferentes, e é a AUSÊNCIA que a listagem comum tem.
    renderWithQuery(
      <VitraDataTable
        columns={colunas}
        queryKey={['ordens-de-compra-sem-decoracao']}
        fetcher={async () => ({ rows: ORDENS, total: ORDENS.length })}
      />,
    )
    const atrasada = (await screen.findByText('OC-002')).closest('tr')
    expect(atrasada?.className).not.toContain('inset_3px_0_0')
  })
})

/**
 * O AGRUPAMENTO DA TABELA ENTRA NA CONSULTA FAVORITA.
 *
 * É o mesmo estado que a visão que agrupa já gravava (padrão 9), e por isso
 * não precisou de campo novo no favorito: o chip escreve onde o `Agrupar por`
 * escrevia. A prova importa porque agrupar é caro de refazer — quem monta
 * `Situação` com subtotal toda manhã e reabre a tela na lista corrida conclui
 * que o favorito não guarda a tela que salvou.
 */
describe('VitraDataTable — agrupamento na consulta favorita', () => {
  const camposFiltraveis: CampoFiltravel[] = [
    { id: 'fornecedor', rotulo: 'Fornecedor', variante: 'text' },
  ]

  function montarComFavoritos() {
    return renderWithQuery(
      <VitraDataTable
        columns={colunas}
        queryKey={['ordens-de-compra-fav']}
        fetcher={async () => ({ rows: ORDENS, total: ORDENS.length })}
        agrupamentos={AGRUPAMENTOS}
        subtotalDoGrupo={(oc) => oc.total}
        decoracao={decoracaoDaOrdem}
        actions={[{ id: 'filtro', label: 'Filtro' }]}
        filtros={camposFiltraveis}
      />,
    )
  }

  it('grava o campo agrupado e o traz de volta com o favorito', async () => {
    localStorage.clear()
    const { user } = montarComFavoritos()
    await screen.findByText('OC-001')

    await user.click(screen.getByRole('button', { name: 'Agrupar por um campo' }))
    await user.click(await screen.findByRole('button', { name: 'Situação' }))

    await user.click(screen.getByRole('button', { name: /Salvar consulta/ }))
    await user.type(screen.getByLabelText('Nome'), 'Por situação')
    await user.click(screen.getByRole('button', { name: 'Gravar' }))

    const guardado = JSON.parse(localStorage.getItem('cabinet.consultas-favoritas.v1') ?? '{}')
    expect(guardado['ordens-de-compra-fav']?.[0]).toMatchObject({ agruparPor: 'situacao' })

    // Desagrupa na mão e reaplica o favorito: as faixas voltam.
    await user.click(screen.getByRole('button', { name: /Desagrupar/ }))
    expect(document.querySelectorAll('[data-slot="linha-de-grupo"]')).toHaveLength(0)

    await user.click(screen.getByRole('tab', { name: 'Por situação' }))
    expect(document.querySelectorAll('[data-slot="linha-de-grupo"]')).toHaveLength(3)
  })
})
