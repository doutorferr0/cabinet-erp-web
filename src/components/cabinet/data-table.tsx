import { ConsultasFavoritas } from '@/components/cabinet/consultas-favoritas'
import { ListaDeFiltros } from '@/components/cabinet/lista-de-filtros'
import {
  PontoDoModulo,
  colunasDaGrade,
  idsDeclarados,
  moduloDaColuna,
} from '@/components/cabinet/listagem/colunas-da-grade'
import { ColunasPorModulo } from '@/components/cabinet/listagem/colunas-por-modulo'
import { FiltroPorModulo } from '@/components/cabinet/listagem/filtro-por-modulo'
import { MenuDeFiltros } from '@/components/cabinet/menu-de-filtros'
import { Ornamento, OrnamentoDoModulo } from '@/components/cabinet/ornamento'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
// A constante é do CONTRATO de listagem (`pageSize` acima de 100 é 400), e é
// por isso que ela vem da fronteira em vez de ser redigitada aqui: a visão que
// desenha colunas pede o conjunto inteiro, e "inteiro" é um número que o
// servidor define.
import { PAGE_SIZE_MAX } from '@/data/api-provider'
import type { EntidadeCadastro } from '@/features/cadastro/modulos'
import { mensagemDoErro } from '@/lib/erros'
import {
  type FavoritoDeConsulta,
  comPadrao,
  consultaDoFavorito,
  favoritoPadrao,
  gravarFavoritos,
  idDaTela,
  lerFavoritos,
  novoFavoritoId,
} from '@/lib/favoritos-de-consulta'
import {
  type CampoFiltravel,
  type FiltroDaTabela,
  type Juncao,
  filtrosNormalizados,
  filtrosValidos,
} from '@/lib/filtro-de-consulta'
import type { TableFetcher, TableQueryState, TableSort } from '@/lib/table-query'
import { cn } from '@/lib/utils'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
  Rows3,
  Search,
} from 'lucide-react'
import { type ReactNode, useCallback, useEffect, useId, useMemo, useState } from 'react'

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData, TValue> {
    /** Coluna de valor: numerais tabulares alinhados à direita (DESIGN.md, Regra do Número Tabular). */
    numeric?: boolean
  }
}

/** Ação da barra padrão das listagens (transcrição §9, padrão 4). */
export interface DataTableAction<T> {
  id: string
  label: string
  /**
   * Ícone do lucide à esquerda do rótulo. Sempre acompanhado do TEXTO, nunca no
   * lugar dele: a barra é a mesma em 8 telas e o operador a lê por palavra —
   * `Consul.` e `Alterar` são vocabulário do legado, e um olho sozinho não diz
   * qual dos dois é. O desenho serve para achar o botão de longe depois de já
   * ter aprendido onde ele fica.
   *
   * Família LUCIDE, não os shapes brutalist: aqui é AÇÃO ("o que eu faço"), e a
   * fronteira do sistema dá ação ao lucide e lugar ao shape.
   */
  icon?: LucideIcon
  /** Recebe a linha selecionada (null quando `needsSelection` é false). */
  onClick?: (row: T | null) => void
  /** Desabilita sem linha selecionada (Alterar, Consul., Excluir/Cancelar). */
  needsSelection?: boolean
  /** Desabilita SEMPRE — a ação existe na barra mas não é possível aqui. */
  disabled?: boolean
  /** Motivo, no `title` do botão. Obrigatório na prática quando `disabled`: botão
   *  morto e mudo faz o operador achar que é defeito. */
  title?: string
  variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost'
}

/** Id da visão de TABELA — a que toda listagem tem, e a que existe por omissão. */
export const VISAO_LISTA = 'lista'

/**
 * VIEW MODE — a mesma consulta, desenhada de outro jeito.
 *
 * Padrão aprovado para TODO o ERP (core @decisoes, ponto 6), com o funil de
 * vendas como piloto: kanban, lista, gráfico e calendário sobre o **mesmo
 * filtro**. Mora aqui, e não na tela, porque é justamente o "mesmo" que precisa
 * ser garantido: dois componentes lado a lado teriam dois estados de filtro com
 * o mesmo nome, e a tela alternaria entre duas perguntas parecidas.
 *
 * A visão recebe as linhas que a consulta trouxe. Ela **não consulta nada** —
 * quem pergunta é a listagem, uma vez só.
 */
export interface VisaoDaListagem<T> {
  id: string
  rotulo: string
  icon?: LucideIcon
  /**
   * Esta visão desenha COLUNAS a partir de um campo — liga o seletor
   * `Agrupar por`. Visão que não agrupa (um gráfico de barras no tempo, por
   * exemplo) não o mostra: seletor sem efeito é pior que ausência de seletor.
   */
  agrupa?: boolean
  render: (dados: { rows: T[]; agruparPor: string }) => ReactNode
}

/** Campo pelo qual a visão que agrupa monta as colunas. */
export interface OpcaoDeAgrupamento {
  id: string
  rotulo: string
}

