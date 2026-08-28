import type { ApprovalRequestDto } from '@/api/gerado'
import { ErroDoServidor } from '@/components/cabinet/erro-do-servidor'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useDecidirAprovacao } from '@/data/aprovacoes-api'
import { formatInstanteBR, formatMoneyBRL, formatPercent } from '@/lib/formatters'
import { useState } from 'react'
import { SituacaoDoPedido } from './situacao'

/** O piso do contrato (`ApprovalRejectionRequest.reason.minLength`), repetido aqui a serviço do operador. */
const MINIMO_DO_MOTIVO = 3

/**
 * O PEDIDO ABERTO — o que se pediu, contra o quê, e as duas saídas.
 *
 * ## Por que a decisão mora num diálogo, e não em dois botões na linha
 *
 * A recusa EXIGE motivo (o contrato o declara `required`), e motivo não se
 * digita numa célula de grade. Botão de recusar na linha só teria dois destinos:
 * abrir este mesmo diálogo — e aí ele é um atalho para o que o clique na linha
 * já faz — ou recusar sem motivo, que o servidor rejeita com 400.
 *
 * E há o outro lado: aprovar é irreversível (não há reabrir), e a régua da
 * decisão é o DINHEIRO. A linha da fila mostra o percentual e o valor; a decisão
 * pede ver os dois ao lado do teto que valia, do documento e de quem pediu.
 * Isso é folha, não célula.
 *
 * ## O que a tela NÃO decide
 *
 * Quem pode decidir é o `canDecide` que veio do servidor. A tela não deduz pelo
 * papel: o caso mais comum de `false` não é falta de permissão — é o próprio
 * solicitante, que tem o papel e mesmo assim não decide o que ele pediu.
 */
export function DecisaoDoPedido({
  pedido,
  aoFechar,
}: {
  pedido: ApprovalRequestDto | null
  aoFechar: () => void
}) {
  const [motivo, setMotivo] = useState('')
  const [tentouRecusar, setTentouRecusar] = useState(false)
  const decidir = useDecidirAprovacao()

  if (pedido === null) return null

  const motivoLimpo = motivo.trim()
  const motivoCurto = motivoLimpo.length < MINIMO_DO_MOTIVO

  function fechar() {
    setMotivo('')
    setTentouRecusar(false)
    decidir.reset()
    aoFechar()
  }

  function decidirCom(decisao: 'aprovar' | 'recusar') {
    if (decisao === 'recusar' && motivoCurto) {
      // A validação local não substitui a do servidor — ela evita a viagem que
      // já se sabe que volta 400, e põe o erro ao lado do controle em vez de
      // num bloco no topo.
      setTentouRecusar(true)
      return
    }
    decidir.mutate(
      { id: (pedido as ApprovalRequestDto).id, decisao, motivo: motivoLimpo || null },
      { onSuccess: fechar },
    )
  }

  return (
    <Dialog
      isOpen
      onOpenChange={(aberto) => {
        if (!aberto) fechar()
      }}
    >
      <DialogHeader>
        <DialogTitle>
          {pedido.subjectLabel ? `Orçamento ${pedido.subjectLabel}` : 'Pedido de aprovação'}
        </DialogTitle>
        <DialogDescription>
          Desconto acima do teto. {pedido.customerName ?? 'Cliente não informado'}.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-card border-2 bg-card p-3">
          <Linha rotulo="Situação">
            <SituacaoDoPedido situacao={pedido.status} />
          </Linha>
          <Linha rotulo="Pedido por">{pedido.requestedByName ?? '—'}</Linha>
          <Linha rotulo="Desconto pedido">
            <span className="font-mono tabular-nums">
              {formatPercent(pedido.requestedPercent)} %
            </span>
          </Linha>
          <Linha rotulo="Teto de quem pediu">
            <span className="font-mono tabular-nums">{formatPercent(pedido.limitPercent)} %</span>
          </Linha>
          {/* O valor em dinheiro vem DEPOIS do percentual e com o mesmo peso: é
              a régua que separa 3% de mil reais de 3% de duzentos mil, e é ela
              que decide. */}
          <Linha rotulo="Desconto em R$">
            <span className="font-mono tabular-nums">{formatMoneyBRL(pedido.discountCents)}</span>
          </Linha>
          <Linha rotulo="Total do documento">
            <span className="font-mono tabular-nums">
              {formatMoneyBRL(pedido.documentTotalCents)}
            </span>
          </Linha>
          <Linha rotulo="Solicitado em">{formatInstanteBR(pedido.requestedAt)}</Linha>
          {pedido.decidedAt ? (
            <Linha rotulo="Decidido em">
              {formatInstanteBR(pedido.decidedAt)}
              {pedido.decidedByName ? ` · ${pedido.decidedByName}` : ''}
            </Linha>
          ) : null}
        </dl>

        {/* A decisão JÁ TOMADA é leitura, e o motivo dela é o que o solicitante
            precisa ler para saber o que corrigir. */}
        {pedido.status !== 'pending' && pedido.decisionReason ? (
          <p className="rounded-card border-2 border-dashed p-3 text-sm">
            <span className="font-bold">Motivo:</span> {pedido.decisionReason}
          </p>
        ) : null}

        {pedido.canDecide ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="motivo-da-decisao">
              Motivo <span className="text-muted-foreground">(obrigatório para recusar)</span>
            </Label>
            <Textarea
              id="motivo-da-decisao"
              value={motivo}
              onChange={(evento) => setMotivo(evento.target.value)}
              maxLength={500}
              rows={3}
              placeholder="O que o vendedor precisa saber para corrigir."
              {...(tentouRecusar && motivoCurto
                ? { 'aria-invalid': true, 'aria-describedby': 'motivo-da-decisao-erro' }
                : {})}
            />
            {tentouRecusar && motivoCurto ? (
              <p id="motivo-da-decisao-erro" className="text-destructive text-sm">
                Diga por que o desconto não passou.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            {pedido.status === 'pending'
              ? 'Este pedido espera outra pessoa: quem pede o desconto não decide o próprio pedido.'
              : 'Este pedido já foi decidido. Decisão registrada não se reabre — o documento gera pedido novo.'}
          </p>
        )}

        {decidir.isError ? (
          <ErroDoServidor erro={decidir.error} mensagem="Não foi possível registrar a decisão." />
        ) : null}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={fechar} disabled={decidir.isPending}>
          Fechar
        </Button>
        {pedido.canDecide ? (
          <>
            <Button
              variant="destructive"
              onClick={() => decidirCom('recusar')}
              disabled={decidir.isPending}
            >
              Recusar
            </Button>
            <Button onClick={() => decidirCom('aprovar')} disabled={decidir.isPending}>
              Aprovar
            </Button>
          </>
        ) : null}
      </DialogFooter>
    </Dialog>
  )
}

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="font-medium font-mono text-[0.6875rem] text-muted-foreground uppercase tracking-[0.06em]">
        {rotulo}
      </dt>
      <dd className="mt-0.5 truncate text-sm">{children}</dd>
    </div>
  )
}
