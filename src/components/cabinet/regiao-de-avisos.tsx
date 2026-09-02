import { Button } from '@/components/ui/button'
import { type Aviso, assinarAvisos, avisosAtuais, dispensarAviso } from '@/lib/avisos'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { useEffect, useSyncExternalStore } from 'react'

/** Quanto tempo uma CONFIRMAÇÃO fica na faixa antes de sair sozinha. */
const DURACAO_MS = 6000

/**
 * O tint e a tinta de cada tom, escritos uma vez.
 *
 * Fundo em alpha (`--*-bg`) e não em tint sobre folha: a faixa pousa sobre a
 * bancada da appbar em claro e sobre a folha escura no escuro, e alpha é o que
 * atravessa os dois temas com um valor só (`tokens-2.0.css` §semântica).
 */
const TINTA_DO_TOM = {
  ok: 'bg-[var(--ok-bg)] text-[var(--ok)]',
  info: 'bg-[var(--info-bg)] text-[var(--info)]',
  warn: 'bg-[var(--warn-bg)] text-[var(--warn)]',
  bad: 'bg-[var(--bad-bg)] text-[var(--bad)]',
} as const

/**
 * A REGIÃO DE AVISOS — onde "gravou" e "desativou" aparecem (Polaris-6, #201),
 * e desde a 2.0 (D5) uma FAIXA logo abaixo da appbar, não um cartão flutuante.
 *
 * Monta uma vez, no shell, e escuta a fila de `lib/avisos`. Fica fora de
 * qualquer tela de propósito: o aviso nasce numa tela que está saindo (o
 * `Gravar` navega de volta para a listagem) e precisa continuar vivo na que
 * entra.
 *
 * ## Por que faixa, e por que ali
 *
 * O cartão flutuante do 1.x pousava no canto inferior direito, com borda preta
 * de 2px e sombra dura — três ferramentas de separação (borda, sombra e a
 * própria flutuação) para uma frase de cinco palavras, no canto mais longe do
 * que o operador estava olhando. A faixa gasta UMA (tint), aparece onde o olho
 * acabou de passar ao trocar de tela, e empurra o conteúdo em vez de cobri-lo —
 * aviso que tapa botão é aviso que atrapalha quem já entendeu.
 *
 * ## O relógio é do tom, não da região
 *
 * Só `ok` sai sozinho. `warn` e `bad` ficam até alguém dispensar, porque é
 * exatamente o que o próprio `lib/avisos` diz do que não pode sumir em cinco
 * segundos: o que o operador precisa LER e AGIR. Uma região que apaga tudo por
 * tempo transforma a diferença entre "gravou" e "não gravou" em sorte.
 *
 * ## Acessibilidade sem roubar o foco
 *
 * `aria-live` num container que existe SEMPRE — região viva criada junto com o
 * texto costuma não ser anunciada, porque o leitor de tela precisa já estar
 * observando o nó quando o conteúdo muda. Nada de mover o foco: o operador
 * acabou de agir e já está olhando para a tela; roubar o foco tiraria o cursor
 * do campo em que ele estiver. `assertive` só quando há falha na fila — é o
 * caso em que interromper a leitura em curso é o certo.
 *
 * ## Por que não desmonta a página inteira quando some
 *
 * `useSyncExternalStore` lê a fila do módulo. Sem ele, a alternativa seria um
 * contexto no topo da árvore: cada aviso re-renderizaria o app inteiro para
 * mudar uma faixa.
 */
export function RegiaoDeAvisos() {
  const avisos = useSyncExternalStore(assinarAvisos, avisosAtuais, avisosAtuais)
  const urgente = avisos.some((aviso) => aviso.tom === 'bad')

  return (
    <div
      aria-live={urgente ? 'assertive' : 'polite'}
      data-slot="regiao-de-avisos"
      className="shrink-0 empty:hidden"
    >
      {avisos.map((aviso) => (
        <FaixaDeAviso key={aviso.id} aviso={aviso} />
      ))}
    </div>
  )
}

function FaixaDeAviso({ aviso }: { aviso: Aviso }) {
  const tom = aviso.tom ?? 'ok'

  useEffect(() => {
    if (tom !== 'ok') return
    const relogio = setTimeout(() => dispensarAviso(aviso.id), DURACAO_MS)
    return () => clearTimeout(relogio)
  }, [aviso.id, tom])

  return (
    <div
      data-slot="faixa-de-aviso"
      data-tom={tom}
      // Sem borda e sem sombra: a natureza da região já a separa do conteúdo
      // (§Hierarquia — tint, e uma ferramenta por fronteira). `py-2 px-4`
      // alinha o texto com a migalha da appbar, na mesma calha de 16px.
      className={cn('flex items-center gap-3 px-4 py-2', TINTA_DO_TOM[tom])}
    >
      <p className="t-ui min-w-0 flex-1 font-semibold">
        {aviso.texto}
        {aviso.detalhe ? (
          // O detalhe divide a LINHA com o texto, não uma linha própria: a
          // faixa empurra o conteúdo para baixo, e cada linha dela custa altura
          // em toda tela que o aviso atravessar.
          <span className="t-meta ml-2 font-normal opacity-80">{aviso.detalhe}</span>
        ) : null}
      </p>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        // `text-current`: a tecla herda a tinta do tom, senão o `X` sairia em
        // n-900 sobre âmbar — a única peça da faixa fora da própria voz dela.
        className="-mr-1.5 shrink-0 text-current hover:bg-black/5"
        aria-label={`Dispensar aviso: ${aviso.texto}`}
        onClick={() => dispensarAviso(aviso.id)}
      >
        <X aria-hidden="true" />
      </Button>
    </div>
  )
}
