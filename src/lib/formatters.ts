const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/** Dinheiro trafega em centavos (int); formata só na borda de exibição. */
export function formatMoneyBRL(centavos: number): string {
  return brl.format(centavos / 100)
}

/**
 * Quantidade: até 3 casas (CLAUDE.md; `numeric(14,3)` no schema do backend),
 * separador pt-BR. `null` vira vazio — ausência não é zero.
 */
export function formatQuantidade(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return ''
  return valor.toLocaleString('pt-BR', { maximumFractionDigits: 3 })
}

/** Datas: ISO (yyyy-mm-dd) no dado, pt-BR na exibição (CLAUDE.md). */
export function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return ''
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

/**
 * Percentual guardado como int com 4 casas implícitas (10000 = 1%).
 * A transcrição §8.2 mostra `Desconto 0,0010 %` — 4 casas é o formato do legado.
 */
export const PERCENT_ESCALA = 10_000

export function formatPercent(valor: number): string {
  return (valor / PERCENT_ESCALA).toLocaleString('pt-BR', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  })
}
