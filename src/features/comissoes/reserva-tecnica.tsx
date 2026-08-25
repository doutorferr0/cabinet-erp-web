import type { OrderDto, TechnicalReserveDto } from '@/api/gerado'
import { AvisoDeCobertura } from '@/components/cabinet/aviso-de-cobertura'
import { cadastroActions } from '@/components/cabinet/cadastro-actions'
import { VitraDataTable } from '@/components/cabinet/data-table'
import { ComboDeEscolha } from '@/components/cabinet/lookup-combo'
import { PageHeader } from '@/components/cabinet/page-header'
import { Painel } from '@/components/cabinet/painel'
import { SearchDialog } from '@/components/cabinet/search-dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { data } from '@/data'
import {
  ROTULO_DA_SITUACAO_DE_RT,
  ROTULO_DO_TIPO_DE_RT,
  type RecorteDeReservaTecnica,
  listarReservasTecnicas,
  motivoDaRecusa,
  useCancelarReservaTecnica,
  useLancarReservaTecnica,
} from '@/data/comissoes-api'
import { useReadOnlyPorPapel } from '@/data/papeis'
import { useEspecificadorOptions } from '@/data/parceiros-api'
import { avisar } from '@/lib/avisos'
import { formatDateBR, formatMoneyBRL } from '@/lib/formatters'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import { useId, useState } from 'react'

/**
 * A RESERVA TÉCNICA — o que o profissional externo recebe pela indicação.
 *
 * `Reserva_tecnica` do legado: 1.212 lançamentos para 11.103 pedidos, porque nem
 * toda participação vira pagamento. O documento guarda a PARTICIPAÇÃO; este
 * lançamento é o momento em que ela vira valor apurado, e é dele que o
 * fechamento gera título no contas a pagar.
 *
 * ## O valor não vem desta tela, e é a decisão central do trilho
 *
 * O corpo de escrita não tem valor: quem calcula `productCents` e `serviceCents`
 * é o SERVIDOR, sobre a participação congelada no documento, as linhas dele e a
 * devolução já abatida. Valor vindo daqui seria o cliente afirmando quanto o
 * profissional ganha — a mesma família do percentual, e a mesma recusa.
 *
 * Também não existe "RT automática" para ligar aqui: `Par_RTautomatico` do
 * legado liga o CÁLCULO da participação, e as colunas `Ven_RtAutomatico`/
 * `Ven_RtCalcular` estão vazias em 34.136 linhas. O automático é propriedade do
 * cálculo, e o cálculo é do servidor.
 *
 * ## Por que a grade não tem `Alterar` nem `Consul.`
 *
 * O contrato publica três operações: listar, lançar e cancelar. Não há detalhe
 * por id — e o registry deste repo já escreve a regra: `get` só entra quando o
 * caminho existe de verdade, porque tela em branco é pior que ação indisponível.
 *
 * ## O valor vem quebrado por natureza, e a coluna respeita isso
 *
 * Produto e serviço pagam por regras diferentes — as faixas por grupo só
 * alcançam produto, e serviço cai no percentual geral. Um total único apagaria a
 * distinção que decide o número, e é por isso que as três colunas convivem.
 */

