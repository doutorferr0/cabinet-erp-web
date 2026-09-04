import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ItemDoInbox } from '@/mocks/inbox'
import { Link } from '@tanstack/react-router'
import { Check, RotateCcw } from 'lucide-react'
import { monogramaDe, tempoCurto, tempoPorExtenso } from './views'

/**
 * UMA LINHA DE TRABALHO — quem, o quê, qual registro, quando.
 *
 * A ordem não é estética: é a ordem em que a pergunta se resolve. Quem agiu vem
 * primeiro porque decide se interessa; o registro vem em MONO porque é código
 * que se copia e se compara (§Hierarquia: mono = dado, sem exceção); o tempo
 * fecha a linha, em mono menor e cor terciária, porque é o único campo que
 * ninguém lê primeiro.
 *
 * ## Os quatro papéis de tipo desta linha (§Hierarquia, classes `.t-*`)
 *
 * | o que | classe | por quê |
 * |---|---|---|
 * | quem agiu | `.t-ui` | nome de entidade — Inter 500, n-900 |
 * | o que fez | `.t-meta` | texto de apoio — Inter 400, n-500 |
 * | o registro | `.t-dado` | código que se copia — mono 500, tabular |
 * | quando | `.t-dado-meta` | tempo relativo — mono 400, n-500 |
 *
 * Hierarquia entre "quem" e "o quê" é PESO e COR, nunca tamanho — os dois
 * ficam na mesma linha de texto e uma diferença de 1px viraria desalinho de
 * baseline em vez de hierarquia. Nenhum `text-[…]` e nenhum `font-size:`: os
 * onze degraus são a única fonte de tamanho.
 *
 * ## As quatro fronteiras desta linha, e a ferramenta de cada uma
 *
 * - entre uma linha e a seguinte → **hairline** (a lista aplica, com `divide-y`);
 * - entre ponto, monograma, texto e tempo → **espaço** (`gap-3` = `--s-3`,
 *   nunca margem por elemento);
 * - o item NÃO LIDO contra o lido → **tint** (`--primary-soft`) + o ponto;
 * - a linha inteira contra o plano → **card**, e o card é da lista, não da linha.
 *
 * O tint do não lido não colide com "nunca duas ferramentas na mesma fronteira":
 * ele não separa esta linha da vizinha (quem faz isso é a hairline) — separa o
 * que PEDE trabalho do que já foi visto, que é outra fronteira, de estado e não
 * de posição.
 *
 * ## Por que os nomes 2.0 aparecem crus, e `bg-primary` não
 *
 * O mockup pede ponto chartreuse e fundo `--primary-soft`. Os dois existem em
 * `tokens-2.0.css` — mas `--primary` é REDEFINIDO no `index.css` depois do
 * import (1.x, tripla HSL), então `bg-primary` renderiza a tinta preta do 1.x,
 * não o chartreuse. `--main` e `--primary-soft` não são redefinidos, e são
 * cores completas: entram por `var()`. Quando D1 fizer a ponte, estas duas
 * linhas continuam certas — é o alias que passa a concordar com elas.
 */
export function LinhaDoInbox({
  item,
  aoAlternarLido,
}: {
  item: ItemDoInbox
  aoAlternarLido: (id: string) => void
}) {
  return (
    <li
      data-slot="item-do-inbox"
      data-modulo={item.modulo}
      data-lido={item.lido}
      className={cn(
        // px-4/py-3 = --s-4 / --s-3: o padding de célula da régua.
        'flex items-start gap-3 px-4 py-3',
        item.lido ? 'bg-card' : 'bg-[var(--primary-soft)]',
      )}
    >
      {/* PONTO de não lida — coluna própria de 8px (`--s-2`) para os monogramas
          alinharem entre linhas lidas e não lidas. Some do fluxo do leitor de
          tela: quem usa leitor recebe o estado pelo texto do botão de ação, que
          diz "Marcar como lida" ou "Marcar como não lida". */}
      <span
        aria-hidden="true"
        className={cn(
          'mt-2.5 size-2 shrink-0 rounded-full',
          item.lido ? 'bg-transparent' : 'bg-[var(--main)]',
        )}
      />

      {/* MONOGRAMA — iniciais de quem agiu, no tint do módulo do registro.
          É a única cor da linha além do ponto, e ela é semântica (diz de que
          módulo é o assunto), não decorativa.

          `.t-ui` e não mono: duas iniciais não são dado que se soma ou compara,
          e a régua é explícita — mono é o que se copia. */}
      <span
        aria-hidden="true"
        className="t-ui grid size-8 shrink-0 place-content-center rounded-data bg-modulo"
      >
        {monogramaDe(item.autor)}
      </span>

      <p className="min-w-0 flex-1">
        <span className="t-ui">{item.autor}</span> <span className="t-meta">{item.acao}</span>{' '}
        <Link
          to={item.registro.url}
          // `--main-text` e não a tinta do `.t-dado`: a régua reserva
          // `--primary-text` para ID dentro do degrau de dado, e este código É
          // o id do registro. Com `!` pelo mesmo motivo do badge — a classe é
          // CSS sem camada e ganharia do utilitário.
          className="t-dado rounded-data text-[var(--main-text)]! underline decoration-dotted underline-offset-2 outline-none hover:decoration-solid focus-visible:focus-ring"
        >
          {item.registro.rotulo}
        </Link>
      </p>

      <time
        title={tempoPorExtenso(item.minutosAtras)}
        className="t-dado-meta mt-1 shrink-0 whitespace-nowrap"
      >
        {tempoCurto(item.minutosAtras)}
      </time>

      {/* AÇÃO INLINE — o item se resolve sem sair da lista. Sempre visível, e
          não só no hover: a decisão do repo é interface por clique, e ação que
          só aparece ao passar o mouse não existe para quem chega pelo teclado
          nem para quem não sabe que ela está ali. */}
      <Button
        variant="ghost"
        size="icon-sm"
        className="-mr-1 shrink-0 text-muted-foreground"
        aria-label={
          item.lido
            ? `Marcar como não lida: ${item.registro.rotulo}`
            : `Marcar como lida: ${item.registro.rotulo}`
        }
        onClick={() => aoAlternarLido(item.id)}
      >
        {item.lido ? <RotateCcw aria-hidden="true" /> : <Check aria-hidden="true" />}
      </Button>
    </li>
  )
}
