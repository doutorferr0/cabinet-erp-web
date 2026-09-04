import { AvisoDeCobertura } from '@/components/cabinet/aviso-de-cobertura'
import { ErroDeCarregamento } from '@/components/cabinet/estado-de-consulta'
import { PageHeader } from '@/components/cabinet/page-header'
import { Painel } from '@/components/cabinet/painel'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Recorte } from '@/data/relatorios-api'
import {
  type AgrupamentoDeRelatorio,
  type TomDeRelatorio,
  agrupar,
} from '@/features/relatorios/agrupamento'
import '@/features/relatorios/impressao.css'
import '@/features/relatorios/relatorio.css'
import {
  baixarCsv,
  imprimirRelatorio,
  montarCsv,
  nomeDoArquivo,
} from '@/features/relatorios/exportar'
import { cn } from '@/lib/utils'
import { ArrowDown, ArrowUp, Download, Printer } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * A MOLDURA dos relatórios — o que os três de estoque têm em comum.
 *
 * ## Por que não é a `VitraDataTable`
 *
 * A DataTable é o coração das LISTAGENS: busca por texto, filtro estruturado,
 * seleção de linha, barra de ações de cadastro, favoritos de consulta. Nada
 * disso existe num relatório — não se seleciona uma linha de apuração para
 * alterar, e `q` não é parâmetro de nenhuma das dez operações de `/api/reports`.
 *
 * O que muda de verdade é o ENVELOPE: `summary` é do recorte inteiro, `rows` é
 * só da página, e os dois chegam na MESMA resposta. A DataTable pede um
 * `TableFetcher` que devolve `{rows,total}` — encaixar o relatório nela custaria
 * uma segunda chamada só para o resumo, com outro instante de apuração. Duas
 * apurações do mesmo número divergem no primeiro arredondamento, e a tela não
 * teria como saber qual das duas está mostrando.
 *
 * ## O que a 2.0 acrescentou (web#493 · D25)
 *
 * Relatório virou LISTAGEM 2.0: faixa de KPIs sobre a grade, agrupamento com
 * contagem e subtotal, decoração semântica de linha, soma no rodapé e Exportar
 * (CSV/PDF). As três telas de estoque compõem — nenhuma reimplementa.
 *
 * **Os KPIs saíram de dentro de um painel.** Antes o resumo morava num
 * `<Painel titulo="Resumo">` dentro da página, o que punha card dentro de card
 * e dava ao número do recorte a mesma moldura da grade da página. Agora a faixa
 * é da PÁGINA, e a única sombra forte da tela é a do painel da grade.
 *
 * **A separação entre as regiões é espaço, não linha.** A barra de filtros
 * perdeu o `border-b`: header › filtros › KPIs › painel se separam por 24px, que
 * é a ferramenta mais barata que resolve a fronteira (§Hierarquia). Dentro do
 * painel sobraram as outras três — hairline entre linhas, tint no cabeçalho, na
 * barra de grupo e no rodapé de somas, e o card do próprio painel.
 *
 * ## Agrupar mexe na paginação, e isso é decisão
 *
 * O servidor não agrupa: nenhuma operação de `/api/reports` publica `groupBy`, e
 * nenhum envelope traz agregado por grupo. A quebra é do cliente, sobre o que
 * está carregado — então escolher um agrupamento sobe `pageSize` ao TETO do
 * contrato (100) e volta para a página 1. Quando o recorte é maior que o teto, o
 * rodapé diz, em voz alta, que grupos, somas e CSV cobrem as linhas carregadas e
 * não o recorte. É a mesma regra do padrão de view modes: coluna montada com uma
 * página é coluna falsa, e o honesto é declarar o corte.
 */

/** O teto de `pageSize` que as dez operações de `/api/reports` publicam. */
export const TETO_DE_PAGINA = 100

export interface ColunaDeRelatorio<T> {
  id: string
  titulo: string
  /**
   * O campo da whitelist de `sortBy` deste relatório. **Ausente = a coluna não
   * ordena**, e o cabeçalho não vira botão: o contrato responde 400 a campo fora
   * da whitelist, e um cabeçalho que só falha ao ser clicado é pior que um
   * cabeçalho que não convida.
   */
  ordenaPor?: string
  /** Números à direita; texto à esquerda (o padrão). */
  numerica?: boolean
  celula: (linha: T) => ReactNode
  /**
   * O MESMO dado como texto puro, para o CSV.
   *
   * Existe porque `celula` pode devolver marcação — um número decorado em
   * vermelho é um `<span>`, e `String(<span/>)` no arquivo sairia
   * `[object Object]`. Quando a célula já é texto, esta função é dispensável e a
   * moldura usa o que `celula` devolveu.
   */
  texto?: (linha: T) => string
  /**
   * A soma da coluna — no rodapé da grade e na barra de cada grupo. Ausente = a
   * coluna não soma, e a casa fica vazia em vez de somar o que não se soma
   * (média de dias e "abaixo do mínimo" não têm total).
   */
  soma?: (linhas: readonly T[]) => ReactNode
}

