import { formatMoneyBRL } from '@/lib/formatters'
import { cn } from '@/lib/utils'

/**
 * FAIXA DE KPI (Reface 2.0, D11 · #479) — resumo antes do detalhe, em toda
 * listagem que tem dinheiro ou prazo.
 *
 * ## O que a faixa é, e o que ela não é
 *
 * Ela encima a grade e responde, sem rolagem, a pergunta que o operador tem ao
 * abrir a listagem: *quanto, quantos, e está piorando?* O detalhe fica abaixo.
 *
 * **O número NÃO sai da grade.** Vem dos agregados do servidor
 * (`src/data/agregados-api.ts`), porque somar a página baixada daria o total da
 * PÁGINA: vinte linhas de 14 ordens somam quatorze, vinte de 400 somam vinte, e
 * o número mudaria ao paginar sem nada na tela explicando por quê.
 *
 * ## Por que no máximo quatro (`FaixaDeKpi` recusa o quinto)
 *
 * Quatro é o que cabe numa linha legível na largura de trabalho, e é a régua da
 * referência (Mercury). O quinto não encolhe a faixa: ele quebra para uma
 * segunda fileira, e uma segunda fileira de resumo empurra a grade para fora da
 * dobra — o detalhe que a faixa existe para introduzir some. Pior, o quinto
 * número entra sempre pela mesma porta ("só mais este"), e nenhuma tela decide
 * sozinha remover um.
 *
 * Por isso a recusa é um `throw` na montagem, e não um aviso: quinto KPI é
 * decisão de desenho, e ela se toma escolhendo qual dos quatro sai.
 *
 * ## §Hierarquia — o que este arquivo consome e o que ele pediu
 *
 * Rótulo, nota e delta saem dos degraus (`.t-rotulo`, `.t-meta`), sem tamanho
 * literal. **O VALOR não tem degrau:** a régua tem `--t-dado` a 12,5px, que é
 * célula de tabela, e o valor do KPI é 20px no mockup — a peça inteira existe
 * para ele dominar a faixa. Entra por `var(--t-kpi-valor, 20px)` conforme a
 * regra 4 do regime paralelo (token faltando → `var(--x, <fallback>)`), com
 * pedido registrado na #469 para D1 promovê-lo a degrau.
 *
 * Separação: UMA ferramenta por fronteira. Entre tiles, ESPAÇO (`--s-3`) — não
 * linha, não fundo; o card já separa cada tile do plano. Dentro do tile, só
 * espaço (`--s-1`). O tile é card de primeiro nível: borda de tinta 1,5px +
 * `--hard-1`, a única sombra dura da faixa.
 */

/**
 * A tinta do tile — por ASSUNTO, nunca decorativa.
 *
 * `nenhum` é o padrão e não é falta de decisão: o tile sem assunto próprio fica
 * na folha, e é isso que deixa o tintado significar alguma coisa. Quatro tiles
 * tintados de quatro cores diferentes viram enfeite, e a régua do 2.0 diz que
 * cor em dado é significado.
 */
export type TintDeKpi = 'nenhum' | 'lilac' | 'sky' | 'sand' | 'mint' | 'rose' | 'violet' | 'teal'

const TINT: Record<TintDeKpi, string | undefined> = {
  nenhum: undefined,
  lilac: 'var(--tint-lilac)',
  sky: 'var(--tint-sky)',
  sand: 'var(--tint-sand)',
  mint: 'var(--tint-mint)',
  rose: 'var(--tint-rose)',
  violet: 'var(--tint-violet)',
  teal: 'var(--tint-teal)',
}

/**
 * Duas medidas, as duas do mockup — `faixa` (20px, `.kpi .v`) e `destaque`
 * (24px, `.kpi .v.big`), esta para o cartão que é o assunto da tela e para o
 * fecho do documento. Não há terceira: medida aberta traria de volta a deriva
 * de telas com âncoras diferentes que a fusão v5 fechou.
 */
export type EscalaDeKpi = 'faixa' | 'destaque'

const ESCALA: Record<EscalaDeKpi, { size: string; lh: string }> = {
  faixa: { size: 'var(--t-kpi-valor, 20px)', lh: 'var(--t-kpi-valor-lh, 24px)' },
  destaque: { size: 'var(--t-kpi-valor-big, 24px)', lh: 'var(--t-kpi-valor-big-lh, 28px)' },
}

