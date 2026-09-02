import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/use-theme'
import { cn } from '@/lib/utils'
import { Moon, Sun } from 'lucide-react'

/**
 * ALTERNADOR DE TEMA — uma das quatro ações globais da appbar (Reface 2.0 · D5).
 *
 * Aceita `className` porque a appbar dita a MEDIDA das quatro: elas formam uma
 * fileira, e o `size="icon"` do botão (36px) ao lado das teclas de 32px
 * desalinhava a única fileira que o operador vê em toda tela.
 */
export function ModeToggle({ className }: { className?: string }) {
  const { resolved, toggle } = useTheme()
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={
        resolved === 'dark' ? 'Alternar para o tema claro' : 'Alternar para o tema escuro'
      }
      className={cn(className)}
    >
      {resolved === 'dark' ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </Button>
  )
}
