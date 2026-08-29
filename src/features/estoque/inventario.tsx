import type { ProductDto } from '@/api/gerado'
import { AvisoDeCobertura } from '@/components/cabinet/aviso-de-cobertura'
import { PageHeader } from '@/components/cabinet/page-header'
import { Painel } from '@/components/cabinet/painel'
import { SearchDialog } from '@/components/cabinet/search-dialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { data } from '@/data'
import { useDepositos } from '@/data/estoque-api'
import {
  type ItemDaContagem,
  diferencaDoItem,
  resumoDaContagem,
  useAcrescentarItem,
  useAplicarContagem,
  useContagem,
} from '@/data/inventario-api'
import { mensagemDoErro } from '@/lib/erros'
import { formatQuantidade } from '@/lib/formatters'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Search, X } from 'lucide-react'
import { useState } from 'react'

/**
 * INVENTÁRIO — abrir a contagem de um depósito, conferir contra o sistema e
 * mandar a diferença como ajuste.
 *
 * ## O ciclo, e onde cada passo é servido
 *
 * Abrir e contar vivem no navegador: o contrato não publica contagem nenhuma
 * (medido em `src/data/inventario-api.ts`, que é a fronteira e explica a marca
 * `spring-pendente`). Aplicar é `CreateStockMovement`, a escrita que já existe —
 * um movimento por linha divergente, com o `delta` que a diferença determinou.
 * O kardex e o saldo por depósito reagem sozinhos, porque o ajuste é movimento
 * como qualquer outro.
 *
 * ## Por que a folha é montada PEÇA A PEÇA, e não pelo depósito inteiro
 *
 * A pergunta natural é "traga tudo o que existe neste depósito". **O contrato
 * não a responde**: `ListStockBalances` é `/api/variants/{variantId}/stock-
 * balances`, uma variante por vez, e não há parâmetro de depósito em operação
 * nenhuma da família. Varrer o catálogo inteiro para montar a lista seria a tela
 * fazendo, com N chamadas, a consulta que o servidor não publica — e o número
 * que ela mostrasse dependeria de quantas páginas de produto ela tivesse
 * conseguido ler, que é o pior tipo de total.
 *
 * Então a folha é montada por quem conta: busca a peça, escolhe a variante, e a
 * linha entra com o saldo daquele depósito congelado ao lado. É a contagem
 * cíclica — o modo como inventário grande é feito de verdade — e é honesta com o
 * que o servidor sabe responder.
 *
 * ## O contado aceita ZERO, e isso é o ponto
 *
 * `quantidadeDoTexto`, do lançamento manual, recusa o zero de propósito: lá a
 * direção veio do botão e zero não é movimento. Aqui zero é a resposta mais
 * importante da contagem — "a prateleira está vazia" —, e recusá-la faria o
 * operador deixar a linha em branco, que significa outra coisa (não contei
 * ainda). Por isso o parser é outro, e está logo abaixo.
 */
