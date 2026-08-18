import { Button } from '@/components/ui/button'
import { type Aviso, assinarAvisos, avisosAtuais, dispensarAviso } from '@/lib/avisos'
import { Check, X } from 'lucide-react'
import { useEffect, useSyncExternalStore } from 'react'

/** Quanto tempo um aviso fica na tela antes de sair sozinho. */
const DURACAO_MS = 6000

/**
 * A REGIÃO DE AVISOS — onde "gravou" e "desativou" aparecem (Polaris-6, #201).
 *
 * Monta uma vez, na raiz, e escuta a fila de `lib/avisos`. Fica fora de
 * qualquer tela de propósito: o aviso nasce numa tela que está saindo (o
 * `Gravar` navega de volta para a listagem) e precisa continuar vivo na que
 * entra.
 *
 * ## Acessibilidade sem roubar o foco
 *
 * `aria-live="polite"` num container que existe SEMPRE — região viva criada
 * junto com o texto costuma não ser anunciada, porque o leitor de tela precisa
 * já estar observando o nó quando o conteúdo muda. Nada de `role="alert"`
 * (assertivo interrompe a leitura em curso) e nada de mover o foco: o operador
 * acabou de agir e já está olhando para a tela; roubar o foco tiraria o cursor
 * do campo em que ele estiver.
 *
 * O botão de dispensar existe porque o relógio não serve a todos: quem lê
 * devagar, ou usa leitor de tela, precisa de um jeito de tirar o aviso da
 * frente sem esperar — e de um jeito de alcançá-lo pelo teclado, já que ele é
 * o último da ordem de tabulação da página.
 *
 * ## Por que não desmonta a página inteira quando some
 *
 * `useSyncExternalStore` lê a fila do módulo. Sem ele, a alternativa seria um
 * contexto no topo da árvore: cada aviso re-renderizaria o app inteiro para
 * mudar uma caixinha no canto.
 */
export function RegiaoDeAvisos() {
  const avisos = useSyncExternalStore(assinarAvisos, avisosAtuais, avisosAtuais)

  return (
    // `pointer-events-none` no container e `auto` no cartão: a faixa vazia
    // ocupa o canto inferior direito da tela inteira, e sem isso ela engoliria
    // o clique de quem mira num botão embaixo dela.
    <div
      aria-live="polite"
      data-slot="regiao-de-avisos"
      className="pointer-events-none fixed right-4 bottom-4 z-50 flex flex-col gap-2"
    >
      {avisos.map((aviso) => (
        <CartaoDeAviso key={aviso.id} aviso={aviso} />
      ))}
    </div>
  )
}

function CartaoDeAviso({ aviso }: { aviso: Aviso }) {
  useEffect(() => {
    const relogio = setTimeout(() => dispensarAviso(aviso.id), DURACAO_MS)
    return () => clearTimeout(relogio)
  }, [aviso.id])

  return (
    <div className="pointer-events-auto flex max-w-sm items-start gap-2.5 rounded-card border-2 border-border bg-card px-3.5 py-2.5 shadow-el3">
      {/* O sinal é o mesmo do `Gravar` — quem apertou o botão com este desenho
          reconhece a resposta dele. `aria-hidden`: quem informa é o texto.
          Em TINTA, não em verde: o verde deste sistema tem dono (`--zone-money`,
          dinheiro) e não há token de sucesso — pintar um de improviso aqui
          criaria a segunda voz do verde na mesma tela. */}
      <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="flex min-w-0 flex-col">
        <span className="font-semibold text-sm">{aviso.texto}</span>
        {aviso.detalhe ? (
          <span className="truncate text-muted-foreground text-sm">{aviso.detalhe}</span>
        ) : null}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="-mr-1.5 ml-auto"
        aria-label={`Dispensar aviso: ${aviso.texto}`}
        onClick={() => dispensarAviso(aviso.id)}
      >
        <X aria-hidden="true" />
      </Button>
    </div>
  )
}
