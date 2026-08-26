import type { PlanItemDto, ProjectDto, ProjectPlanDto } from '@/api/gerado'
import { getProjectPlan, listProjects, reschedulePlanItem } from '@/api/gerado'
import { type RespostaDaApi, dadosOuErro, repetirSeValeAPena } from '@/data/api-provider'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

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

export interface Reagendamento {
  itemId: string
  startsOn: string
  endsOn: string
}

/**
 * O que o SVAR entrega quando alguém mexe numa barra.
 *
 * Tipado aqui, e de propósito mais frouxo que o `ITask` da lib: o evento chega
 * como `Partial`, e o que importa é o punhado de campos que este arquivo lê.
 */

/**
 * O plano com UM item já reagendado — a foto que a tela mostra enquanto o
 * `PATCH` viaja.
 *
 * Existe para o update otimista, e por isso é PURA: devolve um plano novo e não
 * toca no que o cache guardou. Mutar o objeto do cache faria o rollback do
 * `onError` restaurar um snapshot que já tinha sido alterado junto — o
 * desfazer não desfaria nada, e a barra ficaria no lugar errado depois de um
 * erro que a tela reportou corretamente.
 *
 * **A fase estica junto**, igual ao que o caminho do contrato declara. Sem
 * isso, arrastar um item para fora da fase mostraria, por meio segundo, uma
 * barra-resumo menor que o próprio filho — e o pisca-pisca ao chegar a resposta
 * do servidor leria como bug da tela, não como sincronia.
 */
export function planoComItemReagendado(plano: ProjectPlanDto, novo: Reagendamento): ProjectPlanDto {
  return {
    ...plano,
    phases: plano.phases.map((fase) => {
      if (!fase.items.some((item) => item.id === novo.itemId)) return fase

      const items = fase.items.map((item) =>
        item.id === novo.itemId ? { ...item, startsOn: novo.startsOn, endsOn: novo.endsOn } : item,
      )
      // Ordem lexicográfica basta em `YYYY-MM-DD` — é para isso que o ISO
      // serve, e é a mesma comparação que o mock faz do outro lado.
      return {
        ...fase,
        items,
        startsOn: items.reduce(
          (menor, i) => (i.startsOn < menor ? i.startsOn : menor),
          fase.startsOn,
        ),
        endsOn: items.reduce((maior, i) => (i.endsOn > maior ? i.endsOn : maior), fase.endsOn),
      }
    }),
  }
}

/**
 * REAGENDAR UM ITEM — o que o arraste da barra grava.
 *
 * ## Otimista, e otimista aqui não é enfeite
 *
 * O gesto é DIRETO: o operador larga a barra num lugar e o lugar é a resposta.
 * Esperar o servidor para desenhar faria a barra voltar ao ponto de origem e
 * saltar de novo alguns quadros depois — o mesmo movimento que uma tela quebrada
 * faz, e o operador não tem como distinguir os dois. Então a tela adianta o
 * resultado e paga o preço combinado: se der errado, ela DESFAZ, na frente de
 * quem fez, e diz o que houve.
 *
 * O desfazer é o snapshot de `onMutate`, restaurado inteiro em `onError` —
 * `setQueryData` com o plano anterior, não uma tentativa de reverter o
 * movimento. Reverter calculando de volta erraria no caso que mais importa: dois
 * arrastes rápidos, o primeiro falhando depois do segundo ter começado.
 *
 * ## `onSettled` invalida SEMPRE, e não só no erro
 *
 * A fase acompanha o item (regra do caminho no contrato) e é o servidor quem
 * decide o novo intervalo dela. O otimista já estica a fase para não piscar,
 * mas quem tem a palavra final é a resposta seguinte de `GetProjectPlan`. Sem a
 * invalidação no sucesso, um servidor que esticasse de forma diferente da nossa
 * ficaria divergente até alguém trocar de projeto e voltar.
 */
export function useReagendarItem(projectId: string | null) {
  const cliente = useQueryClient()
  const chave = CHAVES_PLANNER.plano(projectId ?? '')

  return useMutation({
    mutationFn: async (novo: Reagendamento) => {
      const resposta: RespostaDaApi = await reschedulePlanItem(projectId as string, novo.itemId, {
        startsOn: novo.startsOn,
        endsOn: novo.endsOn,
      })
      return dadosOuErro<PlanItemDto>(resposta, 'Falha ao reagendar o item do plano.')
    },

    onMutate: async (novo) => {
      // Sem o cancel, um `GET` que já estava no ar chega DEPOIS do nosso
      // `setQueryData` e reescreve o cache com as datas velhas — a barra volta
      // sozinha, sem erro nenhum no caminho.
      await cliente.cancelQueries({ queryKey: chave })
      const anterior = cliente.getQueryData<ProjectPlanDto>(chave)
      if (anterior) {
        cliente.setQueryData<ProjectPlanDto>(chave, planoComItemReagendado(anterior, novo))
      }
      return { anterior }
    },

    onError: (_erro, _novo, contexto) => {
      if (contexto?.anterior) cliente.setQueryData<ProjectPlanDto>(chave, contexto.anterior)
    },

    onSettled: () => cliente.invalidateQueries({ queryKey: chave }),
  })
}
