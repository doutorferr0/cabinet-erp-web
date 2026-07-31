import { type LoginRequest, authLogin, authMe } from '@/api/gerado'
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
