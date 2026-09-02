import { BandaDeIdentidade } from '@/components/cabinet/banda-identidade'
import type { FormGridTotalRow } from '@/components/cabinet/form-grid'
import { NumeroHeroi } from '@/components/cabinet/kpi-tile'
import { Stamp, type StampTom } from '@/components/cabinet/stamp'
import { TotalBox } from '@/components/cabinet/total-box'
import { PERCENT_ESCALA, formatMoneyBRL } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { useId } from 'react'
import { useWatch } from 'react-hook-form'

/**
 * Documento = cabeçalho + itens + totais (transcrição §9, padrão 6):
 * ordem de compra, pedido de compra e orçamento.
 *
 * Regra do dinheiro (CLAUDE.md): tudo em centavos (int). Os totais são
 * DERIVADOS dos itens — nunca guardados em paralelo no form state.
 */

export interface DocumentoHeaderProps {
  /** Título literal da transcrição, em Headline (800, caps) dentro da banda. */
  titulo: string
  /** Modo da tela (`Incluir`, `Consulta`) — vai em Meta AO LADO do título, sem traço. */
  modo?: string | undefined
  /**
   * Número do documento — a âncora visual do cabeçalho: Nº do Documento em
   * display condensado a 36px, à direita, como o `591890` da comanda. Ausente
   * em documento novo.
   */
  numero?: string | number | undefined
  /** Carimbo de situação ao lado do número — só quando a enumeração real chegar. */
  stamp?: { tom: StampTom; label: string } | undefined
}

/**
 * Cabeçalho de documento (DESIGN.md §DocumentoHeader): é a MESMA banda de
 * identidade do cadastro, com número e carimbo no fim da faixa.
 *
 * Era um `<header>` próprio, com régua de 1px e título 1.25rem — a mesma ideia
 * dita com outros valores. Duas faixas de identidade divergindo é o vetor de
 * deriva que o DESIGN.md nomeia: agora quem muda a banda muda os dois, e o
 * documento só acrescenta o que é dele (o número é a âncora, o carimbo é a
 * situação).
 */
export function DocumentoHeader({ titulo, modo, numero, stamp }: DocumentoHeaderProps) {
  return (
    <BandaDeIdentidade
      titulo={titulo}
      escalaTitulo="documento"
      {...(modo ? { contexto: modo } : {})}
    >
      {numero !== undefined && (
        // FUSÃO v5: o número é a ÂNCORA do documento — caixa preta, tinta
        // clara, sombra de decisão. É a única peça escura do cabeçalho.
        <NumeroHeroi
          escala="documento"
          data-slot="documento-numero"
          className="rounded-item bg-primary px-3 py-1 text-primary-foreground shadow-el2"
        >
          {numero}
        </NumeroHeroi>
      )}
      {stamp && <Stamp tom={stamp.tom} label={stamp.label} />}
    </BandaDeIdentidade>
  )
}

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
      {/* Tira alinhada à direita, borda em Régua, canto 4px; pares separados por 24px. */}
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
      {/* Rótulo em Meta (mono, caixa alta pequena); valor tabular. */}
      <span className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        {label}:
      </span>
      <output aria-label={label} className="tabular-nums">
        {formatMoneyBRL(valor)}
      </output>
    </div>
  )
}

export interface DocumentoFrameProps {
  /** Tipo do documento — vai na etiqueta da moldura ("Orçamento", "Ordem de Compra"…). */
  tipo: string
  /** Número do documento — ausente em documento novo (inclusão). */
  numero?: string | number | undefined
  children: React.ReactNode
  className?: string
}

/**
 * MOLDURA-MÃE do documento (fusão v5 §3 "subdivisão explícita", mockup
 * `docs/design/fusao-v5/mockup-orcamentos-v5.html`): retângulo de traço
 * estrutural, raio 20, fundo semi-transparente e etiqueta sobreposta na borda
 * dizendo `DOCUMENTO · <tipo> Nº <n>`.
 *
 * O que ela resolve: a tela de documento é uma pilha de caixas sem dono
 * declarado — cabeçalho, abas, seções, grade, totais e, ao lado, painéis que
 * NÃO pertencem ao documento (Atividades). A moldura desenha a fronteira: o
 * que está dentro é a entidade; o que está fora, não é. Por isso ela mora em
 * `TelaDeDocumento`, que é quem tem o cabeçalho e o form juntos — envolver só
 * as abas deixaria o cabeçalho do próprio documento do lado de fora.
 *
 * Etiqueta INVERTIDA, não lima: o mockup pinta preto/lima porque tem um tema
 * só. Aqui `bg-foreground/text-background` é a mesma peça nos dois temas (o
 * precedente é o tooltip); `text-modulo` viraria lilás claro sobre fundo claro
 * no tema escuro, que é o contraste que o mockup nunca precisou medir.
 *
 * Degrau de transparência: a moldura é `bg-card/40` e o `DocumentoBloco`
 * dentro dela é `bg-card/55` — o mesmo pano do mockup (.38 / .45), duas
 * camadas sobre o papel para as seções brancas saltarem.
 */
export function DocumentoFrame({ tipo, numero, children, className }: DocumentoFrameProps) {
  const etiquetaId = useId()
  const etiqueta = numero !== undefined ? `DOCUMENTO · ${tipo} Nº ${numero}` : `DOCUMENTO · ${tipo}`

  return (
    <section
      data-slot="documento-frame"
      aria-labelledby={etiquetaId}
      className={cn(
        'relative rounded-frame border-2 border-rule-strong bg-card/40 p-5 shadow-macia',
        className,
      )}
    >
      <span
        id={etiquetaId}
        data-slot="documento-etiqueta"
        className="-top-2.5 absolute left-5 inline-flex items-center rounded-item bg-foreground px-3 py-1 font-mono text-[0.625rem] font-bold uppercase tracking-[0.15em] text-background"
      >
        {etiqueta}
      </span>
      {children}
    </section>
  )
}

export interface DocumentoBlocoProps {
  children: React.ReactNode
  className?: string
}

/**
 * CARD AGRUPADOR semi-transparente dentro da moldura-mãe (mockup `.card`,
 * `rgba(255,255,255,.45)`): o pano único sobre o qual as seções-filhas
 * brancas saltam. Agrupa as seções de CABEÇALHO do documento (quem, quando,
 * que regra) e deixa a grade de itens e os totais como blocos próprios —
 * é essa divisão que o mockup desenha.
 */
export function DocumentoBloco({ children, className }: DocumentoBlocoProps) {
  return (
    <div
      data-slot="documento-bloco"
      className={cn('rounded-card border border-rule-hair bg-card/55 p-4', className)}
    >
      {children}
    </div>
  )
}
