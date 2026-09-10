import { type CampoFiltravel, type FiltroDaTabela, operadorPadrao } from '@/lib/filtro-de-consulta'
import { normalize } from '@/lib/texto'

/**
 * BUSCA COM PREFIXO — `forn: mister led` filtra sem abrir popover nenhum.
 *
 * A barra 2.0 (mockup `Listagem › fbar`) tem uma caixa de busca só, e ela faz
 * duas coisas: procura texto livre e monta filtro. Quem digita `sit: enviada`
 * está dizendo a mesma frase que o popover `+ Filtro` montaria em três cliques
 * — e a barra já sabe o vocabulário, porque a tela declarou os campos
 * filtráveis. Sem isto, filtrar por fornecedor exige abrir menu, escolher
 * campo, escolher operador e digitar; é o caminho que o Polaris IndexFilters
 * mantém, e que o Attio e o Linear encurtaram com prefixo.
 *
 * ## O prefixo NÃO é declarado por tela — é deduzido do rótulo
 *
 * `CampoFiltravel` mora em `src/lib/`, e acrescentar um campo `prefixo` ali
 * obrigaria as vinte telas a repetirem `prefixo: 'forn'` embaixo de
 * `rotulo: 'Fornecedor'` — duas grafias da mesma palavra, que divergem no dia
 * em que alguém renomeia uma só. Aqui o prefixo é qualquer começo do rótulo com
 * ao menos {@link MINIMO_DE_LETRAS} letras, desde que aponte para um campo só:
 * `forn:` acha Fornecedor, `sit:` acha Situação, `num:` acha Número, e `si:`
 * não acha nada porque Situação e Sítio disputariam as duas letras.
 *
 * ## Ambíguo não vira filtro, e não vira erro
 *
 * Prefixo que casa dois campos, ou valor de lista que não é nenhuma das opções,
 * volta para a busca livre como texto. É a leitura honesta: `sit: chegou` com
 * "chegou" fora das situações filtraria por nada e devolveria uma lista vazia
 * que o operador leria como "não existe pedido" — quando o que não existe é a
 * situação. Como texto, ao menos a busca livre ainda procura a palavra.
 *
 * ## O `filtroId` é DERIVADO da posição, e isso não é detalhe
 *
 * A listagem compara a consulta velha com a nova serializando os filtros
 * inteiros — `filtroId` incluído — para decidir se vale reconsultar. Um id
 * sorteado a cada leitura faria toda leitura parecer uma pergunta nova: a
 * tabela reconsultaria a cada 300ms para sempre, com a barra parada. Foi
 * exatamente o que aconteceu na primeira versão desta função.
 *
 * ## O valor vai até o PRÓXIMO prefixo, não até o próximo espaço
 *
 * `forn: mister led` é um nome de duas palavras, e o mockup escreve exatamente
 * isso. Cortar no espaço (a regra do Gmail) obrigaria aspas em quase todo nome
 * de fornecedor. Cortar no próximo prefixo conhecido deixa
 * `forn: mister led sit: enviada` virar dois filtros sem nenhuma pontuação.
 */

/** Piso do prefixo: com duas letras, `si:` já disputaria Situação e Sítio. */
export const MINIMO_DE_LETRAS = 3

export interface PrefixoDeBusca {
  /** O que se digita antes dos dois-pontos, já normalizado (`forn`). */
  prefixo: string
  campo: CampoFiltravel
}

/** Só a primeira palavra do rótulo, sem acento: "Data da ordem" → "data". */
function raizDoRotulo(campo: CampoFiltravel): string {
  const limpo = normalize(campo.rotulo)
    .replace(/[^\p{L}\p{N} ]/gu, '')
    .trim()
  return limpo.split(' ')[0] ?? ''
}

/**
 * O prefixo SUGERIDO de cada campo: o menor começo que ainda aponta para um
 * campo só.
 *
 * É o que a dica da caixa mostra. Campo cuja raiz inteira é ambígua (duas
 * colunas "Data …") fica de fora: sugerir `data:` para duas coisas ensinaria um
 * atalho que não funciona.
 */
export function prefixosDaBusca(campos: readonly CampoFiltravel[]): PrefixoDeBusca[] {
  const raizes = campos.map(raizDoRotulo)
  const sugestoes: PrefixoDeBusca[] = []

  campos.forEach((campo, indice) => {
    const raiz = raizes[indice] ?? ''
    if (raiz.length < MINIMO_DE_LETRAS) return
    for (let tamanho = MINIMO_DE_LETRAS; tamanho <= raiz.length; tamanho++) {
      const tentativa = raiz.slice(0, tamanho)
      const donos = raizes.filter((outra) => outra.startsWith(tentativa))
      if (donos.length === 1) {
        sugestoes.push({ prefixo: tentativa, campo })
        return
      }
    }
  })

  return sugestoes
}

/** O campo que este prefixo digitado aponta — `null` se nenhum ou se mais de um. */
export function campoDoPrefixo(
  digitado: string,
  campos: readonly CampoFiltravel[],
): CampoFiltravel | null {
  const alvo = normalize(digitado).trim()
  if (alvo.length < MINIMO_DE_LETRAS) return null
  const donos = campos.filter((campo) => raizDoRotulo(campo).startsWith(alvo))
  return donos.length === 1 ? (donos[0] ?? null) : null
}

/** Pedaço da frase digitada, do jeito que a caixa o pinta. */
export interface PedacoDaBusca {
  texto: string
  tipo: 'texto' | 'prefixo' | 'valor'
}

export interface BuscaInterpretada {
  /** O que sobrou para a busca livre (o `q` do `TableQueryState`). */
  q: string
  /** As frases que viraram filtro de verdade. */
  filtros: FiltroDaTabela[]
  /** A mesma entrada, repartida para o realce — concatenada, reproduz o texto. */
  pedacos: PedacoDaBusca[]
}

