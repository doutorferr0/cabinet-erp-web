import type { ServiceDto } from '@/api/gerado'
import { createApiListProvider } from '@/data/api-provider'
import type { ListProvider } from '@/data/provider'

/**
 * FRONTEIRA DO CADASTRO DE SERVIÇOS — `GET /api/services`.
 *
 * Existe para a ABA SERVIÇOS do documento poder escolher o que cobrar: a linha
 * do orçamento congela `description`, `unitPriceCents` e `electricianPercent`
 * na emissão (`QuoteServiceItemDto`), e os três saem daqui no momento em que o
 * operador escolhe o serviço.
 *
 * **Só `list`, e é o que o contrato oferece.** Não há `GET /api/services/{id}`:
 * o `ServiceDto` é plano, então a LINHA da listagem já é o registro inteiro —
 * um detalhe seria requisição para buscar o que a tela tem na mão. É a mesma
 * regra do registry que impede `get` mock ao lado de listagem de servidor.
 *
 * **Sem `filtraveis`:** `/api/services` não publica o parâmetro `filters`. A
 * busca é por texto (`q`) e ordenação pela whitelist do contrato
 * (`code`/`description`/`priceCents`/`active`) — filtro estruturado aqui sairia
 * como requisição que o servidor descarta.
 */
export const URL_SERVICOS = '/api/services'

export const servicosApi: ListProvider<ServiceDto> = createApiListProvider<ServiceDto>({
  url: URL_SERVICOS,
})
