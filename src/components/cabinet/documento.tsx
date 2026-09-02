import type { EstadoDoAutosave } from '@/components/cabinet/alteracoes-nao-salvas'
import type { FormGridTotalRow } from '@/components/cabinet/form-grid'
import type { AcaoDeCabecalho } from '@/components/cabinet/page-header'
import { Stamp, type StampTom } from '@/components/cabinet/stamp'
import { TotalBox } from '@/components/cabinet/total-box'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { PERCENT_ESCALA, formatMoneyBRL } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { MoreHorizontal } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { useWatch } from 'react-hook-form'

/**
 * Documento = cabeçalho do registro + principal/lateral (mockup 2.0, aba
 * Formulário; issue #483): ordem de compra, pedido de compra e orçamento.
 *
 * Regra do dinheiro (CLAUDE.md): tudo em centavos (int). Os totais são
 * DERIVADOS dos itens — nunca guardados em paralelo no form state.
 */

/* ---------------------------------------------------------------------
   CABEÇALHO DO REGISTRO
   --------------------------------------------------------------------- */

/** Quanto tempo em segundos o "salvo há n s" ainda conta de segundo em segundo. */
const SEGUNDOS_ANTES_DE_VIRAR_MINUTO = 60

function textoDoTempo(segundos: number): string {
  if (segundos < 5) return 'salvo agora'
  if (segundos < SEGUNDOS_ANTES_DE_VIRAR_MINUTO) return `salvo há ${segundos} s`
  const minutos = Math.floor(segundos / SEGUNDOS_ANTES_DE_VIRAR_MINUTO)
  return `salvo há ${minutos} min`
}

export interface IndicadorDeGravacaoProps {
  estado: EstadoDoAutosave
  /** Refaz a gravação que falhou — o botão que o autosave deve ao operador. */
  onTentarDeNovo?: (() => void) | undefined
}

/**
 * "● salvo há 12 s" (mockup 2.0) — a prova de que a ficha sem `Gravar` gravou.
 *
 * Tirar o botão de gravar tira também a confirmação que ele dava: o operador
 * clicava e via a tela responder. O indicador é o que fica no lugar, e por isso
 * ele é **permanente**, não um toast: quem chega no meio da tarefa precisa
 * poder olhar e saber, sem ter estado aqui quando a mensagem passou.
 *
 * O relógio conta de segundo em segundo só no primeiro minuto. Depois disso a
 * precisão deixa de informar — "salvo há 4 min" responde a mesma pergunta que
 * "há 247 s" e não obriga a tela a repintar para sempre.
 */
export function IndicadorDeGravacao({ estado, onTentarDeNovo }: IndicadorDeGravacaoProps) {
  const [agora, setAgora] = useState(() => Date.now())

  useEffect(() => {
    if (estado.fase !== 'salvo' || estado.salvoEm === null) return
    setAgora(Date.now())
    const id = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(id)
  }, [estado.fase, estado.salvoEm])

  if (estado.fase === 'ocioso') return null

  if (estado.fase === 'erro' || estado.fase === 'conflito') {
    return (
      <span data-slot="autosave" data-fase={estado.fase} className="flex items-center gap-2">
        {/* `--bad` por `style`, e não por classe utilitária de cor arbitrária:
            §Hierarquia proíbe literal em componente e o token semântico é o que
            vira sozinho no tema escuro. */}
        <span className="t-meta" style={{ color: 'var(--bad)' }}>
          erro ao salvar
        </span>
        {onTentarDeNovo ? (
          <Button type="button" variant="ghost" size="sm" onClick={onTentarDeNovo}>
            Tentar de novo
          </Button>
        ) : null}
      </span>
    )
  }

  const salvando = estado.fase === 'salvando' || estado.fase === 'pendente'
  const segundos =
    estado.salvoEm === null ? 0 : Math.max(0, Math.floor((agora - estado.salvoEm) / 1000))

  return (
    // `<output>` porque a mensagem MUDA sozinha e sem ação de quem lê — é o
    // mesmo anúncio educado que a barra do cadastro usa.
    <output data-slot="autosave" data-fase={estado.fase} className="flex items-center gap-2 t-meta">
      <span
        aria-hidden="true"
        data-slot="autosave-ponto"
        className="inline-block size-1.5 rounded-full"
        style={{ background: salvando ? 'var(--n-500)' : 'var(--ok)' }}
      />
      {salvando ? 'salvando…' : textoDoTempo(segundos)}
    </output>
  )
}

