// Capturas do D33: as TRÊS densidades da mesma listagem, com o overlay de 8px.
//
// O DoD da issue pede a captura nos três modos porque é ela que mostra o que o
// teste não vê: a largura da coluna igual entre os modos, o anel de foco da
// célula e a pílula de lote flutuando sem empurrar a grade.
//
// `networkidle` NÃO serve contra o dev server: o HMR mantém a conexão aberta e
// a espera estoura. O sinal de que a tela está pronta é a primeira linha da
// grade, e é por ela que se espera.
import { mkdirSync, readFileSync } from 'node:fs'
// Caminho absoluto no store do pnpm, como em `capturar-listagens.mjs`: o
// `playwright` é dependência de raiz e não aparece no `node_modules` da
// worktree, que é um symlink para o do repositório.
import { chromium } from '/home/doutorferro/projetos/cabinet-erp-web/node_modules/.pnpm/playwright@1.62.1/node_modules/playwright/index.mjs'

const BASE = process.env.BASE ?? 'http://localhost:5199'
const SAIDA = process.env.SAIDA ?? 'docs/design/capturas/2.0-planilha'
const GRID = readFileSync('docs/design/grid.css', 'utf8')
const ROTA = process.env.ROTA ?? '/cadastros/produtos'

const MODOS = [
  ['compacta', 'Compacta'],
  ['confortavel', 'Confortável'],
  ['planilha', 'Planilha'],
]

mkdirSync(SAIDA, { recursive: true })
const navegador = await chromium.launch()
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 900 } })
const pagina = await contexto.newPage()

// AQUECIMENTO: a primeira rota que o Vite serve compila o grafo inteiro, e com
// outro processo na máquina isso passa dos 30s padrão do `goto`.
await pagina.goto(`${BASE}${ROTA}`, { waitUntil: 'domcontentloaded', timeout: 180_000 })
await pagina.waitForSelector('[data-slot="grade"] tbody tr', { timeout: 180_000 })

for (const tema of ['claro', 'escuro']) {
  for (const [nome, rotulo] of MODOS) {
    await pagina.goto(`${BASE}${ROTA}`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
    await pagina.waitForSelector('[data-slot="grade"] tbody tr', { timeout: 120_000 })
    await pagina.addStyleTag({ content: GRID })
    await pagina.evaluate((escuro) => {
      document.documentElement.dataset.grid = ''
      document.documentElement.classList.toggle('dark', escuro)
    }, tema === 'escuro')

    await pagina.getByRole('button', { name: rotulo, exact: true }).click()

    if (nome === 'planilha') {
      // A célula focada é metade do que a captura tem de provar: sem o anel, a
      // imagem do modo Planilha é igual à da Compacta.
      // Segunda coluna da PRIMEIRA linha: a linha 0 existe sempre que a
      // consulta trouxe alguma coisa, e listagem com um registro só é caso
      // real (o mock de clientes tem um).
      await pagina.locator('[data-celula="0:1"]').click()
    } else {
      // Uma linha marcada: é o único jeito de a pílula de lote aparecer, e ela
      // é o item 2 da issue. O alvo é o WRAPPER com `role=checkbox` (react-aria
      // esconde o `<input>` atrás do indicador, e clicar no input é recusado
      // por interceptação de ponteiro).
      //
      // Nem toda listagem é marcável: a coluna do checkbox só existe onde a
      // tela declara ação que depende de seleção. Onde não há, a captura segue
      // sem a pílula em vez de derrubar a série inteira.
      // O alvo é a CÉLULA do checkbox, não o controle: o react-aria empilha
      // `<input class="sr-only">` + indicador, e o Playwright recusa o clique
      // no input dizendo que o indicador intercepta o ponteiro. A célula acerta
      // o indicador, que é onde o operador clica.
      const marca = pagina.locator('tbody tr').first().locator('td').first()
      if (await marca.count()) await marca.click({ timeout: 5_000 })
    }

    await pagina.waitForTimeout(500)
    await pagina.screenshot({ path: `${SAIDA}/${nome}-${tema}.png` })
    console.log(`${nome}-${tema}`)
  }
}

await navegador.close()
