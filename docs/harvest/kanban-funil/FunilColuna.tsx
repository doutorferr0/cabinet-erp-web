import { formatMoneyBRL } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { FunilCartao } from './FunilCartao'
import { somaDaColuna } from './funil-agrupa'
import type { DestinoDoMovimento, EtapaDoFunil, OportunidadeDoFunil } from './funil-tipos'

/**
 * COLUNA do funil — STAGED, não integrado (ver ../README.md).
 *
 * Derivado de `DealColumn.tsx` do Atomic CRM (MIT, ver NOTICE).
 *
 * O que veio de lá: uma etapa por coluna, título e TOTAL da etapa no cabeçalho,
 * e a coluna inteira como área de soltura com realce enquanto o cartão paira.
 *
 * O que mudou: o total é soma de centavos inteiros formatada em pt-BR, e não
 * `toLocaleString('en-US', {notation:'compact'})` sobre float — no legado o
 * operador confere valor contra o orçamento, e `R$ 12,3 mil` não se confere.
 */
export function FunilColuna({
  etapa,
  etapas,
  cartoes,
  arrastandoId,
  onArrastar,
  onSoltar,
  onMoverCartao,
  onAbrir,
}: {
  etapa: EtapaDoFunil
  etapas: readonly EtapaDoFunil[]
  cartoes: readonly OportunidadeDoFunil[]
  arrastandoId: string | null
  onArrastar: (id: string | null) => void
  /** Soltura: quem se move é o cartão arrastado, que o quadro conhece. */
  onSoltar: (destino: DestinoDoMovimento) => void
  /** Menu do cartão: o id vem junto porque não há arrasto em curso para consultar. */
  onMoverCartao: (oportunidadeId: string, destino: DestinoDoMovimento) => void
  onAbrir: (id: string) => void
}) {
  return (
    <section
      aria-label={etapa.rotulo}
      onDragOver={(evento) => {
        // Sem `preventDefault` no `dragover` o navegador recusa a soltura — é o
        // contrato do HTML5 drag-and-drop, não uma gambiarra.
        evento.preventDefault()
        evento.dataTransfer.dropEffect = 'move'
      }}
      onDrop={(evento) => {
        evento.preventDefault()
        // Soltura no vazio da coluna = fim da coluna. Soltura sobre um cartão é
        // tratada pelo próprio cartão, que para a propagação antes de chegar aqui.
        onSoltar({ etapa: etapa.valor, precedeId: null })
      }}
      className={cn(
        'flex min-w-56 flex-1 flex-col gap-2 border-2 bg-surface-sunken p-2',
        arrastandoId !== null && 'border-dashed',
      )}
    >
      <header className="flex items-baseline justify-between gap-2 px-1">
        <h3 className="font-display font-bold text-sm text-text-strong">{etapa.rotulo}</h3>
        <span className="text-text-muted text-xs tabular-nums">{cartoes.length}</span>
      </header>
      <p className="px-1 font-mono text-sm tabular-nums">{formatMoneyBRL(somaDaColuna(cartoes))}</p>

      <div className="flex flex-col gap-2">
        {cartoes.map((oportunidade) => (
          <FunilCartao
            key={oportunidade.id}
            oportunidade={oportunidade}
            etapas={etapas}
            arrastando={arrastandoId === oportunidade.id}
            onArrastar={onArrastar}
            onSoltarAntes={onSoltar}
            onMoverEste={(destino) => onMoverCartao(oportunidade.id, destino)}
            onAbrir={onAbrir}
          />
        ))}
        {cartoes.length === 0 ? (
          // Coluna vazia é informação, não falha: "ninguém em Negociação" é uma
          // leitura que o gerente quer. Espaço em branco não diz isso.
          <p className="px-1 py-4 text-text-muted text-xs">Nenhuma oportunidade nesta etapa.</p>
        ) : null}
      </div>
    </section>
  )
}
