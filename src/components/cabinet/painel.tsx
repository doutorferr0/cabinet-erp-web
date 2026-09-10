import type { Modulo } from '@/app/modulo'
import type { MatizDeModulo } from '@/app/nav/grupos'
import { cn } from '@/lib/utils'

/**
 * DCARD — o card QUIETO da Reface 2.0, e a única caixa de painel do sistema.
 *
 * É a peça `.dcard` do mockup (`docs/design/mockup-reface-hibrido-2026-09-02.html`,
 * aba Dashboard): folha, borda `n-300` de 1px, `--hard-soft`, cabeçalho de 12/16
 * com um quadradinho de 8px antes do título e uma nota à direita.
 *
 * ## O que ela deixou de ter, e por quê
 *
 * O painel 1.x era ALTO: moldura de 2px, `--shadow-el2`, faixa de cabeçalho
 * tingida com a pastel do módulo e um selo ornamental de 20px antes do título.
 * Três telas com seis painéis desses viravam seis objetos gritando no mesmo
 * volume, e §Hierarquia (issue-mãe #469) fecha isso por duas regras:
 *
 * - **Uma sombra dura de tinta por tela.** Na 2.0 ela é dos KPIs; painel usa
 *   `--hard-soft`, que é relevo de borda clara, não de tinta. Card com borda
 *   preta virou privilégio de quatro peças por tela (auditoria §2.4: "nada com
 *   borda preta além dos KPIs").
 * - **Uma ferramenta de separação por fronteira.** A fronteira cabeçalho→corpo é
 *   HAIRLINE. A faixa tingida era a segunda ferramenta na mesma linha, e
 *   `n-50`/pastel encostado numa hairline é exatamente o "nunca hairline + fundo
 *   diferente na mesma fronteira" da régua.
 *
 * O que sobrou da cor do módulo é o QUADRADINHO de 8px — mesma decisão que a
 * sidebar 2.0 tomou para o matiz do grupo (`src/app/nav/grupos.ts`): a cor
 * marca de que assunto é a região, num elemento pequeno, e não pinta área.
 *
 * ## `MarcaDeCard` é peça própria, e não um `style` no cabeçalho
 *
 * Porque a cor entra por DUAS estradas que não têm a mesma forma: as zonas 2.0
 * são valores de cor (`var(--warn)`) e o par de módulo 1.x é uma tripla HSL
 * (`--modulo-01: 262 97% 76%`), que só vira cor dentro de `hsl()` — daí a
 * utility `bg-modulo-cheia`. Uma prop `cor: string` não aceitaria as duas sem
 * mentir sobre o tipo; um componente aceita as duas e mantém a geometria (8px,
 * raio 2) num lugar só.
 */
export function MarcaDeCard({
  cor,
  className,
}: {
  /** Valor de cor CSS — `var(--warn)`, `var(--mod-vendas)`. */
  cor?: string
  /** Para quem pinta por utility (`bg-modulo-cheia`), que resolve `hsl()` no elemento. */
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      data-slot="marca-de-card"
      className={cn('size-2 shrink-0 rounded-[2px]', className)}
      {...(cor ? { style: { background: cor } } : {})}
    />
  )
}

/**
 * O cabeçalho, exportado à parte porque um dcard pode ter DOIS — é o que o
 * mockup faz na primeira coluna do Dashboard, onde `Agenda de hoje` e
 * `Atividade` dividem o mesmo card. O segundo leva `divisor`, que troca a
 * hairline de baixo por uma de cima: duas hairlines encostadas na mesma
 * fronteira é o defeito que a régua nomeia.
 */
export function CabecalhoDeCard({
  marca,
  nota,
  acao,
  divisor = false,
  children,
  className,
}: {
  marca?: React.ReactNode
  nota?: React.ReactNode
  acao?: React.ReactNode
  /** Segundo cabeçalho do mesmo card: a linha vem por cima, não por baixo. */
  divisor?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <header
      data-slot="dcard-cabecalho"
      className={cn('flex items-center', className)}
      style={{
        gap: 'var(--s-2)',
        padding: 'var(--s-3) var(--s-4)',
        ...(divisor
          ? { borderTop: '1px solid var(--hairline)' }
          : { borderBottom: '1px solid var(--hairline)' }),
      }}
    >
      {marca}
      <h3 className="t-bloco min-w-0 truncate first-letter:uppercase">{children}</h3>
      {nota ? (
        <span data-slot="dcard-nota" className="t-meta ml-auto shrink-0">
          {nota}
        </span>
      ) : null}
      {acao ? (
        <div
          className={cn('flex shrink-0 items-center', nota ? '' : 'ml-auto')}
          style={{ gap: 'var(--s-2)' }}
        >
          {acao}
        </div>
      ) : null}
    </header>
  )
}

