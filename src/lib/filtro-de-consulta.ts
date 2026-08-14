import { normalize } from '@/lib/texto'
import type { LucideIcon } from 'lucide-react'

/**
 * FILTRO DE CONSULTA — vocabulário e avaliação.
 *
 * Portado de **sadmann7/shadcn-table** (MIT, Copyright (c) 2024 Sadman Sakib —
 * https://github.com/sadmann7/shadcn-table), reunindo o que lá está repartido em
 * `src/config/data-table.ts`, `src/types/data-table.ts` e `src/lib/data-table.ts`.
 * O aviso de licença está no `NOTICE` da raiz.
 *
 * ## O que mudou na travessia, e por quê
 *
 * - **Os valores continuam em INGLÊS; os rótulos, não.** `iLike`, `eq`, `and` são
 *   o que um dia viaja para o servidor, e a listagem já tem essa regra escrita:
 *   o `accessorKey` da coluna é o nome que a whitelist de `sortBy` aceita
 *   (CLAUDE.md, padrão 1). Traduzir o operador criaria um segundo vocabulário
 *   para o mesmo conceito, com tradução no meio — que é exatamente onde a
 *   ordenação já quebrou uma vez. O rótulo que o operador lê é PT-BR e vive só
 *   na borda de exibição.
 * - **`date` existe, e o `Calendar` do original NÃO foi portado.** A primeira
 *   versão deixou data de fora dizendo que faltava dependência de calendário; era
 *   erro de leitura do próprio repo, que já usa `<Input type="date">` nativo no
 *   `DateField`. A data trafega em ISO (`yyyy-mm-dd`), que é exatamente o que o
 *   input nativo produz e consome — o calendário do sistema operacional faz o
 *   papel do widget, de graça e com o teclado que a pessoa já conhece.
 * - **Sem `dateRange` como variante separada.** No original ela existe só para o
 *   Calendar em modo intervalo; aqui `date` + `isBetween` já dá dois campos de
 *   data, e uma variante a mais para o mesmo resultado seria escolha sem
 *   consequência na tela.
 * - **Sem `range` (slider).** Mesmo motivo: o original usa um Slider que aqui não
 *   existe. `number` + `isBetween` cobre o caso com dois campos numéricos.
 * - **Sem reordenar filtro por arrastar.** A junção é uma só para a lista inteira
 *   (`and` OU `or`, como no original), então a ordem das linhas não muda
 *   resultado — o `dnd-kit` do original pagaria uma dependência por um efeito
 *   puramente estético.
 * - **Sem atalho de teclado.** O original abre o painel com `Ctrl+Shift+F`;
 *   CLAUDE.md proíbe atalho customizado novo (interface por clique).
 *
 * ## Dinheiro fica de fora de propósito
 *
 * Não existe variante de dinheiro. O dado trafega em centavos (int), então um
 * campo `number` sobre salário compararia com centavos e "1000" filtraria R$
 * 10,00 — número certo, significado errado. Enquanto não houver variante que
 * converta na borda, coluna de dinheiro não entra na lista de campos filtráveis.
 */

export const VARIANTES = ['text', 'number', 'date', 'boolean', 'select', 'multiSelect'] as const
export type VarianteDeFiltro = (typeof VARIANTES)[number]

export const OPERADORES = [
  'iLike',
  'notILike',
  'eq',
  'ne',
  'lt',
  'lte',
  'gt',
  'gte',
  'isBetween',
  'inArray',
  'notInArray',
  'isEmpty',
  'isNotEmpty',
] as const
export type OperadorDeFiltro = (typeof OPERADORES)[number]

export const JUNCOES = ['and', 'or'] as const
export type Juncao = (typeof JUNCOES)[number]

/** A junção é a única palavra do vocabulário que o operador LÊ no meio da frase. */
export const ROTULO_DA_JUNCAO: Record<Juncao, string> = { and: 'e', or: 'ou' }

export interface OpcaoDeFiltro {
  valor: string
  rotulo: string
}

