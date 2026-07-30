/**
 * Registry único de atalhos (CLAUDE.md): NÃO usar F3-F6 (conflito com browser).
 */
export const SHORTCUTS = {
  /** Abre a janela de busca do contexto atual. */
  busca: 'ctrl+k',
  /** Incluir novo registro na listagem atual. */
  incluir: 'alt+n',
} as const

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
