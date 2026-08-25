import { Button } from '@/components/ui/button'
import { formatQuantidade } from '@/lib/formatters'
import { useState } from 'react'

/**
 * O gesto de LANÇAR uma quantidade numa linha — liberar, separar ou entregar.
 *
 * Um componente só para os três porque o gesto é o mesmo e o que muda é o
 * verbo: quantidade proposta (o pendente inteiro, que é o caso normal — a
 * cozinha sai de uma vez), o operador aparando quando sai menos, e um botão.
 *
 * **A quantidade nasce com o PENDENTE, não com 1.** Quem separa uma carga de 12
 * puxadores separa os 12; obrigar a digitar o número que a tela já sabe é
 * pedágio em cima do caso normal, e digitar errado é como se separa 1 de 12 sem
 * perceber.
 *
 * **Texto, não `number`:** o campo aceita `4,5` (a vírgula do teclado brasileiro)
 * e é convertido na saída. `<input type="number">` recusaria a vírgula em
 * silêncio em parte dos navegadores, e o operador veria o campo não aceitar
 * digitação sem nada explicando.
 */
export function AtoNaLinha({
  verbo,
  pendente,
  unidade,
  pendente_rotulo,
  onLancar,
  pendenteDeEnvio,
  testId,
}: {
  verbo: string
  pendente: number
  unidade?: string | null
  pendente_rotulo: string
  onLancar: (quantidade: number) => void
  pendenteDeEnvio: boolean
  testId: string
}) {
  const [texto, setTexto] = useState(() => formatQuantidade(pendente))

  // O pendente muda quando o servidor responde, e o campo precisa acompanhar:
  // ficar com o número de antes faria o segundo clique lançar de novo o que já
  // foi lançado — e o 409 da escada recusaria com razão, culpando o operador.
  const [pendenteAnterior, setPendenteAnterior] = useState(pendente)
  if (pendente !== pendenteAnterior) {
    setPendenteAnterior(pendente)
    setTexto(formatQuantidade(pendente))
  }

  const quantidade = Number(texto.replace(',', '.'))
  const valida = Number.isFinite(quantidade) && quantidade > 0 && quantidade <= pendente

  return (
    <div className="flex items-center justify-end gap-1.5">
      <span className="text-muted-foreground text-xs">{pendente_rotulo}</span>
      <input
        type="text"
        inputMode="decimal"
        aria-label={`Quantidade a ${verbo.toLowerCase()}`}
        className="h-8 w-20 border-2 border-input bg-card px-2 text-right font-mono text-sm outline-none focus-visible:focus-ring"
        value={texto}
        onChange={(evento) => setTexto(evento.target.value)}
        data-testid={`${testId}-quantidade`}
      />
      {unidade ? <span className="text-muted-foreground text-xs">{unidade}</span> : null}
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!valida || pendenteDeEnvio}
        onClick={() => onLancar(quantidade)}
        data-testid={testId}
      >
        {verbo}
      </Button>
    </div>
  )
}
