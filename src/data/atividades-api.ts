import type {
  ActivityDto,
  ActivityDtoEntityType,
  ActivityDtoKind,
  ActivityWriteRequest,
  PagedResultOfActivityDto,
} from '@/api/gerado'
import { completeActivity, createActivity, listActivities, updateActivity } from '@/api/gerado'
import {
  PAGE_SIZE_MAX,
  type RespostaDaApi,
  dadosOuErro,
  repetirSeValeAPena,
} from '@/data/api-provider'
import { diaLocalISO } from '@/lib/datas'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

/**
 * FRONTEIRA DAS ATIVIDADES — o que está agendado sobre um registro qualquer.
 *
 * Os três caminhos entraram no contrato marcados `Proposto`: são pedido do front
 * ao backend que ainda não existe. No `VITE_API_MODE=mock` quem responde é
 * `src/mocks/api/atividades.ts`, e o painel não sabe a diferença — mesma
 * situação do CRM, do dashboard e do planner.
 *
 * ## O que esta fronteira decide, e o painel não
 *
 * **O alvo é um PAR, não uma rota.** `activities` é polimórfica no schema
 * mergeado (#66): `entity_type` + `entity_id`, sem FK para o alvo. Por isso a
 * consulta manda os dois juntos e nunca um só — uuid sem a tabela não identifica
 * nada, e o contrato responde 400 a quem tentar.
 *
 * **Concluir não passa pelo `PUT`.** O painel tem em mãos a LINHA, não o
 * registro inteiro; montar um `PUT` a partir dela apagaria prazo, responsável e
 * observação por omissão — a classe de defeito que
 * `cobertura-de-escrita.test.ts` vigia. Concluir é `POST .../done`, e quem
 * carimba a hora é o servidor.
 *
 * **A ordem vem do servidor.** O contrato publica a ordem do painel (pendentes
 * por prazo, depois concluídas da mais recente); reordenar aqui faria a tela
 * discordar da paginação no dia em que a lista passasse de uma página.
 */

export const URL_ATIVIDADES = '/api/activities'

/**
 * Whitelist de `sortBy` — a MESMA do contrato. Campo fora dela é 400, não
 * ordenação ignorada.
 */
export const ORDENAVEIS_ATIVIDADE: readonly string[] = ['dueDate', 'doneAt', 'kind', 'title']

/** O registro dono da atividade: tabela e id, sempre juntos. */
export interface AlvoDaAtividade {
  tipo: ActivityDtoEntityType
  id: string
}

/** Chaves de cache num lugar só: mutação que invalida a chave errada é bug mudo. */
export const CHAVES_ATIVIDADES = {
  tronco: ['atividades'] as const,
  doRegistro: (alvo: AlvoDaAtividade) => ['atividades', alvo.tipo, alvo.id] as const,
}

/**
 * As atividades de UM registro — pendentes e concluídas na mesma consulta.
 *
 * Pede a primeira página no teto do contrato em vez de paginar: o painel é uma
 * leitura lateral do cadastro, não uma listagem. O `total` volta junto para que
 * a tela possa dizer em voz alta quando houver mais do que ela mostra — recorte
 * silencioso viraria "não existe" para o operador.
 *
 * `enabled` só com alvo: sem ele a primeira renderização pediria
 * `?entityType=undefined` e receberia um 400 que não significa nada.
 */
export function useAtividades(alvo: AlvoDaAtividade | null) {
  return useQuery({
    queryKey: CHAVES_ATIVIDADES.doRegistro(alvo ?? { tipo: 'partner', id: '' }),
    enabled: alvo !== null,
    retry: repetirSeValeAPena,
    queryFn: async () => {
      const { tipo, id } = alvo as AlvoDaAtividade
      const resposta: RespostaDaApi = await listActivities({
        entityType: tipo,
        entityId: id,
        page: 1,
        pageSize: PAGE_SIZE_MAX,
      })
      return dadosOuErro<PagedResultOfActivityDto>(resposta, 'Falha ao carregar as atividades.')
    },
  })
}

/**
 * Toda mutação de atividade invalida o mesmo tronco (`['atividades']`).
 *
 * Invalidação fina economizaria requisição e pagaria com a classe de bug que
 * este repo já conhece: a mesma atividade aparece no painel do registro e, no
 * dia em que existir, na tela de "minhas atividades". Listar as chaves afetadas
 * em cada mutação é a lista que envelhece calada.
 */
