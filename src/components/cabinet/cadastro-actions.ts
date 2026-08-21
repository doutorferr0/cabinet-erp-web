import type { DataTableAction } from '@/components/cabinet/data-table'
import { Ban, Eye, Filter, Pencil, Plus, Printer } from 'lucide-react'

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
  /**
   * Por que `Excluir` está desabilitado. Existe porque nem todo recurso
   * desativa: a oportunidade do CRM não tem `active` nem `DELETE` no contrato —
   * perder um negócio é mudar de etapa, com motivo. O botão fica na barra
   * (§9 padrão 4 é a mesma em toda tela) e DIZ por que não serve, em vez de
   * fingir uma ação que o servidor recusaria.
   */
  motivoSemExcluir?: string
  /**
   * Quando `true`, as ações de ESCRITA (`Incluir`, `Alterar`, `Excluir`) são
   * desabilitadas. A tela passa o resultado de `useReadOnlyPorPapel(familia)`;
   * a família em si fica fora desta fábrica porque `cadastroActions` não é um
   * hook.
   */
  readOnly?: boolean
  /** Motivo exibido quando `readOnly` desabilita uma ação. */
  motivoReadOnly?: string
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
  motivoSemExcluir,
  readOnly,
  motivoReadOnly,
  onImprimir,
  onFiltro,
}: CadastroActionsOptions<T>): DataTableAction<T>[] {
  const consultar = onConsultar ?? onAbrir
  // As duas ações que precisam do registro inteiro. `Incluir` continua: abrir em
  // branco não depende de detalhe do servidor.
  const semDetalhe = onAbrir === undefined
  const tituloReadOnly = motivoReadOnly ?? 'O papel deste vínculo não permite alterações.'
  return [
    { id: 'filtro', label: 'Filtro', icon: Filter, onClick: onFiltro ?? focarBusca },
    {
      id: 'incluir',
      label: 'Incluir',
      icon: Plus,
      disabled: !!readOnly,
      ...(readOnly ? { title: tituloReadOnly } : {}),
      onClick: onIncluir,
    },
    {
      id: 'alterar',
      label: 'Alterar',
      icon: Pencil,
      needsSelection: true,
      disabled: semDetalhe || !!readOnly,
      ...(semDetalhe || readOnly
        ? {
            title: semDetalhe
              ? (motivoSemAbrir ?? 'Abertura de registro não disponível.')
              : tituloReadOnly,
          }
        : {}),
      onClick: (row) => row && onAbrir?.(row),
    },
    {
      id: 'consultar',
      label: 'Consul.',
      icon: Eye,
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
      // PROIBIDA a lixeira, e não é preciosismo: na UI de cadastro nada é
      // apagado — `Excluir` desativa (padrão 8), e o próprio diálogo de
      // confirmação diz isso. Uma lixeira ao lado do rótulo prometeria o
      // contrário do que o botão faz, e prometeria em desenho, que é o que o
      // olho lê primeiro. `Ban` é o círculo cortado: "deixa de valer".
      icon: Ban,
      needsSelection: true,
      variant: 'destructive',
      ...(motivoSemExcluir || readOnly
        ? {
            disabled: true,
            title: readOnly ? tituloReadOnly : motivoSemExcluir,
          }
        : {}),
      onClick: (row) =>
        row &&
        (onExcluir
          ? onExcluir(row)
          : console.info(`[mock] Excluir ${entidade} (desativação lógica)`, row)),
    },
    {
      id: 'imprimir',
      label: 'Imprimir',
      icon: Printer,
      onClick: onImprimir ?? (() => console.info(`[mock] Imprimir listagem de ${entidade}`)),
    },
  ]
}
