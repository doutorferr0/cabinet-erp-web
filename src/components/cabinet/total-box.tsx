import { KpiTile } from '@/components/cabinet/kpi-tile'
import { cn } from '@/lib/utils'

export interface TotalBoxProps {
  /** Rótulo do fecho — `Total` em todo documento; a prop existe para o raro que não é. */
  label?: string
  valorCentavos: number
  className?: string
}

/**
 * FECHO DO DOCUMENTO — agora um `KpiTile`, e não mais um bloco próprio.
 *
 * ## Por que virou tile (D11, #479)
 *
 * O fecho e o KPI sempre foram a mesma coisa dita duas vezes: *um número que
 * resume o que está abaixo dele, fora da malha que ele fecha.* Enquanto foram
 * duas peças, divergiram — o fecho tinha borda de 3px e o KPI de 1,5px, o fecho
 * tinha `shadow-el3` e o KPI `--hard-1`, e nenhuma das duas diferenças foi
 * decidida: elas aconteceram em PRs diferentes. Uma peça só não pode divergir
 * de si mesma.
 *
 * ## O que mudou de aparência, e por quê
 *
 * O número era 48px em display CONDENSADO (`NumeroHeroi`, #236). Não é mais:
 *
 * 1. **A fonte que tornava os 48px possíveis saiu.** A justificativa medida era
 *    da Bebas — `R$ 9.999.999,99` a 222px condensado contra 363px no Sora. A D1
 *    removeu a Bebas e `--font-display-condensada` passou a apontar para a
 *    Gambarino, que não é condensada. Manter 48px seria manter o tamanho sem o
 *    que o justificava, e o total estouraria a largura do documento.
 * 2. **§Hierarquia não tem degrau acima de 30px fora do display**, e Gambarino
 *    nunca entra em dado — "mono = dado, sem exceção". O total é dado.
 *
 * Fica em `escala="destaque"` (24px, o `.kpi .v.big` do mockup): o maior número
 * mono da tela, ainda o maior dado do documento, agora dentro da régua.
 *
 * ## O que NÃO mudou
 *
 * Continua BLOCO próprio e fora da grade — a razão de medida vale igual: um
 * número de 24px sob uma coluna de 12,5px não compartilha casa decimal com
 * ninguém, e o alinhamento quebraria por tamanho antes de qualquer questão de
 * fonte. Continua na tinta de dinheiro (`--tint-mint`, a zona de dinheiro do
 * 2.0), continua com o rótulo em `--t-rotulo`, e o negativo continua em
 * vermelho — a convenção do ledger vale no fecho como vale na malha, e quem a
 * aplica agora é o `KpiTile` (valor negativo → `--bad`).
 *
 * A assinatura é a MESMA de antes: `form-grid.tsx` e `documento.tsx` montam
 * este componente sem saber que ele trocou de corpo.
 */
export function TotalBox({ label = 'Total', valorCentavos, className }: TotalBoxProps) {
  return (
    <KpiTile
      data-slot="total-box"
      rotulo={label}
      valorCentavos={valorCentavos}
      tint="mint"
      escala="destaque"
      // Encolhe ao conteúdo: o fecho alinha à direita do documento, e um tile
      // esticado ali seria uma faixa de um KPI só ocupando a linha inteira.
      className={cn('w-fit', className)}
    />
  )
}
