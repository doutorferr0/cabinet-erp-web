import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * INVARIANTE: componente escrito é componente MONTADO.
 *
 * Três vezes o mesmo defeito nesta base: arquivo correto, testes verdes,
 * nenhuma tela montando. A #104 nasceu assim; o `FichaDeModulos` ficou órfão do
 * #137 até a #182; o `ColunasPorModulo` ficou da #104 até a #184. Em todos os
 * três a suíte estava VERDE — porque a cobertura monta o componente direto, e
 * "existe" e "está em tela" são afirmações diferentes.
 *
 * Guarda de rota não pega este caso: ela cobra o que a tela DECLARA, e
 * componente que ninguém monta não é declarado por ninguém. Só uma varredura do
 * GRAFO de imports pega, e é o que este arquivo faz.
 *
 * ## O critério
 *
 * Órfão = **existe quem importe, e todo mundo que importa é teste**. Essa é a
 * forma enganosa, a que passa por entregue. Arquivo que ninguém importa (nem
 * teste) fica de fora de propósito: ali cabem entradas (`main.tsx`) e módulos
 * carregados por convenção, e misturar os dois casos daria ruído no lugar de
 * sinal.
 *
 * ## A lista de exceções encolhe, nunca cresce
 *
 * A asserção é de CONTENÇÃO (`órfãos ⊆ exceções`), e não de igualdade: consertar
 * um órfão não pode quebrar a `main` de quem consertou. Em compensação a entrada
 * some da lista quando o conserto entra — quem mexer aqui, tire a linha.
 */

const SRC = resolve(__dirname)

/**
 * Diretórios inteiros que o critério não alcança, e o motivo em cada um.
 *
 * `components/ui` é shadcn por COPY-PASTE: o CLI escreve a primitiva no repo, e
 * ela chega antes da tela que vai usá-la. Cobrar montagem imediata faria a
 * escolha ser "não gerar a primitiva", que é o contrário da decisão de stack.
 *
 * `test` é helper de teste: só teste importar é a definição dele.
 *
 * `api/gerado` é codegen, e não se edita à mão (CLAUDE.md).
 */
const PASTAS_FORA = ['components/ui/', 'test/', 'api/gerado/']

/**
 * Dívidas NOMEADAS, com dono e prazo — não é lista de perdão genérico.
 *
 * Entrada aqui é confissão de que o componente está pronto e desligado, e cada
 * uma tem de dizer quem religa. Sem nome e sem PR, o certo é apagar o
 * componente: código morto anônimo é pior que ausência.
 */
const DIVIDAS: Record<string, string> = {
  'components/cabinet/ficha/ficha-de-modulos.tsx':
    'órfão desde o #137; a PR #182 liga a ficha nas 4 rotas de detalhe',
  'features/login/reentrar.tsx':
    'ReentrarNaSessao, #124 ponto 3: escrito e sem consumidor; a dívida está registrada na issue',
}

function arquivosDe(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) return arquivosDe(caminho)
    return /\.tsx?$/.test(caminho) && !caminho.endsWith('.d.ts') ? [caminho] : []
  })
}

const ehTeste = (p: string) => p.includes('.test.')
const chave = (p: string) => relative(SRC, p).replaceAll('\\', '/')

/** Resolve o especificador para o arquivo real, cobrindo `index` e extensão omitida. */
function resolverImport(origem: string, spec: string, existentes: Set<string>) {
  const base = spec.startsWith('@/')
    ? join(SRC, spec.slice(2))
    : spec.startsWith('.')
      ? resolve(dirname(origem), spec)
      : null
  if (!base) return null
  for (const tentativa of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    join(base, 'index.ts'),
    join(base, 'index.tsx'),
  ]) {
    if (existentes.has(tentativa)) return tentativa
  }
  return null
}

describe('todo componente escrito é montado por alguém além do próprio teste', () => {
  it('nenhum órfão novo', () => {
    const arquivos = arquivosDe(SRC)
    const existentes = new Set(arquivos)

    // Quem importa quem. `from '...'` cobre import e re-export; o repo não usa
    // `require`, e import dinâmico com literal cai no mesmo padrão.
    const importadoPor = new Map<string, string[]>()
    for (const arquivo of arquivos) {
      const fonte = readFileSync(arquivo, 'utf-8')
      for (const achado of fonte.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
        const spec = achado[1]
        if (!spec) continue
        const alvo = resolverImport(arquivo, spec, existentes)
        if (alvo && alvo !== arquivo) {
          importadoPor.set(alvo, [...(importadoPor.get(alvo) ?? []), arquivo])
        }
      }
    }

    const orfaos = arquivos
      .filter((p) => !ehTeste(p))
      .filter((p) => !PASTAS_FORA.some((pasta) => chave(p).startsWith(pasta)))
      .filter((p) => {
        const fontes = importadoPor.get(p)
        return fontes?.every(ehTeste)
      })
      .map(chave)

    const inesperados = orfaos.filter((p) => !(p in DIVIDAS))

    // A mensagem tem de dizer o que fazer, senão quem esbarrar nela amanhã
    // remove o teste em vez de ligar o componente.
    expect(
      inesperados,
      `Componente escrito e nunca montado — só o teste dele importa:\n${inesperados.map((p) => `  src/${p}`).join('\n')}\n\nLigue-o na tela, apague-o, ou registre a dívida em DIVIDAS com quem religa.`,
    ).toEqual([])
  })

  it('a lista de dívidas não guarda entrada já consertada', () => {
    const arquivos = new Set(arquivosDe(SRC).map(chave))
    const sumidos = Object.keys(DIVIDAS).filter((p) => !arquivos.has(p))
    expect(sumidos, `dívida aponta arquivo que não existe mais: ${sumidos.join(', ')}`).toEqual([])
  })
})
