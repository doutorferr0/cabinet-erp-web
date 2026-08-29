import type { PartnerDto, PurchaseOrderDto } from '@/api/gerado'
import { CadastroForm } from '@/components/cabinet/cadastro-form'
import { DocumentoBloco, fileirasTotais } from '@/components/cabinet/documento'
import { ErroDeGravacao } from '@/components/cabinet/erro-do-servidor'
import { FormBlock } from '@/components/cabinet/form-block'
import { DateField, MoneyField, TextareaField } from '@/components/cabinet/form-controls'
import { FormGrid, type FormGridRow } from '@/components/cabinet/form-grid'
import { Nome } from '@/components/cabinet/nome'
import { posGravar } from '@/components/cabinet/pos-gravar'
import { SearchDialog } from '@/components/cabinet/search-dialog'
import { Secao } from '@/components/cabinet/secao'
import { Button } from '@/components/ui/button'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { data } from '@/data'
import {
  DESTINO_ROTULO,
  type ItemDaOrdemDeCompra,
  type OrdemDeCompra,
  SITUACAO_DA_ORDEM,
  faltaParaOMinimo,
  fornecedoresComLinhaAberta,
  linhasAbertasParaOrdem,
  subtotalDaOrdem,
  useCancelarOrdemDeCompra,
  useEnviarOrdemDeCompra,
  useGravarOrdemDeCompra,
  usePedidosComLinhaAberta,
  useReagendarOrdemDeCompra,
} from '@/data/compras-api'
import { useEmpresasDaSessao } from '@/data/empresas-api'
import { useCondicoesDePagamento } from '@/data/pagamento-api'
import { obterParceiro } from '@/data/parceiros-api'
import { tabelas } from '@/data/tabelas'
import { PERCENT_ESCALA, formatDateBR, formatMoneyBRL, formatPercent } from '@/lib/formatters'
import { SHORTCUTS, bindShortcut, shortcutLabel } from '@/lib/shortcuts'
import { cn } from '@/lib/utils'
import type { Transportadora } from '@/mocks/transportadoras'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Building2,
  CalendarClock,
  FileText,
  Hash,
  List,
  Percent,
  Search,
  Send,
  Truck,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { z } from 'zod'

/**
 * ORDEM DE COMPRA — o COMBINADO com um fornecedor.
 *
 * Ela não é o pedido com outro nome. UM fornecedor no cabeçalho, e cada linha
 * rastreando de qual pedido e de qual linha veio (`pedidoOrigemId` +
 * `linhaDeOrigem`). Esse par é o que faz o servidor marcar a linha do pedido
 * como atendida — perdê-lo numa gravação desataria a amarração inteira, com
 * 200.
 *
 * ## Os três gestos que NÃO são o `Gravar`
 *
 * `Enviar`, `Reagendar` e `Cancelar` têm caminho próprio no contrato, e é por
 * isso que a tela os oferece como botões e não como campos. Depois do envio o
 * `PUT` é 409 (`ordem-ja-enviada`): o fornecedor já tem o documento na mão, e o
 * que muda dali em diante é a PROMESSA, não o conteúdo.
 */

/** Uma linha como a GRADE a guarda. */
interface LinhaNoFormulario {
  linha: number
  pedidoOrigemId: string
  pedidoOrigemNumero: string
  linhaDeOrigem: number
  varianteId: string | null
  descricao: string
  acabamento: string
  tamanho: string
  unidade: string
  quantidade: string
  custoUnitarioCentavos: number | null
  totalCentavos: number
  destinoRotulo: string
  grupoProdutoId: string | null
  grupoProduto: string | null
}

export interface OrdemNoFormulario extends Omit<OrdemDeCompra, 'itens'> {
  itens: LinhaNoFormulario[]
}

export const ordemCompraSchema = z.object({
  id: z.string(),
  numero: z.string(),
  situacao: z.enum(['draft', 'sent', 'cancelled']),
  fornecedorId: z.string().min(1, 'Fornecedor é obrigatório'),
  fornecedor: z.string(),
  empresaCompradoraId: z.string().min(1, 'Empresa compradora é obrigatória'),
  empresaCompradora: z.string(),
  dataOrdem: z.string().nullable(),
  dataEnvio: z.string().nullable(),
  dataPrevista: z.string().nullable(),
  dataReagendada: z.string().nullable(),
  motivoDoReagendamento: z.string().nullable(),
  faturamentoMinimoCentavos: z.number().nullable(),
  transportadoraId: z.string().nullable(),
  transportadora: z.string().nullable(),
  condicaoPagamentoId: z.string().nullable(),
  condicaoPagamento: z.string().nullable(),
  descontoPercentual: z.number(),
  acrescimoCentavos: z.number(),
  subtotalCentavos: z.number(),
  totalCentavos: z.number(),
  observacao: z.string(),
  itens: z.array(
    z.object({
      linha: z.number(),
      pedidoOrigemId: z.string().min(1),
      pedidoOrigemNumero: z.string(),
      linhaDeOrigem: z.number(),
      varianteId: z.string().nullable(),
      descricao: z.string(),
      acabamento: z.string(),
      tamanho: z.string(),
      unidade: z.string(),
      quantidade: z.string(),
      custoUnitarioCentavos: z.number().nullable(),
      totalCentavos: z.number(),
      destinoRotulo: z.string(),
      grupoProdutoId: z.string().nullable(),
      grupoProduto: z.string().nullable(),
    }),
  ),
})

