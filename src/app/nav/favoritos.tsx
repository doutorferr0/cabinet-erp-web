import type { SavedViewColor, SavedViewDto } from '@/api/gerado'
import { EstrelaDeView } from '@/components/cabinet/listagem/views'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { corpoDaView, useEscritaDeView, useViews, viewsFavoritas } from '@/data/views-api'
import { Link } from '@tanstack/react-router'

/**
 * O grupo FAVORITOS da barra lateral (D13).
 *
 * É a metade visível das views salvas: o que o operador filtra todo dia vira um
 * clique. A outra metade é a aba da listagem — as duas leem a MESMA consulta
 * (`CHAVE_VIEWS`), e é por isso que a estrela clicada na aba acende aqui sem
 * reload, sem nenhum estado compartilhado entre os dois lugares.
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
    <SidebarMenuItem>
      <SidebarMenuButton asChild>
        <Link to={view.route} className="t-ui flex items-center gap-2 pr-7">
          <span
            aria-hidden="true"
            className="size-2 shrink-0 rounded-data"
            style={{ background: COR_DO_QUADRADINHO[view.color] }}
          />
          <span className="truncate">{view.name}</span>
        </Link>
      </SidebarMenuButton>
      {/* FORA do link, e sobreposta: `<button>` dentro de `<a>` é HTML inválido,
          e na prática seria um clique dentro de outro — quem quisesse soltar a
          estrela navegaria junto. O `pr-7` do link é o espaço que ela ocupa. */}
      <EstrelaDeView
        nome={view.name}
        favorita
        onAlternar={() =>
          escrita.gravar({ id: view.id, corpo: corpoDaView(view, { favorite: false }) })
        }
        className="-translate-y-1/2 absolute top-1/2 right-1 z-10"
      />
    </SidebarMenuItem>
  )
}

/**
 * A ESTRELA DO ITEM DE NAV — fixa a TELA INTEIRA nos favoritos.
 *
 * É a mesma coisa que a estrela da aba, com a consulta vazia: uma view sem
 * filtro, sem ordem e sem visão, apontando para a rota. Isso mantém UMA lista de
 * favoritos em vez de duas (telas de um lado, consultas do outro) — duas
 * naturezas no mesmo grupo da barra é o que o Linear e o Notion fazem, e é o que
 * o operador espera: ele fixa "o que eu abro sempre", não "um tipo de coisa".
 *
 * **Um clique, uma requisição.** Fixar é `POST` já com `favorite: true`; soltar é
 * `DELETE`, e não `PUT favorite: false`: a view da tela não tem nada além da
 * estrela, então mantê-la desfixada guardaria um registro vazio que nunca mais
 * aparece. A view NOMEADA, essa sim, sobrevive à estrela — quem a solta continua
 * com a consulta na aba da listagem.
 */
export function EstrelaDaTela({ titulo, url }: { titulo: string; url: string }) {
  const { data } = useViews()
  const escrita = useEscritaDeView()

  // A view "da tela inteira" é a que aponta para a rota sem guardar consulta
  // nenhuma. Uma view NOMEADA da mesma rota não responde por esta estrela: ela
  // tem filtros, e apagá-la daqui seria apagar trabalho do operador.
  const daTela = (data ?? []).find(
    (v) => v.route === url && (v.filters?.length ?? 0) === 0 && v.mode === '' && v.groupBy === '',
  )

  return (
    <EstrelaDeView
      nome={titulo}
      favorita={daTela?.favorite === true}
      // Sobreposta à direita do item, e não em fluxo: o botão de navegação já
      // ocupa a linha inteira, e encolhê-lo para caber a estrela mexeria no
      // alvo de clique de toda a barra por causa de um controle secundário.
      className="-translate-y-1/2 absolute top-1/2 right-1 z-10"
      onAlternar={() => {
        if (daTela) escrita.excluir(daTela.id)
        else
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
      }}
    />
  )
}

export function GrupoFavoritos() {
  const { data } = useViews()
  const favoritas = viewsFavoritas(data ?? [])

  if (favoritas.length === 0) return null

  return (
    // `<nav>` próprio, e não só um grupo: são destinos que o USUÁRIO montou, ao
    // lado dos que o sistema oferece. Quem navega por marcos precisa poder pular
    // para eles — e o rótulo é o que separa esta região das telas do módulo.
    <nav aria-label="Consultas favoritas">
      <SidebarGroup className="py-0">
        <SidebarGroupLabel className="t-rotulo">
          {/* O quadradinho do grupo é o mesmo gesto dos grupos de módulo: a cor
              diz de quem é o bloco antes do nome. Aqui o dono é a estrela. */}
          <span
            aria-hidden="true"
            className="mr-2 size-2 shrink-0 rounded-data"
            style={{ background: 'var(--amber-400)' }}
          />
          Favoritos
        </SidebarGroupLabel>
        <SidebarMenu>
          {favoritas.map((view) => (
            <ItemFavorito key={view.id} view={view} />
          ))}
        </SidebarMenu>
      </SidebarGroup>
    </nav>
  )
}
