import { useResumoDeAprovacoes } from '@/data/aprovacoes-api'

/**
 * O CONTADOR da barra lateral — quantos pedidos esperam ESTA sessão.
 *
 * ## Por que ele some em vez de mostrar zero
 *
 * Três estados, e os três somem: quem não decide pedido nenhum (`canDecide`
 * falso), quem decide e não tem nada na fila, e a consulta que falhou. Badge com
 * `0` é ruído permanente ao lado de um item que o operador já vê; badge que
 * aparece SÓ quando há trabalho é o que faz o número ser lido.
 *
 * **A falha some calada, e isso é decisão.** O contador é ornamento de barra: a
 * navegação não pode ficar em esqueleto nem gritar erro porque um número não
 * chegou. Quem precisa saber que a fila não respondeu é quem abre a fila, e lá
 * o erro aparece inteiro.
 *
 * Mora em `features/aprovacao/` e não no shell porque é a feature que sabe
 * perguntar — o shell só sabe ONDE o contador vai.
 */
export function PendentesDeAprovacao() {
  const resumo = useResumoDeAprovacoes()
  const quantos = resumo.data?.pendingCount ?? 0

  if (!resumo.data?.canDecide || quantos === 0) return null

  return (
    <span
      data-slot="contador-de-aprovacoes"
      // Número é para ser LIDO, e leitor de tela não sabe que "3" ao lado de
      // "Aprovações" quer dizer pendentes. O rótulo acessível diz a frase; o
      // desenho mostra só o número, que é o que cabe na barra.
      aria-label={`${quantos} ${quantos === 1 ? 'pedido pendente' : 'pedidos pendentes'}`}
      className="ml-auto grid min-w-5 shrink-0 place-content-center rounded-item border-2 bg-fill-focus px-1 font-medium font-mono text-[0.6875rem] tabular-nums"
    >
      {quantos}
    </span>
  )
}
