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
  if (!Array.isArray(views)) return []
  return views.filter((v) => v.route === rota).sort(porPosicao)
}

/** As fixadas na barra lateral, de TODAS as telas — é o grupo FAVORITOS. */
export function viewsFavoritas(views: readonly SavedViewDto[]): SavedViewDto[] {
  // Cinto e suspensório: `useViews` já normaliza, e mesmo assim isto fica. O
  // consumidor é a barra lateral, que aparece em cima de toda tela — o custo de
  // um `Array.isArray` é zero e o de não tê-lo foi uma tela em branco.
  if (!Array.isArray(views)) return []
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

/**
 * As views do usuário. **Sempre um array, mesmo quando o servidor mente.**
 *
 * A barra lateral monta em TODA rota autenticada, e é o único consumidor do app
 * que aparece em cima de qualquer tela. Se uma resposta não-lista chegasse até o
 * `filter`, o erro derrubaria a árvore INTEIRA — foi o que aconteceu, medido: um
 * teste de outra tela devolvia `{rows, total}` para qualquer caminho e o
 * `TypeError` do grupo de favoritos apagou a tela que estava sendo testada.
 *
 * É a mesma regra que o mock já aplica ao ler lixo do `localStorage`: perder as
 * views é aborrecimento, perder a tela por causa delas é defeito.
 *
 * ## `retry: false` e falha que vira lista vazia (D37)
 *
 * O argumento acima blindava a FORMA da resposta e parava aí. Faltava a outra
 * metade: a requisição que não responde. Desde que os favoritos da barra saíram
 * do `localStorage` e passaram a vir daqui, **toda rota autenticada consulta
 * esta coleção ao montar a casca** — inclusive nos ~40 testes de tela cujo
 * servidor falso não conhece o caminho e devolve `undefined`. Com o `retry`
 * padrão do TanStack (3 tentativas com backoff), a consulta ficava insistindo
 * em silêncio e ATRASAVA o fluxo da tela testada: um caso de orçamento passou a
 * contar uma escrita onde havia duas, e a mensagem falava de payload, não de
 * views. Reproduzido isolado, 3 de 3.
 *
 * Favorito é CONVENIÊNCIA. Insistir por ele atrasa o que o operador está
 * fazendo, e falhar por ele apaga a barra — nas duas pontas o custo é maior que
 * o benefício. Sem repetição, e a falha vira lista vazia: a barra fica sem o
 * grupo de favoritos e o resto da tela não sabe que houve pergunta.
 */
export function useViews() {
  return useQuery({
    queryKey: CHAVE_VIEWS,
    retry: false,
    queryFn: async () => {
      try {
        const resposta: RespostaDaApi = await listMyViews()
        const dados = dadosOuErro<SavedViewDto[]>(
          resposta,
          'Falha ao carregar as consultas salvas.',
        )
        return Array.isArray(dados) ? dados : []
      } catch {
        return []
      }
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
