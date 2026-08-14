import type { QuoteDto } from '@/api/gerado'
import { cadastroActions } from '@/components/cabinet/cadastro-actions'
import { TelaDeListagem } from '@/components/cabinet/tela-de-listagem'
import { Button } from '@/components/ui/button'
import { data } from '@/data'
import type { CampoFiltravel } from '@/lib/filtro-de-consulta'
import { formatDateBR } from '@/lib/formatters'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { CalendarDays, HardHat, Hash, User } from 'lucide-react'

export const Route = createFileRoute('/vendas/orcamentos/')({
  component: OrcamentosPage,
})

/**
 * Colunas LITERAIS da transcrição §8.1 — com o `accessorKey` em INGLÊS.
 *
 * O rótulo que o operador lê continua o da transcrição; o que muda é a CHAVE,
 * que é o nome que a whitelist de `sortBy` do servidor aceita. Traduzir a chave
 * quebraria a ordenação com 400 ao primeiro clique no cabeçalho (padrão 1).
 */
const columns: ColumnDef<QuoteDto>[] = [
  { accessorKey: 'number', header: 'Número' },
  // `series` não está na whitelist do contrato: a coluna aparece e não ordena,
  // o que é melhor que um cabeçalho clicável que responde 400.
  { accessorKey: 'series', header: 'Série', enableSorting: false },
  { accessorKey: 'customerName', header: 'Cliente' },
  {
    accessorKey: 'projectName',
    header: 'Descrição da Obra',
    cell: ({ getValue }) => getValue<string | null>() || '—',
  },
  {
    accessorKey: 'issuedAt',
    header: 'Data Emissão',
    cell: ({ getValue }) => formatDateBR(getValue<string | null>()),
  },
  {
    accessorKey: 'expiresAt',
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

function RodapeDeOrcamento() {
  return (
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
  )
}

/**
 * Campos filtráveis da §8.1. **Primeira listagem a filtrar por DATA**, e é a
 * consulta que uma tela de documento pede antes de qualquer outra: "os
 * orçamentos de agosto", "o que vence esta semana".
 *
 * A data usa `<input type="date">` nativo — o dado é ISO (`yyyy-mm-dd`), que é
 * exatamente o que o input fala, e o calendário vem do sistema operacional.
 *
 * `Série` fica de fora: é o mesmo valor em toda linha, e filtro por campo de
 * valor único não estreita nada. Valor e desconto também: trafegam em unidade
 * que o operador não digita (centavos, percentual com 4 casas implícitas) e não
 * há variante que converta na borda.
 *
 * Recurso HTTP desde a #134: quem responde é `/api/quotes`, e os `id` daqui
 * são os nomes do DTO — o contrato publica `filters` com a mesma whitelist do
 * `sortBy`, e campo fora dela é barrado na fronteira antes de sair.
 */
const camposFiltraveis: readonly CampoFiltravel[] = [
  { id: 'number', rotulo: 'Número', variante: 'text', icon: Hash, placeholder: 'Ex.: 21653' },
  {
    id: 'customerName',
    rotulo: 'Cliente',
    variante: 'text',
    icon: User,
    placeholder: 'Parte do nome…',
  },
  {
    id: 'projectName',
    rotulo: 'Descrição da Obra',
    variante: 'text',
    icon: HardHat,
    placeholder: 'Parte da descrição…',
  },
  { id: 'issuedAt', rotulo: 'Data Emissão', variante: 'date', icon: CalendarDays },
  { id: 'expiresAt', rotulo: 'Data Validade', variante: 'date', icon: CalendarDays },
]

function OrcamentosPage() {
  const navigate = useNavigate()

  function abrir(orcamentoId: string, modo?: 'consulta') {
    void navigate({
      to: '/vendas/orcamentos/$orcamentoId',
      params: { orcamentoId },
      search: modo ? { modo } : {},
    })
  }

  const actions = cadastroActions<QuoteDto>({
    entidade: 'orçamento',
    onIncluir: () => abrir('novo'),
    onAbrir: (o) => abrir(o.id),
    onConsultar: (o) => abrir(o.id, 'consulta'),
  })

  // Orçamento não se apaga, se cancela (§8.1).
  const actionsOrcamento = actions.map((a) =>
    a.id === 'excluir'
      ? {
          ...a,
          label: 'Cancelar',
          onClick: (o: QuoteDto | null) => console.info('[mock] Cancelar orçamento', o),
        }
      : a,
  )

  return (
    <TelaDeListagem
      titulo="Orçamento"
      columns={columns}
      queryKey={['orcamentos']}
      fetcher={data.orcamentos.list}
      actions={actionsOrcamento}
      filtros={camposFiltraveis}
      rodape={<RodapeDeOrcamento />}
    />
  )
}
