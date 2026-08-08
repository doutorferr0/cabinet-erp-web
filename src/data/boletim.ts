import { data } from '@/data'
import { PAGE_SIZE_MAX } from '@/data/api-provider'
import { formatDateBR } from '@/lib/formatters'
import type { TableQueryState } from '@/lib/table-query'
import { colaboradores } from '@/mocks/colaboradores'
import { type Orcamento, orcamentos } from '@/mocks/orcamentos'
import { type OrdemCompra, ordensCompra } from '@/mocks/ordens-compra'
import { pedidosCompra } from '@/mocks/pedidos-compra'
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
 * As linhas de CADASTROS (Clientes, Fornecedores, Profissional Externo,
 * Produtos) contam pelo MESMO `data.<recurso>.list` que a listagem de cada um
 * usa — nunca por array de `src/mocks/`. Contar por fonte diferente da
 * listagem fazia o Boletim prometer "16 clientes" e a lista mostrar 1: o link
 * é para a mesma tela, e o número tem que bater com o que ela mostra.
 * Colaboradores é a exceção que confirma a regra: sua listagem também é mock
 * sobre `src/mocks/colaboradores.ts`, então a origem já é a mesma nos dois
 * lugares — não há nada para convergir.
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
  href: string
  /** `null` = a consulta HTTP falhou (409 sem empresa ativa, 401, proxy fora do ar…). */
  total: number | null
  inativos: number | null
  /** `inativos` é PISO, não contagem exata — a listagem paginou antes de contar todos. */
  inativosParcial: boolean
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

/**
 * Página única no teto do contrato (`pageSize: PAGE_SIZE_MAX`): o Boletim
 * precisa do `total` (pós-filtro, vem pronto na resposta) E da fatia inativa,
 * que só dá para contar olhando as linhas — por isso pede a página inteira em
 * vez de `pageSize: 1`.
 *
 * Acima do teto, `total` continua exato (é contagem do servidor) mas
 * `inativos` vira PISO: sobra registro inativo fora da página que
 * `linhaDeCadastro` nunca viu. `inativosParcial` marca esse caso para a tela
 * não exibir número exato com cara de exato — mesma regra do resto do
 * boletim, "nunca dado de mentira com cara de dado do servidor". O
 * TODO(contract) no topo do arquivo cobre o caso de crescer além disso.
 */
const CONSULTA_CADASTRO: TableQueryState = { q: '', sort: null, page: 1, pageSize: PAGE_SIZE_MAX }

async function linhaDeCadastro(
  nome: string,
  href: string,
  lista: (state: TableQueryState) => Promise<{ rows: { active: boolean }[]; total: number }>,
): Promise<LinhaCadastro> {
  try {
    const { rows, total } = await lista(CONSULTA_CADASTRO)
    return {
      nome,
      href,
      total,
      inativos: rows.filter((r) => !r.active).length,
      inativosParcial: rows.length < total,
    }
  } catch {
    // Uma lista de parceiro/produto fora do ar não pode apagar o boletim
    // inteiro (Movimento do dia e Ordens sem envio são mock puro e
    // renderizariam bem) — só esta linha de Cadastros fica indisponível.
    return { nome, href, total: null, inativos: null, inativosParcial: false }
  }
}

export async function boletim(): Promise<Boletim> {
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

  const [linhaClientes, linhaFornecedores, linhaProdutos, linhaProfissionais] = await Promise.all([
    linhaDeCadastro('Clientes', '/cadastros/clientes', data.clientes.list),
    linhaDeCadastro('Fornecedores', '/cadastros/fornecedores', data.fornecedores.list),
    linhaDeCadastro('Produtos', '/cadastros/produtos', data.produtos.list),
    linhaDeCadastro('Profissional Externo', '/cadastros/profissionais', data.profissionais.list),
  ])

  const cadastros: LinhaCadastro[] = [
    linhaClientes,
    linhaFornecedores,
    linhaProdutos,
    {
      // Colaboradores é mock nos dois lados (Boletim e listagem): não há
      // divergência a corrigir, então continua contando pelo array direto.
      nome: 'Colaboradores',
      href: '/cadastros/colaboradores',
      total: colaboradores.length,
      inativos: colaboradores.filter((c) => !c.ativo).length,
      inativosParcial: false,
    },
    linhaProfissionais,
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
export async function fetchBoletim(delayMs = 250): Promise<Boletim> {
  const dados = await boletim()
  return mockDelay(dados, delayMs)
}
