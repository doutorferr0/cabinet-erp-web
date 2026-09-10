import { mkdirSync, readFileSync } from 'node:fs'
// Capturas das 11 listagens 2.0, nos dois temas, com o overlay de 8px.
//
// O `?grid` do `__root.tsx` é entrega da D1 e ainda não existe na base — aqui
// o overlay entra pelo mesmo caminho que ele usaria (`data-grid` na raiz +
// `docs/design/grid.css`), para a captura provar o alinhamento em múltiplos
// de 4 sem depender de uma issue que não mergeou.
import { chromium } from '/home/doutorferro/projetos/cabinet-erp-web/node_modules/.pnpm/playwright@1.62.1/node_modules/playwright/index.mjs'

const BASE = process.env.BASE ?? 'http://localhost:5173'
const SAIDA = process.env.SAIDA ?? 'docs/design/capturas/2.0'
const GRID = readFileSync('docs/design/grid.css', 'utf8')

const ROTAS = [
  ['ordens-de-compra', '/compras/ordens'],
  ['pedidos-de-compra', '/compras/pedidos'],
  ['orcamentos', '/vendas/orcamentos'],
  ['pedidos-de-venda', '/vendas/pedidos'],
  ['produtos', '/cadastros/produtos'],
  ['clientes', '/cadastros/clientes'],
  ['fornecedores', '/cadastros/fornecedores'],
  ['profissionais', '/cadastros/profissionais'],
  ['colaboradores', '/cadastros/colaboradores'],
  ['funis', '/crm/funis'],
  ['motivos-de-perda', '/crm/motivos'],
]

mkdirSync(SAIDA, { recursive: true })
const navegador = await chromium.launch()
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 900 } })
const pagina = await contexto.newPage()

for (const [nome, rota] of ROTAS) {
  for (const tema of ['claro', 'escuro']) {
    await pagina.goto(`${BASE}${rota}`, { waitUntil: 'networkidle' })
    await pagina.addStyleTag({ content: GRID })
    await pagina.evaluate((escuro) => {
      document.documentElement.dataset.grid = ''
      document.documentElement.classList.toggle('dark', escuro)
    }, tema === 'escuro')
    await pagina.waitForTimeout(700)
    await pagina.screenshot({ path: `${SAIDA}/${nome}-${tema}.png` })
    console.log(`${nome}-${tema}`)
  }
}

await navegador.close()
