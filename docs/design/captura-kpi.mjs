/**
 * CAPTURA DA FAIXA DE KPI (#479, D11) — claro e escuro, com o overlay de 8px.
 *
 * Renderiza o COMPONENTE de `src/components/cabinet/kpi-tile.tsx`, não uma
 * reprodução em HTML: reprodução à mão diverge da peça no primeiro ajuste, e a
 * captura passaria a provar uma tela que não existe.
 *
 * Carrega o componente pelo **SSR do próprio Vite**, e não por um bundler
 * configurado aqui: assim o alias `@/`, o JSX e o TS saem do `vite.config.ts`
 * do repo. Um segundo resolvedor escrito neste arquivo divergiria do de
 * verdade, e a captura provaria um build que ninguém publica.
 *
 * O Playwright NÃO está no `node_modules` do repo (declarado no
 * `package.json`, ausente no store) e `package.json` tem dono único na rodada
 * de design — então o navegador entra por resolução opcional: `playwright`, e
 * senão `playwright-core` de onde `PLAYWRIGHT_DIR` apontar (um
 * `npm i --no-save playwright-core` em pasta qualquer serve; o binário do
 * Chromium já está no cache do usuário).
 *
 *   node docs/design/captura-kpi.mjs [pasta-de-saida]
 *
 * Sai `kpi-claro.png`, `kpi-escuro.png` e `kpi-grid.png` (overlay de 8px de
 * `docs/design/grid.css`, a prova de alinhamento em múltiplos de 4 que a
 * §Hierarquia pede em toda PR).
 */
import { mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
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

const vite = await createServer({
  root: RAIZ,
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'warn',
})
const { FaixaDeKpi, KpiTile } = await vite.ssrLoadModule('/src/components/cabinet/kpi-tile.tsx')
const { TotalBox } = await vite.ssrLoadModule('/src/components/cabinet/total-box.tsx')
const { jsx, jsxs, Fragment } = await import('react/jsx-runtime')

// A faixa de uma listagem de ordens de compra, com os quatro casos que o
// componente precisa saber desenhar: dinheiro, contagem com unidade, alerta e
// série. É o quadro do mockup (Listagem › kpis).
const cena = jsxs(Fragment, {
  children: [
    jsxs(FaixaDeKpi, {
      children: [
        jsx(KpiTile, {
          rotulo: 'Em aberto',
          valorCentavos: 3_841_000,
          nota: '9 ordens',
          delta: 12,
          tint: 'lilac',
        }),
        jsx(KpiTile, {
          rotulo: 'Chegando esta semana',
          valor: '3',
          unidade: 'ordens',
          nota: 'EVOLED · STELLA · INTERLIGHT',
          tint: 'sky',
        }),
        jsx(KpiTile, {
          rotulo: 'Atrasadas',
          valor: '2',
          alerta: true,
          nota: 'R$ 7.735 parados · maior: 8 dias',
          tint: 'sand',
        }),
        jsx(KpiTile, {
          rotulo: 'Recebido no mês',
          valorCentavos: 11_298_000,
          nota: 'Agosto · 21 ordens',
          serie: [42, 51, 47, 63, 60, 78, 74, 96],
          tint: 'mint',
        }),
      ],
    }),
    jsx('div', {
      style: { display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--s-5)' },
      children: jsx(TotalBox, { valorCentavos: 18_240_000 }),
    }),
  ],
})

const markup = renderToStaticMarkup(cena)

// O CSS vem do MESMO pipeline do app (`src/index.css` → Tailwind v4 →
// `tokens-2.0.css`), pedido ao Vite. Escrever aqui as poucas utilitárias que o
// componente usa faria a captura provar um CSS de mentira: `display:grid` sem
// Tailwind não existe, e a primeira versão desta captura empilhou os quatro
// tiles em coluna por causa disso — o defeito era da captura, não da peça.
// `?direct` é o que devolve CSS DE VERDADE: sem ele o Vite entrega o módulo
// JS que injeta o estilo, e um `<style>` com JavaScript dentro é simplesmente
// ignorado — a segunda versão desta captura saiu sem borda, sem tint e sem
// espaçamento por causa disso, e parecia defeito do componente.
const css = (await vite.transformRequest('/src/index.css?direct')).code
await vite.close()

const grid = readFileSync(resolve(AQUI, 'grid.css'), 'utf-8')

const pagina = (tema, comGrid) => `<!doctype html>
<html lang="pt-BR"${tema === 'escuro' ? ' class="dark" data-theme="dark"' : ''}${comGrid ? ' data-grid=""' : ''}>
<head><meta charset="utf-8">
<style>
${css}
${comGrid ? grid : ''}
body { margin: 0; padding: 32px; background: var(--bancada, var(--n-100)); font-family: var(--font-sans, system-ui); }
.palco { max-width: 1040px; }
</style></head>
<body><div class="palco">${markup}</div></body></html>`

const chromium = await abrirNavegador()
const navegador = await chromium.launch()
for (const [nome, tema, comGrid] of [
  ['kpi-claro', 'claro', false],
  ['kpi-escuro', 'escuro', false],
  ['kpi-grid', 'claro', true],
]) {
  const aba = await navegador.newPage({
    viewport: { width: 1104, height: 380 },
    deviceScaleFactor: 2,
  })
  await aba.setContent(pagina(tema, comGrid))
  await aba.screenshot({ path: resolve(SAIDA, `${nome}.png`) })
  await aba.close()
  console.log(`${nome}.png`)
}
await navegador.close()
