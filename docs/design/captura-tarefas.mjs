/**
 * CAPTURA DO QUADRO DE TAREFAS (#489, D21) — claro, escuro e com o overlay de 8px.
 *
 * Irmão de `captura-kpi.mjs`, e pelo mesmo motivo: renderiza os COMPONENTES de
 * `src/features/tarefas/`, não uma reprodução em HTML. Reprodução à mão diverge
 * da peça no primeiro ajuste, e a captura passaria a provar uma tela que não
 * existe.
 *
 * ## O que este arquivo faz a mais que o da faixa
 *
 * `KpiTile` é puro; o `Quadro` NÃO é — ele pergunta as tarefas por
 * `useTarefas`, e cada cartão monta `useAlterarTarefa`. Então a cena entra
 * dentro de um `QueryClientProvider` com o cache PRÉ-POPULADO na mesma chave
 * que o hook usa (`[...CHAVES.tarefas, '']`). Sem isso o SSR sairia com os
 * quatro esqueletos de carregamento, que é uma captura verdadeira de outra
 * coisa.
 *
 * O arrasto não aparece aqui e é esperado: `draggable`/`dropTargetForElements`
 * entram por `useEffect`, que não roda em SSR. O que a captura prova é o
 * DESENHO — coluna, cartão, pílula, faixa —, e o gesto tem bateria própria em
 * `src/features/tarefas/quadro-arrasto.test.tsx`.
 *
 * O Playwright NÃO está no `node_modules` do repo (declarado no `package.json`,
 * ausente no store) e `package.json` tem dono único na rodada de design — então
 * o navegador entra por resolução opcional: `playwright`, e senão
 * `playwright-core` de onde `PLAYWRIGHT_DIR` apontar.
 *
 *   node docs/design/captura-tarefas.mjs [pasta-de-saida]
 *
 * Sai `tarefas-claro.png`, `tarefas-escuro.png` e `tarefas-grid.png` (overlay
 * de 8px de `docs/design/grid.css` — a prova de alinhamento em múltiplos de 4
 * que a §Hierarquia pede em toda PR).
 *
 * **Por que o overlay entra pelo `<style>` e não pelo `?grid` da URL:** o
 * gatilho `?grid` mora no `__root.tsx` e é entrega de D1, que não está mergeada
 * na base desta branch (`design/d11-kpi`). O CSS é o MESMO arquivo que ele
 * carregaria, e o atributo `data-grid` no `<html>` é o mesmo que ele poria.
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
const { Quadro } = await vite.ssrLoadModule('/src/features/tarefas/quadro.tsx')
const { FaixaDoQuadro } = await vite.ssrLoadModule('/src/features/tarefas/faixa.tsx')
const { CHAVES } = await vite.ssrLoadModule('/src/data/dashboard-api.ts')
const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query')
const { jsx, jsxs, Fragment } = await import('react/jsx-runtime')

/** O dia da cena, fixo: captura que lê o relógio muda de conteúdo a cada dia. */
const HOJE = '2026-09-03'

const pessoa = (id, name, initials) => ({ id, name, initials })
const LM = pessoa('u1', 'Lívia Moreira', 'LM')
const HF = pessoa('u2', 'Henrique Ferro', 'HF')
const JP = pessoa('u3', 'João Pedro', 'JP')
const RA = pessoa('u4', 'Rafael Alves', 'RA')

