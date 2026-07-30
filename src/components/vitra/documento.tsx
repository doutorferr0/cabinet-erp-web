import { Stamp, type StampTom } from '@/components/vitra/stamp'
import { PERCENT_ESCALA, formatMoneyBRL } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { useWatch } from 'react-hook-form'

/**
 * Documento = cabeçalho + itens + totais (transcrição §9, padrão 6):
 * ordem de compra, pedido de compra e orçamento.
 *
 * Regra do dinheiro (CLAUDE.md): tudo em centavos (int). Os totais são
 * DERIVADOS dos itens — nunca guardados em paralelo no form state.
 */

export interface DocumentoHeaderProps {
  /** Título literal da transcrição, em Headline (sans 600, 1.25rem). */
  titulo: string
  /** Modo da tela (`— Incluir`, `— Consulta`), junto ao título. */
  modo?: string | undefined
  /**
   * Número do documento — a âncora visual do cabeçalho: Número do Documento
   * (mono 600, 1.25rem, tracking -0.01em) à direita, como o `591890` da
   * comanda. Ausente em documento novo.
   */
  numero?: string | number | undefined
  /** Carimbo de situação ao lado do número — só quando a enumeração real chegar. */
  stamp?: { tom: StampTom; label: string } | undefined
}

/**
 * Cabeçalho de documento (DESIGN.md §DocumentoHeader): fileira única com o
 * título à esquerda e número + carimbo à direita, régua forte fechando o
 * bloco. É a anatomia do invoice e da comanda: quem é o documento, qual o
 * número, em que situação está — antes de qualquer campo.
 */
export function DocumentoHeader({ titulo, modo, numero, stamp }: DocumentoHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-rule-strong pb-3">
      <h1 className="text-xl font-semibold">
        {titulo}
        {modo ? ` ${modo}` : ''}
      </h1>
      {(numero !== undefined || stamp) && (
        <div className="flex items-center gap-3">
          {numero !== undefined && (
            <span
              data-slot="documento-numero"
              className="font-mono text-xl font-semibold tracking-[-0.01em] tabular-nums"
            >
              {numero}
            </span>
          )}
          {stamp && <Stamp tom={stamp.tom} label={stamp.label} />}
        </div>
      )}
    </header>
  )
}

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
    // Tira alinhada à direita, borda em Régua, canto 4px; pares separados por 24px.
    <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-2 rounded-lg border p-3">
      <TotalItem label="SubTotal" valor={subtotalCentavos} />
      {ajustes.map((a) => (
        <TotalItem key={a.label} label={a.label} valor={a.valorCentavos} />
      ))}
      {/* Total é o único em Title e vem separado por régua forte — o GRAND TOTAL do invoice. */}
      <TotalItem
        label="Total"
        valor={total}
        destaque
        className="border-l border-rule-strong pl-6"
      />
    </div>
  )
}

function TotalItem({
  label,
  valor,
  destaque,
  className,
}: {
  label: string
  valor: number
  destaque?: boolean
  className?: string
}) {
  return (
    <div className={cn('flex items-baseline gap-2', className)}>
      {/* Rótulo em Meta (mono, caixa alta pequena); valor tabular. */}
      <span className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        {label}:
      </span>
      <output
        aria-label={label}
        className={destaque ? 'text-lg font-semibold tabular-nums' : 'tabular-nums'}
      >
        {formatMoneyBRL(valor)}
      </output>
    </div>
  )
}