const colunas: ColumnDef<TechnicalReserveDto>[] = [
  {
    accessorKey: 'issuedAt',
    header: 'Emissão',
    cell: ({ getValue }) => formatDateBR(getValue<string>()),
  },
  { accessorKey: 'orderNumber', header: 'Pedido' },
  { accessorKey: 'partnerName', header: 'Profissional' },
  {
    accessorKey: 'kind',
    header: 'Tipo',
    // Fora da whitelist de `sortBy` do contrato: a coluna aparece e não ordena,
    // o que é melhor que um cabeçalho que responde 400 ao primeiro clique.
    enableSorting: false,
    cell: ({ getValue }) => ROTULO_DO_TIPO_DE_RT[getValue<TechnicalReserveDto['kind']>()] ?? '—',
  },
  {
    accessorKey: 'productCents',
    header: 'Produto',
    enableSorting: false,
    cell: ({ getValue }) => formatMoneyBRL(getValue<number>()),
  },
  {
    accessorKey: 'serviceCents',
    header: 'Serviço',
    enableSorting: false,
    cell: ({ getValue }) => formatMoneyBRL(getValue<number>()),
  },
  {
    accessorKey: 'totalCents',
    header: 'Total',
    cell: ({ getValue }) => formatMoneyBRL(getValue<number>()),
  },
  {
    accessorKey: 'status',
    header: 'Situação',
    cell: ({ getValue }) =>
      ROTULO_DA_SITUACAO_DE_RT[getValue<TechnicalReserveDto['status']>()] ?? '—',
  },
]

const COLUNAS_DE_PEDIDO: ColumnDef<OrderDto>[] = [
  { accessorKey: 'number', header: 'Número' },
  { accessorKey: 'customerName', header: 'Cliente' },
  {
    accessorKey: 'issuedAt',
    header: 'Emissão',
    cell: ({ getValue }) => formatDateBR(getValue<string | null>()),
  },
]

interface Rascunho {
  pedidoId: string | null
  pedidoNumero: string
  parceiroId: string | null
  tipo: TechnicalReserveDto['kind']
  emitidaEm: string
  observacao: string
}

function rascunhoVazio(): Rascunho {
  return {
    pedidoId: null,
    pedidoNumero: '',
    parceiroId: null,
    tipo: 'project',
    // Data ausente = hoje, diz o contrato. A tela deixa em branco em vez de
    // carimbar a data de hoje: campo preenchido sozinho é campo que ninguém
    // confere, e o servidor é quem tem o relógio da empresa.
    emitidaEm: '',
    observacao: '',
  }
}

