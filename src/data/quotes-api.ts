import type { QuoteDetailDto, QuoteDto, QuoteWriteRequest } from '@/api/gerado'
import { cancelQuote, createQuote, getQuote, updateQuote } from '@/api/gerado'
import {
  PAGE_SIZE_MAX,
  type RespostaDaApi,
  createApiListProvider,
  dadosOuErro,
  itemOuNulo,
} from '@/data/api-provider'
import type { DocumentoProvider, ListProvider } from '@/data/provider'
import { avisar } from '@/lib/avisos'
import { type Orcamento, orcamentoVazio } from '@/mocks/orcamentos'
import { useMutation, useQueryClient } from '@tanstack/react-query'

/**
 * FRONTEIRA DO ORÇAMENTO — `/api/quotes`.
 *
 * O caminho está no contrato desde 2026-08-11 e **nenhum handler o servia**: a
 * tela lia o array de `src/mocks/orcamentos` com id numérico. Enquanto isso
 * durou, orçamento e CRM viviam em mundos diferentes — e a #89 (conversão
 * oportunidade→orçamento) travou nisso, porque `crm_opportunities.quote_id`
 * referencia um id que só o servidor atribui.
 *
 * ## A tela NÃO muda de vocabulário
 *
 * O formulário do orçamento fala a língua da transcrição (`numeroPasta`,
 * `descricaoObra`, `modoDesconto`) e continua falando. Quem traduz para o
 * contrato é este arquivo, exatamente como `crm-api.ts` faz entre `Funil` e
 * `CrmPipelineDto`. Reescrever 446 linhas de formulário para renomear campo
 * seria pagar caro por nada: o nome que o operador lê e o nome que viaja não
 * precisam ser o mesmo.
 *
 * ## O filtro entrou no contrato junto
 *
 * A listagem JÁ oferecia filtro estruturado (a primeira a filtrar por data), e
 * o recurso não publicava `filters` — `createApiListProvider` recusaria em voz
 * alta na primeira condição aplicada. Publicar era a saída; tirar o filtro da
 * tela seria pagar a migração com uma consulta a menos.
 *
 * `sortBy` e `filters` têm whitelist, e por isso a coluna que ordena e o campo
 * que filtra usam nome em INGLÊS.
 */

export const URL_ORCAMENTOS = '/api/quotes'

/**
 * Whitelist de `sortBy` — a MESMA da descrição do contrato. `series` fica de
 * fora: a tela mostra a coluna e ela não ordena, o que é melhor que oferecer
 * uma ordenação que responde 400 ao primeiro clique.
 *
 * `workName` ordena pelo nome da OBRA, e não pelo `projectName` digitado.
 * São dois dados desde que a obra virou entidade: no seed da transcrição o
 * `projectName` guarda o nome do PROFISSIONAL (§8.1, observação), então ordenar
 * por ele nunca pôs junto dois documentos da mesma obra.
 */
export const ORDENAVEIS_ORCAMENTO: readonly string[] = [
  'number',
  'issuedAt',
  'expiresAt',
  'customerName',
  'projectName',
  'workName',
]

/**
 * A do `filters` é a do `sortBy` MAIS `workId` — e por isso deixou de ser a
 * mesma constante.
 *
 * `workId` é como a tela pergunta "os documentos desta obra", do mesmo jeito que
 * `customerId` responde "as obras deste cliente" em `/api/works`. Ordenar por
 * uuid não põe nada em ordem para quem lê, então ele não entra no `sortBy`: as
 * duas listas divergem porque as duas perguntas divergem, e apontar a mesma
 * constante para as duas esconderia isso na próxima diferença.
 */
export const FILTRAVEIS_ORCAMENTO: readonly string[] = [...ORDENAVEIS_ORCAMENTO, 'workId']

/**
 * Chaves de cache num lugar só: mutação que invalida a chave errada é bug mudo.
 *
 * São DUAS raízes porque são duas telas com formas diferentes do mesmo
 * documento — `raiz` é a listagem (`QuoteDto` cru), `detalhe` é a folha
 * (`Orcamento`), montada pela `TelaDeDocumento` com `queryKeyBase="orcamento"`.
 */
export const CHAVES_ORCAMENTO = {
  raiz: ['orcamentos'] as const,
  detalhe: ['orcamento'] as const,
  um: (id: string) => ['orcamento', id] as const,
}

