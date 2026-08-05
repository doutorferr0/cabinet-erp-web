import { Button } from '@/components/ui/button'
import { BandaDeIdentidade } from '@/components/vitra/banda-identidade'
import { cadastroActions } from '@/components/vitra/cadastro-actions'
import { VitraDataTable } from '@/components/vitra/data-table'
import { data } from '@/data'
import { formatDateBR } from '@/lib/formatters'
import type { Orcamento } from '@/mocks/orcamentos'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'

export const Route = createFileRoute('/vendas/orcamentos/')({
  component: OrcamentosPage,
})

/** Colunas LITERAIS da transcrição §8.1. */
const columns: ColumnDef<Orcamento>[] = [
  { accessorKey: 'numero', header: 'Número' },
  { accessorKey: 'serie', header: 'Série' },
  { accessorKey: 'cliente', header: 'Cliente' },
  {
    accessorKey: 'descricaoObra',
    header: 'Descrição da Obra',
    cell: ({ getValue }) => getValue<string>() || '—',
  },
  {
    accessorKey: 'dataEmissao',
    header: 'Data Emissão',
    cell: ({ getValue }) => formatDateBR(getValue<string | null>()),
  },
  {
    accessorKey: 'dataValidade',
    header: 'Data Validade',
    cell: ({ getValue }) => formatDateBR(getValue<string | null>()),
  },
]

/** Botões do rodapé da listagem — §8.1 (telas próprias ainda não capturadas). */
const BOTOES_RODAPE = [
  'Produtos Desativados',
  'Alterar Limites',
  'Atualizar Valores',
  'Margem de Lucro',
  'Quadro',
] as const

function OrcamentosPage() {
  const navigate = useNavigate()

  function abrir(orcamentoId: string, modo?: 'consulta') {
    void navigate({
      to: '/vendas/orcamentos/$orcamentoId',
      params: { orcamentoId },
      search: modo ? { modo } : {},
    })
  }

  const actions = cadastroActions<Orcamento>({
    entidade: 'orçamento',
    onIncluir: () => abrir('novo'),
    onAbrir: (o) => abrir(String(o.id)),
    onConsultar: (o) => abrir(String(o.id), 'consulta'),
  })

  // Orçamento não se apaga, se cancela (§8.1).
  const actionsOrcamento = actions.map((a) =>
    a.id === 'excluir'
      ? {
          ...a,
          label: 'Cancelar',
          onClick: (o: Orcamento | null) => console.info('[mock] Cancelar orçamento', o),
        }
      : a,
  )

  return (
    <div className="flex flex-col gap-4">
      <BandaDeIdentidade titulo="Orçamento" />
      <VitraDataTable
        columns={columns}
        queryKey={['orcamentos']}
        fetcher={data.orcamentos.list}
        actions={actionsOrcamento}
      />
      <div className="flex flex-wrap gap-2">
        {BOTOES_RODAPE.map((label) => (
          <Button
            key={label}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => console.info(`[mock] ${label}`)}
          >
            {label}
          </Button>
        ))}
      </div>
    </div>
  )
}