function useInvalidarAtividades() {
  const cliente = useQueryClient()
  return () => cliente.invalidateQueries({ queryKey: CHAVES_ATIVIDADES.tronco })
}

export function useCriarAtividade() {
  const invalidar = useInvalidarAtividades()
  return useMutation({
    mutationFn: async (corpo: ActivityWriteRequest) => {
      const resposta: RespostaDaApi = await createActivity(corpo)
      return dadosOuErro<ActivityDto>(resposta, 'Falha ao agendar a atividade.')
    },
    onSuccess: invalidar,
  })
}

/**
 * `PUT` substitui a atividade INTEIRA — o corpo se monta do registro que veio do
 * servidor (`atividadeDoContrato`), nunca só dos campos que a tela mostra.
 */
export function useAlterarAtividade() {
  const invalidar = useInvalidarAtividades()
  return useMutation({
    mutationFn: async ({ id, corpo }: { id: string; corpo: ActivityWriteRequest }) => {
      const resposta: RespostaDaApi = await updateActivity(id, corpo)
      return dadosOuErro<ActivityDto>(resposta, 'Falha ao gravar a atividade.')
    },
    onSuccess: invalidar,
  })
}

/** Concluir é UMA intenção e UMA requisição; a hora é a do servidor. */
export function useConcluirAtividade() {
  const invalidar = useInvalidarAtividades()
  return useMutation({
    mutationFn: async (id: string) => {
      const resposta: RespostaDaApi = await completeActivity(id)
      return dadosOuErro<ActivityDto>(resposta, 'Falha ao concluir a atividade.')
    },
    onSuccess: invalidar,
  })
}

/* ------------------------------------------------------------------ *
 * A ATIVIDADE COMO O DIÁLOGO A EDITA
 * ------------------------------------------------------------------ */

/**
 * O registro do formulário. Nomes em português, como o resto do repo; a tradução
 * mora aqui e não na tela, para que a tela nunca monte corpo de contrato à mão.
 *
 * `alvoTipo`/`alvoId` são carregado-não-editado: o painel sabe de qual registro
 * está falando e o diálogo não oferece a troca — mudar de alvo é 400 no
 * contrato. Estão no registro porque o `PUT` leva a atividade inteira.
 */
export interface Atividade {
  id: string
  alvoTipo: ActivityDtoEntityType
  alvoId: string
  tipo: ActivityDtoKind
  titulo: string
  prazo: string
  responsavelId: string | null
  observacao: string
}

export function atividadeDoContrato(dto: ActivityDto): Atividade {
  return {
    id: dto.id,
    alvoTipo: dto.entityType,
    alvoId: dto.entityId,
    tipo: dto.kind,
    titulo: dto.title,
    prazo: dto.dueDate ?? '',
    responsavelId: dto.assigneeEmployeeId ?? null,
    observacao: dto.notes ?? '',
  }
}

/**
 * Texto vazio vira `null`, e é decisão: o contrato distingue "sem prazo" de
 * "prazo em branco", e `''` chegaria ao servidor como data inválida.
 */
export function atividadeParaContrato(atividade: Atividade): ActivityWriteRequest {
  return {
    entityType: atividade.alvoTipo,
    entityId: atividade.alvoId,
    kind: atividade.tipo,
    title: atividade.titulo,
    dueDate: atividade.prazo.trim() ? atividade.prazo : null,
    assigneeEmployeeId: atividade.responsavelId,
    notes: atividade.observacao.trim() ? atividade.observacao : null,
  }
}

/** Registro em branco do `Nova atividade` — local, o backend não fornece. */
export function atividadeVazia(alvo: AlvoDaAtividade): Atividade {
  return {
    id: '',
    alvoTipo: alvo.tipo,
    alvoId: alvo.id,
    tipo: 'call',
    titulo: '',
    prazo: '',
    responsavelId: null,
    observacao: '',
  }
}

/**
 * Atrasada = tem prazo, ainda não foi concluída, e o prazo já passou.
 *
 * A comparação é por DIA e no fuso local (`diaLocalISO`): `dueDate` é data sem
 * hora, e comparar com `Date.now()` faria a atividade de hoje nascer atrasada
 * depois do meio-dia em fuso negativo.
 */
export function atividadeAtrasada(dto: ActivityDto, hoje = diaLocalISO()): boolean {
  if (dto.doneAt) return false
  return Boolean(dto.dueDate) && (dto.dueDate as string) < hoje
}
