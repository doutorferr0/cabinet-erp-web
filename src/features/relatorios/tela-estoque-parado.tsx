import type { StockAgingRowDto } from '@/api/gerado'
import { useDepositos } from '@/data/estoque-api'
import { useLookupOptions } from '@/data/lookups-api'
import {
  type ConsultaDeEstoqueParado,
  recorteDoEnvelope,
  useEstoqueParado,
} from '@/data/relatorios-api'
import {
  type AgrupamentoDeRelatorio,
  type TomDeRelatorio,
  numeroDaQuantidade,
  somar,
} from '@/features/relatorios/agrupamento'
import {
  type ColunaDeRelatorio,
  EscolhaDeDeposito,
  FaixaDeKpis,
  FiltroDeMarcar,
  Kpi,
  MolduraDeRelatorio,
  RotuloDeFiltro,
  TETO_DE_PAGINA,
} from '@/features/relatorios/moldura-de-relatorio'
import { formatDateBR, formatInstanteBR, formatMoneyBRL, formatQuantidade } from '@/lib/formatters'
import { useState } from 'react'

/**
 * ESTOQUE PARADO — `GET /api/reports/stock-aging`.
 *
 * O dinheiro parado na prateleira: quanto tem, há quantos dias sem vender, e
 * quando foi a última saída.
 *
 * ## "Nunca vendeu" e "há quatro anos" são respostas diferentes
 *
 * `daysWithoutSale` nulo é NUNCA VENDEU, e a tela escreve isso por extenso em
 * vez de um número gigante: o item que nunca vendeu pode ter entrado ontem. Quem
 * separa os dois é `daysInStock` — dias desde a primeira entrada —, e é por isso
 * que a coluna existe ao lado.
 *
 * A ordem padrão do contrato põe os que nunca venderam no FIM, e não no começo:
 * no topo, eles enterrariam os que já venderam e pararam, que é onde mora a
 * decisão de queima de estoque.
 *
 * ## O recorte por depósito muda a quantidade, nunca os dias
 *
 * Venda não acontece em depósito — sai do saldo da empresa, e o pedido não
 * guarda de qual local a peça saiu. Recortar muda QUANTO está parado ali e quais
 * itens aparecem; `lastSaleAt` e `daysWithoutSale` seguem sendo da empresa.
 *
 * ## A quebra por FAIXA é a leitura do relatório (web#493 · D25)
 *
 * Uma lista de 400 itens ordenada por dias responde "qual o pior"; a mesma lista
 * quebrada em faixas responde "quanto dinheiro está em cada nível de risco", que
 * é a pergunta que decide queima. Por isso a faixa é o agrupamento PADRÃO desta
 * tela — a única das três que nasce agrupada.
 *
 * As faixas são as três da issue (>90, >180, >365) mais duas que o DADO exige:
 * "até 90 dias", que é o resto, e **"nunca vendeu"**, que não cabe em nenhum
 * corte de dias porque o campo é nulo. Enfiar o nunca-vendeu na faixa mais alta
 * o transformaria em "parado há muito tempo", que é exatamente a confusão que a
 * coluna evita desde a #352.
 */

const PAGE_SIZE = 50

/** As faixas, do menos para o mais grave — e o rótulo é o título do grupo. */
const ATE_90 = 'Até 90 dias'
const MAIS_DE_90 = 'Mais de 90 dias'
const MAIS_DE_180 = 'Mais de 180 dias'
const MAIS_DE_365 = 'Mais de 365 dias'
const NUNCA = 'Nunca vendeu'

const ORDEM_DAS_FAIXAS = [ATE_90, MAIS_DE_90, MAIS_DE_180, MAIS_DE_365, NUNCA] as const

/**
 * A faixa de uma linha. Pura e exportada: é a regra do relatório, e o teste a
 * exercita sem montar tela.
 *
 * Nulo é NUNCA VENDEU e tem faixa própria — não é "infinitos dias parado".
 */
export function faixaDeDiasSemVenda(dias: number | null | undefined): string {
  if (dias === null || dias === undefined) return NUNCA
  if (dias > 365) return MAIS_DE_365
  if (dias > 180) return MAIS_DE_180
  if (dias > 90) return MAIS_DE_90
  return ATE_90
}

/**
 * O tom de uma faixa. `warn` a partir de 180 dias e `bad` acima de 365 — e o
 * nunca-vendeu acompanha o pior, porque saldo que nunca saiu é o dinheiro com
 * menos chance de sair.
 */
export function tomDaFaixa(faixa: string): TomDeRelatorio {
  if (faixa === MAIS_DE_365 || faixa === NUNCA) return 'bad'
  if (faixa === MAIS_DE_180) return 'warn'
  return 'neutro'
}

