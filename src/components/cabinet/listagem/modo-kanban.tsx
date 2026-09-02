import type { VisaoDaListagem } from '@/components/cabinet/data-table'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDateBR, formatMoneyBRL } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine'
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { LayoutGrid, MoreHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

/**
 * MODO KANBAN — a listagem desenhada como quadro, sem ser tela própria.
 *
 * É o irmão genérico do quadro do funil (`features/crm/quadro-do-funil.tsx`) e
 * do quadro de tarefas: aqueles sabem de oportunidade e de tarefa, este não
 * sabe de nada. Recebe as MESMAS linhas que a tabela recebeu, um campo para
 * empilhar em colunas (`campoDeColuna`) e uma função que traduz linha em
 * cartão. É o que permite a três telas próprias — Previsão de chegada, Quadro
 * de cargas e Agenda — virarem uma VISÃO da listagem de origem em vez de mais
 * uma rota com filtro próprio (Airtable views).
 *
 * ## Ele não consulta nada, e é isso que o torna uma visão
 *
 * Consulta própria aqui devolveria o defeito que o padrão 9 existe para
 * impedir: alternar quadro ⇄ lista mudaria de filtro sem avisar, e a mesma tela
 * mostraria duas contagens do mesmo conjunto. Quem pergunta é a
 * `VitraDataTable`, uma vez só; quem responde ao arrasto é a TELA, pelo
 * `onMover` — persistência é decisão de quem conhece o contrato do recurso.
 *
 * ## Arrasto SOMA, nunca substitui o clique
 *
 * Mesma regra dos dois quadros que vieram antes (#229): arrasto não existe para
 * quem opera por teclado nem em leitor de tela. Cada cartão traz o menu
 * `Mover para` com as outras colunas — é por ele que o gesto é alcançável sem
 * gesto. Trocar um pelo outro seria regressão de acessibilidade.
 *
 * ## Desenho (Reface 2.0, §Hierarquia)
 *
 * Coluna em `--n-50` SEM borda: a região se separa por tint, que é a ferramenta
 * mais barata que resolve — borda ali seria a segunda ferramenta na mesma
 * fronteira. O cartão é o objeto, e aí sim é card: folha `--n-0`, borda
 * `--n-300`, `--hard-soft` parado e `--hard-1` no hover (o papel levanta).
 * Dentro do cartão só espaço e hairline, nunca um terceiro card.
 */

/** Tom semântico do selo e da pílula — os nomes da fundação, não cor solta. */
export type TomDoCartao = 'ok' | 'info' | 'warn' | 'bad' | 'mut'

const FUNDO_DO_TOM: Record<TomDoCartao, string> = {
  ok: 'var(--ok-bg)',
  info: 'var(--info-bg)',
  warn: 'var(--warn-bg)',
  bad: 'var(--bad-bg)',
  mut: 'var(--mut-bg)',
}

const TINTA_DO_TOM: Record<TomDoCartao, string> = {
  ok: 'var(--ok)',
  info: 'var(--info)',
  warn: 'var(--warn)',
  bad: 'var(--bad)',
  mut: 'var(--mut)',
}

/** Uma coluna declarada pela tela — ordem e rótulo que o dado cru não tem. */
export interface ColunaDoQuadro {
  id: string
  rotulo: string
  /** Cor do quadradinho do cabeçalho; padrão é a cor do módulo da tela. */
  cor?: string
}

/**
 * O que o cartão MOSTRA — cinco lugares fixos, e não um slot livre.
 *
 * Cartão com conteúdo arbitrário viraria cinco desenhos diferentes em cinco
 * telas, que é exatamente o que esta issue veio desfazer. Título e subtítulo
 * são texto, `badge` é estado, `data` e `valorCents` são DADO e saem em mono
 * tabular — a régua de §Hierarquia decide isso, não a tela.
 */
export interface CartaoDoQuadro {
  titulo: string
  subtitulo?: string | null
  badge?: { rotulo: string; tom?: TomDoCartao } | null
  /** Data ISO; sai formatada em pt-BR e em mono. */
  data?: string | null
  /** Dinheiro em CENTAVOS inteiros. R$ só aqui, na borda de exibição. */
  valorCents?: number | null
}

export interface ModoKanbanProps<T> {
  /** As linhas que a consulta trouxe — as mesmas da visão Lista. */
  rows: readonly T[]
  /** Campo da linha que decide a coluna. */
  campoDeColuna: keyof T & string
  /**
   * As colunas, em ordem. Sem esta prop elas saem dos valores distintos que as
   * linhas trazem — o que serve para campo livre, e serve mal para domínio
   * fechado: coluna sem cartão nenhum sumiria justamente no dia em que ficar
   * vazia é a informação.
   */
  colunas?: readonly ColunaDoQuadro[]
  chave: (row: T) => string
  cartao: (row: T) => CartaoDoQuadro
  /**
   * O gesto pediu a coluna nova. **Quem grava é a tela** — o quadro não conhece
   * o contrato do recurso, e uma escrita aqui seria a mesma requisição
   * inventada em cada listagem que ligar o modo.
   *
   * Sem `onMover` o quadro é só leitura: nada arrasta e o menu não aparece.
   */
  onMover?: (row: T, colunaId: string) => void
  aoAbrir?: (row: T) => void
}

/** Coluna dos cartões cujo campo veio vazio — existe para eles não sumirem. */
const SEM_COLUNA = '—'

/**
 * A etiqueta do arrasto. O adaptador de elemento é GLOBAL: sem ela um cartão
 * do quadro do funil chegaria aqui como origem válida.
 */
const TIPO_CARTAO = 'linha-da-listagem'

function valorDaColuna<T>(row: T, campo: keyof T & string): string {
  const bruto = row[campo]
  if (bruto === null || bruto === undefined || bruto === '') return SEM_COLUNA
  return String(bruto)
}

/**
 * As colunas na ordem em que aparecem, quando a tela não as declarou.
 *
 * Ordem de APARIÇÃO e não alfabética: a listagem chega ordenada pelo servidor,
 * e reordenar aqui trocaria a regra do contrato por uma preferência de tela.
 */
function colunasDerivadas<T>(
  rows: readonly T[],
  campo: keyof T & string,
): readonly ColunaDoQuadro[] {
  const vistas: string[] = []
  for (const row of rows) {
    const valor = valorDaColuna(row, campo)
    if (!vistas.includes(valor)) vistas.push(valor)
  }
  return vistas.map((valor) => ({ id: valor, rotulo: valor }))
}

export function ModoKanban<T>({
  rows,
  campoDeColuna,
  colunas,
  chave,
  cartao,
  onMover,
  aoAbrir,
}: ModoKanbanProps<T>) {
  const definidas = colunas ?? colunasDerivadas(rows, campoDeColuna)

  return (
    <div
      data-slot="modo-kanban"
      className="flex items-start overflow-x-auto pb-2"
      // `--s-3` entre colunas: são irmãs, e irmão se separa por espaço.
      style={{ gap: 'var(--s-3)' }}
    >
      {definidas.map((coluna) => (
        <ColunaDoKanban
          key={coluna.id}
          coluna={coluna}
          linhas={rows.filter((row) => valorDaColuna(row, campoDeColuna) === coluna.id)}
          destinos={definidas.filter((outra) => outra.id !== coluna.id)}
          chave={chave}
          cartao={cartao}
          {...(onMover ? { onMover } : {})}
          {...(aoAbrir ? { aoAbrir } : {})}
        />
      ))}
    </div>
  )
}

function ColunaDoKanban<T>({
  coluna,
  linhas,
  destinos,
  chave,
  cartao,
  onMover,
  aoAbrir,
}: {
  coluna: ColunaDoQuadro
  linhas: readonly T[]
  destinos: readonly ColunaDoQuadro[]
  chave: (row: T) => string
  cartao: (row: T) => CartaoDoQuadro
  onMover?: (row: T, colunaId: string) => void
  aoAbrir?: (row: T) => void
}) {
  const caixa = useRef<HTMLElement>(null)
  const [sobre, setSobre] = useState(false)
  // O que o gesto precisa saber, sempre fresco e FORA das dependências: o
  // `setSobre` re-renderiza no meio do arrasto, e um efeito que dependesse de
  // `onMover` desregistraria o alvo com o cartão no ar.
  const agora = useRef({ coluna, onMover })
  agora.current = { coluna, onMover }

  useEffect(() => {
    const elemento = caixa.current
    if (!elemento) return
    return dropTargetForElements({
      element: elemento,
      canDrop: ({ source }) => source.data.tipo === TIPO_CARTAO,
      getData: () => ({ colunaId: agora.current.coluna.id }),
      onDragEnter: () => setSobre(true),
      onDragLeave: () => setSobre(false),
      onDrop: () => setSobre(false),
    })
  }, [])

  return (
    <section
      ref={caixa}
      data-slot="coluna"
      data-coluna={coluna.id}
      aria-label={`${coluna.rotulo}: ${linhas.length}`}
      className={cn(
        'flex w-64 shrink-0 flex-col rounded-card bg-[var(--n-50)]',
        // O realce do alvo é ANEL, não borda: borda mudaria a largura da coluna
        // e o quadro inteiro andaria de lado quando o cartão passa por cima.
        sobre && 'ring-2 ring-[var(--n-900)]',
      )}
      style={{ padding: 'var(--s-3)' }}
    >
      {/* Quadradinho + nome + contagem. O rótulo é `--t-rotulo` e não tem caixa
          nem fundo próprio — a regra de §Hierarquia é explícita nisso. */}
      <header className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="size-2.5 shrink-0 rounded-[2px]"
          style={{ background: coluna.cor ?? 'var(--n-900)' }}
        />
        <h3 className="t-rotulo truncate">{coluna.rotulo}</h3>
        <span className="t-dado-meta ml-auto">{linhas.length}</span>
      </header>

      <ul className="flex flex-col" style={{ gap: 'var(--s-2)', marginTop: 'var(--s-3)' }}>
        {linhas.map((row) => (
          <CartaoDoKanban
            key={chave(row)}
            id={chave(row)}
            conteudo={cartao(row)}
            destinos={destinos}
            arrastavel={onMover !== undefined}
            {...(onMover ? { aoMover: (colunaId: string) => onMover(row, colunaId) } : {})}
            {...(aoAbrir ? { aoAbrir: () => aoAbrir(row) } : {})}
          />
        ))}
      </ul>
    </section>
  )
}

function CartaoDoKanban({
  id,
  conteudo,
  destinos,
  arrastavel,
  aoMover,
  aoAbrir,
}: {
  id: string
  conteudo: CartaoDoQuadro
  destinos: readonly ColunaDoQuadro[]
  arrastavel: boolean
  aoMover?: (colunaId: string) => void
  aoAbrir?: () => void
}) {
  const caixa = useRef<HTMLLIElement>(null)
  const [arrastando, setArrastando] = useState(false)
  const agora = useRef({ id, aoMover })
  agora.current = { id, aoMover }

  useEffect(() => {
    const elemento = caixa.current
    if (!elemento || !arrastavel) return
    return combine(
      draggable({
        element: elemento,
        getInitialData: () => ({ tipo: TIPO_CARTAO, id: agora.current.id }),
        onDragStart: () => setArrastando(true),
        onDrop: ({ location }) => {
          setArrastando(false)
          const alvo = location.current.dropTargets[0]?.data as { colunaId?: string } | undefined
          if (!alvo?.colunaId) return
          agora.current.aoMover?.(alvo.colunaId)
        },
      }),
    )
  }, [arrastavel])

  return (
    <li
      ref={caixa}
      data-slot="cartao"
      data-arrastando={arrastando ? '' : undefined}
      className={cn(
        'rounded-card border border-[var(--n-300)] bg-[var(--n-0)] shadow-[var(--hard-soft)]',
        // O papel LEVANTA no hover — de `--hard-soft` (cinza, parado) para
        // `--hard-1` (tinta). É a única mudança de profundidade do quadro.
        'transition-shadow hover:shadow-[var(--hard-1)]',
        // Some pela metade enquanto viaja: sem isto o operador vê duas cópias,
        // a da origem e a que segue o ponteiro.
        arrastando && 'opacity-40',
      )}
      style={{ padding: 'var(--s-3)' }}
    >
      <div className="flex items-start gap-1">
        {aoAbrir ? (
          <button
            type="button"
            onClick={aoAbrir}
            className="t-bloco flex-1 text-left underline-offset-2 hover:underline"
          >
            {conteudo.titulo}
          </button>
        ) : (
          <span className="t-bloco flex-1">{conteudo.titulo}</span>
        )}

        {arrastavel && destinos.length > 0 ? (
          <DropdownMenuTrigger>
            {/* O `Button` da casa, e não um `<button>` cru: o `MenuTrigger` do
                react-aria só liga o menu a um gatilho que ele conhece — com o
                elemento nativo o menu não abre, e o teclado fica sem caminho. */}
            <Button variant="ghost" size="icon-sm" aria-label={`Mover ${conteudo.titulo}`}>
              <MoreHorizontal aria-hidden="true" />
            </Button>
            <DropdownMenu placement="bottom end">
              <DropdownMenuLabel>Mover para</DropdownMenuLabel>
              {destinos.map((destino) => (
                <DropdownMenuItem key={destino.id} onAction={() => aoMover?.(destino.id)}>
                  {destino.rotulo}
                </DropdownMenuItem>
              ))}
            </DropdownMenu>
          </DropdownMenuTrigger>
        ) : null}
      </div>

      {conteudo.subtitulo ? <p className="t-meta mt-1">{conteudo.subtitulo}</p> : null}

      {/* Rodapé do cartão: estado e dado. Separado do texto por HAIRLINE — uma
          fronteira, uma ferramenta; espaço já separa as linhas de cima. */}
      {conteudo.badge || conteudo.data || conteudo.valorCents !== undefined ? (
        <div
          className="flex flex-wrap items-center gap-x-3 gap-y-1 border-[var(--n-200)] border-t pt-1.5"
          style={{ marginTop: 'var(--s-2)' }}
        >
          {conteudo.badge ? (
            <span
              className="t-dado-meta inline-flex items-center gap-1 rounded-data px-1.5"
              style={{ background: FUNDO_DO_TOM[conteudo.badge.tom ?? 'mut'] }}
            >
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full"
                style={{ background: TINTA_DO_TOM[conteudo.badge.tom ?? 'mut'] }}
              />
              {conteudo.badge.rotulo}
            </span>
          ) : null}
          {conteudo.data ? <span className="t-dado">{formatDateBR(conteudo.data)}</span> : null}
          {/* `null` é "não estimado" e SOME; zero diria que o registro não vale
              nada, que é outra afirmação. */}
          {conteudo.valorCents === null || conteudo.valorCents === undefined ? null : (
            <span className="t-dado ml-auto">{formatMoneyBRL(conteudo.valorCents)}</span>
          )}
        </div>
      ) : null}
    </li>
  )
}

/**
 * A entrada de VISÃO que a listagem consome — `modo: 'kanban'` em uma função.
 *
 * A `VitraDataTable` já tem alternador de visões e o `Agrupar por` (padrão 9,
 * #86); o que faltava era um quadro que não soubesse de nada. Declarar a visão
 * aqui é o que impede cinco telas de montarem cinco quadros parecidos — a tela
 * COMPÕE, e o desenho é um só.
 *
 * `agrupa: true` liga o seletor `Agrupar por` da barra: o campo escolhido lá
 * VENCE o `campoDeColuna` declarado, que passa a ser só o padrão de abertura.
 */
export function visaoKanban<T>({
  id = 'kanban',
  rotulo = 'Kanban',
  campoDeColuna,
  colunas,
  chave,
  cartao,
  onMover,
  aoAbrir,
}: {
  id?: string
  rotulo?: string
} & ModoKanbanProps<T>): VisaoDaListagem<T> {
  return {
    id,
    rotulo,
    icon: LayoutGrid,
    agrupa: true,
    render: ({ rows, agruparPor }) => (
      <ModoKanban
        rows={rows}
        campoDeColuna={(agruparPor || campoDeColuna) as keyof T & string}
        {...(colunas && (!agruparPor || agruparPor === campoDeColuna) ? { colunas } : {})}
        chave={chave}
        cartao={cartao}
        {...(onMover ? { onMover } : {})}
        {...(aoAbrir ? { aoAbrir } : {})}
      />
    ),
  }
}
