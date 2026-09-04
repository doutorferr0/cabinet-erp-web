import type {
  CancelDocumentRequest,
  OrderDetailDto,
  OrderDto,
  OrderEnvironmentDto,
  OrderItemDto,
  OrderParticipantDto,
  OrderProfessionalAssignmentDto,
  OrderServiceItemDto,
  OrderServiceItemWriteRequest,
  OrderWriteRequest,
  TransferProfessionalRequest,
} from '@/api/gerado'
import { colaboradores, idDeColaborador } from '@/mocks/colaboradores'
import { idDeApoio, nomeDeApoio } from '@/mocks/lookups'
import type { AmbienteDoOrcamento, OrcamentoItem } from '@/mocks/orcamentos'
import { orcamentos } from '@/mocks/orcamentos'
import { http, HttpResponse } from 'msw'
import { type CamposFiltraveis, aplicarFiltros } from './filtro-do-servidor'
import { obras } from './obras'
import { condicaoAtiva, planoDoDocumento, politicaDaEmpresa } from './pagamento'
import { verificarEscrita } from './permissao'
import {
  TIPO,
  camposInvalidos,
  naoEncontrado,
  problemaJson,
  semEmpresaAtiva,
  semSessao,
} from './problema'
import { orcamentoPorId, servicosDoOrcamento } from './quotes'
import { servicoDoCadastro } from './servicos'
import { store } from './store'

/**
 * O "backend" do PEDIDO DE VENDA no modo mock (`/api/orders`).
 *
 * **A tela existia e o servidor falso não.** `src/features/vendas/` tem o
 * formulário, as ações do ciclo e a listagem desde a leva do G13; `/api/orders`
 * está no contrato com onze operações e o backend serve todas elas — e no modo
 * mock **nenhuma casava handler**. Medido operação a operação: as onze
 * respondiam à requisição com falha de rede, porque `/api` sem handler sai para
 * a origem e a SPA devolve `index.html` com status 200.
 *
 * A consequência tinha endereço: `cabinetonline.cc` roda 100% mock, e o item
 * `Vendas › Pedidos` do menu levava a uma tela que não carregava. Os testes da
 * tela passavam verdes porque montam servidor próprio (`instalarServidor`) e
 * nunca exercitam esta lista — é o padrão de "função sem chamador não está
 * medida", visto do outro lado: aqui o chamador existia e o SERVIDOR é que não.
 *
 * ## O que este mock reproduz de propósito
 *
 * - **`number` é do SERVIDOR** (`OrderWriteRequest` não tem o campo).
 * - **`totalCents` é calculado**, nunca recebido.
 * - **`PUT` substitui o documento inteiro** — e é 409 em documento encerrado,
 *   `cancelled` ou `concluded`, que é o que o contrato descreve.
 * - **`status` não muda por `PUT`**: cada transição tem verbo próprio.
 * - **`professionalId` não se move por `PUT`** — a troca tem data e trilha, e
 *   quem a faz é `POST .../professional`.
 * - **`salespersonId` é LEITURA do atendente `isPrincipal`** da participação.
 *
 * ## Por que o seed é uma CONVERSÃO do seed do orçamento
 *
 * O contrato diz que 99,8% dos pedidos nascem de orçamento, e o seed diz o
 * mesmo: cinco dos seis vêm das cinco primeiras linhas da §8.1, com `quoteId`
 * apontando para elas, e o sexto foi lançado direto — que o legado permite.
 * Inventar clientes novos aqui daria uma segunda base de nomes ao lado da
 * transcrição, e a procedência que a folha mostra (`OrigemDoPedido`) não teria
 * para onde apontar.
 *
 * Os SEIS cobrem os estados que a tela desenha, e cada um existe por um botão:
 * dois `active` (o caso comum), um `concluded` (o rodapé que diz "Pedido
 * concluído"), um `cancelled` com motivo (a coluna Situação e a leitura do
 * motivo), e uma demonstração com a peça ainda na rua (o `Registrar retorno`, e
 * o 409 `demonstracao-em-aberto` de quem tenta concluir antes). Um seed só de
 * `active` deixaria quatro caminhos da tela sem nada para exercitar.
 */

/** Whitelist de `sortBy` — a MESMA da descrição do contrato. */
export const ORDENAVEIS_PEDIDO = ['number', 'issuedAt', 'customerName', 'projectName', 'workName']

/**
 * A whitelist do `filters` — a do `sortBy` MAIS `workId`, `status` e `type`.
 *
 * `status` e `type` são de vocabulário FECHADO, e a variante `select` é o que
 * diz isso ao filtro: comparação por igualdade sobre a chave, não busca por
 * pedaço de texto. Declará-los `text` deixaria `contains: 'cancel'` casar
 * `cancelled` — um filtro que funciona por acidente e para de funcionar quando
 * o enum ganhar um valor parecido.
 *
 * `workId` entra aqui e NÃO no `sortBy`, pelo mesmo motivo do orçamento: uuid
 * não põe nada em ordem para quem lê, mas é COMO a tela pergunta "os documentos
 * desta obra".
 */
export const FILTRAVEIS_PEDIDO: CamposFiltraveis = {
  number: 'text',
  customerName: 'text',
  projectName: 'text',
  issuedAt: 'date',
  workId: 'text',
  workName: 'text',
  status: 'select',
  type: 'select',
}

/**
 * Whitelist do `sortBy` da TRILHA de indicação — uma só, e de propósito.
 *
 * A trilha é cronológica, e ordenar por nome de profissional esconderia a
 * sequência que é o ponto dela. É a mesma frase que o contrato usa, e a lista
 * fica exportada porque `src/data/whitelist-do-contrato.test.ts` a confere.
 */
export const ORDENAVEIS_INDICACAO = ['startedAt']

/**
 * Whitelist do `sortBy` da PARTICIPAÇÃO.
 *
 * Não se ordena por faixa: ela é linha de dentro da participação, e ordenar o
 * conjunto por um campo do filho é ordenar por qual dos N.
 */
export const ORDENAVEIS_PARTICIPACAO = ['personName', 'role', 'percent', 'isPrincipal']

/** Os dois vocabulários fechados, para recusar valor fora deles em voz alta. */
const SITUACOES = ['active', 'concluded', 'cancelled'] as const
const TIPOS = ['sale', 'demo'] as const

type Situacao = (typeof SITUACOES)[number]
type TipoDeDocumento = (typeof TIPOS)[number]

/**
 * O pedido como o MOCK o guarda.
 *
 * Tipo local, como o `OrcamentoGuardado` de `quotes.ts`: a forma que a tela
 * monta e valida é `PedidoDeVenda` (`src/data/pedidos-venda-api.ts`), e estado
 * de servidor falso não é modelo de tela. O item e o ambiente são reusados do
 * seed do orçamento porque são as MESMAS 13 colunas da §8.2 — no legado os dois
 * documentos são o mesmo registro físico.
 */
