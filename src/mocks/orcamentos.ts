/**
 * Mock de orçamentos — campos LITERAIS da transcrição §8.1/§8.2.
 * Tela central do sistema; só a aba `Principal` foi capturada.
 * TODO(contract): tipo real virá do codegen do OpenAPI na integração.
 */
import type { DocumentInstallmentDto, InstallmentPolicyDto } from '@/api/gerado'

/** Item da grade de 13 colunas — §8.2. O item fala na língua do FORNECEDOR. */
export interface OrcamentoItem {
  item: string
  codigoFornecedor: string
  descricaoFornecedor: string
  acabamento: string
  tamanho: string
  quantidade: string
  unidade: string
  valorUnitarioCentavos: number | null
  /** Int com 4 casas implícitas (10000 = 1%) — §8.2 mostra `0,0010 %`. */
  descontoPercentual: number | null
  grupoProduto: string
  tipoPeca: string
  fornecedor: string
  /** `Ambiente F5`: itens agrupados por ambiente da obra (§8.2). */
  ambiente: string
}

export type ModoDesconto = 'PRODUTO' | 'GERAL'

/**
 * Ambiente COMO O DOCUMENTO o guarda — a camada do meio das três que o contrato
 * descreve em `QuoteEnvironmentDto`: o catálogo por empresa fica em
 * `GET /api/catalog-lookups?kind=AMBIENTE`, esta é a instância no orçamento, e
 * o item aponta para ela por `environmentCode`.
 *
 * **O documento precisa carregá-la, e não derivá-la dos itens.** O `name` é
 * CONGELADO na emissão: derivar `environments` da coluna Ambiente da grade —
 * que guarda o CÓDIGO — fazia a escrita mandar `name: code`, e como o `PUT` é
 * integral o servidor gravava o uuid no lugar do nome do ambiente. Medido
 * contra o backend real: o documento voltava com
 * `name: "11111111-1111-…"`. Um `Gravar` sem nenhuma edição destruía o dado.
 */
export interface AmbienteDoOrcamento {
  /** `CatalogLookupDto.id`, kind `AMBIENTE` — o contrato o declara `format: uuid`. */
  codigo: string
  /** Nome congelado na emissão. Renomear no catálogo não reescreve documento emitido. */
  nome: string
  ordem: number
}

export interface Orcamento {
  /**
   * Id do documento — TEXTO desde a migração para `/api/quotes` (#134).
   *
   * Era `number` (1..N) enquanto o orçamento era array local. Virou string
   * porque o contrato declara `format: uuid` e o recurso passou a responder por
   * HTTP: id numérico ao lado de recurso do servidor é exatamente o casamento
   * que a regra do registry proíbe. No modo mock ele é legível (`orc-0001`),
   * como os do CRM — o formato uuid é exigência do backend, não do mock.
   */
  id: string
  /** `Número` — sequencial global, NÃO cronológico (§8.1, observação). */
  numero: string
  serie: string
  numeroPasta: string
  dataEmissao: string | null
  dataValidade: string | null
  dataFechamento: string | null
  /** `PartnerDto.id` do cliente — é ele que viaja para o servidor. */
  clienteId: string
  /** Nome resolvido pelo servidor; a tela mostra, o servidor resolve. */
  cliente: string
  /** Na prática o legado guarda o profissional aqui (§8.1, observação). */
  descricaoObra: string
  consultorId: string | null
  consultor: string | null
  profissionalId: string | null
  profissionalExterno: string | null
  /**
   * Documento CANCELA, não desativa (`QuoteDto.status` = `active`/`cancelled`,
   * espelhando `Ven_Situacao` A/C do legado). Data de FECHAMENTO é outra
   * coisa: orçamento fechado continua ativo.
   */
  cancelado: boolean
  /**
   * Número da revisão, 1-based — `1` é o original, `2` é a primeira revisão.
   *
   * O caso real que ela resolve é banal e caro: o cliente mudou de ideia e o
   * vendedor emitiu DOIS orçamentos no mesmo dia, sem nada no dado dizendo que
   * o segundo substitui o primeiro. Quem lia a listagem contava dois negócios
   * onde havia um.
   */
  revisao: number
  /**
   * O orçamento que ESTA revisão substitui, ou `null` no original.
   *
   * A revisão é documento NOVO (`POST .../revise` copia cabeçalho, ambientes e
   * itens), e não uma edição: o anterior é o que foi mostrado ao cliente, e
   * sobrescrevê-lo apagaria a proposta que já saiu pela porta.
   */
  revisaoDeId: string | null
  /**
   * Número do orçamento revisado, resolvido pelo SERVIDOR na leitura — é o que
   * a folha mostra sem uma segunda requisição. Só o detalhe o traz; a listagem
   * tem o id, não o número.
   */
  revisaoDeNumero: string | null
  modoDesconto: ModoDesconto
  /** Desconto geral em % (4 casas implícitas) — §8.2. */
  descontoPercentual: number
  /**
   * Os ambientes do documento, como vieram. Coleção PRÓPRIA e não derivada dos
   * itens — o contrato diz que "ambiente sem item nenhum é estado legítimo", e
   * derivar perderia o nome congelado. Ver `AmbienteDoOrcamento`.
   */
  ambientes: AmbienteDoOrcamento[]
  itens: OrcamentoItem[]
  /** A condição de pagamento escolhida — `PaymentTermDto.id`, `Ven_formaPag`. */
  condicaoPagamentoId: string | null
  /** Nome da condição na emissão, resolvido pelo servidor. */
  condicaoPagamento: string | null
  /**
   * O plano CARIMBADO na gravação — não derivado na leitura.
   *
   * É a diferença que o legado registra ao copiar os parâmetros para a linha da
   * `Venda`: alterar a condição depois não pode mudar o vencimento de parcela
   * que o cliente já recebeu. Derivar aqui faria o documento reimpresso sair
   * diferente de si mesmo.
   */
  parcelas: DocumentInstallmentDto[]
  /** Os três limites que valiam na gravação. Ausente no documento do seed. */
  politicaDeParcelamento?: InstallmentPolicyDto
}