/** `QuoteDetailDto` → a forma que o formulário já usa. */
export function paraOrcamento(dto: QuoteDetailDto): Orcamento {
  return {
    id: dto.id,
    numero: dto.number,
    serie: dto.series ?? '',
    numeroPasta: dto.folderNumber ?? '',
    dataEmissao: dto.issuedAt ?? null,
    dataValidade: dto.expiresAt ?? null,
    dataFechamento: dto.closedAt ?? null,
    clienteId: dto.customerId,
    cliente: dto.customerName,
    descricaoObra: dto.projectName ?? '',
    consultorId: dto.salespersonId ?? null,
    consultor: dto.salespersonName ?? null,
    profissionalId: dto.professionalId ?? null,
    profissionalExterno: dto.professionalName ?? null,
    cancelado: dto.status === 'cancelled',
    modoDesconto: dto.discountMode === 'general' ? 'GERAL' : 'PRODUTO',
    descontoPercentual: dto.discountPercent,
    // Coleção própria, e não derivada dos itens: é ela que guarda o nome
    // CONGELADO na emissão. Sem carregá-la, a escrita não tem de onde tirar o
    // `name` e acaba mandando o código no lugar dele.
    ambientes: (dto.environments ?? []).map((a) => ({
      codigo: a.code,
      nome: a.name,
      ordem: a.order,
    })),
    // O bloco PAGAMENTO desce inteiro para o formulário: o id é o que a escrita
    // devolve, e o plano é o carimbo — leitura pura, que a tela mostra e não
    // reenvia (`QuoteWriteRequest` só tem `paymentTermId`).
    condicaoPagamentoId: dto.paymentTermId ?? null,
    condicaoPagamento: dto.paymentTermName ?? null,
    parcelas: dto.paymentInstallments ?? [],
    ...(dto.installmentPolicy ? { politicaDeParcelamento: dto.installmentPolicy } : {}),
    itens: (dto.items ?? []).map((item) => ({
      item: String(item.lineNumber),
      codigoFornecedor: item.supplierCode ?? '',
      descricaoFornecedor: item.supplierDescription ?? item.description,
      acabamento: item.finish ?? '',
      tamanho: item.size ?? '',
      // Quantidade volta a ser TEXTO na tela: a grade da §8.2 é editável, e
      // número em campo de texto perde o que o operador digitou no meio da
      // digitação ("1," vira 1).
      quantidade: String(item.quantity),
      unidade: item.unit ?? '',
      valorUnitarioCentavos: item.unitPriceCents,
      descontoPercentual: item.discountPercent,
      grupoProduto: item.productGroup ?? '',
      tipoPeca: item.pieceType ?? '',
      fornecedor: item.supplierName ?? '',
      ambiente: item.environmentCode ?? '',
    })),
  }
}

/**
 * A forma da tela → o corpo de escrita.
 *
 * **Sem `number`, `status` nem `totalCents`:** o contrato tira os três da
 * escrita porque são do servidor — número é sequência global do grupo, situação
 * muda por `/cancel`, e total que o cliente manda é total que diverge do item na
 * primeira arredondada.
 *
 * **`environments` vem do DOCUMENTO, não dos itens** — e isto foi corrigido ao
 * ligar `/api/quotes` no backend real. Derivá-los da coluna Ambiente da grade
 * montava `{ code, name: code }`, porque a grade guarda o CÓDIGO e o nome
 * congelado não estava em lugar nenhum. Como o `PUT` é integral, um `Gravar`
 * sem nenhuma edição gravava o uuid por cima do nome do ambiente: medido contra
 * o backend, o documento voltou com `name: "11111111-1111-…"`. O contrato é
 * explícito nos dois pontos — o nome é congelado na emissão, e "ambiente sem
 * item nenhum é estado legítimo", que derivação nenhuma consegue representar.
 *
 * **Código que o documento não conhece não sai daqui.** `environmentCode` é
 * `format: uuid` no contrato — o id do ambiente no catálogo — e o botão
 * `Ambiente` insere uma linha com um nome da lista de `tabelas.ambientes`, que
 * é INVENTADA (§8.2 capturou a grade vazia) e não tem id de catálogo nenhum.
 * Mandá-lo é 400 na hora de gravar, e o operador perde o documento inteiro por
 * causa da coluna. Enquanto `GET /api/catalog-lookups` responder 501 e não
 * houver kind `AMBIENTE`, a linha grava sem ambiente em vez de não gravar.
 */
