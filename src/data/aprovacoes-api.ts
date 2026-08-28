import type {
  ApprovalRequestDto,
  ApprovalRequestStatus,
  ApprovalSummaryDto,
  PagedResultOfApprovalRequestDto,
} from '@/api/gerado'
import {
  approveApprovalRequest,
  getApprovalSummary,
  listApprovalRequests,
  rejectApprovalRequest,
} from '@/api/gerado'
import {
  PAGE_SIZE_MAX,
  type RespostaDaApi,
  dadosOuErro,
  repetirSeValeAPena,
} from '@/data/api-provider'
import type { TableFetcher } from '@/lib/table-query'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

/**
 * FRONTEIRA DA FILA DE APROVAÇÕES — o desconto que passou do teto e espera alguém.
 *
 * As cinco operações entraram no contrato marcadas `Proposto`: são pedido do
 * front ao backend, e nenhum servidor as implementa ainda — quem CRIA o pedido é
 * a fase 1 do `cabinet-erp-api#237`. No modo mock quem responde é
 * `src/mocks/api/aprovacoes.ts`, e a tela não sabe a diferença.
 *
 * ## O que esta fronteira decide, e a tela não
 *
 * **Quem pode decidir é resposta do SERVIDOR, não dedução do papel.** Cada linha
 * traz `canDecide`, e o resumo traz o dela; a tela lê o campo e desenha. Deduzir
 * pelo papel do vínculo daria botão aceso onde o servidor responde 403 — e o
 * caso mais comum não é nem de papel: é o próprio solicitante, que TEM o papel e
 * mesmo assim não decide o próprio pedido.
 *
 * **A fila não é filtrada aqui.** Quem tem permissão vê tudo, quem não tem vê os
 * próprios pedidos, e esse recorte é do servidor. Refazê-lo no cliente exigiria
 * ter no navegador exatamente o que se quer esconder.
 *
 * **Decidir invalida a fila E o resumo.** São duas chaves, e são duas consultas
 * de verdade — o badge da barra não passa pela listagem (`GET .../summary`
 * existe justamente para isso). Invalidar só uma deixaria o contador teimando um
 * número que a tela ao lado já desmentiu.
 */

export const URL_APROVACOES = '/api/approval-requests'

/**
 * Whitelist de `sortBy` — a MESMA do contrato. Campo fora dela é 400, não
 * ordenação ignorada.
 */
export const ORDENAVEIS_APROVACAO: readonly string[] = [
  'requestedAt',
  'status',
  'requestedPercent',
  'discountCents',
]

/** Chaves de cache num lugar só: mutação que invalida a chave errada é bug mudo. */
export const CHAVES_APROVACOES = {
  tronco: ['aprovacoes'] as const,
  fila: (status: ApprovalRequestStatus | 'todos') => ['aprovacoes', 'fila', status] as const,
  resumo: ['aprovacoes', 'resumo'] as const,
}

/**
 * A fila, para a `VitraDataTable` — busca, ordenação e paginação são do SERVIDOR.
 *
 * `TableFetcher` e não `useQuery` porque quem pilota a consulta é a tabela: ela
 * já guarda `{q, sort, page, pageSize}` e o põe no endereço. Um hook próprio
 * aqui daria duas fontes para o mesmo estado, e a que a tela não usasse ficaria
 * teimando a página anterior.
 *
 * O `status` fica FORA do `TableQueryState` de propósito: é o parâmetro próprio
 * que o contrato publica, não um filtro estruturado — a operação não publica
 * `filters`, e forçá-lo pela mesma porta faria a fronteira mandar um parâmetro
 * que o servidor recusa com 400.
 */
export function filaDeAprovacoes(
  status: ApprovalRequestStatus | 'todos',
): TableFetcher<ApprovalRequestDto> {
  return async (state) => {
    if (state.pageSize > PAGE_SIZE_MAX) {
      throw new Error(
        `pageSize ${state.pageSize} passa do teto de ${PAGE_SIZE_MAX} do contrato de listagem.`,
      )
    }
    const resposta: RespostaDaApi = await listApprovalRequests({
      page: state.page,
      pageSize: state.pageSize,
      ...(state.q ? { q: state.q } : {}),
      ...(state.sort ? { sortBy: state.sort.id, sortDesc: state.sort.desc } : {}),
      ...(status === 'todos' ? {} : { status }),
    })
    const dados = dadosOuErro<PagedResultOfApprovalRequestDto>(
      resposta,
      'Falha ao carregar a fila de aprovações.',
    )
    // Falha do servidor NUNCA pode virar lista vazia: "deu erro" e "não há
    // pedido nenhum" pedem reações opostas de quem aprova.
    return { rows: dados.rows ?? [], total: dados.total ?? 0 }
  }
}

/**
 * O contador do badge — quantos pedidos esperam ESTA sessão.
 *
 * Consulta própria, e não `total` da listagem: quem a pede é a barra lateral, em
 * toda tela, e puxar a fila inteira para ler um número faria toda navegação
 * carregar a lista no fundo.
 *
 * **Sem `throwOnError` e sem repetição agressiva de propósito:** o badge é
 * ornamento. Falhou, ele some — derrubar a navegação porque o contador não
 * respondeu seria o rabo abanando o cachorro.
 */
export function useResumoDeAprovacoes() {
  return useQuery({
    queryKey: CHAVES_APROVACOES.resumo,
    retry: repetirSeValeAPena,
    queryFn: async () => {
      const resposta: RespostaDaApi = await getApprovalSummary()
      return dadosOuErro<ApprovalSummaryDto>(resposta, 'Falha ao contar as aprovações pendentes.')
    },
  })
}

/**
 * Aprovar e recusar são UMA mutação com dois destinos, e não duas.
 *
 * O que muda entre elas é o caminho e a obrigatoriedade do motivo; o resto —
 * invalidar as duas chaves, tratar o 409 de pedido já decidido, o 403 de quem
 * pediu — é idêntico. Duas mutações teriam duas cópias do `onSuccess`, e a
 * primeira a ser corrigida deixaria a outra para trás.
 */
export function useDecidirAprovacao() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      decisao,
      motivo,
    }: {
      id: string
      decisao: 'aprovar' | 'recusar'
      motivo: string | null
    }) => {
      const resposta: RespostaDaApi =
        decisao === 'aprovar'
          ? await approveApprovalRequest(id, { reason: motivo })
          : await rejectApprovalRequest(id, { reason: motivo ?? '' })
      return dadosOuErro<ApprovalRequestDto>(
        resposta,
        decisao === 'aprovar' ? 'Falha ao aprovar o pedido.' : 'Falha ao recusar o pedido.',
      )
    },
    onSuccess: () => {
      // O TRONCO, e não a chave de um status: a decisão MOVE a linha de
      // `pending` para `approved`/`rejected`, então as duas listas mudaram — e a
      // que o operador não está olhando é justamente a que ficaria errada.
      void queryClient.invalidateQueries({ queryKey: CHAVES_APROVACOES.tronco })
    },
  })
}
