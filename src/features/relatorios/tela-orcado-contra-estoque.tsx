import type { QuoteVsStockRowDto } from '@/api/gerado'
import { useDepositos } from '@/data/estoque-api'
import {
  type ConsultaDeOrcadoContraEstoque,
  recorteDoEnvelope,
  useOrcadoContraEstoque,
} from '@/data/relatorios-api'
import {
  type ColunaDeRelatorio,
  EscolhaDeDeposito,
  FiltroDeMarcar,
  GradeDoResumo,
  MolduraDeRelatorio,
  NumeroDoResumo,
} from '@/features/relatorios/moldura-de-relatorio'
import { limitesDoMes, mesDe } from '@/lib/datas'
import { formatQuantidade } from '@/lib/formatters'
import { useState } from 'react'

/**
 * ORÇADO × ESTOQUE — `GET /api/reports/quote-vs-stock`.
 *
 * O que já foi prometido contra o que existe em casa: a lista de compras que o
 * orçamento aberto está pedindo.
 *
 * ## Duas regras do contrato que a tela não pode suavizar
 *
 * 1. **A soma dos orçamentos NÃO desconta o que já virou pedido.** O pedido
 *    consome estoque por conta própria; abater aqui esconderia o compromisso
 *    duas vezes.
 * 2. **`shortageQuantity` é zero quando sobra**, nunca negativo — "falta -5" na
 *    tela faria alguém comprar assim mesmo.
 *
 * Só orçamentos ATIVOS entram (cancelado não promete nada) e só linhas com
 * variante do catálogo: item digitado livre não tem saldo com que comparar.
 *
 * ## O recorte por depósito muda a pergunta, não só o número
 *
 * O orçamento promete a PEÇA, não o depósito de onde ela sai — então o recorte
 * alcança o estoque e não o orçado. Com depósito escolhido, a falta é LOCAL, e
 * pode ser resolvida com transferência; sem ele, é falta na empresa, e aí é
 * compra. Duas perguntas legítimas com números diferentes, e é por isso que a
 * tela só rotula a coluna com o nome do depósito quando o servidor ECOA o
 * recorte.
 */

const PAGE_SIZE = 50

export function TelaOrcadoContraEstoque() {
  const mesCorrente = limitesDoMes(mesDe())
  const [consulta, setConsulta] = useState<ConsultaDeOrcadoContraEstoque>({
    // `from`/`to` são OBRIGATÓRIOS no contrato — a tela nasce com o mês
    // corrente em vez de vazia: campo obrigatório em branco daria 400 na
    // primeira renderização, e o operador leria falha onde só falta escolher.
    from: mesCorrente.de,
    to: mesCorrente.ate,
    shortageOnly: false,
    warehouseId: null,
    sortBy: null,
    sortDesc: false,
    page: 1,
    pageSize: PAGE_SIZE,
  })

  const depositos = useDepositos()
  const relatorio = useOrcadoContraEstoque(consulta)

  function trocar(mudanca: Partial<ConsultaDeOrcadoContraEstoque>) {
    setConsulta((atual) => ({ ...atual, ...mudanca, page: 1 }))
  }

  const envelope = relatorio.data
  const recorte = recorteDoEnvelope(consulta.warehouseId, envelope?.warehouseId)
  const nomeDoDeposito = depositos.data?.find((d) => d.id === consulta.warehouseId)?.name

  return (
    <MolduraDeRelatorio<QuoteVsStockRowDto>
      titulo="Orçado × Estoque"
      contexto={
        recorte.estado === 'confirmado' && nomeDoDeposito
          ? `O que os orçamentos abertos prometem, contra o saldo de ${nomeDoDeposito}.`
          : 'O que os orçamentos abertos prometem, contra o que existe em casa.'
      }
      filtros={
        <>
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.06em]">
              De
            </span>
            <input
              type="date"
              className="h-9 border-2 border-input bg-card px-2.5 text-sm outline-none focus-visible:focus-ring"
              value={consulta.from}
              onChange={(evento) => evento.target.value && trocar({ from: evento.target.value })}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.06em]">
              Até
            </span>
            <input
              type="date"
              className="h-9 border-2 border-input bg-card px-2.5 text-sm outline-none focus-visible:focus-ring"
              value={consulta.to}
              onChange={(evento) => evento.target.value && trocar({ to: evento.target.value })}
            />
          </label>

          <EscolhaDeDeposito
            depositos={depositos.data ?? []}
            valor={consulta.warehouseId}
            aoTrocar={(warehouseId) => trocar({ warehouseId })}
          />

          <FiltroDeMarcar
            rotulo="Só o que falta"
            marcado={consulta.shortageOnly}
            aoTrocar={(shortageOnly) => trocar({ shortageOnly })}
          />
        </>
      }
      resumo={
        envelope ? (
          <GradeDoResumo>
            <NumeroDoResumo
              rotulo="Produtos orçados"
              valor={String(envelope.summary.variantCount)}
              dica="Distintos, no período."
            />
            <NumeroDoResumo
              rotulo="Sem saldo suficiente"
              valor={String(envelope.summary.shortageCount)}
              dica={
                recorte.estado === 'confirmado'
                  ? 'Falta NESTE depósito — pode ser transferência, não compra.'
                  : 'Falta na empresa — é a lista de compras.'
              }
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
      vazio="Nenhum produto do catálogo orçado no período. Item digitado livre não entra: não há saldo com que comparar."
    />
  )
}

function quantidade(texto: string): string {
  const numero = Number(texto)
  return Number.isFinite(numero) ? formatQuantidade(numero) : texto
}

/** Whitelist do contrato: `shortageQuantity`, `quotedQuantity`, `stockQuantity`, `description`. */
const COLUNAS: ColunaDeRelatorio<QuoteVsStockRowDto>[] = [
  {
    id: 'description',
    titulo: 'Descrição',
    ordenaPor: 'description',
    celula: (linha) => linha.description,
  },
  {
    id: 'quotedQuantity',
    titulo: 'Orçado',
    ordenaPor: 'quotedQuantity',
    numerica: true,
    celula: (linha) => quantidade(linha.quotedQuantity),
  },
  {
    id: 'stockQuantity',
    titulo: 'Em casa',
    ordenaPor: 'stockQuantity',
    numerica: true,
    celula: (linha) => quantidade(linha.stockQuantity),
  },
  {
    id: 'shortageQuantity',
    titulo: 'Falta',
    ordenaPor: 'shortageQuantity',
    numerica: true,
    celula: (linha) => quantidade(linha.shortageQuantity),
  },
  {
    id: 'quoteCount',
    titulo: 'Em orçamentos',
    numerica: true,
    celula: (linha) => String(linha.quoteCount),
  },
  {
    id: 'sufficient',
    titulo: 'Atende',
    // O booleano do servidor, e não uma comparação feita aqui: a mesma conta em
    // dois lugares vira duas respostas na primeira divergência de arredondamento.
    celula: (linha) => (linha.sufficient ? 'sim' : 'não'),
  },
]
