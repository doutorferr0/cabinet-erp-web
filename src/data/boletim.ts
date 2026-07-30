import { formatDateBR } from '@/lib/formatters'
import { clientes } from '@/mocks/clientes'
import { colaboradores } from '@/mocks/colaboradores'
import { fornecedores } from '@/mocks/fornecedores'
import { type Orcamento, orcamentos } from '@/mocks/orcamentos'
import { type OrdemCompra, ordensCompra } from '@/mocks/ordens-compra'
import { pedidosCompra } from '@/mocks/pedidos-compra'
import { produtos } from '@/mocks/produtos'
import { profissionais } from '@/mocks/profissionais'
import { mockDelay } from '@/mocks/query'

/**
 * FRONTEIRA DE DADOS DO BOLETIM — o resumo da tela de entrada.
 *
 * Não é `ListProvider`: nenhuma tabela é paginada aqui, o que se pede é uma
 * apuração fechada. Por isso mora ao lado do registry (`src/data/index.ts`),
 * não dentro dele. A tela importa daqui e NUNCA de `src/mocks/`.
 *
 * TODO(contract): na integração isto vira UM endpoint de resumo
 * (`GET /boletim?data=`), calculado no servidor. Somar documento no cliente
 * não escala para o volume real — aqui só funciona porque o mock cabe na
 * memória. A assinatura `fetchBoletim(): Promise<Boletim>` fica igual.
 *
 * REGRA DA FASE: toda grandeza abaixo é DERIVADA de campo que a transcrição
 * captura. Nada de métrica inventada — onde o legado não registra o dado, o
 * boletim não mostra a linha.
 */

/** Soma dos itens de um documento, em centavos. Quantidade aceita vírgula. */
function somaItens(
  itens: readonly { quantidade: string; valorUnitarioCentavos: number | null }[],
): number {
  return itens.reduce((total, item) => {
    const quantidade = Number(item.quantidade.replace(',', '.'))
    if (!Number.isFinite(quantidade)) return total
    return total + Math.round(quantidade * (item.valorUnitarioCentavos ?? 0))
  }, 0)
}

/** Linha do movimento do dia — um documento, na língua do boletim. */
export interface LinhaMovimento {
  /** `Orçamento` · `Ordem de Compra` · `Pedido de Compra` — nomes da transcrição. */
  especie: string
  /** `Número` do orçamento, `Código` da ordem/pedido. */
  numero: string
  /** Cliente no orçamento, fornecedor na compra. */
  contraparte: string
  valorCentavos: number
  /** Rota da tela do documento, para a linha ser clicável. */
  href: string
}

/** Ordem cujo `Data Envio` está vazio — derivação, não enumeração de situação. */
export interface LinhaOrdemSemEnvio {
  codigo: string
  fornecedor: string
  dataOrdem: string | null
  /** Dias entre `Data Ordem` e a data de referência do boletim. */
  diasParado: number
  href: string
}

/** Contagem de um cadastro, com a fatia desativada (§9 padrão 8: nunca excluir). */
export interface LinhaCadastro {
  nome: string
  total: number
  inativos: number
  href: string
}

export interface Boletim {
  /**
   * Data de referência do boletim. Na fase mock é a data mais recente que
   * existe nos documentos — os mocks são o retrato do dia da captura
   * (05/08/2025, transcrição). Fixar `hoje` aqui mostraria um ano de atraso
   * que é artefato do mock, não fato da operação.
   */
  dataReferencia: string
  dataReferenciaBR: string
  /** Apuração do dia: cada grandeza é uma coluna da tira. */
  orcamentosDoDia: number
  valorOrcadoCentavos: number
  ordensDoDia: number
  valorOrdenadoCentavos: number
  /** Ordens de qualquer data ainda sem `Data Envio` preenchida. */
  ordensSemEnvio: number
  movimento: LinhaMovimento[]
  semEnvio: LinhaOrdemSemEnvio[]
  cadastros: LinhaCadastro[]
}

/** Data mais recente entre os documentos — âncora do boletim na fase mock. */
function dataMaisRecente(): string {
  const datas = [
    ...orcamentos.map((o) => o.dataEmissao),
    ...ordensCompra.map((o) => o.dataOrdem),
    ...pedidosCompra.map((p) => p.data),
  ].filter((d): d is string => !!d)
  return datas.sort().at(-1) ?? ''
}