export function paraEscrita(o: Orcamento): QuoteWriteRequest {
  const conhecido = new Set(o.ambientes.map((a) => a.codigo))
  const codigoDoItem = (item: { ambiente: string }) =>
    item.ambiente && conhecido.has(item.ambiente) ? item.ambiente : null

  return {
    series: o.serie || null,
    issuedAt: o.dataEmissao,
    expiresAt: o.dataValidade,
    customerId: o.clienteId,
    projectName: o.descricaoObra || null,
    // TODO(contract): `workId` NÃO sai daqui, e isso apaga o elo com a obra.
    // O `PUT` substitui o documento INTEIRO — corpo sem `workId` é documento
    // sem obra. Hoje não morde porque a tela também não SETA o elo (o form da
    // §8.2 não tem o campo, e esta zona é contrato+mock, não tela), então
    // documento nenhum que passe por aqui tem um a perder. Passa a morder no
    // instante em que alguém ligar a obra em qualquer outro lugar — mock, api
    // ou importação: um `Gravar` sem edição limparia a coluna, com 200. Quem
    // puser o campo no formulário liga os dois lados NO MESMO PR: o campo na
    // tela e o `workId` neste corpo.
    folderNumber: o.numeroPasta || null,
    closedAt: o.dataFechamento,
    salespersonId: o.consultorId,
    professionalId: o.profissionalId,
    discountMode: o.modoDesconto === 'GERAL' ? 'general' : 'product',
    // Zero quando o modo é por PRODUTO — é o que o contrato descreve, e mandar
    // o percentual guardado faria o servidor aplicar um desconto geral que a
    // tela não está mostrando.
    discountPercent: o.modoDesconto === 'GERAL' ? o.descontoPercentual : 0,
    // Do bloco Pagamento sobe SÓ o id. O nome e as parcelas são carimbo do
    // servidor, e reenviá-los deixaria o cliente propor um plano que não soma o
    // total do documento — o Fastify os apagaria em silêncio, e o operador
    // veria o plano dele virar outro sem nenhum aviso.
    paymentTermId: o.condicaoPagamentoId,
    environments: o.ambientes.map((a) => ({ code: a.codigo, name: a.nome, order: a.ordem })),
    items: o.itens.map((item, i) => ({
      lineNumber: i + 1,
      environmentCode: codigoDoItem(item),
      // O item da grade fala a língua do FORNECEDOR (§8.2) e não aponta para o
      // catálogo. `null` é honesto — inventar um `variantId` casaria com
      // produto que não existe.
      variantId: null,
      description: item.descricaoFornecedor,
      finish: item.acabamento || null,
      size: item.tamanho || null,
      quantity: Number(String(item.quantidade).replace(',', '.')) || 0,
      unit: item.unidade || null,
      unitPriceCents: item.valorUnitarioCentavos ?? 0,
      discountPercent: item.descontoPercentual ?? 0,
      supplierId: null,
      supplierName: item.fornecedor || null,
      supplierCode: item.codigoFornecedor || null,
      supplierDescription: item.descricaoFornecedor || null,
      productGroup: item.grupoProduto || null,
      pieceType: item.tipoPeca || null,
    })),
  }
}

/**
 * O provider do registry.
 *
 * **A LINHA e o DOCUMENTO são tipos diferentes**, e é de propósito: a listagem
 * devolve o `QuoteDto` CRU, sem tradução, porque o `sortBy` que viaja é o
 * `accessorKey` da coluna e a whitelist do servidor é em inglês — traduzir aqui
 * quebraria a ordenação com 400 ao clicar no cabeçalho. O formulário recebe a
 * forma da transcrição. É a mesma divisão de `produtosApi`.
 *
 * `get` entra porque o caminho existe de verdade (`GET /api/quotes/{id}`) — a
 * regra do registry vale aqui como valeu para o CRM. `empty` continua local: o
 * backend não fornece registro em branco, e "Incluir" não espera rede.
 */
export interface OrcamentosProvider extends ListProvider<QuoteDto>, DocumentoProvider<Orcamento> {}

export const orcamentosApi: OrcamentosProvider = {
  ...createApiListProvider<QuoteDto>({
    url: URL_ORCAMENTOS,
    filtraveis: FILTRAVEIS_ORCAMENTO,
  }),

  async get(id) {
    const resposta: RespostaDaApi = await getQuote(id)
    const dto = itemOuNulo<QuoteDetailDto>(resposta, 'o orçamento')
    return dto ? paraOrcamento(dto) : null
  },

  empty: () => orcamentoVazio(),
}

