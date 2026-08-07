import { boletim } from '@/data/boletim'
import { renderRoute } from '@/test/utils'
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * Escopo por compartimento. Sem isso a query pega o vizinho errado: a data de
 * referência também aparece na coluna `Data Ordem`, e `Clientes` também é item
 * da sidebar. Achar o compartimento primeiro é o que o operador faz com o olho.
 */
async function compartimento(legenda: string): Promise<HTMLElement> {
  // O seletor `legend` é parte da espera, não um filtro depois dela: `Cadastros`
  // também é rótulo de grupo da sidebar e casa antes do boletim carregar.
  const legend = await screen.findByText(legenda, { selector: 'legend' })
  const fieldset = legend.closest('fieldset')
  if (!fieldset) throw new Error(`compartimento "${legenda}" não encontrado`)
  return fieldset
}

describe('tela Boletim', () => {
  it('substitui o menu vazio pela apuração do dia', async () => {
    renderRoute('/')

    expect(await screen.findByRole('heading', { name: 'Boletim' })).toBeInTheDocument()
    // A entrada antiga era só "Selecione um módulo no menu lateral".
    expect(screen.queryByText(/Selecione um módulo/)).not.toBeInTheDocument()

    // O cabeçalho nasce junto com o skeleton; a apuração só depois do fetch.
    const dados = boletim()
    await compartimento('Movimento do dia')

    // A data de referência mora na BANDA, junto do nome da tela — é o mesmo
    // arranjo do carimbo e do número nas outras 19 folhas.
    const banda = screen.getByRole('heading', { name: 'Boletim' }).closest('div')
    expect(banda).toHaveTextContent(dados.dataReferenciaBR)
    expect(screen.getByText('Orçamentos do dia')).toBeInTheDocument()
  })

  it('movimento do dia lista os documentos e fecha o total na coluna de valor', async () => {
    renderRoute('/')

    const dados = boletim()
    const bloco = await compartimento('Movimento do dia')

    const totalEsperado = dados.movimento.reduce((s, l) => s + l.valorCentavos, 0)
    const linhaTotal = within(bloco).getByText('Total do dia').closest('tr')
    expect(linhaTotal).not.toBeNull()
    // Valor tabular à direita, formatado só na borda de exibição.
    expect(linhaTotal).toHaveTextContent(
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
        .format(totalEsperado / 100)
        .replace(/ /g, ' '),
    )
  })

  it('ordem parada leva ao documento por clique', async () => {
    const { router, user } = renderRoute('/')

    const dados = boletim()
    const primeira = dados.semEnvio[0]
    if (!primeira) throw new Error('mock sem ordem parada — o teste perdeu o objeto')

    const bloco = await compartimento('Ordens sem Data Envio')
    await user.click(within(bloco).getByRole('link', { name: primeira.codigo }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(primeira.href)
    })
  })

  it('cadastros mostram total e desativados, com travessão quando zero', async () => {
    renderRoute('/')

    const bloco = await compartimento('Cadastros')
    const linha = within(bloco).getByRole('link', { name: 'Clientes' }).closest('tr')
    expect(linha).not.toBeNull()

    const dados = boletim()
    const clientes = dados.cadastros.find((c) => c.nome === 'Clientes')
    if (!clientes) throw new Error('boletim sem linha de Clientes')

    const celulas = within(linha as HTMLElement).getAllByRole('cell')
    expect(celulas[1]).toHaveTextContent(String(clientes.total))
    // Desativado zero vira travessão, não `0` — zero não é dado que se conta.
    expect(celulas[2]).toHaveTextContent(clientes.inativos === 0 ? '—' : String(clientes.inativos))
  })
})
