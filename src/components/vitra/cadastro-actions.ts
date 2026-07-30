import type { DataTableAction } from '@/components/vitra/data-table'

/**
 * Barra de ações padrão das listagens — transcrição §9, padrão 4:
 * `Filtro · Incluir · Alterar · Consul. · Excluir · Imprimir`, idêntica em toda tela.
 *
 * Fábrica em vez de componente: a linha selecionada vive dentro da
 * `VitraDataTable`, que já renderiza os botões a partir da prop `actions`.
 * A tela só entrega os handlers — a navegação tipada do router fica com ela.
 */
export interface CadastroActionsOptions<T> {
  /** Nome da entidade nas mensagens mock (ex.: 'cliente'). */
  entidade: string
  onIncluir: () => void
  onAbrir: (row: T) => void
  /** Consulta somente-leitura (padrão 8). Sem tela dedicada ainda: cai em `onAbrir`. */
  onConsultar?: (row: T) => void
  /** Desativação lógica — nunca exclusão real na UI de cadastros. */
  onExcluir?: (row: T) => void
  onImprimir?: () => void
  onFiltro?: () => void
}

function focarBusca() {
  document.querySelector<HTMLInputElement>('input[aria-label="Busca"]')?.focus()
}

export function cadastroActions<T>({
  entidade,
  onIncluir,
  onAbrir,
  onConsultar,
  onExcluir,
  onImprimir,
  onFiltro,
}: CadastroActionsOptions<T>): DataTableAction<T>[] {
  const consultar = onConsultar ?? onAbrir
  return [
    { id: 'filtro', label: 'Filtro', onClick: onFiltro ?? focarBusca },
    { id: 'incluir', label: 'Incluir', onClick: onIncluir },
    {
      id: 'alterar',
      label: 'Alterar',
      needsSelection: true,
      onClick: (row) => row && onAbrir(row),
    },
    {
      id: 'consultar',
      label: 'Consul.',
      needsSelection: true,
      onClick: (row) => row && consultar(row),
    },
    {
      id: 'excluir',
      label: 'Excluir',
      needsSelection: true,
      variant: 'destructive',
      onClick: (row) =>
        row &&
        (onExcluir
          ? onExcluir(row)
          : console.info(`[mock] Excluir ${entidade} (desativação lógica)`, row)),
    },
    {
      id: 'imprimir',
      label: 'Imprimir',
      onClick: onImprimir ?? (() => console.info(`[mock] Imprimir listagem de ${entidade}`)),
    },
  ]
}
