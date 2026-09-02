import { cn } from '@/lib/utils'

/**
 * Monograma — duas letras em mono no lugar de uma foto (D16, issue #484;
 * mockup, `.mono-av`).
 *
 * **Não é avatar.** Não busca imagem, não tem `alt` e é `aria-hidden`: o nome
 * está escrito ao lado em texto de verdade, e um leitor de tela que anunciasse
 * "ML" antes de "Mister LED" leria a mesma coisa duas vezes, a primeira em
 * código. Serve para o olho ancorar a linha — que é o que a Attio resolve com
 * ele na tabela de registros.
 *
 * Mono porque as duas letras são um IDENTIFICADOR, não uma palavra: em tabular
 * elas ocupam a mesma largura em todas as linhas e a coluna para de serrilhar.
 */
export interface MonogramaProps {
  nome: string
  /** Lado do quadrado em px. 34 no card de identidade, 22 na lista do combo. */
  tamanho?: number
  className?: string
}

/**
 * Iniciais: as duas PRIMEIRAS palavras que valem como nome.
 *
 * Primeira e ÚLTIMA seria o costume em nome de pessoa, e é errado aqui: metade
 * dos parceiros é razão social, e a última palavra dela é "Ltda", "ME" ou "S/A"
 * — o monograma de todo fornecedor terminaria na mesma letra e pararia de
 * distinguir linha nenhuma, que é a única coisa que ele faz. "Mister LED
 * Comercio de Iluminação Ltda" → `ML`, como no mockup.
 *
 * Palavra de até duas letras é ligação ("de", "da", "e") e não entra. Nome de
 * uma palavra só usa as duas primeiras letras dela.
 */
export function monograma(nome: string): string {
  const partes = nome
    .trim()
    .split(/\s+/)
    .filter((parte) => parte.length > 2 && /\p{L}/u.test(parte))
  if (partes.length === 0) return nome.trim().slice(0, 2).toLocaleUpperCase()
  const primeira = partes[0] ?? ''
  const segunda = partes[1] ?? ''
  return (primeira.slice(0, 1) + (segunda.slice(0, 1) || primeira.slice(1, 2))).toLocaleUpperCase()
}

export function Monograma({ nome, tamanho = 34, className }: MonogramaProps) {
  return (
    <span
      aria-hidden="true"
      data-slot="monograma"
      style={{ width: tamanho, height: tamanho }}
      className={cn(
        't-dado grid shrink-0 place-items-center rounded-[var(--r-item)] [background:var(--n-0)] [border:1px_solid_var(--n-200)]',
        className,
      )}
    >
      {monograma(nome)}
    </span>
  )
}
