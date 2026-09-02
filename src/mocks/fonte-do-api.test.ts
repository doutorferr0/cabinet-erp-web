import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PASSAGEM_ADIANTADA, ROTAS_DO_BACKEND, ROTAS_NO_MOCK } from './rotas-do-backend'

/**
 * A REMEDIÇÃO PELO FONTE — o que a sonda ao vivo não consegue concluir.
 *
 * `ao-vivo.test.ts` já cobra o sentido difícil (declaração de ausência que
 * envelheceu), e continua sendo QUEM PROMOVE: só comportamento observado move
 * linha para `ROTAS_DO_BACKEND`. Mas ele conclui menos do que parece, e o
 * próprio arquivo diz por quê — a sonda bate com uuid zerado e sem corpo, então
 * só decide quando a resposta é **501 limpo** ou o **404 do roteador**. As três
 * armadilhas que ele documenta são todas do mesmo tipo:
 *
 * 1. **400** — a validação de schema responde antes do handler;
 * 2. **403** — a borda confere papel antes do handler;
 * 3. **404 do handler** ("não achei este id"), que tem o mesmo status do 404 do
 *    roteador e só se separa pelo `detail`.
 *
 * Nos três a sonda REGISTRA como inconclusiva e segue verde — a escolha certa,
 * porque vermelho por ambiguidade ensina a ignorar a suíte. A consequência é
 * que **uma rota que voltou a ser servida pode responder 400, 403 ou 404 do
 * handler e ficar verde**: é a mesma classe de falha da #341, um nível abaixo.
 *
 * Esta bateria fecha esse buraco por outro caminho, e é conclusiva em 100% das
 * rotas porque não depende de resposta nenhuma: ela lê o FONTE do api — o
 * contrato de lá e as chaves do mapa de manipuladores que `servidor.ts` compõe.
 * Papel do seed, corpo válido e id existente deixam de importar.
 *
 * **Ela não promove nada, e isso é a divisão de trabalho, não timidez.**
 * Leitura de código prova que o handler está escrito, não que ele responde —
 * é o que o `CLAUDE.md` chama de conferência estática, e o que ela faz é
 * apontar ONDE remedir em vez de deixar a declaração envelhecendo verde.
 * Quem move a linha continua sendo a sonda.
 *
 * ## Opt-in por `CABINET_API_DIR`, e por que não é `CABINET_AO_VIVO`
 *
 * Esta bateria precisa do CHECKOUT do api, não do par de pé — nem Postgres nem
 * servidor. Amarrá-la ao `CABINET_AO_VIVO` custaria os dois para uma leitura de
 * arquivo, e quem tem o api ao lado no disco perderia a conferência mais barata
 * que existe. No CI o job `ao-vivo` já define a variável (o api é público desde
 * a api#220, o checkout é cross-repo sem segredo), então ela roda lá sem passo
 * novo. Local:
 *
 *     CABINET_API_DIR=../cabinet-erp-api npx vitest run src/mocks/fonte-do-api
 */

const API = process.env.CABINET_API_DIR

/**
 * O SKIP É O RISCO DESTA BATERIA — e é por isso que existe uma chave que o
 * proíbe.
 *
 * `describe.skipIf` é a escolha certa para quem não tem o api no disco: a
 * conferência é opcional local. Mas skip no CI é passo VERDE, e um passo verde
 * que não mediu nada é exatamente o silêncio que esta bateria existe para
 * acabar — só que um andar acima. Bastaria alguém mexer no `env:` do job.
 *
 * Com `CABINET_FONTE_OBRIGATORIA` (posta só no passo do CI), a ausência de
 * `CABINET_API_DIR` vira VERMELHO em vez de pulo.
 */
describe.skipIf(!process.env.CABINET_FONTE_OBRIGATORIA)('a conferência do fonte é exigida', () => {
  it('CABINET_API_DIR está definida — senão a bateria abaixo pularia calada', () => {
    expect(
      API,
      'CABINET_FONTE_OBRIGATORIA está ligada e CABINET_API_DIR não: o checkout ' +
        'do api sumiu do job, e a conferência estática pularia sem uma linha vermelha',
    ).toBeTruthy()
  })
})

/**
 * O mapa de manipuladores nasce de `rotasDeX()`, e todas moram em
 * `src/modules/`, com uma exceção: a sessão, em `src/core/auth/rotas.ts`.
 *
 * **A varredura é restrita de propósito, e o motivo é uma armadilha mordida ao
 * escrever isto:** varrer `src/` inteiro casa `src/api/contrato.ts`, que é o
 * TIPO GERADO do contrato e cita todo operationId que existe. Por ele o api
 * aparece com **199 de 199** operações servidas — verde perfeito e falso, que
 * apagaria esta bateria inteira sem uma linha vermelha.
 */
