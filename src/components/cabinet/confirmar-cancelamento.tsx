import { LookupCombo } from '@/components/cabinet/lookup-combo'
import { Nome } from '@/components/cabinet/nome'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  type MotivoDoCancelamento,
  OBSERVACAO_MAX,
  motivoVazio,
} from '@/data/cancelamento-de-documento'
import { TriangleAlert } from 'lucide-react'
import { useEffect, useId, useState } from 'react'

/**
 * Confirmação do `Cancelar` das listagens de DOCUMENTO.
 *
 * ## Por que não reusa a `ConfirmarDesativacao`
 *
 * As duas parecem a mesma caixa e dizem coisas opostas. Cadastro **desativa**:
 * o registro some das telas que o usam e volta pelo `Alterar` + `Ativo` — a
 * frase de lá promete essa volta. Documento **cancela**: é situação própria do
 * documento (§8.1), o contrato dá caminho próprio (`POST /api/quotes/{id}/cancel`)
 * e **não publica reabertura**. Reaproveitar o texto ofereceria uma volta que
 * não existe, no único diálogo em que o operador para para ler.
 *
 * ## Documento já cancelado
 *
 * Não vira requisição. Cancelar o que já está cancelado gastaria uma escrita
 * para não mudar nada e ainda apareceria como sucesso — o operador concluiria
 * que a situação mudou agora.
 */
export interface ConfirmarCancelamentoProps {
  /** Nome do documento em minúscula, como aparece na frase ('orçamento'). */
  documento: string
  /** Como o documento aparece na listagem — o número, que é o que se confere. */
  numero: string
  /** Já está cancelado? Define se há o que cancelar. */
  cancelado: boolean
  aberto: boolean
  onFechar: () => void
  /**
   * O motivo vai junto porque é aqui que ele é dito, e só aqui.
   *
   * Quem não pede motivo ignora o argumento; o chamador que pede repassa a
   * `corpoDoCancelamento`, que decide entre corpo e ausência de corpo.
   */
  onConfirmar: (motivo: MotivoDoCancelamento) => void
  /**
   * Mostra os campos de motivo e observação.
   *
   * É opção da TELA e não do componente: nem todo documento que cancela tem a
   * lista `MOTIVO_CANCELAMENTO` fazendo sentido, e um combo que abre vazio
   * ensina o operador a ignorar o campo.
   */
  comMotivo?: boolean
  pendente?: boolean
  /** `detail` do problem+json quando a escrita falha; mantém o diálogo aberto. */
  erro?: string | null
}

export function ConfirmarCancelamento({
  documento,
  numero,
  cancelado,
  aberto,
  onFechar,
  onConfirmar,
  comMotivo = false,
  pendente = false,
  erro = null,
}: ConfirmarCancelamentoProps) {
  const idMotivo = useId()
  const idObservacao = useId()
  const [motivo, setMotivo] = useState<MotivoDoCancelamento>(motivoVazio)

  // Abrir é o que zera, e não fechar. Fechar zeraria o texto ENQUANTO o
  // diálogo se desmonta com a recusa do servidor na tela — e o operador
  // reabriria para reescrever o que já tinha escrito.
  useEffect(() => {
    if (aberto) setMotivo(motivoVazio())
  }, [aberto])

  return (
    <AlertDialog isOpen={aberto} onOpenChange={(open) => !open && onFechar()}>
      <AlertDialogHeader>
        <div className="flex items-center gap-3">
          <AlertDialogMedia>
            <TriangleAlert className="text-destructive" />
          </AlertDialogMedia>
          <AlertDialogTitle>
            {cancelado
              ? `O ${documento} ${numero} já está cancelado`
              : `Cancelar ${documento} ${numero}?`}
          </AlertDialogTitle>
        </div>
        <AlertDialogDescription>
          {cancelado ? (
            <>
              Este {documento} já está com a situação <strong>Cancelado</strong>. Nada será enviado
              ao servidor.
            </>
          ) : (
            <>
              O{' '}
              <Nome peso="forte">
                {documento} {numero}
              </Nome>{' '}
              passa à situação <strong>Cancelado</strong> e continua na listagem — não é apagado.{' '}
              <strong>Não há como reabrir</strong>: para retomar a venda, emita um novo {documento}.
            </>
          )}
        </AlertDialogDescription>
      </AlertDialogHeader>
      {comMotivo && !cancelado ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={idMotivo}>Motivo (opcional)</Label>
            <LookupCombo
              kind="motivoCancelamento"
              id={idMotivo}
              value={motivo.motivoId}
              onChange={(motivoId) => setMotivo((m) => ({ ...m, motivoId }))}
              disabled={pendente}
              // O "..." abriria um segundo diálogo por cima deste, e o de baixo
              // é o que segura a confirmação. Cadastrar motivo é trabalho da
              // tela de listas de apoio, não do meio de um cancelamento.
              hideQuickAdd
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={idObservacao}>Observação (opcional)</Label>
            <Textarea
              id={idObservacao}
              rows={2}
              maxLength={OBSERVACAO_MAX}
              disabled={pendente}
              value={motivo.observacao}
              onChange={(e) => setMotivo((m) => ({ ...m, observacao: e.target.value }))}
              placeholder="O caso, quando a lista não o descreve…"
            />
            {/* O motivo diz a CLASSE do cancelamento; a nota diz o caso — e é
                ela que sobrevive à pergunta "por que este aqui?". */}
            <p className="t-meta">
              Sem motivo escolhido o cancelamento vale igual — é o que a maioria dos cancelamentos
              é.
            </p>
          </div>
        </div>
      ) : null}
      {erro ? (
        <p role="alert" className="t-meta" style={{ color: 'var(--bad)' }}>
          {erro}
        </p>
      ) : null}
      <AlertDialogFooter>
        {/* `Voltar`, e não `Cancelar`: num diálogo cuja AÇÃO se chama cancelar,
            dois botões com a mesma palavra fariam o operador escolher entre
            "cancelar" e "cancelar" — e um dos dois é irreversível. */}
        <AlertDialogCancel type="button" onClick={onFechar}>
          {cancelado ? 'Fechar' : 'Voltar'}
        </AlertDialogCancel>
        {cancelado ? null : (
          <AlertDialogAction
            type="button"
            variant="destructive"
            onClick={() => onConfirmar(motivo)}
            disabled={pendente}
          >
            {pendente ? 'Cancelando…' : `Cancelar ${documento}`}
          </AlertDialogAction>
        )}
      </AlertDialogFooter>
    </AlertDialog>
  )
}
