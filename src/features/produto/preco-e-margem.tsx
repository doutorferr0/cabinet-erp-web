import type { CostSimulationDto, PriceIndexDto, VariantTablePriceDto } from '@/api/gerado'
import { AvisoDeCobertura } from '@/components/cabinet/aviso-de-cobertura'
import {
  ErroDeCarregamento,
  EsqueletoDeCarregamento,
} from '@/components/cabinet/estado-de-consulta'
import { Secao } from '@/components/cabinet/secao'
import { Button } from '@/components/ui/button'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  PARCELAS_DA_SIMULACAO,
  indiceDoFornecedor,
  useGravarTabelas,
  useIndicesDePreco,
  useSimularMargem,
  useTabelasDaVariante,
  vendaSugeridaCents,
} from '@/data/precos-api'
import { PERCENT_ESCALA, formatMoneyBRL } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { Calculator, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

/**
 * A ABA PREÇO E MARGEM — a primeira tela do módulo Preço (G9 · issue #379).
 *
 * As dez operações do módulo estavam no contrato desde a #335 e nenhuma tinha
 * consumidor: eram do terceiro estado da varredura de 25/08 — *publicado,
 * servido e sem tela*. Esta aba é o consumidor de três delas.
 *
 * ## As três coisas que ela mostra, e de onde cada uma vem
 *
 * | o que | origem |
 * |---|---|
 * | preço de TABELA do fornecedor | `GET`/`PUT /api/table-prices/{variantId}` — se edita aqui, porque é aqui que ele mora |
 * | preço de VENDA sugerido | calculado: `round(tabela × índice)`, a fórmula do legado |
 * | custo e MARGEM | `POST /api/cost-profiles/{id}/simulate` — vinte e três parcelas, e nenhuma delas se calcula aqui |
 *
 * ## `Valor de Tabela` da aba Valores é OUTRO número, e a confusão é o risco
 *
 * A aba Valores mostra `Valor de Tabela` por variante — é `priceCents`, o preço
 * de VENDA da peça, o que sai no orçamento. O que esta aba edita é
 * `tablePriceCents`, o preço de LISTA do FORNECEDOR: não é o que se paga (os
 * descontos ainda não saíram) nem o que se vende. Os dois têm nome parecido,
 * moram na mesma ficha e diferem por uma ordem de grandeza — daí o rótulo aqui
 * dizer o fornecedor em toda linha, e o cabeçalho da seção dizer de qual lado
 * da compra se está falando.
 *
 * ## A escrita é PRÓPRIA, e não a do formulário
 *
 * O rodapé `Gravar` da tela grava o PRODUTO (`PUT /api/products/{id}`). A tabela
 * de preço tem endpoint próprio e papel próprio (`precos:gerenciar`, que o
 * `Operação completa` não alcança), então ela tem o seu botão. Pendurá-la no
 * Gravar do formulário faria a gravação do produto inteiro falhar com 403 por
 * causa de um campo de preço que o operador nem tocou.
 *
 * ## O que ela NÃO faz, e é decisão declarada
 *
 * **Não cria nem altera perfil de custo nem índice de venda.** Os dois são a
 * decisão D1 (`api#231`/`api#232`) e esta tela os LÊ. Um índice editável aqui
 * daria duas autoridades sobre o número que precifica a peça de todo mundo.
 *
 * **Não mostra vigência.** A tabela que o servidor devolve é a que vale hoje;
 * o histórico é a web#399, e enquanto ela não mergear a aba não tem como
 * afirmar "desde quando".
 */
export function PrecoEMargem({
  variantes,
  readOnly,
}: {
  /** As variantes JÁ GRAVADAS — linha sem id do servidor não tem preço. */
  variantes: readonly { id: string; rotulo: string }[]
  readOnly: boolean
}) {
  const [variantId, setVariantId] = useState<string | null>(variantes[0]?.id ?? null)

  if (variantes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Este produto ainda não tem variante gravada. O preço de tabela pende da variante — grave a
        grade da aba <strong>Valores</strong> primeiro.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex max-w-sm flex-col gap-1.5">
        <Label htmlFor="preco-variante">Variante</Label>
        {/* `<select>` nativo, como o `SelectField` do repo: a decisão de
            interface por clique manda a navegação ser a do browser. */}
        <select
          id="preco-variante"
          className="flex h-9 w-full border-2 border-input bg-card px-2.5 py-1 text-sm outline-none focus-visible:focus-ring"
          value={variantId ?? ''}
          onChange={(e) => setVariantId(e.target.value)}
        >
          {variantes.map((variante) => (
            <option key={variante.id} value={variante.id}>
              {variante.rotulo}
            </option>
          ))}
        </select>
      </div>

      <TabelaDoFornecedor variantId={variantId} readOnly={readOnly} />

      <CoberturaDoPreco />
    </div>
  )
}

/** Uma linha da grade, com a marca de quem ainda não foi gravado. */
interface LinhaDePreco {
  supplierId: string
  supplierName: string | null
  supplierCode: string | null
  tablePriceCents: number
}

function TabelaDoFornecedor({
  variantId,
  readOnly,
}: {
  variantId: string | null
  readOnly: boolean
}) {
  const tabelas = useTabelasDaVariante(variantId)
  const indices = useIndicesDePreco()
  const gravar = useGravarTabelas(variantId)

  /**
   * A edição é LOCAL até o Gravar, e `null` quer dizer "não mexi".
   *
   * Sem isso, o `PUT` que substitui a lista inteira sairia de um estado
   * derivado da resposta, e uma releitura no meio da edição (o `invalidate` de
   * qualquer outra aba serve) apagaria o que o operador digitou.
   */
  const [rascunho, setRascunho] = useState<LinhaDePreco[] | null>(null)

  /**
   * O selo da EDIÇÃO CORRENTE, e ele existe por causa do `Descartar`.
   *
   * O campo de dinheiro guarda o texto que o operador digitou (ver
   * `CampoDeDinheiro`), e texto local não volta atrás sozinho: sem isto,
   * `Descartar` restaurava os centavos do servidor e deixava na tela o número
   * digitado — a grade dizendo uma coisa e o corpo do `PUT` outra, que é o
   * defeito mais caro que um campo controlado pela metade produz.
   *
   * Entra na `key` da linha: mudá-lo remonta os campos, e é a única hora em que
   * o texto deve ser reescrito de fora.
   */
  const [edicao, setEdicao] = useState(0)

  function descartar() {
    setRascunho(null)
    setEdicao((n) => n + 1)
  }

  if (tabelas.isPending || indices.isPending) return <EsqueletoDeCarregamento />

  if (tabelas.isError) {
    return (
      <ErroDeCarregamento
        mensagem="Não foi possível carregar a tabela de preço."
        erro={tabelas.error}
        refazer={() => tabelas.refetch()}
      />
    )
  }

  const linhas: LinhaDePreco[] = rascunho ?? (tabelas.data ?? []).map(comoLinha)
  const listaDeIndices = indices.data ?? []

  function editar(proximas: LinhaDePreco[]) {
    setRascunho(proximas)
  }

  return (
    <Secao numero="01" titulo="Preço de tabela do fornecedor" cor="money">
      <p className="mb-3 max-w-prose text-sm text-muted-foreground">
        O preço de <strong>lista</strong> que cada fornecedor pratica para esta variante — antes dos
        descontos em cascata. Não é o que se paga nem o que se vende: é a entrada dos dois cálculos.
      </p>

      {linhas.length === 0 ? (
        <p className="mb-3 text-sm text-muted-foreground">
          Nenhum fornecedor tem preço de tabela para esta variante.
        </p>
      ) : (
        <div className="mb-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Fornecedor</th>
                <th className="py-2 pr-3 font-medium">Cód. no fornecedor</th>
                <th className="py-2 pr-3 text-right font-medium">Preço de tabela</th>
                <th className="py-2 pr-3 text-right font-medium">Índice</th>
                <th className="py-2 pr-3 text-right font-medium">Venda sugerida</th>
                <th className="py-2 font-medium">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha, i) => (
                <LinhaDaTabela
                  key={`${linha.supplierId}-${edicao}`}
                  linha={linha}
                  indice={indiceDoFornecedor(listaDeIndices, linha.supplierId)}
                  readOnly={readOnly}
                  aoMudarPreco={(centavos) =>
                    editar(
                      linhas.map((atual, j) =>
                        j === i ? { ...atual, tablePriceCents: centavos } : atual,
                      ),
                    )
                  }
                  aoExcluir={() => editar(linhas.filter((_, j) => j !== i))}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {readOnly ? null : (
        <div className="flex flex-wrap items-center gap-2">
          <IncluirFornecedor
            indices={listaDeIndices}
            jaNaGrade={linhas.map((linha) => linha.supplierId)}
            aoIncluir={(indice) =>
              editar([
                ...linhas,
                {
                  supplierId: indice.supplierId,
                  supplierName: indice.supplierName ?? null,
                  supplierCode: null,
                  tablePriceCents: 0,
                },
              ])
            }
          />
          <Button
            type="button"
            size="sm"
            disabled={rascunho === null || gravar.isPending}
            onClick={() =>
              gravar.mutate(
                {
                  prices: linhas.map((linha) => ({
                    supplierId: linha.supplierId,
                    tablePriceCents: linha.tablePriceCents,
                  })),
                },
                { onSuccess: descartar },
              )
            }
          >
            {gravar.isPending ? 'Gravando…' : 'Gravar tabela'}
          </Button>
          {rascunho === null ? null : (
            <Button type="button" size="sm" variant="ghost" onClick={descartar}>
              Descartar
            </Button>
          )}
        </div>
      )}

      {gravar.isError ? (
        <p className="mt-2 text-sm text-destructive">
          {gravar.error instanceof Error ? gravar.error.message : 'Falha ao gravar a tabela.'}
        </p>
      ) : null}
    </Secao>
  )
}

function comoLinha(dto: VariantTablePriceDto): LinhaDePreco {
  return {
    supplierId: dto.supplierId,
    supplierName: dto.supplierName ?? null,
    supplierCode: dto.supplierCode ?? null,
    tablePriceCents: dto.tablePriceCents,
  }
}

function LinhaDaTabela({
  linha,
  indice,
  readOnly,
  aoMudarPreco,
  aoExcluir,
}: {
  linha: LinhaDePreco
  indice: PriceIndexDto | undefined
  readOnly: boolean
  aoMudarPreco: (centavos: number) => void
  aoExcluir: () => void
}) {
  const venda = vendaSugeridaCents(linha.tablePriceCents, indice)

  return (
    <tr className="border-b last:border-0">
      <td className="py-2 pr-3">{linha.supplierName ?? linha.supplierId}</td>
      <td className="py-2 pr-3 text-muted-foreground">{linha.supplierCode ?? '—'}</td>
      <td className="py-2 pr-3 text-right">
        {readOnly ? (
          <span className="tabular-nums">{formatMoneyBRL(linha.tablePriceCents)}</span>
        ) : (
          <CampoDeDinheiro
            rotulo={`Preço de tabela — ${linha.supplierName ?? linha.supplierId}`}
            centavos={linha.tablePriceCents}
            aoMudar={aoMudarPreco}
          />
        )}
      </td>
      {/* O índice é do FORNECEDOR e não da peça — a mesma coluna vale para toda
          variante que ele fornece. Sem índice a célula diz isso em palavra, e
          não em traço: quem opera precisa saber que falta cadastrar. */}
      <td className="py-2 pr-3 text-right tabular-nums">
        {indice === undefined ? (
          <span className="text-muted-foreground">sem índice</span>
        ) : indice.active ? (
          formatIndice(indice.indexValue)
        ) : (
          <span className="text-muted-foreground">{formatIndice(indice.indexValue)} (inativo)</span>
        )}
      </td>
      <td className="py-2 pr-3 text-right tabular-nums">
        {venda === null ? <span className="text-muted-foreground">—</span> : formatMoneyBRL(venda)}
      </td>
      <td className="py-2">
        <div className="flex items-center justify-end gap-1">
          <SimularMargem linha={linha} indice={indice} venda={venda} />
          {readOnly ? null : (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Excluir a linha de ${linha.supplierName ?? linha.supplierId}`}
              onClick={aoExcluir}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  )
}

/**
 * O CAMPO DE DINHEIRO — e ele guarda o TEXTO, não o número.
 *
 * O estado da grade é inteiro em centavos, e é ele que sai no `PUT`. Mas o
 * campo não pode ser controlado por `reaisDeCentavos(centavos)`: cada tecla
 * viraria centavo e voltaria formatada, então digitar `900,00` sobre um valor
 * existente é impossível — o `,` some assim que se digita, o cursor pula para o
 * fim e o resultado é um número que ninguém escreveu. Foi o primeiro caso de
 * teste de gravação que mostrou isso; o campo parecia funcionar aos olhos.
 *
 * Então o texto é local e o CENTAVO é derivado dele a cada tecla — a linha
 * inteira (venda sugerida, simulação) reage enquanto se digita, e o que o
 * operador vê no campo é o que ele escreveu.
 *
 * **O preço disso é que o texto não volta atrás sozinho**, e quem paga é o
 * `Descartar`. Por isso a linha carrega o selo `edicao` na `key`: remontar é a
 * única forma de o valor do servidor reescrever o que a pessoa digitou, e as
 * duas horas em que isso deve acontecer — gravou, descartou — são as duas que
 * mexem no selo.
 */
function CampoDeDinheiro({
  rotulo,
  centavos,
  aoMudar,
}: {
  rotulo: string
  centavos: number
  aoMudar: (centavos: number) => void
}) {
  const [texto, setTexto] = useState(() => reaisDeCentavos(centavos))

  return (
    <Input
      aria-label={rotulo}
      className="ml-auto w-32 text-right tabular-nums"
      inputMode="decimal"
      value={texto}
      onChange={(e) => {
        setTexto(e.target.value)
        aoMudar(centavosDeReais(e.target.value))
      }}
      // Sai do campo com o valor NORMALIZADO: `9` vira `9,00`, e o que ficou na
      // tela passa a ser o que vai no corpo. Sem isto, um campo com `9` e um
      // com `9,00` teriam o mesmo valor e caras diferentes.
      onBlur={() => setTexto(reaisDeCentavos(centavosDeReais(texto)))}
    />
  )
}

/**
 * O botão de simular, e ele só existe quando há PERFIL.
 *
 * Sem `costProfileId` no índice não há o que simular — não é falha, é o caso
 * real do fornecedor sem cascata e sem crédito, em que o líquido É o preço de
 * tabela. Um botão que abrisse um extrato de zeros ensinaria que o custo dele é
 * zero.
 */
function SimularMargem({
  linha,
  indice,
  venda,
}: {
  linha: LinhaDePreco
  indice: PriceIndexDto | undefined
  venda: number | null
}) {
  const simular = useSimularMargem()
  const [aberto, setAberto] = useState(false)
  const costProfileId = indice?.costProfileId ?? null

  if (costProfileId === null) return null

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Simular a margem de ${linha.supplierName ?? linha.supplierId}`}
        onClick={() => {
          setAberto(true)
          simular.mutate({
            costProfileId,
            corpo: { tablePriceCents: linha.tablePriceCents, netSaleCents: venda },
          })
        }}
      >
        <Calculator className="size-4" />
      </Button>

      {/* O `Dialog` do repo, e não uma caixa própria: focus-trap e `Esc` são a
          acessibilidade mínima do CLAUDE.md, e o shadcn já os dá. */}
      <Dialog
        isOpen={aberto}
        onOpenChange={(estado) => (estado ? undefined : setAberto(false))}
        className="sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle>Custo e margem — {linha.supplierName ?? linha.supplierId}</DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto">
          {simular.isPending ? <EsqueletoDeCarregamento /> : null}

          {simular.isError ? (
            <ErroDeCarregamento
              mensagem="Não foi possível simular a margem."
              erro={simular.error}
              refazer={() =>
                simular.mutate({
                  costProfileId,
                  corpo: { tablePriceCents: linha.tablePriceCents, netSaleCents: venda },
                })
              }
            />
          ) : null}

          {simular.data ? <ExtratoDoCusto simulacao={simular.data} /> : null}
        </div>
      </Dialog>
    </>
  )
}

/**
 * O EXTRATO — a decomposição na ordem da conta, para quem lê refazê-la com o
 * dedo.
 *
 * A ordem vem de `PARCELAS_DA_SIMULACAO`, na fronteira de dados, e não daqui:
 * é a ordem do cálculo do legado, não uma escolha de layout.
 */
function ExtratoDoCusto({ simulacao }: { simulacao: CostSimulationDto }) {
  const semVenda = simulacao.profitCents === null || simulacao.profitCents === undefined

  return (
    <div className="flex flex-col gap-3">
      <table className="w-full text-sm">
        <tbody>
          {PARCELAS_DA_SIMULACAO.map((parcela) => (
            <tr
              key={parcela.campo}
              className={cn('border-b last:border-0', parcela.destaque && 'font-medium')}
            >
              <td className="py-1.5 pr-3">
                {parcela.rotulo}
                {parcela.sobreVenda && semVenda ? (
                  <span className="ml-1 text-xs text-muted-foreground">(depende da venda)</span>
                ) : null}
              </td>
              <td className="py-1.5 text-right tabular-nums">
                {parcela.sinal === '−' ? '− ' : ''}
                {formatMoneyBRL(Number(simulacao[parcela.campo] ?? 0))}
              </td>
            </tr>
          ))}
          <tr className="border-t-2 font-medium">
            <td className="py-2 pr-3">Lucro</td>
            <td className="py-2 text-right tabular-nums">
              {semVenda ? (
                <span className="text-muted-foreground">sem venda informada</span>
              ) : (
                <>
                  {formatMoneyBRL(simulacao.profitCents as number)}
                  {simulacao.profitPercent === null ||
                  simulacao.profitPercent === undefined ? null : (
                    <span className="ml-2 text-muted-foreground">
                      ({formatPercentual(simulacao.profitPercent)})
                    </span>
                  )}
                </>
              )}
            </td>
          </tr>
        </tbody>
      </table>

      {/* O aviso do ICMS não é rodapé opcional: para 317 dos 385 perfis reais a
          substituição tributária é o MAIOR componente do custo, e um extrato
          que a omitisse em silêncio faria a margem parecer maior do que é. */}
      {simulacao.excludesIcms ? (
        <AvisoDeCobertura>
          <p>
            Esta apuração <strong>não inclui ICMS</strong>. O regime de tributação do fornecedor
            ramifica o custo em sete caminhos — substituição tributária, DIFAL, crédito — e qual
            deles vale é decisão fiscal ainda pendente. O <strong>custo real é maior</strong> que o
            desta tela, e a margem, menor.
          </p>
        </AvisoDeCobertura>
      ) : null}
    </div>
  )
}

/**
 * Incluir fornecedor — a lista sai dos ÍNDICES, e a escolha tem consequência.
 *
 * Fornecedor sem índice cadastrado poderia receber preço de tabela (o servidor
 * aceita), mas a linha nasceria sem venda sugerida e sem simulação — uma linha
 * que só sabe dizer quanto custa na lista. Oferecer os que têm índice é oferecer
 * os que a aba consegue explicar; o resto se cadastra no módulo de preço, que é
 * o dono deles.
 */
function IncluirFornecedor({
  indices,
  jaNaGrade,
  aoIncluir,
}: {
  indices: readonly PriceIndexDto[]
  jaNaGrade: readonly string[]
  aoIncluir: (indice: PriceIndexDto) => void
}) {
  const disponiveis = indices.filter((indice) => !jaNaGrade.includes(indice.supplierId))

  if (disponiveis.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todos os fornecedores com índice já estão na tabela.
      </p>
    )
  }

  return (
    <span className="flex items-center gap-1.5">
      <Plus aria-hidden="true" className="size-4 text-muted-foreground" />
      <select
        aria-label="Incluir fornecedor na tabela"
        className="flex h-8 w-56 border-2 border-input bg-card px-2.5 py-1 text-sm outline-none focus-visible:focus-ring"
        value=""
        onChange={(e) => {
          const escolhido = disponiveis.find((indice) => indice.supplierId === e.target.value)
          if (escolhido) aoIncluir(escolhido)
        }}
      >
        <option value="">Incluir fornecedor…</option>
        {disponiveis.map((indice) => (
          <option key={indice.supplierId} value={indice.supplierId}>
            {indice.supplierName ?? indice.supplierId}
          </option>
        ))}
      </select>
    </span>
  )
}

/**
 * O que esta aba mostra e o servidor não guarda — a mesma peça das outras
 * quatro rotas de cadastro, com o texto próprio deste assunto.
 */
function CoberturaDoPreco() {
  return (
    <AvisoDeCobertura>
      <p>
        O <strong>preço de tabela</strong> tem gravação própria (o botão desta seção), separada do{' '}
        <strong>Gravar</strong> do formulário — e ela substitui a lista inteira: fornecedor que você
        excluir daqui perde o preço no servidor, não só na tela. A gravação exige permissão de{' '}
        <strong>preço</strong>; quem entra com <em>Operação completa</em> vê a recusa.
      </p>
      <p>
        O <strong>índice de venda</strong> e o <strong>perfil de custo</strong> aparecem em leitura
        e <strong>não se editam aqui</strong> — eles são por fornecedor, valem para todas as peças
        dele, e têm cadastro próprio. A <strong>venda sugerida</strong> é o preço de tabela vezes o
        índice: é sugestão, e não substitui o valor da aba <strong>Valores</strong>, que é o que sai
        no orçamento.
      </p>
      <p>
        A tabela mostrada é a <strong>vigente</strong>. O histórico de preço e a data a partir da
        qual cada valor passou a valer ainda não chegam nesta tela.
      </p>
    </AvisoDeCobertura>
  )
}

// ---------------------------------------------------------------- formatação

/**
 * O índice com as QUATRO casas que ele tem — `25600` vira `2,5600`.
 *
 * Não usa `formatPercent` porque índice não é percentual: é multiplicador. Um
 * `2,56%` na coluna faria a venda sugerida parecer errada por duas ordens de
 * grandeza.
 */
function formatIndice(indexValue: number): string {
  return (indexValue / PERCENT_ESCALA).toLocaleString('pt-BR', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  })
}

/** O percentual de lucro — inteiro escalado por 10.000, como todo % do contrato. */
function formatPercentual(valor: number): string {
  return `${(valor / PERCENT_ESCALA).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`
}

/**
 * Centavo → o texto do campo, e vice-versa.
 *
 * O estado é INTEIRO em centavos do começo ao fim; o `string` existe só entre o
 * teclado e o estado. Guardar o número em reais faria `74,18` virar
 * `74.18000000000001` na primeira multiplicação — que é a razão de este repo
 * vetar float para dinheiro.
 */
function reaisDeCentavos(centavos: number): string {
  return (centavos / 100).toFixed(2).replace('.', ',')
}

function centavosDeReais(texto: string): number {
  const limpo = texto.replace(/[^\d,.-]/g, '').replace(',', '.')
  const numero = Number.parseFloat(limpo)
  if (!Number.isFinite(numero)) return 0
  return Math.round(numero * 100)
}
