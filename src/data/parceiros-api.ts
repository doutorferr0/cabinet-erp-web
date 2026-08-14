import type { PartnerDto, PartnerPayoutBankInfo, PartnerWriteRequest } from '@/api/gerado'
import { createPartner, getPartner, linkPartner, updatePartner } from '@/api/gerado'
import {
  ErroDaApi,
  type RespostaDaApi,
  createApiListProvider,
  dadosOuErro,
  itemOuNulo,
} from '@/data/api-provider'
import type { ListProvider } from '@/data/provider'
import { useMutation, useQueryClient } from '@tanstack/react-query'

/**
 * FRONTEIRA DE PARCEIROS — `GET /api/partners`.
 *
 * Uma tabela só, três telas. Fornecedor, Cliente e Profissional Externo são
 * PAPÉIS do mesmo cadastro (`is_customer`/`is_supplier`/`is_professional` no
 * schema), e o endpoint filtra por `role`. Não é o front que decidiu unificar: o
 * backend publicou o filtro justamente porque "a tela é Fornecedores".
 *
 * ## O que a resposta junta
 *
 * O `PartnerDto` mistura duas origens, e a diferença importa na hora de ler:
 *
 * | Campo | Vem de | Significa |
 * |---|---|---|
 * | `legalName`, `tradeName`, `document`, `email`, os três papéis | cadastro da ORGANIZAÇÃO | vale para o grupo inteiro |
 * | `code`, `paymentTerms`, `active` | vínculo com a EMPRESA | vale só para a empresa ativa |
 * | `registrationActive` | cadastro da organização | o cadastro global está ativo |
 *
 * Por isso `Ativo` na tela é `active` (o VÍNCULO): a pergunta do operador é "esta
 * empresa trabalha com este fornecedor?", não "este cadastro existe no grupo?".
 *
 * ## Leitura por id: a linha primeiro, o servidor como rede
 *
 * O contrato passou a ter `GET /api/partners/{id}` (backend `#35`) — antes só
 * havia `PUT` nesse caminho, e o detalhe era a LINHA da listagem, porque o
 * `PartnerWriteRequest` é subconjunto do `PartnerDto` e a linha já traz todo
 * campo gravável. Essa parte continua valendo: quem vem da listagem não gasta
 * requisição, a linha é semeada no cache e o formulário a usa.
 *
 * O que mudou é o caso que a linha não alcança — **link direto e recarga**.
 * Agora, sem linha em mãos, a tela busca por id em vez de mandar voltar à
 * listagem. Mesmo DTO nos dois caminhos: não existe DTO de detalhe.
 */

export const URL_PARCEIROS = '/api/partners'

/**
 * Papéis aceitos pelo filtro. Valor fora da lista é **400**, não filtro ignorado —
 * o backend recusa alto de propósito: filtro ignorado faria a tela de Fornecedores
 * mostrar clientes sem ninguém desconfiar de uma lista cheia.
 */
export type PapelDeParceiro = 'customer' | 'supplier' | 'professional'

/**
 * Whitelist de `sortBy` do backend. `paymentTerms`, `email` e `registrationActive`
 * ficam de fora — coluna chaveada por eles responderia 400 ao clicar no cabeçalho.
 */
export const ORDENAVEIS: readonly string[] = [
  'code',
  'legalName',
  'tradeName',
  'document',
  'active',
]

/**
 * Whitelist de `field` do filtro estruturado — hoje a MESMA do `sortBy`, como o
 * contrato declara na descrição do parâmetro `filters`. Alias, não cópia: divergir
 * passa a ser edição deliberada, não duas listas iguais fora de sincronia.
 */
export const FILTRAVEIS: readonly string[] = ORDENAVEIS

/** Listagem de um papel. `fixa` carrega o `role` em toda consulta da tabela. */
export function parceirosDoPapel(role: PapelDeParceiro): ListProvider<PartnerDto> {
  return createApiListProvider<PartnerDto>({
    url: URL_PARCEIROS,
    fixa: { role },
    filtraveis: FILTRAVEIS,
  })
}

/**
 * Um parceiro por id; `null` quando não existe (404).
 *
 * Chegou com `GET /api/partners/{id}` (backend `#35`) e fecha o buraco mais
 * antigo desta fronteira: **link direto e recarga**. Enquanto só existia a linha
 * da listagem em cache, abrir por URL — ou recarregar a página com o formulário
 * aberto — não tinha de onde tirar o registro, e a tela mandava voltar à
 * listagem.
 *
 * Responde `PartnerDto`, o MESMO da listagem: não há DTO de detalhe, então o que
 * a linha traz e o que o id traz são a mesma coisa. Por isso a linha em cache
 * segue valendo como semente — o `get` é a rede para quando ela não existe.
 *
 * O 409 (sem empresa ativa na sessão) NÃO vira `null`: `itemOuNulo` converte só
 * 404. Dizer "não encontrado" a quem apenas não escolheu empresa mandaria o
 * operador procurar um registro que está lá.
 */
