import { setupWorker } from 'msw/browser'
import { handlers } from './api/handlers'
import {
  armarExpiracaoDaProximaEscrita,
  expirarSessaoAgora,
  semearSessaoAutenticada,
} from './api/store'

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

/**
 * Ensaio de sessão, à mão, no console do navegador (#124, ponto 4).
 *
 * O pior caso do trilho — o cookie vencer entre abrir o formulário e clicar em
 * Gravar — não tinha como ser PROVOCADO no modo mock: existia só dentro do
 * teste, e ninguém conseguia ver a tela reagir. Sem isto, "conferido rodando
 * nos dois temas" (DoD da #124) não era executável.
 *
 *     cabinetMock.expirarProximaEscrita()   // preencha, clique em Gravar → 401
 *     cabinetMock.expirarSessao()           // qualquer tela → login, com a rota guardada
 *
 * Fica AQUI, e não num componente ou rota de dev: este arquivo só é importado
 * pelo modo mock (import dinâmico no `main.tsx`), então `VITE_API_MODE=http`
 * jamais o carrega — a superfície não existe fora do ensaio, em vez de existir
 * protegida por uma condição que alguém pode inverter sem perceber.
 */
declare global {
  interface Window {
    cabinetMock?: {
      expirarProximaEscrita: () => void
      expirarSessao: () => void
    }
  }
}

window.cabinetMock = {
  expirarProximaEscrita: () => {
    armarExpiracaoDaProximaEscrita()
    console.info('[mock] próxima gravação vai responder 401 — a tela deve oferecer reentrada.')
  },
  expirarSessao: () => {
    expirarSessaoAgora()
    console.info('[mock] sessão derrubada — a próxima leitura manda para o login.')
  },
}
