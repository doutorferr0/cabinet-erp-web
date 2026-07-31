import type { PartnerDto, PartnerWriteRequest } from '@/api/gerado'
import { updatePartner } from '@/api/gerado'
import { ErroDaApi, createApiListProvider, detalheDoProblema } from '@/data/api-provider'
import type { ListProvider } from '@/data/provider'

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
 * ## Sem LEITURA por id, mas com ESCRITA por id
 *
 * O contrato tem `PUT /api/partners/{id}` e **não** tem `GET /api/partners/{id}`.
 * Parece torto e não é: o `PartnerWriteRequest` é SUBCONJUNTO do `PartnerDto` da
 * listagem, então **a linha já traz todo campo gravável**. Quem faz o papel do
 * detalhe é a linha selecionada — buscar de novo por id seria pedir ao servidor
 * o que acabou de chegar.
 *
 * O preço está no que a linha não alcança: **link direto e recarga**. Sem row em
 * mãos não há o que editar, e a rota diz isso em vez de abrir formulário vazio.
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

/** Listagem de um papel. `fixa` carrega o `role` em toda consulta da tabela. */
export function parceirosDoPapel(role: PapelDeParceiro): ListProvider<PartnerDto> {
  return createApiListProvider<PartnerDto>({ url: URL_PARCEIROS, fixa: { role } })
}

/**
 * Entrada do registry: listagem do servidor + `empty` local.
 *
 * Sem `get` — ver acima. O `empty` continua sendo o registro em branco do mock
 * da tela (`clienteVazio`, `fornecedorVazio`, `profissionalVazio`), porque
 * "Incluir" não depende do servidor: abre formulário vazio e o `Gravar` já era
 * inerte antes desta troca (não há escrita no contrato).
 */
export interface ParceiroProvider<T> extends ListProvider<PartnerDto> {
  empty(id: number): T
}

export function parceiros<T>(role: PapelDeParceiro, empty: (id: number) => T): ParceiroProvider<T> {
  return { ...parceirosDoPapel(role), empty }
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
  const { data, error, response } = await updatePartner({ path: { id }, body: corpo })

  if (error || !data) {
    throw new ErroDaApi(
      `Falha ao gravar o parceiro ${id}.`,
      response?.status ?? 0,
      detalheDoProblema(error),
    )
  }
  return data
}