/** O diálogo que LANÇA — pedido, profissional e tipo; nada de valor. */
function LancarReservaTecnica({
  aberto,
  onOpenChange,
}: { aberto: boolean; onOpenChange: (aberto: boolean) => void }) {
  const [rascunho, setRascunho] = useState<Rascunho>(rascunhoVazio)
  const [buscandoPedido, setBuscandoPedido] = useState(false)
  const [comboAberto, setComboAberto] = useState(false)
  const profissionais = useEspecificadorOptions()
  const lancar = useLancarReservaTecnica()
  const idPedido = useId()
  const idProfissional = useId()
  const idTipo = useId()
  const idData = useId()
  const idObservacao = useId()

  const recusa = motivoDaRecusa(lancar.error)
  const completo = rascunho.pedidoId !== null && rascunho.parceiroId !== null

  function fechar() {
    onOpenChange(false)
    lancar.reset()
    setRascunho(rascunhoVazio())
  }

  return (
    <>
      <Dialog isOpen={aberto} onOpenChange={onOpenChange} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Lançar Reserva Técnica</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor={idPedido}>Pedido de venda</Label>
            <div className="flex items-center gap-2">
              <Input
                id={idPedido}
                readOnly
                value={rascunho.pedidoNumero}
                placeholder="Escolha o pedido…"
              />
              <Button type="button" variant="outline" onClick={() => setBuscandoPedido(true)}>
                …
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor={idProfissional}>Profissional</Label>
            <ComboDeEscolha
              label="Profissional"
              options={profissionais.options}
              truncada={profissionais.truncada}
              carregando={profissionais.carregando}
              erro={profissionais.erro}
              value={rascunho.parceiroId}
              onChange={(parceiroId) => setRascunho((r) => ({ ...r, parceiroId }))}
              id={idProfissional}
              open={comboAberto}
              onOpenChange={setComboAberto}
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor={idTipo}>Tipo</Label>
            {/* Dois valores, e a série do documento depende de qual: o legado
                escreve `ParSV_serie='1'` para `PROJETO` e `'2'` para o resto. */}
            <select
              id={idTipo}
              className="h-9 rounded-md border bg-transparent px-2 text-sm"
              value={rascunho.tipo}
              onChange={(e) =>
                setRascunho((r) => ({ ...r, tipo: e.target.value as TechnicalReserveDto['kind'] }))
              }
            >
              <option value="project">{ROTULO_DO_TIPO_DE_RT.project}</option>
              <option value="standalone">{ROTULO_DO_TIPO_DE_RT.standalone}</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor={idData}>Data do lançamento</Label>
            <Input
              id={idData}
              type="date"
              value={rascunho.emitidaEm}
              onChange={(e) => setRascunho((r) => ({ ...r, emitidaEm: e.target.value }))}
            />
            <p className="text-muted-foreground text-xs">Em branco, o servidor lança com hoje.</p>
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor={idObservacao}>Observação</Label>
            <Textarea
              id={idObservacao}
              value={rascunho.observacao}
              onChange={(e) => setRascunho((r) => ({ ...r, observacao: e.target.value }))}
            />
          </div>

          <p className="text-muted-foreground text-sm">
            O valor não é digitado aqui: o servidor o calcula sobre a participação congelada no
            pedido, quebrada em produto e serviço.
          </p>

          {recusa ? <AvisoDeCobertura>{recusa}</AvisoDeCobertura> : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={fechar}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!completo || lancar.isPending}
            onClick={() => {
              if (!rascunho.pedidoId || !rascunho.parceiroId) return
              lancar.mutate(
                {
                  orderId: rascunho.pedidoId,
                  partnerId: rascunho.parceiroId,
                  kind: rascunho.tipo,
                  ...(rascunho.emitidaEm ? { issuedAt: rascunho.emitidaEm } : {}),
                  ...(rascunho.observacao.trim() ? { note: rascunho.observacao.trim() } : {}),
                },
                {
                  // Fecha no SUCESSO. Fechar antes esconderia a recusa junto com
                  // o diálogo, e a listagem voltaria igual — indistinguível de um
                  // lançamento que deu certo.
                  onSuccess: () => {
                    avisar('Reserva Técnica lançada.')
                    fechar()
                  },
                },
              )
            }}
          >
            {lancar.isPending ? 'Lançando…' : 'Lançar'}
          </Button>
        </DialogFooter>
      </Dialog>

      <SearchDialog<OrderDto>
        open={buscandoPedido}
        onOpenChange={setBuscandoPedido}
        title="Buscar pedido de venda"
        columns={COLUNAS_DE_PEDIDO}
        queryKey={['pedidos-venda', 'busca-para-rt']}
        fetcher={(state) => data.pedidosVenda.list(state)}
        onSelect={(pedido) => {
          setRascunho((r) => ({ ...r, pedidoId: pedido.id, pedidoNumero: pedido.number }))
          setBuscandoPedido(false)
        }}
      />
    </>
  )
}