/** `Enviada` → o valor que o filtro guarda; `null` quando não é opção nenhuma. */
function valorDaOpcao(campo: CampoFiltravel, escrito: string): string | null {
  const alvo = normalize(escrito).trim()
  if (!alvo) return null
  const exata = campo.opcoes?.find((opcao) => normalize(opcao.rotulo) === alvo)
  if (exata) return exata.valor
  const comecos = (campo.opcoes ?? []).filter((opcao) => normalize(opcao.rotulo).startsWith(alvo))
  return comecos.length === 1 ? (comecos[0]?.valor ?? null) : null
}

/**
 * O filtro que este par prefixo/valor descreve — `null` quando o valor não diz
 * nada que o campo saiba responder.
 */
function filtroDoPar(campo: CampoFiltravel, escrito: string, ordem: number): FiltroDaTabela | null {
  const valor = escrito.trim()
  if (!valor) return null
  const base = { filtroId: `busca-${ordem}-${campo.id}`, id: campo.id, variante: campo.variante }

  if (campo.variante === 'select') {
    const casado = valorDaOpcao(campo, valor)
    return casado === null ? null : { ...base, operador: 'eq', valor: casado }
  }

  if (campo.variante === 'multiSelect') {
    // Vírgula é o separador porque é o que a própria pílula usa para LER a
    // múltipla escolha ("Enviada, Confirmada"): quem copia o que está escrito
    // na barra consegue digitar de volta.
    const casados = valor
      .split(',')
      .map((parte) => valorDaOpcao(campo, parte))
      .filter((v): v is string => v !== null)
    return casados.length === 0 ? null : { ...base, operador: 'inArray', valor: casados }
  }

  if (campo.variante === 'boolean') {
    const alvo = normalize(valor)
    if (alvo === 'sim' || alvo === 'true') return { ...base, operador: 'eq', valor: 'true' }
    if (alvo === 'nao' || alvo === 'false') return { ...base, operador: 'eq', valor: 'false' }
    return null
  }

  if (campo.variante === 'date') {
    // A data trafega em ISO, e é isso que o `<input type="date">` produz. Quem
    // digita `prev: 10/10/2026` escreve como lê — traduzir aqui é a borda.
    const br = valor.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    const iso = br ? `${br[3]}-${br[2]}-${br[1]}` : valor
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null
    return { ...base, operador: 'eq', valor: iso }
  }

  if (campo.variante === 'number') {
    if (!/^-?\d+([.,]\d+)?$/.test(valor)) return null
    return { ...base, operador: 'eq', valor: valor.replace(',', '.') }
  }

  return { ...base, operador: operadorPadrao('text'), valor }
}

/** Casa `palavra:` em qualquer ponto da frase. */
const MARCA_DE_PREFIXO = /(\p{L}+):/gu

/**
 * Lê a caixa de busca inteira: o que é filtro vira filtro, o resto continua
 * sendo busca livre.
 */
export function interpretarBusca(
  texto: string,
  campos: readonly CampoFiltravel[],
): BuscaInterpretada {
  const pedacos: PedacoDaBusca[] = []
  const filtros: FiltroDaTabela[] = []
  const livres: string[] = []

  if (campos.length === 0) {
    return { q: texto.trim(), filtros: [], pedacos: texto ? [{ texto, tipo: 'texto' }] : [] }
  }

  // Onde cada prefixo VÁLIDO começa. Marca que não aponta para campo nenhum
  // (`http:`) não entra, e por isso não corta o valor do prefixo anterior.
  const marcas: { inicio: number; fim: number; campo: CampoFiltravel }[] = []
  const regex = new RegExp(MARCA_DE_PREFIXO)
  let achado = regex.exec(texto)
  while (achado !== null) {
    const campo = campoDoPrefixo(achado[1] ?? '', campos)
    if (campo) marcas.push({ inicio: achado.index, fim: achado.index + achado[0].length, campo })
    achado = regex.exec(texto)
  }

  let cursor = 0
  marcas.forEach((marca, indice) => {
    if (marca.inicio > cursor) {
      const antes = texto.slice(cursor, marca.inicio)
      pedacos.push({ texto: antes, tipo: 'texto' })
      if (antes.trim()) livres.push(antes.trim())
    }
    const fimDoValor = marcas[indice + 1]?.inicio ?? texto.length
    const marcador = texto.slice(marca.inicio, marca.fim)
    const escrito = texto.slice(marca.fim, fimDoValor)
    const filtro = filtroDoPar(marca.campo, escrito, indice)
    if (filtro) {
      pedacos.push({ texto: marcador, tipo: 'prefixo' })
      pedacos.push({ texto: escrito, tipo: 'valor' })
      filtros.push(filtro)
    } else {
      // Par que não filtrou não se pinta: destacar `sit:` enquanto "chegou"
      // não é situação nenhuma prometeria um filtro que a lista não sofreu.
      // O `sit:` também não vai para a busca livre — procurar a palavra que a
      // pessoa usou para NOMEAR o campo devolveria zero registro no meio da
      // digitação, e a lista piscaria vazia entre uma letra e outra.
      pedacos.push({ texto: marcador, tipo: 'texto' })
      pedacos.push({ texto: escrito, tipo: 'texto' })
      if (escrito.trim()) livres.push(escrito.trim())
    }
    cursor = fimDoValor
  })

  if (cursor < texto.length) {
    const resto = texto.slice(cursor)
    pedacos.push({ texto: resto, tipo: 'texto' })
    if (resto.trim()) livres.push(resto.trim())
  }

  return { q: livres.join(' '), filtros, pedacos }
}
