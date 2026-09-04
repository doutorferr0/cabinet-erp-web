import type { SavedViewColor, SavedViewDto } from '@/api/gerado'
import { EstrelaDeView } from '@/components/cabinet/listagem/views'
import { corpoDaView, useEscritaDeView, useViews, viewsFavoritas } from '@/data/views-api'
import { Link } from '@tanstack/react-router'
import { useCallback } from 'react'

/**
 * O grupo FAVORITOS da barra lateral (D13), montado na barra da D4 (D37).
 *
 * ## Duas entregas do mesmo recurso, e qual metade de cada uma ficou
 *
 * D4 (#519) entregou a barra única com uma ★ por item, guardando as marcas em
 * `localStorage`; D13 (#513) entregou os favoritos por `saved_views` — o
 * caminho do contrato — montados no shell ANTIGO, que o merge descartou. O
 * resultado era este arquivo ÓRFÃO: nenhuma tela o montava, e a barra que a
 * rodada publicou continuava gravando no navegador.
 *
 * A D37 juntou o que cada uma tinha de certo: **a casca é a da D4** (é a barra
 * que existe, com a pele 2.0 e o `nav.css`) e **a fonte de verdade é a da D13**
 * (é o contrato, e sobrevive a trocar de máquina). O `localStorage` de
 * favoritos saiu do `estado.ts` — o resto do estado pessoal da barra (colapso,
 * grupos abertos, recentes) continua lá, porque nenhum deles tem caminho no
 * contrato.
 *
 * Consequência que vale dizer em voz alta: **as duas naturezas passam a dividir
 * o mesmo grupo.** A ★ do item de nav fixa a TELA (uma view sem filtro nenhum);
 * a ★ da aba da listagem fixa uma CONSULTA. As duas viram linha do mesmo
 * `FAVORITOS`, que é o que o operador espera — ele fixa "o que eu abro sempre",
 * não "um tipo de coisa".
 *
 * ## A metade visível das views salvas
 *
 * O que o operador filtra todo dia vira um clique. A outra metade é a aba da
 * listagem — as duas leem a MESMA consulta (`CHAVE_VIEWS`), e é por isso que a
 * estrela clicada na aba acende aqui sem reload, sem nenhum estado
 * compartilhado entre os dois lugares.
 *
 * ## Sem favorito, sem grupo
 *
 * Um rótulo `FAVORITOS` sobre lista vazia ocuparia posição fixa na barra para
 * dizer "nada aqui" — e a barra é o que o operador varre de olho o dia inteiro.
 * O grupo nasce no primeiro ★ e some no último.
 *
 * ## Por que NÃO tem contagem
 *
 * A espec pedia o número ao lado do nome, "usando o `/resumo` de D11 quando
 * existir". Ele existe (`GET /api/nav/counters`) e **conta a TELA, não a VIEW**:
 * `purchaseOrdersOpen` é o total de ordens em aberto da empresa, enquanto a view
 * favorita é *"ordens atrasadas do fornecedor X"*. Pendurar um no outro daria um
 * número maior que a lista que o clique abre — dado errado com cara de dado do
 * servidor, que é o que este repo evita em toda parte. Contagem de verdade pede
 * ou executar cada consulta salva (uma requisição por favorito, ao montar a
 * barra) ou um `count` no contrato; nenhum dos dois é desta issue. Registrado
 * na #481.
 */

/**
 * O matiz da view → a cor do quadradinho.
 *
 * Mapa explícito, e não `var(--${cor}-400)` interpolado: a rampa é fechada e o
 * Tailwind não vê classe montada em tempo de execução — o degrau 400 é o FILL de
 * cada matiz (a régua §Hierarquia), e a cor aqui é marca de identidade, nunca
 * texto.
 */
const COR_DO_QUADRADINHO: Record<SavedViewColor, string> = {
  neutro: 'var(--n-400)',
  lime: 'var(--lime-400)',
  indigo: 'var(--indigo-400)',
  mint: 'var(--mint-400)',
  sky: 'var(--sky-400)',
  amber: 'var(--amber-400)',
  rose: 'var(--rose-400)',
  violet: 'var(--violet-400)',
  teal: 'var(--teal-400)',
}