export interface DCardProps extends Omit<React.ComponentProps<'section'>, 'title'> {
  /** Título do bloco (`.t-bloco`, h3). Ausente = card sem cabeçalho (o calendário). */
  titulo?: React.ReactNode
  /** A marca de 8px antes do título — `<MarcaDeCard>`, ou um ícone de 14px. */
  marca?: React.ReactNode
  /** Nota do canto direito do cabeçalho: contagem, período, `n / m`. `.t-meta`. */
  nota?: React.ReactNode
  /** Botões do cabeçalho. Ficam depois da nota, no mesmo canto. */
  acao?: React.ReactNode
  /**
   * Padding no corpo. **Falso por padrão**, e é decisão: o conteúdo mais comum
   * de um dcard é lista, e linha de lista tem o padding dela (`0 var(--s-4)`)
   * para a hairline atravessar o card de borda a borda. Padding no corpo
   * recuaria a hairline e a fronteira entre linhas viraria um traço solto no
   * meio da caixa.
   */
  corpoComPadding?: boolean
}

export function DCard({
  titulo,
  marca,
  nota,
  acao,
  corpoComPadding = false,
  children,
  className,
  style,
  ...props
}: DCardProps) {
  return (
    <section
      data-slot="dcard"
      className={cn('flex min-w-0 flex-col', className)}
      style={{
        background: 'var(--folha)',
        border: '1px solid var(--n-300)',
        borderRadius: 'var(--r-card)',
        boxShadow: 'var(--hard-soft)',
        // O cabeçalho vai até a borda e a hairline atravessa: sem clipping o
        // canto do primeiro filho escapa por fora do raio.
        overflow: 'hidden',
        ...style,
      }}
      {...props}
    >
      {titulo === undefined ? null : (
        <CabecalhoDeCard
          {...(marca ? { marca } : {})}
          {...(nota ? { nota } : {})}
          {...(acao ? { acao } : {})}
        >
          {titulo}
        </CabecalhoDeCard>
      )}
      {/* `flex-1` no corpo, e não na `section`: é o que deixa o `mt-auto` de um
          filho empurrar a peça para o rodapé do card.

          O `gap` anda JUNTO com o padding, e não é conveniência: corpo com
          padding recebe BLOCOS (uma grade, um parágrafo, uma barra), e blocos
          irmãos se separam por espaço. Corpo sem padding recebe LISTA de borda a
          borda, onde cada linha já traz o seu padding e a fronteira é a
          hairline — um `gap` ali abriria 12px antes da linha divisória, e o
          resultado é espaço E linha na mesma fronteira, que é o que a régua
          proíbe. Medido na captura: sobrava a folga entre a última linha da
          agenda e o cabeçalho de `Atividade`. */}
      <div
        data-slot="dcard-corpo"
        className="flex min-w-0 flex-1 flex-col"
        style={corpoComPadding ? { gap: 'var(--s-3)', padding: 'var(--s-4)' } : {}}
      >
        {children}
      </div>
    </section>
  )
}

/**
 * AS CORES SEMÂNTICAS DA 2.0 — num lugar só, e duas delas por um desvio.
 *
 * `--ok`, `--bad` e `--main` existem apenas em `tokens-2.0.css` e entram pelo
 * nome. **`--info` e `--warn` NÃO.** Os dois nomes também existem no `index.css`
 * 1.x, e lá valem TRIPLAS HSL (`--info: 225 71% 75%`), feitas para serem usadas
 * dentro de `hsl(var(--info))`. Como o `index.css` importa o `tokens-2.0.css` e
 * define os seus depois, a tripla vence — e uma tripla como valor de
 * `background` é declaração INVÁLIDA: a peça sai transparente, sem erro nenhum
 * no console.
 *
 * Medido: numa agenda de três linhas, a faixa de `entrega` (`--ok`) pintava e as
 * de `orçamento` e `reunião` saíam com `rgba(0,0,0,0)`. Passou pela suíte e pela
 * revisão de código; só a sonda de `getComputedStyle` na tela viva pegou.
 *
 * Por isso as duas entram pela RAMPA, que ninguém sombreia — e é o mesmo valor
 * que o alias da D1 vai produzir (`--info→var(--sky-600)`,
 * `--warn→var(--amber-600)`, auditoria §3). É também o que a sidebar 2.0 já faz
 * com os matizes de módulo: `--mod-vendas` É `--sky-600`, com um valor só nos
 * dois temas.
 *
 * **A regra 4 do regime paralelo manda usar `var(--x, <fallback>)` para token
 * que falta — e aqui não serve:** o token não falta, ele COLIDE. `var(--info,
 * …)` nunca cai no fallback, porque `--info` está definido; só está definido na
 * forma errada. Registrado na #469 para a D1 apagar a definição 1.x; no dia em
 * que ela cair, este mapa volta a `var(--info)`/`var(--warn)` sem mudar pixel.
 */
