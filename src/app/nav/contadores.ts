import { listTasks } from '@/api/gerado'
import type { TaskDto } from '@/api/gerado'
import { type RespostaDaApi, dadosOuErro } from '@/data/api-provider'
import { NOTIFICACOES_MOCK } from '@/mocks/notificacoes'
import { useQuery } from '@tanstack/react-query'

/**
 * OS NÚMEROS DA BARRA — quantas tarefas e quantos avisos esperam o operador.
 *
 * ## Um hook, e não dois, porque é UMA pergunta
 *
 * A barra pergunta "o que me espera?", e hoje isso se responde em dois lugares
 * (`/api/tasks` e a casca de notificações). A D11 propõe no contrato o endpoint
 * de agregado que responde de uma vez; quando ele existir, o corpo desta função
 * troca e a barra não fica sabendo. É por isso que o hook existe: a tela nunca
 * viu as duas fontes.
 *
 * ## `retry: false` é requisito, não afinação
 *
 * Este hook roda em TODA rota, porque a barra está em toda rota. O repo já
 * pagou essa conta uma vez: uma consulta com repetição-com-espera montada no
 * shell derrubou o `waitFor` de testes que não falavam do assunto — o
 * `queryClient` seguia ocupado depois do fim do caso. Aqui a resposta que falha
 * não tem segunda chance: sem número é um estado legítimo da barra, e um
 * contador é ornamento perto de fazer a tela inteira esperar.
 *
 * Pelo mesmo motivo `staleTime` é longo: navegar entre telas não pode disparar
 * uma consulta por navegação.
 *
 * ## Ausente ≠ zero
 *
 * `undefined` quer dizer "não sei", e a barra não desenha nada. `0` quer dizer
 * "não há nada te esperando", e aí o número aparece — é informação, e boa.
 * Trocar um pelo outro faria o operador ler "nenhuma tarefa" quando o servidor
 * está fora do ar.
 */
export interface ContadoresNav {
  minhasTarefas: number | undefined
  caixaDeEntrada: number | undefined
}

/** Cinco minutos: a barra não é o quadro de tarefas, é o aviso de que ele tem algo. */
const FRESCOR_MS = 5 * 60 * 1000

export function useContadoresNav(): ContadoresNav {
  const tarefas = useQuery({
    queryKey: ['nav', 'contadores', 'tarefas'],
    retry: false,
    staleTime: FRESCOR_MS,
    queryFn: async () => {
      const resposta: RespostaDaApi = await listTasks()
      return dadosOuErro<TaskDto[]>(resposta, 'Falha ao contar as tarefas.')
    },
  })

  /**
   * A caixa de entrada ainda é CASCA — não há `/api/notifications` no contrato
   * (§@casca-global), e a D7 é quem transforma a gaveta em rota. O número sai
   * da mesma fonte que o sino já usa, para as duas metades nunca divergirem:
   * um contador na barra dizendo 3 com o sino dizendo 5 seria pior que nenhum.
   *
   * TODO(contract): D11 publica o agregado; até lá isto é tabela local.
   */
  const caixaDeEntrada = NOTIFICACOES_MOCK.filter((n) => !n.lida).length

  return {
    minhasTarefas: tarefas.data?.length,
    caixaDeEntrada,
  }
}