interface PedidoGuardado {
  id: string
  numero: string
  serie: string
  numeroPasta: string
  dataEmissao: string | null
  dataFechamento: string | null
  clienteId: string
  cliente: string
  descricaoObra: string
  obraId: string | null
  situacao: Situacao
  tipo: TipoDeDocumento
  prazoDemonstracao: string | null
  /** Carimbo de `POST .../demo-return`. Nulo = a peça ainda está fora. */
  retornoDemonstracao: string | null
  canceladoEm: string | null
  motivoCancelamentoId: string | null
  notaCancelamento: string | null
  /** O orçamento de origem. `null` no pedido lançado direto. */
  orcamentoOrigemId: string | null
  /**
   * O Profissional Externo do documento.
   *
   * Guardado no pedido, e não derivado da participação, porque é ele que a
   * transferência move: `POST .../professional` fecha a vigência corrente e
   * abre outra, e o documento passa a apontar para o novo. A participação
   * `professional` acompanha — as duas leituras vêm da mesma transferência,
   * como o contrato exige ("se as duas divergirem, a trilha mente").
   */
  profissionalId: string | null
  profissionalExterno: string | null
  modoDesconto: 'PRODUTO' | 'GERAL'
  descontoPercentual: number
  ambientes: AmbienteDoOrcamento[]
  itens: OrcamentoItem[]
  condicaoPagamentoId: string | null
  condicaoPagamento: string | null
  parcelas: OrderDetailDto['paymentInstallments']
  politicaDeParcelamento?: NonNullable<OrderDetailDto['installmentPolicy']>
}

interface Estado {
  linhas: PedidoGuardado[]
  /** As linhas da aba Serviços, por id de pedido — estado próprio, como no orçamento. */
  servicos: Record<string, OrderServiceItemDto[]>
  /**
   * A PARTICIPAÇÃO, por id de pedido — atendentes e profissionais do documento.
   *
   * Coleção própria e não campo do pedido, exatamente como o contrato a publica:
   * ela é sub-recurso (`GET /api/orders/{id}/participants`) porque tem vida
   * depois da emissão — é transferida, congela cadastro que muda depois, e é a
   * origem do que a apuração paga. Ler tudo junto no `GET` do documento faria a
   * tela de venda carregar dinheiro de comissão em toda abertura.
   */
  participantes: Record<string, OrderParticipantDto[]>
  /** A trilha da indicação, por id de pedido — da mais recente para a mais antiga. */
  historico: Record<string, OrderProfessionalAssignmentDto[]>
  proximoNumero: number
}

/**
 * A data que o seed usa como "hoje".
 *
 * FIXA, e não `new Date()`: o seed é o conteúdo do site público, e um prazo de
 * demonstração calculado a partir do relógio faria a mesma linha aparecer
 * vencida ou não conforme o dia em que alguém abre a página. Fixá-la deixa a
 * demonstração do seed SEMPRE com a peça na rua e o prazo vencido, que é o caso
 * que a tela existe para mostrar.
 */
const EMISSAO_DO_SEED = '2025-08-05'

/**
 * As seis linhas, e o que cada uma existe para exercitar.
 *
 * `orcamento` é o ÍNDICE no seed da §8.1 — não o id, para a lista não ter de
 * repetir o formato `orc-0001` que `src/mocks/orcamentos.ts` decide sozinho.
 * `null` é o pedido lançado direto.
 */
const SEED = [
  { numero: '21606', orcamento: 0, situacao: 'active', tipo: 'sale' },
  { numero: '21607', orcamento: 1, situacao: 'active', tipo: 'sale' },
  { numero: '21608', orcamento: 2, situacao: 'concluded', tipo: 'sale' },
  { numero: '21609', orcamento: 3, situacao: 'cancelled', tipo: 'sale' },
  { numero: '21610', orcamento: 4, situacao: 'active', tipo: 'demo' },
  { numero: '21611', orcamento: null, situacao: 'active', tipo: 'sale' },
] as const satisfies readonly {
  numero: string
  orcamento: number | null
  situacao: Situacao
  tipo: TipoDeDocumento
}[]

function estadoInicial(): Estado {
  const linhas: PedidoGuardado[] = SEED.map((linha) => {
    const origem = linha.orcamento === null ? null : orcamentos[linha.orcamento]
    const cancelado = linha.situacao === 'cancelled'
    const demonstracao = linha.tipo === 'demo'
    return {
      id: `ped-${linha.numero}`,
      numero: linha.numero,
      serie: '1',
      numeroPasta: '',
      dataEmissao: origem?.dataEmissao ?? EMISSAO_DO_SEED,
      // `closedAt` é a data do `FrmFecha_projeto`, e ela só existe no documento
      // que foi encerrado. Carimbá-la nos `active` diria que eles fecharam.
      dataFechamento: linha.situacao === 'concluded' ? EMISSAO_DO_SEED : null,
      clienteId: origem?.clienteId ?? 'cli-seed-0006',
      cliente: origem?.cliente ?? 'CONSUMIDOR',
      descricaoObra: origem?.descricaoObra ?? '',
      // `null` nas seis, e é a leitura correta da transcrição — a mesma que
      // `quotes.ts` já registra: a §8.1 não capturou id de obra nenhum, e casar
      // estas linhas com uma obra do outro mock inventaria o elo justamente
      // onde a fonte diz que ele não existe.
      obraId: null,
      situacao: linha.situacao,
      tipo: linha.tipo,
      // Prazo VENCIDO contra a emissão do seed: a demonstração pendente é o que
      // a consulta de pendências procura, e um prazo no futuro deixaria a linha
      // parecida com qualquer outra.
      prazoDemonstracao: demonstracao ? '2025-08-12' : null,
      retornoDemonstracao: null,
      canceladoEm: cancelado ? `${EMISSAO_DO_SEED}T12:00:00.000Z` : null,
      motivoCancelamentoId: cancelado ? idDeApoio('MOTIVO_CANCELAMENTO', 'PREÇO') : null,
      notaCancelamento: cancelado ? 'Cliente fechou com concorrente.' : null,
      orcamentoOrigemId: origem?.id ?? null,
      profissionalId: origem?.profissionalId ?? null,
      profissionalExterno: origem?.profissionalExterno ?? null,
      modoDesconto: 'PRODUTO',
      descontoPercentual: 0,
      ambientes: (origem?.ambientes ?? []).map((a) => ({ ...a })),
      itens: (origem?.itens ?? []).map((item) => ({ ...item })),
      condicaoPagamentoId: null,
      condicaoPagamento: null,
      parcelas: [],
    } satisfies PedidoGuardado
  })

  return {
    linhas,
    servicos: {},
    participantes: Object.fromEntries(linhas.map((p, i) => [p.id, participantesDoSeed(p, i)])),
    historico: Object.fromEntries(linhas.map((p) => [p.id, historicoDoSeed(p)])),
    // Conta a PARTIR do seed. O legado tem uma sequência só para os dois
    // documentos (`Ven_CodigoPre`, com o tipo numa letra ao lado), e o mock
    // guarda dois contadores porque guarda dois estados, que nascem e se
    // resetam separados. As duas faixas de seed são disjuntas — pedido em
    // 21606-21611, orçamento em 21638-21655 — e é o que impede os dois de
    // mostrarem o mesmo número na mesma tela.
    proximoNumero: 21612,
  }
}

let estado: Estado = estadoInicial()

/**
 * A participação semeada: um atendente principal em todo pedido, mais o
 * profissional quando o documento tem indicação.
 *
 * **É o seed que faz `salespersonId` ser leitura e não um segundo dado.** O
 * contrato diz que o `salespersonId` singular do documento passa a ser o
 * atendente `isPrincipal` desta lista; se o mock guardasse o consultor no
 * cabeçalho e a lista à parte, os dois divergiriam na primeira gravação e a
 * tela mostraria um nome no campo e outro na grade.
 *
 * O colaborador vem de `src/mocks/colaboradores.ts`, que é a MESMA lista que
 * `GET /api/employees` serve — as duas leituras da mesma pessoa precisam ter um
 * nome em comum, que foi o que a #276 acertou.
 *
 * `tiers` vazio: as faixas congeladas são cópia do PERFIL da pessoa
 * (`/api/employees/{id}/commission-tiers`), e nem o mock nem a tela servem esse
 * cadastro. Vazio é o honesto — faixa inventada aqui apareceria na tela como
 * percentual que alguém recebe.
 */
