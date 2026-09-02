import { Stamp, type StampTom } from '@/components/cabinet/stamp'
import { formatMoneyBRL } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import {
  Calendar as CalendarIcon,
  CircleDot,
  DollarSign,
  Hash,
  List,
  type LucideIcon,
  Type,
  User,
} from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * O TIPO DA COLUNA — o que aquele valor É, e não como a tela quer desenhá-lo.
 *
 * A grade do ERP repete sete formas de dado em onze listagens: um código que se
 * copia, uma pessoa com nome e qualificação embaixo, uma data, um valor em
 * centavos, uma situação, um "3 de 8" e texto solto. Antes disto cada tela
 * declarava a célula à mão no `cell` da coluna, e o resultado era o previsível:
 * o mesmo dinheiro alinhado à direita numa tela e à esquerda na outra, a mesma
 * data em mono aqui e em Inter ali.
 *
 * Declarar `meta.tipo` move a decisão para UM lugar. A tela diz o que o campo
 * é; a grade sabe desenhá-lo, alinhá-lo e anunciá-lo. Coluna que declara `cell`
 * próprio continua mandando no CONTEÚDO — o tipo só lhe dá a moldura (mono,
 * alinhamento, truncagem), porque o caso frequente hoje é justamente esse:
 * célula que já formata e só quer alinhar igual às irmãs.
 */
export type TipoDeColuna =
  | 'id'
  | 'entidade'
  | 'data'
  | 'dinheiro'
  | 'status'
  | 'progresso'
  | 'texto'

/**
 * O ícone do CABEÇALHO diz a natureza da coluna antes de o olho ler o rótulo.
 *
 * Família lucide, 12px, na cor de ícone inativo: é legenda, não ação. Vem do
 * TIPO e não de uma prop por tela porque duas listagens que mostram dinheiro
 * não podem escolher ícones diferentes para dinheiro — o ganho inteiro é o
 * operador reconhecer a forma da coluna sem ler o rótulo.
 */
const ICONE_DO_TIPO: Record<TipoDeColuna, LucideIcon> = {
  id: Hash,
  entidade: User,
  data: CalendarIcon,
  dinheiro: DollarSign,
  status: CircleDot,
  progresso: List,
  texto: Type,
}

export function IconeDeTipo({ tipo }: { tipo: TipoDeColuna }) {
  const Icone = ICONE_DO_TIPO[tipo]
  return (
    <Icone
      aria-hidden="true"
      data-slot="icone-de-tipo"
      data-tipo={tipo}
      className="size-3 shrink-0 text-rule-disabled"
    />
  )
}

/**
 * Tipos que são NÚMERO e por isso alinham à direita.
 *
 * `data` não entra: data em mono já forma coluna sozinha, e jogá-la à direita a
 * afastaria do rótulo do cabeçalho, que é onde o olho a procura.
 */
const A_DIREITA: ReadonlySet<TipoDeColuna> = new Set<TipoDeColuna>(['dinheiro', 'progresso'])

/** Tipos em MONO — dado que se copia, compara ou soma (§Hierarquia, `--t-dado`). */
const EM_MONO: ReadonlySet<TipoDeColuna> = new Set<TipoDeColuna>(['id', 'data', 'dinheiro'])

/**
 * A classe da CÉLULA para um tipo. Vale mesmo quando a coluna desenha o próprio
 * conteúdo: alinhamento e família são da COLUNA, não do conteúdo.
 *
 * `t-dado` é a classe da §Hierarquia (mono 500 · 12.5 · tabular) — daí não sair
 * `font-mono text-[12.5px]` à mão em lugar nenhum.
 */
export function classeDoTipo(tipo: TipoDeColuna | undefined): string | undefined {
  if (!tipo) return undefined
  return cn(
    A_DIREITA.has(tipo) && 'text-right',
    EM_MONO.has(tipo) && 't-dado',
    tipo === 'id' && 'text-[color:var(--primary-text,hsl(var(--foreground)))]',
    tipo === 'texto' && 'max-w-[28ch]',
  )
}