function ItemFavorito({ view }: { view: SavedViewDto }) {
  const escrita = useEscritaDeView()

  return (
    // `data-item-linha` / `data-item`: a marcação é a da barra da D4, não a do
    // `Sidebar` do shadcn que este arquivo usava. Trocar foi o preço de montar
    // aqui — os dois sistemas na mesma coluna dariam dois tamanhos de linha e
    // dois estados de hover, que é a diferença que o olho pega primeiro.
    <li data-item-linha className="relative">
      <Link
        to={view.route}
        data-item
        className="relative flex w-full items-center text-left outline-none"
        style={{ gap: 'var(--s-2)', padding: 'calc(var(--s-1) + 3px) var(--s-3)' }}
      >
        <span
          aria-hidden="true"
          className="size-2 shrink-0 rounded-data"
          style={{ background: COR_DO_QUADRADINHO[view.color] }}
        />
        <span className="t-ui min-w-0 flex-1 truncate">{view.name}</span>
      </Link>
      {/* FORA do link, e sobreposta: `<button>` dentro de `<a>` é HTML inválido,
          e na prática seria um clique dentro de outro — quem quisesse soltar a
          estrela navegaria junto. */}
      <EstrelaDeView
        nome={view.name}
        favorita
        onAlternar={() =>
          escrita.gravar({ id: view.id, corpo: corpoDaView(view, { favorite: false }) })
        }
        className="-translate-y-1/2 absolute top-1/2 right-1 z-10"
      />
    </li>
  )
}

/**
 * A ★ DO ITEM DE NAV, ligada ao contrato — o que a D4 deixou em `localStorage`.
 *
 * Devolve a mesma forma que o `useFavoritos` do `estado.ts` devolvia
 * (`{ fixadas, alternar }`), de propósito: era o que a barra já consumia, e
 * trocar a fonte sem trocar a interface manteve a mudança dentro deste arquivo
 * em vez de espalhá-la pela `sidebar-nav`.
 *
 * A view "da tela inteira" é a que aponta para a rota sem guardar consulta
 * nenhuma. Uma view NOMEADA da mesma rota não responde por esta ★: ela tem
 * filtros, e apagá-la daqui seria apagar trabalho do operador.
 *
 * **Um clique, uma requisição.** Fixar é `POST` já com `favorite: true`; soltar
 * é `DELETE`, e não `PUT favorite: false` — a view da tela não tem nada além da
 * ★, então mantê-la desfixada guardaria um registro vazio que nunca mais
 * aparece. A view NOMEADA, essa sim, sobrevive à ★: quem a solta continua com a
 * consulta na aba da listagem, e é por isso que `ItemFavorito` grava em vez de
 * excluir.
 */
export function useFavoritosDaTela() {
  const { data } = useViews()
  const escrita = useEscritaDeView()
  const views = data ?? []

  const daTela = useCallback(
    (url: string) =>
      views.find(
        (v) =>
          v.route === url && (v.filters?.length ?? 0) === 0 && v.mode === '' && v.groupBy === '',
      ),
    [views],
  )

  const alternar = useCallback(
    (url: string, titulo: string) => {
      const existente = daTela(url)
      if (existente) {
        escrita.excluir(existente.id)
        return
      }
      escrita.criar({
        route: url,
        name: titulo,
        color: 'neutro',
        filters: [],
        joinOperator: 'and',
        sortBy: null,
        sortDesc: false,
        groupBy: '',
        columns: [],
        mode: '',
        favorite: true,
      })
    },
    [daTela, escrita],
  )

  return {
    /** As rotas com ★ acesa — a barra só precisa saber se a dela está na lista. */
    fixadas: views.filter((v) => v.favorite === true).map((v) => v.route),
    alternar,
  }
}

export function GrupoFavoritos({ colapsada }: { colapsada: boolean }) {
  const { data } = useViews()
  const favoritas = viewsFavoritas(data ?? [])

  if (favoritas.length === 0) return null

  return (
    // `<nav>` próprio, e não só um grupo: são destinos que o USUÁRIO montou, ao
    // lado dos que o sistema oferece. Quem navega por marcos precisa poder pular
    // para eles — e o rótulo é o que separa esta região das telas do módulo.
    <nav aria-label="Consultas favoritas" className="flex flex-col" style={{ gap: 'var(--s-1)' }}>
      {/* COLAPSADA a barra não tem onde escrever o rótulo — a mesma regra dos
          grupos de módulo, e pela mesma razão: chevron ou texto sem largura
          viraria um rótulo mudo. Vira a hairline que separa blocos de ícones. */}
      {colapsada ? (
        <hr data-divisor className="mx-2 my-1" />
      ) : (
        <div
          className="flex w-full items-center"
          style={{ gap: 'var(--s-2)', padding: 'var(--s-1) var(--s-3)' }}
        >
          {/* O quadradinho do grupo é o mesmo gesto dos grupos de módulo: a cor
              diz de quem é o bloco antes do nome. Aqui o dono é a estrela. */}
          <span
            aria-hidden="true"
            className="size-2 shrink-0 rounded-data"
            style={{ background: 'var(--amber-400)' }}
          />
          <span className="t-rotulo min-w-0 flex-1 truncate">Favoritos</span>
        </div>
      )}
      <ul aria-label="Favoritos" className="flex flex-col" style={{ gap: '2px' }}>
        {favoritas.map((view) => (
          <ItemFavorito key={view.id} view={view} />
        ))}
      </ul>
    </nav>
  )
}