export interface MolduraDeRelatorioProps<T> {
  titulo: string
  contexto: string
  /** A barra de filtros da tela — cada relatório publica os seus. */
  filtros: ReactNode
  /** Os KPIs do RECORTE inteiro, do `summary` do envelope. */
  kpis?: ReactNode
  colunas: readonly ColunaDeRelatorio<T>[]
  linhas: readonly T[]
  chaveDaLinha: (linha: T) => string
  carregando: boolean
  erro: unknown
  refazer: () => void
  /** Linhas agregadas no recorte — o denominador da paginação. */
  total: number
  page: number
  pageSize: number
  aoTrocarPagina: (page: number) => void
  sortBy: string | null
  sortDesc: boolean
  /** Clique no cabeçalho: mesmo campo inverte o sentido, campo novo recomeça. */
  aoOrdenar: (campo: string) => void
  /** As quebras que este relatório oferece. Vazio = a tela não agrupa. */
  agrupamentos?: readonly AgrupamentoDeRelatorio<T>[]
  /** `null` = sem quebra (a grade corrida). */
  agrupamentoAtivo?: string | null
  aoTrocarAgrupamento?: (id: string | null) => void
  /**
   * A decoração da linha — semântica, nunca enfeite. Sai como filete à esquerda,
   * e a cor do número que a justifica é responsabilidade da célula.
   */
  tomDaLinha?: (linha: T) => TomDeRelatorio
  /** O começo do nome do CSV — `estoque-valorizado`, `estoque-parado`… */
  baseDoArquivo: string
  /** O que o servidor fez com o recorte por depósito pedido. */
  recorte: Recorte
  /**
   * Nome do depósito pedido, para o rótulo e para o aviso. `undefined` explícito
   * porque a lista de depósitos pode não ter chegado ainda — e aí o aviso cai no
   * uuid, que é identificador e não nada.
   */
  nomeDoDeposito?: string | undefined
  /** A frase de "nenhuma linha", que é diferente em cada relatório. */
  vazio: string
}

/** Filete à esquerda da linha decorada — a cor SEMPRE diz um estado. */
const FILETE: Record<TomDeRelatorio, string> = {
  neutro: '',
  ok: 'border-l-4 border-l-money',
  warn: 'border-l-4 border-l-warn',
  bad: 'border-l-4 border-l-destructive',
}

/** Tint da barra de grupo — separa região por natureza, sem borda por cima. */
const TINT_DO_GRUPO: Record<TomDeRelatorio, string> = {
  neutro: 'bg-surface-sunken',
  ok: 'bg-zone-money',
  warn: 'bg-zone-warn',
  bad: 'bg-zone-danger',
}

