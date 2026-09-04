import { formatMoneyBRL } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { Children, createContext, useContext, useEffect, useRef, useState } from 'react'

/**
 * FAIXA DE KPI (Reface 2.0, D11 · #479 · rodada 5 em D34 · #529) — resumo antes
 * do detalhe, em toda listagem que tem dinheiro ou prazo.
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
 * ## Rodada 5 (D34): o KPI é o único lugar do sistema com número de display
 *
 * `pesquisa-estilos-2026-09-02.md` §6 é explícita sobre o limite: *"kinetic type
 * em grade é ruído; o único lugar onde vale é o KPI"*. É o que autoriza aqui —
 * e só aqui — três coisas que a régua nega ao resto do sistema:
 *
 * 1. **Número acima do degrau de dado** (26 / 32 / 40px contra os 12,5 de
 *    `--t-dado`), porque a peça inteira existe para o número dominar.
 * 2. **Contagem crescente de 600 ms na entrada** — tabular, então não pula, e
 *    só a parte inteira, porque animar centavos daria movimento sem leitura.
 * 3. **Sombra ambiente no matiz** (§5) por baixo da dura. Nunca em linha de
 *    tabela: cinquenta linhas com blur de 28px é custo de composição por
 *    quadro, e a pesquisa nomeia esse risco antes de recomendar a sombra.
 *
 * ## §Hierarquia — o que este arquivo consome e o que ele pediu
 *
 * Rótulo, nota e delta saem dos degraus (`.t-rotulo`, `.t-meta`), sem tamanho
 * literal. **O VALOR não tem degrau:** a régua tem `--t-dado` a 12,5px, que é
 * célula de tabela. Entra por `var(--t-kpi-valor, 26px)` conforme a regra 4 do
 * regime paralelo (token faltando → `var(--x, <fallback>)`), com pedido
 * registrado na #469 para D1 promovê-lo a degrau.
 *
 * Separação: UMA ferramenta por fronteira. Entre tiles, ESPAÇO (`--s-3`) — não
 * linha, não fundo; o card já separa cada tile do plano. Dentro do tile, só
 * espaço (`--s-1`). O tile é card de primeiro nível: borda de tinta 1,5px +
 * `--hard-1`, a única sombra dura da faixa.
 */

/**
 * O TILE SABE SE ESTÁ NUMA FAIXA — e é isso que separa o KPI do fecho.
 *
 * Duas coisas da rodada 5 valem para o KPI de resumo e NÃO valem para o tile
 * solto: a contagem crescente e a sombra ambiente no matiz.
 *
 * - **Contagem**: `TotalBox` é este componente no fecho do documento, e o total
 *   muda a cada linha que o operador digita na grade. Contar 600 ms por tecla
 *   faria o número nunca ficar parado enquanto se preenche um orçamento.
 * - **Sombra ambiente**: ela existe para dar profundidade a uma FILEIRA de
 *   cartões sobre a bancada (`pesquisa` §5, "onde: `.kpi`"). O fecho é a última
 *   coisa dentro de um documento que já tem moldura, e um halo colorido ali
 *   competiria com a borda do próprio documento.
 *
 * Por contexto e não por propriedade porque quem sabe a resposta é a GRADE, não
 * a tela: uma propriedade obrigaria cada consumidor a repetir a decisão, e o
 * primeiro que esquecesse teria um fecho girando sem ninguém entender por quê.
 */
const DentroDaFaixa = createContext(false)

/**
 * A ZONA DE KPI sem grade própria — para a grade que não é `FaixaDeKpi` e ainda
 * assim é uma região de resumo (o bento do hub, que mistura KPI, card de lista
 * e atalho na mesma grade de duas dimensões).
 *
 * Não desenha nada: só declara que os tiles ali dentro são KPI de resumo, e não
 * fecho de documento. Existe para a decisão continuar num lugar só — sem ela, o
 * hub repetiria por propriedade em cada tile o que a faixa já sabe dizer.
 */
