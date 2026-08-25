import type { StockValuationRowDto } from '@/api/gerado'
import { useDepositos } from '@/data/estoque-api'
import { useLookupOptions } from '@/data/lookups-api'
import {
  type ConsultaDeEstoqueValorizado,
  recorteDoEnvelope,
  useEstoqueValorizado,
} from '@/data/relatorios-api'
import {
  type ColunaDeRelatorio,
  EscolhaDeDeposito,
  FiltroDeMarcar,
  GradeDoResumo,
  MolduraDeRelatorio,
  NumeroDoResumo,
} from '@/features/relatorios/moldura-de-relatorio'
import { formatInstanteBR, formatMoneyBRL, formatQuantidade } from '@/lib/formatters'
import { useState } from 'react'

/**
 * ESTOQUE VALORIZADO — `GET /api/reports/stock-valuation`.
 *
 * A foto do agora: quanto vale o que está em casa. Não tem período — tem
 * INSTANTE, e por isso o cabeçalho carrega o `asOf` do envelope: o relatório
 * impresso às 9h e o das 18h são documentos diferentes, e sem o carimbo ninguém
 * os distingue depois.
 *
 * ## O que a tela NÃO decide
 *
 * `valueCents` e `belowMinimum` vêm calculados do servidor. A mesma comparação
 * feita aqui viraria uma segunda resposta no dia em que uma das duas esquecesse
 * o `<=` — e o operador teria dois números com a mesma cara.
 *
 * `valuationBasis` também: hoje só existe `sale_price`, e a tela ESCREVE o que o
 * servidor afirma. Quando o custo entrar (decisão D1, Custo+Índice), o rótulo
 * muda sozinho em vez de continuar dizendo a preço de venda sobre outro número.
 *
 * ## Item sem preço é o dado mais importante do resumo
 *
 * `withoutPriceCount` mede a confiança no total: 3 de 4000 é ruído, 900 de 4000
 * quer dizer que o valor lá em cima não significa nada. Por isso ele é um número
 * do resumo com a dica ao lado, e não uma nota de rodapé.
 */

const PAGE_SIZE = 50

export function TelaEstoqueValorizado() {
  const [consulta, setConsulta] = useState<ConsultaDeEstoqueValorizado>({
    productGroup: null,
    includeZero: false,
    belowMinimumOnly: false,
    warehouseId: null,
    sortBy: null,
    sortDesc: false,
    page: 1,
    pageSize: PAGE_SIZE,
  })

  const depositos = useDepositos()
  const tipos = useLookupOptions('tipoProduto')
  const relatorio = useEstoqueValorizado(consulta)

  // Todo filtro volta para a página 1: a página 7 de um recorte não existe no
  // recorte seguinte, e o operador leria "nenhum item" com filtro que tem itens.
  function trocar(mudanca: Partial<ConsultaDeEstoqueValorizado>) {
    setConsulta((atual) => ({ ...atual, ...mudanca, page: 1 }))
  }

  const envelope = relatorio.data
  const recorte = recorteDoEnvelope(consulta.warehouseId, envelope?.warehouseId)
  const nomeDoDeposito = depositos.data?.find((d) => d.id === consulta.warehouseId)?.name

  return (
    <MolduraDeRelatorio<StockValuationRowDto>
      titulo="Estoque Valorizado"
      contexto={
        envelope
          ? `Foto de ${formatInstanteBR(envelope.asOf)} — a preço de venda.`
          : 'Quanto vale o que está em casa, agora.'
      }
      filtros={
        <>
          <EscolhaDeDeposito
            depositos={depositos.data ?? []}
            valor={consulta.warehouseId}
            aoTrocar={(warehouseId) => trocar({ warehouseId })}
          />

          <label className="flex flex-col gap-1">
            <span className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.06em]">
              Tipo de produto
            </span>
            <select
              className="h-9 border-2 border-input bg-card px-2.5 text-sm outline-none focus-visible:focus-ring"
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
          <FiltroDeMarcar
            rotulo="Só abaixo do mínimo"
            marcado={consulta.belowMinimumOnly}
            aoTrocar={(belowMinimumOnly) => trocar({ belowMinimumOnly })}
          />
        </>
      }
      resumo={
        envelope ? (
          <GradeDoResumo>
            <NumeroDoResumo
              rotulo="Valor do estoque"
              valor={formatMoneyBRL(envelope.summary.valueCents)}
              dica="Só os itens COM preço entram nesta soma."
            />
            <NumeroDoResumo rotulo="Itens" valor={String(envelope.summary.itemCount)} />
            <NumeroDoResumo
              rotulo="Abaixo do mínimo"
              valor={String(envelope.summary.belowMinimumCount)}
            />
            <NumeroDoResumo
              rotulo="Sem preço"
              valor={String(envelope.summary.withoutPriceCount)}
              dica="Ficaram de fora do valor — é a medida da confiança no total."
            />
          </GradeDoResumo>
        ) : null
      }
      colunas={COLUNAS}
      linhas={envelope?.rows ?? []}
      chaveDaLinha={(linha) => linha.variantId}
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
      vazio="Nenhum item no recorte. Sem saldo zero e sem preço, a lista fica curta de propósito."
    />
  )
}

/**
 * Quantidade viaja como STRING decimal no contrato (exatidão, mesma razão do
 * centavo inteiro). Formatar exige número; texto que não converte volta cru, em
 * vez de virar `NaN` na tela.
 */
function quantidade(texto: string): string {
  const numero = Number(texto)
  return Number.isFinite(numero) ? formatQuantidade(numero) : texto
}

/**
 * As colunas. `ordenaPor` só nas quatro da whitelist do contrato (`valueCents`,
 * `quantity`, `minStock`, `description`) — cabeçalho clicável fora dela seria um
 * botão que responde 400.
 */
const COLUNAS: ColunaDeRelatorio<StockValuationRowDto>[] = [
  {
    id: 'description',
    titulo: 'Descrição',
    ordenaPor: 'description',
    celula: (linha) => linha.description,
  },
  {
    id: 'productGroup',
    titulo: 'Tipo',
    // Nulo é caso REAL, não ausência de dado: o cadastro mínimo do legado não
    // exigia tipo. Traço em vez de vazio para a coluna não parecer quebrada.
    celula: (linha) => linha.productGroup ?? '—',
  },
  {
    id: 'quantity',
    titulo: 'Saldo',
    ordenaPor: 'quantity',
    numerica: true,
    celula: (linha) => quantidade(linha.quantity),
  },
  {
    id: 'minStock',
    titulo: 'Mínimo',
    ordenaPor: 'minStock',
    numerica: true,
    celula: (linha) => quantidade(linha.minStock),
  },
  {
    id: 'unitPriceCents',
    titulo: 'Preço',
    numerica: true,
    // SEM PREÇO não é preço zero: o item não vale zero, vale desconhecido. Zero
    // aqui somaria à conta de cabeça de quem lê a coluna.
    celula: (linha) =>
      linha.unitPriceCents === null || linha.unitPriceCents === undefined
        ? 'sem preço'
        : formatMoneyBRL(linha.unitPriceCents),
  },
  {
    id: 'valueCents',
    titulo: 'Valor',
    ordenaPor: 'valueCents',
    numerica: true,
    celula: (linha) =>
      linha.valueCents === null || linha.valueCents === undefined
        ? '—'
        : formatMoneyBRL(linha.valueCents),
  },
  {
    id: 'belowMinimum',
    titulo: 'Abaixo do mínimo',
    celula: (linha) => (linha.belowMinimum ? 'sim' : ''),
  },
]