function participantesDoSeed(pedido: PedidoGuardado, indice: number): OrderParticipantDto[] {
  const colaborador = colaboradores[indice % colaboradores.length]
  const linhas: OrderParticipantDto[] = []
  if (colaborador) {
    linhas.push({
      id: `part-${pedido.numero}-atendente`,
      role: 'attendant',
      employeeId: idDeColaborador(colaborador.id),
      employeeName: colaborador.nome,
      partnerId: null,
      partnerName: null,
      personName: colaborador.nome,
      // 3% — o `Porcentagem` da linha, na escala de 4 casas do contrato.
      percent: 30000,
      isPrincipal: true,
      validFrom: null,
      tiers: [],
    })
  }
  if (pedido.profissionalId) {
    linhas.push({
      id: `part-${pedido.numero}-profissional`,
      role: 'professional',
      employeeId: null,
      employeeName: null,
      partnerId: pedido.profissionalId,
      partnerName: pedido.profissionalExterno,
      personName: pedido.profissionalExterno ?? '',
      percent: 50000,
      isPrincipal: true,
      validFrom: null,
      tiers: [],
    })
  }
  return linhas
}

/**
 * A trilha da indicação do seed — uma linha aberta, ou nenhuma.
 *
 * A linha com `endedAt` nulo é a CORRENTE, e é ela que casa com
 * `professionalId` do documento. Pedido sem indicação nasce com a trilha vazia:
 * inventar uma linha fechada diria que houve uma transferência que não houve.
 */
function historicoDoSeed(pedido: PedidoGuardado): OrderProfessionalAssignmentDto[] {
  if (!pedido.profissionalId) return []
  return [
    {
      id: `ind-${pedido.numero}-1`,
      professionalId: pedido.profissionalId,
      professionalName: pedido.profissionalExterno,
      startedAt: `${pedido.dataEmissao ?? EMISSAO_DO_SEED}T12:00:00.000Z`,
      endedAt: null,
      changedByEmployeeId: null,
      note: null,
    },
  ]
}

/** Volta ao seed entre testes — o par do `resetQuotes`. */
export function resetPedidos(): void {
  estado = estadoInicial()
}

/** As linhas de serviço de um pedido — vazio quando ele não tem nenhuma. */
function servicosDe(id: string): OrderServiceItemDto[] {
  return estado.servicos[id] ?? []
}

/** A participação de um pedido — vazia quando ninguém foi lançado. */
function participantesDe(id: string): OrderParticipantDto[] {
  return estado.participantes[id] ?? []
}

/**
 * O atendente PRINCIPAL do pedido — a origem de `salespersonId`.
 *
 * `undefined` quando não há nenhum, e o DTO responde `null` nos dois campos.
 * Documento sem atendente principal é caso legítimo (venda de balcão), e
 * escolher "o primeiro da lista" inventaria um responsável.
 */
function atendentePrincipal(id: string): OrderParticipantDto | undefined {
  return participantesDe(id).find((p) => p.role === 'attendant' && p.isPrincipal)
}

/** Desconto de 4 casas implícitas (10000 = 1%) aplicado sobre centavos. */
function comDesconto(centavos: number, percentual: number | null): number {
  if (!percentual) return centavos
  return Math.round(centavos * (1 - percentual / 1_000_000))
}

function quantidadeDe(texto: string): number {
  // A grade captura quantidade como TEXTO (§8.2, até 3 casas, vírgula decimal);
  // o contrato a declara `number`. A conversão é da borda, e o zero de um campo
  // meio digitado é melhor que `NaN` viajando para o servidor.
  return Number(String(texto).replace(',', '.')) || 0
}

/** O valor da linha de serviço ANTES do desconto dela — o que o modo GERAL soma. */
function servicoSemDesconto(servico: OrderServiceItemDto): number {
  return Math.round(servico.quantity * servico.unitPriceCents)
}

/**
 * Total do documento, em centavos — produtos MAIS serviços.
 *
 * A conta é a do orçamento, e é a mesma de propósito: os dois documentos somam
 * as duas coleções, e o número do rodapé só bate com o que o cliente paga se a
 * instalação entrar. Duplicar a fórmula aqui, em vez de importá-la, é o preço
 * de os dois módulos guardarem estados diferentes — o que ela lê (`itens`,
 * `servicos`, `modoDesconto`) é campo de estado, não de um tipo compartilhado.
 */
function totalDoPedido(p: PedidoGuardado): number {
  const brutoDeProdutos = p.itens.reduce((soma, item) => {
    const linha = Math.round(quantidadeDe(item.quantidade) * (item.valorUnitarioCentavos ?? 0))
    return (
      soma + (p.modoDesconto === 'PRODUTO' ? comDesconto(linha, item.descontoPercentual) : linha)
    )
  }, 0)
  const brutoDeServicos = servicosDe(p.id).reduce((soma, servico) => {
    return soma + (p.modoDesconto === 'PRODUTO' ? servico.totalCents : servicoSemDesconto(servico))
  }, 0)
  const bruto = brutoDeProdutos + brutoDeServicos
  return p.modoDesconto === 'GERAL' ? comDesconto(bruto, p.descontoPercentual) : bruto
}

/**
 * Nome da obra, RESOLVIDO — nunca guardado ao lado do id, e sempre dentro da
 * empresa ativa: obra de outra empresa não existe para quem pergunta.
 */
function nomeDaObra(obraId: string | null): string | null {
  if (!obraId) return null
  const achada = obras.obras.find(
    (obra) => obra.id === obraId && obra.tenantId === store.activeTenantId,
  )
  return achada?.description ?? null
}

/** O número do orçamento de origem, resolvido na LEITURA — não guardado. */
function numeroDoOrcamento(id: string | null): string | null {
  if (!id) return null
  return orcamentoPorId(id)?.numero ?? null
}

function resumoDto(p: PedidoGuardado): OrderDto {
  return {
    id: p.id,
    number: p.numero,
    series: p.serie,
    issuedAt: p.dataEmissao,
    customerId: p.clienteId,
    customerName: p.cliente,
    projectName: p.descricaoObra,
    workId: p.obraId,
    workName: nomeDaObra(p.obraId),
    status: p.situacao,
    type: p.tipo,
    demoDueDate: p.prazoDemonstracao,
    demoReturnedAt: p.retornoDemonstracao,
    totalCents: totalDoPedido(p),
    quoteId: p.orcamentoOrigemId,
  }
}

