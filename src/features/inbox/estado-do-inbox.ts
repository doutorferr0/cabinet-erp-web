import { INBOX_MOCK, type ItemDoInbox } from '@/mocks/inbox'
import { useSyncExternalStore } from 'react'

/**
 * ESTADO DA CAIXA DE ENTRADA — store de módulo, e não `useState` no shell.
 *
 * A gaveta podia guardar as notificações no `AppShell` porque ela vivia lá
 * dentro: contador e lista eram o mesmo componente. Com `/inbox` sendo ROTA, os
 * dois leitores ficam em ramos distintos da árvore — o badge do sino está na
 * appbar, a lista está na folha da rota, e a rota é desmontada a cada saída.
 * `useState` no shell resolveria o primeiro problema e não o segundo; contexto
 * novo só para isto seria um provider a mais no `providers.tsx`, que é zona de
 * outra issue.
 *
 * Store de módulo + `useSyncExternalStore` dá as duas coisas: o marcado como
 * lido sobrevive a sair da rota e voltar, e o badge abate no mesmo instante.
 *
 * **É CASCA, e continua sendo.** Não há `/api/inbox` no contrato, então isto
 * não é `src/data/` nem provider: é a mesma tabela de apoio estática que a
 * gaveta lia, com o estado de leitura por cima. No dia em que o caminho existir,
 * quem muda é este arquivo — a tela pede `useItensDoInbox()` e não sabe a
 * diferença, que é a regra de acesso a dado do repo aplicada à casca.
 */

let itens: ItemDoInbox[] = INBOX_MOCK
const ouvintes = new Set<() => void>()

function avisar() {
  for (const ouvinte of ouvintes) ouvinte()
}

function inscrever(ouvinte: () => void) {
  ouvintes.add(ouvinte)
  return () => {
    ouvintes.delete(ouvinte)
  }
}

function ler() {
  return itens
}

/** Alterna lido/não lido de um item — o mesmo clique desfaz. */
export function alternarLido(id: string) {
  itens = itens.map((item) => (item.id === id ? { ...item, lido: !item.lido } : item))
  avisar()
}

/**
 * Marca TUDO como lido. Não alterna: "marcar tudo" que desmarcasse a segunda
 * chamada seria um botão cujo efeito depende do que veio antes.
 */
export function marcarTudoComoLido() {
  if (itens.every((item) => item.lido)) return
  itens = itens.map((item) => (item.lido ? item : { ...item, lido: true }))
  avisar()
}

/**
 * Volta ao dado de partida. Existe para o TESTE: o store é de módulo, então um
 * caso que marca tudo como lido deixaria a caixa vazia para o caso seguinte, e
 * a ordem dos casos viraria parte da asserção.
 */
export function redefinirInbox() {
  itens = INBOX_MOCK
  avisar()
}

export function useItensDoInbox() {
  return useSyncExternalStore(inscrever, ler, ler)
}

/**
 * Quantas esperam leitura — é o que o sino da appbar mostra.
 *
 * Deriva aqui, e não no chamador, porque o número é o contrato do sino: se um
 * dia "não lida" passar a significar outra coisa, o badge não precisa saber.
 */
export function useNaoLidasDoInbox() {
  return useItensDoInbox().filter((item) => !item.lido).length
}
