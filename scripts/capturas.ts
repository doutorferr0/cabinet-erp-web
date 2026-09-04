/**
 * Varredura de capturas da Reface 2.0 — D36 (#531).
 *
 * Percorre TODAS as rotas do `src/routeTree.gen.ts` num navegador de verdade e
 * grava um PNG por rota × tema (× overlay de 8px). O alvo é comparar a `main`
 * (1.7) com a `design/2.0` lado a lado e ter onde apontar o dedo na revisão —
 * "a fonte está errada aqui" precisa de um arquivo, não de uma lembrança.
 *
 *     node --experimental-strip-types scripts/capturas.ts --versao=2.0
 *     node --experimental-strip-types scripts/capturas.ts --versao=1.7   # numa worktree da main
 *     node --experimental-strip-types scripts/capturas.ts --readme       # monta o lado a lado
 *
 * A lista de rotas NÃO é escrita à mão: sai do `routeTree.gen.ts` do checkout
 * onde o script roda. Rota que a rodada acrescentar entra sozinha, e a
 * comparação 1.7 × 2.0 mostra em qual das duas versões a rota existe.
 *
 * Por que este script sobe o próprio Vite, com config própria:
 *
 * 1. **`node_modules` da worktree é symlink para o checkout pai.** As fontes do
 *    `@fontsource` viram `/@fs/<pai>/…`, caem fora do `server.fs.allow` padrão e
 *    voltam 403 — a página nunca dispara `load` e a captura sai com a
 *    tipografia errada. Daí o `fs.allow` com os dois caminhos.
 * 2. **O cache de dependências é compartilhado pelo symlink.** Outro agente
 *    rodando `pnpm dev`/vitest invalida `node_modules/.vite` no meio da
 *    varredura e a página morre com `504 Outdated Optimize Dep`. Daí o
 *    `cacheDir` próprio, fora do symlink.
 *
 * E por que nada de `networkidle`: o MSW e o websocket do HMR mantêm conexão
 * aberta o tempo todo — `networkidle` estoura por definição, não por lentidão.
 * A espera é por seletor, com um passe de aquecimento antes (o Vite compila o
 * grafo sob demanda e a primeira visita a frio leva dezenas de segundos).
 */

import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { type Browser, type Page, chromium } from '@playwright/test'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// ---------------------------------------------------------------------------
// Argumentos
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2)
function arg(nome: string): string | undefined {
  const achado = argv.find((a) => a === `--${nome}` || a.startsWith(`--${nome}=`))
  if (!achado) return undefined
  const [, valor] = achado.split('=')
  return valor ?? ''
}
const temFlag = (nome: string) => arg(nome) !== undefined

const versao = arg('versao') || '2.0'
const saida = path.resolve(raiz, arg('saida') || `docs/design/capturas/${versao}`)
const filtroDeRotas = (arg('rotas') || '')
  .split(',')
  .map((r) => r.trim())
  .filter(Boolean)

/** Viewport da rodada — o mockup foi desenhado em 1440 (#469). */
const LARGURA = 1440
const ALTURA = 900

// ---------------------------------------------------------------------------
// Rotas — do routeTree, nunca à mão
// ---------------------------------------------------------------------------

/**
 * Endpoint de onde sai um id de exemplo para cada rota `$param`.
 *
 * O id vem do MSW em execução, e não de uma constante: as sementes mudam a cada
 * `pnpm dev` (faker), então id fixo daria "não encontrado" com cara de tela
 * quebrada. Rota cuja família não estiver aqui é capturada como `novo` — o
 * formulário em branco ainda é uma tela para revisar —, e o manifesto REGISTRA
 * que foi assim, para ninguém ler a captura como sendo a de uma ficha cheia.
 */
