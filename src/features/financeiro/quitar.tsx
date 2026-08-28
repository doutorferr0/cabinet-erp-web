import type { FinancialInstallmentDto } from '@/api/gerado'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ehQuitacaoAMenor, useQuitarEmLote, useQuitarParcela } from '@/data/financeiro-api'
import {
  type Destino,
  DestinoDaBaixa,
  ModoDePagamento,
} from '@/features/financeiro/destino-da-baixa'
import { diaLocalISO } from '@/lib/datas'
import { mensagemDoErro } from '@/lib/erros'
import { formatDateBR, formatMoneyBRL } from '@/lib/formatters'
import { useEffect, useId, useState } from 'react'

/**
 * O DIÁLOGO DA QUITAÇÃO — um só, para a baixa avulsa e para o lote.
 *
 * Não são duas telas porque não são dois atos: o operador escolhe os
 * vencimentos, diz por onde o dinheiro andou e confirma. O que muda com N > 1 é
 * o que ele NÃO pode fazer — juros, multa e desconto são de UMA parcela, e o
 * lote paga o saldo inteiro de cada uma. Dois diálogos parecidos divergiriam na
 * primeira mudança, e a diferença que importa (o acréscimo por linha) ficaria
 * escondida atrás de qual dos dois abriu.
 *
 * ## Por que o lote não é um laço
 *
 * `POST /api/financial-settlements/batch` é TUDO OU NADA: uma parcela recusada
 * derruba a requisição inteira e nenhuma baixa fica gravada. Um laço de N
 * requisições aqui falharia pela metade — o operador corrigiria, reenviaria o
 * bloco, e as que já tinham passado sairiam de novo. É a forma de pagar em
 * dobro, e é por isso que o contrato publicou o lote como operação própria.
 *
 * ## A quitação A MENOS não é erro de digitação — é alçada
 *
 * Valor abaixo do saldo deixa a parcela em aberto e depende de QUEM pede: é a
 * permissão especial nº 45 do legado, e o servidor a recusa com **403
 * `urn:cabinet:erro:quitacao-a-menor`**. A tela avisa ANTES (o aviso amarelo) e,
 * se a recusa vier, mantém o diálogo aberto dizendo o que fazer — subir o valor
 * até o saldo, que é o campo que está ali na frente. Um 403 tratado como "sem
 * permissão" esconderia o controle que resolve o caso.
 *
 * ACIMA do saldo é outra coisa: 409, e não tem alçada que libere. Pagar mais do
 * que se deve não é decisão de ninguém — o troco não teria onde ser lançado.
 */
