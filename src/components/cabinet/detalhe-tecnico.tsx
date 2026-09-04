import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'

/**
 * O DETALHE TÉCNICO DA FALHA — fechado por padrão, em mono, dentro de um
 * colapsável.
 *
 * ## O defeito que ele fecha
 *
 * O `detail` do problem+json é a única parte acionável de uma resposta de erro,
 * e por isso os estados de falha o imprimiam junto da frase de orientação. Só
 * que ele não é escrito para o operador: vem com nome de recurso, id, às vezes
 * a restrição do banco. Impresso em Inter, do lado de "Tente de novo em
 * instantes", ele se lê como continuação da orientação — e o operador tenta
 * entender uma frase que não foi escrita para ele.
 *
 * As duas leituras são legítimas e são de pessoas diferentes: quem opera precisa
 * da orientação; quem vai ABRIR CHAMADO precisa da frase exata do servidor,
 * para copiar. O colapsável dá as duas sem que uma atrapalhe a outra —
 * **fechado** por padrão (a orientação fica sozinha) e **em mono** quando
 * aberto, porque §Hierarquia diz que mono é o que se copia, compara ou soma.
 *
 * ## Some sozinho
 *
 * Sem `detalhe`, não renderiza nada: erro de rede e exceção de código não têm
 * `detail`, e um gatilho que abre para revelar o vazio é pior que a ausência.
 */
export function DetalheTecnico({
  detalhe,
  className,
}: {
  /** O `detail` do problem+json, cru. `undefined` = nada a mostrar. */
  detalhe: string | undefined
  className?: string
}) {
  if (!detalhe) return null

  return (
    <Collapsible data-slot="detalhe-tecnico" className={cn('w-full text-left', className)}>
      <CollapsibleTrigger
        className={cn(
          'group/detalhe inline-flex cursor-pointer items-center gap-1 rounded-item outline-none',
          't-meta hover:text-foreground',
          'focus-visible:focus-ring',
        )}
      >
        {/* A seta lê o `data-expanded` do `Disclosure` (mora no pai, não no
            botão) — a mesma amarração do accordion. */}
        <ChevronRight
          aria-hidden="true"
          className="size-3.5 transition-transform group-data-[expanded]/detalhe:rotate-90"
        />
        Detalhe técnico
      </CollapsibleTrigger>
      <CollapsibleContent>
        {/* Mono e selecionável: isto existe para ser COPIADO para um chamado.
            `break-words` porque `detail` de servidor traz id e caminho longos,
            e estourar a caixa esconderia justamente o fim da frase. */}
        <p className="t-dado-meta mt-1 break-words whitespace-pre-wrap select-all">{detalhe}</p>
      </CollapsibleContent>
    </Collapsible>
  )
}