export function ZonaDeKpi({ children }: { children: React.ReactNode }) {
  return <DentroDaFaixa.Provider value={true}>{children}</DentroDaFaixa.Provider>
}

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
 * O MATIZ do assunto (`--kc` no mockup) — a mesma decisão de cor do `tint`,
 * dita em saturação cheia.
 *
 * O `tint` é a cor DILUÍDA (12–14% sobre a folha), que serve de fundo; a sombra
 * ambiente, a faixa de 3px e o rótulo pedem a cor CHEIA, porque uma sombra a
 * 12% de matiz sobre papel não é sombra nenhuma. São dois usos da mesma
 * decisão, e por isso saem do mesmo `tint` em vez de virarem uma segunda
 * propriedade: `tint="mint"` com `matiz="rose"` seria um tile que se contradiz.
 *
 * `nenhum` cai em `--n-400`, o fallback que o mockup escreve
 * (`var(--kc,var(--n-400))`): o tile sem assunto ganha relevo cinza, não relevo
 * colorido — que é o que mantém o tintado significando algo.
 */
const MATIZ: Record<TintDeKpi, string> = {
  nenhum: 'var(--n-400)',
  lilac: 'var(--indigo-400)',
  sky: 'var(--sky-400)',
  sand: 'var(--amber-400)',
  mint: 'var(--mint-400)',
  rose: 'var(--rose-400)',
  violet: 'var(--violet-400)',
  teal: 'var(--teal-400)',
}

/**
 * Três medidas, as três da rodada 5 (`pesquisa` §6: "26/32/40px") — `padrao`
 * para a faixa sobre a grade, `destaque` para o cartão que é o assunto da tela
 * e para o fecho do documento, `heroi` para o número que É a tela (o 2×1 do
 * bento no dashboard e no hub).
 *
 * Não há quarta: medida aberta traria de volta a deriva de telas com âncoras
 * diferentes que a fusão v5 fechou. E não há salto de família — os três são
 * mono, porque "mono = dado, sem exceção" (§Hierarquia) e o valor do KPI é o
 * dado mais dado da tela.
 *
 * `letter-spacing: -.03em` nos três, e é medida, não gosto: a 40px o tracking
 * padrão da JetBrains abre os grupos de milhar até parecerem números
 * separados.
 */
export type EscalaDeKpi = 'padrao' | 'destaque' | 'heroi'

const ESCALA: Record<EscalaDeKpi, { size: string; lh: string }> = {
  padrao: { size: 'var(--t-kpi-valor, 26px)', lh: 'var(--t-kpi-valor-lh, 1)' },
  destaque: { size: 'var(--t-kpi-valor-big, 32px)', lh: 'var(--t-kpi-valor-big-lh, 1)' },
  heroi: { size: 'var(--t-kpi-valor-heroi, 40px)', lh: 'var(--t-kpi-valor-heroi-lh, 1)' },
}

/**
 * A sparkline cresce com o número: 60×18 no padrão e no destaque, **120×32 no
 * herói** (`pesquisa` §11). Uma curva de 60px ao lado de um número de 40px
 * seria um enfeite de rodapé; ao lado de um número de 26px, 120px roubaria a
 * linha da nota.
 */
const MEDIDA_DA_CURVA: Record<EscalaDeKpi, { L: number; A: number }> = {
  padrao: { L: 60, A: 18 },
  destaque: { L: 60, A: 18 },
  heroi: { L: 120, A: 32 },
}

/** 600 ms, `pesquisa` §6. Exportado porque o teste da contagem mede por ele. */
export const DURACAO_DA_CONTAGEM = 600

/**
 * Quanto do matiz entra no rótulo. Constante, e não literal no `style`, porque
 * o número saiu de MEDIÇÃO (`docs/design/medir-rotulo-kpi.py`) e quem o mexer
 * tem de remedir: subir para os 70% do mockup reprova o contraste no tema claro
 * em duas das oito tintas.
 */
export const MISTURA_DO_ROTULO = 55

export interface KpiTileProps extends Omit<React.ComponentProps<'div'>, 'children' | 'title'> {
  /** O que o número é. Uppercase pelo degrau; nunca ganha caixa, borda ou fundo. */
  rotulo: string
  /**
   * Dinheiro, em CENTAVOS. Mutuamente exclusivo com `valor` — dois números no
   * mesmo tile seriam dois KPIs disputando um rótulo.
   */
  valorCentavos?: number
  /**
   * Contagem ou texto curto, para o KPI que não é dinheiro.
   *
   * **Número entra como número, não como `String(n)`**: é o que liga a contagem
   * crescente e o agrupamento de milhar do pt-BR. Texto continua aceito para o
   * KPI que não é quantidade ("3 / 8", "sem base"), e esse não conta.
   */
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
 * mais leves (Ramp): a 26px, `,00` disputando peso com os inteiros rouba a
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

/** Agrupamento de milhar do pt-BR, sem moeda e sem casa decimal. */
const AGRUPADOR = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })

