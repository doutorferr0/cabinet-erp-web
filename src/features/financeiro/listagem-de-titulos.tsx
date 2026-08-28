import type { FinancialTitleDto } from '@/api/gerado'
import { cadastroActions } from '@/components/cabinet/cadastro-actions'
import { TelaDeListagem } from '@/components/cabinet/tela-de-listagem'
import { type Direcao, titulosFinanceiros, useCancelarTitulo } from '@/data/financeiro-api'
import { formatDateBR, formatMoneyBRL } from '@/lib/formatters'
import { useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { useMemo, useState } from 'react'

/**
 * A LISTAGEM DE TÍTULOS — `GET /api/financial-titles`.
 *
 * Irmã da agenda, e responde outra pergunta: aqui a linha é a CONTA inteira
 * ("quanto devo a este fornecedor, e quanto já paguei"), lá é o vencimento
 * ("o que vence hoje"). É por isso que `dueDate` não ordena esta lista — o
 * título de cinco parcelas tem cinco vencimentos.
 *
 * Ela não entra no menu: o dia a dia é a agenda, e um segundo item chamado
 * "Títulos a Pagar" ao lado de "Contas a Pagar" faria o operador escolher entre
 * dois nomes para a mesma dívida. Chega-se aqui pelo cabeçalho da agenda.
 */

const ROTULO_DA_SITUACAO: Record<string, string> = {
  open: 'Em aberto',
  settled: 'Quitado',
  cancelled: 'Cancelado',
}

function colunas(direcao: Direcao): ColumnDef<FinancialTitleDto>[] {
  return [
    { accessorKey: 'number', header: 'Número' },
    {
      accessorKey: 'documentNumber',
      header: 'Documento',
      // Fora da whitelist de `sortBy` do contrato — a coluna mostra e não ordena.
      enableSorting: false,
      cell: ({ getValue }) => getValue<string | null>() || '—',
    },
    {
      accessorKey: 'partnerName',
      header: direcao === 'payable' ? 'Fornecedor' : 'Cliente',
    },
    {
      accessorKey: 'issuedAt',
      header: 'Emissão',
      cell: ({ getValue }) => (
        <span className="tabular-nums">{formatDateBR(getValue<string>())}</span>
      ),
    },
    {
      accessorKey: 'totalCents',
      header: 'Total',
      cell: ({ getValue }) => (
        <span className="block text-right tabular-nums">{formatMoneyBRL(getValue<number>())}</span>
      ),
    },
    {
      accessorKey: 'openCents',
      header: 'Em aberto',
      cell: ({ getValue }) => (
        <span className="block text-right tabular-nums">{formatMoneyBRL(getValue<number>())}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Situação',
      cell: ({ getValue }) => ROTULO_DA_SITUACAO[getValue<string>()] ?? getValue<string>(),
    },
  ]
}

export function ListagemDeTitulos({ direcao }: { direcao: Direcao }) {
  const navigate = useNavigate()
  const [paraCancelar, setParaCancelar] = useState<FinancialTitleDto | null>(null)
  const cancelar = useCancelarTitulo()
  const provider = useMemo(() => titulosFinanceiros(direcao), [direcao])
  const raiz = direcao === 'payable' ? '/financeiro/pagar' : '/financeiro/receber'

  const acoes = cadastroActions<FinancialTitleDto>({
    entidade: 'título',
    onIncluir: () => void navigate({ to: `${raiz}/titulos/novo` }),
    onAbrir: (t) => void navigate({ to: `${raiz}/titulos/${t.id}` }),
    onConsultar: (t) =>
      void navigate({ to: `${raiz}/titulos/${t.id}`, search: { modo: 'consulta' } }),
  })

  // Título não se apaga, se CANCELA — não há `DELETE` no módulo inteiro, e a
  // ausência é regra: título que some é dinheiro que o sistema esqueceu de
  // dever. Quem já tem baixa recusa com `titulo-com-baixa`, e a saída ali é
  // lançar outro título.
  const acoesDoTitulo = acoes.map((a) =>
    a.id === 'excluir'
      ? { ...a, label: 'Cancelar', onClick: (t: FinancialTitleDto | null) => setParaCancelar(t) }
      : a,
  )

  return (
    <TelaDeListagem<FinancialTitleDto>
      titulo={direcao === 'payable' ? 'Títulos a pagar' : 'Títulos a receber'}
      contexto="A conta inteira, com as parcelas"
      columns={colunas(direcao)}
      queryKey={['titulos-financeiros', direcao]}
      fetcher={(state) => provider.list(state)}
      actions={acoesDoTitulo}
      cancelamento={{
        documento: 'título',
        registro: paraCancelar,
        numero: (t) => t.number,
        cancelado: (t) => t.status === 'cancelled',
        pendente: cancelar.isPending,
        erro: cancelar.error,
        onFechar: () => {
          setParaCancelar(null)
          cancelar.reset()
        },
        onConfirmar: () => {
          if (!paraCancelar) return
          cancelar.mutate(paraCancelar.id, { onSuccess: () => setParaCancelar(null) })
        },
      }}
    />
  )
}
