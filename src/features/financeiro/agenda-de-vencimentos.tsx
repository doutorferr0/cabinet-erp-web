import type { FinancialInstallmentDto } from '@/api/gerado'
import { cadastroActions } from '@/components/cabinet/cadastro-actions'
import { TelaDeListagem } from '@/components/cabinet/tela-de-listagem'
import { Button } from '@/components/ui/button'
import { type Direcao, type RecorteDaAgenda, parcelasFinanceiras } from '@/data/financeiro-api'
import { DialogoDeQuitacao } from '@/features/financeiro/quitar'
import { formatDateBR, formatMoneyBRL } from '@/lib/formatters'
import { useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { HandCoins } from 'lucide-react'
import { useMemo, useState } from 'react'

/**
 * A AGENDA DE VENCIMENTOS — a tela do dia a dia do financeiro.
 *
 * `GET /api/financial-installments`, e a LINHA é um vencimento, não um título.
 * É a decisão que o contrato desenha na whitelist de ordenação: `dueDate` ordena
 * esta listagem e **não** ordena a de títulos, porque um título de cinco
 * parcelas tem cinco vencimentos e escolher um deles em silêncio produziria uma
 * lista diferente a cada vez, com cara de ser a mesma.
 *
 * O menu já apontava para cá com `futuro: true` desde que a seção Financeiro foi
 * desenhada — *"o que o cliente deve, por vencimento"* era a descrição, e é
 * literalmente esta tela.
 *
 * ## Uma tela, dois lados
 *
 * Contas a Pagar e a Receber são a MESMA tela com `direction` diferente — o
 * mesmo desenho de `/api/partners` com `role`. No legado são duas telas com o
 * prefixo trocado, coluna a coluna, e foi assim que envelheceram: correção feita
 * num lado chegava ao outro por cópia manual.
 *
 * ## O recorte é escolha visível
 *
 * `Em aberto` é o padrão porque é o que se paga hoje, mas `Todos` está a um
 * clique: lista que esconde o que já foi pago sem dizer é o que faz o operador
 * pagar de novo.
 */

const RECORTES: readonly { id: RecorteDaAgenda; rotulo: string }[] = [
  { id: 'abertos', rotulo: 'Em aberto' },
  { id: 'vencidos', rotulo: 'Vencidos' },
  { id: 'todos', rotulo: 'Todos' },
]

/**
 * As chaves são em INGLÊS porque viajam como `sortBy`, e a whitelist do servidor
 * é em inglês: traduzir a chave quebra a ordenação com 400 ao primeiro clique no
 * cabeçalho (padrão 1).
 */
function colunas(direcao: Direcao): ColumnDef<FinancialInstallmentDto>[] {
  return [
    {
      accessorKey: 'dueDate',
      header: 'Vencimento',
      cell: ({ row }) => (
        <span className="flex items-center gap-2 tabular-nums">
          {formatDateBR(row.original.dueDate)}
          {/* `overdue` vem do servidor — "hoje" é o dia DELE. */}
          {row.original.overdue ? (
            <span className="rounded-sm bg-zone-danger px-1.5 py-0.5 text-[0.6875rem] text-destructive">
              vencido
            </span>
          ) : null}
        </span>
      ),
    },
    {
      accessorKey: 'titleNumber',
      header: 'Título',
      cell: ({ row }) => (
        <span className="tabular-nums">
          {row.original.titleNumber}/{row.original.sequence}
        </span>
      ),
    },
    {
      accessorKey: 'partnerName',
      header: direcao === 'payable' ? 'Fornecedor' : 'Cliente',
    },
    {
      accessorKey: 'documentNumber',
      // Fora da whitelist do contrato: a coluna aparece e não ordena, o que é
      // melhor que um cabeçalho clicável que responde 400.
      enableSorting: false,
      header: 'Documento',
      cell: ({ getValue }) => getValue<string | null>() || '—',
    },
    {
      accessorKey: 'amountCents',
      header: 'Valor',
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
      enableSorting: false,
      cell: ({ row }) => (row.original.status === 'settled' ? 'Quitada' : 'Em aberto'),
    },
  ]
}

export function AgendaDeVencimentos({ direcao }: { direcao: Direcao }) {
  const navigate = useNavigate()
  const [recorte, setRecorte] = useState<RecorteDaAgenda>('abertos')
  const [aQuitar, setAQuitar] = useState<readonly FinancialInstallmentDto[]>([])

  // O provider carrega o recorte, então ele muda com a escolha — e a `queryKey`
  // muda junto, senão a tabela mostraria a lista velha com o botão novo aceso.
  const provider = useMemo(() => parcelasFinanceiras(direcao, recorte), [direcao, recorte])

  const raiz = direcao === 'payable' ? '/financeiro/pagar' : '/financeiro/receber'

  const acoes = cadastroActions<FinancialInstallmentDto>({
    entidade: 'título',
    onIncluir: () => void navigate({ to: `${raiz}/titulos/novo` }),
    // A linha abre o TÍTULO da parcela: o vencimento não é um registro que se
    // edita sozinho — quem tem formulário é o título, e é lá que a parcela mora.
    onAbrir: (linha) => void navigate({ to: `${raiz}/titulos/${linha.titleId}` }),
    motivoSemExcluir:
      'Vencimento não se exclui — quem desiste da conta é o título, pelo Cancelar de lá.',
  })

  return (
    <>
      <TelaDeListagem<FinancialInstallmentDto>
        titulo={direcao === 'payable' ? 'Contas a Pagar' : 'Contas a Receber'}
        contexto="Por vencimento"
        columns={colunas(direcao)}
        queryKey={['parcelas-financeiras', direcao, recorte]}
        fetcher={(state) => provider.list(state)}
        actions={[
          ...acoes,
          {
            id: 'quitar',
            label: 'Quitar',
            icon: HandCoins,
            needsSelection: true,
            // `emLote` é o que mantém o botão vivo com várias linhas marcadas —
            // e ele só existe porque o SERVIDOR faz o lote num ato só
            // (`POST /api/financial-settlements/batch`, tudo-ou-nada). Sem essa
            // operação, um laço de N requisições falharia pela metade.
            onClick: (linha) => linha && setAQuitar([linha]),
            emLote: (linhas) => setAQuitar(linhas),
          },
        ]}
        rodape={
          <fieldset className="flex flex-wrap items-center gap-2">
            <legend className="sr-only">Recorte da agenda</legend>
            <span className="text-muted-foreground text-xs">Mostrando:</span>
            {RECORTES.map((r) => (
              <Button
                key={r.id}
                type="button"
                size="sm"
                variant={r.id === recorte ? 'secondary' : 'ghost'}
                aria-pressed={r.id === recorte}
                onClick={() => setRecorte(r.id)}
              >
                {r.rotulo}
              </Button>
            ))}
          </fieldset>
        }
      />
      <DialogoDeQuitacao
        parcelas={aQuitar}
        aberto={aQuitar.length > 0}
        onFechar={() => setAQuitar([])}
      />
    </>
  )
}