/** Valor de uma coluna `entidade`: o nome que se lê e o que o qualifica embaixo. */
export interface ValorDeEntidade {
  nome: string
  subtitulo?: string
}

/** Valor de uma coluna `status`: o tom semântico e a palavra do domínio. */
export interface ValorDeStatus {
  tom: StampTom
  label: string
}

/** Valor de uma coluna `progresso`: quantos de quantos. */
export interface ValorDeProgresso {
  feito: number
  total: number
}

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null
}

/**
 * Lê o TOM de uma célula de situação, quando ela é uma.
 *
 * A LINHA precisa disto: concluída e cancelada ficam em texto apagado (§D8), e
 * quem sabe que a linha é uma dessas é a própria coluna de situação. Perguntar
 * à célula evita uma prop `linhaApagada` que toda tela teria de passar certo —
 * e que a primeira tela a esquecer erraria em silêncio.
 */
export function tomDoValor(valor: unknown): StampTom | undefined {
  if (!ehObjeto(valor)) return undefined
  const tom = valor.tom
  return tom === 'neutral' || tom === 'open' || tom === 'done' || tom === 'void' ? tom : undefined
}

/**
 * INICIAIS do monograma: uma letra do primeiro nome e uma do último.
 *
 * Nome de empresa ("Metalúrgica Ponte Nova Ltda") daria quatro se pegasse todas
 * as palavras, e o quadrado tem lugar para duas.
 */
export function iniciaisDe(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '—'
  const primeira = partes[0]?.[0] ?? ''
  const ultima = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? '') : ''
  return (primeira + ultima).toUpperCase()
}

/**
 * A célula de ENTIDADE: monograma, nome e subtítulo empilhado.
 *
 * O subtítulo SOME na densidade compacta, e não encolhe: em 40px as duas linhas
 * não cabem sem apertar a entrelinha até o texto encostar, e um subtítulo
 * ilegível ocupa a mesma altura de um legível sem informar nada. Quem escolheu
 * compacta pediu mais linhas na tela, não a mesma linha mais espremida.
 */
export function CelulaDeEntidade({
  valor,
  compacta,
}: {
  valor: ValorDeEntidade
  compacta: boolean
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5" data-slot="celula-entidade">
      <span
        aria-hidden="true"
        data-slot="monograma"
        className={cn(
          'inline-grid shrink-0 place-items-center rounded-data border border-input bg-surface-sunken t-dado-meta',
          compacta ? 'size-[22px]' : 'size-[26px]',
        )}
      >
        {iniciaisDe(valor.nome)}
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate t-ui">{valor.nome}</span>
        {valor.subtitulo && !compacta ? (
          <span data-slot="subtitulo-da-entidade" className="block truncate t-meta">
            {valor.subtitulo}
          </span>
        ) : null}
      </span>
    </div>
  )
}

/**
 * A célula de PROGRESSO: a barra de 56px e o `n / m` que a soletra.
 *
 * A barra sozinha seria estimativa — "mais ou menos dois terços" —, e separação
 * de pedido é justamente o que se CONFERE numa listagem. O número vem ao lado,
 * não dentro da barra: texto sobre barra parcialmente preenchida muda de fundo
 * no meio da palavra.
 */
export function CelulaDeProgresso({ valor }: { valor: ValorDeProgresso }) {
  const total = Math.max(0, valor.total)
  const feito = Math.min(Math.max(0, valor.feito), total)
  const pct = total === 0 ? 0 : Math.round((feito / total) * 100)
  return (
    <span className="inline-flex items-center justify-end gap-2" data-slot="celula-progresso">
      {/* A barra é o DESENHO do número que vem ao lado, e por isso sai da
          árvore acessível: com `role="progressbar"` ela obrigava um `tabIndex`
          (o lint cobra, e o CI com ele) para virar parada de teclado numa
          célula de listagem — e quem ouve passaria a escutar "0 de 4" duas
          vezes por linha, uma na barra e outra no `0 / 4`. */}
      <span
        aria-hidden="true"
        className="inline-block h-[5px] w-14 shrink-0 overflow-hidden rounded-full bg-rule-hair"
      >
        <span className="block h-full bg-money" style={{ width: `${pct}%` }} />
      </span>
      <span className="t-dado-meta">
        {feito} / {total}
      </span>
    </span>
  )
}

