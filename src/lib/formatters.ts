const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/** Dinheiro trafega em centavos (int); formata só na borda de exibição. */
export function formatMoneyBRL(centavos: number): string {
  return brl.format(centavos / 100)
}
