import type { TaskDtoPriority } from '@/api/gerado'
import { cn } from '@/lib/utils'

/**
 * A PÍLULA DE PRIORIDADE — a mesma no cartão do quadro e na linha da lista.
 *
 * ## O que mudou na 2.0 (mockup, aba Quadro · `.prio`)
 *
 * Era chip de fill FLAT com contorno preto de 2px — o degrau do meio da paleta
 * 1.x. Vira **pastel alpha com tinta forte e ponto**: fundo `--*-bg` (que é
 * `color-mix` com `transparent`, então funciona sobre a folha do cartão e sobre
 * o `--n-50` da coluna sem um segundo valor por tema) e texto na cor cheia. O
 * contorno saiu: dentro de um cartão que já tem borda, a pílula com borda
 * própria era a segunda ferramenta de separação na mesma fronteira.
 *
 * `Alta` continua em vermelho, e a exceção continua registrada: a cor de
 * bloqueio tem dono — erro —, e vale aqui porque prioridade alta é o que TRAVA
 * a fila do dia. `Média` é âmbar e `Baixa` é o mudo (`--mut`), como no mockup:
 * baixa prioridade é o que menos pede atenção, e azul ali competiria com o
 * quadradinho da coluna `A fazer`.
 *
 * O rótulo é escrito, nunca só a cor: três pílulas que só diferem de tom seriam
 * ilegíveis para daltônico e mudas no leitor de tela (WCAG 1.4.1). O ponto
 * herda `currentColor` — ele repete a cor, não acrescenta uma.
 *
 * ## §Hierarquia: por que `.t-rotulo`
 *
 * O `.prio` do mockup é Inter 600 a 10,5px, que é EXATAMENTE o degrau
 * `--t-rotulo`; a régua proíbe `font-size` literal em componente, então o
 * caminho conforme é a classe, não um `text-[10.5px]`. A régua também diz que
 * `--t-rotulo` não tem caixa própria — regra escrita para o rótulo ESTRUTURAL
 * (cabeçalho de coluna, rótulo de KPI, título de grupo da sidebar), que é um
 * texto solto no plano. Aqui o elemento é uma pílula de estado, a mesma família
 * do badge que o mockup desenha com fundo; a alternativa seria medida literal,
 * que a régua proíbe em primeiro lugar. Registrado na PR.
 *
 * A cor vai por `style`, e não por classe utilitária: as classes `.t-*` entram
 * fora de `@layer`, então definem `color` com precedência sobre o Tailwind — um
 * `text-[var(--bad)]` ao lado de `t-rotulo` sairia em `--n-500` e a pílula
 * ficaria cinza sem ninguém ver erro nenhum.
 */
const PRIORIDADES: Record<TaskDtoPriority, { rotulo: string; fundo: string; tinta: string }> = {
  high: { rotulo: 'Alta', fundo: 'var(--bad-bg)', tinta: 'var(--bad)' },
  medium: { rotulo: 'Média', fundo: 'var(--warn-bg)', tinta: 'var(--warn)' },
  low: { rotulo: 'Baixa', fundo: 'var(--mut-bg)', tinta: 'var(--mut)' },
}

export function Prioridade({
  prioridade,
  className,
}: { prioridade: TaskDtoPriority; className?: string }) {
  const { rotulo, fundo, tinta } = PRIORIDADES[prioridade]

  return (
    <span
      data-slot="prioridade"
      data-prioridade={prioridade}
      className={cn('t-rotulo inline-flex shrink-0 items-center rounded-full', className)}
      style={{
        background: fundo,
        color: tinta,
        // Padding de chip da régua (§Hierarquia: chip 0 9) e altura do mockup.
        padding: '0 var(--s-2)',
        height: '18px',
        gap: '5px',
      }}
    >
      <span
        aria-hidden="true"
        className="size-[5px] shrink-0 rounded-full"
        style={{ background: 'currentColor' }}
      />
      {rotulo}
    </span>
  )
}
