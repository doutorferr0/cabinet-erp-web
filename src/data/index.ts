import { documentoDoColaborador, listaDeColaboradores } from '@/data/colaboradores-api'
import { ordensDeCompraApi, pedidosDeCompraApi } from '@/data/compras-api'
import { funis } from '@/data/crm-api'
import { parceiros } from '@/data/parceiros-api'
import { pedidosDeVendaApi } from '@/data/pedidos-venda-api'
import { produtosApi } from '@/data/produtos-api'
import { type ListProvider, type ResourceProvider, tabelaDeApoio } from '@/data/provider'
import { orcamentosApi } from '@/data/quotes-api'
import { servicosApi } from '@/data/servicos-api'
import { bancos } from '@/mocks/bancos'
import { cidades } from '@/mocks/cidades'
import { clienteVazio } from '@/mocks/clientes'

import { fornecedorVazio } from '@/mocks/fornecedores'
import { profissionalVazio } from '@/mocks/profissionais'
import { transportadoras } from '@/mocks/transportadoras'

/**
 * REGISTRY DE PROVIDERS — a fronteira entre as telas e a origem dos dados.
 *
 * A troca mock → API acontece ENTRADA POR ENTRADA, conforme o backend publica o
 * recurso. Já são HTTP: `produtos` (`produtos-api.ts`) e os três papéis de
 * parceiro — `clientes`, `fornecedores`, `profissionais` (`parceiros-api.ts`).
 * O resto ainda monta provider sobre os arrays de `src/mocks/` — por falta de
 * endpoint, não por escolha.
 *
 * **A entrada tem a forma do que o contrato oferece, não a forma que a tela
 * gostaria.** Produtos e parceiros têm `list`/`get`/`empty` porque o contrato
 * publica detalhe por id nos dois. A regra é sobre a ORIGEM, não sobre o
 * conjunto de métodos: `get` mock ao lado de listagem real casaria uuid do
 * servidor com id inventado e responderia "não encontrado" para registro que
 * existe — por isso `get` só entra quando o caminho existe de verdade.
 *
 * O predicado `matches` some na troca — quem passa a filtrar é o backend
 * (o `q` já viaja no `TableQueryState`).
 */