const LISTAGEM_DO_PARAMETRO: Record<string, string> = {
  '/cadastros/clientes/$clienteId': '/api/partners?role=customer&pageSize=1',
  '/cadastros/fornecedores/$fornecedorId': '/api/partners?role=supplier&pageSize=1',
  '/cadastros/profissionais/$profissionalId': '/api/partners?role=professional&pageSize=1',
  '/cadastros/colaboradores/$colaboradorId': '/api/employees?pageSize=1',
  '/cadastros/produtos/$produtoId': '/api/products?pageSize=1',
  '/compras/ordens/$ordemId': '/api/purchase-orders?pageSize=1',
  '/compras/pedidos/$pedidoId': '/api/purchase-requests?pageSize=1',
  '/crm/funil/$funilId': '/api/crm/pipelines?pageSize=1',
  '/crm/funis/$funilId': '/api/crm/pipelines?pageSize=1',
  '/crm/oportunidades/$oportunidadeId': '/api/crm/opportunities?pageSize=1',
  '/vendas/orcamentos/$orcamentoId': '/api/quotes?pageSize=1',
  '/vendas/pedidos/$pedidoId': '/api/orders?pageSize=1',
}

/**
 * Rotas de sessão — o autologin do mock precisa estar DESLIGADO para elas.
 *
 * Com o autologin ligado a sessão já nasce aberta e estas telas ou desviam ou
 * mostram o estado de quem já entrou; capturá-las assim seria capturar outra
 * tela. Por isso a varredura sobe o Vite duas vezes.
 */
const ROTAS_DE_SESSAO = new Set(['/login', '/esqueci-senha', '/definir-senha', '/trocar-senha'])

/** Telas que montam devagar (formulário com vários LookupCombo, gantt, calendário). */
const ESPERA_EXTRA: Record<string, number> = {
  '/cadastros/produtos/$produtoId': 8000,
  '/vendas/orcamentos/$orcamentoId': 8000,
  '/vendas/pedidos/$pedidoId': 8000,
  '/planner': 6000,
  '/agenda': 6000,
  '/dashboard': 4000,
}

function lerRotas(): string[] {
  const arquivo = path.join(raiz, 'src/routeTree.gen.ts')
  const fonte = readFileSync(arquivo, 'utf8')
  const bloco = fonte.match(/export interface FileRoutesByFullPath \{([\s\S]*?)\n\}/)
  if (!bloco) throw new Error(`Não achei FileRoutesByFullPath em ${arquivo}`)
  const cruas = [...bloco[1].matchAll(/^\s*'([^']+)':/gm)].map((m) => m[1])
  // `/cadastros` e `/cadastros/` são a mesma URL: a primeira é a rota de layout,
  // a segunda o índice que ela monta. Capturar as duas daria arquivos gêmeos.
  const normalizadas = cruas.map((r) => (r.length > 1 && r.endsWith('/') ? r.slice(0, -1) : r))
  return [...new Set(normalizadas)].sort()
}

function apelido(rota: string): string {
  if (rota === '/') return 'raiz'
  return rota.slice(1).replaceAll('/', '-').replaceAll('$', '')
}

// ---------------------------------------------------------------------------
// Servidor de dev
// ---------------------------------------------------------------------------

async function portaLivre(inicio: number): Promise<number> {
  for (let porta = inicio; porta < inicio + 60; porta++) {
    const livre = await new Promise<boolean>((resolve) => {
      const s = net.createServer()
      s.once('error', () => resolve(false))
      s.once('listening', () => s.close(() => resolve(true)))
      s.listen(porta, '127.0.0.1')
    })
    if (livre) return porta
  }
  throw new Error('Nenhuma porta livre na faixa')
}

type Servidor = { url: string; parar: () => Promise<void> }

/**
 * Sobe o Vite DENTRO deste processo, com a config do repo mais dois desvios.
 *
 * A API JS em vez de `spawn`: um arquivo de config gerado fora da árvore do
 * projeto não resolve `vite` nem os plugins (o `node_modules` é do repo), e
 * gerar config DENTRO da árvore deixaria lixo não versionado se a varredura
 * morresse no meio. Com `configFile` + config inline o Vite funde as duas.
 *
 * As chaves `VITE_*` entram por `process.env` — é assim que o `loadEnv` do
 * `vite.config.ts` do repo as enxerga, o mesmo caminho de `VITE_API_PROXY=…
 * pnpm dev` que o CLAUDE.md documenta.
 */
