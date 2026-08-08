import { BandaDeIdentidade } from '@/components/cabinet/banda-identidade'
import { ConfirmarDesativacao } from '@/components/cabinet/confirmar-desativacao'
import type { DataTableAction } from '@/components/cabinet/data-table'
import { VitraDataTable } from '@/components/cabinet/data-table'
import { mensagemDoErro } from '@/lib/erros'
import type { TableFetcher } from '@/lib/table-query'
import type { ColumnDef } from '@tanstack/react-table'
import type { ReactNode } from 'react'

export interface DesativacaoProps<T> {
  entidade: string
  /** Registro marcado para desativar; `null` fecha o diálogo. */
  registro: T | null
  nome: (row: T) => string
  ativo: (row: T) => boolean
  pendente: boolean
  erro: unknown
  onFechar: () => void
  onConfirmar: () => void
}

export interface TelaDeListagemProps<T> {
  titulo: string
  /** Texto pequeno ao lado do título (ex.: "Banco Principal" em Produtos). */
  contexto?: string
  columns: ColumnDef<T>[]
  queryKey: readonly unknown[]
  fetcher: TableFetcher<T>
  actions: DataTableAction<T>[]
  desativacao?: DesativacaoProps<T>
  /** Conteúdo extra abaixo da tabela (os botões de rodapé do Orçamento). */
  rodape?: ReactNode
}

/**
 * Esqueleto comum às listagens de cadastro e documento (transcrição §9,
 * padrões 4 e 7): banda de identidade, barra de ações, tabela e — quando o
 * recurso desativa — o diálogo de confirmação. `cadastroActions` e
 * `VitraDataTable` continuam sendo quem decide o comportamento; este
 * componente só compõe.
 */
export function TelaDeListagem<T>({
  titulo,
  contexto,
  columns,
  queryKey,
  fetcher,
  actions,
  desativacao,
  rodape,
}: TelaDeListagemProps<T>) {
  return (
    <div className="flex flex-col gap-4">
      <BandaDeIdentidade titulo={titulo} {...(contexto ? { contexto } : {})} />
      <VitraDataTable columns={columns} queryKey={queryKey} fetcher={fetcher} actions={actions} />
      {rodape}
      {desativacao?.registro ? (
        <ConfirmarDesativacao
          entidade={desativacao.entidade}
          nome={desativacao.nome(desativacao.registro)}
          ativo={desativacao.ativo(desativacao.registro)}
          aberto
          pendente={desativacao.pendente}
          erro={mensagemDoErro(desativacao.erro, 'Não foi possível desativar. Tente de novo.')}
          onFechar={desativacao.onFechar}
          onConfirmar={desativacao.onConfirmar}
        />
      ) : null}
    </div>
  )
}
