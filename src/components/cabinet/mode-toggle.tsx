import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/use-theme'
import { Moon, Sun } from 'lucide-react'

export function ModeToggle() {
  const { resolved, toggle } = useTheme()
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Alternar tema">
      {resolved === 'dark' ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </Button>
  )
}