/** Linhas literais da listagem §8.1. */
const LINHAS = [
  { numero: '21653', cliente: 'ANDRÉ BATALHA', obra: 'MARIANA', emissao: '2025-08-05' },
  { numero: '21654', cliente: 'ROMULO GERMANO', obra: 'MARIANA', emissao: '2025-08-05' },
  { numero: '21655', cliente: 'SHEILA E VICENTE', obra: 'ARIADINE', emissao: '2025-08-05' },
  { numero: '21645', cliente: 'TELMA TOMPSON', obra: 'ANA ELIZA', emissao: '2025-08-04' },
  { numero: '21652', cliente: 'ROBERT TAGLIAELA', obra: 'MALU', emissao: '2025-08-04' },
  { numero: '21644', cliente: '3Z REALTY', obra: 'MALU', emissao: '2025-08-04' },
  { numero: '21650', cliente: 'ADRIANA FERREIRA', obra: 'ANA ELIZA', emissao: '2025-08-04' },
  { numero: '21651', cliente: 'ALEXANDER SCHULZ', obra: '', emissao: '2025-08-04' },
  {
    numero: '21647',
    cliente: 'BSA ADMINISTRADORA DE BENS E PARTICIPACOES',
    obra: 'GIORDANA',
    emissao: '2025-08-04',
  },
  { numero: '21646', cliente: 'CONSUMIDOR', obra: 'OBRA INDEFINIDA', emissao: '2025-08-04' },
  { numero: '21648', cliente: 'HELIO MURSSA JUNIOR', obra: 'FLAVIO COSSA', emissao: '2025-08-04' },
  {
    numero: '21649',
    cliente: 'LUIMARA PAULA MALVEZZI ROCHA',
    obra: 'OBRA INDEFINIDA',
    emissao: '2025-08-04',
  },
  { numero: '21641', cliente: 'ERICA BRAGION', obra: 'FLAVIO COSSA', emissao: '2025-08-02' },
  { numero: '21643', cliente: 'ANTONIO ANGELO CASADEI', obra: 'MALU', emissao: '2025-08-02' },
  { numero: '21642', cliente: 'NAHLA', obra: 'RICARDO', emissao: '2025-08-02' },
  {
    numero: '21639',
    cliente: 'PATRICIA E MARCELO ROSSI',
    obra: 'SILVANIA',
    emissao: '2025-08-01',
  },
  {
    numero: '21638',
    cliente: 'PATRICIA E MARCELO ROSSI',
    obra: 'SILVANIA',
    emissao: '2025-08-01',
  },
] as const

