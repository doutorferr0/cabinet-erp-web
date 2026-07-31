import type { PartnerDto } from '@/api/gerado'
import { createApiListProvider } from '@/data/api-provider'
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
 * ## Sem detalhe por id
 *
 * O contrato NÃO tem `GET /api/partners/{id}` — só a listagem. Por isso este
 * arquivo não expõe `get`: a rota, o formato de "não encontrado" e o corpo do
 * detalhe seriam invenção. A consequência na tela está em `cadastroActions`
 * (`Alterar`/`Consul.` desabilitados com o motivo).
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