async function subirVite(cacheDir: string, autologin: boolean): Promise<Servidor> {
  const { createServer } = await import('vite')
  const porta = await portaLivre(5290)
  const pai = path.resolve(raiz, '../../..')

  process.env.VITE_API_MODE = 'mock'
  process.env.VITE_MOCK_AUTOLOGIN = autologin ? '1' : '0'
  process.env.VITE_API_PROXY = ''

  const servidor = await createServer({
    configFile: path.join(raiz, 'vite.config.ts'),
    root: raiz,
    cacheDir,
    logLevel: 'warn',
    server: {
      port: porta,
      strictPort: true,
      host: '127.0.0.1',
      // As fontes do `@fontsource` são servidas de trás do symlink do
      // `node_modules`: sem isto voltam 403 e a tipografia da captura mente.
      fs: { allow: [raiz, pai] },
    },
  })
  await servidor.listen()
  return {
    url: `http://127.0.0.1:${porta}`,
    parar: () => servidor.close(),
  }
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ---------------------------------------------------------------------------
// Captura
// ---------------------------------------------------------------------------

/** Congela animação e cursor: duas capturas da mesma tela têm de ser o mesmo PNG. */
const SEM_MOVIMENTO = `*,*::before,*::after{animation:none!important;transition:none!important}
*{caret-color:transparent!important}`

async function abrirPagina(navegador: Browser, tema: 'claro' | 'escuro'): Promise<Page> {
  const contexto = await navegador.newContext({
    viewport: { width: LARGURA, height: ALTURA },
    deviceScaleFactor: 1,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    colorScheme: tema === 'escuro' ? 'dark' : 'light',
    reducedMotion: 'reduce',
  })
  // A chave é `vitra-theme` (src/hooks/use-theme.tsx). Com a chave errada as
  // duas capturas saem byte a byte idênticas e parecem certas.
  await contexto.addInitScript(
    ([chave, valor]) => {
      try {
        window.localStorage.setItem(chave as string, valor as string)
      } catch {
        // navegação privada não impede a captura
      }
    },
    ['vitra-theme', tema === 'escuro' ? 'dark' : 'light'],
  )
  return contexto.newPage()
}

/** Uma tentativa de chegar na rota com a tela montada. */
async function irPara(pagina: Page, url: string, esperaExtra: number): Promise<void> {
  await pagina.goto(url, { waitUntil: 'domcontentloaded', timeout: 240_000 })
  await pagina.waitForSelector('#root > *', { timeout: 120_000 })
  // Esqueleto/spinner some antes da captura: grade vazia não é desvio de design.
  await pagina
    .waitForFunction(
      () => !document.querySelector('[data-slot="skeleton"], .animate-pulse, [aria-busy="true"]'),
      { timeout: 30_000 },
    )
    .catch(() => {})
  await pagina.addStyleTag({ content: SEM_MOVIMENTO })
  await espera(1200 + esperaExtra)
}

async function capturar(
  pagina: Page,
  url: string,
  arquivo: string,
  esperaExtra: number,
): Promise<{ bytes: number; erro?: string }> {
  let ultimo = ''
  for (let tentativa = 1; tentativa <= 4; tentativa++) {
    try {
      await irPara(pagina, url, esperaExtra)
      mkdirSync(path.dirname(arquivo), { recursive: true })
      await pagina.screenshot({ path: arquivo })
      return { bytes: statSync(arquivo).size }
    } catch (e) {
      ultimo = e instanceof Error ? e.message.split('\n')[0] : String(e)
      // Depois de um 504 do optimizer, recarregar pega a árvore já pronta.
      await pagina.reload({ waitUntil: 'domcontentloaded', timeout: 240_000 }).catch(() => {})
      await espera(2000 * tentativa)
    }
  }
  return { bytes: 0, erro: ultimo }
}

// ---------------------------------------------------------------------------
// Manifesto
// ---------------------------------------------------------------------------

type Captura = { arquivo: string; bytes: number; erro?: string }
type LinhaDoManifesto = {
  rota: string
  url: string
  apelido: string
  aviso?: string
  capturas: Record<string, Captura>
}
type Manifesto = {
  versao: string
  commit: string
  gerado: string
  viewport: string
  grid: boolean
  rotas: LinhaDoManifesto[]
}

function commitAtual(): string {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: raiz }).toString().trim()
  } catch {
    return 'sem-git'
  }
}

