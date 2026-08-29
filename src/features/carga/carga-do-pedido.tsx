import type { DeliveryDto, OrderItemFulfillmentDto } from '@/api/gerado'
import { Painel } from '@/components/cabinet/painel'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ROTULO_DO_ESTADO_FISICO,
  ROTULO_DO_ROMANEIO,
  useAbrirRomaneio,
  useCancelarRomaneio,
  useFecharRomaneio,
  useLancarNoRomaneio,
  useLiberarItem,
  useRomaneios,
  useSepararItem,
  useSituacaoDoPedido,
} from '@/data/entrega-api'
import { AtoNaLinha } from '@/features/carga/ato-na-linha'
import { diaLocalISO } from '@/lib/datas'
import { mensagemDoErro } from '@/lib/erros'
import { formatDateBR, formatInstanteBR, formatQuantidade } from '@/lib/formatters'
import { useState } from 'react'

/**
 * A CARGA DE UM PEDIDO — a situação física item a item, e as ações da escada.
 *
 * É a "Situação do Pedido de Venda" do legado (`FrmConsultaSeparacaoPedidoVenda`,
 * consulta nº 17 do volume 02) com os botões que o quadro precisa: liberar,
 * separar e lançar no romaneio, cada um na linha em que o gesto acontece.
 *
 * ## Por que as três quantidades aparecem TODAS, sempre
 *
 * A linha de 10 com 10 liberadas, 6 separadas e 2 entregues é o caso normal de
 * uma cozinha que sai em três viagens. Mostrar só o "estado" esconderia
 * exatamente o que quem opera precisa: o quanto de cada degrau. O `physicalState`
 * fica ao lado como resumo, e é o degrau que cobre a linha INTEIRA — nunca o
 * mais avançado com qualquer progresso, que marcaria como entregue a linha de 10
 * com 1 entregue.
 *
 * ## O romaneio é obrigatório para entregar, e por isso mora nesta tela
 *
 * Não existe entregar avulso: seis meses depois, quando o cliente diz que não
 * recebeu, é o romaneio que responde. A coluna de entrega só oferece o gesto
 * quando há romaneio ABERTO — sem ele, o texto diz o que falta fazer, em vez de
 * um botão que responderia 409.
 */
