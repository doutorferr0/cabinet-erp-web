import { cn } from '@/lib/utils'

/**
 * MONOGRAMA DO FUNIL — as iniciais de quem, num quadrado de 20px.
 *
 * ## Por que o nome tem sobrenome (D37)
 *
 * Isto nasceu na D22 chamando-se `Monograma`, e `components/cabinet/monograma.tsx`
 * — reescrito na D3 — já tinha esse nome. Duas declarações do mesmo nome, em
 * arquivos distintos, que o merge da rodada não acusou porque nada colide: cada
 * tela importa a sua e as duas compilam.
 *
 * **Não foram fundidas, e a razão é que elas discordam em três eixos, com
 * argumento escrito dos dois lados:**
 *
 * | eixo | `components/cabinet` (D3) | aqui (D22) |
 * |---|---|---|
 * | iniciais | primeira + ÚLTIMA palavra (`Maria da Silva` → MS) | primeira + SEGUNDA (`MARIA HELENA ARQUITETURA ME` → MH) |
 * | cor | hash do nome nas cinco `--tint-*` | fixa pelo PAPEL (cliente/responsável) |
 * | acessibilidade | sempre `aria-hidden` | `sr-only` com o nome, salvo `decorativo` |
 *
 * Cada um está certo no seu lugar: a razão social do funil quebra a convenção
 * de gente (`MARIA HELENA ARQUITETURA ME` daria `MM` por primeira+última —
 * medido na tela), e a cor por papel existe para o cartão não ganhar uma nona
 * cor sem dono. Escolher uma regra para os dois é decisão de PRODUTO, não de
 * passada de consistência — então a D37 fez o que lhe cabia: **tirou a colisão
 * de nome** e deixou a divergência visível aqui, em vez de fundir na marra e
 * quebrar um dos dois casos medidos.
 *
 * O cartão do funil passou a nomear DUAS pessoas (o cliente e o responsável), e
 * dois nomes por extenso na mesma fileira comem a largura da coluna. O
 * monograma resolve o do responsável: ele é reconhecimento, não leitura — quem
 * opera o funil sabe quem é `LM` na própria equipe, e o nome inteiro continua no
 * `title` e no texto acessível.
 *
 * **A cor é do PAPEL, não da pessoa.** Cliente e responsável têm cada um o seu
 * tint fixo; cor por pessoa viraria uma nona, décima e décima-primeira cor sem
 * dono e apagaria o significado que a paleta de módulo tem hoje — é a mesma
 * regra que o quadro de Tarefas já segue.
 */

const TONS = {
  /** Quem compra — o tint do módulo CRM (âmbar). */
  cliente: 'var(--tint-sand)',
  /** Quem vende — lilás, o tom de avatar do mockup. */
  responsavel: 'var(--tint-lilac)',
} as const

/**
 * Duas letras: as iniciais dos DOIS PRIMEIROS termos do nome.
 *
 * Primeiro+último é a convenção para gente, e aqui erra: o cliente do funil é
 * quase sempre razão social, e `MARIA HELENA ARQUITETURA ME` daria `MM` —
 * medido na tela. Os dois primeiros acertam os dois casos (`MH`,
 * `Construtora Horizonte SA` → `CH`, `Henrique Ferro` → `HF`).
 *
 * Termo de uma letra não entra: a partícula (`de`, `e`) não distingue ninguém.
 */
export function iniciaisDoFunil(nome: string): string {
  const termos = nome
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 1)
  const primeiro = termos[0] ?? nome.trim()
  const letras = `${primeiro.charAt(0)}${termos[1]?.charAt(0) ?? ''}`
  return letras.toUpperCase() || '?'
}

/**
 * `t-dado-meta` dá o mono de 11px que cabe num quadrado de 20px; a tinta é
 * sobrescrita para n-900 porque o n-500 do degrau não alcança 4,5:1 sobre os
 * tints — e §Hierarquia cobra esse contraste justamente aqui.
 */
const CAIXA =
  't-dado-meta grid size-5 shrink-0 place-content-center rounded-[var(--r-item)] border border-[var(--n-300)]'

/**
 * A tinta vai por `style`, e não por utility.
 *
 * As classes `.t-*` declaram `color` e moram FORA do layer de utilities do
 * Tailwind — `text-[var(--n-900)]` ao lado de `t-dado-meta` perde a cascata em
 * silêncio, e o monograma ficaria em n-500 sobre o tint, abaixo dos 4,5:1 que
 * §Hierarquia cobra. Medido na tela.
 */
const TINTA = { color: 'var(--n-900)' } as const

export function MonogramaDoFunil({
  nome,
  papel = 'responsavel',
  decorativo = false,
  className,
}: {
  nome: string
  papel?: keyof typeof TONS
  /**
   * O nome já está ESCRITO ao lado — então o monograma é só o olho, e sai da
   * árvore de acessibilidade. Sem isto quem ouve a tela recebe o mesmo nome
   * duas vezes seguidas, uma por letra e outra por extenso.
   */
  decorativo?: boolean
  className?: string
}) {
  if (decorativo) {
    return (
      <span
        data-slot="monograma"
        aria-hidden="true"
        title={nome}
        style={{ background: TONS[papel], ...TINTA }}
        className={cn(CAIXA, className)}
      >
        {iniciaisDoFunil(nome)}
      </span>
    )
  }

  return (
    <span
      data-slot="monograma"
      title={nome}
      style={{ background: TONS[papel], ...TINTA }}
      className={cn(CAIXA, className)}
    >
      <span aria-hidden="true">{iniciaisDoFunil(nome)}</span>
      {/* O nome inteiro para quem ouve: duas letras soltas não dizem quem é. */}
      <span className="sr-only">{nome}</span>
    </span>
  )
}
