import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = resolve(__dirname, '..')
const ROTAS = resolve(__dirname)
const CABECALHO = join(SRC, 'components/cabinet/page-header.tsx')

/**
 * TODA ROTA ANUNCIA O NOME DA TELA (Reface 2.0 · D5).
 *
 * ## Por que uma guarda, e não confiança
 *
 * O nome da tela morava em três vozes: o `<h1>` do `PageHeader`, o `<h1>` de
 * dentro da caixa preta da `BandaDeIdentidade` e o `<h1>` solto, copiado à mão
 * em rota (`Previsão de Chegada`, `Tarefas`, `Planner`) — cada um com sua
 * fonte, seu tamanho e sua caixa. Rota nova nascia escolhendo uma das três, e a
 * escolha nunca era declarada: era o que estava por perto para copiar.
 *
 * Com uma voz só, mudar o degrau do título do sistema volta a ser uma linha em
 * `index.css`. Sem a guarda, a segunda voz volta na primeira rota nova — foi
 * assim que as três nasceram.
 *
 * ## Pelo GRAFO, e não renderizando
 *
 * Montar as 54 rotas para conferir um `<h1>` custaria a suíte inteira e pediria
 * servidor falso para cada uma. O que se quer saber é estrutural: a rota
 * ALCANÇA o cabeçalho pelos imports? Um `<h1>` inventado na tela não some por
 * causa disto, mas o teste irmão (`nenhum título fora do cabeçalho`) pega esse.
 */
const SEM_CABECALHO: Record<string, string> = {
  // Rotas de LAYOUT: renderizam `<Outlet/>` e mais nada. O cabeçalho é da
  // tela que pousa dentro delas — pôr um aqui daria dois títulos em toda rota
  // filha.
  'cadastros.tsx': 'layout de módulo — só `<Outlet/>`',
  'compras.tsx': 'layout de módulo — só `<Outlet/>`',
  'crm.tsx': 'layout de módulo — só `<Outlet/>`',
  'estoque.tsx': 'layout de módulo — só `<Outlet/>`',
  'vendas.tsx': 'layout de módulo — só `<Outlet/>`',
  // DESVIO: `/crm/funil` sem id manda para o funil padrão e sai da frente.
  // Cabeçalho aqui piscaria um título que ninguém pediu antes do `replace`.
  'crm/funil/index.tsx': 'desvio para o funil padrão — não é tela',
}

function arquivosDe(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) return arquivosDe(caminho)
    return /\.tsx?$/.test(caminho) && !caminho.includes('.test.') ? [caminho] : []
  })
}

const TODOS = new Set(arquivosDe(SRC))
const ESPECIFICADOR = /from\s+['"]([^'"]+)['"]/g

function resolverImport(origem: string, spec: string): string | undefined {
  const base = spec.startsWith('@/')
    ? join(SRC, spec.slice(2))
    : spec.startsWith('.')
      ? resolve(dirname(origem), spec)
      : undefined
  if (!base) return undefined
  for (const tentativa of [
    `${base}.tsx`,
    `${base}.ts`,
    join(base, 'index.tsx'),
    join(base, 'index.ts'),
  ]) {
    if (TODOS.has(tentativa)) return tentativa
  }
  return undefined
}

const grafo = new Map<string, string[]>()
for (const arquivo of TODOS) {
  const texto = readFileSync(arquivo, 'utf-8')
  const destinos: string[] = []
  for (const [, spec] of texto.matchAll(ESPECIFICADOR)) {
    const alvo = resolverImport(arquivo, spec as string)
    if (alvo) destinos.push(alvo)
  }
  grafo.set(arquivo, destinos)
}

function alcancaOCabecalho(inicio: string): boolean {
  const visto = new Set<string>()
  const pilha = [inicio]
  while (pilha.length > 0) {
    const atual = pilha.pop() as string
    if (visto.has(atual)) continue
    visto.add(atual)
    if (atual === CABECALHO) return true
    pilha.push(...(grafo.get(atual) ?? []))
  }
  return false
}

const chave = (caminho: string) => relative(ROTAS, caminho).replaceAll('\\', '/')

describe('cabeçalho de página em toda rota', () => {
  it('toda rota chega ao PageHeader — nome de tela tem uma voz só', () => {
    const semCabecalho = arquivosDe(ROTAS)
      .filter((rota) => !alcancaOCabecalho(rota))
      .map(chave)
      .filter((rota) => !(rota in SEM_CABECALHO))

    expect(
      semCabecalho,
      `Rota sem cabeçalho de página:\n${semCabecalho.map((r) => `  src/routes/${r}`).join('\n')}\n\nMonte um <PageHeader titulo="…" /> na tela, ou declare em SEM_CABECALHO por que ela não tem um.`,
    ).toEqual([])
  })

  it('a lista de exceções não guarda rota que já ganhou cabeçalho', () => {
    const arquivos = new Set(arquivosDe(ROTAS).map(chave))
    const vencidas = Object.keys(SEM_CABECALHO).filter(
      (rota) => !arquivos.has(rota) || alcancaOCabecalho(join(ROTAS, rota)),
    )
    expect(
      vencidas,
      `exceção vencida — a rota ganhou cabeçalho ou sumiu: ${vencidas.join(', ')}`,
    ).toEqual([])
  })

  /**
   * O outro lado da mesma regra: o `<h1>` do sistema é o do `PageHeader`, e
   * mais nenhum. Uma tela pode alcançar o cabeçalho pelos imports E mesmo
   * assim escrever um `<h1>` do lado — foi assim que Tarefas e Planner
   * tinham dois títulos.
   */
  it('nenhum título de nível 1 fora do cabeçalho', () => {
    const soltos = [...arquivosDe(join(SRC, 'routes')), ...arquivosDe(join(SRC, 'features'))]
      .filter((arquivo) => /<h1[\s>]/.test(readFileSync(arquivo, 'utf-8')))
      .map((arquivo) => relative(SRC, arquivo).replaceAll('\\', '/'))

    expect(
      soltos,
      `<h1> fora do PageHeader:\n${soltos.map((a) => `  src/${a}`).join('\n')}`,
    ).toEqual([])
  })
})