function itemDto(item: OrcamentoItem, indice: number): OrderItemDto {
  const quantidade = quantidadeDe(item.quantidade)
  return {
    lineNumber: indice + 1,
    environmentCode: item.ambiente,
    // A grade fala a língua do FORNECEDOR (§8.2) e não aponta para o catálogo.
    // `null` é o honesto — inventar um `variantId` casaria com produto que não
    // existe, e o kardex passaria a mover uma peça errada.
    variantId: null,
    description: item.descricaoFornecedor,
    finish: item.acabamento,
    size: item.tamanho,
    quantity: quantidade,
    unit: item.unidade,
    unitPriceCents: item.valorUnitarioCentavos ?? 0,
    discountPercent: item.descontoPercentual ?? 0,
    supplierId: null,
    supplierName: item.fornecedor,
    supplierCode: item.codigoFornecedor,
    supplierDescription: item.descricaoFornecedor,
    productGroup: item.grupoProduto,
    // §8.2 capturou o NOME do grupo ("PENDENTES"), e nome não é chave. `null`
    // em vez de um id inventado: o desconto por grupo iria para o lugar errado
    // sem ninguém acusar.
    productGroupId: null,
    pieceType: item.tipoPeca,
    totalCents: Math.round(quantidade * (item.valorUnitarioCentavos ?? 0)),
  }
}

function ambientesDto(p: PedidoGuardado): OrderEnvironmentDto[] {
  return p.ambientes.map((a) => ({
    code: a.codigo,
    name: a.nome,
    order: a.ordem,
    // A data de entrega POR AMBIENTE é do trilho da separação (G4) e este mock
    // não a grava. `null` é o que o documento tem — carimbar a emissão aqui
    // prometeria uma entrega agendada que ninguém agendou.
    scheduledDeliveryAt: null,
  }))
}

function detalheDto(p: PedidoGuardado): OrderDetailDto {
  const principal = atendentePrincipal(p.id)
  return {
    ...resumoDto(p),
    folderNumber: p.numeroPasta,
    closedAt: p.dataFechamento,
    cancelledAt: p.canceladoEm,
    cancelReasonId: p.motivoCancelamentoId,
    // Resolvido na LEITURA: o mock guarda o id e devolve o rótulo de hoje.
    cancelReasonName: nomeDeApoio(p.motivoCancelamentoId),
    cancelNote: p.notaCancelamento,
    // **LEITURA da participação, e não um campo guardado.** É o que o contrato
    // descreve em `OrderParticipantDto`: o `salespersonId` singular do documento
    // é o atendente `isPrincipal` da lista, "não um segundo lugar onde se
    // grava". Guardá-lo à parte daria dois donos ao mesmo dado, e eles
    // divergiriam na primeira transferência.
    salespersonId: principal?.employeeId ?? null,
    salespersonName: principal?.employeeName ?? null,
    professionalId: p.profissionalId,
    professionalName: p.profissionalExterno,
    discountMode: p.modoDesconto === 'GERAL' ? 'general' : 'product',
    discountPercent: p.descontoPercentual,
    // VAZIA, e não ausente: "ausente e vazia leem igual na tela e diferente na
    // conta". O modo `group` não é servido aqui (ver `recusasDaEscrita`).
    groupDiscounts: [],
    environments: ambientesDto(p),
    items: p.itens.map(itemDto),
    quoteNumber: numeroDoOrcamento(p.orcamentoOrigemId),
    paymentTermId: p.condicaoPagamentoId,
    paymentTermName: p.condicaoPagamento,
    paymentInstallments: p.parcelas,
    // Ausente, e não `null`, no documento sem carimbo: política que nunca foi
    // carimbada não se inventa com a regra de hoje.
    ...(p.politicaDeParcelamento ? { installmentPolicy: p.politicaDeParcelamento } : {}),
    serviceItems: servicosDe(p.id),
  }
}

/**
 * Resolve e CARIMBA o bloco Pagamento no documento já montado — o gêmeo do
 * `carimbarPagamento` do orçamento, e pela mesma razão: precisa do TOTAL, e o
 * total sai dos itens que acabaram de chegar.
 */
function carimbarPagamento(
  p: PedidoGuardado,
  tenantId: string,
): { pedido: PedidoGuardado } | { erro: ReturnType<typeof problemaJson> } {
  if (!p.condicaoPagamentoId) {
    return { pedido: { ...p, condicaoPagamento: null, parcelas: [] } }
  }
  const condicao = condicaoAtiva(tenantId, p.condicaoPagamentoId)
  if (!condicao) {
    // 400 e não 404: o id veio no CORPO, e é o corpo que está errado. 404 aqui
    // falaria do pedido, que existe.
    return {
      erro: problemaJson(400, 'Condição de pagamento não encontrada ou inativa nesta empresa.'),
    }
  }
  const plano = planoDoDocumento(tenantId, condicao, totalDoPedido(p), p.dataEmissao)
  if ('erro' in plano) return { erro: plano.erro }
  return {
    pedido: {
      ...p,
      condicaoPagamento: condicao.name,
      parcelas: plano.parcelas,
      politicaDeParcelamento: politicaDaEmpresa(tenantId),
    },
  }
}

/** A linha de serviço da escrita → a linha guardada, com o que o SERVIDOR resolve. */
function servicoDaEscrita(
  linha: OrderServiceItemWriteRequest,
  indice: number,
): OrderServiceItemDto {
  const doCadastro = servicoDoCadastro(store.activeTenantId ?? '', linha.serviceId)
  // `null` é "use o cadastro"; `0` é "esta linha não paga instalador". Os dois
  // significam coisas diferentes, e é por isso que o campo é nulável na escrita
  // e não-nulável na leitura.
  const percentual = linha.electricianPercent ?? doCadastro?.electricianPercent ?? 0
  const totalCents = comDesconto(
    Math.round((linha.quantity ?? 0) * (linha.unitPriceCents ?? 0)),
    linha.discountPercent ?? 0,
  )
  return {
    lineNumber: indice + 1,
    environmentCode: linha.environmentCode ?? null,
    serviceId: linha.serviceId ?? null,
    description: linha.description,
    quantity: linha.quantity ?? 0,
    unitPriceCents: linha.unitPriceCents ?? 0,
    discountPercent: linha.discountPercent ?? 0,
    electricianPercent: percentual,
    electricianAmountCents: Math.round((totalCents * percentual) / 1_000_000),
    totalCents,
  }
}

/**
 * Corpo de escrita → a linha guardada. `id`, `numero` e o ciclo vêm de fora.
 *
 * `criacao` separa os dois campos que só a CRIAÇÃO escreve — `type` e
 * `professionalId`. Não é conveniência: os dois são 409/imóveis no `PUT` por
 * razões diferentes (o tipo já moveu estoque; a indicação tem vigência e
 * trilha), e sem o sinalizador o `POST` herdaria a proibição do `PUT` e nenhum
 * pedido novo conseguiria nascer com profissional.
 */
