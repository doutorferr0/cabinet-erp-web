import {
  type PedacoDaBusca,
  interpretarBusca,
  prefixosDaBusca,
} from '@/components/cabinet/filtros/busca-com-prefixo'
import type { CampoFiltravel } from '@/lib/filtro-de-consulta'
import { cn } from '@/lib/utils'
import { Search } from 'lucide-react'
import { useRef, useState } from 'react'

/**
 * A CAIXA DE BUSCA DA BARRA 2.0 — texto livre e filtro na mesma linha.
 *
 * O mockup (`Listagem › fbar`) desenha a busca com o valor do prefixo pintado
 * em `--primary-soft`: `forn: `**` mister led`**`. O realce não é enfeite — é o
 * retorno que diz "isto virou filtro". Sem ele, quem digita `forn: stella` não
 * tem como saber se a lista encolheu por causa do prefixo ou porque a busca
 * livre calhou de casar; e quem erra o prefixo (`fornec do:`) vê a lista
 * encolher do mesmo jeito e não sabe por quê.
 *
 * ## Como o realce é feito, e por que assim
 *
 * `<input>` não pinta pedaço do próprio valor. A camada de baixo é um espelho
 * do texto (mesma fonte, mesmo padding, `aria-hidden`), e o input fica por cima
 * com a tinta transparente e o cursor visível. As duas camadas rolam juntas
 * (`scrollLeft` copiado no `onScroll`), senão o realce descolaria do texto no
 * primeiro nome comprido.
 *
 * A alternativa seria um `contentEditable`, que pinta nativamente e traz junto
 * colagem com formatação, undo próprio e um alvo que leitor de tela anuncia
 * como região editável em vez de campo de busca. Espelho é mais barato e o
 * campo continua sendo um `<input>` de verdade.
 */

export interface CaixaDeBuscaProps {
  /** O texto cru, como está no campo — com prefixos e tudo. */
  valor: string
  onChange: (valor: string) => void
  /** Campos filtráveis da tela; é deles que saem os prefixos aceitos. */
  campos: readonly CampoFiltravel[]
  placeholder?: string
  disabled?: boolean
}

function classeDoPedaco(pedaco: PedacoDaBusca): string {
  if (pedaco.tipo === 'valor') return 'bg-[var(--primary-soft)] rounded-[var(--r-data)]'
  if (pedaco.tipo === 'prefixo') return 'text-muted-foreground'
  return ''
}

export function CaixaDeBusca({
  valor,
  onChange,
  campos,
  placeholder = 'Buscar…',
  disabled,
}: CaixaDeBuscaProps) {
  const espelho = useRef<HTMLDivElement>(null)
  const [focado, setFocado] = useState(false)
  const { pedacos } = interpretarBusca(valor, campos)
  const sugestoes = prefixosDaBusca(campos).slice(0, 3)

  return (
    <div className="relative">
      <div
        className={cn(
          'flex h-8 w-60 items-center gap-[var(--s-2)] rounded-[var(--r-ctrl)] border bg-card px-2.5',
          focado ? 'border-foreground' : 'border-rule-hair',
        )}
      >
        <Search aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />

        <div className="relative h-full min-w-0 flex-1">
          {/* Espelho: mesma caixa, mesmo tipo, sem interação. `whitespace-pre`
              para que dois espaços seguidos ocupem o mesmo que no input. */}
          <div
            ref={espelho}
            aria-hidden="true"
            className="t-ui pointer-events-none absolute inset-0 flex items-center overflow-hidden whitespace-pre"
          >
            {pedacos.map((pedaco, i) => (
              <span
                // Os pedaços não têm identidade própria — a posição É a
                // identidade, e a lista se refaz inteira a cada tecla.
                // biome-ignore lint/suspicious/noArrayIndexKey: ver acima
                key={i}
                data-realce={pedaco.tipo}
                className={classeDoPedaco(pedaco)}
              >
                {pedaco.texto}
              </span>
            ))}
          </div>

          <input
            type="text"
            aria-label="Busca"
            disabled={disabled ?? false}
            className="t-ui h-full w-full bg-transparent text-transparent caret-foreground outline-none placeholder:text-[var(--n-400)]"
            placeholder={placeholder}
            value={valor}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocado(true)}
            onBlur={() => setFocado(false)}
            onScroll={(e) => {
              if (espelho.current) espelho.current.scrollLeft = e.currentTarget.scrollLeft
            }}
          />
        </div>
      </div>

      {/* A dica só existe com o campo VAZIO e focado: quem já está digitando não
          precisa da lista de prefixos por cima do que escreveu, e quem nunca viu
          um prefixo não descobriria sozinho que eles existem. */}
      {focado && valor === '' && sugestoes.length > 0 ? (
        <p className="t-meta absolute top-9 left-0 z-10 whitespace-nowrap rounded-[var(--r-ctrl)] border border-rule-hair bg-card px-2 py-1 shadow-[var(--hard-soft)]">
          Filtre pelo campo:{' '}
          {sugestoes.map((sugestao, i) => (
            <span key={sugestao.prefixo}>
              {i > 0 ? ' · ' : ''}
              <span className="t-dado-meta">{sugestao.prefixo}:</span> {sugestao.campo.rotulo}
            </span>
          ))}
        </p>
      ) : null}
    </div>
  )
}
