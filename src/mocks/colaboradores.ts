import { idDeApoio } from '@/mocks/lookups'
/**
 * Mock de colaboradores — campos LITERAIS da transcrição §2.
 * TODO(contract): tipo real virá do codegen do OpenAPI na integração.
 */
export interface Colaborador {
  /**
   * TEXTO, e não número, desde que a tela migrou para `GET /api/employees`
   * (2026-08-25): o id passou a ser o uuid do servidor. Enquanto era `number`,
   * o parâmetro de rota vinha string e `Number('ac956183-…')` é **`NaN`** — a
   * tela pediria o registro `NaN` e diria "não encontrado" para um colaborador
   * que existe, sem erro nenhum no caminho. É o mesmo defeito que `/api/quotes`
   * pagou na #134, documentado em `DocumentoProvider.get`.
   */
  id: string
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
  // O usuário demo. Ele já existia como pessoa em DOIS lugares do mock — o
  // `store.ts` diz que quem está logado é "Henrique Ferro", e a listagem de
  // `/api/employees` o oferecia no combo de responsável — mas não existia no
  // cadastro de colaborador, que é a tela que lista quem trabalha aqui. Estar
  // logado e não constar da própria lista é a incoerência que a #276 mediu.
  'HENRIQUE FERRO',
] as const

/** O id de semente do usuário demo — o último nome da lista, 1-based. */
export const ID_DO_USUARIO_DEMO = String(NOMES.length)

/**
 * Exportados porque a listagem os oferece como OPÇÕES do filtro por setor e por
 * cargo. Tabela de apoio estática — o que `src/mocks/` pode dar à tela, ao lado
 * dos tipos. Digitar a mesma lista na tela abriria a porta para ela divergir do
 * dado e oferecer um filtro que não casa com registro nenhum.
 */
export const CARGOS = [
  'VENDEDOR',
  'CONSULTOR DE VENDAS',
  'GERENTE',
  'COMPRADOR',
  'AUXILIAR DE ESTOQUE',
]
export const SETORES = ['VENDAS', 'ESTOQUE', 'FINANCEIRO', 'ADMINISTRATIVO', 'COMPRAS']

/**
 * O id na forma do CONTRATO (`EmployeeDto.id`) a partir do id da semente.
 *
 * A semente numera de 1 (é o que a tela usa como chave de linha) e o contrato
 * quer string. A conversão mora AQUI, e não em cada handler, porque ela é o que
 * amarra as duas leituras da mesma pessoa: a tela lê `data.colaboradores` e o
 * combo lê `GET /api/employees`, e antes da #276 essas duas listas não tinham
 * um nome em comum.
 *
 * `emp-admin` é exceção declarada, não estilo: `handlers.ts` grava esse id na
 * sessão do mock e as atividades semeadas o referenciam. Derivá-lo como os
 * outros obrigaria a mexer nos dois, sem ganhar nada — o id é opaco.
 */
export function idDeColaborador(id: string): string {
  return id === ID_DO_USUARIO_DEMO ? 'emp-admin' : `emp-${id.padStart(4, '0')}`
}

export const colaboradores: Colaborador[] = NOMES.map((nome, i) => ({
  id: String(i + 1),
  nome,
  setor: idDeApoio('SETOR', SETORES[i % SETORES.length]),
  atendimentoCliente: i % 4 !== 3,
  ativo: i !== 8,
  sexo: i % 2 === 0 ? 'FEMININO' : 'MASCULINO',
  dtNascimento: `19${80 + (i % 18)}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 27) + 1).padStart(2, '0')}`,
  grauInstrucao: idDeApoio('GRAU_INSTRUCAO', i % 3 === 0 ? 'SUPERIOR' : 'MÉDIO'),
  profissao: idDeApoio('PROFISSAO', 'VENDEDOR'),
  racaCor: idDeApoio('RACA_COR', ['BRANCA', 'PARDA', 'PRETA'][i % 3]),
  estadoCivil: idDeApoio('ESTADO_CIVIL', ['SOLTEIRO(A)', 'CASADO(A)', 'UNIÃO ESTÁVEL'][i % 3]),
  nomeConjuge: i % 3 === 1 ? `CÔNJUGE DE ${nome.split(' ')[0]}` : '',
  dtNascConjuge: i % 3 === 1 ? `19${82 + (i % 15)}-06-15` : null,
  nomePai: '',
  nomeMae: '',
  naturalidade: {
    cidadeCodigo: '354',
    cidadeNome: 'CAMPINAS',
    uf: 'SP',
  },
  nacionalidade: idDeApoio('NACIONALIDADE', 'BRASILEIRA'),
  anoChegada: '',
  cargo: idDeApoio('CARGO', CARGOS[i % CARGOS.length]),
  salario: (2500 + i * 350) * 100,
  vinculo: idDeApoio('VINCULO', i % 5 === 4 ? 'PJ' : 'CLT'),
  dataAdmissao: `20${15 + (i % 9)}-0${(i % 9) + 1}-10`,
  dataDemissao: null,
  redesSociais: { facebook: '', instagram: '' },
  empresa: EMPRESAS[i % EMPRESAS.length] ?? null,
}))

/**
 * O registro em branco. **Sem argumento**: o id do que ainda não existe é do
 * servidor, e vem no 201 — quem abre o "Incluir" não tem por que inventar um.
 * Enquanto o recurso era mock, `createMockProvider` passava aqui o negativo de
 * `proximoIdEmBranco()`; hoje quem chama é `documentoDoColaborador.empty`.
 */
export function colaboradorVazio(): Colaborador {
  return {
    id: '',
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
    nacionalidade: idDeApoio('NACIONALIDADE', 'BRASILEIRA'),
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