/**
 * DENSIDADE da linha — escolha do operador, não do designer.
 *
 * `padrao` é a célula de 52px do `DESIGN.md` §DataTable; `compacta` é 40px, o
 * piso da faixa consolidada (40–44px). Quem confere cinquenta linhas quer as
 * cinquenta na tela; quem lê uma a uma quer respiro. Fixar um dos dois é
 * escolher pelo outro.
 *
 * A troca é CSS puro sobre a mesma marcação — nada de reconsultar nem remontar
 * a tabela, porque densidade não muda o que a consulta trouxe.
 */
export const DENSIDADES = [
  { id: 'padrao', rotulo: 'Padrão' },
  { id: 'compacta', rotulo: 'Compacta' },
] as const

export type Densidade = (typeof DENSIDADES)[number]['id']

export interface VitraDataTableProps<T> {
  columns: ColumnDef<T>[]
  /** Prefixo da query key do TanStack Query (o estado da tabela é anexado). */
  queryKey: readonly unknown[]
  fetcher: TableFetcher<T>
  searchPlaceholder?: string
  /** Barra de ações padrão: Filtro · Incluir · Alterar · Consul. · Excluir/Cancelar · Imprimir. */
  actions?: DataTableAction<T>[]
  pageSizeOptions?: number[]
  /**
   * Coluna de numeração (DESIGN.md §DataTable): primeira coluna, 40px, valor
   * em Meta alinhado à direita, sequencial GLOBAL da consulta (a "linha 12"
   * que o operador diz em voz alta não muda ao trocar de página). Desligada
   * por padrão — listagem de cadastro não numera.
   */
  rowNumbers?: boolean
  /**
   * Campos que esta listagem oferece para filtrar. **Opt-in por tela**, e não é
   * detalhe: quem responde ao filtro é o provider, e nem todo recurso sabe. Os
   * HTTP dependem de o contrato publicar `filters` para o caminho
   * (`/api/products` e `/api/partners` publicam; `catalog-lookups` e
   * `stock-movements`, não) e de o campo estar na whitelist — as duas coisas
   * barram em `filtrosDaTabela`, na fronteira. Ligar o filtro por padrão em toda
   * tabela ofereceria em oito telas uma consulta que metade delas não sabe
   * responder.
   *
   * Sem esta prop a barra segue com o botão `Filtro` que veio em `actions` (o
   * comportamento antigo: leva o foco para a busca).
   */
  filtros?: readonly CampoFiltravel[]
  /**
   * `lista` (padrão) = query-builder em painel, denso, várias condições à vista.
   * `menu` = paleta de comandos com etiquetas na própria barra. A escolha é da
   * tela porque depende do que ela filtra, não do componente.
   */
  modoDeFiltro?: 'lista' | 'menu' | 'modulo'
  /**
   * Visões ALTERNATIVAS à tabela. A tabela existe sempre e não entra na lista —
   * é a visão que toda listagem do ERP tem, e declarar a mesma entrada em oito
   * telas seria repetir o que nunca varia.
   *
   * Sem esta prop não há alternador: a listagem segue tabela e ponto.
   */
  visoes?: readonly VisaoDaListagem<T>[]
  /** Campos oferecidos no `Agrupar por` da visão que agrupa. */
  agrupamentos?: readonly OpcaoDeAgrupamento[]
  /**
   * Com que visão a tela ABRE. Padrão: a tabela. O funil abre no quadro porque
   * o quadro é o que a tela é — abrir na tabela obrigaria um clique diário para
   * chegar onde o operador já ia.
   */
  visaoInicial?: string
  /**
   * A entidade do schema de módulos — obrigatória em `modoDeFiltro: 'modulo'`.
   *
   * É dela que saem os chips, os campos de cada painel e a cor de cada pill. A
   * prop `filtros` (lista de `CampoFiltravel`) **não serve** para isso: ela é
   * uma lista plana, e o que o modo por módulo precisa é justamente o
   * agrupamento — qual campo pertence a que assunto.
   */
  entidade?: EntidadeCadastro
  /**
   * Avisa quem monta a tela qual linha está marcada — inclusive o `null` de
   * quando a seleção se perde (troca de página, busca nova, filtro).
   *
   * Existe porque a ação de registro saiu da barra e subiu para o cabeçalho da
   * página (Polaris-2, #197): `Alterar` fora da tabela precisa saber sobre qual
   * registro age. A tabela CONTINUA dona da seleção — isto é notificação, não
   * controle: passar a linha de volta para cá daria dois donos do mesmo estado.
   */
  onSelecaoChange?: (row: T | null) => void
}

const SEARCH_DEBOUNCE_MS = 300

const SKELETON_ROWS = ['sk-1', 'sk-2', 'sk-3', 'sk-4', 'sk-5'] as const

/**
 * Igualdade do filtro por VALOR, não por referência.
 *
 * O rascunho reconstrói o array a cada tecla, então comparar referência marcaria
 * "mudou" sempre — e cada `setState` voltaria a listagem para a página 1 e
 * perderia a seleção sem que nada de fato tivesse mudado.
 */
