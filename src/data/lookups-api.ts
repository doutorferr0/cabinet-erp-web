import { type PagedResultOfCatalogLookupDto, listCatalogLookups } from '@/api/gerado'
import { type RespostaDaApi, dadosOuErro } from '@/data/api-provider'
import { useQuery } from '@tanstack/react-query'

/**
 * LISTAS DE APOIO — o padrão `[combo]`/`[combo +...]` da transcrição (§9 padrão 2).
 *
 * Todas vêm de `GET /api/catalog-lookups`, uma tabela única discriminada por
 * `kind` (ADR-011). Este arquivo é a fronteira inteira: o vocabulário de kinds, a
 * tradução de nome e a consulta.
 *
 * **Rótulo e nome no banco moram juntos, num lugar só.** São duas faces do mesmo
 * kind: o front nomeia em camelCase porque é chave de UI, o banco guarda em
 * MAIÚSCULA_COM_UNDERSCORE, e o humano lê "Grau de Instrução". Enquanto a tabela
 * de rótulos ficou em `src/mocks/` e a de nomes aqui, acrescentar um kind era
 * lembrar de dois arquivos — e esquecer um deles só aparecia em runtime.
 */
const KINDS = {
  setor: { label: 'Setor', backend: 'SETOR' },
  grauInstrucao: { label: 'Grau de Instrução', backend: 'GRAU_INSTRUCAO' },
  profissao: { label: 'Profissão', backend: 'PROFISSAO' },
  racaCor: { label: 'Raça/Cor', backend: 'RACA_COR' },
  estadoCivil: { label: 'Estado Civil', backend: 'ESTADO_CIVIL' },
  nacionalidade: { label: 'Nacionalidade', backend: 'NACIONALIDADE' },
  cargo: { label: 'Cargo', backend: 'CARGO' },
  vinculo: { label: 'Vínculo', backend: 'VINCULO' },
  categoria: { label: 'Categoria', backend: 'CATEGORIA' },
  profissional: { label: 'Profissional', backend: 'PROFISSIONAL' },
  tipoProduto: { label: 'Tipo de Produto', backend: 'TIPO_PRODUTO' },
  tipoPeca: { label: 'Tipo da Peça', backend: 'TIPO_PECA' },
  tipoLinha: { label: 'Tipo da Linha', backend: 'TIPO_LINHA' },
  classificacao: { label: 'Classificação do Produto', backend: 'CLASSIFICACAO' },
  designerModelo: { label: 'Designer\\Modelo', backend: 'DESIGNER' },
  fabrica: { label: 'Fábrica', backend: 'FABRICA' },
  marca: { label: 'Marca', backend: 'MARCA' },
  materiais: { label: 'Materiais', backend: 'MATERIAIS' },
  impostosPadrao: { label: 'Impostos Padrão', backend: 'IMPOSTO_PADRAO' },
} as const satisfies Record<string, { label: string; backend: string }>

export type LookupKind = keyof typeof KINDS

/** Nome do kind para o operador. Rótulo é UI, não dado — por isso não vem do servidor. */
export function lookupLabel(kind: LookupKind): string {
  return KINDS[kind].label
}

export interface LookupOptions {
  options: string[]
  /** A lista passou do teto e veio cortada — ver o comentário do `pageSize`. */
  truncada: boolean
  carregando: boolean
  erro: boolean
}

/**
 * Opções de um `kind`, do servidor.
 *
 * `pageSize: 100` é o teto do contrato de listagem. Lista de apoio que passe de 100
 * itens deixou de ser lista de apoio — vira busca, e aí o componente é outro
 * (`[busca +...]`, padrão 5 da transcrição). Truncar em silêncio esconderia isso.
 *
 * Só item ATIVO entra: desativação é lógica (§9 padrão 8), e o operador não deve
 * poder escolher hoje o que a empresa aposentou. Um registro antigo que aponte
 * para item inativo continua exibindo o valor que tem — quem garante isso é o
 * controle, não esta consulta.
 */
export function useLookupOptions(kind: LookupKind): LookupOptions {
  const kindDoBackend = KINDS[kind].backend

  const query = useQuery({
    queryKey: ['catalog-lookups', kindDoBackend],
    queryFn: async () => {
      const resposta: RespostaDaApi = await listCatalogLookups({
        kind: kindDoBackend,
        pageSize: 100,
        sortBy: 'name',
      })

      return dadosOuErro<PagedResultOfCatalogLookupDto>(
        resposta,
        `Falha ao carregar a lista ${kindDoBackend}.`,
      )
    },
  })

  return {
    options: query.data?.rows.filter((r) => r.active).map((r) => r.name) ?? [],
    truncada: (query.data?.total ?? 0) > (query.data?.rows.length ?? 0),
    carregando: query.isPending,
    erro: query.isError,
  }
}
