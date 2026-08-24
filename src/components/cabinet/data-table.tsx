import { AbasDeConsulta } from '@/components/cabinet/filtros/abas-de-consulta'
import { consultaDaUrl } from '@/components/cabinet/filtros/filtro-na-url'
import { PilulasDeFiltro } from '@/components/cabinet/filtros/pilulas-de-filtro'
import { SincroniaComAUrl } from '@/components/cabinet/filtros/sincronia-com-a-url'
import { ListaDeFiltros } from '@/components/cabinet/lista-de-filtros'
import {
  PontoDoModulo,
  colunasDaGrade,
  idsDeclarados,
  moduloDaColuna,
} from '@/components/cabinet/listagem/colunas-da-grade'
import { ColunasPorModulo } from '@/components/cabinet/listagem/colunas-por-modulo'
import { FiltroPorModulo } from '@/components/cabinet/listagem/filtro-por-modulo'
import { Ornamento, OrnamentoDoModulo } from '@/components/cabinet/ornamento'
import { Button, buttonVariants } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
  type ConsultaSalva,
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
import { useRouter } from '@tanstack/react-router'
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
  /**
   * A caixa de busca livre. Ligada por padrão — é o `q` do `TableQueryState`, e
   * quase todo recurso do contrato o publica.
   *
   * `false` para o recurso que NÃO publica `q`, e aí não é preferência de
   * layout: a caixa aceitaria digitação e o servidor devolveria a mesma página,
   * ensinando ao operador que a peça não está lá quando ela está. O kardex
   * (`ListStockMovements`) é o primeiro caso — o `buscaEm` dele é vazio no
   * backend, e o parâmetro não existe no contrato.
   */
  busca?: boolean
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
   * `pilulas` (padrão) = uma frase removível por condição, na própria barra
   * (#199). `lista` = query-builder em painel, denso, para montar pergunta
   * longa. `modulo` = a faixa de chips por assunto do cadastro (#104). A
   * escolha é da tela porque depende do que ela filtra, não do componente.
   */
  modoDeFiltro?: 'pilulas' | 'lista' | 'modulo'
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
   * A consulta desta listagem VIVE no endereço da janela (#199).
   *
   * Ligada, busca e filtro viram `?q=…&filters=…` e a tela volta ao mesmo lugar
   * depois do F5 ou do link colado no chat. Desligada por padrão porque a MESMA
   * tabela também é montada dentro do dialog da janela de busca (padrão 5) e
   * dentro de teste de componente: ali o endereço é o da tela de trás, e
   * escrever nele faria a busca do dialog filtrar a listagem de baixo ao fechar.
   * Quem liga é a `TelaDeListagem`, que é a tela inteira.
   */
  consultaNoEndereco?: boolean
  /**
   * ABRE a linha — e ligar esta prop muda o gesto da listagem inteira
   * (IndexTable, #198).
   *
   * Com ela, clicar na linha ABRE o registro, como em qualquer lista de
   * aplicativo: some o passo "marca a linha, procura o botão, clica". Marcar
   * passa a ser trabalho do CHECKBOX, que é um alvo declarado, e as ações que
   * dependem de seleção descem para a barra que aparece ao marcar.
   *
   * Sem ela a tabela segue como era: clique na linha MARCA. É o que a janela de
   * busca (§9 padrão 5) precisa — lá escolher é o fim, não o meio.
   */
  aoAbrirLinha?: (row: T) => void
  /**
   * Ações que agem sobre a SELEÇÃO. Só aparecem quando há linha marcada, e na
   * barra de seleção — não na barra de consulta, onde ficariam desabilitadas o
   * dia inteiro esperando um clique que quase nunca vem antes delas.
   */
  acoesDeSelecao?: readonly DataTableAction<T>[]
  /**
   * A saída do vazio de MÓDULO — "não há nada cadastrado aqui" com o botão que
   * resolve isso (#201).
   *
   * Chega por prop, e não da lista de `actions`, porque desde a #202 o
   * `Incluir` mora no cabeçalho da PÁGINA: a tabela deixou de conhecê-lo, e a
   * caixa que anuncia o vazio ficou informando um problema sem oferecer o passo
   * seguinte. Quem liga é a `TelaDeListagem`, que é dona das duas peças.
   *
   * Opcional porque a MESMA tabela é montada na janela de busca (padrão 5): lá
   * o vazio termina em cadastro que ninguém pediu no meio de outro formulário.
   */
  acaoDoVazio?: { label: string; onClick: () => void }
}

const SEARCH_DEBOUNCE_MS = 300

const SKELETON_ROWS = ['sk-1', 'sk-2', 'sk-3', 'sk-4', 'sk-5'] as const

/**
 * Larguras do esqueleto, cicladas por linha e coluna.
 *
 * Texto de verdade não tem a mesma largura duas vezes; uma grade de barras
 * iguais lê como carregamento em bloco, não como tabela chegando. Ciclo fixo, e
 * não sorteio: `Math.random` mudaria o desenho a cada render e o esqueleto
 * piscaria em larguras diferentes enquanto o operador olha.
 */
const LARGURAS_DE_ESQUELETO = ['h-4 w-4/5', 'h-4 w-3/5', 'h-4 w-2/3'] as const

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
function VazioDaConsulta({
  q,
  temFiltro,
  acao,
  aoLimpar,
}: {
  q: string
  temFiltro: boolean
  acao?: { label: string; onClick: () => void } | undefined
  aoLimpar: () => void
}) {
  const houveConsulta = q !== '' || temFiltro
  return (
    <Empty data-testid="vazio-da-consulta">
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
      {/* A saída acompanha o diagnóstico, e por isso são DUAS.
          Módulo vazio termina em cadastrar. Consulta vazia termina em DESFAZER
          a pergunta — oferecer `Incluir` aqui mandaria cadastrar de novo um
          registro que provavelmente existe, do lado de fora do termo digitado,
          e o cadastro duplicado só apareceria semanas depois. */}
      <EmptyContent>
        {houveConsulta ? (
          <Button variant="outline" size="sm" onClick={aoLimpar}>
            {q && temFiltro ? 'Limpar busca e filtros' : q ? 'Limpar busca' : 'Limpar filtros'}
          </Button>
        ) : acao ? (
          <Button size="sm" onClick={acao.onClick}>
            {acao.label}
          </Button>
        ) : null}
      </EmptyContent>
    </Empty>
  )
}

/**
 * A BARRA DE SELEÇÃO (IndexTable, #198) — aparece ao marcar, some ao limpar.
 *
 * É a outra metade da linha clicável: se abrir o registro é o clique, marcar
 * precisa levar a algum lugar, e esse lugar não pode ser um botão que passa o
 * dia desabilitado no topo da tela. A barra existe SÓ quando há seleção, e diz
 * quantas linhas estão marcadas antes de oferecer qualquer ação — o número é o
 * que o operador confere antes de apertar algo destrutivo.
 *
 * ## Ação de UM registro com VÁRIAS linhas marcadas
 *
 * `Alterar` abre um cadastro; `Excluir` desativa um por vez, com confirmação
 * que nomeia o registro. Nenhuma das duas tem hoje uma versão em lote na
 * fronteira de dados — o contrato não publica escrita em lote e um laço de N
 * requisições no cliente falha pela metade sem ninguém saber quantas passaram.
 * Então elas ficam DESABILITADAS com mais de uma linha marcada, dizendo o
 * motivo. Prometer massa e agir na primeira linha seria a promessa errada no
 * botão mais caro da tela.
 */
function BarraDeSelecao<T>({
  quantidade,
  acoes,
  linhas,
  aoLimpar,
}: {
  quantidade: number
  acoes: readonly DataTableAction<T>[]
  linhas: readonly T[]
  aoLimpar: () => void
}) {
  const varias = quantidade > 1
  return (
    <div
      data-slot="barra-de-selecao"
      className="flex flex-wrap items-center gap-2 rounded-card border-2 border-border bg-muted px-3 py-2"
    >
      {/* `<output>`: o número muda a cada checkbox e quem não vê a tela precisa
          ouvir o total, não o evento. */}
      <output className="font-semibold text-sm">
        {quantidade === 1 ? '1 linha marcada' : `${quantidade} linhas marcadas`}
      </output>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {acoes.map((acao) => {
          const morta = acao.disabled === true || varias
          return (
            <Button
              key={acao.id}
              variant={acao.variant ?? 'outline'}
              size="sm"
              disabled={morta}
              title={
                acao.disabled === true
                  ? acao.title
                  : varias
                    ? `${acao.label} age em um registro por vez — desmarque as outras linhas.`
                    : undefined
              }
              onClick={() => acao.onClick?.(linhas[0] ?? null)}
            >
              {acao.icon ? <acao.icon aria-hidden="true" className="text-modulo" /> : null}
              {acao.label}
            </Button>
          )
        })}
        <Button type="button" variant="ghost" size="sm" onClick={aoLimpar}>
          Limpar seleção
        </Button>
      </div>
    </div>
  )
}

export function VitraDataTable<T>({
  columns,
  queryKey,
  fetcher,
  searchPlaceholder = 'Busca pelo código:',
  busca = true,
  actions = [],
  pageSizeOptions = [10, 20, 50],
  rowNumbers = false,
  filtros: camposFiltraveis,
  modoDeFiltro = 'pilulas',
  consultaNoEndereco = false,
  visoes,
  agrupamentos,
  visaoInicial = VISAO_LISTA,
  entidade,
  aoAbrirLinha,
  acoesDeSelecao,
  acaoDoVazio,
}: VitraDataTableProps<T>) {
  /**
   * O ENDEREÇO É O PONTO DE PARTIDA da consulta (#199).
   *
   * Lido UMA vez, no primeiro render, e já dentro do estado inicial — semear
   * por efeito faria a listagem buscar a lista inteira, mandar o resultado para
   * a tela e só então refazer a consulta filtrada, com o operador vendo os dois.
   * Fora do modo (`consultaNoEndereco` desligado) devolve o vazio de sempre.
   */
  // `warn: false` porque a MESMA tabela também roda fora do router (janela de
  // busca, teste de componente): ali não há endereço, e avisar no console a
  // cada render seria ruído sobre um caso que é de projeto.
  const router = useRouter({ warn: false })
  const [daUrl] = useState(() =>
    consultaNoEndereco && router
      ? consultaDaUrl(
          router.state.location.search as Record<string, unknown>,
          camposFiltraveis ?? [],
        )
      : { q: '', filtros: [], juncao: 'and' as Juncao },
  )
  const [qInput, setQInput] = useState(daUrl.q)
  const [state, setState] = useState<TableQueryState>({
    q: daUrl.q,
    sort: null,
    page: 1,
    pageSize: pageSizeOptions[0] ?? 10,
    ...(daUrl.filtros.length > 0 ? { filtros: daUrl.filtros, juncao: daUrl.juncao } : {}),
  })
  /**
   * SELEÇÃO EM LISTA, não em linha única (#198): o checkbox marca várias, e a
   * barra de seleção diz quantas. `selected` continua existindo como "a
   * primeira marcada" porque a barra de AÇÕES antiga (janela de busca, funil)
   * age sobre uma linha só — quem tem uma tem a primeira.
   */
  const [selecionadas, setSelecionadas] = useState<readonly T[]>([])
  const selected = selecionadas[0] ?? null
  /** Modo IndexTable: a linha abre, o checkbox marca. Ver `aoAbrirLinha`. */
  const linhaAbre = aoAbrirLinha !== undefined
  const marcavel = (acoesDeSelecao?.length ?? 0) > 0

  function alternarLinha(linha: T) {
    setSelecionadas((atuais) =>
      atuais.includes(linha) ? atuais.filter((l) => l !== linha) : [...atuais, linha],
    )
  }
  // Rascunho do filtro, como `qInput` é o rascunho da busca: o painel responde
  // à tecla na hora e só a frase COMPLETA vira consulta, depois do debounce.
  // Sem isso, cada letra digitada num valor viraria uma ida ao servidor.
  const [filtrosInput, setFiltrosInput] = useState<FiltroDaTabela[]>(daUrl.filtros)
  const [juncao, setJuncao] = useState<Juncao>(daUrl.juncao)
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
  // Toda mudança de estado de consulta limpa a seleção.
  function updateState(updater: (s: TableQueryState) => TableQueryState) {
    setSelecionadas([])
    setState(updater)
  }

  // Debounce da busca; qualquer mudança de busca volta para a página 1.
  useEffect(() => {
    const t = setTimeout(() => {
      setState((s) => {
        if (s.q === qInput) return s
        setSelecionadas([])
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
        setSelecionadas([])
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
    setSelecionadas([])
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
  // **Endereço explícito VENCE o favorito padrão.** Um link com filtro dentro
  // foi escolhido agora, por alguém; o padrão foi escolhido uma vez, meses
  // atrás. Aplicar o padrão por cima faria o link colado no chat abrir noutra
  // consulta — e o defeito seria invisível para quem mandou o link.
  const veioDoEndereco = daUrl.q !== '' || daUrl.filtros.length > 0
  useEffect(() => {
    if (veioDoEndereco) return
    const padrao = favoritoPadrao(lerFavoritos(telaId))
    if (padrao) aplicarConsulta(padrao)
  }, [telaId, aplicarConsulta, veioDoEndereco])

  function atualizarFavoritos(proximos: FavoritoDeConsulta[]) {
    setFavoritos(proximos)
    gravarFavoritos(telaId, proximos)
  }

  /**
   * A aba `Todos`: a listagem crua de volta.
   *
   * Desfaz TUDO que a consulta salva sabe guardar — filtro, junção, ordenação,
   * visão, agrupamento e densidade —, e não só o filtro. Voltar para `Todos`
   * deixando o quadro agrupado no lugar mostraria a listagem inteira com o
   * desenho da pergunta anterior, e a aba acesa diria que não há pergunta.
   * A BUSCA fica: ela é texto livre, digitado à parte, e some no `×` do campo.
   */
  function limparConsulta() {
    setFiltrosInput([])
    setJuncao('and')
    setVisaoId(visaoInicial)
    setAgruparPor(agrupamentoInicial)
    setDensidade('padrao')
    updateState((s) => ({ ...s, sort: null, page: 1 }))
  }

  /**
   * A saída do vazio de CONSULTA: desfaz a pergunta INTEIRA, busca inclusive.
   *
   * `limparConsulta` sozinha não serve aqui e a diferença é a razão de o botão
   * existir: ela é a aba `Todos`, que preserva a busca de propósito (texto
   * livre, digitado à parte, morre no `×` do campo). No vazio, quem clica está
   * dizendo "tire o que escondeu meus registros" — deixar o termo de pé
   * devolveria a MESMA caixa vazia, e o operador clicaria de novo.
   */
  function limparBuscaEFiltros() {
    setQInput('')
    limparConsulta()
  }

  /** O que está montado na tela AGORA, na forma que a consulta salva guarda. */
  const consultaAtual: ConsultaSalva = {
    filtros: filtrosValidos(filtrosInput),
    juncao,
    sort: state.sort,
    visao: visaoId,
    agruparPor,
    densidade,
  }
  const temConsulta =
    consultaAtual.filtros.length > 0 ||
    state.sort !== null ||
    visaoId !== visaoInicial ||
    agruparPor !== agrupamentoInicial ||
    densidade !== 'padrao'

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
  const totalColSpan = table.getAllLeafColumns().length + (rowNumbers ? 1 : 0) + (marcavel ? 1 : 0)

  const temFiltro = (state.filtros?.length ?? 0) > 0
  // "Todas" é sempre "todas as DESTA PÁGINA" — ver o rótulo do checkbox do
  // cabeçalho.
  const algumaMarcada = selecionadas.length > 0
  const todasMarcadas = rows.length > 0 && selecionadas.length === rows.length

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
      {/* Não desenha nada: só mantém o endereço contando a mesma história que a
          barra. Fica sob `consultaNoEndereco` porque a janela de busca monta a
          MESMA tabela sobre a tela de trás. */}
      {consultaNoEndereco ? (
        <SincroniaComAUrl q={state.q} filtros={state.filtros ?? []} juncao={juncao} />
      ) : null}

      {/* As consultas salvas ficam ACIMA da barra, e não dentro dela: a barra
          responde "que pergunta estou montando", a tira responde "que perguntas
          esta tela já tem prontas". Empilhá-las no mesmo popover foi o que
          manteve a #92 a dois cliques de distância de quem precisava dela. */}
      {camposFiltraveis && camposFiltraveis.length > 0 ? (
        <AbasDeConsulta
          favoritos={favoritos}
          atual={consultaAtual}
          temConsulta={temConsulta}
          onAplicar={aplicarConsulta}
          onLimpar={limparConsulta}
          onSalvar={(nome) =>
            atualizarFavoritos([
              ...favoritos,
              {
                id: novoFavoritoId(),
                nome,
                filtros: consultaAtual.filtros,
                juncao,
                sort: state.sort,
                visao: visaoId,
                agruparPor,
                densidade,
                padrao: false,
              },
            ])
          }
          onRenomear={(id, nome) =>
            atualizarFavoritos(favoritos.map((f) => (f.id === id ? { ...f, nome } : f)))
          }
          onExcluir={(id) => atualizarFavoritos(favoritos.filter((f) => f.id !== id))}
          onTornarPadrao={(id) => atualizarFavoritos(comPadrao(favoritos, id))}
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {busca ? (
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
        ) : null}
        {actions.map((action) => {
          // O filtro estruturado OCUPA o lugar do botão `Filtro` da barra padrão
          // (§9, padrão 4) em vez de somar um botão ao lado: a barra tem a mesma
          // ordem em oito telas, e dois caminhos para "filtrar" lado a lado
          // fariam o operador escolher qual dos dois é o de verdade.
          if (action.id === 'filtro' && camposFiltraveis && camposFiltraveis.length > 0) {
            // O modo por módulo (#104) troca a barra plana pela faixa de
            // chips. Reusa o MESMO `filtrosInput`, então debounce, consulta
            // salva e a recusa na fronteira continuam valendo de graça — a
            // diferença é só como o operador monta a pergunta.
            if (modoDeFiltro === 'modulo' && entidade) {
              // O seletor de colunas sai no MESMO slot, e não numa barra
              // própria: filtro e colunas respondem juntos "como esta listagem
              // está montada agora". Separá-los faria o operador procurar em
              // dois lugares o ajuste da mesma pergunta.
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
                </span>
              )
            }
            return modoDeFiltro === 'lista' ? (
              <span key={action.id} className="contents">
                <ListaDeFiltros
                  campos={camposFiltraveis}
                  filtros={filtrosInput}
                  juncao={juncao}
                  onFiltrosChange={setFiltrosInput}
                  onJuncaoChange={setJuncao}
                />
              </span>
            ) : (
              <span key={action.id} className="contents">
                <PilulasDeFiltro
                  campos={camposFiltraveis}
                  filtros={filtrosInput}
                  juncao={juncao}
                  onFiltrosChange={setFiltrosInput}
                  onJuncaoChange={setJuncao}
                />
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
                        setSelecionadas([])
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

      {marcavel && algumaMarcada ? (
        <BarraDeSelecao
          quantidade={selecionadas.length}
          acoes={acoesDeSelecao ?? []}
          linhas={selecionadas}
          aoLimpar={() => setSelecionadas([])}
        />
      ) : null}

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
              <VazioDaConsulta
                q={state.q}
                temFiltro={temFiltro}
                acao={acaoDoVazio}
                aoLimpar={limparBuscaEFiltros}
              />
            </div>
          ) : (
            visaoAtiva.render({ rows, agruparPor })
          )}
        </div>
      ) : (
        /* Caixa de DADO (§DataTable): raio 2px, traço 2px, `el-3` e recorte —
          sem ele, o canto arredondado do contêiner apareceria por baixo do
          cabeçalho quadrado da primeira fileira.
          `overflow-clip` e NÃO `overflow-hidden`, e a diferença é medida:
           `hidden` cria um scroll container, e `position: sticky` se prende ao
           scrollport mais próximo — o cabeçalho ficaria "fixo" dentro de uma
           caixa que não rola, ou seja, parado. `clip` recorta igual e não cria
           scrollport, então a fixação passa a valer contra a rolagem da PÁGINA,
           que é onde a listagem rola de verdade. */
        <div className="overflow-clip rounded-data border-2 border-border shadow-el3">
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
            {/* Cabeçalho FIXO na rolagem (#198): numa listagem de cinquenta
                linhas o operador perde o nome da coluna antes da décima, e passa
                a contar posição no olho. `bg-card` é obrigatório junto do
                `sticky` — sem fundo opaco as linhas passam por baixo e o texto
                do cabeçalho se mistura ao dado. */}
            <TableHeader className="sticky top-0 z-10 bg-card">
              {table.getHeaderGroups().map((headerGroup, hgIndex, headerGroups) => (
                // Cabeçalho agrupado: fileira de grupo separada das sub-colunas
                // por Fio (a sublinha forte fica na fileira das folhas).
                <TableRow
                  key={headerGroup.id}
                  className={cn(hgIndex < headerGroups.length - 1 && 'border-rule-hair!')}
                >
                  {marcavel && hgIndex === 0 ? (
                    <TableHead className="w-10" rowSpan={headerGroups.length}>
                      {/* Marcar tudo é marcar A PÁGINA, e o rótulo diz isso: a
                          consulta pode ter mil linhas e o operador vê vinte.
                          Prometer "todas" e agir sobre vinte seria a promessa
                          errada num botão que apaga cadastro. */}
                      <Checkbox
                        aria-label="Marcar todas as linhas desta página"
                        isSelected={todasMarcadas}
                        isIndeterminate={algumaMarcada && !todasMarcadas}
                        onChange={() => setSelecionadas(todasMarcadas ? [] : rows)}
                      />
                    </TableHead>
                  ) : null}
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
                /* ESQUELETO COM A FORMA DA PÁGINA (#201), e não uma barra por
                   linha. A barra única (`colSpan` de tudo) desenha uma grade
                   que não existe: a linha nasce inteira e se parte em cinco
                   quando o dado chega, com as colunas achando sua largura na
                   frente do operador. Uma célula por coluna reserva o lugar
                   certo desde o primeiro quadro — é a diferença entre esperar
                   e ver a tela pular.
                   As larguras VARIAM por coluna (nome longo, código curto):
                   cinco barras idênticas leem como barra de progresso, não
                   como tabela. */
                SKELETON_ROWS.map((rowKey, linha) => (
                  <TableRow key={rowKey} data-testid="linha-de-esqueleto">
                    {rowNumbers ? (
                      <TableCell>
                        <Skeleton className="h-4 w-6" />
                      </TableCell>
                    ) : null}
                    {marcavel ? (
                      <TableCell>
                        <Skeleton className="size-4" />
                      </TableCell>
                    ) : null}
                    {table.getAllLeafColumns().map((coluna, indice) => (
                      <TableCell key={coluna.id} data-testid="celula-de-esqueleto">
                        <Skeleton className={LARGURAS_DE_ESQUELETO[(linha + indice) % 3]} />
                      </TableCell>
                    ))}
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
                    <VazioDaConsulta
                      q={state.q}
                      temFiltro={temFiltro}
                      acao={acaoDoVazio}
                      aoLimpar={limparBuscaEFiltros}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row, rowIndex) => {
                  const isSelected = selecionadas.includes(row.original)
                  return (
                    // Seleção = VIOLETA cheio com texto branco (§DataTable): o
                    // violeta é a cor da AÇÃO, e a linha selecionada é sobre o
                    // que as ações da barra vão agir. O marcador amarelo saiu com
                    // ele — amarelo agora é foco, e foco e seleção são estados
                    // diferentes que precisam de sinais diferentes.
                    <TableRow
                      key={row.id}
                      data-state={isSelected ? 'selected' : undefined}
                      // A linha é parada de FOCO nos dois modos, e o que ela faz
                      // muda com o gesto da tela: onde a linha abre (#198), Enter
                      // abre e o Espaço marca — o mesmo par que qualquer lista de
                      // aplicativo tem; onde a linha marca (janela de busca), os
                      // dois marcam, como era. Não é atalho: é o teclado nativo do
                      // controle, e nenhuma tecla precisa ser memorizada.
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
                      onClick={() => {
                        if (linhaAbre) aoAbrirLinha(row.original)
                        else alternarLinha(row.original)
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter' && e.key !== ' ') return
                        // Espaço rolaria a página; Enter dentro de célula com
                        // controle não deve chegar aqui duas vezes.
                        e.preventDefault()
                        if (linhaAbre && e.key === 'Enter') aoAbrirLinha(row.original)
                        else alternarLinha(row.original)
                      }}
                    >
                      {marcavel ? (
                        // A célula do checkbox NÃO propaga o clique: mirar o
                        // quadradinho é dizer "marque esta", e abrir o registro
                        // junto tiraria da tela quem só queria montar a seleção.
                        // MEDIDO: hoje a barreira é redundante — o sistema de
                        // press do react-aria já não propaga, e tirar estas duas
                        // linhas não derruba o teste. Ficam como guarda do dia em
                        // que o checkbox virar `<input>` nativo, que propaga: o
                        // sintoma seria a tela abrindo o registro no meio da
                        // montagem da seleção, e o teste que o pega é o de
                        // comportamento acima, não este arquivo.
                        <TableCell
                          className="w-10"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            isSelected={isSelected}
                            onChange={() => alternarLinha(row.original)}
                            aria-label={`Marcar linha ${(state.page - 1) * state.pageSize + rowIndex + 1}`}
                          />
                        </TableCell>
                      ) : null}
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