/**
 * Campo que a listagem oferece para filtrar.
 *
 * Declarado pela TELA, não deduzido das colunas: coluna existe para ser lida,
 * campo filtrável existe para o servidor saber consultar, e os dois conjuntos não
 * coincidem (coluna calculada não filtra; campo do DTO que a tela não mostra
 * pode filtrar). Deduzir uma coisa da outra ofereceria filtro que ninguém
 * consegue responder.
 */
export interface CampoFiltravel {
  /** `accessorKey` da coluna — em inglês nos recursos HTTP, é o nome que viaja. */
  id: string
  rotulo: string
  variante: VarianteDeFiltro
  /** Obrigatório nas variantes `select`/`multiSelect`. */
  opcoes?: readonly OpcaoDeFiltro[]
  placeholder?: string
  /** Ícone do lucide na linha do filtro e no chip — ação, não shape brutalist. */
  icon?: LucideIcon
  /**
   * O que o operador DIGITA → o que o dado GUARDA, aplicado só na saída.
   *
   * Existe porque as duas coisas divergem de propósito em parte do sistema:
   * CPF/CNPJ trafega sem máscara e se digita com ela (convenção do CLAUDE.md), e
   * `12.345.678/0001-90` procurado como está não casa com nada. Sem isto o filtro
   * responderia "nenhum registro" para um cadastro que existe — e o operador
   * conferiria o CNPJ dígito a dígito procurando o erro dele.
   *
   * **Só o valor que VIAJA muda.** O campo continua mostrando o que foi digitado,
   * como a busca já faz: normalizar o que está na tela apagaria a máscara embaixo
   * do cursor no meio da digitação.
   */
  normalizar?: (valor: string) => string
}

/** Digitação com máscara → o dígito puro que o dado guarda (CPF/CNPJ, CEP, telefone). */
export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, '')
}

/**
 * Aplica a normalização de cada campo aos filtros que vão sair.
 *
 * Fica aqui, e não no controle, porque a distinção é entre o que se DIGITA e o
 * que se CONSULTA — a mesma fronteira em que `filtrosValidos` decide o que já é
 * frase completa.
 */
export function filtrosNormalizados(
  filtros: readonly FiltroDaTabela[],
  campos: readonly CampoFiltravel[],
): FiltroDaTabela[] {
  return filtros.map((filtro) => {
    const normalizar = campos.find((campo) => campo.id === filtro.id)?.normalizar
    if (!normalizar) return filtro
    return {
      ...filtro,
      valor: Array.isArray(filtro.valor) ? filtro.valor.map(normalizar) : normalizar(filtro.valor),
    }
  })
}

export interface FiltroDaTabela {
  /**
   * Identidade da LINHA, não do campo: duas linhas podem filtrar o mesmo campo
   * ("nome contém A" **e** "nome contém B"), e sem chave própria a segunda
   * sobrescreveria a primeira ao editar.
   */
  filtroId: string
  id: string
  variante: VarianteDeFiltro
  operador: OperadorDeFiltro
  /** Array só nas variantes de múltipla escolha e no `isBetween` (`[min, max]`). */
  valor: string | string[]
}

interface OperadorComRotulo {
  valor: OperadorDeFiltro
  rotulo: string
}

const VAZIOS: readonly OperadorComRotulo[] = [
  { valor: 'isEmpty', rotulo: 'está vazio' },
  { valor: 'isNotEmpty', rotulo: 'não está vazio' },
]

const OPERADORES_DE_TEXTO: readonly OperadorComRotulo[] = [
  { valor: 'iLike', rotulo: 'contém' },
  { valor: 'notILike', rotulo: 'não contém' },
  { valor: 'eq', rotulo: 'é' },
  { valor: 'ne', rotulo: 'não é' },
  ...VAZIOS,
]

