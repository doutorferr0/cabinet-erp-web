import type {
  CancelDocumentRequest,
  QuoteDetailDto,
  QuoteDto,
  QuoteEnvironmentDto,
  QuoteItemDto,
  QuoteServiceItemDto,
  QuoteServiceItemWriteRequest,
  QuoteWriteRequest,
} from '@/api/gerado'
import { nomeDeApoio } from '@/mocks/lookups'
import { type Orcamento, orcamentos } from '@/mocks/orcamentos'
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
import { servicoDoCadastro } from './servicos'
import { store } from './store'

/**
 * O "backend" do ORÇAMENTO no modo mock (`/api/quotes`).
 *
 * `/api/quotes` está em `contracts/openapi-v1.json` desde 2026-08-11 e **nenhum
 * handler o servia**: a tela continuava lendo o array de `src/mocks/orcamentos`,
 * com id numérico. Enquanto isso durou, o orçamento e o CRM viviam em mundos
 * diferentes — e a issue #89 (conversão oportunidade→orçamento) travou nisso,
 * porque `crm_opportunities.quote_id` referencia um id que só o servidor
 * atribui.
 *
 * Arquivo próprio, e não mais um bloco em `handlers.ts`, pela mesma razão que
 * `crm.ts` nasceu separado: estado próprio, e arquivo novo não disputa linha com
 * quem estiver editando o vizinho.
 *
 * ## O seed continua sendo o da transcrição
 *
 * As 17 linhas literais da §8.1 (`src/mocks/orcamentos.ts`) seguem sendo a
 * origem: o site demo não pode perder conteúdo por causa de uma troca de
 * transporte. O que mudou é quem as serve.
 *
 * ## O que este mock reproduz de propósito
 *
 * - **`number` é do SERVIDOR.** `QuoteWriteRequest` não tem o campo, e a criação
 *   atribui o próximo da sequência. Cliente que escolhe número colide entre
 *   empresas — está escrito no próprio contrato.
 * - **`totalCents` é calculado**, nunca recebido: total que o cliente manda é
 *   total que diverge do item na primeira arredondada.
 * - **`PUT` substitui o documento inteiro**, itens e ambientes junto.
 * - **`status` não muda por `PUT`** — só por `POST …/cancel`.
 */

/** Whitelist de `sortBy` — a MESMA da descrição do contrato. */
export const ORDENAVEIS = [
  'number',
  'issuedAt',
  'expiresAt',
  'customerName',
  'projectName',
  'workName',
]

/**
 * A whitelist do `filters`, que é a MESMA do `sortBy` neste recurso — e o mock
 * simplesmente não aplicava o parâmetro.
 *
 * Ignorar filtro em silêncio é o defeito que este repo persegue em todo lugar: a
 * tela desenha a condição no painel, o mock devolve a lista inteira, e quem lê
 * conclui que o filtro não estreita nada. Contra o `:3000` o mesmo pedido
 * recorta — então o sintoma só existe onde não há servidor, que é o site
 * público.
 *
 * O TIPO de cada campo é do servidor, não da tela: `issuedAt`/`expiresAt` são
 * data (comparação por DIA), o resto é texto.
 *
 * `workId` entra aqui e NÃO no `sortBy`: é como a tela pergunta "os documentos
 * desta obra", e uuid não põe nada em ordem para quem lê. `text` e não um tipo
 * de id porque o vocabulário de filtro não tem um — o que a tela manda é
 * igualdade sobre a chave, e é isso que `text` compara.
 */
export const FILTRAVEIS: CamposFiltraveis = {
  number: 'text',
  customerName: 'text',
  projectName: 'text',
  issuedAt: 'date',
  expiresAt: 'date',
  workId: 'text',
  workName: 'text',
}

/**
 * O orçamento GUARDADO. É o `Orcamento` do seed: o mock guarda o que a
 * transcrição capturou, e a tradução para o vocabulário do contrato acontece na
 * resposta — do mesmo jeito que os `*Name` do CRM são resolvidos na saída.
 */
/**
 * O orçamento como o MOCK o guarda — o `Orcamento` da tela mais o que o
 * contrato passou a pedir e a tela ainda não tem.
 *
 * Tipo local de propósito: `Orcamento` é a forma que `orcamento-form.tsx` monta
 * e valida, e acrescentar campo lá é mexer em tela. Aqui é estado de servidor
 * falso — o mesmo lugar onde `number` e `totalCents` já são do servidor.
 */
/**
 * O orçamento do SEED sem a aba Serviços — ver `OrcamentoGuardado`.
 *
 * O `Orcamento` de `src/mocks/orcamentos.ts` ganhou `servicos` quando a tela
 * passou a EDITAR a aba, e ali a coleção está na língua do formulário. Aqui ela
 * seria a segunda cópia da mesma coisa ao lado de `Estado.servicos`, que é o
 * DTO e é quem a resposta usa — duas coleções com o mesmo nome no mesmo módulo,
 * uma delas sempre vazia.
 */
type OrcamentoDoSeed = Omit<Orcamento, 'servicos'>

