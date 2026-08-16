import {
  type ChangePasswordRequest,
  type LoginOk,
  type LoginRequest,
  type SessaoAtual,
  authChangePassword,
  authLogin,
  authLogout,
  authMe,
} from '@/api/gerado'
import { type RespostaDaApi, detalheDoProblema } from '@/data/api-provider'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

/**
 * Sessão do usuário (ADR-010): a autenticação é um COOKIE opaco — o front
 * nunca vê token, só pergunta "quem sou eu?" (`/auth/me`) e recebe a sessão.
 *
 * Não entra no registry de `src/data/index.ts` pelo mesmo motivo do boletim:
 * não é `ListProvider`, é consulta fechada. A regra de acesso vale igual:
 * telas e guarda pedem daqui, nunca chamam `authMe` direto.
 */
export const SESSAO_KEY = ['sessao'] as const

/**
 * A sessão atual, ou `null` quando NÃO HÁ sessão.
 *
 * `null` é resposta, não falha: o 401 do `/auth/me` significa "não autenticado"
 * e quem decide o que fazer com isso é a guarda (`RequireSession`). Falha de
 * verdade (rede, 5xx) continua erro — redirecionar para o login com o servidor
 * fora do ar criaria um ciclo que também não entra.
 */
export function useSessao() {
  return useQuery({
    queryKey: SESSAO_KEY,
    retry: false,
    queryFn: async () => {
      const resposta: RespostaDaApi = await authMe()
      // `status: 0` = a requisição nem saiu (rede) — falha, não "sem sessão".
      if (resposta.status === 0) throw new Error('Falha ao consultar a sessão.')
      if (resposta.status === 401) return null
      if (resposta.status !== 200 || !resposta.data) {
        throw new Error('Falha ao consultar a sessão.')
      }
      return resposta.data as SessaoAtual
    },
  })
}

/**
 * Entrar: POST /auth/login e invalida TUDO, não só a sessão.
 *
 * Trocar de usuário é trocar de identidade: os vínculos (`['auth','tenants']`)
 * e qualquer lista em cache pertencem a quem saiu. Invalidar só a sessão
 * deixava o seletor exibindo a empresa do usuário ANTERIOR por até 30s
 * (staleTime) depois de um re-login — furo registrado na memória (pendência
 * 5), mesma classe de bug que a unificação do `/auth/me` resolveu. A regra é
 * a do logout: invalidação total.
 *
 * O 401 do contrato traz `detail` pronto para exibição (mensagem do backend,
 * já em PT-BR). Qualquer outra falha vira mensagem genérica — detalhe interno
 * de rede/servidor não vaza para a tela.
 */
export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: LoginRequest) => {
      const resposta: RespostaDaApi = await authLogin(body)
      if (resposta.status !== 200 || !resposta.data) {
        throw new Error(
          detalheDoProblema(resposta.data) ?? 'Não foi possível entrar. Tente de novo.',
        )
      }
      return resposta.data as LoginOk
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries()
      // A sessão é REBUSCADA, não só invalidada, e o `await` importa.
      //
      // `invalidateQueries` refaz apenas as consultas ATIVAS, e o `/auth/me`
      // está inativo enquanto se está no login — nenhuma guarda montada o
      // observa. Ele ficava marcado como velho com o `null` do 401 ainda em
      // cache; a tela navegava para a rota de destino, a guarda montava, lia
      // esse `null` e devolvia para o login. Quem entrava a partir de uma rota
      // profunda (sessão vencida no meio do trabalho) não conseguia voltar.
      //
      // Não aparecia antes porque o destino do login era sempre `/dashboard`,
      // e quem chega nele acabou de vir de uma tela que já mantinha o
      // `/auth/me` ativo.
      await queryClient.refetchQueries({ queryKey: SESSAO_KEY })
    },
  })
}

/**
 * Sair: POST /auth/logout → 204 (o cookie morre no servidor) e TODA consulta é
 * invalidada — mesma regra da troca de empresa, um nível acima: sessão,
 * vínculos e listas pertencem a quem saiu e não podem ser reaproveitados.
 *
 * Por que `invalidateQueries` e não `clear()`: o `clear()` remove as queries
 * do cache SEM avisar os observers montados — a guarda fica exibindo o
 * resultado velho para sempre e o redirect para `/login` nunca acontece
 * (provado em teste de rota). Com a invalidação total, o `/auth/me` ativo é
 * reconsultado, recebe 401 e a guarda redireciona sozinha; as inativas ficam
 * marcadas como velhas e são reconsultadas na próxima montagem — nenhum dado
 * do usuário que saiu sobrevive reutilizável.
 */
export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const resposta: RespostaDaApi = await authLogout()
      if (resposta.status !== 204) {
        throw new Error('Não foi possível sair. Tente de novo.')
      }
    },
    onSuccess: () => queryClient.invalidateQueries(),
  })
}

/**
 * Trocar a senha: POST /auth/change-password → 204 (sem corpo).
 *
 * O 400 do contrato traz `detail` pronto para exibição (senha atual errada,
 * política de senha nova etc. — a regra é do backend, o front só ecoa).
 *
 * Sucesso INVALIDA a sessão porque a troca muda o `mustChangePassword` que o
 * `/auth/me` devolve. Sem isso, a guarda leria o valor velho (`true`) do cache
 * e mandaria de volta para `/trocar-senha` quem acabou de trocar — laço no
 * caminho de saída. Só a sessão: nada mais mudou de dono.
 */
export function useTrocarSenha() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: ChangePasswordRequest) => {
      const resposta: RespostaDaApi = await authChangePassword(body)
      if (resposta.status !== 204) {
        throw new Error(
          detalheDoProblema(resposta.data) ?? 'Não foi possível trocar a senha. Tente de novo.',
        )
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SESSAO_KEY }),
  })
}