/** Validade = emissão + 5 dias na captura (§8.1). */
function validade(emissao: string): string {
  const d = new Date(`${emissao}T00:00:00`)
  d.setDate(d.getDate() + 5)
  return d.toISOString().slice(0, 10)
}

/** Ambientes da obra — o `Ambiente F5` agrupa os itens (§8.2). */
export const AMBIENTES = ['SALA', 'QUARTO', 'COZINHA', 'BANHEIRO', 'ÁREA EXTERNA'] as const

export const orcamentos: Orcamento[] = LINHAS.map((l, i) => ({
  id: `orc-${String(i + 1).padStart(4, '0')}`,
  numero: l.numero,
  serie: '1',
  numeroPasta: '',
  dataEmissao: l.emissao,
  dataValidade: validade(l.emissao),
  dataFechamento: null,
  // O seed não casa com a base de parceiros (as linhas são literais da
  // transcrição, e os parceiros são outro mock). O id é sintético e estável, e
  // o servidor falso ecoa o nome que está aqui — é o que um servidor de
  // verdade faria resolvendo a FK.
  clienteId: `cli-seed-${String(i + 1).padStart(4, '0')}`,
  cliente: l.cliente,
  descricaoObra: l.obra,
  consultorId: null,
  consultor: null,
  profissionalId:
    l.obra === 'OBRA INDEFINIDA' || l.obra === ''
      ? null
      : `prof-seed-${String(i + 1).padStart(4, '0')}`,
  profissionalExterno: l.obra === 'OBRA INDEFINIDA' || l.obra === '' ? null : l.obra,
  cancelado: false,
  // Documento do seed é o ORIGINAL: a revisão nasce por `POST .../revise`, e
  // nenhuma linha da §8.1 é revisão de outra.
  revisao: 1,
  revisaoDeId: null,
  revisaoDeNumero: null,
  modoDesconto: 'PRODUTO',
  descontoPercentual: 0,
  // No mock o CÓDIGO do ambiente é legível, como o id do próprio orçamento
  // (`orc-0001`): o mock é o catálogo dele mesmo. O que importa é a coleção
  // EXISTIR — é dela que a escrita tira o nome congelado.
  ambientes: i % 3 === 0 ? [] : [{ codigo: 'SALA', nome: 'SALA', ordem: 1 }],
  itens:
    i % 3 === 0
      ? []
      : [
          {
            item: '1',
            codigoFornecedor: `F${String(4000 + i * 7)}`,
            descricaoFornecedor: 'PENDENTE REDONDO ALUMÍNIO',
            acabamento: 'PRETO',
            tamanho: 'ÚNICO',
            quantidade: '2',
            unidade: 'UN',
            valorUnitarioCentavos: 45_900 + i * 1_100,
            descontoPercentual: 0,
            grupoProduto: 'PENDENTES',
            tipoPeca: 'REDONDA',
            fornecedor: 'STELLA',
            ambiente: 'SALA',
          },
        ],
  // O seed nasce SEM condição de pagamento, e é a verdade dele: as 17 linhas
  // são a listagem literal da §8.1, onde a coluna não existe. Carimbar um plano
  // aqui inventaria vencimento que ninguém escolheu — e o documento sem plano é
  // justamente o estado que a tela precisa saber desenhar.
  condicaoPagamentoId: null,
  condicaoPagamento: null,
  parcelas: [],
}))

export function orcamentoVazio(id = ''): Orcamento {
  return {
    id,
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
    // Documento que ainda não existe é o original de si mesmo. `0` seria
    // "revisão nenhuma", que o contrato não publica: o mínimo dele é 1.
    revisao: 1,
    revisaoDeId: null,
    revisaoDeNumero: null,
    modoDesconto: 'PRODUTO',
    descontoPercentual: 0,
    ambientes: [],
    itens: [],
    condicaoPagamentoId: null,
    condicaoPagamento: null,
    // `[]` e não `undefined`: documento sem condição tem plano VAZIO, e é o que
    // impede a tela de quebrar num `.map` só no orçamento recém-aberto.
    parcelas: [],
  }
}
