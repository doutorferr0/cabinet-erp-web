import { funis } from '@/data/crm-api'
import { parceiros } from '@/data/parceiros-api'
import { produtosApi } from '@/data/produtos-api'
import {
  type ListProvider,
  type ResourceProvider,
  createMockProvider,
  normalize,
  tabelaDeApoio,
} from '@/data/provider'
import { bancos } from '@/mocks/bancos'
import { cidades } from '@/mocks/cidades'
import { clienteVazio } from '@/mocks/clientes'
import { type Colaborador, colaboradorVazio, colaboradores } from '@/mocks/colaboradores'
import { fornecedorVazio } from '@/mocks/fornecedores'
import { type Orcamento, orcamentoVazio, orcamentos } from '@/mocks/orcamentos'
import { type OrdemCompra, ordemCompraVazia, ordensCompra } from '@/mocks/ordens-compra'
import { type PedidoCompra, pedidoCompraVazio, pedidosCompra } from '@/mocks/pedidos-compra'
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

  colaboradores: createMockProvider<Colaborador>({
    rows: colaboradores,
    matches: (c, q) => String(c.id).includes(q) || normalize(c.nome).includes(q),
    empty: colaboradorVazio,
  }),

  profissionais: parceiros('professional', profissionalVazio),

  /**
   * Do backend: `GET /api/products` e `GET /api/products/{id}`. As linhas da
   * listagem são o `ProductDto` cru e o detalhe vira `Produto` — ver
   * `produtos-api.ts` para o que o contrato v1 ainda não cobre.
   */
  produtos: produtosApi,

  ordensCompra: createMockProvider<OrdemCompra>({
    rows: ordensCompra,
    matches: (o, q) => o.codigo.includes(q) || normalize(o.fornecedor).includes(q),
    empty: ordemCompraVazia,
  }),

  pedidosCompra: createMockProvider<PedidoCompra>({
    rows: pedidosCompra,
    matches: (p, q) =>
      p.codigo.includes(q) ||
      p.pedVenda.includes(q) ||
      normalize(p.fornecedores.join(' - ')).includes(q),
    empty: pedidoCompraVazio,
  }),

  orcamentos: createMockProvider<Orcamento>({
    rows: orcamentos,
    matches: (o, q) =>
      o.numero.includes(q) ||
      normalize(o.cliente).includes(q) ||
      normalize(o.descricaoObra).includes(q),
    empty: orcamentoVazio,
  }),

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
