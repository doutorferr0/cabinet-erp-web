import type { SavedViewDto, SavedViewWriteRequest } from '@/api/gerado'
import { createMyView, deleteMyView, listMyViews, updateMyView } from '@/api/gerado'
import { type RespostaDaApi, dadosOuErro, respostaOk } from '@/data/api-provider'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

/**
 * FRONTEIRA DAS VIEWS SALVAS — `/api/me/views` (D13).
 *
 * Uma view é a consulta que o operador refaz toda segunda-feira, com nome:
 * filtros, junção, ordem, agrupamento, colunas e visão. **A tela não fala com
 * `localStorage` nem com o cliente gerado** — pede daqui, como manda a regra de
 * acesso a dado, e é isso que faz a troca mock → HTTP mexer neste arquivo e em
 * mais nenhum.
 *
 * ## UMA consulta para o app inteiro, não uma por tela
 *
 * A chave é fixa (`['me', 'views']`) e a lista vem inteira, sem `route`. Duas
 * razões, e a segunda é a que decide:
 *
 * 1. São unidades por tela — paginar preferência pessoal daria barra lateral
 *    que continua na página 2.
 * 2. **O grupo FAVORITOS mostra as views de TODAS as telas ao mesmo tempo.** Com
 *    uma consulta por rota, a barra lateral precisaria de uma requisição por
 *    item do menu, e favoritar dentro de uma listagem invalidaria só o cache
 *    daquela rota — a estrela acenderia na aba e a sidebar continuaria sem o
 *    item até o próximo F5. **É por isso que existe uma chave só**, e é o que
 *    dá o "sem reload" do DoD: o `invalidateQueries` de qualquer escrita
 *    redesenha aba e sidebar juntas, porque as duas leem o mesmo cache.
 *
 * O recorte por tela é do consumidor (`viewsDaRota`), não do servidor.
 */

export const CHAVE_VIEWS = ['me', 'views'] as const

/**
 * `position` primeiro, `name` para desempatar.
 *
 * O campo é opcional no DTO, e a view gravada antes de haver ordem cai em zero —
 * o que a joga para o começo do bloco, onde o nome decide. Sem o desempate, duas
 * views sem posição trocariam de lugar entre dois carregamentos.
 */
function porPosicao(a: SavedViewDto, b: SavedViewDto): number {
  return (a.position ?? 0) - (b.position ?? 0) || a.name.localeCompare(b.name, 'pt-BR')
}

/** Só as de uma tela, na ordem gravada. Empate por nome, para não trocar de lugar. */
export function viewsDaRota(views: readonly SavedViewDto[], rota: string): SavedViewDto[] {
  return views.filter((v) => v.route === rota).sort(porPosicao)
}

/** As fixadas na barra lateral, de TODAS as telas — é o grupo FAVORITOS. */
export function viewsFavoritas(views: readonly SavedViewDto[]): SavedViewDto[] {
  return views.filter((v) => v.favorite).sort(porPosicao)
}

/**
 * O corpo de escrita a partir de uma view existente.
 *
 * **PUT substitui o registro inteiro** (regra do contrato), então renomear
 * mandando só `{ name }` apagaria filtros, cor e a estrela. Este helper existe
 * para que nenhum chamador precise lembrar disso: parte da view atual e troca o
 * que mudou.
 */
export function corpoDaView(
  view: SavedViewDto,
  mudancas: Partial<SavedViewWriteRequest> = {},
): SavedViewWriteRequest {
  const { id: _id, ...resto } = view
  return { ...resto, ...mudancas }
}

export function useViews() {
  return useQuery({
    queryKey: CHAVE_VIEWS,
    queryFn: async () => {
      const resposta: RespostaDaApi = await listMyViews()
      return dadosOuErro<SavedViewDto[]>(resposta, 'Falha ao carregar as consultas salvas.')
    },
  })
}

export interface EscritaDeView {
  criar: (corpo: SavedViewWriteRequest) => void
  gravar: (args: { id: string; corpo: SavedViewWriteRequest }) => void
  excluir: (id: string) => void
  gravando: boolean
  falhou: boolean
}

/**
 * As três escritas, com a MESMA invalidação.
 *
 * Nenhuma delas atualiza o cache na mão: uma escrita que mexe em `favorite`
 * muda o que a sidebar mostra, e outra que muda `position` muda a ORDEM das
 * duas listas. Reproduzir isso no cliente seria manter uma segunda cópia da
 * regra de ordenação do servidor, que divergiria na primeira mudança dela.
 */
export function useEscritaDeView(): EscritaDeView {
  const queryClient = useQueryClient()
  const invalidar = () => queryClient.invalidateQueries({ queryKey: CHAVE_VIEWS })

  const criar = useMutation({
    mutationFn: async (corpo: SavedViewWriteRequest) => {
      const resposta: RespostaDaApi = await createMyView(corpo)
      if (!respostaOk(resposta)) throw new Error('Falha ao salvar a consulta.')
    },
    onSuccess: invalidar,
  })

  const gravar = useMutation({
    mutationFn: async ({ id, corpo }: { id: string; corpo: SavedViewWriteRequest }) => {
      const resposta: RespostaDaApi = await updateMyView(id, corpo)
      if (!respostaOk(resposta)) throw new Error('Falha ao gravar a consulta.')
    },
    onSuccess: invalidar,
  })

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const resposta: RespostaDaApi = await deleteMyView(id)
      if (!respostaOk(resposta)) throw new Error('Falha ao excluir a consulta.')
    },
    onSuccess: invalidar,
  })

  return {
    criar: criar.mutate,
    gravar: gravar.mutate,
    excluir: excluir.mutate,
    gravando: criar.isPending || gravar.isPending || excluir.isPending,
    falhou: criar.isError || gravar.isError || excluir.isError,
  }
}