function linhaParaFormulario(item: ItemDaOrdemDeCompra): LinhaNoFormulario {
  return {
    linha: item.linha,
    pedidoOrigemId: item.pedidoOrigemId,
    pedidoOrigemNumero: item.pedidoOrigemNumero,
    linhaDeOrigem: item.linhaDeOrigem,
    varianteId: item.varianteId,
    descricao: item.descricao,
    acabamento: item.acabamento,
    tamanho: item.tamanho,
    unidade: item.unidade,
    quantidade: item.quantidade,
    custoUnitarioCentavos: item.custoUnitarioCentavos,
    totalCentavos: item.totalCentavos,
    destinoRotulo: DESTINO_ROTULO[item.destino],
    grupoProdutoId: item.grupoProdutoId,
    grupoProduto: item.grupoProduto,
  }
}

export function paraFormulario(ordem: OrdemDeCompra): OrdemNoFormulario {
  return { ...ordem, itens: ordem.itens.map(linhaParaFormulario) }
}

export function doFormulario(valores: OrdemNoFormulario): OrdemDeCompra {
  return {
    ...valores,
    itens: valores.itens.map((linha, i) => ({
      linha: i + 1,
      pedidoOrigemId: linha.pedidoOrigemId,
      pedidoOrigemNumero: linha.pedidoOrigemNumero,
      linhaDeOrigem: linha.linhaDeOrigem,
      varianteId: linha.varianteId,
      descricao: linha.descricao,
      acabamento: linha.acabamento,
      tamanho: linha.tamanho,
      unidade: linha.unidade,
      quantidade: linha.quantidade,
      custoUnitarioCentavos: linha.custoUnitarioCentavos,
      totalCentavos: linha.totalCentavos,
      // O destino vem da linha do PEDIDO e a ordem não o reescreve: é o eixo
      // que decide se a peça repõe galpão ou é encomenda de alguém.
      destino: linha.destinoRotulo === DESTINO_ROTULO.sale ? 'sale' : 'stock',
      grupoProdutoId: linha.grupoProdutoId,
      grupoProduto: linha.grupoProduto,
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
  {
    accessorKey: 'minimumBillingCents',
    header: 'Faturamento mínimo',
    cell: ({ getValue }) => {
      const centavos = getValue<number | null>()
      return centavos === null || centavos === undefined ? '—' : formatMoneyBRL(centavos)
    },
  },
]

const colunasDeTransportadora: ColumnDef<Transportadora>[] = [
  { accessorKey: 'codigo', header: 'Código' },
  {
    accessorKey: 'nome',
    header: 'Transportadora',
    cell: ({ getValue }) => <Nome>{getValue<string>()}</Nome>,
  },
  { accessorKey: 'municipio', header: 'Município' },
  { accessorKey: 'uf', header: 'UF' },
]

/**
 * O FORNECEDOR da ordem, e o faturamento mínimo que vem com ele.
 *
 * O mínimo é ECOADO na emissão (`minimumBillingCents`) e a partir daí é cópia
 * congelada: mudar o cadastro do fornecedor amanhã não muda a régua desta
 * ordem. Enquanto a ordem não existe, a tela usa o do cadastro — é a única
 * forma de avisar ANTES de gravar, que é quando o aviso ainda serve.
 *
 * Trocar o fornecedor com linhas na grade não é permitido: as linhas vieram de
 * pedidos DAQUELE fornecedor, e a ordem de outro com as mesmas linhas seria
 * recusada pelo servidor com uma frase que não fala de fornecedor nenhum.
 */
function BlocoDoFornecedor({ bloqueado }: { bloqueado: boolean }) {
  const { setValue } = useFormContext<OrdemNoFormulario>()
  const fornecedor = useWatch({ name: 'fornecedor' }) as string
  const itens = (useWatch({ name: 'itens' }) as LinhaNoFormulario[] | undefined) ?? []
  const [buscaAberta, setBuscaAberta] = useState(false)

  const temLinhas = itens.length > 0

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
      <span>
        <span className="text-muted-foreground">Fornecedor:</span>{' '}
        <output aria-label="Fornecedor da ordem">
          {fornecedor ? <Nome>{fornecedor}</Nome> : '—'}
        </output>
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={bloqueado || temLinhas}
        title={
          temLinhas
            ? 'A ordem já tem linhas de pedidos deste fornecedor. Remova as linhas para trocar.'
            : undefined
        }
        onClick={() => setBuscaAberta(true)}
      >
        <Search className="size-4" /> Escolher fornecedor
      </Button>
      <SearchDialog
        open={buscaAberta}
        onOpenChange={setBuscaAberta}
        title="Busca de Fornecedor"
        columns={colunasDeFornecedor}
        queryKey={['fornecedores', 'ordem-de-compra']}
        fetcher={(state) => data.fornecedores.list(state)}
        onSelect={(f) => {
          setValue('fornecedorId', f.id, { shouldDirty: true })
          setValue('fornecedor', f.legalName ?? '', { shouldDirty: true })
          // O mínimo do CADASTRO enquanto a ordem não tem o seu; depois da
          // emissão o servidor devolve o congelado e este valor é sobrescrito.
          setValue('faturamentoMinimoCentavos', f.minimumBillingCents ?? null, {
            shouldDirty: true,
          })
        }}
      />
    </div>
  )
}

/** A EMPRESA COMPRADORA — qual empresa do grupo está comprando (fase A0). */
function CampoEmpresaCompradora() {
  const { setValue } = useFormContext<OrdemNoFormulario>()
  const { empresas, ativa } = useEmpresasDaSessao()
  const escolhida = useWatch({ name: 'empresaCompradoraId' }) as string

  // Ordem nova nasce comprando pela empresa ATIVA — é o caso comum, e deixar o
  // campo vazio faria toda ordem começar com um 400 esperando o operador.
  useEffect(() => {
    if (!escolhida && ativa) {
      setValue('empresaCompradoraId', ativa.tenantId, { shouldDirty: false })
      setValue('empresaCompradora', ativa.name ?? '', { shouldDirty: false })
    }
  }, [escolhida, ativa, setValue])

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="empresa-compradora">Empresa Compradora</Label>
      <select
        id="empresa-compradora"
        className="flex h-9 w-full border-2 border-input bg-card px-2.5 py-1 text-sm outline-none focus-visible:focus-ring"
        value={escolhida}
        onChange={(evento) => {
          const empresa = empresas.find((e) => e.tenantId === evento.target.value)
          setValue('empresaCompradoraId', evento.target.value, { shouldDirty: true })
          setValue('empresaCompradora', empresa?.name ?? '', { shouldDirty: true })
        }}
      >
        <option value="">Selecione…</option>
        {empresas.map((e) => (
          <option key={e.tenantId} value={e.tenantId}>
            {e.name}
          </option>
        ))}
      </select>
    </div>
  )
}

/**
 * A CONDIÇÃO DE PAGAMENTO da ordem — a aba Pagamento do G1, reutilizada.
 *
 * Só a escolha da condição: o parcelamento do documento de COMPRA não está no
 * contrato (a ordem não publica `paymentInstallments`), e desenhar parcelas
 * aqui seria inventar do lado do cliente uma conta que ninguém decidiu.
 */
function AbaPagamento() {
  const { setValue } = useFormContext<OrdemNoFormulario>()
  const { condicoes, carregando } = useCondicoesDePagamento()
  const escolhida = useWatch({ name: 'condicaoPagamentoId' }) as string | null
  const nomeCarimbado = useWatch({ name: 'condicaoPagamento' }) as string | null

  return (
    <Secao
      numero="06"
      titulo="Pagamento"
      cor="money"
      icone={FileText}
      nota="em quantas vezes, e quando"
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5 sm:max-w-sm">
          <Label htmlFor="condicao-pagamento">Condição de pagamento</Label>
          <select
            id="condicao-pagamento"
            className="flex h-9 w-full border-2 border-input bg-card px-2.5 py-1 text-sm outline-none focus-visible:focus-ring"
            value={escolhida ?? ''}
            disabled={carregando}
            onChange={(evento) => {
              const condicao = condicoes.find((c) => c.id === evento.target.value)
              setValue('condicaoPagamentoId', evento.target.value || null, { shouldDirty: true })
              setValue('condicaoPagamento', condicao?.name ?? null, { shouldDirty: true })
            }}
          >
            <option value="">Sem condição definida</option>
            {condicoes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {/* A condição CARIMBADA continua legível mesmo se tiver sido desativada
            depois — o combo só oferece as ativas, e sem esta linha o documento
            antigo pareceria estar sem condição nenhuma. */}
        {nomeCarimbado && !condicoes.some((c) => c.id === escolhida) ? (
          <p className="text-muted-foreground text-sm">
            Condição carimbada no documento: <Nome>{nomeCarimbado}</Nome>
          </p>
        ) : null}
      </div>
    </Secao>
  )
}

function BlocoTransportadora() {
  const { setValue } = useFormContext<OrdemNoFormulario>()
  const transportadora = useWatch({ name: 'transportadora' }) as string | null
  const [buscaAberta, setBuscaAberta] = useState(false)

  useEffect(() => bindShortcut(SHORTCUTS.transportadora, () => setBuscaAberta(true)))

  return (
    <FormBlock legend="Transportadora">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span>
          <span className="text-muted-foreground">Nome:</span>{' '}
          <output aria-label="Nome da transportadora">
            {transportadora ? <Nome>{transportadora}</Nome> : '—'}
          </output>
        </span>
        <Button type="button" variant="outline" size="sm" onClick={() => setBuscaAberta(true)}>
          <Search /> Busca <kbd>{shortcutLabel(SHORTCUTS.transportadora)}</kbd>
        </Button>
      </div>
      <SearchDialog
        open={buscaAberta}
        onOpenChange={setBuscaAberta}
        title="Busca de Transportadora"
        columns={colunasDeTransportadora}
        queryKey={['transportadoras']}
        fetcher={(state) => data.transportadoras.list(state)}
        onSelect={(t) => {
          // A transportadora é PARCEIRO no contrato (`carrierId`), e a tabela de
          // apoio daqui não tem o id dele. Enquanto o cadastro de
          // transportadoras não existir como parceiro, o nome viaja para a tela
          // e o `carrierId` continua nulo: id inventado casaria com parceiro
          // que não existe, e o servidor recusaria a ordem inteira por causa da
          // transportadora.
          setValue('transportadora', t.nome, { shouldDirty: true })
        }}
      />
    </FormBlock>
  )
}

/**
 * O AVISO do faturamento mínimo (§7.1) — antes de gravar, não depois.
 *
 * O servidor recusa a ordem abaixo do mínimo com 409
 * (`faturamento-minimo-nao-atingido`), e essa recusa está certa. O que ela não
 * faz é impedir o comprador de montar a ordem inteira para descobrir no fim.
 * Aqui a conta é a MESMA do contrato: soma das linhas, sem o acréscimo — frete
 * e taxa não contam para o mínimo, e somá-los liberaria uma ordem que o
 * servidor recusa.
 */
function AvisoDeFaturamentoMinimo() {
  const minimo = useWatch({ name: 'faturamentoMinimoCentavos' }) as number | null
  const itens = (useWatch({ name: 'itens' }) as LinhaNoFormulario[] | undefined) ?? []

  if (minimo === null || minimo === undefined) return null

  const falta = faltaParaOMinimo({ faturamentoMinimoCentavos: minimo, itens })

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
      <span>
        <span className="text-muted-foreground">Faturamento mínimo do fornecedor:</span>{' '}
        <output aria-label="Faturamento mínimo">{formatMoneyBRL(minimo)}</output>
      </span>
      {falta === null ? (
        <span className="text-muted-foreground">Mínimo atingido.</span>
      ) : (
        // `<output>` e não `<span role="status">`: o elemento semântico já É a
        // região viva, e o biome recusa o papel posto à mão.
        <output className="font-semibold text-warn" aria-label="Falta para o mínimo">
          Faltam {formatMoneyBRL(falta)} para o mínimo — o fornecedor recusa a ordem abaixo dele.
        </output>
      )}
    </div>
  )
}

/**
 * "Produtos Pedidos" do legado: traz as linhas AINDA ABERTAS dos pedidos do
 * fornecedor escolhido.
 *
 * É por aqui que a ordem ganha conteúdo — ela não tem linha própria, toda linha
 * dela veio de um pedido. Só as `open` aparecem: a linha já levada por outra
 * ordem seria recusada com `item-ja-em-ordem`, e oferecê-la seria montar uma
 * ordem que só falha ao gravar.
 */
function TrazerLinhasDePedidos({
  fornecedorId,
  jaNaOrdem,
  onTrazer,
}: {
  fornecedorId: string
  jaNaOrdem: readonly LinhaNoFormulario[]
  onTrazer: (linhas: LinhaNoFormulario[]) => void
}) {
  const [aberto, setAberto] = useState(false)
  const { data: pedidos, isPending, isError } = usePedidosComLinhaAberta(fornecedorId, aberto)

  function trazer(indice: number) {
    const pedido = pedidos?.[indice]
    if (!pedido) return
    const candidatas = linhasAbertasParaOrdem(pedido, fornecedorId)
      .filter(
        (linha) =>
          !jaNaOrdem.some(
            (existente) =>
              existente.pedidoOrigemId === linha.pedidoOrigemId &&
              existente.linhaDeOrigem === linha.linhaDeOrigem,
          ),
      )
      .map(linhaParaFormulario)
    onTrazer(candidatas)
    setAberto(false)
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!fornecedorId}
        title={!fornecedorId ? 'Escolha o fornecedor primeiro.' : undefined}
        onClick={() => setAberto(true)}
      >
        <List className="size-4" /> Produtos Pedidos
      </Button>
      <Dialog isOpen={aberto} onOpenChange={setAberto} className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Pedidos em aberto deste fornecedor</DialogTitle>
        </DialogHeader>
        {isPending ? (
          <p className="text-muted-foreground text-sm">Carregando…</p>
        ) : isError ? (
          <p className="text-sm text-warn">Não foi possível consultar os pedidos de compra.</p>
        ) : (pedidos ?? []).length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhum pedido com linha em aberto para este fornecedor.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {(pedidos ?? []).map((pedido, indice) => (
              <li key={pedido.id} className="flex items-center justify-between gap-3 text-sm">
                <span>
                  <span className="font-semibold">{pedido.numero}</span>{' '}
                  <span className="text-muted-foreground">
                    {formatDateBR(pedido.dataEmissao)}
                    {pedido.cliente ? ` · ${pedido.cliente}` : ' · estoque'}
                  </span>
                </span>
                <Button type="button" variant="outline" size="sm" onClick={() => trazer(indice)}>
                  Trazer linhas
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Dialog>
    </>
  )
}

/**
 * DESCONTO GERAL da ordem, em PERCENTUAL — e é aí que ele difere do legado.
 *
 * A tela antiga tinha desconto em centavos, ao lado do acréscimo. O contrato
 * separa os dois de propósito: desconto é `discountPercent` (inteiro com 4
 * casas implícitas, `10000` = 1%) e acréscimo é `surchargeCents` — porque
 * acréscimo é frete e taxa, valor que ninguém aplica em percentual. Guardar o
 * desconto em centavos aqui obrigaria a tela a dividir pelo subtotal para
 * mandar percentual, e essa divisão mudaria o desconto toda vez que uma linha
 * mudasse de valor.
 *
 * O campo digita em PORCENTO e guarda na escala; `PERCENT_ESCALA` é a mesma
 * constante do resto da casa, nunca um `10000` solto aqui.
 */
function CampoDeDesconto({ className }: { className?: string }) {
  const { setValue } = useFormContext<OrdemNoFormulario>()
  const valor = (useWatch({ name: 'descontoPercentual' }) as number) ?? 0

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor="desconto-percentual">Desconto (%)</Label>
      <Input
        id="desconto-percentual"
        inputMode="decimal"
        value={formatPercent(valor)}
        onChange={(evento) => {
          const digitado = Number(evento.target.value.replace(/\./g, '').replace(',', '.'))
          setValue(
            'descontoPercentual',
            Number.isFinite(digitado) ? Math.round(digitado * PERCENT_ESCALA) : 0,
            { shouldDirty: true },
          )
        }}
      />
    </div>
  )
}

function GradeItens({ fornecedorId }: { fornecedorId: string }) {
  const itens = (useWatch({ name: 'itens' }) as LinhaNoFormulario[] | undefined) ?? []
  const desconto = (useWatch({ name: 'descontoPercentual' }) as number) ?? 0
  const acrescimo = (useWatch({ name: 'acrescimoCentavos' }) as number) ?? 0

  const subtotal = subtotalDaOrdem(itens)
  const descontoEmCentavos = Math.round((subtotal * desconto) / 1_000_000)

  return (
    <FormGrid
      name="itens"
      hideAdd
      actions={(append) => (
        <TrazerLinhasDePedidos
          fornecedorId={fornecedorId}
          jaNaOrdem={itens}
          onTrazer={(linhas) => {
            for (const linha of linhas) append({ ...linha })
          }}
        />
      )}
      columns={[
        {
          // A VOLTA para o pedido: qual documento originou esta linha.
          key: 'pedidoOrigemNumero',
          label: 'Ped. Compra',
          type: 'computed',
          compute: (row: FormGridRow) => String(row.pedidoOrigemNumero ?? '') || '—',
        },
        { key: 'descricao', label: 'Descrição do Produto', voz: 'produto' },
        { key: 'acabamento', label: 'Acab.' },
        { key: 'tamanho', label: 'Tamanho' },
        { key: 'quantidade', label: 'Quantidade' },
        { key: 'unidade', label: 'Unidade', type: 'select', options: tabelas.unidades },
        { key: 'custoUnitarioCentavos', label: 'Custo Unit.', type: 'money' },
        {
          key: 'valorTotal',
          label: 'Valor Total',
          type: 'computed',
          compute: (row: FormGridRow) => {
            const quantidade = Number(String(row.quantidade ?? '0').replace(',', '.')) || 0
            const custo = Number(row.custoUnitarioCentavos ?? 0)
            return formatMoneyBRL(Math.round(quantidade * custo))
          },
        },
        {
          key: 'destinoRotulo',
          label: 'Destino',
          type: 'computed',
          compute: (row: FormGridRow) => String(row.destinoRotulo ?? '') || '—',
        },
      ]}
      newRow={{
        linha: 0,
        pedidoOrigemId: '',
        pedidoOrigemNumero: '',
        linhaDeOrigem: 0,
        varianteId: null,
        descricao: '',
        acabamento: '',
        tamanho: '',
        unidade: 'UN',
        quantidade: '',
        custoUnitarioCentavos: null,
        totalCentavos: 0,
        destinoRotulo: DESTINO_ROTULO.stock,
        grupoProdutoId: null,
        grupoProduto: null,
      }}
      totals={{
        valueColumnKey: 'valorTotal',
        rows: fileirasTotais(subtotal, [
          {
            label: `Desconto (${formatPercent(desconto)}%)`,
            valorCentavos: descontoEmCentavos,
            sinal: -1,
          },
          { label: 'Acréscimo', valorCentavos: acrescimo, sinal: 1 },
        ]),
      }}
    />
  )
}

/**
 * REAGENDAR (§7.1) — a data reprometida, com o motivo.
 *
 * Duas recusas de DESENHO, e a tela não deixa o operador descobri-las pelo 409:
 * só ordem ENVIADA se reagenda (a `draft` se corrige pelo próprio `Gravar`), e
 * ordem sem data prometida não ganha data por aqui — o CHECK da `0038` exige a
 * promessa original. A segunda é um beco conhecido: ordem enviada sem
 * `expectedAt` não tem como ganhar uma, e quem for mexer nisso decide do lado
 * do contrato, não desta tela.
 */
function DialogoDeReagendamento({ ordem }: { ordem: OrdemDeCompra }) {
  const [aberto, setAberto] = useState(false)
  const [dataPrevista, setDataPrevista] = useState('')
  const [motivo, setMotivo] = useState('')
  const reagendar = useReagendarOrdemDeCompra()

  const podeReagendar = ordem.situacao === 'sent' && Boolean(ordem.dataPrevista)
  if (ordem.situacao !== 'sent') return null

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!podeReagendar}
        title={
          podeReagendar
            ? undefined
            : 'Esta ordem foi enviada sem data prometida — não há promessa original para reagendar.'
        }
        onClick={() => setAberto(true)}
      >
        <CalendarClock className="size-4" /> Reagendar
      </Button>
      <Dialog isOpen={aberto} onOpenChange={setAberto} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reagendar a ordem {ordem.numero}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <p className="text-muted-foreground text-sm">
            A promessa original ({formatDateBR(ordem.dataPrevista)}) continua registrada — é contra
            ela que o atraso é medido.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reagenda-data">Nova data prevista</Label>
            <Input
              id="reagenda-data"
              type="date"
              value={dataPrevista}
              onChange={(evento) => setDataPrevista(evento.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reagenda-motivo">Motivo</Label>
            <Input
              id="reagenda-motivo"
              value={motivo}
              placeholder="Por que a data mudou"
              onChange={(evento) => setMotivo(evento.target.value)}
            />
          </div>
          <ErroDeGravacao
            mutacao={reagendar}
            erro={reagendar.error}
            mensagem="Não foi possível reagendar a ordem."
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setAberto(false)}>
              Fechar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!dataPrevista || !motivo.trim() || reagendar.isPending}
              onClick={() =>
                reagendar.mutate(
                  { id: ordem.id, dataPrevista, motivo: motivo.trim() },
                  { onSuccess: () => setAberto(false) },
                )
              }
            >
              Reagendar
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}

/**
 * A CHEGADA vinda do pedido de compra (`?dePedido=…&fornecedor=…`).
 *
 * O botão "Gerar ordem de compra" do pedido navega para cá, e é aqui que a
 * ordem nasce com conteúdo: fornecedor, as linhas AINDA ABERTAS daquele
 * fornecedor com a origem amarrada, o faturamento mínimo do cadastro e a data
 * prevista sugerida pelo prazo de entrega — o contrato diz, em `expectedAt`,
 * que ela é "sugerida a partir de `PartnerDto.deliveryDays`, mas guardada como
 * decisão".
 *
 * Semeia UMA vez (`aplicada`), e é o ponto inteiro: sem a trava, toda releitura
 * da consulta reporia as linhas por cima do que o comprador acabou de ajustar —
 * e o sintoma seria a quantidade "voltando sozinha" sem nada no caminho que
 * fale de semente.
 */
function SementeDoPedido({ pedidoId, fornecedorId }: { pedidoId: string; fornecedorId: string }) {
  const { setValue } = useFormContext<OrdemNoFormulario>()
  const { data: pedidos } = usePedidosComLinhaAberta(fornecedorId)
  const { data: fornecedor } = useQuery({
    queryKey: ['parceiro', fornecedorId],
    enabled: Boolean(fornecedorId),
    queryFn: () => obterParceiro(fornecedorId),
  })
  const aplicada = useRef(false)

  useEffect(() => {
    if (aplicada.current) return
    const pedido = pedidos?.find((p) => p.id === pedidoId)
    if (!pedido) return
    aplicada.current = true

    const nome = fornecedoresComLinhaAberta(pedido).find((f) => f.id === fornecedorId)?.nome ?? ''
    setValue('fornecedorId', fornecedorId, { shouldDirty: true })
    setValue('fornecedor', nome, { shouldDirty: true })
    setValue('itens', linhasAbertasParaOrdem(pedido, fornecedorId).map(linhaParaFormulario), {
      shouldDirty: true,
    })
  }, [pedidos, pedidoId, fornecedorId, setValue])

  useEffect(() => {
    if (!fornecedor) return
    setValue('faturamentoMinimoCentavos', fornecedor.minimumBillingCents ?? null, {
      shouldDirty: false,
    })
    if (fornecedor.deliveryDays) {
      const prevista = new Date()
      prevista.setDate(prevista.getDate() + fornecedor.deliveryDays)
      setValue('dataPrevista', prevista.toISOString().slice(0, 10), { shouldDirty: true })
    }
  }, [fornecedor, setValue])

  return null
}

function AbaPrincipal({ ordem }: { ordem: OrdemDeCompra }) {
  const enviada = ordem.situacao === 'sent'
  // Do FORMULÁRIO e não da prop: numa ordem semeada pelo pedido, o fornecedor
  // só existe depois que a semente foi aplicada — lido da prop, o "Produtos
  // Pedidos" nasceria desabilitado e nunca se habilitaria.
  const fornecedorId = (useWatch({ name: 'fornecedorId' }) as string) ?? ''

  return (
    <div data-zonas className="flex flex-col gap-4">
      <DocumentoBloco className="flex flex-col gap-4">
        <Secao
          numero="01"
          titulo="Fornecedor & Compra"
          cor="id"
          icone={Building2}
          nota="de quem se compra, e por qual empresa"
        >
          <div className="flex flex-col gap-3">
            <BlocoDoFornecedor bloqueado={enviada} />
            <div className="grid grid-cols-12 items-end gap-3">
              <div className="col-span-12 sm:col-span-4">
                <CampoEmpresaCompradora />
              </div>
            </div>
            <AvisoDeFaturamentoMinimo />
          </div>
        </Secao>

        <Secao
          numero="02"
          titulo="Identificação"
          cor="info"
          icone={Hash}
          nota="números e datas do documento"
        >
          <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
            <span className="text-sm">
              <span className="text-muted-foreground">Número:</span>{' '}
              <output aria-label="Número da ordem">{ordem.numero || '— a emitir'}</output>
            </span>
            <span className="text-sm">
              <span className="text-muted-foreground">Situação:</span>{' '}
              <output aria-label="Situação da ordem">{SITUACAO_DA_ORDEM[ordem.situacao]}</output>
            </span>
            <DateField name="dataOrdem" label="Data Ordem" className="w-40" />
            <DateField name="dataPrevista" label="Data Prevista" className="w-40" />
            <span className="text-sm">
              <span className="text-muted-foreground">Envio:</span>{' '}
              <output aria-label="Data de envio">{formatDateBR(ordem.dataEnvio) || '—'}</output>
            </span>
            <span className="text-sm">
              <span className="text-muted-foreground">Reagendada:</span>{' '}
              <output aria-label="Data reagendada">
                {ordem.dataReagendada
                  ? `${formatDateBR(ordem.dataReagendada)}${
                      ordem.motivoDoReagendamento ? ` — ${ordem.motivoDoReagendamento}` : ''
                    }`
                  : '—'}
              </output>
            </span>
          </div>
        </Secao>
      </DocumentoBloco>

      <Secao numero="03" titulo="Itens" cor="info" icone={List} nota="o que se está comprando">
        <GradeItens fornecedorId={fornecedorId} />
      </Secao>

      <Secao
        numero="04"
        titulo="Ajustes"
        cor="warn"
        icone={Percent}
        nota="o que soma e o que subtrai do total"
      >
        <div className="grid grid-cols-12 items-end gap-3">
          <CampoDeDesconto className="col-span-6 sm:col-span-2" />
          <MoneyField
            name="acrescimoCentavos"
            label="Acréscimo"
            className="col-span-6 sm:col-span-2"
          />
        </div>
      </Secao>

      <Secao
        numero="05"
        titulo="Entrega"
        cor="info"
        icone={Truck}
        nota="quem leva, e o que o comprador anotou"
      >
        <div className="flex flex-col gap-4">
          <BlocoTransportadora />
          <TextareaField name="observacao" label="Observação" rows={3} />
        </div>
      </Secao>
    </div>
  )
}

export function OrdemCompraForm({
  ordem,
  readOnly = false,
  semente,
}: {
  ordem: OrdemDeCompra
  readOnly?: boolean
  /** De onde a ordem NOVA veio, quando veio de um pedido de compra. */
  semente?: { pedidoId: string; fornecedorId: string }
}) {
  const navigate = useNavigate()
  const gravar = useGravarOrdemDeCompra()
  const enviar = useEnviarOrdemDeCompra()
  const cancelar = useCancelarOrdemDeCompra()

  function onGravar(valores: OrdemNoFormulario) {
    // O DESTINO é a regra única da #405 (`components/cabinet/pos-gravar.ts`):
    // documento novo abre a ordem que nasceu, alteração permanece na tela.
    gravar.mutate(doFormulario(valores), {
      onSuccess: posGravar<PurchaseOrderDto>({
        eraNovo: !ordem.id,
        abrirDocumento: (ordemId) =>
          void navigate({ to: '/compras/ordens/$ordemId', params: { ordemId }, replace: true }),
      }),
    })
  }

  const enviada = ordem.situacao === 'sent'
  const cancelada = ordem.situacao === 'cancelled'
  // Depois do envio o `PUT` é 409: a tela não oferece edição que o servidor
  // recusaria, mas continua mostrando o documento e os gestos que valem.
  const somenteLeitura = readOnly || enviada || cancelada

  const origens = [...new Map(ordem.itens.map((i) => [i.pedidoOrigemId, i])).values()]

  return (
    <>
      <CadastroForm
        schema={ordemCompraSchema}
        defaultValues={paraFormulario(ordem)}
        onGravar={onGravar}
        onCancelar={() => void navigate({ to: '/compras/ordens' })}
        readOnly={somenteLeitura}
        gravando={gravar.isPending}
        gravou={gravar.isSuccess}
        familia="purchases"
      >
        <ErroDeGravacao
          mutacao={gravar}
          erro={gravar.error}
          mensagem="Não foi possível gravar a ordem de compra."
        />
        {semente && !ordem.id ? (
          <SementeDoPedido pedidoId={semente.pedidoId} fornecedorId={semente.fornecedorId} />
        ) : null}

        <Tabs defaultValue="principal">
          <TabsList className="flex-wrap">
            <TabsTrigger value="principal">Principal</TabsTrigger>
            <TabsTrigger value="pagamento">Pagamento</TabsTrigger>
          </TabsList>
          <TabsContent value="principal">
            <AbaPrincipal ordem={ordem} />
          </TabsContent>
          <TabsContent value="pagamento">
            <AbaPagamento />
          </TabsContent>
        </Tabs>
      </CadastroForm>

      {/* FORA do `<CadastroForm>`, e é o defeito que este trecho pagou uma vez:
          o formulário embrulha os filhos num `<fieldset disabled>` quando está
          em somente-leitura, e ordem ENVIADA é somente-leitura de propósito (o
          `PUT` é 409). Dentro dele, `Reagendar`, `Cancelar` e a volta para o
          pedido de origem nasciam DESABILITADOS — justamente na situação em que
          são os únicos gestos que restam. Transição de documento não é campo. */}
      <ErroDeGravacao
        mutacao={enviar}
        erro={enviar.error}
        mensagem="Não foi possível enviar a ordem ao fornecedor."
      />
      <ErroDeGravacao
        mutacao={cancelar}
        erro={cancelar.error}
        mensagem="Não foi possível cancelar a ordem."
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* A VOLTA ordem → pedido: um botão por pedido de ORIGEM. Não é um
          `navigate` para a listagem — a ordem sabe de quais documentos ela
          nasceu, e mandar o operador procurar seria jogar fora esse dado. */}
        <div className="flex flex-wrap items-center gap-2">
          {origens.length > 0 ? (
            <span className="text-muted-foreground text-sm">Pedidos de origem:</span>
          ) : null}
          {origens.map((item) => (
            <Button
              key={item.pedidoOrigemId}
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                void navigate({
                  to: '/compras/pedidos/$pedidoId',
                  params: { pedidoId: item.pedidoOrigemId },
                  search: {},
                })
              }
            >
              <FileText className="size-4" /> {item.pedidoOrigemNumero}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {ordem.id && ordem.situacao === 'draft' && !readOnly ? (
            <Button
              type="button"
              size="sm"
              disabled={enviar.isPending}
              onClick={() => enviar.mutate({ id: ordem.id })}
            >
              <Send className="size-4" /> Enviar ao fornecedor
            </Button>
          ) : null}
          <DialogoDeReagendamento ordem={ordem} />
          {ordem.id && !cancelada && !readOnly ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={cancelar.isPending}
              onClick={() =>
                cancelar.mutate(ordem.id, {
                  onSuccess: () => void navigate({ to: '/compras/ordens' }),
                })
              }
            >
              Cancelar ordem
            </Button>
          ) : null}
        </div>
      </div>
    </>
  )
}
