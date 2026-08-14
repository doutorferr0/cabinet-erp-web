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
 * - **Sem `date`/`dateRange`.** O original abre um `Calendar` (react-day-picker),
 *   dependência que este repo não tem e que a zona desta tarefa não pode
 *   adicionar. Data entra quando o calendário entrar — variante que renderiza
 *   campo quebrado é pior que variante ausente.
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

export const VARIANTES = ['text', 'number', 'boolean', 'select', 'multiSelect'] as const
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

function iguais(bruto: unknown, filtro: FiltroDaTabela): boolean {
  const referencia = Array.isArray(filtro.valor) ? (filtro.valor[0] ?? '') : filtro.valor
  if (filtro.variante === 'number') {
    const a = comoNumero(bruto)
    const b = comoNumero(referencia)
    return !Number.isNaN(a) && !Number.isNaN(b) && a === b
  }
  return comoTexto(bruto) === comoTexto(referencia)
}

function comparaNumero(bruto: unknown, filtro: FiltroDaTabela): number | null {
  const a = comoNumero(bruto)
  const referencia = Array.isArray(filtro.valor) ? (filtro.valor[0] ?? '') : filtro.valor
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
export function filtroCasa(linha: unknown, filtro: FiltroDaTabela): boolean {
  const bruto = valorDaLinha(linha, filtro.id)

  if (filtro.operador === 'isEmpty') return estaVazio(bruto)
  if (filtro.operador === 'isNotEmpty') return !estaVazio(bruto)

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
      const d = comparaNumero(bruto, filtro)
      return d !== null && d < 0
    }
    case 'lte': {
      const d = comparaNumero(bruto, filtro)
      return d !== null && d <= 0
    }
    case 'gt': {
      const d = comparaNumero(bruto, filtro)
      return d !== null && d > 0
    }
    case 'gte': {
      const d = comparaNumero(bruto, filtro)
      return d !== null && d >= 0
    }
    case 'isBetween': {
      const [de = '', ate = ''] = Array.isArray(filtro.valor) ? filtro.valor : [filtro.valor, '']
      const valor = comoNumero(bruto)
      if (Number.isNaN(valor)) return false
      // Ponta em branco = extremo aberto. Exigir as duas travaria o filtro no
      // meio da digitação, que é quando o operador ainda está montando a faixa.
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
