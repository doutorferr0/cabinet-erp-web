import { Badge, type TomDeBadge } from '@/components/cabinet/badge'

/**
 * STAMP — ALIAS do `<Badge>`, mantido até D30. Reface 2.0, #471 (D3).
 *
 * Era o carimbo da 1.x: retângulo de 24px, borda 2px, canto reto, mono 700 em
 * caixa alta, e dois dos quatro tons PREENCHIDOS de cor cheia. A 2.0 troca a
 * peça inteira — a razão está escrita em `badge.tsx` §"Por que trocar carimbo
 * cheio por pílula pastel". O que sobra aqui é a assinatura antiga, para as
 * telas que já a chamam não precisarem mudar no mesmo PR.
 *
 * ## O mapeamento é a única coisa que este arquivo decide
 *
 * `open → info` · `done → ok` · `void → bad` · `neutral → mut`.
 *
 * Ele vem da issue #471 e cai onde já caía semanticamente: o que está aberto é
 * informativo (nada a fazer ainda), o resolvido é o bom, o anulado é o ruim, e
 * o neutro é o silêncio. O que MUDA de verdade é o peso: `open` e `done` eram
 * blocos cheios (amarelo com tinta em cima; verde com branco em cima) e agora
 * são pastel como os outros dois. Quatro carimbos com o mesmo peso não
 * destacam nenhum — mas quatro pílulas pastel com PONTO colorido destacam pela
 * cor do ponto, sem encher a coluna de bloco saturado.
 *
 * ## Por que `data-slot`/`data-tom` continuam os antigos
 *
 * Alias que muda o atributo não é alias: `documento-visual.test.tsx` consulta
 * `data-tom="open"`, e telas futuras podem estilizar por `[data-slot=stamp]`.
 * Os dois são sobrescritos aqui; quem quiser o tom da 2.0 lê `data-badge-tom`,
 * que o `Badge` escreve e ninguém sobrescreve.
 *
 * Novo consumidor usa `<Badge>` direto. Este arquivo sai em D30.
 */
export type StampTom = 'neutral' | 'open' | 'done' | 'void'

const TOM_DA_2_0: Record<StampTom, TomDeBadge> = {
  open: 'info',
  done: 'ok',
  void: 'bad',
  neutral: 'mut',
}

export interface StampProps {
  tom: StampTom
  /** O estado por extenso — o Badge nunca fala só por cor. */
  label: string
  className?: string
}

export function Stamp({ tom, label, className }: StampProps) {
  return (
    <Badge tom={TOM_DA_2_0[tom]} data-slot="stamp" data-tom={tom} className={className}>
      {label}
    </Badge>
  )
}
