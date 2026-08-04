import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Pós-processamento do gerado (Orval). Duas responsabilidades:
 *
 * 1. Marca o gerado como não-verificado pelo TypeScript (`@ts-nocheck`).
 *    POR QUÊ: o projeto roda com `exactOptionalPropertyTypes: true`, e código
 *    gerado por fornecedor não assina essa regra. As saídas eram desligar a
 *    regra no projeto inteiro (perder rigor em 100% do nosso código por causa
 *    de código que não escrevemos) ou marcar o gerado. `exclude` no tsconfig
 *    NÃO resolve: o TypeScript segue os imports e checa o arquivo de qualquer
 *    forma — medido antes de escolher este caminho (era do @hey-api; a classe
 *    de problema não muda com o gerador).
 *    O QUE NÃO SE PERDE: os TIPOS exportados continuam valendo. Nosso código,
 *    ao consumir o cliente, é checado com o rigor de sempre.
 *
 * 2. Anexa `export * from './index.schemas'` ao `index.ts`.
 *    O modo `split` do Orval separa modelos (index.schemas.ts) de operações
 *    (index.ts), mas todo o app importa tipos de '@/api/gerado' — e essa
 *    superfície estável é o que impediu a troca de gerador de virar uma
 *    varredura de imports no repo inteiro.
 */
const RAIZ = 'src/api/gerado'

const AVISO = `// @ts-nocheck
/* GERADO por \`pnpm codegen\` a partir de contracts/openapi-v1.json. NÃO EDITAR.
   \`@ts-nocheck\` é deliberado: ver scripts/pos-codegen.mjs. */
`

const MARCA_REEXPORT = 'Anexado por scripts/pos-codegen.mjs'
const REEXPORT = `
// ${MARCA_REEXPORT}: o app importa os tipos dos modelos de '@/api/gerado'.
export * from './index.schemas';
`

function arquivos(dir) {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome)
    return statSync(caminho).isDirectory()
      ? arquivos(caminho)
      : caminho.endsWith('.ts')
        ? [caminho]
        : []
  })
}

let marcados = 0
for (const caminho of arquivos(RAIZ)) {
  let conteudo = readFileSync(caminho, 'utf8')
  let mudou = false

  if (!conteudo.startsWith('// @ts-nocheck')) {
    conteudo = AVISO + conteudo
    mudou = true
  }

  if (caminho === join(RAIZ, 'index.ts') && !conteudo.includes(MARCA_REEXPORT)) {
    conteudo = conteudo + REEXPORT
    mudou = true
  }

  if (mudou) {
    writeFileSync(caminho, conteudo)
    marcados++
  }
}

console.log(`pos-codegen: ${marcados} arquivo(s) ajustados em ${RAIZ}`)
