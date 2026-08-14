import { idDeApoio } from '@/mocks/lookups'
interface EnderecoMock {
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidadeCodigo: string | null
  cidadeNome: string
  uf: string | null
}

/**
 * Mock de profissionais externos — campos LITERAIS da transcrição §3.
 * Nomes vindos da própria transcrição (lookup `profissional`).
 * TODO(contract): tipo real virá do codegen do OpenAPI na integração.
 */
export interface Profissional {
  id: number
  nomeApresentacao: string
  ativo: boolean
  tipoPessoa: 'FISICA' | 'JURIDICA'
  nome: string
  dtNascimento: string | null
  cpf: string
  rg: string
  estadoCivil: string | null
  profissao: string | null
  nomeConjuge: string
  dtNascConjuge: string | null
  endereco: EnderecoMock
  telefones: {
    foneComercial: string
    foneResidencial: string
    fax: string
    celular: string
  }
  email: string
  comunicadores: {
    comunicador1Tipo: string | null
    comunicador1Valor: string
    comunicador2Tipo: string | null
    comunicador2Valor: string
  }
  numeroBanco: string
  nomeBanco: string
  numeroAgencia: string
  numeroConta: string
  enderecoBanco: EnderecoMock
  pisPasepNis: string
  registroProfissional: string
  redesSociais: {
    facebook: string
    instagram: string
  }
}

const REGISTROS = [
  {
    apresentacao: 'MARIANA',
    nome: 'MARIANA DUARTE',
    profissao: idDeApoio('PROFISSAO', 'ARQUITETO'),
    registro: 'CAU A123456-7',
  },
  {
    apresentacao: 'ARIADINE',
    nome: 'ARIADINE CAMPOS',
    profissao: idDeApoio('PROFISSAO', 'ARQUITETO'),
    registro: 'CAU A234567-8',
  },
  {
    apresentacao: 'ANA ELIZA',
    nome: 'ANA ELIZA FERREIRA',
    profissao: idDeApoio('PROFISSAO', 'DESIGNER DE INTERIORES'),
    registro: '',
  },
  {
    apresentacao: 'MALU',
    nome: 'MALU ANDRADE',
    profissao: idDeApoio('PROFISSAO', 'DESIGNER DE INTERIORES'),
    registro: '',
  },
  {
    apresentacao: 'GIORDANA',
    nome: 'GIORDANA PIRES',
    profissao: idDeApoio('PROFISSAO', 'ARQUITETO'),
    registro: 'CAU A345678-9',
  },
  {
    apresentacao: 'FLAVIO COSSA',
    nome: 'FLAVIO COSSA',
    profissao: 'ENGENHEIRO',
    registro: 'CREA 0601234567',
  },
  {
    apresentacao: 'SILVANIA',
    nome: 'SILVANIA MOURA',
    profissao: idDeApoio('PROFISSAO', 'DESIGNER DE INTERIORES'),
    registro: '',
  },
  {
    apresentacao: 'RICARDO',
    nome: 'RICARDO TELES',
    profissao: 'ENGENHEIRO',
    registro: 'CREA 0602345678',
  },
] as const

function enderecoCampinas(numero: string): EnderecoMock {
  return {
    cep: '13010-111',
    logradouro: 'Avenida Francisco Glicério',
    numero,
    complemento: '',
    bairro: 'Centro',
    cidadeCodigo: '354',
    cidadeNome: 'CAMPINAS',
    uf: 'SP',
  }
}

export const profissionais: Profissional[] = REGISTROS.map((r, i) => ({
  id: i + 1,
  nomeApresentacao: r.apresentacao,
  ativo: i !== 5,
  tipoPessoa: 'FISICA',
  nome: r.nome,
  dtNascimento: `19${78 + i * 2}-0${(i % 9) + 1}-1${i % 9}`,
  cpf: `${String(100 + i * 37)}.${String(200 + i * 41)}.${String(300 + i * 43)}-0${i % 10}`,
  rg: `${String(20 + i)}.${String(100 + i * 13)}.${String(100 + i * 7)}-X`,
  estadoCivil: ['SOLTEIRO(A)', 'CASADO(A)'][i % 2] ?? null,
  profissao: r.profissao,
  nomeConjuge: '',
  dtNascConjuge: null,
  endereco: enderecoCampinas(String(100 + i * 11)),
  telefones: {
    foneComercial: `19 3${String(2000000 + i * 11111).slice(0, 7)}`,
    foneResidencial: '',
    fax: '',
    celular: `19 9${String(80000000 + i * 123457).slice(0, 8)}`,
  },
  email: `${r.apresentacao.toLowerCase().replace(/\s+/g, '.')}@exemplo.com.br`,
  comunicadores: {
    comunicador1Tipo: 'WHATSAPP',
    comunicador1Valor: `19 9${String(80000000 + i * 123457).slice(0, 8)}`,
    comunicador2Tipo: null,
    comunicador2Valor: '',
  },
  numeroBanco: ['001', '237', '341', '033'][i % 4] ?? '',
  nomeBanco: ['BANCO DO BRASIL', 'BRADESCO', 'ITAÚ', 'SANTANDER'][i % 4] ?? '',
  numeroAgencia: String(1000 + i * 37),
  numeroConta: `${String(20000 + i * 1234)}-${i % 10}`,
  enderecoBanco: enderecoCampinas(String(500 + i * 3)),
  pisPasepNis: '',
  registroProfissional: r.registro,
  redesSociais: { facebook: '', instagram: '' },
}))

function enderecoVazio(): EnderecoMock {
  return {
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidadeCodigo: null,
    cidadeNome: '',
    uf: null,
  }
}

export function profissionalVazio(id: number): Profissional {
  return {
    id,
    nomeApresentacao: '',
    ativo: true,
    tipoPessoa: 'FISICA',
    nome: '',
    dtNascimento: null,
    cpf: '',
    rg: '',
    estadoCivil: null,
    profissao: null,
    nomeConjuge: '',
    dtNascConjuge: null,
    endereco: enderecoVazio(),
    telefones: { foneComercial: '', foneResidencial: '', fax: '', celular: '' },
    email: '',
    comunicadores: {
      comunicador1Tipo: null,
      comunicador1Valor: '',
      comunicador2Tipo: null,
      comunicador2Valor: '',
    },
    numeroBanco: '',
    nomeBanco: '',
    numeroAgencia: '',
    numeroConta: '',
    enderecoBanco: enderecoVazio(),
    pisPasepNis: '',
    registroProfissional: '',
    redesSociais: { facebook: '', instagram: '' },
  }
}
