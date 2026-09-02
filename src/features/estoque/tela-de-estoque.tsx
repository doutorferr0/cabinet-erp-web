import type { ProductDto, StockLocationDto, StockMovementDto } from '@/api/gerado'
import { AvisoDeCobertura } from '@/components/cabinet/aviso-de-cobertura'
import { VitraDataTable } from '@/components/cabinet/data-table'
import { FalhaDoPainel } from '@/components/cabinet/falha-do-painel'
import { PageHeader } from '@/components/cabinet/page-header'
import { Painel } from '@/components/cabinet/painel'
import { SearchDialog } from '@/components/cabinet/search-dialog'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Label } from '@/components/ui/label'
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
import { EscolherPeca, nomeDaVariante } from '@/features/estoque/escolher-peca'
import { KpisDaPeca } from '@/features/estoque/kpis-da-peca'
import { LancarMovimento, type ModoDeLancamento } from '@/features/estoque/lancar-movimento'
import { formatInstanteBR, formatQuantidade } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { PackageSearch } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

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
 * ## O DESENHO 2.0 (D24), e o que ele trocou de lugar
 *
 * A tela era uma barra de filtros cinza com três botões desabilitados embaixo:
 * o operador chegava para lançar e a primeira coisa que via era o que não podia
 * fazer. A ordem agora é a da pergunta —
 *
 * 1. **a peça**, num campo grande com o resultado da busca INLINE (`EscolherPeca`);
 * 2. **os quatro números** dela (`KpisDaPeca`) — saldo, reservado, disponível,
 *    último movimento;
 * 3. **onde ela está** (grade de saldo por depósito);
 * 4. **como chegou até aí** (kardex).
 *
 * O segmented Entrada · Saída · Ajuste está **sempre habilitado** e abre a
 * gaveta; a escolha da peça, quando falta, acontece DENTRO dela. A lição do
 * botão desabilitado não se perdeu: quem recusa agora é o `Lançar` do rodapé da
 * gaveta, com a razão escrita ao lado.
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
 * ## As TRÊS escritas moram aqui, e a quarta não existe
 *
 * Entrada, saída e ajuste são a mesma operação do contrato
 * (`CreateStockMovement`) com sinais diferentes — não há tipo de movimento no
 * corpo. Elas ficam nesta tela, e não em telas próprias, porque o contexto que
 * exigem (variante e depósito) é o que a tela acabou de escolher: uma tela
 * separada faria o operador escolher a peça duas vezes, e a segunda escolha é
 * onde ele erra a peça. A gaveta é `lancar-movimento.tsx`.
 *
 * **A transferência entre depósitos NÃO está aqui, e a ausência é medida.** O
 * api tem o par atômico pronto desde a migração `0042`
 * (`src/modules/estoque/transferencia.ts`), com documento próprio, e ele **não
 * tem rota** — nenhuma operação do contrato o alcança. Fazer a transferência
 * com dois `POST` daqui reintroduziria, do lado de fora, exatamente o defeito
 * que aquele documento existe para eliminar: falha entre um e outro some com a
 * peça, e as duas pontas ficariam ligadas só pelo `reason`, que é texto livre.
 * Quem vigia isso é `src/data/familia-de-estoque.test.ts`, que fica vermelho no
 * dia em que o contrato publicar a operação.
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
  // `null` = gaveta fechada. O MODO é o estado, e não um booleano por botão: os
  // três são a mesma gaveta, e três booleanos abririam a porta para dois
  // abertos ao mesmo tempo.
  const [modo, setModo] = useState<ModoDeLancamento | null>(null)
  const campoDaPeca = useRef<HTMLInputElement | null>(null)
  const idDoDeposito = useId()

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
  const varianteEscolhida = variantes.find((v) => v.id === variantId) ?? null
  const nomeDoDepositoEscolhido =
    depositoId === null ? null : nomeDoDeposito(listaDeDepositos, depositoId)

  // O campo da peça recebe o foco quando a tela abre vazia — é a pergunta, e o
  // cursor já está nela. Uma vez só: refocar a cada render tiraria o operador
  // de onde ele acabou de clicar.
  useEffect(() => {
    campoDaPeca.current?.focus()
  }, [])

  function escolherProduto(linha: ProductDto) {
    setProduto(linha)
    // A variante do produto ANTERIOR não sobrevive à troca: ela pertence a outro
    // catálogo, e o kardex responderia sobre a peça errada sem nada na tela
    // dizendo isso.
    setVariantId(null)
    setBuscaAberta(false)
  }

  function limparProduto() {
    setProduto(null)
    setVariantId(null)
  }

  const seletor = (
    <EscolherPeca
      produto={produto}
      variantes={variantes}
      variantId={variantId}
      aoEscolherProduto={escolherProduto}
      aoLimparProduto={limparProduto}
      aoEscolherVariante={setVariantId}
    />
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titulo="Movimentação"
        contexto="O saldo da peça em cada depósito, e o histórico que o produziu."
      />

      {/* A PEÇA EM FOCO é um card, e é a única fronteira desta região: campo e
          campo se separam por espaço, o rodapé de ações por uma hairline. Nunca
          duas ferramentas na mesma borda. */}
      <div className="flex flex-col gap-4 rounded-card border border-[var(--n-300)] bg-card p-4 shadow-[var(--hard-soft)]">
        <div className="flex flex-wrap items-start gap-4">
          <EscolherPeca
            className="flex-1"
            produto={produto}
            variantes={variantes}
            variantId={variantId}
            aoEscolherProduto={escolherProduto}
            aoLimparProduto={limparProduto}
            aoEscolherVariante={setVariantId}
            aoBuscarNaJanela={() => setBuscaAberta(true)}
            inputRef={campoDaPeca}
          />

          <div className="flex flex-col gap-1">
            <Label htmlFor={idDoDeposito}>Depósito</Label>
            <select
              id={idDoDeposito}
              className="t-ui h-9 rounded-control border-2 border-input bg-card px-2.5 outline-none focus-visible:focus-ring"
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
          </div>
        </div>

        {/* AS TRÊS ESCRITAS, sempre alcançáveis. O grupo é um `segmented`: três
            teclas encostadas, sem gutter entre elas, porque são as faces de UMA
            decisão — para que lado a peça anda. */}
        <div className="flex items-center gap-3 border-[var(--n-200)] border-t pt-4">
          <span className="t-rotulo hidden sm:inline">Lançar</span>
          {/* SEGMENTED: uma moldura de tinta em volta dos três, e hairline entre
              eles. As teclas não têm borda própria — duas bordas encostadas
              seriam duas ferramentas na mesma fronteira, e é o que fazia o 1.x
              parecer um xadrez. */}
          <fieldset className="flex overflow-hidden rounded-control border-[1.5px] border-[var(--n-900)] shadow-[var(--key-1)] [&>button]:rounded-none [&>button]:border-0 [&>button]:shadow-none [&>button+button]:border-[var(--n-900)] [&>button+button]:border-l">
            {/* `fieldset`+`legend` em vez de `role="group"`+`aria-label`: é o
                elemento que já significa "estes controles são uma decisão só", e
                a legenda fica no acessível sem ocupar a linha (sr-only é
                absoluto, então o flex das três teclas não muda). */}
            <legend className="sr-only">Lançar movimento</legend>
            <Button type="button" variant="outline" onClick={() => setModo('entrada')}>
              Entrada
            </Button>
            <Button type="button" variant="outline" onClick={() => setModo('saida')}>
              Saída
            </Button>
            <Button type="button" variant="outline" onClick={() => setModo('ajuste')}>
              Ajuste
            </Button>
          </fieldset>
        </div>
      </div>

      {variantId === null ? (
        // O VAZIO da tela: ícone, a frase que diz o que fazer e o campo já em
        // foco. Não é erro nem falta de dado — é o estado inicial de uma tela
        // que responde sobre UMA peça, e sem peça não há o que responder.
        <Empty>
          <EmptyHeader>
            <EmptyMedia>
              <PackageSearch aria-hidden="true" className="size-8 text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle>Escolha uma peça</EmptyTitle>
            <EmptyDescription>
              Digite três letras do código ou da descrição no campo acima e escolha a variante — o
              saldo, a reserva e o histórico são dela.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <KpisDaPeca
            variantId={variantId}
            descricaoDoProduto={produto?.description ?? ''}
            depositoId={depositoId}
            nomeDoDepositoEscolhido={nomeDoDepositoEscolhido}
            saldoVisivel={somaDosSaldos(linhas)}
            saldoConhecido={saldos.isSuccess}
          />

          <Painel titulo="Saldo por depósito" modulo="estoque">
            {saldos.isPending ? (
              <p className="t-meta">Carregando o saldo…</p>
            ) : /* Sem este ramo a falha caía no vazio abaixo, e o vazio afirma o passado:
                  "nunca esteve em depósito nenhum" para uma peça que pode estar em três. O
                  `api-provider.ts` escreve a regra em comentário — falha do servidor nunca
                  pode virar lista vazia — e é esta consulta que a quebrava. */
            saldos.isError ? (
              <FalhaDoPainel
                titulo="O saldo não carregou"
                erro={saldos.error}
                aoTentar={() => saldos.refetch()}
              />
            ) : linhas.length === 0 ? (
              <p className="t-meta">
                {depositoId === null
                  ? 'Esta variante nunca esteve em depósito nenhum.'
                  : 'Esta variante nunca esteve neste depósito.'}
              </p>
            ) : (
              <div className="flex flex-col gap-3">
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
                        <TableCell className="t-corpo">
                          {nomeDoDeposito(listaDeDepositos, saldo.locationId)}
                        </TableCell>
                        <TableCell className="t-dado text-right">
                          {formatQuantidade(saldo.qty)}
                        </TableCell>
                        <TableCell className="t-dado">
                          {formatInstanteBR(saldo.updatedAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="t-meta">
                  {depositoId === null ? 'Total na empresa: ' : 'Total no depósito: '}
                  <span className="t-dado">{formatQuantidade(somaDosSaldos(linhas))}</span>
                </p>
                {/* O desenho 2.0 pede quatro colunas aqui — depósito, saldo,
                    reservado e disponível. As duas últimas NÃO existem por
                    depósito em operação nenhuma do contrato: `StockBalanceDto`
                    tem `qty` e mais nada, e `quantity_allocated` só sai
                    agregada por variante, pela consulta de reposição de
                    compras. Preenchê-las aqui daria número inventado com cara
                    de número do servidor. */}
                <AvisoDeCobertura>
                  <p>
                    <strong>Reservado e disponível não são por depósito.</strong> O contrato só os
                    publica somados na variante — é o que os dois cartões acima mostram. Esta grade
                    fica com o saldo FÍSICO de cada local, que é o que o servidor guarda por
                    depósito.
                  </p>
                </AvisoDeCobertura>
              </div>
            )}
          </Painel>

          <Painel titulo="Kardex" modulo="estoque">
            <div className="flex flex-col gap-3">
              <p className="t-meta">
                O histórico é da variante INTEIRA, em todos os depósitos: a coluna diz onde cada
                movimento aconteceu, e “Saldo após” é o do depósito daquela linha — não o total da
                empresa.
              </p>
              <VitraDataTable<StockMovementDto>
                columns={colunasDoKardex(listaDeDepositos)}
                queryKey={CHAVES_ESTOQUE.kardex(variantId)}
                fetcher={fetcherDoKardex(variantId)}
                rowNumbers={false}
                busca={false}
              />
            </div>
          </Painel>
        </>
      )}

      {/* A gaveta abre com ou sem peça: sem ela, o primeiro bloco de dentro é a
          escolha, e o `Lançar` do rodapé é quem recusa — dizendo por quê. */}
      {modo !== null ? (
        <LancarMovimento
          aberto
          modo={modo}
          variantId={variantId}
          depositos={listaDeDepositos}
          // O depósito do FILTRO vira a sugestão: quem estava olhando o
          // showroom quase sempre quer lançar no showroom. `null` (todos os
          // depósitos) vira o padrão da empresa, que é o que o contrato entende
          // por `locationId` ausente.
          depositoSugerido={depositoId}
          seletorDePeca={seletor}
          resumoDaPeca={
            <div className="flex flex-col gap-0.5">
              <Label>Peça</Label>
              <span className="t-corpo">
                <span className="t-dado">{produto?.code}</span> {produto?.description}
              </span>
              {varianteEscolhida ? (
                <span className="t-meta">{nomeDaVariante(varianteEscolhida)}</span>
              ) : null}
            </div>
          }
          onOpenChange={(aberto) => {
            if (!aberto) setModo(null)
          }}
        />
      ) : null}

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
 * O SENTIDO de um movimento — o que o contrato permite afirmar sobre ele.
 *
 * O desenho 2.0 pede decoração "por tipo: entrada mint, saída rose, ajuste
 * sand". **Tipo de movimento não existe no contrato nem no schema**: o corpo de
 * `CreateStockMovement` tem `locationId`, `delta` e `reason`, e o legado
 * guardava a distinção numa coluna (`estoque_log.Elg_operacao`) que a modelagem
 * nova não tem. Um ajuste de +3 e uma entrada de +3 são gravações idênticas.
 *
 * Derivar "ajuste" do `reason` seria pior do que não decorar: o texto é livre, e
 * quem escreve nele não é só esta tela — recebimento de compra, venda e a carga
 * do legado gravam ali sem passar por aqui. A cor sairia certa para os
 * movimentos lançados nesta gaveta e errada para todos os outros, que é a
 * aparência de dado classificado sem a substância.
 *
 * Então a decoração é pelo que o dado diz: **entrou**, **saiu**, ou **não
 * mexeu** (o `delta` zero, que o servidor aceita de propósito). O domínio
 * fechado de motivo está proposto em
 * `docs/harvest/estoque-telas/vocabulario-de-movimento.md` e é mudança de
 * CONTRATO — no dia em que entrar, esta função ganha o terceiro caso de
 * verdade.
 */
export type SentidoDoMovimento = 'entrou' | 'saiu' | 'parado'

export function sentidoDoMovimento(delta: number): SentidoDoMovimento {
  if (delta > 0) return 'entrou'
  if (delta < 0) return 'saiu'
  return 'parado'
}

/**
 * A pílula pastel do desenho 2.0: tint de fundo, ponto na cor do sentido e
 * TEXTO EM TINTA — n-900, um dos três degraus que a régua permite.
 *
 * Pintar o número na cor do sentido é o erro que o 1.x cometia: `--mint-800`
 * sobre `--tint-mint` passa no claro e reprova no escuro, onde a folha inverte e
 * o mix vai para o outro lado. Deixando a cor no PONTO e no fundo, o contraste
 * do que se lê não depende do tema — e quem não distingue as duas tintas lê a
 * palavra, que continua no `sr-only`.
 */
const VOZ_DO_SENTIDO: Record<SentidoDoMovimento, { rotulo: string; fundo: string; ponto: string }> =
  {
    entrou: { rotulo: 'Entrou', fundo: 'bg-[var(--tint-mint)]', ponto: 'bg-[var(--mint-600)]' },
    saiu: { rotulo: 'Saiu', fundo: 'bg-[var(--tint-rose)]', ponto: 'bg-[var(--rose-600)]' },
    parado: {
      rotulo: 'Sem efeito',
      fundo: 'bg-[var(--tint-sand)]',
      ponto: 'bg-[var(--amber-600)]',
    },
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
      // O `tipo` da grade 2.0 (D8) dá o ÍCONE do cabeçalho e a moldura da
      // célula; a `cell` própria continua mandando no conteúdo, que aqui é o
      // instante em pt-BR. Declarar o tipo e manter a célula é o que faz esta
      // grade se parecer com as outras onze sem copiar o desenho delas.
      meta: { tipo: 'data' },
      cell: ({ row }) => (
        <span className="t-dado">{formatInstanteBR(row.original.occurredAt)}</span>
      ),
    },
    {
      id: 'locationId',
      header: 'Depósito',
      enableSorting: false,
      meta: { tipo: 'texto' },
      cell: ({ row }) => nomeDoDeposito(depositos, row.original.locationId),
    },
    {
      accessorKey: 'reason',
      header: 'Motivo',
      meta: { tipo: 'texto' },
    },
    {
      accessorKey: 'delta',
      header: 'Movimento',
      // `numeric` e não `tipo: 'dinheiro'`: alinha à direita como número, sem
      // pedir a moldura de moeda — quantidade não é dinheiro, e a grade
      // procura a coluna de dinheiro para somar o rodapé.
      meta: { numeric: true },
      cell: ({ row }) => {
        const sentido = sentidoDoMovimento(row.original.delta)
        const voz = VOZ_DO_SENTIDO[sentido]
        return (
          // A cor mora no CHIP e não na linha: a linha já é separada por
          // hairline, e pintar a faixa inteira seria a segunda ferramenta na
          // mesma fronteira (§Hierarquia). A faixa lateral de 3px que o mockup
          // desenha é decoração de LINHA, e mora na prop `decoracao` que o D8
          // acrescenta à `VitraDataTable` — reimplementá-la aqui daria duas
          // grades com decorações diferentes no mesmo sistema.
          <span
            data-sentido={sentido}
            className={cn(
              't-dado inline-flex items-center gap-1.5 rounded-[var(--r-pill)] px-2 py-0.5',
              voz.fundo,
            )}
          >
            <span
              aria-hidden="true"
              className={cn('size-1.5 rounded-[var(--r-pill)]', voz.ponto)}
            />
            <span className="sr-only">{voz.rotulo}: </span>
            {row.original.delta > 0 ? '+' : ''}
            {formatQuantidade(row.original.delta)}
          </span>
        )
      },
    },
    {
      id: 'balanceAfter',
      header: 'Saldo após',
      enableSorting: false,
      meta: { numeric: true },
      cell: ({ row }) => (
        // O saldo acumulado é o número que se COMPARA linha a linha — mono
        // tabular e em tinta cheia, sem chip: ele não tem estado, tem valor.
        <span className="t-dado">{formatQuantidade(row.original.balanceAfter)}</span>
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
