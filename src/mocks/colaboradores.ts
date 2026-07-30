/**
 * Mock de colaboradores — campos LITERAIS da transcrição §2.
 * TODO(contract): tipo real virá do codegen do OpenAPI na integração.
 */
export interface Colaborador {
  id: number
  nome: string
  setor: string | null
  atendimentoCliente: boolean
  ativo: boolean
  sexo: string | null
  dtNascimento: string | null
  grauInstrucao: string | null
  profissao: string | null
  racaCor: string | null
  estadoCivil: string | null
  nomeConjuge: string
  dtNascConjuge: string | null
  nomePai: string
  nomeMae: string
  naturalidade: {
    cidadeCodigo: string | null
    cidadeNome: string
    uf: string | null
  }
  nacionalidade: string | null
  anoChegada: string
  cargo: string | null
  /** Salário em centavos (int) — nunca float. */
  salario: number | null
  vinculo: string | null
  dataAdmissao: string | null
  dataDemissao: string | null
  redesSociais: {
    facebook: string
    instagram: string
  }
  empresa: string | null
}

export const EMPRESAS = ['VERTZ ILUMINAÇÃO', 'VIA HF'] as const

const NOMES = [
  'CARLA SOUZA',
  'PEDRO HENRIQUE ALMEIDA',
  'LUIZ FERNANDO RIBEIRO',
  'PATRICIA LIMA',
  'RODRIGO ALVES',
  'FERNANDA COSTA',
  'MARCOS VINICIUS PRADO',
  'JULIANA ROCHA',
  'TIAGO SANTOS',
  'RENATA OLIVEIRA',
] as const

const CARGOS = ['VENDEDOR', 'CONSULTOR DE VENDAS', 'GERENTE', 'COMPRADOR', 'AUXILIAR DE ESTOQUE']
const SETORES = ['VENDAS', 'ESTOQUE', 'FINANCEIRO', 'ADMINISTRATIVO', 'COMPRAS']

export const colaboradores: Colaborador[] = NOMES.map((nome, i) => ({
  id: i + 1,
  nome,
  setor: SETORES[i % SETORES.length] ?? null,
  atendimentoCliente: i % 4 !== 3,
  ativo: i !== 8,
  sexo: i % 2 === 0 ? 'FEMININO' : 'MASCULINO',
  dtNascimento: `19${80 + (i % 18)}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 27) + 1).padStart(2, '0')}`,
  grauInstrucao: i % 3 === 0 ? 'SUPERIOR' : 'MÉDIO',
  profissao: 'VENDEDOR',
  racaCor: ['BRANCA', 'PARDA', 'PRETA'][i % 3] ?? null,
  estadoCivil: ['SOLTEIRO(A)', 'CASADO(A)', 'UNIÃO ESTÁVEL'][i % 3] ?? null,
  nomeConjuge: i % 3 === 1 ? `CÔNJUGE DE ${nome.split(' ')[0]}` : '',
  dtNascConjuge: i % 3 === 1 ? `19${82 + (i % 15)}-06-15` : null,
  nomePai: '',
  nomeMae: '',
  naturalidade: {
    cidadeCodigo: '354',
    cidadeNome: 'CAMPINAS',
    uf: 'SP',
  },
  nacionalidade: 'BRASILEIRA',
  anoChegada: '',
  cargo: CARGOS[i % CARGOS.length] ?? null,
  salario: (2500 + i * 350) * 100,
  vinculo: i % 5 === 4 ? 'PJ' : 'CLT',
  dataAdmissao: `20${15 + (i % 9)}-0${(i % 9) + 1}-10`,
  dataDemissao: null,
  redesSociais: { facebook: '', instagram: '' },
  empresa: EMPRESAS[i % EMPRESAS.length] ?? null,
}))

export function colaboradorVazio(id: number): Colaborador {
  return {
    id,
    nome: '',
    setor: null,
    atendimentoCliente: true,
    ativo: true,
    sexo: null,
    dtNascimento: null,
    grauInstrucao: null,
    profissao: null,
    racaCor: null,
    estadoCivil: null,
    nomeConjuge: '',
    dtNascConjuge: null,
    nomePai: '',
    nomeMae: '',
    naturalidade: { cidadeCodigo: null, cidadeNome: '', uf: null },
    nacionalidade: 'BRASILEIRA',
    anoChegada: '',
    cargo: null,
    salario: null,
    vinculo: null,
    dataAdmissao: null,
    dataDemissao: null,
    redesSociais: { facebook: '', instagram: '' },
    empresa: EMPRESAS[0],
  }
}
