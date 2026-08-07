import type { ProjectDto, ProjectPlanDto } from '@/api/gerado'
import { getProjectPlan, listProjects } from '@/api/gerado'
import { type RespostaDaApi, dadosOuErro, repetirSeValeAPena } from '@/data/api-provider'
import { useQuery } from '@tanstack/react-query'

/**
 * FRONTEIRA DO PLANNER — projetos e o plano de um projeto.
 *
 * Caminhos `Proposto` no contrato, servidos pelo handler do modo mock enquanto
 * o backend não existe (mesma situação do dashboard).
 */

export const CHAVES_PLANNER = {
  projetos: (filtro: string) => ['planner', 'projetos', filtro] as const,
  plano: (projectId: string) => ['planner', 'plano', projectId] as const,
}

/**
 * Os dois recortes do toggle. `active,proposed` numa string só porque é o que o
 * contrato descreve — o servidor recebe a lista, e não duas consultas.
 */
export const FILTROS = {
  emCurso: 'active,proposed',
  encerrados: 'closed',
} as const

export type FiltroDeProjeto = (typeof FILTROS)[keyof typeof FILTROS]

export function useProjetos(filtro: FiltroDeProjeto) {
  return useQuery({
    queryKey: CHAVES_PLANNER.projetos(filtro),
    retry: repetirSeValeAPena,
    queryFn: async () => {
      const resposta: RespostaDaApi = await listProjects({ status: filtro })
      return dadosOuErro<ProjectDto[]>(resposta, 'Falha ao carregar os projetos.')
    },
  })
}

/**
 * O plano de UM projeto. `enabled` só quando há projeto escolhido: sem isso a
 * primeira renderização pediria `/api/projects/undefined/plan` e receberia um
 * 404 que não significa nada.
 */
export function usePlanoDoProjeto(projectId: string | null) {
  return useQuery({
    queryKey: CHAVES_PLANNER.plano(projectId ?? ''),
    enabled: projectId !== null,
    retry: repetirSeValeAPena,
    queryFn: async () => {
      const resposta: RespostaDaApi = await getProjectPlan(projectId as string)
      return dadosOuErro<ProjectPlanDto>(resposta, 'Falha ao carregar o plano do projeto.')
    },
  })
}