/** As oito tarefas da aba Quadro do mockup, com os campos que o DTO tem. */
const TAREFAS = [
  {
    id: 't1',
    title: 'Orçamento — Casa Jardim Botânico',
    description: 'Projeto luminotécnico completo, 3 pavimentos.',
    status: 'todo',
    priority: 'high',
    dueOn: '2026-09-05',
    commentCount: 4,
    attachmentCount: 2,
    assignees: [RA, LM],
  },
  {
    id: 't2',
    title: 'Cotação trilhos — 3 fornecedores',
    description: 'Comparar prazo e preço antes da ordem.',
    status: 'todo',
    priority: 'medium',
    dueOn: '2026-08-31',
    commentCount: 0,
    attachmentCount: 0,
    assignees: [HF],
  },
  {
    id: 't3',
    title: 'Cadastrar 8 produtos novos',
    description: null,
    status: 'todo',
    priority: 'low',
    dueOn: '2026-09-12',
    commentCount: 0,
    attachmentCount: 0,
    assignees: [RA],
  },
  {
    id: 't4',
    title: 'Pedido de compra #479 — Stella',
    description: 'Aguardando confirmação de frete.',
    status: 'doing',
    priority: 'medium',
    dueOn: '2026-09-03',
    commentCount: 6,
    attachmentCount: 3,
    assignees: [RA, HF],
  },
  {
    id: 't5',
    title: 'Conferência de estoque — galpão 2',
    description: 'Contagem cíclica das luminárias de trilho.',
    status: 'doing',
    priority: 'low',
    dueOn: '2026-09-04',
    commentCount: 0,
    attachmentCount: 0,
    assignees: [LM],
  },
  {
    id: 't6',
    title: 'Orçamento — loja Iguatemi (v3)',
    description: 'Revisão final antes do envio ao cliente.',
    status: 'review',
    priority: 'high',
    dueOn: '2026-09-03',
    commentCount: 9,
    attachmentCount: 5,
    assignees: [LM, JP],
  },
  {
    id: 't7',
    title: 'Orçamento aprovado — loft Cambuí',
    description: null,
    status: 'done',
    priority: 'medium',
    dueOn: '2026-08-31',
    commentCount: 12,
    attachmentCount: 4,
    assignees: [LM],
  },
  {
    id: 't8',
    title: 'Entrada NF 1204 no estoque',
    description: null,
    status: 'done',
    priority: 'low',
    dueOn: '2026-09-01',
    commentCount: 0,
    attachmentCount: 0,
    assignees: [RA],
  },
]

const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })
// A MESMA chave do hook: `useTarefas('')` monta `[...CHAVES.tarefas, '']`.
cliente.setQueryData([...CHAVES.tarefas, ''], TAREFAS)

const cena = jsx(QueryClientProvider, {
  client: cliente,
  children: jsxs('div', {
    style: { display: 'flex', flexDirection: 'column', gap: 'var(--s-5)' },
    children: [
      jsxs('header', {
        style: { display: 'flex', alignItems: 'flex-end', gap: 'var(--s-4)' },
        children: [
          jsxs('div', {
            children: [
              jsx('h1', { className: 't-pagina', children: 'Tarefas' }),
              jsx('p', {
                className: 't-meta',
                style: { marginTop: 'var(--s-1)' },
                children: '8 tarefas · 2 concluídas · 1 atrasada',
              }),
            ],
          }),
        ],
      }),
      jsx(FaixaDoQuadro, { tarefas: TAREFAS, hoje: HOJE }),
      jsx(Quadro, { busca: '', hoje: HOJE, aoIncluir: () => {} }),
    ],
  }),
})

const markup = renderToStaticMarkup(cena)

// O CSS vem do MESMO pipeline do app (`src/index.css` → Tailwind v4 →
// `tokens-2.0.css`), pedido ao Vite. `?direct` é o que devolve CSS de verdade:
// sem ele o Vite entrega o módulo JS que injeta o estilo, e um `<style>` com
// JavaScript dentro é simplesmente ignorado.
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
.palco { max-width: 1180px; }
</style></head>
<body><div class="palco">${markup}</div></body></html>`

const chromium = await abrirNavegador()
const navegador = await chromium.launch()
for (const [nome, tema, comGrid] of [
  ['tarefas-claro', 'claro', false],
  ['tarefas-escuro', 'escuro', false],
  ['tarefas-grid', 'claro', true],
]) {
  const aba = await navegador.newPage({
    viewport: { width: 1244, height: 900 },
    deviceScaleFactor: 2,
  })
  await aba.setContent(pagina(tema, comGrid))
  await aba.screenshot({ path: resolve(SAIDA, `${nome}.png`), fullPage: true })
  await aba.close()
  console.log(`${nome}.png`)
}
await navegador.close()