/**
 * Movimento é OPT-IN pelo sistema operacional, e a pergunta se faz na hora.
 *
 * Ler `matchMedia` no render e não num estado com listener é decisão: a
 * contagem roda UMA vez, na entrada do tile. Quem muda a preferência no meio
 * dos 600 ms já está com a animação em curso, e reagir a isso pediria um
 * listener por tile para um caso que não existe. O que importa — a montagem
 * seguinte já nasce sem contagem — funciona sem estado nenhum.
 */
function movimentoReduzido(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * CONTAGEM CRESCENTE (`pesquisa` §6) — 600 ms, `ease-out` cúbico, na ENTRADA.
 *
 * ## Devolve `null` quando acabou, e isso é o desenho, não um detalhe
 *
 * Enquanto conta, devolve o inteiro do quadro. Terminada — ou nunca começada —
 * devolve `null`, e quem desenha volta ao texto AUTORITATIVO (`formatMoneyBRL`,
 * ou o próprio `valor`). É o que garante o "valor final exato" da DoD sem
 * depender de o agrupador daqui reproduzir a máscara do formatador do repo:
 * o último quadro não é um número reformatado, é a string de sempre.
 *
 * ## Só na ENTRADA — valor que muda depois salta
 *
 * `TotalBox` é este mesmo componente no fecho do documento, e o total muda a
 * cada linha que o operador digita na grade. Contar 600 ms por tecla faria o
 * número nunca ficar parado enquanto se preenche um orçamento. Contar na
 * entrada é o que a pesquisa pede ("count-up na entrada") e é o que separa
 * *"a tela chegou"* de *"o dado mudou"*.
 *
 * ## `prefers-reduced-motion` PULA, não encurta
 *
 * Devolve `null` de saída, então o primeiro quadro já tem o número final —
 * síncrono, sem `useEffect`, sem pulo de zero para o valor. Encurtar a duração
 * ainda seria movimento, e a preferência do sistema não pede menos movimento:
 * pede nenhum.
 */
function useContagemNaEntrada(alvo: number | null): number | null {
  const [emCurso, setEmCurso] = useState<number | null>(() =>
    alvo === null || movimentoReduzido() ? null : 0,
  )
  const jaContou = useRef(false)

  useEffect(() => {
    if (alvo === null || jaContou.current || movimentoReduzido()) {
      setEmCurso(null)
      return
    }
    jaContou.current = true

    let pedido = 0
    const inicio = performance.now()
    const quadro = (agora: number) => {
      const p = Math.min(1, (agora - inicio) / DURACAO_DA_CONTAGEM)
      if (p >= 1) {
        // Fim = devolver a palavra a quem tem a máscara. Nunca
        // `Math.round(alvo)`: se o agrupador daqui divergisse do formatador do
        // repo, a divergência apareceria justamente no quadro que fica.
        setEmCurso(null)
        return
      }
      // `ease-out` cúbico, o do mockup: começa rápido e assenta. Linear leria
      // como carregamento, e `ease-in-out` faria o número hesitar no meio.
      setEmCurso(Math.round(alvo * (1 - (1 - p) ** 3)))
      pedido = requestAnimationFrame(quadro)
    }
    pedido = requestAnimationFrame(quadro)
    return () => cancelAnimationFrame(pedido)
  }, [alvo])

  return emCurso
}

/**
 * A sparkline: sem eixo, sem rótulo, sem tooltip.
 *
 * É FORMA, não leitura — diz "subindo/descendo/parado" e nada mais; quem quer o
 * número vai ao relatório. Por isso não ganha interação: um gráfico de 60px que
 * responde ao mouse promete precisão que ele não tem.
 *
 * **Menos de dois pontos não desenha.** Um ponto é uma bolinha, e uma bolinha
 * no canto do tile parece tendência sem ser nenhuma. Série achatada (todos
 * iguais) sai como reta no meio, que é a verdade dela.
 *
 * O traço se DESENHA na entrada (`cab-draw`, 900 ms), e o `cab-motion` é o que
 * liga isso ao `prefers-reduced-motion`: a guarda de `tokens-2.0.css` desliga
 * animação por CLASSE, então svg sem a classe animaria para quem pediu que
 * nada animasse. O `stroke-dasharray: 120` é o que o keyframe pressupõe (ele
 * anda de `stroke-dashoffset: 120` a zero) — é o par dele, não um número solto.
 */
function Sparkline({ serie, escala }: { serie: readonly number[]; escala: EscalaDeKpi }) {
  if (serie.length < 2) return null

  const { L, A } = MEDIDA_DA_CURVA[escala]
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
      className="cab-motion ml-auto shrink-0 self-end"
    >
      <path
        d={d}
        stroke={cor}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{
          strokeDasharray: 120,
          animation: 'cab-draw 900ms var(--ease-out) 200ms both',
        }}
      />
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
  escala = 'padrao',
  alerta = false,
  className,
  style,
  ...props
}: KpiTileProps) {
  const naFaixa = useContext(DentroDaFaixa)
  const dinheiro = valorCentavos === undefined ? null : partesDoDinheiro(valorCentavos)
  const negativo = valorCentavos !== undefined && valorCentavos < 0
  const tinta = alerta || negativo ? 'var(--bad)' : 'var(--n-900)'

  /**
   * O que a contagem persegue. Do dinheiro, só a parte INTEIRA — animar
   * centavos daria dois dígitos girando por 600 ms sem informar nada, e a
   * `pesquisa` §6 diz "só a parte inteira" com essas palavras.
   *
   * O sinal fica FORA: o alvo é a magnitude (`-R$ 50` conta 0 → 50 com o `-`
   * parado no símbolo), porque contar de 0 a −50 passaria por números que a
   * máscara escreve com o menos no lugar errado.
   */
  const alvoDaContagem =
    dinheiro !== null
      ? Number(dinheiro.inteiros.replace(/\D/g, ''))
      : typeof valor === 'number'
        ? Math.trunc(Math.abs(valor))
        : null
  const contando = useContagemNaEntrada(
    naFaixa && Number.isFinite(alvoDaContagem) ? alvoDaContagem : null,
  )

  /** O texto autoritativo da contagem, quando ela não é dinheiro. */
  const contagemFinal = typeof valor === 'number' ? AGRUPADOR.format(valor) : null

  return (
    <div
      data-slot="kpi-tile"
      data-tint={tint}
      data-escala={escala}
      className={cn(
        // `relative` + `overflow-hidden` são o par da FAIXA de 3px: ela é
        // `::after` posicionado no rodapé do tile, e sem o corte ela passaria
        // por cima do raio do card.
        'relative flex min-w-0 flex-col overflow-hidden',
        // A FAIXA INFERIOR no matiz do assunto (rodada 5). Utilitário e não
        // `style`, porque pseudo-elemento não existe em `style` inline — e não
        // um arquivo CSS novo, porque `index.css` e `tokens-2.0.css` são zona
        // exclusiva de D1.
        "after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:bg-[var(--kc)] after:opacity-90 after:content-['']",
        // O HOVER sobe o relevo para 3px e o blur da ambiente para 18px (§5),
        // e só onde a ambiente existe.
        //
        // A parte dura do hover sai de `var(--hard-1h, var(--hard-2))`: não
        // existe token de 3px em TINTA (há `--hard-soft`, que é 3px em n-300,
        // cinza), e escrever `3px 3px 0 0 var(--n-900)` à mão daria sombra
        // BRANCA no tema escuro — onde `--n-900` é o papel claro e a escada
        // `--hard-*` inverte de propósito para n-300/n-400. Pedido do token
        // registrado na #469; o fallback erra 1px, não o tema.
        naFaixa &&
          'transition-shadow duration-[var(--dur-1)] hover:shadow-[var(--hard-1h,var(--hard-2)),0_18px_32px_-14px_color-mix(in_oklab,var(--kc)_55%,transparent)]',
        className,
      )}
      style={{
        // O matiz do assunto, uma vez, para a sombra, a faixa e o rótulo o
        // lerem pela cascata. Três lugares lendo a mesma variável é o que
        // impede o tile de ter uma cor na sombra e outra na faixa.
        ['--kc' as string]: MATIZ[tint],
        // Card de primeiro nível: borda de tinta + relevo duro. É a ÚNICA
        // sombra dura da faixa — o painel abaixo usa `--hard-2` e a hierarquia
        // KPI < painel < dialog fica legível sem ninguém explicar.
        border: '1.5px solid var(--n-900)',
        borderRadius: 'var(--r-card)',
        // SOMBRA AMBIENTE no matiz, por baixo da dura (§5) — só na faixa e no
        // bento. Fora deles fica a dura sozinha, que é o relevo de sempre.
        boxShadow: naFaixa
          ? 'var(--hard-1), 0 14px 28px -14px color-mix(in oklab, var(--kc) 45%, transparent)'
          : 'var(--hard-1)',
        background: TINT[tint] ?? 'var(--n-0, var(--folha))',
        // Padding de card, escala §Hierarquia: 14/16 do mockup → --s-3/--s-4.
        // O rodapé ganha o 3px da faixa para o texto não encostar nela.
        padding: 'var(--s-3) var(--s-4) calc(var(--s-3) + 3px)',
        // Irmãos = gap, nunca margin por elemento.
        gap: 'var(--s-1)',
        ...style,
      }}
      {...props}
    >
      <span
        data-slot="kpi-rotulo"
        className="t-rotulo truncate"
        // O rótulo carrega o matiz do assunto sem virar cor decorativa — o
        // mesmo papel do quadradinho de grupo na barra lateral.
        //
        // **55% e não os 70% do mockup**, e é medição, não gosto:
        // `docs/design/medir-rotulo-kpi.py` mede os oito pares tinta→fundo nos
        // dois temas, e a 70% o claro REPROVA o piso de 4,5:1 da §Hierarquia em
        // `sand` (3,69:1) e em `mint` (4,29:1). `mint` é a tinta do HERÓI em
        // todo hub e no dashboard, então o rótulo mais importante do bento era
        // justamente um dos dois. A 60% passa raspando (4,67:1); a 55% o pior
        // par fica em 5,28:1 e a tinta continua legível como tinta.
        style={{ color: `color-mix(in oklab, var(--kc) ${MISTURA_DO_ROTULO}%, var(--n-900))` }}
      >
        {rotulo}
      </span>

      <output
        data-slot="kpi-valor"
        aria-label={rotulo}
        // `aria-live="off"` e não o `polite` implícito do `<output>`: a
        // contagem reescreve o texto a cada quadro, e uma região viva
        // anunciaria o mesmo KPI dezenas de vezes em 600 ms. O valor continua
        // acessível pelo rótulo; o que se desliga é o anúncio automático.
        aria-live="off"
        className="flex items-baseline"
        style={{
          fontFamily: 'var(--font-mono)',
          fontWeight: 500,
          fontSize: ESCALA[escala].size,
          lineHeight: ESCALA[escala].lh,
          fontVariantNumeric: 'tabular-nums',
          // Rodada 5, §6: −.03em. Tabular + tracking fechado é o par que faz o
          // número contar sem a caixa mudar de largura a cada quadro.
          letterSpacing: '-.03em',
          color: tinta,
          gap: '2px',
        }}
      >
        {dinheiro ? (
          <>
            {/* Símbolo e centavos mais leves: a 26px o que se lê primeiro tem
                de ser a ordem de grandeza, não a moeda nem os dois zeros. */}
            {/* `.46em` reproduz os 12px do mockup no degrau padrão (26px) e
                cresce com os outros dois, em vez de ficar num literal: um `R$`
                de 12px ao lado de um número de 40px lê como nota de pé. */}
            <span style={{ fontSize: '.46em', fontWeight: 400, color: 'var(--n-500)' }}>
              {dinheiro.simbolo}
            </span>
            <span data-slot="kpi-inteiros">
              {contando === null ? dinheiro.inteiros : AGRUPADOR.format(contando)}
            </span>
            <span style={{ fontWeight: 400, color: 'var(--n-500)' }}>{dinheiro.decimais}</span>
          </>
        ) : (
          <span data-slot="kpi-inteiros">
            {contando === null ? (contagemFinal ?? valor) : AGRUPADOR.format(contando)}
          </span>
        )}
        {/* A unidade ganha respiro próprio: os 2px de `gap` do `<output>` são a
            medida entre símbolo, inteiros e centavos, que formam UM número.
            `ordens` é outra palavra, e a 2px ela lê colada ("2ordens"). */}
        {unidade ? (
          <span
            style={{
              fontSize: '.46em',
              fontWeight: 400,
              color: 'var(--n-500)',
              marginLeft: 'var(--s-1)',
            }}
          >
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
          {serie ? <Sparkline serie={serie} escala={escala} /> : null}
        </span>
      ) : null}
    </div>
  )
}

