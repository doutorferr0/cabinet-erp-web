import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ERROS_CANONICOS, type TipoCanonico, corpoCanonico, erroCanonico } from './erros-canonicos'
import { TIPO } from './problema'

/**
 * A guarda do catálogo de erro — e a razão de ela existir é que TRÊS lugares
 * descrevem o mesmo problem+json e nenhum deles roda o outro.
 *
 * O contrato (`ProblemType`) diz o status e o `title` de cada URN, numa tabela
 * de markdown dentro da própria `description`. `erros-canonicos.ts` diz o corpo
 * que o mock emite. `docs/spring/erros.md` é o que o time do Spring lê. Sem
 * ninguém confrontando os três, o status daqui pode divergir do contrato e a
 * doc pode descrever um mock que mudou — e as três cópias continuariam
 * compilando, que é como uma divergência dessas chega à produção.
 */

const RAIZ = join(import.meta.dirname, '../../..')

type LinhaDoContrato = { status: string; title: string; quando: string }

/** A tabela `type | status | title | quando` que o contrato publica no `ProblemType`. */
function tabelaDoContrato(): Map<string, LinhaDoContrato> {
  const contrato = JSON.parse(readFileSync(join(RAIZ, 'contracts/openapi-v1.json'), 'utf8')) as {
    components: { schemas: { ProblemType: { description: string; enum: string[] } } }
  }
  const descricao = contrato.components.schemas.ProblemType.description
  const linhas = descricao.split('\n').filter((l) => l.startsWith('|'))
  const mapa = new Map<string, LinhaDoContrato>()
  // As duas primeiras são o cabeçalho e o separador.
  for (const linha of linhas.slice(2)) {
    const celulas = linha
      .trim()
      .replace(/^\||\|$/g, '')
      .split('|')
    if (celulas.length !== 4) continue
    const [tipo, status, title, quando] = celulas.map((c) => c.trim())
    mapa.set(tipo.replace(/`/g, ''), { status, title, quando })
  }
  return mapa
}

function enumDoContrato(): string[] {
  const contrato = JSON.parse(readFileSync(join(RAIZ, 'contracts/openapi-v1.json'), 'utf8')) as {
    components: { schemas: { ProblemType: { enum: string[] } } }
  }
  return contrato.components.schemas.ProblemType.enum
}

/**
 * As URNs que algum handler do mock EMITE hoje, medidas no fonte.
 *
 * Varre por `TIPO.<apelido>` e pelos construtores nomeados de `problema.ts` —
 * as duas formas em que uma URN chega à resposta. É a sonda que invalida o
 * campo `origem`: sem ela, a declaração de ausência ficaria verde para sempre.
 */
function urnsEmitidasPeloMock(): Set<string> {
  const dir = join(RAIZ, 'src/mocks/api')
  const construtores: Record<string, string> = {
    semSessao: 'urn:cabinet:erro:sem-sessao',
    semEmpresaAtiva: 'urn:cabinet:erro:sem-empresa-ativa',
    naoEncontrado: 'urn:cabinet:erro:nao-encontrado',
    camposInvalidos: 'urn:cabinet:erro:campos-invalidos',
    naoImplementado: 'urn:cabinet:erro:nao-implementado',
  }
  const emitidas = new Set<string>()
  for (const nome of readdirSync(dir)) {
    if (!nome.endsWith('.ts')) continue
    // `problema.ts` DEFINE o vocabulário e `erros-canonicos.ts` o cataloga —
    // nenhum dos dois é handler, e contá-los daria todas as URNs por emitidas.
    if (nome === 'problema.ts' || nome === 'erros-canonicos.ts') continue
    if (nome.endsWith('.test.ts')) continue
    const fonte = readFileSync(join(dir, nome), 'utf8')
    for (const [apelido, urn] of Object.entries(TIPO)) {
      if (new RegExp(`\\bTIPO\\.${apelido}\\b`).test(fonte)) emitidas.add(urn)
    }
    for (const [construtor, urn] of Object.entries(construtores)) {
      if (new RegExp(`\\b${construtor}\\(`).test(fonte)) emitidas.add(urn)
    }
    // A fixture: `erroCanonico('urn:…')`.
    for (const achado of fonte.matchAll(/erroCanonico\(\s*'(urn:cabinet:erro:[a-z-]+)'/g)) {
      emitidas.add(achado[1])
    }
  }
  return emitidas
}

const tabela = tabelaDoContrato()
const tipos = Object.keys(ERROS_CANONICOS) as TipoCanonico[]

describe('catálogo de erros canônicos', () => {
  it('cobre o vocabulário INTEIRO do contrato, menos o about:blank', () => {
    const doContrato = enumDoContrato()
      .filter((t) => t !== 'about:blank')
      .sort()
    expect([...tipos].sort()).toEqual(doContrato)
  })

  it.each(tipos)('%s tem o status que o contrato declara', (tipo) => {
    const linha = tabela.get(tipo)
    expect(linha, `${tipo} não está na tabela do ProblemType`).toBeDefined()
    // `resposta-nao-json` é o único sem status HTTP: nenhum servidor o emite,
    // e o contrato escreve `0` para dizer justamente isso.
    expect(String(ERROS_CANONICOS[tipo].status)).toBe(linha?.status)
  })

  it.each(tipos)('%s monta o corpo com o title canônico do contrato', (tipo) => {
    const corpo = corpoCanonico(tipo)
    expect(corpo.type).toBe(tipo)
    expect(`\`${corpo.title}\``).toBe(tabela.get(tipo)?.title)
    expect(corpo.detail).toBeTruthy()
  })

  it('a origem declarada bate com o que o fonte do mock emite', () => {
    const emitidas = urnsEmitidasPeloMock()
    const divergentes = tipos.filter((tipo) => {
      const { origem } = ERROS_CANONICOS[tipo]
      // `cliente` não é assunto do mock — quem a sintetiza é `src/api/http.ts`.
      if (origem === 'cliente') return false
      return emitidas.has(tipo) !== (origem === 'mock')
    })
    expect(
      divergentes,
      'origem declarada em erros-canonicos.ts diverge do fonte de src/mocks/api',
    ).toEqual([])
  })

  it('a resposta carrega status, type, title e detail da fixture', async () => {
    const resposta = erroCanonico('urn:cabinet:erro:email-ja-cadastrado')
    expect(resposta.status).toBe(409)
    expect(resposta.headers.get('content-type')).toContain('application/problem+json')
    await expect(resposta.json()).resolves.toMatchObject({
      type: 'urn:cabinet:erro:email-ja-cadastrado',
      title: 'E-mail já cadastrado',
      status: 409,
      detail: 'Já existe um colaborador com este e-mail.',
    })
  })

  it('o detail do ponto de chamada substitui o canônico, e o resto não muda', async () => {
    const resposta = erroCanonico(
      'urn:cabinet:erro:codigo-ja-cadastrado',
      {},
      'Já existe produto com o código LUM-999.',
    )
    await expect(resposta.json()).resolves.toMatchObject({
      type: 'urn:cabinet:erro:codigo-ja-cadastrado',
      title: 'Código já cadastrado',
      detail: 'Já existe produto com o código LUM-999.',
    })
  })

  it('o membro de extensão declarado atravessa a serialização', async () => {
    const resposta = erroCanonico('urn:cabinet:erro:documento-ja-cadastrado', {
      existingPartnerId: 'parc-1',
    })
    await expect(resposta.json()).resolves.toMatchObject({ existingPartnerId: 'parc-1' })
  })
})

