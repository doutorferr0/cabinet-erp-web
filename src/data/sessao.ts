import {
  type ChangePasswordRequest,
  type LoginRequest,
  authChangePassword,
  authLogin,
  authLogout,
  authMe,
} from '@/api/gerado'
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
      const { data, response } = await authMe()
      // Sem `response` a requisição nem saiu (rede) — falha, não "sem sessão".
      if (!response) throw new Error('Falha ao consultar a sessão.')
      if (response.status === 401) return null
      if (!data) throw new Error('Falha ao consultar a sessão.')
      return data
    },
  })
}

/**
 * Entrar: POST /auth/login e invalida a sessão para a guarda relê-la.
 *
 * O 401 do contrato traz `detail` pronto para exibição (mensagem do backend,
 * já em PT-BR). Qualquer outra falha vira mensagem genérica — detalhe interno
 * de rede/servidor não vaza para a tela.
 */
export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: LoginRequest) => {
      const { data, error } = await authLogin({ body })
      if (!data) throw new Error(error?.detail ?? 'Não foi possível entrar. Tente de novo.')
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SESSAO_KEY }),
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
      const { error, response } = await authLogout()
      if (error || response?.status !== 204) {
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
 */
export function useTrocarSenha() {
  return useMutation({
    mutationFn: async (body: ChangePasswordRequest) => {
      const { error, response } = await authChangePassword({ body })
      if (error || response?.status !== 204) {
        throw new Error(error?.detail ?? 'Não foi possível trocar a senha. Tente de novo.')
      }
    },
  })
}
