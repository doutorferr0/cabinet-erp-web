import { PaginaDoInbox } from '@/features/inbox/pagina-do-inbox'
import { VIEW_PADRAO, type ViewDoInbox, ehView } from '@/features/inbox/views'
import { createFileRoute } from '@tanstack/react-router'

/**
 * A view viaja no ENDEREÇO, e não em estado local.
 *
 * É o mesmo motivo das consultas das listagens: recorte que o operador escolheu
 * precisa sobreviver ao F5, poder ser colado para outra pessoa e voltar pelo
 * botão do navegador. `?view=mencoes` faz as três coisas de graça.
 *
 * Valor desconhecido cai na view padrão em vez de dar erro: `/inbox?view=xpto`
 * é URL editada à mão ou link velho, e a resposta certa a isso é a caixa
 * aberta, não uma tela de falha.
 */
export const Route = createFileRoute('/inbox')({
  validateSearch: (busca: Record<string, unknown>): { view: ViewDoInbox } => ({
    view: ehView(busca.view) ? busca.view : VIEW_PADRAO,
  }),
  component: PaginaDoInbox,
})