/** O teto não é preferência de tela: é o que cabe numa fileira legível. */
export const MAXIMO_DE_KPIS = 4

/**
 * Conta os filhos que EXISTEM — condicional que não renderizou não ocupa vaga.
 * Vive fora das duas grades porque as duas têm o mesmo teto e a mesma razão
 * para ele.
 */
function quantosFilhos(children: React.ReactNode): number {
  return Array.isArray(children)
    ? children.flat(Number.POSITIVE_INFINITY).filter(Boolean).length
    : children
      ? 1
      : 0
}

/** A proporção do herói no bento (`pesquisa` §11: `1.6fr 1fr 1fr 1fr`). */
export const PESO_DO_HEROI = 1.6

export interface FaixaDeKpiProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /**
   * O número que É a tela — 1,6× a largura dos outros, no canto superior
   * esquerdo. É o que liga o **BENTO** (`pesquisa` §11).
   *
   * Ausente, a faixa é a fileira de iguais de sempre: quatro tiles em
   * `auto-fit`, que é o desenho de LISTAGEM. Presente, a faixa vira bento —
   * **só em hub e dashboard**, porque a pesquisa é explícita sobre o limite
   * (*"errado em listagem e ficha"*). Numa listagem o assunto é a grade, e um
   * herói ali competiria com ela.
   *
   * Entra por propriedade e não como primeiro filho porque quem decide o peso é
   * a GRADE: uma grade que descobre o herói contando posições volta a errar no
   * dia em que uma tela puser um condicional antes dele.
   */
  heroi?: React.ReactNode
  children: React.ReactNode
}