export interface KpiTileProps extends Omit<React.ComponentProps<'div'>, 'children' | 'title'> {
  /** O que o número é. Uppercase pelo degrau; nunca ganha caixa, borda ou fundo. */
  rotulo: string
  /**
   * Dinheiro, em CENTAVOS. Mutuamente exclusivo com `valor` — dois números no
   * mesmo tile seriam dois KPIs disputando um rótulo.
   */
  valorCentavos?: number
  /** Contagem ou texto curto já formatado, para o KPI que não é dinheiro. */
  valor?: React.ReactNode
  /** Unidade da contagem (`ordens`, `itens`): sai menor e mais leve que o número. */
  unidade?: string
  /**
   * Variação em pontos percentuais inteiros, já derivada de dois campos do DTO
   * (`variacao`, em `agregados-api.ts`). `null`/ausente não desenha nada —
   * base zero não tem variação, e `+100%` ali seria mentira aritmética.
   */
  delta?: number | null
  /** O que qualifica o número: contagem, período, os três primeiros nomes. */
  nota?: React.ReactNode
  /** Série da sparkline, do mês mais antigo ao mais recente. */
  serie?: readonly number[]
  tint?: TintDeKpi
  escala?: EscalaDeKpi
  /**
   * O KPI que é PROBLEMA, não informação — atrasadas, críticos. Pinta o valor
   * em `--bad`; a tinta do tile continua sendo a do assunto.
   */
  alerta?: boolean
}

/**
 * Quebra o dinheiro em símbolo · inteiros · centavos, para os centavos saírem
 * mais leves (Ramp): a 20px, `,00` disputando peso com os inteiros rouba a
 * leitura da ordem de grandeza, que é o que a faixa serve.
 *
 * Parte a saída de `formatMoneyBRL`, e não um `Intl` próprio: o formatador do
 * repo é a autoridade única sobre a máscara, e uma segunda instância aqui
 * divergiria dela no dia em que alguém mudasse a primeira. O separador decimal
 * do pt-BR é sempre `,` e o BRL sempre traz duas casas.
 */
function partesDoDinheiro(centavos: number) {
  const texto = formatMoneyBRL(centavos)
  const partes = /^(\D+)(.*),(\d{2})$/.exec(texto)
  const [, simbolo, inteiros, decimais] = partes ?? []
  if (simbolo === undefined || inteiros === undefined || decimais === undefined) {
    // Máscara que este arquivo não sabe partir sai INTEIRA, e não pela metade:
    // um valor sem os centavos leves continua legível; um valor sem os
    // inteiros seria um número errado na cara do operador.
    return { simbolo: '', inteiros: texto, decimais: '' }
  }
  return { simbolo: simbolo.trim(), inteiros, decimais: `,${decimais}` }
}

/**
 * A sparkline: 60×18, sem eixo, sem rótulo, sem tooltip.
 *
 * É FORMA, não leitura — diz "subindo/descendo/parado" e nada mais; quem quer o
 * número vai ao relatório. Por isso não ganha interação: um gráfico de 60px que
 * responde ao mouse promete precisão que ele não tem.
 *
 * **Menos de dois pontos não desenha.** Um ponto é uma bolinha, e uma bolinha
 * no canto do tile parece tendência sem ser nenhuma. Série achatada (todos
 * iguais) sai como reta no meio, que é a verdade dela.
 */
function Sparkline({ serie }: { serie: readonly number[] }) {
  if (serie.length < 2) return null

  const L = 60
  const A = 18
  const margem = 2
  const menor = Math.min(...serie)
  const maior = Math.max(...serie)
  const amplitude = maior - menor
  const passo = L / (serie.length - 1)

  const pontos = serie.map((v, i) => {
    const x = i * passo
    // Amplitude zero = reta no meio. Dividir por zero daria NaN e a curva
    // sumiria sem erro nenhum, que é o pior jeito de um gráfico falhar.
    const y = amplitude === 0 ? A / 2 : A - margem - ((v - menor) / amplitude) * (A - margem * 2)
    return [Number(x.toFixed(2)), Number(y.toFixed(2))] as const
  })

  const d = pontos.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ')
  const fim = pontos.at(-1)
  const primeiro = serie[0]
  const ultimo = serie.at(-1)
  if (!fim || primeiro === undefined || ultimo === undefined) return null
  const [fimX, fimY] = fim
  // Sobe ou desce decide a tinta: verde/vermelho aqui é o MESMO significado do
  // delta ao lado, e discordar dele seria a tela se contradizendo em 6px.
  const cor = ultimo >= primeiro ? 'var(--ok)' : 'var(--bad)'

  return (
    <svg
      data-slot="kpi-sparkline"
      viewBox={`0 0 ${L} ${A}`}
      width={L}
      height={A}
      fill="none"
      // Decorativa por decisão: o número e a nota ao lado já dizem tudo que ela
      // insinua. Anunciá-la faria o leitor de tela ler uma forma sem dado.
      aria-hidden="true"
      focusable="false"
      className="ml-auto shrink-0 self-end"
    >
      <path d={d} stroke={cor} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={fimX} cy={fimY} r={2} fill={cor} />
    </svg>
  )
}

