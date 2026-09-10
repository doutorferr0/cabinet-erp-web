import { createFileRoute, redirect } from '@tanstack/react-router'

/**
 * `/boletim` — o endereço NOMEADO da folha do dia, que não existia.
 *
 * O Boletim sempre morou em `/`, e quem digitava (ou linkava) `/boletim` tomava
 * a tela de endereço inexistente: o nome pelo qual a tela é chamada no sistema
 * inteiro — sidebar, 404 ("Ir para o Boletim"), mockup do Dashboard — não era
 * endereço nenhum. O Dashboard 2.0 tornou isso visível, porque o cabeçalho dele
 * tem uma ação `Boletim do dia`.
 *
 * **É redirecionamento, e não uma segunda montagem da tela.** Renderizar
 * `BoletimTela` aqui daria dois endereços vivos para a mesma folha, e o de baixo
 * seria o mudo: `moduloDaRota('/')` casa EXATO (é o único módulo sem prefixo) e
 * `itemDaRota` também, então entrar por `/boletim` mostraria a tela certa com a
 * sidebar apagada e sem a cor do módulo — a tela pareceria de outro lugar do
 * sistema. Corrigir isso pelo outro lado custaria uma linha em `modulo.ts`, uma
 * em `navigation.ts`, e o casamento de `/` deixaria de ser exato, que é a
 * salvaguarda escrita ali contra o prefixo acender em toda rota.
 *
 * **O sentido é invertível, e a hora não é esta.** `/boletim` pode virar a
 * canônica e `/` o atalho de entrada: troca-se o `to` daqui e a `url` do item de
 * menu. Enquanto `/` é o que a guarda de sessão devolve depois do login, a
 * canônica é `/`.
 */
export const Route = createFileRoute('/boletim')({
  // `beforeLoad` e não `component`: o desvio acontece antes de montar árvore
  // nenhuma, então o operador não vê a tela piscar em dois endereços.
  beforeLoad: () => {
    throw redirect({ to: '/' })
  },
})