export interface OrcamentoGuardado extends OrcamentoDoSeed {
  /** `QuoteDetailDto.workId` — a OBRA (`Venda.Obr_codigo` do legado). */
  obraId: string | null
  /**
   * O CANCELAMENTO por extenso (G13) — quando, por quê e a nota.
   *
   * `cancelado` (booleano do seed) continua sendo o que decide o `status`; estes
   * três só existem quando ele é `true`. Guardar o motivo dentro do booleano
   * seria trocar dois estados por quatro sem nome.
   */
  canceladoEm: string | null
  motivoCancelamentoId: string | null
  notaCancelamento: string | null
}

interface Estado {
  linhas: OrcamentoGuardado[]
  /**
   * As linhas da ABA SERVIÇOS, por id de orçamento.
   *
   * Estado PRÓPRIO, e não um campo do `Orcamento` do seed: aquele array é a
   * transcrição literal da §8.2 e a aba Serviços não foi capturada (a transcrição
   * a lista entre as telas que ficaram de fora). Guardá-las aqui mantém o seed
   * intacto e deixa claro de onde a seção veio — do legado (`VendaServico`), não
   * da captura.
   *
   * Já é o DTO do contrato, e não um modelo de tela, porque não existe tela: o
   * que precisa ser fiel aqui é a resposta.
   */
  servicos: Record<string, QuoteServiceItemDto[]>
  proximoNumero: number
}

let estado: Estado = estadoInicial()

function estadoInicial(): Estado {
  // `obraId: null` nas 17 linhas da §8.1, e é a leitura correta da transcrição:
  // ela não capturou id de obra nenhum, e o `descricaoObra` de lá guarda o nome
  // do PROFISSIONAL (§8.1, observação). Casar essas linhas com `obra-0001` seria
  // inventar o elo justamente onde a fonte diz que ele não existe — e o elo
  // inventado apareceria na demo pública como dado do servidor.
  // `servicos` fica de fora na desestruturação: no seed ele é sempre `[]` (a
  // §8.1 não capturou a aba), e quem responde `serviceItems` é `Estado.servicos`.
  const linhas = orcamentos.map(({ servicos: _daTela, ...o }) => ({
    ...o,
    obraId: null,
    // As 17 linhas da §8.1 nascem SEM cancelamento e na revisão 1 — o seed é
    // transcrição, e ele não capturou nem motivo nem cadeia de revisão.
    canceladoEm: null,
    motivoCancelamentoId: null,
    notaCancelamento: null,
    revisao: 1,
    revisaoDeId: null,
    itens: o.itens.map((i) => ({ ...i })),
  }))
  const maior = linhas.reduce((max, o) => Math.max(max, Number(o.numero) || 0), 0)
  return { linhas, servicos: servicosDoSeed(linhas), proximoNumero: maior + 1 }
}

/**
 * A aba Serviços do PRIMEIRO orçamento do seed — e só dele.
 *
 * Um documento com serviço e os outros sem é o que torna as duas coisas
 * observáveis: que `serviceItems` vem SEMPRE (vazio quando não há), e que o
 * `totalCents` soma as DUAS coleções. Um seed em que todo orçamento tem serviço
 * esconderia a primeira; um sem nenhum, a segunda.
 *
 * `electricianPercent` aqui está CONGELADO, como na emissão: os 400000 (40%) da
 * instalação vieram do cadastro no dia em que a linha foi gravada, e mudar
 * `serv-0001` agora não os reescreve. É a mesma regra que já vale para
 * `description` e `unitPriceCents` do produto.
 */
function servicosDoSeed(linhas: OrcamentoDoSeed[]): Record<string, QuoteServiceItemDto[]> {
  const primeiro = linhas[0]
  if (!primeiro) return {}
  return {
    [primeiro.id]: [
      {
        lineNumber: 1,
        environmentCode: null,
        serviceId: 'serv-0001',
        description: 'INSTALAÇÃO DE LUMINÁRIA',
        quantity: 4,
        unitPriceCents: 12000,
        discountPercent: 0,
        electricianPercent: 400000,
        electricianAmountCents: 19200,
        totalCents: 48000,
      },
    ],
  }
}

/** As linhas de serviço de um orçamento — vazio quando ele não tem nenhuma. */
function servicosDe(id: string): QuoteServiceItemDto[] {
  return estado.servicos[id] ?? []
}

/**
 * O orçamento como os RELATÓRIOS precisam lê-lo — foto só-leitura.
 *
 * Tipo PRÓPRIO e estreito, e não o `OrcamentoGuardado` inteiro: `relatorios.ts`
 * precisa de cinco campos e das quantidades por variante, e exportar o estado
 * interno faria o mock de relatório enxergar (e um dia depender de) a forma que
 * a tela de orçamento monta. O que atravessa a fronteira é o que a pergunta
 * exige, com a quantidade JÁ convertida — a grade a captura como texto, e o
 * relatório que somasse `'1,5'` acharia que o cliente pediu quinze.
 */
export interface OrcamentoParaRelatorio {
  id: string
  /** `null` = documento sem emissão; relatório com período o descarta. */
  issuedAt: string | null
  cancelled: boolean
  salespersonId: string | null
  salespersonName: string | null
  professionalId: string | null
  professionalName: string | null
  items: { variantId: string | null; quantity: number }[]
}

