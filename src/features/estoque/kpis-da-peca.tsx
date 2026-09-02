import type { StockMovementDto } from '@/api/gerado'
import { useReposicaoDeEstoque } from '@/data/compras-api'
import { CHAVES_ESTOQUE, fetcherDoKardex } from '@/data/estoque-api'
import { formatInstanteBR, formatQuantidade } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'

/**
 * OS QUATRO NÚMEROS DA PEÇA — saldo, reservado, disponível e último movimento.
 *
 * ## Por que dois deles vêm de COMPRAS
 *
 * `StockBalanceDto` tem `qty` e mais nada: o cache de saldo guarda o físico, e
 * a coluna de reserva (`stock_balances.quantity_allocated`, migração `0035`)
 * **não sai por nenhuma operação de estoque**. Quem a publica é
 * `GET /api/purchases/stock-replenishment`, que devolve `qtyOnHand`,
 * `qtyAllocated` e `qtyAvailable` por variante — a consulta que o comprador usa
 * para não repor peça já prometida a um cliente.
 *
 * Usar a consulta de compras aqui é reaproveitar o número que já existe, e não
 * refazer a conta: `disponível = físico − reservado` é subtração de uma linha,
 * e é exatamente por isso que a tela **não** a faz. Dois lugares calculando o
 * mesmo número divergem no dia em que a regra do servidor mudar, e o que
 * diverge é sempre o da tela.
 *
 * ## O que acontece quando ela não responde
 *
 * A rota é servida pelo backend (está em `ROTAS_DO_BACKEND`) e pelo mock, mas
 * pode falhar como qualquer outra. Falha e ausência viram **“sem dado”**, nunca
 * zero: zero é uma afirmação — "nada está reservado" —, e é a afirmação que faz
 * o operador vender o que já está prometido.
 *
 * Ausência tem um caso legítimo e frequente: a consulta de reposição lista o
 * que a empresa REPÕE, e uma variante fora dela simplesmente não tem linha.
 *
 * ## O último movimento é uma consulta de UMA linha
 *
 * O kardex da grade é paginado e ordenado pelo operador — se ele ordenar por
 * `delta`, a primeira linha da página deixa de ser a mais recente. O KPI pede a
 * própria página de um item, ordenada por `occurredAt` desc, e por isso não
 * depende do que a grade abaixo esteja mostrando.
 */

/**
 * ## O CARTÃO 2.0, e os dois tokens que ele teve de pedir emprestado
 *
 * A régua §Hierarquia da rodada tem 11 degraus e nenhum deles é o número de um
 * KPI: `--t-dado` é 12,5px, a medida de uma célula de grade, e a auditoria §2.4
 * pede **mono 24px** aqui. O caminho que a issue-mãe manda seguir quando o
 * token falta é `var(--x, <fallback>)` mais um recado na #469 — e é o que estas
 * duas linhas fazem, apontando para `--t-kpi-valor` (que D1/D11 ainda vão
 * criar) com o 24px do mockup como fallback. Escrever `text-[24px]` fixaria a
 * medida em vinte telas e faria o D30 reprovar o grep.
 *
 * O `NumeroHeroi` saiu daqui por outro motivo: ele é `text-[2.375rem]` na face
 * **display condensada**, que é a voz da 1.x — a 2.0 diz que número é mono, sem
 * exceção, e D11 vai reescrevê-lo como `KpiTile`. Compor um componente que está
 * marcado para virar outra coisa é herdar a versão errada.
 *
 * O tint NÃO é decoração: ele diz de que natureza é o número. Saldo é
 * informação (sky), reserva é compromisso já assumido (sand), disponível é o
 * que se pode vender (mint) e o último movimento é identidade de um registro
 * (lilac). Por isso a cor vem por ASSUNTO e não por posição, ao contrário do
 * `nth-child` do mockup, que é conveniência de página estática.
 */
type TintaDoCartao = 'sky' | 'sand' | 'mint' | 'lilac'

const FUNDO: Record<TintaDoCartao, string> = {
  sky: 'bg-[var(--tint-sky)]',
  sand: 'bg-[var(--tint-sand)]',
  mint: 'bg-[var(--tint-mint)]',
  lilac: 'bg-[var(--tint-lilac)]',
}

