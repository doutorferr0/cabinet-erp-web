import {
  type CatalogLookupDto,
  type PagedResultOfCatalogLookupDto,
  ProblemType,
  createCatalogLookup,
  listCatalogLookups,
} from '@/api/gerado'
import { type RespostaDaApi, dadosOuErro } from '@/data/api-provider'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

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
  // `profissional` SAIU (#265). Era o kind do especificador, e o especificador
  // é um `partners.id` — o profissional externo já É um parceiro. Lista de
  // apoio paralela com os mesmos nomes é o par duplicado que o 409 de
  // `catalog-lookups` existe para impedir, e o id que ela devolvia não existe
  // em `partners`: o `PUT` levava 400 de `conferirApoios`. Quem serve o combo
  // agora é `useEspecificadorOptions`, em `parceiros-api.ts`.
  tipoProduto: { label: 'Tipo de Produto', backend: 'TIPO_PRODUTO' },
  tipoPeca: { label: 'Tipo da Peça', backend: 'TIPO_PECA' },
  tipoLinha: { label: 'Tipo da Linha', backend: 'TIPO_LINHA' },
  classificacao: { label: 'Classificação do Produto', backend: 'CLASSIFICACAO' },
  designerModelo: { label: 'Designer\\Modelo', backend: 'DESIGNER' },
  fabrica: { label: 'Fábrica', backend: 'FABRICA' },
  marca: { label: 'Marca', backend: 'MARCA' },
  materiais: { label: 'Materiais', backend: 'MATERIAIS' },
  impostosPadrao: { label: 'Impostos Padrão', backend: 'IMPOSTO_PADRAO' },
  // O motivo do CANCELAMENTO de documento de venda — o `Mod_codigo` que o legado
  // gravava junto de `ven_situacao='C'`. É para onde `CancelDocumentRequest.reasonId`
  // aponta, e o servidor responde **400 apontando o campo** quando o id é de
  // OUTRA lista: quem separa motivo de marca é o `kind`, que não viaja pelo
  // contrato (ADR-011) — é linha aqui e linha no `KINDS` do servidor.
  motivoCancelamento: { label: 'Motivo do Cancelamento', backend: 'MOTIVO_CANCELAMENTO' },
  // O GRUPO DE PRODUTO (`GrupoProduto` do legado: 12 linhas, por empresa).
  //
  // Ele já era CHAVE em cinco schemas do contrato — `QuoteItemDto.productGroupId`,
  // `QuoteGroupDiscountDto`, `SupplierGroupMinimumDto`, `CommissionTierDto` e a
  // faixa congelada do documento —, e nenhuma tela tinha de onde escolher um: o
  // kind não estava aqui. A faixa POR GRUPO do perfil de comissão é a primeira
  // tela que precisa ESCOLHER o grupo, e é por isso que ele entra agora.
  //
  // **O mock não semeia este kind** (está escrito em `store.ts`, no
  // `groupMinimums` vazio do fornecedor): em modo mock a lista volta VAZIA, e a
  // tela que a consome diz isso em voz alta em vez de mostrar um combo mudo.
  grupoProduto: { label: 'Grupo de Produto', backend: 'GRUPO_PRODUTO' },
} as const satisfies Record<string, { label: string; backend: string }>

export type LookupKind = keyof typeof KINDS

/**
 * Os kinds, na ordem em que `KINDS` os declara — a lista que a tela de gestão
 * das listas de apoio percorre.
 *
 * **Derivada, nunca escrita à mão.** O vocabulário não viaja pelo contrato
 * (ADR-011: `kind` é `string` livre, sem enum, porque enumerá-lo faria
 * cadastrar uma lista nova virar PR de contrato), então a única fonte que o
 * front tem é este mapa. Uma segunda lista, para a tela, envelheceria no
 * primeiro kind acrescentado — e envelheceria calada, porque kind desconhecido
 * na LEITURA devolve 200 vazio, não erro.
 */
export const LOOKUP_KINDS = Object.keys(KINDS) as LookupKind[]

/** O nome do kind como o servidor o guarda (`MARCA`), a partir da chave de UI. */
export function kindDoBackend(kind: LookupKind): string {
  return KINDS[kind].backend
}

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