function assinaturaDoFiltro(
  filtros: readonly FiltroDaTabela[] | undefined,
  juncao: Juncao,
): string {
  return JSON.stringify({ filtros: filtros ?? [], juncao })
}

/**
 * Falhou ≠ vazio: o operador precisa saber se avisa alguém ou se a consulta não
 * tem resultado mesmo. Com o backend real, essa distinção é a diferença entre
 * "some" e "não existe".
 *
 * Componente, e não bloco solto dentro da tabela, porque as VISÕES respondem à
 * mesma consulta: um quadro que falha calado, ao lado de uma tabela que explica,
 * seria a mesma tela contando duas histórias sobre a mesma requisição.
 */
function FalhaDaConsulta({ erro, aoTentar }: { erro: unknown; aoTentar: () => void }) {
  return (
    // Mesma anatomia dos vazios, com o ornamento de FALHA — o triângulo partido
    // em Tomato, que não é o vermelho de erro: a consulta não chegou, ninguém
    // fez nada errado e não há cadastro para consertar. Vermelho aqui mandaria o
    // operador procurar culpa onde só houve rede.
    <Empty>
      <EmptyMedia>
        <Ornamento shape="falha-rede" tom="offline" tamanho={96} />
      </EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>Não foi possível carregar a consulta</EmptyTitle>
        <EmptyDescription>
          {/* O `detail` do problem+json é a frase que o backend escolheu para o
              caso — é a única informação acionável da resposta. Sem ela, a
              orientação genérica. */}
          {mensagemDoErro(erro, 'A consulta não chegou ao servidor. Tente de novo em instantes.')}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" size="sm" onClick={aoTentar}>
          Tentar de novo
        </Button>
      </EmptyContent>
    </Empty>
  )
}

/**
 * Os dois vazios NÃO dizem a mesma coisa, e essa é a razão de existirem
 * separados: "não existe registro" pede cadastrar; "a busca não achou" pede
 * corrigir o termo. Tratar os dois com uma frase só é o que faz o operador
 * procurar defeito onde não há.
 *
 * O ornamento acompanha: shape do módulo num caso, shape de busca na cor de
 * apoio no outro — vazio de busca não é módulo vazio. Ele é `aria-hidden`; quem
 * informa é o título.
 *
 * FILTRO conta como consulta: listagem estreitada até zero com "Ainda não há
 * nada cadastrado aqui" mandaria cadastrar registro que existe e está do lado de
 * fora do filtro.
 */