const OPERADORES_NUMERICOS: readonly OperadorComRotulo[] = [
  { valor: 'eq', rotulo: 'é' },
  { valor: 'ne', rotulo: 'não é' },
  { valor: 'lt', rotulo: 'menor que' },
  { valor: 'lte', rotulo: 'menor ou igual a' },
  { valor: 'gt', rotulo: 'maior que' },
  { valor: 'gte', rotulo: 'maior ou igual a' },
  { valor: 'isBetween', rotulo: 'está entre' },
  ...VAZIOS,
]

/**
 * Data é ORDENADA como número, mas se LÊ como calendário: "menor que" numa data
 * faz o operador traduzir na cabeça o que "antes de" diz direto. Os valores são
 * os mesmos — quem muda é só a palavra que a pessoa lê.
 */
const OPERADORES_DE_DATA: readonly OperadorComRotulo[] = [
  { valor: 'eq', rotulo: 'em' },
  { valor: 'ne', rotulo: 'fora de' },
  { valor: 'lt', rotulo: 'antes de' },
  { valor: 'lte', rotulo: 'em ou antes de' },
  { valor: 'gt', rotulo: 'depois de' },
  { valor: 'gte', rotulo: 'em ou depois de' },
  { valor: 'isBetween', rotulo: 'entre' },
  ...VAZIOS,
]

const OPERADORES_DE_SELECAO: readonly OperadorComRotulo[] = [
  { valor: 'eq', rotulo: 'é' },
  { valor: 'ne', rotulo: 'não é' },
  ...VAZIOS,
]

const OPERADORES_DE_MULTISELECAO: readonly OperadorComRotulo[] = [
  { valor: 'inArray', rotulo: 'é um de' },
  { valor: 'notInArray', rotulo: 'não é nenhum de' },
  ...VAZIOS,
]

/**
 * Booleano NÃO tem "está vazio": a caixa `Ativo` de todo cadastro (padrão 8) é
 * `true` ou `false`, nunca nula — oferecer "vazio" ali é oferecer uma consulta
 * que nunca traz nada.
 */
const OPERADORES_BOOLEANOS: readonly OperadorComRotulo[] = [
  { valor: 'eq', rotulo: 'é' },
  { valor: 'ne', rotulo: 'não é' },
]

const POR_VARIANTE: Record<VarianteDeFiltro, readonly OperadorComRotulo[]> = {
  text: OPERADORES_DE_TEXTO,
  number: OPERADORES_NUMERICOS,
  date: OPERADORES_DE_DATA,
  boolean: OPERADORES_BOOLEANOS,
  select: OPERADORES_DE_SELECAO,
  multiSelect: OPERADORES_DE_MULTISELECAO,
}

export function operadoresDaVariante(variante: VarianteDeFiltro): readonly OperadorComRotulo[] {
  return POR_VARIANTE[variante] ?? OPERADORES_DE_TEXTO
}

export function operadorPadrao(variante: VarianteDeFiltro): OperadorDeFiltro {
  return operadoresDaVariante(variante)[0]?.valor ?? 'iLike'
}

/** Operadores que respondem sozinhos — o campo de valor some quando um deles é escolhido. */
export function dispensaValor(operador: OperadorDeFiltro): boolean {
  return operador === 'isEmpty' || operador === 'isNotEmpty'
}

let sequencia = 0

/** Chave da linha de filtro. Local por natureza: some quando a consulta muda. */
export function novoFiltroId(): string {
  sequencia += 1
  return `filtro-${sequencia}`
}

/**
 * Só os filtros que já dizem alguma coisa.
 *
 * Linha recém-adicionada nasce sem valor, e aplicá-la esvaziaria a listagem
 * enquanto o operador ainda digita — a tela pareceria "sem registro" no meio de
 * uma frase pela metade.
 */
export function filtrosValidos(filtros: readonly FiltroDaTabela[]): FiltroDaTabela[] {
  return filtros.filter((filtro) => {
    if (dispensaValor(filtro.operador)) return true
    if (Array.isArray(filtro.valor)) return filtro.valor.some((v) => v !== '')
    return filtro.valor !== ''
  })
}