export function TelaDeInventario() {
  const depositos = useDepositos()
  const { contagem, abrir, descartar, contar, remover } = useContagem()
  const acrescentar = useAcrescentarItem()
  const aplicar = useAplicarContagem()

  const [depositoId, setDepositoId] = useState('')
  const [buscaAberta, setBuscaAberta] = useState(false)
  const [produto, setProduto] = useState<ProductDto | null>(null)
  const [motivo, setMotivo] = useState('')
  // O TEXTO digitado por linha, que não é o mesmo que o número contado: "1," é
  // texto válido a caminho de um número, e guardar só o número faria o cursor
  // pular a vírgula de volta a cada tecla.
  const [rascunho, setRascunho] = useState<Record<string, string>>({})

  const listaDeDepositos = depositos.data ?? []

  // O detalhe traz as VARIANTES: estoque existe por variante, não por produto —
  // o produto é o grupo, a peça com acabamento e tamanho é a que ocupa a
  // prateleira que se está contando.
  const detalhe = useQuery({
    queryKey: ['produtos', 'detalhe-para-inventario', produto?.id ?? ''],
    enabled: produto !== null,
    queryFn: () => data.produtos.get(produto?.id as string),
  })

  /**
   * O texto vai para o rascunho SEMPRE; o número, só quando é número.
   *
   * Texto que ainda não é quantidade — vazio, `1,`, `abc` — devolve a linha para
   * "não contada". Guardar o último número válido deixaria a coluna Diferença
   * afirmando uma conta que o campo ao lado já não mostra, que é a pior forma de
   * errar: os dois números estão na mesma linha e discordam.
   */
  function digitar(item: ItemDaContagem, texto: string) {
    setRascunho((atual) => ({ ...atual, [item.variantId]: texto }))
    contar(item.variantId, contagemDoTexto(texto))
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        titulo="Inventário"
        contexto="Conte a prateleira, compare com o sistema e mande a diferença como ajuste."
      />

      <AvisoDeCobertura>
        <p>
          A folha de contagem vive <strong>neste navegador</strong>: o contrato ainda não publica
          operação de contagem, então ela não sobrevive ao recarregar a página, não é vista por
          outro operador e não deixa histórico.
        </p>
        <p>
          O <strong>ajuste</strong> é diferente — ele sai como movimento de estoque de verdade, e
          aparece no kardex e no saldo por depósito assim que você aplicar.
        </p>
      </AvisoDeCobertura>

      {contagem === null ? (
        <Painel titulo="Abrir contagem" modulo="estoque">
          {depositos.isPending ? (
            <p className="text-muted-foreground text-sm">Carregando os depósitos…</p>
          ) : listaDeDepositos.length === 0 ? (
            // Sem depósito não há "por localização". O padrão da empresa nasce
            // no primeiro movimento, no servidor — mas contar exige escolher
            // ONDE, e não há o que escolher.
            <p className="text-muted-foreground text-sm">
              Esta empresa ainda não tem depósito cadastrado. O inventário é por depósito — cadastre
              um antes de contar.
            </p>
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.06em]">
                  Depósito
                </span>
                <select
                  className="h-9 border-2 border-input bg-card px-2.5 text-sm outline-none focus-visible:focus-ring"
                  value={depositoId}
                  onChange={(evento) => setDepositoId(evento.target.value)}
                >
                  <option value="">Escolha o depósito</option>
                  {listaDeDepositos.map((deposito) => (
                    <option key={deposito.id} value={deposito.id}>
                      {deposito.name}
                      {deposito.active ? '' : ' (inativo)'}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                type="button"
                isDisabled={depositoId === ''}
                onClick={() => {
                  const deposito = listaDeDepositos.find((d) => d.id === depositoId)
                  if (deposito) abrir(deposito)
                }}
              >
                Abrir contagem
              </Button>
              <p className="text-muted-foreground text-sm">
                Uma contagem por vez: o galpão é um só, e duas folhas abertas são duas chances de
                digitar na errada.
              </p>
            </div>
          )}
        </Painel>
      ) : (
        <>
          <Painel titulo={`Contagem — ${contagem.depositoNome}`} modulo="estoque">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                isDisabled={contagem.aplicacao !== null}
                onClick={() => setBuscaAberta(true)}
              >
                <Search className="size-4" />
                Adicionar peça
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  descartar()
                  // O rascunho é por variante e sobreviveria à folha: sem isto,
                  // a contagem seguinte que incluísse a mesma peça nasceria com
                  // o contado da anterior no campo.
                  setRascunho({})
                  setMotivo('')
                }}
              >
                {contagem.aplicacao === null ? 'Descartar contagem' : 'Nova contagem'}
              </Button>
            </div>

            {acrescentar.isError ? (
              <p role="alert" className="mt-2 text-destructive text-sm">
                {mensagemDoErro(acrescentar.error, 'Falha ao ler o saldo desta peça.')}
              </p>
            ) : null}

            {contagem.itens.length === 0 ? (
              <p className="mt-3 text-muted-foreground text-sm">
                A folha está vazia. Adicione as peças que você vai conferir — o saldo do sistema
                entra congelado ao lado de cada uma.
              </p>
            ) : (
              <FolhaDeContagem
                itens={contagem.itens}
                aplicada={contagem.aplicacao !== null}
                rascunho={rascunho}
                aoDigitar={digitar}
                aoRemover={(variantId) => {
                  remover(variantId)
                  setRascunho((atual) => {
                    const { [variantId]: _fora, ...resto } = atual
                    return resto
                  })
                }}
              />
            )}
          </Painel>

          {contagem.itens.length > 0 ? (
            <Painel titulo="Aplicar ajuste" modulo="estoque">
              {contagem.aplicacao === null ? (
                <div className="flex flex-col gap-3">
                  <ResumoDaFolha contagem={contagem} />
                  <label className="flex max-w-prose flex-col gap-1">
                    <span className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.06em]">
                      Motivo
                    </span>
                    <input
                      className="h-9 border-2 border-input bg-card px-2.5 text-sm outline-none focus-visible:focus-ring"
                      value={motivo}
                      autoComplete="off"
                      placeholder="Inventário de agosto — depósito principal"
                      onChange={(evento) => setMotivo(evento.target.value)}
                    />
                    {/* O motivo é texto livre no contrato e o front NÃO carimba
                        vocabulário nele: o recebimento, a venda e a carga do
                        legado escrevem no mesmo campo sem passar por aqui, e
                        metade carimbada tem a aparência de dado classificado sem
                        a substância. Ver `lancar-movimento.tsx`. */}
                    <span className="text-muted-foreground text-xs">
                      Vai no kardex, em cada movimento do ajuste.
                    </span>
                  </label>
                  {aplicar.isError ? (
                    <p role="alert" className="text-destructive text-sm">
                      {mensagemDoErro(aplicar.error, 'Falha ao aplicar o ajuste.')} Aplicar de novo
                      lança só o que faltou — o que já entrou fica.
                    </p>
                  ) : null}
                  <div>
                    <Button
                      type="button"
                      isDisabled={motivo.trim() === '' || aplicar.isPending}
                      onClick={() => aplicar.mutate(motivo.trim())}
                    >
                      {aplicar.isPending ? 'Aplicando…' : 'Aplicar ajuste'}
                    </Button>
                  </div>
                </div>
              ) : (
                <ResultadoDaAplicacao
                  itens={contagem.itens}
                  movimentos={contagem.aplicacao.movimentos}
                  semDiferenca={contagem.aplicacao.semDiferenca}
                  mudouNoMeio={contagem.aplicacao.mudouNoMeio}
                />
              )}
            </Painel>
          ) : null}
        </>
      )}

      {/* A variante é escolhida DEPOIS do produto, e num passo próprio: estoque
          existe por variante, e adivinhar a primeira poria a peça errada na
          folha sem nada na tela dizendo isso. */}
      <Dialog
        isOpen={produto !== null}
        onOpenChange={(aberto) => {
          if (!aberto) setProduto(null)
        }}
        className="sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle>Escolha a variante</DialogTitle>
          <DialogDescription>
            {produto ? `${produto.code} — ${produto.description}` : ''}
          </DialogDescription>
        </DialogHeader>
        {detalhe.isPending ? (
          <p className="text-muted-foreground text-sm">Carregando as variantes…</p>
        ) : (detalhe.data?.variantes ?? []).length === 0 ? (
          <p className="text-muted-foreground text-sm">Este produto não tem variante cadastrada.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {(detalhe.data?.variantes ?? []).map((variante) => (
              <li key={variante.id}>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start"
                  isDisabled={acrescentar.isPending}
                  onClick={() => {
                    if (!produto || !variante.id) return
                    acrescentar.mutate({
                      variantId: variante.id,
                      produtoId: produto.id,
                      produtoCodigo: produto.code,
                      produtoDescricao: produto.description,
                      variante: rotuloDaVariante(variante),
                    })
                    setProduto(null)
                  }}
                >
                  {rotuloDaVariante(variante)}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Dialog>

      <SearchDialog<ProductDto>
        open={buscaAberta}
        onOpenChange={setBuscaAberta}
        title="Buscar produto"
        columns={COLUNAS_DE_PRODUTO}
        queryKey={['produtos', 'busca-para-inventario']}
        fetcher={(state) => data.produtos.list(state)}
        onSelect={(linha) => {
          setProduto(linha)
          setBuscaAberta(false)
        }}
      />
    </div>
  )
}

/**
 * Texto digitado → quantidade contada, ou `null` quando não é quantidade.
 *
 * Irmã de `quantidadeDoTexto` (lançamento manual) com UMA diferença deliberada:
 * **aceita o zero**. Lá a direção veio do botão e zero não é movimento; aqui
 * zero é a resposta mais importante que uma contagem pode dar. O negativo
 * continua recusado — não existe contar menos que nada —, e as três casas são a
 * escala de `numeric(18,3)`: aparar em silêncio faria quem digitou `0,0005`
 * gravar zero e concluir que gravou meio milésimo.
 */
export function contagemDoTexto(texto: string): number | null {
  const limpo = texto.trim().replace(',', '.')
  if (!/^\d+(\.\d{1,3})?$/.test(limpo)) return null
  return Number(limpo)
}

/** Acabamento e tamanho, como a tela de movimentação os escreve. */
function rotuloDaVariante(variante: { acabamento?: string | null; tamanho?: string | null }) {
  return [variante.acabamento, variante.tamanho].filter(Boolean).join(' · ') || 'Padrão'
}

/** A folha: uma linha por peça, com o sistema à esquerda e o contado à direita. */
function FolhaDeContagem({
  itens,
  aplicada,
  rascunho,
  aoDigitar,
  aoRemover,
}: {
  itens: readonly ItemDaContagem[]
  aplicada: boolean
  rascunho: Record<string, string>
  aoDigitar: (item: ItemDaContagem, texto: string) => void
  aoRemover: (variantId: string) => void
}) {
  return (
    <Table className="mt-3">
      <TableHeader>
        <TableRow>
          <TableHead>Produto</TableHead>
          <TableHead>Variante</TableHead>
          <TableHead className="text-right">Sistema</TableHead>
          <TableHead className="text-right">Contado</TableHead>
          <TableHead className="text-right">Diferença</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {itens.map((item) => {
          const diferenca = diferencaDoItem(item)
          return (
            <TableRow key={item.variantId}>
              <TableCell>
                {item.produtoCodigo} — {item.produtoDescricao}
              </TableCell>
              <TableCell>{item.variante}</TableCell>
              <TableCell className="text-right font-mono">
                {formatQuantidade(item.sistema)}
              </TableCell>
              <TableCell className="text-right">
                <input
                  className="h-8 w-24 border-2 border-input bg-card px-2 text-right font-mono text-sm outline-none focus-visible:focus-ring"
                  inputMode="decimal"
                  autoComplete="off"
                  disabled={aplicada}
                  aria-label={`Contado — ${item.produtoCodigo} ${item.variante}`}
                  value={
                    rascunho[item.variantId] ?? (item.contado === null ? '' : String(item.contado))
                  }
                  onChange={(evento) => aoDigitar(item, evento.target.value)}
                />
              </TableCell>
              <TableCell
                className="text-right font-mono"
                data-testid={`diferenca-${item.variantId}`}
              >
                {/* Em branco enquanto não se contou, e não zero: "não contei
                    ainda" e "bateu" são respostas diferentes, e zero diria a
                    segunda para quem não deu nenhuma. */}
                {diferenca === null ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <span className={diferenca === 0 ? 'text-muted-foreground' : undefined}>
                    {diferenca > 0 ? '+' : ''}
                    {formatQuantidade(diferenca)}
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right">
                {aplicada ? null : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Tirar da folha — ${item.produtoCodigo} ${item.variante}`}
                    onClick={() => aoRemover(item.variantId)}
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

/** O rodapé da folha — o que vai virar movimento, antes de virar. */
function ResumoDaFolha({ contagem }: { contagem: Parameters<typeof resumoDaContagem>[0] }) {
  const resumo = resumoDaContagem(contagem)
  return (
    <p className="text-sm" data-testid="resumo-da-contagem">
      {resumo.linhas} {resumo.linhas === 1 ? 'peça na folha' : 'peças na folha'} ·{' '}
      {resumo.pendentes} sem contar · <strong>{resumo.divergentes}</strong>{' '}
      {resumo.divergentes === 1 ? 'divergência' : 'divergências'} · ajuste líquido{' '}
      <span className="font-mono">
        {resumo.ajusteLiquido > 0 ? '+' : ''}
        {formatQuantidade(resumo.ajusteLiquido)}
      </span>
    </p>
  )
}

/**
 * O que a aplicação fez, dito em número de movimentos — não em "pronto".
 *
 * `mudouNoMeio` é a parte que não se pode calar: quando o saldo mudou entre a
 * contagem e o ajuste, o depósito ficou com o CONTADO (que é o trabalho do
 * ajuste), mas a base contra a qual a pessoa conferiu já não era a de agora.
 */
function ResultadoDaAplicacao({
  itens,
  movimentos,
  semDiferenca,
  mudouNoMeio,
}: {
  itens: readonly ItemDaContagem[]
  movimentos: number
  semDiferenca: number
  mudouNoMeio: readonly string[]
}) {
  const nomes = mudouNoMeio.map((variantId) => {
    const item = itens.find((linha) => linha.variantId === variantId)
    return item ? `${item.produtoCodigo} (${item.variante})` : variantId
  })
  return (
    <div className="flex flex-col gap-2 text-sm" data-testid="resultado-do-ajuste">
      <p>
        Ajuste aplicado: <strong>{movimentos}</strong>{' '}
        {movimentos === 1 ? 'movimento lançado' : 'movimentos lançados'} · {semDiferenca}{' '}
        {semDiferenca === 1 ? 'peça bateu' : 'peças bateram'} com o sistema.
      </p>
      <p className="text-muted-foreground">
        Os movimentos já estão no kardex e no saldo por depósito da Movimentação.
      </p>
      {nomes.length > 0 ? (
        <p role="alert">
          O saldo mudou entre a contagem e o ajuste em: {nomes.join(', ')}. O depósito ficou com o
          que você contou, mas alguém movimentou a peça no meio — confira antes de fechar.
        </p>
      ) : null}
    </div>
  )
}

/** As duas colunas que o `ProductDto` garante — as demais são `Proposto`. */
const COLUNAS_DE_PRODUTO: ColumnDef<ProductDto>[] = [
  { accessorKey: 'code', header: 'Código' },
  { accessorKey: 'description', header: 'Descrição' },
]
