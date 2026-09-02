import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'

/**
 * O DELTA ENTRE A BASELINE VERSIONADA E O CONTRATO VIVO.
 *
 * `contracts/baseline/v1.0.0.json` é a versão que o Spring implementa: uma foto
 * com nome, congelada, que não se move enquanto os trilhos do front continuam
 * editando `contracts/openapi-v1.json` por PR. Este script responde a pergunta
 * que separa as duas — **o que o contrato vivo já tem e a versão 1.0.0 não
 * tinha?** — e é o que diz quando há material suficiente para uma `1.1.0`.
 *
 * Ele imprime TRÊS classes, e a terceira é a razão de o script existir:
 *
 *   NOVAS      operationId que não estava na baseline. Adição — o que a regra
 *              aditiva permite, e o que o Spring vai implementar a mais.
 *   REMOVIDAS  saiu do contrato. A regra aditiva PROÍBE em 1.x; se aparecer
 *              aqui, alguém quebrou a versão (o job `contrato-compat` reprova).
 *   ALTERADAS  mesmo operationId, outro significado. Invisível a olho nu, e a
 *              única classe que uma contagem de operações não pega.
 *
 * ## Por que a impressão inclui os componentes referenciados
 *
 * Uma operação do OpenAPI é uma casca: quase todo o significado dela mora em
 * `components/`, atrás de `$ref`. Trocar `PartnerWriteRequest` muda o que sete
 * operações aceitam sem tocar num único byte dentro de `paths`. Comparar só o
 * nó da operação diria "nada mudou" no dia em que mais mudou.
 *
 * Por isso a impressão de cada operação é o hash do FECHAMENTO TRANSITIVO: o nó
 * da operação, mais todo componente alcançável por `$ref` a partir dele, mais o
 * que ela herda e não declara — os parâmetros do path item e o `security` do
 * topo do documento, que só vale por herança para quem não declara o seu.
 *
 * ## O que ele deliberadamente NÃO faz
 *
 * Não julga se a mudança é compatível: isso é do `oasdiff` no job
 * `contrato-compat`, que conhece as regras do OpenAPI e sabe que campo opcional
 * novo passa e campo obrigatório novo não. Aqui a pergunta é de INVENTÁRIO —
 * quanta coisa nova acumulou desde a versão publicada.
 *
 * Não diz o que MUDOU dentro da operação alterada, só que mudou. Quem quer o
 * detalhe roda `git diff --no-index` entre os dois arquivos com o nome em mãos
 * — e aí o diff tem um alvo, que é a parte cara de achar.
 *
 * Não fala com servidor nenhum. "O que a api congelada SERVE" é outra pergunta,
 * medida uma vez e escrita em `docs/spring/contrato.md`; ela não muda mais,
 * porque a api Node não muda mais.
 *
 *   pnpm contrato:delta          relatório em texto
 *   pnpm contrato:delta --json   o mesmo, para outro programa ler
 */

const BASELINE = 'contracts/baseline/v1.0.0.json'
const SOMA_DA_BASELINE = 'contracts/baseline/v1.0.0.sha256'
const VIVO = 'contracts/openapi-v1.json'

const VERBOS = new Set(['get', 'put', 'post', 'delete', 'patch', 'options', 'head', 'trace'])

/** Ordena as chaves em profundidade: a serialização não pode depender da ordem de escrita. */
function canonico(valor) {
  if (Array.isArray(valor)) return valor.map(canonico)
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(
      Object.keys(valor)
        .sort()
        .map((chave) => [chave, canonico(valor[chave])]),
    )
  }
  return valor
}

/** Todo `$ref` que aparece em qualquer profundidade do nó. */
function refsDe(no, achados = new Set()) {
  if (Array.isArray(no)) {
    for (const item of no) refsDe(item, achados)
    return achados
  }
  if (no && typeof no === 'object') {
    for (const [chave, valor] of Object.entries(no)) {
      if (chave === '$ref' && typeof valor === 'string') achados.add(valor)
      else refsDe(valor, achados)
    }
  }
  return achados
}