function valorDaLinha(linha: unknown, id: string): unknown {
  return (linha as Record<string, unknown>)[id]
}

function estaVazio(valor: unknown): boolean {
  if (valor === null || valor === undefined || valor === '') return true
  return Array.isArray(valor) && valor.length === 0
}

function comoTexto(valor: unknown): string {
  return normalize(String(valor ?? ''))
}

function comoNumero(valor: unknown): number {
  if (typeof valor === 'number') return valor
  // Vírgula decimal: o operador digita como fala.
  return Number(
    String(valor ?? '')
      .trim()
      .replace(',', '.'),
  )
}

/**
 * O DIA de um valor ISO, e não o instante.
 *
 * "emitido em 05/08" tem de achar o que foi emitido às 14h daquele dia. Se o
 * campo guardar `2025-08-05T14:32:00Z` e a comparação usar a string inteira,
 * `eq '2025-08-05'` não acha nada e `lte '2025-08-05'` deixa o próprio dia de
 * fora — o operador veria a listagem cortar um dia sem explicação. Os 10
 * primeiros caracteres do ISO são a data, e é com ela que a pergunta é feita.
 */
function comoDia(valor: unknown): string {
  return String(valor ?? '').slice(0, 10)
}

function iguais(bruto: unknown, filtro: FiltroDaTabela): boolean {
  const referencia = Array.isArray(filtro.valor) ? (filtro.valor[0] ?? '') : filtro.valor
  if (filtro.variante === 'number') {
    const a = comoNumero(bruto)
    const b = comoNumero(referencia)
    return !Number.isNaN(a) && !Number.isNaN(b) && a === b
  }
  if (filtro.variante === 'date') return comoDia(bruto) === comoDia(referencia)
  return comoTexto(bruto) === comoTexto(referencia)
}

/**
 * Ordem entre o valor da linha e o do filtro: negativo, zero ou positivo — ou
 * `null` quando um dos dois não é comparável.
 *
 * Data compara como STRING ISO, e isso não é atalho: `yyyy-mm-dd` é ordenável
 * lexicograficamente na mesma ordem em que é cronológico, então `Date` só
 * acrescentaria fuso horário a uma pergunta que não tem hora.
 */
function comparaOrdenado(bruto: unknown, filtro: FiltroDaTabela): number | null {
  const referencia = Array.isArray(filtro.valor) ? (filtro.valor[0] ?? '') : filtro.valor

  if (filtro.variante === 'date') {
    const a = comoDia(bruto)
    const b = comoDia(referencia)
    if (!a || !b) return null
    return a < b ? -1 : a > b ? 1 : 0
  }

  const a = comoNumero(bruto)
  const b = comoNumero(referencia)
  if (Number.isNaN(a) || Number.isNaN(b)) return null
  return a - b
}

/**
 * Um filtro contra uma linha.
 *
 * Comparação **local**, do provider mock. Quando o recurso virar HTTP quem
 * responde é o banco, e o resultado pode divergir em detalhe (colação do
 * Postgres × `localeCompare`, por exemplo). A divergência é aceitável porque o
 * mock é a fase, não o destino — o que precisa sobreviver à troca é o vocabulário
 * acima, não esta aritmética.
 */
/**
 * Operadores que NEGAM: o resultado deles sobre um campo multivalorado é
 * "nenhum elemento casa", não "algum elemento não casa".
 *
 * A diferença aparece com dois valores: um pedido com fornecedores `[A, B]` e o
 * filtro "não contém A" tem de EXCLUIR o pedido — ele tem o A. Testando elemento
 * a elemento com a negação embutida, o B responderia "não contém A" e o pedido
 * entraria na lista, que é o oposto do que foi pedido.
 */
const NEGATIVOS: readonly OperadorDeFiltro[] = ['notILike', 'ne', 'notInArray']

/** O positivo equivalente de cada negativo — é ele que corre elemento a elemento. */
const POSITIVO_DE: Partial<Record<OperadorDeFiltro, OperadorDeFiltro>> = {
  notILike: 'iLike',
  ne: 'eq',
  notInArray: 'inArray',
}

