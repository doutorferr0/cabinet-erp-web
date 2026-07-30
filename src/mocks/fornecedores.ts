import type { PagedResult, TableQueryState } from '@/lib/table-query'
import { mockDelay, normalize, pagedMock } from '@/mocks/query'

/**
 * Mock de fornecedores — campos LITERAIS da transcrição §4.
 * TODO(contract): tipo real virá do codegen do OpenAPI na integração.
 */

export interface FornecedorContato {
  nome: string
  vinculo: string
  fone: string
  fax: string
}

export interface Fornecedor {
  id: number
  razaoSocial: string
  sigla: string
  nomeFantasia: string
  cnpjCpf: string
  inscEst: string
  endereco: {
    cep: string
    logradouro: string
    numero: string
    complemento: string
    bairro: string
    cidadeCodigo: string | null
    cidadeNome: string
    uf: string | null
  }
  fone1: string
  fone2: string
  fax: string
  email: string
  site: string
  comunicadores: {
    comunicador1Tipo: string | null
    comunicador1Valor: string
    comunicador2Tipo: string | null
    comunicador2Valor: string
  }
  forneceRevenda: boolean
  materiais: string | null
  prazoEntregaDias: string
  prazoPagamentoDias: string
  ativo: boolean
  redesSociais: {
    facebook: string
    instagram: string
  }
  empresaCompradora: string | null
  contatos: FornecedorContato[]
}

export const EMPRESAS_COMPRADORAS = ['VERTZ ILUMINAÇÃO', 'VIA HF'] as const

const NOMES = [
  'EVOLED (ATIVA COMERCIAL)',
  'ILUMINAR',
  'FILLAMENTO',
  'INTERLIGHT',
  'STELLA',
  'TELAS TENSIONADAS',
  'DSGNSELO',
  'USINA DESIGN',
  'MISTER LED',
  'VIA HF ILUMINAÇÃO',
  'DRAMALUX',
  'NEWSTANDARD',
  'STUDIOLUCE ILUMINACAO IMPORTACAO E EXPORTACAO',
  'ALLOY ILUMINAÇÃO',
] as const

export const fornecedores: Fornecedor[] = NOMES.map((nome, i) => ({
  id: i + 1,
  razaoSocial: `${nome} LTDA`,
  sigla: nome.split(' ')[0] ?? nome,
  nomeFantasia: nome,
  cnpjCpf: `${String(10000000 + i * 137913).slice(0, 8)}0001${String(10 + i)}`,
  inscEst: i % 4 === 3 ? '' : `1100424${String(90100 + i)}`,
  endereco: {
    cep: '13010-111',
    logradouro: 'Avenida Francisco Glicério',
    numero: String(100 + i * 7),
    complemento: '',
    bairro: 'Centro',
    cidadeCodigo: '354',
    cidadeNome: 'CAMPINAS',
    uf: 'SP',
  },
  fone1: `19 3${String(2000000 + i * 11111).slice(0, 7)}`,
  fone2: '',
  fax: '',
  email: `contato@${(nome.split(' ')[0] ?? 'forn').toLowerCase()}.com.br`,
  site: '',
  comunicadores: {
    comunicador1Tipo: 'WHATSAPP',
    comunicador1Valor: `19 9${String(80000000 + i * 123457).slice(0, 8)}`,
    comunicador2Tipo: null,
    comunicador2Valor: '',
  },
  forneceRevenda: i % 3 === 0,
  materiais: null,
  prazoEntregaDias: String(7 + (i % 5) * 7),
  prazoPagamentoDias: String(28 + (i % 3) * 14),
  ativo: i !== 6,
  redesSociais: { facebook: '', instagram: '' },
  empresaCompradora: EMPRESAS_COMPRADORAS[i % EMPRESAS_COMPRADORAS.length] ?? null,
  contatos: [],
}))

export function fornecedorVazio(id: number): Fornecedor {
  return {
    id,
    razaoSocial: '',
    sigla: '',
    nomeFantasia: '',
    cnpjCpf: '',
    inscEst: '',
    endereco: {
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidadeCodigo: null,
      cidadeNome: '',
      uf: null,
    },
    fone1: '',
    fone2: '',
    fax: '',
    email: '',
    site: '',
    comunicadores: {
      comunicador1Tipo: null,
      comunicador1Valor: '',
      comunicador2Tipo: null,
      comunicador2Valor: '',
    },
    forneceRevenda: false,
    materiais: null,
    prazoEntregaDias: '',
    prazoPagamentoDias: '',
    ativo: true,
    redesSociais: { facebook: '', instagram: '' },
    empresaCompradora: null,
    contatos: [],
  }
}

export function fetchFornecedores(
  state: TableQueryState,
  delayMs = 300,
): Promise<PagedResult<Fornecedor>> {
  return pagedMock(
    fornecedores,
    state,
    (f, q) =>
      String(f.id).includes(q) ||
      normalize(f.razaoSocial).includes(q) ||
      normalize(f.nomeFantasia).includes(q),
    delayMs,
  )
}

export function fetchFornecedor(id: number, delayMs = 200): Promise<Fornecedor | null> {
  return mockDelay(fornecedores.find((f) => f.id === id) ?? null, delayMs)
}