export function DialogoDeQuitacao({
  parcelas,
  aberto,
  onFechar,
}: {
  /** As parcelas marcadas. Uma = baixa avulsa; N = lote. */
  parcelas: readonly FinancialInstallmentDto[]
  aberto: boolean
  onFechar: () => void
}) {
  const idData = useId()
  const idValor = useId()
  const idJuros = useId()
  const idMulta = useId()
  const idDesconto = useId()
  const idNotas = useId()

  const emLote = parcelas.length > 1
  const primeira = parcelas[0]
  const saldoDaPrimeira = primeira?.openCents ?? 0
  const saldoTotal = parcelas.reduce((soma, p) => soma + p.openCents, 0)

  const [settledOn, setSettledOn] = useState(diaLocalISO())
  const [destino, setDestino] = useState<Destino>(null)
  const [paymentModeId, setPaymentModeId] = useState('')
  const [notes, setNotes] = useState('')
  const [amountCents, setAmountCents] = useState(saldoDaPrimeira)
  const [interestCents, setInterestCents] = useState(0)
  const [fineCents, setFineCents] = useState(0)
  const [discountCents, setDiscountCents] = useState(0)

  // Abrir é o que zera, e não fechar: fechar limparia os campos ENQUANTO a
  // recusa do servidor ainda está na tela, e o operador reescreveria tudo.
  useEffect(() => {
    if (!aberto) return
    setSettledOn(diaLocalISO())
    setDestino(null)
    setPaymentModeId('')
    setNotes('')
    setAmountCents(saldoDaPrimeira)
    setInterestCents(0)
    setFineCents(0)
    setDiscountCents(0)
  }, [aberto, saldoDaPrimeira])

  const avulsa = useQuitarParcela()
  const lote = useQuitarEmLote()
  const pendente = avulsa.isPending || lote.isPending
  const erro = avulsa.error ?? lote.error

  const aMenor = !emLote && amountCents > 0 && amountCents < saldoDaPrimeira
  const acimaDoSaldo = !emLote && amountCents > saldoDaPrimeira
  const podeGravar =
    !pendente && destino !== null && paymentModeId !== '' && settledOn !== '' && !acimaDoSaldo

  // O que de fato ANDA na conta: o abatimento mais os acréscimos, menos o
  // desconto. É `paidCents`, e é ele — não o valor da parcela — que tem de bater
  // com o extrato do banco na conciliação.
  const vaiAndar = emLote ? saldoTotal : amountCents + interestCents + fineCents - discountCents

  function gravar() {
    if (destino === null) return
    const base = { settledOn, paymentModeId, ...destino, ...(notes ? { notes } : {}) }
    if (emLote) {
      // O item vai SEM `amountCents`: o padrão do contrato é quitar o saldo
      // inteiro, e repetir um número que o servidor já sabe faria a tela pagar a
      // mais quando o saldo mudasse entre a leitura e o envio.
      lote.mutate(
        { ...base, items: parcelas.map((p) => ({ installmentId: p.id })) },
        { onSuccess: onFechar },
      )
      return
    }
    if (!primeira) return
    avulsa.mutate(
      {
        installmentId: primeira.id,
        corpo: { ...base, amountCents, interestCents, fineCents, discountCents },
      },
      { onSuccess: onFechar },
    )
  }

  return (
    <Dialog isOpen={aberto} onOpenChange={(open) => !open && onFechar()} className="sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>
          {emLote ? `Quitar ${parcelas.length} vencimentos` : 'Quitar vencimento'}
        </DialogTitle>
        <DialogDescription>
          {emLote ? (
            <>
              O lote é <strong>tudo ou nada</strong>: se uma parcela for recusada, nenhuma baixa é
              gravada. Cada uma quita o saldo inteiro.
            </>
          ) : primeira ? (
            <>
              Parcela {primeira.sequence} do título {primeira.titleNumber} — {primeira.partnerName},
              vence em {formatDateBR(primeira.dueDate)}.
            </>
          ) : null}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={idData}>Data da baixa</Label>
            <Input
              id={idData}
              type="date"
              value={settledOn}
              disabled={pendente}
              onChange={(e) => setSettledOn(e.target.value)}
            />
          </div>
          <ModoDePagamento valor={paymentModeId} onChange={setPaymentModeId} disabled={pendente} />
        </div>

        <DestinoDaBaixa valor={destino} onChange={setDestino} disabled={pendente} />

        {emLote ? (
          <div className="rounded-card border border-border">
            <table className="w-full text-sm">
              <caption className="sr-only">Parcelas do lote</caption>
              <thead>
                <tr className="border-border border-b text-left text-muted-foreground text-xs">
                  <th className="px-3 py-2 font-medium">Título</th>
                  <th className="px-3 py-2 font-medium">Parte</th>
                  <th className="px-3 py-2 font-medium">Vencimento</th>
                  <th className="px-3 py-2 text-right font-medium">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {parcelas.map((p) => (
                  <tr key={p.id} className="border-border/60 border-b last:border-0">
                    <td className="px-3 py-1.5 tabular-nums">
                      {p.titleNumber}/{p.sequence}
                    </td>
                    <td className="px-3 py-1.5">{p.partnerName}</td>
                    <td className="px-3 py-1.5 tabular-nums">{formatDateBR(p.dueDate)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {formatMoneyBRL(p.openCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={idValor}>Valor abatido</Label>
              <CampoDeCentavos
                id={idValor}
                valor={amountCents}
                onChange={setAmountCents}
                disabled={pendente}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={idJuros}>Juros</Label>
              <CampoDeCentavos
                id={idJuros}
                valor={interestCents}
                onChange={setInterestCents}
                disabled={pendente}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={idMulta}>Multa</Label>
              <CampoDeCentavos
                id={idMulta}
                valor={fineCents}
                onChange={setFineCents}
                disabled={pendente}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={idDesconto}>Desconto</Label>
              <CampoDeCentavos
                id={idDesconto}
                valor={discountCents}
                onChange={setDiscountCents}
                disabled={pendente}
              />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={idNotas}>Observação (opcional)</Label>
          <Textarea
            id={idNotas}
            rows={2}
            value={notes}
            disabled={pendente}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="O que o comprovante não diz…"
          />
        </div>

        {/* O par de números que o operador confere contra o comprovante: o que
            ABATE da dívida e o que SAI da conta. Juros e multa somam ao segundo
            e não ao primeiro — dívida de R$ 100 paga com R$ 10 de juros quita
            100 e tira 110 do banco. */}
        <dl className="flex flex-wrap gap-x-8 gap-y-1 rounded-card bg-muted px-3 py-2 text-sm">
          <div className="flex gap-2">
            <dt className="text-muted-foreground">
              {emLote ? 'Saldo dos vencimentos' : 'Saldo da parcela'}
            </dt>
            <dd className="font-medium tabular-nums">
              {formatMoneyBRL(emLote ? saldoTotal : saldoDaPrimeira)}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Sai da conta</dt>
            <dd className="font-semibold tabular-nums">{formatMoneyBRL(vaiAndar)}</dd>
          </div>
        </dl>

        {acimaDoSaldo ? (
          <p role="alert" className="text-destructive text-xs">
            O valor abatido passa do saldo da parcela. Pagar mais do que se deve não tem liberação —
            o troco não teria onde ser lançado.
          </p>
        ) : aMenor ? (
          // O aviso vem ANTES da tentativa porque a recusa depende do papel, e
          // quem tem a alçada precisa saber que está usando uma exceção.
          <p className="text-xs text-warn">
            Quitação <strong>a menor</strong>: sobram{' '}
            {formatMoneyBRL(saldoDaPrimeira - amountCents)} em aberto na parcela. Depende da alçada
            `financeiro:quitacao-a-menor`.
          </p>
        ) : null}

        {erro ? (
          <p role="alert" className="text-destructive text-xs">
            {ehQuitacaoAMenor(erro)
              ? 'Seu papel não permite quitar a menor. Suba o valor abatido até o saldo da parcela, ou peça a liberação de `financeiro:quitacao-a-menor`.'
              : mensagemDoErro(erro, 'Não foi possível lançar a baixa. Tente de novo.')}
          </p>
        ) : null}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onFechar} disabled={pendente}>
          Voltar
        </Button>
        <Button type="button" onClick={gravar} disabled={!podeGravar}>
          {pendente ? 'Lançando…' : emLote ? `Quitar ${parcelas.length} vencimentos` : 'Quitar'}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

/**
 * Campo de dinheiro em CENTAVOS — o dígito digitado entra pela direita.
 *
 * Mesma mecânica da célula de dinheiro da grade (`form-grid.tsx`): o estado é
 * inteiro, a exibição é `pt-BR`, e float não encosta em nenhum dos dois.
 */
function CampoDeCentavos({
  id,
  valor,
  onChange,
  disabled,
}: {
  id: string
  valor: number
  onChange: (centavos: number) => void
  disabled?: boolean
}) {
  return (
    <Input
      id={id}
      inputMode="decimal"
      className="text-right tabular-nums"
      disabled={disabled ?? false}
      value={(valor / 100).toFixed(2).replace('.', ',')}
      onChange={(e) => {
        const digitos = e.target.value.replace(/\D/g, '')
        onChange(digitos === '' ? 0 : Number(digitos))
      }}
    />
  )
}
