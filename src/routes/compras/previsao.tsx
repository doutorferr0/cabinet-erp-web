import { createFileRoute, redirect } from '@tanstack/react-router'

/**
 * `Previsão de chegada` deixou de ser TELA e virou uma visão da listagem de
 * ordens de compra (issue D12, Reface 2.0).
 *
 * A pergunta que a tela respondia — "o que chega, e quando" — é a listagem de
 * ordens desenhada no calendário pela data de previsão. Mantê-la como rota
 * própria custava uma segunda barra de filtro, uma segunda tabela e uma segunda
 * ideia de "consulta salva" sobre o mesmo recurso; e o operador que estreitasse
 * uma não via efeito nenhum na outra.
 *
 * **A rota fica**, como redirecionamento: ela está no menu, em links antigos e
 * na memória de quem usa. Rota removida devolveria 404 para quem já sabia o
 * caminho.
 *
 * **O que se perde, e está registrado na PR:** ali a linha era o ITEM da ordem,
 * não o documento — uma ordem de dez peças com três atrasadas aparecia como
 * três linhas. A listagem de ordens é por documento. Recuperar o corte por item
 * é trabalho da própria listagem (D14), não de uma tela paralela.
 *
 * O destino viaja como `href` cru, e não como `to`+`search` tipado, porque quem
 * declara `modo`/`campo` na listagem de ordens é a issue D14: escrever o
 * `validateSearch` daqui seria mexer na zona dela.
 */
const DESTINO = '/compras/ordens?modo=calendario&campo=expectedAt'

export const Route = createFileRoute('/compras/previsao')({
  beforeLoad: () => {
    throw redirect({ href: DESTINO, replace: true })
  },
})
