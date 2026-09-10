import type { PartnerDto } from '@/api/gerado'
import type { ParDoCartao } from '@/components/cabinet/cartao-lateral'

/**
 * O cartão `Resumo` da lateral do cadastro de parceiro (D19, #487) — e ele
 * existe quase sempre VAZIO, de propósito.
 *
 * A especificação pede "em aberto, últimos registros". Isso é consultável de um
 * lado só: `/api/purchase-orders` e `/api/purchase-requests` filtram por
 * `supplierId`, então o FORNECEDOR responde. Do lado do cliente não há caminho —
 * `/api/quotes` e `/api/orders` publicam `q`, `filters`, `sortBy` e `page`, e
 * nenhum filtro por parceiro. Montar a pergunta com `q=<nome do cliente>`
 * casaria por texto livre: dois clientes de nome parecido cairiam na mesma
 * conta, e a conta apareceria ao lado de dado do servidor com a mesma cara.
 *
 * ## Por que não preencher com campo do cadastro
 *
 * A saída fácil seria pôr categoria, condição de pagamento e indicado-por na
 * lateral. **Os três já estão nos módulos da ficha**, dois cliques à direita —
 * repeti-los na coluna de apoio daria duas fontes para a mesma pergunta e
 * gastaria a coluna que existe para dizer o que a ficha NÃO diz. Cartão vazio é
 * melhor que cartão redundante: sem pares, ele não monta.
 *
 * O que entra, portanto, é só o que vem de FORA do registro — hoje, os pedidos
 * de compra em aberto do fornecedor, que a rota dele consulta e passa em
 * `extra`. Cliente, profissional e colaborador ficam sem o cartão até o
 * contrato publicar por onde perguntar.
 */
export function resumoDoParceiro(extra: readonly ParDoCartao[] = []): ParDoCartao[] {
  return [...extra]
}

/**
 * OS PAPÉIS do parceiro, na linha de meta do cabeçalho.
 *
 * É o que existe de procedência: o `PartnerDto` não tem `createdAt` nem autor,
 * e "criado em … por …" seria a primeira frase inventada da ficha. O papel, em
 * compensação, muda a leitura do registro — o mesmo cadastro aberto pela tela
 * de clientes pode ser também fornecedor, e quem não vê isso duplica a pessoa.
 */
export function papeisDoParceiro(dto: PartnerDto | null | undefined): string | undefined {
  if (!dto) return undefined
  const papeis = [
    dto.isCustomer ? 'cliente' : null,
    dto.isSupplier ? 'fornecedor' : null,
    dto.isProfessional ? 'profissional' : null,
  ].filter((p): p is string => p !== null)
  if (papeis.length === 0) return undefined
  return papeis.length === 1 ? `Papel: ${papeis[0]}` : `Papéis: ${papeis.join(' · ')}`
}