const RAIZES_DO_MAPA = ['src/modules', 'src/core/auth/rotas.ts']

/**
 * As DUAS formas de chave do mapa, e casar só a primeira perde ~90 operações
 * (armadilha catalogada no `CLAUDE.md`):
 *
 *     ListPartners: async (req, reply) => { … }
 *     ListPartners: parceiros.listar,
 *
 * O que as une é `Identificador:` no começo do valor, indentado. O nome ainda é
 * cruzado contra os operationId do contrato de lá, então `Promise:` ou um campo
 * de DTO chamado `Total:` não entram por acidente.
 */
const CHAVE_DO_MAPA = /^\s+([A-Z][A-Za-z0-9]*)\s*:/gm

const VERBOS = ['get', 'post', 'put', 'patch', 'delete'] as const

type Operacoes = Map<string, string>

function operacoesDo(contrato: string): Operacoes {
  const doc = JSON.parse(readFileSync(contrato, 'utf8')) as {
    paths?: Record<string, Record<string, { operationId?: string }>>
  }
  const mapa: Operacoes = new Map()
  for (const [caminho, item] of Object.entries(doc.paths ?? {}))
    for (const verbo of VERBOS) {
      const id = item[verbo]?.operationId
      if (id) mapa.set(`${verbo} ${caminho}`, id)
    }
  return mapa
}

function chavesDoMapaDeManipuladores(raiz: string, conhecidos: Set<string>): Set<string> {
  const achadas = new Set<string>()
  const varrer = (alvo: string) => {
    if (!existsSync(alvo)) return
    if (statSync(alvo).isDirectory()) {
      for (const entrada of readdirSync(alvo)) varrer(join(alvo, entrada))
      return
    }
    if (!alvo.endsWith('.ts') || alvo.includes('.test.')) return
    for (const achado of readFileSync(alvo, 'utf8').matchAll(CHAVE_DO_MAPA)) {
      const chave = achado[1]
      if (chave && conhecidos.has(chave)) achadas.add(chave)
    }
  }
  for (const parte of RAIZES_DO_MAPA) varrer(join(raiz, parte))
  return achadas
}

/**
 * Qual api foi medido — e isto é requisito, não enfeite.
 *
 * O checkout local envelhece calado: o desta sessão estava **57 commits atrás**
 * do `origin/main`, e medir por ele apontaria como "sem handler" famílias
 * entregues dias antes. O CI usa `ref: main` fresca; o disco de quem roda local
 * é o que der. Sem o commit impresso, o verde não diz contra o quê.
 */
