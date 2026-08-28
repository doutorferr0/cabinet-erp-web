import { instalarServidor, json } from '@/test/servidor'
import { renderRoute, respostaSessao, respostaVinculos } from '@/test/utils'
import { screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * O FORMULÁRIO DO TÍTULO — o que sai daqui quando o operador grava.
 *
 * O que este arquivo trava é o CORPO: `PUT`/`POST` substituem o título inteiro,
 * parcelas junto, e uma parcela que não sai no corpo é parcela apagada. Medir a
 * tela sem olhar o corpo deixaria passar o pior defeito possível deste
 * formulário — gravar um título com menos parcelas do que a grade mostra.
 */

const FORNECEDOR = {
  id: 'parc-1',
  code: 'F-001',
  legalName: 'EVOLED ILUMINACAO LTDA',
  tradeName: null,
  document: null,
  active: true,
}

function servidor() {
  return instalarServidor({
    '/auth/me': () => respostaSessao(),
    '/auth/tenants': () => respostaVinculos(),
    '/api/partners': () => json({ rows: [FORNECEDOR], total: 1 }),
    '/api/financial-titles': () =>
      json({ id: 'tit-9', number: '9', direction: 'payable', installments: [] }, 201),
  })
}

afterEach(() => vi.unstubAllGlobals())

describe('o título novo', () => {
  it('nasce com UMA parcela — título à vista é título de uma, não de nenhuma', async () => {
    const falso = servidor()
    renderRoute('/financeiro/pagar/titulos/novo', falso.fetch)

    const grade = await screen.findByRole('table')
    // Uma linha de dado, e o cabeçalho.
    expect(within(grade).getByLabelText('Vencimento linha 1')).toBeInTheDocument()
    expect(within(grade).queryByLabelText('Vencimento linha 2')).not.toBeInTheDocument()
  })

  it('grava as DUAS parcelas da grade, renumeradas por posição', async () => {
    const falso = servidor()
    const { user } = renderRoute('/financeiro/pagar/titulos/novo', falso.fetch)

    // A parte vem da BUSCA e não de campo livre: quem manda é o `partnerId`, e
    // o servidor confere o papel dele contra a direção do título.
    await user.click(await screen.findByRole('button', { name: /Buscar/i }))
    // A janela de busca (padrão 5) marca a linha e CONFIRMA — é a mesma
    // `VitraDataTable` por cima da tela, com seleção e retorno.
    await user.click(await screen.findByText('EVOLED ILUMINACAO LTDA'))
    await user.click(await screen.findByRole('button', { name: /Selecionar/i }))

    // Sem escopo de tabela: o diálogo de busca também monta uma, e o rótulo da
    // célula já é único por linha.
    await user.type(await screen.findByLabelText('Valor linha 1'), '150000')
    await user.click(screen.getByRole('button', { name: /Incluir parcela/i }))
    await user.type(await screen.findByLabelText('Valor linha 2'), '150000')

    await user.click(screen.getByRole('button', { name: /^Gravar$/ }))

    // Uma recusa de validação aparece na tela, e sem esta linha ela viraria só
    // "o POST não saiu" — que não diz nada sobre o motivo.
    expect(screen.queryByText(/Escolha a parte do título/)).not.toBeInTheDocument()

    const chamadas = falso.em('/api/financial-titles').filter((c) => c.metodo === 'POST')
    expect(chamadas).toHaveLength(1)
    const corpo = chamadas[0]?.corpo as {
      direction: string
      partnerId: string
      installments: { sequence: number; amountCents: number }[]
    }
    expect(corpo.direction).toBe('payable')
    expect(corpo.partnerId).toBe('parc-1')
    // Duas linhas na grade, duas parcelas no corpo — e a sequência sai da
    // POSIÇÃO, porque o servidor exige 1..N sem buraco e quem excluiu a linha
    // do meio não deveria ter de renumerar à mão.
    expect(corpo.installments.map((p) => p.sequence)).toEqual([1, 2])
    expect(corpo.installments.map((p) => p.amountCents)).toEqual([150_000, 150_000])
  })
})
