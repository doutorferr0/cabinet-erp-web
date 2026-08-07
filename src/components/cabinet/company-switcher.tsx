import { Ornamento } from '@/components/cabinet/ornamento'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'
import { useEmpresasDaSessao } from '@/data/empresas-api'
import { papelLabel } from '@/data/papeis'
import { useLogout } from '@/data/sessao'
import { cn } from '@/lib/utils'
import { Building2, Check, ChevronsUpDown, LogOut } from 'lucide-react'
import { useState } from 'react'

/**
 * Seletor da empresa ativa (`activeTenantId` da sessão).
 *
 * Vínculo ≠ contexto: a lista mostra o que o usuário alcança, o rótulo mostra
 * onde ele está. Trocar aqui é trocar o escopo de todo dado da tela — a
 * invalidação mora no hook, não neste componente.
 *
 * **É GAVETA, não menu suspenso (decisão do user, 2026-08-06).** Trocar de
 * empresa é a mudança mais forte que a interface oferece: todo número, toda
 * listagem e todo documento que estiver aberto passam a ser de outra empresa.
 * Menu suspenso é a peça de escolha BARATA — abre colado ao gatilho, fecha ao
 * primeiro clique fora e trata trocar de empresa com o mesmo peso de escolher
 * uma coluna de ordenação. A gaveta para a tela, cobre o resto, diz por escrito
 * o que vai acontecer e exige um alvo grande. O custo é um clique a mais, e é
 * um clique que se quer cobrar.
 *
 * TODO(contract): a transcrição mostra CNPJ junto do nome da empresa; o
 * `VinculoDeEmpresa` do contrato traz só `tenantId`, `name` e `role`. Enquanto
 * o CNPJ não vier, a segunda linha mostra o papel — que é dado real — em vez de
 * um documento inventado.
 */
export function CompanySwitcher() {
  const [aberta, setAberta] = useState(false)
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
        <SidebarMenuButton
          size="lg"
          isDisabled={carregando || Boolean(erro)}
          onClick={() => setAberta(true)}
          // Bloco da empresa ativa = ZONA DE IDENTIDADE com borda preta. Era
          // amarelo (mockup .empresa), mas amarelo é o anel de foco desde a
          // 1.5 e a empresa ativa é o dado de identidade mais alto da tela —
          // a mesma zona que a banda de identidade usa nos cadastros.
          className="border-2 border-border bg-zone-id font-bold"
        >
          {/* O galpão no lugar do `Building2`: pela fronteira do sistema, shape
              marca ENTIDADE e lucide marca AÇÃO — e "a empresa em que estou" é
              entidade. O quadrado violeta preenchido saiu junto: ele existia
              para dar contraste ao ícone branco, e o ornamento já traz a própria
              cor. Sem ele, some também um roxo que competia com a AÇÃO, que é o
              único emprego do violeta neste sistema.

              A cor é fixa (`tom="empresa"`), não a do módulo: esta peça responde
              "de qual empresa é o que estou vendo", e a resposta não muda de
              tela para tela. Ornamento piscando de cor a cada navegação seria
              ruído no exato canto onde o operador procura estabilidade. */}
          <span className="flex aspect-square size-8 shrink-0 items-center justify-center">
            <Ornamento shape="empresa" tom="empresa" tamanho={16} />
          </span>
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

        {/* Gaveta pela ESQUERDA: é de onde a sidebar sai, então ela cresce do
            mesmo lado em que o operador clicou. */}
        <Sheet isOpen={aberta} onOpenChange={setAberta} side="left">
          <SheetHeader>
            <SheetTitle>Empresa ativa</SheetTitle>
            <SheetDescription>
              Trocar de empresa muda o escopo de tudo que está aberto: listagens, documentos e
              totais passam a ser da empresa escolhida.
            </SheetDescription>
          </SheetHeader>

          {empresas.length === 0 ? (
            <p className="px-1 text-muted-foreground">Nenhuma empresa vinculada a este usuário.</p>
          ) : (
            <ul className="flex flex-col gap-2 overflow-y-auto">
              {empresas.map((empresa) => {
                const eAtiva = empresa.tenantId === ativa?.tenantId
                return (
                  <li key={empresa.tenantId}>
                    <Button
                      variant="outline"
                      disabled={trocando}
                      onClick={() => {
                        // Escolher a que já está ativa não é troca: só fecha.
                        if (!eAtiva) trocar(empresa.tenantId)
                        setAberta(false)
                      }}
                      className={cn(
                        'h-auto w-full justify-start gap-2 px-3 py-2.5 text-left',
                        // A ativa é a zona de identidade, o mesmo tom do bloco
                        // que abriu esta gaveta — o operador reencontra aqui a
                        // cor que viu lá.
                        eAtiva && 'bg-zone-id',
                      )}
                      {...(eAtiva && { 'aria-current': 'true' })}
                    >
                      <span className="flex size-6 shrink-0 items-center justify-center border-2 border-border">
                        {eAtiva ? (
                          <Check className="size-4 shrink-0" />
                        ) : (
                          <Building2 className="size-4 shrink-0" />
                        )}
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate font-semibold">{empresa.name}</span>
                        <span className="truncate font-mono text-xs uppercase tracking-[0.06em] text-muted-foreground">
                          {papelLabel(empresa.role)}
                        </span>
                      </span>
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}

          {/* Sair mora aqui: é o lugar onde o usuário já olha para saber
              "quem/onde estou". O redirect para /login é da guarda — o logout
              só derruba o cookie e limpa o cache. */}
          <SheetFooter className="mt-auto">
            <Button
              variant="destructive"
              disabled={logout.isPending}
              onClick={() => logout.mutate()}
              className="w-full justify-start gap-2"
            >
              <LogOut className="size-4 shrink-0" />
              {logout.isPending ? 'Saindo…' : 'Sair'}
            </Button>
          </SheetFooter>
        </Sheet>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