/** A foto de AGORA, e não a do seed: relatório sobre o que foi gravado. */
export function orcamentosParaRelatorio(): readonly OrcamentoParaRelatorio[] {
  return estado.linhas.map((o) => ({
    id: o.id,
    issuedAt: o.dataEmissao,
    cancelled: o.cancelado,
    salespersonId: o.consultorId,
    salespersonName: o.consultor,
    professionalId: o.profissionalId,
    professionalName: o.profissionalExterno,
    items: o.itens.map((item) => ({
      // O seed da transcrição não capturou a ligação com o catálogo (§8.1), e é
      // por isso que orçamento × estoque sai vazio nele. O campo existe porque a
      // ESCRITA pode trazê-lo, e o relatório tem de saber lê-lo no dia em que
      // vier — hoje `itemDto` também o publica como `null`, do mesmo lugar.
      variantId: null,
      quantity: quantidadeDe(item.quantidade),
    })),
  }))
}

/** Volta ao seed entre testes — o par do `resetCrm`. */
export function resetQuotes(): void {
  estado = estadoInicial()
}

/** Desconto de 4 casas implícitas (10000 = 1%) aplicado sobre centavos. */
function comDesconto(centavos: number, percentual: number | null): number {
  if (!percentual) return centavos
  return Math.round(centavos * (1 - percentual / 1_000_000))
}

/**
 * Total do documento, em centavos.
 *
 * Quantidade vem como TEXTO da grade (a transcrição a captura assim, com até 3
 * casas) e é convertida aqui — no servidor de verdade ela é numérica, e o total
 * é dele. Desconto por PRODUTO usa o do item; desconto GERAL usa o do cabeçalho.
 */
function totalDoOrcamento(o: OrcamentoDoSeed): number {
  const brutoDeProdutos = o.itens.reduce((soma, item) => {
    const quantidade = quantidadeDe(item.quantidade)
    const unitario = item.valorUnitarioCentavos ?? 0
    const linha = Math.round(quantidade * unitario)
    return (
      soma + (o.modoDesconto === 'PRODUTO' ? comDesconto(linha, item.descontoPercentual) : linha)
    )
  }, 0)
  // A ABA SERVIÇOS ENTRA NO TOTAL. É o que o contrato diz ("o total do documento
  // é a soma das DUAS, calculada pelo servidor"), e é a única forma de o número
  // do rodapé bater com o que o cliente vai pagar: no legado, a instalação é
  // linha de `VendaServico` e some da conta se o total olhar só os produtos.
  const brutoDeServicos = servicosDe(o.id).reduce((soma, servico) => {
    return soma + (o.modoDesconto === 'PRODUTO' ? servico.totalCents : servicoSemDesconto(servico))
  }, 0)
  const brutoDoDocumento = brutoDeProdutos + brutoDeServicos
  return o.modoDesconto === 'GERAL'
    ? comDesconto(brutoDoDocumento, o.descontoPercentual)
    : brutoDoDocumento
}

/** O valor da linha de serviço ANTES do desconto dela — o que o modo GERAL soma. */
function servicoSemDesconto(servico: QuoteServiceItemDto): number {
  return Math.round(servico.quantity * servico.unitPriceCents)
}

/**
 * Nome da obra, RESOLVIDO — nunca guardado ao lado do id.
 *
 * É a mesma regra de `customerName` e de `parentName`: nome gravado é nome que
 * diverge do id na primeira alteração. E a busca é dentro da empresa ativa, pelo
 * mesmo motivo que a listagem de obras recorta: obra de outra empresa não existe
 * para quem pergunta, então id de fora resolve para `null`, não para o nome.
 */
function nomeDaObra(obraId: string | null): string | null {
  if (!obraId) return null
  const achada = obras.obras.find(
    (obra) => obra.id === obraId && obra.tenantId === store.activeTenantId,
  )
  return achada?.description ?? null
}

function resumoDto(o: OrcamentoGuardado): QuoteDto {
  return {
    id: o.id,
    number: o.numero,
    series: o.serie,
    issuedAt: o.dataEmissao,
    expiresAt: o.dataValidade,
    customerId: o.clienteId,
    customerName: o.cliente,
    projectName: o.descricaoObra,
    // O par `id`+`name` da OBRA. `projectName` continua ao lado e NÃO é o mesmo
    // dado: um é o texto digitado no documento, o outro é como a obra se chama
    // hoje. Sobrescrever um com o outro apagaria o que o operador escreveu.
    workId: o.obraId,
    workName: nomeDaObra(o.obraId),
    // Documento CANCELA, não desativa — `active`/`cancelled` é o enum do
    // contrato, espelhando `Ven_Situacao` (A/C) do legado. Data de FECHAMENTO
    // não é cancelamento: um orçamento fechado continua ativo.
    status: o.cancelado ? 'cancelled' : 'active',
    // A REVISÃO viaja na LISTA, e não só no detalhe: é ali que os dois
    // orçamentos do mesmo dia aparecem lado a lado, e é ali que "v2 do 1042"
    // deixa de parecer um segundo negócio.
    revision: o.revisao,
    revisionOfId: o.revisaoDeId,
    totalCents: totalDoOrcamento(o),
  }
}