/**
 * A FAIXA: até quatro tiles numa fileira, entre o cabeçalho da página e o
 * painel da grade — e, com `heroi`, o BENTO do hub e do dashboard.
 *
 * Duas formas e uma peça só. Fossem dois componentes, divergiriam: o teto de
 * quatro, o `throw` do quinto, o gap, a contagem e a sombra ambiente teriam de
 * ser decididos duas vezes, e a segunda decisão é sempre a que ninguém revisa —
 * foi exatamente assim que o fecho do documento e o KPI andaram anos com
 * bordas e sombras diferentes sem que ninguém tivesse escolhido isso.
 *
 * ## A quebra, nas duas formas, nunca vem de `@media` (regra 7 da rodada)
 *
 * - **Sem herói**: `auto-fit`, porque o que decide quantos cabem é a largura
 *   DISPONÍVEL — que muda com a sidebar recolhida, não só com a janela.
 * - **Com herói**: `flex-wrap`, porque a proporção 1,6 do mockup não é
 *   expressável em `auto-fit`. A especificação proíbe `repeat(auto-fit, …)` ao
 *   lado de trilha flexível no mesmo `grid-template-columns`
 *   (`1.6fr repeat(auto-fit, …)` é declaração inválida), e `auto-fit` puro só
 *   gera trilhas IGUAIS — spans inteiros dariam 2:1:1:1, não 1,6. Com flex, as
 *   quatro dividem a linha em 1,6 : 1 : 1 : 1 enquanto couberem, e quebram
 *   sozinhas quando não couberem. É a mesma escolha, pela mesma razão, que
 *   `features/dashboard/hoje.tsx` já fez na grade de baixo.
 *
 * O quinto tile é `throw`. Não é rigor por rigor — é o único momento em que a
 * decisão "qual dos quatro sai" ainda pode ser tomada por quem conhece a tela.
 * Depois de publicado, o quinto vira o normal e ninguém remove nenhum.
 */
