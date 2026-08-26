import { defineConfig, devices } from '@playwright/test'

/**
 * O E2E DO PAR VIVO — navegador de verdade, Postgres de verdade, zero mock.
 *
 * `src/mocks/ao-vivo.test.ts` mede a FRONTEIRA: status, shape, e quem respondeu
 * cada rota. O que ele não tem como medir é a TELA montando o que voltou — ele
 * roda em Node, com `fetch` e sem DOM. Os dois defeitos mais caros deste repo
 * são exatamente dessa costura: id do servidor de um lado e id do mock do outro
 * (lista larga demais numa tela só), e resposta 200 com `index.html` dentro
 * (issue #226). Nenhum dos dois aparece num `expect(r.status).toBe(200)`.
 *
 * Daí um E2E, e daí ele ser MÍNIMO: um fluxo só, de ponta a ponta, nas rotas
 * que a passagem já manda para o Postgres — login → parceiro → produto →
 * orçamento → pedido. Não é uma suíte de tela; é a prova de que as cinco telas
 * do caminho principal falam com o servidor e mostram o que ele respondeu.
 *
 * ## Os dois servidores sobem daqui, e por quê
 *
 * `pnpm e2e` tem de ser UM comando. Enquanto subir o par fosse ritual de quatro
 * passos escritos num `CLAUDE.md`, o teste seria o que era antes desta issue:
 * documentação com asserção dentro. O que continua fora daqui é a SEMEADURA —
 * `pnpm --dir <api> setup:ci` —, porque ela precisa do Postgres, e Postgres é
 * `docker compose` no dev e *service container* no CI. Subir processo é igual
 * nos dois; subir banco não é.
 *
 * `reuseExistingServer` fica LIGADO fora do CI de propósito: quem já está com o
 * par local de pé (o caso normal de quem mexe nestas telas) roda o E2E contra
 * ele em vez de esperar dois boots. No CI ele só liga com `CABINET_PAR_EXTERNO`,
 * e o motivo está no comentário daquela constante.
 *
 * ## As portas são variáveis, e isso não é excesso de configuração
 *
 * Vários agentes trabalham neste repo ao mesmo tempo, cada um com o seu par
 * local. Porta fixa faz o segundo par responder `EADDRINUSE` — ou pior, faz o
 * teste medir o servidor do vizinho, que sobe, responde 200 e está no commit
 * errado.
 */

const PORTA_APP = process.env.CABINET_APP_PORT ?? '5173'
const PORTA_API = process.env.CABINET_API_PORT ?? '3000'
const APP = `http://localhost:${PORTA_APP}`
const API = `http://localhost:${PORTA_API}`

/**
 * Onde está o checkout do `cabinet-erp-api`. Sem padrão inventado do lado do
 * CI: lá o workflow faz o checkout em `api/` e passa o caminho. Localmente o
 * irmão ao lado é a convenção do `CLAUDE.md`, e é o único palpite honesto.
 */
const API_DIR = process.env.CABINET_API_DIR ?? '../cabinet-erp-api'

/**
 * O par já está de pé, e quem o subiu foi outra pessoa.
 *
 * No CI o workflow sobe api e Vite ANTES desta suíte, porque a mesma dupla serve
 * também ao `pnpm par:ao-vivo` (que roda em Node, e não teria como pedir a
 * Playwright que subisse nada). Sem esta chave, `reuseExistingServer: false` no
 * CI faria a suíte tentar subir um segundo Vite na porta ocupada e reprovar por
 * `EADDRINUSE` — vermelho por orquestração, num arquivo que existe para medir o
 * produto.
 *
 * Fora do CI o padrão continua sendo reaproveitar: quem mexe nestas telas já tem
 * o par local no ar, e esperar dois boots a cada execução é como se aprende a
 * não rodar a suíte.
 */
const PAR_EXTERNO = process.env.CABINET_PAR_EXTERNO === '1'

export default defineConfig({
  testDir: './e2e',
  // Um fluxo em cinco passos encadeados: o orçamento precisa do parceiro que o
  // passo anterior criou. Paralelizar arquivos é inofensivo; paralelizar DENTRO
  // do arquivo quebraria a corrente.
  fullyParallel: false,
  workers: 1,
  // Sem retry, e é decisão: retry num teste de integração transforma corrida em
  // verde intermitente, que é a forma mais cara de não medir nada.
  retries: 0,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  // O caso é UM, e ele atravessa cinco telas com escrita em três. 60s cobriam a
  // metade dele numa máquina de dev sem carga; o runner do CI é mais lento e a
  // primeira rota do Vite ainda compila sob demanda. Timeout apertado num teste
  // de integração produz vermelho por ambiente, que é como uma suíte aprende a
  // ser ignorada — o mesmo motivo que mantinha o `ao-vivo.test.ts` desligado.
  timeout: 240_000,
  expect: {
    // O app do Vite leva ~24s a frio na primeira rota (medido): asserção com
    // espera curta vê tela vazia, zero erro e zero rede, e conclui o contrário
    // do que está acontecendo.
    timeout: 15_000,
  },
  use: {
    baseURL: APP,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      // `node --env-file-if-exists=.env` e não `pnpm start`: o `start` do api
      // NÃO lê o `.env`, e a falha sai como `SESSION_SECRET` ausente — erro que
      // não se parece nada com "faltou o arquivo de ambiente".
      command: `pnpm --dir ${API_DIR} exec node --env-file-if-exists=.env src/main.ts`,
      // `/health` e não a raiz: a raiz do api não serve nada, e esperar por ela
      // daria timeout num servidor perfeitamente de pé.
      url: `${API}/health`,
      env: { PORT: PORTA_API },
      reuseExistingServer: PAR_EXTERNO || !process.env.CI,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: `pnpm exec vite --port ${PORTA_APP} --strictPort`,
      url: APP,
      // A MESMA variável que o `vite.config.ts` lê para montar o proxy e que
      // `src/mocks/browser.ts` lê para ligar a passagem. Sem ela o MSW responde
      // TUDO e o E2E mediria o mock com cara de integração — o defeito exato
      // que esta suíte existe para não deixar acontecer.
      env: { VITE_API_PROXY: API },
      reuseExistingServer: PAR_EXTERNO || !process.env.CI,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
})
