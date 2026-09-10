export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, '')
}

export function formatarCep(valor: string): string {
  const digitos = somenteDigitos(valor).slice(0, 8)
  return digitos.length > 5 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : digitos
}
