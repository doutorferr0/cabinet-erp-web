import { ConsultasFavoritas } from '@/components/cabinet/consultas-favoritas'
import { ListaDeFiltros } from '@/components/cabinet/lista-de-filtros'
import { MenuDeFiltros } from '@/components/cabinet/menu-de-filtros'
import { Ornamento, OrnamentoDoModulo } from '@/components/cabinet/ornamento'
import { Button } from '@/components/ui/button'
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
  Search,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

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
  modoDeFiltro?: 'lista' | 'menu'
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

  // Consultas favoritas: a identidade da tela vem do `queryKey`, que já é o nome
  // estável da listagem. `useState` com inicializador preguiçoso — ler o
  // armazenamento a cada render seria I/O síncrono por tecla digitada.
  const telaId = useMemo(() => idDaTela(queryKey), [queryKey])
  const [favoritos, setFavoritos] = useState<FavoritoDeConsulta[]>(() => lerFavoritos(telaId))

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

  /** Aplica uma consulta salva: filtros, junção e ordenação de uma vez. */
  const aplicarConsulta = useCallback((favorito: FavoritoDeConsulta) => {
    const consulta = consultaDoFavorito(favorito)
    setFiltrosInput(consulta.filtros)
    setJuncao(consulta.juncao)
    setSelected(null)
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

  const query = useQuery({
    queryKey: [...queryKey, state],
    queryFn: () => fetcher(state),
    placeholderData: keepPreviousData,
  })

  const rows = useMemo(() => query.data?.rows ?? [], [query.data])
  const total = query.data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / state.pageSize))

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
  })

  // Folha total de colunas (grupos contam as folhas) + a numeração opcional.
  const totalColSpan = table.getAllLeafColumns().length + (rowNumbers ? 1 : 0)

  const temFiltro = (state.filtros?.length ?? 0) > 0
  const houveConsulta = state.q !== '' || temFiltro

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
                podeSalvar={filtrosValidos(filtrosInput).length > 0 || state.sort !== null}
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
                      padrao: false,
                    },
                  ])
                }
                onExcluir={(id) => atualizarFavoritos(favoritos.filter((f) => f.id !== id))}
                onTornarPadrao={(id) => atualizarFavoritos(comPadrao(favoritos, id))}
              />
            )
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
              title={action.title}
              onClick={() => action.onClick?.(action.needsSelection ? selected : null)}
            >
              {action.icon ? <action.icon aria-hidden="true" className="text-modulo" /> : null}
              {action.label}
            </Button>
          )
        })}
      </div>

      {/* Caixa de DADO (§DataTable): raio 2px, traço 2px, `el-3` e
          `overflow-hidden` — sem o overflow, o canto arredondado do contêiner
          apareceria por baixo do cabeçalho quadrado da primeira fileira. */}
      <div className="overflow-hidden rounded-data border-2 border-border shadow-el3">
        <Table>
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
              // Falhou ≠ vazio: o operador precisa saber se avisa alguém ou se a
              // consulta não tem resultado mesmo. Com o backend real, essa
              // distinção é a diferença entre "some" e "não existe".
              <TableRow>
                <TableCell colSpan={totalColSpan} className="py-8">
                  {/* Mesma anatomia dos vazios, com o ornamento de FALHA — o
                      triângulo partido em Tomato, que não é o vermelho de erro:
                      a consulta não chegou, ninguém fez nada errado e não há
                      cadastro para consertar. Vermelho aqui mandaria o operador
                      procurar culpa onde só houve rede. */}
                  <Empty>
                    <EmptyMedia>
                      <Ornamento shape="falha-rede" tom="offline" tamanho={96} />
                    </EmptyMedia>
                    <EmptyHeader>
                      <EmptyTitle>Não foi possível carregar a consulta</EmptyTitle>
                      <EmptyDescription>
                        {/* O `detail` do problem+json é a frase que o backend
                            escolheu para o caso — é a única informação acionável
                            da resposta. Sem ela, a orientação genérica. */}
                        {mensagemDoErro(
                          query.error,
                          'A consulta não chegou ao servidor. Tente de novo em instantes.',
                        )}
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <Button variant="outline" size="sm" onClick={() => query.refetch()}>
                        Tentar de novo
                      </Button>
                    </EmptyContent>
                  </Empty>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={totalColSpan} className="py-8">
                  {/* Os dois vazios NÃO dizem a mesma coisa, e essa é a razão
                      de existirem separados: "não existe registro" pede
                      cadastrar; "a busca não achou" pede corrigir o termo.
                      Tratar os dois com uma frase só é o que faz o operador
                      procurar defeito onde não há.
                      O ornamento acompanha: shape do módulo num caso, shape de
                      busca na cor de apoio no outro — vazio de busca não é
                      módulo vazio. Ele é `aria-hidden`; quem informa é o
                      título.
                      FILTRO conta como consulta: listagem estreitada até zero
                      com "Ainda não há nada cadastrado aqui" mandaria cadastrar
                      registro que existe e está do lado de fora do filtro. */}
                  <Empty>
                    <EmptyMedia>
                      {houveConsulta ? (
                        <Ornamento shape="busca-vazia" tom="info" tamanho={96} />
                      ) : (
                        <OrnamentoDoModulo tamanho={128} />
                      )}
                    </EmptyMedia>
                    <EmptyHeader>
                      <EmptyTitle>
                        {houveConsulta ? 'Nenhum registro encontrado' : 'Nenhum registro'}
                      </EmptyTitle>
                      <EmptyDescription>
                        {state.q && temFiltro
                          ? `A busca por “${state.q}” com os filtros aplicados não trouxe resultado. Confira o termo ou revise os filtros.`
                          : state.q
                            ? `A busca por “${state.q}” não trouxe resultado. Confira o termo ou limpe a busca.`
                            : temFiltro
                              ? 'Nenhum registro atende aos filtros aplicados. Revise as condições ou limpe os filtros.'
                              : 'Ainda não há nada cadastrado aqui.'}
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
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
                          cell.column.columnDef.meta?.numeric === true && 'text-right tabular-nums',
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

      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        {/* Contagem em Meta (rótulo de rodapé de tabela); paginação em tabular. */}
        <span className="font-mono text-[11px] uppercase tracking-[0.12em]">
          {/* Consulta que falhou não tem contagem: "0 registros" seria afirmar
              que a consulta voltou vazia, que é exatamente o que não se sabe. */}
          {query.isError ? '— registros' : `${total} registro${total === 1 ? '' : 's'}`}
        </span>
        <div className="ml-auto flex items-center gap-2">
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
      </div>
    </div>
  )
}
