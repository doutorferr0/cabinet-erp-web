import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

/**
 * Confere a CÓPIA do contrato contra o original do backend.
 *
 * `contracts/openapi-v1.json` é cópia versionada de
 * `docs/contrato/openapi-v1.json` do `doutorferr0/vitra-erp-dotnet`. Cópia e não
 * referência porque são dois repositórios — mas cópia sem conferência envelhece
 * em silêncio: o front seguiria gerando cliente de um contrato que o backend já
 * mudou, e a divergência apareceria como 404 ou campo faltando em runtime.
 *
 * Roda LOCAL, não no CI: o repo do backend é privado e o CI do front não tem
 * credencial para ele. A guarda que o CI faz é a outra metade — que o cliente
 * gerado corresponde à cópia (passo `Codegen is up to date`).
 *
 *   pnpm contrato:conferir
 *
 * Exige `gh auth login` com acesso ao repo do backend.
 */
const REPO = 'doutorferr0/vitra-erp-dotnet'
const CAMINHO_NO_BACKEND = 'docs/contrato/openapi-v1.json'
const COPIA_LOCAL = 'contracts/openapi-v1.json'

function baixarDoBackend() {
  try {
    const base64 = execFileSync(
      'gh',
      ['api', `repos/${REPO}/contents/${CAMINHO_NO_BACKEND}`, '--jq', '.content'],
      { encoding: 'utf8' },
    )
    return JSON.parse(Buffer.from(base64, 'base64').toString('utf8'))
  } catch (erro) {
    console.error(`Não foi possível ler ${CAMINHO_NO_BACKEND} de ${REPO}.`)
    console.error('Confira `gh auth status` e o acesso ao repositório do backend.')
    console.error(String(erro.message ?? erro).trim())
    process.exit(2)
  }
}

/** Diferença por chave, para o relatório dizer O QUE mudou, não só QUE mudou. */
function comparar(rotulo, aqui, la) {
  const chavesAqui = Object.keys(aqui ?? {})
  const chavesLa = Object.keys(la ?? {})
  const sumiram = chavesAqui.filter((k) => !chavesLa.includes(k))
  const surgiram = chavesLa.filter((k) => !chavesAqui.includes(k))
  const mudaram = chavesAqui
    .filter((k) => chavesLa.includes(k))
    .filter((k) => JSON.stringify(aqui[k]) !== JSON.stringify(la[k]))

  for (const [titulo, lista] of [
    [`${rotulo} NOVO no backend`, surgiram],
    [`${rotulo} REMOVIDO no backend`, sumiram],
    [`${rotulo} ALTERADO`, mudaram],
  ]) {
    for (const item of lista) console.log(`  ${titulo}: ${item}`)
  }
  return surgiram.length + sumiram.length + mudaram.length
}

const copia = JSON.parse(readFileSync(COPIA_LOCAL, 'utf8'))
const original = baixarDoBackend()

if (JSON.stringify(copia) === JSON.stringify(original)) {
  console.log(`contrato: em dia com ${REPO}:${CAMINHO_NO_BACKEND}`)
  process.exit(0)
}

console.log(`contrato: DIVERGE de ${REPO}:${CAMINHO_NO_BACKEND}`)
const mudancas =
  comparar('endpoint', copia.paths, original.paths) +
  comparar('schema', copia.components?.schemas, original.components?.schemas)

if (mudancas === 0) console.log('  (diferença fora de paths/schemas — comparar o arquivo inteiro)')

console.log(`\nPara atualizar: copie ${CAMINHO_NO_BACKEND} do backend sobre ${COPIA_LOCAL},`)
console.log('rode `pnpm codegen` e commite os dois juntos — o diff é a notificação da mudança.')
process.exit(1)
