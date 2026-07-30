import type { PagedResult, TableQueryState } from '@/lib/table-query'
import { normalize, pagedMock } from '@/mocks/query'

/**
 * Mock de produtos — campos LITERAIS da transcrição do SoftLux (§6 Produtos).
 * TODO(contract): tipo real virá do codegen do OpenAPI na integração.
 */
export interface Produto {
  id: number
  /** `Nosso Código` — transcrição §6.1. */
  nossoCodigo: string
  /** `Nossa Descrição` — transcrição §6.1. */
  nossaDescricao: string
  /** `Marca` — transcrição §6.1 (combo +...). */
  marca: string
  /** `Fábrica` — transcrição §6.1 (combo +...). */
  fabrica: string
  /** `Tipo de Produto` — transcrição §6.1 (combo). */
  tipoProduto: string
  /** `Valor de Tabela` da variante — transcrição §6.3. Centavos, nunca float. */
  valorTabelaCentavos: number
  /** `Ativo` — desativação lógica, transcrição §9. */
  ativo: boolean
}

const MARCAS = [
  'STELLA',
  'ILUMINAR',
  'INTERLIGHT',
  'EVOLED',
  'DRAMALUX',
  'MISTER LED',
  'FILLAMENTO',
  'USINA DESIGN',
  'DSGNSELO',
  'NEWSTANDARD',
  'STUDIOLUCE',
  'ALLOY ILUMINAÇÃO',
] as const

const FABRICAS = [
  'STELLA',
  'ILUMINAR',
  'INTERLIGHT',
  'ATIVA COMERCIAL',
  'DRAMALUX',
  'VIA HF ILUMINAÇÃO',
] as const

const TIPOS = [
  'PENDENTE',
  'PLAFON',
  'SPOT',
  'ARANDELA',
  'LUSTRE',
  'ABAJUR',
  'PERFIL LED',
  'LÂMPADA',
] as const

const DESCRICOES = [
  'PENDENTE REDONDO ALUMÍNIO',
  'PLAFON SOBREPOR QUADRADO',
  'SPOT EMBUTIR DICRÓICA',
  'ARANDELA FRISADA G9',
  'LUSTRE CRISTAL 8 BRAÇOS',
  'ABAJUR CÚPULA TECIDO',
  'PERFIL LED EMBUTIR 2M',
  'LÂMPADA FILAMENTO E27',
  'PENDENTE TRILHO ELETRIFICADO',
  'SPOT SOBREPOR PAR20',
] as const

const ACABAMENTOS = ['PRETO', 'BRANCO', 'DOURADO', 'COBRE', 'CROMADO'] as const

/** Lista determinística (sem faker/seed aleatória) — estável para testes e prints. */
export const produtos: Produto[] = Array.from({ length: 45 }, (_, i) => {
  const desc = DESCRICOES[i % DESCRICOES.length] as string
  const acab = ACABAMENTOS[i % ACABAMENTOS.length] as string
  return {
    id: i + 1,
    nossoCodigo: String(1201 + i),
    nossaDescricao: `${desc} ${acab}`,
    marca: MARCAS[i % MARCAS.length] as string,
    fabrica: FABRICAS[i % FABRICAS.length] as string,
    tipoProduto: TIPOS[i % TIPOS.length] as string,
    valorTabelaCentavos: 8_990 + ((i * 1_337) % 42_000),
    ativo: i % 9 !== 8,
  }
})

export function fetchProdutos(
  state: TableQueryState,
  delayMs = 300,
): Promise<PagedResult<Produto>> {
  return pagedMock(
    produtos,
    state,
    (p, q) => normalize(p.nossoCodigo).includes(q) || normalize(p.nossaDescricao).includes(q),
    delayMs,
  )
}
