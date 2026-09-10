import { Andamento, type EventoDeAndamento } from '@/components/cabinet/andamento'
import { CartaoLateral } from '@/components/cabinet/cartao-lateral'
import { formatDateBR } from '@/lib/formatters'
import type { Orcamento } from '@/mocks/orcamentos'

/**
 * A LATERAL do orçamento (D19, #487) — para quem, em que pé, até quando.
 *
 * Cliente, obra, consultor e profissional indicado eram quatro campos de
 * leitura no topo do formulário, indistinguíveis dos que se preenchem. Eles não
 * se editam ali (o cliente do orçamento se troca por lookup, no bloco de
 * identificação) e são exatamente o que o operador consulta enquanto mexe nos
 * itens: `lilac`, o tint de identidade.
 *
 * ## O andamento do orçamento tem DUAS pontas e nenhum log
 *
 * `QuoteDto.status` só distingue `active` de `cancelled` — não existe "enviado"
 * nem "aprovado" no contrato. O que o documento guarda de verdade é
 * `dataEmissao`, `dataValidade`, `dataFechamento` e `cancelado`, e é sobre isso
 * que a timeline se apoia. Inventar uma etapa `Enviado ao cliente` aqui daria
 * uma posição a um estado que o servidor não conhece: na primeira recarga a
 * etapa voltaria para trás, porque nada a guardou.
 *
 * A VALIDADE ganha cartão próprio (`sand`) por ser o único dado do orçamento
 * que muda de significado com o relógio: passada a data, o documento continua
 * `active` e não vale mais como proposta.
 */
export function andamentoDoOrcamento(orcamento: Orcamento): EventoDeAndamento[] {
  const novo = !orcamento.id
  const eventos: EventoDeAndamento[] = [
    {
      id: 'emitido',
      titulo: 'Orçamento emitido',
      data: orcamento.dataEmissao,
      estado: novo ? 'atual' : 'feito',
    },
  ]

  if (orcamento.cancelado) {
    eventos.push({ id: 'cancelado', titulo: 'Orçamento cancelado', estado: 'atual' })
    return eventos
  }

  if (orcamento.dataFechamento) {
    eventos.push({
      id: 'fechado',
      titulo: 'Fechado com o cliente',
      data: orcamento.dataFechamento,
      estado: 'atual',
    })
    return eventos
  }

  eventos.push({
    id: 'validade',
    titulo: 'Validade da proposta',
    data: orcamento.dataValidade,
    estado: novo ? 'futuro' : 'atual',
  })
  return eventos
}

export function LateralDoOrcamento({ orcamento }: { orcamento: Orcamento }) {
  const revisao =
    orcamento.revisao > 0
      ? `Revisão ${orcamento.revisao}${
          orcamento.revisaoDeNumero ? ` · de ${orcamento.revisaoDeNumero}` : ''
        }`
      : 'Documento original'

  return (
    <aside aria-label="Apoio do orçamento" className="flex flex-col gap-4">
      <CartaoLateral
        titulo="Cliente"
        tint="lilac"
        pares={[
          { rotulo: 'Cliente', valor: orcamento.cliente || '—' },
          { rotulo: 'Obra', valor: orcamento.descricaoObra || '—' },
          { rotulo: 'Consultor', valor: orcamento.consultor || '—' },
          { rotulo: 'Indicado por', valor: orcamento.profissionalExterno || '—' },
        ]}
      />

      <CartaoLateral titulo="Andamento" tint="mint">
        <Andamento eventos={andamentoDoOrcamento(orcamento)} />
      </CartaoLateral>

      <CartaoLateral
        titulo="Validade"
        tint="sand"
        pares={[
          {
            rotulo: 'Vale até',
            // Data em mono: é dado que se compara com hoje (§Hierarquia).
            valor: <span className="t-dado">{formatDateBR(orcamento.dataValidade) || '—'}</span>,
          },
          { rotulo: 'Versão', valor: revisao },
        ]}
      />
    </aside>
  )
}
