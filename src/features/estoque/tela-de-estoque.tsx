import type { ProductDto, StockLocationDto, StockMovementDto } from '@/api/gerado'
import { VitraDataTable } from '@/components/cabinet/data-table'
import { PageHeader } from '@/components/cabinet/page-header'
import { Painel } from '@/components/cabinet/painel'
import { SearchDialog } from '@/components/cabinet/search-dialog'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { data } from '@/data'
import {
  CHAVES_ESTOQUE,
  fetcherDoKardex,
  nomeDoDeposito,
  saldosDoDeposito,
  somaDosSaldos,
  useDepositos,
  useSaldosDaVariante,
} from '@/data/estoque-api'
import { formatQuantidade } from '@/lib/formatters'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Search } from 'lucide-react'
import { useState } from 'react'

/**
 * MOVIMENTAÇÃO — o estoque visto POR DEPÓSITO.
 *
 * Ocupa o slot `/estoque/movimentacao`, que o grupo Estoque reservava com
 * `TelaNaoCapturada` desde a fase de navegação (transcrição §1, §10 — o menu
 * existe no legado e nunca foi capturado). O que a tela mostra não vem da
 * transcrição, e sim do CONTRATO: `api#79` fase 2 deu ao saldo a dimensão
 * depósito, e é essa dimensão que não tinha onde aparecer.
 *
 * ## A pergunta que a tela responde
 *
 * "Quanto desta peça tem, e ONDE." Antes da `0030` a segunda metade não existia:
 * o saldo era por variante × empresa, e os quatro locais do legado
 * (`EstTp_Codigo` na chave de `Estoque_produto`) somavam num número só. Perda
 * que não se desfaz — por isso a dimensão entrou no cache de saldo, e não numa
 * coluna de relatório.
 *
 * ## Por que o recorte por depósito vale para o SALDO e não para o kardex
 *
 * `ListStockBalances` devolve a lista INTEIRA de depósitos onde a peça esteve —
 * é curta por construção (uma linha por depósito) e a tela a pede no teto do
 * contrato. Recortar esse punhado é honesto: o que some do olho não está em
 * outra página.
 *
 * O kardex é o oposto: append-only, cresce sem teto e é paginado pelo servidor.
 * Filtrar a PÁGINA corrente por depósito responderia "3 movimentos aqui" quando
 * existem 300, e nada na tela distinguiria os dois números. Por isso a dimensão
 * entra nele como COLUNA — o que a página pode afirmar com verdade — e o
 * contrato não publica `locationId` como parâmetro de nenhuma das duas
 * operações. Inventá-lo daria 400 no servidor e verde no mock.
 *
 * ## O nome do depósito é resolvido AQUI
 *
 * Saldo e movimento trazem `locationId` (uuid) e nada de nome, por decisão
 * escrita no contrato: quem recebeu o punhado de linhas pede
 * `ListStockLocations` uma vez. `useDepositos` é essa chamada única, e as duas
 * grades leem dela.
 */
