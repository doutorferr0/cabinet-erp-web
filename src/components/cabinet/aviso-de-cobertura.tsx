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
        'flex max-w-prose items-start gap-2 border-2 border-border bg-zone-warn px-3 py-2',
        className,
      )}
    >
      {/* Decoração: quem informa é a frase ao lado. O desenho serve para o olho
          achar a caixa de longe, depois de já ter aprendido o que ela é. */}
      <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="flex flex-col gap-1 text-sm">
        {children}
        {erro}
      </div>
    </div>
  )
}
