import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Marca o cliente gerado como não-verificado pelo TypeScript.
 *
 * POR QUÊ: o projeto roda com `exactOptionalPropertyTypes: true`, e o código do
 * `@hey-api` não satisfaz essa regra — são ~13 erros, todos dentro dos arquivos
 * DELE. As saídas eram desligar a regra no projeto inteiro (perder rigor em 100%
 * do nosso código por causa de código que não escrevemos) ou marcar o gerado.
 *
 * `exclude` no tsconfig NÃO resolve: o TypeScript segue os imports e checa o
 * arquivo de qualquer forma. Medido antes de escolher este caminho.
 *
 * O QUE NÃO SE PERDE: os TIPOS exportados continuam valendo. Nosso código, ao
 * consumir o cliente, é checado com o rigor de sempre — a divergência com o
 * contrato do backend continua aparecendo em `pnpm check-types`. O que deixa de
 * ser checado é a implementação interna do fornecedor.
 */
const RAIZ = 'src/api/gerado'

const AVISO = `// @ts-nocheck
/* GERADO por \`pnpm codegen\` a partir de contracts/openapi-v1.json. NÃO EDITAR.
   \`@ts-nocheck\` é deliberado: ver scripts/pos-codegen.mjs. */
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
  const conteudo = readFileSync(caminho, 'utf8')
  if (conteudo.startsWith('// @ts-nocheck')) continue
  writeFileSync(caminho, AVISO + conteudo)
  marcados++
}

console.log(`pos-codegen: ${marcados} arquivo(s) marcados em ${RAIZ}`)