export function TelaDeEstoque() {
  const [produto, setProduto] = useState<ProductDto | null>(null)
  const [variantId, setVariantId] = useState<string | null>(null)
  const [depositoId, setDepositoId] = useState<string | null>(null)
  const [buscaAberta, setBuscaAberta] = useState(false)

  const depositos = useDepositos()
  const saldos = useSaldosDaVariante(variantId)

  // O detalhe traz as VARIANTES, e é por variante que estoque existe: o produto
  // é do grupo, a peça com acabamento e tamanho é o que ocupa prateleira.
  const detalhe = useQuery({
    queryKey: ['produtos', 'detalhe-para-estoque', produto?.id ?? ''],
    enabled: produto !== null,
    queryFn: () => data.produtos.get(produto?.id as string),
  })

  const variantes = detalhe.data?.variantes ?? []
  const linhas = saldosDoDeposito(saldos.data ?? [], depositoId)
  const listaDeDepositos = depositos.data ?? []

  function escolherProduto(linha: ProductDto) {
    setProduto(linha)
    // A variante do produto ANTERIOR não sobrevive à troca: ela pertence a outro
    // catálogo, e o kardex responderia sobre a peça errada sem nada na tela
    // dizendo isso.
    setVariantId(null)
    setBuscaAberta(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        titulo="Movimentação"
        contexto="O saldo da peça em cada depósito, e o histórico que o produziu."
      />

      <div className="flex flex-wrap items-end gap-3 border-rule-strong border-b pb-3">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.06em]">
            Produto
          </span>
          <div className="flex items-center gap-1">
            <span
              className="flex h-9 min-w-64 items-center border-2 border-input bg-card px-2.5 text-sm"
              data-testid="produto-escolhido"
            >
              {produto ? `${produto.code} — ${produto.description}` : 'Nenhum produto escolhido'}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Buscar produto"
              onClick={() => setBuscaAberta(true)}
            >
              <Search className="size-4" />
            </Button>
          </div>
        </div>

        <label className="flex flex-col gap-1">
          <span className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.06em]">
            Variante
          </span>
          <select
            className="h-9 border-2 border-input bg-card px-2.5 text-sm outline-none focus-visible:focus-ring"
            value={variantId ?? ''}
            onChange={(evento) => setVariantId(evento.target.value || null)}
            disabled={variantes.length === 0}
          >
            <option value="">
              {variantes.length === 0 ? 'Escolha um produto' : 'Escolha a variante'}
            </option>
            {variantes.map((variante) => (
              <option key={variante.id} value={variante.id ?? ''}>
                {[variante.acabamento, variante.tamanho].filter(Boolean).join(' · ') || 'Padrão'}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.06em]">
            Depósito
          </span>
          <select
            className="h-9 border-2 border-input bg-card px-2.5 text-sm outline-none focus-visible:focus-ring"
            value={depositoId ?? ''}
            onChange={(evento) => setDepositoId(evento.target.value || null)}
          >
            <option value="">Todos os depósitos</option>
            {listaDeDepositos.map((deposito) => (
              <option key={deposito.id} value={deposito.id}>
                {deposito.name}
                {deposito.active ? '' : ' (inativo)'}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Painel titulo="Saldo por depósito" modulo="estoque">
        {variantId === null ? (
          <p className="text-muted-foreground text-sm">
            Escolha o produto e a variante para ver onde a peça está.
          </p>
        ) : saldos.isPending ? (
          <p className="text-muted-foreground text-sm">Carregando o saldo…</p>
        ) : linhas.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {depositoId === null
              ? 'Esta variante nunca esteve em depósito nenhum.'
              : 'Esta variante nunca esteve neste depósito.'}
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Depósito</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead>Atualizado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((saldo) => (
                  <TableRow key={saldo.locationId}>
                    <TableCell>{nomeDoDeposito(listaDeDepositos, saldo.locationId)}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatQuantidade(saldo.qty)}
                    </TableCell>
                    <TableCell>{formatarInstante(saldo.updatedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="mt-2 text-muted-foreground text-sm">
              {depositoId === null ? 'Total na empresa: ' : 'Total no depósito: '}
              <span className="font-mono">{formatQuantidade(somaDosSaldos(linhas))}</span>
            </p>
          </>
        )}
      </Painel>

      <Painel titulo="Kardex" modulo="estoque">
        {variantId === null ? (
          <p className="text-muted-foreground text-sm">
            O histórico é da variante — escolha uma acima.
          </p>
        ) : (
          <>
            <p className="mb-2 text-muted-foreground text-sm">
              O histórico é da variante INTEIRA, em todos os depósitos: a coluna diz onde cada
              movimento aconteceu, e `Saldo após` é o do depósito daquela linha — não o total da
              empresa.
            </p>
            <VitraDataTable<StockMovementDto>
              columns={colunasDoKardex(listaDeDepositos)}
              queryKey={CHAVES_ESTOQUE.kardex(variantId)}
              fetcher={fetcherDoKardex(variantId)}
              rowNumbers={false}
              busca={false}
            />
          </>
        )}
      </Painel>

      <SearchDialog<ProductDto>
        open={buscaAberta}
        onOpenChange={setBuscaAberta}
        title="Buscar produto"
        columns={COLUNAS_DE_PRODUTO}
        queryKey={['produtos', 'busca-para-estoque']}
        fetcher={(state) => data.produtos.list(state)}
        onSelect={escolherProduto}
      />
    </div>
  )
}

/**
 * `timestamptz` do contrato → data e hora legíveis.
 *
 * Local em vez de `src/lib/formatters.ts` porque `formatDateBR` de lá espera
 * `YYYY-MM-DD` e parte a string — dar-lhe um instante ISO devolveria o dia
 * grudado na hora. Quem precisar disto numa segunda tela promove; uma tela só
 * não justifica mexer no módulo que oito telas importam.
 */
function formatarInstante(iso: string): string {
  const quando = new Date(iso)
  if (Number.isNaN(quando.getTime())) return iso
  return quando.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

/**
 * Colunas do kardex. `accessorKey` em inglês porque é ele que viaja como
 * `sortBy` — a whitelist do servidor é `occurredAt`, `delta` e `reason`, e
 * traduzir a chave quebraria a ordenação com 400 só ao clicar no cabeçalho.
 *
 * `locationId` NÃO ordena, e por isso não tem `accessorKey` de ordenação: é uuid,
 * está fora da whitelist, e ordem de uuid não põe nada em ordem para quem lê.
 */
function colunasDoKardex(depositos: readonly StockLocationDto[]) {
  const colunas: ColumnDef<StockMovementDto>[] = [
    {
      accessorKey: 'occurredAt',
      header: 'Quando',
      cell: ({ row }) => formatarInstante(row.original.occurredAt),
    },
    {
      id: 'locationId',
      header: 'Depósito',
      enableSorting: false,
      cell: ({ row }) => nomeDoDeposito(depositos, row.original.locationId),
    },
    {
      accessorKey: 'reason',
      header: 'Motivo',
    },
    {
      accessorKey: 'delta',
      header: 'Movimento',
      cell: ({ row }) => (
        <span className="font-mono">
          {row.original.delta > 0 ? '+' : ''}
          {formatQuantidade(row.original.delta)}
        </span>
      ),
    },
    {
      id: 'balanceAfter',
      header: 'Saldo após',
      enableSorting: false,
      cell: ({ row }) => (
        <span className="font-mono">{formatQuantidade(row.original.balanceAfter)}</span>
      ),
    },
  ]
  return colunas
}

/** As três colunas que o `ProductDto` garante — as demais são `Proposto` e podem vir nulas. */
const COLUNAS_DE_PRODUTO: ColumnDef<ProductDto>[] = [
  { accessorKey: 'code', header: 'Código' },
  { accessorKey: 'description', header: 'Descrição' },
]
