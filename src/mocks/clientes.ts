import { idDeApoio } from '@/mocks/lookups'
/**
 * Mock de clientes — campos LITERAIS da transcrição §5 (aba Principal).
 * TODO(contract): tipo real virá do codegen do OpenAPI na integração.
 */
/** A forma do endereço no formulário — a mesma nos três que o cliente tem. */
export interface EnderecoDoCliente {
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidadeCodigo: string | null
  cidadeNome: string
  uf: string | null
}

export interface Cliente {
  id: number
  nome: string
  tipoPessoa: 'FISICA' | 'JURIDICA'
  cpf: string
  sexo: string | null
  rg: string
  orgaoExpedicao: string
  ufRg: string | null
  endereco: EnderecoDoCliente
  /**
   * Aba `Cobrança\Comercial` da §5 (#293). Não capturada na transcrição — os
   * campos vêm do contrato, que os tirou das colunas do legado.
   *
   * `Cli_*_cob`: para onde vai o BOLETO, que não é onde o cliente mora.
   */
  enderecoCobranca: EnderecoDoCliente
  /** `Cli_*_cor`: onde a pessoa TRABALHA — no cliente pessoa física, a empresa dela. */
  enderecoComercial: EnderecoDoCliente
  /** `Cli_empresa_cor` — a empresa onde trabalha. Contexto do cliente, não um segundo cadastro. */
  empresaComercial: string
  /** `Cli_cargo_cor`. */
  cargoComercial: string
  /** `cli_CNPJComercial` — o da empregadora, NUNCA gravado por cima de `cpf`. */
  cnpjComercial: string
  /** `Cli_DataFundacao_cor`, ISO. Não confundir com `dtNascimento`, que é da pessoa. */
  dtFundacaoComercial: string | null
  foneComercial: string
  fax: string
  foneResidencial: string
  celular: string
  email: string
  ativo: boolean
  profissional: string | null
  /**
   * `specifierName` do contrato — DERIVADO, e é por isso que não entra em
   * `paraEscrita`. Ele existe para o campo saber se exibir quando o
   * `specifierId` não está entre as opções carregadas: o backend aceita como
   * especificador qualquer parceiro do GRUPO, e o combo lista os da empresa
   * ativa. Sem ele o campo apareceria em branco com o vínculo intacto embaixo.
   */
  profissionalNome: string | null
  categoria: string | null
  dtNascimento: string | null
  redesSociais: {
    facebook: string
    instagram: string
  }
  /** Inscrição Estadual (`Cli_IE_rg` no legado) — a da EMPRESA, no fisco. */
  inscEst: string
  inscEstProdutorRural: string
  observacao: string
}

const NOMES = [
  'ANDRÉ BATALHA',
  'ROMULO GERMANO',
  'SHEILA E VICENTE',
  'TELMA TOMPSON',
  'ROBERT TAGLIAELA',
  '3Z REALTY',
  'ADRIANA FERREIRA',
  'ALEXANDER SCHULZ',
  'BSA ADMINISTRADORA DE BENS E PARTICIPACOES',
  'CONSUMIDOR',
  'HELIO MURSSA JUNIOR',
  'LUIMARA PAULA MALVEZZI ROCHA',
  'ERICA BRAGION',
  'ANTONIO ANGELO CASADEI',
  'NAHLA',
  'PATRICIA E MARCELO ROSSI',
] as const

export const clientes: Cliente[] = NOMES.map((nome, i) => ({
  id: i + 1,
  nome,
  tipoPessoa: i === 5 || i === 8 ? 'JURIDICA' : 'FISICA',
  cpf: String(10000000000 + i * 982451653).slice(0, 11),
  sexo: i % 2 === 0 ? 'MASCULINO' : 'FEMININO',
  rg: String(10000000 + i * 913579).slice(0, 9),
  orgaoExpedicao: 'SSP',
  ufRg: 'SP',
  endereco: {
    cep: '13010-111',
    logradouro: 'Avenida Francisco Glicério',
    numero: String(200 + i * 13),
    complemento: '',
    bairro: 'Centro',
    cidadeCodigo: '354',
    cidadeNome: 'CAMPINAS',
    uf: 'SP',
  },
  // Nascem VAZIOS de propósito: cobrança igual ao cadastro é o caso comum, e
  // repetir o endereço principal aqui obrigaria a manter os dois em sincronia.
  enderecoCobranca: enderecoVazio(),
  enderecoComercial: enderecoVazio(),
  empresaComercial: '',
  cargoComercial: '',
  cnpjComercial: '',
  dtFundacaoComercial: null,
  foneComercial: '',
  fax: '',
  foneResidencial: `19 3${String(2000000 + i * 22222).slice(0, 7)}`,
  celular: `19 9${String(80000000 + i * 246813).slice(0, 8)}`,
  email: `${nome.split(' ')[0]?.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')}@email.com`,
  ativo: i !== 14,
  // `null`: desde a #265 este campo guarda um `partners.id`, e esta fixture
  // local não conhece parceiro nenhum — inventar um id aqui seria semear a
  // referência quebrada que o `conferirApoios` do backend recusa.
  profissional: null,
  profissionalNome: null,
  categoria: idDeApoio('CATEGORIA_CLIENTE', i % 3 === 0 ? 'ARQUITETO' : 'CONSUMIDOR FINAL'),
  dtNascimento: `19${60 + (i % 35)}-0${(i % 9) + 1}-1${i % 9}`,
  redesSociais: { facebook: '', instagram: '' },
  inscEst: '',
  inscEstProdutorRural: '',
  observacao: '',
}))

/** Endereço em branco — os três do cliente nascem assim. */
export function enderecoVazio(): EnderecoDoCliente {
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

export function clienteVazio(id: number): Cliente {
  return {
    id,
    nome: '',
    tipoPessoa: 'FISICA',
    cpf: '',
    sexo: null,
    rg: '',
    orgaoExpedicao: '',
    ufRg: null,
    endereco: enderecoVazio(),
    enderecoCobranca: enderecoVazio(),
    enderecoComercial: enderecoVazio(),
    empresaComercial: '',
    cargoComercial: '',
    cnpjComercial: '',
    dtFundacaoComercial: null,
    foneComercial: '',
    fax: '',
    foneResidencial: '',
    celular: '',
    email: '',
    ativo: true,
    profissional: null,
    profissionalNome: null,
    categoria: null,
    dtNascimento: null,
    redesSociais: { facebook: '', instagram: '' },
    inscEst: '',
    inscEstProdutorRural: '',
    observacao: '',
  }
}
