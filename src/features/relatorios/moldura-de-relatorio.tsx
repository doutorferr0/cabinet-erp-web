import { AvisoDeCobertura } from '@/components/cabinet/aviso-de-cobertura'
import { ErroDeCarregamento } from '@/components/cabinet/estado-de-consulta'
import { PageHeader } from '@/components/cabinet/page-header'
import { Painel } from '@/components/cabinet/painel'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Recorte } from '@/data/relatorios-api'
import { ArrowDown, ArrowUp } from 'lucide-react'
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
 * Por isso a moldura é própria e MÍNIMA: cabeçalho, barra de filtros da tela,
 * resumo, tabela, paginação. Ordenação por cabeçalho clicável, restrita à
 * whitelist que o contrato publica — coluna sem `ordenaPor` não vira botão, em
 * vez de virar botão que responde 400.
 */

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
}

export interface MolduraDeRelatorioProps<T> {
  titulo: string
  contexto: string
  /** A barra de filtros da tela — cada relatório publica os seus. */
  filtros: ReactNode
  /** Os números do RECORTE inteiro, do `summary` do envelope. */
  resumo?: ReactNode
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

export function MolduraDeRelatorio<T>({
  titulo,
  contexto,
  filtros,
  resumo,
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
  recorte,
  nomeDoDeposito,
  vazio,
}: MolduraDeRelatorioProps<T>) {
  const ultimaPagina = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="flex flex-col gap-4">
      <PageHeader titulo={titulo} contexto={contexto} />

      <div className="flex flex-wrap items-end gap-3 border-rule-strong border-b pb-3">
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

      {resumo ? (
        <Painel titulo="Resumo" modulo="estoque">
          {/*
            O resumo é do RECORTE INTEIRO e não da página — regra do envelope.
            Somar as linhas visíveis faria a página 1 de 500 itens declarar que o
            estoque vale o dos cinquenta primeiros.
          */}
          {resumo}
        </Painel>
      ) : null}

      <Painel
        titulo={
          recorte.estado === 'confirmado' && nomeDoDeposito ? `Itens — ${nomeDoDeposito}` : 'Itens'
        }
        modulo="estoque"
        acao={
          <span className="font-mono text-[0.75rem]" data-testid="total-de-linhas">
            {total} {total === 1 ? 'linha' : 'linhas'}
          </span>
        }
      >
        {carregando ? (
          <output aria-busy="true" className="text-muted-foreground text-sm">
            Apurando…
          </output>
        ) : erro ? (
          <ErroDeCarregamento mensagem="O relatório não carregou." erro={erro} refazer={refazer} />
        ) : linhas.length === 0 ? (
          <p className="text-muted-foreground text-sm">{vazio}</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  {colunas.map((coluna) => (
                    <TableHead key={coluna.id} className={coluna.numerica ? 'text-right' : ''}>
                      {coluna.ordenaPor ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="-mx-2 h-7 gap-1 px-2"
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
                {linhas.map((linha) => (
                  <TableRow key={chaveDaLinha(linha)}>
                    {colunas.map((coluna) => (
                      <TableCell
                        key={coluna.id}
                        className={coluna.numerica ? 'text-right font-mono' : ''}
                      >
                        {coluna.celula(linha)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-muted-foreground text-sm">
                Página {page} de {ultimaPagina}
              </span>
              <div className="flex gap-2">
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
 * Um número do resumo, com o rótulo por cima — a mesma caixa nos três.
 *
 * `dica` sai por extenso ao lado, nunca no `title`: o que qualifica o número
 * (quantos itens ficaram de fora por não ter preço) é justamente o que decide se
 * dá para confiar nele, e um motivo que só aparece no hover é um motivo que
 * metade dos operadores nunca lê.
 */
export function NumeroDoResumo({
  rotulo,
  valor,
  dica,
}: {
  rotulo: string
  valor: string
  dica?: string
}) {
  return (
    <div className="flex flex-col gap-1 border-2 border-border px-3 py-2">
      <span className="font-mono text-[0.7rem] uppercase tracking-[0.06em] text-muted-foreground">
        {rotulo}
      </span>
      <span className="font-mono text-lg">{valor}</span>
      {dica ? <span className="text-muted-foreground text-[0.7rem]">{dica}</span> : null}
    </div>
  )
}

/** A grade dos números do resumo — uma coluna no telefone, quatro no monitor. */
export function GradeDoResumo({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
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
    <label className="flex flex-col gap-1">
      <span className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.06em]">
        Depósito
      </span>
      <select
        className="h-9 border-2 border-input bg-card px-2.5 text-sm outline-none focus-visible:focus-ring"
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
    <label className="flex h-9 items-center gap-2 text-sm">
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