export function MolduraDeRelatorio<T>({
  titulo,
  contexto,
  filtros,
  kpis,
  colunas,
  linhas,
  chaveDaLinha,
  carregando,
  erro,
  refazer,
  total,
  page,
  pageSize,
  aoTrocarPagina,
  sortBy,
  sortDesc,
  aoOrdenar,
  agrupamentos,
  agrupamentoAtivo = null,
  aoTrocarAgrupamento,
  tomDaLinha,
  baseDoArquivo,
  recorte,
  nomeDoDeposito,
  vazio,
}: MolduraDeRelatorioProps<T>) {
  const ultimaPagina = Math.max(1, Math.ceil(total / pageSize))
  const quebra = agrupamentos?.find((a) => a.id === agrupamentoAtivo)
  const grupos = quebra ? agrupar(linhas, quebra) : null
  // O teto cortou quando o recorte tem mais linhas do que as que chegaram. É a
  // única condição que torna grupo, soma e CSV parciais — e ela é dita, não
  // deduzida pelo operador a partir do número da página.
  const cortado = total > linhas.length

  function exportarCsv() {
    const cabecalho = colunas.map((coluna) => coluna.titulo)
    const corpo = linhas.map((linha) => colunas.map((coluna) => textoDaCelula(coluna, linha)))
    baixarCsv(nomeDoArquivo(baseDoArquivo), montarCsv(cabecalho, corpo))
  }

  return (
    // `data-impressao`: a subárvore que o `@media print` reacende. Tudo fora
    // dela — sidebar, appbar, rodapé do shell — apaga no papel.
    <div data-impressao="relatorio" className="flex flex-col gap-[var(--s-5)]">
      <PageHeader titulo={titulo} contexto={contexto} />

      <div
        data-fora-da-impressao
        className="flex flex-wrap items-end gap-[var(--s-3)]"
        // A fronteira entre regiões da página é ESPAÇO. A hairline que morava
        // aqui somava-se aos 24px do `gap` e cobrava duas ferramentas pela mesma
        // separação (§Hierarquia — nunca duas na mesma fronteira).
      >
        {filtros}
      </div>

      {/*
        O ECO do depósito, e a única coisa que a tela pode afirmar sobre ele.
        Pedimos o recorte e o servidor não o confirmou: os números abaixo são da
        EMPRESA INTEIRA, e escrever o nome do depósito no cabeçalho seria rotular
        o total de todos os locais com o nome de um. O aviso é de PENDÊNCIA
        porque é o que é — falta implementação do outro lado, e um dia some.
      */}
      {recorte.estado === 'ignorado' ? (
        <AvisoDeCobertura>
          <span>
            O servidor respondeu <strong>sem confirmar o recorte por depósito</strong>. Os números
            abaixo são da empresa inteira, não de{' '}
            <strong>{nomeDoDeposito ?? recorte.warehouseId}</strong>.
          </span>
        </AvisoDeCobertura>
      ) : null}

      {/*
        Os KPIs são do RECORTE INTEIRO e não da página — regra do envelope.
        Somar as linhas visíveis faria a página 1 de 500 itens declarar que o
        estoque vale o dos cinquenta primeiros.
      */}
      {kpis}

      <Painel
        titulo={
          recorte.estado === 'confirmado' && nomeDoDeposito ? `Itens — ${nomeDoDeposito}` : 'Itens'
        }
        modulo="estoque"
        acao={
          // A contagem é DADO e o resto é CONTROLE — as duas naturezas ficam a
          // 16px uma da outra. Encostadas, "3 linhas" e o rótulo "Agrupar por"
          // se leem como uma frase só ("3 linhas agrupar por"), que é o que a
          // captura da primeira rodada mostrou.
          <div className="flex flex-wrap items-center gap-[var(--s-4)]">
            <span className="t-dado-meta" data-testid="total-de-linhas">
              {total} {total === 1 ? 'linha' : 'linhas'}
            </span>
            {agrupamentos && agrupamentos.length > 0 && aoTrocarAgrupamento ? (
              <label data-fora-da-impressao className="flex items-center gap-[var(--s-2)]">
                <span className="t-rotulo">Agrupar por</span>
                <select
                  className="t-ui h-8 border-2 border-input bg-card px-2 outline-none focus-visible:focus-ring"
                  value={agrupamentoAtivo ?? ''}
                  onChange={(evento) => aoTrocarAgrupamento(evento.target.value || null)}
                  aria-label="Agrupar por"
                >
                  <option value="">Sem agrupamento</option>
                  {agrupamentos.map((agrupamento) => (
                    <option key={agrupamento.id} value={agrupamento.id}>
                      {agrupamento.rotulo}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <div data-fora-da-impressao className="flex items-center gap-[var(--s-1)]">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-[var(--s-2)]"
                disabled={linhas.length === 0}
                onClick={exportarCsv}
              >
                <Download aria-hidden="true" className="size-3.5" />
                Exportar CSV
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-[var(--s-2)]"
                disabled={linhas.length === 0}
                onClick={() => imprimirRelatorio()}
              >
                <Printer aria-hidden="true" className="size-3.5" />
                PDF
              </Button>
            </div>
          </div>
        }
      >
        {carregando ? (
          <output aria-busy="true" className="t-meta">
            Apurando…
          </output>
        ) : erro ? (
          <ErroDeCarregamento mensagem="O relatório não carregou." erro={erro} refazer={refazer} />
        ) : linhas.length === 0 ? (
          <p className="t-meta">{vazio}</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  {colunas.map((coluna) => (
                    <TableHead
                      key={coluna.id}
                      className={cn('t-rotulo', coluna.numerica ? 'text-right' : '')}
                    >
                      {coluna.ordenaPor ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="t-rotulo -mx-2 h-7 gap-[var(--s-1)] px-2"
                          onClick={() => aoOrdenar(coluna.ordenaPor as string)}
                          aria-label={`Ordenar por ${coluna.titulo}`}
                        >
                          {coluna.titulo}
                          {sortBy === coluna.ordenaPor ? (
                            sortDesc ? (
                              <ArrowDown aria-hidden="true" className="size-3" />
                            ) : (
                              <ArrowUp aria-hidden="true" className="size-3" />
                            )
                          ) : null}
                        </Button>
                      ) : (
                        coluna.titulo
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {grupos
                  ? grupos.map((grupo) => (
                      <Fragmento key={grupo.chave}>
                        <TableRow
                          data-grupo-do-relatorio={grupo.chave}
                          className={cn('hover:bg-transparent', TINT_DO_GRUPO[grupo.tom])}
                        >
                          {colunas.map((coluna, indice) => (
                            <TableCell
                              key={coluna.id}
                              className={cn('py-2', coluna.numerica ? 't-dado text-right' : 't-ui')}
                            >
                              {indice === 0 ? (
                                <span className="flex items-baseline gap-[var(--s-2)]">
                                  {grupo.chave}
                                  <span className="t-dado-meta">
                                    {grupo.linhas.length}
                                    {grupo.linhas.length === 1 ? ' item' : ' itens'}
                                  </span>
                                </span>
                              ) : (
                                coluna.soma?.(grupo.linhas)
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                        {grupo.linhas.map((linha) => (
                          <LinhaDoRelatorio
                            key={chaveDaLinha(linha)}
                            colunas={colunas}
                            linha={linha}
                            tom={tomDaLinha?.(linha) ?? 'neutro'}
                          />
                        ))}
                      </Fragmento>
                    ))
                  : linhas.map((linha) => (
                      <LinhaDoRelatorio
                        key={chaveDaLinha(linha)}
                        colunas={colunas}
                        linha={linha}
                        tom={tomDaLinha?.(linha) ?? 'neutro'}
                      />
                    ))}
              </TableBody>
              {colunas.some((coluna) => coluna.soma) ? (
                <TableFooter className="bg-surface-sunken">
                  <TableRow className="hover:bg-transparent">
                    {colunas.map((coluna, indice) => (
                      <TableCell
                        key={coluna.id}
                        className={cn(coluna.numerica ? 't-dado text-right' : 't-rotulo')}
                      >
                        {indice === 0 ? 'Total desta página' : coluna.soma?.(linhas)}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableFooter>
              ) : null}
            </Table>

            {/*
              O CORTE, dito antes de o operador clicar em Exportar. Sem esta
              linha, um CSV de 100 linhas de um recorte de 4000 sai com cara de
              relatório completo — e quem o recebe soma o que não é o total.
            */}
            {cortado ? (
              <p className="t-meta">
                Agrupamento, somas e exportação cobrem as{' '}
                <strong className="t-dado">{linhas.length}</strong> linhas carregadas. O recorte tem{' '}
                <strong className="t-dado">{total}</strong> — os números do topo são dele.
              </p>
            ) : null}

            <div
              data-fora-da-impressao
              className="mt-[var(--s-3)] flex items-center justify-between gap-[var(--s-3)] border-rule-hair border-t pt-[var(--s-3)]"
            >
              <span className="t-dado-meta">
                Página {page} de {ultimaPagina}
              </span>
              <div className="flex gap-[var(--s-2)]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => aoTrocarPagina(page - 1)}
                >
                  Anterior
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= ultimaPagina}
                  onClick={() => aoTrocarPagina(page + 1)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          </>
        )}
      </Painel>
    </div>
  )
}

/**
 * Fragmento nomeado só para deixar a chave no lugar certo: a quebra rende DUAS
 * coisas irmãs (a barra e as linhas do grupo) e `<>` não aceita `key`.
 */
function Fragmento({ children }: { children: ReactNode }) {
  return <>{children}</>
}

function LinhaDoRelatorio<T>({
  colunas,
  linha,
  tom,
}: {
  colunas: readonly ColunaDeRelatorio<T>[]
  linha: T
  tom: TomDeRelatorio
}) {
  return (
    <TableRow data-tom={tom}>
      {colunas.map((coluna, indice) => (
        <TableCell
          key={coluna.id}
          className={cn(
            coluna.numerica ? 't-dado text-right' : 't-corpo',
            // O filete entra só na PRIMEIRA célula: um fundo colorido na linha
            // inteira seria cor decorativa em linha de dado, que a rodada 2.0
            // proíbe. A borda diz o mesmo com uma fração da tinta.
            indice === 0 ? FILETE[tom] : '',
          )}
        >
          {coluna.celula(linha)}
        </TableCell>
      ))}
    </TableRow>
  )
}

/**
 * A célula como texto puro. `celula` que já devolve string ou número dispensa
 * `texto`; qualquer outra coisa (um `<span>` decorado) precisa dele, senão o CSV
 * sairia com `[object Object]` na coluna que mais importa.
 */
export function textoDaCelula<T>(coluna: ColunaDeRelatorio<T>, linha: T): string {
  if (coluna.texto) return coluna.texto(linha)
  const conteudo = coluna.celula(linha)
  return typeof conteudo === 'string' || typeof conteudo === 'number' ? String(conteudo) : ''
}

/**
 * Um KPI: rótulo por cima, número embaixo, motivo ao lado.
 *
 * `dica` sai por extenso e nunca no `title`: o que qualifica o número (quantos
 * itens ficaram de fora por não ter preço) é justamente o que decide se dá para
 * confiar nele, e um motivo que só aparece no hover é um motivo que metade dos
 * operadores nunca lê.
 *
 * O `tom` tinge o NÚMERO, não a caixa — 900 itens sem preço é um número ruim,
 * não um cartão ruim, e caixa colorida em faixa de quatro vira semáforo.
 */
export function Kpi({
  rotulo,
  valor,
  dica,
  tom = 'neutro',
}: {
  rotulo: string
  valor: string
  dica?: string
  tom?: TomDeRelatorio
}) {
  return (
    <div className="kpi">
      <span className="t-rotulo kpi-rotulo">{rotulo}</span>
      <span className="t-dado kpi-valor" data-tom={tom}>
        {valor}
      </span>
      {dica ? <span className="t-meta">{dica}</span> : null}
    </div>
  )
}

/**
 * A faixa de KPIs — até quatro, e `auto-fit` em vez de `@media`.
 *
 * A regra da rodada proíbe `@media` para quebra: com `auto-fit` a faixa se
 * reparte sozinha em qualquer largura, inclusive dentro de um painel estreito,
 * sem ninguém decidir pontos de corte que envelhecem.
 */
export function FaixaDeKpis({ children }: { children: ReactNode }) {
  return <div className="faixa-de-kpis">{children}</div>
}

/**
 * O seletor de depósito — o recorte da #352, igual nos três relatórios.
 *
 * Vazio = a empresa inteira, que é o padrão do contrato e não um valor. O
 * depósito INATIVO entra na lista pelo mesmo motivo da tela de movimentação: o
 * saldo que ficou lá continua existindo, e escondê-lo apagaria linhas que a
 * resposta traz.
 */
export function EscolhaDeDeposito({
  depositos,
  valor,
  aoTrocar,
}: {
  depositos: readonly { id: string; name: string; active: boolean }[]
  valor: string | null
  aoTrocar: (id: string | null) => void
}) {
  return (
    <label className="flex flex-col gap-[var(--s-1)]">
      <span className="t-rotulo">Depósito</span>
      <select
        className="t-ui h-9 border-2 border-input bg-card px-2.5 outline-none focus-visible:focus-ring"
        value={valor ?? ''}
        onChange={(evento) => aoTrocar(evento.target.value || null)}
      >
        <option value="">Todos os depósitos</option>
        {depositos.map((deposito) => (
          <option key={deposito.id} value={deposito.id}>
            {deposito.name}
            {deposito.active ? '' : ' (inativo)'}
          </option>
        ))}
      </select>
    </label>
  )
}

/** Caixa de marcar da barra de filtros — três telas, o mesmo desenho. */
export function FiltroDeMarcar({
  rotulo,
  marcado,
  aoTrocar,
}: {
  rotulo: string
  marcado: boolean
  aoTrocar: (marcado: boolean) => void
}) {
  return (
    <label className="t-ui flex h-9 items-center gap-[var(--s-2)]">
      <input
        type="checkbox"
        className="size-4 border-2 border-input"
        checked={marcado}
        onChange={(evento) => aoTrocar(evento.target.checked)}
      />
      {rotulo}
    </label>
  )
}

/** O rótulo de um campo da barra de filtros — o mesmo degrau nos três. */
export function RotuloDeFiltro({ children }: { children: ReactNode }) {
  return <span className="t-rotulo">{children}</span>
}