function quantidadeDe(texto: string): number {
  // A grade captura quantidade como TEXTO (§8.2, até 3 casas, vírgula decimal);
  // o contrato a declara `number`. A conversão é da borda, e o zero de um campo
  // meio digitado é melhor que `NaN` viajando para o servidor.
  return Number(String(texto).replace(',', '.')) || 0
}

function itemDto(item: Orcamento['itens'][number], indice: number): QuoteItemDto {
  const quantidade = quantidadeDe(item.quantidade)
  const unitario = item.valorUnitarioCentavos ?? 0
  return {
    lineNumber: indice + 1,
    environmentCode: item.ambiente,
    // `variantId` é a ligação com o produto do catálogo, e o seed da transcrição
    // não a tem: a grade fala a língua do FORNECEDOR (§8.2). `null` é o
    // honesto — inventar um uuid casaria com produto que não existe.
    variantId: null,
    description: item.descricaoFornecedor,
    finish: item.acabamento,
    size: item.tamanho,
    quantity: quantidade,
    unit: item.unidade,
    // O contrato exige os dois inteiros: `null` na tela é "não preenchido", e
    // do lado do servidor isso é zero — não ausência de coluna.
    unitPriceCents: item.valorUnitarioCentavos ?? 0,
    discountPercent: item.descontoPercentual ?? 0,
    supplierId: null,
    supplierName: item.fornecedor,
    supplierCode: item.codigoFornecedor,
    supplierDescription: item.descricaoFornecedor,
    productGroup: item.grupoProduto,
    // A CHAVE do grupo, que o seed da transcrição não tem: §8.2 capturou o nome
    // ("PENDENTES"), e nome não é chave. `null` é o honesto — inventar um id de
    // `GRUPO_PRODUTO` casaria a linha com um grupo que lista nenhuma serve, e o
    // desconto por grupo iria para o lugar errado sem ninguém acusar.
    productGroupId: null,
    pieceType: item.tipoPeca,
    totalCents: Math.round(quantidade * unitario),
  }
}

function ambientesDto(o: OrcamentoDoSeed): QuoteEnvironmentDto[] {
  // Coleção PRÓPRIA do documento, não derivada dos itens. Derivar montava
  // `name: code` — o único nome disponível era o código — e o servidor de
  // verdade grava o que recebe: um `Gravar` sem edição substituía o nome
  // congelado do ambiente pelo uuid dele. O mock precisa errar (e acertar) do
  // mesmo jeito que o backend, senão a tela só descobre no dia da troca.
  return o.ambientes.map((a) => ({ code: a.codigo, name: a.nome, order: a.ordem }))
}

function detalheDto(o: OrcamentoGuardado): QuoteDetailDto {
  return {
    ...resumoDto(o),
    folderNumber: o.numeroPasta,
    closedAt: o.dataFechamento,
    cancelledAt: o.canceladoEm,
    cancelReasonId: o.motivoCancelamentoId,
    // Resolvido na LEITURA, como `workName`: o mock guarda o id e devolve o
    // rótulo de hoje. Guardar o nome junto congelaria o texto do dia do
    // cancelamento, que é decisão que ninguém tomou.
    cancelReasonName: nomeDeApoio(o.motivoCancelamentoId),
    cancelNote: o.notaCancelamento,
    // RESOLVIDO na leitura, como `workName` e `cancelReasonName` — e por isso
    // o `revisaoDeNumero` que `Orcamento` declara NÃO é lido daqui: o estado
    // guarda o elo (`revisaoDeId`), e o número é o do documento como ele está
    // agora. Guardar o número junto o congelaria no dia da revisão, e uma
    // renumeração deixaria a folha apontando para um documento que mudou de
    // nome.
    revisionOfNumber: estado.linhas.find((l) => l.id === o.revisaoDeId)?.numero ?? null,
    salespersonId: o.consultorId,
    salespersonName: o.consultor,
    professionalId: o.profissionalId,
    professionalName: o.profissionalExterno,
    discountMode: o.modoDesconto === 'GERAL' ? 'general' : 'product',
    discountPercent: o.descontoPercentual,
    // VAZIA, e não ausente: o contrato diz "nunca ausente por preguiça — ausente
    // e vazia leem igual na tela e diferente na conta". Vazia é a resposta certa
    // enquanto o mock não serve o modo `group` (ver `modoNaoServido`).
    groupDiscounts: [],
    environments: ambientesDto(o),
    items: o.itens.map(itemDto),
    // O bloco PAGAMENTO é ECOADO, nunca recebido: quem manda `paymentTermId`
    // recebe o plano de volta. O carimbo veio da gravação (ver `carimbarPagamento`).
    paymentTermId: o.condicaoPagamentoId,
    paymentTermName: o.condicaoPagamento,
    paymentInstallments: o.parcelas,
    // Ausente, e não `null`, no documento anterior ao bloco: carimbo que nunca
    // foi feito não se inventa com a política de hoje — seria reescrever a regra
    // sob a qual o documento foi assinado.
    ...(o.politicaDeParcelamento ? { installmentPolicy: o.politicaDeParcelamento } : {}),
    // Vem SEMPRE, vazia quando o documento não tem serviço — ausência e lista
    // vazia significariam a mesma coisa, e a opcional só criaria um `?? []` em
    // cada consumidor.
    serviceItems: servicosDe(o.id),
  }
}

