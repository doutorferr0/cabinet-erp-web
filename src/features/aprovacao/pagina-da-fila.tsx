import type { ApprovalRequestDto, ApprovalRequestStatus } from '@/api/gerado'
import { VitraDataTable } from '@/components/cabinet/data-table'
import { PageHeader } from '@/components/cabinet/page-header'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CHAVES_APROVACOES, filaDeAprovacoes, useResumoDeAprovacoes } from '@/data/aprovacoes-api'
import { formatInstanteBR, formatMoneyBRL, formatPercent } from '@/lib/formatters'
import type { ColumnDef } from '@tanstack/react-table'
import { useState } from 'react'
import { DecisaoDoPedido } from './decisao-do-pedido'
import { SituacaoDoPedido } from './situacao'

/**
 * A FILA DE APROVAÇÕES (F12) — o desconto que passou do teto e espera alguém.
 *
 * ## De onde ela vem
 *
 * No Softlux não havia fila: `SisPermissaoEspecial` marcava quem podia dar
 * desconto acima do limite (opção 5, `MARGEM DE DESCONTO PARA O CLIENTE`), e
 * quem não podia era barrado na tela sem deixar rastro — nem do que se tentou,
 * nem de quem liberou por cima. Era permissão, não fluxo. Esta tela é o fluxo
 * que não existia; o registro é o ganho, não a tela.
 *
 * ## As três escolhas de desenho
 *
 * **Não há `Incluir`, e a ausência é o assunto.** O pedido nasce no SERVIDOR, ao
 * gravar documento com desconto acima do teto — o contrato não publica criação
 * (ver `ApprovalRequestDto`). Uma barra de ações com `Incluir` desabilitado
 * anunciaria uma operação que ninguém vai poder fazer; é a mesma razão pela qual
 * o registry não expõe `get` de recurso sem detalhe no contrato.
 *
 * **O status é ABA, não filtro.** É o parâmetro próprio que o contrato publica
 * (a operação não publica `filters`), e são três perguntas diferentes que o
 * operador faz em momentos diferentes: o que preciso decidir hoje, o que eu
 * liberei, o que barrei. Escondê-las atrás do painel de filtro custaria dois
 * cliques para a pergunta mais frequente da tela.
 *
 * **A linha ABRE o pedido; os botões moram na folha.** Recusar exige motivo, e
 * motivo não se digita em célula de grade — ver `DecisaoDoPedido`.
 *
 * ## O que esta tela ainda não mostra, e por quê
 *
 * A fila é REAL sobre o mock e vazia sobre o backend: quem cria o pedido é a
 * fase 1 do `cabinet-erp-api#237`, e ela não existe. `rotas-do-backend.ts` mantém
 * as cinco operações do lado do MSW justamente por isso — ligar a leitura antes
 * do gancho poria "não há nada para aprovar" no lugar de "o gancho não existe",
 * e as duas frases são indistinguíveis na tela.
 */

/** As abas, na ordem em que o operador pergunta. */
const ABAS: readonly { id: ApprovalRequestStatus | 'todos'; rotulo: string }[] = [
  { id: 'pending', rotulo: 'Pendentes' },
  { id: 'approved', rotulo: 'Aprovados' },
  { id: 'rejected', rotulo: 'Recusados' },
  { id: 'todos', rotulo: 'Todos' },
]

/**
 * As colunas.
 *
 * `accessorKey` em INGLÊS nas ordenáveis, que é o nome que a whitelist de
 * `sortBy` do servidor aceita (padrão 1): traduzir aqui quebraria a ordenação
 * com 400 só ao clicar no cabeçalho. As três colunas de nome congelado
 * (`subjectLabel`, `customerName`, `requestedByName`) NÃO ordenam — o contrato
 * as deixa fora da whitelist, e cabeçalho clicável nelas prometeria o 400.
 */
const COLUNAS: ColumnDef<ApprovalRequestDto>[] = [
  {
    id: 'subjectLabel',
    header: 'Documento',
    enableSorting: false,
    cell: ({ row }) => (
      <span className="font-mono tabular-nums">{row.original.subjectLabel ?? '—'}</span>
    ),
  },
  {
    id: 'customerName',
    header: 'Cliente',
    enableSorting: false,
    cell: ({ row }) => row.original.customerName ?? '—',
  },
  {
    id: 'requestedByName',
    header: 'Pedido por',
    enableSorting: false,
    cell: ({ row }) => row.original.requestedByName ?? '—',
  },
  {
    accessorKey: 'requestedPercent',
    header: 'Desconto',
    cell: ({ row }) => (
      <span className="font-mono tabular-nums">
        {formatPercent(row.original.requestedPercent)} %
        <span className="text-muted-foreground">
          {' '}
          / {formatPercent(row.original.limitPercent)} %
        </span>
      </span>
    ),
  },
  {
    accessorKey: 'discountCents',
    header: 'Em R$',
    cell: ({ row }) => (
      <span className="font-mono tabular-nums">{formatMoneyBRL(row.original.discountCents)}</span>
    ),
  },
  {
    accessorKey: 'requestedAt',
    header: 'Solicitado',
    cell: ({ row }) => (
      <span className="font-mono tabular-nums">{formatInstanteBR(row.original.requestedAt)}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Situação',
    cell: ({ row }) => <SituacaoDoPedido situacao={row.original.status} />,
  },
]

export function PaginaDaFila() {
  const [aba, setAba] = useState<ApprovalRequestStatus | 'todos'>('pending')
  const [aberto, setAberto] = useState<ApprovalRequestDto | null>(null)
  const resumo = useResumoDeAprovacoes()

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        titulo="Aprovações"
        {...(resumo.data?.canDecide === false
          ? // Quem não decide vê a MESMA tela, com os próprios pedidos — e
            // precisa saber por que não há botão. Sem esta linha, a folha lê
            // como defeito.
            { contexto: 'Somente os seus pedidos' }
          : {})}
      />

      <Tabs value={aba} onValueChange={(chave) => setAba(chave as ApprovalRequestStatus | 'todos')}>
        <TabsList aria-label="Situação dos pedidos">
          {ABAS.map((item) => (
            <TabsTrigger key={item.id} value={item.id}>
              {item.rotulo}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* `key` na aba: trocar de situação é OUTRA consulta, e remontar zera
          página e ordenação junto. Sem isso, sair da página 3 dos pendentes
          abriria os aprovados na página 3, que quase sempre não existe. */}
      <VitraDataTable
        key={aba}
        columns={COLUNAS}
        queryKey={CHAVES_APROVACOES.fila(aba)}
        fetcher={filaDeAprovacoes(aba)}
        searchPlaceholder="Documento, cliente ou quem pediu"
        aoAbrirLinha={setAberto}
      />

      <DecisaoDoPedido pedido={aberto} aoFechar={() => setAberto(null)} />
    </div>
  )
}
