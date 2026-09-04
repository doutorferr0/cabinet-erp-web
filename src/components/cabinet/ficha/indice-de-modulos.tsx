import type { EntidadeCadastro } from '@/features/cadastro/modulos'
import { cn } from '@/lib/utils'
import { ancoraDoModulo } from './ficha-de-modulos'
import { camposPreenchidos } from './valores'

/**
 * ÍNDICE LATERAL DA FICHA (issue #103) — "marcando quais módulos têm dado".
 *
 * A ficha de um cadastro cheio tem oito a treze módulos e não cabe numa tela.
 * Sem índice, saber se `Dados bancários` está preenchido custa uma rolagem até
 * o fim — e a resposta mais frequente é "está vazio", isto é, a rolagem foi
 * paga por nada. O índice responde ANTES de rolar: o contador diz quantos
 * campos do módulo têm valor.
 *
 * **São âncoras, não botões.** O destino é a seção que a ficha já monta com
 * `id`; link com destino de verdade funciona no teclado, no "abrir em nova
 * aba" e no voltar do browser, e não precisa de estado nenhum aqui.
 *
 * **O contador conta o mesmo que a ficha desenha** — `camposPreenchidos`, a
 * função que decide se o módulo aparece cheio ou recolhido. Duas contagens
 * independentes divergiriam na primeira regra nova de "vazio", e o índice
 * passaria a mentir sobre a página que ele indexa.
 */
export function IndiceDeModulos({
  entidade,
  registro,
  rotulos,
  className,
}: {
  entidade: EntidadeCadastro
  registro: unknown
  rotulos?: Readonly<Record<string, string>>
  className?: string
}) {
  return (
    <nav aria-label="Módulos do cadastro" data-slot="indice-de-modulos" className={className}>
      <ul className="flex flex-col gap-1">
        {entidade.modulos.map((modulo) => {
          const preenchidos = camposPreenchidos(registro, modulo, rotulos).length
          const vazio = preenchidos === 0
          return (
            <li key={modulo.id}>
              <a
                href={`#${ancoraDoModulo(modulo.id)}`}
                // `data-indice-modulo`, e NÃO `data-modulo-id`: aquele marca a
                // SEÇÃO da ficha, e o teste de paridade conta os elementos que o
                // têm. Reusar o nome faria cada módulo aparecer duas vezes na
                // contagem e o índice quebraria a invariante que ele indexa.
                data-indice-modulo={modulo.id}
                data-vazio={vazio || undefined}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2 py-1.5 outline-none hover:bg-surface-sunken focus-visible:focus-ring',
                  // Módulo vazio fica APAGADO, não escondido: some da vista sem
                  // sumir da tela, a mesma economia da fileira cinza da ficha.
                  vazio && 'text-muted-foreground',
                )}
              >
                <span className="min-w-0 flex-1 truncate font-mono text-[0.6875rem] uppercase tracking-[0.06em]">
                  {modulo.titulo}
                </span>
                {/* Verde de PREENCHIMENTO, o mesmo carimbo do bloco do
                    formulário — o operador lê o mesmo sinal nas duas telas. */}
                <span
                  data-slot="indice-contador"
                  className={cn(
                    'shrink-0 border-2 px-1.5 font-bold font-mono text-[0.625rem] text-foreground tabular-nums',
                    vazio ? 'bg-card' : 'bg-fill-money',
                  )}
                >
                  {preenchidos}/{modulo.campos.length}
                </span>
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
