import { Campo } from '@/components/cabinet/campo'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'
import type { ReactNode } from 'react'

export interface CampoComBuscaProps {
  label?: string
  inputId?: string
  ariaLabel: string
  /** Dica de preenchimento, abaixo do controle. */
  ajuda?: ReactNode
  /** Mensagem de validação. Vence a `ajuda`. */
  erro?: ReactNode
  obrigatorio?: boolean
  className?: string | undefined
  onBuscar?: (() => void) | undefined
  children: ReactNode
}

/**
 * Moldura de um campo de consulta com a lupa que abre a janela de busca
 * (padrão 5 da transcrição).
 *
 * No 2.0 ele para de montar o rótulo à mão e passa a compor `<Campo>` — era o
 * único lugar do repo em que um campo desenhava `Label` + `flex flex-col gap-1`
 * por conta própria, e por isso era o único que não ganhava ajuda, erro nem
 * marca de obrigatório sem que a tela os desenhasse ao lado. Compor também
 * resolve o rótulo sem caixa de graça: quem manda no degrau é o `Campo`.
 *
 * Sem `label` o componente vira só a moldura controle+lupa — é o caso do campo
 * que já vive dentro de um `<FormItem>` do RHF, onde o rótulo é do form.
 */
export function CampoComBusca({
  label,
  inputId,
  ariaLabel,
  ajuda,
  erro,
  obrigatorio,
  className,
  onBuscar,
  children,
}: CampoComBuscaProps) {
  const controle = (
    <div className="flex min-w-0 items-center gap-[var(--s-1)]">
      {children}
      {onBuscar ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={ariaLabel}
          onClick={onBuscar}
        >
          <Search className="size-4" />
        </Button>
      ) : null}
    </div>
  )

  if (!label) {
    return <div className={className}>{controle}</div>
  }

  return (
    <Campo
      label={label}
      {...(obrigatorio ? { obrigatorio } : {})}
      {...(ajuda ? { ajuda } : {})}
      {...(erro ? { erro } : {})}
      {...(inputId ? { htmlFor: inputId } : {})}
      {...(className ? { className } : {})}
    >
      {controle}
    </Campo>
  )
}
