import type { OrderDto, PartnerDto } from '@/api/gerado'
import { CadastroForm } from '@/components/cabinet/cadastro-form'
import { DocumentoBloco } from '@/components/cabinet/documento'
import { ErroDeGravacao } from '@/components/cabinet/erro-do-servidor'
import { DateField, TextareaField } from '@/components/cabinet/form-controls'
import { FormGrid, type FormGridRow } from '@/components/cabinet/form-grid'
import { Nome } from '@/components/cabinet/nome'
import { SearchDialog } from '@/components/cabinet/search-dialog'
import { Secao } from '@/components/cabinet/secao'
import { Button } from '@/components/ui/button'
import { data } from '@/data'
import {
  DESTINO_ROTULO,
  type ItemDoPedidoDeCompra,
  type PedidoDeCompra,
  ROTULOS_DE_DESTINO,
  SITUACAO_DA_LINHA,
  SITUACAO_DO_PEDIDO,
  destinoDoRotulo,
  fornecedoresComLinhaAberta,
  useCancelarPedidoDeCompra,
  useGravarPedidoDeCompra,
} from '@/data/compras-api'
import { tabelas } from '@/data/tabelas'
import { formatDateBR } from '@/lib/formatters'
import { SHORTCUTS, bindShortcut, shortcutLabel } from '@/lib/shortcuts'
import { useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { Building2, FileText, Hash, List, Package, Search, ShoppingCart } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { z } from 'zod'

/**
 * PEDIDO DE COMPRA — a NECESSIDADE, não o combinado.
 *
 * O fornecedor mora na LINHA e não no cabeçalho: o mesmo pedido pede peça de
 * vários fornecedores, e é isso que faz uma ordem de compra nascer de várias
 * linhas de vários pedidos. A tela que existia aqui tinha o fornecedor como
 * lista de STRINGS no cabeçalho (`fornecedores: string[]`), que é o formato do
 * relatório do legado — dá para imprimir, não dá para amarrar linha nenhuma.
 *
 * ## O que o formulário edita, e o que ele só MOSTRA
 *
 * Edita: data de emissão, o elo com o pedido de venda, as linhas e a
 * observação. Mostra e não edita: número, situação do documento, situação de
 * cada linha e a ordem que já a levou — os quatro são derivados, e quem os
 * escreve é o servidor (a situação do pedido sai das linhas; a da linha, da
 * ordem que a consumiu).
 */

/** Uma linha como a GRADE a guarda: `destino` em português, o resto igual. */
interface LinhaNoFormulario {
  linha: number
  varianteId: string | null
  descricao: string
  acabamento: string
  tamanho: string
  unidade: string
  quantidade: string
  /** Rótulo, não enum: a célula `select` da grade guarda o texto que exibe. */
  destinoRotulo: string
  fornecedorId: string
  fornecedor: string
  linhaDoPedidoDeVenda: number | null
  ordemId: string | null
  ordemNumero: string | null
  situacao: ItemDoPedidoDeCompra['situacao']
  observacao: string
}

export interface PedidoNoFormulario extends Omit<PedidoDeCompra, 'itens'> {
  itens: LinhaNoFormulario[]
}

/**
 * O schema é o do CONTRATO, não o do legado.
 *
 * `id` e `numero` são texto e podem vir vazios — documento novo nasce sem os
 * dois, porque quem os emite é o servidor. `fornecedorId` obrigatório NA LINHA
 * é o que impede a grade de gravar uma necessidade sem dono: o servidor recusa
 * com 400, e recusar aqui diz qual linha.
 */
export const pedidoCompraSchema = z.object({
  id: z.string(),
  numero: z.string(),
  situacao: z.enum(['open', 'partially_ordered', 'ordered', 'cancelled']),
  dataEmissao: z.string().nullable(),
  pedidoVendaId: z.string().nullable(),
  pedidoVendaNumero: z.string().nullable(),
  clienteId: z.string().nullable(),
  cliente: z.string().nullable(),
  observacao: z.string(),
  itens: z.array(
    z.object({
      linha: z.number(),
      varianteId: z.string().nullable(),
      descricao: z.string().min(1, 'Descrição é obrigatória'),
      acabamento: z.string(),
      tamanho: z.string(),
      unidade: z.string(),
      quantidade: z.string(),
      destinoRotulo: z.string(),
      fornecedorId: z.string().min(1, 'Escolha o fornecedor da linha'),
      fornecedor: z.string(),
      linhaDoPedidoDeVenda: z.number().nullable(),
      ordemId: z.string().nullable(),
      ordemNumero: z.string().nullable(),
      situacao: z.enum(['open', 'ordered', 'cancelled']),
      observacao: z.string(),
    }),
  ),
})

export function paraFormulario(pedido: PedidoDeCompra): PedidoNoFormulario {
  return {
    ...pedido,
    itens: pedido.itens.map((item) => ({
      linha: item.linha,
      varianteId: item.varianteId,
      descricao: item.descricao,
      acabamento: item.acabamento,
      tamanho: item.tamanho,
      unidade: item.unidade,
      quantidade: item.quantidade,
      destinoRotulo: DESTINO_ROTULO[item.destino],
      fornecedorId: item.fornecedorId,
      fornecedor: item.fornecedor,
      linhaDoPedidoDeVenda: item.linhaDoPedidoDeVenda,
      ordemId: item.ordemId,
      ordemNumero: item.ordemNumero,
      situacao: item.situacao,
      observacao: item.observacao,
    })),
  }
}

export function doFormulario(valores: PedidoNoFormulario): PedidoDeCompra {
  return {
    ...valores,
    itens: valores.itens.map((linha, i) => ({
      // A posição na grade É o número da linha: é ela que a ordem de compra
      // rastreia, e buraco na sequência viraria linha órfã na ordem seguinte.
      linha: i + 1,
      varianteId: linha.varianteId,
      descricao: linha.descricao,
      acabamento: linha.acabamento,
      tamanho: linha.tamanho,
      unidade: linha.unidade,
      quantidade: linha.quantidade,
      destino: destinoDoRotulo(linha.destinoRotulo),
      fornecedorId: linha.fornecedorId,
      fornecedor: linha.fornecedor,
      linhaDoPedidoDeVenda: linha.linhaDoPedidoDeVenda,
      ordemId: linha.ordemId,
      ordemNumero: linha.ordemNumero,
      situacao: linha.situacao,
      observacao: linha.observacao,
    })),
  }
}

const colunasDeFornecedor: ColumnDef<PartnerDto>[] = [
  { accessorKey: 'code', header: 'Código' },
  {
    accessorKey: 'legalName',
    header: 'Fornecedor',
    cell: ({ getValue }) => <Nome>{getValue<string>()}</Nome>,
  },
  { accessorKey: 'document', header: 'Documento' },
]

const colunasDePedidoDeVenda: ColumnDef<OrderDto>[] = [
  { accessorKey: 'number', header: 'Número' },
  {
    accessorKey: 'customerName',
    header: 'Cliente',
    cell: ({ getValue }) => <Nome>{getValue<string>()}</Nome>,
  },
  {
    accessorKey: 'issuedAt',
    header: 'Emissão',
    cell: ({ getValue }) => formatDateBR(getValue<string | null>()),
  },
]

/**
 * O ELO COM A VENDA (§7.3) — pedido de venda vazio significa compra para
 * ESTOQUE, e é por isso que ele não é obrigatório.
 *
 * O cliente vem ECOADO do pedido escolhido e não é campo editável: quem
 * responde "para quem é esta peça" é a venda, e digitar um nome aqui criaria um
 * segundo cliente para o mesmo documento. É este elo que faz a previsão de
 * chegada saber a quem prometer a peça — sem ele, toda linha da previsão
 * apareceria como reposição de estoque.
 */
function BlocoDoPedidoDeVenda({ readOnly }: { readOnly: boolean }) {
  const { setValue } = useFormContext<PedidoNoFormulario>()
  const numero = useWatch({ name: 'pedidoVendaNumero' }) as string | null
  const cliente = useWatch({ name: 'cliente' }) as string | null
  const [buscaAberta, setBuscaAberta] = useState(false)

  function vincular(pedido: OrderDto) {
    setValue('pedidoVendaId', pedido.id, { shouldDirty: true })
    setValue('pedidoVendaNumero', pedido.number, { shouldDirty: true })
    setValue('clienteId', pedido.customerId ?? null, { shouldDirty: true })
    setValue('cliente', pedido.customerName ?? null, { shouldDirty: true })
  }

  function desvincular() {
    setValue('pedidoVendaId', null, { shouldDirty: true })
    setValue('pedidoVendaNumero', null, { shouldDirty: true })
    setValue('clienteId', null, { shouldDirty: true })
    setValue('cliente', null, { shouldDirty: true })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span>
          <span className="text-muted-foreground">Pedido de venda:</span>{' '}
          <output aria-label="Pedido de venda de origem">
            {numero || '— compra para estoque'}
          </output>
        </span>
        <span>
          <span className="text-muted-foreground">Cliente:</span>{' '}
          <output aria-label="Cliente do pedido de venda">
            {cliente ? <Nome>{cliente}</Nome> : '—'}
          </output>
        </span>
        <Button type="button" variant="outline" size="sm" onClick={() => setBuscaAberta(true)}>
          <Search className="size-4" /> Vincular pedido de venda
        </Button>
        {numero ? (
          <Button type="button" variant="ghost" size="sm" onClick={desvincular}>
            Desvincular
          </Button>
        ) : null}
      </div>
      {readOnly ? null : (
        <SearchDialog
          open={buscaAberta}
          onOpenChange={setBuscaAberta}
          title="Busca de Pedido de Venda"
          columns={colunasDePedidoDeVenda}
          queryKey={['pedidos-venda', 'busca-para-compra']}
          fetcher={(state) => data.pedidosVenda.list(state)}
          onSelect={vincular}
        />
      )}
    </div>
  )
}

/**
 * `Produto F6` no legado → Alt+P (CLAUDE.md veta F3-F6).
 *
 * A inclusão passa PELO FORNECEDOR, e não é enfeite: o fornecedor é chave
 * (`PartnerDto.id`) e o nome é eco. Uma célula `select` de nomes na grade
 * obrigaria a casar nome → id na gravação, que é exatamente o que o contrato
 * proíbe em `SupplierGroupMinimumDto` ("`productGroupName` NÃO é chave"). O
 * preço: trocar o fornecedor de uma linha existente é excluir e incluir de
 * novo — a `FormGrid` não tem ação por linha, e inventá-la aqui seria mexer no
 * componente compartilhado por causa de uma tela só.
 */
function BotaoIncluirItem({ onInserir }: { onInserir: (fornecedor: PartnerDto) => void }) {
  const [buscaAberta, setBuscaAberta] = useState(false)
  useEffect(() => bindShortcut(SHORTCUTS.produto, () => setBuscaAberta(true)))

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setBuscaAberta(true)}>
        <Package className="size-4" /> Produto <kbd>{shortcutLabel(SHORTCUTS.produto)}</kbd>
      </Button>
      <SearchDialog
        open={buscaAberta}
        onOpenChange={setBuscaAberta}
        title="De qual fornecedor é esta linha?"
        columns={colunasDeFornecedor}
        queryKey={['fornecedores', 'linha-do-pedido-de-compra']}
        fetcher={(state) => data.fornecedores.list(state)}
        onSelect={onInserir}
      />
    </>
  )
}