// --------------------------------------------------------------------------
// A doc do Spring — gerada daqui, para não virar uma quarta cópia.

const DOC = join(RAIZ, 'docs/spring/erros.md')
const INICIO = '<!-- catalogo:inicio -->'
const FIM = '<!-- catalogo:fim -->'

function celula(texto: string): string {
  return texto.replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

function tabelaGerada(): string {
  const linhas = [
    '| URN | status | `title` | quando | `detail` de exemplo | extensões | emite hoje |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  ]
  const doContrato = tabela.get('about:blank')
  linhas.push(
    `| \`about:blank\` | ${celula(doContrato?.status ?? '')} | ${celula(doContrato?.title ?? '')} | ${celula(doContrato?.quando ?? '')} | a frase de quem recusou | — | mock |`,
  )
  for (const tipo of tipos) {
    const { extensoes, origem } = ERROS_CANONICOS[tipo]
    const linha = tabela.get(tipo)
    const corpo = corpoCanonico(tipo)
    const ext = extensoes.length ? extensoes.map((e) => `\`${e}\``).join(' · ') : '—'
    const quem =
      origem === 'mock' ? 'mock' : origem === 'cliente' ? '**cliente**' : '**só contrato**'
    linhas.push(
      `| \`${tipo}\` | ${corpo.status} | \`${corpo.title}\` | ${celula(linha?.quando ?? '')} | ${celula(corpo.detail ?? '')} | ${ext} | ${quem} |`,
    )
  }
  return linhas.join('\n')
}

describe('docs/spring/erros.md', () => {
  it('publica a tabela gerada do contrato e da fixture', () => {
    const doc = readFileSync(DOC, 'utf8')
    const [antes, resto] = doc.split(INICIO)
    const [miolo, depois] = resto.split(FIM)
    const esperado = `\n${tabelaGerada()}\n`

    if (miolo !== esperado && process.env.ATUALIZAR_DOC_DE_ERROS) {
      writeFileSync(DOC, `${antes}${INICIO}${esperado}${FIM}${depois}`)
      return
    }
    expect(
      miolo,
      'docs/spring/erros.md está velha — rode ATUALIZAR_DOC_DE_ERROS=1 pnpm test erros-canonicos',
    ).toBe(esperado)
  })
})
