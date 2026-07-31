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
import { useEmpresasDaSessao } from '@/data/empresas-api'
import { papelLabel } from '@/data/papeis'
import { useLogout } from '@/data/sessao'
import { Building2, Check, ChevronsUpDown, LogOut } from 'lucide-react'

/**
 * Seletor da empresa ativa (`activeTenantId` da sessão).
 *
 * Vínculo ≠ contexto: o menu lista o que o usuário alcança, o rótulo mostra onde
 * ele está. Trocar aqui é trocar o escopo de todo dado da tela — a invalidação
 * mora no hook, não neste componente.
 *
 * TODO(contract): a transcrição mostra CNPJ junto do nome da empresa; o
 * `VinculoDeEmpresa` do contrato traz só `tenantId`, `name` e `role`. Enquanto o
 * CNPJ não vier, a segunda linha mostra o papel — que é dado real — em vez de um
 * documento inventado.
 */
export function CompanySwitcher() {
  const { isMobile, state } = useSidebar()
  const { empresas, ativa, carregando, erro, trocar, trocando } = useEmpresasDaSessao()
  const logout = useLogout()

  // Estados distintos: esperar, avisar alguém, ou não ter vínculo mesmo.
  const titulo = carregando
    ? 'Carregando…'
    : erro
      ? 'Empresas indisponíveis'
      : (ativa?.name ?? 'Nenhuma empresa ativa')

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              disabled={carregando || erro}
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Building2 className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{titulo}</span>
                {ativa && (
                  <span className="truncate font-mono text-xs uppercase tracking-[0.06em] text-muted-foreground">
                    {papelLabel(ativa.role)}
                  </span>
                )}
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? 'bottom' : state === 'collapsed' ? 'right' : 'bottom'}
          >
            <DropdownMenuLabel className="font-mono text-xs uppercase tracking-[0.06em] text-muted-foreground">
              Empresa ativa
            </DropdownMenuLabel>
            {empresas.length === 0 ? (
              <DropdownMenuItem disabled className="gap-2 p-2">
                Nenhuma empresa vinculada a este usuário.
              </DropdownMenuItem>
            ) : (
              empresas.map((empresa) => (
                <DropdownMenuItem
                  key={empresa.tenantId}
                  disabled={trocando}
                  onClick={() => trocar(empresa.tenantId)}
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center rounded-sm border">
                    {empresa.tenantId === ativa?.tenantId ? (
                      <Check className="size-4 shrink-0" />
                    ) : (
                      <Building2 className="size-4 shrink-0" />
                    )}
                  </div>
                  {empresa.name}
                </DropdownMenuItem>
              ))
            )}
            {/* Sair mora neste menu: é o lugar onde o usuário já olha para
                saber "quem/onde estou". O redirect para /login é da guarda —
                o logout só derruba o cookie e limpa o cache. */}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={logout.isPending}
              onClick={() => logout.mutate()}
              className="gap-2 p-2"
            >
              <div className="flex size-6 items-center justify-center rounded-sm border">
                <LogOut className="size-4 shrink-0" />
              </div>
              {logout.isPending ? 'Saindo…' : 'Sair'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
