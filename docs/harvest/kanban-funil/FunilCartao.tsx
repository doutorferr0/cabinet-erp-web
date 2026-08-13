import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatMoneyBRL } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import type { DestinoDoMovimento, EtapaDoFunil, OportunidadeDoFunil } from './funil-tipos'

/**
 * CARTÃO do funil — STAGED, não integrado (ver ../README.md).
 *
 * Derivado de `DealCard.tsx` do Atomic CRM (MIT, ver NOTICE).
 *
 * ## Duas maneiras de mover o mesmo cartão, e a de baixo é a que vale
 *
 * O original move só por arrasto. O CLAUDE.md deste repo trava a interface por
 * CLIQUE: toda ação alcançável por mouse, nenhum fluxo dependente de gesto
 * memorizado. Arrasto é mouse, então não está proibido — mas arrasto nativo do
 * HTML5 não tem caminho de teclado nenhum, e um funil que só se opera arrastando
 * é um funil que o operador de teclado não opera.
 *
 * Por isso o menu `Mover para` existe primeiro e o arrasto é o atalho por cima
 * dele. Se o arrasto for retirado um dia, a tela continua inteira; o contrário
 * não é verdade.
 *
 * ## Sem cor de módulo, e é decisão, não esquecimento
 *
 * `src/app/modulo.ts` tem oito módulos com par de cor travado pelo user, e CRM
 * não é um deles. O cartão fica na superfície neutra até o user atribuir o par —
 * escolher a nona cor aqui seria decidir identidade visual por conta própria,
 * que é exatamente o que `modulo.ts` já registra como proibido para Colaboradores.
 */
export function FunilCartao({
  oportunidade,
  etapas,
  arrastando,
  onArrastar,
  onSoltarAntes,
  onMoverEste,
  onAbrir,
}: {
  oportunidade: OportunidadeDoFunil
  etapas: readonly EtapaDoFunil[]
  arrastando: boolean
  onArrastar: (id: string | null) => void
  /**
   * Soltura SOBRE este cartão. Quem se move é o cartão ARRASTADO — este aqui só
   * empresta a posição, por isso a função não recebe id nenhum.
   */
  onSoltarAntes: (destino: DestinoDoMovimento) => void
  /** Menu `Mover para`. Quem se move é ESTE cartão. */
  onMoverEste: (destino: DestinoDoMovimento) => void
  onAbrir: (id: string) => void
}) {
  const outras = etapas.filter((e) => e.valor !== oportunidade.etapa)

  return (
    <article
      draggable
      onDragStart={(evento) => {
        // O id vai no `dataTransfer` além do estado do quadro: sem `setData` o
        // Firefox não inicia o arrasto.
        evento.dataTransfer.setData('text/plain', oportunidade.id)
        evento.dataTransfer.effectAllowed = 'move'
        onArrastar(oportunidade.id)
      }}
      onDragEnd={() => onArrastar(null)}
      onDragOver={(evento) => evento.preventDefault()}
      onDrop={(evento) => {
        evento.preventDefault()
        evento.stopPropagation()
        onSoltarAntes({ etapa: oportunidade.etapa, precedeId: oportunidade.id })
      }}
      className={cn(
        'flex flex-col gap-1 border-2 bg-card p-3 shadow-el1',
        arrastando && 'opacity-60',
      )}
    >
      <div className="flex items-start gap-2">
        {/* Botão, e não `onClick` na `<article>`: a caixa inteira clicável não é
            alcançável por teclado e engole o clique do menu. */}
        <button
          type="button"
          onClick={() => onAbrir(oportunidade.id)}
          className="flex-1 text-left font-medium text-sm underline-offset-2 hover:underline"
        >
          {oportunidade.titulo}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Mover ${oportunidade.titulo} para outra etapa`}
            >
              Mover
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Mover para</DropdownMenuLabel>
            {outras.map((etapa) => (
              <DropdownMenuItem
                key={etapa.valor}
                // Pelo menu o cartão vai para o FIM da coluna de destino: o
                // operador escolheu a etapa, não a posição. Fingir uma posição
                // aqui seria inventar ordenação que ninguém pediu.
                onSelect={() => onMoverEste({ etapa: etapa.valor, precedeId: null })}
              >
                {etapa.rotulo}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {oportunidade.parceiroNome ? (
        <p className="text-text-muted text-xs">{oportunidade.parceiroNome}</p>
      ) : null}

      {/* Dinheiro em centavos inteiros; R$ só aqui, na borda de exibição. */}
      {oportunidade.valorCents === null ? null : (
        <p className="font-mono text-sm tabular-nums">{formatMoneyBRL(oportunidade.valorCents)}</p>
      )}
    </article>
  )
}
