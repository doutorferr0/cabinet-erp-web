import {
  DropdownMenu,
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
        {/* RAC: o trigger envolve botão E menu; o conteúdo é o próprio DropdownMenu. */}
        <DropdownMenuTrigger>
          <SidebarMenuButton
            size="lg"
            isDisabled={carregando || Boolean(erro)}
            // Bloco da empresa ativa = ZONA DE IDENTIDADE com borda preta. Era
            // amarelo (mockup .empresa), mas amarelo é o anel de foco desde a
            // 1.5 e a empresa ativa é o dado de identidade mais alto da tela —
            // a mesma zona que a banda de identidade usa nos cadastros.
            className="border-2 border-border bg-zone-id font-bold aria-expanded:bg-zone-id"
          >
            <div className="flex aspect-square size-8 items-center justify-center bg-sidebar-primary text-sidebar-primary-foreground">
              <Building2 className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-extrabold">{titulo}</span>
              {ativa && (
                <span className="truncate font-mono text-xs uppercase tracking-[0.06em] text-foreground/70">
                  {papelLabel(ativa.role)}
                </span>
              )}
            </div>
            <ChevronsUpDown className="ml-auto size-4" />
          </SidebarMenuButton>
          <DropdownMenu
            className="min-w-56"
            placement={
              isMobile ? 'bottom start' : state === 'collapsed' ? 'right top' : 'bottom start'
            }
          >
            <DropdownMenuLabel>Empresa ativa</DropdownMenuLabel>
            {empresas.length === 0 ? (
              <DropdownMenuItem isDisabled className="gap-2 p-2">
                Nenhuma empresa vinculada a este usuário.
              </DropdownMenuItem>
            ) : (
              empresas.map((empresa) => (
                <DropdownMenuItem
                  key={empresa.tenantId}
                  isDisabled={trocando}
                  onAction={() => trocar(empresa.tenantId)}
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center border">
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
              isDisabled={logout.isPending}
              onAction={() => logout.mutate()}
              className="gap-2 p-2"
            >
              <div className="flex size-6 items-center justify-center border">
                <LogOut className="size-4 shrink-0" />
              </div>
              {logout.isPending ? 'Saindo…' : 'Sair'}
            </DropdownMenuItem>
          </DropdownMenu>
        </DropdownMenuTrigger>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
