import type { CrmPipelineDto } from '@/api/gerado'
import { cadastroActions } from '@/components/cabinet/cadastro-actions'
import { CelulaAtivo } from '@/components/cabinet/celula-ativo'
import { Nome } from '@/components/cabinet/nome'
import { TelaDeListagem } from '@/components/cabinet/tela-de-listagem'
import { data } from '@/data'
import { useDesativarFunil } from '@/data/crm-api'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { useState } from 'react'

export const Route = createFileRoute('/crm/funis/')({
  component: FunisPage,
})

/**
 * Colunas do `CrmPipelineDto`. O `accessorKey` é o nome do campo NO CONTRATO
 * porque ele viaja como `sortBy`, e a whitelist do servidor é em inglês
 * (`name`, `sort`, `active`) — traduzir aqui quebraria a ordenação com 400 ao
 * primeiro clique no cabeçalho.
 *
 * `isDefault` está FORA da whitelist e por isso entra com `enableSorting:
 * false`: coluna que oferece ordenação e responde 400 é pior que coluna que não
 * oferece.
 */
const columns: ColumnDef<CrmPipelineDto>[] = [
  {
    accessorKey: 'name',
    header: 'Funil',
    cell: ({ getValue }) => <Nome>{getValue<string>()}</Nome>,
  },
  {
    accessorKey: 'sort',
    header: 'Ordem',
    cell: ({ getValue }) => getValue<number>(),
  },
  {
    accessorKey: 'isDefault',
    header: 'Padrão',
    enableSorting: false,
    // Oportunidade criada sem escolha explícita cai neste funil — é fato
    // operacional, não enfeite, e por isso tem coluna.
    cell: ({ getValue }) => (getValue<boolean>() ? 'Sim' : '—'),
  },
  {
    accessorKey: 'active',
    header: 'Ativo',
    cell: ({ getValue }) => <CelulaAtivo ativo={getValue<boolean>()} />,
  },
]

function FunisPage() {
  const navigate = useNavigate()

  function abrir(funilId: string, modo?: 'consulta') {
    void navigate({
      to: '/crm/funis/$funilId',
      params: { funilId },
      search: modo ? { modo } : {},
    })
  }

  /**
   * O `Excluir` da barra é DESATIVAÇÃO (padrão 8) e passa por confirmação: o
   * rótulo herdado do legado diz "excluir", o efeito é outro, e quem clica
   * precisa ler qual antes. Funil desativado some da escolha de funil novo; as
   * oportunidades que já estão nele continuam abrindo.
   */
  const [aDesativar, setADesativar] = useState<CrmPipelineDto | null>(null)
  const desativar = useDesativarFunil()

  const actions = cadastroActions<CrmPipelineDto>({
    entidade: 'funil',
    onIncluir: () => abrir('novo'),
    // Sem semear cache com a LINHA: o formulário edita funil + colunas, e a
    // linha da listagem só tem o cabeçalho. Semear metade do registro faria a
    // grade de estágios abrir vazia e o `Gravar` recriar coluna que existe.
    onAbrir: (f) => abrir(f.id),
    onConsultar: (f) => abrir(f.id, 'consulta'),
    onExcluir: (f) => {
      desativar.reset()
      setADesativar(f)
    },
  })

  return (
    <TelaDeListagem
      titulo="Cadastro de Funis"
      columns={columns}
      queryKey={['crm', 'funis', 'listagem']}
      fetcher={data.funis.list}
      actions={actions}
      desativacao={{
        entidade: 'funil',
        registro: aDesativar,
        nome: (f) => f.name,
        ativo: (f) => f.active,
        pendente: desativar.isPending,
        erro: desativar.error,
        onFechar: () => setADesativar(null),
        onConfirmar: () => {
          if (!aDesativar) return
          desativar.mutate(aDesativar, { onSuccess: () => setADesativar(null) })
        },
      }}
    />
  )
}
