import {
  type ListProvider,
  type ResourceProvider,
  createMockListProvider,
  createMockProvider,
  normalize,
} from '@/data/provider'
import { type Cidade, cidades } from '@/mocks/cidades'
import { type Cliente, clienteVazio, clientes } from '@/mocks/clientes'
import { type Colaborador, colaboradorVazio, colaboradores } from '@/mocks/colaboradores'
import { type Fornecedor, fornecedorVazio, fornecedores } from '@/mocks/fornecedores'
import { type Orcamento, orcamentoVazio, orcamentos } from '@/mocks/orcamentos'
import { type OrdemCompra, ordemCompraVazia, ordensCompra } from '@/mocks/ordens-compra'
import { type PedidoCompra, pedidoCompraVazio, pedidosCompra } from '@/mocks/pedidos-compra'
import { type Produto, produtoVazio, produtos } from '@/mocks/produtos'
import { type Profissional, profissionais, profissionalVazio } from '@/mocks/profissionais'

/**
 * REGISTRY DE PROVIDERS — a fronteira entre as telas e a origem dos dados.
 *
 * Fase mock: cada entrada monta um provider sobre os arrays de `src/mocks/`.
 * Integração: troca-se o corpo de cada entrada pelo cliente do codegen; a
 * assinatura (`list`/`get`/`empty`) e os tipos ficam iguais, então nenhuma
 * tela é tocada. É o único arquivo que precisa mudar.
 *
 * O predicado `matches` some na troca — quem passa a filtrar é o backend
 * (o `q` já viaja no `TableQueryState`).
 */
export const data = {
  clientes: createMockProvider<Cliente>({
    rows: clientes,
    matches: (c, q) => String(c.id).includes(q) || normalize(c.nome).includes(q),
    empty: clienteVazio,
  }),

  fornecedores: createMockProvider<Fornecedor>({
    rows: fornecedores,
    matches: (f, q) =>
      String(f.id).includes(q) ||
      normalize(f.razaoSocial).includes(q) ||
      normalize(f.nomeFantasia).includes(q),
    empty: fornecedorVazio,
  }),

  colaboradores: createMockProvider<Colaborador>({
    rows: colaboradores,
    matches: (c, q) => String(c.id).includes(q) || normalize(c.nome).includes(q),
    empty: colaboradorVazio,
  }),

  profissionais: createMockProvider<Profissional>({
    rows: profissionais,
    matches: (p, q) =>
      String(p.id).includes(q) ||
      normalize(p.nomeApresentacao).includes(q) ||
      normalize(p.nome).includes(q),
    empty: profissionalVazio,
  }),

  produtos: createMockProvider<Produto>({
    rows: produtos,
    matches: (p, q) =>
      normalize(p.nossoCodigo).includes(q) || normalize(p.nossaDescricao).includes(q),
    empty: produtoVazio,
  }),

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
