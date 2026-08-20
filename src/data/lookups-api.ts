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
  // Era `CATEGORIA`, genérica. O legado tem TRÊS listas de categoria
  // (`categoriacliente`, `categoriaprofissionaisexterno` e a de produto), e a
  // que o combo do Cliente lia era a do cliente — o nome curto escondia isso.
  // Renomeada junto com o campo `categoryId` do contrato (#250), que aponta
  // para `CATEGORIA_CLIENTE`: manter as duas conviveria com duas listas que
  // significam a mesma coisa, que é o par duplicado que o 409 existe para
  // impedir.
  categoriaCliente: { label: 'Categoria do Cliente', backend: 'CATEGORIA_CLIENTE' },
  // Kinds do comparativo Softlux (#250) — vocabulário que a fase 1 vai
  // consumir. `ORGAO_REGISTRO` é o conselho que EMITE o registro profissional
  // (CREA/CAU/CFT), e não o órgão expedidor do RG, que é outro campo e mora no
  // bloco de Documentos.
  orgaoRegistro: { label: 'Órgão de Registro', backend: 'ORGAO_REGISTRO' },
  categoriaProfissional: { label: 'Categoria do Profissional', backend: 'CATEGORIA_PROFISSIONAL' },
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

export interface OpcaoDeLookup {
  id: string
  nome: string
}

export interface LookupOptions {
  /**
   * As opções como PARES id+nome (issue #94).
   *
   * Eram `string[]` de nomes, e o combo escolhia por nome — o que obrigava uma
   * tradução nome→id no submit, com um mapa `idsPorNome` para desempatar
   * homônimos e uma recusa barulhenta quando o nome sumia da lista. **Nome
   * nunca foi chave**: dois itens homônimos no mesmo kind, ou um renomeado
   * entre a carga da lista e o Gravar, e a tradução gravava o id errado no
   * campo que ninguém confere. Escolhendo por id, o problema deixa de existir
   * em vez de ser detectado.
   */
  options: OpcaoDeLookup[]
  /** A lista passou do teto e veio cortada — ver o comentário do `pageSize`. */
  truncada: boolean
  carregando: boolean
  erro: boolean
}

/**
 * Nome de um id, entre as opções carregadas. `undefined` quando o id não está
 * na lista — item desativado, ou lista truncada no teto de 100.
 *
 * **`undefined` não é erro, é informação**: quem exibe decide o que mostrar no
 * lugar, e o `LookupCombo` mostra o rótulo que o registro trouxe. O que NÃO se
 * faz é apagar o valor por não saber o nome dele.
 */
export function nomeDoLookup(
  options: readonly OpcaoDeLookup[],
  id: string | null,
): string | undefined {
  if (!id) return undefined
  return options.find((o) => o.id === id)?.nome
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

  const ativos = query.data?.rows.filter((r) => r.active) ?? []

  return {
    options: ativos.map((r) => ({ id: r.id, nome: r.name })),
    truncada: (query.data?.total ?? 0) > (query.data?.rows.length ?? 0),
    carregando: query.isPending,
    erro: query.isError,
  }
}

/**
 * Mapa id → nome de TODAS as listas de apoio, para a FICHA traduzir o que o
 * registro guarda (`lk-SETOR-1`) no que o operador lê (`VENDAS`).
 *
 * É a outra metade da issue #94: o `LookupCombo` passou a guardar id, e a ficha
 * de consulta imprime o valor guardado — sem este mapa ela imprime a chave. A
 * sentinela `rotulo-de-apoio.test.tsx` existe exatamente para este fio.
 *
 * **Uma consulta, sem `kind`**: o contrato aceita a listagem inteira, e o
 * vocabulário todo cabe no teto de 100 do contrato com folga. Item INATIVO
 * entra de propósito — registro antigo apontando para item aposentado continua
 * legível na ficha; quem impede escolher de novo é o combo, não a leitura.
 *
 * `undefined` enquanto carrega (e em erro): a ficha mostra o valor cru até o
 * mapa chegar — pior ler a chave por um instante do que esconder o dado.
 */
export function useRotulosDeApoio(): {
  /** Enquanto true, a rota mostra esqueleto — a ficha nunca pisca o id cru. */
  carregando: boolean
  rotulos?: Readonly<Record<string, string>>
} {
  const query = useQuery({
    queryKey: ['catalog-lookups', 'rotulos'],
    queryFn: async () => {
      const resposta: RespostaDaApi = await listCatalogLookups({ pageSize: 100, sortBy: 'name' })
      return dadosOuErro<PagedResultOfCatalogLookupDto>(
        resposta,
        'Falha ao carregar as listas de apoio.',
      )
    },
  })

  if (!query.data) return { carregando: query.isPending }
  return {
    carregando: false,
    rotulos: Object.fromEntries(query.data.rows.map((r) => [r.id, r.name])),
  }
}
