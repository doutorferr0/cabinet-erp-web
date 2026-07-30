/**
 * Registry único de atalhos (CLAUDE.md): NÃO usar F3-F6 (conflito com browser).
 */
export const SHORTCUTS = {
  /** Abre a janela de busca do contexto atual. */
  busca: 'ctrl+k',
  /** Incluir novo registro na listagem atual. */
  incluir: 'alt+n',
  /** Inserir produto no documento — F6 no legado (§7.4, §8.2). */
  produto: 'alt+p',
  /** Inserir ambiente no orçamento — F5 no legado (§8.2). */
  ambiente: 'alt+a',
  /** Buscar transportadora na ordem de compra — F4 no legado (§7.2). */
  transportadora: 'alt+t',
  /** Mostrar imagem do produto no orçamento — F4 no legado (§8.2). */
  imagemProduto: 'alt+i',
} as const

/** Rótulo do atalho para exibir junto do botão (o legado mostra "F6", aqui "Alt+P"). */
export function shortcutLabel(combo: string): string {
  return combo
    .split('+')
    .map((p) => (p.length === 1 ? p.toUpperCase() : p.charAt(0).toUpperCase() + p.slice(1)))
    .join('+')
}

function matches(e: KeyboardEvent, combo: string): boolean {
  const parts = combo.split('+')
  const key = parts[parts.length - 1]
  return (
    e.key.toLowerCase() === key &&
    e.ctrlKey === parts.includes('ctrl') &&
    e.altKey === parts.includes('alt') &&
    e.shiftKey === parts.includes('shift') &&
    e.metaKey === parts.includes('meta')
  )
}

/** Liga um atalho do registry a um handler enquanto o componente está montado. */
export function bindShortcut(combo: string, handler: () => void): () => void {
  const listener = (e: KeyboardEvent) => {
    if (matches(e, combo)) {
      e.preventDefault()
      handler()
    }
  }
  window.addEventListener('keydown', listener)
  return () => window.removeEventListener('keydown', listener)
}