function diasEntre(inicioIso: string | null, fimIso: string): number {
  if (!inicioIso) return 0
  const dia = 24 * 60 * 60 * 1000
  const delta = Date.parse(fimIso) - Date.parse(inicioIso)
  return Number.isFinite(delta) ? Math.max(0, Math.round(delta / dia)) : 0
}

function movimentoDoDia(referencia: string): LinhaMovimento[] {
  const doDia = (o: Orcamento) => o.dataEmissao === referencia
  const ordemDoDia = (o: OrdemCompra) => o.dataOrdem === referencia

  return [
    ...orcamentos.filter(doDia).map((o) => ({
      especie: 'Orçamento',
      numero: o.numero,
      contraparte: o.cliente,
      valorCentavos: somaItens(o.itens),
      href: `/vendas/orcamentos/${o.id}`,
    })),
    ...ordensCompra.filter(ordemDoDia).map((o) => ({
      especie: 'Ordem de Compra',
      numero: o.codigo,
      contraparte: o.fornecedor,
      valorCentavos: somaItens(o.itens),
      href: `/compras/ordens/${o.id}`,
    })),
    ...pedidosCompra
      .filter((p) => p.data === referencia)
      .map((p) => ({
        especie: 'Pedido de Compra',
        numero: p.codigo,
        contraparte: p.fornecedores.join(' · ') || '—',
        valorCentavos: somaItens(p.itens),
        href: `/compras/pedidos/${p.id}`,
      })),
  ]
}

export function boletim(): Boletim {
  const referencia = dataMaisRecente()
  const movimento = movimentoDoDia(referencia)

  const orcamentosDoDia = movimento.filter((m) => m.especie === 'Orçamento')
  const ordensDoDia = movimento.filter((m) => m.especie === 'Ordem de Compra')
  const soma = (linhas: LinhaMovimento[]) => linhas.reduce((total, l) => total + l.valorCentavos, 0)

  // `Data Envio` vazia é fato do campo, não nome de situação inventado.
  // TODO(transcricao): quando a enumeração real de `Situação` vier (o menu
  // `Consultar Situação do Pedido de Venda` prova que existe), esta derivação
  // é substituída pelo campo do contrato.
  const semEnvio = ordensCompra
    .filter((o) => !o.dataEnvio)
    .map((o) => ({
      codigo: o.codigo,
      fornecedor: o.fornecedor,
      dataOrdem: o.dataOrdem,
      diasParado: diasEntre(o.dataOrdem, referencia),
      href: `/compras/ordens/${o.id}`,
    }))
    .sort((a, b) => b.diasParado - a.diasParado)

  const cadastros: LinhaCadastro[] = [
    {
      nome: 'Clientes',
      total: clientes.length,
      inativos: clientes.filter((c) => !c.ativo).length,
      href: '/cadastros/clientes',
    },
    {
      nome: 'Fornecedores',
      total: fornecedores.length,
      inativos: fornecedores.filter((f) => !f.ativo).length,
      href: '/cadastros/fornecedores',
    },
    {
      nome: 'Produtos',
      total: produtos.length,
      inativos: produtos.filter((p) => !p.ativo).length,
      href: '/cadastros/produtos',
    },
    {
      nome: 'Colaboradores',
      total: colaboradores.length,
      inativos: colaboradores.filter((c) => !c.ativo).length,
      href: '/cadastros/colaboradores',
    },
    {
      nome: 'Profissional Externo',
      total: profissionais.length,
      inativos: profissionais.filter((p) => !p.ativo).length,
      href: '/cadastros/profissionais',
    },
  ]

  return {
    dataReferencia: referencia,
    dataReferenciaBR: formatDateBR(referencia),
    orcamentosDoDia: orcamentosDoDia.length,
    valorOrcadoCentavos: soma(orcamentosDoDia),
    ordensDoDia: ordensDoDia.length,
    valorOrdenadoCentavos: soma(ordensDoDia),
    ordensSemEnvio: semEnvio.length,
    movimento,
    semEnvio,
    cadastros,
  }
}

/** Mesma assinatura que o endpoint de resumo terá na integração. */
export function fetchBoletim(delayMs = 250): Promise<Boletim> {
  return mockDelay(boletim(), delayMs)
}
