import type { DeliveryDto, OrderItemFulfillmentDto } from '@/api/gerado'
import { FalhaDoPainel } from '@/components/cabinet/falha-do-painel'
import { Painel } from '@/components/cabinet/painel'
import { buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
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
  useRomaneios,
  useSituacaoDoPedido,
} from '@/data/entrega-api'
import { formatDateBR, formatInstanteBR, formatQuantidade } from '@/lib/formatters'
import { Link } from '@tanstack/react-router'

/**
 * A SITUAÇÃO FÍSICA do pedido, dentro do próprio documento de venda.
 *
 * `GET /api/orders/{id}/fulfillment` já existia no contrato e já tinha tela —
 * o Quadro de Cargas (`/vendas/cargas`, web#349). O que não existia era esta
 * metade: quem abre o PEDIDO não via nada de separação. Para responder "onde
 * está a cozinha do cliente que está no telefone" era preciso sair do
 * documento, ir ao quadro e reencontrar a linha lá — e o quadro só lista o que
 * tem peça LIBERADA esperando, então o pedido já entregue por inteiro, ou o que
 * ninguém liberou ainda, simplesmente não aparecia em lugar nenhum.
 *
 * ## É LEITURA, e a ausência dos botões é decisão, não esquecimento
 *
 * Liberar, separar e entregar continuam no galpão (`CargaDoPedido`). Três
 * motivos, e o primeiro basta:
 *
 * 1. **Separar BAIXA estoque.** Pôr esse gesto dentro de um formulário cujo
 *    `Gravar` significa outra coisa convida ao clique errado — e o erro sai
 *    caro, porque o kardex é append-only e se corrige por estorno.
 * 2. **Entregar exige romaneio aberto**, que é um objeto com ciclo próprio
 *    (abrir, lançar, fechar com quem recebeu). Ele não cabe ao lado dos itens
 *    do pedido sem virar uma segunda tela dentro da primeira.
 * 3. É o mesmo arranjo que `ParticipacaoDoPedido` já usa neste documento:
 *    painel de leitura, com a escrita morando onde o contexto dela existe.
 *
 * O caminho para o gesto fica explícito no rodapé do painel, com o pedido já
 * escolhido do outro lado.
 *
 * ## Monta FORA do `<form>` do documento
 *
 * Não tem campo e não entra no `PUT` do pedido. Dentro do formulário seria um
 * `<table>` dentro de `<form>` sem nada para submeter.
 *
 * ## Não há costura de par local aqui
 *
 * `/api/orders` e as dez operações da entrega estão as duas em
 * `ROTAS_DO_BACKEND`: com `VITE_API_PROXY` as duas atravessam, sem ele o MSW
 * responde as duas. Os ids batem nos dois ambientes, então este painel não
 * precisa do `AvisoDeCobertura` que a participação precisa — ali as comissões
 * ficam no mock enquanto o pedido vem do Postgres, e é a divergência que o
 * aviso declara. Inventar um aviso sem divergência ensina o operador a ignorar
 * avisos.
 */
export function SituacaoDoPedido({ pedidoId }: { pedidoId: string }) {
  const situacao = useSituacaoDoPedido(pedidoId)
  const romaneios = useRomaneios(pedidoId)

  // Documento que ainda não existe não tem situação física: o id vazio é o
  // `Incluir`, e perguntar a situação dele seria um 404 com cara de "nada foi
  // separado".
  if (!pedidoId) return null

  const linhas = situacao.data?.items ?? []
  const listaDeRomaneios = romaneios.data?.rows ?? []

  return (
    <Painel
      titulo="Situação da entrega"
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
        <div className="flex flex-col gap-2">
          {['s1', 's2'].map((chave) => (
            <Skeleton key={chave} className="h-12 w-full" />
          ))}
        </div>
      ) : situacao.isError ? (
        <FalhaDoPainel
          titulo="A situação da entrega não carregou"
          erro={situacao.error}
          aoTentar={() => situacao.refetch()}
        />
      ) : linhas.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Este pedido não tem item com controle de entrega.
        </p>
      ) : (
        <>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map((linha) => (
                <LinhaDaSituacao key={linha.lineNumber} linha={linha} />
              ))}
            </TableBody>
          </Table>

          <Romaneios linhas={listaDeRomaneios} />

          <p className="mt-3 flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
            <span>Liberar, separar e montar romaneio acontecem no galpão:</span>
            <Link
              to="/vendas/cargas"
              search={{ pedido: pedidoId }}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
              data-testid="ir-para-cargas"
            >
              Abrir no Quadro de Cargas
            </Link>
          </p>
        </>
      )}
    </Painel>
  )
}

/**
 * Uma linha do pedido, com as TRÊS quantidades à vista.
 *
 * A linha de 10 peças com 10 liberadas, 6 separadas e 2 entregues é o caso
 * normal de uma cozinha que sai em três viagens — mostrar só o `physicalState`
 * esconderia exatamente o que quem atende o telefone precisa dizer. O degrau
 * fica ao lado como resumo, e ele cobre a linha INTEIRA: `partial` é o que
 * permite pintar "6 de 10" sem mentir sobre o degrau.
 */
function LinhaDaSituacao({ linha }: { linha: OrderItemFulfillmentDto }) {
  return (
    <TableRow data-testid={`situacao-linha-${linha.lineNumber}`}>
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
        <span data-testid={`situacao-estado-${linha.lineNumber}`}>
          {ROTULO_DO_ESTADO_FISICO[linha.physicalState] ?? linha.physicalState}
        </span>
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
    </TableRow>
  )
}

/**
 * Os romaneios do pedido — as viagens em que a peça saiu.
 *
 * Aparece só quando existe algum: um bloco vazio dizendo "nenhum romaneio" em
 * todo pedido que ainda não chegou à entrega seria ruído em cima do caso mais
 * comum. Quando existe, é ele que responde à pergunta de seis meses depois
 * ("o cliente diz que não recebeu"), e por isso `Saiu em` e `Recebido por` vêm
 * junto do número.
 */
function Romaneios({ linhas }: { linhas: readonly DeliveryDto[] }) {
  if (linhas.length === 0) return null

  return (
    <div className="mt-4">
      <h3 className="mb-2 font-mono text-[0.75rem] font-medium uppercase tracking-[0.06em]">
        Romaneios
      </h3>
      <Table>
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
          {linhas.map((romaneio) => (
            <TableRow key={romaneio.id} data-testid={`romaneio-${romaneio.number}`}>
              <TableCell className="font-mono">{romaneio.number}</TableCell>
              <TableCell>{ROTULO_DO_ROMANEIO[romaneio.status] ?? romaneio.status}</TableCell>
              <TableCell>{formatDateBR(romaneio.scheduledFor)}</TableCell>
              {/* `deliveredAt` é INSTANTE, não dia: o `formatDateBR` parte a
                  string em `-` e devolveria `02T15:00:00.000Z/09/2026`. A hora
                  em que o caminhão chegou é informação de recibo, então o
                  instante entra inteiro. */}
              <TableCell>{formatInstanteBR(romaneio.deliveredAt)}</TableCell>
              <TableCell>{romaneio.receivedBy ?? '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