export const data = {
  /**
   * Os três PAPÉIS de `GET /api/partners` — mesma tabela no backend, filtro por
   * `role`. Listagem e detalhe são do servidor (`GET /api/partners/{id}`, que
   * entrou no #35); `empty` continua local, porque o backend não fornece
   * registro em branco e "Incluir" não precisa esperar rede.
   */
  clientes: parceiros('customer', clienteVazio),

  fornecedores: parceiros('supplier', fornecedorVazio),

  /**
   * Colaborador — HTTP (`/api/employees`), o ÚLTIMO cadastro a sair do mock.
   *
   * A família inteira já atravessava para a rede desde a #276; o que faltava era
   * esta tela CONSUMI-LA, e enquanto faltou o sistema tinha duas listas de quem
   * trabalha aqui — o combo de responsável das atividades lia o Postgres e este
   * cadastro lia a semente. Ver `colaboradores-api.ts` para o que o contrato v1
   * ainda não cobre (o bloco de RH, e a ESCRITA, que responde 403 ao papel da
   * semente por decisão de permissão do api).
   *
   * Mesma divisão de `produtos` e `orcamentos`: a grade recebe o `EmployeeDto`
   * cru, para o `sortBy` casar com a whitelist do servidor, e o formulário
   * recebe a forma da transcrição §2.
   */
  colaboradores: { ...listaDeColaboradores, ...documentoDoColaborador },

  profissionais: parceiros('professional', profissionalVazio),

  /**
   * Do backend: `GET /api/products` e `GET /api/products/{id}`. As linhas da
   * listagem são o `ProductDto` cru e o detalhe vira `Produto` — ver
   * `produtos-api.ts` para o que o contrato v1 ainda não cobre.
   */
  produtos: produtosApi,

  /**
   * Ordem de compra — HTTP (`/api/purchase-orders`), com a fase C do G2.
   *
   * As 14 operações de compra estavam no contrato desde a web#316 e o MSW as
   * servia inteiras; o que faltava era a tela CONSUMI-LAS. Enquanto estas duas
   * entradas foram `createMockProvider` sobre `src/mocks/ordens-compra.ts`, o
   * documento que a tela abria não tinha campo do contrato nenhum — nem
   * fornecedor por id, nem rastro do pedido de origem, nem faturamento mínimo.
   *
   * Mesma divisão de `orcamentos` e `pedidosVenda`: a grade recebe o
   * `PurchaseOrderDto` cru, para o `sortBy` casar com a whitelist do servidor, e
   * o formulário recebe a forma da tela.
   */
  ordensCompra: ordensDeCompraApi,

  /**
   * Pedido de compra — HTTP (`/api/purchase-requests`).
   *
   * O fornecedor está na LINHA, não no cabeçalho: a busca por fornecedor viaja
   * como `filters` (`supplierId`) e recorta por linha, que é o que o contrato
   * publica. O `matches` local que existia aqui concatenava os nomes com " - "
   * e casava no texto — servia ao fixture e não teria como servir ao servidor.
   */
  pedidosCompra: pedidosDeCompraApi,

  /**
   * Orçamento — HTTP desde a #134 (`/api/quotes`).
   *
   * A LINHA e o DOCUMENTO são tipos diferentes de propósito: a grade recebe o
   * `QuoteDto` cru, para o `sortBy` casar com a whitelist do servidor, e o
   * formulário recebe a forma da transcrição. Mesma divisão de `produtos`.
   */
  orcamentos: orcamentosApi,

  /**
   * Pedido de venda — HTTP (`/api/orders`), a segunda entrada de documento a
   * sair do mock.
   *
   * Mesma divisão de `orcamentos`: a grade recebe o `OrderDto` cru, para o
   * `sortBy` casar com a whitelist do servidor, e o formulário recebe a forma
   * da tela. O backend serve SEIS das dez operações do contrato — concluir,
   * retorno de demonstração e a troca de profissional respondem 501, e por isso
   * a tela não as oferece.
   */
  pedidosVenda: pedidosDeVendaApi,

  /**
   * Cadastro de SERVIÇOS — HTTP (`GET /api/services`), só listagem.
   *
   * Entrada de LISTA e não de recurso: o contrato publica listagem e escrita, e
   * nenhum detalhe por id — o `ServiceDto` é plano, e a linha da listagem já é o
   * registro inteiro. Quem a consome hoje é a aba Serviços do orçamento, que
   * precisa escolher o que cobrar e congelar preço e percentual do eletricista
   * na linha do documento.
   */
  servicos: servicosApi,

  /**
   * Funil de venda (CRM). Listagem, detalhe e registro em branco são todos do
   * contrato — `GET /api/crm/pipelines` e `GET …/{id}` existem, e o `get`
   * devolve o funil COM as colunas, que é o que o formulário edita.
   *
   * As oportunidades NÃO entram aqui: o quadro do funil não é uma listagem
   * paginada, e a fronteira delas são os hooks de `crm-api.ts`. Entrada de
   * registry é para tela de cadastro com DataTable.
   */
  funis,

  /** Tabela de apoio: só consulta, chave é `codigo` e não há "Incluir". */
  cidades: tabelaDeApoio({ rows: cidades }),

  /**
   * Tabela de apoio: busca de `Nº do banco` em Dados Bancários (transcrição
   * §3). Código COMPE oficial — dado público, não é cadastro operado aqui.
   */
  bancos: tabelaDeApoio({ rows: bancos }),

  /**
   * Tabela de apoio, mesma fronteira de `cidades`: busca da Ordem de Compra
   * (transcrição §7.2), sem cadastro completo por falta de captura do menu
   * `Transportadoras` (§1, §10).
   */
  transportadoras: tabelaDeApoio({ rows: transportadoras }),
} satisfies Record<string, ListProvider<unknown>>

/** Nome do recurso — útil para chaves de query e mensagens. */
export type ResourceName = keyof typeof data

export type { ListProvider, ResourceProvider }