export function CargaDoPedido({ orderId }: { orderId: string }) {
  const situacao = useSituacaoDoPedido(orderId)
  const romaneios = useRomaneios(orderId)
  const liberar = useLiberarItem()
  const separar = useSepararItem()
  const lancar = useLancarNoRomaneio()
  const abrir = useAbrirRomaneio()
  const fechar = useFecharRomaneio()
  const cancelar = useCancelarRomaneio()

  const linhas = situacao.data?.items ?? []
  const listaDeRomaneios = romaneios.data?.rows ?? []
  const aberto = listaDeRomaneios.find((r) => r.status === 'open') ?? null

  const erro =
    mensagemDoErro(liberar.error, 'Não foi possível liberar o item.') ??
    mensagemDoErro(separar.error, 'Não foi possível separar o item.') ??
    mensagemDoErro(lancar.error, 'Não foi possível lançar o item no romaneio.') ??
    mensagemDoErro(abrir.error, 'Não foi possível abrir o romaneio.') ??
    mensagemDoErro(fechar.error, 'Não foi possível fechar o romaneio.') ??
    mensagemDoErro(cancelar.error, 'Não foi possível cancelar o romaneio.')

  return (
    <div className="flex flex-col gap-4">
      {/* A recusa do servidor sai INTEIRA e em cima: os seis 409 da escada
          dizem coisas diferentes ("libere antes", "não se entrega o que ninguém
          separou"), e resumi-los em "não foi possível" devolveria ao operador
          menos do que ele já sabia. */}
      {erro ? (
        <p
          className="border-2 border-destructive bg-destructive/5 px-3 py-2 text-destructive text-sm"
          role="alert"
        >
          {erro}
        </p>
      ) : null}

      <Painel
        titulo={`Pedido ${situacao.data?.orderNumber ?? '—'} · situação`}
        modulo="vendas"
        acao={
          situacao.data ? (
            <span className="font-mono text-xs uppercase tracking-[0.06em]">
              {ROTULO_DO_ESTADO_FISICO[situacao.data.physicalState] ?? situacao.data.physicalState}
              {' · '}
              {situacao.data.percentDelivered}% entregue
            </span>
          ) : undefined
        }
      >
        {situacao.isPending ? (
          <p className="text-muted-foreground text-sm">Carregando a situação do pedido…</p>
        ) : situacao.error ? (
          <p className="text-destructive text-sm">
            {mensagemDoErro(situacao.error, 'A situação do pedido não chegou.')}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Item</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Ambiente</TableHead>
                <TableHead className="text-right">Vendido</TableHead>
                <TableHead className="text-right">Liberado</TableHead>
                <TableHead className="text-right">Separado</TableHead>
                <TableHead className="text-right">Entregue</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Prometido</TableHead>
                <TableHead className="w-[26rem]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map((linha) => (
                <LinhaDaCarga
                  key={linha.lineNumber}
                  linha={linha}
                  romaneioAberto={aberto}
                  pendenteDeEnvio={liberar.isPending || separar.isPending || lancar.isPending}
                  onLiberar={(quantidade) =>
                    liberar.mutate({ orderId, lineNumber: linha.lineNumber, quantity: quantidade })
                  }
                  onSeparar={(quantidade) =>
                    separar.mutate({ orderId, lineNumber: linha.lineNumber, quantity: quantidade })
                  }
                  onEntregar={(quantidade) => {
                    if (!aberto) return
                    lancar.mutate({
                      deliveryId: aberto.id,
                      lineNumber: linha.lineNumber,
                      quantity: quantidade,
                    })
                  }}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </Painel>

      <Painel
        titulo="Romaneios da carga"
        modulo="vendas"
        acao={
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={abrir.isPending || Boolean(aberto)}
            onClick={() => abrir.mutate({ orderId })}
            data-testid="abrir-romaneio"
          >
            Abrir romaneio
          </Button>
        }
      >
        {/* Um romaneio aberto por vez, e isso é decisão da TELA, não do
            contrato: o servidor aceita dois abertos no mesmo pedido, mas então
            "lançar no romaneio" precisaria perguntar em qual, a cada linha, e a
            pergunta certa quase sempre tem uma resposta só — a viagem que está
            sendo carregada agora. Quem precisa de outra fecha ou cancela esta. */}
        {aberto ? (
          <FechamentoDoRomaneio
            romaneio={aberto}
            pendente={fechar.isPending || cancelar.isPending}
            onFechar={(dados) => fechar.mutate({ deliveryId: aberto.id, ...dados })}
            onCancelar={() => cancelar.mutate(aberto.id)}
          />
        ) : (
          <p className="text-muted-foreground text-sm">
            Nenhum romaneio aberto. Abra um para lançar o que sai nesta viagem.
          </p>
        )}

        {listaDeRomaneios.length > 0 ? (
          <Table className="mt-3">
            <TableHeader>
              <TableRow>
                <TableHead>Romaneio</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead>Prometido</TableHead>
                <TableHead>Saiu em</TableHead>
                <TableHead>Recebido por</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listaDeRomaneios.map((romaneio) => (
                <TableRow key={romaneio.id}>
                  <TableCell className="font-mono">{romaneio.number}</TableCell>
                  <TableCell>{ROTULO_DO_ROMANEIO[romaneio.status]}</TableCell>
                  <TableCell>{formatDateBR(romaneio.scheduledFor)}</TableCell>
                  {/* INSTANTE, não dia — ver a nota gêmea em
                      `situacao-do-pedido.tsx`. Passá-lo ao `formatDateBR`
                      devolvia `02T15:00:00.000Z/09/2026` nesta coluna. */}
                  <TableCell>{formatInstanteBR(romaneio.deliveredAt)}</TableCell>
                  <TableCell>{romaneio.receivedBy ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </Painel>
    </div>
  )
}

/** Uma linha da situação, com o gesto que cabe no degrau em que ela está. */
function LinhaDaCarga({
  linha,
  romaneioAberto,
  pendenteDeEnvio,
  onLiberar,
  onSeparar,
  onEntregar,
}: {
  linha: OrderItemFulfillmentDto
  romaneioAberto: DeliveryDto | null
  pendenteDeEnvio: boolean
  onLiberar: (quantidade: number) => void
  onSeparar: (quantidade: number) => void
  onEntregar: (quantidade: number) => void
}) {
  return (
    <TableRow data-testid={`linha-${linha.lineNumber}`}>
      <TableCell className="font-mono">{linha.lineNumber}</TableCell>
      <TableCell>{linha.description}</TableCell>
      <TableCell>{linha.environmentName ?? '—'}</TableCell>
      <TableCell className="text-right font-mono">{formatQuantidade(linha.quantity)}</TableCell>
      <TableCell className="text-right font-mono">
        {formatQuantidade(linha.quantityReleased)}
      </TableCell>
      <TableCell className="text-right font-mono">
        {formatQuantidade(linha.quantityPicked)}
      </TableCell>
      <TableCell className="text-right font-mono">
        {formatQuantidade(linha.quantityDelivered)}
      </TableCell>
      <TableCell>
        <span data-testid={`estado-${linha.lineNumber}`}>
          {ROTULO_DO_ESTADO_FISICO[linha.physicalState] ?? linha.physicalState}
        </span>
        {/* `partial` é o que deixa a tela pintar "6 de 10" sem mentir sobre o
            degrau — há progresso ACIMA do estado exibido. */}
        {linha.partial ? (
          <span className="ml-1 text-muted-foreground text-xs">(parcial)</span>
        ) : null}
      </TableCell>
      <TableCell>
        {formatDateBR(linha.scheduledDeliveryAt)}
        {/* A herança é de LEITURA: a data veio do ambiente, e dizê-lo evita que
            alguém a procure na linha para mudar. */}
        {linha.scheduledDateInherited ? (
          <span className="ml-1 text-muted-foreground text-xs">(do ambiente)</span>
        ) : null}
      </TableCell>
      <TableCell>
        <div className="flex flex-col items-end gap-1">
          {linha.pendingRelease > 0 ? (
            <AtoNaLinha
              verbo="Liberar"
              pendente={linha.pendingRelease}
              pendente_rotulo="a liberar"
              onLancar={onLiberar}
              pendenteDeEnvio={pendenteDeEnvio}
              testId={`liberar-${linha.lineNumber}`}
            />
          ) : null}
          {linha.pendingPick > 0 ? (
            <AtoNaLinha
              verbo="Separar"
              pendente={linha.pendingPick}
              pendente_rotulo="a separar"
              onLancar={onSeparar}
              pendenteDeEnvio={pendenteDeEnvio}
              testId={`separar-${linha.lineNumber}`}
            />
          ) : null}
          {linha.pendingDelivery > 0 ? (
            romaneioAberto ? (
              <AtoNaLinha
                verbo="Entregar"
                pendente={linha.pendingDelivery}
                pendente_rotulo="a entregar"
                onLancar={onEntregar}
                pendenteDeEnvio={pendenteDeEnvio}
                testId={`entregar-${linha.lineNumber}`}
              />
            ) : (
              <span className="text-muted-foreground text-xs">
                {formatQuantidade(linha.pendingDelivery)} separado — abra um romaneio para entregar
              </span>
            )
          ) : null}
          {linha.physicalState === 'delivered' ? (
            <span className="text-muted-foreground text-xs">Linha entregue por inteiro</span>
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  )
}

/**
 * O fechamento do romaneio — QUANDO saiu e QUEM recebeu.
 *
 * Os dois são obrigatórios no contrato, e a exigência é CHECK no banco: um
 * romaneio fechado sem eles é papel assinado em branco. O formulário nasce com a
 * data de HOJE porque fechar romaneio é gesto do dia em que a peça saiu — e
 * quem fecha atrasado corrige o campo, que é o caso raro.
 *
 * **Cancelar fica ao lado, e não escondido:** romaneio que não saiu se CANCELA,
 * nunca se fecha vazio. Deixar só o `Fechar` à vista empurra quem abriu por
 * engano para o gesto errado.
 */
function FechamentoDoRomaneio({
  romaneio,
  pendente,
  onFechar,
  onCancelar,
}: {
  romaneio: DeliveryDto
  pendente: boolean
  onFechar: (dados: {
    deliveredAt: string
    receivedBy: string
    receivedDocument: string | null
  }) => void
  onCancelar: () => void
}) {
  const [dia, setDia] = useState(() => diaLocalISO())
  const [recebedor, setRecebedor] = useState('')
  const [documento, setDocumento] = useState('')

  return (
    <div className="flex flex-wrap items-end gap-3 border-rule-strong border-b pb-3">
      <span className="font-mono text-sm">
        Romaneio {romaneio.number} · {ROTULO_DO_ROMANEIO[romaneio.status]}
      </span>

      <label className="flex flex-col gap-1">
        <span className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.06em]">
          Saiu em
        </span>
        <input
          type="date"
          className="h-9 border-2 border-input bg-card px-2.5 text-sm outline-none focus-visible:focus-ring"
          value={dia}
          onChange={(evento) => setDia(evento.target.value)}
          data-testid="romaneio-dia"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.06em]">
          Recebido por
        </span>
        <input
          type="text"
          className="h-9 w-56 border-2 border-input bg-card px-2.5 text-sm outline-none focus-visible:focus-ring"
          value={recebedor}
          onChange={(evento) => setRecebedor(evento.target.value)}
          placeholder="Nome de quem recebeu"
          data-testid="romaneio-recebedor"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.06em]">
          Documento
        </span>
        <input
          type="text"
          className="h-9 w-40 border-2 border-input bg-card px-2.5 text-sm outline-none focus-visible:focus-ring"
          value={documento}
          onChange={(evento) => setDocumento(evento.target.value)}
          data-testid="romaneio-documento"
        />
      </label>

      <Button
        type="button"
        size="sm"
        disabled={pendente || recebedor.trim().length === 0 || dia.length === 0}
        onClick={() =>
          onFechar({
            // O contrato pede instante, e o campo do operador é o DIA: o meio-dia
            // local evita que o fuso jogue a saída para a véspera, que é como
            // romaneio fechado dia 1º aparece com data 31.
            deliveredAt: new Date(`${dia}T12:00:00`).toISOString(),
            receivedBy: recebedor.trim(),
            receivedDocument: documento.trim() || null,
          })
        }
        data-testid="fechar-romaneio"
      >
        Fechar romaneio
      </Button>

      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pendente}
        onClick={onCancelar}
        data-testid="cancelar-romaneio"
      >
        Cancelar romaneio
      </Button>
    </div>
  )
}
