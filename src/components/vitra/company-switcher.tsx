import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { Building2, ChevronsUpDown } from 'lucide-react'
import { useState } from 'react'

export interface Company {
  id: string
  name: string
  cnpj: string
}

const mockCompanies: Company[] = [
  { id: '1', name: 'VERTZ ILUMINAÇÃO', cnpj: '00.000.000/0001-00' },
  { id: '2', name: 'VIA HF', cnpj: '00.000.000/0002-00' },
]

const defaultCompany = mockCompanies[0] as Company

export function CompanySwitcher() {
  const { isMobile, state } = useSidebar()
  const [active, setActive] = useState<Company>(defaultCompany)

  const handleSelect = (id: string) => {
    const next = mockCompanies.find((c) => c.id === id)
    if (next) setActive(next)
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Building2 className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{active.name}</span>
                <span className="truncate text-xs">{active.cnpj}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? 'bottom' : state === 'collapsed' ? 'right' : 'bottom'}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Empresa ativa
            </DropdownMenuLabel>
            {mockCompanies.map((company) => (
              <DropdownMenuItem
                key={company.id}
                onClick={() => handleSelect(company.id)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-sm border">
                  <Building2 className="size-4 shrink-0" />
                </div>
                {company.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2" disabled>
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <span className="text-xs">+</span>
              </div>
              <div className="font-medium text-muted-foreground">Adicionar empresa</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