export function TelaEstoqueParado() {
  const [consulta, setConsulta] = useState<ConsultaDeEstoqueParado>({
    productGroup: null,
    includeZero: false,
    minDaysWithoutSale: 0,
    warehouseId: null,
    sortBy: null,
    sortDesc: false,
    page: 1,
    // Nasce agrupado por faixa, então já nasce pedindo o teto: agrupar é do
    // cliente, e uma quebra montada sobre 50 de 400 linhas é uma quebra falsa.
    pageSize: TETO_DE_PAGINA,
  })
  const [agrupamento, setAgrupamento] = useState<string | null>('faixa')

  const depositos = useDepositos()
  const tipos = useLookupOptions('tipoProduto')
  const relatorio = useEstoqueParado(consulta)

  function trocar(mudanca: Partial<ConsultaDeEstoqueParado>) {
    setConsulta((atual) => ({ ...atual, ...mudanca, page: 1 }))
  }

  function trocarAgrupamento(id: string | null) {
    setAgrupamento(id)
    setConsulta((atual) => ({
      ...atual,
      page: 1,
      pageSize: id ? TETO_DE_PAGINA : PAGE_SIZE,
    }))
  }

  const envelope = relatorio.data
  const recorte = recorteDoEnvelope(consulta.warehouseId, envelope?.warehouseId)
  const nomeDoDeposito = depositos.data?.find((d) => d.id === consulta.warehouseId)?.name
  const resumo = envelope?.summary

  return (
    <MolduraDeRelatorio<StockAgingRowDto>
      titulo="Estoque Parado"
      contexto={
        envelope
          ? `Foto de ${formatInstanteBR(envelope.asOf)} — os dias são contados a partir dela.`
          : 'Quantidade, dias sem venda e última saída.'
      }
      baseDoArquivo="estoque-parado"
      filtros={
        <>
          <EscolhaDeDeposito
            depositos={depositos.data ?? []}
            valor={consulta.warehouseId}
            aoTrocar={(warehouseId) => trocar({ warehouseId })}
          />

          <label className="flex flex-col gap-[var(--s-1)]">
            <RotuloDeFiltro>Parado há pelo menos</RotuloDeFiltro>
            <input
              type="number"
              min={0}
              step={1}
              className="t-ui h-9 w-32 border-2 border-input bg-card px-2.5 outline-none focus-visible:focus-ring"
              value={consulta.minDaysWithoutSale}
              onChange={(evento) => {
                const dias = Number(evento.target.value)
                // Dia negativo não é recorte: o contrato manda 400, e barrar
                // aqui evita mandar requisição sabidamente inválida.
                trocar({ minDaysWithoutSale: Number.isFinite(dias) && dias > 0 ? dias : 0 })
              }}
              aria-label="Dias sem venda, no mínimo"
            />
          </label>

          <label className="flex flex-col gap-[var(--s-1)]">
            <RotuloDeFiltro>Tipo de produto</RotuloDeFiltro>
            <select
              className="t-ui h-9 border-2 border-input bg-card px-2.5 outline-none focus-visible:focus-ring"
              value={consulta.productGroup ?? ''}
              onChange={(evento) => trocar({ productGroup: evento.target.value || null })}
            >
              <option value="">Todos os tipos</option>
              {tipos.options.map((tipo) => (
                <option key={tipo.id} value={tipo.nome}>
                  {tipo.nome}
                </option>
              ))}
            </select>
          </label>

          <FiltroDeMarcar
            rotulo="Incluir saldo zero"
            marcado={consulta.includeZero}
            aoTrocar={(includeZero) => trocar({ includeZero })}
          />
        </>
      }
      kpis={
        resumo ? (
          <FaixaDeKpis>
            <Kpi
              rotulo="Dinheiro parado"
              valor={formatMoneyBRL(resumo.valueCents)}
              tom={resumo.valueCents > 0 ? 'warn' : 'neutro'}
              dica="Só os itens COM preço entram nesta soma."
            />
            <Kpi rotulo="Itens" valor={String(resumo.itemCount)} />
            <Kpi
              rotulo="Nunca venderam"
              valor={String(resumo.neverSoldCount)}
              tom={resumo.neverSoldCount > 0 ? 'bad' : 'neutro'}
              dica="Sem venda alguma — entram no recorte por qualquer corte de dias."
            />
            <Kpi
              rotulo="Parado por item"
              valor={
                resumo.itemCount > 0
                  ? formatMoneyBRL(Math.round(resumo.valueCents / resumo.itemCount))
                  : '—'
              }
              dica="Média do recorte — separa muitos itens baratos de poucos caros."
            />
          </FaixaDeKpis>
        ) : null
      }
      colunas={COLUNAS}
      linhas={envelope?.rows ?? []}
      chaveDaLinha={(linha) => linha.variantId}
      agrupamentos={AGRUPAMENTOS}
      agrupamentoAtivo={agrupamento}
      aoTrocarAgrupamento={trocarAgrupamento}
      tomDaLinha={(linha) => tomDaFaixa(faixaDeDiasSemVenda(linha.daysWithoutSale))}
      carregando={relatorio.isPending}
      erro={relatorio.isError ? relatorio.error : null}
      refazer={() => relatorio.refetch()}
      total={envelope?.total ?? 0}
      page={consulta.page}
      pageSize={consulta.pageSize}
      aoTrocarPagina={(page) => setConsulta((atual) => ({ ...atual, page }))}
      sortBy={consulta.sortBy}
      sortDesc={consulta.sortDesc}
      aoOrdenar={(campo) =>
        setConsulta((atual) => ({
          ...atual,
          sortBy: campo,
          sortDesc: atual.sortBy === campo ? !atual.sortDesc : true,
          page: 1,
        }))
      }
      recorte={recorte}
      nomeDoDeposito={nomeDoDeposito}
      vazio="Nenhum item parado no recorte."
    />
  )
}