export function filtroCasa(linha: unknown, filtro: FiltroDaTabela): boolean {
  const bruto = valorDaLinha(linha, filtro.id)

  if (filtro.operador === 'isEmpty') return estaVazio(bruto)
  if (filtro.operador === 'isNotEmpty') return !estaVazio(bruto)

  // CAMPO MULTIVALORADO (um pedido com N fornecedores): casa se ALGUM elemento
  // casar. Sem isto a comparação cai em `String(array)`, que junta os itens por
  // vírgula — `eq` passaria a comparar contra `"a,b"`, e o separador do acidente
  // nem é o que a tela mostra.
  if (Array.isArray(bruto)) {
    const negativo = NEGATIVOS.includes(filtro.operador)
    const operador = negativo ? (POSITIVO_DE[filtro.operador] ?? filtro.operador) : filtro.operador
    const algum = bruto.some((item) => filtroCasa({ [filtro.id]: item }, { ...filtro, operador }))
    return negativo ? !algum : algum
  }

  switch (filtro.operador) {
    case 'iLike':
      return comoTexto(bruto).includes(comoTexto(filtro.valor))
    case 'notILike':
      return !comoTexto(bruto).includes(comoTexto(filtro.valor))
    case 'eq':
      return iguais(bruto, filtro)
    case 'ne':
      return !iguais(bruto, filtro)
    case 'lt': {
      const d = comparaOrdenado(bruto, filtro)
      return d !== null && d < 0
    }
    case 'lte': {
      const d = comparaOrdenado(bruto, filtro)
      return d !== null && d <= 0
    }
    case 'gt': {
      const d = comparaOrdenado(bruto, filtro)
      return d !== null && d > 0
    }
    case 'gte': {
      const d = comparaOrdenado(bruto, filtro)
      return d !== null && d >= 0
    }
    case 'isBetween': {
      const [de = '', ate = ''] = Array.isArray(filtro.valor) ? filtro.valor : [filtro.valor, '']
      // Ponta em branco = extremo aberto, nas duas variantes. Exigir as duas
      // travaria o filtro no meio da digitação, que é quando o operador ainda
      // está montando a faixa.
      if (filtro.variante === 'date') {
        const dia = comoDia(bruto)
        if (!dia) return false
        // A faixa de datas é FECHADA nos dois extremos: "entre 01/08 e 05/08"
        // inclui o dia 5 na boca de quem pergunta.
        return (de === '' || dia >= comoDia(de)) && (ate === '' || dia <= comoDia(ate))
      }
      const valor = comoNumero(bruto)
      if (Number.isNaN(valor)) return false
      const min = de === '' ? Number.NEGATIVE_INFINITY : comoNumero(de)
      const max = ate === '' ? Number.POSITIVE_INFINITY : comoNumero(ate)
      if (Number.isNaN(min) || Number.isNaN(max)) return false
      return valor >= min && valor <= max
    }
    case 'inArray':
    case 'notInArray': {
      const lista = Array.isArray(filtro.valor) ? filtro.valor : [filtro.valor]
      const achou = lista.some((v) => v !== '' && comoTexto(v) === comoTexto(bruto))
      return filtro.operador === 'inArray' ? achou : !achou
    }
    default:
      return true
  }
}

/**
 * A linha inteira contra a lista de filtros.
 *
 * Lista vazia devolve `true`: "sem filtro" é toda a tabela, não tabela nenhuma.
 */
export function linhaPassaNosFiltros(
  linha: unknown,
  filtros: readonly FiltroDaTabela[] | undefined,
  juncao: Juncao = 'and',
): boolean {
  const validos = filtrosValidos(filtros ?? [])
  if (validos.length === 0) return true
  return juncao === 'or'
    ? validos.some((filtro) => filtroCasa(linha, filtro))
    : validos.every((filtro) => filtroCasa(linha, filtro))
}
