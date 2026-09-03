import type { PurchaseOrderDto } from '@/api/gerado'
import { CadastroForm } from '@/components/cabinet/cadastro-form'
import { DocumentoBloco } from '@/components/cabinet/documento'
import { ErroDeGravacao } from '@/components/cabinet/erro-do-servidor'
import { DateField, MoneyField, TextareaField } from '@/components/cabinet/form-controls'
import { posGravar } from '@/components/cabinet/pos-gravar'
import { Secao } from '@/components/cabinet/secao'
import { Button } from '@/components/ui/button'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DESTINO_ROTULO,
  type ItemDaOrdemDeCompra,
  type OrdemDeCompra,
  SITUACAO_DA_ORDEM,
  fornecedoresComLinhaAberta,
  linhasAbertasParaOrdem,
  useCancelarOrdemDeCompra,
  useEnviarOrdemDeCompra,
  useGravarOrdemDeCompra,
  usePedidosComLinhaAberta,
  useReagendarOrdemDeCompra,
} from '@/data/compras-api'
import { obterParceiro } from '@/data/parceiros-api'
import { PERCENT_ESCALA, formatDateBR, formatPercent } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { CalendarClock, FileText, Hash, List, Percent, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { ItensDaOrdem } from './itens-da-ordem'
import { LateralDaOrdem } from './lateral-da-ordem'

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
export interface LinhaNoFormulario {
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

export function linhaParaFormulario(item: ItemDaOrdemDeCompra): LinhaNoFormulario {
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

/**
 * A COLUNA PRINCIPAL — o que se PREENCHE.
 *
 * Reface 2.0 (D18): as seções `Fornecedor & Compra`, `Transportadora` e a aba
 * `Pagamento` saíram daqui e viraram cartões tintados na lateral. O que ficou
 * é o documento propriamente dito — os números que o operador digita e a conta
 * que sai deles. Antes eram cinco seções numeradas e duas abas para um
 * documento cujo miolo é uma grade.
 */
function ColunaPrincipal({ ordem }: { ordem: OrdemDeCompra }) {
  // Do FORMULÁRIO e não da prop: numa ordem semeada pelo pedido, o fornecedor
  // só existe depois que a semente foi aplicada — lido da prop, o "Produtos
  // Pedidos" nasceria desabilitado e nunca se habilitaria.
  const fornecedorId = (useWatch({ name: 'fornecedorId' }) as string) ?? ''

  return (
    <div data-zonas className="flex min-w-0 flex-col gap-4">
      <DocumentoBloco className="flex flex-col gap-4">
        <Secao
          numero="01"
          titulo="Identificação"
          cor="info"
          icone={Hash}
          nota="números e datas do documento"
        >
          {/* Reface 2.0 (D18): `Envio` e `Reagendada` SAÍRAM daqui. Eram dois
              campos de leitura que diziam, em prosa e sem ordem, o que a
              timeline da lateral diz como posição — e diziam pior: `Envio: —`
              não informa se o envio ainda vem ou se já não vem mais, e a data
              reagendada solta parecia sempre ter sido aquela. Repetir os dois
              nas duas colunas daria ao operador duas fontes para a mesma
              pergunta, e a de cima é a que ele lê primeiro. */}
          <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
            <span className="t-corpo">
              <span className="t-rotulo">Número</span>{' '}
              <output aria-label="Número da ordem" className="t-dado">
                {ordem.numero || '— a emitir'}
              </output>
            </span>
            <span className="t-corpo">
              <span className="t-rotulo">Situação</span>{' '}
              <output aria-label="Situação da ordem">{SITUACAO_DA_ORDEM[ordem.situacao]}</output>
            </span>
            <DateField name="dataOrdem" label="Data Ordem" className="w-40" />
            <DateField name="dataPrevista" label="Data Prevista" className="w-40" />
          </div>
        </Secao>
      </DocumentoBloco>

      <Secao numero="02" titulo="Itens" cor="info" icone={List} nota="o que se está comprando">
        <ItensDaOrdem fornecedorId={fornecedorId} />
      </Secao>

      <Secao
        numero="03"
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
        numero="04"
        titulo="Observação"
        cor="info"
        icone={FileText}
        nota="o que o comprador anotou"
      >
        <TextareaField name="observacao" label="Observação" rows={3} />
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

        {/* PRINCIPAL › LATERAL: a fronteira entre as colunas é ESPAÇO
            (`--s-4` = 16px), sem linha — §Hierarquia manda a ferramenta mais
            barata que resolve, e duas colunas já se separam sozinhas.

            `flex-wrap` com bases em `rem`, e não `lg:` — a rodada proíbe
            `@media` para quebra. A lateral desce para baixo do documento
            quando as duas bases não cabem, sem ponto de quebra decorado. */}
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-[3_1_32rem]">
            <ColunaPrincipal ordem={ordem} />
          </div>
          <div className="min-w-0 flex-[1_1_18rem]">
            <LateralDaOrdem ordem={ordem} />
          </div>
        </div>
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
