import { moduloDaRota } from '@/app/modulo'
import { type NavGroup, navGroups } from '@/app/navigation'
import { PageFrame } from '@/app/page-frame'
import { CompanySwitcher } from '@/components/cabinet/company-switcher'
import { ModeToggle } from '@/components/cabinet/mode-toggle'
import { Ornamento } from '@/components/cabinet/ornamento'
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
import { cn } from '@/lib/utils'
import { Link, useRouterState } from '@tanstack/react-router'
import { LayoutDashboard } from 'lucide-react'

/**
 * O que o cartão de hover mostra ao pousar num item da sidebar: as OUTRAS
 * telas do mesmo módulo, com a atual marcada.
 *
 * Vale porque é o pulo que a sidebar não dá sozinha — de `Clientes` para
 * `Produtos` são dois movimentos e uma lida na lista inteira; aqui é um. É
 * acréscimo, nunca caminho único: tudo que está no cartão está na sidebar
 * logo abaixo, que é o que mantém o sistema operável no toque e no teclado
 * (§HoverCard).
 */
function OpcoesDoModulo({ grupo, atual }: { grupo: NavGroup; atual: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      {/* Mesma receita do rótulo de menu do sistema (`DropdownMenuLabel`): é
          o mesmo papel — nomear a lista que vem abaixo. */}
      <span className="font-mono text-xs font-semibold uppercase tracking-[0.07em] text-muted-foreground">
        {grupo.title}
      </span>
      <ul className="flex flex-col">
        {grupo.items.map((irma) => (
          <li key={irma.url}>
            <Link
              to={irma.url}
              className={cn(
                'flex items-center gap-2 rounded-item px-1.5 py-1 text-sm no-underline transition-colors hover:bg-neutral',
                irma.url === atual && 'bg-primary font-semibold text-primary-foreground',
              )}
              {...(irma.url === atual && { 'aria-current': 'page' })}
            >
              <irma.icon className="size-3.5 shrink-0" />
              {irma.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

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
                // Cada item carrega a cor do SEU módulo, não a da tela no ar:
                // é o que faz a fileira inteira ficar legível como um mapa de
                // cores, e não só o item aceso (memória §@ornamentos).
                const moduloDoItem = moduloDaRota(item.url)
                return (
                  <SidebarMenuItem
                    key={item.url}
                    {...(moduloDoItem && { 'data-modulo': moduloDoItem })}
                  >
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      // Grupo de uma tela só não tem irmã para oferecer — ali o
                      // cartão repetiria o rótulo, que é trabalho da dica.
                      {...(group.items.length > 1 && {
                        hoverCard: <OpcoesDoModulo grupo={group} atual={item.url} />,
                      })}
                    >
                      <Link to={item.url}>
                        {/* O shape do módulo no lugar do ícone genérico: é ele
                            que o operador aprende como marca do módulo, e o
                            mesmo desenho reaparece na banda e no estado vazio.

                            O par entra INVERTIDO em relação ao fundo: item
                            inativo é liso, então o ornamento vai de cheia /01 e
                            a fileira inteira vira um mapa de cores; item ativo
                            já tem fundo /01 pelo §3b, e ali a cheia sobre cheia
                            sumiria — nele o ornamento vai de pastel /02. As
                            duas regras (memória §@ornamentos e §3b) só coexistem
                            assim, e a família da cor é a mesma nos dois casos. */}
                        {moduloDoItem ? (
                          <Ornamento
                            shape={moduloDoItem}
                            tom={active ? 'modulo-suave' : 'modulo'}
                            tamanho={18}
                          />
                        ) : (
                          <item.icon />
                        )}
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
  const { location } = useRouterState()
  const modulo = moduloDaRota(location.pathname)
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header = 1 célula da grade (52px), régua preta 2px embaixo (mockup .header). */}
        <header className="flex h-[52px] shrink-0 items-center gap-2 border-b-2 bg-card px-4 transition-[width,height] ease-linear">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-4" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ModeToggle />
          </div>
        </header>
        {/* A área de conteúdo é Papel COM a grade de 52px; a folha (PageFrame)
            pousa opaca por cima (Regra da Grade de Fundo).
            `data-modulo` é declarado UMA vez, aqui: tudo que a tela montar
            dentro dele lê o par de cor do módulo pelas utilities `bg-modulo*`
            sem precisar saber em que módulo está. Rota sem cor atribuída não
            escreve o atributo — o par padrão do `:root` é o que vale. */}
        <main
          {...(modulo && { 'data-modulo': modulo })}
          className="bg-paper-grid flex flex-1 flex-col p-5"
        >
          {/* `key` por CAMINHO: trocar de tela remonta a folha e a entrada
              anima; paginar e ordenar mexem em search params, não no caminho,
              e por isso não remontam nem animam. */}
          <PageFrame key={location.pathname}>{children}</PageFrame>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
