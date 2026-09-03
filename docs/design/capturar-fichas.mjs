// Capturas das 9 fichas 2.0, nos dois temas, com o overlay de 8px.
//
// O `?grid` do `__root.tsx` é entrega da D1 e ainda não existe na base — aqui o
// overlay entra pelo mesmo caminho que ele usaria (`data-grid` na raiz +
// `docs/design/grid.css`), como a D14 já fez para as listagens.
//
// Os ids saem do PRÓPRIO MOCK, perguntados de dentro da página: o MSW vive no
// navegador, então `fetch('/api/partners?...')` ali devolve a semente que a
// tela vai abrir. Ids fixados à mão envelheceriam na primeira mudança de
// semente e a captura sairia em "não encontrado", com 200.
import { chromium } from '/home/doutorferro/projetos/cabinet-erp-web/node_modules/.pnpm/playwright@1.62.1/node_modules/playwright/index.mjs'
import { mkdirSync, readFileSync } from 'node:fs'

const BASE = process.env.BASE ?? 'http://localhost:5173'
const SAIDA = process.env.SAIDA ?? 'docs/design/capturas/2.0'
const GRID = readFileSync('docs/design/grid.css', 'utf8')

/** [nome do arquivo, caminho da listagem que dá o id, rota da ficha]. */
const FICHAS = [
  ['ficha-ordem-de-compra', '/api/purchase-orders?page=1&pageSize=1', '/compras/ordens/'],
  ['ficha-pedido-de-compra', '/api/purchase-requests?page=1&pageSize=1', '/compras/pedidos/'],
  ['ficha-orcamento', '/api/quotes?page=1&pageSize=1', '/vendas/orcamentos/'],
  ['ficha-pedido-de-venda', '/api/orders?page=1&pageSize=1', '/vendas/pedidos/'],
  ['ficha-produto', '/api/products?page=1&pageSize=1', '/cadastros/produtos/'],
  [
    'ficha-cliente',
    '/api/partners?role=customer&page=1&pageSize=1',
    '/cadastros/clientes/',
    '?modo=consulta',
  ],
  [
    'ficha-fornecedor',
    '/api/partners?role=supplier&page=1&pageSize=1',
    '/cadastros/fornecedores/',
    '?modo=consulta',
  ],
  [
    'ficha-profissional',
    '/api/partners?role=professional&page=1&pageSize=1',
    '/cadastros/profissionais/',
    '?modo=consulta',
  ],
  [
    'ficha-colaborador',
    '/api/employees?page=1&pageSize=1',
    '/cadastros/colaboradores/',
    '?modo=consulta',
  ],
]

mkdirSync(SAIDA, { recursive: true })
const navegador = await chromium.launch()
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 1000 } })
const pagina = await contexto.newPage()

// AQUECER antes de medir: a primeira rota compila o módulo no Vite, e com outro
// agente na máquina isso passa de 8 s. `networkidle` não serve — o HMR mantém a
// conexão aberta e o wait nunca resolve.
await pagina.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
await pagina.waitForSelector('[data-slot="sidebar"], main', { timeout: 120_000 })

for (const [nome, consulta, prefixo, sufixo = ''] of FICHAS) {
  const id = await pagina.evaluate(async (url) => {
    const r = await fetch(url, { credentials: 'include' })
    const corpo = await r.json()
    return corpo?.rows?.[0]?.id ?? null
  }, consulta)

  if (!id) {
    console.log(`${nome}: SEM SEMENTE (${consulta})`)
    continue
  }

  for (const tema of ['claro', 'escuro']) {
    await pagina.goto(`${BASE}${prefixo}${id}${sufixo}`, { waitUntil: 'domcontentloaded' })
    await pagina.waitForSelector('[data-slot="cabecalho-do-registro"]', { timeout: 120_000 })
    await pagina.addStyleTag({ content: GRID })
    await pagina.evaluate((escuro) => {
      document.documentElement.dataset.grid = ''
      document.documentElement.classList.toggle('dark', escuro)
    }, tema === 'escuro')
    await pagina.waitForTimeout(700)
    await pagina.screenshot({ path: `${SAIDA}/${nome}-${tema}.png`, fullPage: true })
    console.log(`${nome}-${tema}`)
  }
}

await navegador.close()