function daEscrita(
  corpo: OrderWriteRequest,
  base: PedidoGuardado,
  criacao: { tipo: TipoDeDocumento } | null = null,
): PedidoGuardado {
  const tipo = criacao?.tipo ?? base.tipo
  return {
    ...base,
    serie: corpo.series ?? '',
    numeroPasta: corpo.folderNumber ?? '',
    dataEmissao: corpo.issuedAt ?? null,
    dataFechamento: corpo.closedAt ?? null,
    obraId: corpo.workId ?? null,
    clienteId: corpo.customerId,
    // O NOME é resolvido pelo servidor. Aqui não há tabela que case com o seed
    // da transcrição, então o que estava guardado se mantém quando o cliente
    // não muda — e some quando muda, que é o sintoma correto de "o servidor
    // ainda não resolveu este id".
    cliente: corpo.customerId === base.clienteId ? base.cliente : '',
    descricaoObra: corpo.projectName ?? '',
    // **`status` NUNCA vem da escrita**, e o `type` só na criação: trocar o
    // tipo depois do movimento deixaria saldo sem documento que o explique.
    tipo,
    situacao: base.situacao,
    prazoDemonstracao: tipo === 'demo' ? (corpo.demoDueDate ?? null) : null,
    // **`professionalId` não se move por `PUT`.** O contrato é explícito: a
    // troca tem data e trilha, e quem a faz é `POST .../professional`. Deixar o
    // corpo reescrevê-lo apagaria a vigência sem dizer, e a comissão passaria a
    // ser paga a quem não indicou. Na CRIAÇÃO ele entra — é ali que a primeira
    // vigência nasce, e não há vigência anterior para apagar.
    profissionalId: criacao ? (corpo.professionalId ?? null) : base.profissionalId,
    profissionalExterno: criacao
      ? (store.parceiros.find((p) => p.id === corpo.professionalId)?.legalName ?? null)
      : base.profissionalExterno,
    modoDesconto: corpo.discountMode === 'general' ? 'GERAL' : 'PRODUTO',
    descontoPercentual: corpo.discountPercent,
    // Só o ID vem do corpo; nome, parcelas e carimbo são do servidor.
    condicaoPagamentoId: corpo.paymentTermId ?? null,
    // O corpo é INTEGRAL: o que ele não trouxer, o documento perde.
    ambientes: (corpo.environments ?? []).map((a) => ({
      codigo: a.code,
      nome: a.name,
      ordem: a.order,
    })),
    itens: (corpo.items ?? []).map((item, i) => ({
      item: String(i + 1),
      codigoFornecedor: item.supplierCode ?? '',
      descricaoFornecedor: item.description ?? '',
      acabamento: item.finish ?? '',
      tamanho: item.size ?? '',
      quantidade: String(item.quantity ?? ''),
      unidade: item.unit ?? '',
      valorUnitarioCentavos: item.unitPriceCents ?? null,
      descontoPercentual: item.discountPercent ?? null,
      grupoProduto: item.productGroup ?? '',
      tipoPeca: item.pieceType ?? '',
      fornecedor: item.supplierName ?? '',
      ambiente: item.environmentCode ?? '',
    })),
  }
}

/**
 * O que a escrita recusa, além do cliente obrigatório — `null` quando passa.
 *
 * Todas em VOZ ALTA. No site público não há `:3000` atrás para corrigir a
 * impressão: documento gravado com o que o operador não pediu tem cara de dado.
 *
 * 1. **`discountMode: 'group'`**, que nem o backend nem este mock servem. O
 *    silêncio alternativo — mapear todo modo que não é `general` para
 *    `PRODUTO` — devolveria um documento com desconto por produto, valor
 *    diferente do pedido e status 200.
 * 2. **`workId` fora do alcance da empresa, ou de outro cliente.** A obra
 *    pertence ao cliente (`Obras.Cli_codigo`) e o documento não reescreve esse
 *    vínculo.
 * 3. **`demoDueDate` no pedido de VENDA, e a ausência dele na demonstração.**
 *    As duas são 400 no contrato, e a segunda é a que importa: sem prazo,
 *    "emprestado" e "perdido" são o mesmo registro.
 */
function recusasDaEscrita(corpo: OrderWriteRequest, tipo: TipoDeDocumento) {
  if (corpo.discountMode === 'group') {
    return camposInvalidos([
      { path: 'discountMode', message: 'Desconto por grupo ainda não é servido no modo mock.' },
    ])
  }

  const obraId = corpo.workId
  if (obraId) {
    const achada = obras.obras.find(
      (obra) => obra.id === obraId && obra.tenantId === store.activeTenantId,
    )
    if (!achada) return camposInvalidos([{ path: 'workId', message: 'Obra não encontrada.' }])
    if (achada.customerId !== corpo.customerId) {
      return camposInvalidos([{ path: 'workId', message: 'A obra é de outro cliente.' }])
    }
  }

  if (tipo === 'demo' && !corpo.demoDueDate) {
    return camposInvalidos([
      { path: 'demoDueDate', message: 'A demonstração exige prazo de retorno.' },
    ])
  }
  if (tipo === 'sale' && corpo.demoDueDate) {
    return camposInvalidos([
      { path: 'demoDueDate', message: 'Prazo de retorno só existe em demonstração.' },
    ])
  }

  return null
}

/**
 * 409 de documento ENCERRADO — a recusa que `PUT`, transferência e ciclo
 * compartilham.
 *
 * `cancelled` e `concluded` são os dois estados terminais, e a frase diz QUAL
 * deles é: "o documento está cancelado" e "o documento está concluído" levam a
 * ações diferentes de quem lê, e conflatá-las obrigaria a abrir a folha para
 * descobrir o que aconteceu.
 */
function documentoEncerrado(p: PedidoGuardado) {
  if (p.situacao === 'active') return null
  const comoEsta = p.situacao === 'cancelled' ? 'cancelado' : 'concluído'
  return problemaJson(
    409,
    `Pedido ${comoEsta} não aceita esta operação.`,
    {},
    TIPO.transicaoInvalida,
  )
}

/** O pedido da empresa ativa, ou o 404 — a abertura de todo handler por id. */
function pedidoPorId(id: string): PedidoGuardado | undefined {
  return estado.linhas.find((p) => p.id === id)
}

/** O nome do colaborador pelo id que `GET /api/employees` publica. */
function nomeDoColaborador(id: string | null): string | null {
  if (!id) return null
  return colaboradores.find((c) => idDeColaborador(c.id) === id)?.nome ?? null
}

/**
 * Cria o pedido no estado e devolve a linha guardada.
 *
 * O NÚMERO é do servidor, e é por isso que `OrderWriteRequest` não o tem: no
 * legado `Ven_CodigoPre` já é único entre as empresas, e cliente que escolhe
 * número colide entre elas.
 *
 * **`salespersonId` da escrita vira a PARTICIPAÇÃO, e não um campo do pedido.**
 * É aqui que a regra do contrato fecha o círculo: o campo continua publicado na
 * escrita (a criação precisa dizer quem atende), e a LEITURA sai da lista, do
 * atendente `isPrincipal`. Gravá-lo no cabeçalho ao lado da lista daria dois
 * donos ao mesmo dado — que é literalmente o que `OrderParticipantDto` proíbe.
 */
function criarPedido(
  base: Omit<PedidoGuardado, 'id' | 'numero'>,
  consultorId: string | null,
): PedidoGuardado {
  const numero = String(estado.proximoNumero)
  estado.proximoNumero += 1
  const novo: PedidoGuardado = { ...base, id: `ped-${numero}`, numero }
  estado.linhas.unshift(novo)
  estado.participantes[novo.id] = participacaoInicial(novo, consultorId)
  estado.historico[novo.id] = historicoDoSeed(novo)
  return novo
}

/**
 * A participação com que o documento NASCE — o atendente que a escrita nomeou
 * e o profissional que ela indicou, os dois principais.
 *
 * `percent: null` seria "use o perfil da pessoa", e o perfil é cadastro que
 * este mock não serve; zero é a leitura honesta: participação sem comissão
 * apurada é caso real (1.212 lançamentos de RT para 11.103 pedidos no legado), e
 * um percentual inventado aqui viraria dinheiro na apuração de alguém.
 */
