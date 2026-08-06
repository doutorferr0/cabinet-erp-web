import { BandaDeIdentidade } from '@/components/cabinet/banda-identidade'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useEmpresasDaSessao } from '@/data/empresas-api'
import { useSessao } from '@/data/sessao'
import { useQueryClient } from '@tanstack/react-query'
import { Building2 } from 'lucide-react'

/**
 * Guarda de contexto: tela do sistema NÃO renderiza sem empresa ativa.
 *
 * O contrato modela `activeTenantId` como anulável — é estado legítimo (logo
 * após o login, antes da primeira escolha), mas transitório: todo dado de
 * operação é escopado por empresa e o backend rejeita consulta sem contexto
 * (o `PUT /auth/active-tenant` existe justamente para estabelecê-lo). Deixar o
 * usuário navegar sem empresa era "seletor mostra `Nenhuma empresa ativa` e
 * nada obriga escolha": cada tela quebraria por conta própria.
 *
 * O que esta guarda NÃO faz é escolher pelo usuário: auto-selecionar o vínculo
 * único seria o front decidindo contexto de sessão, que é do backend. Pergunta
 * registrada na memória: o login deveria vir com `activeTenantId` preenchido
 * quando há um único vínculo?
 */
export function RequireTenant({ children }: { children: React.ReactNode }) {
  const sessao = useSessao()

  // Montada sempre SOB a `RequireSession`, então aqui a sessão já resolveu e
  // não é `null`; o fallback existe para não piscar a tela de escolha se um
  // dia ela for usada fora dessa composição.
  if (!sessao.data) return null

  if (sessao.data.activeTenantId === null) return <SelecionarEmpresa />

  return children
}

/**
 * Tela de escolha da empresa ativa — folha centrada no Papel, mesma anatomia
 * do login (quem não tem contexto não tem sistema para navegar).
 *
 * Consome `useEmpresasDaSessao` em vez de chamar endpoint direto: a escolha é
 * a mesma mutação do seletor da sidebar (`PUT /auth/active-tenant` + invalidação
 * total), e o sucesso reconsulta o `/auth/me`, que libera a guarda sozinho.
 */
function SelecionarEmpresa() {
  const queryClient = useQueryClient()
  const { empresas, carregando, erro, trocar, trocando, falhaAoTrocar } = useEmpresasDaSessao()

  return (
    <div className="bg-paper-grid flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm border-2 border-border bg-card p-4 shadow-hard">
        <div className="mb-4">
          <BandaDeIdentidade titulo="Escolha a empresa" contexto="Empresa ativa" />
        </div>

        {carregando ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-2/3" />
          </div>
        ) : erro ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm">Não foi possível carregar as empresas do usuário.</p>
            {/* Invalidação total: a falha pode estar nos vínculos OU na sessão;
                invalidar por chave acoplaria a guarda às chaves internas do hook. */}
            <Button variant="outline" onClick={() => queryClient.invalidateQueries()}>
              Tentar de novo
            </Button>
          </div>
        ) : empresas.length === 0 ? (
          // Fato, sem procedimento inventado: não existe endpoint de onboarding
          // de empresa — criar vínculo não é ação de tela (decisão do I2).
          <p className="text-sm">Nenhuma empresa vinculada a este usuário.</p>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm">
              A sessão está sem empresa ativa. Todo dado do sistema é por empresa — escolha uma para
              continuar.
            </p>
            <div className="flex flex-col gap-2">
              {empresas.map((empresa) => (
                <Button
                  key={empresa.tenantId}
                  variant="outline"
                  disabled={trocando}
                  onClick={() => trocar(empresa.tenantId)}
                  className="h-auto justify-start gap-2 px-3 py-2"
                >
                  <Building2 className="size-4 shrink-0" />
                  <span className="grid flex-1 text-left leading-tight">
                    <span className="truncate font-semibold">{empresa.name}</span>
                    <span className="truncate font-mono text-xs uppercase tracking-[0.06em] text-muted-foreground">
                      {empresa.role}
                    </span>
                  </span>
                </Button>
              ))}
            </div>
            {falhaAoTrocar && (
              <p role="alert" className="text-xs text-destructive">
                Não foi possível trocar de empresa. Tente de novo.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
