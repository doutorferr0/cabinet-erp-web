import { parceiros } from '@/data/parceiros-api'
import { produtosApi } from '@/data/produtos-api'
import {
  type ListProvider,
  type ResourceProvider,
  createMockListProvider,
  createMockProvider,
  normalize,
} from '@/data/provider'
import { type Cidade, cidades } from '@/mocks/cidades'
import { clienteVazio } from '@/mocks/clientes'
import { type Colaborador, colaboradorVazio, colaboradores } from '@/mocks/colaboradores'
import { fornecedorVazio } from '@/mocks/fornecedores'
import { type Orcamento, orcamentoVazio, orcamentos } from '@/mocks/orcamentos'
import { type OrdemCompra, ordemCompraVazia, ordensCompra } from '@/mocks/ordens-compra'
import { type PedidoCompra, pedidoCompraVazio, pedidosCompra } from '@/mocks/pedidos-compra'
import { profissionalVazio } from '@/mocks/profissionais'

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
 * gostaria.** Produtos tem `list`/`get`/`empty` porque há detalhe por id;
 * parceiros tem `list`/`empty` porque NÃO há. Um `get` mock ao lado de uma
 * listagem real casaria uuid do servidor com id inventado e responderia
 * "não encontrado" para registro que existe.
 *
 * O predicado `matches` some na troca — quem passa a filtrar é o backend
 * (o `q` já viaja no `TableQueryState`).
 */
export const data = {
  /**
   * Os três PAPÉIS de `GET /api/partners` — mesma tabela no backend, filtro por
   * `role`. Listagem do servidor; `empty` continua local (o backend não fornece
   * registro em branco) e **não há `get`**: o contrato não publicou detalhe por
   * id, então a tela desabilita `Alterar`/`Consul.` em vez de abrir vazio.
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

  /** Tabela de apoio: só consulta, chave é `codigo` e não há "Incluir". */
  cidades: createMockListProvider<Cidade>({
    rows: cidades,
    matches: (c, q) => c.codigo.includes(q) || normalize(c.nome).includes(q),
    delayMs: 200,
  }),
} satisfies Record<string, ListProvider<unknown>>

/** Nome do recurso — útil para chaves de query e mensagens. */
export type ResourceName = keyof typeof data

export type { ListProvider, ResourceProvider }