function quantidade(texto: string): string {
  const numero = Number(texto)
  return Number.isFinite(numero) ? formatQuantidade(numero) : texto
}

const AGRUPAMENTOS: readonly AgrupamentoDeRelatorio<StockAgingRowDto>[] = [
  {
    id: 'faixa',
    rotulo: 'Faixa de dias sem venda',
    chave: (linha) => faixaDeDiasSemVenda(linha.daysWithoutSale),
    ordem: ORDEM_DAS_FAIXAS,
    tom: tomDaFaixa,
  },
  {
    id: 'productGroup',
    rotulo: 'Tipo de produto',
    chave: (linha) => linha.productGroup ?? 'Sem tipo',
  },
]

/** Whitelist do contrato: `daysWithoutSale`, `valueCents`, `quantity`, `lastSaleAt`, `description`. */
const COLUNAS: ColunaDeRelatorio<StockAgingRowDto>[] = [
  {
    id: 'description',
    titulo: 'Descrição',
    ordenaPor: 'description',
    celula: (linha) => linha.description,
  },
  {
    id: 'productGroup',
    titulo: 'Tipo',
    celula: (linha) => linha.productGroup ?? '—',
  },
  {
    id: 'quantity',
    titulo: 'Saldo',
    ordenaPor: 'quantity',
    numerica: true,
    celula: (linha) => quantidade(linha.quantity),
    soma: (linhas) => {
      const total = somar(linhas, (linha) => numeroDaQuantidade(linha.quantity))
      return total === null ? '' : formatQuantidade(total)
    },
  },
  {
    id: 'valueCents',
    titulo: 'Valor parado',
    ordenaPor: 'valueCents',
    numerica: true,
    celula: (linha) =>
      linha.valueCents === null || linha.valueCents === undefined
        ? '—'
        : formatMoneyBRL(linha.valueCents),
    soma: (linhas) => {
      const total = somar(linhas, (linha) => linha.valueCents)
      return total === null ? '—' : formatMoneyBRL(total)
    },
  },
  {
    id: 'lastSaleAt',
    titulo: 'Última venda',
    ordenaPor: 'lastSaleAt',
    celula: (linha) => (linha.lastSaleAt ? formatDateBR(linha.lastSaleAt) : 'nunca vendeu'),
  },
  {
    id: 'daysWithoutSale',
    titulo: 'Dias sem venda',
    ordenaPor: 'daysWithoutSale',
    numerica: true,
    // Nulo é NUNCA, e não um número grande: "nunca" e "há quatro anos" são
    // perguntas diferentes, e o traço não deixa a coluna somar de cabeça.
    celula: (linha) => {
      if (linha.daysWithoutSale === null || linha.daysWithoutSale === undefined) return '—'
      const tom = tomDaFaixa(faixaDeDiasSemVenda(linha.daysWithoutSale))
      // A cor entra no NÚMERO que a justifica, e não na linha inteira: fundo
      // colorido em linha de dado é o que a rodada 2.0 proíbe.
      if (tom === 'bad') return <span className="text-destructive">{linha.daysWithoutSale}</span>
      if (tom === 'warn') return <span className="text-warn">{linha.daysWithoutSale}</span>
      return String(linha.daysWithoutSale)
    },
    texto: (linha) =>
      linha.daysWithoutSale === null || linha.daysWithoutSale === undefined
        ? ''
        : String(linha.daysWithoutSale),
  },
  {
    id: 'daysInStock',
    titulo: 'Dias em casa',
    numerica: true,
    celula: (linha) =>
      linha.daysInStock === null || linha.daysInStock === undefined
        ? '—'
        : String(linha.daysInStock),
  },
]