export async function obterParceiro(id: string): Promise<PartnerDto | null> {
  return itemOuNulo<PartnerDto>(await getPartner(id), `o parceiro ${id}`)
}

/**
 * Entrada do registry: listagem do servidor, detalhe por id e `empty` local.
 *
 * O `empty` continua local (`clienteVazio`, `fornecedorVazio`,
 * `profissionalVazio`) — "Incluir" não depende do servidor. O `get` passou a
 * existir com o `#35`; antes dele a entrada ficava SEM `get` de propósito,
 * porque `get` mock ao lado de listagem real casaria uuid do servidor com id
 * inventado e responderia "não encontrado" para registro que existe.
 */
export interface ParceiroProvider<T> extends ListProvider<PartnerDto> {
  get(id: string): Promise<PartnerDto | null>
  empty(id: number): T
}

export function parceiros<T>(role: PapelDeParceiro, empty: (id: number) => T): ParceiroProvider<T> {
  return { ...parceirosDoPapel(role), get: obterParceiro, empty }
}

/**
 * O que a tela EDITA de um parceiro.
 *
 * Recorte do `PartnerWriteRequest` que os formulários de Fornecedor, Cliente e
 * Profissional realmente têm campo para mostrar. O resto do corpo (`code`,
 * `paymentTerms` e os três papéis) viaja INALTERADO a partir da linha — ver
 * `corpoDeEscrita`.
 */
export interface CamposEditaveis {
  legalName: string
  tradeName: string | null
  document: string | null
  email: string | null
  active: boolean
  /**
   * Registro Profissional (CREA/CAU/CFT) e conta de comissão — só a tela de
   * Profissional Externo os edita, e por isso são OPCIONAIS aqui: as telas de
   * Cliente e Fornecedor não têm os campos, e obrigá-las a mandar `null` seria
   * a mesma armadilha que o comentário do `corpoDeEscrita` descreve.
   */
  registration?: string | null
  payoutBankInfo?: PartnerPayoutBankInfo | null
}

/**
 * Linha original + campos editados → corpo do `PUT`.
 *
 * **O que a tela não mostra é devolvido como veio.** `PUT` substitui o registro
 * inteiro: mandar `code`, `paymentTerms` ou os papéis como `null` porque o
 * formulário não tem campo para eles apagaria dado que ninguém pediu para apagar
 * — e o operador só descobriria na próxima listagem.
 *
 * Os três papéis vêm da linha pelo mesmo motivo: quem é cliente E fornecedor não
 * pode deixar de ser fornecedor por ter sido gravado na tela de Clientes.
 */
export function corpoDeEscrita(
  original: PartnerDto,
  editado: CamposEditaveis,
): PartnerWriteRequest {
  return {
    legalName: editado.legalName,
    tradeName: editado.tradeName,
    document: editado.document,
    email: editado.email,
    active: editado.active,
    code: original.code,
    paymentTerms: original.paymentTerms,
    isCustomer: original.isCustomer,
    isSupplier: original.isSupplier,
    isProfessional: original.isProfessional,
    // Editados quando a tela os tem; DEVOLVIDOS COMO VIERAM quando não tem.
    // `undefined` aqui apagaria o conselho e a conta bancária do profissional
    // ao gravar por qualquer outra tela — a mesma regra do `code` acima, e o
    // caminho por onde ela mais dói: desativar um cadastro passa por aqui.
    registration:
      editado.registration !== undefined ? editado.registration : (original.registration ?? null),
    payoutBankInfo:
      editado.payoutBankInfo !== undefined
        ? editado.payoutBankInfo
        : (original.payoutBankInfo ?? null),
  }
}

/**
 * Grava a alteração e devolve o registro COMO O SERVIDOR o deixou — o contrato
 * responde `200` com o `PartnerDto`, não `204`. Aceitar corpo vazio aqui seria
 * aceitar uma resposta que o contrato não descreve.
 *
 * `403` é o RLS recusando escopo (a empresa da sessão não é a do registro), e o
 * `detail` do problem+json é o que explica isso ao operador.
 */
export async function atualizarParceiro(
  id: string,
  corpo: PartnerWriteRequest,
): Promise<PartnerDto> {
  const resposta: RespostaDaApi = await updatePartner(id, corpo)
  return dadosOuErro<PartnerDto>(resposta, `Falha ao gravar o parceiro ${id}.`)
}

