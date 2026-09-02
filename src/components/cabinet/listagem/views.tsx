import type { SavedViewDto, SavedViewWriteRequest } from '@/api/gerado'
import { CHAVE_VIEWS, corpoDaView, useEscritaDeView, useViews, viewsDaRota } from '@/data/views-api'
import {
  type CampoFiltravel,
  type FiltroDaTabela,
  type Juncao,
  novoFiltroId,
} from '@/lib/filtro-de-consulta'
import type { TableSort } from '@/lib/table-query'
import { cn } from '@/lib/utils'
import { Star } from 'lucide-react'

/**
 * VIEWS SALVAS na listagem — a PERSISTÊNCIA (D13).
 *
 * O desenho da barra de abas é da listagem (D5/D9); o que mora aqui é o que
 * torna a aba durável: ler as views da tela, escrever a que o operador nomeou,
 * e traduzir entre o registro do servidor (`SavedViewDto`) e o estado da tabela
 * (`ConsultaDaView`). São dois vocabulários de propósito — o servidor guarda
 * `field`/`operator`/`value`, e a tabela precisa de variante e de chave de linha,
 * que são decisão de tela e não viajam no fio.
 *
 * ## O que a view guarda, e o que ela NÃO guarda
 *
 * Filtros, junção, ordem, agrupamento, colunas e visão. **`page` e `q` ficam de
 * fora** — a página é onde o operador parou de rolar e o `q` é pergunta pontual;
 * restaurar os dois abriria o favorito na página 4 de uma busca que ninguém
 * lembra ter feito. É a mesma regra que os favoritos locais já seguiam, agora
 * escrita no contrato (`SavedViewDto`) em vez de num tipo só nosso.
 *
 * ## O mecanismo LOCAL anterior ainda existe, e some em D5
 *
 * `src/lib/favoritos-de-consulta.ts` guarda a mesma ideia em `localStorage`, por
 * tela, e é quem a `data-table` consome hoje. Ele nasceu quando não havia
 * contrato para preferência de usuário; agora há. **Os dois coexistem por uma
 * fronteira de issue, não por desenho:** trocar o consumidor é mexer em
 * `data-table.tsx`, que é zona de D5. Enquanto durar, um favorito salvo pela
 * listagem não aparece na barra lateral — o que aparece lá é o que passou por
 * ESTE caminho. Registrado na #481.
 *
 * ## Vazio é "não guardou", não "volte ao padrão"
 *
 * `mode`/`groupBy` vazios e `columns` vazio significam que aquela view não fala
 * daquilo, e aplicá-la não mexe no que está na tela. É o que mantém válida a
 * view salva antes de a tela ganhar visão nova — e é diferente de "nenhuma
 * coluna", que seria uma grade em branco.
 */

/** O recorte do estado da tabela que uma view carrega. */
export interface ConsultaDaView {
  filtros: FiltroDaTabela[]
  juncao: Juncao
  sort: TableSort | null
  visao: string
  agruparPor: string
  colunas: string[]
}

/**
 * A view → o estado da tabela, com **chaves de linha novas**.
 *
 * `filtroId` é identidade de linha em memória: uma gravada meses atrás pode
 * colidir com a linha que o operador acabou de acrescentar, e aí editar uma
 * mexeria na outra. Regenerar ao aplicar custa nada e fecha o caso.
 *
 * A VARIANTE (qual controle desenhar) não viaja no fio e vem dos campos
 * filtráveis que a tela declara. Campo que a tela não conhece mais — coluna
 * removida depois da view salva — cai em `texto`, que é o controle que aceita
 * qualquer valor: some da tela é pior, porque o filtro continuaria valendo na
 * consulta sem aparecer em lugar nenhum.
 */
export function consultaDaView(
  view: SavedViewDto,
  campos: readonly CampoFiltravel[] = [],
): ConsultaDaView {
  return {
    filtros: (view.filters ?? []).map((f) => ({
      filtroId: novoFiltroId(),
      id: f.field,
      variante: campos.find((c) => c.id === f.field)?.variante ?? 'text',
      operador: f.operator,
      valor: f.value ?? '',
    })),
    juncao: view.joinOperator === 'or' ? 'or' : 'and',
    sort: view.sortBy ? { id: view.sortBy, desc: view.sortDesc === true } : null,
    visao: view.mode ?? '',
    agruparPor: view.groupBy ?? '',
    colunas: [...(view.columns ?? [])],
  }
}

