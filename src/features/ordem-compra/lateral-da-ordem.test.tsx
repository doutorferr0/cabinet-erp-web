import type { OrdemDeCompra } from '@/data/compras-api'
import { andamentoDaOrdem } from '@/features/ordem-compra/lateral-da-ordem'
import { describe, expect, it } from 'vitest'

/**
 * O ANDAMENTO DA ORDEM (Reface 2.0, D18) — a derivação, que é onde mora a
 * decisão.
 *
 * O componente `Andamento` só desenha o que recebe; quem responde "onde este
 * documento está" é esta função, a partir dos campos que a ordem já carrega. Se
 * ela errar o `atual`, a coluna inteira mente com cara de certeza — e é o único
 * lugar do módulo onde o erro não aparece como campo em branco.
 */

const ORDEM: OrdemDeCompra = {
  id: 'oc-1',
  numero: '000123',
  situacao: 'draft',
  fornecedorId: 'f-1',
  fornecedor: 'Metalúrgica Aurora',
  empresaCompradoraId: 't-1',
  empresaCompradora: 'Vertz',
  dataOrdem: '2026-08-30',
  dataEnvio: null,
  dataPrevista: '2026-09-15',
  dataReagendada: null,
  motivoDoReagendamento: null,
  faturamentoMinimoCentavos: null,
  transportadoraId: null,
  transportadora: null,
  condicaoPagamentoId: null,
  condicaoPagamento: null,
  descontoPercentual: 0,
  acrescimoCentavos: 0,
  subtotalCentavos: 0,
  totalCentavos: 0,
  observacao: '',
  itens: [],
}

/** O `atual` é a informação da peça; toda asserção daqui acaba nele. */
function atualDe(ordem: OrdemDeCompra) {
  return andamentoDaOrdem(ordem).find((evento) => evento.estado === 'atual')
}

describe('andamentoDaOrdem', () => {
  it('aponta exatamente um evento como atual, em toda situação', () => {
    const situacoes: OrdemDeCompra['situacao'][] = ['draft', 'sent', 'cancelled']

    for (const situacao of situacoes) {
      const eventos = andamentoDaOrdem({ ...ORDEM, situacao, dataEnvio: '2026-09-01' })
      const atuais = eventos.filter((evento) => evento.estado === 'atual')
      expect(atuais, `situação ${situacao}`).toHaveLength(1)
    }
  })

  it('na ordem em rascunho, o envio é o próximo gesto', () => {
    expect(atualDe(ORDEM)?.id).toBe('enviada')
    // A chegada continua desenhada, apagada: a etapa existe, e some da linha
    // só quando deixa de poder acontecer.
    expect(andamentoDaOrdem(ORDEM).find((e) => e.id === 'chegada')?.estado).toBe('futuro')
  })

  it('na ordem enviada, o documento para na chegada — não há situação de recebida', () => {
    const enviada = { ...ORDEM, situacao: 'sent' as const, dataEnvio: '2026-09-01' }

    expect(atualDe(enviada)?.id).toBe('chegada')
    // O recebimento é outro documento; marcar a chegada como feita aqui
    // inventaria uma conclusão que a ordem não registra.
    expect(andamentoDaOrdem(enviada).find((e) => e.id === 'enviada')?.estado).toBe('feito')
  })

  it('a ordem que nunca foi gravada tem o próprio ato de abrir como etapa corrente', () => {
    expect(atualDe({ ...ORDEM, id: '' })?.id).toBe('aberta')
  })

  it('a chegada reprometida vence a original, e leva o motivo junto', () => {
    const reagendada = {
      ...ORDEM,
      situacao: 'sent' as const,
      dataEnvio: '2026-09-01',
      dataReagendada: '2026-09-28',
      motivoDoReagendamento: 'fornecedor sem estoque',
    }

    const chegada = andamentoDaOrdem(reagendada).find((e) => e.id === 'chegada')
    expect(chegada?.titulo).toBe('Chegada reprometida')
    // Sem o motivo, a data nova aparece como se sempre tivesse sido aquela.
    expect(chegada?.data).toBe('2026-09-28')
    expect(chegada?.motivo).toBe('fornecedor sem estoque')
  })

  it('a ordem cancelada apaga a chegada em vez de prometê-la apagada', () => {
    const cancelada = {
      ...ORDEM,
      situacao: 'cancelled' as const,
      dataEnvio: '2026-09-01',
    }
    const eventos = andamentoDaOrdem(cancelada)

    expect(eventos.map((e) => e.id)).toEqual(['aberta', 'enviada', 'cancelada'])
    expect(atualDe(cancelada)?.id).toBe('cancelada')
  })

  it('a ordem cancelada antes do envio não inventa um envio', () => {
    const eventos = andamentoDaOrdem({ ...ORDEM, situacao: 'cancelled' })

    expect(eventos.map((e) => e.id)).toEqual(['aberta', 'cancelada'])
  })
})