/**
 * UM tile da faixa. Fora de uma `FaixaDeKpi` ele também serve — o cartão de
 * indicador do dashboard e o fecho do documento são tiles sozinhos.
 */
export function KpiTile({
  rotulo,
  valorCentavos,
  valor,
  unidade,
  delta,
  nota,
  serie,
  tint = 'nenhum',
  escala = 'faixa',
  alerta = false,
  className,
  style,
  ...props
}: KpiTileProps) {
  const dinheiro = valorCentavos === undefined ? null : partesDoDinheiro(valorCentavos)
  const negativo = valorCentavos !== undefined && valorCentavos < 0
  const tinta = alerta || negativo ? 'var(--bad)' : 'var(--n-900)'

  return (
    <div
      data-slot="kpi-tile"
      data-tint={tint}
      className={cn('flex min-w-0 flex-col', className)}
      style={{
        // Card de primeiro nível: borda de tinta + relevo duro. É a ÚNICA
        // sombra dura da faixa — o painel abaixo usa `--hard-2` e a hierarquia
        // KPI < painel < dialog fica legível sem ninguém explicar.
        border: '1.5px solid var(--n-900)',
        borderRadius: 'var(--r-card)',
        boxShadow: 'var(--hard-1)',
        background: TINT[tint] ?? 'var(--n-0, var(--folha))',
        // Padding de card, escala §Hierarquia: 14/16 do mockup → --s-3/--s-4.
        padding: 'var(--s-3) var(--s-4)',
        // Irmãos = gap, nunca margin por elemento.
        gap: 'var(--s-1)',
        ...style,
      }}
      {...props}
    >
      <span data-slot="kpi-rotulo" className="t-rotulo truncate" style={{ color: 'var(--n-700)' }}>
        {rotulo}
      </span>

      <output
        data-slot="kpi-valor"
        aria-label={rotulo}
        className="flex items-baseline"
        style={{
          fontFamily: 'var(--font-mono)',
          fontWeight: 500,
          fontSize: ESCALA[escala].size,
          lineHeight: ESCALA[escala].lh,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-.02em',
          color: tinta,
          gap: '2px',
        }}
      >
        {dinheiro ? (
          <>
            {/* Símbolo e centavos mais leves: a 20px o que se lê primeiro tem
                de ser a ordem de grandeza, não a moeda nem os dois zeros. */}
            <span style={{ fontSize: '.6em', fontWeight: 400, color: 'var(--n-500)' }}>
              {dinheiro.simbolo}
            </span>
            <span>{dinheiro.inteiros}</span>
            <span style={{ fontWeight: 400, color: 'var(--n-500)' }}>{dinheiro.decimais}</span>
          </>
        ) : (
          <span>{valor}</span>
        )}
        {unidade ? (
          <span style={{ fontSize: '.6em', fontWeight: 400, color: 'var(--n-500)' }}>
            {unidade}
          </span>
        ) : null}
      </output>

      {/* Delta, nota e sparkline dividem UMA linha, como no mockup. Em linhas
          próprias cada tile ganharia uma altura conforme o que ele tem a
          dizer, e quatro cartões de alturas diferentes na mesma faixa leem
          como quatro pesos diferentes — que é hierarquia inventada por
          acidente de conteúdo. */}
      {(delta !== undefined && delta !== null) || nota || serie ? (
        <span
          data-slot="kpi-rodape"
          className="t-meta flex min-w-0 items-end"
          style={{ gap: 'var(--s-2)' }}
        >
          {delta !== undefined && delta !== null ? (
            <span
              data-slot="kpi-delta"
              style={{ color: delta >= 0 ? 'var(--ok)' : 'var(--bad)', fontWeight: 600 }}
            >
              {delta >= 0 ? '+' : ''}
              {delta}%
            </span>
          ) : null}
          <span className="truncate">{nota}</span>
          {serie ? <Sparkline serie={serie} /> : null}
        </span>
      ) : null}
    </div>
  )
}