function GradeItens() {
  const itens = (useWatch({ name: 'itens' }) as LinhaNoFormulario[] | undefined) ?? []

  return (
    <FormGrid
      name="itens"
      hideAdd
      actions={(append) => (
        <BotaoIncluirItem
          onInserir={(fornecedor) =>
            append({
              linha: itens.length + 1,
              varianteId: null,
              descricao: '',
              acabamento: '',
              tamanho: '',
              unidade: 'UN',
              quantidade: '',
              destinoRotulo: DESTINO_ROTULO.stock,
              fornecedorId: fornecedor.id,
              fornecedor: fornecedor.legalName ?? '',
              linhaDoPedidoDeVenda: null,
              ordemId: null,
              ordemNumero: null,
              situacao: 'open',
              observacao: '',
            })
          }
        />
      )}
      columns={[
        { key: 'descricao', label: 'Descrição', voz: 'produto' },
        { key: 'acabamento', label: 'Acab.', type: 'select', options: tabelas.acabamentos },
        { key: 'tamanho', label: 'Tamanho' },
        { key: 'quantidade', label: 'Quantidade' },
        { key: 'unidade', label: 'Unidade', type: 'select', options: tabelas.unidades },
        {
          key: 'destinoRotulo',
          label: 'Destino',
          type: 'select',
          options: ROTULOS_DE_DESTINO,
        },
        {
          // ECO, não campo: a chave é o `fornecedorId` que a busca gravou.
          key: 'fornecedor',
          label: 'Fornecedor',
          type: 'computed',
          compute: (row: FormGridRow) => String(row.fornecedor ?? '') || '—',
        },
        {
          key: 'situacao',
          label: 'Situação',
          type: 'computed',
          compute: (row: FormGridRow) =>
            SITUACAO_DA_LINHA[row.situacao as ItemDoPedidoDeCompra['situacao']] ?? '—',
        },
        {
          // A rastreabilidade para o outro lado: qual ordem levou esta linha.
          key: 'ordemNumero',
          label: 'Ordem',
          type: 'computed',
          compute: (row: FormGridRow) => String(row.ordemNumero ?? '') || '—',
        },
      ]}
      newRow={{
        linha: 0,
        varianteId: null,
        descricao: '',
        acabamento: '',
        tamanho: '',
        unidade: 'UN',
        quantidade: '',
        destinoRotulo: DESTINO_ROTULO.stock,
        fornecedorId: '',
        fornecedor: '',
        linhaDoPedidoDeVenda: null,
        ordemId: null,
        ordemNumero: null,
        situacao: 'open',
        observacao: '',
      }}
    />
  )
}

