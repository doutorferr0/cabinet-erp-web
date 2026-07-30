import { PERCENT_ESCALA, formatMoneyBRL } from '@/lib/formatters'
import { useWatch } from 'react-hook-form'

/**
 * Documento = cabeçalho + itens + totais (transcrição §9, padrão 6):
 * ordem de compra, pedido de compra e orçamento.
 *
 * Regra do dinheiro (CLAUDE.md): tudo em centavos (int). Os totais são
 * DERIVADOS dos itens — nunca guardados em paralelo no form state.
 */

interface ItemValorizado {
  quantidade?: string | number | boolean | null
  valorUnitarioCentavos?: string | number | boolean | null
  descontoPercentual?: string | number | boolean | null
}

/** Quantidade aceita até 3 casas (CLAUDE.md) e chega como texto do input. */
export function parseQuantidade(valor: unknown): number {
  if (typeof valor === 'number') return valor
  if (typeof valor !== 'string' || valor.trim() === '') return 0
  const n = Number(valor.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

/** Valor da linha em centavos: quantidade × unitário, menos o desconto da linha. */
export function totalItemCentavos(item: ItemValorizado): number {
  const qtd = parseQuantidade(item.quantidade)
  const unit = typeof item.valorUnitarioCentavos === 'number' ? item.valorUnitarioCentavos : 0
  const bruto = qtd * unit
  const desc = typeof item.descontoPercentual === 'number' ? item.descontoPercentual : 0
  return Math.round(bruto - (bruto * desc) / (PERCENT_ESCALA * 100))
}

/** Soma dos itens do array `name` do form, em centavos. */
export function useSubtotalCentavos(name: string): number {
  const itens = (useWatch({ name }) ?? []) as ItemValorizado[]
  return itens.reduce((acc, item) => acc + totalItemCentavos(item), 0)
}

export interface DocumentoTotaisProps {
  subtotalCentavos: number
  /** Linhas extras entre subtotal e total (Desconto, Acréscimo…). */
  ajustes?: { label: string; valorCentavos: number; sinal: 1 | -1 }[]
}

export function DocumentoTotais({ subtotalCentavos, ajustes = [] }: DocumentoTotaisProps) {
  const total = ajustes.reduce((acc, a) => acc + a.sinal * a.valorCentavos, subtotalCentavos)

  return (
    <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-2 rounded-md border p-3">
      <TotalItem label="SubTotal" valor={subtotalCentavos} />
      {ajustes.map((a) => (
        <TotalItem key={a.label} label={a.label} valor={a.valorCentavos} />
      ))}
      <TotalItem label="Total" valor={total} destaque />
    </div>
  )
}

function TotalItem({
  label,
  valor,
  destaque,
}: {
  label: string
  valor: number
  destaque?: boolean
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-sm text-muted-foreground">{label}:</span>
      <output
        aria-label={label}
        className={destaque ? 'text-lg font-semibold tabular-nums' : 'tabular-nums'}
      >
        {formatMoneyBRL(valor)}
      </output>
    </div>
  )
}
