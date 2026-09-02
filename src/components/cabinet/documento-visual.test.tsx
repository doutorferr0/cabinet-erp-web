import type { EstadoDoAutosave } from '@/components/cabinet/alteracoes-nao-salvas'
import {
  CabecalhoDoRegistro,
  DocumentoBloco,
  DocumentoTotais,
  IndicadorDeGravacao,
  LayoutDoRegistro,
} from '@/components/cabinet/documento'
import { renderWithQuery } from '@/test/utils'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const OCIOSO: EstadoDoAutosave = { fase: 'ocioso', salvoEm: null, erro: null }

/**
 * CABEÇALHO DO REGISTRO 2.0 (#483, mockup aba Formulário). A banda preta com o
 * número-herói saiu: o título diz o que o registro é, o id ao lado é dado que
 * se copia, a linha de meta diz em que pé está, e a única peça forte é o
 * PRÓXIMO PASSO do fluxo — nunca "Gravar".
 */
describe('CabecalhoDoRegistro', () => {
  it('título em Gambarino e id em mono ao lado, não numa caixa preta', () => {
    const { container } = render(<CabecalhoDoRegistro titulo="Ordem de compra" id="OC-5102" />)

    const titulo = screen.getByRole('heading', { name: /Ordem de compra/ })
    // §Hierarquia: título de ficha é o degrau `--t-registro`, por classe. Um
    // `text-[24px]` aqui é o que a régua proíbe e o D30 grepa.
    expect(titulo.className).toContain('t-registro')

    const id = container.querySelector('[data-slot="registro-id"]')
    expect(id).toHaveTextContent('OC-5102')
    // A caixa preta do número-herói era a única peça escura do cabeçalho e
    // pesava mais que o nome do documento. O id agora é dado, em mono n-500.
    expect(id?.getAttribute('style')).toContain('var(--font-mono)')
    expect(container.querySelector('[data-slot="documento-numero"]')).toBeNull()
  })

  it('em inclusão não há id — e o cabeçalho não finge que há', () => {
    const { container } = render(<CabecalhoDoRegistro titulo="Pedido de compra" />)
    expect(container.querySelector('[data-slot="registro-id"]')).toBeNull()
  })

  it('badge e procedência ficam na linha de meta, abaixo do título', () => {
    render(
      <CabecalhoDoRegistro
        titulo="Ordem de compra"
        id="OC-5102"
        badge={{ tom: 'open', label: 'Enviada' }}
        meta="Mister LED · criada 20/08/2026 por Henrique · reagendada 1×"
      />,
    )

    expect(screen.getByText('Enviada')).toHaveAttribute('data-tom', 'open')
    const meta = screen.getByText(/reagendada 1×/)
    expect(meta.className).toContain('t-meta')
    // A meta é irmã do badge e NÃO parte do nome acessível do documento.
    expect(screen.getByRole('heading', { name: 'Ordem de compra OC-5102' })).toBeInTheDocument()
  })

  /**
   * O DoD da #483 pede a prova por ESTADO: a primária é o próximo passo do
   * fluxo, então ela muda com o estado do registro e SOME quando não há passo
   * seguinte. Botão morto no lugar mais forte da tela ensina a não ler aquele
   * lugar.
   */
  it('a primária é o próximo passo — e some no registro que não tem para onde ir', () => {
    const confirmar = vi.fn()
    const { rerender, container } = render(
      <CabecalhoDoRegistro
        titulo="Ordem de compra"
        proximaAcao={{ id: 'receber', label: 'Confirmar recebimento', onClick: confirmar }}
      />,
    )
    expect(screen.getByRole('button', { name: 'Confirmar recebimento' })).toBeInTheDocument()

    rerender(<CabecalhoDoRegistro titulo="Ordem de compra" />)
    expect(container.querySelector('[data-slot="proxima-acao"]')).toBeNull()
  })

  it('não existe Gravar no cabeçalho da ficha que grava sozinha', () => {
    render(
      <CabecalhoDoRegistro
        titulo="Orçamento"
        autosave={{ fase: 'salvo', salvoEm: Date.now(), erro: null }}
        proximaAcao={{ id: 'enviar', label: 'Enviar orçamento' }}
      />,
    )
    expect(screen.queryByRole('button', { name: /Gravar/ })).not.toBeInTheDocument()
  })

  it('ghost e secundária ficam à vista; o perigoso fica atrás do ···', async () => {
    const cancelar = vi.fn()
    const { user } = renderWithQuery(
      <CabecalhoDoRegistro
        titulo="Orçamento"
        ghost={[{ id: 'imprimir', label: 'Imprimir' }]}
        secundarias={[{ id: 'duplicar', label: 'Duplicar' }]}
        menu={[
          { id: 'cancelar', label: 'Cancelar orçamento', destrutiva: true, onClick: cancelar },
        ]}
      />,
    )

    expect(screen.getByRole('button', { name: 'Imprimir' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Duplicar' })).toBeInTheDocument()
    // Cancelar não está na faixa: só depois de abrir o menu.
    expect(screen.queryByText('Cancelar orçamento')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Mais ações' }))
    await user.click(await screen.findByText('Cancelar orçamento'))
    expect(cancelar).toHaveBeenCalledOnce()
  })

  it('sem estado de autosave o cabeçalho não fala de gravação', () => {
    const { container } = render(<CabecalhoDoRegistro titulo="Orçamento" />)
    expect(container.querySelector('[data-slot="autosave"]')).toBeNull()
  })
})

/**
 * O indicador é o que ficou no lugar da confirmação que o botão `Gravar` dava.
 * Ele é permanente e não um toast: quem chega no meio da tarefa precisa poder
 * OLHAR e saber, sem ter estado aqui quando a mensagem passou.
 */
describe('IndicadorDeGravacao', () => {
  it('ocioso não mostra nada — nada foi gravado ainda', () => {
    const { container } = render(<IndicadorDeGravacao estado={OCIOSO} />)
    expect(container.querySelector('[data-slot="autosave"]')).toBeNull()
  })

  it('salvando fala no presente e apaga o ponto de sucesso', () => {
    const { container } = render(
      <IndicadorDeGravacao estado={{ fase: 'salvando', salvoEm: null, erro: null }} />,
    )
    expect(screen.getByText('salvando…')).toBeInTheDocument()
    const ponto = container.querySelector('[data-slot="autosave-ponto"]')
    expect(ponto?.getAttribute('style')).toContain('var(--n-500)')
  })

  it('salvo mostra o tempo desde a gravação, com o ponto em --ok', () => {
    const { container } = render(
      <IndicadorDeGravacao estado={{ fase: 'salvo', salvoEm: Date.now() - 12_000, erro: null }} />,
    )
    expect(screen.getByText('salvo há 12 s')).toBeInTheDocument()
    const ponto = container.querySelector('[data-slot="autosave-ponto"]')
    expect(ponto?.getAttribute('style')).toContain('var(--ok)')
  })

  it('passado um minuto o relógio para de contar segundos', () => {
    render(
      <IndicadorDeGravacao estado={{ fase: 'salvo', salvoEm: Date.now() - 200_000, erro: null }} />,
    )
    expect(screen.getByText('salvo há 3 min')).toBeInTheDocument()
  })

  it('erro sai em --bad e traz o botão que o autosave deve ao operador', async () => {
    const tentar = vi.fn()
    const { user } = renderWithQuery(
      <IndicadorDeGravacao
        estado={{ fase: 'erro', salvoEm: null, erro: 'sem servidor' }}
        onTentarDeNovo={tentar}
      />,
    )
    expect(screen.getByText('erro ao salvar').getAttribute('style')).toContain('var(--bad)')
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(tentar).toHaveBeenCalledOnce()
  })
})

/**
 * DUAS COLUNAS (mockup: `minmax(0,1fr) 320px`). A quebra é por `flex-wrap`,
 * sem `@media` (regra 7 da rodada): a principal cresce com peso desproporcional
 * e a lateral fica na base de 320px enquanto as duas couberem na linha.
 */
describe('LayoutDoRegistro', () => {
  it('lateral fica em 320px e a principal absorve o resto', () => {
    const { container } = render(
      <LayoutDoRegistro principal={<p>itens</p>} lateral={<p>fornecedor</p>} />,
    )
    const principal = container.querySelector('[data-slot="registro-principal"]')
    const lateral = container.querySelector('[data-slot="registro-lateral"]')
    expect(principal?.getAttribute('style')).toContain('999')
    expect(lateral?.getAttribute('style')).toContain('320px')
    // Sem ponto de quebra escrito à mão em lugar nenhum.
    expect(container.querySelector('[data-slot="layout-do-registro"]')?.className).toContain(
      'flex-wrap',
    )
  })

  it('documento sem nada a orbitar fica de uma coluna só', () => {
    const { container } = render(<LayoutDoRegistro principal={<p>itens</p>} />)
    expect(container.querySelector('[data-slot="registro-lateral"]')).toBeNull()
  })

  it('a lateral é `aside` — o que orbita não é o documento', () => {
    const { container } = render(
      <LayoutDoRegistro principal={<p>itens</p>} lateral={<p>andamento</p>} />,
    )
    expect(container.querySelector('aside[data-slot="registro-lateral"]')).not.toBeNull()
  })
})

describe('DocumentoTotais', () => {
  it('rótulos em Meta e Total separado por régua forte', () => {
    render(
      <DocumentoTotais
        subtotalCentavos={100_000}
        ajustes={[{ label: 'Desconto', valorCentavos: 10_000, sinal: -1 }]}
      />,
    )
    const total = screen.getByText('Total:')
    expect(total.className).toContain('font-mono')
    expect(total.className).toContain('uppercase')
    // O fecho é o `TotalBox`, e não mais um item da tira separado por régua.
    expect(total.closest('[data-slot="total-box"]')).not.toBeNull()
    // Total derivado: 1000,00 - 100,00 = 900,00
    expect(screen.getByLabelText('Total')).toHaveTextContent('900')
  })

  it('rótulo da tira é `.t-rotulo` e o valor é `.t-dado` — nada de literal', () => {
    render(<DocumentoTotais subtotalCentavos={100_000} />)
    expect(screen.getByText('SubTotal:').className).toContain('t-rotulo')
    expect(screen.getByLabelText('SubTotal').className).toContain('t-dado')
  })

  it('tira tem canto de 4px (rounded-lg) e borda em Régua', () => {
    const { container } = render(<DocumentoTotais subtotalCentavos={0} />)
    // A tira agora é irmã do fecho dentro da coluna alinhada à direita —
    // `firstElementChild` do container é essa coluna, não a tira.
    const tira = container.firstElementChild?.firstElementChild
    expect(tira?.className).toContain('rounded-lg')
    expect(tira?.className).toContain('border')
  })

  // O fecho NÃO fica dentro da tira: se ficasse, a tela sem grade teria um
  // total de 48px espremido entre dois pares de 14px, e a decisão do #236
  // apareceria como desalinho em vez de hierarquia.
  it('o fecho é bloco próprio, irmão da tira e não item dela', () => {
    const { container } = render(<DocumentoTotais subtotalCentavos={100_000} />)
    const fecho = container.querySelector('[data-slot="total-box"]')
    expect(fecho).not.toBeNull()
    expect(fecho?.closest('.rounded-lg')).toBeNull()
    expect(screen.getByLabelText('Total').firstElementChild?.className).toContain('text-[3rem]')
  })
})

/**
 * O card quiet do mockup 2.0. Era semi-transparente sobre a moldura-mãe da
 * fusão v5 — que saiu com a rodada: a fronteira do documento agora é a COLUNA,
 * que é espaço, a ferramenta mais barata que resolve.
 */
describe('DocumentoBloco', () => {
  it('é card opaco com hairline e sombra macia, sem pano translúcido', () => {
    const { container } = render(
      <DocumentoBloco>
        <span>seções</span>
      </DocumentoBloco>,
    )
    const bloco = container.querySelector('[data-slot="documento-bloco"]')
    expect(bloco?.className).toContain('bg-card')
    expect(bloco?.className).not.toContain('bg-card/55')
    expect(bloco?.className).toContain('rounded-card')
    expect(bloco?.className).toContain('shadow-macia')
  })
})