/**
 * A PONTE pedido → ordem, um botão por FORNECEDOR com linha aberta.
 *
 * É o "Ordem de Compra" do legado, e ele não podia continuar sendo um
 * `navigate` para a listagem: a ordem tem UM fornecedor, então o gesto só
 * existe depois de escolhido qual. O botão leva o pedido e o fornecedor na URL,
 * e a tela da ordem monta as linhas abertas daquele fornecedor já com a origem
 * amarrada.
 *
 * Some quando não há linha aberta — pedido já todo em ordem não tem o que
 * gerar, e oferecer o gesto ali daria uma ordem vazia, ou um 409
 * `item-ja-em-ordem` num gesto que a tela tinha acabado de permitir.
 */
function PonteParaOrdem({ pedido }: { pedido: PedidoDeCompra }) {
  const navigate = useNavigate()
  const fornecedores = fornecedoresComLinhaAberta(pedido)

  if (!pedido.id || pedido.situacao === 'cancelled' || fornecedores.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground text-sm">Gerar ordem de compra para:</span>
      {fornecedores.map((f) => (
        <Button
          key={f.id}
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            void navigate({
              to: '/compras/ordens/$ordemId',
              params: { ordemId: 'novo' },
              search: { dePedido: pedido.id, fornecedor: f.id },
            })
          }
        >
          <ShoppingCart className="size-4" /> {f.nome}
        </Button>
      ))}
    </div>
  )
}

