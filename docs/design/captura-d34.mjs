/**
 * CAPTURA DO BENTO (D34, #529) — dashboard e hub de módulo, claro e escuro.
 *
 * Prova as quatro coisas da rodada 5 que só a tela mostra: o herói a 40px com a
 * curva de 120px, a sombra ambiente no matiz por baixo da dura, a faixa de 3px
 * no rodapé de cada tile, e a assimetria do bento (1,6 no dashboard; herói 2×1
 * e atividade 2×2 no hub).
 *
 * Irmão de `captura-dashboard.mjs` (D20) e pelas mesmas razões: sobe o Vite de
 * verdade e navega até a ROTA, em vez de renderizar o componente à parte — o
 * bento depende do agregado que o MSW responde, e um harness próprio provaria
 * uma tela que ninguém abre.
 *
 * A contagem crescente dura 600 ms e a captura espera por ela: `colorScheme`
 * não é `reduce`, então o número está animando quando a tela monta, e capturar
 * cedo mostraria zero no lugar do dado.
 *
 * O Playwright NÃO está no `node_modules` do repo (declarado no `package.json`,
 * ausente no store) e `package.json` tem dono único na rodada de design — então
 * o navegador entra por resolução opcional: `playwright`, e senão
 * `playwright-core` de onde `PLAYWRIGHT_DIR` apontar (um
 * `npm i --no-save playwright-core` em pasta qualquer serve; o Chromium já está
 * no cache do usuário).
 *
 *   node docs/design/captura-d34.mjs [pasta-de-saida]
 */
import { mkdirSync, readFileSync, realpathSync } from 'node:fs'
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
const SAIDA = resolve(process.argv[2] ?? resolve(AQUI, 'capturas', 'd34'))
mkdirSync(SAIDA, { recursive: true })

const PORTA = Number(process.env.PORTA_DA_CAPTURA ?? 5201)
const grid = readFileSync(resolve(AQUI, 'grid.css'), 'utf-8')

const vite = await createServer({
  root: RAIZ,
  server: {
    port: PORTA,
    strictPort: true,
    // As fontes (`@fontsource/*`) vivem no `node_modules`, que numa worktree é
    // link para o checkout principal — e o allow-list do Vite recusa caminho
    // fora da raiz. Sem isto os woff2 dão 404 EM SILÊNCIO e a captura sai na
    // fonte de fallback, que é justamente o que esta rodada está trocando.
    fs: { allow: [RAIZ, realpathSync(resolve(RAIZ, 'node_modules'))] },
  },
  logLevel: 'warn',
})
await vite.listen()
const base = `http://localhost:${PORTA}`

const chromium = await abrirNavegador()
const navegador = await chromium.launch()

/** A tela pronta = pelo menos um tile do bento desenhado. */
const PRONTA = '[data-slot="kpi-tile"]'

async function capturar(nome, rota, { escuro = false, comGrid = false } = {}) {
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
  await pagina.goto(`${base}${rota}`, { waitUntil: 'domcontentloaded', timeout: 180_000 })
  await pagina.waitForSelector(PRONTA, { timeout: 180_000 })
  await pagina.reload({ waitUntil: 'domcontentloaded', timeout: 180_000 })
  await pagina.waitForSelector(PRONTA, { timeout: 180_000 })
  // Fontes: Gambarino e JetBrains Mono chegam por arquivo, e capturar antes
  // delas mostraria a tela na fonte de fallback — que é justamente o que a
  // rodada está trocando.
  await pagina.evaluate(() => document.fonts.ready)
  // A contagem crescente (600 ms) e o traço da curva (`cab-draw`, 900 ms + 200
  // de atraso) ainda estão correndo. Espera pelo FIM dos dois, senão o herói
  // sai com zero e a sparkline pela metade.
  await pagina.evaluate(() => new Promise((pronto) => setTimeout(pronto, 1400)))
  await pagina.screenshot({ path: resolve(SAIDA, `${nome}.png`), fullPage: true })
  await contexto.close()
  console.log(`✓ ${nome}.png`)
}

try {
  await capturar('dashboard-bento-claro', '/dashboard')
  await capturar('dashboard-bento-escuro', '/dashboard', { escuro: true })
  await capturar('dashboard-bento-grid', '/dashboard', { comGrid: true })
  await capturar('hub-compras-claro', '/compras')
  await capturar('hub-compras-escuro', '/compras', { escuro: true })
  await capturar('hub-compras-grid', '/compras', { comGrid: true })
} finally {
  await navegador.close()
  await vite.close()
}