/**
 * Toda mutação invalida o mesmo tronco — e são DOIS troncos, não um.
 *
 * Invalidação fina economizaria requisição e pagaria com a classe de bug que
 * este repo já conhece: gravar um orçamento muda a linha da listagem, o total,
 * e — quando ele vier de uma oportunidade (#89) — o vínculo do outro lado.
 *
 * **`['orcamento']` não é prefixo de `['orcamentos']`.** A comparação do
 * TanStack é elemento a elemento, então invalidar só o singular deixava a
 * LISTAGEM de fora — que é justamente a tela para onde o `Gravar` navega. Não
 * dava sintoma porque a listagem remonta e o `staleTime` padrão é zero: a
 * consulta refazia por outro motivo, e a invalidação estava escrita mas não
 * valia. Por isso as duas chaves saem de `CHAVES_ORCAMENTO`, que existe
 * exatamente para isso e até agora não tinha um chamador.
 */
function useInvalidarOrcamentos() {
  const cliente = useQueryClient()
  return () => {
    void cliente.invalidateQueries({ queryKey: CHAVES_ORCAMENTO.raiz, exact: false })
    void cliente.invalidateQueries({ queryKey: CHAVES_ORCAMENTO.detalhe, exact: false })
  }
}

async function criarOrcamento(corpo: QuoteWriteRequest) {
  const resposta: RespostaDaApi = await createQuote(corpo)
  return dadosOuErro<QuoteDetailDto>(resposta, 'Falha ao criar o orçamento.')
}

/**
 * `PUT` substitui o documento INTEIRO, itens e ambientes junto — o corpo se
 * monta a partir do registro que veio do servidor, nunca só dos campos da tela.
 * Campo ausente é campo apagado.
 */
async function alterarOrcamento(id: string, corpo: QuoteWriteRequest) {
  const resposta: RespostaDaApi = await updateQuote(id, corpo)
  return dadosOuErro<QuoteDetailDto>(resposta, 'Falha ao gravar o orçamento.')
}

/**
 * O `Gravar` do formulário — UM hook que decide `POST` ou `PUT` pelo id.
 *
 * Dois hooks exportados lado a lado é a armadilha que a #207 mediu no CRM:
 * `useCriarFunil` e `useAlterarFunil` PARECIAM o caminho e não eram, e chamar o
 * errado gravava calado pela metade. Aqui a decisão é do id — documento novo
 * nasce com `id` vazio (`orcamentoVazio`), porque número e id são do servidor —
 * e ela não pode morar na tela: seria a mesma escolha repetida em cada
 * chamador, com uma chance de errar por chamador.
 *
 * A TRADUÇÃO também é daqui (`paraEscrita`): a tela fala a língua da
 * transcrição e o contrato fala inglês, e é esta fronteira que faz a ponte
 * desde a #134.
 */
export function useGravarOrcamento() {
  const invalidar = useInvalidarOrcamentos()
  return useMutation({
    mutationFn: async (orcamento: Orcamento) => {
      const corpo = paraEscrita(orcamento)
      return orcamento.id ? alterarOrcamento(orcamento.id, corpo) : criarOrcamento(corpo)
    },
    onSuccess: (gravado) => {
      invalidar()
      // O `Gravar` navega de volta para a listagem no mesmo tique, e a tela que
      // daria o aviso já está sendo desmontada — por isso a fila do aviso mora
      // em estado de módulo (#208, `lib/avisos.ts`). Sem isto, a escrita
      // acontece e o único sinal é a tela fechar, que é também o que acontece
      // quando se cancela.
      avisar('Orçamento gravado.', gravado.number ? `Nº ${gravado.number}` : undefined)
    },
  })
}

/**
 * Cancelar é verbo PRÓPRIO: documento cancela, não desativa.
 *
 * Caminho próprio no contrato (`POST /api/quotes/{id}/cancel`) e **terminal** —
 * não há reabertura publicada. É por isso que a listagem confirma antes: a
 * desativação de cadastro se desfaz pelo `Alterar`, esta não se desfaz.
 */
export function useCancelarOrcamento() {
  const invalidar = useInvalidarOrcamentos()
  return useMutation({
    mutationFn: async (id: string) => {
      const resposta: RespostaDaApi = await cancelQuote(id)
      return dadosOuErro<QuoteDetailDto>(resposta, 'Falha ao cancelar o orçamento.')
    },
    onSuccess: (cancelado) => {
      invalidar()
      avisar(
        `Orçamento ${cancelado.number} cancelado.`,
        'O documento continua na listagem, marcado como cancelado.',
      )
    },
  })
}

/** O teto do contrato, reexportado para quem monta consulta sem paginar. */
export { PAGE_SIZE_MAX }
