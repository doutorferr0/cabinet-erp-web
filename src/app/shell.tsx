import { navGroups } from '@/app/navigation'
import { PageFrame } from '@/app/page-frame'
import { Separator } from '@/components/ui/separator'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { CompanySwitcher } from '@/components/vitra/company-switcher'
import { ModeToggle } from '@/components/vitra/mode-toggle'
import { Link, useRouterState } from '@tanstack/react-router'
import { LayoutDashboard } from 'lucide-react'

function AppSidebar() {
  const { location } = useRouterState()
  const pathname = location.pathname

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <CompanySwitcher />
      </SidebarHeader>
      <SidebarContent>
        {/* Boletim é a entrada, não um módulo: fica solto acima dos grupos.
            Casamento exato — `/` é prefixo de tudo, `startsWith` acenderia sempre. */}
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/'} tooltip="Boletim">
                <Link to="/">
                  <LayoutDashboard />
                  <span>Boletim</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        {navGroups.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => {
                const active = pathname === item.url || pathname.startsWith(`${item.url}/`)
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <Link to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-14">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-4" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ModeToggle />
          </div>
        </header>
        {/* A área de conteúdo é Papel; a folha (PageFrame) é a única superfície de trabalho. */}
        <main className="flex flex-1 flex-col p-4">
          <PageFrame>{children}</PageFrame>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
