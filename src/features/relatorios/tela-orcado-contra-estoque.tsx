import type { QuoteVsStockRowDto } from '@/api/gerado'
import { useDepositos } from '@/data/estoque-api'
import {
  type ConsultaDeOrcadoContraEstoque,
  recorteDoEnvelope,
  useOrcadoContraEstoque,
} from '@/data/relatorios-api'
import {
  type AgrupamentoDeRelatorio,
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
 *
 * ## "A comprar" tem o nome que o recorte permite (web#493 · D25)
 *
 * A issue pedia a coluna `a comprar`. Ela só é lista de compras quando a falta é
 * da EMPRESA: com depósito confirmado, o que falta ali pode estar sobrando no
 * outro depósito, e comprar seria erro. Por isso o título da coluna troca com o
 * estado do recorte — `A comprar` sem recorte, `Falta aqui` com ele —, que é a
 * mesma distinção que a dica do KPI já fazia.
 *
 * ## Cobertura é derivada do SUMMARY, e só por isso pode existir
 *
 * `(variantCount − shortageCount) / variantCount` sai dos dois números do
 * recorte INTEIRO que o envelope publica. A mesma conta sobre as linhas da
 * página daria a cobertura dos cinquenta primeiros com cara de cobertura do
 * relatório.
 */

const PAGE_SIZE = 50

const ATENDE = 'Atende'
const FALTA = 'Falta'

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
    pageSize: TETO_DE_PAGINA,
  })
  const [agrupamento, setAgrupamento] = useState<string | null>('sufficient')

  const depositos = useDepositos()
  const relatorio = useOrcadoContraEstoque(consulta)

  function trocar(mudanca: Partial<ConsultaDeOrcadoContraEstoque>) {
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
  const local = recorte.estado === 'confirmado'

  return (
    <MolduraDeRelatorio<QuoteVsStockRowDto>
      titulo="Orçado × Estoque"
      contexto={
        local && nomeDoDeposito
          ? `O que os orçamentos abertos prometem, contra o saldo de ${nomeDoDeposito}.`
          : 'O que os orçamentos abertos prometem, contra o que existe em casa.'
      }
      baseDoArquivo="orcado-x-estoque"
      filtros={
        <>
          <label className="flex flex-col gap-[var(--s-1)]">
            <RotuloDeFiltro>De</RotuloDeFiltro>
            <input
              type="date"
              className="t-ui h-9 border-2 border-input bg-card px-2.5 outline-none focus-visible:focus-ring"
              value={consulta.from}
              onChange={(evento) => evento.target.value && trocar({ from: evento.target.value })}
            />
          </label>

          <label className="flex flex-col gap-[var(--s-1)]">
            <RotuloDeFiltro>Até</RotuloDeFiltro>
            <input
              type="date"
              className="t-ui h-9 border-2 border-input bg-card px-2.5 outline-none focus-visible:focus-ring"
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
      kpis={
        resumo ? (
          <FaixaDeKpis>
            <Kpi
              rotulo="Cobertura"
              valor={
                resumo.variantCount > 0
                  ? `${Math.round(((resumo.variantCount - resumo.shortageCount) / resumo.variantCount) * 100)}%`
                  : '—'
              }
              tom={coberturaEmTom(resumo.variantCount, resumo.shortageCount)}
              dica="Dos produtos orçados, quantos o saldo atende inteiros."
            />
            <Kpi
              rotulo="Produtos orçados"
              valor={String(resumo.variantCount)}
              dica="Distintos, no período."
            />
            <Kpi
              rotulo="Sem saldo suficiente"
              valor={String(resumo.shortageCount)}
              tom={resumo.shortageCount > 0 ? 'bad' : 'ok'}
              dica={
                local
                  ? 'Falta NESTE depósito — pode ser transferência, não compra.'
                  : 'Falta na empresa — é a lista de compras.'
              }
            />
            <Kpi
              rotulo="Atendidos"
              valor={String(resumo.variantCount - resumo.shortageCount)}
              tom="ok"
              dica="Já têm em casa tudo o que foi prometido."
            />
          </FaixaDeKpis>
        ) : null
      }
      colunas={local ? COLUNAS_LOCAIS : COLUNAS}
      linhas={envelope?.rows ?? []}
      chaveDaLinha={(linha) => linha.variantId}
      agrupamentos={AGRUPAMENTOS}
      agrupamentoAtivo={agrupamento}
      aoTrocarAgrupamento={trocarAgrupamento}
      tomDaLinha={(linha) => (linha.sufficient ? 'neutro' : 'bad')}
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

/**
 * Verde só quando NADA falta. Cobertura de 99% com um item faltando ainda é um
 * pedido que não sai inteiro — pintar de verde diria ao operador que está
 * resolvido.
 */
function coberturaEmTom(orcados: number, faltando: number) {
  if (orcados === 0) return 'neutro' as const
  if (faltando === 0) return 'ok' as const
  return faltando / orcados > 0.2 ? ('bad' as const) : ('warn' as const)
}

function quantidade(texto: string): string {
  const numero = Number(texto)
  return Number.isFinite(numero) ? formatQuantidade(numero) : texto
}

const AGRUPAMENTOS: readonly AgrupamentoDeRelatorio<QuoteVsStockRowDto>[] = [
  {
    id: 'sufficient',
    rotulo: 'Atende / falta',
    chave: (linha) => (linha.sufficient ? ATENDE : FALTA),
    // Falta primeiro: é o grupo que gera trabalho.
    ordem: [FALTA, ATENDE],
    tom: (chave) => (chave === FALTA ? 'bad' : 'ok'),
  },
]

function somaDeQuantidade(campo: (linha: QuoteVsStockRowDto) => string) {
  return (linhas: readonly QuoteVsStockRowDto[]) => {
    const total = somar(linhas, (linha) => numeroDaQuantidade(campo(linha)))
    return total === null ? '' : formatQuantidade(total)
  }
}

/** Whitelist do contrato: `shortageQuantity`, `quotedQuantity`, `stockQuantity`, `description`. */
function colunas(local: boolean): ColunaDeRelatorio<QuoteVsStockRowDto>[] {
  return [
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
      soma: somaDeQuantidade((linha) => linha.quotedQuantity),
    },
    {
      id: 'stockQuantity',
      titulo: 'Em estoque',
      ordenaPor: 'stockQuantity',
      numerica: true,
      celula: (linha) => quantidade(linha.stockQuantity),
      soma: somaDeQuantidade((linha) => linha.stockQuantity),
    },
    {
      id: 'shortageQuantity',
      // Só é lista de COMPRAS quando a falta é da empresa: no recorte por
      // depósito, o que falta aqui pode estar sobrando no outro.
      titulo: local ? 'Falta aqui' : 'A comprar',
      ordenaPor: 'shortageQuantity',
      numerica: true,
      celula: (linha) =>
        linha.sufficient ? (
          <span aria-hidden="true">—</span>
        ) : (
          <span className="text-destructive">{quantidade(linha.shortageQuantity)}</span>
        ),
      texto: (linha) => (linha.sufficient ? '' : quantidade(linha.shortageQuantity)),
      soma: somaDeQuantidade((linha) => linha.shortageQuantity),
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
      celula: (linha) => (linha.sufficient ? 'sim' : <span className="text-destructive">não</span>),
      texto: (linha) => (linha.sufficient ? 'sim' : 'não'),
    },
  ]
}

const COLUNAS = colunas(false)
const COLUNAS_LOCAIS = colunas(true)