/**
 * O que o `+...` do combo devolveu — CRIADO ou DUPLICADO, nunca "erro".
 *
 * O 409 do contrato não é falha: é a resposta de que o item que o operador quer
 * já existe naquele kind. Tratá-lo como erro genérico ("Falha ao cadastrar")
 * mandaria o operador procurar o que ele já tinha na mão — e a alternativa
 * pior, cadastrar de novo, é justamente o par duplicado que o 409 impede.
 *
 * O contrato diz por escrito que o 409 **não carrega membro de extensão**: quem
 * acha o item existente é o cliente, PELO NOME que acabou de digitar, na lista
 * do kind que ele já tem em cache. Por isso `existente` pode vir `undefined` —
 * item desativado, ou lista cortada no teto de 100 — e a diferença aparece na
 * tela em vez de virar um id chutado.
 */
export type CadastroDeApoio =
  | { estado: 'criado'; item: OpcaoDeLookup }
  | { estado: 'duplicado'; nome: string; existente: OpcaoDeLookup | undefined }

/**
 * O `+...` da transcrição (§9 padrão 2) virando `POST /api/catalog-lookups`.
 *
 * Era estado local: o combo inventava `novo:<kind>:<NOME>` e o punha na lista.
 * O id nunca existiu no servidor — e desde que `categoryId`/`specifierId`
 * entraram no contrato (#250, uuid), gravar um cadastro feito por ali mandava
 * essa string no corpo do `PUT`. O campo aceita digitação, o operador vê o nome
 * que escolheu, e o servidor recusa (ou pior, guarda) um id que combo nenhum
 * consegue reler.
 *
 * `active: true` viaja explícito porque o contrato o exige explícito: o item
 * nasce para ser usado agora, e um padrão implícito do servidor esconderia da
 * tela quem decidiu isso.
 */
/**
 * `sem-empresa-ativa` é o único 409 desta rota que NÃO é nome repetido — e o
 * único que o combo não pode confundir com duplicado. Vem do enum GERADO: URN
 * escrita à mão aqui seria a dívida que o codegen existe para não pagar.
 */
const TIPO_SEM_EMPRESA: ProblemType = ProblemType['urn:cabinet:erro:sem-empresa-ativa']

/** O `type` do problem+json — `undefined` quando o corpo não é um. */
function tipoDoProblema(resposta: RespostaDaApi): string | undefined {
  const corpo = resposta.data as { type?: unknown } | null | undefined
  return typeof corpo?.type === 'string' ? corpo.type : undefined
}

export function useCadastrarItemDeApoio(kind: LookupKind) {
  const queryClient = useQueryClient()
  const kindDoBackend = KINDS[kind].backend

  const mutation = useMutation({
    mutationFn: async ({
      nome,
      opcoesCarregadas,
    }: { nome: string; opcoesCarregadas: readonly OpcaoDeLookup[] }): Promise<CadastroDeApoio> => {
      const resposta: RespostaDaApi = await createCatalogLookup({
        kind: kindDoBackend,
        name: nome,
        active: true,
      })

      // **409 NÃO É UM ERRO SÓ** (#269): o contrato o descreve como o conflito
      // de sete coisas, e quem diz QUAL é o `type`. Enquanto esta linha lia só
      // o status, o 409 de `sem-empresa-ativa` — o operador ainda sem empresa
      // escolhida — chegava aqui como "duplicado", e o combo dizia "já existe
      // ARQUITETO" de um item que ninguém cadastrou, apontando o operador para
      // uma lista onde ele não vai achar nada. A recusa por nome repetido é a
      // GENÉRICA (`about:blank`): o vocabulário não reserva URN para ela, e é
      // por isso que a condição é escrita como "não é sem-empresa-ativa" em
      // vez de "é lookup-duplicado" — URN que não existe não se inventa aqui.
      if (resposta.status === 409 && tipoDoProblema(resposta) !== TIPO_SEM_EMPRESA) {
        const igual = (o: OpcaoDeLookup) => o.nome.toLocaleUpperCase() === nome.toLocaleUpperCase()
        return { estado: 'duplicado', nome, existente: opcoesCarregadas.find(igual) }
      }

      const dto = dadosOuErro<CatalogLookupDto>(
        resposta,
        `Falha ao cadastrar o item da lista ${kindDoBackend}.`,
      )
      return { estado: 'criado', item: { id: dto.id, nome: dto.name } }
    },
    onSuccess: async (resultado) => {
      // Só o CRIADO mexeu na lista do servidor. Invalidar no duplicado
      // recarregaria as opções para nada — e a lista de rótulos junto.
      if (resultado.estado === 'criado') {
        await queryClient.invalidateQueries({ queryKey: ['catalog-lookups'] })
      }
    },
  })

  return {
    cadastrar: mutation.mutateAsync,
    gravando: mutation.isPending,
    /** Falha de verdade (400/500/rede). O 409 sai por `CadastroDeApoio`, não por aqui. */
    erro: mutation.error,
    limparErro: mutation.reset,
  }
}
