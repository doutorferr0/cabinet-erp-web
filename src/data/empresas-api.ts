import type { VinculoDeEmpresa } from '@/api/gerado'
import { authSetActiveTenant, authTenants } from '@/api/gerado'
import { type RespostaDaApi, dadosOuErro, respostaOk } from '@/data/api-provider'
import { useSessao } from '@/data/sessao'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

/**
 * Empresa ativa da sessão — os dois níveis de multi-tenancy do Cabinet aparecem aqui.
 *
 * `GET /auth/tenants` devolve os VÍNCULOS (plural, o que o usuário alcança) e
 * `GET /auth/me` devolve o CONTEXTO (singular, em qual empresa ele está agora).
 * São conceitos distintos e o seletor precisa dos dois: a lista para oferecer, o
 * contexto para saber o que está aceso. Deduzir o contexto da lista ("a primeira
 * é a ativa") mostraria a empresa errada no dia em que o usuário trocar e voltar.
 */

/**
 * Exportada porque a administração do grupo precisa INVALIDÁ-LA: renomear uma
 * empresa em `/api/tenants` muda o nome que este seletor mostra. Ver
 * `empresas-do-grupo-api.ts`.
 */
export const CHAVE_VINCULOS = ['auth', 'tenants'] as const

export interface EmpresasDaSessao {
  empresas: VinculoDeEmpresa[]
  /** Vínculo correspondente ao `activeTenantId` da sessão; `null` enquanto não há contexto. */
  ativa: VinculoDeEmpresa | null
  carregando: boolean
  erro: boolean
  trocar: (tenantId: string) => void
  trocando: boolean
  falhaAoTrocar: boolean
}

export function useEmpresasDaSessao(): EmpresasDaSessao {
  const queryClient = useQueryClient()

  const vinculos = useQuery({
    queryKey: CHAVE_VINCULOS,
    queryFn: async () => {
      const resposta: RespostaDaApi = await authTenants()
      return dadosOuErro<VinculoDeEmpresa[]>(resposta, 'Falha ao carregar as empresas do usuário.')
    },
  })

  // O contexto vem do módulo de sessão (`useSessao`), não de uma consulta
  // própria: duas chaves para o mesmo `/auth/me` seriam duas requisições e dois
  // caches — e a guarda invalidaria um só, deixando o seletor com a empresa
  // anterior depois de trocar de usuário.
  const sessao = useSessao()

  /**
   * Trocar de empresa muda o escopo de TODO dado da tela — cliente, produto,
   * estoque e preço são por empresa. Por isso a invalidação é total e não
   * seletiva: qualquer lista que sobrevivesse à troca estaria mostrando dado da
   * empresa anterior, que é justamente o cruzamento que o projeto proíbe.
   */
  const troca = useMutation({
    mutationFn: async (tenantId: string) => {
      const resposta: RespostaDaApi = await authSetActiveTenant({ tenantId })
      if (!respostaOk(resposta)) throw new Error('Falha ao trocar de empresa.')
    },
    onSuccess: () => queryClient.invalidateQueries(),
  })

  const empresas = vinculos.data ?? []
  const ativaId = sessao.data?.activeTenantId ?? null

  return {
    empresas,
    ativa: empresas.find((e) => e.tenantId === ativaId) ?? null,
    carregando: vinculos.isPending || sessao.isPending,
    erro: vinculos.isError || sessao.isError,
    trocar: troca.mutate,
    trocando: troca.isPending,
    falhaAoTrocar: troca.isError,
  }
}
