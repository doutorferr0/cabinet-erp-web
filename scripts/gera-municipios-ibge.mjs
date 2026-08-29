/**
 * GERADOR do dataset de municípios — `src/data/geografia/municipios-ibge.json`.
 *
 * Rodar: `node scripts/gera-municipios-ibge.mjs`. Sem entrada no `package.json` de
 * propósito — o dataset se regera à mão, quando o IBGE muda, e não a cada build.
 *
 * POR QUE UM GERADOR, e não 5571 linhas coladas à mão: a lista muda (município
 * novo, mudança de grafia) e ninguém revisa 5571 linhas num diff. Aqui o que se
 * revisa é ESTE arquivo — a fonte, o recorte e a forma da saída —, e o JSON é
 * artefato reproduzível: rodar de novo com a mesma resposta do IBGE devolve
 * byte a byte o mesmo arquivo (chaves ordenadas, ordenação estável, uma UF por
 * linha), então o diff mostra só o que o IBGE mudou.
 *
 * FONTE: API de Localidades do IBGE, malha vigente.
 *   https://servicodados.ibge.gov.br/api/v1/localidades/municipios
 * É pública, sem chave, sem limite declarado. O `id` de cada município É o
 * código do IBGE de 7 dígitos — o mesmo que a NF-e exige em `cMun`. Guardá-lo
 * agora é o que evita reconciliar cadastro na fase fiscal.
 *
 * RECORTE: só `{ codigo, nome, uf }`. A resposta traz microrregião, mesorregião,
 * região imediata e intermediária — ~2,4 MB que nenhuma tela usa. A UF sai de
 * `regiao-imediata.regiao-intermediaria.UF.sigla`, e NÃO de `microrregiao`:
 * medido em 28/08/2026, um município ('Boa Esperança do Norte', MT) vem com
 * `microrregiao: null`, e ler por ali o deixaria sem UF em silêncio.
 *
 * O gerador REPROVA (sai 1) se a resposta vier menor que 5000 municípios, sem
 * as 27 UFs ou com algum código fora de 7 dígitos: asset de geografia truncado
 * é pior que asset velho — some cidade da busca sem ninguém perceber.
 */

import { writeFile } from 'node:fs/promises'

const FONTE = 'https://servicodados.ibge.gov.br/api/v1/localidades/municipios'
const SAIDA = new URL('../src/data/geografia/municipios-ibge.json', import.meta.url)
const UFS_ESPERADAS = 27
const MINIMO_DE_MUNICIPIOS = 5000

const resposta = await fetch(FONTE)
if (!resposta.ok) {
  console.error(`IBGE respondeu ${resposta.status} ${resposta.statusText}`)
  process.exit(1)
}
const bruto = await resposta.json()

/** @type {Record<string, [number, string][]>} */
const porUf = {}
for (const municipio of bruto) {
  const uf = municipio['regiao-imediata']?.['regiao-intermediaria']?.UF?.sigla
  if (!uf) {
    console.error(`Município sem UF: ${municipio.id} ${municipio.nome}`)
    process.exit(1)
  }
  if (!/^\d{7}$/.test(String(municipio.id))) {
    console.error(`Código fora de 7 dígitos: ${municipio.id} ${municipio.nome}`)
    process.exit(1)
  }
  porUf[uf] ??= []
  porUf[uf].push([municipio.id, municipio.nome])
}

const comparador = new Intl.Collator('pt-BR')
for (const lista of Object.values(porUf)) {
  lista.sort((a, b) => comparador.compare(a[1], b[1]) || a[0] - b[0])
}

const total = bruto.length
const ufs = Object.keys(porUf).sort()
if (total < MINIMO_DE_MUNICIPIOS || ufs.length !== UFS_ESPERADAS) {
  console.error(`Resposta suspeita: ${total} municípios em ${ufs.length} UFs — nada foi escrito.`)
  process.exit(1)
}

// Uma UF por linha: 5571 linhas num diff não se lê, 27 sim.
const corpo = ufs.map((uf) => `  ${JSON.stringify(uf)}: ${JSON.stringify(porUf[uf])}`).join(',\n')
const json = `{
 "fonte": ${JSON.stringify(FONTE)},
 "geradoEm": ${JSON.stringify(new Date().toISOString().slice(0, 10))},
 "total": ${total},
 "ufs": {
${corpo}
 }
}
`

await writeFile(SAIDA, json, 'utf8')
console.info(`${total} municípios em ${ufs.length} UFs → ${SAIDA.pathname}`)