/** O overlay de 8px (`?grid`) só existe onde D1 o instalou. */
function temGrid(): boolean {
  if (temFlag('sem-grid')) return false
  const root = path.join(raiz, 'src/routes/__root.tsx')
  return existsSync(root) && readFileSync(root, 'utf8').includes('grid')
}

// ---------------------------------------------------------------------------
// Varredura
// ---------------------------------------------------------------------------

async function resolverParametros(
  pagina: Page,
  url: string,
  rotas: string[],
): Promise<Map<string, { rota: string; aviso?: string }>> {
  const resolvidas = new Map<string, { rota: string; aviso?: string }>()
  const comParametro = rotas.filter((r) => r.includes('$'))
  if (comParametro.length === 0) return resolvidas

  // Uma tela qualquer, só para o MSW estar de pé quando o fetch sair.
  await irPara(pagina, `${url}/dashboard`, 0).catch(() => {})

  for (const rota of comParametro) {
    const listagem = LISTAGEM_DO_PARAMETRO[rota]
    let id: string | undefined
    if (listagem) {
      id = await pagina
        .evaluate(async (caminho) => {
          const r = await fetch(caminho, { credentials: 'include' })
          if (!r.ok) return undefined
          const corpo = (await r.json()) as unknown
          // O envelope da listagem do contrato é `{ rows, total }`; os demais
          // nomes ficam por conta de recurso que devolva a lista crua.
          const envelope = corpo as Record<string, unknown> | null
          const itens = Array.isArray(corpo)
            ? corpo
            : (envelope?.rows as unknown[]) ||
              (envelope?.items as unknown[]) ||
              (envelope?.data as unknown[]) ||
              []
          const primeiro = itens[0] as Record<string, unknown> | undefined
          const valor = primeiro?.id
          return typeof valor === 'string' || typeof valor === 'number' ? String(valor) : undefined
        }, listagem)
        .catch(() => undefined)
    }
    const parametro = rota.slice(rota.lastIndexOf('$'))
    if (id) {
      resolvidas.set(rota, { rota: rota.replace(parametro, id) })
    } else {
      resolvidas.set(rota, {
        rota: rota.replace(parametro, 'novo'),
        aviso: listagem
          ? `sem registro de exemplo em ${listagem} — capturado como \`novo\``
          : 'família sem listagem mapeada — capturado como `novo`',
      })
    }
  }
  return resolvidas
}

