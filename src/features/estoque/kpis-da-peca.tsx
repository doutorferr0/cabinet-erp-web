import type { StockMovementDto } from '@/api/gerado'
import { FaixaDeKpi, KpiTile } from '@/components/cabinet/kpi-tile'
import { useReposicaoDeEstoque } from '@/data/compras-api'
import { CHAVES_ESTOQUE, fetcherDoKardex } from '@/data/estoque-api'
import { formatInstanteBR, formatQuantidade } from '@/lib/formatters'
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
 * ## O cartão é o `KpiTile` do D11 — este arquivo só sabe o que "sem dado" quer dizer
 *
 * A faixa nasceu aqui com cartão próprio porque o `KpiTile` ainda não existia
 * na base; ele chegou (`design/d11-kpi`), e a tela passou a COMPOR. O que
 * sobrou de local é a única regra que a peça compartilhada não pode ter:
 * **ausência vira frase, nunca zero.** Zero é uma afirmação — "nada está
 * reservado" —, e é a afirmação que faz o operador vender o que já está
 * prometido. Um `KpiTile` com `valor={0}` diria exatamente isso.
 *
 * O `valor` do tile é `ReactNode`, então o "sem dado" entra como texto no
 * degrau `.t-meta`: frase é Inter, e um traço em mono 20px se leria como
 * número.
 *
 * O tint vem por ASSUNTO — saldo é informação (sky), reserva é compromisso já
 * assumido (sand), disponível é o que se pode vender (mint) e o último
 * movimento é identidade de um registro (lilac). O `nth-child` do mockup é
 * conveniência de página estática; cor por posição deixa de significar no dia
 * em que um cartão muda de lugar.
 */
function Cartao({
  rotulo,
  valor,
  apoio,
  tint,
}: {
  rotulo: string
  /** Já formatado, ou `null` para “sem dado” — que NUNCA é zero. */
  valor: string | null
  apoio: string
  tint: 'sky' | 'sand' | 'mint' | 'lilac'
}) {
  return (
    // Sem `data-slot` próprio: o `{...props}` do tile vem DEPOIS do dele, e um
    // valor daqui apagaria a marca `kpi-tile` que a peça usa para se
    // identificar. Quem marca a região desta tela é a faixa, e ela é minha.
    <KpiTile
      rotulo={rotulo}
      tint={tint}
      valor={valor === null ? <span className="t-meta">sem dado</span> : valor}
      nota={apoio}
    />
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
    // A faixa é a `FaixaDeKpi` do D11: o teto de quatro, o `auto-fit` e o
    // `--s-3` entre tiles moram nela, não aqui. Uma tela que reimplementasse a
    // fileira teria o quinto KPI passando calado no dia em que alguém o
    // acrescentasse.
    <FaixaDeKpi data-slot="kpis-da-peca">
      <Cartao
        rotulo="Saldo"
        tint="sky"
        valor={saldoConhecido ? formatQuantidade(saldoVisivel) : null}
        apoio={nomeDoDepositoEscolhido ? `em ${ondeAgora}` : 'somando os depósitos'}
      />
      <Cartao
        rotulo="Reservado"
        // Reserva é compromisso já assumido com um cliente: não é erro — ninguém
        // errou —, é o pedaço do saldo que já tem dono.
        tint="sand"
        valor={linha ? formatQuantidade(linha.qtyAllocated) : null}
        apoio={linha ? 'prometido em pedido' : 'a peça não está na reposição'}
      />
      <Cartao
        rotulo="Disponível"
        tint="mint"
        valor={linha ? formatQuantidade(linha.qtyAvailable) : null}
        apoio={linha ? 'físico menos reserva' : 'depende da reserva'}
      />
      <Cartao
        rotulo="Último movimento"
        tint="lilac"
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
    </FaixaDeKpi>
  )
}
