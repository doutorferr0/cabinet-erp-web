import type { StockAgingRowDto } from '@/api/gerado'
import { useDepositos } from '@/data/estoque-api'
import { useLookupOptions } from '@/data/lookups-api'
import {
  type ConsultaDeEstoqueParado,
  recorteDoEnvelope,
  useEstoqueParado,
} from '@/data/relatorios-api'
import {
  type ColunaDeRelatorio,
  EscolhaDeDeposito,
  FiltroDeMarcar,
  GradeDoResumo,
  MolduraDeRelatorio,
  NumeroDoResumo,
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
 */

const PAGE_SIZE = 50

export function TelaEstoqueParado() {
  const [consulta, setConsulta] = useState<ConsultaDeEstoqueParado>({
    productGroup: null,
    includeZero: false,
    minDaysWithoutSale: 0,
    warehouseId: null,
    sortBy: null,
    sortDesc: false,
    page: 1,
    pageSize: PAGE_SIZE,
  })

  const depositos = useDepositos()
  const tipos = useLookupOptions('tipoProduto')
  const relatorio = useEstoqueParado(consulta)

  function trocar(mudanca: Partial<ConsultaDeEstoqueParado>) {
    setConsulta((atual) => ({ ...atual, ...mudanca, page: 1 }))
  }

  const envelope = relatorio.data
  const recorte = recorteDoEnvelope(consulta.warehouseId, envelope?.warehouseId)
  const nomeDoDeposito = depositos.data?.find((d) => d.id === consulta.warehouseId)?.name

  return (
    <MolduraDeRelatorio<StockAgingRowDto>
      titulo="Estoque Parado"
      contexto={
        envelope
          ? `Foto de ${formatInstanteBR(envelope.asOf)} — os dias são contados a partir dela.`
          : 'Quantidade, dias sem venda e última saída.'
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
              Parado há pelo menos
            </span>
            <input
              type="number"
              min={0}
              step={1}
              className="h-9 w-32 border-2 border-input bg-card px-2.5 text-sm outline-none focus-visible:focus-ring"
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
        </>
      }
      resumo={
        envelope ? (
          <GradeDoResumo>
            <NumeroDoResumo rotulo="Itens" valor={String(envelope.summary.itemCount)} />
            <NumeroDoResumo
              rotulo="Nunca venderam"
              valor={String(envelope.summary.neverSoldCount)}
              dica="Sem venda alguma — entram no recorte por qualquer corte de dias."
            />
            <NumeroDoResumo
              rotulo="Dinheiro parado"
              valor={formatMoneyBRL(envelope.summary.valueCents)}
              dica="Só os itens COM preço entram nesta soma."
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
      vazio="Nenhum item parado no recorte."
    />
  )
}

function quantidade(texto: string): string {
  const numero = Number(texto)
  return Number.isFinite(numero) ? formatQuantidade(numero) : texto
}

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
    celula: (linha) =>
      linha.daysWithoutSale === null || linha.daysWithoutSale === undefined
        ? '—'
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