/**
 * Resolve e CARIMBA o bloco Pagamento no documento já montado.
 *
 * Roda depois de `daEscrita` porque precisa do TOTAL, e o total é calculado dos
 * itens que acabaram de vir. Devolve o documento carimbado ou a resposta de
 * erro — 400, porque condição que não cabe na política é corpo que o servidor
 * não pode gravar, e aparar (parcelar menos, arredondar até o mínimo) daria um
 * documento com plano que ninguém pediu.
 */
function carimbarPagamento<T extends OrcamentoDoSeed>(
  o: T,
  tenantId: string,
): { orcamento: T } | { erro: ReturnType<typeof problemaJson> } {
  if (!o.condicaoPagamentoId) {
    return { orcamento: { ...o, condicaoPagamento: null, parcelas: [] } }
  }

  const condicao = condicaoAtiva(tenantId, o.condicaoPagamentoId)
  if (!condicao) {
    // 400 e não 404: o id veio no CORPO, e é o corpo que está errado. 404 aqui
    // falaria do orçamento, que existe.
    return {
      erro: problemaJson(400, 'Condição de pagamento não encontrada ou inativa nesta empresa.'),
    }
  }

  const plano = planoDoDocumento(tenantId, condicao, totalDoOrcamento(o), o.dataEmissao)
  if ('erro' in plano) return { erro: plano.erro }

  return {
    orcamento: {
      ...o,
      condicaoPagamento: condicao.name,
      parcelas: plano.parcelas,
      politicaDeParcelamento: politicaDaEmpresa(tenantId),
    },
  }
}

/**
 * A linha de serviço da escrita → a linha guardada, com o que o SERVIDOR
 * resolve.
 *
 * Duas coisas acontecem aqui e em lugar nenhum do cliente:
 *
 * 1. **A herança de `electricianPercent`.** `null` no corpo significa "use o
 *    que o cadastro diz", e é aqui que o cadastro é lido — uma vez, no momento
 *    da gravação. Depois disso o número está CONGELADO. `0` não é `null`: zero
 *    é "esta linha não paga instalador", e distinguir os dois é a razão de o
 *    campo ser nulável na escrita e não-nulável na leitura.
 * 2. **`totalCents` e `electricianAmountCents`.** O segundo vira PAGAMENTO
 *    (`acerto_eletrecistas_servicos` no legado); recalculá-lo no cliente daria
 *    um arredondamento por cliente sobre uma linha que alguém recebe.
 *
 * Serviço que não é da empresa ativa não é encontrado, e a linha cai no `0` —
 * o mesmo desfecho de `serviceId: null`, que o contrato permite (descrição
 * avulsa). Recusar seria inventar um 404 que o contrato não declara para esta
 * operação.
 */
