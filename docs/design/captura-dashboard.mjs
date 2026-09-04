/**
 * CAPTURA DO DASHBOARD 2.0 (#488, D20) — claro, escuro e o overlay de 8px.
 *
 * Captura a TELA VIVA no dev server do repo, e não uma cena SSR como
 * `captura-kpi.mjs` faz com a faixa de KPI. A diferença é de propósito: aquela
 * prova um COMPONENTE, e SSR de um componente é a forma mais honesta de provar
 * um componente. Esta prova uma PÁGINA — sidebar, appbar, três consultas, mês
 * corrente, tema — e uma cena SSR dessa página exigiria remontar router,
 * QueryClient semeado e sessão à mão. Cada peça remontada é uma peça que pode
 * divergir do app, e aí a captura passa a provar uma tela que ninguém abre.
 *
 * Roda em modo MOCK puro (sem `VITE_API_PROXY`), que é o modo do site público:
 * o MSW responde tudo e o autologin do mock abre a sessão sozinho.
 *
 *   node docs/design/captura-dashboard.mjs [pasta-de-saida]
 *
 * Sai `dashboard-claro.png`, `dashboard-escuro.png` e `dashboard-grid.png`
 * (overlay de `docs/design/grid.css` — a prova de alinhamento em múltiplos de 4
 * que a §Hierarquia pede em toda PR de tela).
 *
 * ## Três armadilhas pagas, e o que cada uma custou
 *
 * 1. **`networkidle` não chega.** O dev server mantém a conexão do HMR aberta,
 *    então a espera nunca resolve. A espera certa é `domcontentloaded` mais um
 *    SELETOR da própria tela.
 * 2. **Vite frio compila no primeiro request** (e mais ainda com outro agente
 *    usando a máquina): a primeira visita aquece, e só a segunda é a captura.
 *    Sem isso sai página em branco.
 * 3. **O tema mora em `localStorage['vitra-theme']`**, e precisa estar lá ANTES
 *    do primeiro paint — trocá-lo depois de carregar deixa a captura pegando a
 *    transição. Por isso `addInitScript`, e não um clique no alternador.
 *
 * O Playwright não está no `node_modules` do repo (declarado no `package.json`,
 * ausente no store) e `package.json` tem dono único na rodada de design — então
 * o navegador entra por resolução opcional, igual à `captura-kpi.mjs`:
 * `npm i --no-save playwright-core` numa pasta e `PLAYWRIGHT_DIR` apontando
 * para ela. O Chromium já está no cache do usuário.
 */
import { mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

async function abrirNavegador() {
  const candidatos = [
    'playwright',
    process.env.PLAYWRIGHT_DIR
      ? `${process.env.PLAYWRIGHT_DIR}/node_modules/playwright-core/index.mjs`
      : null,
    'playwright-core',
  ].filter(Boolean)
  for (const modulo of candidatos) {
    try {
      const { chromium } = await import(modulo)
      if (chromium?.launch) return chromium
    } catch {}
  }
  throw new Error(
    'Playwright não encontrado. `npm i --no-save playwright-core` numa pasta e ' +
      'aponte PLAYWRIGHT_DIR para ela — o package.json do repo tem dono único na rodada.',
  )
}

const AQUI = dirname(fileURLToPath(import.meta.url))
const RAIZ = resolve(AQUI, '..', '..')
const SAIDA = resolve(process.argv[2] ?? resolve(AQUI, 'capturas'))
mkdirSync(SAIDA, { recursive: true })

const PORTA = Number(process.env.PORTA_DA_CAPTURA ?? 5199)
const grid = readFileSync(resolve(AQUI, 'grid.css'), 'utf-8')

const vite = await createServer({
  root: RAIZ,
  server: { port: PORTA, strictPort: true },
  logLevel: 'warn',
})
await vite.listen()
const base = `http://localhost:${PORTA}`

const chromium = await abrirNavegador()
const navegador = await chromium.launch()

/** A tela pronta: os quatro KPIs desenhados e a grade dos três cards montada. */
const PRONTA = '[data-slot="kpi-tile"], [data-slot="grade-do-dashboard"]'

async function capturar(nome, { escuro = false, comGrid = false } = {}) {
  const contexto = await navegador.newContext({
    viewport: { width: 1440, height: 1024 },
    deviceScaleFactor: 2,
    colorScheme: escuro ? 'dark' : 'light',
  })
  // ANTES do primeiro paint: o tema é lido na montagem, e trocá-lo depois
  // captura a transição em vez do estado.
  await contexto.addInitScript(
    ([tema, css]) => {
      try {
        window.localStorage.setItem('vitra-theme', tema)
      } catch {}
      if (css) {
        document.addEventListener('DOMContentLoaded', () => {
          document.documentElement.dataset.grid = ''
          const estilo = document.createElement('style')
          estilo.textContent = css
          document.head.append(estilo)
        })
      }
    },
    [escuro ? 'dark' : 'light', comGrid ? grid : ''],
  )

  const pagina = await contexto.newPage()
  // Aquecimento: o primeiro request compila a árvore no Vite. Sem ele a
  // captura sai em branco, e o branco parece defeito da tela.
  await pagina.goto(`${base}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
  await pagina.waitForSelector(PRONTA, { timeout: 120_000 })
  await pagina.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 })
  await pagina.waitForSelector(PRONTA, { timeout: 120_000 })
  // Fontes: Gambarino e JetBrains Mono chegam por arquivo, e capturar antes
  // delas mostraria a tela na fonte de fallback — que é justamente o que a
  // rodada está trocando.
  await pagina.evaluate(() => document.fonts.ready)
  await pagina.screenshot({ path: resolve(SAIDA, `${nome}.png`), fullPage: true })
  await contexto.close()
  console.log(`✓ ${nome}.png`)
}

try {
  await capturar('dashboard-claro')
  await capturar('dashboard-escuro', { escuro: true })
  await capturar('dashboard-grid', { comGrid: true })
} finally {
  await navegador.close()
  await vite.close()
}
