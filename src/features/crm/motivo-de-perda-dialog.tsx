import type { CrmLostReasonDto } from '@/api/gerado'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ErroDaApi } from '@/data/api-provider'
import { useAlterarMotivoDePerda, useCriarMotivoDePerda } from '@/data/crm-api'
import { useEffect, useState } from 'react'

/**
 * Cadastro de MOTIVO DE PERDA — dois campos, num diálogo.
 *
 * ## Por que diálogo, e não tela de formulário
 *
 * O contrato **não publica `GET /api/crm/lost-reasons/{id}`**, e não é
 * esquecimento: o registro tem nome e `active`, então a LINHA da listagem já é
 * o registro inteiro. Uma tela em rota própria prometeria um link direto que
 * ninguém consegue cumprir — quem abrisse `/crm/motivos/{id}` numa aba nova não
 * teria de onde carregar o registro, e a tela mandaria voltar à listagem.
 *
 * O diálogo diz a verdade sobre o que existe: o registro veio da linha, e a
 * edição acontece sobre ela. É o mesmo raciocínio do cadastro rápido do
 * `LookupCombo`, e é o que a regra do registry já manda para recurso sem
 * detalhe por id.
 *
 * `null` em `motivo` = **Incluir**; com registro = **Alterar**.
 */
export function MotivoDePerdaDialog({
  aberto,
  motivo,
  onFechar,
}: {
  aberto: boolean
  motivo: CrmLostReasonDto | null
  onFechar: () => void
}) {
  const criar = useCriarMotivoDePerda()
  const alterar = useAlterarMotivoDePerda()
  const [nome, setNome] = useState('')
  const [ativo, setAtivo] = useState(true)

  // O diálogo não desmonta entre aberturas: sem isto, alterar um motivo e
  // depois clicar em Incluir abriria o formulário com o nome do anterior.
  useEffect(() => {
    if (!aberto) return
    setNome(motivo?.name ?? '')
    setAtivo(motivo?.active ?? true)
    criar.reset()
    alterar.reset()
  }, [aberto, motivo, criar.reset, alterar.reset])

  const gravando = criar.isPending || alterar.isPending
  const erro = criar.error ?? alterar.error

  function gravar() {
    const corpo = { name: nome.trim(), active: ativo }
    if (!corpo.name) return

    if (motivo) {
      alterar.mutate({ id: motivo.id, corpo }, { onSuccess: onFechar })
      return
    }
    criar.mutate(corpo, { onSuccess: onFechar })
  }

  return (
    <Dialog isOpen={aberto} onOpenChange={(estado) => (estado ? undefined : onFechar())}>
      <DialogHeader>
        <DialogTitle>{motivo ? 'Alterar motivo de perda' : 'Incluir motivo de perda'}</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="motivo-nome">Motivo</Label>
          <Input
            id="motivo-nome"
            value={nome}
            autoFocus
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              e.preventDefault()
              gravar()
            }}
          />
        </div>

        {/* Desativação lógica (padrão 8): motivo aposentado some da escolha e
            continua legível nas oportunidades antigas. Nunca sumir de verdade —
            senão o relatório do ano passado perde a razão da perda. */}
        {/* O rótulo é FILHO do Checkbox (react-aria monta o par por dentro):
            um `<label>` por fora não teria controle nativo para apontar — a
            caixa é um `<button role="checkbox">`, não um `<input>`. */}
        <Checkbox isSelected={ativo} onChange={setAtivo}>
          Ativo
        </Checkbox>

        {erro ? (
          <p role="alert" className="text-[0.75rem] text-destructive">
            {erro instanceof ErroDaApi
              ? [erro.message, erro.detail].filter(Boolean).join(' ')
              : 'Falha ao gravar o motivo.'}
          </p>
        ) : null}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onFechar}>
          Cancelar
        </Button>
        <Button type="button" onClick={gravar} disabled={!nome.trim() || gravando}>
          Gravar
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
