import { TelaNaoCapturada } from '@/components/cabinet/tela-nao-capturada'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/estoque/movimentacao')({
  component: MovimentacaoTela,
})

/**
 * Menu `Movimentação` do SoftLux (transcrição §1, §10: "deve ser onde mora a
 * movimentação de estoque" — nunca capturado). Reserva o slot que o grupo
 * Estoque já tinha vazio de propósito desde a fase de navegação por empresa.
 */
function MovimentacaoTela() {
  return <TelaNaoCapturada titulo="Movimentação" menu="Movimentação" />
}
