import { listCatalogLookups } from '@/api/gerado'
import type { LookupKind } from '@/mocks/lookups'
import { useQuery } from '@tanstack/react-query'

/**
 * As listas de apoio vindas do backend (ADR-011: uma tabela discriminada por `kind`).
 *
 * O front nomeia os kinds em camelCase porque são chaves de UI; o banco os guarda
 * em MAIÚSCULA_COM_UNDERSCORE. O mapa vive aqui, num lugar só — espalhar essa
 * tradução pelos formulários faria cada tela ter a sua versão do nome.
 */
const KIND_NO_BACKEND: Record<LookupKind, string> = {
  setor: 'SETOR',
  grauInstrucao: 'GRAU_INSTRUCAO',
  profissao: 'PROFISSAO',
  racaCor: 'RACA_COR',
  estadoCivil: 'ESTADO_CIVIL',
  nacionalidade: 'NACIONALIDADE',
  cargo: 'CARGO',
  vinculo: 'VINCULO',
  categoria: 'CATEGORIA',
  profissional: 'PROFISSIONAL',
  tipoProduto: 'TIPO_PRODUTO',
  tipoPeca: 'TIPO_PECA',
  tipoLinha: 'TIPO_LINHA',
  classificacao: 'CLASSIFICACAO',
  designerModelo: 'DESIGNER',
  fabrica: 'FABRICA',
  marca: 'MARCA',
  materiais: 'MATERIAIS',
  impostosPadrao: 'IMPOSTO_PADRAO',
}

/**
 * Opções de um `kind`, do servidor.
 *
 * `pageSize: 100` é o teto do contrato de listagem. Lista de apoio que passe de 100
 * itens deixou de ser lista de apoio — vira busca, e aí o componente é outro
 * (`[busca +...]`, padrão 5 da transcrição). Truncar em silêncio esconderia isso.
 */
export function useLookupOptions(kind: LookupKind) {
  const kindDoBackend = KIND_NO_BACKEND[kind]

  const query = useQuery({
    queryKey: ['catalog-lookups', kindDoBackend],
    queryFn: async () => {
      const { data, error } = await listCatalogLookups({
        query: { kind: kindDoBackend, pageSize: 100, sortBy: 'name' },
      })

      if (error || !data) throw new Error(`Falha ao carregar a lista ${kindDoBackend}.`)
      return data
    },
  })

  return {
    options: query.data?.rows.filter((r) => r.active).map((r) => r.name) ?? [],
    truncada: (query.data?.total ?? 0) > (query.data?.rows.length ?? 0),
    carregando: query.isPending,
    erro: query.isError,
  }
}