async function varrer(): Promise<void> {
  const todas = lerRotas()
  const rotas = filtroDeRotas.length ? todas.filter((r) => filtroDeRotas.includes(r)) : todas
  const comGrid = temGrid()
  // Cache de dependências FORA do `node_modules` compartilhado: com outro
  // agente rodando vitest, o optimizer alheio invalida o cache no meio da
  // varredura e a página morre com `504 Outdated Optimize Dep`.
  // Um cache por versão: a 1.7 e a 2.0 são checkouts diferentes, e o optimizer
  // de uma invalidaria o da outra.
  const cacheDir = path.join(
    process.env.CLAUDE_JOB_DIR || raiz,
    'tmp',
    'capturas',
    `vite-cache-${versao}`,
  )
  mkdirSync(cacheDir, { recursive: true })

  console.log(`▸ ${rotas.length} rotas · versão ${versao} · grid: ${comGrid ? 'sim' : 'não'}`)
  console.log(`▸ saída: ${saida}`)

  const navegador = await chromium.launch()
  const manifesto: Manifesto = {
    versao,
    commit: commitAtual(),
    gerado: new Date().toISOString(),
    viewport: `${LARGURA}×${ALTURA}`,
    grid: comGrid,
    rotas: [],
  }

  for (const autologin of [true, false]) {
    const alvo = rotas.filter((r) => ROTAS_DE_SESSAO.has(r) !== autologin)
    if (alvo.length === 0) continue

    const servidor = await subirVite(cacheDir, autologin)
    console.log(`\n▸ vite em ${servidor.url} (autologin ${autologin ? 'on' : 'off'})`)
    try {
      const paginaClaro = await abrirPagina(navegador, 'claro')
      const parametros = autologin
        ? await resolverParametros(paginaClaro, servidor.url, alvo)
        : new Map<string, { rota: string; aviso?: string }>()

      // Aquecimento: o Vite compila o grafo sob demanda e a primeira visita a
      // frio leva dezenas de segundos — sem este passe a primeira captura de
      // cada rota sai em branco ou estoura.
      console.log('▸ aquecendo…')
      for (const rota of alvo) {
        const destino = parametros.get(rota)?.rota ?? rota
        await irPara(paginaClaro, servidor.url + destino, 0).catch(() => {})
      }

      for (const tema of ['claro', 'escuro'] as const) {
        const pagina = tema === 'claro' ? paginaClaro : await abrirPagina(navegador, 'escuro')
        for (const rota of alvo) {
          const resolvida = parametros.get(rota)
          const destino = resolvida?.rota ?? rota
          const nome = apelido(rota)
          const extra = ESPERA_EXTRA[rota] ?? 0
          let linha = manifesto.rotas.find((l) => l.rota === rota)
          if (!linha) {
            linha = {
              rota,
              url: destino,
              apelido: nome,
              aviso: resolvida?.aviso,
              capturas: {},
            }
            manifesto.rotas.push(linha)
          }
          // A grade de 8px prova ALINHAMENTO, e alinhamento não muda com o
          // tema: capturá-la nos dois dobraria o peso do repositório sem
          // acrescentar prova. Vai no claro, que é onde o overlay se enxerga.
          for (const grid of comGrid && tema === 'claro' ? [false, true] : [false]) {
            const sufixo = grid ? `.${tema}.grid.png` : `.${tema}.png`
            const arquivo = path.join(saida, nome + sufixo)
            const url = servidor.url + destino + (grid ? '?grid' : '')
            const r = await capturar(pagina, url, arquivo, extra)
            linha.capturas[grid ? `${tema}-grid` : tema] = {
              arquivo: path.relative(saida, arquivo),
              bytes: r.bytes,
              erro: r.erro,
            }
            console.log(
              `  ${r.erro ? '✗' : '✓'} ${nome}${sufixo} ${r.erro ?? `${Math.round(r.bytes / 1024)} kB`}`,
            )
          }
        }
        if (tema === 'escuro') await pagina.context().close()
      }
      await paginaClaro.context().close()
    } finally {
      await servidor.parar()
      await espera(1500)
    }
  }

  await navegador.close()

  // Claro e escuro do mesmo tamanho = o tema não trocou. Vale dizer alto: o par
  // idêntico passa por captura correta na revisão de olho.
  for (const linha of manifesto.rotas) {
    const c = linha.capturas.claro
    const e = linha.capturas.escuro
    if (c && e && c.bytes > 0 && c.bytes === e.bytes) {
      linha.aviso = [linha.aviso, 'claro e escuro têm o mesmo tamanho — conferir a troca de tema']
        .filter(Boolean)
        .join(' · ')
    }
  }

  mkdirSync(saida, { recursive: true })
  writeFileSync(path.join(saida, 'manifesto.json'), `${JSON.stringify(manifesto, null, 2)}\n`)
  const falhas = manifesto.rotas.flatMap((l) => Object.values(l.capturas).filter((c) => c.erro))
  console.log(`\n▸ ${manifesto.rotas.length} rotas · ${falhas.length} capturas com erro`)
}

// ---------------------------------------------------------------------------
// README lado a lado
// ---------------------------------------------------------------------------

function lerManifesto(versao: string): Manifesto | undefined {
  const arquivo = path.resolve(raiz, `docs/design/capturas/${versao}/manifesto.json`)
  if (!existsSync(arquivo)) return undefined
  return JSON.parse(readFileSync(arquivo, 'utf8')) as Manifesto
}

