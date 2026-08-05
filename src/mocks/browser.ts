import { setupWorker } from 'msw/browser'
import { handlers } from './api/handlers'
import { semearSessaoAutenticada } from './api/store'

/**
 * Worker do modo mock (`VITE_API_MODE=mock`): intercepta o fetch NO NAVEGADOR,
 * no nível de rede — `src/data/*`, o cliente gerado e o DevTools veem
 * requisições reais. Só é importado (dinamicamente) quando o modo está ligado:
 * msw/faker não entram no bundle de produção.
 */
export const worker = setupWorker(...handlers)

/**
 * Autologin de dev — LIGADO por padrão, e só aqui dentro.
 *
 * `pnpm dev` cai direto numa tela do app em vez de na tela de login. A trava
 * não muda: a guarda continua exigindo sessão e o `/auth/me` continua sendo
 * quem responde — o que muda é o store nascer com a sessão já aberta, como se
 * o login e a escolha de empresa já tivessem acontecido.
 *
 * Este arquivo é o único lugar possível para a chave: só o modo mock o importa
 * (import dinâmico no `main.tsx`), então `VITE_API_MODE=http` — API de verdade —
 * ignora a flag sem precisar testá-la.
 *
 *     pnpm dev                          # entra direto no app
 *     VITE_MOCK_AUTOLOGIN=0 pnpm dev    # 401 → tela de login, fluxo completo
 */
const desligado = ['0', 'false'].includes(import.meta.env.VITE_MOCK_AUTOLOGIN ?? '')
if (!desligado) semearSessaoAutenticada()