/** O teto não é preferência de tela: é o que cabe numa fileira legível. */
export const MAXIMO_DE_KPIS = 4

export interface FaixaDeKpiProps extends React.ComponentProps<'div'> {
  children: React.ReactNode
}

/**
 * A FAIXA: até quatro tiles numa fileira, entre o cabeçalho da página e o
 * painel da grade.
 *
 * Quebra por `auto-fit`, nunca por `@media`: o que decide quantos cabem é a
 * largura DISPONÍVEL (que muda com a sidebar recolhida, não só com a janela).
 *
 * O quinto tile é `throw`. Não é rigor por rigor — é o único momento em que a
 * decisão "qual dos quatro sai" ainda pode ser tomada por quem conhece a tela.
 * Depois de publicado, o quinto vira o normal e ninguém remove nenhum.
 */
export function FaixaDeKpi({ children, className, style, ...props }: FaixaDeKpiProps) {
  const quantos = Array.isArray(children)
    ? children.flat(Number.POSITIVE_INFINITY).filter(Boolean).length
    : 1

  if (quantos > MAXIMO_DE_KPIS) {
    throw new Error(
      `FaixaDeKpi aceita no máximo ${MAXIMO_DE_KPIS} KPIs e recebeu ${quantos}. O quinto não encolhe a faixa: ele quebra para uma segunda fileira e empurra a grade para fora da dobra. Escolha qual dos quatro sai.`,
    )
  }

  return (
    <div
      data-slot="faixa-de-kpi"
      data-kpis={quantos}
      className={cn('grid', className)}
      style={{
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
        // Fronteira entre tiles = ESPAÇO. O card já os separa do plano; linha
        // ou fundo aqui seria a segunda ferramenta na mesma fronteira.
        gap: 'var(--s-3)',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}

/* ---------------------------------------------------------------------------
   SOBREVIVENTE 1.x — sai quando D15 e D20 chegarem

   `NumeroHeroi` é a quinta família da fusão v5 (#236): display CONDENSADO a
   36/38/48px, para o nº do documento e o total. O 2.0 não tem essa família — a
   Bebas saiu na D1 e `--font-display-condensada` passou a apontar para a
   Gambarino —, e §Hierarquia não tem degrau acima de 30px fora do display.

   Continua exportado AQUI, e não apagado, porque os dois consumidores estão em
   zona alheia nesta rodada: `documento.tsx` (D15, cabeçalho de registro) e
   `features/dashboard/indicadores.tsx` (D20). Apagá-lo daqui quebraria as duas
   branches em curso; substituí-lo por `KpiTile` nelas seria tomar a decisão de
   desenho de outra issue.

   O que MUDOU: o comentário. O texto antigo justificava a medida pela métrica
   da Bebas (`docs/design/medir-tabular.py`), fonte que o repo não carrega mais
   — justificativa que descreve uma fonte ausente é pior que nenhuma.
   --------------------------------------------------------------------------- */

export type EscalaHeroi = 'documento' | 'total' | 'cartao'

const ESCALA_HEROI: Record<EscalaHeroi, string> = {
  documento: 'text-[2.25rem]',
  total: 'text-[3rem]',
  cartao: 'text-[2.375rem]',
}

export interface NumeroHeroiProps extends React.ComponentProps<'span'> {
  escala: EscalaHeroi
}

/**
 * @deprecated 1.x. Use `KpiTile` — `escala="destaque"` no lugar do cartão e do
 * fecho. Sai do repo em D15 (documento) e D20 (dashboard).
 */
export function NumeroHeroi({ escala, className, ...props }: NumeroHeroiProps) {
  return (
    <span
      data-slot="numero-heroi"
      className={cn(
        'font-[family-name:var(--font-display-condensada)] leading-none tabular-nums',
        'tracking-[0.02em]',
        ESCALA_HEROI[escala],
        className,
      )}
      {...props}
    />
  )
}