export const COR_DE_ZONA = {
  /** Pendência, foco — o que espera alguém. */
  warn: 'var(--amber-600)',
  /** Valor. Verde tem dono e este é ele. */
  money: 'var(--ok)',
  /** Leitura informativa, sem pendência. */
  info: 'var(--sky-600)',
  /** Identidade: a região que diz de que assunto é a tela. */
  id: 'var(--main)',
} as const

export type TintaDePainel = keyof typeof COR_DE_ZONA

/**
 * Os nove módulos de `src/app/modulo.ts` nos oito matizes da 2.0.
 *
 * A lista 1.x é de 2026-08 e trata `clientes`, `fornecedores` e `profissionais`
 * como módulos separados; a 2.0 chama os três de `pessoas` (é um grupo da
 * sidebar, `src/app/nav/grupos.ts`) e é o mapa que o quadradinho segue. Traduzir
 * aqui, e não inventar três matizes novos, é o que mantém UM nome por cor
 * publicado — a regra que `MatizDeModulo` documenta do outro lado.
 */
const MATIZ: Record<Modulo, MatizDeModulo> = {
  boletim: 'hoje',
  clientes: 'pessoas',
  fornecedores: 'pessoas',
  profissionais: 'pessoas',
  produtos: 'produtos',
  estoque: 'estoque',
  vendas: 'vendas',
  compras: 'compras',
  crm: 'crm',
}

export function Painel({
  titulo,
  modulo,
  tinta,
  selo = true,
  acao,
  children,
  className,
}: {
  titulo: string
  /** Módulo da região: dá a cor 2.0 (`--mod-*`) ao quadradinho. */
  modulo?: Modulo
  /** Zona de estado, para região que não é de módulo. Ignorada quando há `modulo`. */
  tinta?: TintaDePainel
  /**
   * Desenha o quadradinho antes do título. Só tem efeito quando há `modulo` ou
   * `tinta` — quadradinho neutro seria marca sem informação.
   *
   * O nome é o do 1.x (era o `Selo` ornamental de 20px) e ficou porque catorze
   * telas passam a prop; o que ele liga hoje é a marca de 8px.
   */
  selo?: boolean
  /** Contador, botão ou o que a região precisar no fim do cabeçalho. */
  acao?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  const cor = modulo ? `var(--mod-${MATIZ[modulo]})` : tinta ? COR_DE_ZONA[tinta] : undefined

  return (
    <DCard
      titulo={titulo}
      // `data-slot="painel"` continua sendo o punho público da peça, e não muda
      // para `dcard` só porque a caixa por dentro mudou: catorze telas e os
      // testes delas acham o painel por ele (`titulo.closest('[data-slot=
      // "painel"]')`). Renomear o punho junto com a implementação faria a
      // reforma de desenho parecer reforma de API.
      data-slot="painel"
      // `data-modulo` continua na seção: `bg-modulo`/`text-modulo` de dentro do
      // corpo (grade, chip, linha) ainda resolvem o par pelo escopo. O que saiu
      // foi a faixa tingida do cabeçalho, não o escopo.
      {...(modulo && { 'data-modulo': modulo })}
      {...(selo && cor ? { marca: <MarcaDeCard cor={cor} /> } : {})}
      {...(acao ? { acao } : {})}
      corpoComPadding
      {...(className ? { className } : {})}
    >
      {children}
    </DCard>
  )
}

/**
 * A barra de progresso do sistema: trilho `n-200`, preenchimento em chartreuse.
 *
 * Chartreuse porque na 2.0 o acento único é o primário e é ele que diz "isto
 * está em curso" (auditoria §1, ponto 43: a ação deixou de ser preta). Verde
 * continua sendo dinheiro e nada mais.
 *
 * Trilho de FUNDO e não de borda de 2px: a barra é peça de 6px de altura, e um
 * contorno de 2px em cima de 6px deixa 2px de miolo — o preenchimento fica mais
 * fino que a moldura e a leitura se inverte.
 *
 * `aria-hidden` de propósito: a peça sempre aparece ao lado do número escrito
 * por extenso, e um `progressbar` anunciaria a mesma porcentagem duas vezes.
 */
export function Barra({ percentual, className }: { percentual: number; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('w-full overflow-hidden', className)}
      style={{ height: '6px', borderRadius: 'var(--r-item)', background: 'var(--n-200)' }}
    >
      <div
        className="h-full"
        style={{
          width: `${Math.max(0, Math.min(100, percentual))}%`,
          background: 'var(--main)',
        }}
      />
    </div>
  )
}