export interface CabecalhoDoRegistroProps {
  /** O que o registro é ("Ordem de compra"), em Gambarino 24 (`.t-registro`). */
  titulo: string
  /** O número do documento, em mono ao lado do título — `OC-5102`. */
  id?: string | number | undefined
  /** Situação do registro. Uma, e a primeira coisa da linha de meta. */
  badge?: { tom: StampTom; label: string } | undefined
  /** "criada em 20/08 por Henrique · reagendada 1×" — a procedência, em `.t-meta`. */
  meta?: ReactNode
  /** Estado da fila de autosave; sem ele o cabeçalho não fala de gravação. */
  autosave?: EstadoDoAutosave | undefined
  onTentarDeNovo?: (() => void) | undefined
  /** Ações fracas, à vista mas sem peso — Imprimir. */
  ghost?: readonly AcaoDeCabecalho[]
  /** Ações de contorno — Duplicar. */
  secundarias?: readonly AcaoDeCabecalho[]
  /** O que mora atrás do `···`: cancelar, excluir, o que é raro ou perigoso. */
  menu?: readonly AcaoDeCabecalho[]
  /**
   * A ÚNICA peça forte do cabeçalho, e ela não se chama "Gravar": é o PRÓXIMO
   * PASSO deste registro neste estado — "Confirmar recebimento", "Enviar
   * orçamento", "Ativar cadastro". Ver `TelaDeDocumentoProps.cabecalho`.
   */
  proximaAcao?: AcaoDeCabecalho | undefined
  className?: string
}

/**
 * CABEÇALHO DO REGISTRO 2.0 (#483, mockup aba Formulário) — o que substituiu a
 * banda preta com o número-herói.
 *
 * ## O que mudou, e por quê
 *
 * A banda de identidade dizia o TIPO do documento em caixa alta gigante e o
 * número numa caixa preta. Ela respondia "que tela é esta?", que é a pergunta
 * de quem está perdido — não a de quem abriu a ficha. Quem abre uma ficha já
 * sabe onde está e quer saber **em que pé o registro está e o que fazer com
 * ele**. É essa a informação que o cabeçalho novo carrega, nesta ordem: o nome
 * e o id (que se copia), a situação, a procedência, se está gravado, e a ação
 * que leva o registro ao estado seguinte.
 *
 * ## `Gravar` não está aqui, e a ausência é a decisão
 *
 * A ficha grava sozinha (`useAutosave`). O lugar do botão forte fica então
 * livre para a única ação que o operador realmente escolhe — a do fluxo. Um
 * `Gravar` ao lado de "Confirmar recebimento" ensinaria que gravar é opcional,
 * que é justamente o contrário do que o autosave promete.
 *
 * ## A saída não mora aqui
 *
 * O mockup desenha uma tecla de voltar à esquerda do título; no repo ela já
 * existe uma vez por tela, na folha (`PageFrame` → `BotaoVoltar`, issue #235).
 * Repeti-la aqui daria duas saídas na mesma tela — e a regra da #235 é
 * exatamente que exista **uma**, sempre no mesmo canto.
 */