function montarReadme(): void {
  const base = path.resolve(raiz, 'docs/design/capturas')
  const versoes = existsSync(base)
    ? readdirSync(base).filter((d) => existsSync(path.join(base, d, 'manifesto.json')))
    : []
  const antes = lerManifesto('1.7')
  const depois = lerManifesto('2.0')
  if (!antes && !depois)
    throw new Error(`Sem manifesto em ${base} (versões: ${versoes.join(', ')})`)

  const rotas = [
    ...new Set([...(antes?.rotas ?? []), ...(depois?.rotas ?? [])].map((l) => l.rota)),
  ].sort()

  const linhas: string[] = []
  linhas.push('# Capturas — 1.7 × Reface 2.0')
  linhas.push('')
  linhas.push(
    'Varredura de `scripts/capturas.ts` (D36, #531): toda rota do `routeTree`, nos dois temas,',
    'em 1440×900, com o overlay de 8px (`?grid`) onde ele existe. É o material de prova da',
    'revisão pós-merge — cada desvio apontado nas issues `[Reface 2.0 · R-…]` cita a linha daqui.',
    '',
  )
  for (const [rotulo, m] of [
    ['1.7 (`main`)', antes],
    ['2.0 (`design/2.0`)', depois],
  ] as const) {
    if (m) {
      linhas.push(
        `- **${rotulo}** — commit \`${m.commit}\`, ${m.rotas.length} rotas, ${m.gerado.slice(0, 10)}${m.grid ? ', com `?grid`' : ', sem `?grid` (o overlay nasceu na 2.0)'}`,
      )
    } else {
      linhas.push(`- **${rotulo}** — sem manifesto`)
    }
  }
  linhas.push('')
  linhas.push('Regenerar: `node --experimental-strip-types scripts/capturas.ts --versao=2.0`.')
  linhas.push('')

  for (const rota of rotas) {
    const a = antes?.rotas.find((l) => l.rota === rota)
    const d = depois?.rotas.find((l) => l.rota === rota)
    linhas.push(`## \`${rota}\``)
    linhas.push('')
    if (!a) linhas.push('> Rota **inexistente na 1.7** — nasceu na rodada.', '')
    if (!d) linhas.push('> Rota **inexistente na 2.0** — saiu na rodada.', '')
    for (const aviso of [a?.aviso, d?.aviso].filter(Boolean)) linhas.push(`> ${aviso}`, '')
    linhas.push('| | 1.7 | 2.0 |')
    linhas.push('|---|---|---|')
    for (const tema of ['claro', 'escuro'] as const) {
      const celula = (m: Manifesto | undefined, l: LinhaDoManifesto | undefined) => {
        const c = l?.capturas[tema]
        if (!m || !c || c.bytes === 0) return '—'
        return `![${tema}](${m.versao}/${c.arquivo})`
      }
      linhas.push(`| **${tema}** | ${celula(antes, a)} | ${celula(depois, d)} |`)
    }
    const gradeAntes = a?.capturas['claro-grid']
    const gradeDepois = d?.capturas['claro-grid']
    if (gradeAntes || gradeDepois) {
      const celula = (m: Manifesto | undefined, c: Captura | undefined) =>
        m && c && c.bytes > 0 ? `![grid](${m.versao}/${c.arquivo})` : '—'
      linhas.push(
        `| **grade 8px** | ${celula(antes, gradeAntes)} | ${celula(depois, gradeDepois)} |`,
      )
    }
    linhas.push('')
  }

  mkdirSync(base, { recursive: true })
  writeFileSync(path.join(base, 'README.md'), `${linhas.join('\n')}\n`)
  console.log(`▸ README com ${rotas.length} rotas em ${path.join(base, 'README.md')}`)
}

// ---------------------------------------------------------------------------

if (temFlag('readme')) {
  montarReadme()
} else if (temFlag('rotas-so')) {
  console.log(lerRotas().join('\n'))
} else {
  await varrer()
}