/** `#/components/schemas/X` -> o nó, seguindo o escape de JSON Pointer. */
function resolver(documento, ref) {
  if (!ref.startsWith('#/')) return undefined
  let no = documento
  for (const bruto of ref.slice(2).split('/')) {
    const parte = bruto.replaceAll('~1', '/').replaceAll('~0', '~')
    if (no == null || typeof no !== 'object') return undefined
    no = no[parte]
  }
  return no
}

/** O fechamento transitivo dos `$ref` — um componente pode referenciar outro. */
function componentesAlcancados(documento, raiz) {
  const alcancados = new Map()
  const fila = [...refsDe(raiz)]
  while (fila.length > 0) {
    const ref = fila.pop()
    if (alcancados.has(ref)) continue
    const alvo = resolver(documento, ref)
    alcancados.set(ref, alvo)
    if (alvo !== undefined) fila.push(...refsDe(alvo))
  }
  return alcancados
}

/**
 * O hash que identifica o SIGNIFICADO da operação — mudou a impressão, mudou o
 * que o Spring precisa implementar.
 */
export function impressaoDaOperacao(documento, operacao, itemDoCaminho) {
  const alcancados = componentesAlcancados(documento, operacao)
  const componentes = {}
  for (const ref of [...alcancados.keys()].sort()) {
    componentes[ref] = canonico(alcancados.get(ref) ?? null)
  }
  const herdado = {}
  // Parâmetro do path item vale para todos os verbos daquele caminho.
  if (itemDoCaminho?.parameters !== undefined) {
    herdado.parameters = canonico(itemDoCaminho.parameters)
  }
  // `security` do topo só chega a quem não declara o seu — ver a regra de
  // "operação nova NASCE exigindo sessão" no CLAUDE.md.
  if (operacao.security === undefined && documento.security !== undefined) {
    herdado.security = canonico(documento.security)
  }
  const material = JSON.stringify({
    operacao: canonico(operacao),
    componentes,
    herdado,
  })
  return createHash('sha256').update(material).digest('hex')
}

/** operationId -> { metodo, caminho, impressao }. */
export function operacoesDe(documento) {
  const mapa = new Map()
  for (const [caminho, item] of Object.entries(documento.paths ?? {})) {
    for (const [metodo, operacao] of Object.entries(item)) {
      if (!VERBOS.has(metodo)) continue
      const id = operacao.operationId ?? `${metodo.toUpperCase()} ${caminho}`
      mapa.set(id, {
        metodo: metodo.toUpperCase(),
        caminho,
        impressao: impressaoDaOperacao(documento, operacao, item),
      })
    }
  }
  return mapa
}

/**
 * As três classes de mudança. `alteradas` é a que justifica o script existir:
 * as outras duas se veriam contando linhas.
 */
export function compararContratos(baseline, vivo) {
  const antes = operacoesDe(baseline)
  const agora = operacoesDe(vivo)

  const novas = []
  const alteradas = []
  for (const [id, atual] of agora) {
    const anterior = antes.get(id)
    if (anterior === undefined) novas.push({ id, ...atual })
    else if (anterior.impressao !== atual.impressao) alteradas.push({ id, ...atual })
  }
  const removidas = []
  for (const [id, anterior] of antes) {
    if (!agora.has(id)) removidas.push({ id, ...anterior })
  }

  const porNome = (a, b) => a.id.localeCompare(b.id)
  return {
    totalBaseline: antes.size,
    totalVivo: agora.size,
    novas: novas.sort(porNome),
    removidas: removidas.sort(porNome),
    alteradas: alteradas.sort(porNome),
  }
}

function ler(caminho) {
  const bruto = readFileSync(caminho)
  return {
    documento: JSON.parse(bruto.toString()),
    sha: createHash('sha256').update(bruto).digest('hex'),
  }
}

/**
 * A soma sai do arquivo `.sha256`, no formato do `sha256sum`, e não de uma
 * constante aqui dentro. A diferença não é de estilo: o Spring confere a MESMA
 * linha no CI dele, e uma constante em JavaScript não é conferível de fora.
 */
