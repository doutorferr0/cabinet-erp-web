import { Nome } from '@/components/cabinet/nome'
import { Ornamento } from '@/components/cabinet/ornamento'
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
  onConfirmar: () => void
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
  pendente = false,
  erro = null,
}: ConfirmarCancelamentoProps) {
  return (
    <AlertDialog isOpen={aberto} onOpenChange={(open) => !open && onFechar()}>
      <AlertDialogHeader>
        <div className="flex items-center gap-3">
          <AlertDialogMedia>
            <Ornamento shape="alerta" tom="erro" tamanho={40} />
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
      {erro ? (
        <p role="alert" className="text-xs text-destructive">
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
            onClick={onConfirmar}
            disabled={pendente}
          >
            {pendente ? 'Cancelando…' : `Cancelar ${documento}`}
          </AlertDialogAction>
        )}
      </AlertDialogFooter>
    </AlertDialog>
  )
}