function participacaoInicial(
  pedido: PedidoGuardado,
  consultorId: string | null,
): OrderParticipantDto[] {
  const linhas: OrderParticipantDto[] = []
  if (consultorId) {
    linhas.push({
      id: `part-${pedido.numero}-atendente`,
      role: 'attendant',
      employeeId: consultorId,
      employeeName: nomeDoColaborador(consultorId),
      partnerId: null,
      partnerName: null,
      personName: nomeDoColaborador(consultorId) ?? '',
      percent: 0,
      isPrincipal: true,
      validFrom: null,
      tiers: [],
    })
  }
  if (pedido.profissionalId) {
    linhas.push({
      id: `part-${pedido.numero}-profissional`,
      role: 'professional',
      employeeId: null,
      employeeName: null,
      partnerId: pedido.profissionalId,
      partnerName: pedido.profissionalExterno,
      personName: pedido.profissionalExterno ?? '',
      percent: 0,
      isPrincipal: true,
      validFrom: null,
      tiers: [],
    })
  }
  return linhas
}

/** O documento em branco, antes de a escrita preenchê-lo. */
function vazio(): Omit<PedidoGuardado, 'id' | 'numero'> {
  return {
    serie: '1',
    numeroPasta: '',
    dataEmissao: null,
    dataFechamento: null,
    clienteId: '',
    cliente: '',
    descricaoObra: '',
    obraId: null,
    situacao: 'active',
    tipo: 'sale',
    prazoDemonstracao: null,
    retornoDemonstracao: null,
    canceladoEm: null,
    motivoCancelamentoId: null,
    notaCancelamento: null,
    orcamentoOrigemId: null,
    profissionalId: null,
    profissionalExterno: null,
    modoDesconto: 'PRODUTO',
    descontoPercentual: 0,
    ambientes: [],
    itens: [],
    condicaoPagamentoId: null,
    condicaoPagamento: null,
    parcelas: [],
  }
}

/**
 * As recusas do corpo de cancelamento — 400 com o campo NOMEADO.
 *
 * O motivo é conferido pelo KIND, e não só pela existência: `nomeDeApoio`
 * resolve qualquer id de apoio, então `lk-MARCA-1` voltaria 'EVOLED' e o
 * cancelamento sairia motivado por uma marca de luminária.
 */
function recusasDoCancelamento(corpo: CancelDocumentRequest | null) {
  const erros: { path: string; message: string }[] = []
  const motivo = corpo?.reasonId
  if (motivo && (!/^lk-MOTIVO_CANCELAMENTO-\d+$/.test(motivo) || !nomeDeApoio(motivo))) {
    erros.push({ path: 'reasonId', message: 'Motivo de cancelamento não encontrado.' })
  }
  if ((corpo?.note?.length ?? 0) > 200) {
    erros.push({ path: 'note', message: 'A observação tem no máximo 200 caracteres.' })
  }
  return erros
}

