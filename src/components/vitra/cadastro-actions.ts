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
  /**
   * Abre o registro selecionado. **Opcional**: recurso cujo backend ainda não
   * publicou detalhe por id não tem como abrir, e aí vem `motivoSemAbrir`.
   */
  onAbrir?: (row: T) => void
  /**
   * Por que `Alterar`/`Consul.` estão desabilitados. Some quando o endpoint de
   * detalhe existir. Desabilitar sem dizer o motivo faria o operador reportar
   * defeito — e ele estaria certo em achar que é um.
   */
  motivoSemAbrir?: string
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
  motivoSemAbrir,
  onConsultar,
  onExcluir,
  onImprimir,
  onFiltro,
}: CadastroActionsOptions<T>): DataTableAction<T>[] {
  const consultar = onConsultar ?? onAbrir
  // As duas ações que precisam do registro inteiro. `Incluir` continua: abrir em
  // branco não depende de detalhe do servidor.
  const semDetalhe = onAbrir === undefined
  return [
    { id: 'filtro', label: 'Filtro', onClick: onFiltro ?? focarBusca },
    { id: 'incluir', label: 'Incluir', onClick: onIncluir },
    {
      id: 'alterar',
      label: 'Alterar',
      needsSelection: true,
      disabled: semDetalhe,
      ...(motivoSemAbrir && semDetalhe ? { title: motivoSemAbrir } : {}),
      onClick: (row) => row && onAbrir?.(row),
    },
    {
      id: 'consultar',
      label: 'Consul.',
      needsSelection: true,
      disabled: semDetalhe && onConsultar === undefined,
      ...(motivoSemAbrir && semDetalhe && onConsultar === undefined
        ? { title: motivoSemAbrir }
        : {}),
      onClick: (row) => row && consultar?.(row),
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
