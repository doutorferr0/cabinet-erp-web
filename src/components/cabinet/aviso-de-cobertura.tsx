import { cn } from '@/lib/utils'
import { TriangleAlert } from 'lucide-react'

/**
 * AVISO DE COBERTURA — o que a tela mostra mas o servidor ainda não guarda.
 *
 * O contrato é MENOR que a transcrição, e a regra do repo é deixar isso
 * VISÍVEL: coluna que o DTO não tem sai da listagem, campo que o servidor não
 * guarda aparece em branco, e este aviso conta ao operador o que `Gravar` vai
 * de fato enviar. Sem ele, aba em branco se lê como cadastro incompleto e
 * `Gravar` parece ter guardado tudo.
 *
 * ## Por que virou peça
 *
 * A frase estava escrita em QUATRO rotas (fornecedor, cliente, profissional,
 * produto), cada uma com a sua caixa — e as quatro eram texto cinza de 12px
 * solto acima do formulário, do tamanho e da cor de uma legenda de rodapé. O
 * aviso mais importante da tela tinha o peso visual do menos importante.
 *
 * Cada rota continua dona do TEXTO (o que falta em cada cadastro é diferente) e
 * da AÇÃO (vincular ao cadastro que já existe, no 409). O que a peça dá é a
 * caixa: zona, ícone e o lugar do erro.
 *
 * ## Faixa, e só faixa (D29)
 *
 * Era `border-2` **mais** fundo tingido. §Hierarquia manda UMA ferramenta de
 * separação por fronteira, e o tint já é a ferramenta certa aqui: o aviso é uma
 * REGIÃO de natureza diferente dentro da tela, não um objeto solto sobre o
 * plano. Com a caixa preta por cima do amarelo ele lia como card — e card é o
 * que o formulário ao lado já é, então a tela ficava com dois objetos do mesmo
 * peso onde um deles é só um recado.
 *
 * ## Por que `--warn-bg`, e não o alias `zone-warn`
 *
 * A espec da D29 nomeia `--warn-bg`, e o nome importa porque os dois âmbares do
 * 2.0 não são a mesma tinta: `--tint-sand` (para onde a D1 aponta o
 * `--zone-warn` da 1.x) é OPACO, 14% de âmbar já misturado com a folha;
 * `--warn-bg` é ALPHA, 22% sobre o que estiver atrás. A diferença aparece onde
 * este aviso de fato mora — ele tanto entra dentro do formulário (folha) quanto
 * flutua sobre a bancada, e o tint opaco carrega a folha junto, desenhando um
 * retângulo branco-amarelado sobre o fundo escuro da bancada. Alpha é também o
 * que faz um valor só servir aos dois temas, que é a razão declarada de a
 * semântica do 2.0 ser alpha.
 *
 * Escrito como `bg-[var(--warn-bg)]` porque o token é da rodada 2.0 e ainda não
 * tem utility no `@theme` — quem cria utility é o `index.css`, zona da D1.
 *
 * ## A cor é a de PENDÊNCIA, e é literal
 *
 * Zona de pendência (amarela) porque é exatamente isso: falta caminho no
 * contrato, e um dia isto some. Não é erro — ninguém errou e não há o que
 * corrigir na tela —, então nada de vermelho; e não é apoio, porque não é
 * informação opcional: quem não ler vai achar que gravou o que não gravou.
 *
 * O ícone é lucide e herda a TINTA do texto. Amarelo continua proibido como cor
 * de letra e de traço (§Don'ts) — aqui ele é só fundo, com preto por cima.
 */
export function AvisoDeCobertura({
  children,
  erro,
  className,
}: {
  /** O que esta tela deixa de enviar — texto próprio de cada cadastro. */
  children: React.ReactNode
  /** Falha da gravação e a saída dela (o `Vincular` do 409), quando houver. */
  erro?: React.ReactNode
  className?: string
}) {
  return (
    <div
      data-slot="aviso-de-cobertura"
      className={cn(
        'flex max-w-prose items-start gap-2 rounded-item bg-[var(--warn-bg)] px-3 py-2 t-corpo',
        className,
      )}
    >
      {/* Decoração: quem informa é a frase ao lado. O desenho serve para o olho
          achar a caixa de longe, depois de já ter aprendido o que ela é. */}
      <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="flex flex-col gap-1">
        {children}
        {erro}
      </div>
    </div>
  )
}
