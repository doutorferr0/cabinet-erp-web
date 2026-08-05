import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/**
 * Confirmação do `Excluir` das listagens de cadastro.
 *
 * ## Por que existe
 *
 * O botão da barra chama-se `Excluir` (transcrição §9), mas na UI de cadastro
 * **nada é apagado**: a desativação é lógica (`Ativo` vira `não`) — padrão 8 do
 * CLAUDE.md. O rótulo herdado do legado e o efeito real não batem, e quem clica
 * precisa ler o que vai acontecer ANTES de acontecer. Daí o diálogo dizer
 * "desativar", nomear o registro e apontar a volta (o `Alterar`).
 *
 * Genérico por `entidade` — serve as três telas de parceiro e a de produtos. A
 * frase não diz de ONDE vem o `Ativo` (vínculo com a empresa, no parceiro;
 * o contrato não afirma o mesmo do produto) porque a pergunta do operador é o
 * efeito, não a origem do campo.
 *
 * ## Registro já inativo
 *
 * Não vira `PUT`. Desativar o que já está desativado gastaria uma escrita para
 * não mudar nada e ainda apareceria como sucesso — o operador concluiria que a
 * linha mudou de estado. O diálogo diz que já está inativo e só oferece Fechar.
 */
export interface ConfirmarDesativacaoProps {
  /** Nome da entidade em minúscula, como aparece na frase ('cliente'). */
  entidade: string
  /** Como o registro aparece na listagem — sem nome, o operador confirma às cegas. */
  nome: string
  /** `active` do registro: define se há o que desativar. */
  ativo: boolean
  aberto: boolean
  onFechar: () => void
  onConfirmar: () => void
  pendente?: boolean
  /** `detail` do problem+json quando a escrita falha; mantém o diálogo aberto. */
  erro?: string | null
}

export function ConfirmarDesativacao({
  entidade,
  nome,
  ativo,
  aberto,
  onFechar,
  onConfirmar,
  pendente = false,
  erro = null,
}: ConfirmarDesativacaoProps) {
  return (
    <Dialog isOpen={aberto} onOpenChange={(open) => !open && onFechar()} className="max-w-sm">
      <DialogHeader>
        <DialogTitle>{ativo ? `Desativar ${entidade}?` : `${nome} já está inativo`}</DialogTitle>
        <DialogDescription>
          {ativo ? (
            <>
              <strong>{nome}</strong> deixa de aparecer nas telas que usam este cadastro. O registro{' '}
              <strong>não é apagado</strong>: para voltar atrás, abra em <strong>Alterar</strong> e
              marque <strong>Ativo</strong>.
            </>
          ) : (
            <>
              Este {entidade} já está com a situação <strong>Inativo</strong>. Nada será enviado ao
              servidor.
            </>
          )}
        </DialogDescription>
      </DialogHeader>
      {erro ? (
        <p role="alert" className="text-[0.75rem] text-destructive">
          {erro}
        </p>
      ) : null}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onFechar}>
          {ativo ? 'Cancelar' : 'Fechar'}
        </Button>
        {ativo ? (
          <Button type="button" variant="destructive" onClick={onConfirmar} disabled={pendente}>
            {pendente ? 'Desativando…' : 'Desativar'}
          </Button>
        ) : null}
      </DialogFooter>
    </Dialog>
  )
}