function Cartao({
  rotulo,
  valor,
  apoio,
  tinta,
}: {
  rotulo: string
  /** Já formatado, ou `null` para “sem dado” — que NUNCA é zero. */
  valor: string | null
  apoio: string
  tinta: TintaDoCartao
}) {
  return (
    <div
      data-slot="kpi-da-peca"
      // Borda de tinta + `--hard-1` + tint: as três marcas do KPI no mockup. A
      // faixa é o ÚNICO lugar da tela com sombra dura (§Hierarquia) — os
      // painéis abaixo ficam com a quieta, senão nada tem prioridade.
      className={cn(
        'flex min-w-40 flex-1 flex-col gap-1 rounded-card border-[1.5px] border-[var(--n-900)] p-4 shadow-[var(--hard-1)]',
        FUNDO[tinta],
      )}
    >
      {/* n-700 em vez de n-500: a régua abre essa exceção só no KPI, onde o
          rótulo está sobre tint e o contraste do n-500 cairia abaixo de 4,5:1. */}
      <span className="t-rotulo text-[var(--n-700)]">{rotulo}</span>
      {valor === null ? (
        // "Sem dado" não é um número apagado: é uma frase, e frase é Inter.
        // Um traço em mono 24px se leria como valor.
        <span className="t-meta">sem dado</span>
      ) : (
        <span className="t-dado" style={{ fontSize: 'var(--t-kpi-valor, 24px)' }}>
          {valor}
        </span>
      )}
      <span className="t-meta">{apoio}</span>
    </div>
  )
}

export function KpisDaPeca({
  variantId,
  descricaoDoProduto,
  depositoId,
  nomeDoDepositoEscolhido,
  saldoVisivel,
  saldoConhecido,
}: {
  variantId: string
  /**
   * O `q` da consulta de reposição — e é a DESCRIÇÃO, não o código.
   *
   * Medido contra o mock e conferido no contrato: `PurchaseReplenishmentRowDto`
   * publica `description`, `finish` e `size`, e nenhum código — o filtro casa o
   * que a linha carrega. Mandar `PD-1001` devolvia lista vazia, e a tela
   * mostrava “a peça não está na reposição” para uma peça que está: um "sem
   * dado" que parece resposta e é pergunta mal feita.
   */
  descricaoDoProduto: string
  /** `null` = a empresa inteira, que é o padrão das duas consultas. */
  depositoId: string | null
  nomeDoDepositoEscolhido: string | null
  /** A soma das linhas de saldo que a grade abaixo está mostrando. */
  saldoVisivel: number
  /** `false` enquanto o saldo não chegou ou falhou — aí o KPI diz “sem dado”. */
  saldoConhecido: boolean
}) {
  const reposicao = useReposicaoDeEstoque({
    q: descricaoDoProduto,
    ...(depositoId ? { depositoId } : {}),
    pageSize: 50,
  })

  // A consulta casa o PRODUTO pela descrição e devolve as variantes dele; a
  // linha desta peça é achada pelo ID, não pela posição — descrição não é chave,
  // e dois produtos podem compartilhar a primeira metade do nome.
  const linha = reposicao.data?.rows?.find((r) => r.variantId === variantId) ?? null

  const ultimo = useQuery({
    // Debaixo da chave do KARDEX de propósito: `useLancarMovimento` invalida
    // `CHAVES_ESTOQUE.kardex(id)`, e a invalidação do TanStack casa por
    // PREFIXO. Uma chave irmã (`['estoque','ultimo-movimento',id]`) ficaria
    // fora dela, e o KPI mostraria o movimento anterior ao que o operador
    // acabou de lançar — a pior hora para um número velho.
    queryKey: [...CHAVES_ESTOQUE.kardex(variantId), 'ultimo'] as const,
    queryFn: () =>
      fetcherDoKardex(variantId)({
        q: '',
        sort: { id: 'occurredAt', desc: true },
        page: 1,
        pageSize: 1,
      }),
  })
  const movimento: StockMovementDto | null = ultimo.data?.rows?.[0] ?? null

  const ondeAgora = nomeDoDepositoEscolhido ?? 'na empresa'

  return (
    // Quatro é o teto da faixa (Mercury), e `auto-fit` é o que faz os cartões
    // reflowarem sem `@media` — regra da rodada. `gap-4` é `--s-4`.
    <div data-slot="kpis-da-peca" className="flex flex-wrap gap-4">
      <Cartao
        rotulo="Saldo"
        tinta="sky"
        valor={saldoConhecido ? formatQuantidade(saldoVisivel) : null}
        apoio={nomeDoDepositoEscolhido ? `em ${ondeAgora}` : 'somando os depósitos'}
      />
      <Cartao
        rotulo="Reservado"
        // Reserva é compromisso já assumido com um cliente: não é erro — ninguém
        // errou —, é o pedaço do saldo que já tem dono.
        tinta="sand"
        valor={linha ? formatQuantidade(linha.qtyAllocated) : null}
        apoio={linha ? 'prometido em pedido' : 'a peça não está na reposição'}
      />
      <Cartao
        rotulo="Disponível"
        tinta="mint"
        valor={linha ? formatQuantidade(linha.qtyAvailable) : null}
        apoio={linha ? 'físico menos reserva' : 'depende da reserva'}
      />
      <Cartao
        rotulo="Último movimento"
        tinta="lilac"
        valor={
          movimento ? `${movimento.delta > 0 ? '+' : ''}${formatQuantidade(movimento.delta)}` : null
        }
        apoio={
          movimento
            ? formatInstanteBR(movimento.occurredAt)
            : ultimo.isPending
              ? 'carregando…'
              : 'esta peça nunca se moveu'
        }
      />
    </div>
  )
}