function VazioDaConsulta({ q, temFiltro }: { q: string; temFiltro: boolean }) {
  const houveConsulta = q !== '' || temFiltro
  return (
    <Empty>
      <EmptyMedia>
        {houveConsulta ? (
          <Ornamento shape="busca-vazia" tom="info" tamanho={96} />
        ) : (
          <OrnamentoDoModulo tamanho={128} />
        )}
      </EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>{houveConsulta ? 'Nenhum registro encontrado' : 'Nenhum registro'}</EmptyTitle>
        <EmptyDescription>
          {q && temFiltro
            ? `A busca por “${q}” com os filtros aplicados não trouxe resultado. Confira o termo ou revise os filtros.`
            : q
              ? `A busca por “${q}” não trouxe resultado. Confira o termo ou limpe a busca.`
              : temFiltro
                ? 'Nenhum registro atende aos filtros aplicados. Revise as condições ou limpe os filtros.'
                : 'Ainda não há nada cadastrado aqui.'}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

export function VitraDataTable<T>({
  columns,
  queryKey,
  fetcher,
  searchPlaceholder = 'Busca pelo código:',
  actions = [],
  pageSizeOptions = [10, 20, 50],
  rowNumbers = false,
  filtros: camposFiltraveis,
  modoDeFiltro = 'lista',
  visoes,
  agrupamentos,
  visaoInicial = VISAO_LISTA,
  entidade,
  onSelecaoChange,
}: VitraDataTableProps<T>) {
  const [qInput, setQInput] = useState('')
  const [state, setState] = useState<TableQueryState>({
    q: '',
    sort: null,
    page: 1,
    pageSize: pageSizeOptions[0] ?? 10,
  })
  const [selected, setSelected] = useState<T | null>(null)
  // Rascunho do filtro, como `qInput` é o rascunho da busca: o painel responde
  // à tecla na hora e só a frase COMPLETA vira consulta, depois do debounce.
  // Sem isso, cada letra digitada num valor viraria uma ida ao servidor.
  const [filtrosInput, setFiltrosInput] = useState<FiltroDaTabela[]>([])
  const [juncao, setJuncao] = useState<Juncao>('and')
  // Colunas OPCIONAIS ligadas pelo seletor. Vazio = a grade que a tela declarou,
  // e é por isso que o estado nasce aqui e não na tela: quem monta a listagem
  // escolhe a identidade da linha, não o que o operador quer ver hoje.
  const [colunasExtras, setColunasExtras] = useState<string[]>([])

  // A visão e o agrupamento não entram no `TableQueryState`: nenhum dos dois
  // muda o CONJUNTO de registros, só o desenho. Somá-los à chave de cache faria
  // alternar quadro ⇄ lista refazer uma consulta cuja resposta é a mesma.
  const [visaoId, setVisaoId] = useState(visaoInicial)
  const [densidade, setDensidade] = useState<Densidade>('padrao')
  // O `name` agrupa os rádios, e precisa ser único por INSTÂNCIA: duas
  // listagens na mesma página (a janela de busca sobre a tela) dividiriam o
  // grupo e uma desmarcaria a visão da outra.
  const grupoDeVisao = useId()
  const agrupamentoInicial = agrupamentos?.[0]?.id ?? ''
  const [agruparPor, setAgruparPor] = useState(agrupamentoInicial)
  // Id desconhecido (favorito gravado antes de a visão ser renomeada) cai na
  // tabela em vez de derrubar a tela: a tabela responde a mesma pergunta.
  const visaoAtiva = visoes?.find((visao) => visao.id === visaoId) ?? null

  // Consultas favoritas: a identidade da tela vem do `queryKey`, que já é o nome
  // estável da listagem. `useState` com inicializador preguiçoso — ler o
  // armazenamento a cada render seria I/O síncrono por tecla digitada.
  const telaId = useMemo(() => idDaTela(queryKey), [queryKey])
  const [favoritos, setFavoritos] = useState<FavoritoDeConsulta[]>(() => lerFavoritos(telaId))

  // O aviso sai de UM lugar, e por efeito: a seleção se perde em seis pontos
  // diferentes (clique na linha, troca de página, busca, filtro, visão,
  // consulta favorita), e chamar o callback em cada um deles deixaria o
  // cabeçalho da página com uma linha que a tabela já esqueceu no dia em que
  // alguém acrescentasse o sétimo.
  useEffect(() => {
    onSelecaoChange?.(selected)
  }, [selected, onSelecaoChange])

  // Toda mudança de estado de consulta limpa a seleção.
  function updateState(updater: (s: TableQueryState) => TableQueryState) {
    setSelected(null)
    setState(updater)
  }

  // Debounce da busca; qualquer mudança de busca volta para a página 1.
  useEffect(() => {
    const t = setTimeout(() => {
      setState((s) => {
        if (s.q === qInput) return s
        setSelected(null)
        return { ...s, q: qInput, page: 1 }
      })
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [qInput])

  // Mesmo debounce da busca, pela mesma razão. Só os filtros VÁLIDOS viajam:
  // linha recém-adicionada ainda sem valor não pode esvaziar a listagem
  // enquanto o operador escolhe o campo.
  useEffect(() => {
    const t = setTimeout(() => {
      setState((s) => {
        // Normaliza DEPOIS de decidir o que já é frase completa: um CNPJ meio
        // digitado continua sendo filtro sem valor, e limpar a máscara antes
        // não muda isso.
        const validos = filtrosNormalizados(filtrosValidos(filtrosInput), camposFiltraveis ?? [])
        if (
          assinaturaDoFiltro(s.filtros, s.juncao ?? 'and') === assinaturaDoFiltro(validos, juncao)
        )
          return s
        setSelected(null)
        return { ...s, filtros: validos, juncao, page: 1 }
      })
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [filtrosInput, juncao, camposFiltraveis])

  /** Aplica uma consulta salva: filtros, junção, ordenação, visão e agrupamento. */
  const aplicarConsulta = useCallback((favorito: FavoritoDeConsulta) => {
    const consulta = consultaDoFavorito(favorito)
    setFiltrosInput(consulta.filtros)
    setJuncao(consulta.juncao)
    setSelected(null)
    // Vazio = o favorito não fala de visão (foi gravado antes dos view modes).
    // Tratá-lo como "volte ao padrão" mudaria o desenho da tela sem ninguém ter
    // pedido, e o operador atribuiria o salto ao filtro que acabou de aplicar.
    if (consulta.visao) setVisaoId(consulta.visao)
    if (consulta.agruparPor) setAgruparPor(consulta.agruparPor)
    if (consulta.densidade === 'padrao' || consulta.densidade === 'compacta') {
      setDensidade(consulta.densidade)
    }
    // A ordenação NÃO passa pelo debounce dos filtros: ela não é digitada, e
    // esperar 300ms por ela faria a tabela reordenar depois de já ter mudado.
    setState((s) => ({ ...s, sort: consulta.sort, page: 1 }))
  }, [])

  // O favorito PADRÃO abre a tela: é a consulta que se repete todo dia, e
  // obrigar dois cliques nela seria cobrar pelo caso mais frequente. Roda uma
  // vez por tela — `telaId` só muda quando a listagem muda.
  useEffect(() => {
    const padrao = favoritoPadrao(lerFavoritos(telaId))
    if (padrao) aplicarConsulta(padrao)
  }, [telaId, aplicarConsulta])

  function atualizarFavoritos(proximos: FavoritoDeConsulta[]) {
    setFavoritos(proximos)
    gravarFavoritos(telaId, proximos)
  }

  /**
   * A visão que desenha colunas pede o conjunto INTEIRO, não uma página.
   *
   * Uma coluna montada com a página 1 seria uma coluna FALSA: mostraria três
   * cartões numa etapa que tem trinta, e o total da coluna somaria só o que
   * coube na página. Paginar um quadro é oferecer o erro sem o sintoma — a
   * tela pareceria completa. Quando nem o teto do contrato basta, o rodapé diz
   * quantos ficaram de fora, em vez de cortar calado.
   */
  const estadoDaConsulta = useMemo(
    () => (visaoAtiva ? { ...state, page: 1, pageSize: PAGE_SIZE_MAX } : state),
    [state, visaoAtiva],
  )

  const query = useQuery({
    queryKey: [...queryKey, estadoDaConsulta],
    queryFn: () => fetcher(estadoDaConsulta),
    placeholderData: keepPreviousData,
  })

  const rows = useMemo(() => query.data?.rows ?? [], [query.data])
  const total = query.data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / state.pageSize))

  // A grade é o que a TELA declarou mais o que o operador ligou. A soma mora
  // aqui, e não na tela, para a coluna extra nascer com a mesma célula e a
  // mesma regra de ordenação em todas as oito listagens.
  const declaradas = useMemo(() => idsDeclarados(columns), [columns])
  const colunasDaTabela = useMemo(
    () =>
      entidade ? [...columns, ...colunasDaGrade<T>(entidade, colunasExtras, declaradas)] : columns,
    [columns, entidade, colunasExtras, declaradas],
  )

  const table = useReactTable({
    data: rows,
    columns: colunasDaTabela,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
  })

  // Folha total de colunas (grupos contam as folhas) + a numeração opcional.
  const totalColSpan = table.getAllLeafColumns().length + (rowNumbers ? 1 : 0)

  const temFiltro = (state.filtros?.length ?? 0) > 0

  function toggleSort(columnId: string) {
    updateState((s) => {
      const next: TableSort | null =
        s.sort?.id !== columnId
          ? { id: columnId, desc: false }
          : s.sort.desc
            ? null
            : { id: columnId, desc: true }
      return { ...s, sort: next, page: 1 }
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            aria-label="Busca"
            className="pl-8"
            placeholder={searchPlaceholder}
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
          />
        </div>
        {actions.map((action) => {
          // O filtro estruturado OCUPA o lugar do botão `Filtro` da barra padrão
          // (§9, padrão 4) em vez de somar um botão ao lado: a barra tem a mesma
          // ordem em oito telas, e dois caminhos para "filtrar" lado a lado
          // fariam o operador escolher qual dos dois é o de verdade.
          if (action.id === 'filtro' && camposFiltraveis && camposFiltraveis.length > 0) {
            // O painel de filtro e a lista de consultas salvas saem JUNTOS deste
            // slot: são o mesmo assunto ("que pergunta esta tela está fazendo"),
            // e separá-los pela barra afastaria montar de repetir.
            const salvas = (
              <ConsultasFavoritas
                key="consultas"
                favoritos={favoritos}
                // Visão e agrupamento CONTAM como consulta montada: "o funil em
                // quadro, agrupado por responsável" é uma pergunta com nome,
                // mesmo sem filtro nenhum. Comparar com o estado inicial da
                // tela, e não com um valor fixo, evita oferecer salvar o que a
                // tela já faz sozinha ao abrir.
                podeSalvar={
                  filtrosValidos(filtrosInput).length > 0 ||
                  state.sort !== null ||
                  visaoId !== visaoInicial ||
                  agruparPor !== agrupamentoInicial ||
                  densidade !== 'padrao'
                }
                onAplicar={aplicarConsulta}
                onSalvar={(nome) =>
                  atualizarFavoritos([
                    ...favoritos,
                    {
                      id: novoFavoritoId(),
                      nome,
                      filtros: filtrosValidos(filtrosInput),
                      juncao,
                      sort: state.sort,
                      visao: visaoId,
                      agruparPor,
                      densidade,
                      padrao: false,
                    },
                  ])
                }
                onExcluir={(id) => atualizarFavoritos(favoritos.filter((f) => f.id !== id))}
                onTornarPadrao={(id) => atualizarFavoritos(comPadrao(favoritos, id))}
              />
            )
            // O modo por módulo (#104) troca a barra plana pela faixa de
            // chips. Reusa o MESMO `filtrosInput`, então debounce, consulta
            // favorita e a recusa na fronteira continuam valendo de graça — a
            // diferença é só como o operador monta a pergunta.
            if (modoDeFiltro === 'modulo' && entidade) {
              // O seletor de colunas sai no MESMO slot, e não numa barra
              // própria: filtro, consulta salva e colunas respondem juntos "como
              // esta listagem está montada agora". Separá-los faria o operador
              // procurar em dois lugares o ajuste da mesma pergunta.
              return (
                <span key={action.id} className="contents">
                  <FiltroPorModulo
                    entidade={entidade}
                    filtros={filtrosInput}
                    onChange={setFiltrosInput}
                  />
                  <ColunasPorModulo
                    entidade={entidade}
                    extras={colunasExtras}
                    fixas={declaradas}
                    onChange={setColunasExtras}
                  />
                  {salvas}
                </span>
              )
            }
            return modoDeFiltro === 'menu' ? (
              <span key={action.id} className="contents">
                <MenuDeFiltros
                  campos={camposFiltraveis}
                  filtros={filtrosInput}
                  juncao={juncao}
                  onFiltrosChange={setFiltrosInput}
                />
                {salvas}
              </span>
            ) : (
              <span key={action.id} className="contents">
                <ListaDeFiltros
                  campos={camposFiltraveis}
                  filtros={filtrosInput}
                  juncao={juncao}
                  onFiltrosChange={setFiltrosInput}
                  onJuncaoChange={setJuncao}
                />
                {salvas}
              </span>
            )
          }
          return (
            <Button
              key={action.id}
              variant={action.variant ?? 'outline'}
              size="sm"
              disabled={
                action.disabled === true || (action.needsSelection === true && selected === null)
              }
              title={
                // Ação de linha numa visão sem linha: o botão já ficava
                // desabilitado (nada selecionado) e MUDO, e um botão morto sem
                // motivo é lido como defeito. Aqui o motivo é o desenho da tela,
                // não a falta de um clique.
                action.needsSelection === true && visaoAtiva
                  ? `Só na visão Lista: ${visaoAtiva.rotulo} não tem linha para selecionar.`
                  : action.title
              }
              onClick={() => action.onClick?.(action.needsSelection ? selected : null)}
            >
              {action.icon ? <action.icon aria-hidden="true" className="text-modulo" /> : null}
              {action.label}
            </Button>
          )
        })}

        {visoes && visoes.length > 0 ? (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {/* `Agrupar por` fica ANTES do alternador porque descreve a visão
                que está à direita dele — e some quando a visão ativa não agrupa,
                em vez de virar controle sem efeito. */}
            {visaoAtiva?.agrupa && agrupamentos && agrupamentos.length > 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <label htmlFor="vitra-agrupar-por">Agrupar por:</label>
                <select
                  id="vitra-agrupar-por"
                  // Mesma caixa preta 2px do seletor de tamanho de página: os
                  // dois são escolhas sobre COMO a listagem se apresenta.
                  className="h-8 border-2 border-input bg-card px-2 text-sm outline-none focus-visible:focus-ring"
                  value={agruparPor}
                  onChange={(e) => setAgruparPor(e.target.value)}
                >
                  {agrupamentos.map((opcao) => (
                    <option key={opcao.id} value={opcao.id}>
                      {opcao.rotulo}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {/* RÁDIO DE VERDADE, com pele de botão. As visões são exclusivas, e
                o rádio nativo dá de graça o que um grupo de botões pediria à
                mão: andar entre as opções com as setas, uma única parada de Tab
                para o grupo inteiro e o estado dito a quem ouve. O `<input>` fica
                em `sr-only` e o foco aparece no rótulo, senão o anel ficaria
                num controle invisível. */}
            <fieldset className="flex items-center gap-1">
              <legend className="sr-only">Visão da listagem</legend>
              {[{ id: VISAO_LISTA, rotulo: 'Lista', icon: Rows3 }, ...visoes].map((visao) => {
                const ativa = visao.id === visaoId
                return (
                  <label
                    key={visao.id}
                    className={cn(
                      buttonVariants({ variant: ativa ? 'default' : 'outline', size: 'sm' }),
                      'cursor-pointer has-[:focus-visible]:focus-ring',
                    )}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      name={grupoDeVisao}
                      value={visao.id}
                      checked={ativa}
                      onChange={() => {
                        // A seleção é da TABELA; ao sair dela não há linha
                        // marcada, e voltar com a seleção velha apontaria para
                        // uma linha que a consulta pode nem ter trazido de novo.
                        setSelected(null)
                        setVisaoId(visao.id)
                      }}
                    />
                    {visao.icon ? <visao.icon aria-hidden="true" /> : null}
                    {visao.rotulo}
                  </label>
                )
              })}
            </fieldset>
          </div>
        ) : null}
      </div>

      {visaoAtiva ? (
        // A visão troca só o DESENHO. Carregando, falha e vazio continuam sendo
        // os mesmos três estados da mesma consulta — e são desenhados pelas
        // mesmas peças, porque um quadro que fica em branco onde a tabela
        // explicaria faria o operador achar que o funil está vazio.
        <div data-slot="visao" data-visao={visaoAtiva.id}>
          {query.isPending ? (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(238px,1fr))] gap-4">
              {SKELETON_ROWS.map((chave) => (
                <Skeleton key={chave} className="h-64 w-full" />
              ))}
            </div>
          ) : query.isError ? (
            <div className="rounded-data border-2 border-border py-8 shadow-el3">
              <FalhaDaConsulta erro={query.error} aoTentar={() => query.refetch()} />
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-data border-2 border-border py-8 shadow-el3">
              <VazioDaConsulta q={state.q} temFiltro={temFiltro} />
            </div>
          ) : (
            visaoAtiva.render({ rows, agruparPor })
          )}
        </div>
      ) : (
        /* Caixa de DADO (§DataTable): raio 2px, traço 2px, `el-3` e
          `overflow-hidden` — sem o overflow, o canto arredondado do contêiner
          apareceria por baixo do cabeçalho quadrado da primeira fileira. */
        <div className="overflow-hidden rounded-data border-2 border-border shadow-el3">
          {/* `tabular-nums` na TABELA inteira, e não coluna a coluna.
              Medido em `docs/design/medir-tabular.py`: no Inter do corpo o `1`
              avança 833/2048 de em e o `4`, 1323 — numa coluna de valores isso
              é meio caractere de diferença por linha, e a casa decimal deixa de
              formar coluna. A fonte publica `tnum`, então a utility resolve.
              No elemento inteiro porque a alternativa — marcar cada coluna
              numérica — falha na primeira tela que esquecer a `meta`, e falha
              MUDA: o número continua lá, só desalinhado. Data, código e
              telefone alinham junto, o que numa grade de ERP é ganho.
              `meta.numeric` segue existindo, e agora só decide ALINHAMENTO à
              direita, que é outra pergunta. */}
          <Table
            className={cn(
              'tabular-nums',
              // A célula do shadcn traz `h-[52px]`; o seletor de descendente
              // ganha dela por especificidade, sem `!important` e sem tocar no
              // componente compartilhado — outras tabelas do app não mudam.
              densidade === 'compacta' && '[&_td]:h-10',
            )}
          >
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup, hgIndex, headerGroups) => (
                // Cabeçalho agrupado: fileira de grupo separada das sub-colunas
                // por Fio (a sublinha forte fica na fileira das folhas).
                <TableRow
                  key={headerGroup.id}
                  className={cn(hgIndex < headerGroups.length - 1 && 'border-rule-hair!')}
                >
                  {rowNumbers && hgIndex === 0 ? (
                    <TableHead className="w-10" rowSpan={headerGroups.length} />
                  ) : null}
                  {headerGroup.headers.map((header) => {
                    const sortable =
                      header.column.columnDef.enableSorting !== false &&
                      'accessorKey' in header.column.columnDef
                    const active = state.sort?.id === header.column.id
                    const numeric = header.column.columnDef.meta?.numeric === true
                    // A origem da coluna só existe onde a tela declarou a
                    // entidade do schema — nas outras a grade segue sem ponto,
                    // em vez de inventar um módulo para caber no desenho.
                    const modulo = entidade ? moduloDaColuna(entidade, header.column.id) : undefined
                    return (
                      <TableHead
                        key={header.id}
                        colSpan={header.colSpan}
                        // A setinha diz a ordem só para quem enxerga; `aria-sort` é
                        // a mesma informação para quem ouve.
                        aria-sort={
                          sortable
                            ? active
                              ? state.sort?.desc
                                ? 'descending'
                                : 'ascending'
                              : 'none'
                            : undefined
                        }
                        className={cn(header.colSpan > 1 && 'text-center', numeric && 'text-right')}
                      >
                        {header.isPlaceholder ? null : <PontoDoModulo cor={modulo?.cor} />}
                        {header.isPlaceholder ? null : sortable ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 uppercase hover:text-foreground"
                            onClick={() => toggleSort(header.column.id)}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {active &&
                              (state.sort?.desc ? (
                                <ArrowDown className="size-3.5" />
                              ) : (
                                <ArrowUp className="size-3.5" />
                              ))}
                          </button>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {query.isPending ? (
                SKELETON_ROWS.map((rowKey) => (
                  <TableRow key={rowKey}>
                    <TableCell colSpan={totalColSpan}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : query.isError ? (
                <TableRow>
                  <TableCell colSpan={totalColSpan} className="py-8">
                    <FalhaDaConsulta erro={query.error} aoTentar={() => query.refetch()} />
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={totalColSpan} className="py-8">
                    <VazioDaConsulta q={state.q} temFiltro={temFiltro} />
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row, rowIndex) => {
                  const isSelected = selected !== null && row.original === selected
                  return (
                    // Seleção = VIOLETA cheio com texto branco (§DataTable): o
                    // violeta é a cor da AÇÃO, e a linha selecionada é sobre o
                    // que as ações da barra vão agir. O marcador amarelo saiu com
                    // ele — amarelo agora é foco, e foco e seleção são estados
                    // diferentes que precisam de sinais diferentes.
                    <TableRow
                      key={row.id}
                      data-state={isSelected ? 'selected' : undefined}
                      // A linha É o controle de seleção da listagem: parada de
                      // foco, estado anunciado e Enter/Espaço com a mesma regra do
                      // clique (bater de novo solta). Não é atalho — nenhuma tecla
                      // memorizada entra aqui, é o teclado nativo do controle.
                      tabIndex={0}
                      aria-selected={isSelected}
                      className={cn(
                        // O anel de foco é de LINHA, montado nas células: sob
                        // `border-collapse` o `<tr>` não pinta box-shadow, e um
                        // anel por célula viraria uma moldura por coluna.
                        'cursor-pointer outline-none hover:bg-muted focus-visible:focus-ring-row',
                        // Seleção não depende só de cor: além do violeta, a linha
                        // fica em negrito e `aria-selected` diz o estado a quem
                        // ouve. Dinheiro perde a zona aqui — verde sobre violeta
                        // não se lê, e a linha inteira já está marcada.
                        isSelected &&
                          'font-semibold [&>td]:bg-primary [&>td]:text-primary-foreground [&>td_.bg-zone-money]:bg-transparent',
                      )}
                      onClick={() => setSelected(isSelected ? null : row.original)}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter' && e.key !== ' ') return
                        // Espaço rolaria a página; Enter dentro de célula com
                        // controle não deve chegar aqui duas vezes.
                        e.preventDefault()
                        setSelected(isSelected ? null : row.original)
                      }}
                    >
                      {rowNumbers ? (
                        // Numeração em Meta, sequencial global da consulta.
                        <TableCell className="w-10 text-right font-mono text-[11px] tabular-nums tracking-[0.12em] text-muted-foreground">
                          {(state.page - 1) * state.pageSize + rowIndex + 1}
                        </TableCell>
                      ) : null}
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            cell.column.columnDef.meta?.numeric === true &&
                              'text-right tabular-nums',
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        {/* Contagem em Meta (rótulo de rodapé de tabela); paginação em tabular. */}
        <span className="font-mono text-[11px] uppercase tracking-[0.12em]">
          {/* Consulta que falhou não tem contagem: "0 registros" seria afirmar
              que a consulta voltou vazia, que é exatamente o que não se sabe. */}
          {query.isError ? '— registros' : `${total} registro${total === 1 ? '' : 's'}`}
        </span>

        {visaoAtiva ? (
          // Não há paginação para esconder aqui: a visão pediu o conjunto
          // inteiro. O que pode faltar é o que passa do teto do contrato — e aí
          // o rodapé DIZ, porque um quadro cortado em silêncio é o mesmo defeito
          // da coluna falsa, só que sem controle nenhum na tela para desconfiar.
          !query.isError && total > rows.length ? (
            // `<output>` em vez de `role="status"`: é o mesmo anúncio educado
            // para leitor de tela, com o elemento que já significa isso.
            <output className="text-warn-foreground">
              Mostrando {rows.length} de {total}. Estreite o filtro para ver o resto.
            </output>
          ) : null
        ) : (
          <div className="ml-auto flex items-center gap-2">
            {/* Densidade ao lado do tamanho de página: os dois respondem à
                mesma pergunta — quanto cabe na tela — e separá-los mandaria o
                operador procurar em dois cantos. Só na visão TABELA, porque é
                a altura da LINHA que ela muda; num quadro não haveria o que
                encolher. */}
            <label htmlFor="vitra-densidade">Linha:</label>
            <select
              id="vitra-densidade"
              className="h-8 border-2 border-input bg-card px-2 text-sm outline-none focus-visible:focus-ring"
              value={densidade}
              onChange={(e) => setDensidade(e.target.value as Densidade)}
            >
              {DENSIDADES.map((opcao) => (
                <option key={opcao.id} value={opcao.id}>
                  {opcao.rotulo}
                </option>
              ))}
            </select>
            <label htmlFor="vitra-page-size">Por página:</label>
            <select
              id="vitra-page-size"
              // Mesma caixa preta 2px dos selects do formulário (radius 0 é lei).
              className="h-8 border-2 border-input bg-card px-2 text-sm tabular-nums outline-none focus-visible:focus-ring"
              value={state.pageSize}
              onChange={(e) =>
                updateState((s) => ({ ...s, pageSize: Number(e.target.value), page: 1 }))
              }
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              size="sm"
              disabled={state.page <= 1}
              onClick={() => updateState((s) => ({ ...s, page: s.page - 1 }))}
            >
              {/* A seta é a DIREÇÃO, e vem do lado para onde ela leva: à esquerda
                no Anterior, à direita no Próxima. O rótulo continua escrito —
                paginação por seta muda é o clássico que obriga a adivinhar. */}
              <ChevronLeft aria-hidden="true" />
              Anterior
            </Button>
            <span className="tabular-nums">
              Página {state.page} de {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={state.page >= pageCount}
              onClick={() => updateState((s) => ({ ...s, page: s.page + 1 }))}
            >
              Próxima
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