export function TelaDeReservaTecnica() {
  const [recorte, setRecorte] = useState<RecorteDeReservaTecnica>({})
  const [lancando, setLancando] = useState(false)
  const [paraCancelar, setParaCancelar] = useState<TechnicalReserveDto | null>(null)
  const cancelar = useCancelarReservaTecnica()
  const { readOnly } = useReadOnlyPorPapel('orders')
  const profissionais = useEspecificadorOptions()
  const [comboAberto, setComboAberto] = useState(false)
  const idSituacao = useId()
  const idDe = useId()
  const idAte = useId()
  const idProfissional = useId()

  const acoes = cadastroActions<TechnicalReserveDto>({
    entidade: 'Reserva Técnica',
    readOnly,
    onIncluir: () => setLancando(true),
    // Sem `onAbrir`: o contrato não publica detalhe por id, e `Alterar`/`Consul.`
    // nascem desabilitados dizendo por quê.
    motivoSemAbrir:
      'O contrato não publica o detalhe do lançamento — só listar, lançar e cancelar.',
    onExcluir: (linha) => setParaCancelar(linha),
  }).map((acao) => (acao.id === 'excluir' ? { ...acao, label: 'Cancelar' } : acao))

  const recusaDoCancelamento = motivoDaRecusa(cancelar.error)

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        titulo="Reserva Técnica"
        primaria={{
          id: 'lancar',
          label: 'Lançar',
          icon: Plus,
          onClick: () => setLancando(true),
          ...(readOnly ? { disabled: true } : {}),
        }}
      />

      <Painel titulo="Recorte" modulo="vendas">
        {/* Não há `q` nem filtro estruturado nesta listagem — o contrato publica
            estes parâmetros e só eles. Uma caixa de busca que o servidor
            descarta devolveria a lista inteira e ensinaria o operador a
            desconfiar do que digitou. */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor={idSituacao}>Situação</Label>
            <select
              id={idSituacao}
              className="h-9 rounded-md border bg-transparent px-2 text-sm"
              value={recorte.situacao ?? ''}
              onChange={(e) =>
                setRecorte((r) => ({
                  ...r,
                  situacao: (e.target.value || undefined) as RecorteDeReservaTecnica['situacao'],
                }))
              }
            >
              <option value="">Todas</option>
              <option value="active">{ROTULO_DA_SITUACAO_DE_RT.active}</option>
              <option value="cancelled">{ROTULO_DA_SITUACAO_DE_RT.cancelled}</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor={idDe}>De</Label>
            <Input
              id={idDe}
              type="date"
              value={recorte.de ?? ''}
              onChange={(e) => setRecorte((r) => ({ ...r, de: e.target.value || undefined }))}
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor={idAte}>Até</Label>
            <Input
              id={idAte}
              type="date"
              value={recorte.ate ?? ''}
              onChange={(e) => setRecorte((r) => ({ ...r, ate: e.target.value || undefined }))}
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor={idProfissional}>Profissional</Label>
            <ComboDeEscolha
              label="Profissional"
              options={profissionais.options}
              truncada={profissionais.truncada}
              carregando={profissionais.carregando}
              erro={profissionais.erro}
              value={recorte.parceiroId ?? null}
              onChange={(id) => setRecorte((r) => ({ ...r, parceiroId: id ?? undefined }))}
              id={idProfissional}
              open={comboAberto}
              onOpenChange={setComboAberto}
            />
          </div>
        </div>
      </Painel>

      {recusaDoCancelamento ? <AvisoDeCobertura>{recusaDoCancelamento}</AvisoDeCobertura> : null}

      <VitraDataTable<TechnicalReserveDto>
        columns={colunas}
        // O recorte entra na CHAVE: sem ele a consulta serviria a página de
        // outro período a quem acabou de trocar o filtro.
        queryKey={['reservas-tecnicas', recorte]}
        fetcher={(state) => listarReservasTecnicas(state, recorte)}
        actions={acoes}
        busca={false}
      />

      <LancarReservaTecnica aberto={lancando} onOpenChange={setLancando} />

      <AlertDialog
        isOpen={paraCancelar !== null}
        onOpenChange={(aberto: boolean) => {
          if (!aberto) {
            setParaCancelar(null)
            cancelar.reset()
          }
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar a Reserva Técnica?</AlertDialogTitle>
          <AlertDialogDescription>
            O lançamento do pedido {paraCancelar?.orderNumber} para {paraCancelar?.partnerName}{' '}
            deixa de valer. Lançamento cancela, não se apaga — ele continua na lista, com a situação
            trocada.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Voltar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (!paraCancelar) return
              cancelar.mutate(paraCancelar.id, {
                onSuccess: () => {
                  avisar('Reserva Técnica cancelada.')
                  setParaCancelar(null)
                },
              })
            }}
          >
            {cancelar.isPending ? 'Cancelando…' : 'Cancelar lançamento'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialog>
    </div>
  )
}
