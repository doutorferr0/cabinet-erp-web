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
import { TriangleAlert } from 'lucide-react'

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
    <AlertDialog isOpen={aberto} onOpenChange={(open) => !open && onFechar()}>
      <AlertDialogHeader>
        <div className="flex items-center gap-3">
          {/* Sinal de alerta (memória, §desenho por região:
              40px, Danger/01). É a única cor de estado permitida a um
              desenho — aqui o significado É erro. `aria-hidden`: quem diz o
              que houve é o título ao lado. */}
          <AlertDialogMedia>
            <TriangleAlert className="text-destructive" />
          </AlertDialogMedia>
          <AlertDialogTitle>
            {ativo ? `Desativar ${entidade}?` : `${nome} já está inativo`}
          </AlertDialogTitle>
        </div>
        <AlertDialogDescription>
          {ativo ? (
            <>
              <Nome peso="forte">{nome}</Nome> deixa de aparecer nas telas que usam este cadastro. O
              registro <strong>não é apagado</strong>: para voltar atrás, abra em{' '}
              <strong>Alterar</strong> e marque <strong>Ativo</strong>.
            </>
          ) : (
            <>
              Este {entidade} já está com a situação <strong>Inativo</strong>. Nada será enviado ao
              servidor.
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
        <AlertDialogCancel type="button" onClick={onFechar}>
          {ativo ? 'Cancelar' : 'Fechar'}
        </AlertDialogCancel>
        {ativo ? (
          <AlertDialogAction
            type="button"
            variant="destructive"
            onClick={onConfirmar}
            disabled={pendente}
          >
            {pendente ? 'Desativando…' : 'Desativar'}
          </AlertDialogAction>
        ) : null}
      </AlertDialogFooter>
    </AlertDialog>
  )
}
