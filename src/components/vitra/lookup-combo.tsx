import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { type LookupKind, lookupLabel, lookupOptions } from '@/mocks/lookups'
import { Check, ChevronsUpDown, MoreHorizontal } from 'lucide-react'
import { useId, useState } from 'react'

export interface LookupComboProps {
  kind: LookupKind
  value: string | null
  onChange: (value: string | null) => void
  disabled?: boolean
  id?: string
  /** Esconde o botão "..." (usado onde a transcrição tem `[combo]` puro, sem cadastro rápido). */
  hideQuickAdd?: boolean | undefined
}

/**
 * Padrão `[combo +...]` da transcrição (§9 padrão 2): escolher da lista ou
 * cadastrar item novo sem sair da tela (botão "..." → Dialog de cadastro rápido).
 */
export function LookupCombo({
  kind,
  value,
  onChange,
  disabled,
  id,
  hideQuickAdd,
}: LookupComboProps) {
  const [open, setOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [newItem, setNewItem] = useState('')
  // Cadastros rápidos ficam em estado local (mock); somem ao recarregar.
  const [added, setAdded] = useState<string[]>([])
  const fallbackId = useId()
  const listId = id ?? fallbackId

  const label = lookupLabel(kind)
  const options = [...lookupOptions(kind), ...added]

  function confirmAdd() {
    const nome = newItem.trim().toUpperCase()
    if (!nome) return
    if (!options.includes(nome)) setAdded((a) => [...a, nome])
    onChange(nome)
    setNewItem('')
    setAddOpen(false)
    setOpen(false)
  }

  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={listId}
            type="button"
            variant="outline"
            // biome-ignore lint/a11y/useSemanticElements: combobox de busca (Command+Popover), não <select> nativo — padrão shadcn.
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn('w-full justify-between font-normal', !value && 'text-muted-foreground')}
          >
            <span className="truncate">{value ?? `Selecione ${label.toLowerCase()}…`}</span>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder={`Buscar ${label.toLowerCase()}…`} />
            <CommandList>
              <CommandEmpty>Nenhum item encontrado.</CommandEmpty>
              {options.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => {
                    onChange(option === value ? null : option)
                    setOpen(false)
                  }}
                >
                  <Check className={cn('size-4', option === value ? 'opacity-100' : 'opacity-0')} />
                  {option}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {!hideQuickAdd && (
        <>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={`Cadastrar ${label}`}
            disabled={disabled}
            onClick={() => setAddOpen(true)}
          >
            <MoreHorizontal className="size-4" />
          </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Cadastrar {label}</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lookup-quick-add-nome">Nome</Label>
                <Input
                  id="lookup-quick-add-nome"
                  value={newItem}
                  autoFocus
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      confirmAdd()
                    }
                  }}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                  Cancelar
                </Button>
                <Button type="button" onClick={confirmAdd} disabled={!newItem.trim()}>
                  Gravar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}