export function FaixaDeKpi({ heroi, children, className, style, ...props }: FaixaDeKpiProps) {
  const quantos = quantosFilhos(children) + (heroi ? 1 : 0)

  if (quantos > MAXIMO_DE_KPIS) {
    throw new Error(
      `FaixaDeKpi aceita no máximo ${MAXIMO_DE_KPIS} KPIs e recebeu ${quantos}. O quinto não encolhe a faixa: ele quebra para uma segunda fileira e empurra a grade para fora da dobra. Escolha qual dos quatro sai.`,
    )
  }

  if (!heroi) {
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
        <ZonaDeKpi>{children}</ZonaDeKpi>
      </div>
    )
  }

  return (
    <div
      data-slot="faixa-de-kpi"
      data-bento=""
      data-kpis={quantos}
      className={cn('flex flex-wrap items-stretch', className)}
      style={{ gap: 'var(--s-3)', ...style }}
      {...props}
    >
      <ZonaDeKpi>
        {/* O herói é o PRIMEIRO no DOM, e não o quarto movido por
            `grid-column`/`grid-row` como no mockup: ordem visual que discorda
            da ordem de leitura é o defeito clássico de bento — o teclado e o
            leitor de tela percorreriam a fileira numa ordem que ninguém vê. */}
        {/* `[&>*]:flex-1` no invólucro, e não `w-full` no tile: o filho tanto
            pode ser o tile quanto o `<a>` que o embrulha (KPI que leva a uma
            tela), e só o `flex-1` estica os dois. Sem ele o tile se dimensiona
            pelo CONTEÚDO dentro de uma fatia de 1,6 — e o vão ao lado do herói
            sai maior que o vão entre os outros, que é a assimetria errada:
            parece espaçamento inconsistente, não hierarquia. */}
        <div
          data-slot="faixa-heroi"
          className="flex min-w-0 [&>*]:min-w-0 [&>*]:flex-1"
          style={{ flex: `${PESO_DO_HEROI} 1 clamp(15rem, 32%, 26rem)` }}
        >
          {heroi}
        </div>
        {/* Cada filho ganha a célula aqui, e não na tela: `flex-grow: 1` contra
            o 1,6 do herói é a proporção do mockup, e é decisão da faixa. Pedir
            à tela que embrulhe cada tile daria a ela a chance de errar o peso —
            e o primeiro que errasse teria um "herói" a mais sem saber. */}
        {/* `Children.toArray` e não `Children.map`: ele descarta os `false` dos
            condicionais e devolve cada filho com uma chave ESTÁVEL derivada da
            posição e da chave original. `map` com o índice daria a mesma
            posição a filhos diferentes quando um condicional entrasse ou
            saísse, e o React remontaria o tile errado — que é a razão do
            `noArrayIndexKey`, não uma formalidade dele. */}
        {Children.toArray(children).map((filho) => (
          <div
            key={(filho as React.ReactElement).key}
            data-slot="faixa-celula"
            className="flex min-w-0 [&>*]:min-w-0 [&>*]:flex-1"
            style={{ flex: '1 1 11rem' }}
          >
            {filho}
          </div>
        ))}
      </ZonaDeKpi>
    </div>
  )
}

/* ---------------------------------------------------------------------------
   `NumeroHeroi` SAIU AQUI (D37), e o bilhete que ele deixou dizia quando.

   Era a quinta família da fusão v5 (#236): display CONDENSADO a 36/38/48px,
   para o nº do documento e o total. O 2.0 não tem essa família — a Bebas saiu
   na D1 e `--font-display-condensada` passou a apontar para a Gambarino —, e a
   §Hierarquia não tem degrau acima de 30px fora do display.

   Ele continuava exportado porque os dois consumidores estavam em zona alheia:
   `documento.tsx` (D15) e `features/dashboard/indicadores.tsx` (D20). As duas
   mergearam e nenhuma o chama mais — a varredura só achava a própria
   declaracao, o `describe` de sobrevivencia e duas mencoes em comentario
   historico, que ficam onde estao porque explicam por que NAO e mais assim.
   Quem quiser o numero grande usa `KpiTile` com `escala="destaque"`.

   Levou junto as tres unicas `text-[<rem>]` que sobravam neste arquivo: a
   escala do heroi era literal porque a regua nao tem degrau acima de 30px.
   --------------------------------------------------------------------------- */