function commitDo(raiz: string): string {
  try {
    return execFileSync('git', ['-C', raiz, 'rev-parse', '--short', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return 'sem .git — checkout sem histórico'
  }
}

/**
 * A leitura é PREGUIÇOSA, e isso é conserto de um defeito medido, não estilo.
 *
 * `describe.skipIf` marca os testes como pulados, mas o CALLBACK do describe
 * roda na coleta de qualquer jeito. Com o trabalho no corpo dele, a bateria
 * quebrava a suíte inteira na máquina de quem não tem `CABINET_API_DIR` — um
 * `TypeError: The "path" argument must be of type string` antes de qualquer
 * teste existir. Opt-in que derruba a suíte de quem não optou não é opt-in.
 */
let medida: { ops: Operacoes; comHandler: Set<string> } | undefined
function medir(raiz: string) {
  if (!medida) {
    const ops = operacoesDo(join(raiz, 'contracts/openapi-v1.json'))
    medida = { ops, comHandler: chavesDoMapaDeManipuladores(raiz, new Set(ops.values())) }
  }
  return medida
}

describe.skipIf(!API)('a passagem contra o FONTE do cabinet-erp-api', () => {
  const raiz = API as string

  /** `sem-contrato` (404 do roteador de lá) · `sem-handler` (501) · servida. */
  const naturezaDe = (metodo: string, caminho: string): string => {
    const { ops, comHandler } = medir(raiz)
    const id = ops.get(`${metodo} ${caminho}`)
    if (!id) return 'sem-contrato'
    return comHandler.has(id) ? 'servida' : 'sem-handler'
  }

  it('o extrator ainda enxerga o mapa de manipuladores', () => {
    // A ÂNCORA, e ela guarda esta bateria de si mesma.
    //
    // Todo o resto aqui é da forma "não achei handler para X". Se o api mover
    // `src/modules/` de lugar ou trocar a forma da chave, a varredura passa a
    // achar ZERO — e aí toda rota mockada bate com `sem-handler`, que é o que a
    // maioria declara. A bateria ficaria **verde justamente por ter quebrado**.
    //
    // O limiar é frouxo de propósito (metade), porque a fração de servidas é
    // móvel por natureza: o contrato é deste repo e anda na frente. Ele não
    // mede a saúde do api — mede se o extrator ainda casa alguma coisa.
    const { ops, comHandler } = medir(raiz)
    const fracao = comHandler.size / ops.size
    expect(
      fracao,
      `só ${comHandler.size} de ${ops.size} operações casaram com o mapa de ` +
        `manipuladores em ${RAIZES_DO_MAPA.join(', ')} — o extrator quebrou, ` +
        `não o api (api ${commitDo(raiz)})`,
    ).toBeGreaterThan(0.5)

    console.info(
      `[fonte] api ${commitDo(raiz)}: ${ops.size} operações no contrato de lá, ` +
        `${comHandler.size} com handler, ${ops.size - comHandler.size} em 501`,
    )
  })

  it('a natureza declarada bate com o FONTE — inclusive onde a sonda cala', () => {
    const erradas = ROTAS_NO_MOCK.flatMap((rota) => {
      const medida = naturezaDe(rota.metodo, rota.caminho)
      if (medida === rota.natureza) return []
      const onde = `${rota.metodo.toUpperCase()} ${rota.caminho}`
      if (medida === 'servida')
        return [`${onde}: declarada ${rota.natureza}, e o api TEM handler — promova (remedindo)`]
      return [`${onde}: declarada ${rota.natureza}, e o fonte do api diz ${medida}`]
    })

    expect(erradas, `natureza vencida:\n  ${erradas.join('\n  ')}`).toEqual([])
  })

  it('rota ADIANTADA na passagem está DECLARADA — e a declaração tem prazo', () => {
    // O sentido inverso, e o mais caro: rota da passagem sai do mock e vai para
    // a rede. Se o api não a serve, a tela toma 501 (ou 404, se o contrato de lá
    // nem sincronizou) sem ninguém ter pedido.
    //
    // **O que se cobra aqui não é ausência, é DECLARAÇÃO**, e a diferença é a
    // razão de esta bateria existir. Pôr rota não-servida na passagem às vezes é
    // a escolha CERTA: sem handler de mock, a alternativa devolve `index.html`
    // com 200, que é pior que um 501 honesto — foi assim que a impressão de
    // pedido e o timbre entraram. Reprovar cego proibiria a escolha certa e
    // ensinaria a apagar a bateria; não cobrar nada devolveria o silêncio em que
    // as 27 de compras e comissões envelheceram.
    //
    // O par obrigatório, então, é: quem entra adiantado se declara em
    // `PASSAGEM_ADIANTADA`, com a medição junto.
    const declaradas = new Set(PASSAGEM_ADIANTADA.map((r) => `${r.metodo} ${r.caminho}`))

    const semDeclarar = ROTAS_DO_BACKEND.flatMap((rota) => {
      const chave = `${rota.metodo} ${rota.caminho}`
      const medida = naturezaDe(rota.metodo, rota.caminho)
      if (medida === 'servida' || declaradas.has(chave)) return []
      const onde = `${rota.metodo.toUpperCase()} ${rota.caminho}`
      return medida === 'sem-contrato'
        ? [`${onde}: na passagem, e o contrato do api NÃO tem o caminho — 404 na tela`]
        : [`${onde}: na passagem, e o api não tem handler — 501 na tela`]
    })

    // E o outro lado do prazo: exceção que já não é exceção. No dia em que o api
    // implementar, a linha some daqui — senão a lista volta a carregar uma
    // dívida paga, que é a forma mais barata de a próxima pessoa desconfiar da
    // lista inteira.
    const jaPagas = PASSAGEM_ADIANTADA.flatMap((rota) => {
      if (naturezaDe(rota.metodo, rota.caminho) !== 'servida') return []
      return [
        `${rota.metodo.toUpperCase()} ${rota.caminho}: o api TEM handler — tire de PASSAGEM_ADIANTADA (ela já é só passagem)`,
      ]
    })

    expect(semDeclarar, `passagem adiantada sem declarar:\n  ${semDeclarar.join('\n  ')}`).toEqual(
      [],
    )
    expect(jaPagas, `exceção vencida:\n  ${jaPagas.join('\n  ')}`).toEqual([])
  })
})
