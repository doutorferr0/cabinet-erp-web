import type { StockValuationRowDto } from '@/api/gerado'
import { useDepositos } from '@/data/estoque-api'
import { useLookupOptions } from '@/data/lookups-api'
import {
  type ConsultaDeEstoqueValorizado,
  recorteDoEnvelope,
  useEstoqueValorizado,
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
 * quer dizer que o valor lá em cima não significa nada. Por isso ele é um KPI
 * com a dica ao lado, e não uma nota de rodapé.
 *
 * ## Agrupar por DEPÓSITO não existe, e não é esquecimento (web#493 · D25)
 *
 * A issue pedia a quebra por depósito. `StockValuationRowDto` não tem depósito:
 * ele é RECORTE (`?warehouseId=`, ecoado no envelope), não campo de linha — é o
 * mesmo motivo do aviso do eco que a moldura já desenhava. Agrupar por ele
 * exigiria campo novo no DTO, o que é PR de contrato.
 *
 * As quebras entregues usam campos que a linha TEM: tipo de produto e a
 * comparação com o mínimo. O seletor recebe depósito de graça no dia em que o
 * contrato publicar o campo.
 *
 * ## "Custo médio" e "variação no mês" também não existem
 *
 * O enum de `valuationBasis` só tem `sale_price`: um KPI chamado custo médio
 * calculado sobre preço de VENDA seria um número certo com nome errado. E não há
 * dado histórico em canto nenhum do envelope — variação exigiria uma segunda
 * apuração que o contrato não publica.
 *
 * No lugar deles, dois números que saem do `summary` sem inventar nada: o VALOR
 * MÉDIO POR ITEM (com a base dita na dica) e o ABAIXO DO MÍNIMO, que é o que
 * decide compra.
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
  const [agrupamento, setAgrupamento] = useState<string | null>(null)

  const depositos = useDepositos()
  const tipos = useLookupOptions('tipoProduto')
  const relatorio = useEstoqueValorizado(consulta)

  // Todo filtro volta para a página 1: a página 7 de um recorte não existe no
  // recorte seguinte, e o operador leria "nenhum item" com filtro que tem itens.
  function trocar(mudanca: Partial<ConsultaDeEstoqueValorizado>) {
    setConsulta((atual) => ({ ...atual, ...mudanca, page: 1 }))
  }

  // Agrupar é do CLIENTE — o contrato não publica `groupBy`. Então a quebra pede
  // o máximo que cabe numa resposta, e a moldura diz quando o teto cortou.
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
    <MolduraDeRelatorio<StockValuationRowDto>
      titulo="Estoque Valorizado"
      contexto={
        envelope
          ? `Foto de ${formatInstanteBR(envelope.asOf)} — a preço de venda.`
          : 'Quanto vale o que está em casa, agora.'
      }
      baseDoArquivo="estoque-valorizado"
      filtros={
        <>
          <EscolhaDeDeposito
            depositos={depositos.data ?? []}
            valor={consulta.warehouseId}
            aoTrocar={(warehouseId) => trocar({ warehouseId })}
          />

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
          <FiltroDeMarcar
            rotulo="Só abaixo do mínimo"
            marcado={consulta.belowMinimumOnly}
            aoTrocar={(belowMinimumOnly) => trocar({ belowMinimumOnly })}
          />
        </>
      }
      kpis={
        resumo ? (
          <FaixaDeKpis>
            {/*
              O que qualifica o total é quanto ficou de FORA dele. Com
              `withoutPriceCount` em zero a soma cobre o recorte; acima disso o
              número é um PISO, e a dica diz por quanto. O tom fica neutro de
              propósito: o valor do estoque não é um número ruim por haver item
              sem preço — quem é ruim é a cobertura, e ela está escrita.
            */}
            <Kpi
              rotulo="Valor do estoque"
              valor={formatMoneyBRL(resumo.valueCents)}
              dica={
                resumo.withoutPriceCount > 0
                  ? `${resumo.withoutPriceCount} ${resumo.withoutPriceCount === 1 ? 'item ficou de fora' : 'itens ficaram de fora'} por não ter preço.`
                  : 'Todos os itens do recorte têm preço — a soma cobre o recorte inteiro.'
              }
            />
            <Kpi
              rotulo="SKUs"
              valor={String(resumo.itemCount)}
              dica="Variantes no recorte — o denominador do valor médio."
            />
            <Kpi
              rotulo="Valor médio por item"
              valor={
                resumo.itemCount > 0
                  ? formatMoneyBRL(Math.round(resumo.valueCents / resumo.itemCount))
                  : '—'
              }
              dica="A preço de venda — é a única base que o contrato publica hoje."
            />
            <Kpi
              rotulo="Abaixo do mínimo"
              valor={String(resumo.belowMinimumCount)}
              tom={resumo.belowMinimumCount > 0 ? 'warn' : 'neutro'}
              dica="Repor antes de faltar."
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
      tomDaLinha={(linha) => (linha.belowMinimum ? 'warn' : 'neutro')}
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

/** O TIPO nulo é caso REAL: o cadastro mínimo do legado não exigia tipo. */
const SEM_TIPO = 'Sem tipo'

const AGRUPAMENTOS: readonly AgrupamentoDeRelatorio<StockValuationRowDto>[] = [
  {
    id: 'productGroup',
    rotulo: 'Tipo de produto',
    chave: (linha) => linha.productGroup ?? SEM_TIPO,
    // Sem `ordem`: os grupos saem na ordem de aparição, que é a ordem que o
    // servidor mandou. Ordenar por nome aqui desfaria o `sortBy` que o operador
    // acabou de clicar no cabeçalho.
  },
  {
    id: 'belowMinimum',
    rotulo: 'Abaixo do mínimo',
    chave: (linha) => (linha.belowMinimum ? 'Abaixo do mínimo' : 'Dentro do mínimo'),
    ordem: ['Abaixo do mínimo', 'Dentro do mínimo'],
    tom: (chave) => (chave === 'Abaixo do mínimo' ? 'warn' : 'neutro'),
  },
]

/**
 * As colunas. `ordenaPor` só nas quatro da whitelist do contrato (`valueCents`,
 * `quantity`, `minStock`, `description`) — cabeçalho clicável fora dela seria um
 * botão que responde 400.
 *
 * `soma` só onde somar significa algo: saldo e valor. Mínimo cadastrado e preço
 * unitário não somam — um "total de preços unitários" é um número sem pergunta.
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
    // Traço em vez de vazio para a coluna não parecer quebrada.
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
    soma: (linhas) => {
      const total = somar(linhas, (linha) => linha.valueCents)
      // Nulo é grupo INTEIRO sem preço — "R$ 0,00" afirmaria que ele não vale
      // nada, quando o que se sabe é que não se sabe.
      return total === null ? '—' : formatMoneyBRL(total)
    },
  },
  {
    id: 'belowMinimum',
    titulo: 'Abaixo do mínimo',
    celula: (linha) =>
      linha.belowMinimum ? (
        <span className="text-warn">sim</span>
      ) : (
        <span aria-hidden="true">—</span>
      ),
    // `celula` devolve marcação: sem `texto`, o CSV sairia com `[object Object]`.
    texto: (linha) => (linha.belowMinimum ? 'sim' : ''),
  },
]
