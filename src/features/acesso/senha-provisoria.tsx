import { Button } from '@/components/ui/button'
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useState } from 'react'

/**
 * A SENHA PROVISÓRIA — exibida UMA vez, aqui, e em nenhum outro lugar.
 *
 * O contrato promete exatamente isto: `ResetEmployeePassword` devolve a senha
 * na resposta e nenhuma leitura a devolve de novo — nem para quem a gerou.
 * Fechar este diálogo é perder o valor; por isso ele diz isso em texto, em vez
 * de confiar que o operador adivinhe.
 *
 * O primeiro login com ela cai na troca obrigatória (`mustChangePassword`):
 * quem recebe a senha do admin não fica com uma senha que o admin conhece.
 */
export function SenhaProvisoriaDialog({
  aberto,
  nome,
  senha,
  onFechar,
}: {
  aberto: boolean
  /** Nome de quem recebe — o operador confere que gerou para a pessoa certa. */
  nome: string
  senha: string
  onFechar: () => void
}) {
  const [copiada, setCopiada] = useState(false)

  function copiar() {
    // Sem fallback silencioso: se o clipboard falhar, o valor continua na
    // tela — o operador copia à mão. `catch` vazio só evita o unhandled.
    navigator.clipboard?.writeText(senha).then(
      () => setCopiada(true),
      () => undefined,
    )
  }

  return (
    <Dialog isOpen={aberto} onOpenChange={(estado) => (estado ? undefined : onFechar())}>
      <DialogHeader>
        <DialogTitle>Senha provisória de {nome}</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-3">
        <output
          aria-label="Senha provisória"
          className="select-all border-2 border-border bg-muted px-3 py-2 text-center font-mono text-lg tracking-wider"
        >
          {senha}
        </output>
        <p className="text-muted-foreground text-sm leading-snug">
          Ela aparece <strong>só desta vez</strong> — não há como consultá-la depois. Entregue à
          pessoa; no primeiro acesso o sistema exige a troca por uma senha própria.
        </p>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={copiar}>
          {copiada ? 'Copiada' : 'Copiar'}
        </Button>
        <Button type="button" onClick={onFechar}>
          Fechar
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