export function PedidoCompraForm({
  pedido,
  readOnly = false,
}: { pedido: PedidoDeCompra; readOnly?: boolean }) {
  const navigate = useNavigate()
  const gravar = useGravarPedidoDeCompra()
  const cancelar = useCancelarPedidoDeCompra()

  function onGravar(valores: PedidoNoFormulario) {
    // A navegação é do SUCESSO: sair da tela depois de uma recusa mostraria o
    // mesmo desfecho de uma gravação que deu certo.
    gravar.mutate(doFormulario(valores), {
      onSuccess: () => void navigate({ to: '/compras/pedidos' }),
    })
  }

  const cancelado = pedido.situacao === 'cancelled'

  return (
    <CadastroForm
      schema={pedidoCompraSchema}
      defaultValues={paraFormulario(pedido)}
      onGravar={onGravar}
      onCancelar={() => void navigate({ to: '/compras/pedidos' })}
      readOnly={readOnly || cancelado}
      gravando={gravar.isPending}
      familia="purchases"
    >
      <ErroDeGravacao
        mutacao={gravar}
        erro={gravar.error}
        mensagem="Não foi possível gravar o pedido de compra."
      />
      <ErroDeGravacao
        mutacao={cancelar}
        erro={cancelar.error}
        mensagem="Não foi possível cancelar o pedido de compra."
      />

      <div data-zonas className="flex flex-col gap-4">
        <DocumentoBloco className="flex flex-col gap-4">
          <Secao
            numero="01"
            titulo="Identificação"
            cor="info"
            icone={Hash}
            nota="números e datas do documento"
          >
            <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
              <span className="text-sm">
                <span className="text-muted-foreground">Número:</span>{' '}
                <output aria-label="Número do pedido">{pedido.numero || '— a emitir'}</output>
              </span>
              <span className="text-sm">
                <span className="text-muted-foreground">Situação:</span>{' '}
                <output aria-label="Situação do pedido">
                  {SITUACAO_DO_PEDIDO[pedido.situacao]}
                </output>
              </span>
              <DateField name="dataEmissao" label="Emissão" className="w-40" />
            </div>
          </Secao>

          <Secao
            numero="02"
            titulo="Origem na venda"
            cor="id"
            icone={Building2}
            nota="de quem é a encomenda — vazio é compra para estoque"
          >
            <BlocoDoPedidoDeVenda readOnly={readOnly || cancelado} />
          </Secao>
        </DocumentoBloco>

        <Secao
          numero="03"
          titulo="Itens"
          cor="info"
          icone={List}
          nota="o que se está comprando, e de quem"
        >
          <GradeItens />
        </Secao>

        <Secao
          numero="04"
          titulo="Observação"
          cor="info"
          icone={FileText}
          nota="o que o comprador anotou"
        >
          <TextareaField name="observacao" label="Observação" rows={3} />
        </Secao>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <PonteParaOrdem pedido={pedido} />
          {pedido.id && !cancelado && !readOnly ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={cancelar.isPending}
              onClick={() =>
                cancelar.mutate(pedido.id, {
                  onSuccess: () => void navigate({ to: '/compras/pedidos' }),
                })
              }
            >
              Cancelar pedido
            </Button>
          ) : null}
        </div>
      </div>
    </CadastroForm>
  )
}
