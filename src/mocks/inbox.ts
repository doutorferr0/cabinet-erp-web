import type { Modulo } from '@/app/modulo'

/**
 * CAIXA DE ENTRADA — dado de mock, sem caminho no contrato.
 *
 * Substitui `notificacoes.ts`, que morreu junto com a gaveta (D7). A regra de
 * origem não mudou: não há `/api/inbox` proposto em lugar nenhum, e o contrato
 * muda SÓ por PR com a zona do contrato aberta — que não é a desta. Enquanto
 * isso isto é tabela de apoio estática, a mesma natureza que a gaveta já tinha.
 *
 * O que mudou é a FORMA do item, e ela é a espec da issue: notificação era um
 * aviso (título + descrição + hora); item de caixa de entrada é uma linha de
 * trabalho — **quem** fez, **o quê**, em **qual registro**, **quando**. Quem lê
 * a lista precisa decidir se abre o registro sem ler duas frases.
 */
export type NaturezaDoItem = 'mencao' | 'atribuicao' | 'prazo' | 'estado'

export interface ItemDoInbox {
  id: string
  /** Quem agiu — o monograma sai das iniciais disto. */
  autor: string
  /** O que a pessoa fez, em uma oração curta, sem o nome do registro. */
  acao: string
  /** O registro: rótulo em mono (é código de documento) e o caminho que abre. */
  registro: { rotulo: string; url: string }
  modulo: Modulo
  natureza: NaturezaDoItem
  /**
   * Quando, em MINUTOS ATRÁS — e não instante ISO, de propósito.
   *
   * Dado fixo de demonstração com data absoluta envelhece para "há 4 meses" na
   * primeira semana, e data que se corrige sozinha a cada `Date.now()` faz o
   * rótulo depender do relógio da máquina que roda o teste. Minutos atrás é
   * estável nos dois: o rótulo é função pura do número.
   */
  minutosAtras: number
  lido: boolean
}

/**
 * Oito itens (DoD da issue): três menções, e três já lidos — para as três views
 * nascerem com conteúdo diferente uma da outra. View que mostra a mesma lista
 * que a vizinha não prova que filtra.
 */
export const INBOX_MOCK: ItemDoInbox[] = [
  {
    id: 'inbox-1',
    autor: 'Marina Alves',
    acao: 'mencionou você em',
    registro: { rotulo: 'ORC-2481', url: '/vendas/orcamentos' },
    modulo: 'vendas',
    natureza: 'mencao',
    minutosAtras: 12,
    lido: false,
  },
  {
    id: 'inbox-2',
    autor: 'Sistema',
    acao: 'avisa que vence em 2 dias o',
    registro: { rotulo: 'ORC-2455', url: '/vendas/orcamentos' },
    modulo: 'vendas',
    natureza: 'prazo',
    minutosAtras: 95,
    lido: false,
  },
  {
    id: 'inbox-3',
    autor: 'Rafael Duarte',
    acao: 'atribuiu a você a conferência do',
    registro: { rotulo: 'PC-0482', url: '/compras/pedidos' },
    modulo: 'compras',
    natureza: 'atribuicao',
    minutosAtras: 240,
    lido: false,
  },
  {
    id: 'inbox-4',
    autor: 'Camila Nunes',
    acao: 'mencionou você em',
    registro: { rotulo: 'OPO-118', url: '/crm/oportunidades' },
    modulo: 'crm',
    natureza: 'mencao',
    minutosAtras: 420,
    lido: false,
  },
  {
    id: 'inbox-5',
    autor: 'Sistema',
    acao: 'separou por completo o',
    registro: { rotulo: 'PV-1093', url: '/vendas/pedidos' },
    modulo: 'vendas',
    natureza: 'estado',
    minutosAtras: 1140,
    lido: false,
  },
  {
    id: 'inbox-6',
    autor: 'Stella Iluminação',
    acao: 'confirmou a entrega do',
    registro: { rotulo: 'OC-0311', url: '/compras/ordens' },
    modulo: 'compras',
    natureza: 'estado',
    minutosAtras: 1500,
    lido: true,
  },
  {
    id: 'inbox-7',
    autor: 'Joana Prado',
    acao: 'mencionou você na ficha de',
    registro: { rotulo: 'CLI-0774', url: '/cadastros/clientes' },
    modulo: 'clientes',
    natureza: 'mencao',
    minutosAtras: 2880,
    lido: true,
  },
  {
    id: 'inbox-8',
    autor: 'Sistema',
    acao: 'baixou abaixo do mínimo o saldo de',
    registro: { rotulo: 'PRD-01920', url: '/cadastros/produtos' },
    modulo: 'produtos',
    natureza: 'estado',
    minutosAtras: 4320,
    lido: true,
  },
]