/** O estado da tabela → o corpo de escrita. O inverso exato de `consultaDaView`. */
export function corpoDaConsulta(
  rota: string,
  nome: string,
  consulta: ConsultaDaView,
): SavedViewWriteRequest {
  return {
    route: rota,
    name: nome,
    color: 'neutro',
    filters: consulta.filtros.map((f) => ({
      field: f.id,
      operator: f.operador,
      value: f.valor,
    })),
    joinOperator: consulta.juncao,
    sortBy: consulta.sort?.id ?? null,
    sortDesc: consulta.sort?.desc ?? false,
    groupBy: consulta.agruparPor,
    columns: consulta.colunas,
    mode: consulta.visao,
    favorite: false,
  }
}

export interface ViewsDaTela {
  views: SavedViewDto[]
  carregando: boolean
  /** Salva a consulta que está na tela com um nome. Nasce fora dos Favoritos. */
  salvar: (nome: string, consulta: ConsultaDaView) => void
  renomear: (view: SavedViewDto, nome: string) => void
  /** A ESTRELA — fixa/solta a view no grupo FAVORITOS da barra lateral. */
  favoritar: (view: SavedViewDto) => void
  excluir: (view: SavedViewDto) => void
  gravando: boolean
  falhou: boolean
}

/**
 * As views DESTA tela, e as quatro escritas do DoD.
 *
 * A consulta é a do app inteiro (`useViews`), recortada aqui: a barra lateral
 * mostra os favoritos de todas as telas ao mesmo tempo, e uma consulta por rota
 * faria favoritar na listagem acender a estrela na aba sem acender o item na
 * sidebar até o próximo F5. Ver o cabeçalho de `views-api.ts` — a chave única
 * (`CHAVE_VIEWS`) é o que dá o "sem reload".
 */
export function useViewsDaTela(rota: string): ViewsDaTela {
  const consulta = useViews()
  const escrita = useEscritaDeView()
  const views = viewsDaRota(consulta.data ?? [], rota)

  return {
    views,
    carregando: consulta.isPending,
    salvar: (nome, atual) => escrita.criar(corpoDaConsulta(rota, nome, atual)),
    // As três seguintes passam pelo `corpoDaView`, e não por um corpo montado à
    // mão, porque **PUT substitui o registro inteiro**: renomear mandando só
    // `{ name }` apagaria filtros, cor e a estrela.
    renomear: (view, nome) =>
      escrita.gravar({ id: view.id, corpo: corpoDaView(view, { name: nome }) }),
    favoritar: (view) =>
      escrita.gravar({ id: view.id, corpo: corpoDaView(view, { favorite: !view.favorite }) }),
    excluir: (view) => escrita.excluir(view.id),
    gravando: escrita.gravando,
    falhou: escrita.falhou,
  }
}

export { CHAVE_VIEWS }

/**
 * A ESTRELA — o mesmo botão na aba da view e no item da barra lateral.
 *
 * Um componente só porque o gesto é um só: fixar no grupo FAVORITOS. Dois
 * desenhos divergiriam no primeiro ajuste, e o operador leria dois controles
 * diferentes para a mesma coisa.
 *
 * **É `<button>` com nome acessível, nunca um ★ decorativo.** A cor sozinha diria
 * o estado a quem enxerga a cor; o `aria-pressed` diz a quem navega por leitor
 * de tela, e o rótulo diz o que o clique FAZ.
 */
export function EstrelaDeView({
  nome,
  favorita,
  onAlternar,
  className,
}: {
  nome: string
  favorita: boolean
  onAlternar: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      aria-pressed={favorita}
      aria-label={favorita ? `Tirar ${nome} dos favoritos` : `Fixar ${nome} nos favoritos`}
      title={favorita ? 'Nos favoritos' : 'Fixar nos favoritos'}
      onClick={onAlternar}
      className={cn(
        // Fora do hover a estrela apagada some, como no mockup: ela é o segundo
        // gesto, não parte do rótulo. A fixada fica sempre visível — some seria
        // esconder o estado.
        'shrink-0 rounded-data p-0.5 text-muted-foreground opacity-0 transition-opacity',
        // Duas variantes de grupo porque os dois consumidores nomeiam o grupo
        // diferente: a aba da listagem usa `group` solto e o item da barra usa
        // o `group/menu-item` do shadcn. Uma só deixaria a estrela invisível de
        // um dos lados — e invisível sem estar desligada é o pior dos dois.
        'focus-visible:opacity-100 group-hover:opacity-100 group-hover/menu-item:opacity-100',
        favorita && 'text-warn opacity-100',
        className,
      )}
    >
      <Star aria-hidden="true" className="size-3.5" {...(favorita && { fill: 'currentColor' })} />
    </button>
  )
}
