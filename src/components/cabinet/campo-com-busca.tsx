import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { Search } from 'lucide-react'
import type { ReactNode } from 'react'

export interface CampoComBuscaProps {
  label?: string
  inputId?: string
  ariaLabel: string
  className?: string | undefined
  onBuscar?: (() => void) | undefined
  children: ReactNode
}

/** Moldura comum para um campo de consulta com sua lupa. */
export function CampoComBusca({
  label,
  inputId,
  ariaLabel,
  className,
  onBuscar,
  children,
}: CampoComBuscaProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label ? <Label {...(inputId ? { htmlFor: inputId } : {})}>{label}</Label> : null}
      <div className="flex items-center gap-1">
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
    </div>
  )
}
