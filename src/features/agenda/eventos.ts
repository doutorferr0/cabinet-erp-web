import type { AgendaEventDtoKind } from '@/api/gerado'
import type { TomDoCartao } from '@/components/cabinet/listagem/modo-kanban'

/**
 * O TOM de cada tipo de compromisso no calendário.
 *
 * Antes daqui saía uma paleta inteira, copiada de `src/index.css` porque o
 * Schedule-X gravava cor como custom property na raiz e `var()` de token
 * escopado por módulo teria pintado três tipos da mesma cor. Com o calendário
 * do próprio sistema (`ModoCalendario`) o problema sumiu: o que a tela escolhe
 * é o TOM semântico, e quem sabe a cor de cada tom é a fundação — uma fonte só,
 * nos dois temas.
 *
 * `payment` é dinheiro e vai em `ok`, que é o verde com dono por regra
 * (DESIGN.md §Acentos). Os outros três emprestam do que o compromisso significa
 * para quem lê a semana: entrega é informação de rota (`info`), reunião é
 * compromisso com hora marcada e prazo (`warn`), orçamento é neutro até virar
 * pedido (`mut`).
 */
export const TOM_DO_TIPO: Record<AgendaEventDtoKind, TomDoCartao> = {
  delivery: 'info',
  quote: 'mut',
  meeting: 'warn',
  payment: 'ok',
}

/** Rótulos que a legenda da agenda exibe — mesma ordem do dashboard. */
export const ROTULOS_DO_TIPO: Record<AgendaEventDtoKind, string> = {
  delivery: 'entrega',
  quote: 'orçamento',
  meeting: 'reunião',
  payment: 'pagamento',
}

/**
 * As colunas do quadro por TIPO, declaradas em vez de derivadas.
 *
 * O tipo tem domínio fechado (é `AgendaEventDtoKind`), e coluna derivada sumiria
 * no dia em que ninguém tivesse pagamento marcado — que é justamente quando "não
 * há nenhum" é a informação que o operador foi buscar.
 *
 * A cor do quadradinho é a do TOM, a mesma da pílula no calendário: alternar de
 * modo não pode trocar o significado da cor.
 */
export const COLUNAS_POR_TIPO = (Object.keys(ROTULOS_DO_TIPO) as AgendaEventDtoKind[]).map(
  (tipo) => ({
    id: tipo,
    rotulo: ROTULOS_DO_TIPO[tipo],
    cor: `var(--${TOM_DO_TIPO[tipo]})`,
  }),
)