export const handlersDePedidoDeVenda = [
  http.get('*/api/orders', ({ request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return HttpResponse.json({ rows: [], total: 0 })

    const url = new URL(request.url)
    const q = url.searchParams.get('q')
    const sortBy = url.searchParams.get('sortBy')
    const sortDesc = url.searchParams.get('sortDesc') === 'true'
    const page = Number(url.searchParams.get('page') ?? '1')
    const pageSize = Number(url.searchParams.get('pageSize') ?? '10')

    if (page < 1 || pageSize < 1 || pageSize > 100) {
      return problemaJson(
        400,
        'Paginação inválida: page é 1-based e pageSize vai até 100.',
        {},
        TIPO.paginacaoInvalida,
      )
    }
    if (sortBy && !ORDENAVEIS_PEDIDO.includes(sortBy)) {
      return problemaJson(400, `sortBy inválido: ${sortBy}.`, {}, TIPO.ordenacaoInvalida)
    }

    const recusaDeVocabulario = recusaDeEnum(url)
    if (recusaDeVocabulario) return recusaDeVocabulario

    let linhas = estado.linhas.map(resumoDto)
    if (q) {
      const alvo = q.toLowerCase()
      linhas = linhas.filter((p) =>
        [p.number, p.customerName, p.projectName].some((t) => t?.toLowerCase().includes(alvo)),
      )
    }
    const filtradas = aplicarFiltros(linhas, url, FILTRAVEIS_PEDIDO)
    if (typeof filtradas === 'string') return problemaJson(400, filtradas, {}, TIPO.filtroInvalido)
    linhas = filtradas

    if (sortBy) {
      const chave = sortBy as keyof OrderDto
      linhas.sort((a, b) => {
        const va = String(a[chave] ?? '')
        const vb = String(b[chave] ?? '')
        return sortDesc ? vb.localeCompare(va) : va.localeCompare(vb)
      })
    }

    const total = linhas.length
    const inicio = (page - 1) * pageSize
    return HttpResponse.json({ rows: linhas.slice(inicio, inicio + pageSize), total })
  }),

  http.get('*/api/orders/:id', ({ params }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const achado = pedidoPorId(String(params.id))
    if (!achado) return naoEncontrado('Pedido de venda não encontrado.')
    return HttpResponse.json(detalheDto(achado))
  }),

  http.post('*/api/orders', async ({ request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('orders')
    if (semPermissao) return semPermissao
    const corpo = (await request.json()) as OrderWriteRequest
    if (!corpo.customerId) return problemaJson(400, 'Cliente é obrigatório.')
    // O tipo só existe na CRIAÇÃO, e ausente é `sale` — está no contrato.
    const tipo: TipoDeDocumento = corpo.type === 'demo' ? 'demo' : 'sale'
    const recusa = recusasDaEscrita(corpo, tipo)
    if (recusa) return recusa

    const criado = criarPedido(
      daEscrita(corpo, { ...vazio(), id: '', numero: '' }, { tipo }),
      corpo.salespersonId ?? null,
    )
    estado.servicos[criado.id] = (corpo.serviceItems ?? []).map(servicoDaEscrita)

    const carimbado = carimbarPagamento(criado, store.activeTenantId)
    if ('erro' in carimbado) {
      // O documento não fica gravado pela metade: sai da coleção antes do 400.
      // O NÚMERO fica consumido — é o que uma sequência de verdade faz.
      estado.linhas = estado.linhas.filter((p) => p.id !== criado.id)
      delete estado.servicos[criado.id]
      delete estado.participantes[criado.id]
      delete estado.historico[criado.id]
      return carimbado.erro
    }
    const indice = estado.linhas.findIndex((p) => p.id === criado.id)
    if (indice >= 0) estado.linhas[indice] = carimbado.pedido

    return HttpResponse.json(detalheDto(carimbado.pedido), { status: 201 })
  }),

  http.put('*/api/orders/:id', async ({ params, request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('orders')
    if (semPermissao) return semPermissao
    const indice = estado.linhas.findIndex((p) => p.id === String(params.id))
    if (indice < 0) return naoEncontrado('Pedido de venda não encontrado.')
    const anterior = estado.linhas[indice] as PedidoGuardado
    // **Documento encerrado é 409, não 400.** O contrato o diz dos dois estados
    // e pela mesma razão: o documento fechado é o que foi combinado, e
    // reescrevê-lo muda o passado de quem já leu.
    const encerrado = documentoEncerrado(anterior)
    if (encerrado) return encerrado

    const corpo = (await request.json()) as OrderWriteRequest
    if (!corpo.customerId) return problemaJson(400, 'Cliente é obrigatório.')
    // **Trocar o tipo no `PUT` é 409**, e não um campo ignorado: demonstração e
    // venda movimentam estoque de formas diferentes.
    if (corpo.type && corpo.type !== anterior.tipo) {
      return problemaJson(
        409,
        'O tipo do documento não muda depois da criação.',
        {},
        TIPO.transicaoInvalida,
      )
    }
    const recusa = recusasDaEscrita(corpo, anterior.tipo)
    if (recusa) return recusa

    // A aba Serviços entra ANTES do carimbo (o total a inclui, e do total saem
    // as parcelas), e é desfeita quando o carimbo recusa: recusa não grava nada.
    const servicosAnteriores = servicosDe(anterior.id)
    estado.servicos[anterior.id] = (corpo.serviceItems ?? []).map(servicoDaEscrita)
    const carimbado = carimbarPagamento(daEscrita(corpo, anterior), store.activeTenantId)
    if ('erro' in carimbado) {
      estado.servicos[anterior.id] = servicosAnteriores
      return carimbado.erro
    }
    estado.linhas[indice] = carimbado.pedido
    return HttpResponse.json(detalheDto(carimbado.pedido))
  }),

  http.post('*/api/orders/:id/cancel', async ({ params, request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('orders')
    if (semPermissao) return semPermissao
    const achado = pedidoPorId(String(params.id))
    if (!achado) return naoEncontrado('Pedido de venda não encontrado.')
    // Cancelar duas vezes é 409: repetição que responde 200 ensina a tela a
    // oferecer Cancelar num documento cancelado, e o motivo do segundo pedido
    // sobrescreveria o do primeiro — o dado que se queria guardar.
    const encerrado = documentoEncerrado(achado)
    if (encerrado) return encerrado
    // O corpo é OPCIONAL (contrato): quem cancela sem motivo continua valendo, e
    // `request.json()` de corpo vazio ESTOURA — daí o `catch`.
    const corpo = (await request.json().catch(() => null)) as CancelDocumentRequest | null
    const erros = recusasDoCancelamento(corpo)
    if (erros.length > 0) return camposInvalidos(erros)

    achado.situacao = 'cancelled'
    achado.canceladoEm = new Date().toISOString()
    achado.motivoCancelamentoId = corpo?.reasonId ?? null
    achado.notaCancelamento = corpo?.note ?? null
    return HttpResponse.json(detalheDto(achado))
  }),

  http.post('*/api/orders/:id/conclude', ({ params }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('orders')
    if (semPermissao) return semPermissao
    const achado = pedidoPorId(String(params.id))
    if (!achado) return naoEncontrado('Pedido de venda não encontrado.')
    const encerrado = documentoEncerrado(achado)
    if (encerrado) return encerrado
    // **Demonstração com peça fora não conclui.** URN própria, e não a de
    // transição: as duas recusas levam a ações diferentes — esta tem saída
    // (registrar o retorno), e a outra não tem nenhuma.
    if (achado.tipo === 'demo' && !achado.retornoDemonstracao) {
      return problemaJson(
        409,
        'A peça da demonstração ainda não voltou.',
        {},
        TIPO.demonstracaoEmAberto,
      )
    }
    achado.situacao = 'concluded'
    // Carimba `closedAt` com a data de hoje QUANDO ELA ESTÁ NULA; a que o
    // operador digitou fica como está. Sobrescrever apagaria a data combinada.
    achado.dataFechamento ??= new Date().toISOString().slice(0, 10)
    return HttpResponse.json(detalheDto(achado))
  }),

  http.post('*/api/orders/:id/demo-return', ({ params }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('orders')
    if (semPermissao) return semPermissao
    const achado = pedidoPorId(String(params.id))
    if (!achado) return naoEncontrado('Pedido de venda não encontrado.')
    // Pedido de venda não tem o que devolver; cancelado já devolveu.
    if (achado.tipo !== 'demo') {
      return problemaJson(
        409,
        'Só demonstração tem retorno a registrar.',
        {},
        TIPO.transicaoInvalida,
      )
    }
    if (achado.situacao === 'cancelled') {
      return problemaJson(409, 'Pedido cancelado já devolveu a peça.', {}, TIPO.transicaoInvalida)
    }
    if (achado.retornoDemonstracao) {
      return problemaJson(409, 'O retorno já foi registrado.', {}, TIPO.transicaoInvalida)
    }
    // **Não mexe no ESTADO do documento**: demonstração que voltou pode virar
    // venda, e concluir é decisão de quem vendeu, não consequência de a peça
    // ter voltado.
    achado.retornoDemonstracao = new Date().toISOString()
    return HttpResponse.json(detalheDto(achado))
  }),

  http.post('*/api/orders/:id/professional', async ({ params, request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('orders')
    if (semPermissao) return semPermissao
    const achado = pedidoPorId(String(params.id))
    if (!achado) return naoEncontrado('Pedido de venda não encontrado.')
    // Documento encerrado não troca de dono.
    const encerrado = documentoEncerrado(achado)
    if (encerrado) return encerrado

    const corpo = (await request.json()) as TransferProfessionalRequest
    const novo = corpo.professionalId ?? null
    // **O "mesmo profissional" é conferido ANTES do papel**, e a ordem é
    // decisão: transferir para quem já está é pedido sem efeito, e o papel de
    // quem já está no documento não é assunto desta requisição. Conferir o papel
    // primeiro devolveria 400 (`sem papel`) para um documento cuja indicação
    // veio de antes — que é o caso do seed, onde o profissional é sintético — e
    // a tela leria "o parceiro não é profissional" sobre o parceiro que ela
    // acabou de mostrar no campo.
    if (novo === achado.profissionalId) {
      // Vigência de duração zero não é trilha, é ruído.
      return problemaJson(
        409,
        'O pedido já está com este profissional.',
        {},
        TIPO.transicaoInvalida,
      )
    }
    if (novo) {
      const parceiro = store.parceiros.find((p) => p.id === novo)
      // Parceiro sem o papel é 400 apontando o campo — a mesma recusa que a
      // grade de participação faz, e pelo mesmo motivo: quem não é profissional
      // não tem Reserva Técnica a receber.
      if (!parceiro?.isProfessional) {
        return camposInvalidos([
          { path: 'professionalId', message: 'O parceiro não tem o papel de profissional.' },
        ])
      }
    }

    const agora = new Date().toISOString()
    const trilha = estado.historico[achado.id] ?? []
    // Fecha a vigência CORRENTE e abre outra. A linha com `endedAt` nulo é a que
    // casa com `professionalId` do documento — se as duas divergirem, a trilha
    // mente, e é por isso que as duas mudam aqui e não em lugares separados.
    for (const linha of trilha) {
      if (!linha.endedAt) linha.endedAt = agora
    }
    const nome = novo ? (store.parceiros.find((p) => p.id === novo)?.legalName ?? null) : null
    trilha.unshift({
      id: `ind-${achado.numero}-${trilha.length + 1}`,
      professionalId: novo,
      professionalName: nome,
      startedAt: agora,
      endedAt: null,
      changedByEmployeeId: null,
      note: corpo.note ?? null,
    })
    estado.historico[achado.id] = trilha
    achado.profissionalId = novo
    achado.profissionalExterno = nome

    // A PARTICIPAÇÃO acompanha: o profissional principal do documento é o
    // `isPrincipal` do papel `professional`, e deixá-lo para trás faria a grade
    // pagar a Reserva Técnica a quem saiu.
    const participantes = participantesDe(achado.id).filter(
      (p) => !(p.role === 'professional' && p.isPrincipal),
    )
    if (novo) {
      participantes.push({
        id: `part-${achado.numero}-profissional-${trilha.length}`,
        role: 'professional',
        employeeId: null,
        employeeName: null,
        partnerId: novo,
        partnerName: nome,
        personName: nome ?? '',
        percent: 50000,
        isPrincipal: true,
        validFrom: agora.slice(0, 10),
        // Vazias: a cópia é do PERFIL da pessoa, e o mock não serve o cadastro
        // de faixas. Inventá-las aqui poria na tela um percentual que ninguém
        // cadastrou e que a apuração usaria.
        tiers: [],
      })
    }
    estado.participantes[achado.id] = participantes

    return HttpResponse.json(detalheDto(achado))
  }),

  http.get('*/api/orders/:id/professional-history', ({ params, request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const achado = pedidoPorId(String(params.id))
    if (!achado) return naoEncontrado('Pedido de venda não encontrado.')
    const sortBy = new URL(request.url).searchParams.get('sortBy')
    // Whitelist de UMA: a trilha é cronológica, e ordenar por nome esconderia a
    // sequência que é o ponto dela.
    if (sortBy && !ORDENAVEIS_INDICACAO.includes(sortBy)) {
      return problemaJson(400, `sortBy inválido: ${sortBy}.`, {}, TIPO.ordenacaoInvalida)
    }
    const linhas = estado.historico[achado.id] ?? []
    return HttpResponse.json({ rows: linhas, total: linhas.length })
  }),

  http.get('*/api/orders/:id/participants', ({ params, request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const achado = pedidoPorId(String(params.id))
    if (!achado) return naoEncontrado('Pedido de venda não encontrado.')
    const sortBy = new URL(request.url).searchParams.get('sortBy')
    if (sortBy && !ORDENAVEIS_PARTICIPACAO.includes(sortBy)) {
      return problemaJson(400, `sortBy inválido: ${sortBy}.`, {}, TIPO.ordenacaoInvalida)
    }
    const linhas = participantesDe(achado.id)
    return HttpResponse.json({ rows: linhas, total: linhas.length })
  }),

  http.post('*/api/quotes/:id/order', ({ params }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    // O papel exigido é o do ORÇAMENTO, e não o do pedido: a borda do backend
    // classifica por PREFIXO de caminho, e o prefixo aqui é `/api/quotes`.
    const semPermissao = verificarEscrita('quotes')
    if (semPermissao) return semPermissao
    const orcamentoId = String(params.id)
    const origem = orcamentoPorId(orcamentoId)
    if (!origem) return naoEncontrado('Orçamento não encontrado.')
    if (origem.cancelado) {
      return problemaJson(409, 'Orçamento cancelado não vira pedido.', {}, TIPO.transicaoInvalida)
    }
    // **Converter duas vezes é 409**, e a marca é o próprio pedido: nada muda no
    // orçamento, que fica intacto e rastreável. Pedido em duplicata é o erro que
    // o operador não vê até a compra sair dobrada.
    if (estado.linhas.some((p) => p.orcamentoOrigemId === orcamentoId)) {
      return problemaJson(409, 'Este orçamento já virou pedido.', {}, TIPO.pedidoJaConvertido)
    }

    // Converter é COPIAR, com o preço congelado no momento da conversão: no
    // legado era troca de `Ven_Tipo` no mesmo registro, aqui são dois agregados.
    // A cópia é PROFUNDA — compartilhar os arrays faria editar o pedido mudar o
    // orçamento que o cliente já assinou.
    const novo = criarPedido(
      {
        ...vazio(),
        serie: origem.serie,
        numeroPasta: origem.numeroPasta,
        dataEmissao: origem.dataEmissao,
        clienteId: origem.clienteId,
        cliente: origem.cliente,
        descricaoObra: origem.descricaoObra,
        obraId: origem.obraId,
        orcamentoOrigemId: origem.id,
        profissionalId: origem.profissionalId,
        profissionalExterno: origem.profissionalExterno,
        modoDesconto: origem.modoDesconto,
        descontoPercentual: origem.descontoPercentual,
        ambientes: origem.ambientes.map((a) => ({ ...a })),
        itens: origem.itens.map((i) => ({ ...i })),
        condicaoPagamentoId: origem.condicaoPagamentoId,
        condicaoPagamento: origem.condicaoPagamento,
        parcelas: origem.parcelas.map((p) => ({ ...p })),
        ...(origem.politicaDeParcelamento
          ? { politicaDeParcelamento: origem.politicaDeParcelamento }
          : {}),
      },
      // O consultor do ORÇAMENTO vira o atendente principal do pedido: é ele que
      // responde por `salespersonId`, e converter sem ele perderia o responsável
      // pela venda no meio da conversão.
      origem.consultorId,
    )
    estado.servicos[novo.id] = servicosDoOrcamento(origem.id).map((s) => ({ ...s }))
    return HttpResponse.json(detalheDto(novo), { status: 201 })
  }),
]

/**
 * `status` e `type` são vocabulário FECHADO: valor fora do enum é 400, e NÃO
 * lista vazia.
 *
 * É o que o contrato exige, e a razão está escrita nele: "filtro que não casa
 * nada e filtro que não existe são indistinguíveis para quem lê a tela". Sem
 * esta recusa, `status: 'cancelado'` (em português, que é o que o operador
 * diria) devolveria zero linhas com cara de resposta.
 *
 * Roda ANTES de `aplicarFiltros` porque o filtro genérico só conhece variantes,
 * não domínios — o vocabulário é deste recurso.
 */
function recusaDeEnum(url: URL) {
  const bruto = url.searchParams.get('filters')
  if (!bruto) return null
  let condicoes: unknown
  try {
    condicoes = JSON.parse(bruto)
  } catch {
    // JSON inválido é assunto de `aplicarFiltros`, que já o recusa com a frase
    // dele. Duplicar a recusa aqui daria dois textos para o mesmo defeito.
    return null
  }
  if (!Array.isArray(condicoes)) return null

  const DOMINIOS: Record<string, readonly string[]> = { status: SITUACOES, type: TIPOS }
  for (const condicao of condicoes as { field?: string; value?: unknown }[]) {
    const dominio = DOMINIOS[condicao?.field ?? '']
    if (!dominio) continue
    // `inArray` manda lista; `eq`/`ne` mandam um valor só. Os dois passam pela
    // mesma conferência — o que se recusa é o VALOR, não o operador.
    const valores = Array.isArray(condicao.value) ? condicao.value : [condicao.value]
    for (const valor of valores) {
      if (valor === '' || valor === null || valor === undefined) continue
      if (!dominio.includes(String(valor))) {
        return problemaJson(
          400,
          `Valor fora do vocabulário de ${condicao.field}: ${String(valor)}. Os valores são ${dominio.join(', ')}.`,
          {},
          TIPO.filtroInvalido,
        )
      }
    }
  }
  return null
}

// ------------------------------------------------- leitura para os agregados

/**
 * Pedidos de venda ABERTOS — o contador que a navegação mostra (#479).
 *
 * Contagem, e não o documento: a nav não publica valor nenhum, e devolver a
 * lista daqui convidaria o próximo a somar dinheiro no badge. `active` é a
 * única situação aberta; `concluded` e `cancelled` saíram da fila.
 */
export function pedidosAbertos(): number {
  return estado.linhas.filter((p) => p.situacao === 'active').length
}