function servicoDaEscrita(
  linha: QuoteServiceItemWriteRequest,
  indice: number,
): QuoteServiceItemDto {
  const doCadastro = servicoDoCadastro(store.activeTenantId ?? '', linha.serviceId)
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

/** Corpo de escrita → a linha guardada. `id` e `numero` vêm de fora. */
function daEscrita(corpo: QuoteWriteRequest, base: OrcamentoGuardado): OrcamentoGuardado {
  return {
    ...base,
    obraId: corpo.workId ?? null,
    serie: corpo.series ?? '',
    numeroPasta: corpo.folderNumber ?? '',
    dataEmissao: corpo.issuedAt ?? null,
    dataValidade: corpo.expiresAt ?? null,
    dataFechamento: corpo.closedAt ?? null,
    // `status` NÃO vem da escrita: cancelar tem verbo próprio.
    cancelado: base.cancelado,
    clienteId: corpo.customerId,
    // O NOME é resolvido pelo servidor. Aqui não há tabela de parceiros que
    // case com o seed da transcrição, então o que já estava guardado se mantém
    // quando o cliente não muda — e some quando muda, que é o sintoma correto
    // de "o servidor ainda não resolveu este id".
    cliente: corpo.customerId === base.clienteId ? base.cliente : '',
    descricaoObra: corpo.projectName ?? '',
    consultorId: corpo.salespersonId ?? null,
    consultor: corpo.salespersonId === base.consultorId ? base.consultor : null,
    profissionalId: corpo.professionalId ?? null,
    profissionalExterno:
      corpo.professionalId === base.profissionalId ? base.profissionalExterno : null,
    modoDesconto: corpo.discountMode === 'general' ? 'GERAL' : 'PRODUTO',
    descontoPercentual: corpo.discountPercent,
    // Só o ID vem do corpo. Nome, parcelas e carimbo da política são do
    // servidor, e quem os resolve é `carimbarPagamento` — depois do total.
    condicaoPagamentoId: corpo.paymentTermId ?? null,
    // O corpo é INTEGRAL: o que ele não trouxer, o documento perde. Guardar os
    // ambientes que vieram — em vez de manter os de `base` — é o que faz o mock
    // reproduzir isso.
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
 * Duas recusas, e as duas em VOZ ALTA. Aceitar calado é o defeito que este repo
 * persegue: no site público não há `:3000` atrás para corrigir a impressão, e
 * um documento gravado com desconto que não é o pedido tem cara de dado.
 *
 * 1. **`workId` que a empresa ativa não alcança, ou que é de outro cliente.** A
 *    obra pertence ao cliente (`Obras.Cli_codigo`) e o documento não reescreve
 *    esse vínculo — é o 400 que o contrato descreve em `workId`.
 * 2. **`discountMode: 'group'`, que este mock ainda não serve.** O contrato o
 *    publica (`VendaDesconto`, 300.337 linhas no legado) e nem o backend nem o
 *    mock o implementam. A alternativa era o silêncio de hoje — o `?:` do
 *    `daEscrita` mapeia todo modo que não é `general` para `PRODUTO` —, e aí o
 *    documento volta com desconto por PRODUTO, número diferente do pedido e
 *    status 200. Recusar nomeando o campo é menor que gravar errado.
 */
function recusasDaEscrita(corpo: QuoteWriteRequest) {
  if (corpo.discountMode === 'group') {
    return camposInvalidos([
      {
        path: 'discountMode',
        message: 'Desconto por grupo ainda não é servido no modo mock.',
      },
    ])
  }

  const obraId = corpo.workId
  if (obraId) {
    const achada = obras.obras.find(
      (obra) => obra.id === obraId && obra.tenantId === store.activeTenantId,
    )
    if (!achada) {
      return camposInvalidos([{ path: 'workId', message: 'Obra não encontrada.' }])
    }
    if (achada.customerId !== corpo.customerId) {
      return camposInvalidos([{ path: 'workId', message: 'A obra é de outro cliente.' }])
    }
  }

  return null
}

/**
 * Cria o orçamento no estado do mock e devolve a linha GUARDADA.
 *
 * Exportada porque o CRM também cria orçamento — a conversão da oportunidade
 * (`POST /api/crm/opportunities/{id}/quote`) precisa do MESMO caminho: mesma
 * sequência de número, mesmo estado, mesma forma. Duas criações independentes
 * dariam dois orçamentos com o mesmo número no dia em que as duas rodassem.
 *
 * O NÚMERO é do servidor e a sequência é global do grupo — o contrato tira o
 * campo da escrita justamente para o cliente não o escolher.
 */
function aplicarServicos(id: string, corpo: QuoteWriteRequest): void {
  // AUSENTE É VAZIO, nunca "preserva o que estava". O `PUT` é integral, e a
  // regra vale para os serviços como já vale para `items` e `environments`.
  // Escrever `?? servicosDe(id)` aqui seria o mock ensinando à tela uma
  // semântica que o servidor não vai ter — e o defeito apareceria só no dia da
  // troca, como linha que reaparece depois de excluída.
  estado.servicos[id] = (corpo.serviceItems ?? []).map(servicoDaEscrita)
}

export function criarOrcamento(corpo: QuoteWriteRequest): OrcamentoGuardado {
  const numero = String(estado.proximoNumero)
  estado.proximoNumero += 1
  const novo = daEscrita(corpo, {
    ...vazio(),
    obraId: null,
    canceladoEm: null,
    motivoCancelamentoId: null,
    notaCancelamento: null,
    revisao: 1,
    revisaoDeId: null,
    id: `orc-${numero}`,
    numero,
  })
  aplicarServicos(novo.id, corpo)
  estado.linhas.unshift(novo)
  return novo
}

/** O DTO de detalhe de uma linha guardada — o CRM devolve o mesmo shape. */
export function detalheDoOrcamento(o: OrcamentoGuardado): QuoteDetailDto {
  return detalheDto(o)
}

/**
 * O orçamento GUARDADO, pelo id — a leitura de que a conversão precisa.
 *
 * Existe porque `POST /api/quotes/{id}/order` COPIA o documento (o contrato é
 * explícito: no legado era troca de `Ven_Tipo` no mesmo registro, aqui são dois
 * agregados), e quem monta o pedido é `pedidos.ts`. Devolver a linha viva, e
 * não uma cópia, é de propósito: o handler de lá só a LÊ, e clonar aqui
 * esconderia de quem chama que a cópia é responsabilidade dele.
 *
 * O par `servicosDoOrcamento` vem junto porque a aba Serviços é estado próprio
 * deste módulo (ver `Estado.servicos`) e a conversão leva as duas coleções.
 */
export function orcamentoPorId(id: string): OrcamentoGuardado | undefined {
  return estado.linhas.find((o) => o.id === id)
}

/** As linhas da aba Serviços de um orçamento — vazio quando não tem nenhuma. */
export function servicosDoOrcamento(id: string): QuoteServiceItemDto[] {
  return servicosDe(id)
}

export const handlersDeOrcamento = [
  http.get('*/api/quotes', ({ request }) => {
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
    if (sortBy && !ORDENAVEIS.includes(sortBy)) {
      return problemaJson(400, `sortBy inválido: ${sortBy}.`, {}, TIPO.ordenacaoInvalida)
    }

    let linhas = estado.linhas.map(resumoDto)
    if (q) {
      const alvo = q.toLowerCase()
      linhas = linhas.filter((o) =>
        [o.number, o.customerName, o.projectName].some((t) => t?.toLowerCase().includes(alvo)),
      )
    }
    const filtradas = aplicarFiltros(linhas, url, FILTRAVEIS)
    if (typeof filtradas === 'string') return problemaJson(400, filtradas, {}, TIPO.filtroInvalido)
    linhas = filtradas

    if (sortBy) {
      const chave = sortBy as keyof QuoteDto
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

  http.get('*/api/quotes/:id', ({ params }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const achado = estado.linhas.find((o) => o.id === String(params.id))
    if (!achado) return naoEncontrado('Orçamento não encontrado.')
    return HttpResponse.json(detalheDto(achado))
  }),

  http.post('*/api/quotes', async ({ request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('quotes')
    if (semPermissao) return semPermissao
    const corpo = (await request.json()) as QuoteWriteRequest
    if (!corpo.customerId) return problemaJson(400, 'Cliente é obrigatório.')
    const recusa = recusasDaEscrita(corpo)
    if (recusa) return recusa

    const criado = criarOrcamento(corpo)
    const carimbado = carimbarPagamento(criado, store.activeTenantId)
    if ('erro' in carimbado) {
      // O documento não fica gravado pela metade: sai da coleção antes do 400.
      // O NÚMERO, esse, fica consumido — e é o que uma sequência de verdade faz.
      // Devolvê-lo daria dois documentos com o mesmo número no dia em que duas
      // gravações falhassem em paralelo.
      estado.linhas = estado.linhas.filter((o) => o.id !== criado.id)
      // A aba Serviços sai junto: `criarOrcamento` já a gravou (o total precisa
      // dela para calcular as parcelas), e deixá-la aqui daria linha de serviço
      // pendurada num id que não é mais documento nenhum.
      delete estado.servicos[criado.id]
      return carimbado.erro
    }
    const indiceNovo = estado.linhas.findIndex((o) => o.id === criado.id)
    if (indiceNovo >= 0) estado.linhas[indiceNovo] = carimbado.orcamento

    return HttpResponse.json(detalheDto(carimbado.orcamento), { status: 201 })
  }),

  http.put('*/api/quotes/:id', async ({ params, request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('quotes')
    if (semPermissao) return semPermissao
    const indice = estado.linhas.findIndex((o) => o.id === String(params.id))
    if (indice < 0) return naoEncontrado('Orçamento não encontrado.')
    const corpo = (await request.json()) as QuoteWriteRequest
    if (!corpo.customerId) return problemaJson(400, 'Cliente é obrigatório.')
    const recusa = recusasDaEscrita(corpo)
    if (recusa) return recusa

    const anterior = estado.linhas[indice] as OrcamentoGuardado
    // A aba Serviços entra ANTES do carimbo: o total do documento a inclui, e é
    // do total que saem as parcelas. Como recusa não grava NADA, ela é desfeita
    // quando o carimbo recusa — senão o documento ficaria com serviço novo e
    // pagamento velho.
    const servicosAnteriores = servicosDe(anterior.id)
    aplicarServicos(anterior.id, corpo)
    const carimbado = carimbarPagamento(daEscrita(corpo, anterior), store.activeTenantId)
    if ('erro' in carimbado) {
      estado.servicos[anterior.id] = servicosAnteriores
      return carimbado.erro
    }
    estado.linhas[indice] = carimbado.orcamento
    return HttpResponse.json(detalheDto(carimbado.orcamento))
  }),

  http.post('*/api/quotes/:id/cancel', async ({ params, request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('quotes')
    if (semPermissao) return semPermissao
    const achado = estado.linhas.find((o) => o.id === String(params.id))
    if (!achado) return naoEncontrado('Orçamento não encontrado.')
    // **Cancelar duas vezes é 409**, e o mock passou a dizê-lo com o G13: o
    // contrato sempre exigiu isso e o handler carimbava `cancelado = true` de
    // novo, em silêncio. Repetição que responde 200 ensina a tela a oferecer
    // Cancelar num documento cancelado — e agora o motivo do segundo pedido
    // sobrescreveria o do primeiro, que é o dado que se queria guardar.
    if (achado.cancelado) return jaCancelado()
    // O corpo é OPCIONAL (contrato): quem cancela sem motivo continua valendo,
    // e `request.json()` de corpo vazio ESTOURA — daí o `catch`.
    const corpo = (await request.json().catch(() => null)) as CancelDocumentRequest | null
    const erros = recusasDoCancelamento(corpo)
    if (erros.length > 0) return camposInvalidos(erros)
    // Cancelar é verbo PRÓPRIO, e não um `PUT` com `status` dentro: mudar
    // situação por substituição do documento deixaria o cliente escolher o
    // estado de um fluxo que é do servidor.
    achado.cancelado = true
    achado.canceladoEm = new Date().toISOString()
    achado.motivoCancelamentoId = corpo?.reasonId ?? null
    achado.notaCancelamento = corpo?.note ?? null
    return HttpResponse.json(detalheDto(achado))
  }),

  http.post('*/api/quotes/:id/revise', ({ params }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('quotes')
    if (semPermissao) return semPermissao
    const id = String(params.id)
    const original = estado.linhas.find((o) => o.id === id)
    if (!original) return naoEncontrado('Orçamento não encontrado.')
    // Revisar o que foi retirado da mesa é ressuscitar por outro nome.
    if (original.cancelado) {
      return problemaJson(409, 'Orçamento cancelado não se revisa.', {}, TIPO.transicaoInvalida)
    }
    // **A segunda revisão sai da PRIMEIRA.** Deixar duas revisões nascerem do
    // mesmo pai faria a cadeia virar árvore, e "qual é a versão vigente" ficaria
    // sem resposta — que é exatamente o problema dos dois orçamentos do mesmo
    // dia que a revisão veio resolver.
    if (estado.linhas.some((o) => o.revisaoDeId === id)) {
      return problemaJson(
        409,
        'Este orçamento já tem revisão. Revise a mais recente.',
        {},
        TIPO.orcamentoJaRevisado,
      )
    }
    const numero = String(estado.proximoNumero)
    estado.proximoNumero += 1
    const revisao: OrcamentoGuardado = {
      ...original,
      id: `orc-${numero}`,
      numero,
      revisao: original.revisao + 1,
      revisaoDeId: original.id,
      // A cópia é PROFUNDA nas coleções: compartilhar o array faria editar a
      // revisão mudar o documento que o cliente já viu — o oposto do ponto.
      ambientes: original.ambientes.map((a) => ({ ...a })),
      itens: original.itens.map((i) => ({ ...i })),
      parcelas: original.parcelas.map((p) => ({ ...p })),
    }
    estado.servicos[revisao.id] = servicosDe(original.id).map((s) => ({ ...s }))
    estado.linhas.unshift(revisao)
    return HttpResponse.json(detalheDto(revisao), { status: 201 })
  }),
]

/** 409 de documento já cancelado — o mesmo texto nos dois documentos. */
function jaCancelado() {
  return problemaJson(409, 'Documento já está cancelado.', {}, TIPO.transicaoInvalida)
}

/**
 * As recusas do corpo de cancelamento — 400 com o campo NOMEADO.
 *
 * **O motivo é conferido pelo KIND, não só pela existência.** `nomeDeApoio`
 * resolve qualquer id de apoio, então `lk-MARCA-1` voltaria 'EVOLED' e o
 * cancelamento sairia motivado por uma marca de luminária. É o defeito da
 * api#72 (escrita aceita lookup do kind errado) visto do lado do mock.
 */
function recusasDoCancelamento(corpo: CancelDocumentRequest | null) {
  const erros: { path: string; message: string }[] = []
  const motivo = corpo?.reasonId
  if (motivo && !/^lk-MOTIVO_CANCELAMENTO-\d+$/.test(motivo)) {
    erros.push({ path: 'reasonId', message: 'Motivo de cancelamento não encontrado.' })
  } else if (motivo && !nomeDeApoio(motivo)) {
    erros.push({ path: 'reasonId', message: 'Motivo de cancelamento não encontrado.' })
  }
  if ((corpo?.note?.length ?? 0) > 200) {
    erros.push({ path: 'note', message: 'A observação tem no máximo 200 caracteres.' })
  }
  return erros
}

function vazio(): OrcamentoDoSeed {
  return {
    id: '',
    numero: '',
    serie: '1',
    numeroPasta: '',
    dataEmissao: null,
    dataValidade: null,
    dataFechamento: null,
    clienteId: '',
    cliente: '',
    descricaoObra: '',
    consultorId: null,
    consultor: null,
    profissionalId: null,
    profissionalExterno: null,
    cancelado: false,
    // O documento em branco é o original de si mesmo — a revisão só nasce
    // por `POST .../revise`, nunca de um `vazio()`.
    revisao: 1,
    revisaoDeId: null,
    revisaoDeNumero: null,
    modoDesconto: 'PRODUTO',
    descontoPercentual: 0,
    ambientes: [],
    itens: [],
    condicaoPagamentoId: null,
    condicaoPagamento: null,
    parcelas: [],
  }
}

// ------------------------------------------------- leitura para os agregados

/**
 * O orçamento REDUZIDO ao que a faixa de KPI pergunta (#479) — mesma razão que
 * `ordensParaAgregado` em `compras.ts`: quem serve a grade responde pelo
 * resumo, senão a faixa e a grade contam a mesma coisa de dois jeitos.
 *
 * `totalCents` sai daqui já somado pelo `totalDoOrcamento`, que é o mesmo que a
 * listagem usa — o total do orçamento não é a soma dos itens (desconto e
 * serviços entram por regra própria), e recalcular fora daqui erraria.
 */
export interface OrcamentoParaAgregado {
  dataEmissao: string | null
  dataValidade: string | null
  dataFechamento: string | null
  cancelado: boolean
  totalCents: number
}

export function orcamentosParaAgregado(): OrcamentoParaAgregado[] {
  return estado.linhas.map((o) => ({
    dataEmissao: o.dataEmissao,
    dataValidade: o.dataValidade,
    dataFechamento: o.dataFechamento,
    cancelado: o.cancelado,
    totalCents: totalDoOrcamento(o),
  }))
}
