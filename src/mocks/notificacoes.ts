import type { Modulo } from '@/app/modulo'

/**
 * NOTIFICAÇÕES — dado de mock, sem caminho no contrato (§@casca-global).
 *
 * Não é `ListProvider` nem passa por `src/data/`: não há `/api/notifications`
 * proposto em lugar nenhum, e a gaveta desta fatia é CASCA — o slice que a
 * trouxe (appbar + gaveta que empurra) é sobre o CROMO, não sobre notificação
 * de verdade. Contagem real, push e "marcar lida" persistente ficam para
 * quando o caminho existir; até lá, isto é só tabela de apoio estática (mesma
 * regra dos recursos ainda-mock do repo).
 */
export interface Notificacao {
  id: string
  /** Dia relativo, só pra agrupar a lista — não é campo de servidor. */
  dia: 'hoje' | 'ontem'
  hora: string
  titulo: string
  descricao: string
  modulo: Modulo
  lida: boolean
}

export const NOTIFICACOES_MOCK: Notificacao[] = [
  {
    id: 'notif-1',
    dia: 'hoje',
    hora: '14:20',
    titulo: 'Orçamento vence em 2 dias',
    descricao:
      'Casa Jardim Botânico — R$ 48.200, enviado em 26/07 e ainda sem resposta do cliente.',
    modulo: 'vendas',
    lida: false,
  },
  {
    id: 'notif-2',
    dia: 'hoje',
    hora: '11:32',
    titulo: 'Pedido #482 chegou',
    descricao: 'Interlight — 34 itens aguardando conferência para dar entrada no estoque.',
    modulo: 'compras',
    lida: false,
  },
  {
    id: 'notif-3',
    dia: 'hoje',
    hora: '09:05',
    titulo: 'NF 1207 pendente há 5 dias',
    descricao: 'Nota do fornecedor Stella sem lançamento. Bloqueia o fechamento do mês.',
    modulo: 'fornecedores',
    lida: false,
  },
  {
    id: 'notif-4',
    dia: 'ontem',
    hora: '17:48',
    titulo: 'Arquiteta comentou no projeto',
    descricao: 'Galleria — "Podemos trocar os trilhos do hall pelo modelo 40W?"',
    modulo: 'profissionais',
    lida: true,
  },
]
