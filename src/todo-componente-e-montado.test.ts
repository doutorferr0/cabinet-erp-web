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
  // Ficou órfão AQUI, e de propósito: `/estoque/movimentacao` era o único
  // consumidor, e esta PR trocou o placeholder pela tela de estoque por
  // depósito. Não se apaga porque o padrão ainda tem fila — os slots `futuro`
  // do menu (`Reserva Técnica`, `Pedidos de Venda`, `Contas a Receber/Pagar`,
  // `Comissões`, `Relatórios`) são exatamente o caso que ele existe para
  // ocupar, e o primeiro deles a ganhar rota o religa. Apagá-lo agora obrigaria
  // a reescrevê-lo igual na próxima tela não capturada.
  'components/cabinet/tela-nao-capturada.tsx':
    'órfão desde a tela de estoque por depósito; religa no primeiro slot `futuro` do menu a ganhar rota (Reserva Técnica é o próximo)',
  // Nasceu órfã de propósito, e a alternativa era pior. O console de suporte é
  // superfície administrativa separada (core @arquitetura) e trilho próprio — a
  // mesma decisão que a #292 tomou para a tela de checkboxes de papéis. A
  // fronteira vem junto do contrato porque a REGRA DE ACESSO A DADO não abre
  // exceção: tela nenhuma chama o cliente gerado direto. Deixá-la para depois
  // convidaria a primeira tela de suporte a improvisar o caminho, que é o
  // defeito que a regra existe para impedir — e improvisar ali é improvisar o
  // acesso a dado de terceiro.
  // Ficou órfã na D19 (#487), e de propósito. Ela é o SHELL 1.x da ficha de
  // cadastro — `PageHeader` com `Alterar` forte e a calha estreita à esquerda —
  // e a Reface 2.0 o substituiu pelo esqueleto do registro
  // (`features/cadastro/ficha-de-registro.tsx`): cabeçalho com entidade, código
  // e situação, coluna lateral de consulta e uma próxima ação que não é
  // `Alterar`. O que D16 entregou DENTRO dela — `BlocoIdentidade`,
  // `FichaDeModulos`, `IndiceDeModulos` — continua montado, pelo esqueleto novo.
  // Não se apaga aqui porque apagar componente de zona alheia no meio da rodada
  // é o que a regra de zonas existe para impedir; quem a remove é a D30, que é
  // a issue de fechamento.
  'components/cabinet/ficha/ficha-de-cadastro.tsx':
    'órfã desde a D19 (#487): o esqueleto 2.0 é `features/cadastro/ficha-de-registro.tsx`; a D30 apaga',
  'data/suporte-api.ts':
    'órfã desde o item 6 da fundação (PR #369); religa no console de suporte, que é trilho próprio — o mock e as guardas já respondem sem ela',
  // Nasceu órfão na D3 (#471) e o motivo é a forma da rodada, não esquecimento:
  // as 30 issues do Reface 2.0 correm EM PARALELO a partir de `design/2.0`, com
  // zonas de arquivo disjuntas. O consumidor que a DoD da #471 nomeia — a
  // página de controles — é entrega da D2 (#470), que está em curso noutra
  // branch; montá-lo aqui seria escrever no arquivo de outro agente, que é
  // exatamente o que a §Regra de ouro proíbe. `<Badge>` e `<Money>` saíram
  // desta mesma PR já ligados (a coluna `Ativo` e a de valor das listagens);
  // este é o único dos três cujo lugar cai fora da zona da issue.
  'components/cabinet/monograma.tsx':
    'órfão desde a #471 (D3); a página de controles da D2 o monta — é o consumidor que a DoD da #471 declara',
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
