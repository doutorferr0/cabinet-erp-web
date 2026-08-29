import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { MAPA_DE_ATALHOS, type NomeDeAtalho, SHORTCUTS } from '@/lib/shortcuts'
import { describe, expect, it } from 'vitest'

/**
 * INVARIANTE: tecla no registry é tecla NO MAPA, e o mapa é medido, não escrito.
 *
 * A tabela de atalhos deste sistema já existiu em três lugares — a decisão de
 * 2026-07-28, a issue #362 e os comentários do registry — e os três divergiram
 * do código. O caso concreto: a issue afirmava `Alt+P` "ligado em
 * `orcamento-form` e `pedido-compra-form`" quando `pedido-venda-form` já o
 * ligava também. Ninguém mentiu; a lista foi escrita uma vez e o código andou.
 *
 * Aqui a tabela é `MAPA_DE_ATALHOS`, ao lado das teclas, e este arquivo cobra
 * duas coisas que prosa não cobra: que exista uma linha por atalho, e que a
 * linha não prometa tecla que nenhum componente liga.
 */

const SRC = resolve(__dirname, '..')

/**
 * Atalho declarado no registry e ligado por NINGUÉM — com o motivo e quem
 * resolve, no padrão de `todo-componente-e-montado.test.ts`.
 *
 * Entrada aqui é confissão de que a tecla está documentada e morta. A saída é
 * ligá-la ou apagá-la do registry, e as duas dependem da mesma resposta —
 * por isso a linha aponta a issue, não uma PR.
 */
const SEM_CHAMADOR: Partial<Record<NomeDeAtalho, string>> = {
  incluir:
    'declarado desde a origem do registry e nunca ligado; a #362 pergunta ao operador se ele fica (a busca já oferece "Novo cliente") antes de a barra de ações passar a ligá-lo',
}

function arquivosDe(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) return arquivosDe(caminho)
    return /\.tsx?$/.test(caminho) && !/\.test\.tsx?$/.test(caminho) ? [caminho] : []
  })
}

/**
 * Quais atalhos algum componente LIGA hoje.
 *
 * Casa `SHORTCUTS.<nome>` em arquivo de produção, não `bindShortcut(` — a
 * chamada aparece em três formas (direto no efeito, dentro de callback, com o
 * combo em variável) e casar a forma perderia justamente o uso que fugiu do
 * padrão. O registry é a única origem legítima do combo, então citá-lo é o
 * sinal, e o próprio `shortcuts.ts` fica de fora por ser quem o define.
 */
function atalhosCitadosNoFonte(): Set<NomeDeAtalho> {
  const nomes = Object.keys(SHORTCUTS) as NomeDeAtalho[]
  const citados = new Set<NomeDeAtalho>()
  for (const arquivo of arquivosDe(SRC)) {
    if (arquivo.endsWith('lib/shortcuts.ts')) continue
    const fonte = readFileSync(arquivo, 'utf8')
    for (const nome of nomes) {
      if (fonte.includes(`SHORTCUTS.${nome}`)) citados.add(nome)
    }
  }
  return citados
}

describe('mapa de atalhos', () => {
  it('tem uma linha para cada tecla do registry', () => {
    const documentados = MAPA_DE_ATALHOS.map((linha) => linha.atalho).filter(
      (a): a is NomeDeAtalho => a !== null,
    )
    expect(
      [...documentados].sort(),
      'atalho no registry sem linha no MAPA_DE_ATALHOS — o operador não teria onde ler o que a tecla faz',
    ).toEqual(Object.keys(SHORTCUTS).sort())
  })

  it('não documenta a mesma tecla duas vezes', () => {
    const documentados = MAPA_DE_ATALHOS.map((linha) => linha.atalho).filter((a) => a !== null)
    expect(new Set(documentados).size).toBe(documentados.length)
  })

  it('guarda o legado que ficou sem substituto — a linha que a validação tem de fechar', () => {
    const orfas = MAPA_DE_ATALHOS.filter((linha) => linha.atalho === null)
    expect(orfas.map((l) => l.legado)).toEqual(['F3'])
  })

  it('declara o conflito de navegador do Ctrl+K, que é o único publicado', () => {
    // Medido na documentação oficial de Chrome e Edge (2026-08-28): as duas
    // publicam Ctrl+K, e NENHUMA publica Alt+P/A/T/I/N. Se esta expectativa
    // cair, foi porque alguém remediu — atualize o mapa junto.
    const comConflito = MAPA_DE_ATALHOS.filter(
      (linha) => linha.navegador.chrome !== null || linha.navegador.edge !== null,
    )
    expect(comConflito.map((l) => l.atalho)).toEqual(['busca'])
  })

  it('não promete tecla que nenhum componente liga', () => {
    const citados = atalhosCitadosNoFonte()
    const mortos = (Object.keys(SHORTCUTS) as NomeDeAtalho[]).filter(
      (nome) => !citados.has(nome) && !(nome in SEM_CHAMADOR),
    )
    expect(
      mortos,
      `Atalho no registry e no mapa que nenhuma tela liga:\n${mortos.map((n) => `  SHORTCUTS.${n}`).join('\n')}\n\nLigue-o, apague-o do registry, ou registre a dívida em SEM_CHAMADOR.`,
    ).toEqual([])
  })

  it('a lista de dívidas não guarda tecla já ligada', () => {
    const citados = atalhosCitadosNoFonte()
    const consertados = (Object.keys(SEM_CHAMADOR) as NomeDeAtalho[]).filter((nome) =>
      citados.has(nome),
    )
    expect(
      consertados,
      `dívida aponta atalho que já tem chamador: ${consertados.join(', ')}`,
    ).toEqual([])
  })
})