export function somaEsperada(caminhoDoArquivo = SOMA_DA_BASELINE, alvo = BASELINE) {
  const linha = readFileSync(caminhoDoArquivo).toString().trim()
  const [soma, nome] = linha.split(/\s+/)
  if (!/^[0-9a-f]{64}$/.test(soma ?? '')) {
    throw new Error(`${caminhoDoArquivo} não tem uma soma sha256 na primeira linha: ${linha}`)
  }
  // `sha256sum` grava o nome como foi passado; aqui ele é sempre relativo à
  // pasta da baseline. Conferir evita o par soma-de-um-arquivo/nome-de-outro.
  const esperado = join(dirname(caminhoDoArquivo), nome?.replace(/^\*/, '') ?? '')
  if (basename(esperado) !== basename(alvo)) {
    throw new Error(`${caminhoDoArquivo} descreve ${nome}, e a baseline é ${basename(alvo)}`)
  }
  return soma
}

function bloco(titulo, itens, explicacao) {
  console.log(`\n${titulo} (${itens.length})`)
  if (itens.length === 0) {
    console.log('  —')
    return
  }
  console.log(`  ${explicacao}`)
  for (const item of itens) {
    console.log(`  ${item.metodo.padEnd(6)} ${item.caminho.padEnd(46)} · ${item.id}`)
  }
}

function principal(argumentos) {
  const baseline = ler(BASELINE)
  const soma = somaEsperada()
  if (baseline.sha !== soma) {
    console.error(
      [
        'A baseline mudou.',
        `  esperado: ${soma}  (${SOMA_DA_BASELINE})`,
        `  medido:   ${baseline.sha}`,
        '',
        `${BASELINE} é a versão 1.0.0 congelada: o Spring implementa esse arquivo e`,
        'confere essa soma. Um alvo que se move não é versão. Se a mudança não foi',
        'intencional (um formatador que passou pela pasta, um merge), desfaça com',
        `\`git checkout ${BASELINE}\`. Se a intenção era publicar outra versão, ela`,
        'nasce em `contracts/baseline/v1.1.0.json` — a 1.0.0 nunca é reescrita.',
        'Ver docs/spring/contrato.md §Como sai uma versão nova.',
      ].join('\n'),
    )
    return 1
  }

  const vivo = ler(VIVO)
  const delta = compararContratos(baseline.documento, vivo.documento)

  if (argumentos.includes('--json')) {
    console.log(
      JSON.stringify(
        {
          baseline: BASELINE,
          versaoDaBaseline: baseline.documento.info?.version ?? null,
          sha256: baseline.sha,
          vivo: VIVO,
          versaoDoVivo: vivo.documento.info?.version ?? null,
          ...delta,
        },
        null,
        2,
      ),
    )
    return 0
  }

  console.log(`baseline  ${BASELINE}`)
  console.log(
    `          ${baseline.documento.info?.version} · ${delta.totalBaseline} operações · sha256 conferido`,
  )
  console.log(`vivo      ${VIVO}`)
  console.log(`          ${vivo.documento.info?.version} · ${delta.totalVivo} operações`)

  bloco('NOVAS desde a baseline', delta.novas, 'entram na próxima versão — o Spring ainda não viu:')
  bloco(
    'REMOVIDAS desde a baseline',
    delta.removidas,
    'a regra aditiva PROÍBE em 1.x — o job contrato-compat reprova:',
  )
  bloco(
    'ALTERADAS desde a baseline',
    delta.alteradas,
    'mesmo operationId, outro significado — `git diff --no-index` entre os dois diz o quê:',
  )

  console.log(
    delta.novas.length === 0
      ? '\n0 operações novas desde a 1.0.0.'
      : `\n${delta.novas.length} operações novas desde a 1.0.0. Ver docs/spring/contrato.md §Como sai uma versão nova.`,
  )
  return 0
}

if (import.meta.filename === process.argv[1]) {
  process.exitCode = principal(process.argv.slice(2))
}