export function CabecalhoDoRegistro({
  titulo,
  id,
  badge,
  meta,
  autosave,
  onTentarDeNovo,
  ghost = [],
  secundarias = [],
  menu = [],
  proximaAcao,
  className,
}: CabecalhoDoRegistroProps) {
  return (
    <div
      data-slot="cabecalho-do-registro"
      // Fronteira entre cabeçalho e conteúdo = ESPAÇO, sem linha (§Hierarquia,
      // separação nº 1): a régua horizontal aqui seria a segunda ferramenta na
      // mesma fronteira.
      className={cn('flex flex-wrap items-center gap-x-3 gap-y-2', className)}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="t-registro min-w-0 truncate">
          {titulo}
          {id !== undefined && id !== '' ? (
            <span
              data-slot="registro-id"
              // Sem classe própria na fundação: `.t-registro` descreve o id
              // mono 20 n-500 na tabela da §Hierarquia mas não o publica como
              // degrau. Fallback declarado até D1 abrir `--t-registro-id`
              // (comentado na #469).
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--t-registro-id, 20px)',
                fontWeight: 500,
                letterSpacing: 0,
                color: 'var(--n-500)',
                marginLeft: 'var(--s-2)',
              }}
            >
              {id}
            </span>
          ) : null}
        </h1>

        {badge || meta ? (
          <div className="flex flex-wrap items-center gap-2">
            {badge ? <Stamp tom={badge.tom} label={badge.label} /> : null}
            {meta ? <span className="t-meta">{meta}</span> : null}
          </div>
        ) : null}
      </div>

      {/* `ml-auto` no GRUPO: as ações formam um bloco só no canto, e o estado de
          gravação entra nele porque é o que explica a ausência do `Gravar`. */}
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {autosave ? (
          <IndicadorDeGravacao estado={autosave} onTentarDeNovo={onTentarDeNovo} />
        ) : null}

        {ghost.map((acao) => (
          <Button
            key={acao.id}
            type="button"
            variant="ghost"
            disabled={acao.disabled === true}
            {...(acao.motivo ? { title: acao.motivo } : {})}
            onClick={() => acao.onClick?.()}
          >
            {acao.icon ? <acao.icon aria-hidden="true" /> : null}
            {acao.label}
          </Button>
        ))}

        {secundarias.map((acao) => (
          <Button
            key={acao.id}
            type="button"
            variant="outline"
            disabled={acao.disabled === true}
            {...(acao.motivo ? { title: acao.motivo } : {})}
            onClick={() => acao.onClick?.()}
          >
            {acao.icon ? <acao.icon aria-hidden="true" /> : null}
            {acao.label}
          </Button>
        ))}

        {menu.length > 0 ? (
          <DropdownMenuTrigger>
            <Button type="button" variant="outline" size="icon" aria-label="Mais ações">
              <MoreHorizontal aria-hidden="true" />
            </Button>
            <DropdownMenu placement="bottom end" className="min-w-56">
              {menu.map((acao) => (
                <DropdownMenuItem
                  key={acao.id}
                  textValue={acao.label}
                  isDisabled={acao.disabled === true}
                  {...(acao.destrutiva ? { variant: 'destructive' as const } : {})}
                  onAction={() => acao.onClick?.()}
                >
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="flex items-center gap-1.5">
                      {acao.icon ? <acao.icon aria-hidden="true" /> : null}
                      {acao.label}
                    </span>
                    {/* Motivo VISÍVEL, e não no `title`: item de menu
                        desabilitado não recebe evento de mouse em toda
                        plataforma. */}
                    {acao.motivo ? <span className="t-meta">{acao.motivo}</span> : null}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenu>
          </DropdownMenuTrigger>
        ) : null}

        {proximaAcao ? (
          <Button
            type="button"
            data-slot="proxima-acao"
            disabled={proximaAcao.disabled === true}
            {...(proximaAcao.motivo ? { title: proximaAcao.motivo } : {})}
            onClick={() => proximaAcao.onClick?.()}
          >
            {proximaAcao.icon ? <proximaAcao.icon aria-hidden="true" /> : null}
            {proximaAcao.label}
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export interface LayoutDoRegistroProps {
  /** A coluna do documento: dados, itens, totais. */
  principal: ReactNode
  /** O que ORBITA o documento: fornecedor, andamento, pagamento (320px). */
  lateral?: ReactNode
  className?: string
}

/**
 * DUAS COLUNAS (mockup 2.0: `minmax(0,1fr) 320px`) — e o que separa uma da
 * outra é o assunto, não a importância.
 *
 * A principal é o documento em si: o que se preenche e o que soma. A lateral é
 * o que se CONSULTA enquanto se preenche — quem é o fornecedor, em que pé está
 * o andamento, qual a condição de pagamento. Antes tudo isso empilhava numa
 * coluna só, e a ficha ficava com dois metros de rolagem em que o dado de
 * consulta afastava um campo do outro.
 *
 * ## Por que flex e não `grid-template-columns`
 *
 * A quebra tem de acontecer sem `@media` (regra 7 da rodada). Com `grid` e
 * `auto-fit` as duas colunas ficam iguais, e a lateral de 320px viraria metade
 * da tela. Com flex, a principal cresce com peso desproporcional (`grow: 999`)
 * e a lateral fica na sua base de 320px enquanto as duas couberem na linha;
 * quando não cabem, cada uma toma a linha inteira. É a mesma regra, em uma
 * declaração, sem ponto de quebra escrito à mão.
 *
 * Fronteira entre colunas = espaço `--s-4` (16), sem linha (§Hierarquia).
 */
export function LayoutDoRegistro({ principal, lateral, className }: LayoutDoRegistroProps) {
  return (
    <div
      data-slot="layout-do-registro"
      className={cn('flex flex-wrap items-start gap-4', className)}
    >
      <div
        data-slot="registro-principal"
        className="flex min-w-0 flex-col gap-4"
        style={{ flex: '999 1 28rem' }}
      >
        {principal}
      </div>
      {lateral ? (
        <aside
          data-slot="registro-lateral"
          className="flex min-w-0 flex-col gap-4"
          style={{ flex: '1 1 320px' }}
        >
          {lateral}
        </aside>
      ) : null}
    </div>
  )
}

/* ---------------------------------------------------------------------
   TOTAIS — derivados dos itens, sempre
   --------------------------------------------------------------------- */

interface ItemValorizado {
  quantidade?: string | number | boolean | null
  valorUnitarioCentavos?: string | number | boolean | null
  descontoPercentual?: string | number | boolean | null
}

/** Quantidade aceita até 3 casas (CLAUDE.md) e chega como texto do input. */
export function parseQuantidade(valor: unknown): number {
  if (typeof valor === 'number') return valor
  if (typeof valor !== 'string' || valor.trim() === '') return 0
  const n = Number(valor.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

/** Valor da linha em centavos: quantidade × unitário, menos o desconto da linha. */
export function totalItemCentavos(item: ItemValorizado): number {
  const qtd = parseQuantidade(item.quantidade)
  const unit = typeof item.valorUnitarioCentavos === 'number' ? item.valorUnitarioCentavos : 0
  const bruto = qtd * unit
  const desc = typeof item.descontoPercentual === 'number' ? item.descontoPercentual : 0
  return Math.round(bruto - (bruto * desc) / (PERCENT_ESCALA * 100))
}

/** Soma dos itens do array `name` do form, em centavos. */
export function useSubtotalCentavos(name: string): number {
  const itens = (useWatch({ name }) ?? []) as ItemValorizado[]
  return itens.reduce((acc, item) => acc + totalItemCentavos(item), 0)
}

/**
 * Fileiras de totais para o pé da grade de itens (DESIGN.md §DocumentoTotais
 * — a forma padrão): SubTotal, ajustes e Total (destaque), sempre derivados.
 * A tira (`DocumentoTotais`) é a exceção para tela sem grade de itens.
 */
export function fileirasTotais(
  subtotalCentavos: number,
  ajustes: { label: string; valorCentavos: number; sinal: 1 | -1 }[] = [],
): FormGridTotalRow[] {
  const total = ajustes.reduce((acc, a) => acc + a.sinal * a.valorCentavos, subtotalCentavos)
  return [
    { label: 'SubTotal', valorCentavos: subtotalCentavos },
    ...ajustes.map((a) => ({ label: a.label, valorCentavos: a.valorCentavos })),
    { label: 'Total', valorCentavos: total, destaque: true },
  ]
}

export interface DocumentoTotaisProps {
  subtotalCentavos: number
  /** Linhas extras entre subtotal e total (Desconto, Acréscimo…). */
  ajustes?: { label: string; valorCentavos: number; sinal: 1 | -1 }[]
}

/**
 * Tira de totais — a EXCEÇÃO (DESIGN.md §DocumentoTotais): só para tela sem
 * grade de itens (resumos, consultas). Com grade, subtotal e ajustes são as
 * últimas fileiras da própria grade via `fileirasTotais` + prop `totals` do
 * FormGrid.
 *
 * O FECHO é o mesmo `TotalBox` dos dois casos (#236). Duas telas do mesmo
 * documento com dois totais de tamanhos diferentes é a deriva que a fusão v5
 * fechou — e aqui ela apareceria como "o total encolhe quando a tela não tem
 * grade", que ninguém leria como decisão de desenho.
 */
export function DocumentoTotais({ subtotalCentavos, ajustes = [] }: DocumentoTotaisProps) {
  const total = ajustes.reduce((acc, a) => acc + a.sinal * a.valorCentavos, subtotalCentavos)

  return (
    <div className="flex flex-col items-end gap-3">
      {/* Tira alinhada à direita, hairline e canto do sistema; pares separados
          por `--s-5` (24). */}
      <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-2 rounded-lg border p-3">
        <TotalItem label="SubTotal" valor={subtotalCentavos} />
        {ajustes.map((a) => (
          <TotalItem key={a.label} label={a.label} valor={a.valorCentavos} />
        ))}
      </div>
      <TotalBox valorCentavos={total} />
    </div>
  )
}

function TotalItem({
  label,
  valor,
  className,
}: {
  label: string
  valor: number
  className?: string
}) {
  return (
    <div className={cn('flex items-baseline gap-2', className)}>
      {/* Rótulo em `.t-rotulo` (mono não: rótulo é Inter caixa alta na 2.0);
          valor em `.t-dado`, que é o degrau do que se soma. */}
      <span className="t-rotulo">{label}:</span>
      <output aria-label={label} className="t-dado">
        {formatMoneyBRL(valor)}
      </output>
    </div>
  )
}

export interface DocumentoBlocoProps {
  children: React.ReactNode
  className?: string
}

/**
 * CARD QUIET (mockup 2.0 `.card.quiet`): o bloco em que o documento se divide —
 * dados da ordem, itens, observações, e cada card da lateral.
 *
 * Era semi-transparente sobre uma moldura-mãe de traço grosso (fusão v5). A
 * moldura saiu com a rodada 2.0: ela desenhava a fronteira do documento com uma
 * quinta ferramenta de separação, por cima das quatro da §Hierarquia, e uma
 * borda de 2px com etiqueta sobreposta chamava mais atenção que o conteúdo que
 * envolvia. O que separa o documento do que está ao lado dele agora é a COLUNA
 * (`LayoutDoRegistro`), que é espaço — a ferramenta mais barata que resolve.
 *
 * O card fica então em folha opaca, hairline e sombra macia: página › card, dois
 * níveis, que é o teto que a régua permite. Dentro dele, só espaço, hairline e
 * tint.
 */
export function DocumentoBloco({ children, className }: DocumentoBlocoProps) {
  return (
    <div
      data-slot="documento-bloco"
      className={cn('rounded-card border border-rule-hair bg-card p-4 shadow-macia', className)}
    >
      {children}
    </div>
  )
}