/**
 * A célula de DINHEIRO: a moeda mais leve que o valor.
 *
 * `R$` é constante em toda a coluna — repetido cinquenta vezes com o mesmo peso
 * do número, vira ruído que o olho tem de pular para chegar ao dígito. Em Meta
 * ele continua legível e sai da frente. O valor trafega em centavos até aqui,
 * que é a borda de exibição.
 */
export function CelulaDeDinheiro({ centavos }: { centavos: number }) {
  const texto = formatMoneyBRL(centavos)
  // `Intl` devolve "R$ 1.234,56" com espaço estreito (U+00A0) em alguns
  // ambientes. Partir pelo primeiro espaço, qualquer que seja ele, é o que
  // sobrevive à versão de ICU de quem roda.
  const corte = texto.search(/\s/)
  if (corte < 0) return <span data-slot="celula-dinheiro">{texto}</span>
  return (
    <span data-slot="celula-dinheiro" className="whitespace-nowrap">
      <span className="mr-1 font-normal text-muted-foreground">{texto.slice(0, corte)}</span>
      {texto.slice(corte + 1)}
    </span>
  )
}

/**
 * Desenha o valor conforme o tipo declarado.
 *
 * Valor que não casa com a forma do tipo cai em TEXTO em vez de derrubar a
 * grade: uma listagem inteira em branco porque um registro trouxe `null` onde a
 * coluna esperava `{feito,total}` é defeito muito pior que a célula mostrando o
 * valor cru. O tipo é declaração da TELA, e a tela erra.
 */
export function renderTipo(
  tipo: TipoDeColuna,
  valor: unknown,
  { compacta }: { compacta: boolean },
): ReactNode {
  if (valor === null || valor === undefined || valor === '') return null

  switch (tipo) {
    case 'dinheiro':
      // Valor que não é número não vira `R$ NaN`: cai no texto cru, que ao
      // menos é conferível contra o servidor.
      return typeof valor === 'number' ? <CelulaDeDinheiro centavos={valor} /> : String(valor)

    case 'entidade': {
      if (typeof valor === 'string') {
        return <CelulaDeEntidade valor={{ nome: valor }} compacta={compacta} />
      }
      if (ehObjeto(valor) && typeof valor.nome === 'string') {
        return (
          <CelulaDeEntidade
            valor={{
              nome: valor.nome,
              ...(typeof valor.subtitulo === 'string' ? { subtitulo: valor.subtitulo } : {}),
            }}
            compacta={compacta}
          />
        )
      }
      return String(valor)
    }

    case 'status': {
      const tom = tomDoValor(valor)
      if (tom && ehObjeto(valor) && typeof valor.label === 'string') {
        return <Stamp tom={tom} label={valor.label} />
      }
      // Situação em texto puro: a tela ainda não declarou o tom, e um carimbo
      // neutro diz "não sei o peso disto" sem inventar um.
      return <Stamp tom="neutral" label={String(valor)} />
    }

    case 'progresso': {
      if (ehObjeto(valor) && typeof valor.feito === 'number' && typeof valor.total === 'number') {
        return <CelulaDeProgresso valor={{ feito: valor.feito, total: valor.total }} />
      }
      return String(valor)
    }

    case 'texto':
      // Trunca com reticências e guarda o inteiro no `title`: célula que quebra
      // em três linhas desmancha a altura da grade, e cortar sem dizer esconde
      // o resto do nome sem sinal nenhum.
      return (
        <span className="block truncate" title={String(valor)}>
          {String(valor)}
        </span>
      )

    case 'id':
    case 'data':
      return String(valor)
  }
}
