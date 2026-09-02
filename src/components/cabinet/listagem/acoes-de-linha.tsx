import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

/**
 * Ação que age sobre UMA linha, alcançável no lugar onde o olho já está.
 *
 * A barra de lote (topo) responde "o que faço com as marcadas"; isto responde
 * "o que faço com ESTA", e a diferença é a distância: marcar uma linha para
 * imprimir um pedido é dois gestos e uma viagem ao topo da tela. Os botões
 * aparecem no hover e no foco do teclado — nunca só no hover, que deixaria a
 * ação inalcançável para quem navega por Tab.
 */
export interface AcaoDeLinha<T> {
  id: string
  /** Vai no `title` e no nome acessível: o botão é só ícone. */
  label: string
  icon: LucideIcon
  onClick: (row: T) => void
}

/**
 * Os botões de linha, alinhados à direita da última coluna.
 *
 * `opacity-0` e não `hidden`: a coluna reserva a largura desde o primeiro
 * quadro, e a linha não muda de largura quando o mouse entra. Some para o olho,
 * fica para o leitor de tela e para o Tab — quem navega por teclado precisa
 * encontrá-los na ordem da linha, e `hidden` os tiraria da árvore.
 */
export function AcoesDeLinha<T>({
  acoes,
  linha,
}: {
  acoes: readonly AcaoDeLinha<T>[]
  linha: T
}) {
  if (acoes.length === 0) return null
  return (
    <div
      data-slot="acoes-de-linha"
      className={cn(
        'flex justify-end gap-0.5 opacity-0 transition-opacity',
        'group-hover/linha:opacity-100 group-focus-within/linha:opacity-100',
        // Toque não tem hover: onde não há apontador fino, as ações ficam
        // sempre visíveis em vez de nunca alcançáveis.
        '[@media(hover:none)]:opacity-100',
      )}
    >
      {acoes.map((acao) => (
        <button
          key={acao.id}
          type="button"
          title={acao.label}
          aria-label={acao.label}
          className="grid size-[26px] place-items-center rounded-item text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:focus-ring"
          onClick={(e) => {
            // A LINHA abre o registro no clique. Sem barrar a propagação,
            // imprimir abriria o pedido junto — e o operador voltaria da tela
            // errada sem saber o que apertou.
            e.stopPropagation()
            acao.onClick(linha)
          }}
        >
          <acao.icon aria-hidden="true" className="size-3.5" />
        </button>
      ))}
    </div>
  )
}
