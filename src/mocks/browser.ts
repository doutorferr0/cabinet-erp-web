import { http, delay } from 'msw'
import { setupWorker } from 'msw/browser'
import { handlers } from './api/handlers'
import {
  armarExpiracaoDaProximaEscrita,
  expirarSessaoAgora,
  semearSessaoAutenticada,
} from './api/store'
import { handlersDePassagem } from './rotas-do-backend'

/**
 * Worker do modo mock (`VITE_API_MODE=mock`): intercepta o fetch NO NAVEGADOR,
 * no nível de rede — `src/data/*`, o cliente gerado e o DevTools veem
 * requisições reais. Só é importado (dinamicamente) quando o modo está ligado:
 * msw/faker não entram no bundle de produção.
 */

/**
 * LATÊNCIA ARTIFICIAL — o mock responde rápido demais para ser honesto.
 *
 * Sem ela, todo estado de carregamento passa em zero frame: esqueleto que nunca
 * aparece, botão que não chega a desabilitar, corrida entre duas consultas que
 * nunca acontece. O defeito existe desde já e só apareceria no dia da
 * integração, com o servidor de verdade e um backend novo para culpar.
 *
 * **Mora só aqui, e é isso que a mantém fora dos testes.** A suíte importa
 * `handlers` direto de `./api/handlers`; este arquivo é importado
 * dinamicamente só pelo `main.tsx` no modo mock. Não há flag para desligar em
 * teste porque não há nada ligado em teste.
 *
 * O handler é o PRIMEIRO da lista e resolve com `undefined`: no MSW isso é
 * "não tratei, passe adiante" — ele só espera e deixa o handler de verdade
 * responder. `VITE_MOCK_DELAY=0` desliga; sem a variável, 250ms, que é a faixa
 * de uma API saudável na mesma região.
 */
const ATRASO_MS = Number(import.meta.env.VITE_MOCK_DELAY ?? '250')

const atraso = http.all('*', async () => {
  if (ATRASO_MS > 0) await delay(ATRASO_MS)
  return undefined
})

/**
 * PASSTHROUGH POR ROTA — o que o backend já serve sai do mock, o resto fica.
 *
 * **Uma variável só governa as duas metades**, e é de propósito:
 * `VITE_API_PROXY` é lida aqui (`import.meta.env`) e no `vite.config.ts`
 * (`process.env`) — o Vite expõe ao cliente toda variável de ambiente com
 * prefixo `VITE_`. Duas chaves (uma para o proxy, outra para o passthrough)
 * poderiam divergir, e a divergência é silenciosa dos dois lados: passthrough
 * sem proxy faz `/api` cair no fallback da SPA e a tela recebe `index.html`
 * com status 200; proxy sem passthrough deixa o mock responder e o backend
 * nunca é exercitado.
 *
 * **O site público continua 100% mock.** O build da Cloudflare não define
 * `VITE_API_PROXY` (as env do painel são as do modo demo), então `passagem`
 * nasce vazia e nada em `cabinetonline.cc` tenta falar com `localhost:3000`.
 * Publicar o passthrough por padrão daria erro de rede em produção para
 * ganhar conveniência em dev.
 */
const backendReal = import.meta.env.VITE_API_PROXY
const passagem = backendReal ? handlersDePassagem() : []

export const worker = setupWorker(...passagem, atraso, ...handlers)

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

/**
 * COM BACKEND REAL, NÃO SE SEMEIA NADA — e isto não é preferência, é a única
 * saída correta.
 *
 * `/auth/*` inteiro está na lista de passagem: quem diz se há sessão passa a
 * ser o cookie `cabinet_sessao` do servidor. Semear o store aqui abriria uma
 * sessão que só existe dentro do navegador — a guarda deixaria a tela montar,
 * a appbar mostraria a empresa escolhida, e a primeira consulta traria 401 do
 * servidor. Dois donos da mesma verdade, e o operador vendo a errada.
 *
 * Quem roda contra o backend faz login de verdade, que é o ponto de rodar
 * contra o backend.
 */
if (!backendReal && !desligado) semearSessaoAutenticada()

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
 * **Com `VITE_API_PROXY` ligada o ensaio não vale para a SESSÃO**: `/auth/*`
 * passa direto e quem a derruba é o servidor, não este store. `expirarSessao()`
 * mexeria num store que ninguém mais consulta. O de escrita continua valendo
 * nas rotas que seguem mockadas.
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
