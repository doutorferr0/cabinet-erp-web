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

/**
 * Inversa da `formatQuantidade`: o que o operador digitou → número do contrato.
 *
 * Existe porque a grade guarda quantidade como TEXTO (é campo de digitação) e o
 * `VariantWriteRequest` a quer como número. Vazio vira `null` — ausência não é
 * zero, e "estoque mínimo 0" é uma regra diferente de "não definido".
 *
 * Texto que não é número devolve `undefined`, não `null`: confundir os dois
 * mandaria ao servidor um "sem valor" que o operador nunca pediu. Quem recebe
 * `undefined` recusa a gravação — ver o schema da grade em `produto-form.tsx`.
 */
export function parseQuantidade(texto: string): number | null | undefined {
  const limpo = texto.trim()
  if (limpo === '') return null
  // pt-BR: ponto separa milhar, vírgula separa decimal.
  const numero = Number(limpo.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(numero) ? numero : undefined
}

/**
 * `timestamptz` do contrato → data e hora legíveis.
 *
 * Separada da `formatDateBR` porque aquela espera `YYYY-MM-DD` e PARTE a
 * string: dar-lhe um instante ISO devolveria o dia grudado na hora. Nasceu local
 * na tela de movimentação de estoque, com a nota "quem precisar disto numa
 * segunda tela promove" — os três relatórios de estoque (#352) são essa segunda
 * tela, e o `asOf` do envelope é o instante da foto.
 *
 * ISO inválido volta INTEIRO em vez de virar "Invalid Date": um carimbo que a
 * tela não entendeu ainda diz mais ao operador do que a palavra do JavaScript
 * para "não entendi".
 */
export function formatInstanteBR(iso: string | null | undefined): string {
  if (!iso) return ''
  const quando = new Date(iso)
  if (Number.isNaN(quando.getTime())) return iso
  return quando.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
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