/**
 * Corpo da DESATIVAÇÃO — a linha inteira de volta, com `active: false`.
 *
 * O `Excluir` da barra de ações nunca apaga (padrão 8): desativa o VÍNCULO com a
 * empresa ativa. Passar pela `corpoDeEscrita` com os próprios valores da linha é
 * o que garante que só `active` muda — o `PUT` substitui o registro inteiro, e
 * montar o corpo à mão aqui seria a segunda chance de esquecer `code`,
 * `paymentTerms` ou um dos papéis e apagá-los sem que ninguém tenha pedido.
 */
export function corpoDeDesativacao(linha: PartnerDto): PartnerWriteRequest {
  return corpoDeEscrita(linha, {
    legalName: linha.legalName,
    tradeName: linha.tradeName,
    document: linha.document,
    email: linha.email,
    active: false,
  })
}

/**
 * `Excluir` da listagem: desativa o vínculo e recarrega a lista.
 *
 * Mora aqui, e não em cada rota, porque as três telas de parceiro fazem a MESMA
 * escrita mudando só a query key da listagem — a triplicação já custou caro no
 * `Alterar`. Em sucesso invalida a listagem: a linha continua na tela (é
 * desativação, não sumiço), mas com `Ativo: Não`, que é a prova visível de que
 * a escrita valeu.
 */
export function useDesativarParceiro(queryKey: readonly unknown[]) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (linha: PartnerDto) => atualizarParceiro(linha.id, corpoDeDesativacao(linha)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })
}

/**
 * Corpo do `POST` — o cadastro nasce com O PAPEL DA TELA e nenhum outro.
 *
 * O schema exige pelo menos um papel (`partners_papel_check`), e quem sabe qual
 * é a tela: incluir pela tela de Fornecedores cria fornecedor. Marcar os três
 * "por precaução" faria todo cadastro novo aparecer nas três listagens.
 *
 * `code` e `paymentTerms` nascem nulos: são do VÍNCULO com a empresa e nenhum dos
 * formulários tem campo para eles. O contrato aceita nulo — inventar um código
 * aqui competiria com o que o operador espera digitar depois.
 */
export function corpoDeInclusao(
  papel: PapelDeParceiro,
  editado: CamposEditaveis,
): PartnerWriteRequest {
  return {
    legalName: editado.legalName,
    tradeName: editado.tradeName,
    document: editado.document,
    email: editado.email,
    active: editado.active,
    code: null,
    paymentTerms: null,
    isCustomer: papel === 'customer',
    isSupplier: papel === 'supplier',
    isProfessional: papel === 'professional',
    // Na INCLUSÃO não há registro anterior a preservar: o que a tela não edita
    // nasce nulo, igual a `code` e `paymentTerms` logo acima.
    registration: editado.registration ?? null,
    payoutBankInfo: editado.payoutBankInfo ?? null,
  }
}

/**
 * Cria o parceiro e devolve o registro como o servidor o gravou (`201` com o
 * `PartnerDto`). `409` é o documento já cadastrado — índice único em
 * `partners.document` —, e o `detail` é o que diz isso ao operador.
 */
export async function incluirParceiro(corpo: PartnerWriteRequest): Promise<PartnerDto> {
  const resposta: RespostaDaApi = await createPartner(corpo)
  return dadosOuErro<PartnerDto>(resposta, 'Falha ao incluir o parceiro.')
}

/**
 * O id que o 409 de documento repetido carrega — `null` quando o erro é outro.
 *
 * O cadastro é da ORGANIZAÇÃO: o documento já existe no grupo, mas o parceiro não
 * aparece na listagem de quem ainda não o atende. Sem este id a tela ficaria com
 * uma frase descrevendo a saída sem poder tomá-la.
 */
export function idDoParceiroExistente(erro: unknown): string | null {
  if (!(erro instanceof ErroDaApi) || erro.status !== 409) return null
  const corpo = erro.corpo
  if (!corpo || typeof corpo !== 'object') return null
  const id = (corpo as { existingPartnerId?: unknown }).existingPartnerId
  return typeof id === 'string' && id ? id : null
}

/**
 * Liga a empresa ativa a um cadastro que já existe no grupo — o outro lado do
 * 409 acima.
 *
 * **Vincular NÃO edita**, e o corpo prova: só `code`, `paymentTerms` e `active`,
 * que são do VÍNCULO. Aceitar os campos do cadastro faria "vincular" virar
 * caminho para sobrescrever em silêncio a razão social que a empresa vizinha
 * cadastrou. Ajustar o cadastro depois é o `Alterar`, que é explícito.
 */
export async function vincularParceiro(id: string, ativo: boolean): Promise<PartnerDto> {
  const resposta: RespostaDaApi = await linkPartner(id, {
    code: null,
    paymentTerms: null,
    active: ativo,
  })
  return dadosOuErro<PartnerDto>(resposta, `Falha ao vincular o parceiro ${id}.`)
}
